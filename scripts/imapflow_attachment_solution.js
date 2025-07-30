/**
 * 使用imapflow库的PDF附件检测和下载方案
 * 这是一个更稳定的解决方案，因为imapflow在我们之前的测试中表现良好
 */

const { ImapFlow } = require('imapflow');
const fs = require('fs');
const path = require('path');

class ImapFlowAttachmentHandler {
  constructor(config) {
    this.config = config;
    this.client = null;
  }

  async connect() {
    console.log('🔌 使用ImapFlow连接到邮箱...');
    
    this.client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.tls || true,
      auth: {
        user: this.config.username,
        pass: this.config.password
      },
      logger: false
    });

    await this.client.connect();
    console.log('✅ ImapFlow连接成功');
  }

  async disconnect() {
    if (this.client) {
      await this.client.logout();
      console.log('🔌 ImapFlow连接已断开');
    }
  }

  /**
   * 扫描邮箱中的PDF附件
   */
  async scanForPDFAttachments(searchCriteria = {}) {
    try {
      console.log('📂 选择收件箱...');
      let lock = await this.client.getMailboxLock('INBOX');
      
      try {
        // 构建搜索条件
        let searchQuery = { all: true };
        if (searchCriteria.subject) {
          searchQuery = { subject: searchCriteria.subject };
        }
        if (searchCriteria.since) {
          searchQuery.since = new Date(searchCriteria.since);
        }

        console.log('🔍 搜索邮件...', searchQuery);
        
        // 搜索邮件
        const messages = [];
        for await (let message of this.client.fetch(searchQuery, {
          envelope: true,
          bodyStructure: true,
          source: false
        })) {
          // 检查是否有PDF附件
          const pdfAttachments = this.findPDFAttachments(message.bodyStructure);
          
          if (pdfAttachments.length > 0) {
            messages.push({
              uid: message.uid,
              seq: message.seq,
              subject: message.envelope.subject,
              from: message.envelope.from?.[0]?.address,
              date: message.envelope.date,
              pdfAttachments: pdfAttachments,
              bodyStructure: message.bodyStructure
            });
            
            console.log(`📧 找到包含PDF的邮件: ${message.envelope.subject}`);
            console.log(`📎 PDF附件: ${pdfAttachments.map(att => att.filename).join(', ')}`);
          }
        }

        console.log(`📊 总共找到 ${messages.length} 封包含PDF附件的邮件`);
        return messages;

      } finally {
        lock.release();
      }

    } catch (error) {
      console.error('❌ 扫描PDF附件时出错:', error);
      throw error;
    }
  }

  /**
   * 从bodyStructure中查找PDF附件
   */
  findPDFAttachments(bodyStructure, path = '') {
    const attachments = [];

    if (!bodyStructure) return attachments;

    // 递归处理多部分邮件
    if (bodyStructure.childNodes && Array.isArray(bodyStructure.childNodes)) {
      bodyStructure.childNodes.forEach((child, index) => {
        const childPath = path ? `${path}.${index + 1}` : `${index + 1}`;
        attachments.push(...this.findPDFAttachments(child, childPath));
      });
    }

    // 检查当前节点是否为PDF附件
    if (this.isPDFAttachment(bodyStructure)) {
      const filename = this.getAttachmentFilename(bodyStructure);
      
      attachments.push({
        filename: filename,
        type: bodyStructure.type,
        subtype: bodyStructure.subtype,
        size: bodyStructure.size,
        encoding: bodyStructure.encoding,
        disposition: bodyStructure.disposition,
        section: path || '1'
      });
    }

    return attachments;
  }

  /**
   * 判断是否为PDF附件
   */
  isPDFAttachment(part) {
    if (!part) return false;

    // 检查MIME类型
    if (part.type === 'application' && part.subtype === 'pdf') {
      return true;
    }

    // 检查文件名
    const filename = this.getAttachmentFilename(part);
    if (filename && filename.toLowerCase().endsWith('.pdf')) {
      return true;
    }

    // 检查disposition为attachment的PDF文件
    if (part.disposition === 'attachment' && filename && filename.toLowerCase().endsWith('.pdf')) {
      return true;
    }

    return false;
  }

  /**
   * 获取附件文件名
   */
  getAttachmentFilename(part) {
    if (!part) return null;

    // 优先从disposition参数中获取
    if (part.dispositionParameters && part.dispositionParameters.filename) {
      return part.dispositionParameters.filename;
    }

    // 从type参数中获取
    if (part.parameters && part.parameters.name) {
      return part.parameters.name;
    }

    return 'unnamed.pdf';
  }

  /**
   * 下载PDF附件
   */
  async downloadPDFAttachment(messageUid, attachment, downloadDir = './downloads') {
    try {
      console.log(`📥 开始下载附件: ${attachment.filename}`);

      // 确保下载目录存在
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      let lock = await this.client.getMailboxLock('INBOX');
      
      try {
        // 获取附件数据
        const { content } = await this.client.download(messageUid, attachment.section, {
          uid: true
        });

        // 解码附件数据
        let decodedContent;
        if (attachment.encoding === 'base64') {
          decodedContent = Buffer.from(content.toString(), 'base64');
        } else {
          decodedContent = content;
        }

        // 保存文件
        const filePath = path.join(downloadDir, attachment.filename);
        fs.writeFileSync(filePath, decodedContent);

        console.log(`✅ 附件下载成功: ${filePath}`);
        console.log(`📊 文件大小: ${decodedContent.length} bytes`);

        return {
          success: true,
          filePath: filePath,
          size: decodedContent.length
        };

      } finally {
        lock.release();
      }

    } catch (error) {
      console.error(`❌ 下载附件失败 ${attachment.filename}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 批量下载所有PDF附件
   */
  async downloadAllPDFAttachments(messages, downloadDir = './downloads') {
    const results = [];

    for (const message of messages) {
      console.log(`\n📧 处理邮件: ${message.subject}`);
      
      for (const attachment of message.pdfAttachments) {
        const result = await this.downloadPDFAttachment(
          message.uid, 
          attachment, 
          downloadDir
        );
        
        results.push({
          message: {
            uid: message.uid,
            subject: message.subject,
            from: message.from
          },
          attachment: attachment,
          download: result
        });
      }
    }

    return results;
  }
}

// 使用示例
async function testImapFlowAttachmentHandler() {
  console.log('🧪 测试ImapFlow附件处理器...\n');

  const handler = new ImapFlowAttachmentHandler({
    host: 'imap.qq.com',
    port: 993,
    tls: true,
    username: 'vmxmy@qq.com',
    password: 'lagrezfyfpnobgic'
  });

  try {
    await handler.connect();

    // 扫描PDF附件
    const messages = await handler.scanForPDFAttachments({
      subject: '发票',  // 搜索包含"发票"的邮件
    });

    if (messages.length > 0) {
      console.log(`\n📥 开始下载 ${messages.length} 封邮件中的PDF附件...`);
      
      // 只下载前3封邮件的附件进行测试
      const testMessages = messages.slice(0, 3);
      const downloadResults = await handler.downloadAllPDFAttachments(testMessages);
      
      console.log('\n📊 下载结果总结:');
      let successCount = 0;
      let failCount = 0;
      
      downloadResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.attachment.filename}`);
        console.log(`   邮件: ${result.message.subject}`);
        if (result.download.success) {
          console.log(`   ✅ 成功 - ${result.download.filePath}`);
          successCount++;
        } else {
          console.log(`   ❌ 失败 - ${result.download.error}`);
          failCount++;
        }
      });
      
      console.log(`\n📈 总结: 成功 ${successCount} 个，失败 ${failCount} 个`);
    } else {
      console.log('❌ 没有找到包含PDF附件的邮件');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await handler.disconnect();
  }
}

module.exports = { ImapFlowAttachmentHandler };

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testImapFlowAttachmentHandler();
}