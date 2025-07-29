/**
 * OCR完整处理流程 Edge Function
 * 主编排器：协调各个模块完成完整的OCR处理流程
 * 替代原有的 /api/v1/ocr/combined/full 接口
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import type { 
  OCRCompleteResponse, 
  EdgeFunctionContext,
  FileValidationResult,
  OCRRecognitionResult,
  ParsedInvoiceData,
  FieldValidationResult
} from "../_shared/types/index.ts"
import { 
  createLogger, 
  createErrorHandler, 
  createFunctionClient,
  ErrorCode, 
  createError,
  withCORS
} from "../_shared/utils/index.ts"

serve(withCORS(async (req: Request) => {
  // 创建执行上下文
  const context: EdgeFunctionContext = {
    request_id: crypto.randomUUID(),
    user_id: req.headers.get('x-user-id') || undefined,
    config: { 
      log_level: 'info',
      timeout: 120000, // 2分钟超时
      retries: 3,
      cache_enabled: true
    }
  }
  
  const logger = createLogger('ocr-complete', context)
  const errorHandler = createErrorHandler('ocr-complete', context)
  const functionClient = createFunctionClient(context)

  return errorHandler.executeWithErrorHandling(async () => {
    if (req.method !== 'POST') {
      throw createError(ErrorCode.VALIDATION_ERROR, 'Only POST method allowed')
    }

    logger.info('开始OCR完整处理流程', { 
      request_id: context.request_id,
      user_id: context.user_id 
    })

    const startTime = performance.now()
    
    // 获取上传的文件
    const fileData = await extractFileFromRequest(req, logger)
    
    // 执行处理管道
    const result = await functionClient.callFunctionsPipeline([
      {
        name: 'file-validator',
        transform: (_, originalData) => originalData.formData
      },
      {
        name: 'ocr-recognizer', 
        transform: (_, originalData) => originalData.formData
      },
      {
        name: 'data-parser',
        transform: (prevResult) => ({ ocr_result: prevResult })
      },
      {
        name: 'field-validator',
        transform: (prevResult) => ({ parsed_data: prevResult })
      }
    ], fileData)

    if (!result.success) {
      throw createError(ErrorCode.PROCESSING_ERROR, result.error!, result.metadata)
    }

    const endTime = performance.now()
    
    // 组装最终响应
    const response = assembleCompleteResponse(
      result.data!,
      result.metadata!,
      endTime - startTime,
      logger
    )

    logger.info('OCR完整处理流程完成', {
      success: response.success,
      invoice_type: response.invoice_type,
      overall_confidence: response.confidence.overall,
      total_time: response.metadata.total_processing_time
    })

    return response
  })
}))

/**
 * 从请求中提取文件数据
 */
async function extractFileFromRequest(req: Request, logger: any): Promise<any> {
  const contentType = req.headers.get('content-type') || ''
  
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      throw createError(ErrorCode.VALIDATION_ERROR, 'No file provided in form data')
    }
    
    logger.info('提取FormData文件', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type 
    })
    
    return { formData, file }
  } else {
    throw createError(ErrorCode.VALIDATION_ERROR, 'Unsupported content type. Use multipart/form-data')
  }
}

/**
 * 组装完整响应
 */
function assembleCompleteResponse(
  pipelineData: any,
  pipelineMetadata: any,
  totalTime: number,
  logger: any
): OCRCompleteResponse {
  // 从管道结果中提取各个步骤的数据
  const validationResult: FileValidationResult = pipelineMetadata.step_results['file-validator']
  const ocrResult: OCRRecognitionResult = pipelineMetadata.step_results['ocr-recognizer'] 
  const parsedData: ParsedInvoiceData = pipelineMetadata.step_results['data-parser']
  const fieldValidation: FieldValidationResult = pipelineData // 最终结果

  logger.debug('组装完整响应', {
    hasValidation: !!validationResult,
    hasOCR: !!ocrResult,
    hasParsed: !!parsedData,
    hasFieldValidation: !!fieldValidation
  })

  // 计算处理步骤
  const processingSteps = [
    `文件验证: ${validationResult?.valid ? '通过' : '失败'}`,
    `OCR识别: ${ocrResult?.invoice_type || '未知'}`,
    `数据解析: ${parsedData?.validation_ready ? '完成' : '部分完成'}`,
    `字段验证: ${fieldValidation?.is_valid ? '通过' : '有问题'}`
  ]

  return {
    success: fieldValidation?.is_valid || false,
    invoice_type: parsedData?.invoice_type || '未知类型',
    fields: parsedData?.fields || {},
    confidence: {
      overall: ocrResult?.confidence || 0,
      fields: parsedData?.field_confidences || {}
    },
    validation: fieldValidation || {
      is_valid: false,
      field_results: {},
      overall_errors: ['验证数据不完整'],
      overall_warnings: [],
      completeness_score: 0
    },
    raw_ocr_data: ocrResult?.raw_ocr_data || {},
    processing_steps: processingSteps,
    metadata: {
      total_processing_time: totalTime,
      step_timings: pipelineMetadata.step_timings || {},
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * 单机版处理流程（当Functions调用失败时的降级方案）
 */
async function processSingleMode(
  fileData: any,
  context: EdgeFunctionContext,
  logger: any
): Promise<OCRCompleteResponse> {
  logger.warn('启用单机模式处理')
  
  const startTime = performance.now()
  
  // 这里可以导入各模块的核心逻辑直接执行
  // 作为Functions间调用失败时的备选方案
  
  // 1. 基础文件验证
  const file = fileData.file as File
  const validationResult: FileValidationResult = {
    valid: true,
    file_info: {
      name: file.name,
      size: file.size,
      type: file.type,
      extension: file.name.substring(file.name.lastIndexOf('.'))
    },
    security_check: 'passed',
    errors: [],
    warnings: []
  }
  
  // 2. 通过后端调用OCR
  const fileBuffer = await file.arrayBuffer()
  const backendUrl = Deno.env.get('BACKEND_URL') || 'http://localhost:8090'
  
  const formData = new FormData()
  formData.append('file', new Blob([fileBuffer], { type: file.type }), file.name)
  
  const response = await fetch(`${backendUrl}/api/v1/ocr/combined/full`, {
    method: 'POST',
    body: formData
  })
  
  if (!response.ok) {
    throw createError(ErrorCode.EXTERNAL_API_ERROR, `Backend OCR failed: ${response.status}`)
  }
  
  const backendResult = await response.json()
  const endTime = performance.now()
  
  logger.info('单机模式处理完成', { 
    backend_success: backendResult.success,
    processing_time: endTime - startTime 
  })
  
  // 转换后端响应格式为Edge Function响应格式
  return {
    success: backendResult.success || false,
    invoice_type: backendResult.invoice_type || '未知类型',
    fields: backendResult.fields || {},
    confidence: {
      overall: backendResult.confidence?.overall || 0,
      fields: backendResult.confidence?.fields || {}
    },
    validation: backendResult.validation || {
      is_valid: false,
      field_results: {},
      overall_errors: [],
      overall_warnings: [],
      completeness_score: 0
    },
    raw_ocr_data: backendResult.raw_ocr_data || {},
    processing_steps: ['单机模式处理', '后端OCR调用'],
    metadata: {
      total_processing_time: endTime - startTime,
      step_timings: { 'backend_ocr': endTime - startTime },
      timestamp: new Date().toISOString()
    }
  }
}