## OCR 服务优化任务追踪

> 创建日期：2025-07-05  
> 负责人：待指定  
> 状态更新请在每次提交后同步勾选/填写进度。

---

### 任务进度概览

| 编号 | 任务 | 负责人 | 状态 | 截止日期 | 备注 |
| ---- | ---- | ------ | ---- | -------- | ---- |
| T-01 | 代码结构梳理与合并设计方案 |  | ☐ 未开始 | 07-07 | 合并 OCRService 与 OCRServiceV4 的接口定义与公共逻辑 |
| T-02 | 抽象 OCR 客户端基类（含配置管理） |  | ☐ 未开始 | 07-08 | 提供统一配置、超时、重试等能力 |
| T-03 | 实现 Mineru v1 适配器 |  | ☐ 未开始 | 07-09 | 保留现有直传逻辑，迁移至新架构 |
| T-04 | 实现 Mineru v4 适配器（含 ZIP 解析） |  | ☐ 未开始 | 07-10 | 完成批量上传、轮询、ZIP 下载与解析 |
| T-05 | 公共错误类型与重试机制（指数退避） |  | ☐ 未开始 | 07-10 | 新增 OCRError，封装 httpx 请求重试逻辑 |
| T-06 | 数据验证层 (Pydantic Models) |  | ☐ 未开始 | 07-11 | 定义 OCRResult、InvoiceData 等模型 |
| T-07 | 监控与指标埋点 |  | ☐ 未开始 | 07-11 | Prometheus/Metrics 中间件集成 |
| T-08 | 单元测试补充 |  | ☐ 未开始 | 07-12 | 覆盖新服务逻辑、错误分支、ZIP 解析 |
| T-09 | 集成测试：上传->OCR->发票创建全链路 |  | ☐ 未开始 | 07-12 | 使用pytest + testcontainers |
| T-10 | 文档与部署脚本更新 |  | ☐ 未开始 | 07-13 | README、环境变量说明、CI/CD pipeline 更新 |

---

### 详细实施步骤

1. 立项准备（T-01）
   1. 收集现有 `ocr_service.py` 与 `ocr_service_v4.py` 的公共/差异逻辑。
   2. 绘制类图，确定抽象层级：`BaseOCRClient` → `MineruV1Client` / `MineruV4Client`。
   3. 评审设计文档并确认开发排期。

2. 架构改造
   - **T-02**：
     - 创建 `app/services/ocr/base.py`，实现统一配置加载、httpx 客户端封装、_call_api_with_retry 方法（指数退避，默认3次）。
     - 引入 `OCRConfig` 类集中管理超时、token、重试、轮询参数。

   - **T-03 / T-04**：
     - 将现有逻辑迁移到各自适配器，删除重复代码。
     - V4 适配器补全 `_download_and_parse_zip`，解析 JSON/PDF/图片等资源，返回结构化结果。

3. 错误处理与数据验证
   - **T-05**：
     - 定义 `OCRError`, `OCRTimeoutError`, `OCRParseError` 等细粒度异常。
     - 在适配器内部捕获并抛出特定异常，方便上层处理。
   - **T-06**：
     - 使用 Pydantic 定义 `OCRResult`、`StructuredInvoiceData`，在服务返回前进行验证。

4. 监控与日志
   - **T-07**：
     - 在 `_call_api_with_retry`、`extract_invoice_data` 等关键路径添加 `@track_ocr_performance` 装饰器。
     - 暴露关键指标：`ocr_calls_total`、`ocr_failed_total`、`ocr_latency_seconds`。

5. 测试与质量保证
   - **T-08**：
     - 为每个适配器编写单元测试，Mock httpx。
     - 覆盖：成功、超时、API错误、ZIP解析错误、重试机制。
   - **T-09**：
     - 使用测试账户上传PDF，验证全流程生成发票。
     - 对比数据库记录与返回数据的一致性。

6. 文档与交付
   - **T-10**：
     - 更新API文档：新增/变更字段说明。
     - 更新 `.env.example`，补充新配置项。
     - 更新CI脚本，确保测试通过后自动部署。

---

### 测试方案概览

1. **单元测试**
   - 测试覆盖率目标 ≥ 90%
   - 使用 `pytest` + `pytest-asyncio`
   - Mock httpx，验证重试和异常映射

2. **集成测试**
   - 使用 Testcontainers 搭建临时Postgres
   - 启动FastAPI应用，调用 `/api/v1/files/upload`
   - 验证OCR结果写入 `invoices` 表

3. **性能测试**
   - locust 1 并发 50，平均延迟 < 3s
   - 关注批量轮询对CPU/网络的占用

4. **回归测试**
   - 现有邮件流水线/手动上传流程全部通过

---

**说明**：
- `状态` 列使用：☐ 未开始 / ☑ 进行中 / ✅ 已完成。
- 修改本文件时请在PR描述中 @相关负责人。 