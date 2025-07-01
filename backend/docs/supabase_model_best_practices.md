# Supabase 模型设计最佳实践

## 核心原则

### 1. 使用 UUID 作为主键
```python
id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
```
- **优点**：全局唯一、分布式友好、安全性高
- **Supabase 推荐**：使用 `gen_random_uuid()` 函数自动生成

### 2. 时间戳带时区
```python
created_at = Column(DateTime(timezone=True), server_default=func.now())
```
- **重要**：始终使用 `timezone=True`
- **原因**：Supabase 全球部署，需要正确处理时区

### 3. 软删除模式
```python
deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)
```
- **推荐**：使用 `deleted_at` 而不是 `is_deleted`
- **好处**：保留删除时间信息，便于审计

### 4. JSONB 字段的使用
```python
metadata = Column(JSONB, server_default=text("'{}'::jsonb"))
```
- **场景**：灵活的数据结构、配置信息、扩展属性
- **索引**：使用 GIN 索引优化查询性能

### 5. Row Level Security (RLS) 准备
```python
user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
```
- **必需**：为多租户数据添加 user_id
- **索引**：确保查询性能

## 高级特性

### 1. PostgreSQL 特定功能
- **数组类型**：`ARRAY(String)` 用于标签、权限列表
- **枚举类型**：使用 Python Enum 映射数据库状态
- **部分索引**：优化特定条件的查询
- **GIN/GiST 索引**：全文搜索和 JSONB 查询

### 2. 性能优化
```python
# 复合索引
Index('idx_user_status', 'user_id', 'status')

# JSONB GIN 索引
Index('idx_data_gin', 'data', postgresql_using='gin')

# 部分索引
Index('idx_active_items', 'created_at', 
      postgresql_where='deleted_at IS NULL')
```

### 3. 数据完整性
```python
# 检查约束
CheckConstraint('amount >= 0', name='check_positive_amount')

# 唯一约束
UniqueConstraint('user_id', 'invoice_number', name='uq_user_invoice')
```

## 迁移脚本模板

```sql
-- 创建表
CREATE TABLE IF NOT EXISTS invoice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    -- 业务字段
    invoice_number VARCHAR(100) NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0)
);

-- 创建索引
CREATE INDEX idx_invoice_user_id ON invoice(user_id);
CREATE INDEX idx_invoice_deleted_at ON invoice(deleted_at);
CREATE INDEX idx_invoice_metadata_gin ON invoice USING gin(metadata);

-- 启用 RLS
ALTER TABLE invoice ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can manage own invoices" ON invoice
    USING (auth.uid() = user_id);

-- 更新触发器
CREATE TRIGGER update_invoice_updated_at
    BEFORE UPDATE ON invoice
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## 与 Supabase Auth 集成

### 1. 用户关联
```python
# 方式一：直接外键（需要访问 auth schema）
user_id = Column(UUID, ForeignKey("auth.users.id"))

# 方式二：存储 ID（更灵活）
auth_user_id = Column(UUID, nullable=False, unique=True)
```

### 2. RLS 策略使用 auth.uid()
```sql
CREATE POLICY "Users see own data" ON table_name
    FOR SELECT USING (auth.uid() = user_id);
```

## 最佳实践检查清单

- [ ] 使用 UUID 主键
- [ ] 时间戳带时区
- [ ] 实现软删除
- [ ] 添加 user_id 字段（多租户）
- [ ] 使用 JSONB 存储灵活数据
- [ ] 创建适当的索引
- [ ] 添加数据验证约束
- [ ] 准备 RLS 策略
- [ ] 使用数据库触发器更新时间戳
- [ ] 考虑使用视图简化复杂查询

## 反模式避免

1. **避免**：使用自增整数 ID
2. **避免**：不带时区的时间戳
3. **避免**：使用 `is_deleted` 布尔字段
4. **避免**：在应用层实现的功能可以用数据库特性替代
5. **避免**：过度规范化（适度使用 JSONB）

## 工具和实用函数

### 1. 自动更新 updated_at
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. 软删除查询
```python
# SQLAlchemy 查询过滤器
query.filter(Model.deleted_at.is_(None))
```

### 3. JSONB 查询
```python
# 查询 JSONB 字段
query.filter(Model.data['key'].astext == 'value')
query.filter(Model.data.contains({'key': 'value'}))
```