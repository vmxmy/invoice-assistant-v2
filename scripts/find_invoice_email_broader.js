#!/usr/bin/env node
/**
 * 更宽松的搜索策略来找到发票邮件
 * 扩大时间范围和关键词搜索
 */

async function findInvoiceEmailBroader() {
    console.log('🔍 使用更宽松的策略搜索发票邮件');
    console.log('='.repeat(80));
    console.log('🎯 目标: 找到包含PDF附件的发票邮件');
    
    const functionUrl = "https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/email-scan-deno-imap";
    
    // 更宽松的搜索策略
    const testData = {
        userId: "bd9a6722-a781-4f0b-8856-c6c5e261cbd0",
        emailAccountId: "c8a5b42f-62dd-4c0d-8b36-45d2a01d1a63", 
        requestId: `broader-invoice-search-${Date.now()}`,
        scanParams: {
            folders: ["INBOX", "Sent", "Drafts"], // 扩大文件夹搜索
            subject_keywords: [
                "发票", // 发票
                "dzfp", // 电子发票缩写
                "厦门", // 城市名
                "餐饮", // 行业
                "集聚香", // 公司名部分
                "20250722", // 日期部分
                "25942000000036499020" // 发票号部分
            ],
            max_emails: 200, // 大幅增加搜索数量
            download_attachments: true, // 确保启用PDF处理
            date_from: "2025-07-01", // 扩大时间范围到整个7月
            date_to: "2025-07-31"
        },
        description: "宽松搜索策略寻找发票邮件"
    };
    
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE`
    };
    
    try {
        console.log("\\n🚀 启动宽松搜索...");
        console.log("搜索策略:", JSON.stringify({
            关键词: testData.scanParams.subject_keywords,
            邮件文件夹: testData.scanParams.folders,
            时间范围: "2025-07-01 到 2025-07-31",
            最大邮件数: testData.scanParams.max_emails,
            PDF处理: "✅ 启用"
        }, null, 2));
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(testData)
        });
        
        console.log(`\\n📊 响应状态: ${response.status}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log("✅ 宽松搜索任务创建成功!");
            console.log("任务详情:", JSON.stringify(result, null, 2));
            
            const jobId = result.job_id;
            if (jobId) {
                console.log(`\\n🔍 监控宽松搜索任务: ${jobId}`);
                console.log("💡 重点关注: 有附件的邮件和PDF处理");
                
                // 监控任务
                for (let i = 0; i < 60; i++) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    console.log(`⏱️  搜索中... ${i+1}/60 (${5*(i+1)}秒)`);
                    
                    const completed = await checkBroaderSearchStatus(jobId);
                    if (completed) break;
                }
            }
        } else {
            console.log("❌ 宽松搜索任务创建失败!");
            const errorText = await response.text();
            console.log("错误详情:", errorText);
        }
        
    } catch (error) {
        console.log(`❌ 宽松搜索测试失败: ${error.message}`);
    }
}

