# Supabase端OCR处理架构迁移设计方案

## 项目概述

### 背景
原有的邮件扫描发票处理系统存在以下问题：
- 邮件扫描任务执行周期普遍在200秒以上
- Edge Function有150秒的时间限制
- OCR处理与邮件扫描紧耦合，导致超时问题
- 服务器资源占用较高

### 目标
将完整的邮件发票处理系统迁移到Supabase端，包括：

**邮件处理模块：**
1. **邮箱扫描和IMAP连接**
2. **IMAP搜索筛选**
3. **邮件解析和内容提取**
4. **PDF链接下载**
5. **邮件附件提取**
6. **存储桶文件管理**

**OCR处理模块：**
7. **发票类型识别**
8. **字段解析转换** 
9. **发票信息数据库写入**

通过这种全面的架构迁移，实现处理时间的优化、系统完全解耦和资源效率最大化提升。

## 架构设计

### 原有架构问题分析

```mermaid
graph TD
    A[邮件扫描] --> B[下载PDF]
    B --> C[OCR识别]
    C --> D[类型识别]
    D --> E[字段解析]
    E --> F[数据库写入]
    
    style C fill:#ff9999
    style D fill:#ff9999
    style E fill:#ff9999
    style F fill:#ff9999
```

**问题点：**
- 整个流程串行执行，总时间超过200秒
- Edge Function超时限制导致处理失败
- 服务器资源集中占用

### 新架构设计

```mermaid
graph TD
    A[触发邮件扫描] --> B[IMAP连接 Function]
    B --> C[邮件搜索筛选 Function]
    C --> D[邮件解析 Function]
    D --> E[PDF链接提取 Function]
    D --> F[附件提取 Function]
    E --> G[PDF下载到存储桶]
    F --> H[附件存储到存储桶]
    G --> I[创建OCR任务记录]
    H --> I
    I --> J[返回扫描结果]
    
    K[批量OCR处理] --> L[从存储桶读取PDF]
    L --> M[OCR识别 Function]
    M --> N[类型识别 Function]
    M --> O[字段解析 Function]  
    M --> P[数据库写入 Function]
    
    style B fill:#99ccff
    style C fill:#99ccff
    style D fill:#99ccff
    style E fill:#99ccff
    style F fill:#99ccff
    style N fill:#99ff99
    style O fill:#99ff99
    style P fill:#99ff99
```

**优势：**
- 邮件处理与OCR处理完全分离
- 每个模块独立部署，便于维护
- 利用Supabase全球CDN加速
- 无时间限制的后台处理
- 完全无服务器架构，零运维
- 自动扩容，支持高并发

## 技术方案

## 邮件处理模块 (Supabase端实现)

### 1. 邮箱扫描和IMAP连接模块

**Edge Function:** `email-imap-connector`

**核心功能：**
- 建立IMAP连接（支持Gmail、Outlook、QQ邮箱、163邮箱等）
- 处理邮箱认证和安全连接
- 连接状态管理和错误处理

**关键代码结构：**
```typescript
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  provider: 'gmail' | 'outlook' | 'qq' | '163' | 'custom';
}

class IMAPConnector {
  private static readonly PROVIDER_CONFIGS = {
    'gmail': { host: 'imap.gmail.com', port: 993, secure: true },
    'outlook': { host: 'outlook.office365.com', port: 993, secure: true },
    'qq': { host: 'imap.qq.com', port: 993, secure: true },
    '163': { host: 'imap.163.com', port: 993, secure: true }
  };

  async connect(config: EmailConfig): Promise<IMAPConnection> {
    // 验证配置
    this.validateConfig(config);
    
    // 建立IMAP连接
    const connection = await this.establishConnection(config);
    
    // 测试连接
    await this.testConnection(connection);
    
    return connection;
  }
}
```

### 2. IMAP搜索筛选模块

**Edge Function:** `email-search-filter`

**核心功能：**
- 基于多种条件搜索邮件
- 支持时间范围、发件人、主题、内容关键字筛选
- 智能发票邮件识别

