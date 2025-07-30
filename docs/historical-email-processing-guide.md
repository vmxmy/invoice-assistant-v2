# 历史邮件处理指南

## 概述
本指南介绍如何处理已收到的历史邮件中的发票PDF附件，支持多种处理方式。

## 🎯 可用方案

### 方案1: Pipedream 历史扫描 (推荐)
**适用场景**: 云端自动化处理，无需本地环境
**优势**: 
- 云端运行，稳定可靠
- 支持定时执行
- 自动错误重试
- 可视化监控

**使用步骤**:
1. 在Pipedream中创建新的Workflow
2. 使用 `scripts/pipedream-historical-emails.js` 中的代码
3. 配置您的邮箱参数
4. 设置扫描天数（默认30天）
5. 运行Workflow

### 方案2: 本地批量处理脚本
**适用场景**: 需要本地控制和文件保存
**优势**:
- 完全本地控制
- 可保存附件到本地
- 支持断点续传
- 详细的处理报告

**使用步骤**:
```bash
# 1. 进入脚本目录
cd /Users/xumingyang/app/invoice_assist/v2/scripts

# 2. 安装依赖
npm install imap mailparser

# 3. 运行处理脚本
node process_historical_emails.js

# 或者使用启动脚本
./run_historical_scan.sh
```

### 方案3: Supabase Edge Function
**适用场景**: 集成到现有系统中
**优势**:
- 与现有架构无缝集成
- 支持API调用
- 云端处理

**使用步骤**:
```bash
# 部署Edge Function
supabase functions deploy historical-email-scanner

# 调用API处理历史邮件
curl -X POST "https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/historical-email-scanner" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email_config": {
      "user": "vmxmy@qq.com",
      "password": "lagrezfyfpnobgic"
    },
    "scan_config": {
      "days_back": 60,
      "max_emails": 100
    }
  }'
```

## 📋 配置参数

### 邮箱配置
```javascript
{
  user: 'vmxmy@qq.com',
  password: 'lagrezfyfpnobgic', // QQ邮箱授权码
  host: 'imap.qq.com',
  port: 993,
  tls: true
}
```

### 扫描配置
```javascript
{
  daysBack: 90,        // 扫描最近多少天
  batchSize: 10,       // 每批处理多少封邮件
  maxEmails: 500,      // 最大处理邮件数
  saveLocal: true,     // 是否保存到本地
  keywords: ['发票', 'invoice', '發票'] // 搜索关键词
}
```

## 🔍 邮件搜索条件

脚本会搜索符合以下条件的邮件：
- **时间范围**: 最近N天内收到的邮件
- **主题包含**: "发票"、"invoice"、"發票"
- **正文包含**: "发票"关键词
- **附件类型**: PDF格式文件

## 📊 处理流程

1. **连接邮箱**: 使用IMAP连接QQ邮箱
2. **搜索邮件**: 根据条件筛选包含发票的邮件
3. **提取附件**: 识别并提取PDF附件
4. **OCR处理**: 调用Supabase Edge Function进行OCR
5. **数据提取**: 使用LLM提取结构化发票数据
6. **保存数据**: 存储到Supabase数据库
7. **生成报告**: 输出处理统计和结果

## 📈 处理统计

每次处理完成后会生成详细报告：
```json
{
  "timestamp": "2024-01-29T10:00:00.000Z",
  "stats": {
    "totalEmails": 150,      // 扫描的邮件总数
    "processedEmails": 145,   // 成功处理的邮件数
    "foundPDFs": 89,         // 找到的PDF附件数
    "successfulUploads": 85,  // 成功上传的附件数
    "errorCount": 4,         // 错误数量
    "successRate": "95.51%"  // 成功率
  }
}
```

## 🚨 常见问题

### 1. 邮箱连接失败
```
错误: IMAP connection failed
解决: 
- 确认QQ邮箱已开启IMAP服务
- 使用授权码而非登录密码
- 检查网络连接
```

### 2. PDF不支持OCR
```
错误: OCR processing failed
解决:
- 检查PDF是否为扫描版（图片）
- 确认文件大小不超过限制
- 尝试转换PDF格式
```

### 3. 数据库写入失败
```
错误: Database insertion failed
解决:
- 检查Supabase连接配置
- 确认数据库表结构正确
- 检查字段长度限制
```

## 🔧 高级配置

### 自定义OCR服务
如果需要使用其他OCR服务：
```javascript
// 在process_historical_emails.js中修改
async processPDFAttachment(attachment, emailInfo) {
  // 替换为您的OCR服务
  const ocrResult = await yourCustomOCRService(attachment.content);
  // ...
}
```

### 批量重试机制
```javascript
// 添加重试逻辑
const maxRetries = 3;
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    const result = await processPDF(attachment);
    break; // 成功则跳出循环
  } catch (error) {
    if (attempt === maxRetries) throw error;
    await delay(attempt * 1000); // 递增延迟
  }
}
```

### 增量处理
```javascript
// 避免重复处理已处理过的邮件
const processedMessageIds = await getProcessedMessageIds();
if (processedMessageIds.includes(parsed.messageId)) {
  console.log('邮件已处理，跳过...');
  return;
}
```

## 📅 定时任务

### 使用Cron定时执行
```bash
# 每天凌晨2点扫描昨天的邮件
0 2 * * * cd /path/to/scripts && node process_historical_emails.js

# 每周日扫描一周的邮件  
0 3 * * 0 cd /path/to/scripts && node process_historical_emails.js
```

### 使用Pipedream定时器
在Pipedream中设置定时触发器，定期运行历史邮件扫描。

## 🎯 最佳实践

1. **分批处理**: 避免一次处理过多邮件导致超时
2. **错误重试**: 对临时性错误实施重试机制
3. **日志记录**: 详细记录处理过程便于排错
4. **资源限制**: 控制并发数避免服务器过载
5. **数据备份**: 处理前备份重要数据
6. **监控告警**: 设置异常情况的通知机制

## 🔐 安全注意事项

- 妥善保管邮箱授权码
- 使用环境变量存储敏感信息
- 定期更新API密钥
- 审查处理日志中的敏感信息
- 考虑对存储的文件进行加密