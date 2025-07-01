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

- [ ] **1. 数据库模型定义**
  - [ ] 在 `/backend/app/models/` 目录下，使用SQLAlchemy或Pydantic创建`profiles`, `invoices`, `email_processing_tasks` 的数据模型。
  - [ ] 在Supabase后台执行SQL脚本，创建对应的表和RLS策略。

- [ ] **2. 核心认证与依赖**
  - [ ] 实现一个可重用的FastAPI依赖 (`dependencies.py`)，用于验证来自Supabase的JWT。
  - [ ] 该依赖应能从Token中提取 `user_id` 并注入到请求中。

- [ ] **3. 用户档案API (`/me`)**
  - [ ] 实现 `GET /api/v1/me` 端点，返回当前登录用户的档案。
  - [ ] 实现 `PATCH /api/v1/me` 端点，允许用户更新自己的信息。

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
