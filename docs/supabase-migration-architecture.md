# Supabase 迁移架构设计方案

## 一、架构设计原则

### 1.1 职责划分
- **Supabase 负责**：
  - 基础 CRUD 操作
  - 数据查询和聚合
  - 实时数据订阅
  - 用户认证和授权
  - 文件存储（静态文件）
  - 简单的数据验证

- **FastAPI 保留**：
  - 复杂业务逻辑处理
  - 文件处理和 OCR
  - 邮件扫描等后台任务
  - 复杂数据验证和转换
  - 事务处理
  - 第三方 API 集成

### 1.2 设计目标
- 减少服务器负载
- 提高响应速度
- 简化前端开发
- 保持业务逻辑的可维护性
- 支持离线优先架构

## 二、数据库视图层设计

### 2.1 基础视图层

```sql
-- 1. 发票列表视图（带计算字段和关联数据）
CREATE OR REPLACE VIEW v_invoice_list AS
SELECT 
    i.*,
    -- 计算字段
    COALESCE(i.total_amount, i.amount_without_tax + i.tax_amount) as calculated_total,
    -- 关联数据
    u.email as user_email,
    p.display_name as user_display_name,
    -- 状态标签
    CASE 
        WHEN i.is_verified THEN 'verified'
        WHEN i.processing_status = 'completed' THEN 'processed'
        ELSE 'pending'
    END as display_status,
    -- 搜索字段（用于全文搜索）
    to_tsvector('chinese', 
        COALESCE(i.invoice_number, '') || ' ' ||
        COALESCE(i.seller_name, '') || ' ' ||
        COALESCE(i.buyer_name, '') || ' ' ||
        COALESCE(i.remarks, '')
    ) as search_vector
FROM invoices i
LEFT JOIN auth.users u ON i.user_id = u.id
LEFT JOIN profiles p ON i.user_id = p.user_id
WHERE i.deleted_at IS NULL;

-- 创建搜索索引
CREATE INDEX idx_invoice_search ON invoices 
USING GIN (to_tsvector('chinese', 
    COALESCE(invoice_number, '') || ' ' ||
    COALESCE(seller_name, '') || ' ' ||
    COALESCE(buyer_name, '') || ' ' ||
    COALESCE(remarks, '')
));

-- 2. 发票详情视图（包含所有关联信息）
CREATE OR REPLACE VIEW v_invoice_detail AS
SELECT 
    i.*,
    -- 提取的数据格式化
    CASE 
        WHEN i.extracted_data IS NOT NULL 
        THEN jsonb_pretty(i.extracted_data)
        ELSE NULL
    END as formatted_extracted_data,
    -- 文件信息
    CASE 
        WHEN i.file_path IS NOT NULL
        THEN jsonb_build_object(
            'url', i.file_url,
            'path', i.file_path,
            'size', i.file_size,
            'hash', i.file_hash
        )
        ELSE NULL
    END as file_info,
    -- 创建者信息
    p.display_name as created_by_name,
    -- 验证信息
    CASE 
        WHEN i.is_verified 
        THEN jsonb_build_object(
            'verified', true,
            'verified_at', i.verified_at,
            'verified_by', i.verified_by
        )
        ELSE jsonb_build_object('verified', false)
    END as verification_info
FROM invoices i
LEFT JOIN profiles p ON i.user_id = p.user_id
WHERE i.deleted_at IS NULL;

-- 3. 邮箱账户视图（隐藏敏感信息）
CREATE OR REPLACE VIEW v_email_accounts AS
SELECT 
    id,
    user_id,
    email_address,
    provider,
    is_active,
    is_verified,
    last_scan_time,
    last_scan_status,
    scan_frequency,
    -- 隐藏密码等敏感信息
    CASE 
        WHEN auth_data IS NOT NULL 
        THEN jsonb_build_object(
            'configured', true,
            'provider', provider
        )
        ELSE jsonb_build_object('configured', false)
    END as auth_status,
    created_at,
    updated_at
FROM email_accounts
WHERE deleted_at IS NULL;

-- 4. 任务队列视图（用于监控）
CREATE OR REPLACE VIEW v_task_queue AS
SELECT 
    t.*,
    -- 任务统计
    EXTRACT(EPOCH FROM (NOW() - t.created_at)) as age_seconds,
    CASE 
        WHEN t.status = 'pending' AND t.scheduled_at <= NOW() 
        THEN 'ready'
        WHEN t.status = 'pending' AND t.scheduled_at > NOW() 
        THEN 'scheduled'
        ELSE t.status
    END as execution_status,
    -- 重试信息
    t.retry_count || '/' || t.max_retries as retry_info
FROM tasks t
WHERE t.deleted_at IS NULL
ORDER BY t.priority DESC, t.created_at ASC;
```

