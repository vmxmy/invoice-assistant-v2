/**
 * Pipedream Node 4: 从 props 中提取邮箱和姓名
 * 简化发票处理流程
 */

export default defineComponent({
  props: {
    supabase_url: {
      type: "string",
      label: "Supabase Project URL",
      description: "Your Supabase project URL (e.g., https://your-project.supabase.co)",
      default: "https://sfenhhtvcyslxplvewmt.supabase.co"
    },
    supabase_anon_key: {
      type: "string",
      label: "Supabase Anon Key",
      description: "Your Supabase anonymous/public API key",
      secret: true
    },
    ocr_function_name: {
      type: "string",
      label: "OCR Edge Function Name",
      description: "Name of the Supabase Edge Function to call",
      default: "ocr-dedup-complete"
    },
    // 将 fromEmail 的类型改为 string，并接受完整格式
    fromEmail: {
      type: "string",
      label: "Sender Email (raw string)",
      description: "The raw sender email string, e.g., 'laoxu <vmxmy@qq.com>'",
      optional: false, 
    }
    // 移除 fromName props，因为我们将在代码中提取它
  },

  async run({ steps, $ }) {
    console.log('🚀 [发票处理器] 开始处理发票邮件...');

    // 检查必需的props
    if (!this.supabase_anon_key) {
      console.error('❌ [配置错误] 缺少 supabase_anon_key');
      return {
        success: false,
        reason: 'missing_supabase_config',
        message: '缺少Supabase配置信息，请配置supabase_anon_key'
      };
    }

    // 获取分类结果
    const classificationResult = steps.email_classifier?.$return_value;
    console.log('📊 [分类结果]:', JSON.stringify(classificationResult, null, 2));

    if (!classificationResult || classificationResult.emailCategory !== 'invoice') {
      console.log('⚠️ [跳过] 邮件未被分类为发票邮件，跳过处理');
      return {
        success: false,
        reason: 'not_invoice_email',
        message: '邮件未被分类为发票邮件',
        classificationDetails: classificationResult
      };
    }

    console.log('✅ [确认] emailCategory=invoice，开始处理...');

    // 从trigger获取邮件信息
    const triggerData = steps.trigger?.event || {};
    console.log('📧 [Trigger数据] 顶级键:', Object.keys(triggerData));

    // 🔧 在代码中对 props 进行正则解析
    const fromText = this.fromEmail;
    console.log('🔍 [邮箱提取] 输入 props.fromEmail:', fromText);

    if (!fromText) {
      console.error('❌ [处理错误] 缺少发件人邮箱 fromEmail');
      return {
        success: false,
        reason: 'missing_from_email',
        message: '缺少 fromEmail prop'
      };
    }

    const extractedInfo = extractEmailFromText(fromText);
    const cleanedEmail = extractedInfo.email;
    const cleanedName = extractedInfo.name;

    console.log('✅ [发件人信息]:', {
      originalText: fromText,
      extractedEmail: cleanedEmail,
      extractedName: cleanedName,
      source: 'props_with_regex'
    });
    
    // 从trigger获取PDF附件
    const attachments = triggerData.attachments || [];
    console.log('📎 [Trigger附件] 总数:', attachments.length);

    // 过滤PDF附件
    const pdfAttachments = attachments.filter(att =>
      att.contentType?.includes('pdf') ||
      att.filename?.toLowerCase().endsWith('.pdf')
    );

    console.log('📄 [PDF附件] 数量:', pdfAttachments.length);

    if (pdfAttachments.length === 0) {
      return {
        success: false,
        reason: 'no_pdf_attachments',
        message: '在trigger中没有找到PDF附件'
      };
    }

    // 构建OCR函数URL
    const ocrFunctionUrl = `${this.supabase_url}/functions/v1/${this.ocr_function_name}`;
    console.log('🔗 [OCR函数URL]:', ocrFunctionUrl);

    // 处理每个PDF附件
    const results = [];

    for (const attachment of pdfAttachments) {
      console.log(`📄 [处理PDF附件] ${attachment.filename}`);

      const pdfUrl = attachment.contentUrl || attachment.downloadUrl || attachment.url;
      console.log(`🔗 [PDF URL] ${pdfUrl}`);

      const requestData = {
        pdfUrl: pdfUrl,
        file_name: attachment.filename,
        from: cleanedEmail, // 使用经过清洗的邮箱
        senderEmail: cleanedEmail, // 使用经过清洗的邮箱
        senderName: cleanedName, // 使用经过清洗的姓名
        subject: triggerData.subject || '未提供',
        date: triggerData.date || new Date().toISOString(),
        messageId: triggerData['message-id'] || triggerData.messageId || '',
        attachment_info: {
          contentType: attachment.contentType || 'application/pdf',
          size: attachment.size || 0,
          contentDisposition: attachment.contentDisposition || 'attachment'
        },
        metadata: {
          emailProvider: 'pipedream',
          processingTime: new Date().toISOString(),
          classification: classificationResult,
          dataSource: 'trigger_headers',
          emailSource: 'props_with_regex', // 更新为 props_with_regex
          nodeVersion: 'props_regex_v2.0'
        }
      };

      console.log('📤 [发送到OCR] 请求数据:', {
        pdfUrl: requestData.pdfUrl ? requestData.pdfUrl.substring(0, 100) + '...' : 'none',
        filename: requestData.file_name,
        from: requestData.from,
        senderEmail: requestData.senderEmail,
        senderName: requestData.senderName,
        subject: requestData.subject
      });

      try {
        const ocrResponse = await fetch(ocrFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.supabase_anon_key}`,
            'apikey': this.supabase_anon_key
          },
          body: JSON.stringify(requestData)
        });

        const ocrResult = await ocrResponse.json();

        if (ocrResponse.ok) {
          console.log(`✅ [OCR成功] ${attachment.filename} 处理完成`);
        } else {
          console.error(`❌ [OCR错误] ${attachment.filename}:`, ocrResult.error || ocrResult.message);
        }

        results.push({
          filename: attachment.filename,
          success: ocrResponse.ok,
          result: ocrResult,
          httpStatus: ocrResponse.status,
          pdfUrl: pdfUrl
        });

      } catch (error) {
        console.error(`❌ [处理错误] ${attachment.filename}:`, error);
        results.push({
          filename: attachment.filename,
          success: false,
          error: error.message,
          pdfUrl: pdfUrl
        });
      }
    }

    // 汇总结果
    const summary = {
      totalAttachments: attachments.length,
      pdfAttachments: pdfAttachments.length,
      successfulProcessing: results.filter(r => r.success).length,
      failedProcessing: results.filter(r => !r.success).length,
      fromEmail: cleanedEmail,
      fromName: cleanedName,
      emailExtractionSuccess: true,
      emailSource: 'props_with_regex',
      originalFromText: fromText,
      isInvoiceEmail: true,
      dataSource: 'trigger_headers',
      supabaseConfig: {
        url: this.supabase_url,
        functionName: this.ocr_function_name,
        hasApiKey: !!this.supabase_anon_key
      },
      results: results
    };

    console.log('📊 [处理汇总]:', JSON.stringify(summary, null, 2));

    return summary;
  }
});

/**
 * 强大的邮箱提取函数
 * 支持多种邮箱格式的提取
 */
function extractEmailFromText(text) {
  if (!text || typeof text !== 'string') {
    return { email: '', name: '' };
  }

  console.log('🔍 [邮箱解析] 输入文本:', text);

  // 邮箱正则表达式 - 支持各种常见格式
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  
  // 查找所有邮箱地址
  const emailMatches = text.match(emailRegex);
  
  if (!emailMatches || emailMatches.length === 0) {
    console.log('❌ [邮箱解析] 未找到有效邮箱地址');
    return { email: '', name: '' };
  }

  const email = emailMatches[0].toLowerCase(); // 取第一个邮箱地址
  console.log('✅ [邮箱解析] 找到邮箱:', email);

  // 提取姓名部分 - 支持多种格式
  let name = '';

  // 格式1: "姓名 <邮箱>" 或 "姓名<邮箱>"
  const format1 = text.match(/^([^<>"]+?)\s*<[^>]+>/);
  if (format1) {
    name = format1[1].trim();
    console.log('📝 [姓名解析] 格式1 "姓名 <邮箱>":', name);
  }
  // 格式2: "邮箱 (姓名)" 
  else {
    const format2 = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\s*\(([^)]+)\)/);
    if (format2) {
      name = format2[1].trim();
      console.log('📝 [姓名解析] 格式2 "邮箱 (姓名)":', name);
    }
    // 格式3: "邮箱" - 纯邮箱地址，从邮箱中提取用户名
    else if (text.trim() === email) {
      name = email.split('@')[0];
      console.log('📝 [姓名解析] 格式3 从邮箱提取用户名:', name);
    }
    // 格式4: 尝试从整个文本中提取非邮箱部分作为姓名
    else {
      const nameCandidate = text.replace(emailRegex, '').replace(/[<>()]/g, '').trim();
      if (nameCandidate && nameCandidate.length > 0) {
        name = nameCandidate;
        console.log('📝 [姓名解析] 格式4 文本中的非邮箱部分:', name);
      }
    }
  }

  // 清理姓名 - 移除多余的空白字符和特殊字符
  name = name.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // 如果姓名为空，使用邮箱用户名部分
  if (!name) {
    name = email.split('@')[0];
    console.log('📝 [姓名解析] 使用邮箱用户名:', name);
  }

  console.log('✅ [邮箱解析] 最终结果:', { email, name });

  return { email, name };
}

/**
 * 测试邮箱提取函数的各种格式
 */
function testEmailExtraction() {
  const testCases = [
    'laoxu <vmxmy@qq.com>',
    'vmxmy@qq.com',
    'John Doe<john.doe@example.com>',
    'user@domain.com (张三)',
    '"李四" <lisi@company.org>',
    'support@service.net',
    '王五 <wangwu@test.edu.cn>',
    'noreply@notification.io (系统通知)',
    '<admin@system.gov>',
    'contact-us@business.co.uk'
  ];

  console.log('🧪 [测试] 邮箱提取函数测试:');
  testCases.forEach((testCase, index) => {
    const result = extractEmailFromText(testCase);
    console.log(`${index + 1}. "${testCase}" -> 邮箱: "${result.email}", 姓名: "${result.name}"`);
  });
}