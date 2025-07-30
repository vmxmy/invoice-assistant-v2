/**
 * Edge Function OCR 服务
 * 调用Supabase Edge Functions进行OCR处理
 */

import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

export interface EdgeFunctionOCRResponse {
  success: boolean
  invoice_type: string
  fields: {
    // 通用发票字段（基础14个字段）
    invoice_number?: string
    invoice_code?: string
    invoice_date?: string
    seller_name?: string
    seller_tax_number?: string
    buyer_name?: string
    buyer_tax_number?: string
    total_amount?: number
    tax_amount?: number
    amount_without_tax?: number
    remarks?: string
    
    // 扩展发票字段（完整的OCR字段）
    drawer?: string                   // 开票人
    invoicetype?: string             // 发票类型
    goods_name?: string              // 商品名称
    specification?: string           // 规格型号
    unit?: string                    // 单位
    quantity?: number                // 数量
    unit_price?: number              // 单价
    amount?: number                  // 金额
    tax_rate?: number                // 税率
    total_amount_chinese?: string    // 大写金额
    
    // 发票明细
    invoice_details?: Array<{        // 发票明细列表
      goods_name?: string
      specification?: string
      unit?: string
      quantity?: number
      unit_price?: number
      amount?: number
    }>
    
    // 火车票特有字段
    train_number?: string
    departure_station?: string
    arrival_station?: string
    departure_time?: string
    seat_type?: string
    seat_number?: string
    passenger_name?: string
    passenger_info?: string
    electronic_ticket_number?: string
    
    // 其他字段
    extracted_text?: string  // OCR识别的原始文本（仅普通发票有此字段，火车票没有）
    [key: string]: any
  }
  confidence: {
    overall: number
    fields: Record<string, number>
  }
  validation: {
    is_valid: boolean
    field_results: Record<string, any>
    overall_errors: string[]
    overall_warnings: string[]
    completeness_score: number
  }
  raw_ocr_data: any
  processing_steps: string[]
  metadata: {
    total_processing_time: number
    step_timings: Record<string, number>
    timestamp: string
  }
  // 去重相关字段
  isDuplicate?: boolean
  data?: any
  message?: string
  duplicateInfo?: {
    existingInvoiceId: string
    existingData: any
    uploadCount: number
    message: string
  }
  deletedFileInfo?: {
    canRestore: boolean
    deletedInvoice: any
    message: string
  }
}

