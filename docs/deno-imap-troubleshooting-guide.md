# Deno-IMAP 问题排查指南

本指南总结了在使用 deno-imap 过程中遇到的常见问题及其解决方案，特别是针对PDF附件检测和中文邮件处理的问题。

## 目录

- [连接问题](#连接问题)
- [搜索问题](#搜索问题)
- [解析问题](#解析问题)
- [编码问题](#编码问题)
- [性能问题](#性能问题)
- [Edge Function 部署问题](#edge-function-部署问题)

## 连接问题

### 问题1: 连接超时或失败

**症状：**
```
Error: IMAP connection failed
TypeError: connection timeout
```

**可能原因：**
1. 网络连接问题
2. 邮箱服务器配置错误
3. 防火墙阻止连接
4. 邮箱服务未开启IMAP

**解决方案：**

```typescript
// ✅ 正确的连接配置
const client = new ImapClient({
  host: 'imap.qq.com',        // 确保使用正确的服务器地址
  port: 993,                  // IMAP over SSL端口
  tls: true,                  // 必须启用TLS
  username: 'your@qq.com',
  password: 'auth-code',      // QQ邮箱使用授权码，不是登录密码
  connectionTimeout: 10000,   // 设置连接超时时间
  socketTimeout: 30000        // 设置socket超时时间
});

// 添加重试机制
async function connectWithRetry(client: ImapClient, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await client.connect();
      console.log('✅ IMAP连接成功');
      return;
    } catch (error) {
      console.warn(`连接尝试 ${i + 1}/${maxRetries} 失败:`, error.message);
      if (i === maxRetries - 1) throw error;
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
}
```

### 问题2: 认证失败

**症状：**
```
Error: Authentication failed
Error: Invalid credentials
```

**解决方案：**

1. **QQ邮箱配置：**
```typescript
// 1. 登录QQ邮箱 -> 设置 -> 账户 -> 开启IMAP服务
// 2. 生成授权码（不是登录密码）
const config = {
  host: 'imap.qq.com',
  port: 993,
  tls: true,
  username: 'your@qq.com',
  password: 'your-16-digit-auth-code'  // 16位授权码
};
```

2. **163邮箱配置：**
```typescript
// 1. 登录163邮箱 -> 设置 -> 客户端授权密码
// 2. 开启IMAP服务
const config = {
  host: 'imap.163.com',
  port: 993,
  tls: true,
  username: 'your@163.com',
  password: 'your-client-password'  // 客户端授权密码
};
```

## 搜索问题

### 问题3: 搜索结果不准确或过多

**症状：**
```typescript
// 搜索"发票"返回471封邮件，但大部分不相关
const ids = await client.search(['SUBJECT', '发票']);  // ❌ 错误语法
```

**解决方案：**

```typescript
// ✅ 使用正确的搜索语法
const ids = await client.search({
  header: [{ field: 'SUBJECT', value: '发票' }]
}, 'UTF-8');

// ✅ 更精确的搜索条件
const preciseSearch = await client.search({
  and: [
    { header: [{ field: 'SUBJECT', value: '发票' }] },
    { header: [{ field: 'FROM', value: '12306' }] }
  ]
}, 'UTF-8');

// ✅ 验证搜索结果的准确性
async function validateSearchResults(messageIds: number[]) {
  const validIds = [];
  
  for (const id of messageIds.slice(0, 10)) { // 验证前10个
    try {
      const messages = await client.fetch([id.toString()], { envelope: true });
      if (messages.length > 0) {
        const subject = messages[0].envelope?.subject || '';
        if (subject.includes('发票')) {
          validIds.push(id);
        }
      }
    } catch (error) {
      console.warn(`验证邮件 ${id} 失败:`, error.message);
    }
  }
  
  console.log(`搜索准确率: ${validIds.length}/${Math.min(10, messageIds.length)}`);
  return messageIds; // 返回原始结果或筛选后的结果
}
```

### 问题4: 中文搜索无结果

**症状：**
```typescript
// 搜索中文关键词返回空结果
const ids = await client.search({ text: '发票' }); // 返回 []
```

**解决方案：**

```typescript
// ✅ 指定UTF-8编码
const ids = await client.search({
  header: [{ field: 'SUBJECT', value: '发票' }]
}, 'UTF-8');  // 关键：指定编码

// ✅ 多种搜索策略
async function comprehensiveChineseSearch(keyword: string) {
  const strategies = [
    // 主题搜索
    { header: [{ field: 'SUBJECT', value: keyword }] },
    // 正文搜索
    { text: keyword },
    // 发件人搜索（如果适用）
    { header: [{ field: 'FROM', value: keyword }] }
  ];

  const allResults = new Set<number>();
  
  for (const strategy of strategies) {
    try {
      const ids = await client.search(strategy, 'UTF-8');
      ids.forEach(id => allResults.add(id));
      console.log(`策略 ${JSON.stringify(strategy)}: ${ids.length} 个结果`);
    } catch (error) {
      console.warn('搜索策略失败:', strategy, error.message);
    }
  }
  
  return Array.from(allResults);
}
```

## 解析问题

### 问题5: bodyStructure解析失败

**症状：**
```
ImapParseError: Invalid body structure format
Error parsing body structure
```

**这是deno-imap的已知bug！**

**解决方案：**

```typescript
/**
 * 使用ImprovedPDFDetector处理解析失败
 */
class RobustEmailAnalyzer {
  private client: ImapClient;

  async analyzeEmailSafely(messageId: number) {
    try {
      // 1. 先获取基本信息（这通常不会失败）
      const basicInfo = await this.client.fetch([messageId.toString()], {
        envelope: true,
        uid: true
      });

      if (basicInfo.length === 0) return null;

      const message = basicInfo[0];
      const emailData = {
        uid: message.uid?.toString() || messageId.toString(),
        subject: message.envelope?.subject || '无主题',
        from: this.formatEmailAddress(message.envelope?.from),
        hasAttachments: false,
        attachments: []
      };

      // 2. 尝试获取bodyStructure（可能失败）
      try {
        const detailedInfo = await this.client.fetch([messageId.toString()], {
          bodyStructure: true
        });

        if (detailedInfo.length > 0 && detailedInfo[0].bodyStructure) {
          // 标准解析成功
          emailData.attachments = this.extractAttachmentsFromStructure(
            detailedInfo[0].bodyStructure
          );
          emailData.hasAttachments = emailData.attachments.length > 0;
        }

      } catch (parseError) {
        // 3. 解析失败时的应急方案
        console.log(`📧 ${emailData.subject}: bodyStructure解析失败，启用应急方案`);
        
        if (parseError.data || parseError.message) {
          const errorContent = parseError.data || parseError.message;
          
          // 从错误信息中提取PDF附件信息
          if (errorContent.toLowerCase().includes('pdf')) {
            console.log('🔍 在错误信息中发现PDF附件信息');
            emailData.attachments = this.extractPDFFromErrorMessage(errorContent);
            emailData.hasAttachments = emailData.attachments.length > 0;
            
            if (emailData.hasAttachments) {
              console.log(`✅ 应急方案成功提取 ${emailData.attachments.length} 个PDF附件`);
            }
          }
        }
      }

      return emailData;

    } catch (error) {
      console.error(`❌ 分析邮件 ${messageId} 完全失败:`, error.message);
      return null;
    }
  }

  private extractPDFFromErrorMessage(errorMessage: string) {
    const attachments = [];
    
    // 多种PDF提取模式
    const patterns = [
      // 标准attachment格式
      /\\("attachment"\\s+\\("filename"\\s+"([^"]*\\.pdf)"\\)\\)/gi,
      // name参数格式
      /\\("name"\\s+"(=\\?[^?]+\\?[BQ]\\?[^?]+\\?=[^"]*\\.pdf)"\\)/gi,
      // 直接filename格式
      /\\("filename"\\s+"([^"]*\\.pdf)"\\)/gi
    ];

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
          section: attachments.length + 1
        });
      }
    }

    return attachments;
  }
}
```

### 问题6: 邮件获取部分失败

**症状：**
```
Warning: Failed to parse FETCH response
Some messages missing from results
```

**解决方案：**

```typescript
// ✅ 添加批量处理和错误恢复
async function robustFetchEmails(messageIds: number[], batchSize = 10) {
  const allMessages = [];
  const failedIds = [];

  // 分批处理
  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    console.log(`处理批次 ${Math.floor(i / batchSize) + 1}: ${batch.length} 封邮件`);

    try {
      // 尝试批量获取
      const messages = await client.fetch(
        batch.map(id => id.toString()), 
        { envelope: true, uid: true }
      );
      allMessages.push(...messages);
      
    } catch (batchError) {
      console.warn(`批次处理失败，逐个处理:`, batchError.message);
      
      // 批量失败时逐个处理
      for (const messageId of batch) {
        try {
          const messages = await client.fetch([messageId.toString()], {
            envelope: true,
            uid: true
          });
          allMessages.push(...messages);
          
        } catch (individualError) {
          console.warn(`邮件 ${messageId} 获取失败:`, individualError.message);
          failedIds.push(messageId);
        }
        
        // 避免过于频繁的请求
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 批次间暂停
    if (i + batchSize < messageIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`📊 获取完成: ${allMessages.length} 成功, ${failedIds.length} 失败`);
  return { messages: allMessages, failedIds };
}
```

## 编码问题

### 问题7: 中文邮件主题显示乱码

**症状：**
```
subject: "=?utf-8?B?572R5LiK6LSt56Wo57O757ufLeeUteWtkOWPkeelqOmAmuefpQ==?="
// 应该显示: "网上购票网站-电子发票通知"
```

**解决方案：**

```typescript
/**
 * 强化的中文邮件主题解码
 */
function decodeChineseSubject(encodedSubject: string): string {
  if (!encodedSubject || !encodedSubject.includes('=?')) {
    return encodedSubject;
  }

  try {
    let decoded = encodedSubject;
    
    // 处理多个编码部分
    const encodedParts = encodedSubject.match(/=\\?[^?]+\\?[BQ]\\?[^?]+\\?=/g);
    
    if (encodedParts) {
      for (const part of encodedParts) {
        const match = part.match(/^=\\?([^?]+)\\?([BQ])\\?([^?]+)\\?=$/i);
        
        if (match) {
          const [, charset, encoding, data] = match;
          let partDecoded = '';
          
          try {
            if (encoding.toUpperCase() === 'B') {
              // Base64解码
              const base64Decoded = atob(data);
              
              if (charset.toLowerCase() === 'utf-8') {
                // UTF-8需要特殊处理
                partDecoded = decodeURIComponent(escape(base64Decoded));
              } else {
                partDecoded = base64Decoded;
              }
            } else if (encoding.toUpperCase() === 'Q') {
              // Quoted-Printable解码
              partDecoded = data
                .replace(/_/g, ' ')
                .replace(/=([0-9A-F]{2})/gi, (_, hex) => 
                  String.fromCharCode(parseInt(hex, 16))
                );
            }
            
            decoded = decoded.replace(part, partDecoded);
          } catch (partError) {
            console.warn(`解码部分失败: ${part}`, partError);
          }
        }
      }
    }
    
    return decoded;
  } catch (error) {
    console.warn('邮件主题解码失败:', error);
    return encodedSubject;
  }
}

// 批量处理邮件主题
async function processEmailsWithDecodedSubjects(messageIds: number[]) {
  const messages = await client.fetch(
    messageIds.map(id => id.toString()), 
    { envelope: true }
  );

  return messages.map(message => ({
    uid: message.uid,
    originalSubject: message.envelope?.subject,
    decodedSubject: decodeChineseSubject(message.envelope?.subject || ''),
    from: message.envelope?.from?.[0]
  }));
}
```

## 性能问题

### 问题8: 处理大量邮件时速度慢或超时

**症状：**
```
// 处理数百封邮件时超时或速度极慢
const allMessages = await client.fetch(allMessageIds, options); // ❌ 可能超时
```

**解决方案：**

```typescript
/**
 * 高性能邮件处理器
 */
class HighPerformanceEmailProcessor {
  private client: ImapClient;
  private concurrency: number;
  private batchSize: number;

  constructor(client: ImapClient, options = {}) {
    this.client = client;
    this.concurrency = options.concurrency || 5;  // 并发数
    this.batchSize = options.batchSize || 20;     // 批次大小
  }

  /**
   * 并发处理邮件
   */
  async processEmailsConcurrently(
    messageIds: number[], 
    processor: (messageId: number) => Promise<any>
  ) {
    const results = [];
    const errors = [];

    // 控制并发数的队列
    const queue = [...messageIds];
    const running = new Set();

    const processNext = async () => {
      if (queue.length === 0) return;
      
      const messageId = queue.shift()!;
      const promise = processor(messageId);
      running.add(promise);
      
      try {
        const result = await promise;
        results.push({ messageId, result });
      } catch (error) {
        errors.push({ messageId, error: error.message });
        console.warn(`处理邮件 ${messageId} 失败:`, error.message);
      } finally {
        running.delete(promise);
      }
    };

    // 启动并发处理
    while (queue.length > 0 || running.size > 0) {
      // 启动新任务直到达到并发限制
      while (running.size < this.concurrency && queue.length > 0) {
        processNext();
      }
      
      // 等待至少一个任务完成
      if (running.size > 0) {
        await Promise.race(running);
      }
    }

    console.log(`📊 并发处理完成: ${results.length} 成功, ${errors.length} 失败`);
    return { results, errors };
  }

  /**
   * 分批获取邮件信息
   */
  async batchFetchEmails(messageIds: number[], options: any) {
    const allResults = [];
    const totalBatches = Math.ceil(messageIds.length / this.batchSize);

    for (let i = 0; i < messageIds.length; i += this.batchSize) {
      const batch = messageIds.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      
      console.log(`📦 处理批次 ${batchNum}/${totalBatches}: ${batch.length} 封邮件`);

      try {
        const batchResults = await client.fetch(
          batch.map(id => id.toString()), 
          options
        );
        allResults.push(...batchResults);
        
        // 显示进度
        console.log(`✅ 批次 ${batchNum} 完成: ${batchResults.length} 封邮件`);
        
      } catch (error) {
        console.warn(`❌ 批次 ${batchNum} 失败:`, error.message);
        
        // 批次失败时逐个重试
        for (const messageId of batch) {
          try {
            const individual = await client.fetch([messageId.toString()], options);
            allResults.push(...individual);
          } catch (e) {
            console.warn(`邮件 ${messageId} 获取失败:`, e.message);
          }
        }
      }

      // 批次间休息，避免服务器限制
      if (batchNum < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return allResults;
  }
}

// 使用示例
const processor = new HighPerformanceEmailProcessor(client, {
  concurrency: 3,   // 同时处理3封邮件
  batchSize: 15     // 每批15封邮件
});

// 并发分析PDF附件
const pdfResults = await processor.processEmailsConcurrently(
  messageIds,
  async (messageId) => await pdfDetector.analyzeEmailSafely(messageId)
);
```

## Edge Function 部署问题

### 问题9: Edge Function中导入模块失败

**症状：**
```
Error: Module not found: jsr:@bobbyg603/deno-imap
Cannot resolve module
```

**解决方案：**

```typescript
// ✅ 在Edge Function中正确导入
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ImapClient } from "jsr:@bobbyg603/deno-imap"  // ✅ 使用jsr:前缀

// 确保在部署前测试导入
console.log('✅ Modules imported successfully');
```

### 问题10: Edge Function超时

**症状：**
```
Edge Function timeout after 60 seconds
Function execution exceeded time limit
```

**解决方案：**

```typescript
/**
 * 针对Edge Function优化的邮件处理
 */
async function optimizedEmailProcessing(emailConfig: any, options: any) {
  const startTime = Date.now();
  const timeLimit = 50000; // 50秒限制，留出缓冲时间
  
  const client = new ImapClient(emailConfig);
  
  try {
    // 快速连接，设置较短超时
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('连接超时')), 10000)
      )
    ]);
    
    await client.selectMailbox('INBOX');
    
    // 限制处理邮件数量
    const maxEmails = options.maxResults || 20;
    const messageIds = await client.search(options.searchCriteria, 'UTF-8');
    const limitedIds = messageIds.slice(-maxEmails); // 只处理最近的邮件
    
    const results = [];
    const detector = new ImprovedPDFDetector(client);
    
    for (const messageId of limitedIds) {
      // 检查剩余时间
      const elapsed = Date.now() - startTime;
      if (elapsed > timeLimit) {
        console.log(`⏱️  时间限制达到，停止处理。已处理 ${results.length} 封邮件`);
        break;
      }
      
      try {
        const emailInfo = await detector.analyzeEmailSafely(messageId);
        if (emailInfo) {
          results.push(emailInfo);
        }
      } catch (error) {
        console.warn(`跳过邮件 ${messageId}:`, error.message);
      }
    }
    
    return {
      success: true,
      totalProcessed: results.length,
      totalWithAttachments: results.filter(r => r.hasAttachments).length,
      emails: results.filter(r => r.hasAttachments),
      executionTime: Date.now() - startTime
    };
    
  } finally {
    try {
      await client.disconnect();
    } catch (error) {
      console.warn('断开连接失败:', error);
    }
  }
}
```

### 问题11: Edge Function内存不足

**症状：**
```
Out of memory error
Function exceeded memory limit
```

**解决方案：**

```typescript
/**
 * 内存优化的邮件处理
 */
class MemoryOptimizedProcessor {
  private processedCount = 0;
  private maxConcurrent = 2; // 限制并发数
  
  async processEmailsStreaming(messageIds: number[], processor: Function) {
    const results = [];
    
    // 流式处理，避免同时加载太多邮件
    for (let i = 0; i < messageIds.length; i += this.maxConcurrent) {
      const batch = messageIds.slice(i, i + this.maxConcurrent);
      
      // 处理当前批次
      const batchPromises = batch.map(async (messageId) => {
        try {
          const result = await processor(messageId);
          
          // 及时释放内存
          if (result && !result.hasAttachments) {
            return null; // 不保存无附件的邮件
          }
          
          return result;
        } catch (error) {
          console.warn(`处理邮件 ${messageId} 失败:`, error.message);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // 只保存有附件的邮件
      const validResults = batchResults.filter(r => r && r.hasAttachments);
      results.push(...validResults);
      
      this.processedCount += batch.length;
      
      // 强制垃圾回收（在支持的环境中）
      if (typeof global !== 'undefined' && global.gc) {
        global.gc();
      }
      
      console.log(`📊 已处理 ${this.processedCount} 封邮件，找到 ${results.length} 封有附件的邮件`);
    }
    
    return results;
  }
}
```

## 监控和调试

### 添加详细日志

```typescript
/**
 * 带监控的邮件处理系统
 */
class MonitoredEmailSystem {
  private stats = {
    connections: 0,
    searches: 0,
    fetches: 0,
    parsingErrors: 0,
    pdfExtracted: 0
  };

  logStats() {
    console.log('📊 系统统计:');
    console.log(`   连接数: ${this.stats.connections}`);
    console.log(`   搜索次数: ${this.stats.searches}`);
    console.log(`   获取次数: ${this.stats.fetches}`);
    console.log(`   解析错误: ${this.stats.parsingErrors}`);
    console.log(`   PDF提取: ${this.stats.pdfExtracted}`);
  }

  async monitoredConnect(client: ImapClient) {
    const startTime = Date.now();
    try {
      await client.connect();
      this.stats.connections++;
      console.log(`✅ 连接成功 (${Date.now() - startTime}ms)`);
    } catch (error) {
      console.error(`❌ 连接失败 (${Date.now() - startTime}ms):`, error.message);
      throw error;
    }
  }

  async monitoredSearch(client: ImapClient, criteria: any, charset?: string) {
    const startTime = Date.now();
    try {
      const results = await client.search(criteria, charset);
      this.stats.searches++;
      console.log(`🔍 搜索完成: ${results.length} 结果 (${Date.now() - startTime}ms)`);
      return results;
    } catch (error) {
      console.error(`❌ 搜索失败 (${Date.now() - startTime}ms):`, error.message);
      throw error;
    }
  }
}
```

## 总结

主要问题和解决方案：

1. **连接问题**：使用正确配置，添加重试机制
2. **搜索问题**：使用正确语法，指定UTF-8编码
3. **解析问题**：实现应急PDF提取方案
4. **编码问题**：正确处理中文编码
5. **性能问题**：批量处理，控制并发
6. **部署问题**：优化超时和内存使用

关键要点：
- 始终使用正确的搜索语法和UTF-8编码
- 实现健壮的错误处理和应急方案
- 针对Edge Function环境进行性能优化
- 添加详细的监控和日志记录