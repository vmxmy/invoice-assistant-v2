# 增强版邮件扫描API使用指南

## 概述

增强版邮件扫描API (`/api/v1/email-scan-enhanced`) 是基于deno-imap测试脚本成功经验构建的完整邮件扫描服务，直接集成到现有的FastAPI系统中。

### 主要功能

1. **邮箱连接测试** - 验证IMAP配置是否正确
2. **智能邮件搜索** - 支持中文UTF-8编码的精确搜索
3. **邮件内容提取** - 获取邮件主题、正文、发件人等信息
4. **PDF附件检测** - 智能检测和分析PDF附件，包含错误恢复机制
5. **快速扫描模式** - 简化的一键扫描功能
6. **完整扫描模式** - 可定制的高级扫描功能

### 技术特点

- **基于deno-imap** - 使用经过测试验证的Deno IMAP客户端
- **错误恢复机制** - 当标准解析失败时，从错误信息中提取PDF附件信息
- **中文支持** - 正确处理中文邮件主题和文件名编码
- **异步处理** - 支持后台异步执行长时间扫描任务
- **安全性** - 临时文件自动清理，敏感信息保护

## API端点详解

### 1. 健康检查

**端点**: `GET /api/v1/email-scan-enhanced/health`

**描述**: 检查服务状态和Deno环境是否可用

**响应示例**:
```json
{
  "data": {
    "service": "email-scan-enhanced",
    "status": "healthy",
    "deno_available": true,
    "deno_version": "deno 1.40.0",
    "timestamp": "2024-12-29T10:30:00Z"
  },
  "message": "邮件扫描服务运行正常"
}
```

### 2. 支持的邮箱服务商

**端点**: `GET /api/v1/email-scan-enhanced/supported-providers`

**描述**: 获取支持的邮箱服务商配置信息

**响应示例**:
```json
{
  "data": {
    "qq": {
      "name": "QQ邮箱",
      "host": "imap.qq.com",
      "port": 993,
      "tls": true,
      "auth_note": "需要在QQ邮箱设置中生成授权码，不是登录密码"
    },
    "163": {
      "name": "163邮箱",
      "host": "imap.163.com",
      "port": 993,
      "tls": true,
      "auth_note": "需要在163邮箱设置中开启IMAP并设置客户端授权密码"
    }
  }
}
```

### 3. 邮箱连接测试

**端点**: `POST /api/v1/email-scan-enhanced/test-connection`

**描述**: 测试邮箱IMAP连接是否正常

**请求体**:
```json
{
  "test_type": "connection",
  "email_config": {
    "host": "imap.qq.com",
    "port": 993,
    "tls": true,
    "username": "your@qq.com",
    "password": "your-auth-code"
  }
}
```

**响应示例**:
```json
{
  "data": {
    "connected": true,
    "total_messages": 1523,
    "unseen_messages": 15
  },
  "message": "连接测试完成"
}
```

### 4. 快速邮件扫描

**端点**: `POST /api/v1/email-scan-enhanced/quick-scan/{email_account_id}`

**描述**: 简化版邮件扫描，适合快速测试和常用场景

**查询参数**:
- `keywords`: 搜索关键词列表，默认["发票"]
- `days`: 搜索天数，默认7天
- `max_emails`: 最大邮件数，默认20封

**示例请求**:
```
POST /api/v1/email-scan-enhanced/quick-scan/account-123?keywords=发票&days=7&max_emails=10
```

**响应示例**:
```json
{
  "data": {
    "total_found": 15,
    "emails_analyzed": 15,
    "pdf_attachments_found": 8,
    "scan_duration": 12.5,
    "emails": [
      {
        "message_id": 12345,
        "uid": "12345",
        "subject": "【12306】火车票购票成功通知",
        "sender": "noreply@rails.com.cn",
        "date": "2024-12-25 10:30:00",
        "body_text": "您的火车票已购买成功...",
        "body_html": "<html>...</html>",
        "attachments": [
          {
            "filename": "火车票电子客票.pdf",
            "type": "APPLICATION",
            "subtype": "PDF",
            "size": 25678,
            "encoding": "BASE64",
            "section": "2",
            "is_pdf": true
          }
        ]
      }
    ]
  },
  "message": "扫描完成，找到 15 封邮件，其中 8 个PDF附件"
}
```

