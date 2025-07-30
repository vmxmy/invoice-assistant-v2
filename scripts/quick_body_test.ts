#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

/**
 * 快速邮件正文测试 - 直接使用邮箱账号密码
 */

import { ImapClient } from "jsr:@bobbyg603/deno-imap";

// QQ邮箱配置 (使用您提供的账号信息)
const EMAIL_CONFIG = {
  host: 'imap.qq.com',        // QQ邮箱IMAP服务器
  port: 993,
  tls: true,
  username: 'vmxmy@qq.com',
  password: 'lagrezfyfpnobgic'
};

// 如果是其他邮箱，可以使用以下配置：
const OTHER_CONFIGS = {
  // 163邮箱
  '163': {
    host: 'imap.163.com',
    port: 993,
    tls: true,
    username: '你的邮箱@163.com',
    password: '客户端授权密码'
  },
  
  // Gmail
  'gmail': {
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    username: '你的邮箱@gmail.com',
    password: '应用专用密码'
  },
  
  // 126邮箱
  '126': {
    host: 'imap.126.com',
    port: 993,
    tls: true,
    username: '你的邮箱@126.com',
    password: '客户端授权密码'
  }
};

async function quickBodyTest() {
  console.log('🚀 快速邮件正文测试');
  console.log('配置信息:', {
    host: EMAIL_CONFIG.host,
    username: EMAIL_CONFIG.username,
    passwordLength: EMAIL_CONFIG.password.length
  });

  // 检查配置
  if (EMAIL_CONFIG.username.includes('your-email') || EMAIL_CONFIG.password.includes('your-16-digit')) {
    console.log('❌ 请先在脚本中配置你的真实邮箱信息！');
    console.log('');
    console.log('📝 修改 EMAIL_CONFIG 中的：');
    console.log('   username: 你的完整邮箱地址');
    console.log('   password: 你的授权码/密码');
    console.log('');
    console.log('💡 QQ邮箱授权码获取方式：');
    console.log('   1. 登录QQ邮箱网页版');
    console.log('   2. 设置 -> 账户 -> 开启IMAP/SMTP服务');
    console.log('   3. 生成授权码（16位）');
    return;
  }

  const client = new ImapClient(EMAIL_CONFIG);
  
  try {
    console.log('\n🔌 连接邮箱服务器...');
    await client.connect();
    console.log('✅ 连接成功');

    console.log('📂 选择收件箱...');
    await client.selectMailbox('INBOX');
    console.log('✅ 收件箱选择成功');

    // 获取最新的几封邮件进行测试
    console.log('\n🔍 搜索邮件...');
    const allIds = await client.search({});
    console.log(`📧 收件箱中共有 ${allIds.length} 封邮件`);

    if (allIds.length === 0) {
      console.log('❌ 收件箱为空，无法进行测试');
      return;
    }

    // 选择最新的3封邮件进行测试
    const testIds = allIds.slice(-3);
    console.log(`📋 选择最新的 ${testIds.length} 封邮件进行测试`);

    for (let i = 0; i < testIds.length; i++) {
      const messageId = testIds[i];
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📧 测试邮件 ${i + 1}/${testIds.length} - ID: ${messageId}`);
      console.log(`${'='.repeat(50)}`);

      // 获取基本信息
      try {
        const basicInfo = await client.fetch([messageId.toString()], {
          envelope: true,
          size: true
        });
        
        if (basicInfo.length > 0) {
          const message = basicInfo[0];
          console.log('📋 基本信息:');
          console.log(`   主题: ${message.envelope?.subject || '无主题'}`);
          
          const from = message.envelope?.from?.[0];
          const fromAddr = from ? `${from.mailbox}@${from.host}` : '未知';
          console.log(`   发件人: ${fromAddr}`);
          console.log(`   大小: ${message.size || 0} bytes`);
        }
      } catch (basicError) {
        console.warn('⚠️  获取基本信息失败:', basicError.message);
      }

      // 测试不同的正文获取方式
      console.log('\n📄 正文获取测试:');

      // 方式1: TEXT部分
      let success = false;
      try {
        console.log('🔍 方式1: 获取TEXT部分...');
        const textResult = await client.fetch([messageId.toString()], {
          bodyParts: ['TEXT']
        });
        
        if (textResult.length > 0 && textResult[0].bodyParts?.TEXT) {
          const content = textResult[0].bodyParts.TEXT;
          console.log(`✅ 成功获取TEXT部分 (${content.length} 字符)`);
          console.log(`   预览: ${content.substring(0, 150).replace(/\n/g, '\\n')}...`);
          success = true;
        } else {
          console.log('❌ TEXT部分为空');
        }
      } catch (e) {
        console.log('❌ 获取TEXT部分失败:', e.message);
      }

      // 方式2: 第1部分
      if (!success) {
        try {
          console.log('🔍 方式2: 获取第1部分...');
          const part1Result = await client.fetch([messageId.toString()], {
            bodyParts: ['1']
          });
          
          if (part1Result.length > 0 && part1Result[0].bodyParts?.['1']) {
            const content = part1Result[0].bodyParts['1'];
            console.log(`✅ 成功获取第1部分 (${content.length} 字符)`);
            console.log(`   预览: ${content.substring(0, 150).replace(/\n/g, '\\n')}...`);
            success = true;
          } else {
            console.log('❌ 第1部分为空');
          }
        } catch (e) {
          console.log('❌ 获取第1部分失败:', e.message);
        }
      }

      // 方式3: 完整body
      if (!success) {
        try {
          console.log('🔍 方式3: 获取完整body...');
          const bodyResult = await client.fetch([messageId.toString()], {
            body: true
          });
          
          if (bodyResult.length > 0 && bodyResult[0].body) {
            const content = bodyResult[0].body;
            console.log(`✅ 成功获取完整body (${content.length} 字符)`);
            console.log(`   预览: ${content.substring(0, 150).replace(/\n/g, '\\n')}...`);
            success = true;
          } else {
            console.log('❌ 完整body为空');
          }
        } catch (e) {
          console.log('❌ 获取完整body失败:', e.message);
        }
      }

      // 方式4: 尝试获取邮件结构信息
      try {
        console.log('🔍 额外信息: 获取邮件结构...');
        const structureResult = await client.fetch([messageId.toString()], {
          bodyStructure: true
        });
        
        if (structureResult.length > 0 && structureResult[0].bodyStructure) {
          const structure = structureResult[0].bodyStructure;
          console.log(`📋 邮件结构: ${structure.type}/${structure.subtype}`);
          
          if (structure.type === 'MULTIPART' && structure.childParts) {
            console.log(`   包含 ${structure.childParts.length} 个子部分`);
          }
        }
      } catch (structureError) {
        console.log('⚠️  邮件结构获取失败 (这是已知问题):', structureError.message);
      }

      if (!success) {
        console.log('❌ 所有方式都未能获取到正文内容');
      }

      // 添加延时
      if (i < testIds.length - 1) {
        console.log('\n⏱️  等待 1 秒后继续...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log('🎉 测试完成！');
    console.log(`${'='.repeat(50)}`);

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    
    if (error.message.includes('Authentication')) {
      console.log('\n💡 认证失败可能的原因：');
      console.log('   1. 邮箱账号或密码/授权码错误');
      console.log('   2. 未开启IMAP服务');
      console.log('   3. QQ邮箱需要使用授权码而不是登录密码');
    } else if (error.message.includes('Connection')) {
      console.log('\n💡 连接失败可能的原因：');
      console.log('   1. 网络连接问题');
      console.log('   2. IMAP服务器地址或端口错误');
      console.log('   3. 防火墙阻止连接');
    }
    
    console.error('\n详细错误信息:', error);
  } finally {
    try {
      await client.disconnect();
      console.log('\n🔌 邮箱连接已断开');
    } catch (disconnectError) {
      console.error('断开连接失败:', disconnectError);
    }
  }
}

// 主函数
if (import.meta.main) {
  console.log('📧 邮件正文获取快速测试工具');
  console.log('================================');
  console.log('');
  
  quickBodyTest().catch(error => {
    console.error('程序异常退出:', error);
  });
}