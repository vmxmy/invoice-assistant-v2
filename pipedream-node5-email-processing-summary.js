/**
 * Pipedream Node 5: 邮件处理汇总节点
 * 功能：汇总Node2分类、Node3验证提取、Node4发票处理的执行结果
 * 根据条件执行结果，统一存储处理状态和用户映射信息
 */

// 辅助函数定义在组件外部
function getNodeResult(steps, ...possibleKeys) {
  for (const key of possibleKeys) {
    if (steps[key]?.$return_value) {
      return steps[key].$return_value;
    }
    if (steps[key]) {
      return steps[key];
    }
  }
  return null;
}

function extractEmailInfo(triggerData) {
  if (!triggerData) {
    return {
      subject: null,
      fromEmail: null,
      fromName: null,
      toEmail: null,
      date: null,
      bodyText: null,
      bodyHtml: null,
      bodyPreview: null,
      hasAttachments: false,
      attachmentCount: 0,
      attachmentNames: []
    };
  }

  const headers = triggerData.headers || {};
  
  // 调试输出
  console.log('🔍 Debug: extractEmailInfo输入数据结构:');
  console.log('TriggerData keys:', Object.keys(triggerData));
  console.log('Headers keys:', Object.keys(headers));
  console.log('Headers.from:', JSON.stringify(headers.from));
  console.log('Headers.to:', JSON.stringify(headers.to));
  console.log('TriggerData.from:', JSON.stringify(triggerData.from));
  console.log('TriggerData.to:', JSON.stringify(triggerData.to));
  console.log('CommonHeaders:', JSON.stringify(triggerData.commonHeaders));
  
  // 检查完整的trigger结构（可能数据在更深层）
  console.log('🔍 Debug: 完整trigger结构检查:');
  if (triggerData.event) {
    console.log('TriggerData.event keys:', Object.keys(triggerData.event));
    if (triggerData.event.headers) {
      console.log('TriggerData.event.headers keys:', Object.keys(triggerData.event.headers));
      console.log('TriggerData.event.headers.from:', JSON.stringify(triggerData.event.headers.from));
      console.log('TriggerData.event.headers.to:', JSON.stringify(triggerData.event.headers.to));
      console.log('TriggerData.event.headers.subject:', JSON.stringify(triggerData.event.headers.subject));
    }
  }
  
  // 提取邮件正文
  const bodyText = extractEmailBodyText(triggerData);
  const bodyHtml = extractEmailBodyHtml(triggerData);
  const bodyPreview = bodyText ? bodyText.substring(0, 200) : null;
  
  // 提取附件信息
  const attachmentInfo = extractAttachmentInfo(triggerData);
  
  // 增强的邮件地址提取 - 尝试多个数据源（包括event结构）
  let fromEmailData = headers.from || 
                      triggerData.from || 
                      triggerData.event?.headers?.from ||
                      triggerData.commonHeaders?.from || 
                      headers.From;
                      
  let toEmailData = headers.to || 
                    triggerData.to || 
                    triggerData.event?.headers?.to ||
                    triggerData.commonHeaders?.to || 
                    headers.To;
  
  console.log('🔍 Debug: 原始邮件数据源:');
  console.log('FromEmailData:', JSON.stringify(fromEmailData));
  console.log('ToEmailData:', JSON.stringify(toEmailData));
  
  const fromEmail = extractEmailAddressEnhanced(fromEmailData);
  const fromName = extractEmailNameEnhanced(fromEmailData);
  const toEmail = extractEmailAddressEnhanced(toEmailData);
  
  // 增强的主题提取
  const subject = headers.subject || 
                  triggerData.subject || 
                  triggerData.event?.headers?.subject ||
                  triggerData.commonHeaders?.subject || 
                  headers.Subject;
  
  // 增强的日期提取
  const date = headers.date || 
               triggerData.date || 
               triggerData.event?.headers?.date ||
               triggerData.commonHeaders?.date || 
               headers.Date;
  
  const result = {
    subject: subject,
    fromEmail: fromEmail,
    fromName: fromName,
    toEmail: toEmail,
    date: date,
    bodyText: bodyText,
    bodyHtml: bodyHtml,
    bodyPreview: bodyPreview,
    hasAttachments: attachmentInfo.hasAttachments,
    attachmentCount: attachmentInfo.count,
    attachmentNames: attachmentInfo.names
  };
  
  console.log('🔍 Debug: extractEmailInfo提取结果:');
  console.log('Subject:', result.subject);
  console.log('FromEmail:', result.fromEmail);
  console.log('FromName:', result.fromName);
  console.log('ToEmail:', result.toEmail);
  console.log('BodyText length:', result.bodyText ? result.bodyText.length : 'null');
  console.log('BodyHtml length:', result.bodyHtml ? result.bodyHtml.length : 'null');
  console.log('BodyPreview:', result.bodyPreview ? result.bodyPreview.substring(0, 50) + '...' : 'null');
  console.log('HasAttachments:', result.hasAttachments);
  console.log('AttachmentCount:', result.attachmentCount);
  
  return result;
}

