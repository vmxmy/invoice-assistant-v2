# 发票助手 - 开发计划与任务追踪

本文档根据最终版PRD制定，用于追踪从项目初始化到部署的全部开发任务。

## Phase 0: 项目初始化与环境设置

- [x] **1. 创建项目根目录结构**
  - [x] 创建 `/backend` 目录用于存放所有FastAPI后端代码。
  - [x] 创建 `/frontend` 目录用于存放所有React/Vue等前端代码。
  - [x] 在根目录创建 `.gitignore` 文件，并添加通用Python、Node.js和OS的忽略规则。

- [x] **2. 后端 (Backend) 初始化**
  - [x] 在 `/backend` 目录下创建Python虚拟环境 (`python -m venv venv`)。
  - [x] 在 `/backend` 目录下创建 `requirements.txt` 并添加核心依赖：
    - `fastapi`
    - `uvicorn[standard]`
    - `pydantic`
    - `python-dotenv` (用于管理环境变量)
    - `sqlalchemy` (用于数据库ORM)
    - `asyncpg` (用于异步PostgreSQL连接)
    - `celery` (用于任务队列)
    - `redis` (用于Celery Broker和缓存)
    - `python-jose[cryptography]` (用于JWT验证)
  - [x] 安装所有依赖 (`pip install -r requirements.txt`)。
  - [x] 创建基础的FastAPI应用 (`/backend/app/main.py`)，包含一个 `/health` 健康检查端点。

- [x] **3. 前端 (Frontend) 初始化**
  - [x] 使用 `npx create-react-app frontend` 或 `vite` 初始化前端项目。
  - [x] 清理模板代码，建立基本的目录结构 (`src/components`, `src/pages`, `src/services`)。

- [x] **4. 基础设施 (Infrastructure) 配置**
  - [x] 创建 Supabase 项目，获取数据库连接字符串、JWT Secret等凭据。
  - [x] 在 `/backend` 目录下创建 `.env` 文件，用于存放Supabase凭据（确保已加入`.gitignore`）。
  - [x] 创建 Mailgun 账户，配置域名和路由，获取API Key和Webhook签名密钥。
  - [x] 将Mailgun凭据添加到 `.env` 文件。

## Phase 1: 核心后端开发 - 认证与数据模型

### 1.0 环境配置与基础设施 (Prerequisites) ✅ 95% 完成

> **完成状态**: 基础设施已基本搭建完成，数据库连接已成功配置并测试通过。
> 
> **关键变更**: 
> - 使用 psycopg2 + NullPool 替代 asyncpg 以适配 Supabase pgbouncer
> - 数据库连接使用环境变量配置 (user, password, host, port, dbname)
> - 已验证 PostgreSQL 17.4 连接成功

- [x] **1.1 项目结构设计**
  - [x] 创建完整的后端项目目录结构 (`app/models/`, `app/api/`, `app/core/`, `app/services/`, `app/utils/`)
  - [x] 设计代码组织规范和导入路径约定

- [x] **1.2 环境配置管理**
  - [x] 创建 `/backend/app/core/config.py` 配置文件，使用 Pydantic BaseSettings 管理环境变量
  - [x] 配置 Supabase 连接参数 (URL, API Key, JWT Secret)
  - [x] 设置开发/生产环境配置分离

- [x] **1.3 数据库连接配置**
  - [x] 创建 `/backend/app/core/database.py` 数据库连接模块
  - [x] 配置 ~~asyncpg 连接池和 SQLAlchemy async engine~~ psycopg2 连接池 (适配 Supabase pgbouncer)
  - [x] 实现数据库连接生命周期管理

- [ ] **1.4 基础工具类实现** (部分完成)
  - [x] 创建 `/backend/app/utils/logger.py` 日志配置
  - [ ] 创建 `/backend/app/core/exceptions.py` 自定义异常类
  - [ ] 创建 `/backend/app/utils/responses.py` 标准化API响应格式

- [x] **1.5 API 路由架构设计**
  - [x] 创建 `/backend/app/api/v1/` API版本目录结构
  - [x] 设计路由注册机制和中间件配置
  - [x] 实现API路径前缀和版本管理

