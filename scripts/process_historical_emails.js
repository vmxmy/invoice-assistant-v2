/**
 * 本地历史邮件批量处理脚本
 * 直接连接IMAP获取历史邮件并处理PDF附件
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs').promises;
const path = require('path');

// 配置
const CONFIG = {
  // QQ邮箱IMAP配置
  imap: {
    user: 'vmxmy@qq.com',
    password: 'lagrezfyfpnobgic', // 授权码
    host: 'imap.qq.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  },
  
  // Supabase配置
  supabase: {
    url: 'https://sfenhhtvcyslxplvewmt.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'
  },
  
  // 扫描配置
  scan: {
    daysBack: 90, // 扫描最近90天
    batchSize: 10, // 每批处理10封邮件
    saveAttachments: true, // 是否保存附件到本地
    outputDir: './historical_invoices' // 本地保存目录
  }
};

class HistoricalEmailProcessor {
  constructor(config) {
    this.config = config;
    this.imap = null;
    this.stats = {
      totalEmails: 0,
      processedEmails: 0,
      foundPDFs: 0,
      successfulUploads: 0,
      errors: []
    };
  }

  async init() {
    // 创建输出目录
    if (this.config.scan.saveAttachments) {
      await fs.mkdir(this.config.scan.outputDir, { recursive: true });
    }
    
    console.log('📧 初始化历史邮件处理器...');
    console.log(`📅 扫描范围: 最近 ${this.config.scan.daysBack} 天`);
  }

  async connectIMAP() {
    return new Promise((resolve, reject) => {
      this.imap = new Imap(this.config.imap);
      
      this.imap.once('ready', () => {
        console.log('✅ IMAP连接成功');
        resolve();
      });
      
      this.imap.once('error', (err) => {
        console.error('❌ IMAP连接失败:', err);
        reject(err);
      });
      
      this.imap.connect();
    });
  }

  async searchInvoiceEmails() {
    return new Promise((resolve, reject) => {
      this.imap.openBox('INBOX', true, (err, box) => {
        if (err) return reject(err);
        
        console.log(`📬 邮箱打开成功，共 ${box.messages.total} 封邮件`);
        
        // 计算搜索日期范围
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - this.config.scan.daysBack);
        
        // 搜索条件：最近N天内包含发票关键词的邮件
        const searchCriteria = [
          ['SINCE', startDate],
          ['OR',
            ['SUBJECT', '发票'],
            ['OR',
              ['SUBJECT', 'invoice'],
              ['OR',
                ['SUBJECT', '發票'],
                ['BODY', '发票']
              ]
            ]
          ]
        ];
        
        this.imap.search(searchCriteria, (err, uids) => {
          if (err) return reject(err);
          
          console.log(`🔍 找到 ${uids.length} 封可能包含发票的邮件`);
          this.stats.totalEmails = uids.length;
          resolve(uids);
        });
      });
    });
  }

  async processEmailBatch(uids) {
    const results = [];
    
    // 分批处理
    for (let i = 0; i < uids.length; i += this.config.scan.batchSize) {
      const batch = uids.slice(i, i + this.config.scan.batchSize);
      console.log(`📦 处理批次 ${Math.floor(i/this.config.scan.batchSize) + 1}/${Math.ceil(uids.length/this.config.scan.batchSize)} (${batch.length} 封邮件)`);
      
      const batchResults = await this.processBatch(batch);
      results.push(...batchResults);
      
      // 避免过于频繁的请求
      await this.delay(1000);
    }
    
    return results;
  }

  async processBatch(uids) {
    return new Promise((resolve, reject) => {
      const batchResults = [];
      let processedCount = 0;
      
      const fetch = this.imap.fetch(uids, {
        bodies: '',
        struct: true,
        envelope: true
      });

      fetch.on('message', (msg, seqno) => {
        let emailBuffer = '';
        
        msg.on('body', (stream) => {
          stream.on('data', (chunk) => {
            emailBuffer += chunk.toString();
          });
        });

        msg.once('end', async () => {
          try {
            const parsed = await simpleParser(emailBuffer);
            const result = await this.processEmail(parsed);
            batchResults.push(result);
            
          } catch (error) {
            console.error(`❌ 处理邮件 ${seqno} 失败:`, error.message);
            this.stats.errors.push({
              seqno,
              error: error.message
            });
            batchResults.push({ success: false, error: error.message });
          }
          
          processedCount++;
          if (processedCount === uids.length) {
            resolve(batchResults);
          }
        });
      });

      fetch.once('error', reject);
    });
  }

  async processEmail(parsed) {
    const emailInfo = {
      subject: parsed.subject,
      from: parsed.from?.text,
      date: parsed.date,
      messageId: parsed.messageId
    };

    console.log(`📧 处理邮件: ${emailInfo.subject}`);
    
    // 查找PDF附件
    const pdfAttachments = (parsed.attachments || []).filter(att => 
      att.contentType === 'application/pdf' || 
      att.filename?.toLowerCase().endsWith('.pdf')
    );

    if (pdfAttachments.length === 0) {
      console.log('  ⚠️  未找到PDF附件');
      return { success: true, pdfs: 0 };
    }

    console.log(`  📎 找到 ${pdfAttachments.length} 个PDF附件`);
    this.stats.foundPDFs += pdfAttachments.length;

    const results = [];
    
    // 处理每个PDF附件
    for (const attachment of pdfAttachments) {
      try {
        const result = await this.processPDFAttachment(attachment, emailInfo);
        results.push(result);
        
        if (result.success) {
          this.stats.successfulUploads++;
          console.log(`  ✅ ${attachment.filename} 处理成功`);
        }
        
      } catch (error) {
        console.error(`  ❌ ${attachment.filename} 处理失败:`, error.message);
        results.push({
          filename: attachment.filename,
          success: false,
          error: error.message
        });
      }
    }

    this.stats.processedEmails++;
    return {
      success: true,
      email: emailInfo,
      pdfs: results.length,
      results
    };
  }

  async processPDFAttachment(attachment, emailInfo) {
    // 保存到本地（可选）
    if (this.config.scan.saveAttachments) {
      const filename = `${Date.now()}-${attachment.filename}`;
      const filepath = path.join(this.config.scan.outputDir, filename);
      await fs.writeFile(filepath, attachment.content);
      console.log(`  💾 已保存到: ${filepath}`);
    }

    // 调用Supabase Edge Function
    const requestData = {
      file: {
        name: attachment.filename,
        content: attachment.content.toString('base64'),
        type: 'application/pdf',
        size: attachment.content.length
      },
      metadata: {
        source: 'historical_email_batch',
        email_subject: emailInfo.subject,
        email_from: emailInfo.from,
        email_date: emailInfo.date?.toISOString(),
        email_message_id: emailInfo.messageId,
        processed_at: new Date().toISOString()
      }
    };

    const response = await fetch(`${this.config.supabase.url}/functions/v1/pipedream-ocr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.supabase.key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Processing failed');
    }

    return {
      filename: attachment.filename,
      success: true,
      invoice_id: result.data.invoice_id,
      extracted_data: result.data.extracted_data
    };
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    try {
      await this.init();
      await this.connectIMAP();
      
      const uids = await this.searchInvoiceEmails();
      
      if (uids.length === 0) {
        console.log('📭 未找到包含发票的历史邮件');
        return;
      }

      const results = await this.processEmailBatch(uids);
      
      // 生成报告
      await this.generateReport(results);
      
    } catch (error) {
      console.error('💥 处理过程中发生错误:', error);
    } finally {
      if (this.imap) {
        this.imap.end();
      }
    }
  }

  async generateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      config: {
        daysBack: this.config.scan.daysBack,
        batchSize: this.config.scan.batchSize
      },
      stats: this.stats,
      summary: {
        totalEmails: this.stats.totalEmails,
        processedEmails: this.stats.processedEmails,
        foundPDFs: this.stats.foundPDFs,
        successfulUploads: this.stats.successfulUploads,
        errorCount: this.stats.errors.length,
        successRate: this.stats.foundPDFs > 0 ? (this.stats.successfulUploads / this.stats.foundPDFs * 100).toFixed(2) + '%' : '0%'
      },
      errors: this.stats.errors
    };

    const reportPath = path.join(this.config.scan.outputDir, `historical_processing_report_${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 处理完成统计:');
    console.log(`📧 总邮件数: ${report.summary.totalEmails}`);
    console.log(`✅ 已处理: ${report.summary.processedEmails}`);
    console.log(`📎 找到PDF: ${report.summary.foundPDFs}`);
    console.log(`🎯 成功上传: ${report.summary.successfulUploads}`);
    console.log(`❌ 错误数量: ${report.summary.errorCount}`);
    console.log(`📈 成功率: ${report.summary.successRate}`);
    console.log(`📄 详细报告: ${reportPath}`);
  }
}

// 运行处理器
async function main() {
  const processor = new HistoricalEmailProcessor(CONFIG);
  await processor.run();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = HistoricalEmailProcessor;