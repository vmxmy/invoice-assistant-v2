# Pipedream + Supabase Edge Function 集成指南

## 概述
使用 Pipedream 自动监听 QQ 邮箱中的发票邮件，提取 PDF 附件并发送给 Supabase Edge Function 进行 OCR 处理和数据提取。

## 配置步骤

### 1. Pipedream Workflow 创建

1. 登录 [Pipedream](https://pipedream.com)
2. 创建新的 Workflow
3. 添加以下步骤：

#### Step 1: Email Trigger
- 选择 "IMAP Email" trigger
- 配置 QQ 邮箱连接：
  ```
  Host: imap.qq.com
  Port: 993
  Username: vmxmy@qq.com
  Password: lagrezfyfpnobgic (授权码)
  ```

#### Step 2: Filter Invoice Emails
```javascript
export default defineComponent({
  async run({ steps, $ }) {
    const email = steps.trigger.event;
    
    // 检查邮件主题是否包含发票关键词
    const isInvoiceEmail = email.subject.includes('发票') || 
                          email.subject.includes('invoice') ||
                          email.subject.toLowerCase().includes('发票');
    
    if (!isInvoiceEmail) {
      return $.flow.exit('Not an invoice email');
    }
    
    // 检查是否有 PDF 附件
    const pdfAttachments = (email.attachments || []).filter(att => 
      att.contentType === 'application/pdf' || 
      att.filename.toLowerCase().endsWith('.pdf')
    );
    
    if (pdfAttachments.length === 0) {
      return $.flow.exit('No PDF attachments found');
    }
    
    return {
      subject: email.subject,
      from: email.from,
      date: email.date,
      pdfAttachments
    };
  }
});
```

#### Step 3: Process Each PDF
```javascript
export default defineComponent({
  async run({ steps, $ }) {
    const results = [];
    
    for (const attachment of steps.filter_emails.pdfAttachments) {
      try {
        // 准备数据
        const requestData = {
          file: {
            name: attachment.filename,
            content: Buffer.from(attachment.content, 'binary').toString('base64'),
            type: 'application/pdf'
          },
          metadata: {
            source: 'pipedream_email',
            email_subject: steps.filter_emails.subject,
            email_from: steps.filter_emails.from,
            received_at: steps.filter_emails.date
          }
        };
        
        // 调用 Supabase Edge Function
        const response = await fetch(
          'https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/pipedream-ocr',
          {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
          }
        );
        
        const result = await response.json();
        
        if (response.ok) {
          results.push({
            filename: attachment.filename,
            success: true,
            invoice_id: result.data.invoice_id,
            extracted_data: result.data.extracted_data
          });
        } else {
          throw new Error(result.error || 'Processing failed');
        }
        
      } catch (error) {
        results.push({
          filename: attachment.filename,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      total_processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }
});
```

### 2. Supabase Edge Function 部署

部署我们创建的 `pipedream-ocr` Edge Function：

```bash
# 在 Supabase 项目中部署
supabase functions deploy pipedream-ocr
```

### 3. 环境变量配置

在 Supabase 中设置以下环境变量：

```bash
# LLM API 配置
LLM_API_ENDPOINT=您的LLM服务端点
LLM_API_KEY=您的LLM_API密钥

# 阿里云 OCR 配置（如果使用）
ALICLOUD_ACCESS_KEY_ID=您的阿里云AccessKey
ALICLOUD_ACCESS_KEY_SECRET=您的阿里云SecretKey
ALICLOUD_OCR_REGION=cn-hangzhou
```

### 4. 测试流程

1. 发送包含 PDF 发票附件的邮件到 vmxmy@qq.com
2. 查看 Pipedream Workflow 执行日志
3. 检查 Supabase 数据库中是否创建了新的发票记录
4. 验证文件是否上传到 Storage

### 5. 监控和日志

- **Pipedream 日志**: 在 Pipedream 控制台查看每次执行的详细日志
- **Supabase 日志**: 在 Supabase Dashboard > Edge Functions > Logs 查看函数执行日志
- **数据库检查**: 查询 `invoices` 表确认数据正确性

### 6. 错误处理

常见错误和解决方案：

1. **邮箱连接失败**
   - 确认 QQ 邮箱已开启 IMAP 服务
   - 使用授权码而非登录密码

2. **Edge Function 调用失败**
   - 检查 Supabase URL 和 API Key
   - 确认 CORS 配置正确

3. **OCR 处理失败**
   - 检查 PDF 文件格式
   - 确认 OCR 服务配置

### 7. 高级配置

- **邮件过滤**: 可以添加更精确的邮件主题或发件人过滤
- **批量处理**: 支持单封邮件多个 PDF 附件
- **重复检测**: 基于文件哈希避免重复处理
- **通知机制**: 处理完成后发送通知邮件或消息

## 使用说明

1. Workflow 启动后会持续监听邮箱
2. 收到包含发票关键词的邮件时自动触发
3. 提取所有 PDF 附件并逐个处理
4. 处理结果会保存到 Supabase 数据库
5. 可在前端界面查看处理后的发票数据