### 1.1 数据库模型定义与实现

- [ ] **1.1.1 核心数据模型设计**
  - [ ] 设计 `profiles` 表结构 (用户档案：用户扩展信息、邮件配置等)
  - [ ] 设计 `invoices` 表结构 (发票核心数据：基础字段 + extracted_data JSON字段)
  - [ ] 设计 `email_processing_tasks` 表结构 (任务状态跟踪)

- [ ] **1.1.2 SQLAlchemy 模型实现**
  - [ ] 在 `/backend/app/models/` 下创建 `profile.py`, `invoice.py`, `task.py` 模型文件
  - [ ] 实现异步 SQLAlchemy 模型类，包含字段定义、关系映射、索引配置
  - [ ] 添加模型验证和序列化方法

- [ ] **1.1.3 Pydantic Schema 定义**
  - [ ] 创建 `/backend/app/schemas/` 目录，定义请求/响应 schema
  - [ ] 实现 `ProfileCreate`, `ProfileUpdate`, `ProfileResponse` 等 schema
  - [ ] 实现 `InvoiceResponse`, `InvoiceUpdate` 等 schema (支持稀疏字段)

- [ ] **1.1.4 数据库脚本与部署**
  - [ ] 编写 Supabase SQL 迁移脚本 (CREATE TABLE, 索引, 约束)
  - [ ] 配置 Row Level Security (RLS) 策略，确保数据隔离
  - [ ] 在 Supabase 后台执行数据库迁移

### 1.2 认证系统与安全机制

- [ ] **1.2.1 JWT 认证中间件**
  - [ ] 创建 `/backend/app/core/auth.py` Supabase JWT 验证模块
  - [ ] 实现 `verify_jwt_token()` 函数，验证 token 签名和有效期
  - [ ] 提取用户信息 (`user_id`, `email`) 并注入到请求上下文

- [ ] **1.2.2 FastAPI 依赖注入**
  - [ ] 创建 `/backend/app/core/dependencies.py` 依赖注入模块
  - [ ] 实现 `get_current_user()` 依赖，从 JWT 中提取当前用户
  - [ ] 实现 `get_current_user_id()` 依赖，提供简化的用户ID获取

- [ ] **1.2.3 权限控制机制**
  - [ ] 实现基于 `user_id` 的数据访问控制
  - [ ] 创建权限验证装饰器/依赖，确保用户只能访问自己的数据
  - [ ] 配置 CORS 和安全头

### 1.3 用户档案 API 实现

- [ ] **1.3.1 API 端点实现**
  - [ ] 创建 `/backend/app/api/v1/endpoints/users.py` 用户相关路由
  - [ ] 实现 `GET /api/v1/me` 端点：返回当前用户档案，支持字段筛选
  - [ ] 实现 `PATCH /api/v1/me` 端点：更新用户档案，支持部分更新

- [ ] **1.3.2 业务逻辑层**
  - [ ] 创建 `/backend/app/services/user_service.py` 用户业务逻辑
  - [ ] 实现用户档案的 CRUD 操作
  - [ ] 实现数据验证和业务规则检查

- [ ] **1.3.3 错误处理与响应**
  - [ ] 实现统一的错误处理机制 (HTTP状态码、错误消息格式)
  - [ ] 添加请求验证和业务异常处理
  - [ ] 实现 HTTP 缓存支持 (ETag, Cache-Control)

### 1.4 测试与验证

- [ ] **1.4.1 单元测试**
  - [ ] 创建 `/backend/tests/` 测试目录结构
  - [ ] 编写数据库模型的单元测试
  - [ ] 编写认证模块的单元测试

- [ ] **1.4.2 API 集成测试**
  - [ ] 使用 pytest + httpx 编写 API 测试
  - [ ] 测试用户档案 API 的完整流程
  - [ ] 测试认证和权限控制

- [ ] **1.4.3 端到端验证**
  - [ ] 使用真实的 Supabase 环境进行集成测试
  - [ ] 验证 JWT 认证流程完整性
  - [ ] 验证数据库 RLS 策略有效性

