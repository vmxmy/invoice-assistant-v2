/**
 * 字段验证 Edge Function
 * 独立模块：验证解析后的发票字段数据
 * 可复用于：数据质量检查、业务规则验证等场景
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import type { 
  FieldValidationResult, 
  ParsedInvoiceData, 
  EdgeFunctionContext 
} from "../_shared/types/index.ts"
import { 
  createLogger, 
  createErrorHandler, 
  ErrorCode, 
  createError 
} from "../_shared/utils/index.ts"

// 验证规则配置
interface ValidationRule {
  required?: boolean
  format?: RegExp
  min_length?: number
  max_length?: number
  min_value?: number
  max_value?: number
  custom_validator?: (value: any) => { valid: boolean, message?: string }
}

serve(async (req: Request) => {
  const context: EdgeFunctionContext = {
    request_id: crypto.randomUUID(),
    config: { log_level: 'info' }
  }
  
  const logger = createLogger('field-validator', context)
  const errorHandler = createErrorHandler('field-validator', context)

  return errorHandler.executeWithErrorHandling(async () => {
    if (req.method !== 'POST') {
      throw createError(ErrorCode.VALIDATION_ERROR, 'Only POST method allowed')
    }

    const body = await req.json()
    
    if (!body.parsed_data) {
      throw createError(ErrorCode.VALIDATION_ERROR, 'Missing parsed_data in request body')
    }

    logger.info('开始字段验证', { 
      invoice_type: body.parsed_data.invoice_type,
      field_count: Object.keys(body.parsed_data.fields || {}).length
    })

    const result = await validateInvoiceFields(body.parsed_data, context, logger)
    
    logger.info('字段验证完成', {
      is_valid: result.is_valid,
      error_count: result.overall_errors.length,
      warning_count: result.overall_warnings.length,
      completeness_score: result.completeness_score
    })

    return result
  })
})

/**
 * 发票字段验证核心逻辑（可导出复用）
 */
export async function validateInvoiceFields(
  parsedData: ParsedInvoiceData,
  context: EdgeFunctionContext,
  logger?: any
): Promise<FieldValidationResult> {
  const startTime = performance.now()
  
  try {
    const fields = parsedData.fields || {}
    const invoiceType = parsedData.invoice_type || '未知类型'
    
    // 获取验证规则
    const validationRules = getValidationRules(invoiceType)
    
    // 执行字段验证
    const fieldResults = await validateFields(fields, validationRules, logger)
    
    // 执行业务规则验证
    const businessValidation = await validateBusinessRules(fields, invoiceType, logger)
    
    // 计算完整性评分
    const completenessScore = calculateCompletenessScore(fields, validationRules, fieldResults)
    
    // 汇总验证结果
    const overallErrors: string[] = []
    const overallWarnings: string[] = []
    let isValid = true
    
    // 收集字段级别的错误和警告
    for (const [fieldName, fieldResult] of Object.entries(fieldResults)) {
      if (fieldResult.errors && fieldResult.errors.length > 0) {
        overallErrors.push(...fieldResult.errors.map(err => `${fieldName}: ${err}`))
        isValid = false
      }
      if (fieldResult.warnings && fieldResult.warnings.length > 0) {
        overallWarnings.push(...fieldResult.warnings.map(warn => `${fieldName}: ${warn}`))
      }
    }
    
    // 添加业务规则验证结果
    overallErrors.push(...businessValidation.errors)
    overallWarnings.push(...businessValidation.warnings)
    
    if (businessValidation.errors.length > 0) {
      isValid = false
    }
    
    const endTime = performance.now()
    
    logger?.debug('验证结果汇总', {
      is_valid: isValid,
      completeness_score: completenessScore,
      processing_time: endTime - startTime
    })
    
    return {
      is_valid: isValid,
      field_results: fieldResults,
      overall_errors: overallErrors,
      overall_warnings: overallWarnings,
      completeness_score: completenessScore,
      validation_metadata: {
        processing_time: endTime - startTime,
        rules_applied: Object.keys(validationRules).length,
        timestamp: new Date().toISOString()
      }
    }
    
  } catch (error) {
    logger?.error('字段验证失败', { error: error.message })
    throw createError(
      ErrorCode.PROCESSING_ERROR,
      `字段验证失败: ${error.message}`,
      { original_error: error }
    )
  }
}

