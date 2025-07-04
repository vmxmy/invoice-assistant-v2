# Supabase 数据库管理

本目录包含所有数据库迁移和配置文件。

## 目录结构

```
supabase/
├── migrations/        # 数据库迁移文件
├── config.toml       # 本地配置
├── seed.sql          # 种子数据（开发用）
└── README.md         # 本文档
```

## 快速开始

### 1. 安装 Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# 或使用 npm
npm install -g supabase
```

### 2. 链接到远程项目（已完成）

```bash
supabase link --project-ref sfenhhtvcyslxplvewmt
```

### 3. 启动本地开发环境

```bash
# 启动本地 Supabase（需要 Docker）
supabase start

# 查看本地服务
supabase status
```

本地服务地址：
- Studio: http://localhost:54323
- API: http://localhost:54321
- DB: postgresql://postgres:postgres@localhost:54322/postgres

### 4. 运行迁移

```bash
# 应用所有迁移到本地数据库
supabase migration up

# 查看迁移状态
supabase migration list
```

### 5. 部署到生产环境

```bash
# 推送迁移到远程数据库
supabase db push

# 或者使用密码
supabase db push --password <your-password>
```

## 数据库结构

### 核心表

1. **profiles** - 用户档案
   - 扩展 Supabase Auth 用户信息
   - 存储用户偏好设置和邮件配置

2. **invoices** - 发票
   - 存储发票基本信息
   - JSONB 字段存储 OCR 提取的完整数据

3. **email_processing_tasks** - 邮件处理任务
   - 跟踪异步任务状态
   - 支持任务重试

### Row Level Security (RLS)

所有表都启用了 RLS，确保用户只能访问自己的数据：
- 基于 `auth.uid()` 进行访问控制
- 自动创建用户 profile
- 级联删除相关数据

### 触发器

1. **updated_at** - 自动更新时间戳
2. **create_profile_for_user** - 用户注册时自动创建 profile
3. **update_profile_invoice_stats** - 发票创建时更新统计信息

## 开发工作流

### 创建新迁移

```bash
# 创建新的迁移文件
supabase migration new <migration_name>

# 编辑生成的 SQL 文件
# 然后应用到本地
supabase migration up
```

### 重置数据库

```bash
# 重置本地数据库（会运行所有迁移和 seed.sql）
supabase db reset
```

### 生成类型定义

```bash
# 生成 TypeScript 类型
supabase gen types typescript --local > ../frontend/src/types/database.types.ts
```

## 故障排除

### 连接问题

如果遇到连接错误，检查：
1. Docker 是否正在运行
2. 端口是否被占用
3. 环境变量是否正确设置

### 迁移冲突

如果本地和远程不同步：
```bash
# 拉取远程数据库结构
supabase db pull

# 比较差异
supabase db diff
```

## 环境变量

在 `backend/.env` 中设置：
- `SUPABASE_URL` - API URL
- `SUPABASE_KEY` - Anon key
- `SUPABASE_SERVICE_KEY` - Service key
- `SUPABASE_ACCESS_TOKEN` - CLI 访问令牌

## 注意事项

1. **不要直接修改生产数据库** - 始终通过迁移进行更改
2. **测试迁移** - 先在本地测试，再部署到生产
3. **备份** - 在重大更改前备份数据
4. **版本控制** - 所有迁移文件都应提交到 Git