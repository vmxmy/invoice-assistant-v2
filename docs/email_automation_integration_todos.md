# 邮箱扫描服务自动化流程集成 TODO

## 项目目标
实现邮箱扫描服务的完整自动化流程：PDF下载 → OCR识别 → 发票创建 → 统计更新

## 核心API端点
- **发票识别**：`/api/v1/ocr/combined/full` - 识别PDF文件中的发票信息
- **发票保存**：`/api/v1/invoices/create-with-file` - 创建并保存发票记录到数据库

## 当前问题分析
- ❌ 邮箱扫描只下载PDF附件，用户需要手动上传进行OCR
- ❌ OCR识别和发票创建流程分离，用户体验断层
- ❌ 扫描任务统计信息不完整（processed_invoices字段未更新）
- ❌ 从"扫描"到"发票入库"需要多次手动操作

## 实施路线图

### Phase 1: 基础集成（高优先级）🔥

#### 1.1 后端服务架构改进
- [ ] **创建AutomatedInvoiceProcessor服务类**
  - 文件：`backend/app/services/automated_invoice_processor.py`
  - 功能：协调OCR和发票创建的自动化流程
  - 负责：PDF文件队列管理、OCR调用、发票创建

- [ ] **修改EmailScannerService集成OCR**
  - 文件：`backend/app/services/email_scanner_service.py`
  - 修改：下载PDF后自动调用OCR服务
  - **API端点**：`/api/v1/ocr/combined/full`（发票识别）

- [ ] **增强OCR服务支持批量处理**
  - 文件：`backend/app/api/v1/endpoints/ocr_combined.py`
  - 功能：添加批量OCR处理接口
  - 优化：支持文件路径直接输入（避免重复上传）

#### 1.2 数据流集成
- [ ] **实现PDF→OCR自动流程**
  - 位置：`AutomatedInvoiceProcessor.process_downloaded_pdfs()`
  - 逻辑：扫描下载的PDF文件 → 批量OCR识别
  - 错误处理：记录失败文件和原因

- [ ] **实现OCR→发票创建自动流程**
  - 位置：`AutomatedInvoiceProcessor.create_invoice_from_ocr()`
  - 逻辑：OCR成功 → 调用发票创建API
  - **API端点**：`/api/v1/invoices/create-with-file`（发票保存）

#### 1.3 基础错误处理
- [ ] **添加文件处理状态跟踪**
  - 表结构：扩展EmailScanJob表，添加处理详情字段
  - 字段：`pdf_files_processed`, `ocr_success_count`, `ocr_failed_count`

- [ ] **实现重试机制**
  - 功能：OCR失败文件的自动重试（最多3次）
  - 策略：指数退避重试间隔

### Phase 2: 发票自动创建（高优先级）🔥

#### 2.1 发票创建集成
- [ ] **修改发票创建API支持自动化调用**
  - 文件：`backend/app/api/v1/endpoints/invoices.py`
  - **API端点**：`/api/v1/invoices/create-with-file`
  - 功能：适配自动化调用，支持OCR结果直接创建发票
  - 内部接口：`create_invoice_from_ocr_result()`

- [ ] **重复发票检测机制**
  - 逻辑：基于发票号码和金额检测重复
  - 策略：重复发票跳过创建，记录到日志

#### 2.2 事务一致性
- [ ] **实现OCR+发票创建的事务处理**
  - 策略：OCR成功但发票创建失败时的回滚机制
  - 日志：详细记录每个步骤的处理结果

### Phase 3: 统计信息完善（中优先级）⚡

#### 3.1 扫描任务统计更新
- [ ] **更新EmailScanJob模型字段**
  - 字段确认：`processed_invoices`字段已存在
  - 实现：实时更新已处理的发票数量

- [ ] **增加详细统计信息**
  - 新增字段：`ocr_success_count`, `ocr_failed_count`, `duplicate_invoice_count`
  - 位置：EmailScanJob表扩展

#### 3.2 实时进度更新
- [ ] **前端进度显示增强**
  - 文件：`frontend/src/pages/EmailAccountsPage.tsx`
  - 功能：显示OCR处理进度（X/Y个PDF已处理）
  - 实时：WebSocket或轮询更新进度

### Phase 4: 性能优化（中优先级）⚡

#### 4.1 异步队列机制
- [ ] **引入Celery任务队列**
  - 配置：Redis作为消息队列
  - 任务：PDF处理任务异步化
  - 好处：避免长时间请求超时

- [ ] **批量处理优化**
  - 策略：多个PDF文件批量发送给OCR服务
  - 限制：控制并发OCR请求数量（避免服务过载）