/**
 * 获取验证规则配置
 */
function getValidationRules(invoiceType: string): Record<string, ValidationRule> {
  const baseRules: Record<string, ValidationRule> = {
    invoice_number: {
      required: true,
      min_length: 8,
      max_length: 20,
      format: /^[0-9]+$/
    },
    invoice_code: {
      required: true,
      min_length: 10,
      max_length: 12,
      format: /^[0-9]+$/
    },
    invoice_date: {
      required: true,
      format: /^\d{4}-\d{2}-\d{2}$/,
      custom_validator: validateDate
    },
    seller_name: {
      required: true,
      min_length: 2,
      max_length: 100
    },
    buyer_name: {
      required: false,
      max_length: 100
    },
    total_amount: {
      required: true,
      min_value: 0,
      max_value: 999999999.99,
      custom_validator: validateAmount
    },
    tax_rate: {
      required: false,
      min_value: 0,
      max_value: 100,
      custom_validator: validateTaxRate
    }
  }
  
  // 根据发票类型调整规则
  switch (invoiceType) {
    case '增值税发票':
      return {
        ...baseRules,
        seller_tax_number: {
          required: true,
          format: /^[0-9A-Z]{15,20}$/
        },
        tax_amount: {
          required: true,
          min_value: 0
        }
      }
      
    case '火车票':
      return {
        ...baseRules,
        // 火车票不包含seller_name字段，统一为"中国铁路"，在前端处理 
        seller_name: { required: false },
        // 火车票的发票代码对应电子客票号，不是必填项
        invoice_code: { required: false },
        departure_station: { required: true },
        arrival_station: { required: true },
        seat_type: { required: false }
      }
      
    case '机票':
      return {
        ...baseRules,
        flight_number: { required: true },
        departure_airport: { required: true },
        arrival_airport: { required: true }
      }
      
    default:
      return baseRules
  }
}

/**
 * 验证字段
 */
async function validateFields(
  fields: Record<string, any>, 
  rules: Record<string, ValidationRule>,
  logger?: any
): Promise<Record<string, any>> {
  const results: Record<string, any> = {}
  
  for (const [fieldName, rule] of Object.entries(rules)) {
    const fieldValue = fields[fieldName]
    const fieldResult = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      value: fieldValue
    }
    
    // 检查必填字段
    if (rule.required && (!fieldValue || fieldValue === '')) {
      fieldResult.valid = false
      fieldResult.errors.push('字段为必填项')
    }
    
    // 如果字段有值，进行进一步验证
    if (fieldValue && fieldValue !== '') {
      const value = typeof fieldValue === 'string' ? fieldValue : String(fieldValue)
      
      // 长度验证
      if (rule.min_length && value.length < rule.min_length) {
        fieldResult.valid = false
        fieldResult.errors.push(`长度不能少于${rule.min_length}个字符`)
      }
      
      if (rule.max_length && value.length > rule.max_length) {
        fieldResult.valid = false
        fieldResult.errors.push(`长度不能超过${rule.max_length}个字符`)
      }
      
      // 格式验证
      if (rule.format && !rule.format.test(value)) {
        fieldResult.valid = false
        fieldResult.errors.push('格式不正确')
      }
      
      // 数值验证
      if (typeof fieldValue === 'number') {
        if (rule.min_value !== undefined && fieldValue < rule.min_value) {
          fieldResult.valid = false
          fieldResult.errors.push(`值不能小于${rule.min_value}`)
        }
        
        if (rule.max_value !== undefined && fieldValue > rule.max_value) {
          fieldResult.valid = false
          fieldResult.errors.push(`值不能大于${rule.max_value}`)
        }
      }
      
      // 自定义验证器
      if (rule.custom_validator) {
        try {
          const customResult = rule.custom_validator(fieldValue)
          if (!customResult.valid) {
            fieldResult.valid = false
            fieldResult.errors.push(customResult.message || '自定义验证失败')
          }
        } catch (error) {
          logger?.warn(`字段 ${fieldName} 自定义验证器执行失败`, { error: error.message })
        }
      }
    }
    
    results[fieldName] = fieldResult
  }
  
  return results
}

/**
 * 业务规则验证
 */