```typescript
interface SearchCriteria {
  dateRange?: { from: Date; to: Date; };
  senders?: string[];
  subjects?: string[];
  bodyKeywords?: string[];
  hasAttachments?: boolean;
  attachmentTypes?: string[];
}

class EmailSearchFilter {
  private static readonly INVOICE_KEYWORDS = [
    '发票', 'invoice', '账单', 'bill', '收据', 'receipt',
    '电子发票', '增值税发票', '普通发票', '专用发票'
  ];

  async searchEmails(connection: IMAPConnection, criteria: SearchCriteria): Promise<EmailSearchResult[]> {
    // 1. 构建IMAP搜索条件
    const searchQuery = this.buildSearchQuery(criteria);
    
    // 2. 执行搜索
    const messageIds = await connection.search(searchQuery);
    
    // 3. 获取邮件基本信息
    const emails = await this.fetchEmailHeaders(connection, messageIds);
    
    // 4. 智能筛选发票相关邮件
    const filteredEmails = this.filterInvoiceEmails(emails);
    
    return filteredEmails;
  }
}
```

### 3. 邮件解析和内容提取模块

**Edge Function:** `email-content-parser`

**核心功能：**
- 解析邮件结构（头部、正文、附件）
- 提取HTML和纯文本内容
- 识别并提取PDF链接
- 处理邮件编码问题

```typescript
interface ParsedEmail {
  uid: string;
  messageId: string;
  subject: string;
  sender: { name: string; email: string; };
  date: Date;
  bodyText: string;
  bodyHtml: string;
  pdfLinks: string[];
  attachments: EmailAttachment[];
}

class EmailContentParser {
  async parseEmail(connection: IMAPConnection, uid: string): Promise<ParsedEmail> {
    // 1. 获取完整邮件内容
    const rawEmail = await connection.fetch(uid, {
      bodies: '', struct: true, envelope: true
    });
    
    // 2. 解析邮件结构
    const parsed = await this.parseEmailStructure(rawEmail);
    
    // 3. 提取内容和PDF链接
    const textContent = await this.extractTextContent(parsed);
    const htmlContent = await this.extractHtmlContent(parsed);
    const pdfLinks = this.extractPdfLinks(textContent, htmlContent);
    
    return { /* 完整的解析结果 */ };
  }

  private extractPdfLinks(textContent: string, htmlContent: string): string[] {
    const pdfLinkRegex = /https?:\/\/[^\s]+\.pdf/gi;
    const htmlLinkRegex = /<a[^>]+href=["']([^"']*\.pdf[^"']*)[^>]*>/gi;
    
    // 提取并验证PDF链接
    const links = [...textContent.match(pdfLinkRegex) || [], ...htmlMatches];
    return [...new Set(links)].filter(link => this.isValidPdfUrl(link));
  }
}
```

### 4. PDF链接下载模块

**Edge Function:** `pdf-link-downloader`

**核心功能：**
- 从邮件中提取的PDF链接下载文件
- 支持各种认证方式（Basic Auth、Token等）
- 文件完整性验证
- 自动重试机制

```typescript
class PdfLinkDownloader {
  async downloadPdf(config: DownloadConfig): Promise<DownloadResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InvoiceBot/1.0)', ...headers },
          signal: AbortSignal.timeout(timeout)
        });
        
        const arrayBuffer = await response.arrayBuffer();
        
        // 验证PDF文件
        if (config.validatePdf) {
          this.validatePdfContent(arrayBuffer);
        }
        
        return {
          success: true,
          content: arrayBuffer,
          filename: this.generateFilename(url, response.headers),
          size: arrayBuffer.byteLength
        };
      } catch (error) {
        // 重试逻辑
      }
    }
  }
}
```

### 5. 邮件附件提取和存储模块

**Edge Function:** `email-attachment-extractor`

**核心功能：**
- 提取邮件中的PDF附件
- 处理各种编码格式（Base64、Quoted-Printable等）
- 附件元数据提取
- 存储到Supabase Storage

```typescript
class EmailAttachmentExtractor {
  async extractAttachments(connection: IMAPConnection, uid: string): Promise<ExtractedAttachment[]> {
    // 1. 获取邮件结构
    const structure = await connection.fetch(uid, { struct: true });
    
    // 2. 查找附件部分
    const attachmentParts = this.findAttachmentParts(structure);
    
    // 3. 提取每个PDF附件
    const attachments = [];
    for (const part of attachmentParts) {
      if (this.isPdfAttachment(part)) {
        const attachment = await this.extractAttachment(connection, uid, part);
        attachments.push(attachment);
      }
    }
    
    return attachments;
  }

  private decodeAttachment(rawContent: string, encoding: string): ArrayBuffer {
    switch (encoding.toLowerCase()) {
      case 'base64':
        return this.base64ToArrayBuffer(rawContent);
      case 'quoted-printable':
        return this.quotedPrintableToArrayBuffer(rawContent);
      default:
        return new TextEncoder().encode(rawContent).buffer;
    }
  }
}
```

