#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write

/**
 * 简化版PDF附件下载测试
 * 
 * 使用方法：
 * 1. 复制 email_config.example.ts 为 email_config.ts 并修改配置
 * 2. 运行: deno run --allow-net --allow-read --allow-write simple_pdf_download_test.ts
 */

import { ImapClient } from "jsr:@bobbyg603/deno-imap";

// 尝试导入配置文件，如果不存在则使用默认配置
let EMAIL_CONFIG;
try {
  const config = await import('./email_config.ts');
  EMAIL_CONFIG = config.EMAIL_CONFIG;
} catch {
  // 如果配置文件不存在，使用默认配置
  EMAIL_CONFIG = {
    host: 'imap.qq.com',
    port: 993,
    tls: true,
    username: 'your@qq.com',       // 请修改
    password: 'your-auth-code'     // 请修改
  };
}

/**
 * 简单的PDF下载测试器
 */
class SimplePDFDownloader {
  private client: ImapClient;

  constructor(config: any) {
    this.client = new ImapClient(config);
  }

  async run() {
    console.log('🚀 开始PDF附件下载测试');

    try {
      // 1. 连接
      console.log('\n🔌 连接邮箱...');
      await this.client.connect();
      await this.client.selectMailbox('INBOX');
      console.log('✅ 连接成功');

      // 2. 搜索最近的邮件
      console.log('\n🔍 搜索最近的邮件...');
      const recentIds = await this.client.search({
        date: {
          internal: {
            since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 最近7天
          }
        }
      });
      console.log(`找到 ${recentIds.length} 封最近的邮件`);

      // 3. 检查前5封邮件
      const testIds = recentIds.slice(-5);
      console.log(`\n📧 检查最近的 ${testIds.length} 封邮件...`);

      for (const messageId of testIds) {
        await this.checkEmailForPDF(messageId);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 避免请求过频
      }

    } catch (error) {
      console.error('❌ 测试失败:', error.message);
    } finally {
      try {
        await this.client.disconnect();
        console.log('🔌 连接已断开');
      } catch (e) {
        console.warn('断开连接时出错:', e.message);
      }
    }
  }