### 5. 完整邮件扫描

**端点**: `POST /api/v1/email-scan-enhanced/scan-emails`

**描述**: 完整的邮件扫描功能，支持高级搜索参数和自定义选项

**请求体**:
```json
{
  "email_account_id": "account-123",
  "search_params": {
    "folders": ["INBOX"],
    "subject_keywords": ["发票"],
    "exclude_keywords": ["测试", "广告"],
    "sender_filters": ["12306.cn"],
    "date_from": "2024-12-01",
    "date_to": "2024-12-31",
    "max_emails": 50
  },
  "extract_content": true,
  "extract_attachments": true,
  "download_attachments": false
}
```

**响应格式**: 与快速扫描相同，但支持更多定制化选项

## 使用场景示例

### 场景1: 发票邮件收集

```python
import requests

# 搜索最近30天的发票邮件
response = requests.post(
    "http://localhost:8090/api/v1/email-scan-enhanced/quick-scan/my-account",
    params={
        "keywords": ["发票"],
        "days": 30,
        "max_emails": 100
    }
)

if response.status_code == 200:
    data = response.json()["data"]
    print(f"找到 {data['total_found']} 封发票邮件")
    print(f"其中 {data['pdf_attachments_found']} 个PDF附件")
```

### 场景2: 特定发件人邮件分析

```python
# 搜索来自12306的邮件
scan_request = {
    "email_account_id": "my-account",
    "search_params": {
        "sender_filters": ["12306"],
        "date_from": "2024-01-01",
        "max_emails": 50
    },
    "extract_content": True,
    "extract_attachments": True
}

response = requests.post(
    "http://localhost:8090/api/v1/email-scan-enhanced/scan-emails",
    json=scan_request
)
```

### 场景3: 邮箱连接诊断

```python
# 测试邮箱配置
test_request = {
    "test_type": "connection",
    "email_config": {
        "host": "imap.qq.com",
        "port": 993,
        "tls": True,
        "username": "your@qq.com",
        "password": "your-auth-code"
    }
}

response = requests.post(
    "http://localhost:8090/api/v1/email-scan-enhanced/test-connection",
    json=test_request
)

if response.status_code == 200:
    result = response.json()["data"]
    if result["connected"]:
        print(f"连接成功！共有 {result['total_messages']} 封邮件")
    else:
        print(f"连接失败: {result['error']}")
```

## 错误处理

### 常见错误类型

1. **连接错误** (状态码: 500)
   ```json
   {
     "detail": "连接测试失败: IMAP connection failed"
   }
   ```

2. **认证失败** (状态码: 500)
   ```json
   {
     "detail": "邮件扫描失败: Authentication failed"
   }
   ```

3. **参数错误** (状态码: 400)
   ```json
   {
     "detail": "参数验证失败: email_account_id 不能为空"
   }
   ```

4. **Deno环境错误** (状态码: 500)
   ```json
   {
     "detail": "执行错误: Deno not found"
   }
   ```

### 错误排查步骤

1. **检查健康状态**
   ```bash
   curl http://localhost:8090/api/v1/email-scan-enhanced/health
   ```

2. **验证邮箱配置**
   - 确认IMAP服务已开启
   - 使用正确的授权码（不是登录密码）
   - 检查防火墙和网络连接

3. **检查Deno环境**
   ```bash
   deno --version
   ```

4. **查看服务日志**
   - 检查FastAPI后端日志
   - 确认临时文件是否正确清理

## 最佳实践

### 1. 邮箱配置安全

- 使用授权码而非登录密码
- 定期轮换授权码
- 不在代码中硬编码密码

### 2. 性能优化

- 合理设置`max_emails`限制
- 使用日期范围缩小搜索范围
- 对于大量邮件的账户，分批处理

### 3. 错误处理

