# 完整发票处理工作流程设计

## 概述
基于已实现的真实IMAP邮件扫描功能，设计端到端的发票处理流水线：
**扫描邮箱 → 筛选邮件 → 提取PDF → 去重检测 → 上传存储 → OCR识别 → 数据库入库**

## 工作流程架构

### 阶段1：邮件扫描与筛选 ✅ (已完成)
**功能**：使用真实IMAP连接扫描邮箱，搜索包含"发票"关键词的邮件
**实现**：
- Edge Function: `email-scan-deno-imap`
- IMAP库: `@bobbyg603/deno-imap`
- 支持QQ邮箱授权码解密
- 任务状态跟踪

**输出**：匹配的邮件列表，包含邮件元数据和附件信息

### 阶段2：PDF提取与下载 🔄 (需扩展)
**功能**：从邮件中提取PDF发票文件

#### 2.1 PDF附件提取
- 遍历邮件附件列表
- 筛选PDF类型附件 (`application/pdf`)
- 下载附件到临时存储

#### 2.2 PDF链接提取  
- 解析邮件正文HTML/文本内容
- 识别PDF下载链接模式
- 支持常见发票提供商链接格式
- 下载链接文件到临时存储

**技术实现**：
```typescript
// 新增方法到RealIMAPClient类
async downloadPDFAttachments(uid: number): Promise<PDFFile[]>
async extractPDFLinksFromBody(uid: number): Promise<string[]>
```

### 阶段3：去重检测 🆕 (新增功能)
**功能**：避免重复处理相同的PDF文件

#### 3.1 文件哈希计算
- 使用SHA-256算法计算PDF文件哈希
- 生成唯一文件标识符

#### 3.2 重复检测
- 查询数据库中已存在的文件哈希
- 跳过重复文件，记录重复信息
- 更新邮件与已有发票的关联关系

**技术实现**：
```typescript
async calculatePDFHash(pdfBuffer: Uint8Array): Promise<string>
async checkDuplicateByHash(hash: string): Promise<boolean>
```

### 阶段4：文件上传存储 🆕 (新增功能)
**功能**：将PDF文件上传到Supabase Storage进行持久化存储

#### 4.1 Supabase Storage上传
- 文件路径规范：`invoices/{userId}/{year}/{hash}.pdf`
- 设置文件访问权限（仅用户可见）
- 记录文件元数据

#### 4.2 文件记录管理
- 文件大小、类型验证
- 上传时间戳记录
- 生成公共访问URL

**技术实现**：
```typescript
async uploadPDFToStorage(pdfBuffer: Uint8Array, metadata: FileMetadata): Promise<string>
async recordFileInDatabase(fileInfo: UploadedFileInfo): Promise<string>
```

### 阶段5：OCR识别处理 🆕 (集成现有)
**功能**：调用现有OCR Edge Function提取发票关键信息

#### 5.1 OCR服务调用
- 调用 `edge-function-ocr` 处理PDF
- 传递文件Storage URL
- 获取结构化发票数据

#### 5.2 数据验证与清洗
- 验证OCR结果完整性
- 标准化日期、金额格式
- 处理识别错误和缺失数据

**技术实现**：
```typescript
async callOCRService(fileUrl: string): Promise<InvoiceOCRResult>
async validateAndCleanOCRData(ocrResult: any): Promise<CleanedInvoiceData>
```

### 阶段6：数据库入库 🆕 (新增功能)
**功能**：将处理完成的发票信息存储到数据库

#### 6.1 发票表设计
**表名**：`invoices`
**关键字段**：
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- email_message_id (text, 关联邮件)
- file_hash (text, 文件唯一标识)
- file_url (text, Storage文件URL)
- invoice_number (text, 发票号码)
- invoice_date (date, 发票日期)
- supplier_name (text, 供应商名称)
- amount (decimal, 金额)
- currency (text, 币种)
- ocr_confidence (float, OCR置信度)
- processing_status (text, 处理状态)
- created_at (timestamp)
- updated_at (timestamp)
```

#### 6.2 关联关系设计
- 与 `email_scan_jobs` 关联（批次追踪）
- 与 `email_accounts` 关联（来源邮箱）
- 与文件存储关联（PDF文件）

**技术实现**：
```typescript
async createInvoiceRecord(invoiceData: ProcessedInvoiceData): Promise<string>
async updateProcessingStatus(invoiceId: string, status: string): Promise<void>
```

## 数据流图

```
邮件扫描(IMAP) → 邮件列表
     ↓
PDF提取(附件+链接) → PDF文件列表
     ↓
哈希计算 → 文件唯一标识
     ↓
重复检测 → 过滤重复文件
     ↓
文件上传(Storage) → 持久化URL
     ↓
OCR识别 → 结构化发票数据
     ↓
数据入库 → 发票记录
```

## 错误处理策略

### 文件处理错误
- PDF损坏：记录错误，跳过处理
- 下载失败：重试机制，最多3次
- 存储失败：清理临时文件，记录失败

### OCR处理错误
- OCR服务不可用：标记待重试
- 识别置信度过低：人工审核标记
- 数据格式错误：使用默认值或留空

### 数据库错误
- 重复键冲突：更新现有记录
- 约束验证失败：记录验证错误
- 连接超时：重试机制

## 监控与日志

### 处理进度跟踪
- 实时更新 `email_scan_jobs` 表状态
- 记录每个阶段的处理时间
- 统计成功/失败/跳过数量

### 详细日志记录
- 文件处理日志（下载、上传、OCR）
- 错误详情记录（类型、原因、堆栈）
- 性能指标监控（处理时间、文件大小）

## 扩展边界

### 性能优化
- 并行处理多个PDF文件
- 文件批量上传
- OCR结果缓存

### 功能扩展
- 支持更多邮件服务商
- 识别更多文档类型
- 智能分类和标签

### 安全考虑
- 文件内容安全扫描
- 用户数据隔离
- 访问权限控制

## 实施计划

1. **第一阶段**：PDF提取功能（附件下载）
2. **第二阶段**：去重检测和文件上传
3. **第三阶段**：OCR集成和数据库设计
4. **第四阶段**：完整流程测试和优化
5. **第五阶段**：错误处理和监控完善

## 预期效果

- **自动化程度**：95%+ 发票处理自动化
- **处理速度**：平均每个PDF < 30秒
- **准确率**：OCR识别准确率 > 90%
- **去重效果**：100% 避免重复处理
- **存储效率**：支持大量PDF文件存储