function extractEmailAddress(emailField) {
  if (!emailField) return null;
  
  if (typeof emailField === 'string') {
    const match = emailField.match(/([^<>\s]+@[^<>\s]+)/);
    return match ? match[1] : emailField;
  }
  
  if (emailField.value && Array.isArray(emailField.value) && emailField.value.length > 0) {
    return emailField.value[0].address;
  }
  
  if (emailField.text) {
    const match = emailField.text.match(/([^<>\s]+@[^<>\s]+)/);
    return match ? match[1] : null;
  }
  
  return null;
}

// 增强版邮件地址提取函数
function extractEmailAddressEnhanced(emailField) {
  if (!emailField) return null;
  
  console.log('🔍 Debug: extractEmailAddressEnhanced输入:', JSON.stringify(emailField));
  
  // 方法1: 字符串直接匹配
  if (typeof emailField === 'string') {
    const match = emailField.match(/([^<>\s]+@[^<>\s]+)/);
    if (match) {
      console.log('🔍 Debug: 字符串regex提取成功:', match[1]);
      return match[1];
    }
    // 如果没有<>包围，可能整个字符串就是邮箱
    if (emailField.includes('@')) {
      console.log('🔍 Debug: 整个字符串是邮箱:', emailField.trim());
      return emailField.trim();
    }
  }
  
  // 方法2: 对象.value数组 (Pipedream常用格式)
  if (emailField.value && Array.isArray(emailField.value) && emailField.value.length > 0) {
    const email = emailField.value[0].address;
    console.log('🔍 Debug: value数组提取成功:', email);
    return email;
  }
  
  // 方法3: 对象.text字段
  if (emailField.text) {
    const match = emailField.text.match(/([^<>\s]+@[^<>\s]+)/);
    if (match) {
      console.log('🔍 Debug: text字段regex提取成功:', match[1]);
      return match[1];
    }
  }

  // 方法4: 直接是对象包含address
  if (emailField.address) {
    console.log('🔍 Debug: 直接address字段提取成功:', emailField.address);
    return emailField.address;
  }

  // 方法5: 数组形式 (有些trigger以数组形式提供)
  if (Array.isArray(emailField) && emailField.length > 0) {
    console.log('🔍 Debug: 数组形式，递归提取第一个元素');
    return extractEmailAddressEnhanced(emailField[0]);
  }

  // 方法6: 对象包含email字段
  if (emailField.email) {
    console.log('🔍 Debug: email字段提取成功:', emailField.email);
    return emailField.email;
  }

  console.log('🔍 Debug: 所有提取方法失败');
  return null;
}

function extractEmailName(emailField) {
  if (!emailField) return null;
  
  if (emailField.value && Array.isArray(emailField.value) && emailField.value.length > 0) {
    return emailField.value[0].name || null;
  }
  
  if (typeof emailField === 'string') {
    const match = emailField.match(/^([^<]+?)\s*</);
    return match ? match[1].trim() : null;
  }
  
  return null;
}