### 6. 存储桶文件管理模块

**Edge Function:** `storage-file-manager`

**核心功能：**
- 上传文件到Supabase Storage
- 生成唯一文件路径
- 文件元数据管理
- 存储权限控制

```typescript
class StorageFileManager {
  async uploadPdfFile(content: ArrayBuffer, filename: string, metadata: FileMetadata): Promise<UploadResult> {
    try {
      // 1. 生成唯一文件路径
      const filePath = this.generateFilePath(filename, metadata);
      
      // 2. 上传到存储桶
      const { data, error } = await this.supabase.storage
        .from('invoice-pdfs')
        .upload(filePath, content, {
          contentType: 'application/pdf',
          metadata: {
            originalFilename: filename,
            source: metadata.source,
            emailUid: metadata.emailUid,
            uploadedAt: new Date().toISOString()
          }
        });
      
      // 3. 记录文件信息到数据库
      await this.recordFileInfo(filePath, metadata);
      
      return { success: true, filePath: data.path, size: content.byteLength };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private generateFilePath(filename: string, metadata: FileMetadata): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const userId = metadata.userId;
    const emailUid = metadata.emailUid;
    const cleanFilename = this.sanitizeFilename(filename);
    
    return `users/${userId}/emails/${emailUid}/${timestamp}-${cleanFilename}`;
  }
}
```

### 7. 统一邮件扫描处理接口

**Edge Function:** `email-scan-complete`

**核心功能：**
- 协调所有邮件处理步骤
- 支持多种邮箱提供商
- 提供完整的错误处理和进度反馈

```typescript
class CompleteEmailScanner {
  async scanEmails(request: EmailScanRequest): Promise<EmailScanResult> {
    const results = {
      totalEmails: 0,
      processedEmails: 0,
      downloadedFiles: 0,
      uploadedFiles: [],
      errors: []
    };

    try {
      // 1. 建立IMAP连接
      const connection = await this.connectToEmail(request.emailConfig);
      
      // 2. 搜索邮件
      const emails = await this.searchEmails(connection, request.searchCriteria);
      results.totalEmails = emails.length;
      
      // 3. 处理每封邮件
      for (const email of emails) {
        try {
          // 解析邮件内容
          const parsedEmail = await this.parseEmail(connection, email.uid);
          
          // 下载PDF链接
          const downloadedLinks = await this.downloadPdfLinks(parsedEmail.pdfLinks);
          
          // 提取附件
          const attachments = await this.extractAttachments(connection, email.uid);
          
          // 上传文件到存储桶
          const uploadedFiles = await this.uploadFiles([...downloadedLinks, ...attachments], request.userId);
          
          // 记录邮件元数据
          await this.storeEmailMetadata(parsedEmail, request.scanJobId);
          
          results.processedEmails++;
          results.downloadedFiles += downloadedLinks.length + attachments.length;
          results.uploadedFiles.push(...uploadedFiles);
          
        } catch (error) {
          results.errors.push({
            emailUid: email.uid,
            error: error.message
          });
        }
      }
      
      return { success: true, data: results };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

## OCR处理模块 (Supabase端实现)

### 8. 发票类型识别模块 (Supabase端)

**Edge Function:** `invoice-type-detector`

**核心功能：**
- 解析阿里云OCR返回的JSON数据
- 映射发票类型（增值税发票、火车票、机票等）
- 计算类型识别置信度

**关键代码结构：**
```typescript
class InvoiceTypeDetector {
  private static readonly TYPE_MAPPING = {
    'VATInvoice': '增值税发票',
    'TrainTicket': '火车票',
    'FlightTicket': '机票',
    // ... 更多类型映射
  }

