#!/usr/bin/env node
/**
 * 专门调试bodyStructure数据结构
 */

async function debugBodyStructure() {
    console.log('🔍 调试bodyStructure数据结构');
    console.log('='.repeat(60));
    
    const functionUrl = "https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/email-scan-deno-imap";
    
    // 创建特殊的调试请求，只处理1封邮件并输出详细结构
    const testData = {
        userId: "bd9a6722-a781-4f0b-8856-c6c5e261cbd0",
        emailAccountId: "c8a5b42f-62dd-4c0d-8b36-45d2a01d1a63", 
        requestId: `debug-bodystructure-${Date.now()}`,
        scanParams: {
            folders: ["INBOX"],
            subject_keywords: ["发票"], 
            max_emails: 1, // 只处理1封邮件
            download_attachments: false, // 关闭下载，专注于结构分析
            list_all_emails: false
        },
        description: "调试bodyStructure数据结构"
    };
    
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE`
    };
    
    try {
        console.log("📧 发送bodyStructure调试请求...");
        console.log("参数:", JSON.stringify(testData, null, 2));
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(testData)
        });
        
        console.log(`📊 响应状态码: ${response.status}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log("✅ 调试请求成功!");
            
            // 显示返回的结果，特别关注bodyStructure相关信息
            console.log("\n📊 调试结果:");
            if (result.job_id) {
                console.log(`任务ID: ${result.job_id}`);
                
                // 等待任务完成并获取详细结果
                console.log("\n⏳ 等待任务完成...");
                await new Promise(resolve => setTimeout(resolve, 8000));
                
                // 检查任务结果
                const jobResult = await checkDebugJobStatus(result.job_id);
                
            } else {
                console.log("结果数据:", JSON.stringify(result, null, 2));
            }
            
        } else {
            console.log("❌ 调试请求失败!");
            const errorText = await response.text();
            console.log("错误响应:", errorText);
        }
        
    } catch (error) {
        console.log(`❌ 调试失败: ${error.message}`);
    }
}

async function checkDebugJobStatus(jobId) {
    const supabaseUrl = "https://sfenhhtvcyslxplvewmt.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE";
    
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/email_scan_jobs?select=*&job_id=eq.${jobId}`, {
            headers: {
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
                "Content-Type": "application/json"
            }
        });
        
        if (response.ok) {
            const results = await response.json();
            if (results.length > 0) {
                const job = results[0];
                console.log(`\n📊 调试任务结果:`, {
                    status: job.status,
                    progress: job.progress + "%",
                    current_step: job.current_step,
                    matched_emails: job.matched_emails,
                });
                
                if (job.status === "completed" && job.scan_results) {
                    const results = job.scan_results;
                    console.log("\n🔍 bodyStructure调试信息:");
                    
                    if (results.emails && results.emails.length > 0) {
                        const email = results.emails[0]; // 只看第一封邮件
                        console.log(`\n📧 邮件UID ${email.uid}:`, {
                            subject: email.subject,
                            from: email.from,
                            has_attachments: email.has_attachments,
                            has_email_body: email.has_email_body || false,
                            email_body_size: email.email_body_size || 0,
                            body_extraction_method: email.body_extraction_method || 'none'
                        });
                        
                        // 查看正文内容预览
                        if (email.email_body_preview) {
                            console.log(`\n📄 正文预览 (前200字符):`);
                            console.log(email.email_body_preview.substring(0, 200) + (email.email_body_preview.length > 200 ? '...' : ''));
                        }
                        
                        // 查看附件信息
                        if (email.attachment_names && email.attachment_names.length > 0) {
                            console.log(`\n📎 附件列表:`, email.attachment_names);
                        }
                        
                        console.log(`\n🔍 关键调试信息:`);
                        console.log(`   - 邮件主题解码后: ${email.subject || '无主题'}`);
                        console.log(`   - 附件检测结果: ${email.has_attachments ? '有附件' : '无附件'}`);
                        console.log(`   - 正文提取结果: ${email.has_email_body ? '成功' : '失败'}`);
                        console.log(`   - 正文大小: ${email.email_body_size || 0} 字符`);
                        
                    } else {
                        console.log("❌ 没有找到邮件数据");
                    }
                } else if (job.status === "failed") {
                    console.log("❌ 调试任务失败:", job.error_message);
                } else {
                    console.log("⏳ 任务还在进行中...");
                }
            }
        }
    } catch (error) {
        console.log(`⚠️ 检查调试任务状态失败: ${error.message}`);
    }
}

// 运行调试
debugBodyStructure().catch(console.error);