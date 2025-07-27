# 前端 API 调用迁移总结

## 迁移概述

本文档记录了前端代码从直接调用后端 API (`api.*`) 迁移到使用统一的 `invoiceService` 接口的完成情况。

## 已完成的迁移

### 1. useInvoices Hook ✅
**文件**: `frontend/src/hooks/useInvoices.ts`

**修改内容**:
- 导入从 `api` 改为 `invoiceService`
- `api.invoices.list()` → `invoiceService.list()`
- `api.invoices.get()` → `invoiceService.get()`
- `api.invoices.stats()` → `invoiceService.stats()`
- `api.invoices.update()` → `invoiceService.update()`
- `api.invoices.delete()` → `invoiceService.delete()`

**影响范围**: 所有使用 React Query hooks 的发票相关组件

### 2. exportService ✅
**文件**: `frontend/src/services/exportService.ts`

**修改内容**:
- 导入从 `api` 改为 `invoiceService`
- `api.invoices.getDownloadUrl()` → `invoiceService.getDownloadUrl()`
- `api.invoices.getBatchDownloadUrls()` → `invoiceService.getBatchDownloadUrls()`
- 适配了响应格式差异（`urls` vs `files`）

**影响范围**: 发票下载和导出功能

## 技术细节

### 1. 响应格式兼容性处理

由于 Supabase 服务返回的格式与传统 API 略有不同，在 `exportService` 中做了兼容处理：

```typescript
// 兼容两种响应格式
const urls = urlResponse.urls || urlResponse.files || [];
```

### 2. 接口定义更新

更新了接口定义以支持两种响应格式：

```typescript
interface BatchDownloadUrlResponse {
  urls?: DownloadUrlResponse[];
  files?: Array<{
    invoice_id: string;
    download_url: string;
    filename: string;
  }>;
  batch_id?: string;
}
```

## 测试工具

创建了 `frontend/src/test/testApiMigration.ts` 测试脚本，可以在浏览器控制台中运行：

```javascript
runApiMigrationTests()
```

测试内容包括：
1. 获取发票列表
2. 获取发票详情
3. 获取发票统计
4. 更新发票
5. 获取下载URL
6. 获取批量下载URL
7. 服务切换状态

## 迁移收益

1. **统一接口管理**: 所有发票操作都通过 `invoiceService`，便于维护
2. **灵活切换**: 可以通过开关在 Supabase 和传统 API 之间切换
3. **减少耦合**: 业务逻辑与具体 API 实现解耦
4. **性能提升**: 使用 Supabase 直连数据库，减少了中间层

## 未迁移的模块

以下模块暂时保持使用传统 API：

1. **InvoiceUploadPage** - 文件上传功能尚未迁移到 Supabase
2. **邮箱账户相关** - 涉及 IMAP 连接等复杂后端逻辑
3. **OCR 处理** - 需要后端处理能力
4. **配置管理** - 系统配置相关
5. **监控功能** - 系统监控相关

## 验证方法

1. 在浏览器中访问应用
2. 打开开发者工具控制台
3. 运行 `runApiMigrationTests()`
4. 查看测试结果

## 注意事项

1. 确保 `invoiceService` 的 `useSupabase` 设置为 `true`（默认值）
2. 文件上传功能仍使用传统 API
3. 所有错误处理逻辑保持不变

## 回滚方案

如需回滚到传统 API，只需在代码中调用：

```javascript
invoiceService.enableAPI()
```

或修改 `frontend/src/services/invoice.ts` 中的默认值：

```typescript
private useSupabase = false // 改为 false 使用传统 API
```