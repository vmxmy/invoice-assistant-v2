/**
 * 文件验证 Edge Function
 * 独立模块：验证上传文件的格式、大小、安全性
 * 可复用于：发票上传、图片处理、文档管理等场景
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import type { FileValidationResult, EdgeFunctionContext } from "../_shared/types/index.ts"
import { createLogger, createErrorHandler, ErrorCode, createError } from "../_shared/utils/index.ts"

// 支持的文件类型配置
const SUPPORTED_TYPES = {
  'application/pdf': { extensions: ['.pdf'], maxSize: 10 * 1024 * 1024 }, // 10MB
  'image/jpeg': { extensions: ['.jpg', '.jpeg'], maxSize: 5 * 1024 * 1024 }, // 5MB  
  'image/png': { extensions: ['.png'], maxSize: 5 * 1024 * 1024 },
  'image/webp': { extensions: ['.webp'], maxSize: 5 * 1024 * 1024 }
}

const PDF_SIGNATURE = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF
const JPEG_SIGNATURE = new Uint8Array([0xFF, 0xD8, 0xFF])
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4E, 0x47])

serve(async (req: Request) => {
  const context: EdgeFunctionContext = {
    request_id: crypto.randomUUID(),
    config: { log_level: 'info' }
  }
  
  const logger = createLogger('file-validator', context)
  const errorHandler = createErrorHandler('file-validator', context)

  return errorHandler.executeWithErrorHandling(async () => {
    if (req.method !== 'POST') {
      throw createError(ErrorCode.VALIDATION_ERROR, 'Only POST method allowed')
    }

    const contentType = req.headers.get('content-type') || ''
    let fileBuffer: ArrayBuffer
    let fileName: string
    let fileType: string

    if (contentType.includes('multipart/form-data')) {
      // FormData 格式
      const formData = await req.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        throw createError(ErrorCode.VALIDATION_ERROR, 'No file provided in form data')
      }
      
      fileBuffer = await file.arrayBuffer()
      fileName = file.name
      fileType = file.type
    } else if (contentType.includes('application/json')) {
      // JSON 格式（包含base64编码的文件）
      const body = await req.json()
      
      if (!body.file_data || !body.file_name || !body.file_type) {
        throw createError(ErrorCode.VALIDATION_ERROR, 'Missing file_data, file_name, or file_type in JSON body')
      }
      
      try {
        const base64Data = body.file_data.split(',')[1] || body.file_data
        fileBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer
        fileName = body.file_name
        fileType = body.file_type
      } catch (error) {
        throw createError(ErrorCode.VALIDATION_ERROR, 'Invalid base64 file data')
      }
    } else {
      throw createError(ErrorCode.VALIDATION_ERROR, 'Unsupported content type. Use multipart/form-data or application/json')
    }

    logger.info('开始文件验证', { fileName, fileType, fileSize: fileBuffer.byteLength })

    const result = await validateFile(fileBuffer, fileName, fileType, logger)
    
    logger.info('文件验证完成', { 
      valid: result.valid, 
      errors: result.errors.length,
      warnings: result.warnings.length 
    })

    return result
  })
})

/**
 * 文件验证核心逻辑（可导出复用）
 */
