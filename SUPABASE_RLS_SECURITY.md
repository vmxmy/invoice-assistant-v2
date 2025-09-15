# Supabase RLS 安全策略实施指南

## 🚨 关键安全发现

基于代码审计，发现以下需要立即修复的安全问题：

### 高优先级问题
1. **缺乏数据库级RLS策略** - 最严重安全风险
2. **敏感信息日志泄露** - 已修复用户邮箱泄露
3. **文件访问控制不足** - 需加强权限验证

## 📋 必须实施的RLS策略

### 1. 发票表 (invoices) RLS策略

```sql
-- 启用RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能访问自己的发票
CREATE POLICY "Users can only access their own invoices" ON invoices
    FOR ALL USING (auth.uid() = user_id);

-- 策略：用户只能插入自己的发票
CREATE POLICY "Users can only insert their own invoices" ON invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 策略：用户只能更新自己的发票
CREATE POLICY "Users can only update their own invoices" ON invoices
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 策略：用户只能删除自己的发票
CREATE POLICY "Users can only delete their own invoices" ON invoices
    FOR DELETE USING (auth.uid() = user_id);
```

### 2. 报销集表 (reimbursement_sets) RLS策略

```sql
-- 启用RLS
ALTER TABLE reimbursement_sets ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能访问自己的报销集
CREATE POLICY "Users can only access their own reimbursement sets" ON reimbursement_sets
    FOR ALL USING (auth.uid() = user_id);

-- 策略：用户只能创建自己的报销集
CREATE POLICY "Users can only create their own reimbursement sets" ON reimbursement_sets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 策略：用户只能更新自己的报销集
CREATE POLICY "Users can only update their own reimbursement sets" ON reimbursement_sets
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 策略：用户只能删除自己的报销集
CREATE POLICY "Users can only delete their own reimbursement sets" ON reimbursement_sets
    FOR DELETE USING (auth.uid() = user_id);
```

### 3. 收件箱表 (inbox) RLS策略

```sql
-- 启用RLS
ALTER TABLE inbox ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能访问发送给自己的邮件
CREATE POLICY "Users can only access emails sent to them" ON inbox
    FOR SELECT USING (
        auth.uid()::text = mapped_user_id OR 
        auth.email() = target_user_email
    );

-- 策略：只允许系统服务插入邮件（使用service_role）
CREATE POLICY "Only service can insert emails" ON inbox
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 策略：用户可以更新邮件状态（标记为已读等）
CREATE POLICY "Users can update email status" ON inbox
    FOR UPDATE USING (
        auth.uid()::text = mapped_user_id OR 
        auth.email() = target_user_email
    )
    WITH CHECK (
        auth.uid()::text = mapped_user_id OR 
        auth.email() = target_user_email
    );
```

### 4. 用户配置表 (user_profiles) RLS策略

```sql
-- 启用RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能访问自己的配置
CREATE POLICY "Users can only access their own profile" ON user_profiles
    FOR ALL USING (auth.uid() = id);

-- 策略：用户只能创建自己的配置
CREATE POLICY "Users can only create their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 策略：用户只能更新自己的配置
CREATE POLICY "Users can only update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
```

## 🔒 文件存储安全策略

### 1. invoice-files 存储桶策略

```sql
-- 创建存储桶策略：用户只能访问自己用户ID文件夹下的文件
CREATE POLICY "Users can only access their own files" ON storage.objects
    FOR ALL USING (
        bucket_id = 'invoice-files' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- 创建存储桶策略：用户只能上传到自己的文件夹
CREATE POLICY "Users can only upload to their own folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'invoice-files' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- 创建存储桶策略：用户只能删除自己的文件
CREATE POLICY "Users can only delete their own files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'invoice-files' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );
```

## 🛡️ 额外安全措施

### 1. 创建安全函数

```sql
-- 创建函数：验证用户是否有权限访问特定发票
CREATE OR REPLACE FUNCTION public.user_can_access_invoice(invoice_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM invoices 
        WHERE id = invoice_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：验证用户是否有权限访问特定报销集
CREATE OR REPLACE FUNCTION public.user_can_access_reimbursement_set(set_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM reimbursement_sets 
        WHERE id = set_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. 审计日志表

```sql
-- 创建审计日志表
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用审计日志表的RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能查看自己的审计日志
CREATE POLICY "Users can only view their own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- 策略：只允许系统插入审计日志
CREATE POLICY "Only system can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
```

### 3. 创建触发器函数记录敏感操作

```sql
-- 创建触发器函数
CREATE OR REPLACE FUNCTION public.log_sensitive_operations()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 为关键表添加审计触发器
CREATE TRIGGER invoices_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION log_sensitive_operations();

CREATE TRIGGER reimbursement_sets_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reimbursement_sets
    FOR EACH ROW EXECUTE FUNCTION log_sensitive_operations();
```

## 🔐 实施检查清单

### 立即执行（高优先级）
- [ ] 在 Supabase 控制台执行所有 RLS 策略 SQL
- [ ] 验证文件存储桶策略生效
- [ ] 测试用户数据隔离是否正常工作
- [ ] 确认敏感日志已清理（已完成）

### 短期内执行（中优先级）
- [ ] 实施审计日志系统
- [ ] 创建安全监控函数
- [ ] 设置异常访问告警
- [ ] 定期安全审计计划

### 长期优化（低优先级）
- [ ] 实施数据加密策略
- [ ] 设置访问频率限制
- [ ] 实施多因素认证
- [ ] 建立安全事件响应流程

## ⚠️ 重要提醒

1. **在生产环境执行前必须在开发环境测试所有策略**
2. **备份现有数据库再执行任何修改**
3. **逐步实施策略，每个表单独测试**
4. **确保应用代码能正常工作在新的安全约束下**
5. **监控策略实施后的性能影响**

## 🧪 测试验证

### 1. 数据隔离测试
```sql
-- 测试用户A无法访问用户B的数据
-- 以用户A身份登录后执行：
SELECT * FROM invoices; -- 应该只返回用户A的发票

-- 尝试访问其他用户的数据（应该失败）
SELECT * FROM invoices WHERE user_id = '其他用户ID';
```

### 2. 文件访问测试
```javascript
// 测试用户无法访问其他用户的文件
// 应该在客户端代码中测试
try {
    const response = await supabase.storage
        .from('invoice-files')
        .download('other-user-id/file.pdf');
    // 这应该失败
} catch (error) {
    console.log('正确：无法访问其他用户文件');
}
```

## 📞 需要帮助？

如果在实施过程中遇到问题：
1. 检查 Supabase 控制台的错误日志
2. 验证用户认证状态
3. 确认策略语法正确
4. 测试简单的查询是否工作

记住：安全是一个持续的过程，需要定期审查和更新。