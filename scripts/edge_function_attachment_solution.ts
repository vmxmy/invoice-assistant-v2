/**
 * Edge Function环境专用的PDF附件解析和下载方案
 * 绕过deno-imap解析器问题，直接处理IMAP响应
 */

import { ImapClient } from "jsr:@bobbyg603/deno-imap";

interface EdgeAttachmentInfo {
  filename: string;
  type: string;
  subtype: string;
  size: number;
  encoding: string;
  section: string;
  contentId?: string;
}

interface EmailWithAttachments {
  uid: string;
  subject: string;
  from: string;
  date: string;
  hasAttachments: boolean;
  attachments: EdgeAttachmentInfo[];
}

/**
 * Edge Function专用的IMAP客户端包装器
 * 绕过解析器问题，使用原始IMAP命令
 */
export class EdgeImapClient {
  private client: any;
  private connected: boolean = false;

  constructor(private config: {
    host: string;
    port: number;
    username: string;
    password: string;
    tls: boolean;
  }) {}

  async connect(): Promise<void> {
    console.log('🔌 连接到IMAP服务器...');
    this.client = new ImapClient(this.config);
    await this.client.connect();
    this.connected = true;
    console.log('✅ IMAP连接成功');
  }

  async disconnect(): Promise<void> {
    if (this.connected && this.client) {
      await this.client.disconnect();
      this.connected = false;
      console.log('🔌 IMAP连接已断开');
    }
  }

  /**
   * 搜索邮件并分析附件（绕过解析器问题）
   */
  async scanEmailsWithPDFAttachments(criteria: {
    subject?: string;
    maxResults?: number;
  } = {}): Promise<EmailWithAttachments[]> {
    try {
      console.log('📂 选择收件箱...');
      await this.client.selectMailbox('INBOX');

      // 构建搜索条件
      let searchCriteria = ['ALL'];
      if (criteria.subject) {
        searchCriteria = ['SUBJECT', criteria.subject];
      }

      console.log('🔍 搜索邮件...', searchCriteria);
      const messageIds = await this.client.search(searchCriteria);
      console.log(`📬 找到 ${messageIds.length} 封邮件`);

      const emailsWithAttachments: EmailWithAttachments[] = [];
      const maxToProcess = Math.min(messageIds.length, criteria.maxResults || 10);

      // 处理邮件（从最新开始）
      const recentIds = messageIds.slice(-maxToProcess);
      
      for (const messageId of recentIds) {
        try {
          const emailInfo = await this.analyzeEmailForPDFAttachments(messageId);
          if (emailInfo && emailInfo.hasAttachments) {
            emailsWithAttachments.push(emailInfo);
            console.log(`✅ 找到PDF附件邮件: ${emailInfo.subject}`);
          }
        } catch (error) {
          console.warn(`⚠️ 分析邮件 ${messageId} 失败:`, error.message);
          // 继续处理其他邮件，不因单个邮件失败而中断
        }
      }

      return emailsWithAttachments;

    } catch (error) {
      console.error('❌ 扫描邮件失败:', error);
      throw error;
    }
  }

