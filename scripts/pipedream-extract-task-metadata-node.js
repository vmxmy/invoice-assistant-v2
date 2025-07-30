/**
 * Pipedream 任务元数据提取节点
 * 从邮件处理结果中提取任务元数据并格式化为数据库格式
 */

export default defineComponent({
  async run({ steps, $ }) {
    // 获取前一步的邮件处理结果和用户信息
    const emailProcessingResult = steps.pdf2supabase.$return_value;
    const emailAccountInfo = steps.get_email_account.$return_value;
    const userId = emailAccountInfo?.user_id || "default-user";
    
    const startTime = new Date();
    
    try {
      // 提取发送者信息
      const senderInfo = extractSenderInfo(emailAccountInfo, emailProcessingResult);
      
      // 提取任务基础信息
      const taskId = generateTaskId(senderInfo.email, startTime);
      
      // 提取处理结果统计
      const processingStats = extractProcessingStats(emailProcessingResult);
      
      // 提取错误信息
      const errorInfo = extractErrorInfo(emailProcessingResult);
      
      // 构建任务数据
      const taskData = buildTaskData(emailProcessingResult, senderInfo, emailAccountInfo);
      
      // 构建结果数据
      const resultData = buildResultData(emailProcessingResult, processingStats);
      
      // 计算处理时间
      const processingTime = calculateProcessingTime(emailProcessingResult);
      
      // 构建完整的任务元数据
      const taskMetadata = {
        // 基础字段
        user_id: userId,
        task_type: 'email_invoice',
        task_id: taskId,
        status: determineTaskStatus(processingStats),
        
        // 时间字段
        started_at: startTime.toISOString(),
        completed_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        
        // 邮件相关字段
        email_from: senderInfo.email,
        email_subject: extractEmailSubject(steps),
        email_received_at: extractEmailReceivedTime(steps),
        email_message_id: extractMessageId(steps),
        
        // 处理统计
        attachments_count: processingStats.totalFiles,
        processed_count: processingStats.successCount,
        failed_count: processingStats.failedCount,
        processing_time_seconds: processingTime,
        
        // JSON 数据
        task_data: taskData,
        result_data: resultData,
        
        // 错误信息
        error_message: errorInfo.message,
        error_details: errorInfo.details,
        
        // 重试设置
        retry_count: 0,
        max_retries: 3,
        
        // 版本控制
        version: 1,
        created_by: userId,
        updated_by: userId
      };
      
      // 验证元数据
      validateTaskMetadata(taskMetadata);
      
      console.log(`成功提取任务元数据: ${taskId}`);
      console.log(`处理统计: 总计${processingStats.totalFiles}个文件, 成功${processingStats.successCount}个, 失败${processingStats.failedCount}个`);
      
      return {
        success: true,
        task_metadata: taskMetadata,
        summary: {
          task_id: taskId,
          total_files: processingStats.totalFiles,
          success_count: processingStats.successCount,
          failed_count: processingStats.failedCount,
          success_rate: processingStats.successRate,
          processing_time_seconds: processingTime
        }
      };
      
    } catch (error) {
      console.error('提取任务元数据失败:', error);
      
      // 返回错误任务元数据
      const errorTaskMetadata = buildErrorTaskMetadata(emailProcessingResult, userId, error, startTime);
      
      return {
        success: false,
        error: error.message,
        task_metadata: errorTaskMetadata,
        debug_info: {
          email_processing_result: emailProcessingResult,
          email_account_info: emailAccountInfo,
          error_stack: error.stack
        }
      };
    }
    
    // 辅助函数定义
    function generateTaskId(email, timestamp) {
      const dateStr = timestamp.toISOString().split('T')[0];
      const timeStr = timestamp.getTime().toString().slice(-6);
      const emailPrefix = email.split('@')[0].slice(0, 8);
      
      return `email_${emailPrefix}_${dateStr}_${timeStr}`;
    }
    
    function extractProcessingStats(result) {
      return {
        totalFiles: result.pdf_count || 0,
        successCount: result.processed_count || 0,
        failedCount: result.failed_count || 0,
        successRate: result.summary?.success_rate || '0%'
      };
    }
    
    function extractErrorInfo(result) {
      if (!result.success && result.results && result.results.length > 0) {
        const firstError = result.results.find(r => !r.success)?.error;
        
        if (firstError) {
          return {
            message: firstError.details?.error || firstError.message || '处理失败',
            details: {
              error_type: firstError.details?.error || 'unknown_error',
              http_status: firstError.status || 500,
              details: firstError.details?.details || '',
              failed_urls: result.results
                .filter(r => !r.success)
                .map(r => r.url),
              processing_steps: firstError.details?.steps || [],
              error_count: result.results.filter(r => !r.success).length
            }
          };
        }
      }
      
      return {
        message: null,
        details: null
      };
    }
    
    function extractSenderInfo(emailAccountInfo, emailProcessingResult) {
      // 从 get_email_account 节点获取邮箱信息
      const email = emailAccountInfo?.email || emailAccountInfo?.email_address || 'unknown@unknown.com';
      const displayName = emailAccountInfo?.display_name || emailAccountInfo?.name || '';
      
      // 如果 pdf2supabase 结果中有发送者信息，优先使用
      if (emailProcessingResult?.sender_info) {
        return {
          email: emailProcessingResult.sender_info.email || email,
          display_name: emailProcessingResult.sender_info.display_name || displayName,
          original: emailProcessingResult.sender_info.original || `${displayName} <${email}>`,
          extraction_method: emailProcessingResult.sender_info.extraction_method || 'email_account',
          confidence: emailProcessingResult.sender_info.confidence || 100
        };
      }
      
      return {
        email: email,
        display_name: displayName,
        original: `${displayName} <${email}>`,
        extraction_method: 'email_account',
        confidence: 100
      };
    }
    
    function buildTaskData(result, senderInfo, emailAccountInfo) {
      return {
        sender_info: senderInfo,
        email_account_info: {
          account_id: emailAccountInfo?.id || emailAccountInfo?.account_id,
          email: emailAccountInfo?.email || emailAccountInfo?.email_address,
          provider: emailAccountInfo?.provider || 'unknown',
          settings: emailAccountInfo?.settings || {}
        },
        pdf_files: (result.results || []).map(fileResult => ({
          filename: fileResult.filename,
          url: fileResult.url,
          file_id: extractFileIdFromUrl(fileResult.url),
          success: fileResult.success || false,
          size_estimate: estimateFileSize(fileResult.filename)
        })),
        total_files: result.pdf_count || 0,
        processing_config: {
          max_file_size: '10MB',
          supported_formats: ['pdf'],
          ocr_enabled: true
        }
      };
    }
    
    function buildResultData(result, processingStats) {
      return {
        success_rate: processingStats.successRate,
        summary: {
          total_pdfs: processingStats.totalFiles,
          successful_processing: processingStats.successCount,
          failed_processing: processingStats.failedCount
        },
        file_results: (result.results || []).map(fileResult => ({
          filename: fileResult.filename,
          success: fileResult.success || false,
          error: fileResult.error?.message || null,
          processing_time: fileResult.error?.details?.processingTime || 0,
          status_code: fileResult.error?.status || (fileResult.success ? 200 : 400),
          file_id: extractFileIdFromUrl(fileResult.url)
        })),
        performance_metrics: {
          avg_processing_time: calculateAverageProcessingTime(result.results || []),
          max_processing_time: calculateMaxProcessingTime(result.results || []),
          total_processing_time: calculateTotalProcessingTime(result.results || [])
        }
      };
    }
    
    function calculateProcessingTime(result) {
      if (result.results && result.results.length > 0) {
        const processingTimes = result.results
          .map(r => r.error?.details?.processingTime || 0)
          .filter(t => t > 0);
        
        if (processingTimes.length > 0) {
          return Math.round(processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length);
        }
      }
      
      return 0;
    }
    
    function calculateAverageProcessingTime(results) {
      const times = results.map(r => r.error?.details?.processingTime || 0).filter(t => t > 0);
      return times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    }
    
    function calculateMaxProcessingTime(results) {
      const times = results.map(r => r.error?.details?.processingTime || 0);
      return Math.max(...times, 0);
    }
    
    function calculateTotalProcessingTime(results) {
      return results.reduce((sum, r) => sum + (r.error?.details?.processingTime || 0), 0);
    }
    
    function determineTaskStatus(processingStats) {
      if (processingStats.totalFiles === 0) {
        return 'completed'; // 没有文件要处理
      } else if (processingStats.successCount === processingStats.totalFiles) {
        return 'completed'; // 全部成功
      } else if (processingStats.successCount > 0) {
        return 'partially_completed'; // 部分成功
      } else {
        return 'failed'; // 全部失败
      }
    }
    
    function extractEmailSubject(steps) {
      // 尝试从不同步骤中提取邮件主题
      return steps.get_email_account?.subject || 
             steps.pdf2supabase?.email_subject || 
             steps.email_trigger?.subject || 
             null;
    }
    
    function extractEmailReceivedTime(steps) {
      // 尝试从不同步骤中提取邮件接收时间
      const receivedTime = steps.get_email_account?.received_at || 
                          steps.pdf2supabase?.email_received_at ||
                          steps.email_trigger?.received_at;
      
      return receivedTime ? new Date(receivedTime).toISOString() : null;
    }
    
    function extractMessageId(steps) {
      // 尝试从不同步骤中提取消息ID
      return steps.get_email_account?.message_id || 
             steps.pdf2supabase?.email_message_id ||
             steps.email_trigger?.message_id || 
             null;
    }
    
    function extractFileIdFromUrl(url) {
      if (!url) return null;
      
      const match = url.match(/parsed\/([a-f0-9-]+)/);
      return match ? match[1] : null;
    }
    
    function estimateFileSize(filename) {
      // 根据文件名估算文件大小（简单估算）
      if (filename.includes('发票') || filename.includes('凭证')) {
        return 'medium'; // 发票类文件通常中等大小
      }
      return 'unknown';
    }
    
    function buildErrorTaskMetadata(result, userId, error, startTime) {
      return {
        user_id: userId,
        task_type: 'email_invoice',
        task_id: `error_${startTime.getTime()}`,
        status: 'failed',
        started_at: startTime.toISOString(),
        completed_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        email_from: 'unknown@unknown.com',
        attachments_count: 0,
        processed_count: 0,
        failed_count: 1,
        processing_time_seconds: 0,
        task_data: { 
          raw_data: result,
          error_context: 'metadata_extraction'
        },
        result_data: { 
          error: 'metadata_extraction_failed',
          error_details: error.message
        },
        error_message: `元数据提取失败: ${error.message}`,
        error_details: {
          error_type: 'metadata_extraction_error',
          original_error: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n') // 限制堆栈长度
        },
        retry_count: 0,
        max_retries: 3,
        version: 1,
        created_by: userId,
        updated_by: userId
      };
    }
    
    function validateTaskMetadata(metadata) {
      const required = ['user_id', 'task_type', 'task_id', 'status'];
      const missing = required.filter(field => !metadata[field]);
      
      if (missing.length > 0) {
        throw new Error(`缺少必需字段: ${missing.join(', ')}`);
      }
      
      // 验证状态值
      const validStatuses = ['pending', 'processing', 'completed', 'partially_completed', 'failed'];
      if (!validStatuses.includes(metadata.status)) {
        throw new Error(`无效的状态值: ${metadata.status}`);
      }
      
      // 验证计数字段
      if (metadata.attachments_count < 0 || metadata.processed_count < 0 || metadata.failed_count < 0) {
        throw new Error('计数字段不能为负数');
      }
      
      return true;
    }
  }
});