- 在调用API前先进行健康检查
- 实现重试机制处理临时网络问题
- 记录详细的错误日志便于调试

### 4. 监控和维护

- 定期检查服务健康状态
- 监控Deno环境和依赖更新
- 清理临时文件和日志

## 与现有系统集成

### 集成到前端

```javascript
// React组件示例
const EmailScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);

  const handleQuickScan = async (accountId) => {
    setScanning(true);
    try {
      const response = await fetch(
        `/api/v1/email-scan-enhanced/quick-scan/${accountId}?keywords=发票&days=7`,
        { method: 'POST' }
      );
      const data = await response.json();
      setResults(data.data);
    } catch (error) {
      console.error('扫描失败:', error);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div>
      <button onClick={() => handleQuickScan('my-account')} disabled={scanning}>
        {scanning ? '扫描中...' : '快速扫描'}
      </button>
      {results && (
        <div>
          <p>找到 {results.total_found} 封邮件</p>
          <p>PDF附件: {results.pdf_attachments_found} 个</p>
        </div>
      )}
    </div>
  );
};
```

### 集成到Supabase Edge Function

```typescript
// Supabase Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    // 调用FastAPI邮件扫描服务
    const scanResponse = await fetch('http://your-fastapi-host:8090/api/v1/email-scan-enhanced/quick-scan/account-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.headers.get('authorization')}`
      }
    });
    
    const scanData = await scanResponse.json();
    
    // 处理扫描结果，保存到Supabase数据库
    for (const email of scanData.data.emails) {
      // 处理PDF附件，调用OCR等...
    }
    
    return new Response(JSON.stringify({ success: true, ...scanData }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

## 部署注意事项

### 环境要求

1. **Deno 运行时** - 版本 1.30+
2. **Python 依赖** - FastAPI, SQLAlchemy等
3. **网络访问** - 支持IMAP协议的网络环境
4. **存储权限** - 临时文件读写权限

### Docker部署

```dockerfile
FROM python:3.11-slim

# 安装Deno
RUN curl -fsSL https://deno.land/install.sh | sh
ENV PATH="/root/.deno/bin:${PATH}"

# 安装Python依赖
COPY requirements.txt .
RUN pip install -r requirements.txt

# 复制应用代码
COPY . /app
WORKDIR /app

# 启动服务
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8090"]
```

### 环境变量配置

```bash
# .env 文件
DENO_ALLOW_NET=true
DENO_ALLOW_READ=true
DENO_ALLOW_WRITE=true
TEMP_DIR=/tmp/email-scan
MAX_CONCURRENT_SCANS=5
```

## 故障排除

### 常见问题

1. **Deno命令未找到**
   - 检查Deno是否正确安装
   - 确认PATH环境变量包含deno路径

2. **IMAP连接超时**
   - 检查网络连接和防火墙设置
   - 确认邮箱服务器地址和端口正确

3. **PDF检测失败**
   - 检查邮件是否真的包含PDF附件
   - 尝试手动下载邮件附件验证

4. **内存使用过高**
   - 减少`max_emails`参数
   - 增加扫描间隔时间
   - 优化临时文件清理逻辑

### 调试模式

启用详细日志：

```python
import logging
logging.getLogger("app.api.v1.endpoints.email_scan_enhanced").setLevel(logging.DEBUG)
```

查看Deno脚本输出：

```python
# 在DenoImapIntegrator中临时保留脚本文件
# 手动执行: deno run --allow-net /tmp/script.ts
```

## 更新日志

### v1.0.0 (2024-12-29)
- 首次发布增强版邮件扫描API
- 支持基于deno-imap的邮件扫描功能
- 集成PDF附件检测和错误恢复机制
- 提供快速扫描和完整扫描两种模式

### 计划中的功能

- [ ] 邮件附件自动下载和存储
- [ ] 批量邮件处理和队列管理
- [ ] 邮件内容OCR识别集成
- [ ] 实时邮件监听和推送
- [ ] 多邮箱账户并发扫描
- [ ] 邮件数据导出和备份功能