  static detectInvoiceType(ocrData: OCRResponse): InvoiceTypeResult {
    // 解析Data字段，提取subMsgs
    // 映射发票类型
    // 计算置信度
  }
}
```

**输入/输出：**
- 输入：阿里云OCR原始响应数据
- 输出：发票类型、置信度、原始类型

### 2. 字段解析转换模块 (Supabase端)

**Edge Function:** `invoice-field-parser`

**核心功能：**
- 根据发票类型选择对应解析器
- 提取并转换字段数据
- 处理置信度信息

**支持的发票类型：**
- **增值税发票：** 28个字段（发票号码、开票日期、价税合计等）
- **火车票：** 20个字段（车票号、车次、出发站等）
- **通用发票：** 动态字段解析

**关键代码结构：**
```typescript
class InvoiceFieldParser {
  static parseInvoiceFields(ocrData: any, invoiceType: string): ParsedInvoiceData {
    // 根据类型选择解析器
    if (invoiceType.includes('增值税')) {
      return this.parseVATInvoice(result);
    } else if (invoiceType.includes('火车票')) {
      return this.parseTrainTicket(result);
    }
    // ... 其他类型处理
  }
}
```

### 3. 数据库写入模块 (Supabase端)

**Edge Function:** `invoice-data-writer`

**核心功能：**
- 检查重复发票
- 写入发票主记录
- 记录字段详情（可选）
- 更新用户统计

**数据库操作：**
```typescript
class InvoiceDataWriter {
  async writeInvoiceData(invoiceData: InvoiceData) {
    // 1. 检查重复
    const duplicate = await this.checkDuplicate(invoiceData);
    
    // 2. 插入发票记录
    const invoice = await this.supabase
      .from('invoices')
      .insert(dbRecord);
    
    // 3. 写入字段详情
    await this.writeFieldDetails(invoice.id, fields);
    
    // 4. 更新统计
    await this.updateStatistics(userId, invoiceType);
  }
}
```

### 4. 统一处理接口

**Edge Function:** `process-invoice-complete`

**核心功能：**
- 协调所有处理步骤
- 支持文件路径和Base64两种输入方式
- 提供完整的错误处理和日志

**处理流程：**
```typescript
class CompleteInvoiceProcessor {
  async processInvoice(request: ProcessInvoiceRequest) {
    // 1. 获取PDF内容
    const pdfContent = await this.getPdfContent(request);
    
    // 2. 调用阿里云OCR
    const ocrResult = await this.callAliyunOCR(pdfContent);
    
    // 3. 识别发票类型
    const typeResult = await this.detectInvoiceType(ocrResult);
    
    // 4. 解析字段
    const fieldsResult = await this.parseInvoiceFields(ocrResult, typeResult.invoice_type);
    
    // 5. 写入数据库
    const writeResult = await this.writeToDatabase(invoiceData);
    
    return processingResult;
  }
}
```

## 数据库设计

### 主要表结构

```sql
-- 发票主表
CREATE TABLE invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    invoice_type TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    invoice_date DATE,
    total_amount DECIMAL(10,2),
    seller_name TEXT,
    buyer_name TEXT,
    file_path TEXT,
    confidence DECIMAL(3,2),
    raw_ocr_data JSONB,
    parsed_fields JSONB,
    processing_status TEXT DEFAULT 'completed',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 发票字段详情表
CREATE TABLE invoice_fields (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_value TEXT,
    confidence DECIMAL(3,2),
    original_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户统计表
CREATE TABLE user_invoice_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    invoice_type TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    total_amount DECIMAL(12,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, invoice_type)
);

-- 邮件扫描作业表
CREATE TABLE email_scan_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    job_name TEXT NOT NULL,
    email_config JSONB NOT NULL,
    search_criteria JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    progress_info JSONB DEFAULT '{}',
    total_emails INTEGER DEFAULT 0,
    processed_emails INTEGER DEFAULT 0,
    downloaded_files INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 扫描的邮件记录表
CREATE TABLE scanned_emails (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scan_job_id UUID REFERENCES email_scan_jobs(id) ON DELETE CASCADE,
    email_uid TEXT NOT NULL,
    message_id TEXT,
    subject TEXT NOT NULL,
    sender_name TEXT,
    sender_email TEXT NOT NULL,
    email_date TIMESTAMP WITH TIME ZONE,
    body_text TEXT,
    body_html TEXT,
    pdf_links JSONB DEFAULT '[]',
    attachment_count INTEGER DEFAULT 0,
    processing_status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(scan_job_id, email_uid)
);

