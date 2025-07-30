import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PipedreamRequest {
  file: {
    name: string;
    content: string; // Base64
    type: string;
  };
  metadata: {
    source: string;
    email_subject?: string;
    email_from?: string;
    received_at?: string;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { file, metadata }: PipedreamRequest = await req.json();
    
    if (!file || !file.content || !file.name) {
      return new Response(
        JSON.stringify({ error: 'Missing required file data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing file from Pipedream: ${file.name}`);
    console.log(`Email metadata:`, metadata);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Decode Base64 content
    const pdfBuffer = Uint8Array.from(atob(file.content), c => c.charCodeAt(0));
    
    // Upload to Supabase Storage
    const fileName = `pipedream/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        metadata: {
          source: 'pipedream',
          originalName: file.name,
          ...metadata
        }
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Call OCR processing (使用阿里云OCR或其他OCR服务)
    const ocrResult = await processWithOCR(pdfBuffer);
    
    // Extract invoice data using LLM
    const extractedData = await extractInvoiceData(ocrResult.text);

    // Save to database
    const { data: invoiceData, error: dbError } = await supabase
      .from('invoices')
      .insert({
        file_name: file.name,
        file_path: uploadData.path,
        file_size: pdfBuffer.length,
        source: 'pipedream_email',
        email_subject: metadata.email_subject,
        email_from: metadata.email_from,
        received_at: metadata.received_at,
        // OCR 提取的发票字段
        seller_name: extractedData.seller_name,
        invoice_number: extractedData.invoice_number,
        invoice_date: extractedData.invoice_date,
        total_amount: extractedData.total_amount,
        tax_amount: extractedData.tax_amount,
        // 原始数据
        ocr_raw_text: ocrResult.text,
        extraction_data: extractedData,
        processing_status: 'completed'
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`Successfully processed: ${file.name}, Invoice ID: ${invoiceData.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invoice processed successfully',
        data: {
          invoice_id: invoiceData.id,
          file_path: uploadData.path,
          extracted_data: extractedData
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Processing error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// OCR 处理函数
async function processWithOCR(pdfBuffer: Uint8Array) {
  // 这里可以集成阿里云OCR或其他OCR服务
  // 示例：调用现有的OCR Edge Function
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ocr-recognizer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_data: Array.from(pdfBuffer)
    })
  });
  
  if (!response.ok) {
    throw new Error(`OCR failed: ${response.statusText}`);
  }
  
  return await response.json();
}

// LLM 数据提取函数
async function extractInvoiceData(ocrText: string) {
  // 调用 LLM 提取结构化数据
  const prompt = `请从以下OCR文本中提取发票信息，返回JSON格式：
${ocrText}

请提取以下字段：
- seller_name: 销售方名称
- invoice_number: 发票号码  
- invoice_date: 开票日期(YYYY-MM-DD格式)
- total_amount: 价税合计金额(数字)
- tax_amount: 税额(数字)
- buyer_name: 购买方名称
- goods_services: 货物或应税劳务名称

返回JSON格式，如果某个字段无法提取则设为null。`;

  // 这里调用您的LLM服务
  const llmResponse = await fetch('您的LLM_API_ENDPOINT', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('LLM_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    })
  });
  
  const llmResult = await llmResponse.json();
  return JSON.parse(llmResult.choices[0].message.content);
}