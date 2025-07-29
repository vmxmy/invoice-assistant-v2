import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// 阿里云OCR配置
const ACCESS_KEY_ID = Deno.env.get('ALICLOUD_ACCESS_KEY_ID');
const ACCESS_KEY_SECRET = Deno.env.get('ALICLOUD_ACCESS_KEY_SECRET');
const REGION = 'cn-hangzhou';

// 百分比编码函数
function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

// 创建签名
async function createSignature(httpMethod: string, parameters: Record<string, string>): Promise<string> {
  // 1. 按键排序参数
  const sortedParams = Object.keys(parameters)
    .filter(key => key !== 'Signature')
    .sort()
    .map(key => `${percentEncode(key)}=${percentEncode(parameters[key])}`)
    .join('&');

  // 2. 构造待签名字符串
  const stringToSign = `${httpMethod}&${percentEncode('/')}&${percentEncode(sortedParams)}`;

  // 3. 使用 Web Crypto API 进行 HMAC-SHA1 签名
  const encoder = new TextEncoder();
  const keyData = encoder.encode(ACCESS_KEY_SECRET + '&');
  const messageData = encoder.encode(stringToSign);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return base64Signature;
}

Deno.serve(async (req: Request) => {
  // 处理 CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-User-ID, x-user-id'
      }
    });
  }

  try {
    console.log('🚀 开始OCR完整处理流程 (最终版)');
    const globalStartTime = Date.now();

    if (req.method !== 'POST') {
      throw new Error('只支持POST请求');
    }

    // 检查阿里云配置
    if (!ACCESS_KEY_ID || !ACCESS_KEY_SECRET) {
      throw new Error('阿里云OCR配置不完整');
    }

    // 步骤1: 解析multipart/form-data并提取文件
    console.log('📁 步骤1: 文件解析');
    const fileStartTime = Date.now();
    
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('未找到上传的文件');
    }

    console.log('文件信息:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // 文件验证
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(`文件验证失败: ${validation.errors.join(', ')}`);
    }

    const pdfBytes = await file.arrayBuffer();
    const fileTime = Date.now() - fileStartTime;

    // 步骤2: 调用阿里云OCR API
    console.log('🔍 步骤2: OCR识别');
    const ocrStartTime = Date.now();
    
    const ocrResult = await callAliyunOCR(pdfBytes);
    const ocrTime = Date.now() - ocrStartTime;

    // 步骤3: 数据解析和结构化
    console.log('📊 步骤3: 数据解析');
    const parseStartTime = Date.now();
    
    const parsedData = parseOCRResponse(ocrResult, file.name);
    const parseTime = Date.now() - parseStartTime;

    // 步骤4: 字段验证
    console.log('✅ 步骤4: 字段验证');
    const validationStartTime = Date.now();
    
    const fieldValidation = validateInvoiceFields(parsedData.fields);
    const validationTime = Date.now() - validationStartTime;

    const totalTime = Date.now() - globalStartTime;

    // 组装最终响应
    const response = {
      success: fieldValidation.is_valid,
      invoice_type: parsedData.invoice_type,
      fields: parsedData.fields,
      confidence: parsedData.confidence,
      validation: fieldValidation,
      raw_ocr_data: ocrResult,
      processing_steps: [
        `文件验证: 通过 (${file.name}, ${(file.size/1024).toFixed(1)}KB)`,
        `OCR识别: ${parsedData.invoice_type} (置信度: ${(parsedData.confidence.overall*100).toFixed(1)}%)`,
        `数据解析: 完成 (${Object.keys(parsedData.fields).length}个字段)`,
        `字段验证: ${fieldValidation.is_valid ? '通过' : '发现问题'} (完整性: ${fieldValidation.completeness_score}%)`
      ],
      metadata: {
        total_processing_time: totalTime,
        step_timings: {
          file_processing: fileTime,
          ocr_recognition: ocrTime,
          data_parsing: parseTime,
          field_validation: validationTime
        },
        timestamp: new Date().toISOString(),
        region: REGION
      }
    };

    console.log('🎉 OCR完整处理流程完成:', {
      success: response.success,
      invoice_type: response.invoice_type,
      field_count: Object.keys(response.fields).length,
      total_time: totalTime + 'ms'
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ OCR处理失败:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      processing_steps: [`处理失败: ${error.message}`],
      metadata: {
        total_processing_time: 0,
        step_timings: {},
        timestamp: new Date().toISOString()
      },
      debug: {
        errorType: error.constructor.name,
        stack: error.stack
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});

/**
 * 文件验证
 */
function validateFile(file: File): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 文件大小检查 (10MB限制)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('文件大小超过10MB限制');
  }

  if (file.size < 100) {
    errors.push('文件大小过小');
  }

  // 文件类型检查
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push(`不支持的文件类型: ${file.type}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 调用阿里云OCR API
 */
async function callAliyunOCR(pdfBytes: ArrayBuffer): Promise<any> {
  // 准备API参数
  const timestamp = new Date().toISOString();
  const nonce = Math.random().toString(36).substring(2, 15);
  
  const parameters: Record<string, string> = {
    Action: 'RecognizeMixedInvoices',
    Format: 'JSON',
    Version: '2021-07-07',
    AccessKeyId: ACCESS_KEY_ID!,
    SignatureMethod: 'HMAC-SHA1',
    Timestamp: timestamp,
    SignatureVersion: '1.0',
    SignatureNonce: nonce
  };

  // 生成签名
  parameters.Signature = await createSignature('POST', parameters);

  // 构建查询字符串
  const queryString = Object.keys(parameters)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(parameters[key])}`)
    .join('&');

  console.log('📡 调用阿里云OCR API...');

  // 调用阿里云API
  const ocrResponse = await fetch(`https://ocr-api.${REGION}.aliyuncs.com/?${queryString}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'User-Agent': 'Supabase-Edge-Function/1.0'
    },
    body: pdfBytes
  });

  if (!ocrResponse.ok) {
    const errorText = await ocrResponse.text();
    console.error('阿里云API错误响应:', errorText);
    throw new Error(`阿里云OCR调用失败: ${ocrResponse.status} - ${errorText}`);
  }

  const ocrResult = await ocrResponse.json();
  console.log('✅ 阿里云OCR调用成功');
  
  return ocrResult;
}

/**
 * 解析OCR响应结果
 */
function parseOCRResponse(ocrResult: any, fileName: string): {
  invoice_type: string;
  fields: Record<string, any>;
  confidence: { overall: number; fields: Record<string, number> };
} {
  try {
    // 解析阿里云OCR响应格式
    const dataStr = ocrResult?.Data || '';
    if (!dataStr) {
      throw new Error('OCR响应中没有Data字段');
    }

    const data = JSON.parse(dataStr);
    const subMsgs = data?.subMsgs || [];

    if (subMsgs.length === 0) {
      throw new Error('OCR响应中没有subMsgs');
    }

    const firstMsg = subMsgs[0];
    const result = firstMsg?.result || {};
    const prismInfo = result?.prism_keyValueInfo || [];

    // 发票类型识别
    const ocrType = firstMsg?.type || '';
    const typeMapping: Record<string, string> = {
      'VATInvoice': '增值税发票',
      'TrainTicket': '火车票',
      'FlightTicket': '机票',
      'TaxiTicket': '出租车票',
      'BusTicket': '客运车票',
      'HotelReceipt': '酒店账单',
      'GeneralInvoice': '普通发票'
    };
    const invoiceType = typeMapping[ocrType] || ocrType || '增值税发票';

    // 字段映射配置（支持中文和英文字段名）
    const fieldMapping: Record<string, string> = {
      // 中文字段名映射
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
      '消费日期': 'consumption_date',
      
      // 英文字段名映射（阿里云OCR返回的字段）
      'invoiceNumber': 'invoice_number',
      'invoiceCode': 'invoice_code',
      'invoiceDate': 'invoice_date',
      'sellerName': 'seller_name',
      'sellerTaxNumber': 'seller_tax_number',
      'purchaserName': 'buyer_name',
      'purchaserTaxNumber': 'buyer_tax_number',
      'totalAmount': 'total_amount',
      'totalAmountInWords': 'total_amount_chinese',
      'invoiceAmountPreTax': 'amount',
      'invoiceTax': 'tax_amount',
      'taxRate': 'tax_rate',
      'title': 'goods_name',
      
      // 火车票字段
      'ticketNumber': 'invoice_number',
      'departureStation': 'departure_station',
      'arrivalStation': 'arrival_station',
      'trainNumber': 'train_number',
      'departureTime': 'departure_time',
      'seatType': 'seat_type',
      'fare': 'total_amount',
      'passengerName': 'buyer_name',
      'buyerName': 'buyer_name'
    };

    const fields: Record<string, any> = {};
    const fieldConfidences: Record<string, number> = {};
    let totalConfidence = 0;
    let confidenceCount = 0;

    // 提取字段值和置信度
    for (const field of prismInfo) {
      const key = field.key || '';
      const value = field.value || '';
      const confidence = (field.valueProb || 0) / 100;

      if (key && value) {
        const standardKey = fieldMapping[key] || key.toLowerCase().replace(/\s+/g, '_');

        // 数据类型转换和标准化
        let processedValue = value;
        
        // 金额字段转换为数字
        if (['total_amount', 'amount', 'tax_amount', 'unit_price'].includes(standardKey)) {
          const numericValue = parseFloat(value.replace(/[^\d.]/g, ''));
          processedValue = isNaN(numericValue) ? 0 : numericValue;
        }
        // 日期字段标准化
        else if (standardKey === 'invoice_date' || standardKey === 'consumption_date' || standardKey === 'departure_time') {
          processedValue = normalizeDate(value);
        }
        // 数量字段转换为数字
        else if (standardKey === 'quantity') {
          const numericValue = parseFloat(value.replace(/[^\d.]/g, ''));
          processedValue = isNaN(numericValue) ? 1 : numericValue;
        }
        // 税率字段转换为数字（百分比）
        else if (standardKey === 'tax_rate') {
          const numericValue = parseFloat(value.replace(/[%％]/g, ''));
          processedValue = isNaN(numericValue) ? 0 : numericValue;
        }
        // 文本字段清理
        else {
          processedValue = value.trim();
        }

        fields[standardKey] = processedValue;
        fieldConfidences[standardKey] = confidence;

        totalConfidence += confidence;
        confidenceCount++;
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
      }));
      fields['invoice_details'] = invoiceDetails;
    }

    const overallConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0.8;

    console.log('📊 OCR数据解析完成:', {
      invoice_type: invoiceType,
      field_count: Object.keys(fields).length,
      overall_confidence: (overallConfidence * 100).toFixed(1) + '%',
      has_details: !!fields['invoice_details']
    });

    return {
      invoice_type: invoiceType,
      fields,
      confidence: {
        overall: overallConfidence,
        fields: fieldConfidences
      }
    };

  } catch (error) {
    console.error('❌ OCR结果解析失败:', error);
    throw new Error(`OCR结果解析失败: ${error.message}`);
  }
}

/**
 * 验证发票字段
 */
function validateInvoiceFields(fields: Record<string, any>): {
  is_valid: boolean;
  field_results: Record<string, any>;
  overall_errors: string[];
  overall_warnings: string[];
  completeness_score: number;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fieldResults: Record<string, any> = {};

  // 必填字段检查 - 根据发票类型调整
  let requiredFields: string[];
  
  if (invoiceType === '火车票') {
    // 火车票不需要seller_name（统一为"中国铁路"）
    requiredFields = ['invoice_number', 'invoice_date', 'total_amount'];
  } else {
    // 其他发票类型需要seller_name
    requiredFields = ['invoice_number', 'invoice_date', 'seller_name', 'total_amount'];
  }
  
  const missingFields = requiredFields.filter(field => !fields[field] || fields[field] === '');

  if (missingFields.length > 0) {
    errors.push(`缺少必填字段: ${missingFields.join(', ')}`);
  }

  // 字段格式验证
  const invoiceNumber = fields.invoice_number;
  if (invoiceNumber && typeof invoiceNumber === 'string' && !/^[0-9]{8,20}$/.test(invoiceNumber)) {
    warnings.push('发票号码格式可能不正确');
  }

  const totalAmount = fields.total_amount;
  if (totalAmount !== undefined && (typeof totalAmount !== 'number' || totalAmount <= 0)) {
    errors.push('发票金额必须为正数');
  }

  // 日期格式验证
  const invoiceDate = fields.invoice_date;
  if (invoiceDate && typeof invoiceDate === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) {
    warnings.push('发票日期格式可能不正确');
  }

  // 计算完整性评分
  const expectedFields = [
    'invoice_number', 'invoice_code', 'invoice_date', 'seller_name',
    'buyer_name', 'total_amount', 'amount', 'tax_amount', 'tax_rate', 'goods_name'
  ];
  const actualFieldsCount = expectedFields.filter(field => fields[field] && fields[field] !== '').length;
  const completenessScore = Math.round((actualFieldsCount / expectedFields.length) * 100);

  return {
    is_valid: errors.length === 0,
    field_results: fieldResults,
    overall_errors: errors,
    overall_warnings: warnings,
    completeness_score: completenessScore
  };
}

/**
 * 日期格式标准化
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';

  // 处理中文日期格式 "2025年03月11日"
  let cleaned = dateStr.replace(/[年月日]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');

  // 处理其他可能的分隔符
  cleaned = cleaned.replace(/[/\\.]/g, '-');

  try {
    const date = new Date(cleaned);
    if (isNaN(date.getTime())) {
      return dateStr; // 无法解析时返回原值
    }
    return date.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}