/**
 * 数据解析 Edge Function
 * 独立模块：将OCR识别结果解析为结构化的发票数据
 * 可复用于：不同类型发票解析、数据标准化等场景
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import type { 
  ParsedInvoiceData, 
  OCRRecognitionResult, 
  EdgeFunctionContext 
} from "../_shared/types/index.ts"
import { 
  createLogger, 
  createErrorHandler, 
  ErrorCode, 
  createError 
} from "../_shared/utils/index.ts"

serve(async (req: Request) => {
  const context: EdgeFunctionContext = {
    request_id: crypto.randomUUID(),
    config: { log_level: 'info' }
  }
  
  const logger = createLogger('data-parser', context)
  const errorHandler = createErrorHandler('data-parser', context)

  return errorHandler.executeWithErrorHandling(async () => {
    if (req.method !== 'POST') {
      throw createError(ErrorCode.VALIDATION_ERROR, 'Only POST method allowed')
    }

    const body = await req.json()
    
    if (!body.ocr_result) {
      throw createError(ErrorCode.VALIDATION_ERROR, 'Missing ocr_result in request body')
    }

    logger.info('开始数据解析', { 
      invoice_type: body.ocr_result.invoice_type 
    })

    const result = await parseInvoiceData(body.ocr_result, context, logger)
    
    logger.info('数据解析完成', {
      invoice_type: result.invoice_type,
      field_count: Object.keys(result.fields).length,
      confidence_avg: Object.values(result.field_confidences).reduce((a: number, b: number) => a + b, 0) / Object.keys(result.field_confidences).length
    })

    return result
  })
})

/**
 * 发票数据解析核心逻辑（可导出复用）
 */
export async function parseInvoiceData(
  ocrResult: OCRRecognitionResult,
  context: EdgeFunctionContext,
  logger?: any
): Promise<ParsedInvoiceData> {
  const startTime = performance.now()
  
  try {
    // 解析OCR原始数据
    const parsedFields = extractFieldsFromOCR(ocrResult.raw_ocr_data, logger)
    
    // 数据标准化
    const normalizedFields = normalizeInvoiceFields(parsedFields, logger)
    
    // 计算字段置信度
    const fieldConfidences = calculateFieldConfidences(ocrResult.raw_ocr_data, normalizedFields, logger)
    
    const endTime = performance.now()
    
    return {
      invoice_type: ocrResult.invoice_type,
      fields: normalizedFields,
      field_confidences: fieldConfidences,
      extraction_metadata: {
        total_fields: Object.keys(normalizedFields).length,
        processing_time: endTime - startTime,
        confidence_average: Object.values(fieldConfidences).reduce((a, b) => a + b, 0) / Object.keys(fieldConfidences).length
      },
      validation_ready: true,
      raw_extraction: parsedFields
    }
    
  } catch (error) {
    logger?.error('数据解析失败', { error: error.message })
    throw createError(
      ErrorCode.PROCESSING_ERROR,
      `数据解析失败: ${error.message}`,
      { original_error: error }
    )
  }
}

/**
 * 从OCR结果中提取字段
 */
function extractFieldsFromOCR(rawOcrData: any, logger?: any): Record<string, any> {
  const fields: Record<string, any> = {}
  
  try {
    // 解析阿里云OCR响应格式
    const dataStr = rawOcrData?.Data || ''
    if (!dataStr) {
      logger?.warn('OCR原始数据为空')
      return fields
    }
    
    const data = JSON.parse(dataStr)
    const subMsgs = data?.subMsgs || []
    
    if (subMsgs.length === 0) {
      logger?.warn('OCR响应中没有subMsgs')
      return fields
    }
    
    const firstMsg = subMsgs[0]
    const result = firstMsg?.result || {}
    const prismInfo = result?.prism_keyValueInfo || []
    
    // 字段映射配置
    const fieldMapping: Record<string, string> = {
      '发票号码': 'invoice_number',
      '发票代码': 'invoice_code', 
      '开票日期': 'invoice_date',
      '销售方名称': 'seller_name',
      '销售方纳税人识别号': 'seller_tax_number',
      '购买方名称': 'buyer_name',
      '购买方纳税人识别号': 'buyer_tax_number',
      '价税合计(小写)': 'total_amount',
      '价税合计(大写)': 'total_amount_chinese',
      '金额': 'amount',
      '税额': 'tax_amount',
      '税率': 'tax_rate',
      '商品名称': 'goods_name',
      '规格型号': 'specification',
      '单位': 'unit',
      '数量': 'quantity',
      '单价': 'unit_price'
    }
    
    // 提取字段值
    for (const field of prismInfo) {
      const key = field.key || ''
      const value = field.value || ''
      const confidence = field.valueProb || 0
      
      if (key && value) {
        const standardKey = fieldMapping[key] || key
        fields[standardKey] = {
          value: value,
          confidence: confidence / 100,
          original_key: key
        }
      }
    }
    
    logger?.debug('字段提取结果', { 
      extracted_count: Object.keys(fields).length,
      field_keys: Object.keys(fields)
    })
    
  } catch (error) {
    logger?.error('OCR数据解析错误', { error: error.message })
  }
  
  return fields
}

