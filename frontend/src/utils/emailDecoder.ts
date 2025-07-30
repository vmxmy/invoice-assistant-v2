/**
 * 邮件标题和发件人地址解码工具函数
 * 处理 RFC 2047 编码的邮件头信息
 */

/**
 * 解码邮件标题中的编码字符串
 * 支持格式: =?utf-8?B?base64content?= 或 =?utf-8?Q?quoted-printable?=
 */
export function decodeEmailHeader(encodedHeader: string): string {
  if (!encodedHeader) return '未知'
  
  try {
    // 处理多个编码段落
    let decoded = encodedHeader
    
    // 匹配 RFC 2047 编码格式: =?charset?encoding?content?=
    const encodedPattern = /=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g
    
    decoded = decoded.replace(encodedPattern, (match, charset, encoding, content) => {
      try {
        if (encoding.toUpperCase() === 'B') {
          // Base64 解码
          const decodedBytes = atob(content)
          return decodeURIComponent(escape(decodedBytes))
        } else if (encoding.toUpperCase() === 'Q') {
          // Quoted-Printable 解码 (简化版)
          let qpDecoded = content.replace(/_/g, ' ')
          qpDecoded = qpDecoded.replace(/=([0-9A-F]{2})/g, (_, hex) => {
            return String.fromCharCode(parseInt(hex, 16))
          })
          return qpDecoded
        }
        return content
      } catch (error) {
        console.warn('解码邮件头失败:', error, match)
        return content
      }
    })
    
    // 清理多余的空格
    decoded = decoded.replace(/\s+/g, ' ').trim()
    
    return decoded || '解码失败'
    
  } catch (error) {
    console.warn('邮件头解码出错:', error, encodedHeader)
    return encodedHeader
  }
}

/**
 * 解码邮件地址
 * 格式可能是: =?utf-8?B?encoded_name?= <email@domain.com> 或 email@domain.com
 */
export function decodeEmailAddress(encodedAddress: string): string {
  if (!encodedAddress) return '未知发件人'
  
  try {
    // 先解码可能的编码部分
    let decoded = decodeEmailHeader(encodedAddress)
    
    // 提取显示名称和邮箱地址
    const emailMatch = decoded.match(/^(.+?)\s*<(.+?)>$/)
    if (emailMatch) {
      const [, displayName, email] = emailMatch
      const cleanDisplayName = displayName.trim().replace(/^"|"$/g, '')
      return cleanDisplayName || email
    }
    
    // 如果没有显示名称，直接返回邮箱地址
    const emailOnlyMatch = decoded.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    if (emailOnlyMatch) {
      return emailOnlyMatch[1]
    }
    
    return decoded
    
  } catch (error) {
    console.warn('邮件地址解码出错:', error, encodedAddress)
    return encodedAddress
  }
}

/**
 * 解码邮件主题
 * 专门用于邮件主题的解码，提供更好的错误处理
 */
export function decodeEmailSubject(encodedSubject: string): string {
  if (!encodedSubject) return '无主题'
  
  const decoded = decodeEmailHeader(encodedSubject)
  return decoded === '解码失败' ? '主题解码失败' : decoded
}

/**
 * 批量解码邮件列表
 */
export function decodeEmailList(emails: any[]): any[] {
  return emails.map(email => ({
    ...email,
    subject: decodeEmailSubject(email.subject),
    from: decodeEmailAddress(email.from)
  }))
}