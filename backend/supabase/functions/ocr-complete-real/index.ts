/**
 * OCR完整处理流程 Edge Function (真实OCR版本)
 * 调用真实的阿里云OCR API进行发票识别和处理
 * 替代原有的 /api/v1/ocr/combined/full 接口
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// 简化的CORS处理
function createCORSResponse(data: any, status = 200): Response {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, x-user-id, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  })

  return new Response(JSON.stringify(data), {
    status,
    headers
  })
}

serve(async (req: Request) => {
  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: new Headers({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, x-user-id, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      })
    })
  }

  try {
    // 只支持 POST 请求
    if (req.method !== 'POST') {
      return createCORSResponse({ error: 'Only POST method allowed' }, 405)
    }

    console.log('开始真实OCR完整处理流程')
    const startTime = performance.now()
    
    // 获取上传的文件
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return createCORSResponse({ error: 'Unsupported content type. Use multipart/form-data' }, 400)
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return createCORSResponse({ error: 'No file provided in form data' }, 400)
    }
    
    console.log('提取FormData文件', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type 
    })

    // 步骤1: 文件验证
    const validationStartTime = performance.now()
    const fileValidation = await validateFile(file)
    const validationTime = performance.now() - validationStartTime

    if (!fileValidation.valid) {
      return createCORSResponse({
        error: `文件验证失败: ${fileValidation.errors.join(', ')}`,
        success: false
      }, 400)
    }

    // 步骤2: 调用真实的阿里云OCR
    const ocrStartTime = performance.now()
    const ocrResult = await callRealAliyunOCR(file)
    const ocrTime = performance.now() - ocrStartTime

    // 步骤3: 数据解析
    const parseStartTime = performance.now()
    const parsedData = await parseOCRResult(ocrResult, file.name)
    const parseTime = performance.now() - parseStartTime

    // 步骤4: 字段验证
    const fieldValidationStartTime = performance.now()
    const fieldValidation = await validateFields(parsedData)
    const fieldValidationTime = performance.now() - fieldValidationStartTime

    const totalTime = performance.now() - startTime

    // 组装完整响应
    const response = {
      success: fieldValidation.is_valid,
      invoice_type: parsedData.invoice_type,
      fields: parsedData.fields,
      confidence: parsedData.confidence,
      validation: fieldValidation,
      raw_ocr_data: ocrResult,
      processing_steps: [
        `文件验证: ${fileValidation.valid ? '通过' : '失败'}`,
        `OCR识别: ${parsedData.invoice_type}`,
        `数据解析: 完成 (${Object.keys(parsedData.fields).length}个字段)`,
        `字段验证: ${fieldValidation.is_valid ? '通过' : '有问题'}`
      ],
      metadata: {
        total_processing_time: totalTime,
        step_timings: {
          file_validation: validationTime,
          ocr_recognition: ocrTime,
          data_parsing: parseTime,
          field_validation: fieldValidationTime
        },
        timestamp: new Date().toISOString()
      }
    }

    console.log('真实OCR完整处理流程完成', {
      success: response.success,
      invoice_type: response.invoice_type,
      field_count: Object.keys(response.fields).length,
      total_time: totalTime
    })

    return createCORSResponse(response, 200)

  } catch (error) {
    console.error('OCR处理失败:', error)
    
    return createCORSResponse({
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false,
      processing_steps: ['处理失败'],
      metadata: {
        total_processing_time: 0,
        step_timings: {},
        timestamp: new Date().toISOString()
      }
    }, 500)
  }
})

/**
 * 文件验证
 */
async function validateFile(file: File): Promise<{valid: boolean, errors: string[]}> {
  const errors: string[] = []
  
  // 检查文件大小 (10MB 限制)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('文件大小超过10MB限制')
  }
  
  // 检查文件类型
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    errors.push(`不支持的文件类型: ${file.type}`)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 调用真实的阿里云OCR API
 */
async function callRealAliyunOCR(file: File): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://sfenhhtvcyslxplvewmt.supabase.co'
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
  
  // 准备调用现有的 alicloud-ocr-binary 函数
  const formData = new FormData()
  formData.append('file', file)
  
  console.log('调用真实阿里云OCR函数...')
  
  const response = await fetch(`${supabaseUrl}/functions/v1/alicloud-ocr-binary`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: formData
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('阿里云OCR调用失败:', response.status, errorText)
    throw new Error(`阿里云OCR调用失败: ${response.status} ${errorText}`)
  }
  
  const result = await response.json()
  console.log('阿里云OCR调用成功', { hasData: !!result.Data })
  
  return result
}

/**
 * 解析OCR结果
 */
