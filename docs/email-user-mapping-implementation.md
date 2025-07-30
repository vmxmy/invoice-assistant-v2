# 发件人邮箱与用户映射功能实现方案

## 功能概述

该功能允许系统根据发件人邮箱地址自动将发票分配到对应的用户账户下，实现多用户环境下的自动化发票归档。

## 🎯 核心功能

### 1. 邮箱到用户ID的映射
- **输入**: 发件人邮箱地址 (`sender_email`)
- **输出**: 对应的用户ID (`user_id`)
- **机制**: 通过映射表或规则引擎确定邮箱与用户的关系

### 2. 数据隔离
- 不同用户的发票数据完全隔离
- 基于用户ID的数据访问控制
- 防止跨用户数据泄露

### 3. 安全验证
- 验证邮箱映射权限
- 记录映射操作日志
- 支持邮箱白名单机制

## 🔧 技术实现方案

### 方案1: 数据库映射表（推荐）

#### 1.1 创建邮箱映射表

```sql
-- 创建邮箱用户映射表
CREATE TABLE email_user_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_address TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  domain_pattern TEXT, -- 支持域名模式匹配 (如 @company.com)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  -- 索引和约束
  UNIQUE(email_address, user_id),
  CONSTRAINT valid_email CHECK (email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 创建索引
CREATE INDEX idx_email_user_mappings_email ON email_user_mappings(email_address);
CREATE INDEX idx_email_user_mappings_user_id ON email_user_mappings(user_id);
CREATE INDEX idx_email_user_mappings_domain ON email_user_mappings(domain_pattern);

-- 启用RLS
ALTER TABLE email_user_mappings ENABLE ROW LEVEL SECURITY;

-- RLS策略：用户只能查看自己相关的映射
CREATE POLICY "Users can view their own email mappings" ON email_user_mappings
FOR SELECT USING (auth.uid() = user_id OR auth.uid() = created_by);

-- RLS策略：用户可以创建自己的映射
CREATE POLICY "Users can create their own email mappings" ON email_user_mappings
FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = created_by);
```

#### 1.2 插入示例数据

```sql
-- 插入测试映射数据
INSERT INTO email_user_mappings (email_address, user_id, notes) VALUES
('finance@company-a.com', 'user-company-a-001', '公司A财务部门'),
('auto-invoice@supplier-b.com', 'user-supplier-b-001', '供应商B自动开票系统'),
('zhangsan@personal.email.com', 'user-zhangsan-personal', '个人用户张三'),
('accounting@company-a.com', 'user-company-a-001', '公司A会计部门'),
('invoice@supplier-c.com', 'user-supplier-c-001', '供应商C发票系统');

-- 插入域名模式映射（支持整个域名的映射）
INSERT INTO email_user_mappings (email_address, user_id, domain_pattern, notes) VALUES
('*@company-a.com', 'user-company-a-001', '@company-a.com', '公司A所有邮箱'),
('*@supplier-b.com', 'user-supplier-b-001', '@supplier-b.com', '供应商B所有邮箱');
```

#### 1.3 Edge Function中的映射逻辑

