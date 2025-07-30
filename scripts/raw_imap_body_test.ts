#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

/**
 * 原始IMAP命令邮件正文获取测试
 */

import { ImapClient } from "jsr:@bobbyg603/deno-imap";

const EMAIL_CONFIG = {
  host: 'imap.qq.com',
  port: 993,
  tls: true,
  username: 'vmxmy@qq.com',
  password: 'lagrezfyfpnobgic'
};

async function rawImapBodyTest() {
  console.log('🚀 原始IMAP命令邮件正文获取测试\n');

  const client = new ImapClient(EMAIL_CONFIG);
  
  try {
    console.log('🔌 连接QQ邮箱...');
    await client.connect();
    await client.selectMailbox('INBOX');
    console.log('✅ 连接成功');

    // 获取最新的1封邮件进行详细测试
    const allIds = await client.search({});
    const latestId = allIds[allIds.length - 1];
    
    console.log(`🎯 测试邮件 ID: ${latestId}`);

    // 获取基本信息
    const basicInfo = await client.fetch([latestId.toString()], {
      envelope: true,
      size: true
    });

    if (basicInfo.length > 0) {
      const message = basicInfo[0];
      console.log(`📧 主题: ${message.envelope?.subject || '无主题'}`);
      console.log(`📏 大小: ${message.size || 0} bytes`);
    }

    console.log('\n🔍 尝试不同的IMAP FETCH命令:');
    console.log('='.repeat(50));

    // 测试不同的IMAP获取命令
    const fetchCommands = [
      // 基本正文获取
      { name: 'BODY[TEXT]', options: { bodyParts: ['TEXT'] } },
      { name: 'BODY[1]', options: { bodyParts: ['1'] } },
      { name: 'BODY[1.TEXT]', options: { bodyParts: ['1.TEXT'] } },
      { name: 'BODY[2]', options: { bodyParts: ['2'] } },
      
      // PEEK命令（不标记为已读）
      { name: 'BODY.PEEK[TEXT]', options: { bodyParts: ['TEXT'], peek: true } },
      { name: 'BODY.PEEK[1]', options: { bodyParts: ['1'], peek: true } },
      { name: 'BODY.PEEK[1.TEXT]', options: { bodyParts: ['1.TEXT'], peek: true } },
      
      // 完整邮件
      { name: 'BODY[]', options: { body: true } },
      { name: 'RFC822', options: { rfc822: true } },
      { name: 'RFC822.TEXT', options: { rfc822Text: true } },
    ];

    for (const cmd of fetchCommands) {
      console.log(`\n📋 测试: ${cmd.name}`);
      try {
        const result = await client.fetch([latestId.toString()], cmd.options);
        
        if (result.length > 0) {
          const message = result[0];
          let content = null;
          
          // 根据不同的选项提取内容
          if (cmd.options.body && message.body) {
            content = message.body;
          } else if (cmd.options.rfc822 && message.rfc822) {
            content = message.rfc822;
          } else if (cmd.options.rfc822Text && message.rfc822Text) {
            content = message.rfc822Text;
          } else if (message.bodyParts) {
            // 尝试从bodyParts中获取
            const keys = Object.keys(message.bodyParts);
            if (keys.length > 0) {
              content = message.bodyParts[keys[0]];
            }
          }
          
          if (content && typeof content === 'string' && content.trim().length > 0) {
            console.log(`   ✅ 成功获取 ${content.length} 字符`);
            console.log(`   类型: ${typeof content}`);
            
            // 显示内容预览
            const preview = content.substring(0, 200).replace(/\n/g, '\\n');
            console.log(`   预览: ${preview}...`);
            
            // 检查是否是HTML内容
            if (content.includes('<html>') || content.includes('<HTML>')) {
              console.log('   📄 检测到HTML内容');
            }
            
            // 检查是否包含中文
            if (/[\u4e00-\u9fff]/.test(content)) {
              console.log('   🇨🇳 检测到中文内容');
            }
            
            // 如果内容足够长，显示更多统计信息
            if (content.length > 100) {
              const lines = content.split('\n').length;
              console.log(`   📊 行数: ${lines}`);
            }
            
          } else {
            console.log('   ❌ 内容为空或无效');
            if (message.bodyParts) {
              console.log(`   🔍 bodyParts keys: ${Object.keys(message.bodyParts).join(', ')}`);
            }
          }
        } else {
          console.log('   ❌ 无结果返回');
        }
        
      } catch (error) {
        console.log(`   ❌ 失败: ${error.message}`);
      }
    }

    // 尝试获取详细的邮件结构
    console.log('\n🏗️  获取详细邮件结构:');
    console.log('='.repeat(50));
    
    try {
      const structureResult = await client.fetch([latestId.toString()], {
        bodyStructure: true
      });
      
      if (structureResult.length > 0 && structureResult[0].bodyStructure) {
        const structure = structureResult[0].bodyStructure;
        console.log('✅ 邮件结构获取成功:');
        console.log(`   主类型: ${structure.type}`);
        console.log(`   子类型: ${structure.subtype}`);
        console.log(`   编码: ${structure.encoding || '未知'}`);
        console.log(`   大小: ${structure.size || 0} bytes`);
        
        if (structure.parameters) {
          console.log(`   参数: ${JSON.stringify(structure.parameters)}`);
        }
        
        if (structure.type === 'MULTIPART' && structure.childParts) {
          console.log(`\n   📁 多部分结构 (${structure.childParts.length} 个部分):`);
          structure.childParts.forEach((child: any, i: number) => {
            console.log(`      ${i + 1}. ${child.type}/${child.subtype}`);
            console.log(`         编码: ${child.encoding || '未知'}`);
            console.log(`         大小: ${child.size || 0} bytes`);
            if (child.parameters) {
              console.log(`         参数: ${JSON.stringify(child.parameters)}`);
            }
            
            // 如果是文本部分，尝试获取其内容
            if (child.type === 'TEXT') {
              console.log(`         🎯 这是文本部分，部分号: ${i + 1}`);
            }
          });
          
          // 基于结构信息尝试获取具体部分
          console.log('\n   🎯 基于结构尝试获取文本部分:');
          for (let i = 0; i < structure.childParts.length; i++) {
            const child = structure.childParts[i];
            if (child.type === 'TEXT') {
              const partNumber = `${i + 1}`;
              console.log(`      尝试获取部分 ${partNumber}:`);
              
              try {
                const partResult = await client.fetch([latestId.toString()], {
                  bodyParts: [partNumber]
                });
                
                if (partResult.length > 0 && partResult[0].bodyParts?.[partNumber]) {
                  const partContent = partResult[0].bodyParts[partNumber];
                  console.log(`         ✅ 成功: ${partContent.length} 字符`);
                  console.log(`         预览: ${partContent.substring(0, 100)}...`);
                } else {
                  console.log(`         ❌ 部分 ${partNumber} 内容为空`);
                }
              } catch (partError) {
                console.log(`         ❌ 获取部分 ${partNumber} 失败: ${partError.message}`);
              }
            }
          }
        }
      }
    } catch (structureError) {
      console.log('❌ 邮件结构获取失败:', structureError.message);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    try {
      await client.disconnect();
      console.log('\n🔌 连接已断开');
    } catch (e) {
      console.error('断开连接失败:', e);
    }
  }
}

if (import.meta.main) {
  rawImapBodyTest().catch(console.error);
}