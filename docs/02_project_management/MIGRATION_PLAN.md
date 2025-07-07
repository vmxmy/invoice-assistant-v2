# (Vite + React) FastAPI to Vercel 混合架构迁移计划

**版本:** 2.0
**日期:** 2025年7月7日
**作者:** Gemini
**更新:** 此版本已根据项目前端为 **Vite + React** 的现状进行调整。

## 1. 目标

本文档旨在为 `invoice_assist` 项目提供一个清晰、可行的后端架构迁移方案。目标是将现有基于 FastAPI 的单一后端，迁移至一个由 **Vercel (Vite + React + Serverless Functions)**、**Supabase** 和 **容器化 FastAPI 服务** 组成的现代、高效、可扩展的混合架构。

**迁移的核心收益:**
- **提升开发体验:** 利用 Vercel 的无缝部署、预览和 CI/CD 能力，统一管理前后端。
- **增强应用性能:** 通过 Vercel 的全球边缘网络分发前端和轻量级 API，降低延迟。
- **实现自动扩展:** 后端逻辑 Serverless 化，轻松应对流量波动，无需手动管理服务器。
- **专注核心业务:** 将重量级、有状态的服务（如 OCR）与无状态的业务逻辑分离，使架构更清晰，易于维护。

## 2. 核心架构方案

我们将采用混合架构，各组件职责如下：

- **Vercel (托管平台):**
  - 托管 **Vite + React 前端应用** (作为静态站点)。
  - 在项目根目录的 `api/` 文件夹中运行**轻量级后端逻辑** (作为独立的 Serverless Functions)，处理绝大部分无状态的业务逻辑。
  - 作为整个应用的统一入口和流量网关。

- **Supabase (数据库 & BaaS):**
  - 继续作为核心的数据存储、用户认证和文件存储服务。

- **Render (或类似容器服务平台):**
  - 托管一个**容器化 (Dockerized) 的、精简版的 FastAPI 服务**。
  - 该服务**只负责一件事**：接收 PDF 文件，调用 `invoice2data` 进行 OCR 处理，并返回结果。

**数据流示意图:**
```
用户浏览器 (Vite + React App)
    |
    v
Vercel (Static Host + Serverless Functions)
    |
    |--- (1. CRUD, Auth) ---> Supabase
    |
    '--- (2. PDF Processing) ---> Render (FastAPI OCR Service) ---> Supabase (Save Result)
```

## 3. 现状分析

- **当前前端:** Vite + React，一个纯客户端渲染应用。
- **当前后端:** 一个单一的 FastAPI 应用 (`backend/run.py`)。
- **核心挑战:** 应用深度依赖 `invoice2data` 库及其底层系统依赖 (`poppler` 等)。这个依赖使得整个后端无法直接迁移到 Vercel 的 Serverless 环境。
- **可优化点:** 大量简单的 CRUD API 端点与复杂的 OCR 逻辑耦合在同一个服务中。

## 4. 迁移阶段与任务分解

### Phase 0: 准备工作 (1-2小时)

1.  **[ ] 创建账号:** 确保拥有 Vercel 和 Render (或 Fly.io) 的账号。
2.  **[ ] 确认 Vercel 项目设置:** 在 Vercel 项目中，确保框架预设为 "Vite"，并正确配置了构建命令和输出目录。
3.  **[ ] 创建代码仓库:** 为独立的 OCR 服务创建一个新的 Git 仓库 (例如 `invoice-ocr-service`)。

### Phase 1: 容器化核心 OCR 服务 (1天)

此阶段的目标是将 OCR 功能独立出来，并成功部署。

1.  **[ ] 精简 FastAPI 项目:**
    - 将现有 `backend` 目录复制到新的 `invoice-ocr-service` 仓库中。
    - 删除所有与 OCR 无关的 API 端点和逻辑。只保留文件上传和调用 `invoice2data` 的部分。
2.  **[ ] 创建 `Dockerfile`:** 在新仓库根目录创建 `Dockerfile`，确保包含 `poppler-utils` 的安装指令。
    ```dockerfile
    FROM python:3.11-slim
    RUN apt-get update && apt-get install -y poppler-utils && rm -rf /var/lib/apt/lists/*
    WORKDIR /app
    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt
    COPY . .
    ENV INTERNAL_API_KEY="your-strong-secret-key" # 设置一个服务间认证密钥
    CMD ["gunicorn", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--bind", "0.0.0.0:8000"]
    ```
