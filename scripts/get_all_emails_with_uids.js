#!/usr/bin/env node
/**
 * 获取所有邮件的标题和UID，找到目标发票邮件
 * 目标邮件: 发票dzfp_25942000000036499020_厦门集聚香餐饮管理有限公司_20250722130149
 */

async function getAllEmailsWithUIDs() {
    console.log('📋 获取所有邮件的标题和UID');
    console.log('='.repeat(80));
    console.log('🎯 目标: 找到包含 "dzfp_25942000000036499020" 或 "厦门集聚香餐饮管理有限公司" 的邮件');
    
    const functionUrl = "https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/email-scan-deno-imap";
    
    // 配置获取所有邮件的参数
    const testData = {
        userId: "bd9a6722-a781-4f0b-8856-c6c5e261cbd0",
        emailAccountId: "c8a5b42f-62dd-4c0d-8b36-45d2a01d1a63", 
        requestId: `get-all-emails-uids-${Date.now()}`,
        scanParams: {
            folders: ["INBOX"], // 先从收件箱开始
            subject_keywords: [], // 不使用关键词过滤，获取所有邮件
            max_emails: 200, // 获取更多邮件
            download_attachments: false, // 暂时不下载附件，只获取基本信息
            date_from: "2025-07-01", // 7月份的邮件
            date_to: "2025-07-31",
            list_mode: true // 添加标志表示这是列表模式
        },
        description: "获取所有邮件的标题和UID，寻找目标发票邮件"
    };
    
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE`
    };
    
    try {
        console.log("\n🚀 启动邮件列表获取任务...");
        console.log("参数配置:", JSON.stringify({
            文件夹: testData.scanParams.folders,
            最大邮件数: testData.scanParams.max_emails,
            时间范围: "2025-07-01 到 2025-07-31",
            下载附件: "❌ 禁用（仅获取列表）",
            关键词过滤: "❌ 禁用（获取所有邮件）"
        }, null, 2));
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(testData)
        });
        
        console.log(`\n📊 响应状态: ${response.status}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log("✅ 邮件列表获取任务创建成功!");
            console.log("任务详情:", JSON.stringify(result, null, 2));
            
            const jobId = result.job_id;
            if (jobId) {
                console.log(`\n🔍 监控邮件列表获取任务: ${jobId}`);
                console.log("💡 任务目标: 扫描所有邮件 → 显示标题和UID → 找到目标发票邮件");
                
                // 监控任务进度
                for (let i = 0; i < 60; i++) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    console.log(`⏱️  监控中... ${i+1}/60 (${5*(i+1)}秒)`);
                    
                    const completed = await checkEmailListStatus(jobId);
                    if (completed) break;
                }
            }
        } else {
            console.log("❌ 邮件列表获取任务创建失败!");
            const errorText = await response.text();
            console.log("错误详情:", errorText);
        }
        
    } catch (error) {
        console.log(`❌ 邮件列表获取测试失败: ${error.message}`);
    }
}