async function validateBusinessRules(
  fields: Record<string, any>, 
  invoiceType: string,
  logger?: any
): Promise<{ errors: string[], warnings: string[] }> {
  const errors: string[] = []
  const warnings: string[] = []
  
  try {
    // 金额一致性检查
    const totalAmount = fields.total_amount || 0
    const amount = fields.amount || 0
    const taxAmount = fields.tax_amount || 0
    
    if (totalAmount > 0 && amount > 0 && taxAmount >= 0) {
      const calculatedTotal = amount + taxAmount
      const tolerance = 0.01 // 1分钱的容差
      
      if (Math.abs(totalAmount - calculatedTotal) > tolerance) {
        warnings.push(`金额合计(${totalAmount})与金额+税额(${calculatedTotal})不匹配`)
      }
    }
    
    // 日期合理性检查
    const invoiceDate = fields.invoice_date
    if (invoiceDate) {
      const date = new Date(invoiceDate)
      const now = new Date()
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
      
      if (date < oneYearAgo) {
        warnings.push('发票日期超过一年前，请检查是否正确')
      }
      
      if (date > oneMonthLater) {
        errors.push('发票日期不能超过当前日期一个月')
      }
    }
    
    // 税率合理性检查
    const taxRate = fields.tax_rate
    if (taxRate !== undefined && taxRate !== null) {
      const commonTaxRates = [0, 3, 5, 6, 9, 13, 16, 17]
      if (!commonTaxRates.includes(taxRate)) {
        warnings.push(`税率${taxRate}%不常见，请检查是否正确`)
      }
    }
    
    // 发票类型特定的业务规则
    switch (invoiceType) {
      case '增值税发票':
        if (!fields.seller_tax_number) {
          errors.push('增值税发票必须包含销售方纳税人识别号')
        }
        break
        
      case '火车票':
        if (fields.total_amount && fields.total_amount > 1000) {
          warnings.push('火车票金额超过1000元，请确认是否正确')
        }
        break
        
      case '机票':
        if (fields.total_amount && fields.total_amount > 10000) {
          warnings.push('机票金额超过10000元，请确认是否为头等舱或商务舱')
        }
        break
    }
    
  } catch (error) {
    logger?.error('业务规则验证失败', { error: error.message })
    warnings.push('部分业务规则验证失败')
  }
  
  return { errors, warnings }
}

/**
 * 计算完整性评分
 */
function calculateCompletenessScore(
  fields: Record<string, any>,
  rules: Record<string, ValidationRule>,
  fieldResults: Record<string, any>
): number {
  const totalFields = Object.keys(rules).length
  let validFields = 0
  let requiredFields = 0
  let validRequiredFields = 0
  
  for (const [fieldName, rule] of Object.entries(rules)) {
    const fieldResult = fieldResults[fieldName]
    const hasValue = fields[fieldName] && fields[fieldName] !== ''
    
    if (rule.required) {
      requiredFields++
      if (hasValue && fieldResult?.valid) {
        validRequiredFields++
      }
    }
    
    if (hasValue && fieldResult?.valid) {
      validFields++
    }
  }
  
  // 权重：必填字段占70%，所有字段占30%
  const requiredScore = requiredFields > 0 ? (validRequiredFields / requiredFields) * 70 : 70
  const overallScore = totalFields > 0 ? (validFields / totalFields) * 30 : 30
  
  return Math.round(requiredScore + overallScore)
}

// 自定义验证器函数

function validateDate(dateStr: string): { valid: boolean, message?: string } {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return { valid: false, message: '日期格式无效' }
    }
    return { valid: true }
  } catch {
    return { valid: false, message: '日期解析失败' }
  }
}

function validateAmount(amount: number): { valid: boolean, message?: string } {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, message: '金额必须为数字' }
  }
  
  if (amount < 0) {
    return { valid: false, message: '金额不能为负数' }
  }
  
  // 检查小数位数
  const decimalPlaces = (amount.toString().split('.')[1] || '').length
  if (decimalPlaces > 2) {
    return { valid: false, message: '金额最多保留两位小数' }
  }
  
  return { valid: true }
}

function validateTaxRate(rate: number): { valid: boolean, message?: string } {
  if (typeof rate !== 'number' || isNaN(rate)) {
    return { valid: false, message: '税率必须为数字' }
  }
  
  if (rate < 0 || rate > 100) {
    return { valid: false, message: '税率必须在0-100之间' }
  }
  
  return { valid: true }
}