#### 4.2 缓存和重复处理优化
- [ ] **PDF文件哈希缓存**
  - 机制：基于文件哈希值避免重复OCR
  - 存储：Redis缓存OCR结果

### Phase 5: 用户体验增强（低优先级）🌟

#### 5.1 前端界面改进
- [ ] **处理结果详细报告**
  - 文件：创建新页面 `EmailScanResultPage.tsx`
  - 内容：成功/失败文件列表、错误原因、重试选项

- [ ] **手动重试功能**
  - 位置：扫描结果页面
  - 功能：针对失败的PDF文件手动重新处理

#### 5.2 监控和日志
- [ ] **添加详细处理日志**
  - 级别：INFO（成功处理）、ERROR（失败原因）
  - 内容：文件名、处理时间、OCR结果摘要

- [ ] **性能指标监控**
  - 指标：平均处理时间、成功率、文件大小分布
  - 工具：集成到现有监控系统

## 技术实现要点

### 核心架构
```python
# 新增服务类结构
class AutomatedInvoiceProcessor:
    def __init__(self, ocr_service, invoice_service):
        pass
    
    async def process_scan_job(self, scan_job_id):
        # 1. 获取下载的PDF文件列表
        # 2. 批量OCR处理
        # 3. 自动创建发票记录
        # 4. 更新统计信息
        pass
```

### API端点复用
- **发票识别**：`/api/v1/ocr/combined/full` - OCR识别PDF中的发票信息
- **发票保存**：`/api/v1/invoices/create-with-file` - 创建并保存发票记录
- **进度查询**：扩展现有扫描进度API

### 数据库字段扩展
```sql
-- EmailScanJob表增强
ALTER TABLE email_scan_jobs ADD COLUMN pdf_files_count INTEGER DEFAULT 0;
ALTER TABLE email_scan_jobs ADD COLUMN ocr_success_count INTEGER DEFAULT 0;
ALTER TABLE email_scan_jobs ADD COLUMN ocr_failed_count INTEGER DEFAULT 0;
ALTER TABLE email_scan_jobs ADD COLUMN duplicate_invoice_count INTEGER DEFAULT 0;
```

## 预期收益

### 用户体验提升
- ✅ 一键式发票处理：从"扫描邮箱"到"发票入库"
- ✅ 减少手动操作：无需手动上传已下载的PDF
- ✅ 实时进度反馈：了解处理状态和结果

### 系统价值增加
- ✅ 完整发票管理解决方案
- ✅ 自动化程度显著提升
- ✅ 数据准确性增强（减少人工错误）

### 技术架构优化
- ✅ 服务间协调机制
- ✅ 异步处理能力
- ✅ 错误处理和恢复机制

## 实施时间估算

- **Phase 1**: 2-3天（基础集成）
- **Phase 2**: 1-2天（发票创建）
- **Phase 3**: 1天（统计完善）
- **Phase 4**: 2-3天（性能优化）
- **Phase 5**: 1-2天（用户体验）

**总计**: 7-11个工作日

## 风险评估

### 技术风险
- **OCR服务稳定性**：大批量处理时的性能表现
- **文件处理异常**：损坏或非标准格式的PDF文件
- **内存使用**：大文件批量处理的资源消耗

### 缓解措施
- 分批处理，控制并发数量
- 完善错误处理和重试机制
- 监控资源使用情况

## 实施检查清单

### Phase 1 完成标准
- [ ] 下载的PDF可以自动触发OCR识别
- [ ] OCR失败有明确的错误记录和重试机制
- [ ] 基础的处理统计信息正确更新

### Phase 2 完成标准
- [ ] OCR成功的发票可以自动创建到数据库
- [ ] 重复发票能够正确检测和跳过
- [ ] 整个流程的事务一致性得到保证

### Phase 3 完成标准
- [ ] 扫描任务的所有统计字段准确更新
- [ ] 前端可以显示完整的处理进度信息

### 最终验收标准
✅ 用户点击"开始扫描"后，可以直接在发票管理页面看到识别成功的发票记录
✅ 扫描任务显示完整的统计信息：扫描邮件数、有效邮件数、PDF附件数、成功创建的发票数
✅ 处理失败的文件有明确的失败原因和重试选项

---

**优先级说明**：
- 🔥 高优先级：核心功能，立即实施
- ⚡ 中优先级：性能和完善性，后续实施
- 🌟 低优先级：用户体验增强，可选实施

**关联文档**：
- 基础邮箱管理功能：`docs/email_management_todos.md`
- 发票管理相关：`docs/03_design/02_database_models/invoice.md`
- API设计规范：`docs/03_design/03_api/`