// 增强版邮件姓名提取函数
function extractEmailNameEnhanced(emailField) {
  if (!emailField) return null;
  
  console.log('🔍 Debug: extractEmailNameEnhanced输入:', JSON.stringify(emailField));
  
  // 方法1: 对象.value数组 (Pipedream常用格式)
  if (emailField.value && Array.isArray(emailField.value) && emailField.value.length > 0) {
    const name = emailField.value[0].name || null;
    console.log('🔍 Debug: value数组name提取:', name);
    return name;
  }
  
  // 方法2: 字符串解析 "Name <email@domain.com>"
  if (typeof emailField === 'string') {
    const match = emailField.match(/^([^<]+?)\s*</);
    if (match) {
      const name = match[1].trim();
      console.log('🔍 Debug: 字符串regex name提取成功:', name);
      return name;
    }
  }

  // 方法3: 直接是对象包含name
  if (emailField.name) {
    console.log('🔍 Debug: 直接name字段提取成功:', emailField.name);
    return emailField.name;
  }

  // 方法4: 数组形式
  if (Array.isArray(emailField) && emailField.length > 0) {
    console.log('🔍 Debug: 数组形式name，递归提取第一个元素');
    return extractEmailNameEnhanced(emailField[0]);
  }

  // 方法5: 对象包含displayName字段
  if (emailField.displayName) {
    console.log('🔍 Debug: displayName字段提取成功:', emailField.displayName);
    return emailField.displayName;
  }
  
  console.log('🔍 Debug: name提取失败');
  return null;
}

