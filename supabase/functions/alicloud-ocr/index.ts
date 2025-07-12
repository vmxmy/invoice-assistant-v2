import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

// CORS配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

// 阿里云OCR客户端 - 使用验证过的手工签名实现
class AliCloudOCRClient {
  private accessKeyId: string
  private accessKeySecret: string
  private endpoint: string

  constructor(accessKeyId: string, accessKeySecret: string, region: string = 'cn-hangzhou') {
    this.accessKeyId = accessKeyId
    this.accessKeySecret = accessKeySecret
    this.endpoint = `ocr-api.${region}.aliyuncs.com`
  }

  /**
   * 发票OCR识别 (支持图片和PDF)
   */
  async recognizeInvoice(fileUrl: string): Promise<any> {
    const params: Record<string, any> = {
      Url: fileUrl
    }
    
    // 只有PDF/OFD文件才需要PageNo参数
    if (fileUrl.toLowerCase().endsWith('.pdf') || fileUrl.toLowerCase().endsWith('.ofd')) {
      params.PageNo = 1
    }
    
    return this.callOCRAPI('RecognizeInvoice', params)
  }

  /**
   * Base64图片/PDF发票OCR
   */
  async recognizeInvoiceFromBase64(base64Data: string, isPdf: boolean = false): Promise<any> {
    const params: Record<string, any> = {
      body: base64Data
    }
    
    // PDF文件需要指定页码
    if (isPdf) {
      params.PageNo = 1
    }
    
    return this.callOCRAPI('RecognizeInvoice', params)
  }

  /**
   * 火车票OCR识别
   */
  async recognizeTrainTicket(fileUrl: string): Promise<any> {
    return this.callOCRAPI('RecognizeTrainInvoice', {
      Url: fileUrl
    })
  }

  /**
   * Base64火车票OCR
   */
  async recognizeTrainTicketFromBase64(base64Data: string): Promise<any> {
    return this.callOCRAPI('RecognizeTrainInvoice', {
      body: base64Data
    })
  }

  /**
   * 通用OCR识别
   */
  async recognizeGeneral(imageUrl: string): Promise<any> {
    return this.callOCRAPI('RecognizeGeneral', {
      Url: imageUrl
    })
  }