async function checkBroaderSearchStatus(jobId) {
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
                console.log(`\\n📊 [${new Date().toLocaleTimeString()}] 搜索状态:`, {
                    status: job.status,
                    progress: job.progress + "%",
                    current_step: job.current_step,
                    matched_emails: job.matched_emails,
                    downloaded_attachments: job.downloaded_attachments,
                    processed_invoices: job.processed_invoices
                });
                
                if (job.status === "completed") {
                    console.log("\\n🎉 宽松搜索完成!");
                    
                    if (job.scan_results) {
                        const results = job.scan_results;
                        
                        console.log("\\n📈 搜索结果分析:");
                        console.log(`📧 邮件统计:`);
                        console.log(`   - 匹配邮件数: ${results.matched_emails}`);
                        console.log(`   - 有附件邮件: ${results.emails_with_attachments || 0}`);
                        
                        console.log(`\\n📄 PDF处理:`);
                        console.log(`   - PDF附件: ${results.downloaded_pdf_attachments || 0}`);
                        console.log(`   - PDF链接: ${results.extracted_pdf_links || 0}`);
                        
                        console.log(`\\n🔍 OCR处理:`);
                        console.log(`   - OCR处理数: ${results.ocr_processed_pdfs || 0}`);
                        console.log(`   - 成功识别: ${results.ocr_success_count || 0}`);
                        console.log(`   - 发票创建: ${results.invoices_created || 0}`);
                        
                        // 如果找到了PDF附件，重点显示
                        if (results.downloaded_pdf_attachments > 0 || results.extracted_pdf_links > 0) {
                            console.log("\\n🎉 找到PDF文件!");
                            
                            if (results.emails && results.emails.length > 0) {
                                const emailsWithPDFs = results.emails.filter(email => 
                                    (email.pdf_attachments && email.pdf_attachments.length > 0) ||
                                    (email.pdf_links && email.pdf_links.length > 0)
                                );
                                
                                if (emailsWithPDFs.length > 0) {
                                    console.log(`\\n📧 包含PDF的邮件 (${emailsWithPDFs.length} 封):`);
                                    
                                    emailsWithPDFs.forEach((email, index) => {
                                        const decodedSubject = decodeEmailSubject(email.subject);
                                        console.log(`\\n${index + 1}. 标题: ${decodedSubject}`);
                                        console.log(`   发件人: ${email.from}`);
                                        console.log(`   日期: ${email.date || '未知'}`);
                                        
                                        // 检查是否是目标邮件
                                        const isTargetEmail = decodedSubject.includes('dzfp') ||
                                                            decodedSubject.includes('厦门') ||
                                                            decodedSubject.includes('餐饮') ||
                                                            decodedSubject.includes('集聚香');
                                        
                                        if (isTargetEmail) {
                                            console.log(`   🎯 这可能是目标发票邮件!`);
                                        }
                                        
                                        if (email.pdf_attachments && email.pdf_attachments.length > 0) {
                                            console.log(`   📎 PDF附件:`);
                                            email.pdf_attachments.forEach((pdf, pdfIndex) => {
                                                console.log(`     ${pdfIndex + 1}. ${pdf.filename} (${Math.round(pdf.size/1024)} KB)`);
                                                
                                                if (pdf.filename.includes('dzfp') || 
                                                    pdf.filename.includes('厦门') ||
                                                    pdf.filename.includes('餐饮')) {
                                                    console.log(`        🎯 这是目标发票PDF!`);
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        }
                        
                        // 显示所有匹配邮件的标题（寻找线索）
                        if (results.emails && results.emails.length > 0) {
                            console.log("\\n📧 所有匹配邮件标题（寻找目标邮件）:");
                            results.emails.forEach((email, index) => {
                                const decodedSubject = decodeEmailSubject(email.subject);
                                const hasAttachment = email.has_attachments ? '📎' : '  ';
                                console.log(`${index + 1}. ${hasAttachment} ${decodedSubject}`);
                                console.log(`    发件人: ${email.from}, 日期: ${email.date?.substring(0, 10) || '未知'}`);
                                
                                // 标记可能的目标邮件
                                if (decodedSubject.includes('发票') || 
                                    decodedSubject.includes('dzfp') ||
                                    decodedSubject.includes('厦门') ||
                                    decodedSubject.includes('餐饮')) {
                                    console.log(`    🔍 可能相关的邮件!`);
                                }
                            });
                        }
                        
                        if (results.invoices_created > 0) {
                            console.log(`\\n🎉 成功处理了 ${results.invoices_created} 个发票!`);
                        } else if (results.ocr_processed_pdfs > 0) {
                            console.log(`\\n⚠️ 处理了PDF但未创建发票记录，请检查OCR结果`);
                        } else if (results.downloaded_pdf_attachments === 0 && results.extracted_pdf_links === 0) {
                            console.log("\\n💡 未找到PDF文件，建议:");
                            console.log("   1. 检查邮件是否在其他文件夹中");
                            console.log("   2. 确认邮件日期是否在搜索范围内");
                            console.log("   3. 尝试更多关键词搜索");
                        }
                    }
                    
                    return true;
                } else if (job.status === "failed") {
                    console.log("❌ 宽松搜索失败!");
                    console.log("错误:", job.error_message);
                    return true;
                }
            }
        }
    } catch (error) {
        console.log(`⚠️ 检查搜索状态失败: ${error.message}`);
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

// 运行宽松搜索
findInvoiceEmailBroader().catch(console.error);