/**
 * 标准化发票字段
 */
function normalizeInvoiceFields(rawFields: Record<string, any>, logger?: any): Record<string, any> {
  const normalized: Record<string, any> = {}
  
  for (const [key, fieldData] of Object.entries(rawFields)) {
    let value = fieldData.value || fieldData
    
    try {
      // 根据字段类型进行标准化
      switch (key) {
        case 'invoice_date':
          value = normalizeDate(value)
          break
          
        case 'total_amount':
        case 'amount':
        case 'tax_amount':
        case 'unit_price':
          value = normalizeAmount(value)
          break
          
        case 'quantity':
          value = normalizeQuantity(value)
          break
          
        case 'tax_rate':
          value = normalizeTaxRate(value)
          break
          
        default:
          value = normalizeText(value)
          break
      }
      
      normalized[key] = value
      
    } catch (error) {
      logger?.warn(`字段 ${key} 标准化失败`, { value, error: error.message })
      normalized[key] = value // 保留原值
    }
  }
  
  return normalized
}

/**
 * 日期标准化 - 统一为 YYYY-MM-DD 格式
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return ''
  
  // 移除多余字符
  const cleaned = dateStr.replace(/[年月日]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '')
  
  try {
    const date = new Date(cleaned)
    if (isNaN(date.getTime())) {
      return dateStr // 无法解析时返回原值
    }
    return date.toISOString().split('T')[0]
  } catch {
    return dateStr
  }
}

/**
 * 金额标准化 - 提取数字并格式化
 */
function normalizeAmount(amountStr: string): number {
  if (!amountStr) return 0
  
  // 移除非数字字符（保留小数点）
  const cleaned = amountStr.replace(/[^\d.]/g, '')
  const amount = parseFloat(cleaned)
  
  return isNaN(amount) ? 0 : Math.round(amount * 100) / 100 // 保留两位小数
}

/**
 * 数量标准化
 */
function normalizeQuantity(quantityStr: string): number {
  if (!quantityStr) return 0
  
  const cleaned = quantityStr.replace(/[^\d.]/g, '')
  const quantity = parseFloat(cleaned)
  
  return isNaN(quantity) ? 0 : quantity
}

/**
 * 税率标准化
 */
function normalizeTaxRate(taxRateStr: string): number {
  if (!taxRateStr) return 0
  
  const cleaned = taxRateStr.replace(/[%％]/g, '').replace(/[^\d.]/g, '')
  const rate = parseFloat(cleaned)
  
  return isNaN(rate) ? 0 : rate
}

/**
 * 文本标准化
 */
function normalizeText(text: string): string {
  if (!text) return ''
  
  return text.trim()
    .replace(/\s+/g, ' ') // 合并多余空格
    .replace(/[""]/g, '"') // 统一引号
    .replace(/['']/g, "'") // 统一单引号
}

/**
 * 计算字段置信度
 */
function calculateFieldConfidences(
  rawOcrData: any, 
  normalizedFields: Record<string, any>, 
  logger?: any
): Record<string, number> {
  const confidences: Record<string, number> = {}
  
  try {
    const dataStr = rawOcrData?.Data || ''
    if (!dataStr) return confidences
    
    const data = JSON.parse(dataStr)
    const subMsgs = data?.subMsgs || []
    
    if (subMsgs.length === 0) return confidences
    
    const firstMsg = subMsgs[0]
    const result = firstMsg?.result || {}
    const prismInfo = result?.prism_keyValueInfo || []
    
    // 为每个标准化字段分配置信度
    for (const key of Object.keys(normalizedFields)) {
      // 查找对应的原始字段
      const matchingField = prismInfo.find((field: any) => {
        const originalKey = field.key || ''
        return originalKey.includes(key) || key.includes(originalKey)
      })
      
      if (matchingField) {
        confidences[key] = (matchingField.valueProb || 0) / 100
      } else {
        confidences[key] = 0.5 // 默认置信度
      }
    }
    
  } catch (error) {
    logger?.error('置信度计算失败', { error: error.message })
  }
  
  return confidences
}