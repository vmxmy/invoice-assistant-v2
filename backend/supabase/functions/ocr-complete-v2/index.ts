/**
 * OCR完整处理流程 Edge Function V2
 * 基于 alicloud-ocr-binary 的实现，提供完整的发票OCR处理
 * 替代原有的 /api/v1/ocr/combined/full 接口
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS处理
function corsHeaders() {
  return new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, x-user-id, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  })
}

serve(async (req: Request) => {
  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders()
    })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Only POST method allowed' }),
        { status: 405, headers: corsHeaders() }
      )
    }

    console.log('🚀 开始OCR完整处理流程V2')
    const startTime = performance.now()

    // 解析multipart/form-data
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided in form data' }),
        { status: 400, headers: corsHeaders() }
      )
    }

    console.log('📁 文件信息:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // 步骤1: 文件验证
    const validationResult = validateFile(file)
    if (!validationResult.valid) {
      return new Response(
        JSON.stringify({
          error: `文件验证失败: ${validationResult.errors.join(', ')}`,
          success: false
        }),
        { status: 400, headers: corsHeaders() }
      )
    }

    // 步骤2: 调用阿里云OCR API
    const ocrStartTime = performance.now()
    const ocrResult = await callAliyunOCR(file)
    const ocrTime = performance.now() - ocrStartTime

    console.log('🔍 OCR识别完成:', {
      hasData: !!ocrResult.Data,
      processingTime: ocrTime
    })

    // 步骤3: 解析OCR结果
    const parseStartTime = performance.now() 
    const parsedData = parseOCRResponse(ocrResult)
    const parseTime = performance.now() - parseStartTime

    // 步骤4: 字段验证
    const validationStartTime = performance.now()
    const fieldValidation = validateInvoiceFields(parsedData.fields)
    const validationTime = performance.now() - validationStartTime

    const totalTime = performance.now() - startTime

    // 组装最终响应
    const response = {
      success: fieldValidation.is_valid,
      invoice_type: parsedData.invoice_type,
      fields: parsedData.fields,
      confidence: parsedData.confidence,
      validation: fieldValidation,
      raw_ocr_data: ocrResult,
      processing_steps: [
        '文件验证: 通过',
        `OCR识别: ${parsedData.invoice_type}`,
        `数据解析: 完成 (${Object.keys(parsedData.fields).length}个字段)`,
        `字段验证: ${fieldValidation.is_valid ? '通过' : '有问题'}`
      ],
      metadata: {
        total_processing_time: totalTime,
        step_timings: {
          file_validation: validationResult.processingTime || 0,
          ocr_recognition: ocrTime,
          data_parsing: parseTime,
          field_validation: validationTime
        },
        timestamp: new Date().toISOString()
      }
    }

    console.log('✅ OCR完整处理流程V2完成:', {
      success: response.success,
      invoice_type: response.invoice_type,
      fieldCount: Object.keys(response.fields).length,
      totalTime: totalTime
    })

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('❌ OCR处理失败:', error)
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false,
        processing_steps: ['处理失败'],
        metadata: {
          total_processing_time: 0,
          step_timings: {},
          timestamp: new Date().toISOString()
        }
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/json'
        }
      }
    )
  }
})

/**
 * 文件验证
 */
function validateFile(file: File): { valid: boolean; errors: string[]; processingTime?: number } {
  const startTime = performance.now()
  const errors: string[] = []

  // 文件大小检查 (10MB限制)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('文件大小超过10MB限制')
  }

  // 文件类型检查
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ]
  
  if (!allowedTypes.includes(file.type)) {
    errors.push(`不支持的文件类型: ${file.type}`)
  }

  // 文件名检查
  if (!file.name || file.name.length === 0) {
    errors.push('文件名不能为空')
  }

  const processingTime = performance.now() - startTime

  return {
    valid: errors.length === 0,
    errors,
    processingTime
  }
}

/**
 * 调用阿里云OCR API
 * 基于环境变量直接调用，或通过后端代理
 */
async function callAliyunOCR(file: File): Promise<any> {
  const accessKeyId = Deno.env.get('ALICLOUD_ACCESS_KEY_ID')
  const accessKeySecret = Deno.env.get('ALICLOUD_ACCESS_KEY_SECRET')
  const region = Deno.env.get('ALICLOUD_OCR_REGION') || 'cn-hangzhou'

  // 如果有阿里云凭证，尝试直接调用
  if (accessKeyId && accessKeySecret) {
    try {
      return await callAliyunOCRDirectly(file, {
        accessKeyId,
        accessKeySecret,
        region
      })
    } catch (error) {
      console.warn('⚠️ 直接调用阿里云OCR失败，尝试后端代理:', error.message)
      // 继续尝试后端代理
    }
  }

  // 通过后端代理调用
  return await callAliyunOCRViaBackend(file)
}

/**
 * 直接调用阿里云OCR API
 */
async function callAliyunOCRDirectly(file: File, config: any): Promise<any> {
  const fileBuffer = await file.arrayBuffer()
  const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)))

  // 阿里云OCR API请求
  const endpoint = `https://ocr-api.${config.region}.aliyuncs.com`
  
  // 构建请求参数 - 使用增值税发票识别API
  const requestData = {
    body: base64Data
  }

  // 这里需要实现阿里云的签名算法，比较复杂
  // 为了简化，我们直接通过后端代理
  throw new Error('Direct Aliyun OCR call not implemented, using backend proxy')
}

/**
 * 通过后端代理调用阿里云OCR
 */
