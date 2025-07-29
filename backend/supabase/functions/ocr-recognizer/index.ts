/**
 * OCR识别 Edge Function  
 * 独立模块：调用阿里云OCR API进行文档识别
 * 可复用于：发票识别、证件识别、文档数字化等场景
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import type { OCRRecognitionResult, EdgeFunctionContext } from "../_shared/types/index.ts"
import { createLogger, createErrorHandler, ErrorCode, createError } from "../_shared/utils/index.ts"

// 阿里云OCR配置
interface AliyunOCRConfig {
  accessKeyId: string
  accessKeySecret: string
  region: string
  endpoint: string
}

serve(async (req: Request) => {
  const context: EdgeFunctionContext = {
    request_id: crypto.randomUUID(),
    config: { log_level: 'info', retries: 3 }
  }
  
  const logger = createLogger('ocr-recognizer', context)
  const errorHandler = createErrorHandler('ocr-recognizer', context)

  return errorHandler.executeWithErrorHandling(async () => {
    if (req.method !== 'POST') {
      throw createError(ErrorCode.VALIDATION_ERROR, 'Only POST method allowed')
    }

    // 获取文件数据
    const contentType = req.headers.get('content-type') || ''
    let fileBuffer: ArrayBuffer

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        throw createError(ErrorCode.VALIDATION_ERROR, 'No file provided')
      }
      
      fileBuffer = await file.arrayBuffer()
      logger.info('接收到上传文件', { fileName: file.name, fileSize: fileBuffer.byteLength })
    } else if (contentType.includes('application/json')) {
      const body = await req.json()
      
      if (!body.file_data) {
        throw createError(ErrorCode.VALIDATION_ERROR, 'No file_data in request')
      }
      
      const base64Data = body.file_data.split(',')[1] || body.file_data
      fileBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer
      logger.info('接收到Base64文件', { fileSize: fileBuffer.byteLength })
    } else {
      throw createError(ErrorCode.VALIDATION_ERROR, 'Unsupported content type')
    }

    // 执行OCR识别
    const result = await performOCRRecognition(fileBuffer, context, logger)
    
    logger.info('OCR识别完成', { 
      confidence: result.confidence,
      invoice_type: result.invoice_type,
      processing_time: result.processing_time 
    })

    return result
  })
})

/**
 * OCR识别核心逻辑（可导出复用）
 */
