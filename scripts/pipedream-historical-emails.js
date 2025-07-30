/**
 * Pipedream 历史邮件处理脚本
 * 用于扫描和处理已收到的邮件中的发票PDF
 */

export default defineComponent({
  props: {
    // QQ邮箱配置
    email_host: {
      type: "string",
      default: "imap.qq.com"
    },
    email_port: {
      type: "integer", 
      default: 993
    },
    email_user: {
      type: "string",
      default: "vmxmy@qq.com"
    },
    email_password: {
      type: "string",
      secret: true,
      default: "lagrezfyfpnobgic"
    },
    // 扫描配置
    days_back: {
      type: "integer",
      default: 30,
      description: "扫描最近多少天的邮件"
    },
    mailbox: {
      type: "string", 
      default: "INBOX",
      description: "邮箱文件夹"
    },
    // Supabase配置
    supabase_url: {
      type: "string",
      default: "https://sfenhhtvcyslxplvewmt.supabase.co"
    },
    supabase_key: {
      type: "string",
      secret: true,
      default: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE"
    }
  },

  async run({ steps, $ }) {
    const Imap = require('imap');
    const { simpleParser } = require('mailparser');
    
    // 计算开始日期
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - this.days_back);
    
    console.log(`开始扫描 ${this.days_back} 天内的历史邮件...`);
    console.log(`扫描范围: ${startDate.toISOString()} 至今`);

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.email_user,
        password: this.email_password,
        host: this.email_host,
        port: this.email_port,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });

      let processedCount = 0;
      let invoiceCount = 0;
      let errorCount = 0;
      const results = [];

      imap.once('ready', function() {
        console.log('IMAP连接成功');
        
        imap.openBox(this.mailbox, true, (err, box) => {
          if (err) {
            console.error('打开邮箱失败:', err);
            return reject(err);
          }

          console.log(`邮箱 ${this.mailbox} 打开成功，共 ${box.messages.total} 封邮件`);

          // 搜索包含发票关键词的邮件
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

          imap.search(searchCriteria, (err, uids) => {
            if (err) {
              console.error('搜索邮件失败:', err);
              return reject(err);
            }

            console.log(`找到 ${uids.length} 封可能包含发票的邮件`);

            if (uids.length === 0) {
              return resolve({
                message: '未找到包含发票的历史邮件',
                processed: 0,
                invoices: 0,
                errors: 0
              });
            }

            // 获取邮件详情
            const fetch = imap.fetch(uids, { 
              bodies: '',
              struct: true,
              envelope: true
            });

            fetch.on('message', (msg, seqno) => {
              console.log(`处理第 ${seqno} 封邮件...`);
              
              let emailBuffer = '';
              
              msg.on('body', (stream) => {
                stream.on('data', (chunk) => {
                  emailBuffer += chunk.toString();
                });
              });

              msg.once('end', async () => {
                try {
                  const parsed = await simpleParser(emailBuffer);
                  
                  // 检查是否有PDF附件
                  const pdfAttachments = (parsed.attachments || []).filter(att => 
                    att.contentType === 'application/pdf' || 
                    att.filename?.toLowerCase().endsWith('.pdf')
                  );

                  if (pdfAttachments.length > 0) {
                    console.log(`邮件 "${parsed.subject}" 包含 ${pdfAttachments.length} 个PDF附件`);
                    
                    // 处理每个PDF附件
                    for (const attachment of pdfAttachments) {
                      try {
                        const result = await this.processInvoicePDF(attachment, {
                          email_subject: parsed.subject,
                          email_from: parsed.from?.text,
                          email_date: parsed.date,
                          email_message_id: parsed.messageId
                        });
                        
                        results.push({
                          filename: attachment.filename,
                          success: true,
                          invoice_id: result.invoice_id,
                          email_subject: parsed.subject
                        });
                        
                        invoiceCount++;
                        
                      } catch (error) {
                        console.error(`处理附件 ${attachment.filename} 失败:`, error);
                        results.push({
                          filename: attachment.filename,
                          success: false,
                          error: error.message,
                          email_subject: parsed.subject
                        });
                        errorCount++;
                      }
                    }
                  }
                  
                  processedCount++;
                  
                } catch (error) {
                  console.error(`解析邮件失败:`, error);
                  errorCount++;
                }
              });
            });

            fetch.once('end', () => {
              console.log('所有邮件处理完成');
              imap.end();
            });

            fetch.once('error', (err) => {
              console.error('获取邮件失败:', err);
              reject(err);
            });
          });
        }.bind(this));
      }.bind(this));

      imap.once('error', function(err) {
        console.error('IMAP错误:', err);
        reject(err);
      });

      imap.once('end', function() {
        console.log('IMAP连接已关闭');
        resolve({
          message: '历史邮件扫描完成',
          processed: processedCount,
          invoices: invoiceCount,
          errors: errorCount,
          results: results
        });
      });

      imap.connect();
    });
  },

  // 处理单个PDF发票的方法
  async processInvoicePDF(attachment, emailMetadata) {
    const requestData = {
      file: {
        name: attachment.filename,
        content: attachment.content.toString('base64'),
        type: 'application/pdf'
      },
      metadata: {
        source: 'pipedream_historical',
        email_subject: emailMetadata.email_subject,
        email_from: emailMetadata.email_from,
        email_date: emailMetadata.email_date,
        email_message_id: emailMetadata.email_message_id,
        processed_at: new Date().toISOString()
      }
    };

    const response = await fetch(`${this.supabase_url}/functions/v1/pipedream-ocr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.supabase_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase函数调用失败 (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '处理失败');
    }

    return result.data;
  }
});