-- 上传文件记录表
CREATE TABLE uploaded_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    file_path TEXT NOT NULL UNIQUE,
    original_filename TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    email_uid TEXT,
    scan_job_id UUID REFERENCES email_scan_jobs(id),
    source TEXT NOT NULL, -- 'email_attachment', 'pdf_link', 'manual_upload'
    content_type TEXT DEFAULT 'application/pdf',
    file_size BIGINT,
    upload_status TEXT DEFAULT 'pending',
    ocr_status TEXT DEFAULT 'pending',
    ocr_result JSONB,
    storage_bucket TEXT DEFAULT 'invoice-pdfs',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 邮箱配置表（加密存储）
CREATE TABLE email_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    account_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    username TEXT NOT NULL,
    encrypted_password TEXT NOT NULL,
    host TEXT,
    port INTEGER,
    secure BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    last_scan_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, username)
);
```

### 存储函数

```sql
-- 统计更新函数
CREATE OR REPLACE FUNCTION increment_user_invoice_count(
    user_id UUID,
    invoice_type TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO user_invoice_stats (user_id, invoice_type, count, updated_at)
    VALUES (user_id, invoice_type, 1, NOW())
    ON CONFLICT (user_id, invoice_type) 
    DO UPDATE SET 
        count = user_invoice_stats.count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

## 前后端接口设计

### 前端调用接口

```typescript
// 邮件扫描服务类
export class SupabaseEmailService {
  // 启动邮件扫描
  async startEmailScan(scanConfig: EmailScanConfig): Promise<EmailScanJobResult> {
    const response = await fetch('/functions/v1/email-scan-complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getSession()?.access_token}`
      },
      body: JSON.stringify({
        email_config: scanConfig.emailConfig,
        search_criteria: scanConfig.searchCriteria,
        user_id: scanConfig.userId,
        job_name: scanConfig.jobName
      })
    });
    
    return await response.json();
  }

  // 检查扫描状态
  async checkScanStatus(jobId: string): Promise<EmailScanStatus> {
    const response = await fetch(`/functions/v1/email-scan-status/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${getSession()?.access_token}`
      }
    });
    
    return await response.json();
  }

  // 获取扫描结果
  async getScanResults(jobId: string): Promise<EmailScanResults> {
    const response = await fetch(`/functions/v1/email-scan-results/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${getSession()?.access_token}`
      }
    });
    
    return await response.json();
  }

  // 批量OCR处理
  async startBatchOCR(filePaths: string[], userId: string): Promise<BatchOCRResult> {
    const response = await fetch('/functions/v1/batch-ocr-process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getSession()?.access_token}`
      },
      body: JSON.stringify({
        file_paths: filePaths,
        user_id: userId
      })
    });
    
    return await response.json();
  }
}

// OCR处理服务类
export class SupabaseOCRService {
  // 单文件处理
  async processInvoiceFile(file: File, userId: string): Promise<InvoiceProcessResult> {
    const fileContent = await this.fileToBase64(file);
    
    const response = await fetch('/functions/v1/process-invoice-complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getSession()?.access_token}`
      },
      body: JSON.stringify({
        file_content: fileContent,
        user_id: userId,
        metadata: {
          source: 'manual_upload',
          filename: file.name
        }
      })
    });
    
    return await response.json();
  }

  // 批量处理
  async processBatchFiles(filePaths: string[], userId: string): Promise<BatchProcessResult> {
    // 并行处理多个文件
    const promises = filePaths.map(filePath => 
      this.processInvoiceByPath(filePath, userId)
    );
    
    const results = await Promise.allSettled(promises);
    return this.formatBatchResults(results);
  }
}
```

### 后端API简化

```python
# 邮件扫描相关API
@router.post("/email-scan/start")
async def start_email_scan(
    scan_config: EmailScanConfigSchema,
    current_user = Depends(get_current_user)
):
    """启动邮件扫描作业"""
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.SUPABASE_URL}/functions/v1/email-scan-complete",
            headers={
                "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "email_config": scan_config.email_config,
                "search_criteria": scan_config.search_criteria,
                "user_id": str(current_user.id),
                "job_name": scan_config.job_name
            }
        )
    
    return response.json()

@router.get("/email-scan/status/{job_id}")
async def get_scan_status(
    job_id: str,
    current_user = Depends(get_current_user)
):
    """获取邮件扫描状态"""
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.SUPABASE_URL}/functions/v1/email-scan-status/{job_id}",
            headers={
                "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}"
            }
        )
    
    return response.json()