```typescript
/**
 * 根据发件人邮箱解析用户ID
 */
async function resolveUserFromEmail(senderEmail: string, supabase: any): Promise<string | null> {
  if (!senderEmail || typeof senderEmail !== 'string') {
    return null;
  }

  const email = senderEmail.toLowerCase().trim();
  
  try {
    // 1. 精确匹配邮箱地址
    const { data: exactMatch, error: exactError } = await supabase
      .from('email_user_mappings')
      .select('user_id, email_address')
      .eq('email_address', email)
      .eq('is_active', true)
      .limit(1);

    if (!exactError && exactMatch && exactMatch.length > 0) {
      console.log(`✅ 找到精确邮箱映射: ${email} -> ${exactMatch[0].user_id}`);
      return exactMatch[0].user_id;
    }

    // 2. 域名模式匹配
    const emailDomain = email.split('@')[1];
    if (emailDomain) {
      const { data: domainMatch, error: domainError } = await supabase
        .from('email_user_mappings')
        .select('user_id, domain_pattern')
        .eq('domain_pattern', `@${emailDomain}`)
        .eq('is_active', true)
        .limit(1);

      if (!domainError && domainMatch && domainMatch.length > 0) {
        console.log(`✅ 找到域名映射: ${emailDomain} -> ${domainMatch[0].user_id}`);
        return domainMatch[0].user_id;
      }
    }

    // 3. 通配符模式匹配
    const { data: wildcardMatch, error: wildcardError } = await supabase
      .from('email_user_mappings')
      .select('user_id, email_address, domain_pattern')
      .ilike('email_address', `*@${emailDomain}`)
      .eq('is_active', true)
      .limit(1);

    if (!wildcardError && wildcardMatch && wildcardMatch.length > 0) {
      console.log(`✅ 找到通配符映射: *@${emailDomain} -> ${wildcardMatch[0].user_id}`);
      return wildcardMatch[0].user_id;
    }

    console.log(`⚠️ 未找到邮箱映射: ${email}`);
    return null;

  } catch (error) {
    console.error('❌ 邮箱映射查询失败:', error);
    return null;
  }
}

/**
 * 在Edge Function中集成邮箱映射
 */
export async function handleEmailMapping(req: Request): Promise<Response> {
  // ... 其他代码 ...

  // 检查是否提供了发件人邮箱
  const senderEmail = jsonData.sender_email || jsonData.email_from || jsonData.from;
  let resolvedUserId = userIdHeader; // 默认使用Header中的用户ID

  if (senderEmail) {
    console.log(`📧 检测到发件人邮箱: ${senderEmail}`);
    
    // 尝试从邮箱解析用户ID
    const mappedUserId = await resolveUserFromEmail(senderEmail, supabase);
    
    if (mappedUserId) {
      resolvedUserId = mappedUserId;
      console.log(`🔄 用户ID已映射: ${userIdHeader} -> ${resolvedUserId}`);
      
      // 记录映射日志
      steps.push(`邮箱映射: ${senderEmail} -> 用户 ${resolvedUserId}`);
    } else {
      console.log(`⚠️ 邮箱未映射，使用默认用户: ${resolvedUserId}`);
      steps.push(`邮箱未映射: ${senderEmail}，使用默认用户`);
      
      // 可选：如果没有映射且要求严格验证，返回错误
      // return new Response(JSON.stringify({
      //   error: '发件人邮箱未授权',
      //   details: `邮箱 ${senderEmail} 未配置用户映射`
      // }), { status: 403, headers: corsHeaders });
    }
  }

  // 使用解析后的用户ID进行后续处理
  // ... 继续OCR和数据保存逻辑 ...
  
  return new Response(JSON.stringify({
    success: true,
    resolvedUserId: resolvedUserId,
    mappingInfo: {
      originalUserId: userIdHeader,
      senderEmail: senderEmail,
      mappingApplied: resolvedUserId !== userIdHeader
    },
    // ... 其他响应数据
  }), { 
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
}
```

### 方案2: 配置文件映射（简单场景）

#### 2.1 创建配置文件

```typescript
// email-mapping-config.ts
export const EMAIL_USER_MAPPINGS: Record<string, string> = {
  // 精确邮箱映射
  'finance@company-a.com': 'user-company-a-001',
  'accounting@company-a.com': 'user-company-a-001',
  'auto-invoice@supplier-b.com': 'user-supplier-b-001',
  'zhangsan@personal.email.com': 'user-zhangsan-personal',
  
  // 域名映射（使用特殊前缀表示）
  '@company-a.com': 'user-company-a-001',
  '@supplier-b.com': 'user-supplier-b-001'
};

/**
 * 简单的邮箱映射解析
 */
export function resolveUserFromEmailConfig(senderEmail: string): string | null {
  const email = senderEmail.toLowerCase().trim();
  
  // 1. 精确匹配
  if (EMAIL_USER_MAPPINGS[email]) {
    return EMAIL_USER_MAPPINGS[email];
  }
  
  // 2. 域名匹配
  const domain = email.split('@')[1];
  if (domain && EMAIL_USER_MAPPINGS[`@${domain}`]) {
    return EMAIL_USER_MAPPINGS[`@${domain}`];
  }
  
  return null;
}
```

## 📊 API使用示例

### 基础用法：带发件人邮箱的请求

```bash
curl -X POST "https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/ocr-dedup-complete" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-User-ID: default-user-id" \
  -d '{
    "pdf_url": "https://example.com/invoice.pdf",
    "pdf_name": "invoice-202501.pdf",
    "sender_email": "finance@company-a.com",
    "checkDeleted": true
  }'
```

### Pipedream工作流集成

```javascript
// Pipedream工作流步骤
export default defineComponent({
  async run({ steps, $ }) {
    // 从邮件触发器获取信息
    const emailData = steps.trigger.event;
    const pdfAttachment = emailData.attachments.find(att => 
      att.filename.toLowerCase().endsWith('.pdf')
    );
    
    if (!pdfAttachment) {
      throw new Error('未找到PDF附件');
    }
    
    // 调用带邮箱映射的OCR Edge Function
    const response = await fetch('https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/ocr-dedup-complete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'X-User-ID': 'pipedream-system'
      },
      body: JSON.stringify({
        pdf_url: pdfAttachment.download_url,
        pdf_name: pdfAttachment.filename,
        sender_email: emailData.from.address,  // 🔑 关键：发件人邮箱
        metadata: {
          source: 'pipedream_workflow',
          email_subject: emailData.subject,
          email_date: emailData.date,
          email_message_id: emailData.message_id
        }
      })
    });
    
    const result = await response.json();
    
    // 返回处理结果
    return {
      success: result.success,
      resolvedUserId: result.resolvedUserId,
      mappingApplied: result.mappingInfo?.mappingApplied,
      invoiceData: result.data
    };
  }
});
```

