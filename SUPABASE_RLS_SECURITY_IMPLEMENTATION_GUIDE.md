# Supabase RLS 安全实施指南

本文档提供发票管理系统 Supabase RLS (Row Level Security) 的详细实施指南和最佳实践。

---

## 目录
1. [RLS 基础概念](#1-rls-基础概念)
2. [当前安全状态](#2-当前安全状态)
3. [立即修复措施](#3-立即修复措施)
4. [RLS 策略模板](#4-rls-策略模板)
5. [安全测试方法](#5-安全测试方法)
6. [监控和告警](#6-监控和告警)
7. [最佳实践](#7-最佳实践)

---

## 1. RLS 基础概念

### 1.1 什么是 RLS
Row Level Security (行级安全) 是 PostgreSQL 的安全特性，允许数据库在行级别控制数据访问权限。

### 1.2 RLS 在 Supabase 中的重要性
- **数据隔离**: 确保用户只能访问自己的数据
- **API 安全**: 通过数据库层面控制，无需在应用层实现复杂权限逻辑
- **合规要求**: 满足数据隐私法规要求

### 1.3 核心组件
```sql
-- 启用RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY policy_name ON table_name
FOR operation TO role
USING (condition)
WITH CHECK (condition);
```

---

## 2. 当前安全状态

### 2.1 总体概况
✅ **所有31个表已启用RLS**  
⚠️ **发现17个高危安全问题**  
🔴 **Critical: Auth用户数据泄露风险**

### 2.2 表级RLS状态检查
```sql
-- 检查所有表的RLS状态
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE schemaname = n.nspname AND tablename = c.relname) as policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND n.nspname = 'public'
ORDER BY tablename;
```

### 2.3 当前策略分布
| 表名 | 策略数量 | 状态 |
|------|----------|------|
| invoices | 4 | ✅ 正常 |
| reimbursement_sets | 5 | ✅ 正常 |
| profiles | 3 | ✅ 正常 |
| security_audit_log | 3 | ⚠️ 需审查 |
| roles | 2 | 🔴 过度宽松 |

---

## 3. 立即修复措施

### 3.1 🔴 Critical: 修复 Auth Users 数据泄露

**问题**: `reimbursement_sets_enhanced` 和 `admin_security_logs` 视图向匿名用户暴露 auth.users 数据

**立即执行**:
```sql
-- 1. 立即撤销匿名访问权限
REVOKE ALL ON public.reimbursement_sets_enhanced FROM anon;
REVOKE ALL ON public.admin_security_logs FROM anon;

-- 2. 检查其他可能有问题的视图
SELECT schemaname, viewname, viewowner 
FROM pg_views 
WHERE schemaname = 'public'
AND definition ILIKE '%auth.users%';

-- 3. 临时禁用有问题的视图 (如果必要)
-- DROP VIEW public.reimbursement_sets_enhanced;
-- DROP VIEW public.admin_security_logs;
```

### 3.2 🔴 Critical: 修复 Security Definer 视图

**问题**: 16个视图使用 SECURITY DEFINER，绕过调用者的RLS策略

**修复步骤**:
```sql
-- 1. 检查所有 SECURITY DEFINER 视图
SELECT 
  schemaname, 
  viewname,
  viewowner,
  definition
FROM pg_views 
WHERE definition ILIKE '%security definer%'
AND schemaname = 'public';

-- 2. 逐个修复视图 - 示例
-- 方法1: 设置 security_invoker
ALTER VIEW public.v_invoice_detail SET (security_invoker = on);

-- 方法2: 重新创建视图 (推荐)
DROP VIEW IF EXISTS public.v_invoice_detail;
CREATE VIEW public.v_invoice_detail AS
SELECT 
  i.*,
  -- 只返回当前用户的数据
  CASE WHEN i.user_id = auth.uid() THEN i.title ELSE '[Restricted]' END as safe_title
FROM invoices i;

-- 3. 为视图创建适当的RLS策略
CREATE POLICY "users_own_invoice_details" ON public.v_invoice_detail
FOR SELECT TO public
USING (user_id = auth.uid());
```

### 3.3 🔴 High: 修复过度宽松的策略

**问题**: 多个表允许所有用户访问全量数据 (WHERE qual = 'true')

**修复示例**:
```sql
-- 1. 修复角色表访问权限
DROP POLICY IF EXISTS "Everyone can view roles" ON public.roles;
CREATE POLICY "limited_role_access" ON public.roles
FOR SELECT TO public
USING (
  -- 普通用户只能看到基础角色
  NOT is_system_role 
  OR 
  -- 管理员可以看到所有角色
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('admin', 'super_admin')
    AND ur.is_active = true
  )
);

-- 2. 修复权限表访问
DROP POLICY IF EXISTS "Everyone can view permissions" ON public.permissions;
CREATE POLICY "role_based_permission_access" ON public.permissions
FOR SELECT TO public
USING (
  -- 只有拥有相关角色的用户才能查看权限详情
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    WHERE ur.user_id = auth.uid()
    AND rp.permission_id = permissions.id
    AND ur.is_active = true
  )
);

-- 3. 修复费用类别访问 (可以保持宽松，但需要记录访问)
-- 如果需要保持开放访问，至少添加访问记录
CREATE OR REPLACE FUNCTION log_expense_category_access()
RETURNS TRIGGER AS $$
BEGIN
  -- 记录非管理员的访问
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('admin', 'super_admin')
  ) THEN
    INSERT INTO security_audit_log (
      user_id, 
      attempted_action, 
      table_name, 
      details
    ) VALUES (
      auth.uid(), 
      'SELECT', 
      'expense_categories',
      'Non-admin user accessed expense categories'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. RLS 策略模板

### 4.1 标准用户数据隔离策略
```sql
-- 模板: 用户只能访问自己的数据
CREATE POLICY "users_own_data_only" ON {table_name}
FOR ALL TO public
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### 4.2 管理员全权访问策略
```sql
-- 模板: 管理员可以访问所有数据
CREATE POLICY "admin_full_access" ON {table_name}
FOR ALL TO public
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('admin', 'super_admin')
    AND ur.is_active = true
  )
);
```

### 4.3 关联表访问策略
```sql
-- 模板: 通过关联表控制访问权限
CREATE POLICY "related_data_access" ON child_table
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM parent_table p
    WHERE p.id = child_table.parent_id
    AND p.user_id = auth.uid()
  )
);

-- 示例: 发票明细表访问
CREATE POLICY "invoice_details_access" ON vat_invoices
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = vat_invoices.invoice_id
    AND i.user_id = auth.uid()
  )
);
```

### 4.4 基于角色的访问策略
```sql
-- 模板: 基于用户角色的数据访问
CREATE POLICY "role_based_access" ON {table_name}
FOR {operation} TO public
USING (
  CASE 
    WHEN has_role(auth.uid(), 'super_admin') THEN true
    WHEN has_role(auth.uid(), 'admin') THEN {admin_condition}
    WHEN has_role(auth.uid(), 'user') THEN {user_condition}
    ELSE false
  END
);

-- 辅助函数
CREATE OR REPLACE FUNCTION has_role(user_uuid uuid, role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_uuid
    AND r.name = role_name
    AND ur.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.5 时间窗口访问策略
```sql
-- 模板: 基于时间的访问控制
CREATE POLICY "time_based_access" ON {table_name}
FOR SELECT TO public
USING (
  user_id = auth.uid()
  AND created_at >= (current_date - interval '30 days')
  -- 只能访问30天内的数据
);
```

---

## 5. 安全测试方法

### 5.1 RLS 策略测试框架
```sql
-- 创建测试用户和数据
BEGIN;

-- 创建测试用户
INSERT INTO auth.users (id, email) VALUES 
  ('test-user-1', 'test1@example.com'),
  ('test-user-2', 'test2@example.com');

-- 创建测试数据
INSERT INTO invoices (user_id, title, total_amount) VALUES
  ('test-user-1', 'User 1 Invoice', 100.00),
  ('test-user-2', 'User 2 Invoice', 200.00);

-- 测试用户隔离
SET LOCAL "request.jwt.claims" = '{"sub":"test-user-1"}';
SELECT count(*) FROM invoices; -- 应该只返回1条

SET LOCAL "request.jwt.claims" = '{"sub":"test-user-2"}';
SELECT count(*) FROM invoices; -- 应该只返回1条

ROLLBACK;
```

### 5.2 自动化安全测试脚本
```sql
-- 创建安全测试函数
CREATE OR REPLACE FUNCTION test_rls_security()
RETURNS TABLE(
  test_name text,
  table_name text,
  passed boolean,
  details text
) AS $$
DECLARE
  test_user_id uuid := gen_random_uuid();
  other_user_id uuid := gen_random_uuid();
  test_record_id uuid;
BEGIN
  -- 测试1: 用户数据隔离
  INSERT INTO invoices (id, user_id, title) 
  VALUES (gen_random_uuid(), other_user_id, 'Other User Invoice');
  
  -- 模拟当前用户
  PERFORM set_config('request.jwt.claims', 
    json_build_object('sub', test_user_id::text)::text, true);
  
  -- 尝试访问其他用户数据
  IF EXISTS (SELECT 1 FROM invoices WHERE user_id = other_user_id) THEN
    RETURN QUERY SELECT 
      'User Data Isolation'::text,
      'invoices'::text,
      false,
      'Can access other users data'::text;
  ELSE
    RETURN QUERY SELECT 
      'User Data Isolation'::text,
      'invoices'::text,
      true,
      'Properly isolated'::text;
  END IF;
  
  -- 清理测试数据
  DELETE FROM invoices WHERE user_id = other_user_id;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- 运行测试
SELECT * FROM test_rls_security();
```

### 5.3 渗透测试场景
```sql
-- 场景1: 尝试SQL注入绕过RLS
-- 这些应该都失败
SELECT * FROM invoices WHERE user_id = 'any-user' OR '1'='1';
SELECT * FROM invoices WHERE user_id IN (SELECT id FROM auth.users);

-- 场景2: 尝试权限提升
-- 非管理员用户尝试访问管理功能
UPDATE user_roles SET role_id = (SELECT id FROM roles WHERE name = 'admin') 
WHERE user_id = auth.uid();

-- 场景3: 尝试绕过视图限制
-- 直接访问底层表
SELECT * FROM auth.users; -- 应该被拒绝
```

---

## 6. 监控和告警

### 6.1 安全事件监控
```sql
-- 创建安全事件触发器
CREATE OR REPLACE FUNCTION security_monitor()
RETURNS TRIGGER AS $$
BEGIN
  -- 记录所有删除操作
  IF TG_OP = 'DELETE' THEN
    INSERT INTO security_audit_log (
      user_id,
      attempted_action,
      table_name,
      email_confirmed,
      details
    ) VALUES (
      auth.uid(),
      'DELETE',
      TG_TABLE_NAME,
      (auth.jwt() ->> 'email_confirmed')::boolean,
      format('Deleted record ID: %s', OLD.id)
    );
    RETURN OLD;
  END IF;
  
  -- 记录敏感数据修改
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME IN ('invoices', 'reimbursement_sets') THEN
    INSERT INTO security_audit_log (
      user_id,
      attempted_action,
      table_name,
      email_confirmed,
      details
    ) VALUES (
      auth.uid(),
      'UPDATE',
      TG_TABLE_NAME,
      (auth.jwt() ->> 'email_confirmed')::boolean,
      format('Modified record ID: %s', NEW.id)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 应用到关键表
CREATE TRIGGER security_monitor_invoices
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION security_monitor();

CREATE TRIGGER security_monitor_reimbursement_sets
  AFTER INSERT OR UPDATE OR DELETE ON reimbursement_sets
  FOR EACH ROW EXECUTE FUNCTION security_monitor();
```

### 6.2 异常访问模式检测
```sql
-- 检测异常大量数据访问
CREATE OR REPLACE FUNCTION detect_bulk_access()
RETURNS void AS $$
DECLARE
  user_access_count int;
  threshold int := 1000; -- 阈值
BEGIN
  -- 检查最近1小时内的访问量
  SELECT count(*) INTO user_access_count
  FROM security_audit_log
  WHERE user_id = auth.uid()
  AND timestamp > (now() - interval '1 hour')
  AND attempted_action = 'SELECT';
  
  IF user_access_count > threshold THEN
    INSERT INTO security_audit_log (
      user_id,
      attempted_action,
      table_name,
      details
    ) VALUES (
      auth.uid(),
      'BULK_ACCESS_DETECTED',
      'system',
      format('User accessed %s records in 1 hour', user_access_count)
    );
    
    -- 可以考虑临时限制用户访问
    -- PERFORM pg_cancel_backend(pg_backend_pid());
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.3 实时安全仪表板
```sql
-- 创建安全统计视图
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
  date_trunc('hour', timestamp) as hour,
  count(*) as total_events,
  count(DISTINCT user_id) as unique_users,
  count(*) FILTER (WHERE attempted_action = 'DELETE') as delete_operations,
  count(*) FILTER (WHERE NOT email_confirmed) as unverified_user_actions,
  count(*) FILTER (WHERE details ILIKE '%bulk%') as potential_bulk_access
FROM security_audit_log
WHERE timestamp > (now() - interval '24 hours')
GROUP BY date_trunc('hour', timestamp)
ORDER BY hour DESC;

-- 权限系统健康检查
CREATE OR REPLACE VIEW permission_system_health AS
SELECT 
  'Active Users' as metric,
  count(DISTINCT ur.user_id) as value,
  'users' as unit
FROM user_roles ur
WHERE ur.is_active = true
AND (ur.expires_at IS NULL OR ur.expires_at > now())

UNION ALL

SELECT 
  'Admin Users' as metric,
  count(DISTINCT ur.user_id) as value,
  'users' as unit
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE ur.is_active = true
AND r.name IN ('admin', 'super_admin')

UNION ALL

SELECT 
  'Recent Security Events' as metric,
  count(*) as value,
  'events' as unit
FROM security_audit_log
WHERE timestamp > (now() - interval '24 hours');
```

---

## 7. 最佳实践

### 7.1 RLS 策略设计原则

**1. 默认拒绝 (Deny by Default)**
```sql
-- 错误示例: 过于宽松
CREATE POLICY "allow_all" ON table_name FOR ALL TO public USING (true);

-- 正确示例: 明确的访问控制
CREATE POLICY "user_data_only" ON table_name 
FOR ALL TO public 
USING (user_id = auth.uid());
```

**2. 最小权限原则**
```sql
-- 分离读写权限
CREATE POLICY "read_own_data" ON table_name 
FOR SELECT TO public 
USING (user_id = auth.uid());

CREATE POLICY "write_own_data" ON table_name 
FOR INSERT TO public 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_data" ON table_name 
FOR UPDATE TO public 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

**3. 性能考虑**
```sql
-- 确保RLS条件字段有索引
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id);

-- 避免复杂的子查询
-- 使用函数封装复杂逻辑
CREATE OR REPLACE FUNCTION user_has_access(target_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN target_user_id = auth.uid() OR has_role(auth.uid(), 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "efficient_access" ON table_name
FOR ALL TO public
USING (user_has_access(user_id));
```

### 7.2 常见陷阱和解决方案

**陷阱1: 忘记WITH CHECK子句**
```sql
-- 危险: 只有USING没有WITH CHECK
CREATE POLICY "incomplete_policy" ON table_name
FOR ALL TO public
USING (user_id = auth.uid()); -- 缺少WITH CHECK

-- 正确: 包含完整的检查
CREATE POLICY "complete_policy" ON table_name
FOR ALL TO public
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

**陷阱2: 在视图中绕过RLS**
```sql
-- 危险: SECURITY DEFINER视图
CREATE VIEW dangerous_view WITH (security_definer=true) AS
SELECT * FROM sensitive_table; -- 绕过RLS

-- 正确: 在视图中保持RLS
CREATE VIEW safe_view AS
SELECT * FROM sensitive_table 
WHERE user_id = auth.uid(); -- 显式应用RLS逻辑
```

**陷阱3: 过度复杂的策略**
```sql
-- 难以维护和调试
CREATE POLICY "complex_policy" ON table_name
FOR ALL TO public
USING (
  CASE 
    WHEN (SELECT role FROM complex_view WHERE id = auth.uid()) = 'admin' 
    THEN true
    WHEN exists(SELECT 1 FROM other_table WHERE complex_condition)
    THEN user_id = auth.uid()
    ELSE false
  END
);

-- 简化为多个清晰的策略
CREATE POLICY "admin_access" ON table_name
FOR ALL TO public
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "user_own_data" ON table_name
FOR ALL TO public
USING (user_id = auth.uid() AND NOT has_role(auth.uid(), 'admin'));
```

### 7.3 开发工作流程

**1. 开发环境RLS测试**
```sql
-- 开发环境下的快速RLS测试
CREATE OR REPLACE FUNCTION dev_test_rls(test_table_name text)
RETURNS text AS $$
DECLARE
  result text;
BEGIN
  -- 检查表是否启用RLS
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = test_table_name
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    RETURN format('ERROR: Table %s does not have RLS enabled', test_table_name);
  END IF;
  
  -- 检查是否有策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = test_table_name 
    AND schemaname = 'public'
  ) THEN
    RETURN format('WARNING: Table %s has RLS enabled but no policies', test_table_name);
  END IF;
  
  RETURN format('OK: Table %s has proper RLS configuration', test_table_name);
END;
$$ LANGUAGE plpgsql;

-- 测试所有表
SELECT tablename, dev_test_rls(tablename) as status
FROM pg_tables 
WHERE schemaname = 'public';
```

**2. 部署前安全检查清单**
- [ ] 所有新表都启用了RLS
- [ ] 每个表都有适当的策略
- [ ] 策略包含USING和WITH CHECK子句
- [ ] 没有使用SECURITY DEFINER绕过RLS
- [ ] 性能关键字段有适当索引
- [ ] 通过安全测试用例

**3. 生产环境监控**
```sql
-- 生产环境RLS健康检查
CREATE OR REPLACE FUNCTION production_rls_health_check()
RETURNS TABLE(
  issue_type text,
  table_name text,
  severity text,
  description text
) AS $$
BEGIN
  -- 检查未启用RLS的表
  RETURN QUERY
  SELECT 
    'Missing RLS'::text,
    c.relname::text,
    'HIGH'::text,
    'Table does not have RLS enabled'::text
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'
  AND n.nspname = 'public'
  AND c.relrowsecurity = false;
  
  -- 检查没有策略的表
  RETURN QUERY
  SELECT 
    'Missing Policies'::text,
    c.relname::text,
    'HIGH'::text,
    'Table has RLS enabled but no policies'::text
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'
  AND n.nspname = 'public'
  AND c.relrowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = c.relname 
    AND schemaname = n.nspname
  );
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- 定期运行健康检查
SELECT * FROM production_rls_health_check();
```

---

## 总结

RLS 是 Supabase 应用安全的基石，但需要正确实施和持续维护。通过遵循本指南的最佳实践，可以构建安全、高性能的数据访问控制系统。

### 关键要点
1. **默认启用RLS** - 所有用户数据表都应启用RLS
2. **最小权限原则** - 用户只能访问必需的数据
3. **定期安全审计** - 持续监控和改进安全策略
4. **性能优化** - 确保RLS策略不会显著影响性能
5. **团队培训** - 确保开发团队理解RLS的重要性和正确用法

通过实施这些措施，可以显著提高系统的安全性，保护用户数据不被未授权访问。