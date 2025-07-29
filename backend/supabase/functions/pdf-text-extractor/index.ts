import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { resolvePDFJS } from "https://esm.sh/pdfjs-serverless@0.4.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, X-User-ID, x-user-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

console.log("🚀 PDF文本提取服务启动");

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

  const startTime = Date.now();
  
  try {
    console.log("📋 开始处理PDF文本提取请求");
    
    // 检查Content-Type来决定处理方式
    const contentType = req.headers.get("content-type") || "";
    let pdfData: Uint8Array;
    let fileName = "unknown.pdf";
    let fileSize = 0;
    let inputMode = "";

    if (contentType.includes("application/json")) {
      // URL模式：从JSON中获取PDF URL
      const { pdfUrl } = await req.json();
      
      if (!pdfUrl) {
        throw new Error("缺少pdfUrl参数");
      }

      console.log("🔗 URL模式 - 获取PDF:", pdfUrl);
      inputMode = "URL";
      
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`获取PDF失败: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      pdfData = new Uint8Array(arrayBuffer);
      fileSize = pdfData.length;
      
      // 尝试从URL中提取文件名
      try {
        const url = new URL(pdfUrl);
        const pathParts = url.pathname.split('/');
        fileName = pathParts[pathParts.length - 1] || "url-pdf.pdf";
      } catch {
        fileName = "url-pdf.pdf";
      }
      
    } else if (contentType.includes("multipart/form-data")) {
      // 文件上传模式
      console.log("📁 文件上传模式");
      inputMode = "FILE_UPLOAD";
      
      const formData = await req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        throw new Error("未找到上传的文件");
      }
      
      if (file.type !== 'application/pdf') {
        throw new Error(`不支持的文件类型: ${file.type}，只支持PDF文件`);
      }
      
      fileName = file.name;
      fileSize = file.size;
      
      const arrayBuffer = await file.arrayBuffer();
      pdfData = new Uint8Array(arrayBuffer);
      
    } else {
      throw new Error("不支持的Content-Type，请使用application/json或multipart/form-data");
    }

    console.log("📄 文件信息:", {
      name: fileName,
      size: `${(fileSize / 1024).toFixed(1)}KB`,
      mode: inputMode
    });

    // 步骤1: 初始化PDF.js
    console.log("🔧 初始化PDF.js库...");
    const pdfInitTime = Date.now();
    const { getDocument } = await resolvePDFJS();
    const pdfInitDuration = Date.now() - pdfInitTime;

    // 步骤2: 加载PDF文档
    console.log("📖 加载PDF文档...");
    const loadStartTime = Date.now();
    const doc = await getDocument({ 
      data: pdfData, 
      useSystemFonts: true 
    }).promise;
    const loadDuration = Date.now() - loadStartTime;

    const numPages = doc.numPages;
    console.log(`📑 PDF包含 ${numPages} 页`);

    // 步骤3: 逐页提取文本
    console.log("🔍 开始提取文本内容...");
    const extractStartTime = Date.now();
    const allText: string[] = [];
    const pageStats: Array<{page: number, textLength: number, extractTime: number}> = [];

    for (let i = 1; i <= numPages; i++) {
      const pageStartTime = Date.now();
      console.log(`  处理第 ${i}/${numPages} 页...`);
      
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      
      allText.push(pageText);
      
      const pageTime = Date.now() - pageStartTime;
      pageStats.push({
        page: i,
        textLength: pageText.length,
        extractTime: pageTime
      });
      
      console.log(`    第${i}页: ${pageText.length}字符, 耗时${pageTime}ms`);
    }

    const extractDuration = Date.now() - extractStartTime;
    const combinedText = allText.join("\n");
    const totalTime = Date.now() - startTime;

    // 构建响应结果
    const result = {
      success: true,
      input_mode: inputMode,
      file_info: {
        name: fileName,
        size_bytes: fileSize,
        size_kb: Math.round(fileSize / 1024 * 10) / 10
      },
      pdf_info: {
        total_pages: numPages,
        page_stats: pageStats
      },
      extracted_text: combinedText,
      performance: {
        total_time_ms: totalTime,
        pdf_init_time_ms: pdfInitDuration,
        pdf_load_time_ms: loadDuration,
        text_extract_time_ms: extractDuration,
        avg_time_per_page_ms: Math.round(extractDuration / numPages)
      },
      processing_steps: [
        `文件解析: 完成 (${fileName}, ${(fileSize/1024).toFixed(1)}KB)`,
        `PDF初始化: 完成 (${pdfInitDuration}ms)`,
        `文档加载: 完成 (${loadDuration}ms, ${numPages}页)`,
        `文本提取: 完成 (${extractDuration}ms, ${combinedText.length}字符)`
      ],
      timestamp: new Date().toISOString()
    };

    console.log("✅ PDF文本提取完成:", {
      pages: numPages,
      text_length: combinedText.length,
      total_time: totalTime + "ms"
    });

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("❌ PDF文本提取失败:", error);
    
    const errorResult = {
      success: false,
      error: error.message,
      input_mode: "",
      processing_steps: [`处理失败: ${error.message}`],
      performance: {
        total_time_ms: Date.now() - startTime,
        error_time_ms: Date.now() - startTime
      },
      debug: {
        error_type: error.constructor.name,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});

