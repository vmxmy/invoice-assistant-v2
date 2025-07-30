# PDF二进制处理器使用指南

## 🚀 Edge Function已部署

**URL**: `https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/pdf-binary-processor`

## 📋 支持的参数格式

### 方式1: Base64编码 (推荐)

```javascript
const requestData = {
  pdf_content_base64: "JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPT4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PAovRjEgNSAwIFIKPj4KPj4KPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKEhlbGxvIFdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNTMgMDAwMDAgbiAKMDAwMDAwMDEwMCAwMDAwMCBuIAowMDAwMDAwMjQ0IDAwMDAwIG4gCjAwMDAwMDAzMzggMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0MDgKJSVFT0Y=",
  pdf_name: "invoice.pdf",
  sender_email: "vmxmy@qq.com",
  checkDeleted: true,
  metadata: {
    source: "api_upload",
    description: "手动上传的发票"
  }
}
```

### 方式2: 十六进制编码

```javascript
const requestData = {
  pdf_content_hex: "255044462d312e340a31203020...", // 十六进制字符串
  pdf_name: "invoice-hex.pdf",
  sender_email: "vmxmy@qq.com"
}
```

### 方式3: 字节数组

```javascript
const requestData = {
  pdf_content_bytes: [37, 80, 68, 70, 45, 49, 46, 52, ...], // 字节数组
  pdf_name: "invoice-bytes.pdf",
  sender_email: "vmxmy@qq.com"
}
```

### 方式4: Data URL

```javascript
const requestData = {
  pdf_data_url: "data:application/pdf;base64,JVBERi0xLjQK...",
  pdf_name: "invoice-dataurl.pdf",
  sender_email: "vmxmy@qq.com"
}
```

## 📡 调用示例

### 使用curl

```bash
curl -X POST "https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/pdf-binary-processor" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-User-ID: your-user-id" \
  -d '{
    "pdf_content_base64": "JVBERi0xLjQK...",
    "pdf_name": "test-invoice.pdf",
    "sender_email": "vmxmy@qq.com",
    "checkDeleted": true,
    "metadata": {
      "source": "api_test",
      "upload_time": "2025-01-29T18:30:00Z"
    }
  }'
```

### 使用JavaScript/Node.js

```javascript
async function uploadPDFBinary(pdfContent, fileName) {
  const response = await fetch('https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/pdf-binary-processor', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseToken}`,
      'Content-Type': 'application/json',
      'X-User-ID': userId
    },
    body: JSON.stringify({
      pdf_content_base64: pdfContent,
      pdf_name: fileName,
      sender_email: 'vmxmy@qq.com',
      checkDeleted: true,
      metadata: {
        source: 'web_app',
        browser: navigator.userAgent
      }
    })
  });
  
  return await response.json();
}

// 使用示例
const result = await uploadPDFBinary(base64Content, 'invoice.pdf');
console.log('处理结果:', result);
```

### 使用Python

```python
import requests
import base64

def upload_pdf_binary(pdf_path, sender_email):
    # 读取PDF文件
    with open(pdf_path, 'rb') as f:
        pdf_content = f.read()
    
    # 转换为Base64
    base64_content = base64.b64encode(pdf_content).decode('utf-8')
    
    # 构建请求
    data = {
        'pdf_content_base64': base64_content,
        'pdf_name': 'invoice.pdf',
        'sender_email': sender_email,
        'checkDeleted': True,
        'metadata': {
            'source': 'python_script',
            'file_size': len(pdf_content)
        }
    }
    
    response = requests.post(
        'https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/pdf-binary-processor',
        headers={
            'Authorization': f'Bearer {supabase_token}',
            'Content-Type': 'application/json',
            'X-User-ID': user_id
        },
        json=data
    )
    
    return response.json()

