# Deno-IMAP 中文邮件处理专项指南

本指南专门针对使用 deno-imap 处理中文邮件的特殊场景，包括中文搜索、编码处理、发票邮件检测等。

## 目录

- [中文邮件搜索](#中文邮件搜索)
- [编码问题处理](#编码问题处理)
- [发票邮件检测](#发票邮件检测)
- [PDF附件提取](#pdf附件提取)
- [常见中文邮箱配置](#常见中文邮箱配置)
- [实战案例](#实战案例)

## 中文邮件搜索

### 基本中文搜索

```typescript
// ✅ 正确的中文主题搜索
const invoiceEmails = await client.search({
  header: [{ field: 'SUBJECT', value: '发票' }]
}, 'UTF-8');  // 重要：指定UTF-8编码

// ✅ 搜索包含多个中文关键词
const receiptEmails = await client.search({
  header: [{ field: 'SUBJECT', value: '收据' }]
}, 'UTF-8');

// ✅ 搜索火车票邮件
const trainTickets = await client.search({
  header: [{ field: 'FROM', value: '12306' }]
}, 'UTF-8');
```

### 常用中文搜索场景

#### 1. 发票相关邮件

```typescript
// 搜索各种发票邮件
const searchInvoiceEmails = async () => {
  const searches = [
    { field: 'SUBJECT', value: '发票' },
    { field: 'SUBJECT', value: '增值税发票' },
    { field: 'SUBJECT', value: '电子发票' },
    { field: 'SUBJECT', value: '专用发票' },
    { field: 'SUBJECT', value: '普通发票' }
  ];

  const allInvoiceIds = [];
  
  for (const search of searches) {
    try {
      const ids = await client.search({
        header: [search]
      }, 'UTF-8');
      
      console.log(`${search.value}: 找到 ${ids.length} 封邮件`);
      allInvoiceIds.push(...ids);
    } catch (error) {
      console.warn(`搜索 ${search.value} 失败:`, error.message);
    }
  }

  // 去重
  return [...new Set(allInvoiceIds)];
};
```

#### 2. 交通出行邮件

```typescript
// 搜索交通出行相关邮件
const searchTransportEmails = async () => {
  const transportSearches = [
    { field: 'FROM', value: '12306' },        // 火车票
    { field: 'SUBJECT', value: '行程单' },     // 飞机票
    { field: 'SUBJECT', value: '登机牌' },     // 登机牌
    { field: 'SUBJECT', value: '火车票' },     // 火车票
    { field: 'SUBJECT', value: '高铁票' },     // 高铁票
  ];

  const results = [];
  
  for (const search of transportSearches) {
    const ids = await client.search({
      header: [search]
    }, 'UTF-8');
    
    results.push({
      type: search.value,
      count: ids.length,
      messageIds: ids
    });
  }
  
  return results;
};
```

#### 3. 电商订单邮件

```typescript
// 搜索电商订单相关邮件
const searchEcommerceEmails = async () => {
  const ecommerceSearches = [
    { field: 'SUBJECT', value: '订单' },
    { field: 'SUBJECT', value: '快递' },
    { field: 'SUBJECT', value: '物流' },
    { field: 'SUBJECT', value: '发货' },
    { field: 'FROM', value: 'taobao' },
    { field: 'FROM', value: 'tmall' },
    { field: 'FROM', value: 'jd.com' }
  ];

  return await Promise.all(
    ecommerceSearches.map(async (search) => ({
      keyword: search.value,
      messageIds: await client.search({ header: [search] }, 'UTF-8')
    }))
  );
};
```

## 编码问题处理

### 邮件主题解码

```typescript
/**
 * 解码中文邮件主题
 */
function decodeChinesesubject(encodedSubject: string): string {
  if (!encodedSubject || !encodedSubject.includes('=?')) {
    return encodedSubject;
  }

  try {
    // 处理UTF-8编码的主题
    const utf8Match = encodedSubject.match(/=\\?utf-8\\?B\\?([^?]+)\\?=/gi);
    if (utf8Match) {
      return utf8Match.map(match => {
        const base64 = match.match(/=\\?utf-8\\?B\\?([^?]+)\\?=/i)?.[1];
        if (base64) {
          const decoded = atob(base64);
          // 处理UTF-8字节序列
          return decodeURIComponent(escape(decoded));
        }
        return match;
      }).join('');
    }

    // 处理GBK编码的主题
    const gbkMatch = encodedSubject.match(/=\\?gbk\\?B\\?([^?]+)\\?=/gi);
    if (gbkMatch) {
      return gbkMatch.map(match => {
        const base64 = match.match(/=\\?gbk\\?B\\?([^?]+)\\?=/i)?.[1];
        if (base64) {
          return atob(base64); // GBK编码需要特殊处理，这里简化
        }
        return match;
      }).join('');
    }

    return encodedSubject;
  } catch (error) {
    console.warn('邮件主题解码失败:', error);
    return encodedSubject;
  }
}

// 使用示例
const messages = await client.fetch(['1,2,3'], { envelope: true });
messages.forEach(message => {
  const decodedSubject = decodeChinesesubject(message.envelope?.subject || '');
  console.log('原始主题:', message.envelope?.subject);
  console.log('解码主题:', decodedSubject);
});
```

### 文件名编码处理

```typescript
/**
 * 解码中文文件名
 */
function decodeChineseFilename(encodedFilename: string): string {
  if (!encodedFilename || !encodedFilename.includes('=?')) {
    return encodedFilename;
  }

  try {
    // 匹配各种编码格式
    const patterns = [
      /=\\?utf-8\\?B\\?([^?]+)\\?=/gi,  // UTF-8 Base64
      /=\\?gbk\\?B\\?([^?]+)\\?=/gi,    // GBK Base64
      /=\\?gb2312\\?B\\?([^?]+)\\?=/gi // GB2312 Base64
    ];

    let decoded = encodedFilename;
    
    for (const pattern of patterns) {
      decoded = decoded.replace(pattern, (match, base64) => {
        try {
          const bytes = atob(base64);
          // 对于UTF-8编码，需要特殊处理
          if (pattern.source.includes('utf-8')) {
            return decodeURIComponent(escape(bytes));
          }
          return bytes;
        } catch (e) {
          return match;
        }
      });
    }

    return decoded;
  } catch (error) {
    console.warn('文件名解码失败:', error);
    return encodedFilename;
  }
}
```

## 发票邮件检测

### 智能发票邮件识别

```typescript
/**
 * 智能识别发票邮件
 */
class ChineseInvoiceDetector {
  private client: ImapClient;

  constructor(client: ImapClient) {
    this.client = client;
  }

  /**
   * 检测是否为发票邮件
   */
  async isInvoiceEmail(messageId: number): Promise<boolean> {
    try {
      const messages = await this.client.fetch([messageId.toString()], {
        envelope: true
      });

      if (messages.length === 0) return false;

      const message = messages[0];
      const subject = decodeChinesesubject(message.envelope?.subject || '');
      const from = message.envelope?.from?.[0];
      const fromAddress = from ? `${from.mailbox}@${from.host}` : '';

      // 发票相关关键词
      const invoiceKeywords = [
        '发票', '增值税发票', '电子发票', '专用发票', '普通发票',
        '税务发票', '发票通知', '开票', '发票服务'
      ];

      // 发票相关发件人
      const invoiceSenders = [
        '12306',           // 火车票发票
        'tax.gov.cn',     // 税务局
        'invoice',        // 通用发票
        'fapiao',         // 发票拼音
        'billing',        // 账单
        'receipt'         // 收据
      ];

      // 检查主题
      const subjectMatch = invoiceKeywords.some(keyword => 
        subject.includes(keyword)
      );

      // 检查发件人
      const senderMatch = invoiceSenders.some(sender => 
        fromAddress.toLowerCase().includes(sender.toLowerCase())
      );

      return subjectMatch || senderMatch;

    } catch (error) {
      console.warn(`检测邮件 ${messageId} 是否为发票失败:`, error.message);
      return false;
    }
  }

  /**
   * 批量识别发票邮件
   */
  async findInvoiceEmails(messageIds: number[]): Promise<number[]> {
    const invoiceIds = [];

    for (const messageId of messageIds) {
      if (await this.isInvoiceEmail(messageId)) {
        invoiceIds.push(messageId);
      }
    }

    return invoiceIds;
  }

  /**
   * 搜索并识别发票邮件
   */
  async searchInvoiceEmails(): Promise<{
    total: number;
    invoiceIds: number[];
    categories: Record<string, number[]>;
  }> {
    // 多种搜索策略
    const searchStrategies = [
      { name: '直接搜索发票', criteria: { header: [{ field: 'SUBJECT', value: '发票' }] } },
      { name: '搜索12306', criteria: { header: [{ field: 'FROM', value: '12306' }] } },
      { name: '搜索税务相关', criteria: { header: [{ field: 'FROM', value: 'tax' }] } },
      { name: '搜索开票相关', criteria: { header: [{ field: 'SUBJECT', value: '开票' }] } }
    ];

    const categories: Record<string, number[]> = {};
    const allIds = new Set<number>();

    for (const strategy of searchStrategies) {
      try {
        const ids = await this.client.search(strategy.criteria, 'UTF-8');
        categories[strategy.name] = ids;
        ids.forEach(id => allIds.add(id));
        
        console.log(`${strategy.name}: 找到 ${ids.length} 封邮件`);
      } catch (error) {
        console.warn(`${strategy.name} 搜索失败:`, error.message);
        categories[strategy.name] = [];
      }
    }

    const uniqueIds = Array.from(allIds);
    const confirmedInvoiceIds = await this.findInvoiceEmails(uniqueIds);

    return {
      total: confirmedInvoiceIds.length,
      invoiceIds: confirmedInvoiceIds,
      categories
    };
  }
}
```

## PDF附件提取

### 中文PDF文件名处理

```typescript
/**
 * 改进的中文PDF检测器
 */
class ChinesePDFDetector extends ImprovedPDFDetector {
  
  /**
   * 从错误信息中提取中文PDF附件
   */
  protected extractChinesePDFFromError(errorMessage: string): EdgeAttachmentInfo[] {
    const attachments: EdgeAttachmentInfo[] = [];

    try {
      // 专门处理中文PDF文件名的正则模式
      const chinesePatterns = [
        // GBK编码的PDF文件名
        /\\("name"\\s+"(=\\?gbk\\?B\\?[^?]+\\?=[^"]*\\.pdf)"\\)/gi,
        // UTF-8编码的PDF文件名  
        /\\("name"\\s+"(=\\?utf-8\\?B\\?[^?]+\\?=[^"]*\\.pdf)"\\)/gi,
        // 直接的中文PDF文件名
        /\\("filename"\\s+"([^"]*[\u4e00-\u9fff][^"]*\\.pdf)"\\)/gi,
        // 标准attachment格式
        /\\("attachment"\\s+\\("filename"\\s+"([^"]*\\.pdf)"\\)\\)/gi
      ];

      let sectionIndex = 1;

      for (const pattern of chinesePatterns) {
        let match;
        while ((match = pattern.exec(errorMessage)) !== null) {
          let filename = match[1];
          let originalFilename = filename;

          // 尝试解码中文文件名
          if (filename.includes('=?')) {
            try {
              filename = decodeChineseFilename(filename);
              console.log(`文件名解码: ${originalFilename} -> ${filename}`);
            } catch (e) {
              console.warn(`中文文件名解码失败: ${originalFilename}`, e);
            }
          }

          // 确保是PDF文件
          if (filename.toLowerCase().endsWith('.pdf')) {
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

            console.log(`✅ 提取中文PDF: ${filename} (${size} bytes)`);
            sectionIndex++;
          }
        }
      }

    } catch (error) {
      console.warn('中文PDF提取失败:', error);
    }

    return attachments;
  }

  /**
   * 分析中文发票PDF
   */
  async analyzeChineseInvoicePDF(messageId: number): Promise<{
    hasInvoicePDF: boolean;
    invoicePDFs: EdgeAttachmentInfo[];
    subject: string;
    from: string;
  }> {
    const emailInfo = await this.analyzeEmailSafely(messageId);
    
    if (!emailInfo) {
      return {
        hasInvoicePDF: false,
        invoicePDFs: [],
        subject: '',
        from: ''
      };
    }

    // 筛选发票相关的PDF
    const invoicePDFs = emailInfo.attachments.filter(att => {
      const filename = att.filename.toLowerCase();
      return filename.includes('发票') || 
             filename.includes('invoice') ||
             /\\d{10,}/.test(filename); // 包含发票号码格式
    });

    return {
      hasInvoicePDF: invoicePDFs.length > 0,
      invoicePDFs,
      subject: emailInfo.subject,
      from: emailInfo.from
    };
  }
}
```

## 常见中文邮箱配置

### 主流中文邮箱服务器配置

```typescript
const chineseEmailConfigs = {
  // QQ邮箱
  qq: {
    host: 'imap.qq.com',
    port: 993,
    tls: true,
    note: '需要开启IMAP服务并使用授权码'
  },
  
  // 163邮箱
  '163': {
    host: 'imap.163.com',
    port: 993,
    tls: true,
    note: '需要开启客户端授权密码'
  },
  
  // 126邮箱
  '126': {
    host: 'imap.126.com',
    port: 993,
    tls: true,
    note: '需要开启客户端授权密码'
  },
  
  // 新浪邮箱
  sina: {
    host: 'imap.sina.com',
    port: 993,
    tls: true,
    note: '需要开启IMAP服务'
  },
  
  // 企业邮箱
  enterprise: {
    host: 'imap.exmail.qq.com', // 腾讯企业邮箱
    port: 993,
    tls: true,
    note: '企业邮箱配置'
  }
};

// 自动检测邮箱类型并返回配置
function getChineseEmailConfig(email: string) {
  const domain = email.split('@')[1];
  
  const configMap: Record<string, any> = {
    'qq.com': chineseEmailConfigs.qq,
    '163.com': chineseEmailConfigs['163'],
    '126.com': chineseEmailConfigs['126'],
    'sina.com': chineseEmailConfigs.sina,
    'exmail.qq.com': chineseEmailConfigs.enterprise
  };
  
  return configMap[domain] || null;
}
```

## 实战案例

### 完整的中文发票邮件处理系统

```typescript
/**
 * 中文发票邮件处理系统
 */
class ChineseInvoiceEmailSystem {
  private client: ImapClient;
  private invoiceDetector: ChineseInvoiceDetector;
  private pdfDetector: ChinesePDFDetector;

  constructor(emailConfig: any) {
    this.client = new ImapClient(emailConfig);
    this.invoiceDetector = new ChineseInvoiceDetector(this.client);
    this.pdfDetector = new ChinesePDFDetector(this.client);
  }

  /**
   * 连接并初始化
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔌 连接中文邮箱服务器...');
      await this.client.connect();
      
      console.log('📂 选择收件箱...');
      await this.client.selectMailbox('INBOX');
      
      console.log('✅ 中文邮件系统初始化成功');
    } catch (error) {
      console.error('❌ 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 全面扫描中文发票邮件
   */
  async scanChineseInvoiceEmails(): Promise<{
    summary: {
      totalEmails: number;
      invoiceEmails: number;
      pdfAttachments: number;
    };
    details: Array<{
      messageId: number;
      subject: string;
      from: string;
      hasInvoicePDF: boolean;
      pdfFiles: EdgeAttachmentInfo[];
    }>;
  }> {
    console.log('🔍 开始扫描中文发票邮件...');

    // 1. 搜索潜在的发票邮件
    const searchResult = await this.invoiceDetector.searchInvoiceEmails();
    console.log(`📧 找到 ${searchResult.total} 封潜在发票邮件`);

    // 2. 分析每封邮件的PDF附件
    const details = [];
    let totalPDFs = 0;

    for (const messageId of searchResult.invoiceIds) {
      try {
        const pdfAnalysis = await this.pdfDetector.analyzeChineseInvoicePDF(messageId);
        
        details.push({
          messageId,
          subject: decodeChinesesubject(pdfAnalysis.subject),
          from: pdfAnalysis.from,
          hasInvoicePDF: pdfAnalysis.hasInvoicePDF,
          pdfFiles: pdfAnalysis.invoicePDFs
        });

        if (pdfAnalysis.hasInvoicePDF) {
          totalPDFs += pdfAnalysis.invoicePDFs.length;
          console.log(`📄 邮件 ${messageId}: 发现 ${pdfAnalysis.invoicePDFs.length} 个发票PDF`);
        }

      } catch (error) {
        console.warn(`⚠️  处理邮件 ${messageId} 失败:`, error.message);
      }
    }

    const summary = {
      totalEmails: searchResult.invoiceIds.length,
      invoiceEmails: details.filter(d => d.hasInvoicePDF).length,
      pdfAttachments: totalPDFs
    };

    console.log('📊 扫描完成统计:');
    console.log(`   总邮件数: ${summary.totalEmails}`);
    console.log(`   包含发票PDF的邮件: ${summary.invoiceEmails}`);
    console.log(`   发票PDF附件数: ${summary.pdfAttachments}`);

    return { summary, details };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      await this.client.disconnect();
      console.log('🔌 中文邮件系统已断开连接');
    } catch (error) {
      console.error('断开连接失败:', error);
    }
  }
}
```

### 使用示例

```typescript
async function main() {
  // QQ邮箱配置
  const emailConfig = {
    host: 'imap.qq.com',
    port: 993,
    tls: true,
    username: 'your@qq.com',
    password: 'your-auth-code'
  };

  const system = new ChineseInvoiceEmailSystem(emailConfig);

  try {
    // 初始化系统
    await system.initialize();

    // 扫描中文发票邮件
    const result = await system.scanChineseInvoiceEmails();

    // 输出详细结果
    console.log('\\n📋 详细扫描结果:');
    result.details.forEach((email, index) => {
      console.log(`\\n${index + 1}. 邮件ID: ${email.messageId}`);
      console.log(`   主题: ${email.subject}`);
      console.log(`   发件人: ${email.from}`);
      console.log(`   包含发票PDF: ${email.hasInvoicePDF ? '✅' : '❌'}`);
      
      if (email.hasInvoicePDF) {
        email.pdfFiles.forEach((pdf, i) => {
          console.log(`   PDF ${i + 1}: ${pdf.filename} (${pdf.size} bytes)`);
        });
      }
    });

  } catch (error) {
    console.error('❌ 处理失败:', error);
  } finally {
    await system.cleanup();
  }
}

// 运行示例
if (import.meta.main) {
  main();
}
```

## 总结

处理中文邮件时的关键要点：

1. **编码处理**：始终指定UTF-8编码进行搜索
2. **搜索语法**：使用正确的对象格式搜索语法
3. **文件名解码**：正确处理GBK和UTF-8编码的中文文件名
4. **关键词匹配**：考虑中文发票邮件的特殊关键词和发件人模式
5. **错误恢复**：实现健壮的错误处理和PDF提取机制

通过这些专门针对中文邮件的处理方法，可以有效地处理中文发票邮件和PDF附件提取任务。