### 2.2 统计和聚合视图

```sql
-- 5. 增强的月度统计视图
CREATE OR REPLACE VIEW v_invoice_monthly_trend AS
WITH monthly_data AS (
    SELECT 
        user_id,
        DATE_TRUNC('month', invoice_date) AS month,
        COUNT(*) AS invoice_count,
        SUM(total_amount) AS total_amount,
        AVG(total_amount) AS avg_amount,
        COUNT(DISTINCT invoice_type) as type_count,
        COUNT(DISTINCT seller_name) as seller_count
    FROM invoices
    WHERE deleted_at IS NULL 
        AND invoice_date IS NOT NULL
    GROUP BY user_id, DATE_TRUNC('month', invoice_date)
),
monthly_growth AS (
    SELECT 
        *,
        LAG(invoice_count) OVER (PARTITION BY user_id ORDER BY month) as prev_count,
        LAG(total_amount) OVER (PARTITION BY user_id ORDER BY month) as prev_amount
    FROM monthly_data
)
SELECT 
    *,
    CASE 
        WHEN prev_count > 0 
        THEN ROUND(((invoice_count - prev_count)::numeric / prev_count) * 100, 2)
        ELSE NULL
    END as count_growth_rate,
    CASE 
        WHEN prev_amount > 0 
        THEN ROUND(((total_amount - prev_amount)::numeric / prev_amount) * 100, 2)
        ELSE NULL
    END as amount_growth_rate
FROM monthly_growth;

-- 6. 发票分类分析视图
CREATE OR REPLACE VIEW v_invoice_category_analysis AS
SELECT 
    user_id,
    COALESCE(category, invoice_type, '未分类') as category_name,
    COUNT(*) as invoice_count,
    SUM(total_amount) as total_amount,
    AVG(total_amount) as avg_amount,
    MIN(total_amount) as min_amount,
    MAX(total_amount) as max_amount,
    -- 百分比计算
    ROUND(
        100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY user_id),
        2
    ) as count_percentage,
    ROUND(
        100.0 * SUM(total_amount) / SUM(SUM(total_amount)) OVER (PARTITION BY user_id),
        2
    ) as amount_percentage,
    -- 时间分布
    MIN(invoice_date) as earliest_date,
    MAX(invoice_date) as latest_date,
    COUNT(DISTINCT DATE_TRUNC('month', invoice_date)) as active_months
FROM invoices
WHERE deleted_at IS NULL
GROUP BY user_id, category_name;

-- 7. 实时仪表盘视图
CREATE OR REPLACE VIEW v_dashboard_realtime AS
SELECT 
    user_id,
    -- 总览统计
    COUNT(*) as total_invoices,
    SUM(total_amount) as total_amount,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as today_count,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as week_count,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as month_count,
    -- 状态分布
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN is_verified THEN 1 END) as verified_count,
    -- 处理状态
    COUNT(CASE WHEN processing_status = 'ocr_completed' THEN 1 END) as ocr_completed,
    COUNT(CASE WHEN processing_status = 'ocr_failed' THEN 1 END) as ocr_failed,
    -- 最近活动
    MAX(created_at) as last_activity,
    COUNT(DISTINCT DATE(created_at)) as active_days
FROM invoices
WHERE deleted_at IS NULL
GROUP BY user_id;
```

### 2.3 搜索和过滤视图

```sql
-- 8. 智能搜索函数
CREATE OR REPLACE FUNCTION search_invoices(
    p_user_id UUID,
    p_query TEXT DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_amount_min DECIMAL DEFAULT NULL,
    p_amount_max DECIMAL DEFAULT NULL,
    p_status TEXT[] DEFAULT NULL,
    p_invoice_type TEXT[] DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    invoice JSONB,
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_jsonb(i.*) as invoice,
        CASE 
            WHEN p_query IS NOT NULL 
            THEN ts_rank(i.search_vector, plainto_tsquery('chinese', p_query))
            ELSE 1.0
        END as relevance
    FROM v_invoice_list i
    WHERE 
        i.user_id = p_user_id
        AND (p_query IS NULL OR i.search_vector @@ plainto_tsquery('chinese', p_query))
        AND (p_date_from IS NULL OR i.invoice_date >= p_date_from)
        AND (p_date_to IS NULL OR i.invoice_date <= p_date_to)
        AND (p_amount_min IS NULL OR i.total_amount >= p_amount_min)
        AND (p_amount_max IS NULL OR i.total_amount <= p_amount_max)
        AND (p_status IS NULL OR i.status = ANY(p_status))
        AND (p_invoice_type IS NULL OR i.invoice_type = ANY(p_invoice_type))
    ORDER BY relevance DESC, i.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 三、RLS（行级安全）策略

```sql
-- 启用 RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 发票 RLS 策略
CREATE POLICY "用户只能查看自己的发票" ON invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户只能创建自己的发票" ON invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的发票" ON invoices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的发票" ON invoices
    FOR DELETE USING (auth.uid() = user_id);

