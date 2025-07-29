import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, X-User-ID, x-user-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// 默认LLM配置
const DEFAULT_LLM_API_KEY = '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';
const DEFAULT_LLM_API_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_LLM_MODEL = 'anthropic/claude-3.5-sonnet';

console.log("🧹 PDF文本智能清洗服务启动 (LLM驱动)");

Deno.serve(async (req: Request) => {
  // 处理CORS预检请求
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "只支持POST请求" }), 
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  try {
    console.log("🧹 开始处理PDF文本智能清洗请求");
    
    const { 
      extracted_text, 
      file_name,
      llm_api_key,
      llm_api_base,
      llm_model
    } = await req.json();
    
    if (!extracted_text) {
      throw new Error("缺少extracted_text参数");
    }

    // 使用传入的参数或默认配置
    const apiKey = llm_api_key || DEFAULT_LLM_API_KEY;
    const apiBase = llm_api_base || DEFAULT_LLM_API_BASE;
    const model = llm_model || DEFAULT_LLM_MODEL;

    if (!apiKey) {
      throw new Error("LLM API密钥未提供");
    }

    console.log("📝 输入文本长度:", extracted_text.length);
    console.log("📝 文件名:", file_name || "未提供");
    console.log("🤖 使用模型:", model);
    console.log("🌐 API端点:", apiBase);

    // 使用LLM进行智能文本提取
    const llmStartTime = Date.now();
    const llmResult = await extractFieldsWithLLM(extracted_text, {
      apiKey,
      apiBase, 
      model
    });
    const llmTime = Date.now() - llmStartTime;
    
    // 字段验证
    const validation = validateExtractedFields(llmResult.fields);
    
    const result = {
      success: true,
      method: "LLM_EXTRACTION",
      input_info: {
        file_name: file_name || "unknown.pdf",
        original_text_length: extracted_text.length,
        llm_processing_time: llmTime
      },
      extracted_fields: llmResult.fields,
      field_confidence: llmResult.confidence,
      validation,
      llm_info: {
        model: model,
        api_base: apiBase,
        processing_time: llmTime,
        tokens_estimated: Math.ceil(extracted_text.length / 4)
      },
      processing_steps: llmResult.processing_steps,
      timestamp: new Date().toISOString()
    };

    console.log("✅ PDF文本智能清洗完成:", {
      extracted_fields: Object.keys(llmResult.fields).length,
      validation_score: validation.completeness_score,
      llm_time: llmTime + "ms"
    });

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("❌ PDF文本清洗失败:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});

/**
 * 使用LLM提取字段信息
 */
async function extractFieldsWithLLM(text: string, config: {
  apiKey: string;
  apiBase: string;
  model: string;
}): Promise<{
  fields: Record<string, any>;
  confidence: Record<string, number>;
  processing_steps: string[];
}> {
  console.log("🤖 调用LLM进行智能字段提取...");
  console.log("🔧 配置:", {
    model: config.model,
    apiBase: config.apiBase,
    apiKeyPrefix: config.apiKey.substring(0, 12) + "..."
  });
  
  const prompt = `你是一个专业的发票信息提取专家。请从以下PDF提取的原始文本中，准确提取发票的关键字段信息。

【原始文本】
${text}

【提取要求】
请严格按照以下JSON格式返回提取结果，确保返回的是有效的JSON格式：

{
  "fields": {
    "common": {
      "invoice_number": "发票号码/票据号码(字符串)",
      "invoice_code": "发票代码(字符串，如果有)",
      "invoice_date": "开票日期/消费日期(YYYY-MM-DD格式)",
      "invoice_type": "发票类型(如：增值税发票、火车票、机票、出租车票等)",
      "seller_name": "销售方名称/出票方(字符串)",
      "seller_tax_number": "销售方统一社会信用代码(字符串，如果有)",
      "buyer_name": "购买方名称/乘车人/乘机人(字符串，如果有)",
      "buyer_tax_number": "购买方统一社会信用代码(字符串，如果有)",
      "total_amount": 2080.00,
      "total_amount_chinese": "价税合计大写金额(字符串，如果有)",
      "amount": 1980.00,
      "tax_amount": 100.00,
      "tax_rate": 13,
      "goods_name": "主要商品/服务名称(字符串)",
      "specification": "规格型号(字符串，如果有)",
      "unit": "计量单位(字符串，如果有)",
      "quantity": 1,
      "unit_price": 1980.00,
      "remark": "备注信息(字符串，如果有)"
    },
    "train_ticket": {
      "train_number": "车次号(如：G1234)",
      "departure_station": "出发站",
      "arrival_station": "到达站",
      "departure_time": "发车时间(YYYY-MM-DD HH:MM格式)",
      "arrival_time": "到达时间(YYYY-MM-DD HH:MM格式，如果有)",
      "seat_type": "座位类型(如：二等座、一等座、商务座)",
      "car_number": "车厢号",
      "seat_number": "座位号",
      "passenger_name": "乘车人姓名",
      "id_number": "身份证号(后4位或全部，如果有)"
    },
    "flight_ticket": {
      "flight_number": "航班号(如：CA1234)",
      "departure_airport": "出发机场",
      "arrival_airport": "到达机场",
      "departure_city": "出发城市",
      "arrival_city": "到达城市",
      "departure_time": "起飞时间(YYYY-MM-DD HH:MM格式)",
      "arrival_time": "到达时间(YYYY-MM-DD HH:MM格式，如果有)",
      "cabin_class": "舱位类型(如：经济舱、商务舱、头等舱)",
      "seat_number": "座位号",
      "passenger_name": "乘机人姓名",
      "id_number": "身份证号(后4位或全部，如果有)",
      "ticket_number": "电子客票号"
    },
    "taxi_ticket": {
      "license_plate": "车牌号",
      "start_time": "上车时间(YYYY-MM-DD HH:MM格式)",
      "end_time": "下车时间(YYYY-MM-DD HH:MM格式)",
      "distance": "行驶里程(公里)",
      "start_location": "上车地点",
      "end_location": "下车地点",
      "driver_name": "司机姓名",
      "fuel_surcharge": "燃油附加费"
    },
    "bus_ticket": {
      "bus_number": "班次号",
      "departure_station": "出发站",
      "arrival_station": "到达站",
      "departure_time": "发车时间(YYYY-MM-DD HH:MM格式)",
      "seat_number": "座位号",
      "passenger_name": "乘车人姓名"
    },
    "hotel_receipt": {
      "hotel_name": "酒店名称",
      "check_in_date": "入住日期(YYYY-MM-DD格式)",
      "check_out_date": "退房日期(YYYY-MM-DD格式)",
      "room_number": "房间号",
      "room_type": "房间类型",
      "nights": "入住天数",
      "guest_name": "入住人姓名"
    },
    "vat_invoice": {
      "invoice_details": [
        {
          "goods_name": "商品名称",
          "specification": "规格型号",
          "unit": "单位",
          "quantity": 1,
          "unit_price": 100.00,
          "amount": 100.00,
          "tax_rate": 13,
          "tax_amount": 13.00
        }
      ],
      "drawer": "开票人",
      "reviewer": "复核人",
      "payee": "收款人"
    }
  },
  "confidence": {
    "overall": 0.95,
    "field_confidence": {
      "common.invoice_number": 0.99,
      "common.invoice_date": 0.95,
      "common.seller_name": 0.90
    }
  }
}

【提取规则】
1. **通用字段(common)**：所有发票类型都需要填写，包含发票基本信息
2. **专用字段**：根据发票类型只填写对应的专用字段组，其他组设为null或省略
   - 增值税发票/普通发票 → 填写 vat_invoice
   - 火车票 → 填写 train_ticket
   - 机票 → 填写 flight_ticket
   - 出租车票 → 填写 taxi_ticket
   - 客运车票 → 填写 bus_ticket
   - 酒店账单 → 填写 hotel_receipt
3. **数据格式要求**：
   - 日期格式：YYYY-MM-DD，时间格式：YYYY-MM-DD HH:MM
   - 金额字段使用数字类型，去除货币符号和千分位符号
   - 如果某个字段不存在，设为null
   - 置信度范围0.0-1.0，使用字段路径如"common.invoice_number"
4. **发票类型识别**：
   - 根据文本内容自动识别发票类型
   - 在common.invoice_type中标明具体类型
5. 必须返回有效的JSON格式，不要添加markdown代码块
6. 只填写文本中实际存在的信息，不要编造数据`;

  try {
    const response = await fetch(`${config.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://supabase.co',
        'X-Title': 'Invoice PDF Text Cleaner'
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API调用失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('LLM返回内容为空');
    }

    console.log("🤖 LLM原始响应:", content);
    
    // 清理和解析LLM返回的JSON
    let cleanedContent = content.trim();
    
    // 移除可能的markdown代码块标记
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // 尝试解析JSON
    const parsedResult = JSON.parse(cleanedContent);
    
    // 数据清理和标准化
    const cleanedFields = cleanLLMFields(parsedResult.fields || {});
    const fieldConfidence = parsedResult.confidence?.field_confidence || {};
    
    return {
      fields: cleanedFields,
      confidence: fieldConfidence,
      processing_steps: [
        `LLM模型: ${config.model}`,
        `API端点: ${config.apiBase}`,
        `字段提取: ${Object.keys(cleanedFields).length}个字段`,
        `整体置信度: ${(parsedResult.confidence?.overall || 0.8) * 100}%`
      ]
    };

  } catch (error) {
    console.error("❌ LLM字段提取失败:", error);
    throw new Error(`LLM字段提取失败: ${error.message}`);
  }
}

/**
 * 清理和标准化LLM提取的字段 - 支持嵌套结构
 */
function cleanLLMFields(fields: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === '') {
      continue; // 跳过空值
    }
    
    // 处理嵌套对象（如common, train_ticket等）
    if (typeof value === 'object' && !Array.isArray(value)) {
      const cleanedNested = cleanNestedFields(value, key);
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      }
    }
    // 处理数组（如invoice_details）
    else if (Array.isArray(value)) {
      const cleanedArray = value.map(item => 
        typeof item === 'object' ? cleanNestedFields(item, key) : item
      ).filter(item => item !== null);
      if (cleanedArray.length > 0) {
        cleaned[key] = cleanedArray;
      }
    }
    // 处理基本字段
    else {
      const cleanedValue = cleanFieldValue(key, value);
      if (cleanedValue !== null) {
        cleaned[key] = cleanedValue;
      }
    }
  }
  
  return cleaned;
}

/**
 * 清理嵌套字段
 */
function cleanNestedFields(obj: Record<string, any>, parentKey: string): Record<string, any> {
  const cleaned: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    
    const cleanedValue = cleanFieldValue(key, value, parentKey);
    if (cleanedValue !== null) {
      cleaned[key] = cleanedValue;
    }
  }
  
  return cleaned;
}

/**
 * 清理单个字段值
 */
function cleanFieldValue(fieldName: string, value: any, parentKey?: string): any {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // 数字字段处理
  const numericFields = [
    'total_amount', 'amount', 'tax_amount', 'unit_price', 'quantity', 'tax_rate',
    'distance', 'nights', 'fuel_surcharge', 'car_number'
  ];
  
  if (numericFields.includes(fieldName)) {
    const numValue = typeof value === 'string' ? 
      parseFloat(value.replace(/[^0-9.-]/g, '')) : 
      parseFloat(value);
    return !isNaN(numValue) ? numValue : null;
  }
  
  // 日期字段处理
  const dateFields = [
    'invoice_date', 'departure_time', 'arrival_time', 'start_time', 'end_time',
    'check_in_date', 'check_out_date'
  ];
  
  if (dateFields.includes(fieldName)) {
    return normalizeDateTimeField(value);
  }
  
  // 字符串字段处理
  const strValue = String(value).trim();
  return strValue.length > 0 ? strValue : null;
}

/**
 * 日期时间字段标准化
 */
function normalizeDateTimeField(dateTimeStr: string): string {
  if (!dateTimeStr) return '';
  
  // 处理中文日期时间格式 "2025年07月26日 14:30"
  const chineseDateTimeMatch = dateTimeStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/);
  if (chineseDateTimeMatch) {
    const [, year, month, day, hour, minute] = chineseDateTimeMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute}`;
  }
  
  // 处理中文日期格式 "2025年07月26日"
  const chineseMatch = dateTimeStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (chineseMatch) {
    const [, year, month, day] = chineseMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // 处理标准日期时间格式 "2025-07-26 14:30"
  const standardDateTimeMatch = dateTimeStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (standardDateTimeMatch) {
    const [, year, month, day, hour, minute] = standardDateTimeMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute}`;
  }
  
  // 处理标准日期格式 "2025-07-26"
  const standardMatch = dateTimeStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (standardMatch) {
    const [, year, month, day] = standardMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // 处理时间格式 "14:30"
  const timeMatch = dateTimeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const [, hour, minute] = timeMatch;
    return `${hour.padStart(2, '0')}:${minute}`;
  }
  
  return dateTimeStr;
}

/**
 * 字段验证 - 支持嵌套结构
 */
function validateExtractedFields(fields: Record<string, any>): {
  is_valid: boolean;
  completeness_score: number;
  missing_fields: string[];
  field_issues: Record<string, string[]>;
  invoice_type: string;
} {
  const fieldIssues: Record<string, string[]> = {};
  const commonFields = fields.common || {};
  
  // 通用必填字段验证
  const requiredCommonFields = ['invoice_number', 'invoice_date', 'invoice_type', 'total_amount'];
  const missingFields = requiredCommonFields.filter(field => !commonFields[field]);
  
  // 发票号码验证
  if (commonFields.invoice_number && !/^\d{8,}$/.test(commonFields.invoice_number)) {
    fieldIssues['common.invoice_number'] = ['发票号码格式可能不正确'];
  }
  
  // 日期验证
  if (commonFields.invoice_date && !/^\d{4}-\d{2}-\d{2}/.test(commonFields.invoice_date)) {
    fieldIssues['common.invoice_date'] = ['日期格式可能不正确'];
  }
  
  // 金额验证
  if (commonFields.total_amount && (typeof commonFields.total_amount !== 'number' || commonFields.total_amount <= 0)) {
    fieldIssues['common.total_amount'] = ['金额必须为正数'];
  }
  
  // 获取发票类型
  const invoiceType = commonFields.invoice_type || '未知类型';
  
  // 根据发票类型验证专用字段
  let typeSpecificScore = 0;
  if (invoiceType.includes('火车票') && fields.train_ticket) {
    typeSpecificScore = validateTrainTicketFields(fields.train_ticket, fieldIssues);
  } else if (invoiceType.includes('机票') && fields.flight_ticket) {
    typeSpecificScore = validateFlightTicketFields(fields.flight_ticket, fieldIssues);
  } else if (invoiceType.includes('出租车') && fields.taxi_ticket) {
    typeSpecificScore = validateTaxiTicketFields(fields.taxi_ticket, fieldIssues);
  } else if ((invoiceType.includes('增值税') || invoiceType.includes('普通发票')) && fields.vat_invoice) {
    typeSpecificScore = validateVATInvoiceFields(fields.vat_invoice, fieldIssues);
  }
  
  // 计算完整性评分
  const commonFieldsCount = Object.keys(commonFields).length;
  const totalExpectedFields = 10; // 通用字段期望数量
  const completenessScore = Math.round(((commonFieldsCount + typeSpecificScore) / totalExpectedFields) * 100);

  return {
    is_valid: missingFields.length === 0 && Object.keys(fieldIssues).length === 0,
    completeness_score: Math.min(completenessScore, 100),
    missing_fields: missingFields.map(field => `common.${field}`),
    field_issues: fieldIssues,
    invoice_type: invoiceType
  };
}

/**
 * 火车票字段验证
 */
function validateTrainTicketFields(trainFields: Record<string, any>, issues: Record<string, string[]>): number {
  let score = 0;
  const expectedFields = ['train_number', 'departure_station', 'arrival_station', 'departure_time', 'seat_type'];
  
  expectedFields.forEach(field => {
    if (trainFields[field]) score += 1;
  });
  
  return score;
}

/**
 * 机票字段验证
 */
function validateFlightTicketFields(flightFields: Record<string, any>, issues: Record<string, string[]>): number {
  let score = 0;
  const expectedFields = ['flight_number', 'departure_airport', 'arrival_airport', 'departure_time', 'cabin_class'];
  
  expectedFields.forEach(field => {
    if (flightFields[field]) score += 1;
  });
  
  return score;
}

/**
 * 出租车票字段验证
 */
function validateTaxiTicketFields(taxiFields: Record<string, any>, issues: Record<string, string[]>): number {
  let score = 0;
  const expectedFields = ['license_plate', 'distance', 'start_time'];
  
  expectedFields.forEach(field => {
    if (taxiFields[field]) score += 1;
  });
  
  return score;
}

/**
 * 增值税发票字段验证
 */
function validateVATInvoiceFields(vatFields: Record<string, any>, issues: Record<string, string[]>): number {
  let score = 0;
  
  if (vatFields.drawer) score += 1;
  if (vatFields.invoice_details && Array.isArray(vatFields.invoice_details) && vatFields.invoice_details.length > 0) {
    score += 2;
  }
  
  return score;
}