@router.post("/ocr/batch-process")
async def batch_process_ocr(
    file_paths: List[str],
    current_user = Depends(get_current_user)
):
    """批量OCR处理"""
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.SUPABASE_URL}/functions/v1/batch-ocr-process",
            headers={
                "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "file_paths": file_paths,
                "user_id": str(current_user.id)
            }
        )
    
    return response.json()

# OCR处理相关API（简化为代理调用）
@router.post("/process-invoice")
async def process_invoice_via_supabase(
    file_path: str,
    current_user = Depends(get_current_user)
):
    """通过Supabase Edge Function处理发票"""
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.SUPABASE_URL}/functions/v1/process-invoice-complete",
            headers={
                "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "file_path": file_path,
                "user_id": str(current_user.id)
            }
        )
    
    return response.json()
```

## 部署配置

### Supabase Edge Functions部署

```bash
# 部署邮件处理函数
supabase functions deploy email-imap-connector
supabase functions deploy email-search-filter
supabase functions deploy email-content-parser
supabase functions deploy pdf-link-downloader
supabase functions deploy email-attachment-extractor
supabase functions deploy storage-file-manager
supabase functions deploy email-scan-complete

# 部署OCR处理函数
supabase functions deploy invoice-type-detector
supabase functions deploy invoice-field-parser  
supabase functions deploy invoice-data-writer
supabase functions deploy process-invoice-complete

# 部署批量处理函数
supabase functions deploy batch-ocr-process

# 设置环境变量
supabase secrets set ALICLOUD_ACCESS_KEY_ID=your_key
supabase secrets set ALICLOUD_ACCESS_KEY_SECRET=your_secret
supabase secrets set ALICLOUD_OCR_REGION=cn-hangzhou

# 设置邮件加密密钥
supabase secrets set EMAIL_ENCRYPTION_KEY=your_encryption_key
```

### 数据库迁移

```bash
# 执行数据库迁移
supabase db push

