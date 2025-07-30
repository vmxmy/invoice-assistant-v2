# 增强版邮件扫描API使用指南

## 概述

增强版邮件扫描API是基于Python imap-tools库构建的完整邮件处理解决方案，提供邮件连接、搜索、内容提取和PDF附件检测等功能。

## 技术架构

### 核心组件
- **FastAPI框架**: 提供高性能Web API接口
- **imap-tools库**: Python IMAP客户端，支持现代IMAP协议
- **中文编码支持**: 完整支持中文邮件主题和附件名解码
- **PDF智能检测**: 多重策略检测PDF附件

### 数据流程
1. 邮箱认证连接 → 2. 邮件搜索筛选 → 3. 内容提取解析 → 4. PDF附件检测 → 5. 结构化数据返回

## API端点详解

### 1. 健康检查 `/health`
**方法**: GET  
**认证**: 不需要  
**用途**: 检查服务状态和依赖可用性

```bash
curl -X GET "http://localhost:8070/api/v1/email-scan-enhanced/health"
```

**响应示例**:
```json
{
  "data": {
    "service": "email-scan-enhanced",
    "status": "healthy",
    "imap_tools_available": true,
    "timestamp": "2025-07-29T19:44:32.599959"
  },
  "message": "邮件扫描服务运行正常",
  "timestamp": "2025-07-29T19:44:32.599972"
}
```

### 2. 支持的邮箱服务商 `/supported-providers`
**方法**: GET  
**认证**: 不需要  
**用途**: 获取预配置的主流邮箱服务商IMAP设置

```bash
curl -X GET "http://localhost:8070/api/v1/email-scan-enhanced/supported-providers"
```

**支持的服务商**:
- QQ邮箱 (imap.qq.com:993)
- 163邮箱 (imap.163.com:993) 
- 126邮箱 (imap.126.com:993)
- Gmail (imap.gmail.com:993)
- Outlook (outlook.office365.com:993)

### 3. 邮箱连接测试 `/test-connection`
**方法**: POST  
**认证**: 需要用户Token  
**用途**: 验证邮箱配置和连接状态

**请求格式**:
```json
{
  "test_type": "connection",
  "email_config": {
    "host": "imap.qq.com",
    "port": 993,
    "tls": true,
    "username": "example@qq.com",
    "password": "authorization_code"
  }
}
```

**响应示例**:
```json
{
  "data": {
    "connected": true,
    "total_messages": 470,
    "unseen_messages": 288
  },
  "message": "连接测试完成",
  "timestamp": "2025-07-29T19:44:33.234330"
}
```

### 4. 完整邮件扫描 `/scan-emails`
**方法**: POST  
**认证**: 需要用户Token  
**用途**: 执行完整的邮件搜索、内容提取和附件分析

**请求格式**:
```json
{
  "email_account_id": "user_email_account_uuid",
  "search_params": {
    "folders": ["INBOX"],
    "subject_keywords": ["发票", "invoice"],
    "exclude_keywords": ["退信", "undelivered"],
    "sender_filters": ["finance@company.com"],
    "date_from": "2025-07-01",
    "date_to": "2025-07-29",
    "max_emails": 50
  },
  "extract_content": true,
  "extract_attachments": true,
  "download_attachments": false
}
```

**响应示例**:
```json
{
  "data": {
    "total_found": 15,
    "emails_analyzed": 15,
    "pdf_attachments_found": 8,
    "scan_duration": 2.45,
    "emails": [
      {
        "message_id": 12345,
        "uid": "12345",
        "subject": "2025年7月发票",
        "sender": "finance@company.com",
        "date": "2025-07-29T10:30:00",
        "body_text": "请查收本月发票...",
        "body_html": "<p>请查收本月发票...</p>",
        "attachments": [
          {
            "filename": "发票_202507.pdf",
            "type": "APPLICATION",
            "subtype": "PDF",
            "size": 245760,
            "encoding": "BASE64",
            "section": "1",
            "is_pdf": true
          }
        ]
      }
    ]
  },
  "message": "扫描完成，找到 15 封邮件，其中 8 个PDF附件",
  "timestamp": "2025-07-29T19:44:35.123456"
}
```

### 5. 快速邮件扫描 `/quick-scan/{email_account_id}`
**方法**: POST  
**认证**: 需要用户Token  
**用途**: 简化版邮件扫描，适合快速测试

**查询参数**:
- `keywords`: 搜索关键词数组，默认["发票"]
- `days`: 搜索天数，默认7天
- `max_emails`: 最大邮件数，默认20封

