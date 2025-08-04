# Supabase 视图迁移计划

## 一、现有视图分析

### 1.1 当前视图清单（23个）

#### 发票相关视图（9个）
- `invoice_monthly_stats` - 月度统计
- `invoice_type_stats` - 类型统计  
- `invoice_summary` - 发票汇总
- `user_invoice_monthly_stats` - 用户月度统计
- `user_invoice_summary` - 用户发票汇总
- `user_invoice_type_stats` - 用户类型统计
- `monthly_stats` - 月度统计（重复）
- `type_stats` - 类型统计（重复）
- `dashboard_summary` - 仪表板汇总

#### 邮件相关视图（5个）
- `v_user_inbox` - 用户收件箱
- `email_attachments_view` - 邮件附件
- `email_processing_overview` - 邮件处理概览
- `unprocessed_emails_view` - 未处理邮件
- `user_emails_with_invoices` - 带发票的邮件

#### 分类/费用视图（6个）
- `category_expense_stats` - 分类费用统计
- `user_category_expenses` - 用户分类费用
- `user_expense_categories` - 用户费用分类
- `user_expense_summary` - 用户费用汇总
- `user_tags` - 用户标签
- `user_expense_trends` - 用户费用趋势

#### 其他视图（3个）
- `duplicate_invoices` - 重复发票
- `recent_activities` - 最近活动
- `user_activities` - 用户活动

### 1.2 问题诊断

1. **命名不一致**
   - 混用前缀：`user_`, `v_`, 无前缀
   - 功能重复：`invoice_monthly_stats` vs `monthly_stats`

2. **安全问题**
   - 所有视图都没有RLS策略
   - 缺少用户数据隔离

3. **功能缺失**
   - 缺少批量查询优化视图
   - 缺少聚合数据缓存视图
   - 缺少复杂筛选条件视图

## 二、视图迁移策略

### 2.1 保留和增强的视图

| 现有视图 | 对应查询服务 | 建议操作 |
|---------|------------|---------|
| `user_invoice_summary` | getDashboardStats | 增强：添加更多统计字段 |
| `user_invoice_monthly_stats` | getMonthlyStats | 保留：已经符合需求 |
| `user_invoice_type_stats` | getTypeStats | 保留：已经符合需求 |
| `v_user_inbox` | fetchEmails | 增强：添加分页和筛选 |
| `email_attachments_view` | getEmailDetails | 保留：满足附件查询需求 |

### 2.2 需要删除的视图（避免重复）

```sql
-- 删除重复和无用视图
DROP VIEW IF EXISTS invoice_monthly_stats;  -- 使用user_invoice_monthly_stats替代
DROP VIEW IF EXISTS invoice_type_stats;     -- 使用user_invoice_type_stats替代
DROP VIEW IF EXISTS invoice_summary;        -- 使用user_invoice_summary替代
DROP VIEW IF EXISTS monthly_stats;          -- 重复功能
DROP VIEW IF EXISTS type_stats;             -- 重复功能
DROP VIEW IF EXISTS dashboard_summary;      -- 被user_invoice_summary替代
```

### 2.3 新增视图设计

#### 1. 发票列表视图（v_invoice_list）
```sql
CREATE OR REPLACE VIEW v_invoice_list AS
SELECT 
    i.id,
    i.user_id,
    i.invoice_number,
    i.title,
    i.seller_name,
    i.total_amount,
    i.consumption_date,
    i.invoice_type,
    i.status,
    i.file_url,
    i.created_at,
    i.updated_at,
    -- 关联数据
    COUNT(DISTINCT ii.id) as item_count,
    ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags,
    e.subject as email_subject,
    e.from_email as email_from
FROM invoices i
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
LEFT JOIN invoice_tags it ON i.id = it.invoice_id  
LEFT JOIN tags t ON it.tag_id = t.id
LEFT JOIN emails e ON i.email_id = e.id
WHERE i.deleted_at IS NULL
GROUP BY i.id, e.subject, e.from_email;

-- 启用RLS
ALTER VIEW v_invoice_list OWNER TO authenticated;
```

