#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

/**
 * 增强版邮件正文获取测试
 */

import { ImapClient } from "jsr:@bobbyg603/deno-imap";

const EMAIL_CONFIG = {
  host: 'imap.qq.com',
  port: 993,
  tls: true,
  username: 'vmxmy@qq.com',
  password: 'lagrezfyfpnobgic'
};

async function enhancedBodyTest() {
  console.log('🚀 增强版邮件正文获取测试\n');

  const client = new ImapClient(EMAIL_CONFIG);
  
  try {
    console.log('🔌 连接QQ邮箱...');
    await client.connect();
    await client.selectMailbox('INBOX');
    console.log('✅ 连接成功');

    // 获取所有邮件ID
    const allIds = await client.search({});
    console.log(`📧 总邮件数: ${allIds.length}`);

    // 测试多封邮件，寻找有正文的邮件
    const testCount = Math.min(10, allIds.length);
    const testIds = allIds.slice(-testCount); // 最新的10封邮件
    
    console.log(`🔍 测试最新的 ${testIds.length} 封邮件，寻找有正文内容的邮件:\n`);

    for (let i = 0; i < testIds.length; i++) {
      const messageId = testIds[i];
      console.log(`📧 邮件 ${i + 1}/${testIds.length} - ID: ${messageId}`);
      
      try {
        // 获取基本信息
        const basicInfo = await client.fetch([messageId.toString()], {
          envelope: true,
          size: true
        });

        if (basicInfo.length === 0) {
          console.log('❌ 无法获取基本信息\n');
          continue;
        }

        const message = basicInfo[0];
        const subject = message.envelope?.subject || '无主题';
        console.log(`   主题: ${subject.substring(0, 50)}${subject.length > 50 ? '...' : ''}`);
        console.log(`   大小: ${message.size || 0} bytes`);

        // 尝试多种获取方式
        const methods = [
          { name: 'TEXT', options: { bodyParts: ['TEXT'] } },
          { name: '1', options: { bodyParts: ['1'] } },
          { name: '1.1', options: { bodyParts: ['1.1'] } },
          { name: '1.2', options: { bodyParts: ['1.2'] } },
          { name: '2', options: { bodyParts: ['2'] } },
          { name: 'body', options: { body: true } },
          { name: 'peek[TEXT]', options: { bodyParts: ['TEXT'], peek: true } },
          { name: 'peek[1]', options: { bodyParts: ['1'], peek: true } }
        ];

        let foundContent = false;
        
        for (const method of methods) {
          try {
            const result = await client.fetch([messageId.toString()], method.options);
            
            let content = null;
            if (result.length > 0) {
              if (method.name === 'body' && result[0].body) {
                content = result[0].body;
              } else if (result[0].bodyParts) {
                const part = method.name.includes('peek') ? 
                  method.name.replace('peek[', '').replace(']', '') : method.name;
                content = result[0].bodyParts[part];
              }
            }

            if (content && content.trim().length > 0) {
              console.log(`   ✅ 方式"${method.name}"成功: ${content.length} 字符`);
              console.log(`   预览: ${content.substring(0, 100).replace(/\n/g, '\\n')}...`);
              foundContent = true;
              break; // 找到内容就停止尝试其他方式
            }
          } catch (methodError) {
            // 静默处理错误，继续尝试下一种方式
          }
        }

        if (!foundContent) {
          console.log('   ❌ 所有方式都无法获取正文');
        }

        // 尝试获取邮件结构信息
        try {
          const structureResult = await client.fetch([messageId.toString()], {
            bodyStructure: true
          });
          
          if (structureResult.length > 0 && structureResult[0].bodyStructure) {
            const structure = structureResult[0].bodyStructure;
            console.log(`   📋 结构: ${structure.type}/${structure.subtype}`);
            
            if (structure.type === 'MULTIPART' && structure.childParts) {
              console.log(`   📁 包含 ${structure.childParts.length} 个部分:`);
              structure.childParts.forEach((child: any, idx: number) => {
                console.log(`      ${idx + 1}. ${child.type}/${child.subtype} (${child.size || 0} bytes)`);
              });
            }
          }
        } catch (structureError) {
          console.log('   ⚠️  结构获取失败:', structureError.message);
        }

        console.log(''); // 空行分隔

      } catch (error) {
        console.log(`   ❌ 处理失败: ${error.message}\n`);
      }
    }

    console.log('🎯 专门查找发票邮件进行测试...');
    
    // 尝试搜索发票邮件（使用正确的搜索语法）
    try {
      const invoiceIds = await client.search({
        header: [{ field: 'SUBJECT', value: '发票' }]
      }, 'UTF-8');
      
      console.log(`📋 找到 ${invoiceIds.length} 封包含"发票"的邮件`);
      
      if (invoiceIds.length > 0) {
        const testInvoiceId = invoiceIds[invoiceIds.length - 1]; // 最新的发票邮件
        console.log(`\n🧾 测试发票邮件 ID: ${testInvoiceId}`);
        
        const invoiceBasic = await client.fetch([testInvoiceId.toString()], {
          envelope: true
        });
        
        if (invoiceBasic.length > 0) {
          console.log(`   主题: ${invoiceBasic[0].envelope?.subject || '无主题'}`);
          
          // 对发票邮件尝试所有获取方式
          const allMethods = [
            'TEXT', '1', '1.1', '1.2', '2', '3', 'body'
          ];
          
          for (const method of allMethods) {
            try {
              let options: any;
              if (method === 'body') {
                options = { body: true };
              } else {
                options = { bodyParts: [method] };
              }
              
              const result = await client.fetch([testInvoiceId.toString()], options);
              
              if (result.length > 0) {
                let content = method === 'body' ? result[0].body : result[0].bodyParts?.[method];
                
                if (content && content.trim().length > 0) {
                  console.log(`   ✅ 发票邮件"${method}"成功: ${content.length} 字符`);
                  console.log(`   预览: ${content.substring(0, 150).replace(/\n/g, '\\n')}...`);
                  break;
                }
              }
            } catch (e) {
              // 继续尝试下一种方式
            }
          }
        }
      }
    } catch (searchError) {
      console.log('⚠️  发票邮件搜索失败:', searchError.message);
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
  enhancedBodyTest().catch(console.error);
}