function extractEmailBodyText(triggerData) {
  console.log('🔍 Debug: extractEmailBodyText开始提取文本内容');
  
  // 尝试多种可能的正文字段位置
  const textSources = [
    triggerData.body,
    triggerData.text,
    triggerData.bodyText,
    triggerData.event?.body?.text,  // 新增: event结构中的text
    triggerData.event?.text,        // 新增: event直接text
  ];
  
  console.log('🔍 Debug: 检查文本数据源:');
  textSources.forEach((source, index) => {
    console.log(`Text source ${index}:`, source ? (typeof source === 'string' ? source.substring(0, 100) + '...' : typeof source) : 'null');
  });
  
  // 依次尝试各种数据源
  for (const source of textSources) {
    if (source && typeof source === 'string' && source.trim().length > 0) {
      console.log('🔍 Debug: 文本内容提取成功，来源:', textSources.indexOf(source));
      return source.trim();
    }
  }
  
  if (triggerData.content && typeof triggerData.content === 'string') {
    console.log('🔍 Debug: 从content字段提取文本');
    return triggerData.content;
  }
  
  // Pipedream IMAP 特定字段
  if (triggerData.textAsHtml) {
    console.log('🔍 Debug: 从textAsHtml提取并清理HTML标签');
    return triggerData.textAsHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  // 检查event.body.html，如果没有文本版本，从HTML提取
  if (triggerData.event?.body?.html) {
    console.log('🔍 Debug: 从event.body.html提取文本（清理HTML标签）');
    return triggerData.event.body.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  // Gmail API 格式
  if (triggerData.payload && triggerData.payload.body && triggerData.payload.body.data) {
    try {
      console.log('🔍 Debug: 从Gmail API payload提取base64文本');
      return Buffer.from(triggerData.payload.body.data, 'base64').toString('utf-8');
    } catch (e) {
      console.log('🔍 Debug: Gmail API base64解码失败:', e.message);
      return null;
    }
  }
  
  console.log('🔍 Debug: 所有文本提取方法失败');
  return null;
}

function extractEmailBodyHtml(triggerData) {
  console.log('🔍 Debug: extractEmailBodyHtml开始提取HTML内容');
  
  // 尝试多种可能的HTML正文字段位置
  const htmlSources = [
    triggerData.html,
    triggerData.bodyHtml,
    triggerData.textAsHtml,
    triggerData.event?.body?.html,  // 新增: event结构中的html
    triggerData.event?.html,        // 新增: event直接html
  ];
  
  console.log('🔍 Debug: 检查HTML数据源:');
  htmlSources.forEach((source, index) => {
    console.log(`HTML source ${index}:`, source ? (typeof source === 'string' ? source.substring(0, 100) + '...' : typeof source) : 'null');
  });
  
  // 依次尝试各种数据源
  for (const source of htmlSources) {
    if (source && typeof source === 'string' && source.trim().length > 0) {
      console.log('🔍 Debug: HTML内容提取成功，来源:', htmlSources.indexOf(source));
      return source.trim();
    }
  }
  
  // Outlook/Exchange 格式
  if (triggerData.body && triggerData.body.contentType === 'html') {
    console.log('🔍 Debug: 从Outlook/Exchange格式提取HTML');
    return triggerData.body.content;
  }
  
  // 检查event.body对象格式
  if (triggerData.event?.body && typeof triggerData.event.body === 'object' && triggerData.event.body.contentType === 'html') {
    console.log('🔍 Debug: 从event.body对象格式提取HTML');
    return triggerData.event.body.content;
  }
  
  console.log('🔍 Debug: 所有HTML提取方法失败');
  return null;
}

function extractAttachmentInfo(triggerData) {
  console.log('🔍 Debug: extractAttachmentInfo开始提取附件信息');
  
  const result = {
    hasAttachments: false,
    count: 0,
    names: []
  };
  
  // 检查常见的附件字段（包括event结构）
  const attachmentSources = [
    triggerData.attachments,
    triggerData.files,
    triggerData.parts,
    triggerData.payload?.parts,
    triggerData.event?.attachments,  // 新增: event结构中的attachments
    triggerData.event?.files,        // 新增: event结构中的files
    triggerData.event?.parts         // 新增: event结构中的parts
  ];
  
  console.log('🔍 Debug: 检查附件数据源:');
  attachmentSources.forEach((source, index) => {
    console.log(`Attachment source ${index}:`, Array.isArray(source) ? `Array[${source.length}]` : (source ? typeof source : 'null'));
  });
  
  for (const source of attachmentSources) {
    if (Array.isArray(source) && source.length > 0) {
      result.hasAttachments = true;
      result.count = source.length;
      
      // 提取附件名称
      result.names = source.map(attachment => {
        return attachment.filename || 
               attachment.name || 
               attachment.part?.filename ||
               attachment.headers?.['content-disposition']?.filename ||
               'unknown_attachment';
      }).filter(name => name && name !== 'unknown_attachment');
      
      break;
    }
  }
  
  // 如果找到附件但没有名称，至少标记有附件
  if (result.count > 0 && result.names.length === 0) {
    result.names = Array(result.count).fill(null).map((_, i) => `attachment_${i + 1}`);
  }
  
  return result;
}

function extractTriggerEventId(triggerData) {
  return triggerData?.id || 
         triggerData?.event_id || 
         triggerData?.trigger_id || 
         `auto_${Date.now()}`;
}

function determineExecutionPath(node2Result, node3Result, node4Result) {
  // 如果Node2未执行或不需要处理
  if (!node2Result || !node2Result.shouldProcess) {
    return 'no_processing';
  }
  
  // 基于实际执行的节点确定路径
  if (node2Result.emailCategory === 'verification' && node3Result) {
    return 'verification_path';
  }
  
  if (node2Result.emailCategory === 'invoice' && node4Result) {
    return 'invoice_path';
  }
  
  // 只执行了分类，没有后续处理
  return 'classification_only';
}

function determineNode4Status(node4Result) {
  if (node4Result.successfulProcessing > 0) return 'success';
  if (node4Result.failedProcessing > 0) return 'failed';
  if (node4Result.totalAttachments === 0) return 'no_attachments';
  return 'unknown';
}

function determineOverallStatus(node2Result, node3Result, node4Result, userMapping) {
  // 如果不需要处理
  if (!node2Result?.shouldProcess) return 'not_processed';
  
  // 验证路径状态
  if (node3Result) {
    if (node3Result.success && userMapping.status === 'found') return 'success';
    if (node3Result.success && userMapping.status === 'created') return 'success';
    if (node3Result.success) return 'partial_success';
    return 'failed';
  }
  
  // 发票路径状态  
  if (node4Result) {
    if (node4Result.successfulProcessing > 0) return 'success';
    if (node4Result.totalAttachments > 0) return 'partial_success';
    return 'failed';
  }
  
  return 'classification_only';
}

function summarizeErrors(node2Result, node3Result, node4Result, userMapping) {
  const errors = [];
  
  if (node2Result && !node2Result.shouldProcess) {
    errors.push('邮件分类为不需要处理');
  }
  
  if (node3Result && !node3Result.success) {
    errors.push('验证链接提取失败');
  }
  
  if (node4Result && node4Result.failedProcessing > 0) {
    errors.push(`${node4Result.failedProcessing}个PDF处理失败`);
  }
  
  if (userMapping.status === 'not_found') {
    errors.push('未找到对应用户账户');
  }
  
  if (userMapping.status === 'error') {
    errors.push(`用户映射错误: ${userMapping.error}`);
  }
  
  return errors.length > 0 ? errors.join('; ') : null;
}

function generateRecommendations(summaryData) {
  const recommendations = [];
  
  // 验证路径建议
  if (summaryData.execution_path === 'verification_path') {
    if (summaryData.user_mapping_status === 'not_found') {
      recommendations.push('考虑启用自动用户创建功能');
      recommendations.push('用户可点击验证链接完成注册流程');
    }
    if (summaryData.extraction_completeness === 'complete') {
      recommendations.push('验证链接提取完整，可直接发送给用户');
    }
    if (summaryData.link_quality === 'high') {
      recommendations.push('验证链接质量高，推荐自动处理');
    }
  }
  
  // 发票路径建议
  if (summaryData.execution_path === 'invoice_path') {
    if (summaryData.user_mapping_status === 'not_found') {
      recommendations.push('发件人需要先注册用户账户才能处理发票');
      recommendations.push('建议向发件人发送注册邀请');
    }
    if (summaryData.failed_processing > 0) {
      recommendations.push('部分PDF处理失败，请检查文件格式和内容');
    }
    if (summaryData.successful_processing === 0 && summaryData.total_attachments > 0) {
      recommendations.push('所有附件处理失败，可能需要人工处理');
    }
  }
  
  // 通用建议
  if (summaryData.execution_path === 'no_processing') {
    recommendations.push('邮件内容不符合处理条件，已跳过处理');
  }
  
  if (summaryData.overall_status === 'failed') {
    recommendations.push('处理完全失败，建议检查配置和权限');
  }
  
  return recommendations;
}

function countExecutedNodes(node2Result, node3Result, node4Result) {
  let count = 0;
  if (node2Result) count++;
  if (node3Result) count++;
  if (node4Result) count++;
  return count;
}

// 注意：用户映射功能已移动到Edge Function中处理
// 这里保留的函数仅用于向后兼容和调试目的

// 构建Edge Function请求载荷
function buildEdgeFunctionPayload({
  emailInfo,
  executionPath,
  node2Result,
  node3Result,
  node4Result,
  triggerData,
  startTime,
  enableUserMapping,
  autoCreateUser,
  fromEmail
}) {
  const endTime = Date.now();
  
  return {
    // 关联信息
    trigger_event_id: extractTriggerEventId(triggerData),
    workflow_execution_id: `workflow_${Date.now()}`,
    
    // 邮件基本信息
    email_subject: emailInfo.subject,
    from_email: fromEmail || emailInfo.fromEmail,
    from_name: emailInfo.fromName,
    to_email: emailInfo.toEmail,
    email_date: emailInfo.date,
    
    // 邮件正文和附件信息
    email_body_text: emailInfo.bodyText,
    email_body_html: emailInfo.bodyHtml,
    email_body_preview: emailInfo.bodyPreview,
    has_attachments: emailInfo.hasAttachments,
    attachment_count: emailInfo.attachmentCount,
    attachment_names: emailInfo.attachmentNames,
    
    // Node2分类结果
    email_category: node2Result?.emailCategory,
    classification_reason: node2Result?.reason,
    should_process: node2Result?.shouldProcess,
    matched_keywords: node2Result?.matchedKeywords,
    extracted_subject: node2Result?.extractedSubject,
    keyword_stats: node2Result?.keywordStats,
    
    // 执行路径
    execution_path: executionPath,
    
    // Node3结果
    node3_executed: !!node3Result,
    node3_status: node3Result ? (node3Result.success ? 'success' : 'failed') : 'skipped',
    verification_links: node3Result?.extractedData?.verificationLinks,
    primary_verification_link: node3Result?.extractedData?.primaryVerificationLink,
    target_user_email: node3Result?.extractedData?.targetUserEmail,
    link_quality: node3Result?.qualityAssessment?.linkQuality,
    extraction_completeness: node3Result?.qualityAssessment?.completeness,
    
    // Node4结果
    node4_executed: !!node4Result,
    node4_status: node4Result ? determineNode4Status(node4Result) : 'skipped',
    total_attachments: node4Result?.totalAttachments || 0,
    pdf_attachments: node4Result?.pdfAttachments || 0,
    successful_processing: node4Result?.successfulProcessing || 0,
    failed_processing: node4Result?.failedProcessing || 0,
    processing_results: node4Result?.results,
    
    // 处理时间
    total_processing_time: endTime - startTime,
    
    // 原始数据
    node2_raw_output: node2Result,
    node3_raw_output: node3Result,
    node4_raw_output: node4Result,
    trigger_raw_data: triggerData,
    
    // 用户映射配置
    enable_user_mapping: enableUserMapping,
    auto_create_user: autoCreateUser
  };
}

// 调用Edge Function
async function callEdgeFunction(payload, props) {
  try {
    const edgeFunctionUrl = `${props.supabaseUrl}/functions/v1/email-processing-summary`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${props.supabaseKey}`,
        'apikey': props.supabaseKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function调用失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    return result;

  } catch (error) {
    console.error('💾 Edge Function调用失败:', error);
    return {
      success: false,
      error: error.message,
      action: 'edge_function_call_failed'
    };
  }
}

// 创建跳过结果（配置不完整时使用）
function createSkippedResult(reason, triggerData, emailInfo, node2Result, executionPath, startTime) {
  return {
    success: false,
    action: 'edge_function_skipped',
    summary: {
      trigger_event_id: extractTriggerEventId(triggerData),
      email_subject: emailInfo.subject,
      email_category: node2Result?.emailCategory,
      execution_path: executionPath,
      overall_status: 'not_processed'
    },
    user_mapping: { 
      status: 'disabled', 
      error: reason 
    },
    processing_stats: {
      nodes_executed: node2Result ? 1 : 0, // 只有Node2可能执行了
      total_processing_time: Date.now() - startTime,
      execution_path: executionPath
    },
    recommendations: [
      '请在Pipedream中配置完整的Supabase连接信息',
      'Supabase URL: 你的项目URL',
      'Supabase Key: Service Role Key（保密）'
    ],
    database_result: { 
      success: false, 
      error: reason 
    },
    error: reason,
    configuration_help: {
      supabase_url: 'https://your-project.supabase.co',
      supabase_key: 'eyJ...（Service Role Key）',
      note: '请在Pipedream Node5配置中设置这些值'
    }
  };
}

// 保留原有函数以备后用
async function saveToSupabase(summaryData, props) {
  try {
    const response = await fetch(`${props.supabaseUrl}/rest/v1/email_processing_summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${props.supabaseKey}`,
        'apikey': props.supabaseKey,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(summaryData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase插入失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      data: Array.isArray(result) ? result[0] : result,
      message: '数据保存成功'
    };

  } catch (error) {
    console.error('💾 数据库保存失败:', error);
    return {
      success: false,
      error: error.message,
      message: '数据保存失败'
    };
  }
}

export default defineComponent({
  props: {
    enableUserMapping: {
      type: "boolean",
      label: "启用用户映射",
      description: "是否尝试建立邮箱到用户的映射关系",
      default: true
    },
    autoCreateUser: {
      type: "boolean", 
      label: "自动创建用户",
      description: "当用户不存在时是否自动创建用户账户",
      default: false
    },
    enableDebug: {
      type: "boolean",
      label: "启用调试模式",
      description: "输出详细的处理信息",
      default: true
    },
    fromEmail: {
      type: "string",
      label: "发件人邮箱",
      description: "指定发件人邮箱地址，如果不提供则自动从邮件中提取"
    },
    supabaseUrl: {
      type: "string",
      label: "Supabase URL",
      description: "Supabase项目URL",
      default: "https://sfenhhtvcyslxplvewmt.supabase.co"
    },
    supabaseKey: {
      type: "string",
      label: "Supabase服务密钥",
      description: "Supabase service role密钥",
      secret: true
    }
  },
  
  async run({ steps, $ }) {
    // 解构props以便访问
    const { enableUserMapping, autoCreateUser, enableDebug, fromEmail, supabaseUrl, supabaseKey } = this;
    const startTime = Date.now();
    
    try {
      console.log('🔄 Node 5: 邮件处理汇总开始...');
      
      // 1. 获取各节点执行结果
      const triggerData = steps.trigger;
      const node2Result = getNodeResult(steps, 'email_classifier', 'node2_email_classifier');
      const node3Result = getNodeResult(steps, 'verification_extractor', 'node3_verification_extractor');
      const node4Result = getNodeResult(steps, 'pdf2supabase', 'node4_pdf2supabase');
      
      if (enableDebug) {
        console.log('📊 节点执行状态:', {
          node2Executed: !!node2Result,
          node3Executed: !!node3Result,
          node4Executed: !!node4Result,
          triggerAvailable: !!triggerData
        });
      }
      
      // 2. 提取邮件基本信息
      const emailInfo = extractEmailInfo(triggerData);
      
      // 3. 确定执行路径
      const executionPath = determineExecutionPath(node2Result, node3Result, node4Result);
      
      if (enableDebug) {
        console.log('🛤️ 执行路径分析:', {
          executionPath: executionPath,
          emailCategory: node2Result?.emailCategory,
          shouldProcess: node2Result?.shouldProcess
        });
      }
      
      // 4. 构建Edge Function请求数据
      const edgeFunctionPayload = buildEdgeFunctionPayload({
        emailInfo,
        executionPath,
        node2Result,
        node3Result,
        node4Result,
        triggerData,
        startTime,
        enableUserMapping,
        autoCreateUser,
        fromEmail
      });
      
      if (enableDebug) {
        console.log('📤 准备调用Edge Function:', {
          trigger_event_id: edgeFunctionPayload.trigger_event_id,
          execution_path: edgeFunctionPayload.execution_path,
          enable_user_mapping: edgeFunctionPayload.enable_user_mapping,
          email_subject: edgeFunctionPayload.email_subject,
          from_email: edgeFunctionPayload.from_email,
          from_name: edgeFunctionPayload.from_name,
          to_email: edgeFunctionPayload.to_email
        });
        
        console.log('📤 完整Edge Function载荷:');
        console.log(JSON.stringify(edgeFunctionPayload, null, 2));
      }
      
      // 5. 检查Supabase配置
      if (enableDebug) {
        console.log('🔧 配置检查:', {
          supabaseUrl: supabaseUrl ? '已配置' : '未配置',
          supabaseKey: supabaseKey ? '已配置' : '未配置',
          enableUserMapping: enableUserMapping,
          actualUrl: supabaseUrl,
          keyLength: supabaseKey ? supabaseKey.length : 0
        });
      }
      
      // 6. 调用Edge Function处理数据
      let edgeFunctionResult = null;
      if (!supabaseUrl) {
        console.error('❌ 缺少Supabase URL配置');
        edgeFunctionResult = createSkippedResult('缺少Supabase URL配置', triggerData, emailInfo, node2Result, executionPath, startTime);
      } else if (!supabaseKey) {
        console.error('❌ 缺少Supabase服务密钥配置');
        edgeFunctionResult = createSkippedResult('缺少Supabase服务密钥配置', triggerData, emailInfo, node2Result, executionPath, startTime);
      } else {
        console.log('✅ Supabase配置完整，调用Edge Function...');
        // 构建props对象传递给callEdgeFunction
        const props = { supabaseUrl, supabaseKey };
        edgeFunctionResult = await callEdgeFunction(edgeFunctionPayload, props);
        
        if (enableDebug) {
          console.log('📨 Edge Function响应:', {
            success: edgeFunctionResult?.success,
            summaryId: edgeFunctionResult?.summary?.id,
            error: edgeFunctionResult?.error
          });
        }
      }
      
      // 7. 处理Edge Function结果
      if (edgeFunctionResult?.success) {
        console.log('✅ Node 5: 邮件处理汇总完成');
        console.log('📈 处理结果统计:', {
          执行路径: edgeFunctionResult.summary.execution_path,
          整体状态: edgeFunctionResult.summary.overall_status,
          用户映射: edgeFunctionResult.user_mapping.status,
          处理建议数: edgeFunctionResult.recommendations?.length || 0,
          总处理时间: edgeFunctionResult.processing_stats.total_processing_time + 'ms'
        });
        
        // 添加Node5处理时间
        edgeFunctionResult.node5_processing_time = Date.now() - startTime;
        edgeFunctionResult.full_summary = enableDebug ? edgeFunctionPayload : null;
        
        return edgeFunctionResult;
      } else {
        // Edge Function调用失败，返回错误结果
        console.error('❌ Edge Function调用失败:', edgeFunctionResult?.error);
        return {
          action: 'edge_function_failed',
          success: false,
          error: edgeFunctionResult?.error || 'Edge Function调用失败',
          edge_function_result: edgeFunctionResult,
          processing_time: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };
      }
      
    } catch (error) {
      console.error('❌ Node 5: 邮件处理汇总失败:', error);
      return {
        action: 'summarization_failed',
        success: false,
        error: error.message,
        error_details: {
          stack: error.stack,
          name: error.name
        },
        processing_time: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }
});