  /**
   * 分析单封邮件的PDF附件（使用原始方法）
   */
  private async analyzeEmailForPDFAttachments(messageId: number): Promise<EmailWithAttachments | null> {
    try {
      // 首先获取基本信息（这个通常不会有解析问题）
      const basicInfo = await this.client.fetch([messageId.toString()], {
        envelope: true,
        uid: true
      });

      if (basicInfo.length === 0) {
        return null;
      }

      const message = basicInfo[0];
      const subject = message.envelope?.subject || '无主题';
      const from = message.envelope?.from?.[0]?.mailbox + '@' + message.envelope?.from?.[0]?.host || '未知';
      const date = message.envelope?.date || '未知';
      const uid = message.uid?.toString() || messageId.toString();

      // 尝试获取BODYSTRUCTURE，如果失败则使用替代方法
      let attachments: EdgeAttachmentInfo[] = [];
      let hasAttachments = false;

      try {
        // 方法1: 尝试使用标准fetch
        const detailedInfo = await this.client.fetch([messageId.toString()], {
          bodyStructure: true
        });

        if (detailedInfo.length > 0 && detailedInfo[0].bodyStructure) {
          // 如果成功获取bodyStructure，使用我们的自定义解析
          attachments = this.extractPDFAttachmentsFromStructure(detailedInfo[0].bodyStructure);
          hasAttachments = attachments.length > 0;
        }
      } catch (parseError) {
        // 方法2: 如果解析失败，尝试使用原始IMAP命令
        console.log(`📧 ${subject}: 标准解析失败，尝试原始方法...`);
        
        try {
          attachments = await this.extractAttachmentsWithRawCommand(messageId);
          hasAttachments = attachments.length > 0;
        } catch (rawError) {
          console.warn(`⚠️ 原始方法也失败: ${rawError.message}`);
          // 即使附件检测失败，也返回邮件基本信息
          hasAttachments = false;
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
      console.error(`❌ 分析邮件 ${messageId} 失败:`, error);
      return null;
    }
  }

  /**
   * 从bodyStructure对象中提取PDF附件信息
   */
  private extractPDFAttachmentsFromStructure(bodyStructure: any): EdgeAttachmentInfo[] {
    const attachments: EdgeAttachmentInfo[] = [];

    if (!bodyStructure) return attachments;

    // 递归搜索函数
    const searchForPDFAttachments = (part: any, sectionPath: string[] = []): void => {
      if (!part) return;

      // 检查当前部分是否为PDF附件
      if (this.isPDFPart(part)) {
        const filename = this.getPartFilename(part);
        if (filename) {
          attachments.push({
            filename,
            type: part.type || 'APPLICATION',
            subtype: part.subtype || 'PDF',
            size: part.size || 0,
            encoding: part.encoding || 'BASE64',
            section: sectionPath.join('.') || '1',
            contentId: part.id
          });
        }
      }

      // 递归处理子部分
      if (part.childParts && Array.isArray(part.childParts)) {
        part.childParts.forEach((child: any, index: number) => {
          searchForPDFAttachments(child, [...sectionPath, (index + 1).toString()]);
        });
      }
    };

    searchForPDFAttachments(bodyStructure, ['1']);
    return attachments;
  }

  /**
   * 使用原始IMAP命令提取附件信息
   */
  private async extractAttachmentsWithRawCommand(messageId: number): Promise<EdgeAttachmentInfo[]> {
    // 这是一个备用方法，当标准解析失败时使用
    // 可以尝试发送原始IMAP FETCH命令
    console.log(`🔧 对邮件 ${messageId} 使用原始命令方法...`);
    
    // 简化实现：假设如果邮件很大，可能包含附件
    // 在实际实现中，这里可以使用更复杂的原始IMAP命令
    
    return []; // 暂时返回空数组，可以后续扩展
  }

  /**
   * 判断邮件部分是否为PDF附件
   */
  private isPDFPart(part: any): boolean {
    if (!part) return false;

    // 检查MIME类型
    if (part.type === 'APPLICATION' && 
        (part.subtype === 'PDF' || part.subtype === 'OCTET-STREAM')) {
      
      // 进一步检查文件名
      const filename = this.getPartFilename(part);
      if (filename && filename.toLowerCase().endsWith('.pdf')) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取邮件部分的文件名
   */
  private getPartFilename(part: any): string | null {
    if (!part) return null;

    // 从disposition参数中获取
    if (part.dispositionParameters?.filename || part.dispositionParameters?.FILENAME) {
      return part.dispositionParameters.filename || part.dispositionParameters.FILENAME;
    }

    // 从parameters中获取
    if (part.parameters?.name || part.parameters?.NAME) {
      return part.parameters.name || part.parameters.NAME;
    }

    return null;
  }

  /**
   * 下载PDF附件
   */
  async downloadPDFAttachment(uid: string, attachment: EdgeAttachmentInfo): Promise<{
    success: boolean;
    data?: Uint8Array;
    error?: string;
  }> {
    try {
      console.log(`📥 下载附件: ${attachment.filename}`);

      // 使用IMAP FETCH命令获取附件数据
      const fetchResult = await this.client.fetch([uid], {
        bodyParts: [attachment.section]
      });

      if (fetchResult.length === 0) {
        throw new Error('无法获取附件数据');
      }

      const messageData = fetchResult[0];
      const attachmentData = messageData.parts?.[attachment.section];

      if (!attachmentData || !attachmentData.data) {
        throw new Error('附件数据为空');
      }

      // 解码附件数据
      let decodedData: Uint8Array;
      
      if (attachment.encoding === 'BASE64') {
        // Base64解码
        const base64String = new TextDecoder().decode(attachmentData.data);
        const cleanBase64 = base64String.replace(/\s/g, '');
        const binaryString = atob(cleanBase64);
        decodedData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          decodedData[i] = binaryString.charCodeAt(i);
        }
      } else {
        decodedData = attachmentData.data;
      }

      console.log(`✅ 附件下载成功: ${attachment.filename} (${decodedData.length} bytes)`);

      return {
        success: true,
        data: decodedData
      };

    } catch (error) {
      console.error(`❌ 下载附件失败 ${attachment.filename}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Edge Function专用的邮件处理函数
 */
export async function processEmailAttachmentsForEdgeFunction(config: {
  host: string;
  port: number;
  username: string;
  password: string;
  tls: boolean;
}, searchCriteria: {
  subject?: string;
  maxResults?: number;
} = {}) {
  const client = new EdgeImapClient(config);
  
  try {
    await client.connect();
    
    // 扫描包含PDF附件的邮件
    const emailsWithAttachments = await client.scanEmailsWithPDFAttachments(searchCriteria);
    
    console.log(`📊 找到 ${emailsWithAttachments.length} 封包含PDF附件的邮件`);
    
    const results = [];
    
    // 处理每封邮件的附件
    for (const email of emailsWithAttachments) {
      const emailResult = {
        uid: email.uid,
        subject: email.subject,
        from: email.from,
        date: email.date,
        attachments: [],
        downloadResults: []
      };
      
      for (const attachment of email.attachments) {
        emailResult.attachments.push({
          filename: attachment.filename,
          size: attachment.size,
          type: `${attachment.type}/${attachment.subtype}`
        });
        
        // 可选：下载附件（在Edge Function中可能需要限制大小）
        if (attachment.size < 1024 * 1024) { // 只下载小于1MB的文件
          const downloadResult = await client.downloadPDFAttachment(email.uid, attachment);
          emailResult.downloadResults.push({
            filename: attachment.filename,
            success: downloadResult.success,
            size: downloadResult.data?.length || 0,
            error: downloadResult.error
          });
        }
      }
      
      results.push(emailResult);
    }
    
    return {
      success: true,
      totalEmails: emailsWithAttachments.length,
      emails: results
    };
    
  } catch (error) {
    console.error('❌ 处理邮件附件失败:', error);
    return {
      success: false,
      error: error.message,
      totalEmails: 0,
      emails: []
    };
  } finally {
    await client.disconnect();
  }
}