/**
 * Pipedream Node 3: 转发验证邮件处理器 (修复版)
 * 条件触发：仅当Node 2分类结果为'verification'时执行
 * 功能：提取验证链接和用户邮箱信息
 * 
 * 修复内容：
 * - 修复了过于宽泛的数字邮箱过滤规则
 * - 添加了白名单机制支持常见邮箱域名
 * - 优化了用户邮箱识别逻辑
 */

export default defineComponent({
  props: {
    linkKeywords: {
      type: "string",
      label: "验证链接关键词",
      description: "用于识别验证链接的关键词（OR逻辑）",
      default: "verify,confirm,activate,validation,authentication,login,register,reset,click,点击,验证,确认,激活,登录,注册,重置,auth,token,key"
    },
    enableDebug: {
      type: "boolean",
      label: "启用调试模式",
      description: "输出详细的提取信息",
      default: true
    }
  },
  
  async run({ steps, $ }) {
    try {
      // 获取 Node 2 的分类结果
      let classificationResult;
      
      // 尝试多种可能的数据访问路径
      const possiblePaths = [
        steps.email_classifier?.$return_value,
        steps.email_classifier,
        steps['email_classifier']?.$return_value,
        steps['email_classifier'],
        steps.step_2?.$return_value,
        steps.step_2,
        steps['step_2']?.$return_value,
        steps['step_2'],
        steps.nodejs?.$return_value,
        steps.nodejs,
        steps.code?.$return_value,
        steps.code
      ];
      
      // 找到第一个有效的分类结果
      for (const path of possiblePaths) {
        if (path && typeof path === 'object' && path.emailCategory !== undefined) {
          classificationResult = path;
          break;
        }
      }
      
      if (!classificationResult) {
        console.log('🔍 调试信息 - 所有可用steps:', Object.keys(steps));
        throw new Error('无法获取Node 2的邮件分类结果');
      }

      console.log('🔍 Node 3: 转发验证邮件处理开始...');

      // 检查是否为转发验证邮件
      if (classificationResult.emailCategory !== 'verification') {
        console.log(`❌ 邮件类型不匹配: ${classificationResult.emailCategory}`);
        console.log('⏭️ Node 3 跳过处理，此邮件不是转发验证类型');
        return {
          action: 'skipped',
          reason: `邮件类型为 ${classificationResult.emailCategory}，不是转发验证邮件`,
          emailCategory: classificationResult.emailCategory,
          timestamp: new Date().toISOString()
        };
      }

      console.log('✅ 确认为转发验证邮件，开始提取验证链接和用户邮箱');

      // 获取原始邮件数据
      const emailData = classificationResult.rawEmailData;
      if (!emailData) {
        throw new Error('无法获取原始邮件数据');
      }

      // 解析链接关键词
      const linkKeywords = this.linkKeywords
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0);

      if (this.enableDebug) {
        console.log('⚙️ 配置参数:', {
          linkKeywords: linkKeywords.length,
          emailSubject: emailData.subject,
          classification: {
            category: classificationResult.emailCategory,
            confidence: classificationResult.confidence,
            reason: classificationResult.reason
          }
        });
      }

      // 提取邮件内容
      const bodyHtml = emailData.body_html || emailData.body?.html || '';
      const bodyText = emailData.body_plain || emailData.body?.text || '';
      const content = `${bodyHtml} ${bodyText}`;

      // 提取发件人信息
      let fromEmail = '';
      let fromName = '';
      if (typeof emailData.from === 'string') {
        const match = emailData.from.match(/([^<>\s]+@[^<>\s]+)/);
        fromEmail = match ? match[1].toLowerCase() : emailData.from.toLowerCase();
        const nameMatch = emailData.from.match(/^([^<]+?)\s*</);
        fromName = nameMatch ? nameMatch[1].trim() : '';
      } else if (emailData.from?.value?.[0]?.address) {
        fromEmail = emailData.from.value[0].address.toLowerCase();
        fromName = emailData.from.value[0].name || '';
      } else if (emailData.from?.text) {
        const match = emailData.from.text.match(/([^<>\s]+@[^<>\s]+)/);
        fromEmail = match ? match[1].toLowerCase() : emailData.from.text.toLowerCase();
      }

      if (this.enableDebug) {
        console.log('📧 开始提取验证链接和用户邮箱...');
        console.log('📄 内容统计:', {
          htmlLength: bodyHtml.length,
          textLength: bodyText.length,
          totalLength: content.length,
          fromEmail: fromEmail,
          fromName: fromName
        });
      }

      // 1. 提取验证链接
      const verificationLinks = [];
      
      // 多种URL匹配模式
      const urlPatterns = [
        /https?:\/\/[^\s<>"']+/gi,
        /https?%3A%2F%2F[^\s<>"']+/gi,
        /https?&#58;&#47;&#47;[^\s<>"']+/gi,
        /https?&amp;#58;&amp;#47;&amp;#47;[^\s<>"']+/gi
      ];
      
      urlPatterns.forEach((pattern, patternIndex) => {
        const matches = content.match(pattern) || [];
        if (this.enableDebug && matches.length > 0) {
          console.log(`🔗 URL模式 ${patternIndex + 1} 找到 ${matches.length} 个链接`);
        }
        
        matches.forEach(url => {
          // 解码URL
          let decodedUrl = url;
          try {
            decodedUrl = decodeURIComponent(url.replace(/&amp;/g, '&'));
            decodedUrl = decodedUrl.replace(/&#58;/g, ':').replace(/&#47;/g, '/');
            decodedUrl = decodedUrl.replace(/&amp;#58;/g, ':').replace(/&amp;#47;/g, '/');
          } catch (e) {
            // 解码失败，使用原URL
          }
          
          // 清理URL末尾的标点符号
          decodedUrl = decodedUrl.replace(/[.,;!?)\]}>]+$/, '');
          
          // 检查是否为验证链接
          const urlLower = decodedUrl.toLowerCase();
          const hasKeyword = linkKeywords.some(keyword => urlLower.includes(keyword));
          const hasVerificationFeatures = 
            /token|key|code|hash|id=/.test(urlLower) ||
            /\/(verify|confirm|activate|validate|auth)/i.test(urlLower) ||
            /[?&](verify|confirm|activate|validate|auth|token|key|code|hash)/i.test(urlLower);
          
          if (hasKeyword || hasVerificationFeatures) {
            const domainMatch = decodedUrl.match(/https?:\/\/([^\/]+)/i);
            const domain = domainMatch ? domainMatch[1] : 'unknown';
            
            // 计算优先级
            let priority = 0;
            const matchedLinkKeywords = linkKeywords.filter(keyword => urlLower.includes(keyword));
            matchedLinkKeywords.forEach(keyword => {
              priority += keyword.length; // 长关键词权重更高
            });
            
            // 路径特征加分
            if (/\/(verify|confirm|activate)/i.test(decodedUrl)) priority += 20;
            if (/[?&](verify|confirm|activate)/i.test(decodedUrl)) priority += 15;
            if (/token|key|code|hash/.test(urlLower)) priority += 10;
            if (/[?&]id=/.test(urlLower)) priority += 5;
            
            // 域名权威性加分
            if (/gmail\.com|accounts\.google\.com/i.test(domain)) priority += 8;
            if (/outlook\.com|login\.microsoftonline\.com/i.test(domain)) priority += 8;
            if (/qq\.com|mail\.qq\.com/i.test(domain)) priority += 6;
            if (/163\.com|126\.com/i.test(domain)) priority += 4;
            
            // URL长度适中加分
            const urlLength = decodedUrl.length;
            if (urlLength >= 50 && urlLength <= 300) priority += 3;
            
            // 获取链接类型
            let linkType = 'other';
            if (/gmail\.com|accounts\.google\.com/i.test(domain)) linkType = 'gmail';
            else if (/outlook\.com|live\.com|login\.microsoftonline\.com/i.test(domain)) linkType = 'outlook';
            else if (/qq\.com|mail\.qq\.com/i.test(domain)) linkType = 'qq_mail';
            else if (/163\.com/i.test(domain)) linkType = '163_mail';
            else if (/126\.com/i.test(domain)) linkType = '126_mail';
            else if (/yahoo\.com/i.test(domain)) linkType = 'yahoo';
            
            verificationLinks.push({
              url: decodedUrl,
              domain: domain,
              type: linkType,
              priority: priority,
              matchedKeywords: matchedLinkKeywords,
              hasFeatures: hasVerificationFeatures,
              source: `pattern_${patternIndex + 1}`
            });
          }
        });
      });
      
      // 去重并按优先级排序
      const uniqueLinks = Array.from(new Set(verificationLinks.map(l => l.url)))
        .map(url => verificationLinks.find(l => l.url === url))
        .sort((a, b) => b.priority - a.priority);

      if (this.enableDebug) {
        console.log('🔗 验证链接提取结果:', {
          totalFound: verificationLinks.length,
          uniqueLinks: uniqueLinks.length,
          topLinks: uniqueLinks.slice(0, 3).map(link => ({
            domain: link.domain,
            type: link.type,
            priority: link.priority
          }))
        });
      }

      // 2. 提取用户邮箱地址 (修复版)
      const emailPatterns = [
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        /([a-zA-Z0-9._%+-]+%40[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        /([a-zA-Z0-9._%+-]+&#64;[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        /([a-zA-Z0-9._%+-]+&amp;#64;[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
      ];

      const allEmails = new Set();
      
      emailPatterns.forEach(pattern => {
        const matches = content.match(pattern) || [];
        matches.forEach(email => {
          let cleanEmail = email.toLowerCase();
          // 解码各种编码格式
          cleanEmail = cleanEmail.replace(/%40/g, '@');
          cleanEmail = cleanEmail.replace(/&#64;/g, '@');
          cleanEmail = cleanEmail.replace(/&amp;#64;/g, '@');
          
          // 验证邮箱格式
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (emailRegex.test(cleanEmail) && cleanEmail.length <= 254) {
            allEmails.add(cleanEmail);
          }
        });
      });

      const uniqueEmails = Array.from(allEmails);
      
      // 修复后的系统邮箱模式（更精确的过滤）
      const systemEmailPatterns = [
        /noreply|no-reply|donotreply|do-not-reply/,
        /system@|admin@|support@|service@/,
        /notification@|alert@|info@|help@/,
        /mailer-daemon@|postmaster@|daemon@/,
        /automated@|robot@|bot@|auto@/,
        // 修复：移除过于宽泛的 /\d{4,}@/ 规则，改为精确的系统邮箱规则
        /^10000@qq\.com$|^10001@qq\.com$|^10002@qq\.com$|^10010@qq\.com$/,  // QQ 系统邮箱
        /^163@163\.com$|^126@126\.com$|^netease@163\.com$/,  // 网易系统邮箱
        /upload\.pipedream\.net$|pipedream\.com$/,
        /bounce@|return@|feedback@/
      ];
      
      // 常见用户邮箱域名白名单
      const commonUserDomains = [
        'qq.com', '163.com', '126.com', 'sina.com', 'sina.cn',
        'gmail.com', 'outlook.com', 'hotmail.com', 'live.com',
        'yahoo.com', 'icloud.com', 'foxmail.com'
      ];
      
      // 修复后的邮箱分类逻辑
      const userEmails = uniqueEmails.filter(email => {
        const domain = email.split('@')[1];
        const isSystemPattern = systemEmailPatterns.some(pattern => pattern.test(email));
        const isCommonDomain = commonUserDomains.includes(domain);
        const isFromEmail = email === fromEmail.toLowerCase();
        
        // 如果是常见域名的数字邮箱，不过滤（这是修复的关键部分）
        if (isCommonDomain && /^\d+@/.test(email) && !isFromEmail) {
          return true;
        }
        
        // 其他情况按原逻辑处理
        return !isSystemPattern && !isFromEmail;
      });
      
      const systemEmails = uniqueEmails.filter(email => 
        !userEmails.includes(email)
      );

      // 选择最佳用户邮箱
      const priorityDomains = [
        'gmail.com', 'outlook.com', 'hotmail.com', 'live.com',
        'qq.com', '163.com', '126.com', 'sina.com', 'sina.cn',
        'yahoo.com', 'icloud.com', 'foxmail.com'
      ];
      
      let selectedEmail = null;
      let selectionReason = '未找到用户邮箱';
      
      if (userEmails.length > 0) {
        // 按优先域名查找
        for (const domain of priorityDomains) {
          const domainEmail = userEmails.find(email => email.includes(`@${domain}`));
          if (domainEmail) {
            selectedEmail = domainEmail;
            selectionReason = '优先域名匹配';
            break;
          }
        }
        
        // 如果没有匹配优先域名，选择第一个
        if (!selectedEmail) {
          selectedEmail = userEmails[0];
          selectionReason = '第一个用户邮箱';
        }
      }

      const emailExtractionDetails = {
        totalFoundEmails: uniqueEmails.length,
        uniqueEmails: uniqueEmails,
        userEmails: userEmails,
        systemEmails: systemEmails,
        extractionMethod: '转发验证邮件内容分析 (修复版)',
        selectedEmail: selectedEmail,
        selectionReason: selectionReason,
        fixApplied: '移除了过于宽泛的数字邮箱过滤规则，添加了常见域名白名单机制'
      };

      if (this.enableDebug) {
        console.log('📧 用户邮箱提取结果 (修复版):', {
          totalEmails: uniqueEmails.length,
          userEmails: userEmails.length,
          systemEmails: systemEmails.length,
          selectedEmail: selectedEmail,
          selectionReason: emailExtractionDetails.selectionReason,
          fixApplied: true
        });
      }

      // 3. 构建完整的提取结果
      const result = {
        action: 'verification_info_extracted',
        success: true,
        version: 'fixed_v1.1',  // 标记为修复版本
        
        // 从 Node 2 继承的分类信息
        classificationInfo: {
          emailCategory: classificationResult.emailCategory,
          confidence: classificationResult.confidence,
          reason: classificationResult.reason,
          matchedKeywords: classificationResult.classificationDetails?.matchedKeywords || []
        },
        
        // Node 3 提取的核心信息
        extractedData: {
          // 验证链接信息
          verificationLinks: uniqueLinks,
          primaryVerificationLink: uniqueLinks.length > 0 ? uniqueLinks[0].url : null,
          linkCount: uniqueLinks.length,
          linkExtractionStats: {
            totalFound: verificationLinks.length,
            afterDeduplication: uniqueLinks.length,
            topLinkType: uniqueLinks.length > 0 ? uniqueLinks[0].type : null,
            topLinkPriority: uniqueLinks.length > 0 ? uniqueLinks[0].priority : 0
          },
          
          // 用户邮箱信息
          targetUserEmail: selectedEmail,
          emailExtractionDetails: emailExtractionDetails,
          
          // 发件人信息
          systemFromEmail: fromEmail,
          fromName: fromName,
          
          // 原邮件信息
          originalSubject: emailData.subject,
          originalBody: {
            html: bodyHtml,
            text: bodyText,
            htmlUrl: emailData.body?.htmlUrl,
            textUrl: emailData.body?.textUrl
          }
        },
        
        // 处理配置
        config: {
          linkKeywords: linkKeywords
        },
        
        // 质量评估
        qualityAssessment: {
          hasValidLinks: uniqueLinks.length > 0,
          hasTargetEmail: !!selectedEmail,
          linkQuality: uniqueLinks.length > 0 ? 
            (uniqueLinks[0].priority >= 20 ? 'high' : 
             uniqueLinks[0].priority >= 10 ? 'medium' : 'low') : 'none',
          completeness: uniqueLinks.length > 0 && selectedEmail ? 'complete' : 
                       uniqueLinks.length > 0 ? 'partial_links_only' :
                       selectedEmail ? 'partial_email_only' : 'incomplete'
        },
        
        // 修复记录
        fixLog: {
          applied: true,
          version: '1.1',
          fixes: [
            '移除了过于宽泛的 /\\d{4,}@/ 数字邮箱过滤规则',
            '添加了精确的系统邮箱匹配规则',
            '引入了常见邮箱域名白名单机制',
            '优化了用户邮箱识别逻辑'
          ],
          testCase: '24472795@qq.com 现在能正确识别为用户邮箱'
        },
        
        // 元数据
        attachments: emailData.attachments || [],
        receivedDate: emailData.date || new Date().toISOString(),
        processingTimestamp: new Date().toISOString()
      };

      // 4. 输出处理结果
      console.log('🎉 Node 3: 转发验证邮件处理完成 (修复版)');
      console.log('📊 提取结果统计:', {
        验证链接数量: result.extractedData.linkCount,
        主要验证链接: result.extractedData.primaryVerificationLink ? '已提取' : '未找到',
        目标用户邮箱: result.extractedData.targetUserEmail || '未找到',
        完整性评估: result.qualityAssessment.completeness,
        链接质量: result.qualityAssessment.linkQuality,
        修复状态: '✅ 已应用邮箱提取修复'
      });

      if (result.qualityAssessment.completeness === 'complete') {
        console.log('✅ 提取完整，可进行后续处理');
      } else if (result.qualityAssessment.completeness.startsWith('partial')) {
        console.log('⚠️ 提取部分信息，建议检查邮件内容');
      } else {
        console.log('❌ 提取不完整，可能需要人工处理');
      }

      console.log('📤 准备传递给 Node 4 或数据库存储节点');
      return result;

    } catch (error) {
      console.error('❌ Node 3: 转发验证邮件处理失败:', error);
      return {
        action: 'verification_extraction_failed',
        success: false,
        error: error.message,
        processingTimestamp: new Date().toISOString(),
        version: 'fixed_v1.1',
        debugInfo: {
          availableSteps: Object.keys(steps || {}),
          step2Data: steps.step_2
        }
      };
    }
  }
});