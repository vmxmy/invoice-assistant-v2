import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  // Handle CORS
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
    console.log('🚀 OCR最小版本启动');

    if (req.method !== 'POST') {
      throw new Error('只支持POST请求');
    }

    // 简单的测试响应
    return new Response(JSON.stringify({
      success: true,
      invoice_type: '增值税发票',
      fields: {
        invoice_number: '25442000000436367034',
        invoice_date: '2025-07-19',
        seller_name: '广州寿司郎餐饮有限公司',
        total_amount: 244.00
      },
      confidence: {
        overall: 0.99,
        fields: {
          invoice_number: 1.0,
          seller_name: 0.996
        }
      },
      validation: {
        is_valid: true,
        completeness_score: 90,
        overall_errors: [],
        overall_warnings: []
      },
      processing_steps: [
        '文件验证: 通过',
        'OCR识别: 增值税发票 (置信度: 99.0%)',
        '数据解析: 完成 (4个字段)',
        '字段验证: 通过 (完整性: 90%)'
      ],
      metadata: {
        total_processing_time: 1500,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ OCR最小版本错误:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});