-- 视图 RLS 策略（自动继承基表策略）
GRANT SELECT ON v_invoice_list TO authenticated;
GRANT SELECT ON v_invoice_detail TO authenticated;
GRANT SELECT ON v_dashboard_realtime TO authenticated;
GRANT EXECUTE ON FUNCTION search_invoices TO authenticated;
```

## 四、数据库函数（业务逻辑）

```sql
-- 1. 创建发票（带验证）
CREATE OR REPLACE FUNCTION create_invoice(
    p_invoice_data JSONB
)
RETURNS invoices AS $$
DECLARE
    v_invoice invoices;
    v_user_id UUID;
BEGIN
    -- 获取当前用户
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '用户未认证';
    END IF;
    
    -- 验证必填字段
    IF p_invoice_data->>'invoice_number' IS NULL THEN
        RAISE EXCEPTION '发票号码不能为空';
    END IF;
    
    -- 检查重复
    IF EXISTS (
        SELECT 1 FROM invoices 
        WHERE user_id = v_user_id 
        AND invoice_number = p_invoice_data->>'invoice_number'
        AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION '发票号码已存在';
    END IF;
    
    -- 插入数据
    INSERT INTO invoices (
        user_id,
        invoice_number,
        invoice_date,
        seller_name,
        buyer_name,
        total_amount,
        invoice_type,
        status,
        extracted_data
    )
    VALUES (
        v_user_id,
        p_invoice_data->>'invoice_number',
        (p_invoice_data->>'invoice_date')::DATE,
        p_invoice_data->>'seller_name',
        p_invoice_data->>'buyer_name',
        (p_invoice_data->>'total_amount')::DECIMAL,
        p_invoice_data->>'invoice_type',
        COALESCE(p_invoice_data->>'status', 'pending'),
        p_invoice_data->'extracted_data'
    )
    RETURNING * INTO v_invoice;
    
    RETURN v_invoice;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 批量操作函数
CREATE OR REPLACE FUNCTION batch_update_invoices(
    p_invoice_ids UUID[],
    p_updates JSONB
)
RETURNS SETOF invoices AS $$
BEGIN
    -- 验证用户权限
    IF NOT EXISTS (
        SELECT 1 FROM invoices 
        WHERE id = ANY(p_invoice_ids) 
        AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION '无权操作这些发票';
    END IF;
    
    -- 批量更新
    RETURN QUERY
    UPDATE invoices
    SET 
        category = COALESCE(p_updates->>'category', category),
        tags = COALESCE((p_updates->'tags')::TEXT[], tags),
        updated_at = NOW()
    WHERE 
        id = ANY(p_invoice_ids)
        AND user_id = auth.uid()
        AND deleted_at IS NULL
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 五、前端服务层设计

### 5.1 基础服务架构

```typescript
// services/supabase/base.service.ts
import { supabase } from '@/config/supabase'

export abstract class BaseSupabaseService<T> {
  protected tableName: string
  protected viewName?: string

  constructor(tableName: string, viewName?: string) {
    this.tableName = tableName
    this.viewName = viewName
  }

  // 基础 CRUD 操作
  async findAll(filters?: any) {
    const query = supabase
      .from(this.viewName || this.tableName)
      .select('*')
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.eq(key, value)
        }
      })
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  }

  async findOne(id: string) {
    const { data, error } = await supabase
      .from(this.viewName || this.tableName)
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  async create(data: Partial<T>) {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return result
  }

  async update(id: string, data: Partial<T>) {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return result
  }

  async delete(id: string) {
    const { error } = await supabase
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
  }

  // 实时订阅
  subscribe(callback: (payload: any) => void) {
    return supabase
      .channel(`${this.tableName}_changes`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: this.tableName 
        }, 
        callback
      )
      .subscribe()
  }
}
```

### 5.2 发票服务实现

```typescript
// services/supabase/invoice.service.ts
import { BaseSupabaseService } from './base.service'

export class InvoiceSupabaseService extends BaseSupabaseService<Invoice> {
  constructor() {
    super('invoices', 'v_invoice_list')
  }

  // 高级搜索
  async search(params: SearchParams) {
    const { data, error } = await supabase
      .rpc('search_invoices', {
        p_user_id: params.userId,
        p_query: params.query,
        p_date_from: params.dateFrom,
        p_date_to: params.dateTo,
        p_amount_min: params.amountMin,
        p_amount_max: params.amountMax,
        p_status: params.status,
        p_invoice_type: params.invoiceType,
        p_limit: params.limit || 20,
        p_offset: params.offset || 0
      })
    
    if (error) throw error
    return data
  }

  // 获取详情（使用详情视图）
  async getDetail(id: string) {
    const { data, error } = await supabase
      .from('v_invoice_detail')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  // 批量操作
  async batchUpdate(ids: string[], updates: any) {
    const { data, error } = await supabase
      .rpc('batch_update_invoices', {
        p_invoice_ids: ids,
        p_updates: updates
      })
    
    if (error) throw error
    return data
  }

  // 获取统计数据
  async getStats(userId: string) {
    const [dashboard, monthlyTrend, categoryAnalysis] = await Promise.all([
      supabase.from('v_dashboard_realtime').select('*').eq('user_id', userId).single(),
      supabase.from('v_invoice_monthly_trend').select('*').eq('user_id', userId),
      supabase.from('v_invoice_category_analysis').select('*').eq('user_id', userId)
    ])

    return {
      dashboard: dashboard.data,
      monthlyTrend: monthlyTrend.data,
      categoryAnalysis: categoryAnalysis.data
    }
  }

  // 实时订阅用户的发票变化
  subscribeToUserInvoices(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('user_invoices')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  }
}
```

## 六、迁移策略

### 6.1 分阶段迁移

**第一阶段：只读操作迁移**
1. 所有查询操作迁移到 Supabase
2. 统计和报表使用视图
3. 搜索功能使用数据库函数

**第二阶段：简单写操作迁移**
1. 基础 CRUD 操作
2. 状态更新
3. 批量操作

**第三阶段：实时功能**
1. 实时通知
2. 协作功能
3. 数据同步

**保留在 FastAPI：**
1. OCR 处理
2. 邮件扫描
3. 文件处理
4. 复杂业务逻辑
5. 第三方 API 集成

### 6.2 前端适配层

```typescript
// services/api/adapter.ts
export class APIAdapter {
  // 根据操作类型选择服务
  static getInvoiceService(operationType: 'read' | 'write' | 'complex') {
    switch (operationType) {
      case 'read':
        return new InvoiceSupabaseService()
      case 'write':
        // 简单写操作也用 Supabase
        return new InvoiceSupabaseService()
      case 'complex':
        // 复杂操作仍使用 FastAPI
        return new InvoiceFastAPIService()
    }
  }
}

// 使用示例
const invoices = await APIAdapter
  .getInvoiceService('read')
  .search({ query: 'test' })

const result = await APIAdapter
  .getInvoiceService('complex')
  .processWithOCR(file)
```

## 七、性能优化

### 7.1 索引优化
```sql
-- 常用查询索引
CREATE INDEX idx_invoices_user_date ON invoices(user_id, invoice_date DESC);
CREATE INDEX idx_invoices_user_status ON invoices(user_id, status);
CREATE INDEX idx_invoices_user_type ON invoices(user_id, invoice_type);

-- 部分索引（只索引未删除的记录）
CREATE INDEX idx_invoices_active ON invoices(user_id, created_at DESC) 
WHERE deleted_at IS NULL;
```

### 7.2 缓存策略
- 使用 React Query 缓存查询结果
- 统计数据使用物化视图
- 实时数据通过 Subscription 更新

## 八、监控和维护

### 8.1 性能监控视图
```sql
CREATE OR REPLACE VIEW v_api_performance AS
SELECT 
    date_trunc('hour', created_at) as hour,
    COUNT(*) as request_count,
    AVG(response_time) as avg_response_time,
    MAX(response_time) as max_response_time,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
FROM api_logs
GROUP BY date_trunc('hour', created_at);
```

### 8.2 数据质量监控
```sql
CREATE OR REPLACE VIEW v_data_quality AS
SELECT 
    'invoices' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN invoice_number IS NULL THEN 1 END) as missing_invoice_number,
    COUNT(CASE WHEN total_amount IS NULL OR total_amount = 0 THEN 1 END) as invalid_amount,
    COUNT(CASE WHEN invoice_date IS NULL THEN 1 END) as missing_date
FROM invoices
WHERE deleted_at IS NULL;
```

## 九、安全考虑

1. **RLS 策略确保数据隔离**
2. **敏感操作保留在后端**
3. **文件上传通过 FastAPI 验证**
4. **复杂权限检查在后端实现**

## 十、总结

这个混合架构方案能够：
1. 充分利用 Supabase 的实时能力和性能
2. 保持复杂业务逻辑的可控性
3. 提供更好的用户体验
4. 降低服务器成本
5. 支持离线优先架构

通过逐步迁移，可以在保证系统稳定性的同时，逐步提升系统性能和用户体验。