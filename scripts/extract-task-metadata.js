/**
 * 任务元数据提取节点
 * 从 Pipedream 邮件处理结果中提取任务元数据并格式化为数据库格式
 */

/**
 * 提取任务元数据
 * @param {Object} pipedreamResult - Pipedream 处理结果
 * @param {string} userId - 用户ID
 * @returns {Object} 格式化的任务元数据
 */
function extractTaskMetadata(pipedreamResult, userId) {
    const startTime = new Date();
    
    try {
        // 解析邮件发送者信息
        const senderInfo = extractSenderInfo(pipedreamResult);
        
        // 提取任务基础信息
        const taskId = generateTaskId(senderInfo.email, startTime);
        
        // 提取处理结果统计
        const processingStats = extractProcessingStats(pipedreamResult);
        
        // 提取错误信息
        const errorInfo = extractErrorInfo(pipedreamResult);
        
        // 构建任务数据
        const taskData = buildTaskData(pipedreamResult, senderInfo);
        
        // 构建结果数据
        const resultData = buildResultData(pipedreamResult, processingStats);
        
        // 计算处理时间
        const processingTime = calculateProcessingTime(pipedreamResult);
        
        return {
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
            email_subject: extractEmailSubject(pipedreamResult),
            email_received_at: extractEmailReceivedTime(pipedreamResult),
            email_message_id: extractMessageId(pipedreamResult),
            
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
            max_retries: 3
        };
        
    } catch (error) {
        console.error('提取任务元数据失败:', error);
        return buildErrorTaskMetadata(pipedreamResult, userId, error);
    }
}

/**
 * 提取发送者信息
 */
function extractSenderInfo(pipedreamResult) {
    const senderData = pipedreamResult.$return_value;
    
    if (senderData && senderData.sender_info) {
        return {
            email: senderData.sender_info.email || senderData.extracted_email,
            displayName: senderData.sender_info.display_name || '',
            original: senderData.sender_info.original || senderData.original_text
        };
    }
    
    // 从其他地方提取邮箱信息
    if (senderData && senderData.extracted_email) {
        return {
            email: senderData.extracted_email,
            displayName: '',
            original: senderData.original_text || ''
        };
    }
    
    return {
        email: 'unknown@unknown.com',
        displayName: '',
        original: ''
    };
}

/**
 * 提取处理统计信息
 */
function extractProcessingStats(pipedreamResult) {
    const resultData = pipedreamResult.$return_value;
    
    return {
        totalFiles: resultData.pdf_count || 0,
        successCount: resultData.processed_count || 0,
        failedCount: resultData.failed_count || 0,
        successRate: resultData.summary?.success_rate || '0%'
    };
}

/**
 * 提取错误信息
 */
function extractErrorInfo(pipedreamResult) {
    const resultData = pipedreamResult.$return_value;
    
    if (!resultData.success && resultData.results && resultData.results.length > 0) {
        const firstError = resultData.results[0].error;
        
        return {
            message: firstError?.details?.error || '处理失败',
            details: {
                error_type: firstError?.details?.error || 'unknown_error',
                http_status: firstError?.status || 500,
                details: firstError?.details?.details || '',
                failed_urls: resultData.results
                    .filter(r => !r.success)
                    .map(r => r.url),
                processing_steps: firstError?.details?.steps || []
            }
        };
    }
    
    return {
        message: null,
        details: null
    };
}

/**
 * 构建任务数据
 */
function buildTaskData(pipedreamResult, senderInfo) {
    const resultData = pipedreamResult.$return_value;
    
    return {
        sender_info: senderInfo,
        pdf_files: (resultData.results || []).map(result => ({
            filename: result.filename,
            url: result.url,
            file_id: extractFileIdFromUrl(result.url),
            success: result.success || false
        })),
        total_files: resultData.pdf_count || 0,
        extraction_method: pipedreamResult.$return_value?.extraction_method || 'unknown',
        confidence: pipedreamResult.$return_value?.confidence || 0
    };
}

/**
 * 构建结果数据
 */
function buildResultData(pipedreamResult, processingStats) {
    const resultData = pipedreamResult.$return_value;
    
    return {
        success_rate: processingStats.successRate,
        summary: {
            total_pdfs: processingStats.totalFiles,
            successful_processing: processingStats.successCount,
            failed_processing: processingStats.failedCount
        },
        file_results: (resultData.results || []).map(result => ({
            filename: result.filename,
            success: result.success || false,
            error: result.error?.message || null,
            processing_time: result.error?.details?.processingTime || 0,
            status: result.error?.status || (result.success ? 200 : 400)
        }))
    };
}

/**
 * 计算处理时间
 */