export async function performOCRRecognition(
  fileBuffer: ArrayBuffer,
  context: EdgeFunctionContext,
  logger?: any
): Promise<OCRRecognitionResult> {
  const config = getAliyunOCRConfig()
  logger?.info('开始OCR识别', { region: config.region })
  
  const startTime = performance.now()
  let result: any
  
  try {
    // 调用阿里云OCR API
    result = await callAliyunOCR(fileBuffer, config, context.config.retries || 3, logger)
  } catch (error) {
    logger?.error('阿里云OCR调用失败', { error: error.message })
    throw createError(
      ErrorCode.EXTERNAL_API_ERROR, 
      `OCR识别失败: ${error.message}`,
      { original_error: error },
      'OCR识别服务暂时不可用，请稍后重试'
    )
  }
  
  const endTime = performance.now()
  const processingTime = endTime - startTime
  
  // 解析OCR响应并提取发票类型
  const { invoiceType, confidence } = extractInvoiceTypeAndConfidence(result, logger)
  
  return {
    raw_ocr_data: result,
    invoice_type: invoiceType,
    processing_time: processingTime,
    confidence: confidence,
    api_response: {
      status: 'success',
      processing_time: processingTime,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * 获取阿里云OCR配置
 */
function getAliyunOCRConfig(): AliyunOCRConfig {
  const accessKeyId = Deno.env.get('ALICLOUD_ACCESS_KEY_ID')
  const accessKeySecret = Deno.env.get('ALICLOUD_ACCESS_KEY_SECRET')
  const region = Deno.env.get('ALICLOUD_OCR_REGION') || 'cn-hangzhou'
  
  if (!accessKeyId || !accessKeySecret) {
    throw createError(
      ErrorCode.INTERNAL_ERROR,
      'Missing Aliyun OCR credentials',
      {},
      'OCR服务配置错误'
    )
  }
  
  return {
    accessKeyId,
    accessKeySecret,
    region,
    endpoint: `ocr-api.${region}.aliyuncs.com`
  }
}

/**
 * 调用阿里云OCR API（带重试机制）
 */
async function callAliyunOCR(
  fileBuffer: ArrayBuffer, 
  config: AliyunOCRConfig, 
  maxRetries: number,
  logger?: any
): Promise<any> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger?.info(`OCR API调用尝试 ${attempt}/${maxRetries}`)
      
      // 由于Deno Edge Runtime限制，我们需要通过后端代理调用阿里云API
      // 或者使用HTTP请求直接调用阿里云REST API
      const result = await callAliyunOCRViaBackend(fileBuffer, logger)
      
      logger?.info(`OCR API调用成功`, { attempt })
      return result
      
    } catch (error) {
      lastError = error as Error
      logger?.warn(`OCR API调用失败 (尝试 ${attempt}/${maxRetries})`, { error: error.message })
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        logger?.info(`等待 ${delay}ms 后重试`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError!
}

/**
 * 通过后端代理调用阿里云OCR
 * 这是Edge Function环境下的权宜之计
 */
async function callAliyunOCRViaBackend(fileBuffer: ArrayBuffer, logger?: any): Promise<any> {
  const backendUrl = Deno.env.get('BACKEND_URL') || 'http://localhost:8090'
  
  const formData = new FormData()
  formData.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), 'invoice.pdf')
  
  logger?.apiCall('backend-ocr', '/api/v1/ocr/recognize', 'start')
  
  const response = await fetch(`${backendUrl}/api/v1/ocr/recognize`, {
    method: 'POST',
    body: formData,
    // 注意：不设置Content-Type，让浏览器自动设置multipart/form-data边界
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    logger?.apiCall('backend-ocr', '/api/v1/ocr/recognize', 'error', { 
      status: response.status, 
      error: errorText 
    })
    throw new Error(`Backend OCR API failed: ${response.status} ${errorText}`)
  }
  
  const result = await response.json()
  logger?.apiCall('backend-ocr', '/api/v1/ocr/recognize', 'success')
  
  return result
}

/**
 * 从OCR结果中提取发票类型和置信度
 */
function extractInvoiceTypeAndConfidence(ocrResult: any, logger?: any): { invoiceType: string, confidence: number } {
  try {
    // 解析阿里云OCR响应格式
    const dataStr = ocrResult?.Data || ''
    if (!dataStr) {
      logger?.warn('OCR响应中没有Data字段')
      return { invoiceType: '未知类型', confidence: 0 }
    }
    
    const data = JSON.parse(dataStr)
    const subMsgs = data?.subMsgs || []
    
    if (subMsgs.length === 0) {
      logger?.warn('OCR响应中没有subMsgs')
      return { invoiceType: '未知类型', confidence: 0 }
    }
    
    const firstMsg = subMsgs[0]
    const ocrType = firstMsg?.type || ''
    const result = firstMsg?.result || {}
    
    // 发票类型映射
    const typeMapping: Record<string, string> = {
      'VATInvoice': '增值税发票',
      'TrainTicket': '火车票',
      'FlightTicket': '机票',
      'TaxiTicket': '出租车票',
      'BusTicket': '客运车票',
      'HotelReceipt': '酒店账单'
    }
    
    const invoiceType = typeMapping[ocrType] || ocrType || '未知类型'
    
    // 计算平均置信度
    const prismInfo = result?.prism_keyValueInfo || []
    let totalConfidence = 0
    let confidenceCount = 0
    
    for (const field of prismInfo) {
      if (field.valueProb) {
        totalConfidence += field.valueProb
        confidenceCount++
      }
    }
    
    const confidence = confidenceCount > 0 ? totalConfidence / confidenceCount / 100 : 0.8
    
    logger?.debug('发票类型识别结果', { 
      ocrType, 
      invoiceType, 
      confidence, 
      fieldCount: prismInfo.length 
    })
    
    return { invoiceType, confidence }
    
  } catch (error) {
    logger?.error('解析OCR结果失败', { error: error.message })
    return { invoiceType: '未知类型', confidence: 0 }
  }
}