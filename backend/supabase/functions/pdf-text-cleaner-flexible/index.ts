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

console.log("🧹 PDF文本智能清洗服务启动 (灵活LLM配置)");

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
      llm_model,
      custom_prompt
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
      model,
      customPrompt: custom_prompt
    });
    const llmTime = Date.now() - llmStartTime;
    
    // 字段验证
    const validation = validateExtractedFields(llmResult.fields);
    
    const result = {
      success: true,
      method: "LLM_EXTRACTION_FLEXIBLE",
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
 * 获取默认的提取prompt
 */
function getDefaultPrompt(text: string): string {
  return `你是专业的发票信息提取专家。从以下PDF文本中提取发票关键字段，支持多种发票类型（普通发票、火车票、机票等）。

【原始文本】
${text}

【输出格式】
直接返回JSON，不要添加任何解释文字或markdown标记：

{
  "fields": {
    "common": {
      "invoice_number": "发票号码/票据号码",
      "invoice_date": "YYYY-MM-DD格式日期", 
      "seller_name": "销售方/出票方名称",
      "buyer_name": "购买方/乘客姓名",
      "total_amount": 数字金额,
      "total_amount_chinese": "大写金额",
      "tax_amount": 税额数字,
      "tax_rate": 税率数字,
      "goods_name": "商品/服务/交通工具名称",
      "invoice_type": "发票类型",
      "seller_tax_number": "销售方税号",
      "buyer_tax_number": "购买方税号"
    },
    "train_ticket": {
      "train_number": "车次号(如G1234)",
      "departure_station": "出发站",
      "arrival_station": "到达站", 
      "departure_time": "发车时间(YYYY-MM-DD HH:MM)",
      "arrival_time": "到达时间(YYYY-MM-DD HH:MM)",
      "seat_type": "座位类型(如二等座、一等座)",
      "car_number": "车厢号",
      "seat_number": "座位号",
      "passenger_name": "乘车人姓名",
      "id_number": "身份证号(后4位)"
    },
    "flight_ticket": {
      "flight_number": "航班号(如CA1234)",
      "departure_airport": "出发机场",
      "arrival_airport": "到达机场",
      "departure_city": "出发城市",
      "arrival_city": "到达城市", 
      "departure_time": "起飞时间(YYYY-MM-DD HH:MM)",
      "arrival_time": "到达时间(YYYY-MM-DD HH:MM)",
      "cabin_class": "舱位类型(如经济舱、商务舱)",
      "seat_number": "座位号",
      "passenger_name": "乘机人姓名",
      "id_number": "身份证号(后4位)",
      "ticket_number": "电子客票号"
    }
  },
  "confidence": {
    "overall": 0.95,
    "field_confidence": {
      "common.invoice_number": 0.99,
      "common.seller_name": 0.95,
      "train_ticket.train_number": 0.90
    }
  }
}

【提取规则】
1. **通用字段(common)**: 所有发票类型都需要填写
2. **火车票专用字段(train_ticket)**: 仅当识别为火车票时填写
3. **机票专用字段(flight_ticket)**: 仅当识别为机票时填写  
4. **发票类型识别**:
   - 火车票: 包含车次、车站信息
   - 机票: 包含航班号、机场信息
   - 普通发票: 其他商业发票
5. **数据格式**:
   - 日期: "2025年07月26日"→"2025-07-26"
   - 时间: "14:30"→"2025-07-26 14:30"
   - 金额: "¥377.00"→377.00
   - 车次: "G1234"、航班号: "CA1234"
6. **火车票识别关键词**: 车次、站台、铁路、12306
7. **机票识别关键词**: 航班、机场、航空、登机
8. 只返回JSON格式，不要添加解释文字`;
}

/**
 * 使用LLM提取字段信息
 */
async function extractFieldsWithLLM(text: string, config: {
  apiKey: string;
  apiBase: string;
  model: string;
  customPrompt?: string;
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
  
  // 使用自定义prompt或默认prompt
  const prompt = config.customPrompt ? 
    config.customPrompt.replace('${text}', text) : 
    getDefaultPrompt(text);

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
 * 清理和标准化LLM提取的字段
 */
function cleanLLMFields(fields: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === '') {
      continue; // 跳过空值
    }
    
    // 数字字段处理
    if (['total_amount', 'amount', 'tax_amount', 'unit_price', 'quantity', 'tax_rate'].includes(key)) {
      const numValue = typeof value === 'string' ? 
        parseFloat(value.replace(/[^0-9.-]/g, '')) : 
        parseFloat(value);
      if (!isNaN(numValue)) {
        cleaned[key] = numValue;
      }
    }
    // 日期字段处理
    else if (key === 'invoice_date') {
      cleaned[key] = normalizeDateField(value);
    }
    // 字符串字段处理
    else {
      const strValue = String(value).trim();
      if (strValue.length > 0) {
        cleaned[key] = strValue;
      }
    }
  }
  
  return cleaned;
}

/**
 * 日期字段标准化
 */
function normalizeDateField(dateStr: string): string {
  if (!dateStr) return '';
  
  // 处理中文日期格式
  const chineseMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (chineseMatch) {
    const [, year, month, day] = chineseMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // 处理标准日期格式
  const standardMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (standardMatch) {
    const [, year, month, day] = standardMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return dateStr;
}

/**
 * 字段验证
 */
function validateExtractedFields(fields: Record<string, any>): {
  is_valid: boolean;
  completeness_score: number;
  missing_fields: string[];
  field_issues: Record<string, string[]>;
} {
  const requiredFields = ['invoice_number', 'invoice_date', 'seller_name', 'total_amount'];
  const missingFields = requiredFields.filter(field => !fields[field]);
  
  const fieldIssues: Record<string, string[]> = {};
  
  // 发票号码验证
  if (fields.invoice_number && !/^\d{15,}$/.test(fields.invoice_number)) {
    fieldIssues.invoice_number = ['发票号码格式可能不正确'];
  }
  
  // 日期验证
  if (fields.invoice_date && !/^\d{4}-\d{2}-\d{2}$/.test(fields.invoice_date)) {
    fieldIssues.invoice_date = ['日期格式可能不正确'];
  }
  
  // 金额验证
  if (fields.total_amount && (typeof fields.total_amount !== 'number' || fields.total_amount <= 0)) {
    fieldIssues.total_amount = ['金额必须为正数'];
  }

  const allPossibleFields = ['invoice_number', 'invoice_date', 'seller_name', 'buyer_name', 'total_amount', 'tax_amount', 'goods_name'];
  const extractedFieldsCount = allPossibleFields.filter(field => fields[field]).length;
  const completenessScore = Math.round((extractedFieldsCount / allPossibleFields.length) * 100);

  return {
    is_valid: missingFields.length === 0 && Object.keys(fieldIssues).length === 0,
    completeness_score: completenessScore,
    missing_fields: missingFields,
    field_issues: fieldIssues
  };
}