  /**
   * 检查单封邮件的PDF附件
   */
  async checkEmailForPDF(messageId: number) {
    try {
      console.log(`\n📧 检查邮件 ${messageId}:`);

      // 获取基本信息
      const basicInfo = await this.client.fetch([messageId.toString()], {
        envelope: true
      });

      if (basicInfo.length === 0) {
        console.log('  ❌ 无法获取邮件信息');
        return;
      }

      const message = basicInfo[0];
      const subject = message.envelope?.subject || '无主题';
      const from = message.envelope?.from?.[0];
      const fromAddr = from ? `${from.mailbox}@${from.host}` : '未知';

      console.log(`  主题: ${subject}`);
      console.log(`  发件人: ${fromAddr}`);

      // 尝试获取邮件结构
      try {
        const structureInfo = await this.client.fetch([messageId.toString()], {
          bodyStructure: true
        });

        if (structureInfo.length > 0 && structureInfo[0].bodyStructure) {
          console.log('  ✅ 成功获取邮件结构');
          const pdfs = this.findPDFAttachments(structureInfo[0].bodyStructure);
          
          if (pdfs.length > 0) {
            console.log(`  🎉 发现 ${pdfs.length} 个PDF附件:`);
            for (const pdf of pdfs) {
              console.log(`    - ${pdf.filename} (${pdf.size} bytes)`);
              
              // 尝试下载第一个PDF
              if (pdfs.indexOf(pdf) === 0) {
                await this.downloadPDF(messageId, pdf);
              }
            }
          } else {
            console.log('  ⚪ 无PDF附件');
          }
        }

      } catch (structureError) {
        console.log('  ⚠️  bodyStructure解析失败，尝试应急检测...');
        
        const errorContent = structureError.data || structureError.message || '';
        if (errorContent.toLowerCase().includes('pdf')) {
          console.log('  🔍 在错误信息中发现PDF字样');
          
          // 简单的PDF文件名提取
          const pdfMatch = errorContent.match(/([^"]*\.pdf)/gi);
          if (pdfMatch) {
            console.log(`  📎 可能的PDF文件: ${pdfMatch.join(', ')}`);
          }
        } else {
          console.log('  ❌ 无PDF附件');
        }
      }

    } catch (error) {
      console.log(`  ❌ 检查邮件失败: ${error.message}`);
    }
  }

  /**
   * 从邮件结构中查找PDF附件
   */
  findPDFAttachments(bodyStructure: any, path = '1'): Array<{
    filename: string;
    size: number;
    section: string;
    encoding: string;
  }> {
    const pdfs = [];

    // 检查当前部分是否为PDF
    if (bodyStructure.type === 'APPLICATION' && 
        (bodyStructure.subtype === 'PDF' || 
         (bodyStructure.subtype === 'OCTET-STREAM' && 
          bodyStructure.parameters?.NAME?.toLowerCase().includes('pdf')))) {
      
      let filename = bodyStructure.dispositionParameters?.FILENAME ||
                    bodyStructure.parameters?.NAME ||
                    'unknown.pdf';

      if (filename.toLowerCase().includes('pdf')) {
        pdfs.push({
          filename,
          size: bodyStructure.size || 0,
          section: path,
          encoding: bodyStructure.encoding || 'BASE64'
        });
      }
    }

    // 递归检查子部分
    if (bodyStructure.childParts) {
      for (let i = 0; i < bodyStructure.childParts.length; i++) {
        const childPath = `${path}.${i + 1}`;
        const childPDFs = this.findPDFAttachments(bodyStructure.childParts[i], childPath);
        pdfs.push(...childPDFs);
      }
    }

    return pdfs;
  }

  /**
   * 下载PDF附件
   */
  async downloadPDF(messageId: number, pdfInfo: any) {
    try {
      console.log(`    📥 下载 ${pdfInfo.filename}...`);

      // 获取附件内容
      const contentData = await this.client.fetch([messageId.toString()], {
        bodyParts: [pdfInfo.section]
      });

      if (contentData.length === 0 || !contentData[0].bodyParts) {
        console.log('    ❌ 无法获取附件内容');
        return;
      }

      const encodedContent = contentData[0].bodyParts[pdfInfo.section];
      if (!encodedContent) {
        console.log('    ❌ 附件内容为空');
        return;
      }

      // Base64解码
      let decodedContent: Uint8Array;
      try {
        const binaryString = atob(encodedContent.replace(/\s/g, ''));
        decodedContent = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          decodedContent[i] = binaryString.charCodeAt(i);
        }
      } catch (decodeError) {
        console.log('    ❌ Base64解码失败:', decodeError.message);
        return;
      }

      // 创建下载目录
      const downloadDir = './downloads/test_pdfs';
      try {
        await Deno.mkdir(downloadDir, { recursive: true });
      } catch {
        // 目录可能已存在
      }

      // 保存文件
      const safeFilename = pdfInfo.filename.replace(/[<>:"/\\|?*]/g, '_');
      const filePath = `${downloadDir}/${messageId}_${safeFilename}`;
      
      await Deno.writeFile(filePath, decodedContent);

      console.log(`    ✅ 下载成功: ${filePath}`);
      console.log(`    📊 文件大小: ${decodedContent.length} bytes`);

      // 验证PDF文件
      if (decodedContent.length > 4) {
        const header = Array.from(decodedContent.slice(0, 4))
          .map(b => String.fromCharCode(b))
          .join('');
        
        if (header === '%PDF') {
          console.log('    ✅ PDF文件格式验证通过');
        } else {
          console.log(`    ⚠️  文件头不是PDF格式: ${header}`);
        }
      }

    } catch (error) {
      console.log(`    ❌ 下载失败: ${error.message}`);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  // 检查配置
  if (EMAIL_CONFIG.username === 'your@qq.com') {
    console.log('❌ 请先配置邮箱信息');
    console.log('\n配置方法:');
    console.log('1. 复制 email_config.example.ts 为 email_config.ts');
    console.log('2. 修改 email_config.ts 中的邮箱配置');
    console.log('3. 重新运行此脚本');
    console.log('\n或者直接修改此文件顶部的 EMAIL_CONFIG 变量');
    return;
  }

  const downloader = new SimplePDFDownloader(EMAIL_CONFIG);
  await downloader.run();
}

if (import.meta.main) {
  main().catch(console.error);
}