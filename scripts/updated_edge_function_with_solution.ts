/**
 * 更新的Edge Function，使用改进的PDF附件检测方案
 * 绕过deno-imap解析器问题
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ImapClient } from "jsr:@bobbyg603/deno-imap"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EdgeAttachmentInfo {
  filename: string;
  type: string;
  subtype: string;
  size: number;
  encoding: string;
  section: string;
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
 * 改进的PDF附件检测类
 */
class ImprovedPDFDetector {
  private client: any;

  constructor(client: any) {
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

      if (basicInfo.length === 0) {
        return null;
      }

      const message = basicInfo[0];
      const subject = message.envelope?.subject || '无主题';
      const from = this.formatEmailAddress(message.envelope?.from);
      const date = message.envelope?.date || '未知';
      const uid = message.uid?.toString() || messageId.toString();

      let attachments: EdgeAttachmentInfo[] = [];
      let hasAttachments = false;

      try {
        // 尝试获取bodyStructure
        const detailedInfo = await this.client.fetch([messageId.toString()], {
          bodyStructure: true
        });

        if (detailedInfo.length > 0 && detailedInfo[0].bodyStructure) {
          attachments = this.extractPDFAttachmentsFromStructure(detailedInfo[0].bodyStructure);
          hasAttachments = attachments.length > 0;
        }
      } catch (parseError) {
        // 如果解析失败，尝试从错误信息中提取附件信息
        console.log(`📧 ${subject}: 解析失败，尝试从错误中提取附件信息...`);
        
        if (parseError.message && parseError.message.includes('pdf')) {
          // 从错误信息中提取PDF文件名
          attachments = this.extractPDFFromErrorMessage(parseError.message);
          hasAttachments = attachments.length > 0;
          
          if (hasAttachments) {
            console.log(`✅ 从错误信息中找到 ${attachments.length} 个PDF附件`);
          }
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
      console.error(`❌ 分析邮件 ${messageId} 失败:`, error.message);
      return null;
    }
  }

  /**
   * 从bodyStructure中提取PDF附件
   */
  private extractPDFAttachmentsFromStructure(bodyStructure: any): EdgeAttachmentInfo[] {
    const attachments: EdgeAttachmentInfo[] = [];

    const searchForPDFAttachments = (part: any, sectionPath: string[] = []): void => {
      if (!part) return;

      if (this.isPDFPart(part)) {
        const filename = this.getPartFilename(part);
        if (filename) {
          attachments.push({
            filename,
            type: part.type || 'APPLICATION',
            subtype: part.subtype || 'PDF',
            size: part.size || 0,
            encoding: part.encoding || 'BASE64',
            section: sectionPath.join('.') || '1'
          });
        }
      }

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
   * 从错误信息中提取PDF附件信息（应急方案）
   */
  private extractPDFFromErrorMessage(errorMessage: string): EdgeAttachmentInfo[] {
    const attachments: EdgeAttachmentInfo[] = [];

    try {
      // 使用正则表达式匹配PDF附件信息
      const pdfPattern = /"filename"\s+"([^"]*\.pdf)"/gi;
      const sizePattern = /"BASE64"\s+(\d+)/g;
      
      let pdfMatch;
      let sectionIndex = 1;
      
      while ((pdfMatch = pdfPattern.exec(errorMessage)) !== null) {
        const filename = pdfMatch[1];
        
        // 尝试找到对应的大小信息
        const sizeMatch = sizePattern.exec(errorMessage);
        const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;
        
        // 解码文件名（如果是编码的）
        let decodedFilename = filename;
        if (filename.includes('=?') && filename.includes('?=')) {
          try {
            decodedFilename = this.decodeEmailHeader(filename);
          } catch (e) {
            console.warn('文件名解码失败:', filename);
          }
        }
        
        attachments.push({
          filename: decodedFilename,
          type: 'APPLICATION',
          subtype: 'PDF',
          size: size,
          encoding: 'BASE64',
          section: sectionIndex.toString()
        });
        
        sectionIndex++;
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
      const match = encoded.match(/^=\?([^?]+)\?([BbQq])\?([^?]+)\?=$/);
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

  /**
   * 判断是否为PDF部分
   */
  private isPDFPart(part: any): boolean {
    if (!part) return false;

    if (part.type === 'APPLICATION' && 
        (part.subtype === 'PDF' || part.subtype === 'OCTET-STREAM')) {
      const filename = this.getPartFilename(part);
      if (filename && filename.toLowerCase().endsWith('.pdf')) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取部分的文件名
   */
  private getPartFilename(part: any): string | null {
    if (!part) return null;

    if (part.dispositionParameters?.filename || part.dispositionParameters?.FILENAME) {
      return part.dispositionParameters.filename || part.dispositionParameters.FILENAME;
    }

    if (part.parameters?.name || part.parameters?.NAME) {
      return part.parameters.name || part.parameters.NAME;
    }

    return null;
  }

  /**
   * 格式化邮件地址
   */
  private formatEmailAddress(fromArray: any[]): string {
    if (!fromArray || fromArray.length === 0) return '未知';
    const from = fromArray[0];
    return `${from.mailbox || 'unknown'}@${from.host || 'unknown'}`;
  }
}

/**
 * 主要的邮件扫描函数
 */
async function scanEmailsWithImprovedDetection(emailConfig: any, searchCriteria: any = {}) {
  const client = new ImapClient({
    host: emailConfig.host,
    port: emailConfig.port,
    tls: emailConfig.tls,
    username: emailConfig.username,
    password: emailConfig.password
  });

  const detector = new ImprovedPDFDetector(client);
  
  try {
    console.log('🔌 连接到IMAP服务器...');
    await client.connect();
    
    console.log('📂 选择收件箱...');
    await client.selectMailbox('INBOX');

    // 搜索邮件
    let searchQuery = ['ALL'];
    if (searchCriteria.subject) {
      searchQuery = ['SUBJECT', searchCriteria.subject];
    }

    console.log('🔍 搜索邮件...', searchQuery);
    const messageIds = await client.search(searchQuery);
    console.log(`📬 找到 ${messageIds.length} 封邮件`);

    const emailsWithAttachments: EmailWithAttachments[] = [];
    const maxToProcess = Math.min(messageIds.length, searchCriteria.maxResults || 10);
    const recentIds = messageIds.slice(-maxToProcess);
    
    let processedCount = 0;
    let attachmentCount = 0;

    for (const messageId of recentIds) {
      try {
        const emailInfo = await detector.analyzeEmailSafely(messageId);
        
        if (emailInfo) {
          if (emailInfo.hasAttachments) {
            emailsWithAttachments.push(emailInfo);
            attachmentCount += emailInfo.attachments.length;
            console.log(`✅ 邮件 ${messageId}: ${emailInfo.attachments.length} 个PDF附件`);
          }
          processedCount++;
        }
      } catch (error) {
        console.warn(`⚠️ 跳过邮件 ${messageId}:`, error.message);
      }
    }

    console.log(`📊 处理完成: ${processedCount}/${recentIds.length} 封邮件，找到 ${emailsWithAttachments.length} 封含PDF的邮件，总计 ${attachmentCount} 个附件`);

    return {
      success: true,
      totalProcessed: processedCount,
      totalWithAttachments: emailsWithAttachments.length,
      totalAttachments: attachmentCount,
      emails: emailsWithAttachments.map(email => ({
        uid: email.uid,
        subject: email.subject,
        from: email.from,
        date: email.date,
        hasAttachments: email.hasAttachments,
        attachmentNames: email.attachments.map(att => att.filename),
        attachmentInfo: email.attachments
      }))
    };

  } catch (error) {
    console.error('❌ 扫描失败:', error);
    throw error;
  } finally {
    try {
      await client.disconnect();
    } catch (error) {
      console.warn('断开连接时出错:', error);
    }
  }
}

/**
 * Edge Function主处理函数
 */
serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { emailConfig, searchCriteria } = await req.json()

    console.log('🚀 开始邮件扫描...')
    console.log('📧 邮件配置:', {
      host: emailConfig.host,
      port: emailConfig.port,
      username: emailConfig.username?.substring(0, 3) + '***'
    })
    console.log('🔍 搜索条件:', searchCriteria)

    const result = await scanEmailsWithImprovedDetection(emailConfig, searchCriteria)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Edge Function错误:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        totalProcessed: 0,
        totalWithAttachments: 0,
        totalAttachments: 0,
        emails: []
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})