export async function validateFile(
  fileBuffer: ArrayBuffer, 
  fileName: string, 
  fileType: string, 
  logger?: any
): Promise<FileValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  
  // 1. 基本信息提取
  const fileSize = fileBuffer.byteLength
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  
  logger?.debug('文件基本信息', { fileName, fileType, fileSize, extension })
  
  // 2. 文件大小检查
  if (fileSize === 0) {
    errors.push('文件为空')
  } else if (fileSize > 20 * 1024 * 1024) { // 20MB 绝对上限
    errors.push('文件过大，不能超过20MB')
  }
  
  // 3. 文件类型检查
  const typeConfig = SUPPORTED_TYPES[fileType as keyof typeof SUPPORTED_TYPES]
  if (!typeConfig) {
    errors.push(`不支持的文件类型: ${fileType}`)
  } else {
    // 检查扩展名
    if (!typeConfig.extensions.includes(extension)) {
      errors.push(`文件扩展名 ${extension} 与类型 ${fileType} 不匹配`)
    }
    
    // 检查大小限制
    if (fileSize > typeConfig.maxSize) {
      errors.push(`${fileType} 文件不能超过 ${(typeConfig.maxSize / 1024 / 1024).toFixed(1)}MB`)
    }
  }
  
  // 4. 文件头验证（防止文件类型伪造）
  const securityCheck = await validateFileSignature(fileBuffer, fileType, logger)
  if (securityCheck !== 'passed') {
    errors.push('文件头验证失败，可能是伪造的文件类型')
  }
  
  // 5. 恶意内容检查
  const malwareCheck = await basicMalwareCheck(fileBuffer, fileName, logger)
  if (!malwareCheck.safe) {
    errors.push(`安全检查失败: ${malwareCheck.reason}`)
  }
  
  // 6. 生成警告
  if (fileSize > 5 * 1024 * 1024) {
    warnings.push('文件较大，处理可能需要更长时间')
  }
  
  if (fileName.includes(' ')) {
    warnings.push('文件名包含空格，建议使用下划线或连字符')
  }
  
  const result: FileValidationResult = {
    valid: errors.length === 0,
    file_info: {
      name: fileName,
      size: fileSize,
      type: fileType,
      extension: extension
    },
    security_check: securityCheck,
    errors,
    warnings
  }
  
  return result
}

/**
 * 文件签名验证
 */
async function validateFileSignature(fileBuffer: ArrayBuffer, fileType: string, logger?: any): Promise<'passed' | 'failed'> {
  if (fileBuffer.byteLength < 4) {
    return 'failed'
  }
  
  const header = new Uint8Array(fileBuffer, 0, 4)
  
  switch (fileType) {
    case 'application/pdf':
      return arraysEqual(header, PDF_SIGNATURE) ? 'passed' : 'failed'
    
    case 'image/jpeg':
      const jpegHeader = new Uint8Array(fileBuffer, 0, 3)
      return arraysEqual(jpegHeader, JPEG_SIGNATURE) ? 'passed' : 'failed'
    
    case 'image/png':
      return arraysEqual(header, PNG_SIGNATURE) ? 'passed' : 'failed'
    
    case 'image/webp':
      // WebP: RIFF****WEBP
      const riff = new Uint8Array(fileBuffer, 0, 4)
      const webp = new Uint8Array(fileBuffer, 8, 4)
      return (
        arraysEqual(riff, new Uint8Array([0x52, 0x49, 0x46, 0x46])) &&
        arraysEqual(webp, new Uint8Array([0x57, 0x45, 0x42, 0x50]))
      ) ? 'passed' : 'failed'
    
    default:
      logger?.warn('未知文件类型，跳过签名验证', { fileType })
      return 'passed'
  }
}

/**
 * 基础恶意软件检查
 */
async function basicMalwareCheck(fileBuffer: ArrayBuffer, fileName: string, logger?: any): Promise<{safe: boolean, reason?: string}> {
  // 1. 文件名检查
  const suspiciousPatterns = [
    /\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.scr$/i, /\.vbs$/i, 
    /\.js$/i, /\.jar$/i, /\.com$/i, /\.pif$/i
  ]
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fileName)) {
      return { safe: false, reason: '文件名包含可疑的可执行文件扩展名' }
    }
  }
  
  // 2. 内容检查（检查是否包含可疑的二进制模式）
  const uint8Array = new Uint8Array(fileBuffer)
  const content = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array.slice(0, 1024))
  
  // 检查是否包含脚本标签或可执行代码特征
  const maliciousPatterns = [
    /<script/i, /javascript:/i, /vbscript:/i,
    /cmd\.exe/i, /powershell/i, /eval\(/i
  ]
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(content)) {
      return { safe: false, reason: '文件内容包含可疑的脚本代码' }
    }
  }
  
  return { safe: true }
}

/**
 * 数组比较工具函数
 */
function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}