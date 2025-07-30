# OCR-Dedup-Complete Edge Function 增强功能

## 概述

`ocr-dedup-complete` Edge Function 现已增强支持 PDF URL 处理功能。除了原有的 FormData 文件上传方式，现在还支持直接传递 PDF 文件的 URL 地址进行处理。

## 🆕 新增功能特性

### PDF URL 支持
- ✅ 自动从 URL 下载 PDF 文件
- ✅ 自动生成文件哈希用于去重检测
- ✅ 支持大文件下载（最大 50MB）
- ✅ PDF 格式验证
- ✅ 智能文件名生成
- ✅ 30秒下载超时保护

### 安全特性
- ✅ URL 格式验证
- ✅ 文件大小限制（10MB上限，1KB下限）
- ✅ PDF 文件头验证
- ✅ 模拟浏览器请求头，提高兼容性
- ✅ 电子发票文件大小优化验证

## 📋 API 使用说明

### 方法1: JSON 格式请求（新增 - PDF URL）

```javascript
// 使用 PDF URL 和文件名
const response = await fetch('https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/ocr-dedup-complete', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json',
    'X-User-ID': 'your-user-id'
  },
  body: JSON.stringify({
    pdf_url: 'https://pipedream-emails.s3.amazonaws.com/invoice.pdf',  // PDF文件URL
    pdf_name: 'dzfp_25942000000036499020_厦门集聚香餐饮管理有限公司_20250722130149.pdf',  // 可选：指定文件名
    sender_email: 'invoice@supplier.com',  // 可选：发件人邮箱（用于用户映射）
    checkDeleted: true,  // 可选：检查已删除文件
    metadata: {  // 可选：额外元数据
      source: 'email_attachment',
      email_subject: '发票邮件'
    }
  })
});

const result = await response.json();
```

### 方法2: FormData 格式请求（原有功能）

```javascript
// 使用文件上传
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('fileHash', fileHash);
formData.append('fileSize', pdfFile.size.toString());
formData.append('fileName', pdfFile.name);
formData.append('checkDeleted', 'true');

const response = await fetch('https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/ocr-dedup-complete', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'X-User-ID': 'your-user-id'
    // 注意：使用FormData时不要设置Content-Type
  },
  body: formData
});
```

## 🔧 请求参数说明

### JSON 格式参数

| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `pdf_url` 或 `url` | string | ✅ | PDF文件的完整URL地址 |
| `pdf_name` 或 `file_name` | string | ❌ | 指定的文件名（支持中文），如不提供则从URL提取 |
| `sender_email` 或 `email_from` | string | ❌ | 发件人邮箱地址（用于用户映射） |
| `checkDeleted` | boolean | ❌ | 是否检查已删除的重复文件 |
| `metadata` | object | ❌ | 额外的元数据信息 |

### FormData 格式参数

| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `file` | File | ✅ | PDF文件对象 |
| `fileHash` | string | ❌ | 文件SHA-256哈希（可选，系统会自动计算） |
| `fileSize` | string | ❌ | 文件大小（字节） |
| `fileName` | string | ✅ | 文件名 |
| `checkDeleted` | string | ❌ | 是否检查已删除文件（'true' 或 'false'） |

## 📤 响应格式

无论使用哪种方式，响应格式都是统一的：

```json
{
  "success": true,
  "isDuplicate": false,
  "data": {
    "id": "uuid",
    "invoice_number": "12345678",
    "seller_name": "销售方名称",
    "total_amount": 1000.00,
    "invoice_type": "增值税发票",
    "file_path": "user-id/file-hash.pdf",
    "created_at": "2024-01-29T10:00:00Z",
    // ... 其他发票字段
  },
  "message": "文件处理完成",
  "processingTime": 5432.1,
  "steps": [
    "初始化Supabase客户端",
    "下载PDF文件",
    "PDF文件下载完成",
    "文件去重检查",
    "开始OCR处理流程",
    "文件上传到存储桶",
    "OCR识别完成",
    "数据转换和验证",
    "保存到数据库",
    "记录文件哈希"
  ]
}
```

## 🚀 使用示例

### 示例1: 处理邮件附件PDF