async function parseOCRResult(ocrResult: any, fileName: string): Promise<{
  invoice_type: string,
  fields: Record<string, any>, 
  confidence: { overall: number, fields: Record<string, number> }
}> {
  try {
    const dataStr = ocrResult?.Data || ''
    if (!dataStr) {
      throw new Error('OCR响应中没有Data字段')
    }
    
    const data = JSON.parse(dataStr)
    const subMsgs = data?.subMsgs || []
    
    if (subMsgs.length === 0) {
      throw new Error('OCR响应中没有subMsgs')
    }
    
    const firstMsg = subMsgs[0]
    const result = firstMsg?.result || {}
    const prismInfo = result?.prism_keyValueInfo || []
    
    // 发票类型识别
    const ocrType = firstMsg?.type || ''
    const typeMapping: Record<string, string> = {
      'VATInvoice': '增值税发票',
      'TrainTicket': '火车票',
      'FlightTicket': '机票',
      'TaxiTicket': '出租车票',
      'BusTicket': '客运车票',
      'HotelReceipt': '酒店账单'
    }
    const invoiceType = typeMapping[ocrType] || ocrType || '增值税发票'
    
    // 字段映射和提取
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
    
    const fields: Record<string, any> = {}
    const fieldConfidences: Record<string, number> = {}
    let totalConfidence = 0
    let confidenceCount = 0
    
    // 提取字段值和置信度
    for (const field of prismInfo) {
      const key = field.key || ''
      const value = field.value || ''
      const confidence = (field.valueProb || 0) / 100
      
      if (key && value) {
        const standardKey = fieldMapping[key] || key
        
        // 数据类型转换
        let processedValue = value
        if (['total_amount', 'amount', 'tax_amount', 'unit_price'].includes(standardKey)) {
          const numericValue = parseFloat(value.replace(/[^\\d.]/g, ''))
          processedValue = isNaN(numericValue) ? 0 : numericValue
        } else if (standardKey === 'invoice_date') {
          // 日期格式标准化
          processedValue = normalizeDate(value)
        }
        
        fields[standardKey] = processedValue
        fieldConfidences[standardKey] = confidence
        
        totalConfidence += confidence
        confidenceCount++
      }
    }
    
    const overallConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0.8
    
    console.log('OCR数据解析完成', {
      invoice_type: invoiceType,
      field_count: Object.keys(fields).length,
      overall_confidence: overallConfidence
    })
    
    return {
      invoice_type: invoiceType,
      fields,
      confidence: {
        overall: overallConfidence,
        fields: fieldConfidences
      }
    }
    
  } catch (error) {
    console.error('OCR结果解析失败:', error)
    throw new Error(`OCR结果解析失败: ${error.message}`)
  }
}

/**
 * 字段验证
 */
async function validateFields(parsedData: any): Promise<{
  is_valid: boolean,
  field_results: Record<string, any>,
  overall_errors: string[],
  overall_warnings: string[],
  completeness_score: number
}> {
  const errors: string[] = []
  const warnings: string[] = []
  const fieldResults: Record<string, any> = {}
  
  // 必填字段检查 - 根据发票类型调整
  let requiredFields: string[]
  
  if (parsedData.invoice_type === '火车票') {
    // 火车票不需要seller_name（统一为"中国铁路"）和invoice_code
    requiredFields = ['invoice_number', 'invoice_date', 'total_amount']
  } else {
    // 其他发票类型需要seller_name
    requiredFields = ['invoice_number', 'invoice_code', 'invoice_date', 'seller_name', 'total_amount']
  }
  
  const missingFields = requiredFields.filter(field => !parsedData.fields[field])
  
  if (missingFields.length > 0) {
    errors.push(`缺少必填字段: ${missingFields.join(', ')}`)
  }
  
  // 字段格式验证
  const invoiceNumber = parsedData.fields.invoice_number
  if (invoiceNumber && !/^[0-9]{8,20}$/.test(invoiceNumber)) {
    warnings.push('发票号码格式可能不正确')
  }
  
  const totalAmount = parsedData.fields.total_amount
  if (totalAmount && (typeof totalAmount !== 'number' || totalAmount <= 0)) {
    errors.push('发票金额必须为正数')
  }
  
  // 计算完整性评分
  const totalExpectedFields = 10
  const actualFields = Object.keys(parsedData.fields).length
  const completenessScore = Math.min(Math.round((actualFields / totalExpectedFields) * 100), 100)
  
  return {
    is_valid: errors.length === 0,
    field_results: fieldResults,
    overall_errors: errors,
    overall_warnings: warnings,
    completeness_score
  }
}

/**
 * 日期格式标准化
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return ''
  
  // 处理中文日期格式 "2025年03月11日"
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