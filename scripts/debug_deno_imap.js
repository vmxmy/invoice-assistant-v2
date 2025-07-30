#!/usr/bin/env node
/**
 * 调试Deno IMAP连接问题
 */

// 创建一个最简化的测试Edge Function请求
async function debugDenoIMAP() {
    console.log('🔍 调试Deno IMAP连接问题');
    console.log('='.repeat(60));
    
    const functionUrl = "https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/email-scan-deno-imap";
    
    // 最简化的测试请求
    const testData = {
        userId: "bd9a6722-a781-4f0b-8856-c6c5e261cbd0",
        emailAccountId: "c8a5b42f-62dd-4c0d-8b36-45d2a01d1a63", 
        requestId: `debug-test-${Date.now()}`,
        scanParams: {
            folders: ["INBOX"],
            subject_keywords: ["test"], // 简单的测试关键词
            max_emails: 5,
            download_attachments: false
        },
        description: "调试IMAP连接"
    };
    
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE`
    };
    
    try {
        console.log("📧 发送调试请求...");
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(testData)
        });
        
        console.log(`📊 响应状态码: ${response.status}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log("✅ 任务创建成功!");
            console.log("响应数据:", JSON.stringify(result, null, 2));
            
            const jobId = result.job_id;
            if (jobId) {
                // 等待更长时间以便查看详细错误
                console.log(`\n⏳ 等待任务完成: ${jobId}`);
                
                for (let i = 0; i < 15; i++) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    console.log(`⏱️  等待中... ${i+1}/15 (${2*(i+1)}秒)`);
                    
                    // 检查任务状态
                    await checkDetailedStatus(jobId);
                }
            }
        } else {
            console.log("❌ 任务创建失败!");
            const errorText = await response.text();
            console.log("错误响应:", errorText);
        }
        
    } catch (error) {
        console.log(`❌ 调试失败: ${error.message}`);
    }
}

async function checkDetailedStatus(jobId) {
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
                console.log(`\n📊 [${new Date().toLocaleTimeString()}] 任务状态:`, {
                    status: job.status,
                    progress: job.progress + "%",
                    current_step: job.current_step,
                    error_message: job.error_message ? job.error_message.substring(0, 200) + "..." : null
                });
                
                if (job.status === "completed") {
                    console.log("✅ 任务完成!");
                    if (job.scan_results?.emails) {
                        console.log(`📧 找到邮件数: ${job.scan_results.emails.length}`);
                    }
                    return true;
                } else if (job.status === "failed") {
                    console.log("❌ 任务失败!");
                    console.log("完整错误信息:", job.error_message);
                    if (job.metadata?.error_details) {
                        console.log("错误详情:", JSON.stringify(job.metadata.error_details, null, 2));
                    }
                    return true;
                }
            }
        }
    } catch (error) {
        console.log(`⚠️ 检查状态失败: ${error.message}`);
    }
    return false;
}

// 运行调试
debugDenoIMAP().catch(console.error);