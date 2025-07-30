# Deno-IMAP 使用指南

本指南基于 `@bobbyg603/deno-imap` 库的实际使用经验，总结了正确的用法、常见问题和解决方案。

## 目录

- [基本连接](#基本连接)
- [邮件搜索](#邮件搜索)
- [邮件获取](#邮件获取)
- [PDF附件检测](#pdf附件检测)
- [错误处理](#错误处理)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

## 基本连接

### 正确的连接配置

```typescript
import { ImapClient } from "jsr:@bobbyg603/deno-imap";

const client = new ImapClient({
  host: 'imap.qq.com',        // ✅ 使用 'host' 而不是 'hostname'
  port: 993,                  // IMAP over SSL端口
  tls: true,                  // 启用TLS加密
  username: 'your@qq.com',
  password: 'your-auth-code'   // QQ邮箱需要使用授权码
});

// 连接和认证
await client.connect();
await client.selectMailbox('INBOX');
```

### 支持的邮箱服务器配置

| 邮箱服务 | IMAP服务器 | 端口 | TLS | 注意事项 |
|----------|------------|------|-----|----------|
| QQ邮箱 | imap.qq.com | 993 | true | 需要开启IMAP并使用授权码 |
| 163邮箱 | imap.163.com | 993 | true | 需要开启客户端授权 |
| Gmail | imap.gmail.com | 993 | true | 需要应用专用密码 |
| Outlook | outlook.office365.com | 993 | true | 支持OAuth2 |

## 邮件搜索

### ❌ 错误的搜索方式

```typescript
// 这种数组语法是错误的，会返回过多结果
const messageIds = await client.search(['SUBJECT', '发票']);
```

### ✅ 正确的搜索方式

#### 1. 主题搜索

```typescript
// 搜索主题包含"发票"的邮件
const messageIds = await client.search({
  header: [{ field: 'SUBJECT', value: '发票' }]
});

// 支持UTF-8编码的中文搜索
const messageIds = await client.search({
  header: [{ field: 'SUBJECT', value: '发票' }]
}, 'UTF-8');
```

#### 2. 发件人搜索

```typescript
// 搜索特定发件人
const messageIds = await client.search({
  header: [{ field: 'FROM', value: '12306@rails.com.cn' }]
});

// 搜索发件人包含关键词
const messageIds = await client.search({
  header: [{ field: 'FROM', value: '12306' }]
});
```

#### 3. 日期范围搜索

```typescript
// 搜索指定日期之后的邮件
const messageIds = await client.search({
  date: {
    internal: {
      since: new Date('2025-01-01')
    }
  }
});

// 搜索指定日期范围
const messageIds = await client.search({
  date: {
    internal: {
      since: new Date('2025-01-01'),
      before: new Date('2025-02-01')
    }
  }
});
```

#### 4. 正文搜索

```typescript
// 搜索邮件正文包含关键词
const messageIds = await client.search({
  text: '发票'
}, 'UTF-8');

// 搜索邮件体包含关键词
const messageIds = await client.search({
  body: '发票'
}, 'UTF-8');
```

#### 5. 复合搜索条件

```typescript
// 组合多个搜索条件
const messageIds = await client.search({
  and: [
    { header: [{ field: 'FROM', value: '12306' }] },
    { date: { internal: { since: new Date('2025-01-01') } } }
  ]
}, 'UTF-8');

// OR条件搜索
const messageIds = await client.search({
  or: [
    { header: [{ field: 'SUBJECT', value: '发票' }] },
    { header: [{ field: 'SUBJECT', value: 'invoice' }] }
  ]
}, 'UTF-8');
```

### 搜索选项参考

| 搜索字段 | 类型 | 描述 | 示例 |
|----------|------|------|------|
| `header` | Array | 搜索邮件头字段 | `[{ field: 'SUBJECT', value: '发票' }]` |
| `text` | String | 搜索邮件全文 | `'发票'` |
| `body` | String | 搜索邮件正文 | `'发票'` |
| `date.internal.since` | Date | 搜索指定日期后的邮件 | `new Date('2025-01-01')` |
| `date.internal.before` | Date | 搜索指定日期前的邮件 | `new Date('2025-02-01')` |
| `flags.has` | Array | 搜索包含特定标志的邮件 | `['\\Seen']` |
| `flags.not` | Array | 搜索不包含特定标志的邮件 | `['\\Unseen']` |

## 邮件获取

### 基本邮件信息获取

```typescript
// 获取基本信息
const messages = await client.fetch(['1,2,3'], {
  envelope: true,    // 邮件头信息（主题、发件人等）
  flags: true,       // 邮件标志
  uid: true          // 邮件UID
});

// 获取邮件大小
const messages = await client.fetch(['1'], {
  envelope: true,
  size: true
});
```

### 获取邮件结构（注意：存在解析器Bug）

```typescript
// ⚠️ 警告：bodyStructure在复杂邮件中可能解析失败
try {
  const messages = await client.fetch(['1'], {
    bodyStructure: true
  });
  // 处理成功的情况
} catch (parseError) {
  // 解析失败时的处理，见下文"PDF附件检测"部分
  console.warn('bodyStructure解析失败:', parseError.message);
}
```

### 获取邮件正文

```typescript
// 获取完整邮件正文
const messages = await client.fetch(['1'], {
  bodyParts: ['TEXT']  // 获取文本部分
});

// 获取特定部分
const messages = await client.fetch(['1'], {
  bodyParts: ['1.1', '1.2']  // 获取特定邮件段
});
```

## PDF附件检测

由于deno-imap存在bodyStructure解析器bug，我们需要实现特殊的PDF检测方案。

### ImprovedPDFDetector 类

```typescript
interface EdgeAttachmentInfo {
  filename: string;
  type: string;
  subtype: string;
  size: number;
  encoding: string;
  section: string;
}

class ImprovedPDFDetector {
  private client: ImapClient;

  constructor(client: ImapClient) {
    this.client = client;
  }

  /**
   * 安全地分析邮件的PDF附件（处理解析器错误）
   */
  async analyzeEmailSafely(messageId: number): Promise<EmailWithAttachments | null> {
    try {
      // 获取基本信息
      const basicInfo = await this.client.fetch([messageId.toString()], {
        envelope: true,
        uid: true
      });

      if (basicInfo.length === 0) return null;

      const message = basicInfo[0];
      const subject = message.envelope?.subject || '无主题';
      const from = this.formatEmailAddress(message.envelope?.from);
      const date = message.envelope?.date || '未知';
      const uid = message.uid?.toString() || messageId.toString();

      let attachments: EdgeAttachmentInfo[] = [];
      let hasAttachments = false;

      try {
        // 尝试标准解析
        const detailedInfo = await this.client.fetch([messageId.toString()], {
          bodyStructure: true
        });

        if (detailedInfo.length > 0 && detailedInfo[0].bodyStructure) {
          attachments = this.extractPDFAttachmentsFromStructure(detailedInfo[0].bodyStructure);
          hasAttachments = attachments.length > 0;
        }
      } catch (parseError) {
        // 解析失败时的应急方案
        console.log(`解析失败，尝试从错误中提取附件信息...`);
        
        const errorContent = parseError.data || parseError.message || '';
        if (errorContent.toLowerCase().includes('pdf')) {
          attachments = this.extractPDFFromErrorMessage(errorContent);
          hasAttachments = attachments.length > 0;
        }
      }

      return {
        uid,
        subject,
        from,
        date,
        hasAttachments,
        attachments
      };

    } catch (error) {
      console.error(`分析邮件 ${messageId} 失败:`, error.message);
      return null;
    }
  }

  /**
   * 从错误信息中提取PDF附件信息（应急方案）
   */
  private extractPDFFromErrorMessage(errorMessage: string): EdgeAttachmentInfo[] {
    const attachments: EdgeAttachmentInfo[] = [];

    try {
      // 匹配IMAP bodyStructure格式的PDF附件
      const patterns = [
        // 标准附件格式
        /\\("attachment"\\s+\\("filename"\\s+"([^"]*\\.pdf)"\\)\\)/gi,
        // 编码的文件名格式
        /\\("name"\\s+"(=\\?[^?]+\\?[BQ]\\?[^?]+\\?=[^"]*\\.pdf)"\\)/gi,
        // 直接文件名格式
        /\\("filename"\\s+"([^"]*\\.pdf)"\\)/gi
      ];

      let sectionIndex = 1;
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(errorMessage)) !== null) {
          let filename = match[1];
          
          // 解码编码的文件名
          if (filename.includes('=?')) {
            try {
              filename = this.decodeEmailHeader(filename);
            } catch (e) {
              console.warn('文件名解码失败:', filename);
            }
          }
          
          // 提取文件大小
          const sizePattern = /"BASE64"\\s+(\\d+)/g;
          const sizeMatch = sizePattern.exec(errorMessage);
          const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;
          
          attachments.push({
            filename,
            type: 'APPLICATION',
            subtype: 'PDF',
            size,
            encoding: 'BASE64',
            section: sectionIndex.toString()
          });
          
          sectionIndex++;
        }
      }
    } catch (error) {
      console.warn('从错误信息提取PDF失败:', error);
    }

    return attachments;
  }

  /**
   * 解码邮件头部编码的字符串
   */
  private decodeEmailHeader(encoded: string): string {
    try {
      const match = encoded.match(/^=\\?([^?]+)\\?([BbQq])\\?([^?]+)\\?=$/);
      if (!match) return encoded;
      
      const [, charset, encoding, data] = match;
      
      if (encoding.toUpperCase() === 'B') {
        return atob(data);
      } else if (encoding.toUpperCase() === 'Q') {
        return data
          .replace(/_/g, ' ')
          .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      }
      
      return encoded;
    } catch (error) {
      return encoded;
    }
  }

  private formatEmailAddress(fromArray: any[]): string {
    if (!fromArray || fromArray.length === 0) return '未知';
    const from = fromArray[0];
    return `${from.mailbox || 'unknown'}@${from.host || 'unknown'}`;
  }
}
```

### 使用示例

```typescript
const client = new ImapClient(config);
await client.connect();
await client.selectMailbox('INBOX');

const detector = new ImprovedPDFDetector(client);

// 搜索发票邮件
const messageIds = await client.search({
  header: [{ field: 'FROM', value: '12306' }]
}, 'UTF-8');

// 检测PDF附件
for (const messageId of messageIds) {
  const emailInfo = await detector.analyzeEmailSafely(messageId);
  
  if (emailInfo && emailInfo.hasAttachments) {
    console.log(`发现PDF附件: ${emailInfo.attachments.length}个`);
    emailInfo.attachments.forEach(att => {
      console.log(`- ${att.filename} (${att.size} bytes)`);
    });
  }
}
```

## 错误处理

### 常见错误类型

1. **连接错误**
```typescript
try {
  await client.connect();
} catch (error) {
  if (error.name === 'ImapConnectionError') {
    console.error('IMAP连接失败:', error.message);
  }
}
```

2. **认证错误**
```typescript
try {
  await client.authenticate();
} catch (error) {
  if (error.name === 'ImapAuthenticationError') {
    console.error('IMAP认证失败:', error.message);
  }
}
```

3. **解析错误**
```typescript
try {
  const messages = await client.fetch(['1'], { bodyStructure: true });
} catch (error) {
  if (error.name === 'ImapParseError') {
    console.warn('bodyStructure解析失败，使用应急方案');
    // 实施应急PDF检测方案
  }
}
```

## 最佳实践

### 1. 连接管理

```typescript
class ImapManager {
  private client: ImapClient;
  
  async connect() {
    try {
      await this.client.connect();
      console.log('IMAP连接成功');
    } catch (error) {
      console.error('连接失败:', error);
      throw error;
    }
  }
  
  async disconnect() {
    try {
      await this.client.disconnect();
      console.log('IMAP连接已断开');
    } catch (error) {
      console.error('断开连接失败:', error);
    }
  }
}

// 使用 try-finally 确保连接被正确关闭
try {
  const manager = new ImapManager();
  await manager.connect();
  // 执行邮件操作
} finally {
  if (manager) {
    await manager.disconnect();
  }
}
```

### 2. 批量处理

```typescript
async function processBatchEmails(messageIds: number[], batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    console.log(`处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(messageIds.length / batchSize)}`);
    
    const batchPromises = batch.map(async (messageId) => {
      try {
        return await detector.analyzeEmailSafely(messageId);
      } catch (error) {
        console.warn(`处理邮件 ${messageId} 失败:`, error.message);
        return null;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(r => r !== null));
    
    // 避免过于频繁的请求
    if (i + batchSize < messageIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}
```

### 3. 编码处理

```typescript
// 始终指定UTF-8编码进行中文搜索
const searchWithEncoding = async (criteria: any) => {
  return await client.search(criteria, 'UTF-8');
};

// 正确处理编码的邮件主题
const decodeSubject = (subject: string): string => {
  if (subject.includes('=?')) {
    try {
      // 使用适当的解码逻辑
      return decodeEmailHeader(subject);
    } catch (error) {
      console.warn('主题解码失败:', subject);
      return subject;
    }
  }
  return subject;
};
```

## 常见问题

### Q1: 搜索结果过多或不准确？
**A:** 使用正确的搜索语法。避免使用数组格式 `['SUBJECT', '发票']`，改用对象格式：
```typescript
{
  header: [{ field: 'SUBJECT', value: '发票' }]
}
```

### Q2: 中文搜索不工作？
**A:** 指定UTF-8编码：
```typescript
await client.search(criteria, 'UTF-8');
```

### Q3: bodyStructure解析总是失败？
**A:** 这是deno-imap的已知问题。使用ImprovedPDFDetector类从错误信息中提取附件信息。

### Q4: QQ邮箱连接失败？
**A:** 确保：
- 使用授权码而不是登录密码
- 在QQ邮箱设置中开启IMAP服务
- 使用正确的服务器配置：`imap.qq.com:993`

### Q5: 邮件ID不连续？
**A:** 这是正常的。邮件ID可能因为删除、移动等操作而不连续。

### Q6: 如何处理大量邮件？
**A:** 
- 使用批量处理避免内存问题
- 添加延时避免被服务器限制
- 实现错误重试机制
- 合理设置搜索条件缩小范围

## 总结

deno-imap是一个功能强大的IMAP客户端库，但需要注意：

1. **搜索语法**：使用对象格式而不是数组格式
2. **编码支持**：中文搜索需要指定UTF-8编码
3. **错误处理**：bodyStructure解析可能失败，需要应急方案
4. **连接管理**：正确处理连接的建立和断开
5. **批量处理**：合理控制并发和请求频率

通过遵循这些最佳实践，可以构建稳定可靠的邮件处理应用。