#### 2. 发票详情视图（v_invoice_detail）
```sql
CREATE OR REPLACE VIEW v_invoice_detail AS
SELECT 
    i.*,
    -- 明细项
    COALESCE(
        json_agg(
            json_build_object(
                'id', ii.id,
                'name', ii.name,
                'unit', ii.unit,
                'quantity', ii.quantity,
                'unit_price', ii.unit_price,
                'amount', ii.amount,
                'tax_rate', ii.tax_rate,
                'tax_amount', ii.tax_amount
            ) ORDER BY ii.created_at
        ) FILTER (WHERE ii.id IS NOT NULL),
        '[]'::json
    ) as items,
    -- 标签
    COALESCE(
        json_agg(DISTINCT 
            json_build_object(
                'id', t.id,
                'name', t.name,
                'color', t.color
            )
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'::json
    ) as tags,
    -- 邮件信息
    CASE WHEN e.id IS NOT NULL THEN
        json_build_object(
            'id', e.id,
            'subject', e.subject,
            'from_email', e.from_email,
            'received_at', e.received_at
        )
    ELSE NULL END as email_info
FROM invoices i
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
LEFT JOIN invoice_tags it ON i.id = it.invoice_id
LEFT JOIN tags t ON it.tag_id = t.id
LEFT JOIN emails e ON i.email_id = e.id
WHERE i.deleted_at IS NULL
GROUP BY i.id, e.id, e.subject, e.from_email, e.received_at;
```

#### 3. 邮件配置视图（v_email_config）
```sql
CREATE OR REPLACE VIEW v_email_config AS
SELECT 
    ec.*,
    COUNT(DISTINCT e.id) as total_emails,
    COUNT(DISTINCT e.id) FILTER (WHERE e.processed = false) as unprocessed_count,
    MAX(e.received_at) as last_email_received
FROM email_configs ec
LEFT JOIN emails e ON ec.id = e.email_config_id
WHERE ec.deleted_at IS NULL
GROUP BY ec.id;
```

#### 4. 统计聚合视图（v_dashboard_stats）
```sql
CREATE MATERIALIZED VIEW v_dashboard_stats AS
SELECT 
    user_id,
    -- 总览统计
    COUNT(DISTINCT id) as total_invoices,
    SUM(total_amount) as total_amount,
    AVG(total_amount) as avg_amount,
    MAX(total_amount) as max_amount,
    MIN(total_amount) as min_amount,
    -- 时间统计
    COUNT(DISTINCT DATE_TRUNC('month', consumption_date)) as active_months,
    MIN(consumption_date) as first_invoice_date,
    MAX(consumption_date) as last_invoice_date,
    -- 分类统计
    COUNT(DISTINCT invoice_type) as type_count,
    COUNT(DISTINCT seller_name) as seller_count,
    -- 处理状态
    COUNT(*) FILTER (WHERE status = 'processed') as processed_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    -- 更新时间
    NOW() as calculated_at
FROM invoices
WHERE deleted_at IS NULL
GROUP BY user_id;

-- 创建索引
CREATE UNIQUE INDEX idx_dashboard_stats_user ON v_dashboard_stats(user_id);

-- 定期刷新（每小时）
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_dashboard_stats;
END;
$$ LANGUAGE plpgsql;
```

## 三、迁移实施计划

### 第一阶段：清理和准备（第1周）

1. **备份现有视图**
```sql
-- 创建备份schema
CREATE SCHEMA IF NOT EXISTS backup_views;

-- 备份所有现有视图定义
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT viewname, definition 
             FROM pg_views 
             WHERE schemaname = 'public'
    LOOP
        EXECUTE format('CREATE VIEW backup_views.%I AS %s', 
                      r.viewname, r.definition);
    END LOOP;
END $$;
```

2. **删除重复视图**
```sql
DROP VIEW IF EXISTS invoice_monthly_stats CASCADE;
DROP VIEW IF EXISTS invoice_type_stats CASCADE;
DROP VIEW IF EXISTS invoice_summary CASCADE;
DROP VIEW IF EXISTS monthly_stats CASCADE;
DROP VIEW IF EXISTS type_stats CASCADE;
DROP VIEW IF EXISTS dashboard_summary CASCADE;
```

### 第二阶段：创建新视图（第2周）

1. 创建基础查询视图
2. 创建聚合统计视图
3. 创建物化视图并设置刷新策略

### 第三阶段：服务层改造（第3-4周）