async function callAliyunOCRViaBackend(file: File): Promise<any> {
  const backendUrl = Deno.env.get('BACKEND_URL') || 'http://localhost:8090'
  
  const formData = new FormData()
  formData.append('file', file)

  console.log('📡 通过后端代理调用阿里云OCR...')

  const response = await fetch(`${backendUrl}/api/v1/ocr/recognize`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ 后端OCR API调用失败:', response.status, errorText)
    throw new Error(`后端OCR API调用失败: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  console.log('✅ 后端OCR API调用成功')
  
  return result
}

/**
 * 解析OCR响应结果
 */
function parseOCRResponse(ocrResult: any): {
  invoice_type: string
  fields: Record<string, any>
  confidence: { overall: number; fields: Record<string, number> }
} {
  try {
    // 解析阿里云OCR响应格式
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
      'HotelReceipt': '酒店账单',
      'GeneralInvoice': '普通发票'
    }
    const invoiceType = typeMapping[ocrType] || ocrType || '增值税发票'

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
      '单价': 'unit_price',
      // 交通票据专用字段
      '出发站': 'departure_station',
      '到达站': 'arrival_station', 
      '车次': 'train_number',
      '航班号': 'flight_number',
      '座位类型': 'seat_type',
      '出发时间': 'departure_time',
      '消费日期': 'consumption_date'
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
        const standardKey = fieldMapping[key] || key.toLowerCase().replace(/\s+/g, '_')

        // 数据类型转换和标准化
        let processedValue = value
        
        // 金额字段转换为数字
        if (['total_amount', 'amount', 'tax_amount', 'unit_price'].includes(standardKey)) {
          const numericValue = parseFloat(value.replace(/[^\\d.]/g, ''))
          processedValue = isNaN(numericValue) ? 0 : numericValue
        }
        // 日期字段标准化
        else if (standardKey === 'invoice_date' || standardKey === 'consumption_date') {
          processedValue = normalizeDate(value)
        }
        // 数量字段转换为数字
        else if (standardKey === 'quantity') {
          const numericValue = parseFloat(value.replace(/[^\\d.]/g, ''))
          processedValue = isNaN(numericValue) ? 1 : numericValue
        }
        // 税率字段转换为数字（百分比）
        else if (standardKey === 'tax_rate') {
          const numericValue = parseFloat(value.replace(/[%％]/g, ''))
          processedValue = isNaN(numericValue) ? 0 : numericValue
        }
        // 文本字段清理
        else {
          processedValue = value.trim()
        }

        fields[standardKey] = processedValue
        fieldConfidences[standardKey] = confidence

        totalConfidence += confidence
        confidenceCount++
      }
    }

    // 特殊处理：从商品明细中提取invoice_details
    if (result?.prism_invoiceDetailsList && result.prism_invoiceDetailsList.length > 0) {
      const invoiceDetails = result.prism_invoiceDetailsList.map((item: any) => ({
        goods_name: item.goodsName || '',
        specification: item.specification || '',
        unit: item.unit || '',
        quantity: parseFloat(item.quantity || '0'),
        unit_price: parseFloat(item.unitPrice || '0'),
        amount: parseFloat(item.amount || '0')
      }))
      fields['invoice_details'] = invoiceDetails
    }

    const overallConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0.8

    console.log('📊 OCR数据解析完成:', {
      invoice_type: invoiceType,
      field_count: Object.keys(fields).length,
      overall_confidence: overallConfidence,
      has_details: !!fields['invoice_details']
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
    console.error('❌ OCR结果解析失败:', error)
    throw new Error(`OCR结果解析失败: ${error.message}`)
  }
}

/**
 * 验证发票字段
 */
function validateInvoiceFields(fields: Record<string, any>): {
  is_valid: boolean
  field_results: Record<string, any>
  overall_errors: string[]
  overall_warnings: string[]
  completeness_score: number
} {
  const errors: string[] = []
  const warnings: string[] = []
  const fieldResults: Record<string, any> = {}

  // 必填字段检查 - 根据发票类型调整
  let requiredFields: string[]
  
  if (invoiceType === '火车票') {
    // 火车票不需要seller_name（统一为"中国铁路"）
    requiredFields = ['invoice_number', 'invoice_date', 'total_amount']
  } else {
    // 其他发票类型需要seller_name
    requiredFields = ['invoice_number', 'invoice_date', 'seller_name', 'total_amount']
  }
  
  const missingFields = requiredFields.filter(field => !fields[field] || fields[field] === '')

  if (missingFields.length > 0) {
    errors.push(`缺少必填字段: ${missingFields.join(', ')}`)
  }

  // 字段格式验证
  const invoiceNumber = fields.invoice_number
  if (invoiceNumber && typeof invoiceNumber === 'string' && !/^[0-9]{8,20}$/.test(invoiceNumber)) {
    warnings.push('发票号码格式可能不正确')
  }

  const totalAmount = fields.total_amount
  if (totalAmount !== undefined && (typeof totalAmount !== 'number' || totalAmount <= 0)) {
    errors.push('发票金额必须为正数')
  }

  // 日期格式验证
  const invoiceDate = fields.invoice_date
  if (invoiceDate && typeof invoiceDate === 'string' && !/^\\d{4}-\\d{2}-\\d{2}$/.test(invoiceDate)) {
    warnings.push('发票日期格式可能不正确')
  }

  // 计算完整性评分
  const expectedFields = [
    'invoice_number', 'invoice_code', 'invoice_date', 'seller_name',
    'buyer_name', 'total_amount', 'amount', 'tax_amount', 'tax_rate', 'goods_name'
  ]
  const actualFieldsCount = expectedFields.filter(field => fields[field] && fields[field] !== '').length
  const completenessScore = Math.round((actualFieldsCount / expectedFields.length) * 100)

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
  let cleaned = dateStr.replace(/[年月日]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '')

  // 处理其他可能的分隔符
  cleaned = cleaned.replace(/[/\\.]/g, '-')

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