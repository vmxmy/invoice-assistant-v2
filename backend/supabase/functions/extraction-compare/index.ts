import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, X-User-ID, x-user-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

console.log("🆚 PDF提取对比服务启动");

Deno.serve(async (req: Request) => {
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
    console.log("🆚 开始PDF提取对比分析");
    const startTime = Date.now();
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error("未找到上传的文件");
    }

    if (file.type !== 'application/pdf') {
      throw new Error(`不支持的文件类型: ${file.type}，只支持PDF文件`);
    }

    console.log("📄 文件信息:", {
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)}KB`
    });

    // 准备文件数据
    const fileBuffer = await file.arrayBuffer();
    const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });
    
    // 创建FormData for API calls
    const apiFormData = new FormData();
    apiFormData.append('file', fileBlob, file.name);

    console.log("🔄 并行调用PDF文本提取和OCR API...");
    
    // 并行调用两个服务
    const [pdfResult, ocrResult] = await Promise.allSettled([
      callPDFTextExtractor(apiFormData),
      callOCRProcessor(apiFormData)
    ]);

    const totalTime = Date.now() - startTime;

    // 构建对比结果
    const comparison = buildComparison(pdfResult, ocrResult, file.name, totalTime);

    console.log("✅ PDF提取对比完成:", {
      pdf_success: comparison.pdf_extraction.success,
      ocr_success: comparison.ocr_processing.success,
      total_time: totalTime
    });

    return new Response(JSON.stringify(comparison), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("❌ PDF提取对比失败:", error);
    
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
 * 调用PDF文本提取器
 */
async function callPDFTextExtractor(formData: FormData): Promise<any> {
  console.log("📝 调用PDF文本提取器...");
  
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/pdf-text-extractor`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`PDF文本提取失败: ${response.status}`);
  }

  return await response.json();
}

/**
 * 调用OCR处理器
 */
