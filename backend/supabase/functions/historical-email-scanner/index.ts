import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface HistoricalScanRequest {
  email_config: {
    user: string;
    password: string;
    host?: string;
    port?: number;
  };
  scan_config: {
    days_back?: number;
    max_emails?: number;
    keywords?: string[];
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email_config, scan_config }: HistoricalScanRequest = await req.json();
    
    console.log('开始历史邮件扫描...');
    console.log(`扫描配置: ${JSON.stringify(scan_config)}`);

    // 使用Deno的IMAP库连接邮箱
    const emails = await scanHistoricalEmails(email_config, scan_config);
    
    const results = [];
    let processedCount = 0;
    let successCount = 0;

    // 处理每封邮件的PDF附件
    for (const email of emails) {
      for (const attachment of email.pdfAttachments) {
        try {
          const result = await processInvoicePDF(attachment, email.metadata);
          results.push({
            email_subject: email.metadata.subject,
            filename: attachment.filename,
            success: true,
            invoice_id: result.invoice_id,
            extracted_data: result.extracted_data
          });
          successCount++;
          
        } catch (error) {
          console.error(`处理 ${attachment.filename} 失败:`, error);
          results.push({
            email_subject: email.metadata.subject,
            filename: attachment.filename,
            success: false,
            error: error.message
          });
        }
        processedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: '历史邮件扫描完成',
        stats: {
          total_emails: emails.length,
          total_pdfs: processedCount,
          successful_uploads: successCount,
          failed_uploads: processedCount - successCount,
          success_rate: processedCount > 0 ? (successCount / processedCount * 100).toFixed(2) + '%' : '0%'
        },
        results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('历史邮件扫描失败:', error);
    
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

// 扫描历史邮件
async function scanHistoricalEmails(emailConfig: any, scanConfig: any) {
  const daysBack = scanConfig.days_back || 30;
  const maxEmails = scanConfig.max_emails || 100;
  const keywords = scanConfig.keywords || ['发票', 'invoice', '發票'];
  
  // 这里需要使用适合Deno的IMAP库
  // 由于Deno环境限制，这里提供一个简化的实现框架
  
  console.log(`扫描最近 ${daysBack} 天的邮件，最多 ${maxEmails} 封`);
  
  // 实际实现需要使用Deno兼容的IMAP库
  // 例如：https://deno.land/x/imap
  
  // 模拟返回结构
  return [
    {
      metadata: {
        subject: "示例发票邮件",
        from: "sender@example.com", 
        date: new Date(),
        messageId: "example-message-id"
      },
      pdfAttachments: [
        {
          filename: "invoice.pdf",
          content: new Uint8Array(), // PDF内容
          contentType: "application/pdf"
        }
      ]
    }
  ];
}

// 处理PDF发票
async function processInvoicePDF(attachment: any, emailMetadata: any) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 上传文件到Storage
  const fileName = `historical/${Date.now()}-${attachment.filename}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('invoices')
    .upload(fileName, attachment.content, {
      contentType: attachment.contentType,
      metadata: {
        source: 'historical_scan',
        originalName: attachment.filename,
        ...emailMetadata
      }
    });

  if (uploadError) {
    throw new Error(`上传失败: ${uploadError.message}`);
  }

  // 调用OCR处理 - 这里可以调用现有的OCR函数
  const ocrResult = await processWithOCR(attachment.content);
  
  // 提取发票数据
  const extractedData = await extractInvoiceData(ocrResult.text);

  // 保存到数据库
  const { data: invoiceData, error: dbError } = await supabase
    .from('invoices')
    .insert({
      file_name: attachment.filename,
      file_path: uploadData.path,
      file_size: attachment.content.length,
      source: 'historical_email_scan',
      email_subject: emailMetadata.subject,
      email_from: emailMetadata.from,
      email_date: emailMetadata.date,
      // 提取的发票字段
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
    throw new Error(`数据库错误: ${dbError.message}`);
  }

  return {
    invoice_id: invoiceData.id,
    extracted_data: extractedData
  };
}

// OCR处理函数
async function processWithOCR(pdfContent: Uint8Array) {
  // 调用现有的OCR函数
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ocr-recognizer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_data: Array.from(pdfContent)
    })
  });
  
  if (!response.ok) {
    throw new Error(`OCR失败: ${response.statusText}`);
  }
  
  return await response.json();
}

// LLM数据提取
async function extractInvoiceData(ocrText: string) {
  // 使用现有的LLM提取逻辑
  const prompt = `请从以下OCR文本中提取发票信息，返回JSON格式：
${ocrText}

请提取以下字段：
- seller_name: 销售方名称
- invoice_number: 发票号码  
- invoice_date: 开票日期(YYYY-MM-DD格式)
- total_amount: 价税合计金额(数字)
- tax_amount: 税额(数字)

返回JSON格式，如果某个字段无法提取则设为null。`;

  // 这里调用您的LLM服务
  // 返回模拟数据
  return {
    seller_name: "示例公司",
    invoice_number: "12345678",
    invoice_date: "2024-01-01",
    total_amount: 1000.00,
    tax_amount: 130.00
  };
}