async function checkEmailListStatus(jobId) {
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
                console.log(`\n📊 [${new Date().toLocaleTimeString()}] 邮件列表获取状态:`, {
                    status: job.status,
                    progress: job.progress + "%",
                    current_step: job.current_step,
                    matched_emails: job.matched_emails,
                    downloaded_attachments: job.downloaded_attachments,
                    processed_invoices: job.processed_invoices
                });
                
                if (job.status === "completed") {
                    console.log("\n🎉 邮件列表获取完成!");
                    
                    if (job.scan_results) {
                        const results = job.scan_results;
                        
                        console.log("\n📈 邮件列表结果:");
                        console.log(`📧 扫描统计:`);
                        console.log(`   - 总邮件数: ${results.matched_emails}`);
                        console.log(`   - 有附件邮件: ${results.emails_with_attachments || 0}`);
                        
                        // 显示所有邮件的标题和UID
                        if (results.emails && results.emails.length > 0) {
                            console.log(`\n📋 所有邮件列表 (${results.emails.length} 封):`);
                            console.log('='.repeat(120));
                            
                            let targetEmailFound = false;
                            let targetEmailInfo = null;
                            
                            results.emails.forEach((email, index) => {
                                const decodedSubject = decodeEmailSubject(email.subject);
                                const hasAttachment = email.has_attachments ? '📎' : '  ';
                                
                                console.log(`\n${(index + 1).toString().padStart(3)}. UID: ${email.uid || '未知'}`);
                                console.log(`     标题: ${decodedSubject}`);
                                console.log(`     发件人: ${email.from || '未知'}`);
                                console.log(`     日期: ${email.date?.substring(0, 19) || '未知'}`);
                                console.log(`     附件: ${hasAttachment}${email.has_attachments ? '有附件' : '无附件'}`);
                                
                                // 检查是否是目标邮件
                                const isTargetEmail = decodedSubject.includes('dzfp_25942000000036499020') ||
                                                    decodedSubject.includes('厦门集聚香餐饮管理有限公司') ||
                                                    decodedSubject.includes('20250722130149') ||
                                                    (decodedSubject.includes('dzfp') && decodedSubject.includes('厦门')) ||
                                                    (decodedSubject.includes('集聚香') && decodedSubject.includes('餐饮'));
                                
                                if (isTargetEmail) {
                                    console.log(`     🎯🎯🎯 这是目标发票邮件! 🎯🎯🎯`);
                                    targetEmailFound = true;
                                    targetEmailInfo = {
                                        uid: email.uid,
                                        subject: decodedSubject,
                                        from: email.from,
                                        date: email.date,
                                        has_attachments: email.has_attachments
                                    };
                                }
                                
                                // 标记可能相关的邮件
                                if (decodedSubject.includes('发票') || 
                                    decodedSubject.includes('dzfp') ||
                                    decodedSubject.includes('厦门') ||
                                    decodedSubject.includes('餐饮') ||
                                    decodedSubject.includes('集聚')) {
                                    console.log(`     💡 可能相关的邮件`);
                                }
                            });
                            
                            // 总结目标邮件查找结果
                            console.log('\n' + '='.repeat(120));
                            if (targetEmailFound && targetEmailInfo) {
                                console.log("🎉 目标发票邮件找到了!");
                                console.log("📧 目标邮件详情:");
                                console.log(`   UID: ${targetEmailInfo.uid}`);
                                console.log(`   标题: ${targetEmailInfo.subject}`);
                                console.log(`   发件人: ${targetEmailInfo.from}`);
                                console.log(`   日期: ${targetEmailInfo.date}`);
                                console.log(`   有附件: ${targetEmailInfo.has_attachments ? '✅ 是' : '❌ 否'}`);
                                
                                if (targetEmailInfo.has_attachments) {
                                    console.log("\n🎯 下一步: 可以使用这个UID下载PDF附件");
                                    console.log(`💡 建议命令: 使用UID ${targetEmailInfo.uid} 下载附件`);
                                } else {
                                    console.log("\n⚠️ 目标邮件没有附件，可能PDF在邮件正文链接中");
                                }
                            } else {
                                console.log("❌ 未找到目标发票邮件");
                                console.log("💡 可能的原因:");
                                console.log("   1. 邮件不在当前时间范围内 (2025-07-01 到 2025-07-31)");
                                console.log("   2. 邮件在其他文件夹中 (Sent, Drafts, Spam等)");
                                console.log("   3. 邮件标题编码方式不同");
                                console.log("   4. 需要搜索更早或更晚的时间");
                                
                                // 显示一些可能相关的邮件
                                const relatedEmails = results.emails.filter(email => {
                                    const decodedSubject = decodeEmailSubject(email.subject);
                                    return decodedSubject.includes('发票') || 
                                           decodedSubject.includes('dzfp') ||
                                           decodedSubject.includes('厦门') ||
                                           decodedSubject.includes('餐饮') ||
                                           decodedSubject.includes('集聚');
                                });
                                
                                if (relatedEmails.length > 0) {
                                    console.log(`\n🔍 找到 ${relatedEmails.length} 封可能相关的邮件:`);
                                    relatedEmails.forEach((email, index) => {
                                        const decodedSubject = decodeEmailSubject(email.subject);
                                        console.log(`   ${index + 1}. UID: ${email.uid} - ${decodedSubject}`);
                                    });
                                }
                            }
                        } else {
                            console.log("\n⚠️ 未找到任何邮件");
                            console.log("💡 建议:");
                            console.log("   1. 检查邮件账户配置");
                            console.log("   2. 扩大时间范围");
                            console.log("   3. 检查其他邮件文件夹");
                        }
                    }
                    
                    return true;
                } else if (job.status === "failed") {
                    console.log("❌ 邮件列表获取失败!");
                    console.log("错误:", job.error_message);
                    return true;
                }
            }
        }
    } catch (error) {
        console.log(`⚠️ 检查邮件列表状态失败: ${error.message}`);
    }
    return false;
}

// 解码邮件标题的辅助函数
function decodeEmailSubject(encodedSubject) {
    try {
        if (encodedSubject && encodedSubject.includes('=?utf-8?B?')) {
            const match = encodedSubject.match(/=\\?utf-8\\?B\\?([^?]+)\\?=/);
            if (match) {
                const base64Content = match[1];
                const decoded = Buffer.from(base64Content, 'base64').toString('utf-8');
                return decoded;
            }
        }
        return encodedSubject || '未知标题';
    } catch (error) {
        return encodedSubject || '解码失败';
    }
}

// 运行邮件列表获取测试
getAllEmailsWithUIDs().catch(console.error);