async function callOCRProcessor(formData: FormData): Promise<any> {
  console.log("🔍 调用OCR处理器...");
  
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ocr-complete-final`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`OCR处理失败: ${response.status}`);
  }

  return await response.json();
}

/**
 * 构建对比结果
 */
function buildComparison(pdfResult: PromiseSettledResult<any>, ocrResult: PromiseSettledResult<any>, fileName: string, totalTime: number) {
  const comparison = {
    success: true,
    file_info: {
      name: fileName,
      processing_time: totalTime
    },
    pdf_extraction: {
      success: false,
      data: null,
      error: null,
      extracted_fields: {},
      text_length: 0,
      processing_time: 0
    },
    ocr_processing: {
      success: false,
      data: null,
      error: null,
      extracted_fields: {},
      confidence_score: 0,
      processing_time: 0
    },
    field_comparison: {},
    performance_comparison: {},
    recommendation: "",
    timestamp: new Date().toISOString()
  };

  // 处理PDF提取结果
  if (pdfResult.status === 'fulfilled') {
    const pdfData = pdfResult.value;
    comparison.pdf_extraction.success = pdfData.success;
    comparison.pdf_extraction.data = pdfData;
    
    if (pdfData.success) {
      comparison.pdf_extraction.text_length = pdfData.extracted_text?.length || 0;
      comparison.pdf_extraction.processing_time = pdfData.performance?.total_time_ms || 0;
      
      // 使用文本清洗服务提取字段
      comparison.pdf_extraction.extracted_fields = extractFieldsFromText(pdfData.extracted_text || "");
    }
  } else {
    comparison.pdf_extraction.error = pdfResult.reason?.message || "PDF提取失败";
  }

  // 处理OCR结果
  if (ocrResult.status === 'fulfilled') {
    const ocrData = ocrResult.value;
    comparison.ocr_processing.success = ocrData.success;
    comparison.ocr_processing.data = ocrData;
    
    if (ocrData.success) {
      comparison.ocr_processing.extracted_fields = ocrData.fields || {};
      comparison.ocr_processing.confidence_score = ocrData.confidence?.overall || 0;
      comparison.ocr_processing.processing_time = ocrData.metadata?.total_processing_time || 0;
    }
  } else {
    comparison.ocr_processing.error = ocrResult.reason?.message || "OCR处理失败";
  }

  // 字段对比分析
  comparison.field_comparison = compareFields(
    comparison.pdf_extraction.extracted_fields,
    comparison.ocr_processing.extracted_fields
  );

  // 性能对比
  comparison.performance_comparison = {
    pdf_faster: comparison.pdf_extraction.processing_time < comparison.ocr_processing.processing_time,
    time_difference: Math.abs(comparison.pdf_extraction.processing_time - comparison.ocr_processing.processing_time),
    pdf_time: comparison.pdf_extraction.processing_time,
    ocr_time: comparison.ocr_processing.processing_time
  };

  // 生成推荐
  comparison.recommendation = generateRecommendation(comparison);

  return comparison;
}

/**
 * 从文本中提取字段（简化版）
 */
function extractFieldsFromText(text: string): Record<string, any> {
  const fields: Record<string, any> = {};
  
  // 发票号码
  const invoiceNumberMatch = text.match(/(\d{20,})/);
  if (invoiceNumberMatch) {
    fields.invoice_number = invoiceNumberMatch[1];
  }
  
  // 日期
  const dateMatch = text.match(/(\d{4}年\d{1,2}月\d{1,2}日)/);
  if (dateMatch) {
    const chineseDate = dateMatch[1];
    const match = chineseDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
      const [, year, month, day] = match;
      fields.invoice_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // 公司名称
  const companyMatch = text.match(/([^发票\s]{4,20}(?:公司|企业|商店|店|厂|部))/);
  if (companyMatch) {
    fields.seller_name = companyMatch[1];
  }
  
  // 金额
  const amountMatch = text.match(/¥\s*([0-9,]+\.?\d*)/);
  if (amountMatch) {
    fields.total_amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }
  
  return fields;
}

/**
 * 字段对比分析
 */
function compareFields(pdfFields: Record<string, any>, ocrFields: Record<string, any>) {
  const commonFields = ['invoice_number', 'invoice_date', 'seller_name', 'total_amount'];
  const comparison: Record<string, any> = {};
  
  for (const field of commonFields) {
    const pdfValue = pdfFields[field];
    const ocrValue = ocrFields[field];
    
    comparison[field] = {
      pdf_extracted: !!pdfValue,
      ocr_extracted: !!ocrValue,
      values_match: pdfValue === ocrValue,
      pdf_value: pdfValue,
      ocr_value: ocrValue,
      confidence: ocrFields[field] ? 'N/A' : 'N/A' // OCR confidence if available
    };
  }
  
  // 统计信息
  const pdfFieldCount = Object.keys(pdfFields).length;
  const ocrFieldCount = Object.keys(ocrFields).length;
  const matchingFields = commonFields.filter(field => comparison[field].values_match).length;
  
  comparison._summary = {
    pdf_field_count: pdfFieldCount,
    ocr_field_count: ocrFieldCount,
    matching_fields: matchingFields,
    total_compared: commonFields.length,
    match_rate: (matchingFields / commonFields.length * 100).toFixed(1) + '%'
  };
  
  return comparison;
}

/**
 * 生成推荐
 */
function generateRecommendation(comparison: any): string {
  const pdfSuccess = comparison.pdf_extraction.success;
  const ocrSuccess = comparison.ocr_processing.success;
  const matchRate = parseFloat(comparison.field_comparison._summary.match_rate);
  const timeDiff = comparison.performance_comparison.time_difference;
  
  if (!pdfSuccess && !ocrSuccess) {
    return "两种方法都失败了，建议检查文件格式或服务配置";
  }
  
  if (!pdfSuccess) {
    return "PDF文本提取失败，建议使用OCR方法";
  }
  
  if (!ocrSuccess) {
    return "OCR处理失败，建议使用PDF文本提取方法";
  }
  
  if (matchRate >= 80) {
    if (comparison.performance_comparison.pdf_faster) {
      return `字段匹配率${matchRate}%，PDF文本提取速度更快（快${timeDiff}ms），推荐优先使用PDF文本提取`;
    } else {
      return `字段匹配率${matchRate}%，OCR处理更准确，推荐使用OCR方法`;
    }
  } else if (matchRate >= 50) {
    return `字段匹配率${matchRate}%，两种方法存在差异，建议根据具体需求选择`;
  } else {
    return `字段匹配率${matchRate}%，差异较大，建议人工检查或优化提取算法`;
  }
}