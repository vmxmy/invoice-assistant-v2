# Frontend 服务层架构文档

## 目录
1. [概述](#概述)
2. [数据模型层](#数据模型层)
3. [服务层架构](#服务层架构)
4. [业务逻辑实现](#业务逻辑实现)
5. [API 集成模式](#api-集成模式)
6. [技术栈](#技术栈)

## 概述

Invoice Assistant V2 前端采用现代化的分层架构设计，实现了数据模型、服务层和业务逻辑的清晰分离。系统基于 TypeScript + React + Supabase 技术栈，提供完整的发票管理、OCR 处理和邮件集成功能。

### 架构特点
- **类型安全**: 100% TypeScript 覆盖，编译时类型检查
- **模块化设计**: 清晰的服务边界和职责分离
- **响应式架构**: 基于 TanStack Query 的实时数据同步
- **安全优先**: 多层验证和数据清理机制

## 数据模型层

### 核心实体模型

#### 1. Invoice 发票模型
位置: `src/types/invoice.ts`, `src/types/index.ts`

```typescript
interface Invoice {
  // 核心标识
  id: string
  user_id: string
  
  // 基础信息
  invoice_number: string
  invoice_code?: string
  invoice_date: string
  invoice_type: InvoiceType
  
  // 交易方信息
  seller_name: string
  seller_tax_number?: string
  buyer_name?: string
  buyer_tax_number?: string
  
  // 金额信息
  total_amount: number
  tax_amount?: number
  amount_without_tax?: number
  currency: string
  
  // 分类与状态
  expense_category?: string
  category_full_path?: string[]
  status: 'active' | 'deleted' | 'archived'
  processing_status: ProcessingStatus
  validation_status: ValidationStatus
  
  // 文件信息
  file_url?: string
  file_path?: string
  file_hash?: string
  file_size?: number
  
  // 元数据
  extracted_data?: any
  confidence_scores?: Record<string, number>
  validation_issues?: ValidationIssue[]
  processing_metadata?: ProcessingMetadata
  
  // 时间戳
  created_at: string
  updated_at: string
}
```

**关键枚举类型**:
- `InvoiceType`: 增值税发票、火车票、机票、出租车票等
- `ValidationStatus`: pending、valid、invalid、warning
- `ConfidenceLevel`: low、medium、high
- `ProcessingStatus`: pending、processing、completed、failed

#### 2. Email 邮件系统模型
位置: `src/types/email.ts`

```typescript
interface EmailAccount {
  id: string
  user_id: string
  email_address: string
  provider: 'gmail' | 'outlook' | 'qq' | 'custom'
  
  // IMAP 配置
  imap_host: string
  imap_port: number
  imap_security: 'SSL' | 'TLS' | 'NONE'
  
  // SMTP 配置（可选）
  smtp_host?: string
  smtp_port?: number
  smtp_security?: 'SSL' | 'TLS' | 'NONE'
  
  // 状态管理
  status: 'active' | 'inactive' | 'error'
  last_sync_at?: string
  sync_error?: string
  
  // 同步配置
  sync_enabled: boolean
  sync_folders: string[]
  auto_process: boolean
}

interface EmailScanJob {
  id: string
  account_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  
  // 扫描配置
  folder: string
  date_from?: string
  date_to?: string
  
  // 处理结果
  total_emails: number
  processed_emails: number
  found_invoices: number
  error_message?: string
  
  // 执行追踪
  started_at?: string
  completed_at?: string
}
```

#### 3. Inbox 收件箱模型
位置: `src/types/inbox.types.ts`

```typescript
interface EmailRecord {
  id: string
  subject: string
  sender: string
  date: string
  
  // 处理状态
  status: 'unread' | 'processing' | 'processed' | 'failed'
  execution_path?: string[]
  
  // 附件信息
  has_attachments: boolean
  attachment_count: number
  
  // 处理结果
  invoice_count?: number
  processing_result?: ProcessingResult
}

interface EmailDetail extends EmailRecord {
  body_html?: string
  body_text?: string
  headers: Record<string, string>
  
  attachments: Attachment[]
  extracted_invoices?: Invoice[]
  
  processing_log?: ProcessingStep[]
}
```

#### 4. Dashboard 统计模型
位置: `src/types/dashboard.types.ts`

```typescript
interface DashboardStats {
  // 总览统计
  total_invoices: number
  total_amount: number
  
  // 分类统计
  by_category: CategoryStat[]
  by_type: TypeStat[]
  by_status: StatusStat[]
  
  // 时间维度
  monthly_stats: MonthlyTrend[]
  yearly_comparison: YearlyComparison
  
  // 处理统计
  processing_stats: {
    pending: number
    completed: number
    failed: number
    average_time: number
  }
}
```

### 数据库类型集成
位置: `src/types/database.types.ts`

- **自动生成**: 从 Supabase Schema 自动生成
- **类型变体**: Insert、Update、Row 类型变体
- **关系映射**: 外键关系的类型安全保证

## 服务层架构

### 核心服务模块

#### 1. SupabaseDataService
位置: `src/services/supabaseDataService.ts`

**主要职责**:
- 数据 CRUD 操作的统一入口
- 分页、过滤、排序支持
- 事务处理和批量操作
- 错误处理和重试机制

**关键服务类**:
```typescript
class InvoiceService {
  static async getInvoices(userId, page, pageSize, filters)
  static async createInvoice(userId, invoiceData)
  static async updateInvoice(invoiceId, userId, updates)
  static async deleteInvoice(invoiceId, userId)
  static async bulkDelete(invoiceIds, userId)
  static async restore(invoiceId, userId)
}

class EmailAccountService {
  static async getAccounts(userId)
  static async createAccount(userId, accountData)
  static async testConnection(accountId)
  static async syncEmails(accountId, options)
}

class EmailScanJobService {
  static async createJob(accountId, config)
  static async getJobs(accountId, status)
  static async cancelJob(jobId)
  static async getJobResults(jobId)
}
```

#### 2. EdgeFunctionOCRService
位置: `src/services/edgeFunctionOCR.ts`

**OCR 处理流程**:
```typescript
class EdgeFunctionOCRService {
  async processOCRComplete(file: File): Promise<OCRResponse> {
    // 1. 文件哈希计算（SHA-256）
    // 2. 去重检查
    // 3. Edge Function 调用
    // 4. 结果转换和验证
    // 5. 数据库存储
  }
  
  async processOCRQuick(file: File): Promise<QuickOCRResponse>
  async validateOCRResult(result: OCRResult): Promise<ValidationResult>
}
```

**响应结构**:
```typescript
interface EdgeFunctionOCRResponse {
  success: boolean
  invoice_type: string
  
  fields: {
    // 基础字段（14个核心字段）
    invoice_number?: string
    invoice_date?: string
    seller_name?: string
    total_amount?: number
    // ... 更多字段
  }
  
  confidence: {
    overall: number
    fields: Record<string, number>
  }
  
  validation: {
    is_valid: boolean
    field_results: Record<string, any>
    completeness_score: number
  }
  
  // 去重信息
  isDuplicate?: boolean
  duplicateInfo?: DuplicateInfo
  
  // 处理元数据
  metadata: ProcessingMetadata
}
```

#### 3. InboxService
位置: `src/services/inboxService.ts`

**邮件处理功能**:
```typescript
class InboxService {
  // 邮件列表和详情
  static async getEmails(filters, pagination)
  static async getEmailDetail(emailId)
  
  // 处理工作流
  static async processEmail(emailId)
  static async reprocessEmail(emailId)
  static async markAsProcessed(emailId)
  
  // 批量操作
  static async bulkProcess(emailIds)
  static async bulkDelete(emailIds)
  
  // HTML 安全处理
  static sanitizeHTML(html: string): string
}
```

#### 4. 统计服务
位置: `src/services/supabaseStats.ts`

```typescript
class StatsService {
  static async getDashboardStats(userId): Promise<DashboardStats>
  static async getCategoryStats(userId, period)
  static async getMonthlyTrends(userId, year)
  static async getProcessingMetrics(userId)
}
```

### OCR 处理子系统
位置: `src/services/ocr/`

#### 模块化设计
1. **fieldExtractor.ts**: 字段提取和映射
2. **dataValidator.ts**: 数据验证逻辑
3. **businessRuleProcessor.ts**: 业务规则处理
4. **ocrDataTransformer.ts**: 数据格式转换

#### 处理流程
```
原始图片 → OCR识别 → 字段提取 → 数据验证 → 
业务规则 → 格式转换 → 数据库存储
```

## 业务逻辑实现

### 1. 发票去重机制

```typescript
// 文件哈希计算
async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// 去重检查流程
1. 计算文件 SHA-256 哈希
2. 查询数据库是否存在相同哈希
3. 如果存在，返回重复信息
4. 如果不存在，继续处理
5. 检查已删除项，提供恢复选项
```

### 2. 邮件附件处理

```typescript
// 邮件扫描工作流
async function scanEmailAttachments(email: Email) {
  const invoices = []
  
  for (const attachment of email.attachments) {
    if (isInvoiceFile(attachment)) {
      // 1. 下载附件
      const file = await downloadAttachment(attachment)
      
      // 2. OCR 处理
      const ocrResult = await processOCR(file)
      
      // 3. 数据验证
      if (ocrResult.validation.is_valid) {
        // 4. 创建发票记录
        const invoice = await createInvoice(ocrResult)
        invoices.push(invoice)
      }
    }
  }
  
  return invoices
}
```

### 3. 数据验证规则

```typescript
// 多层验证体系
interface ValidationPipeline {
  // 1. 字段级验证
  fieldValidation: {
    required: string[]
    patterns: Record<string, RegExp>
    ranges: Record<string, [min: number, max: number]>
  }
  
  // 2. 业务规则验证
  businessRules: {
    checkTaxCalculation: boolean
    checkDateConsistency: boolean
    checkAmountLimits: boolean
  }
  
  // 3. 跨字段验证
  crossFieldValidation: {
    totalAmount: 'amount_without_tax + tax_amount'
    dateRange: 'invoice_date <= current_date'
  }
}
```

### 4. 分类管理系统

```typescript
// 层级分类结构
interface Category {
  id: string
  name: string
  parent_id?: string
  full_path: string[]
  color: string
  icon: string
  
  // 统计信息
  invoice_count: number
  total_amount: number
  
  // 子分类
  children?: Category[]
}

// 分类路径管理
function buildCategoryPath(category: Category): string[] {
  const path = [category.name]
  let parent = category.parent
  
  while (parent) {
    path.unshift(parent.name)
    parent = parent.parent
  }
  
  return path
}
```

## API 集成模式

### 1. Supabase 集成

```typescript
// 认证管理
const { data: { session } } = await supabase.auth.getSession()

// 实时订阅
const subscription = supabase
  .from('invoices')
  .on('INSERT', payload => handleNewInvoice(payload.new))
  .on('UPDATE', payload => handleInvoiceUpdate(payload.new))
  .subscribe()

// RLS (行级安全)
// 所有查询自动应用用户级别的安全策略
```

### 2. Edge Functions 调用

```typescript
// Edge Function 调用模式
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/ocr-process`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'multipart/form-data'
    },
    body: formData
  }
)
```

### 3. 错误处理策略

```typescript
// 统一错误处理
interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

// 错误恢复机制
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await delay(Math.pow(2, i) * 1000) // 指数退避
    }
  }
}
```

## 技术栈

### 核心技术
- **TypeScript 5.6**: 类型安全和现代 JavaScript 特性
- **React 18.3**: 组件化 UI 框架
- **Vite 6.0**: 快速的开发构建工具
- **TailwindCSS 3.4**: 原子化 CSS 框架
- **DaisyUI 4.12**: UI 组件库

### 数据管理
- **TanStack Query 5.62**: 服务器状态管理
- **Supabase Client 2.47**: 后端即服务集成
- **Zustand**: 客户端状态管理

### 开发工具
- **ESLint**: 代码质量检查
- **TypeScript ESLint**: TypeScript 特定规则
- **Prettier**: 代码格式化

### 部署与运维
- **Docker**: 容器化部署
- **Nginx**: 静态资源服务
- **GitHub Actions**: CI/CD 流程

## 性能优化

### 1. 代码分割
- 路由级别的懒加载
- 组件级别的动态导入
- 第三方库的按需加载

### 2. 数据缓存
- TanStack Query 的查询缓存
- LocalStorage 的用户配置缓存
- SessionStorage 的临时数据缓存

### 3. 渲染优化
- React.memo 的组件记忆化
- useMemo/useCallback 的计算优化
- 虚拟滚动的大列表渲染

### 4. 网络优化
- 请求去重和合并
- 分页和增量加载
- WebSocket 的实时更新

## 安全措施

### 1. 输入验证
- 客户端类型验证
- 服务端二次验证
- SQL 注入防护

### 2. 认证授权
- JWT Token 管理
- 角色权限控制
- 会话超时处理

### 3. 数据保护
- HTTPS 传输加密
- 敏感数据脱敏
- XSS 攻击防护

### 4. 文件安全
- 文件类型检查
- 文件大小限制
- 病毒扫描集成

## 总结

Frontend 服务层架构体现了现代 Web 应用的最佳实践：

1. **完整的类型系统**: 提供编译时安全保证和优秀的开发体验
2. **模块化服务设计**: 清晰的职责划分，便于维护和扩展
3. **强大的业务能力**: 支持复杂的发票处理和邮件集成场景
4. **优秀的性能表现**: 多层缓存和优化策略
5. **全面的安全防护**: 多层验证和防护机制
6. **良好的可扩展性**: 模块化和插件化的架构设计

该架构为企业级发票管理系统提供了坚实的技术基础，能够满足复杂的业务需求和高性能要求。