# 使用示例
result = upload_pdf_binary('invoice.pdf', 'vmxmy@qq.com')
print('处理结果:', result)
```

## 📋 完整参数列表

| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `pdf_content_base64` | string | ❌* | Base64编码的PDF内容 |
| `pdf_content_hex` | string | ❌* | 十六进制编码的PDF内容 |
| `pdf_content_bytes` | number[] | ❌* | 字节数组格式的PDF内容 |
| `pdf_data_url` | string | ❌* | Data URL格式的PDF内容 |
| `pdf_buffer` | ArrayBuffer | ❌* | 原始二进制缓冲区 |
| `pdf_name` | string | ❌ | PDF文件名（可选，会自动生成） |
| `sender_email` | string | ❌ | 发件人邮箱（用于用户映射） |
| `checkDeleted` | boolean | ❌ | 是否检查已删除文件（默认true） |
| `metadata` | object | ❌ | 自定义元数据 |

*注：必须提供至少一种PDF内容格式

## 📊 响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoice_number": "12345678",
    "seller_name": "销售方名称",
    "buyer_name": "购买方名称",
    "total_amount": 1000.00,
    "tax_amount": 130.00,
    "invoice_date": "2025-01-29",
    "invoice_type": "增值税电子发票",
    "file_path": "user-id/file-hash.pdf",
    "created_at": "2025-01-29T18:30:00Z"
  },
  "message": "PDF二进制内容处理完成",
  "processingTime": 5432.1,
  "steps": [
    "初始化PDF二进制处理器",
    "初始化Supabase客户端",
    "解析JSON格式请求",
    "处理Base64编码内容",
    "Base64解码完成，大小: 245760字节",
    "PDF格式验证通过",
    "文件大小验证通过: 240.0KB",
    "文件哈希计算完成",
    "邮箱映射成功: vmxmy@qq.com -> user-id",
    "文件去重检查完成",
    "创建File对象",
    "文件上传到存储桶",
    "开始OCR识别",
    "OCR识别完成",
    "数据转换和验证",
    "保存到数据库",
    "记录文件哈希"
  ],
  "fileInfo": {
    "name": "invoice.pdf",
    "size": 245760,
    "hash": "sha256-hash",
    "format": "base64"
  },
  "ocrInfo": {
    "confidence": 0.95,
    "processing_time": 3200
  },
  "timestamp": "2025-01-29T18:30:00Z"
}
```

### 错误响应

```json
{
  "success": false,
  "error": "文件过大",
  "details": "文件大小 15.2MB 超过最大限制 10.0MB",
  "processingTime": 123.4,
  "steps": [
    "初始化PDF二进制处理器",
    "初始化Supabase客户端",
    "解析JSON格式请求",
    "处理Base64编码内容",
    "文件大小验证失败"
  ],
  "timestamp": "2025-01-29T18:30:00Z"
}
```

## 🔧 错误处理

### 常见错误类型

| HTTP状态 | 错误类型 | 解决方案 |
|----------|----------|----------|
| 400 | 缺少PDF内容 | 至少提供一种PDF内容格式 |
| 400 | 无效的PDF格式 | 确保文件是有效的PDF |
| 400 | 文件过小 | 文件至少需要1KB |
| 413 | 文件过大 | 文件不能超过10MB |
| 403 | 用户映射失败 | 配置邮箱映射或使用有效用户ID |
| 500 | OCR识别失败 | 检查阿里云OCR配置 |

### 错误处理最佳实践

```javascript
async function robustPDFProcessing(pdfContent, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          pdf_content_base64: pdfContent,
          pdf_name: 'invoice.pdf',
          sender_email: 'vmxmy@qq.com'
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        return result;
      }
      
      // 特定错误不重试
      if (response.status === 400 || response.status === 413) {
        throw new Error(result.error);
      }
      
      throw new Error(`HTTP ${response.status}: ${result.error}`);
      
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      
      // 指数退避
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## 🎯 使用场景

### 1. Web应用文件上传

```javascript
// 处理文件输入
const fileInput = document.getElementById('pdfFile');
fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file && file.type === 'application/pdf') {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Content = reader.result.split(',')[1];
      const result = await uploadPDFBinary(base64Content, file.name);
      console.log('上传结果:', result);
    };
    reader.readAsDataURL(file);
  }
});
```

### 2. 移动应用集成

```javascript
// React Native示例
import { DocumentPicker } from 'react-native-document-picker';

async function pickAndUploadPDF() {
  try {
    const result = await DocumentPicker.pick({
      type: [DocumentPicker.types.pdf],
    });
    
    // 读取文件内容
    const fileContent = await RNFS.readFile(result.uri, 'base64');
    
    // 上传到Edge Function
    const uploadResult = await uploadPDFBinary(fileContent, result.name);
    
    console.log('处理结果:', uploadResult);
  } catch (error) {
    console.error('处理失败:', error);
  }
}
```

### 3. 批量处理脚本

```javascript
async function batchProcessPDFs(pdfFiles) {
  const results = [];
  
  for (const file of pdfFiles) {
    try {
      const base64Content = await convertFileToBase64(file);
      const result = await uploadPDFBinary(base64Content, file.name);
      
      results.push({
        file: file.name,
        success: true,
        data: result.data
      });
      
    } catch (error) {
      results.push({
        file: file.name,
        success: false,
        error: error.message
      });
    }
    
    // 避免过于频繁的请求
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}
```

## ⚡ 性能优化建议

1. **Base64编码优化** - 使用流式编码处理大文件
2. **并行处理** - 批量上传时控制并发数量
3. **错误重试** - 实现智能重试机制
4. **缓存策略** - 本地缓存已处理的文件哈希
5. **压缩传输** - 可以考虑在传输前压缩Base64内容

现在你可以使用这个全功能的PDF二进制处理器了！🚀