# 前端 API 调用迁移分析

## 概述

前端代码中存在两种 API 调用方式：
1. 直接调用 `api.*` (传统后端 API)
2. 调用 `invoiceService.*` (已经支持 Supabase 切换的统一接口)

## 迁移工作量分析

### 1. 发票相关 API 调用

#### 已经使用统一接口的模块 ✅
- `InvoiceListPage.tsx` - 使用 `invoiceService.list()`
- `InvoiceListWithCategories.tsx` - 使用 `invoiceService.getInvoicesByCategory()`
- `DashboardMain.tsx` - 使用 `invoiceService.getStats()`, `getMonthlyStats()`, `getTypeStats()`

#### 需要迁移的模块 ❌
- `hooks/useInvoices.ts` - 直接使用 `api.invoices.*`
  - `list()` - 获取发票列表
  - `get()` - 获取发票详情
  - `stats()` - 获取统计数据
  - `update()` - 更新发票
  - `delete()` - 删除发票

- `services/exportService.ts` - 直接使用 `api.invoices.*`
  - `getDownloadUrl()` - 获取单个下载链接
  - `getBatchDownloadUrls()` - 获取批量下载链接

- `pages/InvoiceUploadPage.tsx` - 直接使用 `api.invoices.createWithFile()`
  - 创建发票（含文件上传）

### 2. OCR 相关 API 调用

- `pages/InvoiceUploadPage.tsx` - 使用 `api.ocr.full()`
  - OCR 处理暂时保持使用后端 API

### 3. 邮箱账户相关 API 调用

- `hooks/useEmailAccounts.ts` - 直接使用 `api.emailAccounts.*`
  - 所有邮箱账户相关操作
  - 邮箱扫描任务相关操作
  - **建议**：暂时保持使用后端 API，后续单独迁移

### 4. 配置相关 API 调用

- `services/configService.ts` - 直接使用 `api.config.*`
  - 配置管理相关操作
  - **建议**：暂时保持使用后端 API

### 5. 其他 API 调用

- `components/email/EmailScanResultsModal.tsx` - 使用 `api.emailProcessing.batchProcess()`
- `components/modals/SmartScanModal.tsx` - 使用 `api.emailScan.createSmartScan()`
- `hooks/useAuth.ts` - 使用 `api.profile.*`
- `components/dashboard/DashboardMain.tsx` - 使用 `api.monitoring.*`

## 迁移优先级

### 高优先级（立即迁移）
1. **`hooks/useInvoices.ts`** - 核心发票操作 Hook
   - 影响范围：所有使用此 Hook 的组件
   - 迁移方案：将 `api.invoices.*` 改为 `invoiceService.*`

2. **`services/exportService.ts`** - 发票导出服务
   - 影响范围：发票下载功能
   - 迁移方案：将 `api.invoices.*` 改为 `invoiceService.*`

### 中优先级（暂缓）
1. **`pages/InvoiceUploadPage.tsx`** - 发票上传页面
   - 原因：文件上传功能尚未迁移到 Supabase
   - 建议：等待 Supabase Storage 集成完成后再迁移

### 低优先级（保持现状）
1. OCR 相关 API - 需要后端处理能力
2. 邮箱账户相关 API - 涉及 IMAP 连接等复杂逻辑
3. 配置管理 API - 系统配置管理
4. 监控相关 API - 系统监控功能

## 迁移步骤

### 第一步：迁移 useInvoices Hook
```typescript
// 将
const response = await api.invoices.list(params)
// 改为
const response = await invoiceService.list(params)
```

### 第二步：迁移 exportService
```typescript
// 将
const response = await api.invoices.getDownloadUrl(invoiceId)
// 改为  
const response = await invoiceService.getDownloadUrl(invoiceId)
```

### 第三步：测试验证
- 测试发票列表功能
- 测试发票详情功能
- 测试发票更新功能
- 测试发票删除功能
- 测试发票导出功能

## 预期收益

1. **统一接口管理** - 所有发票操作都通过 invoiceService
2. **灵活切换** - 可以随时切换 Supabase/传统 API
3. **减少依赖** - 减少对后端 API 的直接依赖
4. **提升性能** - Supabase 直连数据库，性能更好

## 风险评估

1. **兼容性风险** - 低，invoiceService 已经做了接口适配
2. **功能风险** - 低，已通过测试脚本验证
3. **性能风险** - 低，Supabase 性能更好
4. **回滚成本** - 低，可通过开关快速回滚