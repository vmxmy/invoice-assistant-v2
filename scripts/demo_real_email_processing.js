/**
 * 演示真实邮件发票处理流程
 * 模拟Pipedream接收到的邮件数据，处理PDF附件并提取发票信息
 */

// 配置
const CONFIG = {
  supabaseUrl: 'https://sfenhhtvcyslxplvewmt.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'
};

/**
 * 模拟的邮件数据（基于实际用户提供的信息）
 */
const REAL_EMAIL_DATA = {
  // 原始邮件信息
  from: {
    name: "laoxu",
    email: "vmxmy@qq.com"
  },
  subject: "发票邮件",
  date: "2025-01-29T18:00:00Z",
  
  // PDF附件信息
  attachment: {
    filename: "dzfp_25942000000036499020_厦门集聚香餐饮管理有限公司_20250722130149.pdf",
    downloadUrl: "https://pipedream-emails.s3.amazonaws.com/parsed/0c47755d-cd0b-4b5e-9a17-5556ec555f98?AWSAccessKeyId=ASIA5F5AGIEATRRD3CMP&Expires=1753807559&Signature=QAp13e9JfPIh8f5Ra3ZhRTXIpQ8%3D&x-amz-security-token=FwoGZXIvYXdzEJL%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDIwliUIKvjQWIn9kESKYBKsuCXw1koFDQITVok5FHehL9ccsRaYml0ONfesHSEkiAVfei%2FrSpEPd%2Bnr3%2BbWQBDlP9zzsF3i0ePCbJUQ%2B2252algozfOcyNv9hvqwzy%2BeXENGzoNSfHUXDLndu7QEqVZA%2BFr6CqLBhS%2FeTO%2B%2BB8ZMMWqbQrXuutCZyrGJydDKf0N%2BcBYWqQsXnVWENhQiE3bLN9orkLAHx6%2FBSPOW64ZLTlzyjl3rvIhoSC0HKIO3jZ7xeCTftVH4XCnoUVfCCJkaCa%2B1WXQHV1QGk7WZ5UrM%2B7NwV5mtspu%2Bxrj%2FAE2Wonf%2FZUKBDRhlxxwhHbjJ%2FyJ%2BGg5CWJytIX%2Fk%2BMMd9JkHDnNdko%2BC%2B3v35um2BZo5xdijSpJKaYrm%2BBAbsTfbcpIleRSj1z8fUrEi2YDcRlPuJPN163wU6pV03UBm%2BavieeQuCJkEATO4Fxur5FLXr8ipZyQVkTQAKWwBuSxi%2BMPJVBBRvS8m663aOimibuWvEf49Z5LJ2ca3hpelIMCCBOHkmNYbNDOAW13qhB%2FmildM3ByW0ndo4kWeRCUgflZa9FCealCs%2FAQtzgsBc8tUbqwsHSo5c8%2BEpettpf5QJcglGl6uHD9PlAGL2f3StJ%2BM9FnbFALN10l1Y%2FFpECFSI58%2FNbS63XotjZht9GJ15u4ZFJUJKZHMdcJrOtyMY9Cn%2Blmdc%2F2p0VrfdiXvnMfeddlGnBHyh2%2FlKJPmo8QGMio8GWS0QyUAqIAtqechiMleWHoVuiUYbSrbg2mCAXxjK5F8qIjEh0m8hlk%3D",
    contentType: "application/pdf",
    size: 245760 // 约240KB
  },
  
  // 从文件名提取的发票信息
  invoiceInfo: {
    type: "电子发票", // dzfp = 电子发票
    code: "25942000000036499020",
    company: "厦门集聚香餐饮管理有限公司",
    issueDate: "20250722130149" // 2025年7月22日 13:01:49
  }
};

/**
 * 演示完整的邮件发票处理流程
 */