1. **修改服务层代码**
```typescript
// 旧代码
const { data } = await supabase
  .from('invoices')
  .select('*')
  .eq('user_id', userId);

// 新代码
const { data } = await supabase
  .from('v_invoice_list')
  .select('*')
  .eq('user_id', userId);
```

2. **创建视图访问层**
```typescript
// src/services/viewService.ts
export class ViewService {
  static async getInvoiceList(userId: string, filters?: FilterParams) {
    return supabase
      .from('v_invoice_list')
      .select('*')
      .eq('user_id', userId)
      .applyFilters(filters);
  }
  
  static async getDashboardStats(userId: string) {
    return supabase
      .from('v_dashboard_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
  }
}
```

### 第四阶段：性能优化（第5周）

1. **创建索引**
```sql
-- 为常用查询创建索引
CREATE INDEX idx_invoice_user_date ON invoices(user_id, consumption_date DESC);
CREATE INDEX idx_invoice_status ON invoices(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_processed ON emails(processed, email_config_id);
```

2. **设置RLS策略**
```sql
-- 为所有视图启用RLS
ALTER TABLE v_invoice_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices" ON v_invoice_list
    FOR SELECT USING (auth.uid() = user_id);
```

## 四、视图命名规范

### 4.1 命名约定

- **基础视图**: `v_[entity]_[purpose]`
  - `v_invoice_list` - 发票列表
  - `v_invoice_detail` - 发票详情
  
- **统计视图**: `v_stats_[scope]_[metric]`
  - `v_stats_user_monthly` - 用户月度统计
  - `v_stats_global_summary` - 全局汇总
  
- **物化视图**: `mv_[entity]_[purpose]`
  - `mv_dashboard_stats` - 仪表板统计缓存
  - `mv_expense_trends` - 费用趋势缓存

### 4.2 字段命名

- 使用snake_case
- 布尔字段使用is_或has_前缀
- 计数字段使用_count后缀
- 日期字段使用_at或_date后缀

## 五、监控和维护

### 5.1 性能监控

```sql
-- 创建视图性能监控表
CREATE TABLE view_performance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    view_name TEXT NOT NULL,
    query_time_ms INTEGER,
    row_count INTEGER,
    user_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 监控慢查询
CREATE OR REPLACE FUNCTION log_slow_queries()
RETURNS event_trigger AS $$
BEGIN
    -- 记录超过100ms的查询
END;
$$ LANGUAGE plpgsql;
```

### 5.2 定期维护任务

1. **每小时**: 刷新物化视图
2. **每天**: 分析查询性能，优化索引
3. **每周**: 清理过期数据，更新统计信息
4. **每月**: 审查视图使用情况，删除未使用视图

## 六、回滚计划

如果迁移出现问题，可以快速回滚：

```sql
-- 1. 恢复备份的视图
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT viewname 
             FROM pg_views 
             WHERE schemaname = 'backup_views'
    LOOP
        EXECUTE format('CREATE OR REPLACE VIEW public.%I AS 
                       SELECT * FROM backup_views.%I', 
                       r.viewname, r.viewname);
    END LOOP;
END $$;

-- 2. 删除新创建的视图
DROP VIEW IF EXISTS v_invoice_list CASCADE;
DROP VIEW IF EXISTS v_invoice_detail CASCADE;
-- ... 其他新视图

-- 3. 服务层使用功能开关切换回原始查询
```

## 七、成功指标

1. **性能提升**
   - 查询响应时间减少50%以上
   - 数据库负载降低30%
   
2. **代码简化**
   - 服务层代码减少40%
   - 单元测试覆盖率提升到80%
   
3. **可维护性**
   - 统一的视图命名规范
   - 完整的RLS安全策略
   - 自动化的性能监控

## 八、风险和缓解措施

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| 视图性能退化 | 高 | 使用物化视图，定期刷新 |
| RLS策略错误 | 高 | 充分测试，逐步启用 |
| 迁移中断服务 | 中 | 使用蓝绿部署，功能开关 |
| 数据不一致 | 中 | 事务保证，数据校验 |

## 九、下一步行动

1. ✅ 分析现有视图（已完成）
2. ⏳ 创建迁移脚本
3. ⏳ 实施第一阶段清理
4. ⏳ 创建新视图并测试
5. ⏳ 逐步迁移服务层
6. ⏳ 性能优化和监控