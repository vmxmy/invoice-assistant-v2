# 数据库设计概览

## 1. 数据库选择

### 1.1 技术选型
- **数据库系统**：PostgreSQL（通过 Supabase）
- **ORM 框架**：SQLAlchemy（异步模式）
- **迁移工具**：Alembic
- **连接池**：asyncpg

### 1.2 选择理由
- PostgreSQL：成熟稳定、功能丰富、性能优秀
- Supabase：提供认证、实时订阅、存储等增值服务
- SQLAlchemy：Python 生态最成熟的 ORM
- 异步支持：充分利用 FastAPI 异步特性

## 2. 数据库架构

### 2.1 核心表结构
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   profiles  │     │   invoices  │     │    tasks    │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id          │←────│ user_id     │     │ id          │
│ email       │     │ id          │     │ user_id     │
│ full_name   │     │ invoice_no  │     │ type        │
│ created_at  │     │ amount      │     │ status      │
└─────────────┘     │ ...         │     │ ...         │
                    └─────────────┘     └─────────────┘
                           │                    │
                           ↓                    ↓
                    ┌─────────────┐     ┌─────────────┐
                    │ invoice_    │     │ task_logs   │
                    │ items       │     ├─────────────┤
                    ├─────────────┤     │ task_id     │
                    │ invoice_id  │     │ message     │
                    │ name        │     │ created_at  │
                    │ quantity    │     └─────────────┘
                    │ price       │
                    └─────────────┘
```

### 2.2 表关系说明
- **一对多关系**：
  - profiles → invoices（一个用户有多个发票）
  - profiles → tasks（一个用户有多个任务）
  - invoices → invoice_items（一个发票有多个明细）
  - tasks → task_logs（一个任务有多个日志）

## 3. 数据模型详解

### 3.1 用户模型（profiles）
- 与 Supabase Auth 集成
- 存储用户扩展信息
- 支持多租户隔离

### 3.2 发票模型（invoices）
- 核心业务数据
- 支持多种发票类型
- 灵活的字段设计

### 3.3 任务模型（tasks）
- 异步任务管理
- 状态跟踪
- 错误处理

## 4. 数据库设计原则

### 4.1 规范化设计
- 遵循第三范式（3NF）
- 适度反规范化优化查询
- 避免数据冗余

### 4.2 索引策略
```sql
-- 常用查询索引
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_seller_name ON invoices(seller_name);

-- 复合索引
CREATE INDEX idx_invoices_user_date ON invoices(user_id, invoice_date DESC);

-- 唯一索引
CREATE UNIQUE INDEX idx_invoices_no ON invoices(invoice_no) WHERE deleted_at IS NULL;
```

### 4.3 数据完整性
- 外键约束确保引用完整性
- CHECK 约束验证数据有效性
- NOT NULL 约束保证必填字段

## 5. 性能优化

### 5.1 查询优化
- 使用 EXPLAIN ANALYZE 分析查询
- 避免 N+1 查询问题
- 合理使用 JOIN 和子查询

### 5.2 分区策略
```sql
-- 按月分区发票表（未来优化）
CREATE TABLE invoices_2024_01 PARTITION OF invoices
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### 5.3 连接池配置
```python
# 连接池参数
SQLALCHEMY_POOL_SIZE = 20
SQLALCHEMY_POOL_TIMEOUT = 30
SQLALCHEMY_POOL_RECYCLE = 3600
SQLALCHEMY_MAX_OVERFLOW = 40
```

## 6. 数据安全

### 6.1 访问控制
- Row Level Security (RLS) 行级安全
- 用户只能访问自己的数据
- 管理员特殊权限控制

### 6.2 数据加密
- 敏感字段加密存储
- SSL/TLS 传输加密
- 备份数据加密

### 6.3 审计日志
```sql
-- 审计日志表
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50),
    operation VARCHAR(10),
    user_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 7. 备份恢复

### 7.1 备份策略
- 每日全量备份
- 每小时增量备份
- 异地容灾备份

### 7.2 恢复流程
1. 停止应用服务
2. 恢复数据库备份
3. 验证数据完整性
4. 重启应用服务

## 8. 监控指标

### 8.1 性能指标
- 查询响应时间
- 连接池使用率
- 死锁和锁等待
- 缓存命中率

### 8.2 容量指标
- 表大小增长
- 索引膨胀率
- 存储空间使用
- 连接数限制

## 9. 迁移策略

### 9.1 版本管理
```bash
# Alembic 迁移命令
alembic init migrations
alembic revision --autogenerate -m "Add invoice table"
alembic upgrade head
```

### 9.2 零停机迁移
1. 添加新列（允许 NULL）
2. 回填历史数据
3. 设置 NOT NULL 约束
4. 删除旧列

## 10. 未来规划

### 10.1 短期优化
- 添加物化视图加速统计
- 实现读写分离
- 优化慢查询

### 10.2 长期演进
- 分库分表方案
- 时序数据库集成
- 图数据库补充