## 🔒 安全和权限控制

### 1. 访问控制

```sql
-- 创建专门的映射管理函数，限制访问权限
CREATE OR REPLACE FUNCTION manage_email_mapping(
  action TEXT,
  email_addr TEXT,
  target_user_id UUID DEFAULT NULL,
  domain_pattern TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  current_user_id UUID;
BEGIN
  -- 获取当前用户ID
  current_user_id := auth.uid();
  
  -- 检查权限（只有超级管理员或用户本人可以管理映射）
  IF NOT (
    current_user_id = target_user_id OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = current_user_id AND role = 'admin')
  ) THEN
    RAISE EXCEPTION '权限不足：无法管理其他用户的邮箱映射';
  END IF;
  
  -- 执行相应操作
  CASE action
    WHEN 'create' THEN
      INSERT INTO email_user_mappings (email_address, user_id, domain_pattern, created_by)
      VALUES (email_addr, target_user_id, domain_pattern, current_user_id);
      result := json_build_object('success', true, 'action', 'created');
      
    WHEN 'delete' THEN
      UPDATE email_user_mappings 
      SET is_active = false, updated_at = NOW()
      WHERE email_address = email_addr AND user_id = target_user_id;
      result := json_build_object('success', true, 'action', 'deleted');
      
    ELSE
      RAISE EXCEPTION '无效的操作: %', action;
  END CASE;
  
  RETURN result;
END;
$$;
```

### 2. 审计日志

```sql
-- 创建邮箱映射操作日志表
CREATE TABLE email_mapping_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL, -- 'resolve', 'create', 'delete', 'update'
  email_address TEXT,
  resolved_user_id UUID,
  original_user_id UUID,
  request_source TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- 创建审计触发器
CREATE OR REPLACE FUNCTION log_email_mapping_operation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO email_mapping_audit_logs (
    action, email_address, resolved_user_id, original_user_id, metadata
  ) VALUES (
    TG_OP, 
    COALESCE(NEW.email_address, OLD.email_address),
    COALESCE(NEW.user_id, OLD.user_id),
    auth.uid(),
    json_build_object('table', TG_TABLE_NAME, 'timestamp', NOW())
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 绑定触发器
CREATE TRIGGER email_mapping_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON email_user_mappings
  FOR EACH ROW EXECUTE FUNCTION log_email_mapping_operation();
```

## 📋 管理界面建议

### 1. 邮箱映射管理页面

```typescript
// EmailMappingManager.tsx
interface EmailMapping {
  id: string;
  email_address: string;
  user_id: string;
  domain_pattern?: string;
  is_active: boolean;
  created_at: string;
  notes?: string;
}

export function EmailMappingManager() {
  const [mappings, setMappings] = useState<EmailMapping[]>([]);
  const [newMapping, setNewMapping] = useState({
    email_address: '',
    user_id: '',
    notes: ''
  });

  // 获取当前用户的映射列表
  const fetchMappings = async () => {
    const { data, error } = await supabase
      .from('email_user_mappings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (!error) {
      setMappings(data || []);
    }
  };

  // 添加新映射
  const addMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('email_user_mappings')
      .insert([{
        email_address: newMapping.email_address,
        user_id: newMapping.user_id,
        notes: newMapping.notes,
        created_by: user?.id
      }]);
    
    if (!error) {
      fetchMappings();
      setNewMapping({ email_address: '', user_id: '', notes: '' });
    }
  };

  // 渲染界面...
}
```

## 🚀 部署步骤

### 1. 数据库设置

```bash
# 连接到Supabase数据库
psql -h db.sfenhhtvcyslxplvewmt.supabase.co -U postgres -d postgres

# 执行上述SQL脚本创建表和函数
\i create_email_mapping_tables.sql
```

### 2. Edge Function更新

```bash
# 下载现有Edge Function
supabase functions download ocr-dedup-complete

# 添加邮箱映射逻辑到index.ts
# （参考上述TypeScript代码）

# 重新部署
supabase functions deploy ocr-dedup-complete
```

### 3. 测试验证

```bash
# 运行邮箱映射测试
node scripts/test_email_user_mapping.js
```

## 📈 监控和维护

### 1. 性能监控

- 监控邮箱映射查询的响应时间
- 统计映射成功率和失败率
- 跟踪未映射邮箱的数量

### 2. 日常维护

- 定期清理无效的邮箱映射
- 更新域名映射规则
- 审查映射权限和访问日志

### 3. 扩展功能

- 支持正则表达式映射
- 批量导入映射配置
- 映射规则的生效时间控制
- 映射冲突检测和解决

---

通过以上方案，系统可以实现基于发件人邮箱的自动用户映射，确保不同用户的发票数据得到正确的归档和隔离。