/**
 * 修复版本的bodyStructure解析器
 * 专门处理复杂的多部分邮件结构，特别是包含PDF附件的邮件
 */

interface FixedAttachmentInfo {
  filename: string;
  type: string;
  subtype: string;
  size: number;
  encoding: string;
  section: string;
}

/**
 * 直接从BODYSTRUCTURE字符串中提取附件信息
 * 绕过deno-imap的解析器问题
 */
export function extractAttachmentsFromBodyStructure(bodyStructureStr: string): FixedAttachmentInfo[] {
  const attachments: FixedAttachmentInfo[] = [];
  
  try {
    console.log('🔍 开始解析BODYSTRUCTURE字符串...');
    console.log('原始数据长度:', bodyStructureStr.length);
    
    // 查找所有APPLICATION类型的部分
    const applicationMatches = [...bodyStructureStr.matchAll(/\("APPLICATION"\s+"([^"]+)"\s+\([^)]*"filename"\s+"([^"]+)"\)[^)]*\)\s+[^)]*\s+"([^"]+)"\s+(\d+)/g)];
    
    console.log(`找到 ${applicationMatches.length} 个APPLICATION类型附件`);
    
    applicationMatches.forEach((match, index) => {
      const [fullMatch, subtype, filename, encoding, size] = match;
      
      // 解码文件名（如果是编码的）
      let decodedFilename = filename;
      if (filename.startsWith('=?') && filename.endsWith('?=')) {
        try {
          decodedFilename = decodeEmailHeader(filename);
        } catch (e) {
          console.warn('文件名解码失败:', filename, e);
        }
      }
      
      // 只处理PDF文件
      if (decodedFilename.toLowerCase().endsWith('.pdf') || subtype.toUpperCase() === 'PDF') {
        attachments.push({
          filename: decodedFilename,
          type: 'APPLICATION',
          subtype: subtype.toUpperCase(),
          size: parseInt(size, 10),
          encoding: encoding.toUpperCase(),
          section: `${index + 2}` // 简化的section编号
        });
        
        console.log(`✅ 找到PDF附件: ${decodedFilename} (${size} bytes)`);
      }
    });
    
    // 也查找OCTET-STREAM类型的PDF文件
    const octetMatches = [...bodyStructureStr.matchAll(/\("APPLICATION"\s+"OCTET-STREAM"\s+\([^)]*"name"\s+"([^"]+)"\)[^)]*\)\s+[^)]*\s+"([^"]+)"\s+(\d+)[^)]*\([^)]*"filename"\s+"([^"]+)"\)/g)];
    
    console.log(`找到 ${octetMatches.length} 个OCTET-STREAM类型附件`);
    
    octetMatches.forEach((match, index) => {
      const [fullMatch, nameParam, encoding, size, filename] = match;
      
      // 解码文件名
      let decodedFilename = filename;
      if (filename.startsWith('=?') && filename.endsWith('?=')) {
        try {
          decodedFilename = decodeEmailHeader(filename);
        } catch (e) {
          console.warn('文件名解码失败:', filename, e);
        }
      }
      
      // 只处理PDF文件
      if (decodedFilename.toLowerCase().endsWith('.pdf')) {
        attachments.push({
          filename: decodedFilename,
          type: 'APPLICATION',
          subtype: 'OCTET-STREAM',
          size: parseInt(size, 10),
          encoding: encoding.toUpperCase(),
          section: `${applicationMatches.length + index + 2}` // 调整section编号
        });
        
        console.log(`✅ 找到PDF附件(OCTET-STREAM): ${decodedFilename} (${size} bytes)`);
      }
    });
    
    return attachments;
    
  } catch (error) {
    console.error('❌ 解析BODYSTRUCTURE时出错:', error);
    return [];
  }
}

/**
 * 解码邮件头部编码的字符串（如=?gbk?B?...?=格式）
 */
function decodeEmailHeader(encoded: string): string {
  try {
    // 匹配 =?charset?encoding?data?= 格式
    const match = encoded.match(/^=\?([^?]+)\?([BbQq])\?([^?]+)\?=$/);
    if (!match) {
      return encoded;
    }
    
    const [, charset, encoding, data] = match;
    
    if (encoding.toUpperCase() === 'B') {
      // Base64解码
      const decoded = atob(data);
      return decoded;
    } else if (encoding.toUpperCase() === 'Q') {
      // Quoted-printable解码
      const decoded = data
        .replace(/_/g, ' ')
        .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      return decoded;
    }
    
    return encoded;
  } catch (error) {
    console.warn('解码邮件头部失败:', error);
    return encoded;
  }
}

/**
 * 检查BODYSTRUCTURE字符串是否包含PDF附件
 */
export function hasAttachmentsInBodyStructure(bodyStructureStr: string): boolean {
  if (!bodyStructureStr) return false;
  
  // 查找PDF文件的多种模式
  const pdfPatterns = [
    /\.pdf['"]/i,  // 文件名以.pdf结尾
    /"PDF"/i,      // 子类型为PDF
    /filename[^}]*\.pdf/i  // 文件名参数包含.pdf
  ];
  
  return pdfPatterns.some(pattern => pattern.test(bodyStructureStr));
}

/**
 * 使用原始IMAP命令获取邮件的BODYSTRUCTURE
 */
export async function getRawBodyStructure(client: any, messageId: string): Promise<string | null> {
  try {
    // 发送原始IMAP FETCH命令
    const response = await client.sendCommand(`FETCH ${messageId} (BODYSTRUCTURE)`);
    
    if (response && response.length > 0) {
      // 提取BODYSTRUCTURE部分
      const bodyStructureMatch = response.join('\n').match(/BODYSTRUCTURE\s+(\([^}]+\))/);
      if (bodyStructureMatch) {
        return bodyStructureMatch[1];
      }
    }
    
    return null;
  } catch (error) {
    console.error('获取原始BODYSTRUCTURE失败:', error);
    return null;
  }
}