## Phase 2: 核心功能开发 - 邮件处理流水线

- [ ] **1. Webhook端点实现**
  - [ ] 创建 `POST /api/v1/webhooks/email-received` 端点。
  - [ ] 实现对Mailgun签名的验证，确保请求的合法性。
  - [ ] 此端点的唯一逻辑是：验证请求后，立即将邮件的JSON负载推送到Celery任务队列中。

- [ ] **2. Celery 任务实现**
  - [ ] 创建一个 `tasks.py` 文件，定义Celery应用。
  - [ ] 创建一个名为 `process_incoming_email` 的Celery任务。
  - [ ] **任务逻辑**: 
    - [ ] 从邮件数据中解析出收件人地址，并提取 `user_id`。
    - [ ] 检查邮件附件，如果是PDF，则下载到与`user_id`关联的存储路径。
    - [ ] 如果没有附件，则解析邮件正文中的链接并尝试下载PDF。
    - [ ] 将成功下载的PDF文件的元数据（文件名、路径、来源等）存入 `invoices` 表。
    - [ ] （占位）触发后续的OCR处理任务。

- [ ] **3. OCR处理任务**
  - [ ] 创建一个名为 `extract_invoice_data` 的Celery任务。
  - [ ] **任务逻辑**: 
    - [ ] 接收一个 `invoice_id` 作为参数。
    - [ ] 从数据库读取发票的存储路径。
    - [ ] 调用OCR服务（Mineru）的API，发送PDF文件。
    - [ ] 将返回的结构化JSON数据更新到 `invoices` 表的 `extracted_data` 字段中。
    - [ ] 将常用的关键数据（金额、日期、供应商）更新到 `invoices` 表的独立列中。

## Phase 3: API 端点完善

- [ ] **1. 发票API (`/invoices`)**
  - [ ] 实现 `GET /api/v1/invoices`，支持分页、排序和过滤。
  - [ ] 实现稀疏字段集 (`fields` 参数) 功能。
  - [ ] 实现 `GET /api/v1/invoices/{invoice_id}`，支持ETag缓存。
  - [ ] 实现 `PATCH /api/v1/invoices/{invoice_id}` 用于手动修正数据。
  - [ ] 实现 `POST /api/v1/invoices/{invoice_id}/reprocess`，用于触发 `extract_invoice_data` 任务。

- [ ] **2. 任务API (`/tasks`)**
  - [ ] 实现 `GET /api/v1/tasks/{task_id}`，用于查询Celery任务的状态。

## Phase 4: 前端开发

- [ ] **1. 认证流程**
  - [ ] 实现登录、注册页面，集成Supabase Auth JS SDK。
  - [ ] 实现Token的本地存储和自动刷新机制。
  - [ ] 设置API请求拦截器，自动在请求头中附加 `Authorization: Bearer <token>`。

- [ ] **2. 核心页面开发**
  - [ ] **仪表盘**: 调用 `GET /me` 和 `GET /invoices` (摘要视图)。
  - [ ] **发票列表**: 实现分页、搜索、筛选功能。
  - [ ] **发票详情页**: 实现左右布局，调用 `GET /invoices/{invoice_id}` 获取完整数据，并允许通过 `PATCH` 方法修改表单。

## Phase 5: 测试、部署与监控

- [ ] **1. 测试**
  - [ ] 为核心API端点和Celery任务编写单元测试和集成测试。
  - [ ] 进行端到端的手动测试。

- [ ] **2. 部署**
  - [ ] 编写 `Dockerfile` 用于后端服务的容器化。
  - [ ] 编写 `docker-compose.yml` 用于本地开发环境的编排（FastAPI, Redis, Celery Worker）。
  - [ ] 部署到云服务商（如Render, Vercel, AWS）。

- [ ] **3. 监控**
  - [ ] 集成日志服务（如Sentry, Logtail）来捕获应用错误。
  - [ ] 设置监控告警，特别是针对Webhook接收失败和Celery任务失败的情况。
