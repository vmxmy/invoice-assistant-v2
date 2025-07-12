# 邮箱扫描功能实施总结

## 项目背景
根据用户要求，实施模块化的邮箱扫描功能，使用MCP Supabase部署Edge Function，并复用现有的后端PDF处理API。

## 最终架构

### 1. 系统组件
```
用户 -> Edge Function (Deno) -> Backend API (Python) -> Email IMAP -> PDF Processing
         └─ 认证和路由            └─ 邮箱扫描逻辑        └─ 邮件获取    └─ 发票提取
```

### 2. 关键设计决策

#### 2.1 复用现有数据表
- **不创建新表**：使用现有的 `email_accounts`、`email_processing_tasks`、`invoices` 表
- **原因**：避免重复建设，保持数据一致性

#### 2.2 Edge Function作为协调层
- **职责**：认证验证、请求路由、响应格式化
- **不包含**：IMAP访问、PDF处理、文件存储（这些由后端API处理）

#### 2.3 后端API保持核心逻辑
- **保留功能**：邮箱连接、邮件扫描、PDF解析、发票入库
- **使用现有服务**：EmailProcessor等已有的处理逻辑

## 已部署组件

### 1. Edge Function
- **名称**: email-invoice-scanner
- **URL**: https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/email-invoice-scanner
- **版本**: 10
- **功能**:
  - `action: "scan"` - 启动邮箱扫描
  - `action: "test-connection"` - 测试邮箱连接
  - `action: "check-status"` - 检查扫描状态

### 2. 数据库表结构（现有）
```sql
-- email_accounts: 邮箱账户信息
- id (UUID)
- user_id (UUID)
- email (VARCHAR)
- provider (VARCHAR)
- encrypted_credentials (TEXT) -- Base64编码的JSON
- display_name (VARCHAR)
- is_active (BOOLEAN)

-- email_processing_tasks: 处理任务跟踪
- id (UUID)
- user_id (UUID)
- task_type (VARCHAR) -- 'email_invoice'
- status (VARCHAR)
- task_data (JSONB)
- result_data (JSONB)
- metadata (JSONB)
```

## 使用说明

### 1. 邮箱凭据格式
```json
{
  "username": "your_email@qq.com",
  "password": "your_app_password"
}
```
Base64编码后存储在 `encrypted_credentials` 字段。

### 2. 调用Edge Function
```bash
curl -X POST https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/email-invoice-scanner \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "scan",
    "accountId": "EMAIL_ACCOUNT_ID",
    "scanOptions": {
      "limit": 100,
      "since_days": 7,
      "folder": "INBOX"
    }
  }'
```

### 3. 后端API集成
Edge Function会调用后端API的现有端点：
- 通过 `EmailProcessingTask` 模型创建任务
- 使用后台任务处理邮件扫描
- 结果存储在 `result_data` 字段

## 注意事项

1. **认证要求**：需要有效的Supabase用户令牌
2. **邮箱支持**：QQ、163、126、Gmail、Outlook
3. **PDF处理**：由后端API的现有功能处理
4. **文件存储**：使用现有的Supabase Storage配置

## 测试步骤

1. 启动后端服务：
   ```bash
   cd backend && source venv/bin/activate && python run.py
   ```

2. 获取用户令牌：
   ```bash
   python get_mcp_auth_token.py
   ```

3. 创建邮箱账户（通过前端或API）

4. 调用Edge Function进行扫描

## 未实施部分

由于采用了复用现有系统的策略，以下功能不需要重新实施：
- 新的数据库表（email_scan_jobs、invoice_emails、invoice_files）
- 新的后端API端点（/api/v1/email/*）
- 新的服务类（EmailScannerService）

所有功能通过现有的任务系统（EmailProcessingTask）处理。