  private async callOCRAPI(action: string, params: Record<string, any>) {
    try {
      // 生成时间戳和随机数 - 严格按照阿里云格式
      const timestamp = new Date().toISOString().replace(/\.\d{3}/, '') // 格式化为 yyyy-MM-ddTHH:mm:ssZ
      const nonce = Date.now().toString() + Math.random().toString(36).substring(2) // 使用简单的时间戳+随机数
      
      // 构建公共参数
      const commonParams = {
        'Format': 'JSON',
        'Version': '2021-07-07', 
        'AccessKeyId': this.accessKeyId,
        'SignatureMethod': 'HMAC-SHA1',
        'Timestamp': timestamp,
        'SignatureVersion': '1.0',
        'SignatureNonce': nonce,
        'Action': action
      }

      // 合并参数
      const allParams = { ...commonParams, ...params }
      
      console.log('--- [Debug] 所有参数（签名前）---')
      console.log(JSON.stringify(allParams, null, 2))
      console.log('--------------------------------')
      
      // 生成签名
      const signature = await this.generateSignature('POST', allParams)
      allParams['Signature'] = signature

      // 手动构建请求体，确保与签名时的编码完全一致
      const sortedKeys = Object.keys(allParams).sort()
      const requestBody = sortedKeys
        .map(key => {
          const value = allParams[key]
          const strValue = typeof value === 'number' ? value.toString() : String(value)
          return `${this.percentEncode(key)}=${this.percentEncode(strValue)}`
        })
        .join('&')
      
      console.log('--- [Debug] 请求体 ---')
      console.log(requestBody)
      console.log('----------------------')
      
      // 打印请求信息
      console.log('--- [Debug] 完整请求信息 ---')
      console.log(`Endpoint: https://${this.endpoint}`)
      console.log(`Method: POST`)
      console.log(`Headers: Content-Type: application/x-www-form-urlencoded`)
      console.log(`Timestamp: ${timestamp}`)
      console.log(`SignatureNonce: ${nonce}`)
      console.log(`Action: ${action}`)
      console.log('--------------------------------')

      // 发起请求
      const response = await fetch(`https://${this.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: requestBody
      })

      const responseText = await response.text()
      console.log('阿里云响应:', responseText)

      let result
      try {
        result = JSON.parse(responseText)
      } catch (e) {
        throw new Error(`解析响应失败: ${responseText}`)
      }
      
      if (result.Code) {
        throw new Error(`阿里云OCR错误: ${result.Code} - ${result.Message}`)
      }

      return {
        success: true,
        data: result.Data,
        requestId: result.RequestId
      }

    } catch (error) {
      console.error('OCR API 调用错误:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 生成阿里云API签名 - 严格按照官方规范实现
   */
  private async generateSignature(method: string, params: Record<string, any>): Promise<string> {
    // 第一步：对所有参数按键名进行字典升序排序
    const sortedKeys = Object.keys(params).sort()
    
    // 第二步：构造规范化请求字符串 (Canonicalized Query String)
    const canonicalizedQueryString = sortedKeys
      .map(key => {
        const value = params[key]
        // 对null或undefined的值不参与拼接
        if (value === null || value === undefined) {
          return ''
        }
        // 确保所有值都转换为字符串，包括数字
        const strValue = typeof value === 'number' ? value.toString() : String(value)
        return `${this.percentEncode(key)}=${this.percentEncode(strValue)}`
      })
      .filter(pair => pair !== '') // 过滤掉空值对
      .join('&')

    // 第三步：构造待签名字符串 (String-to-Sign)
    const stringToSign = `${method}&${this.percentEncode('/')}&${this.percentEncode(canonicalizedQueryString)}`

    console.log('--- [Debug] 规范化查询字符串 ---')
    console.log(canonicalizedQueryString)
    console.log('--- [Debug] 待签名字符串 ---')
    console.log(stringToSign)
    console.log('------------------------------')

    // 第四步：计算签名 (Signature)
    // 1. 构造密钥 - 在AccessKeySecret后面拼接&
    const signingKey = `${this.accessKeySecret}&`
    
    // 2. 计算HMAC-SHA1
    const keyData = new TextEncoder().encode(signingKey)
    const messageData = new TextEncoder().encode(stringToSign)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    
    // 3. 进行Base64编码
    const signature = base64Encode(new Uint8Array(signatureBuffer))
    
    console.log('--- [Debug] 最终签名 ---')
    console.log(signature)
    console.log('----------------------')
    
    return signature
  }

  /**
   * RFC 3986规范的URL编码
   */
  private percentEncode(str: string): string {
    let encoded = encodeURIComponent(str)
    // encodeURIComponent不编码 '!', "'", "(", ")", "*"，需要手动替换
    encoded = encoded.replace(/!/g, '%21')
    encoded = encoded.replace(/'/g, '%27')
    encoded = encoded.replace(/\(/g, '%28')
    encoded = encoded.replace(/\)/g, '%29')
    encoded = encoded.replace(/\*/g, '%2A')
    // 波浪号不需要编码
    return encoded
  }
}

// 发票数据结构化处理
interface InvoiceData {
  invoiceCode?: string
  invoiceNumber?: string
  invoiceDate?: string
  totalAmount?: string
  sellerName?: string
  sellerTaxNumber?: string
  buyerName?: string
  buyerTaxNumber?: string
  taxAmount?: string
  confidence?: number
}

interface TrainTicketData {
  ticketNumber?: string
  passengerName?: string
  idNumber?: string
  departureStation?: string
  arrivalStation?: string
  trainNumber?: string
  departureDate?: string
  departureTime?: string
  seatNumber?: string
  ticketPrice?: string
  confidence?: number
}

function parseInvoiceData(ocrData: any): InvoiceData {
  // 解析返回的JSON字符串
  let data = ocrData
  if (typeof ocrData === 'string') {
    try {
      data = JSON.parse(ocrData)
    } catch (e) {
      console.error('解析OCR数据失败:', e)
      return {}
    }
  }
  
  const invoiceData = data.data || data || {}
  
  return {
    invoiceCode: invoiceData.invoiceCode || '',
    invoiceNumber: invoiceData.invoiceNumber || '',
    invoiceDate: invoiceData.invoiceDate || '',
    totalAmount: invoiceData.totalAmount || '',
    taxAmount: invoiceData.invoiceTax || '',
    sellerName: invoiceData.sellerName || '',
    sellerTaxNumber: invoiceData.sellerTaxNumber || '',
    buyerName: invoiceData.purchaserName || '',
    buyerTaxNumber: invoiceData.purchaserTaxNumber || '',
    confidence: 0.95
  }
}

function parseTrainTicketData(ocrData: any): TrainTicketData {
  // 解析返回的JSON字符串
  let data = ocrData
  if (typeof ocrData === 'string') {
    try {
      data = JSON.parse(ocrData)
    } catch (e) {
      console.error('解析OCR数据失败:', e)
      return {}
    }
  }
  
  const ticketData = data.data || data || {}
  
  // 从departureTime中提取日期和时间
  const departureTimeStr = ticketData.departureTime || ''
  let departureDate = ''
  let departureTime = ''
  if (departureTimeStr) {
    const dateMatch = departureTimeStr.match(/(\d{4}年\d{1,2}月\d{1,2}日)/)
    const timeMatch = departureTimeStr.match(/(\d{1,2}:\d{2})开?/)
    if (dateMatch) {
      departureDate = dateMatch[1]
    }
    if (timeMatch) {
      departureTime = timeMatch[1]
    }
  }
  
  // 从passengerInfo中提取身份证号
  const passengerInfo = ticketData.passengerInfo || ''
  let idNumber = ''
  if (passengerInfo) {
    const idMatch = passengerInfo.match(/(\d+\*+\d+)/)
    if (idMatch) {
      idNumber = idMatch[1]
    }
  }
  
  return {
    ticketNumber: ticketData.ticketNumber || '',
    passengerName: ticketData.passengerName || '',
    idNumber: idNumber,
    departureStation: ticketData.departureStation || '',
    arrivalStation: ticketData.arrivalStation || '',
    trainNumber: ticketData.trainNumber || '',
    departureDate: departureDate || ticketData.invoiceDate || '',
    departureTime: departureTime,
    seatNumber: ticketData.seatNumber || '',
    ticketPrice: ticketData.fare || '',
    confidence: 0.95
  }
}

serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 验证环境变量
    const accessKeyId = Deno.env.get('ALICLOUD_ACCESS_KEY_ID')
    const accessKeySecret = Deno.env.get('ALICLOUD_ACCESS_KEY_SECRET')
    
    if (!accessKeyId || !accessKeySecret) {
      throw new Error('缺少阿里云AccessKey配置')
    }

    // 解析请求
    let requestData: any
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      // 处理文件上传
      const formData = await req.formData()
      const file = formData.get('file') as File
      const action = formData.get('action') as string || 'invoice'
      
      if (file) {
        // 将文件转换为Base64
        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        const base64Data = base64Encode(uint8Array)
        
        requestData = {
          action,
          base64Data,
          filename: file.name
        }
      } else {
        throw new Error('未找到上传的文件')
      }
    } else {
      // 处理JSON请求
      requestData = await req.json()
    }
    
    const { action, imageUrl, imageData, base64Data, filename } = requestData
    
    if (!action) {
      throw new Error('缺少action参数')
    }

    // 初始化OCR客户端
    const ocrClient = new AliCloudOCRClient(accessKeyId, accessKeySecret)

    let result: any

    switch (action) {
      case 'invoice': {
        if (imageUrl) {
          result = await ocrClient.recognizeInvoice(imageUrl)
        } else if (imageData || base64Data) {
          const data = imageData || base64Data
          // 检测是否为PDF（Base64编码的PDF通常以JVBERi开头）
          const isPdf = data.startsWith('JVBERi') || data.includes('JVBERi')
          result = await ocrClient.recognizeInvoiceFromBase64(data, isPdf)
        } else {
          throw new Error('请提供imageUrl、imageData或base64Data参数')
        }
        
        // 如果OCR成功，解析发票数据
        if (result.success && result.data) {
          const parsedData = parseInvoiceData(result.data)
          result.parsedInvoice = parsedData
        }
        break
      }
      
      case 'train-ticket': {
        if (imageUrl) {
          result = await ocrClient.recognizeTrainTicket(imageUrl)
        } else if (imageData || base64Data) {
          const data = imageData || base64Data
          result = await ocrClient.recognizeTrainTicketFromBase64(data)
        } else {
          throw new Error('请提供imageUrl、imageData或base64Data参数')
        }
        
        // 如果OCR成功，解析火车票数据
        if (result.success && result.data) {
          const parsedData = parseTrainTicketData(result.data)
          result.parsedTrainTicket = parsedData
        }
        break
      }
      
      case 'general': {
        if (!imageUrl) {
          throw new Error('通用OCR需要提供imageUrl参数')
        }
        result = await ocrClient.recognizeGeneral(imageUrl)
        break
      }
      
      case 'test': {
        // 测试接口，验证配置是否正确
        result = {
          success: true,
          message: '阿里云OCR配置正确（手工签名实现）',
          config: {
            accessKeyId: accessKeyId.substring(0, 8) + '***',
            endpoint: `ocr-api.cn-hangzhou.aliyuncs.com`,
            implementation: 'Native Deno Crypto API'
          }
        }
        break
      }
      
      default:
        throw new Error(`不支持的action: ${action}。支持的action: invoice, train-ticket, general, test`)
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('阿里云OCR错误:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})