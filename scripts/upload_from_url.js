/**
 * 从URL上传PDF到Supabase Edge Function
 */

async function uploadPDFFromURL(pdfUrl, supabaseConfig) {
  const { supabaseUrl, supabaseKey } = supabaseConfig;
  
  try {
    console.log(`📥 开始下载PDF: ${pdfUrl}`);
    
    // 1. 从URL下载PDF文件
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`下载PDF失败: ${response.status} ${response.statusText}`);
    }
    
    const pdfBuffer = await response.arrayBuffer();
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    
    // 从URL提取文件名
    const urlParts = pdfUrl.split('/');
    const fileName = urlParts[urlParts.length - 1] || `invoice_${Date.now()}.pdf`;
    
    // 2. 计算文件哈希（用于去重）
    console.log('🔢 计算文件哈希...');
    const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // 3. 准备FormData
    const formData = new FormData();
    formData.append('file', pdfBlob, fileName);
    formData.append('fileHash', fileHash);
    formData.append('fileSize', pdfBuffer.byteLength.toString());
    formData.append('fileName', fileName);
    formData.append('checkDeleted', 'true');
    
    console.log('📤 上传到Supabase Edge Function...');
    console.log(`文件名: ${fileName}`);
    console.log(`文件大小: ${(pdfBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
    console.log(`文件哈希: ${fileHash.substring(0, 16)}...`);
    
    // 4. 调用Edge Function
    const ocrResponse = await fetch(`${supabaseUrl}/functions/v1/ocr-dedup-complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        // 注意：不要设置Content-Type，让浏览器自动设置multipart/form-data
      },
      body: formData
    });
    
    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      throw new Error(`Edge Function调用失败: ${ocrResponse.status} ${errorText}`);
    }
    
    const result = await ocrResponse.json();
    
    console.log('✅ OCR处理完成');
    console.log(`成功: ${result.success}`);
    console.log(`发票类型: ${result.invoice_type || '未知'}`);
    console.log(`是否重复: ${result.isDuplicate || false}`);
    
    if (result.isDuplicate) {
      console.log('⚠️ 检测到重复文件');
      if (result.duplicateInfo) {
        console.log(`现有发票ID: ${result.duplicateInfo.existingInvoiceId}`);
        console.log(`上传次数: ${result.duplicateInfo.uploadCount}`);
      }
    }
    
    return {
      success: true,
      data: result,
      fileInfo: {
        originalUrl: pdfUrl,
        fileName: fileName,
        fileSize: pdfBuffer.byteLength,
        fileHash: fileHash
      }
    };
    
  } catch (error) {
    console.error('❌ 上传失败:', error);
    return {
      success: false,
      error: error.message,
      fileInfo: {
        originalUrl: pdfUrl
      }
    };
  }
}

// 使用示例
async function main() {
  const supabaseConfig = {
    supabaseUrl: 'https://sfenhhtvcyslxplvewmt.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'
  };
  
  // 替换为您的PDF文件URL
  const pdfUrl = 'https://example.com/path/to/invoice.pdf';
  
  const result = await uploadPDFFromURL(pdfUrl, supabaseConfig);
  
  if (result.success) {
    console.log('🎉 上传成功！');
    console.log('处理结果:', result.data);
  } else {
    console.log('💥 上传失败:', result.error);
  }
}

// Node.js环境下的实现（需要node-fetch和form-data）
if (typeof window === 'undefined') {
  // Node.js版本
  const fetch = require('node-fetch');
  const FormData = require('form-data');
  const crypto = require('crypto');
  
  async function uploadPDFFromURLNode(pdfUrl, supabaseConfig) {
    const { supabaseUrl, supabaseKey } = supabaseConfig;
    
    try {
      console.log(`📥 开始下载PDF: ${pdfUrl}`);
      
      // 1. 下载PDF
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`下载PDF失败: ${response.status}`);
      }
      
      const pdfBuffer = await response.buffer();
      
      // 2. 计算哈希
      const fileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
      
      // 3. 准备FormData
      const formData = new FormData();
      const fileName = pdfUrl.split('/').pop() || `invoice_${Date.now()}.pdf`;
      
      formData.append('file', pdfBuffer, {
        filename: fileName,
        contentType: 'application/pdf'
      });
      formData.append('fileHash', fileHash);
      formData.append('fileSize', pdfBuffer.length.toString());
      formData.append('fileName', fileName);
      formData.append('checkDeleted', 'true');
      
      console.log('📤 上传到Edge Function...');
      
      // 4. 调用Edge Function
      const ocrResponse = await fetch(`${supabaseUrl}/functions/v1/ocr-dedup-complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          // FormData会自动设置正确的Content-Type
        },
        body: formData
      });
      
      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        throw new Error(`Edge Function失败: ${ocrResponse.status} ${errorText}`);
      }
      
      const result = await ocrResponse.json();
      
      console.log('✅ 处理完成');
      console.log(JSON.stringify(result, null, 2));
      
      return result;
      
    } catch (error) {
      console.error('❌ 错误:', error);
      throw error;
    }
  }
  
  module.exports = { uploadPDFFromURLNode };
}

// 导出函数供其他地方使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { uploadPDFFromURL };
} else if (typeof window !== 'undefined') {
  window.uploadPDFFromURL = uploadPDFFromURL;
}