async function demonstrateEmailInvoiceProcessing() {
  console.log('🔥 演示真实邮件发票处理流程');
  console.log('=' .repeat(60));
  
  // 1. 邮件信息解析
  console.log('\n📧 第1步: 邮件信息解析');
  console.log('---'.repeat(20));
  console.log(`发件人: ${REAL_EMAIL_DATA.from.name} <${REAL_EMAIL_DATA.from.email}>`);
  console.log(`主题: ${REAL_EMAIL_DATA.subject}`);
  console.log(`时间: ${REAL_EMAIL_DATA.date}`);
  console.log(`附件: ${REAL_EMAIL_DATA.attachment.filename}`);
  console.log(`文件大小: ${(REAL_EMAIL_DATA.attachment.size / 1024).toFixed(1)} KB`);
  
  // 2. 发票信息预解析（从文件名）
  console.log('\n🔍 第2步: 发票信息预解析');
  console.log('---'.repeat(20));
  console.log(`发票类型: ${REAL_EMAIL_DATA.invoiceInfo.type}`);
  console.log(`发票代码: ${REAL_EMAIL_DATA.invoiceInfo.code}`);
  console.log(`开票单位: ${REAL_EMAIL_DATA.invoiceInfo.company}`);
  console.log(`开票时间: ${formatDate(REAL_EMAIL_DATA.invoiceInfo.issueDate)}`);
  
  // 3. 尝试处理PDF URL
  console.log('\n⚡ 第3步: PDF处理尝试');
  console.log('---'.repeat(20));
  
  const result = await processInvoicePDF(REAL_EMAIL_DATA);
  
  // 4. 结果分析
  console.log('\n📊 第4步: 处理结果分析');
  console.log('---'.repeat(20));
  
  if (result.success) {
    console.log('✅ 发票处理成功！');
    displayInvoiceData(result.data);
  } else {
    console.log('❌ 发票处理失败');
    console.log(`错误原因: ${result.error}`);
    console.log(`详细信息: ${result.details}`);
    
    // 展示错误处理建议
    showErrorHandlingSuggestions(result);
  }
  
  // 5. 处理步骤回顾
  if (result.steps && result.steps.length > 0) {
    console.log('\n📋 第5步: 处理步骤回顾');
    console.log('---'.repeat(20));
    result.steps.forEach((step, index) => {
      console.log(`${index + 1}. ${step}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 流程演示完成！');
  
  return result;
}

/**
 * 调用Edge Function处理发票PDF
 */
async function processInvoicePDF(emailData) {
  const startTime = performance.now();
  
  try {
    // 获取认证token
    const token = await getAuthToken();
    if (!token) {
      throw new Error('无法获取认证token');
    }
    
    console.log('📡 正在调用Edge Function...');
    console.log(`URL检查: ${emailData.attachment.downloadUrl.substring(0, 80)}...`);
    
    // 构建请求数据
    const requestData = {
      pdf_url: emailData.attachment.downloadUrl,
      pdf_name: emailData.attachment.filename,
      sender_email: emailData.from.email,  // 🔑 发件人邮箱（用于用户映射）
      checkDeleted: true,
      metadata: {
        source: 'email_attachment',
        email_subject: emailData.subject,
        email_from: `${emailData.from.name} <${emailData.from.email}>`,
        email_date: emailData.date,
        attachment_size: emailData.attachment.size,
        pre_parsed_info: emailData.invoiceInfo
      }
    };
    
    // 调用Edge Function
    const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/ocr-dedup-complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-User-ID': 'bd9a6722-a781-4f0b-8856-c6c5e261cbd0'  // 实际用户ID
      },
      body: JSON.stringify(requestData)
    });
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    console.log(`📊 HTTP状态: ${response.status} ${response.statusText}`);
    console.log(`⏱️ 响应时间: ${(responseTime / 1000).toFixed(2)}秒`);
    
    const result = await response.json();
    result.responseTime = responseTime;
    
    return result;
    
  } catch (error) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    return {
      success: false,
      error: '网络错误',
      details: error.message,
      responseTime: responseTime
    };
  }
}

/**
 * 获取认证token
 */
async function getAuthToken() {
  try {
    const response = await fetch(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': CONFIG.supabaseKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'blueyang@gmail.com',
        password: 'Xumy8!75'
      })
    });
    
    const result = await response.json();
    return result.access_token;
  } catch (error) {
    console.error('❌ 获取认证token失败:', error);
    return null;
  }
}

/**
 * 显示发票数据
 */
function displayInvoiceData(data) {
  if (!data) {
    console.log('无发票数据');
    return;
  }
  
  console.log('📋 发票详细信息:');
  console.log(`  发票号码: ${data.invoice_number || '未识别'}`);
  console.log(`  销售方: ${data.seller_name || '未识别'}`);
  console.log(`  购买方: ${data.buyer_name || '未识别'}`);
  console.log(`  开票日期: ${data.invoice_date || '未识别'}`);
  console.log(`  金额: ¥${data.total_amount || 0}`);
  console.log(`  税额: ¥${data.tax_amount || 0}`);
  console.log(`  价税合计: ¥${data.amount_in_words || 0}`);
  console.log(`  备注: ${data.remarks || '无'}`);
}

/**
 * 显示错误处理建议
 */
function showErrorHandlingSuggestions(result) {
  console.log('\n💡 错误处理建议:');
  
  if (result.error && result.error.includes('PDF下载失败')) {
    console.log('📌 PDF下载问题解决方案:');
    console.log('   1. 检查AWS S3预签名URL是否已过期');
    console.log('   2. 确认URL权限设置正确');
    console.log('   3. 可以考虑以下替代方案:');
    console.log('      - 使用Pipedream的文件缓存功能');
    console.log('      - 先下载到临时存储再传递给Edge Function');
    console.log('      - 直接使用FormData上传文件内容');
  }
  
  if (result.error && result.error.includes('403')) {
    console.log('📌 403权限错误处理:');
    console.log('   1. AWS S3预签名URL可能已过期');
    console.log('   2. 建议Pipedream工作流中添加URL有效期检查');
    console.log('   3. 可以实现重新生成下载链接的机制');
  }
  
  console.log('\n🔧 实际生产环境建议:');
  console.log('   • 使用Pipedream的文件处理步骤先验证PDF');
  console.log('   • 实现URL过期自动重试机制');
  console.log('   • 添加邮件附件本地缓存');
  console.log('   • 配置Webhook失败重试策略');
}

/**
 * 格式化日期字符串
 */
function formatDate(dateString) {
  if (!dateString || dateString.length !== 14) {
    return dateString;
  }
  
  // 20250722130149 -> 2025-07-22 13:01:49
  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);
  const hour = dateString.substring(8, 10);
  const minute = dateString.substring(10, 12);
  const second = dateString.substring(12, 14);
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 显示系统架构总结
 */
function showSystemArchitectureSummary() {
  console.log('\n🏗️ 系统架构总结');
  console.log('=' .repeat(60));
  
  console.log('\n📧 邮件处理流程:');
  console.log('  1. Pipedream监听邮箱 → 提取PDF附件');
  console.log('  2. 生成AWS S3预签名URL → 传递给Supabase');
  console.log('  3. Edge Function下载PDF → OCR识别');
  console.log('  4. 发件人邮箱映射 → 用户账户关联');
  console.log('  5. 数据存储隔离 → 发票归档管理');
  
  console.log('\n🔧 核心功能特性:');
  console.log('  ✅ PDF URL自动下载处理');
  console.log('  ✅ 发件人邮箱用户映射');
  console.log('  ✅ 文件去重和恢复机制');
  console.log('  ✅ 多用户数据隔离');
  console.log('  ✅ 详细错误处理和重试');
  console.log('  ✅ 处理步骤追踪和日志');
  
  console.log('\n💼 适用业务场景:');
  console.log('  • 企业财务自动化发票处理');
  console.log('  • 多部门发票分类管理');
  console.log('  • 供应商发票自动归档');
  console.log('  • 个人发票收集整理');
  console.log('  • 会计事务所客户发票管理');
}

/**
 * 主函数
 */
async function main() {
  try {
    // 演示真实邮件处理流程
    const result = await demonstrateEmailInvoiceProcessing();
    
    // 显示系统架构总结
    showSystemArchitectureSummary();
    
    console.log('\n✅ 演示完成！');
    console.log('💡 即使PDF下载失败，系统也能提供详细的错误信息和处理建议。');
    
    return result;
    
  } catch (error) {
    console.error('❌ 演示执行失败:', error);
  }
}

// Node.js环境兼容性
if (typeof window === 'undefined') {
  if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
    global.performance = require('perf_hooks').performance;
  }
}

// 如果直接运行此脚本
if (typeof require !== 'undefined' && require.main === module) {
  main().catch(console.error);
}

// 导出函数供其他地方使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    demonstrateEmailInvoiceProcessing,
    processInvoicePDF,
    displayInvoiceData,
    showErrorHandlingSuggestions,
    formatDate,
    REAL_EMAIL_DATA,
    CONFIG
  };
}