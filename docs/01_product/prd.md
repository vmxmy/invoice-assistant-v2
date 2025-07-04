# 产品需求文档 (PRD) - 发票助手 v3.0 (Production-Ready)

## 1. 项目概述 (Overview)

(No changes to this section)

### 1.1 项目愿景 (Vision)
打造一个智能、自动化的发票管理中心。用户只需将电子发票（邮件、PDF链接等）指向本系统，系统即可自动完成发票的收集、信息提取、结构化存储和查询，将用户从繁琐的发票整理工作中解放出来。

### 1.2 目标用户 (Target Audience)
*   **个人用户**: 需要收集发票进行报销或记录个人开支的普通用户。
*   **企业财务/行政人员**: 需要为公司统一管理和录入大量员工发票的负责人。
*   **自由职业者/小微企业主**: 需要自行整理发票用于记账和税务申报的个体经营者。

### 1.3 核心问题与解决方案
*   **问题**: 电子发票散落在各个邮箱、下载链接中，收集、整理、录入信息耗时耗力，且容易出错。
*   **解决方案**: 提供一个聚合入口（专属邮箱），通过自动化流程实现发票的 **自动收集** -> **智能解析** -> **结构化存储** -> **便捷查询与管理**。

---

## 2. 用户故事与核心流程 (User Stories & Core Flow)

(No changes to this section)

---

## 3. 功能需求 (Functional Requirements)

(No changes to this section)

---

## 4. 用户界面与体验 (UI/UX) 设计

(No changes to this section)

---

## 5. 非功能性需求

### 5.1 性能 (Performance)
*   **API 响应时间**: P99 响应时间应保持在 200ms 以内。
*   **Webhook 性能**: `/webhooks/email-received` 端点必须在 50ms 内响应，以避免上游服务（Mailgun）超时重试。
*   **异步处理**: 所有耗时操作（邮件解析、OCR、文件下载）必须在后台异步执行，不得阻塞API响应。
*   **高并发**: 系统应能支持高并发的邮件接收和用户查询请求。

### 5.2 可扩展性 & 可维护性
(No changes to this section)

### 5.3 可用性
(No changes to this section)

---

## 6. 安全考量 (Security Considerations)

(No changes to this section)

---

## 7. 技术架构与选型 (v2 - Production Architecture)

*   **后端服务框架**: **FastAPI** (Python) - 利用其异步特性和高性能。
*   **数据库**: **PostgreSQL** (由 Supabase 提供) - 配合 **asyncpg** 异步驱动和连接池使用。
*   **对外服务形式**: **RESTful API**
*   **认证与集成流程**: **Supabase Auth** 和 **JWT**。
*   **任务队列 (Task Queue)**: **(新增)** 引入 **Celery** 和 **Redis**。所有耗时任务（如邮件处理、OCR调用）都应通过Celery进行调度，由独立的Worker进程执行。这确保了API的快速响应和任务处理的可靠性。
*   **缓存层 (Caching Layer)**: **(新增)** 使用 **Redis** 作为缓存。对不常变动的热点数据（如用户配置、已处理的发票详情）进行缓存，降低数据库负载。

---

## 8. API 设计 (v3 - Performance-Optimized)

在 v2 的基础上，进一步引入性能优化设计，确保API在高负载下的表现。

### **核心原则**
*   (v2 principles remain: Resource-Oriented, Versioning, Async, etc.)
*   **性能优先 (Performance First)**: 针对高频、高负载的端点进行特别优化。

### **性能优化策略**

1.  **稀疏字段集 (Sparse Fieldsets)**
    *   **问题**: `GET /invoices` 列表接口默认返回所有字段，包括重量级的 `extracted_data`，会造成巨大的网络开销和缓慢的响应。
    *   **策略**: 允许客户端通过 `fields` 查询参数精确指定所需字段。服务器端在默认情况下也仅返回“摘要”字段。
    *   **示例**: `GET /api/v1/invoices?fields=invoice_id,vendor_name,invoice_date,total_amount`

2.  **服务端默认摘要视图 (Server-Side Summary View)**
    *   **策略**: 即使用户不提供 `fields` 参数，`GET /invoices` 端点也 **绝不** 返回 `extracted_data` 等重量级字段。完整的资源仅在 `GET /invoices/{invoice_id}` 端点提供。

3.  **HTTP 缓存 (HTTP Caching)**
    *   **策略**: 对于 `GET /invoices/{invoice_id}` 和 `GET /me` 等基本不变的资源，在响应头中加入 `ETag`。浏览器或客户端可在下次请求时携带 `If-None-Match` 头，如果资源未变，服务器直接返回 `304 Not Modified`，极大节省带宽和服务器处理时间。

### **API Endpoint Map (v3)**

#### **Users (用户档案)**
*   `GET /api/v1/me` (可缓存)
*   `PATCH /api/v1/me`

#### **Invoices (发票)**
*   **`GET /api/v1/invoices`**
    *   **功能**: 查询发票列表。
    *   **查询参数**: `limit`, `offset`, `sort`, `vendor_name`, `date_from`, `date_to`, **`fields` (新增)**
    *   **响应**: 默认不包含 `extracted_data` 和 `metadata` 字段。
*   **`GET /api/v1/invoices/{invoice_id}`** (可缓存, 使用ETag)
    *   **功能**: 获取单张发票的完整详情。
*   `PATCH /api/v1/invoices/{invoice_id}`
*   `POST /api/v1/invoices/{invoice_id}/reprocess`

#### **Processing Tasks (处理任务)**
*   `POST /api/v1/processing-tasks`
*   `GET /api/v1/tasks/{task_id}`

#### **Webhooks (外部服务钩子)**
*   **`POST /api/v1/webhooks/email-received`**
    *   **核心职责**: **立即响应**。此端点的唯一工作是：验证请求来源的合法性，然后将原始邮件数据 **直接推送到Redis任务队列** 中。所有后续处理由Celery Worker异步完成。

---

## 9. 数据库设计

(No changes to this section)

---

## 10. 未来扩展

(No changes to this section)
