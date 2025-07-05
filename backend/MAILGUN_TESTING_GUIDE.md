# Mailgun 邮件处理测试指南

本指南详细说明如何测试完整的邮件处理流程：从 Mailgun 接收邮件到 Webhook 处理再到任务队列执行。

## 📋 测试概述

完整的邮件处理流程包括：
1. **邮件接收**: Mailgun 接收发票邮件
2. **Webhook 转发**: Mailgun 调用我们的 Webhook 端点
3. **数据解析**: 解析邮件内容和附件信息
4. **任务推送**: 将邮件数据推送到任务队列
5. **后台处理**: 下载附件、OCR 提取、存储数据

## 🔧 前置条件

### 1. 环境配置
确保 `.env` 文件包含以下配置：
```bash
# Mailgun 配置
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-domain.mailgun.org
MAILGUN_WEBHOOK_SIGNING_KEY=your-webhook-signing-key

# Webhook 配置（生产环境）
WEBHOOK_BASE_URL=https://your-domain.com

# 数据库配置
DATABASE_URL=postgresql://...
```

### 2. 服务状态
- ✅ 后端服务运行在端口 8090
- ✅ 数据库连接正常
- ✅ 任务队列服务运行中

### 3. Mailgun 账户
- ✅ 有效的 Mailgun 账户和 API 密钥
- ✅ 已验证的域名
- ✅ 沙盒域名或生产域名

## 🚀 测试工具

我们提供了4个测试工具，按复杂度递增：

### 1. Webhook 端点测试 (`test_mailgun_webhook.py`)
**用途**: 测试 Webhook 端点的功能
**特点**: 模拟 Mailgun 请求，不需要真实邮件

```bash
# 运行 Webhook 测试
python test_mailgun_webhook.py
```

测试内容：
- ✅ Webhook 端点连通性
- ✅ 邮件数据解析
- ✅ 签名验证
- ✅ 用户ID提取
- ✅ 任务队列推送

### 2. Mailgun 路由配置 (`setup_mailgun_routes.py`)
**用途**: 配置 Mailgun 邮件路由
**特点**: 自动设置邮件转发到 Webhook

```bash
# 配置 Mailgun 路由
python setup_mailgun_routes.py
```

功能：
- 🧹 清理旧路由
- ➕ 创建发票邮件路由
- 🔗 测试 Webhook 连通性
- 📋 显示配置信息

### 3. 测试邮件发送 (`send_test_invoice_email.py`)
**用途**: 发送真实的测试邮件
**特点**: 通过 Mailgun API 发送带附件的发票邮件

```bash
# 发送测试邮件
python send_test_invoice_email.py
```

邮件内容：
- 📧 专业的发票通知邮件
- 📎 PDF 发票附件
- 🎯 正确的收件人格式

### 4. 完整端到端测试 (`run_complete_email_test.py`)
**用途**: 执行完整的测试流程
**特点**: 自动化整个测试过程

```bash
# 运行完整测试
python run_complete_email_test.py
```

测试步骤：
1. 设置 Mailgun 路由
2. 测试 Webhook 端点
3. 发送测试邮件
4. 验证处理结果

## 📊 测试步骤详解

### 步骤1: 基础连通性测试
```bash
# 测试后端健康状态
curl http://localhost:8090/health

# 测试 Webhook 端点
curl http://localhost:8090/api/v1/webhooks/test-webhook
```

### 步骤2: Webhook 功能测试
```bash
python test_mailgun_webhook.py
```
期望输出：
```
✅ Webhook 端点正常
✅ 邮件处理成功
✅ 签名验证正常工作
✅ 无效收件人正确处理
✅ 多附件处理成功
✅ 真实用户工作流测试成功
成功率: 100.0%
```

### 步骤3: 配置 Mailgun 路由
```bash
python setup_mailgun_routes.py
```
期望输出：
```
✅ Webhook 端点可访问
✅ 成功清理 0 个旧路由
✅ 路由创建成功
🎉 Mailgun 路由设置完成！
```

### 步骤4: 发送和验证
```bash
python send_test_invoice_email.py
```

然后检查：
1. **后端日志**: 查看是否收到 Webhook 请求
2. **任务队列**: 检查是否有新的处理任务
3. **数据库**: 验证是否创建了发票记录

## 🔍 故障排查

### 常见问题1: Webhook 403 错误
**原因**: 签名验证失败
**解决**: 
- 检查 `MAILGUN_WEBHOOK_SIGNING_KEY` 配置
- 在开发环境可以跳过签名验证

### 常见问题2: 路由设置失败
**原因**: API 密钥或域名配置错误
**解决**:
- 验证 `MAILGUN_API_KEY` 是否正确
- 确认 `MAILGUN_DOMAIN` 是否已验证

### 常见问题3: Webhook 连接失败
**原因**: Webhook URL 不可访问
**解决**:
- 开发环境使用 ngrok 暴露本地端口
- 生产环境确保域名和SSL证书正确

### 常见问题4: 邮件发送失败
**原因**: 域名未验证或API配额不足
**解决**:
- 检查 Mailgun 控制台的域名状态
- 确认账户配额和计费状态

## 📝 手动测试流程

如果自动化测试失败，可以手动执行：

### 1. 手动配置 Mailgun 路由
登录 Mailgun 控制台 → Routes → Create Route
- **表达式**: `match_recipient('invoice-.*@yourdomain.mailgun.org')`
- **动作**: `forward('https://your-domain.com/api/v1/webhooks/email-received')`

### 2. 手动发送测试邮件
使用邮箱客户端发送邮件到：
`invoice-{user_id}@yourdomain.mailgun.org`

### 3. 手动验证 Webhook
使用 Postman 或 curl 发送 POST 请求到：
`http://localhost:8090/api/v1/webhooks/email-received`

## 🎯 生产环境部署

### 1. 域名配置
- 使用真实的已验证域名
- 配置正确的 DNS 记录
- 设置 SSL 证书

### 2. Webhook URL
- 使用 HTTPS 协议
- 确保公网可访问
- 配置负载均衡和容错

### 3. 监控和日志
- 设置 Webhook 失败告警
- 监控邮件处理延迟
- 记录详细的处理日志

## 📈 性能测试

### 批量邮件测试
```python
# 修改 send_test_invoice_email.py 中的用户列表
test_user_ids = [
    "user-1-uuid",
    "user-2-uuid", 
    # ... 更多用户ID
]
```

### 并发测试
- 同时发送多封邮件
- 测试任务队列处理能力
- 监控数据库性能

## 🛡️ 安全考虑

1. **签名验证**: 在生产环境必须启用
2. **HTTPS**: Webhook URL 必须使用 HTTPS
3. **访问控制**: 限制 Webhook 端点的访问
4. **数据验证**: 严格验证邮件数据格式
5. **错误处理**: 避免敏感信息泄露

## 📞 技术支持

如果遇到问题：
1. 查看后端日志文件
2. 检查 Mailgun 控制台的邮件日志
3. 使用测试工具的详细输出
4. 参考 Mailgun 官方文档

---

**注意**: 本指南假设你已经熟悉基本的邮件系统概念和 Mailgun 服务。如有疑问，请参考相关文档或联系技术支持。