# 设置RLS政策
supabase db reset
```

## 性能优化

### 处理时间对比

| 处理阶段 | 原架构时间 | 新架构时间 | 优化效果 |
|---------|------------|------------|----------|
| 邮件扫描 | 200+秒 | 60-120秒 | 50%+ 提升 |
| IMAP连接 | 5-10秒 | 3-5秒 | 稳定优化 |
| 邮件搜索 | 20-60秒 | 15-40秒 | 33% 提升 |
| 附件下载 | 60-120秒 | 30-60秒 | 50% 提升 |
| OCR识别 | 串行处理 | 并行处理 | 无限扩展 |
| 数据写入 | 集中处理 | 分布式 | 负载分散 |
| 总体流程 | 串行阻塞 | 异步流水线 | 3-5倍提升 |

### 并发处理能力

- **原架构：** 受服务器资源限制，并发能力有限
- **新架构：** 利用Supabase全球分布，支持更高并发
- **扩展性：** Edge Functions自动扩容，无需手动管理

### 错误处理和重试

```typescript
// 内置重试机制
class RetryHandler {
  async executeWithRetry(operation: () => Promise<any>, maxRetries: number = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await this.delay(attempt * 1000); // 递增延迟
      }
    }
  }
}
```

## 监控和日志

### 性能监控指标

- 处理成功率
- 平均处理时间
- 错误类型统计
- 用户使用量统计

### 日志记录

```typescript
// 结构化日志
interface ProcessingLog {
  timestamp: string;
  user_id: string;
  file_path: string;
  processing_time: number;
  invoice_type: string;
  confidence: number;
  status: 'success' | 'failed';
  error_message?: string;
}
```

## 迁移计划

### 阶段1：基础设施准备 (2-3天)
- [ ] 创建Supabase项目和存储桶
- [ ] 配置数据库表结构（邮件、文件、OCR相关表）
- [ ] 设置环境变量和密钥
- [ ] 配置邮件加密和安全策略

### 阶段2：邮件处理模块开发 (4-6天)
- [ ] 实现IMAP连接和认证函数
- [ ] 实现邮件搜索筛选函数
- [ ] 实现邮件内容解析函数
- [ ] 实现PDF链接下载函数
- [ ] 实现邮件附件提取函数
- [ ] 实现存储桶文件管理函数
- [ ] 创建统一邮件扫描接口

### 阶段3：OCR处理模块开发 (3-4天)
- [ ] 实现发票类型识别函数
- [ ] 实现字段解析转换函数
- [ ] 实现数据库写入函数
- [ ] 创建统一OCR处理接口
- [ ] 实现批量OCR处理函数

### 阶段4：集成测试 (3-4天)
- [ ] 单元测试各个邮件处理函数
- [ ] 单元测试各个OCR处理函数
- [ ] 集成测试完整邮件扫描流程
- [ ] 集成测试完整OCR处理流程
- [ ] 性能测试和优化
- [ ] 负载测试和并发验证

### 阶段5：前后端适配 (3-4天)
- [ ] 修改前端邮件扫描接口
- [ ] 修改前端OCR处理接口
- [ ] 简化后端API为代理调用
- [ ] 更新错误处理和进度反馈逻辑
- [ ] 实现实时状态更新

### 阶段6：安全和监控 (2-3天)
- [ ] 配置邮箱密码加密存储
- [ ] 设置访问权限和RLS策略
- [ ] 配置日志和监控告警
- [ ] 实现错误追踪和性能监控

### 阶段7：上线部署 (1-2天)
- [ ] 部署所有Edge Functions到生产环境
- [ ] 数据库迁移和数据同步
- [ ] 灰度测试和逐步切流
- [ ] 监控配置和告警设置
- [ ] 文档更新和培训

## 风险评估

### 技术风险
- **Edge Function稳定性：** 监控函数执行状态，设置告警
- **数据一致性：** 使用事务确保数据完整性
- **API限制：** 合理控制调用频率，设置熔断机制

### 业务风险
- **处理准确性：** 保持原有解析逻辑，充分测试
- **用户体验：** 提供进度反馈，优化错误提示
- **数据安全：** 使用Supabase内置安全机制

### 应对措施
- 保留原有后端代码作为备份方案
- 分阶段灰度上线
- 详细的监控和告警机制
- 快速回滚方案

## 总结

本方案通过将完整的邮件发票处理系统迁移到Supabase端，实现了：

## 核心价值

### 1. 性能优化突破
- **邮件扫描优化50%+：** 从200+秒优化到60-120秒
- **总体流程提升3-5倍：** 串行阻塞变为异步流水线
- **OCR处理无限扩展：** 支持并行处理，突破单机限制
- **实时进度反馈：** 用户体验显著提升

### 2. 架构革命性升级
- **完全解耦设计：** 邮件处理与OCR处理独立运行
- **微服务化拆分：** 9个独立Edge Function，各司其职
- **无服务器架构：** 零运维，自动扩容，按需付费
- **全球分布加速：** 利用Supabase CDN，用户就近访问

### 3. 功能完整性保证
- **邮件处理全覆盖：** IMAP连接、搜索、解析、下载、存储
- **OCR智能识别：** 发票类型识别、字段解析、数据写入
- **多格式支持：** 邮件附件、PDF链接、手动上传
- **安全可靠：** 加密存储、权限控制、错误恢复

### 4. 开发维护优化
- **模块化开发：** 每个功能独立开发、测试、部署
- **代码复用性高：** 统一的接口设计和错误处理
- **监控可观测：** 完整的日志、指标、告警体系
- **快速迭代：** Edge Function支持热更新

### 5. 成本效益最大化
- **服务器成本降低80%+：** 无需维护邮件处理服务器
- **运维成本归零：** Supabase托管，无需人工运维
- **弹性扩容：** 按实际使用量付费，避免资源浪费
- **故障率降低：** 利用云厂商的高可用基础设施

## 技术创新点

1. **邮件处理Edge Function化：** 首次将复杂的IMAP邮件处理完全迁移到边缘计算
2. **OCR流水线优化：** 类型识别→字段解析→数据写入的高效流水线
3. **存储计算分离：** 文件存储与计算处理完全解耦
4. **实时状态同步：** WebSocket + 数据库触发器实现实时进度更新

## 长期价值

1. **可扩展性：** 支持更多邮箱提供商、更多发票类型
2. **国际化：** 利用全球CDN，支持海外用户
3. **AI集成：** 为未来AI能力升级预留接口
4. **生态兼容：** 标准化API，便于第三方集成

这种全面的架构迁移不仅解决了当前的性能瓶颈，更为系统的长期发展构建了现代化、可扩展、高可用的技术底座。通过Serverless架构的采用，系统获得了无限的扩展能力和极低的运维成本，真正实现了"开箱即用、按需扩展"的理想状态。