export class EdgeFunctionOCRService {
  private supabaseUrl: string
  private supabaseKey: string

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
    this.supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Missing Supabase configuration for Edge Functions')
    }
  }

  /**
   * 完整OCR处理（替代原有的 /api/v1/ocr/combined/full）
   */
  async processOCRComplete(file: File): Promise<EdgeFunctionOCRResponse> {
    logger.log('🔍 [EdgeFunctionOCR] 开始完整OCR处理', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

    const startTime = performance.now()

    try {
      // 获取用户认证token
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      
      if (authError) {
        logger.error('❌ [EdgeFunctionOCR] 获取认证失败:', authError)
        throw new Error('认证失败，请重新登录')
      }

      // 准备FormData
      const formData = new FormData()
      formData.append('file', file)

      // 计算文件哈希（用于去重检查）
      const fileBuffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      // 添加去重信息到FormData
      formData.append('fileHash', fileHash)
      formData.append('fileSize', file.size.toString())
      formData.append('fileName', file.name)
      formData.append('checkDeleted', 'true')  // 启用删除项检查

      // 调用Edge Function (使用OCR去重完整流程)
      logger.log('📡 [EdgeFunctionOCR] 发起Edge Function请求', {
        url: `${this.supabaseUrl}/functions/v1/ocr-dedup-complete`,
        hasToken: !!session?.access_token,
        userId: session?.user?.id,
        fileHash: fileHash.substring(0, 16) + '...',
        fileSize: file.size
      })

      // 创建AbortController用于超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        logger.warn('⏰ [EdgeFunctionOCR] Edge Function请求超时 (30秒)')
      }, 30000) // 30秒超时（OCR处理需要更长时间）

      try {
        const response = await fetch(`${this.supabaseUrl}/functions/v1/ocr-dedup-complete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || this.supabaseKey}`,
            'X-User-ID': session?.user?.id || 'anonymous'
          },
          body: formData,
          signal: controller.signal
        })

        clearTimeout(timeoutId) // 清除超时
        
        logger.log('📨 [EdgeFunctionOCR] Edge Function响应', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('❌ [EdgeFunctionOCR] Edge Function调用失败:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        
        // 如果Edge Function失败，回退到后端API
        logger.warn('🔄 [EdgeFunctionOCR] 回退到后端API处理')
        return await this.fallbackToBackendAPI(file)
      }

      const result = await response.json()
      const endTime = performance.now()

      logger.log('✅ [EdgeFunctionOCR] Edge Function处理完成', {
        success: result.success,
        isDuplicate: result.isDuplicate,
        invoice_type: result.invoice_type,
        confidence: result.confidence?.overall,
        processing_time: endTime - startTime,
        edge_function_time: result.processingTime
      })

      // 检查是否是已删除文件的重复上传
      if (result.isDuplicate && result.canRestore) {
        // 添加恢复信息到响应中
        const convertedResult = this.convertOcrDedupResponseToEdgeFormat(result)
        convertedResult.deletedFileInfo = {
          canRestore: true,
          deletedInvoice: result.deletedInvoice,
          message: '检测到相同文件在回收站中，您可以选择恢复'
        }
        return convertedResult
      }

      // 将ocr-dedup-complete的响应格式转换为前端期望的格式
      return this.convertOcrDedupResponseToEdgeFormat(result)

      } catch (fetchError) {
        clearTimeout(timeoutId) // 确保清除超时
        
        if (fetchError.name === 'AbortError') {
          logger.error('⏰ [EdgeFunctionOCR] Edge Function请求超时')
          throw new Error('Edge Function请求超时，请稍后重试')
        }
        
        logger.error('🌐 [EdgeFunctionOCR] 网络请求失败:', fetchError)
        throw fetchError
      }

    } catch (error) {
      logger.error('❌ [EdgeFunctionOCR] 处理失败:', error)
      
      // 网络错误或其他异常，回退到后端API
      logger.warn('🔄 [EdgeFunctionOCR] 异常回退到后端API')
      return await this.fallbackToBackendAPI(file)
    }
  }

  /**
   * 回退到原有的后端API
   */
  private async fallbackToBackendAPI(file: File): Promise<EdgeFunctionOCRResponse> {
    logger.info('🔄 [EdgeFunctionOCR] 使用后端API作为备选方案')
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const { data: { session } } = await supabase.auth.getSession()
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8090'

      const response = await fetch(`${backendUrl}/api/v1/ocr/combined/full`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Backend API failed: ${response.status}`)
      }

      const backendResult = await response.json()
      
      // 转换后端响应格式为Edge Function格式
      return this.convertBackendResponseToEdgeFormat(backendResult)

    } catch (error) {
      logger.error('❌ [EdgeFunctionOCR] 后端API也失败了:', error)
      throw new Error('OCR处理完全失败，请稍后重试')
    }
  }

  /**
   * 转换ocr-dedup-complete响应格式为前端期望格式
   */
  private convertOcrDedupResponseToEdgeFormat(ocrDedupResult: any): EdgeFunctionOCRResponse & { isDuplicate?: boolean; data?: any; duplicateInfo?: any } {
    logger.log('🔄 [EdgeFunctionOCR] 转换ocr-dedup-complete响应格式', {
      success: ocrDedupResult.success,
      isDuplicate: ocrDedupResult.isDuplicate,
      hasData: !!ocrDedupResult.data,
      dataKeys: ocrDedupResult.data ? Object.keys(ocrDedupResult.data) : []
    })

    // 从保存的发票数据中提取OCR信息
    let extractedOcrData = {}
    let invoice_type = '未知类型'
    let fields = {}
    let confidence = { overall: 0, fields: {} }
    let validation = {
      is_valid: false,
      field_results: {},
      overall_errors: [],
      overall_warnings: [],
      completeness_score: 0
    }
    let raw_ocr_data = {}

    if (ocrDedupResult.data && ocrDedupResult.data.extracted_data) {
      const extracted = ocrDedupResult.data.extracted_data
      
      // 从保存的发票记录中重构OCR格式
      invoice_type = ocrDedupResult.data.invoice_type || extracted.structured_data?.invoice_type || '未知类型'
      
      // 根据发票类型重构fields对象
      if (extracted.structured_data && extracted.structured_data.fields) {
        const baseFields = {
          ...extracted.structured_data.fields,
          // 原始OCR文本
          extracted_text: ocrDedupResult.data.extracted_data?.extracted_text
        }
        
        // 根据发票类型添加特定字段
        if (invoice_type === '火车票') {
          // 火车票特有字段映射
          fields = {
            // 火车票基础字段
            invoice_number: baseFields.invoice_number,
            invoice_date: baseFields.invoice_date,
            total_amount: baseFields.total_amount,
            // 火车票特有字段
            train_number: baseFields.train_number,
            departure_station: baseFields.departure_station,
            arrival_station: baseFields.arrival_station,
            departure_time: baseFields.departure_time,
            seat_type: baseFields.seat_type,
            seat_number: baseFields.seat_number,
            passenger_name: baseFields.passenger_name,
            passenger_info: baseFields.passenger_info,
            electronic_ticket_number: baseFields.electronic_ticket_number,
            // 恢复火车票的原始OCR文本
            extracted_text: baseFields.extracted_text
          }
        } else {
          // 普通发票字段映射 - 从raw_data或structured_data中提取
          const rawData = ocrDedupResult.data.extracted_data?.raw_data || {}
          const structuredData = extracted.structured_data || {}
          
          // 尝试从extracted_text中解析特定字段
          const extractedText = ocrDedupResult.data.extracted_data?.extracted_text || ''
          let parsedFromText = {}
          
          // 如果有extracted_text，尝试从中解析字段
          if (extractedText) {
            try {
              // 查找开票人信息 - 查找"开票人:"后的内容
              const drawerMatch = extractedText.match(/开票人[：:]\s*([^\s\n]+)/)
              if (drawerMatch) {
                parsedFromText.drawer = drawerMatch[1].trim()
              }
              
              // 查找大写金额 - 查找类似"壹佰玖拾贰圆整"的模式
              const chineseAmountMatch = extractedText.match(/([零壹贰叁肆伍陆柒捌玖拾佰仟万圆整角分]+)/)
              if (chineseAmountMatch) {
                parsedFromText.total_amount_chinese = chineseAmountMatch[1].trim()
              }
              
              // 查找JSON格式的发票明细
              const jsonMatch = extractedText.match(/\[.*\]/)
              if (jsonMatch) {
                try {
                  const detailsArray = JSON.parse(jsonMatch[0])
                  if (Array.isArray(detailsArray) && detailsArray.length > 0) {
                    parsedFromText.invoice_details = detailsArray
                  }
                } catch (e) {
                  console.log('解析发票明细JSON失败:', e)
                }
              }
            } catch (e) {
              console.log('从extracted_text解析字段失败:', e)
            }
          }
          
          fields = {
            ...baseFields,
            // 普通发票完整字段
            invoice_number: baseFields.invoice_number,
            invoice_code: baseFields.invoice_code,
            invoice_date: baseFields.invoice_date,
            seller_name: baseFields.seller_name,
            seller_tax_number: baseFields.seller_tax_number,
            buyer_name: baseFields.buyer_name,
            buyer_tax_number: baseFields.buyer_tax_number,
            total_amount: baseFields.total_amount,
            tax_amount: baseFields.tax_amount,
            amount_without_tax: baseFields.amount_without_tax,
            remarks: baseFields.remarks,
            // 扩展字段（优先级：解析文本 > raw_data > structured_data > baseFields）
            drawer: parsedFromText.drawer || rawData.drawer || structuredData.drawer || baseFields.drawer,
            invoicetype: rawData.invoiceType || structuredData.invoicetype || baseFields.invoicetype,
            goods_name: rawData.itemName || structuredData.goods_name || baseFields.goods_name,
            specification: rawData.specification || structuredData.specification || baseFields.specification,
            unit: rawData.unit || structuredData.unit || baseFields.unit,
            quantity: parseFloat(rawData.quantity || structuredData.quantity || baseFields.quantity || '0'),
            unit_price: parseFloat(rawData.unitPrice || structuredData.unit_price || baseFields.unit_price || '0'),
            amount: parseFloat(rawData.invoiceAmountPreTax || structuredData.amount || baseFields.amount || '0'),
            tax_rate: rawData.taxRate || structuredData.tax_rate || baseFields.tax_rate,
            total_amount_chinese: parsedFromText.total_amount_chinese || rawData.totalAmountInWords || structuredData.total_amount_chinese || baseFields.total_amount_chinese,
            // 发票明细（优先从解析文本获取）
            invoice_details: parsedFromText.invoice_details || rawData.invoiceDetails || structuredData.invoice_details || baseFields.invoice_details
          }
        }
      } else {
        // 从发票记录的各个字段中重构fields，根据发票类型分别处理
        if (invoice_type === '火车票') {
          // 火车票字段映射
          fields = {
            // 火车票基础字段
            invoice_number: ocrDedupResult.data.invoice_number,
            invoice_date: ocrDedupResult.data.invoice_date,
            total_amount: ocrDedupResult.data.total_amount || 
                         (ocrDedupResult.data.extracted_data?.processed_fields?.fare ? 
                          parseFloat(ocrDedupResult.data.extracted_data.processed_fields.fare) : 0),
            
            // 火车票特有字段（从extracted_data中提取，注意实际字段名是小写）
            train_number: ocrDedupResult.data.extracted_data?.processed_fields?.trainnumber,
            departure_station: ocrDedupResult.data.extracted_data?.processed_fields?.departurestation,
            arrival_station: ocrDedupResult.data.extracted_data?.processed_fields?.arrivalstation,
            departure_time: ocrDedupResult.data.extracted_data?.processed_fields?.departuretime,
            seat_type: ocrDedupResult.data.extracted_data?.processed_fields?.seattype,
            seat_number: ocrDedupResult.data.extracted_data?.processed_fields?.seatnumber,
            passenger_name: ocrDedupResult.data.extracted_data?.processed_fields?.passengername,
            passenger_info: ocrDedupResult.data.extracted_data?.processed_fields?.passengerinfo,
            electronic_ticket_number: ocrDedupResult.data.extracted_data?.processed_fields?.electronicticketnumber,
            
            // 恢复火车票的原始OCR文本
            extracted_text: ocrDedupResult.data.extracted_data?.extracted_text
          }
        } else {
          // 普通发票字段映射
          // 尝试从extracted_text中解析特定字段
          const extractedText = ocrDedupResult.data.extracted_data?.extracted_text || ''
          let parsedFromText = {}
          
          // 如果有extracted_text，尝试从中解析字段
          if (extractedText) {
            try {
              // 查找开票人信息 - 查找"开票人:"后的内容
              const drawerMatch = extractedText.match(/开票人[：:]\s*([^\s\n]+)/)
              if (drawerMatch) {
                parsedFromText.drawer = drawerMatch[1].trim()
              }
              
              // 查找大写金额 - 查找类似"壹佰玖拾贰圆整"的模式
              const chineseAmountMatch = extractedText.match(/([零壹贰叁肆伍陆柒捌玖拾佰仟万圆整角分]+)/)
              if (chineseAmountMatch) {
                parsedFromText.total_amount_chinese = chineseAmountMatch[1].trim()
              }
              
              // 查找JSON格式的发票明细
              const jsonMatch = extractedText.match(/\[.*\]/)
              if (jsonMatch) {
                try {
                  const detailsArray = JSON.parse(jsonMatch[0])
                  if (Array.isArray(detailsArray) && detailsArray.length > 0) {
                    parsedFromText.invoice_details = detailsArray
                  }
                } catch (e) {
                  console.log('解析发票明细JSON失败:', e)
                }
              }
            } catch (e) {
              console.log('从extracted_text解析字段失败:', e)
            }
          }
          
          fields = {
            // 普通发票基础字段
            invoice_number: ocrDedupResult.data.invoice_number,
            invoice_code: ocrDedupResult.data.invoice_code,
            invoice_date: ocrDedupResult.data.invoice_date,
            seller_name: ocrDedupResult.data.seller_name,
            seller_tax_number: ocrDedupResult.data.seller_tax_number,
            buyer_name: ocrDedupResult.data.buyer_name,
            buyer_tax_number: ocrDedupResult.data.buyer_tax_number,
            total_amount: ocrDedupResult.data.total_amount,
            tax_amount: ocrDedupResult.data.tax_amount,
            amount_without_tax: ocrDedupResult.data.amount_without_tax,
            remarks: ocrDedupResult.data.remarks,
            
            // 普通发票扩展字段（优先级：解析文本 > raw_data > structured_data > 直接字段）
            drawer: parsedFromText.drawer || 
                   ocrDedupResult.data.extracted_data?.raw_data?.drawer || 
                   ocrDedupResult.data.extracted_data?.structured_data?.drawer || 
                   ocrDedupResult.data.drawer,
            invoicetype: ocrDedupResult.data.extracted_data?.raw_data?.invoiceType || 
                        ocrDedupResult.data.extracted_data?.structured_data?.invoicetype || 
                        ocrDedupResult.data.invoice_type,
            goods_name: ocrDedupResult.data.extracted_data?.raw_data?.itemName || 
                       ocrDedupResult.data.extracted_data?.structured_data?.goods_name || 
                       ocrDedupResult.data.goods_name,
            specification: ocrDedupResult.data.extracted_data?.raw_data?.specification || 
                          ocrDedupResult.data.extracted_data?.structured_data?.specification || 
                          ocrDedupResult.data.specification,
            unit: ocrDedupResult.data.extracted_data?.raw_data?.unit || 
                 ocrDedupResult.data.extracted_data?.structured_data?.unit || 
                 ocrDedupResult.data.unit,
            quantity: parseFloat(ocrDedupResult.data.extracted_data?.raw_data?.quantity || 
                               ocrDedupResult.data.extracted_data?.structured_data?.quantity || 
                               ocrDedupResult.data.quantity || '0'),
            unit_price: parseFloat(ocrDedupResult.data.extracted_data?.raw_data?.unitPrice || 
                                 ocrDedupResult.data.extracted_data?.structured_data?.unit_price || 
                                 ocrDedupResult.data.unit_price || '0'),
            amount: parseFloat(ocrDedupResult.data.extracted_data?.raw_data?.invoiceAmountPreTax || 
                             ocrDedupResult.data.extracted_data?.structured_data?.amount || 
                             ocrDedupResult.data.amount || '0'),
            tax_rate: ocrDedupResult.data.extracted_data?.raw_data?.taxRate || 
                     ocrDedupResult.data.extracted_data?.structured_data?.tax_rate || 
                     ocrDedupResult.data.tax_rate,
            total_amount_chinese: parsedFromText.total_amount_chinese ||
                                 ocrDedupResult.data.extracted_data?.raw_data?.totalAmountInWords || 
                                 ocrDedupResult.data.extracted_data?.structured_data?.total_amount_chinese || 
                                 ocrDedupResult.data.total_amount_chinese,
            
            // 发票明细（优先从解析文本获取）
            invoice_details: parsedFromText.invoice_details ||
                           ocrDedupResult.data.extracted_data?.raw_data?.invoiceDetails || 
                           ocrDedupResult.data.extracted_data?.structured_data?.invoice_details || 
                           ocrDedupResult.data.invoice_details,
            
            // 原始OCR文本
            extracted_text: ocrDedupResult.data.extracted_data?.extracted_text
          }
        }
      }
      
      confidence = extracted.confidence_scores || extracted.confidence || { overall: ocrDedupResult.data.ocr_overall_confidence || 0, fields: {} }
      raw_ocr_data = extracted.raw_result || extracted.raw_ocr_data || {}
      
      // 设置验证信息
      validation = {
        is_valid: true,
        field_results: {},
        overall_errors: [],
        overall_warnings: ocrDedupResult.isDuplicate ? ['文件重复'] : [],
        completeness_score: 100
      }
    }

    const convertedResponse = {
      success: ocrDedupResult.success || false,
      invoice_type: invoice_type,
      fields: fields,
      confidence: confidence,
      validation: validation,
      raw_ocr_data: raw_ocr_data,
      processing_steps: ocrDedupResult.steps || [],
      metadata: {
        total_processing_time: ocrDedupResult.processingTime || 0,
        step_timings: {},
        timestamp: new Date().toISOString()
      },
      
      // 保持去重相关信息
      isDuplicate: ocrDedupResult.isDuplicate,
      data: ocrDedupResult.data,
      message: ocrDedupResult.message
    }

    // 如果是重复文件，添加重复信息
    if (ocrDedupResult.isDuplicate && ocrDedupResult.data) {
      convertedResponse.duplicateInfo = {
        existingInvoiceId: ocrDedupResult.data.id || '',
        existingData: ocrDedupResult.data,
        uploadCount: ocrDedupResult.data.upload_count || 1,
        message: ocrDedupResult.message || '文件重复'
      }
    }

    logger.log('✅ [EdgeFunctionOCR] 响应格式转换完成', {
      invoice_type: convertedResponse.invoice_type,
      fieldsCount: Object.keys(convertedResponse.fields).length,
      isDuplicate: convertedResponse.isDuplicate,
      confidence: convertedResponse.confidence.overall,
      // 调试关键字段
      keyFields: {
        drawer: convertedResponse.fields.drawer,
        total_amount_chinese: convertedResponse.fields.total_amount_chinese,
        invoice_details: Array.isArray(convertedResponse.fields.invoice_details) 
          ? `数组(${convertedResponse.fields.invoice_details.length}项)` 
          : convertedResponse.fields.invoice_details,
        extracted_text: convertedResponse.fields.extracted_text ? 
          `文本(${convertedResponse.fields.extracted_text.length}字符)` : 
          'undefined'
      }
    })

    return convertedResponse
  }

  /**
   * 转换后端响应格式为Edge Function格式
   */
  private convertBackendResponseToEdgeFormat(backendResult: any): EdgeFunctionOCRResponse {
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
      processing_steps: ['后端API处理'],
      metadata: {
        total_processing_time: 0,
        step_timings: {},
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * 验证OCR响应格式
   */
  private isValidOCRResponse(response: any): boolean {
    return !!(
      response &&
      typeof response.success === 'boolean' &&
      response.invoice_type &&
      response.fields &&
      response.confidence &&
      response.validation &&
      response.raw_ocr_data
    )
  }

  /**
   * 修复不完整的OCR响应
   */
  private repairOCRResponse(response: any): EdgeFunctionOCRResponse {
    return {
      success: response.success || false,
      invoice_type: response.invoice_type || response.data?.invoice_type || '未知类型',
      fields: response.fields || response.data?.fields || {},
      confidence: response.confidence || {
        overall: response.data?.confidence?.overall || 0,
        fields: response.data?.confidence?.fields || {}
      },
      validation: response.validation || response.data?.validation || {
        is_valid: false,
        field_results: {},
        overall_errors: ['响应格式不完整'],
        overall_warnings: [],
        completeness_score: 0
      },
      raw_ocr_data: response.raw_ocr_data || response.data?.raw_ocr_data || {},
      processing_steps: response.processing_steps || ['数据修复处理'],
      metadata: response.metadata || {
        total_processing_time: 0,
        step_timings: {},
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * 调用单个Edge Function模块（用于测试和调试）
   */
  async callIndividualFunction(functionName: string, data: any): Promise<any> {
    logger.log(`🔧 [EdgeFunctionOCR] 调用单个函数: ${functionName}`)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`${this.supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || this.supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error(`Function ${functionName} failed: ${response.status}`)
      }

      const result = await response.json()
      logger.log(`✅ [EdgeFunctionOCR] 函数 ${functionName} 调用成功`)
      
      return result

    } catch (error) {
      logger.error(`❌ [EdgeFunctionOCR] 函数 ${functionName} 调用失败:`, error)
      throw error
    }
  }

  /**
   * 获取Edge Functions状态
   */
  async getEdgeFunctionStatus(): Promise<{available: boolean, functions: string[]}> {
    try {
      // 尝试调用一个轻量级的健康检查函数
      await this.callIndividualFunction('file-validator', {
        file_data: 'dGVzdA==', // base64编码的"test"
        file_name: 'test.txt',
        file_type: 'text/plain'
      })

      return {
        available: true,
        functions: ['file-validator', 'ocr-recognizer', 'data-parser', 'field-validator', 'ocr-complete']
      }
    } catch (error) {
      return {
        available: false,
        functions: []
      }
    }
  }
}

// 导出单例实例
export const edgeFunctionOCR = new EdgeFunctionOCRService()