```javascript
async function processEmailAttachment(pdfUrl, emailInfo) {
  try {
    const response = await fetch('https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/ocr-dedup-complete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'X-User-ID': userId
      },
      body: JSON.stringify({
        pdf_url: pdfUrl,
        checkDeleted: true,
        metadata: {
          source: 'email_attachment',
          email_subject: emailInfo.subject,
          email_from: emailInfo.from,
          email_date: emailInfo.date
        }
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('发票处理成功:', result.data.invoice_number);
      return result.data;
    } else {
      throw new Error(result.error || '处理失败');
    }
    
  } catch (error) {
    console.error('发票处理失败:', error);
    throw error;
  }
}
```

### 示例2: 批量处理PDF URL列表

```javascript
async function processPDFBatch(pdfUrls) {
  const results = [];
  
  for (const url of pdfUrls) {
    try {
      const result = await fetch('https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/ocr-dedup-complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pdf_url: url,
          checkDeleted: true
        })
      });
      
      const data = await result.json();
      results.push({
        url: url,
        success: data.success,
        data: data.data,
        isDuplicate: data.isDuplicate
      });
      
    } catch (error) {
      results.push({
        url: url,
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

## 🔍 错误处理

### 常见错误类型

| 错误类型 | HTTP状态码 | 错误信息 | 解决方案 |
|----------|------------|----------|----------|
| 缺少认证 | 401 | "缺少认证信息" | 检查Authorization头 |
| 无效URL | 400 | "无效的URL格式" | 检查PDF URL格式 |
| 下载失败 | 500 | "下载失败: HTTP xxx" | 检查URL是否可访问 |
| 文件过大 | 413 | "文件过大: XXMb，超过10MB限制" | 电子发票文件不应超过10MB |
| 文件过小 | 400 | "文件过小: XX字节" | 文件可能损坏或为空 |
| 非PDF文件 | 500 | "文件可能不是有效的PDF格式" | 确保URL指向PDF文件 |
| OCR失败 | 500 | "OCR处理失败" | 检查PDF文件是否损坏 |

### 错误处理最佳实践

```javascript
async function robustPDFProcessing(pdfUrl, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/ocr-dedup-complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pdf_url: pdfUrl,
          checkDeleted: true
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '处理失败');
      }
      
      return result;
      
    } catch (error) {
      lastError = error;
      console.warn(`尝试 ${attempt}/${maxRetries} 失败:`, error.message);
      
      if (attempt < maxRetries) {
        // 指数退避重试
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`处理失败，已重试${maxRetries}次: ${lastError.message}`);
}
```

## 🎯 适用场景

### 1. 邮箱自动化处理
- Pipedream 工作流处理邮件附件
- 邮件服务器webhook处理
- IMAP扫描邮件附件

### 2. 第三方系统集成
- ERP系统发票导入
- 财务系统自动化
- 供应商发票处理

### 3. 批量文档处理
- 云存储文件批量处理
- FTP服务器文件扫描
- 定时任务批量导入

## 🛠️ 测试工具

使用提供的测试脚本验证功能：

```bash
# 运行测试脚本
node /Users/xumingyang/app/invoice_assist/v2/scripts/test_pdf_url_processing.js
```

## 📊 性能参考

| 操作 | 平均耗时 | 说明 |
|------|----------|------|
| URL下载 | 2-10秒 | 取决于文件大小和网络速度 |
| 哈希计算 | 0.1-1秒 | 取决于文件大小 |
| 去重检查 | 0.1秒 | 数据库查询 |
| OCR识别 | 3-15秒 | 取决于PDF复杂度 |
| 数据保存 | 0.2秒 | 数据库写入 |
| **总计** | **5-30秒** | 完整处理流程 |

## 🔒 安全考虑

1. **URL验证**: 只接受HTTP/HTTPS协议的URL
2. **文件大小限制**: 最大10MB，最小1KB，针对电子发票优化的合理范围
3. **下载超时**: 30秒超时，避免长时间占用资源
4. **文件格式验证**: 检查PDF文件头，确保是有效的PDF
5. **用户隔离**: 基于用户ID的数据隔离
6. **邮箱映射**: 支持发件人邮箱到用户账户的安全映射

## 🚀 部署状态

✅ **当前版本**: 已部署到生产环境  
✅ **兼容性**: 完全向后兼容原有API  
✅ **测试状态**: 已通过功能测试  

现在您可以直接使用 PDF URL 调用 Edge Function 进行发票处理了！