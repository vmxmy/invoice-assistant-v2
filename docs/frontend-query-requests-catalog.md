# Frontend 服务层查询请求目录

## 概述

本文档详细整理了前端服务层的所有查询类请求，按功能模块进行分组，包含请求参数、返回值类型和使用场景说明。

## 目录结构

- [1. 发票管理模块](#1-发票管理模块)
- [2. 统计分析模块](#2-统计分析模块)
- [3. 收件箱模块](#3-收件箱模块)
- [4. 邮箱账户模块](#4-邮箱账户模块)
- [5. 用户配置模块](#5-用户配置模块)
- [6. 邮件扫描任务模块](#6-邮件扫描任务模块)

---

## 1. 发票管理模块

### 1.1 获取发票列表
**文件位置**: `src/services/supabaseDataService.ts`  
**方法**: `InvoiceService.getInvoices`

```typescript
static async getInvoices(
  userId: string,
  page: number = 1,
  pageSize: number = 20,
  filters?: {
    seller_name?: string
    invoice_number?: string
    date_from?: string
    date_to?: string
    amount_min?: number
    amount_max?: number
  }
): Promise<PaginatedResponse<Invoice>>
```

**功能说明**:
- 获取用户的发票列表，支持分页和多条件过滤
- 自动过滤已删除的发票
- 默认按创建时间降序排序

**返回数据结构**:
```typescript
{
  data: Invoice[]      // 发票数组
  total: number        // 总数量
  error: string | null // 错误信息
}
```

### 1.2 获取最近发票
**文件位置**: `src/services/supabaseStats.ts`  
**方法**: `supabaseStats.getRecentInvoices`

```typescript
async getRecentInvoices(
  userId: string, 
  limit: number = 10
): Promise<Invoice[]>
```

**功能说明**:
- 获取最新的N条发票记录
- 主要用于仪表板和活动流展示
- 包含精简字段：id, invoice_number, invoice_date, seller_name, total_amount, invoice_type, created_at

---

## 2. 统计分析模块

### 2.1 获取用户汇总统计
**文件位置**: `src/services/supabaseStats.ts`  
**方法**: `supabaseStats.getUserSummary`

```typescript
async getUserSummary(userId: string): Promise<UserSummary | null>
```

**返回数据结构**:
```typescript
{
  total_invoices: number      // 发票总数
  total_amount: number        // 总金额
  avg_amount: number          // 平均金额
  max_amount: number          // 最大金额
  min_amount: number          // 最小金额
  active_months: number       // 活跃月份数
  invoice_types: number       // 发票类型数
  latest_invoice_date: string // 最新发票日期
  earliest_invoice_date: string // 最早发票日期
}
```

### 2.2 获取月度统计
**文件位置**: `src/services/supabaseStats.ts`  
**方法**: `supabaseStats.getMonthlyStats`

```typescript
async getMonthlyStats(userId: string): Promise<MonthlyStats[]>
```

**返回数据结构**:
```typescript
{
  month: string         // 月份 (YYYY-MM)
  invoice_count: number // 发票数量
  total_amount: number  // 总金额
  avg_amount: number    // 平均金额
}[]
```

**特点**:
- 返回最近12个月的数据
- 按月份降序排序

### 2.3 获取最近月度统计
**文件位置**: `src/services/supabaseStats.ts`  
**方法**: `supabaseStats.getRecentMonthlyStats`

```typescript
async getRecentMonthlyStats(userId: string): Promise<RecentMonthlyStats[]>
```

**功能说明**:
- 专门为图表优化的月度统计数据
- 按月份升序排序（便于图表展示）

### 2.4 获取发票类型统计
**文件位置**: `src/services/supabaseStats.ts`  
**方法**: `supabaseStats.getTypeStats`

```typescript
async getTypeStats(userId: string): Promise<TypeStats[]>
```

**返回数据结构**:
```typescript
{
  invoice_type: string  // 发票类型
  count: number         // 数量
  total_amount: number  // 总金额
  avg_amount: number    // 平均金额
}[]
```

### 2.5 获取状态分布
**文件位置**: `src/services/supabaseStats.ts`  
**方法**: `supabaseStats.getStatusDistribution`

```typescript
async getStatusDistribution(userId: string): Promise<Record<string, number>>
```

**返回数据结构**:
```typescript
{
  "pending": 10,
  "completed": 45,
  "failed": 2,
  // ...其他状态
}
```

### 2.6 获取仪表板综合统计
**文件位置**: `src/services/supabaseStats.ts`  
**方法**: `supabaseStats.getDashboardStats`

```typescript
async getDashboardStats(userId: string): Promise<DashboardStats>
```

**功能说明**:
- 并行获取所有统计数据
- 一次性返回仪表板所需的全部数据
- 包含格式化后的图表数据

**返回数据结构**:
```typescript
{
  summary: {
    totalInvoices: number
    totalAmount: number
    avgAmount: number
    maxAmount: number
    minAmount: number
    activeMonths: number
    invoiceTypes: number
  },
  monthlyData: Array<{
    month: string
    invoices: number
    amount: number
  }>,
  categoryData: Array<{
    name: string
    value: number
    amount: number
    color: string
  }>,
  recentActivity: Invoice[],
  statusDistribution: Record<string, number>,
  pendingInvoices: number,
  completedInvoices: number
}
```

---

## 3. 收件箱模块

### 3.1 获取用户邮件列表
**文件位置**: `src/services/inboxService.ts`  
**方法**: `InboxService.getUserEmails`

```typescript
static async getUserEmails(params: UseInboxEmailsParams): Promise<EmailListResponse>
```

**请求参数**:
```typescript
{
  userId: string
  page: number
  pageSize: number
  filters: {
    category?: string   // 邮件分类
    status?: string     // 处理状态
    search?: string     // 搜索关键词
  }
}
```

**功能说明**:
- 调用数据库函数 `get_user_emails`
- 支持分页、分类筛选、状态筛选和搜索
- 返回邮件记录和总数

### 3.2 获取邮件详情
**文件位置**: `src/services/inboxService.ts`  
**方法**: `InboxService.getEmailDetail`

```typescript
static async getEmailDetail(
  emailId: string, 
  userId: string
): Promise<EmailDetailResponse>
```

**返回数据结构**:
```typescript
{
  success: boolean
  email: EmailDetail | null
  error?: string
}
```

**EmailDetail 包含**:
- 邮件基本信息（主题、发件人、日期）
- 邮件正文（HTML和纯文本）
- 附件列表
- 处理结果和提取的发票

### 3.3 获取收件箱统计
**文件位置**: `src/services/inboxService.ts`  
**方法**: `InboxService.getInboxStats`

```typescript
static async getInboxStats(userId: string): Promise<InboxStatsResponse>
```

**返回数据结构**:
```typescript
{
  success: boolean
  stats: {
    total_emails: number           // 总邮件数
    unread_emails: number          // 未读邮件数
    verification_emails: number    // 验证邮件数
    invoice_emails: number         // 发票邮件数
    successful_processing: number  // 处理成功数
    failed_processing: number      // 处理失败数
    emails_with_attachments: number // 含附件邮件数
    emails_with_body: number       // 含正文邮件数
    recent_emails_today: number    // 今日邮件数
    recent_emails_week: number     // 本周邮件数
  }
  error?: string
}
```

### 3.4 查询收件箱视图（备用）
**文件位置**: `src/services/inboxService.ts`  
**方法**: `InboxService.queryInboxView`

```typescript
static async queryInboxView(
  userId: string, 
  filters: EmailFilters = {}, 
  page = 1, 
  pageSize = 20
): Promise<EmailListResponse>
```

**功能说明**:
- 直接查询 `v_user_inbox` 视图
- 作为 `getUserEmails` 的备用方法
- 支持更灵活的查询条件

---

## 4. 邮箱账户模块

### 4.1 获取邮箱账户列表
**文件位置**: `src/services/supabaseDataService.ts`  
**方法**: `EmailAccountService.getEmailAccounts`

```typescript
static async getEmailAccounts(userId: string): Promise<ServiceResponse<EmailAccount[]>>
```

**返回数据结构**:
```typescript
{
  data: EmailAccount[] | null
  error: string | null
}
```

**EmailAccount 包含**:
- 邮箱基本信息（地址、提供商）
- IMAP/SMTP 配置
- 同步状态和设置
- 最后同步时间

---

## 5. 用户配置模块

### 5.1 获取用户配置
**文件位置**: `src/services/supabaseDataService.ts`  
**方法**: `UserConfigService.getUserConfig`

```typescript
static async getUserConfig(userId: string): Promise<ServiceResponse<Record<string, any>>>
```

**默认配置结构**:
```typescript
{
  theme: 'light',
  language: 'zh-CN',
  notifications: {
    email_scan_complete: true,
    ocr_processing_complete: true
  },
  display: {
    items_per_page: 20,
    default_date_range: 30
  }
}
```

**特点**:
- 优先从 localStorage 读取
- 如果不存在则返回默认配置
- 支持部分更新和合并

---

## 6. 邮件扫描任务模块

### 6.1 获取扫描任务列表
**文件位置**: `src/services/supabaseDataService.ts`  
**方法**: `EmailScanJobService.getScanJobs`

```typescript
static async getScanJobs(userId: string): Promise<ServiceResponse<EmailScanJob[]>>
```

**返回数据结构**:
```typescript
{
  data: EmailScanJob[] | null
  error: string | null
}
```

**EmailScanJob 包含**:
- 任务基本信息（ID、状态）
- 扫描配置（日期范围、文件夹）
- 处理进度和结果
- 开始/完成时间

---

## 查询请求特性总结

### 通用特性

1. **错误处理模式**
   - 所有查询都返回统一的响应格式
   - 包含 `data/error` 或 `success/error` 字段
   - 错误信息用户友好

2. **分页支持**
   - 列表查询支持分页
   - 标准参数：page, pageSize
   - 返回总数用于分页组件

3. **过滤和搜索**
   - 支持多条件组合过滤
   - 模糊搜索使用 `ilike`
   - 日期范围查询

4. **排序规则**
   - 默认按创建时间降序
   - 部分查询支持自定义排序

### 性能优化

1. **并行查询**
   - `getDashboardStats` 并行获取多个数据源
   - 减少总体加载时间

2. **视图优化**
   - 使用数据库视图预计算统计数据
   - 减少客户端计算

3. **字段精简**
   - 列表查询只返回必要字段
   - 详情查询返回完整信息

### 安全性

1. **用户隔离**
   - 所有查询都需要 userId
   - 数据库级别的 RLS 策略

2. **认证检查**
   - Edge Function 调用需要 session
   - Token 验证

---

## 使用建议

### 1. 选择合适的查询

**场景：仪表板展示**
- 使用 `getDashboardStats` 一次获取所有数据
- 避免多次单独查询

**场景：发票列表页**
- 使用 `getInvoices` 支持完整的筛选和分页
- 配合前端表格组件

**场景：实时活动流**
- 使用 `getRecentInvoices` 获取最新记录
- 限制数量避免性能问题

### 2. 缓存策略

**静态数据**
- 用户配置可以缓存在 localStorage
- 发票类型统计可以缓存较长时间

**动态数据**
- 发票列表需要实时查询
- 使用 React Query 管理缓存失效

### 3. 错误处理

```typescript
// 标准错误处理模式
const result = await InvoiceService.getInvoices(userId, page, pageSize)

if (result.error) {
  // 显示用户友好的错误信息
  showNotification(result.error)
  return
}

// 使用数据
setInvoices(result.data)
```

### 4. 性能监控

建议监控以下指标：
- 查询响应时间
- 数据量大小
- 缓存命中率
- 并发请求数

---

## 改进建议

### 1. 查询优化
- [ ] 实现 GraphQL 聚合查询
- [ ] 添加查询结果缓存层
- [ ] 支持游标分页（大数据集）

### 2. 实时更新
- [ ] 使用 Supabase Realtime 订阅
- [ ] 实现增量数据更新
- [ ] 优化数据同步策略

### 3. 批量查询
- [ ] 支持批量 ID 查询
- [ ] 实现查询合并机制
- [ ] 减少网络请求次数

### 4. 监控和日志
- [ ] 添加查询性能追踪
- [ ] 实现慢查询报警
- [ ] 记录查询使用频率

---

## 附录：类型定义参考

主要类型定义文件：
- `src/types/invoice.ts` - 发票相关类型
- `src/types/inbox.types.ts` - 收件箱相关类型
- `src/types/email.ts` - 邮件相关类型
- `src/types/database.types.ts` - 数据库表类型
- `src/types/dashboard.types.ts` - 仪表板统计类型