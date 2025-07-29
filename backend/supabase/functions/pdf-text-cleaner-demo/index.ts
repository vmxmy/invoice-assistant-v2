import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, X-User-ID, x-user-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

console.log("🧹 PDF文本智能清洗演示服务启动 (LLM模拟)");

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
    console.log("🧹 开始处理PDF文本智能清洗请求 (演示模式)");
    
    const { extracted_text, file_name } = await req.json();
    
    if (!extracted_text) {
      throw new Error("缺少extracted_text参数");
    }

    console.log("📝 输入文本长度:", extracted_text.length);
    console.log("📝 文件名:", file_name || "未提供");

    // 模拟LLM进行智能文本提取
    const llmStartTime = Date.now();
    const llmResult = await simulateLLMExtraction(extracted_text);
    const llmTime = Date.now() - llmStartTime;
    
    // 字段验证
    const validation = validateExtractedFields(llmResult.fields);
    
    const result = {
      success: true,
      method: "LLM_SIMULATION",
      input_info: {
        file_name: file_name || "unknown.pdf",
        original_text_length: extracted_text.length,
        llm_processing_time: llmTime
      },
      extracted_fields: llmResult.fields,
      field_confidence: llmResult.confidence,
      validation,
      llm_info: {
        model: "simulated-gpt-4o-mini",
        processing_time: llmTime,
        tokens_estimated: Math.ceil(extracted_text.length / 4)
      },
      processing_steps: llmResult.processing_steps,
      demo_note: "这是演示版本，使用智能算法模拟LLM提取效果",
      timestamp: new Date().toISOString()
    };

    console.log("✅ PDF文本智能清洗完成 (演示):", {
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
 * 模拟LLM智能提取 - 使用高级算法模拟LLM的智能判断
 */
async function simulateLLMExtraction(text: string): Promise<{
  fields: Record<string, any>;
  confidence: Record<string, number>;
  processing_steps: string[];
}> {
  console.log("🤖 模拟LLM进行智能字段提取...");
  
  // 模拟处理延迟
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const fields: Record<string, any> = {};
  const confidence: Record<string, number> = {};
  
  // 智能发票号码提取
  const invoiceNumberMatches = text.match(/\d{18,25}/g);
  if (invoiceNumberMatches) {
    fields.invoice_number = invoiceNumberMatches[0];
    confidence.invoice_number = 0.95;
  }
  
  // 智能日期提取和标准化
  const dateMatches = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (dateMatches) {
    const [, year, month, day] = dateMatches;
    fields.invoice_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    confidence.invoice_date = 0.98;
  }
  
  // 智能公司名称提取 - 在上下文中查找
  const companyPattern = /([^发票\s]{4,20}(?:公司|企业|商店|店|厂|部|科技|服务|管理|贸易|有限))/g;
  const companyMatches = Array.from(text.matchAll(companyPattern));
  if (companyMatches.length >= 2) {
    // 销售方通常在前面
    fields.seller_name = companyMatches[0][1];
    confidence.seller_name = 0.90;
    
    // 购买方通常在后面
    fields.buyer_name = companyMatches[1][1];
    confidence.buyer_name = 0.85;
  } else if (companyMatches.length === 1) {
    fields.seller_name = companyMatches[0][1];
    confidence.seller_name = 0.80;
  }
  
  // 智能金额提取 - 识别价税合计
  const amountPattern = /¥\s*([0-9,]+\.?\d*)/g;
  const amountMatches = Array.from(text.matchAll(amountPattern));
  if (amountMatches.length > 0) {
    // 选择最大的金额作为总金额
    const amounts = amountMatches.map(match => parseFloat(match[1].replace(/,/g, '')));
    amounts.sort((a, b) => b - a);
    fields.total_amount = amounts[0];
    confidence.total_amount = 0.92;
    
    // 如果有多个金额，较小的可能是税额
    if (amounts.length > 1 && amounts[1] < amounts[0] * 0.2) {
      fields.tax_amount = amounts[1];
      confidence.tax_amount = 0.85;
    }
  }
  
  // 智能大写金额提取
  const chineseAmountMatch = text.match(/(.*圆整)/);
  if (chineseAmountMatch) {
    fields.total_amount_chinese = chineseAmountMatch[1];
    confidence.total_amount_chinese = 0.90;
  }
  
  // 智能统一社会信用代码提取
  const taxNumberPattern = /([A-Z0-9]{15,18})/g;
  const taxNumberMatches = Array.from(text.matchAll(taxNumberPattern));
  if (taxNumberMatches.length > 0) {
    fields.seller_tax_number = taxNumberMatches[0][1];
    confidence.seller_tax_number = 0.95;
    
    if (taxNumberMatches.length > 1) {
      fields.buyer_tax_number = taxNumberMatches[1][1];
      confidence.buyer_tax_number = 0.90;
    }
  }
  
  // 智能商品服务名称提取
  const goodsPattern = /\*([^*]+)\*/;
  const goodsMatch = text.match(goodsPattern);
  if (goodsMatch) {
    fields.goods_name = goodsMatch[1];
    confidence.goods_name = 0.88;
  }
  
  // 智能发票类型识别
  if (text.includes('电子发票')) {
    if (text.includes('普通发票')) {
      fields.invoice_type = '电子普通发票';
    } else if (text.includes('专用发票')) {
      fields.invoice_type = '电子专用发票';
    } else {
      fields.invoice_type = '电子发票';
    }
    confidence.invoice_type = 0.95;
  } else if (text.includes('增值税发票')) {
    fields.invoice_type = '增值税发票';
    confidence.invoice_type = 0.90;
  } else {
    fields.invoice_type = '普通发票';
    confidence.invoice_type = 0.70;
  }
  
  // 智能税率提取
  const taxRateMatch = text.match(/(\d+)%/);
  if (taxRateMatch) {
    fields.tax_rate = parseFloat(taxRateMatch[1]);
    confidence.tax_rate = 0.85;
  }
  
  return {
    fields,
    confidence,
    processing_steps: [
      "智能算法模拟: simulated-gpt-4o-mini",
      `字段提取: ${Object.keys(fields).length}个字段`,
      "多模式匹配: 发票号码、日期、公司名称",
      "上下文分析: 销售方/购买方识别",
      "金额层次分析: 总金额/税额分离",
      `整体置信度: ${Math.round(Object.values(confidence).reduce((a, b) => a + b, 0) / Object.keys(confidence).length * 100)}%`
    ]
  };
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

  const allPossibleFields = ['invoice_number', 'invoice_date', 'seller_name', 'buyer_name', 'total_amount', 'tax_amount', 'goods_name', 'invoice_type'];
  const extractedFieldsCount = allPossibleFields.filter(field => fields[field]).length;
  const completenessScore = Math.round((extractedFieldsCount / allPossibleFields.length) * 100);

  return {
    is_valid: missingFields.length === 0 && Object.keys(fieldIssues).length === 0,
    completeness_score: completenessScore,
    missing_fields: missingFields,
    field_issues: fieldIssues
  };
}