3.  **[ ] 添加服务间认证:** 修改 FastAPI 端点，要求请求头���必须包含正确的 `X-Internal-Api-Key`。
4.  **[ ] 部署到 Render:**
    - 在 Render 上创建一个新的 Web Service，连接到 `invoice-ocr-service` 仓库。
    - 设置构建方式为 Docker。
    - 在 Render 的环境变量中添加 `INTERNAL_API_KEY`。
    - 部署成功后，记录下服务的 URL (例如 `https://invoice-ocr-service.onrender.com`)。

### Phase 2: 搭建 Serverless 后端 (2天)

此阶段在主项目 `invoice_assist/v2` 中进行。

1.  **[ ] 创建 `api` 目录:** 在 Vite 项目的根目录下创建 `api` 文件夹。
2.  **[ ] 安装依赖:** 安装 `@supabase/supabase-js`。对于 Serverless Functions，可能需要 `busboy` 来处理文件上传。
3.  **[ ] 配置环境变量:**
    - 在 Vercel 项目设置中，添加 Supabase 的 URL、`anon` key 和 `service_role` key。
    - 添加从 Phase 1 获得的 OCR 服务 URL 和内部 API Key。
      - `OCR_SERVICE_URL=https://invoice-ocr-service.onrender.com`
      - `OCR_SERVICE_API_KEY=your-strong-secret-key`
4.  **[ ] 创建 Serverless Functions:**
    - 逐个将 FastAPI 中的轻量级端点逻辑，在 `api/` 目录下创建对应的 TypeScript 文件来实现。
    - **重要:** 每个函数都必须通过请求头中的 `Authorization: Bearer <JWT>` 来验证用户身份。
    - **迁移对照表 (示例):**
      | 原 FastAPI 端点 (Python) | 新 Vercel Function (TypeScript) | 状态 |
      | :--- | :--- | :--- |
      | `GET /api/users/me` | `api/user.ts` | 未开始 |
      | `GET /api/invoices` | `api/invoices.ts` (处理 GET) | 未开始 |
      | `POST /api/invoices` | `api/invoices.ts` (处理 POST) | 未开始 |

### Phase 3: 集成与端到端测试 (1天)

1.  **[ ] 创建 OCR 代理函数:**
    - 在 `api/` 目录下创建一个新的函数，例如 `api/process-pdf.ts`。
    - 此函数负责接收前端的文件上传请求。
    - 它会验证用户的 JWT，然后将文件流转发到部署在 Render 上的 FastAPI OCR 服务。
    - 在转发请求时，必须附上 `X-Internal-Api-Key` 请求头。
2.  **[ ] 更新前端调用逻辑:**
    - 修改 Vite + React 代码，将所有 API 请求指向新的 Serverless Functions (例如 `/api/invoices`)。
    - **关键:** 在所有需要认证的请求中，从 Supabase `session` 获取 `access_token`，并将其放入 `Authorization` 请求头中。
3.  **[ ] 全面测试:** 在 Vercel 的预览环境 (Preview Environment) 中进行端到端测试。

### Phase 4: 切换与部署 (半天)

1.  **[ ] 合并代码:** 将所有更改合并到主分支。
2.  **[ ] 生产部署:** Vercel 会自动将主分支部署到生产环境。
3.  **[ ] 监控:** 密切监控 Vercel 和 Render 的服务日志。
4.  **[ ] 废弃旧服务:** 在确认新架构稳定运行一周后，可以安全地关闭旧的 FastAPI 服务器。

## 5. 风险评估与应对策略

- **风险 1: 认证逻辑复杂化**
  - **描述:** 与 Next.js 的 `auth-helpers` 不同，Vite 应用需要手动管理 JWT 的传递。
  - **应对:** 封装一个统一的 API 调用函数 (wrapper)，该函数自动从 Supabase 获取当前 session 的 token 并附加到请求头中，简化业务代码。

- **风险 2: OCR 服务性能延迟**
  - **描述:** Vercel 到 Render 的网络调用会增加少量延迟。
  - **应对:** 在 Render 创建服务时，选择离 Vercel 服务器区域最近的区域。在前端进行乐观更新。

- **风险 3: `invoice2data` 依赖问题**
  - **描述:** 在 Docker 环境中安装 `poppler` 可能失败。
  - **应对:** 在 Phase 1 中进行充分的本地 Docker 构建测试。

## 6. 回滚计划

在 Phase 4 完成后，旧的 FastAPI 服务器将保持运行至少一周。如果新架构出现严重问题，我们将：
1.  在前端代码中，将 API 请求地址改回旧的 FastAPI 服务器地址。
2.  重新部署前端应用。
这将立即恢复服务，为我们排查新架构问题赢得时间。