function calculateProcessingTime(pipedreamResult) {
    const resultData = pipedreamResult.$return_value;
    
    if (resultData.results && resultData.results.length > 0) {
        const processingTimes = resultData.results
            .map(r => r.error?.details?.processingTime || 0)
            .filter(t => t > 0);
        
        if (processingTimes.length > 0) {
            return processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
        }
    }
    
    return 0;
}

/**
 * 确定任务状态
 */
function determineTaskStatus(processingStats) {
    if (processingStats.successCount === processingStats.totalFiles) {
        return 'completed';
    } else if (processingStats.successCount > 0) {
        return 'partially_completed';
    } else {
        return 'failed';
    }
}

/**
 * 生成任务ID
 */
function generateTaskId(email, timestamp) {
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.getTime().toString().slice(-6);
    const emailPrefix = email.split('@')[0].slice(0, 8);
    
    return `email_${emailPrefix}_${dateStr}_${timeStr}`;
}

/**
 * 提取邮件主题
 */
function extractEmailSubject(pipedreamResult) {
    // 这里需要根据实际的数据结构来提取
    // 如果有的话从 pipedreamResult 中提取
    return null;
}

/**
 * 提取邮件接收时间
 */
function extractEmailReceivedTime(pipedreamResult) {
    // 这里需要根据实际的数据结构来提取
    return null;
}

/**
 * 提取消息ID
 */
function extractMessageId(pipedreamResult) {
    // 这里需要根据实际的数据结构来提取
    return null;
}

/**
 * 从URL中提取文件ID
 */
function extractFileIdFromUrl(url) {
    if (!url) return null;
    
    const match = url.match(/parsed\/([a-f0-9-]+)/);
    return match ? match[1] : null;
}

/**
 * 构建错误任务元数据
 */
function buildErrorTaskMetadata(pipedreamResult, userId, error) {
    const timestamp = new Date();
    
    return {
        user_id: userId,
        task_type: 'email_invoice',
        task_id: `error_${timestamp.getTime()}`,
        status: 'failed',
        started_at: timestamp.toISOString(),
        completed_at: timestamp.toISOString(),
        last_activity_at: timestamp.toISOString(),
        email_from: 'unknown@unknown.com',
        attachments_count: 0,
        processed_count: 0,
        failed_count: 0,
        processing_time_seconds: 0,
        task_data: { raw_data: pipedreamResult },
        result_data: { error: 'metadata_extraction_failed' },
        error_message: `元数据提取失败: ${error.message}`,
        error_details: {
            error_type: 'metadata_extraction_error',
            original_error: error.message,
            stack: error.stack
        },
        retry_count: 0,
        max_retries: 3
    };
}

/**
 * 验证任务元数据
 */
function validateTaskMetadata(metadata) {
    const required = ['user_id', 'task_type', 'task_id', 'status'];
    const missing = required.filter(field => !metadata[field]);
    
    if (missing.length > 0) {
        throw new Error(`缺少必需字段: ${missing.join(', ')}`);
    }
    
    return true;
}

// 示例使用
function example() {
    // 模拟的 pipedreamResult 数据
    const samplePipedreamResult = {
        "$return_value": {
            "success": true,
            "original_text": "laoxu <vmxmy@qq.com>",
            "extracted_email": "vmxmy@qq.com",
            "sender_info": {
                "display_name": "laoxu",
                "email": "vmxmy@qq.com",
                "original": "laoxu <vmxmy@qq.com>"
            },
            "pdf_count": 10,
            "processed_count": 0,
            "failed_count": 10,
            "results": [
                {
                    "filename": "【飞猪】成都-广州订单8291702307288-机票款凭证.pdf",
                    "url": "https://pipedream-emails.s3.amazonaws.com/parsed/b26e52f6-3cdf-45e6-8475-bce9a3ea4f73",
                    "success": false,
                    "error": {
                        "message": "存储桶文件获取失败",
                        "status": 400,
                        "details": {
                            "error": "存储桶文件获取失败",
                            "details": "HTTP请求失败: HTTP下载失败: 400 Bad Request",
                            "processingTime": 24,
                            "steps": ["初始化Supabase客户端", "获取存储桶文件信息", "存储桶文件获取失败"]
                        }
                    }
                }
            ],
            "summary": {
                "total_pdfs": 10,
                "successful_processing": 0,
                "failed_processing": 10,
                "success_rate": "0%"
            }
        }
    };
    
    const userId = "user-123";
    const extractedMetadata = extractTaskMetadata(samplePipedreamResult, userId);
    
    console.log('提取的任务元数据:', JSON.stringify(extractedMetadata, null, 2));
    
    return extractedMetadata;
}

// 导出函数
module.exports = {
    extractTaskMetadata,
    validateTaskMetadata,
    example
};

// 如果直接运行此文件，执行示例
if (require.main === module) {
    example();
}