```bash
curl -X POST "http://localhost:8070/api/v1/email-scan-enhanced/quick-scan/uuid?keywords=发票&days=7&max_emails=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 邮件搜索功能

### 支持的搜索条件
- **主题关键词**: 支持中文UTF-8编码
- **发件人筛选**: 精确匹配或域名筛选
- **日期范围**: YYYY-MM-DD格式
- **排除关键词**: 过滤不需要的内容
- **文件夹选择**: 支持多文件夹搜索

### 中文邮件处理
```python
# 邮件头解码示例
subject = "=?UTF-8?B?MjAyNeuVhO+8lbKzIOydmOyduA==?="
decoded = "2025年 7月 发票"  # 自动解码
```

## PDF附件检测策略

### 多重检测机制
1. **文件扩展名**: `.pdf`后缀检测
2. **MIME类型**: `application/pdf`内容类型
3. **部分匹配**: 内容类型包含`pdf`关键词

### 附件信息提取
```json
{
  "filename": "发票_2025Q3.pdf",
  "type": "APPLICATION", 
  "subtype": "PDF",
  "size": 1024000,
  "encoding": "BASE64",
  "section": "2",
  "is_pdf": true
}
```

## 错误处理和调试

### 常见错误类型
- **连接错误**: 网络问题或服务器配置错误
- **认证失败**: 用户名密码错误或需要授权码
- **搜索超时**: 邮件数量过大或网络延迟
- **编码问题**: 非UTF-8编码的邮件内容

### 调试建议
1. 使用`/health`端点检查服务状态
2. 使用`/test-connection`验证邮箱配置
3. 查看API响应中的错误详情
4. 检查日志文件获取详细错误信息

## 邮箱服务商配置

### QQ邮箱设置
1. 登录QQ邮箱网页版
2. 设置 → 账户 → POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务
3. 开启IMAP/SMTP服务
4. 生成授权码（不是登录密码）

### 163/126邮箱设置  
1. 登录邮箱网页版
2. 设置 → POP3/SMTP/IMAP
3. 开启IMAP服务
4. 设置客户端授权密码

### Gmail设置
1. 开启两步验证
2. 生成应用专用密码
3. 使用应用专用密码连接

## 性能优化建议

### 搜索优化
- 使用日期范围限制搜索结果
- 设置合理的`max_emails`限制
- 优先使用主题关键词筛选

### 网络优化
- 使用持久连接减少握手开销
- 合理设置超时时间
- 考虑使用连接池

## 安全注意事项

### 认证安全
- 使用授权码而非登录密码
- 定期更换授权码
- 不在日志中记录敏感信息

### 数据安全
- 邮件内容不长期存储
- 附件下载使用临时目录
- 传输过程使用TLS加密

## API集成示例

### Python客户端示例
```python
import requests

# 1. 健康检查
health = requests.get("http://localhost:8070/api/v1/email-scan-enhanced/health")
print(f"服务状态: {health.json()['data']['status']}")

# 2. 连接测试
test_data = {
    "test_type": "connection",
    "email_config": {
        "host": "imap.qq.com",
        "port": 993,
        "tls": True,
        "username": "example@qq.com", 
        "password": "auth_code"
    }
}

connection = requests.post(
    "http://localhost:8070/api/v1/email-scan-enhanced/test-connection",
    json=test_data,
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)

if connection.json()['data']['connected']:
    print("邮箱连接成功")
```

### JavaScript/TypeScript示例
```typescript
interface EmailScanResponse {
  data: {
    total_found: number;
    emails_analyzed: number; 
    pdf_attachments_found: number;
    scan_duration: number;
    emails: EmailInfo[];
  };
  message: string;
  timestamp: string;
}

const scanEmails = async (accountId: string, token: string) => {
  const response = await fetch(`/api/v1/email-scan-enhanced/quick-scan/${accountId}?keywords=发票&days=30`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const result: EmailScanResponse = await response.json();
  console.log(`找到 ${result.data.total_found} 封邮件，${result.data.pdf_attachments_found} 个PDF附件`);
};
```

## 测试和验证

### 单元测试
```bash
# 基础连接测试
python scripts/test_imap_tools_simple.py

# API端点测试  
python scripts/test_email_api_direct.py
```

### 集成测试
```bash
# 完整功能测试
curl -X POST "http://localhost:8070/api/v1/email-scan-enhanced/scan-emails" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d @test_scan_request.json
```

## 故障排除

### 连接问题
- 检查网络连接和防火墙设置
- 确认IMAP服务已在邮箱中启用
- 验证主机名和端口配置

### 认证问题
- 使用授权码而非登录密码
- 检查用户名格式（完整邮箱地址）
- 确认授权码未过期

### 搜索问题
- 检查日期格式（YYYY-MM-DD）
- 确认关键词编码正确
- 减少搜索条件简化测试

## 版本历史

### v1.0.0 (2025-07-29)
- 基于imap-tools的Python实现
- 支持中文邮件处理
- 完整的PDF附件检测
- 统一的API响应格式
- comprehensive测试覆盖

---

本文档最后更新: 2025-07-29  
API版本: v1.0.0  
维护者: 开发团队