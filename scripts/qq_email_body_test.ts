#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

/**
 * QQ邮箱正文获取测试
 * 
 * 使用前请确保：
 * 1. 已开启QQ邮箱的IMAP服务
 * 2. 已生成16位授权码
 * 3. 在下面配置中填入真实的邮箱和授权码
 */

import { ImapClient } from "jsr:@bobbyg603/deno-imap";

// QQ邮箱配置 (使用您提供的账号信息)
const QQ_EMAIL_CONFIG = {
  host: 'imap.qq.com',
  port: 993,
  tls: true,
  username: 'vmxmy@qq.com',
  password: 'lagrezfyfpnobgic'
};

/**
 * 获取QQ邮箱授权码的步骤：
 * ===============================
 * 1. 登录QQ邮箱网页版 (mail.qq.com)
 * 2. 点击右上角"设置" -> "账户"
 * 3. 找到"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"
 * 4. 开启"IMAP/SMTP服务"
 * 5. 按照提示发送短信验证
 * 6. 系统会生成16位授权码，复制到上面的password字段
 */

async function testQQEmailBody() {
  console.log('📧 QQ邮箱正文获取测试');
  console.log('====================');

  // 验证配置
  if (!QQ_EMAIL_CONFIG.username || !QQ_EMAIL_CONFIG.password) {
    console.log('❌ 请先配置QQ邮箱信息！');
    console.log('');
    console.log('📝 需要填写：');
    console.log('   username: 你的QQ邮箱地址 (如: zhangsan@qq.com)');
    console.log('   password: 你的16位授权码 (如: abcdefghijklmnop)');
    console.log('');
    console.log('💡 如何获取QQ邮箱授权码：');
    console.log('   1. 登录 mail.qq.com');
    console.log('   2. 设置 -> 账户');
    console.log('   3. 开启 IMAP/SMTP 服务');
    console.log('   4. 发送短信验证');
    console.log('   5. 获得16位授权码');
    return;
  }

  if (QQ_EMAIL_CONFIG.password.length !== 16) {
    console.log('⚠️  QQ邮箱授权码应该是16位，当前长度:', QQ_EMAIL_CONFIG.password.length);
    console.log('请检查是否正确复制了授权码');
  }

  console.log('🔧 配置信息:');
  console.log(`   邮箱: ${QQ_EMAIL_CONFIG.username}`);
  console.log(`   授权码: ${QQ_EMAIL_CONFIG.password.substring(0, 4)}****${QQ_EMAIL_CONFIG.password.substring(12)}`);
  console.log('');

  const client = new ImapClient(QQ_EMAIL_CONFIG);
  
  try {
    console.log('🔌 正在连接QQ邮箱服务器...');
    await client.connect();
    console.log('✅ 连接成功！');

    console.log('📂 选择收件箱...');
    await client.selectMailbox('INBOX');
    console.log('✅ 收件箱选择成功');

    // 获取邮件列表
    console.log('\n🔍 获取邮件列表...');
    const allIds = await client.search({});
    console.log(`📧 收件箱中共有 ${allIds.length} 封邮件`);

    if (allIds.length === 0) {
      console.log('📪 收件箱为空，测试结束');
      return;
    }

    // 获取最新的1封邮件进行详细测试
    const latestId = allIds[allIds.length - 1];
    console.log(`\n🎯 测试最新邮件 (ID: ${latestId})`);
    console.log('='.repeat(40));

    // 获取邮件基本信息
    console.log('📋 获取邮件基本信息...');
    const basicInfo = await client.fetch([latestId.toString()], {
      envelope: true,
      size: true,
      flags: true
    });

    if (basicInfo.length > 0) {
      const message = basicInfo[0];
      const envelope = message.envelope;
      
      console.log('✅ 基本信息获取成功:');
      console.log(`   主题: ${envelope?.subject || '无主题'}`);
      
      if (envelope?.from && envelope.from.length > 0) {
        const from = envelope.from[0];
        console.log(`   发件人: ${from.name || from.mailbox}@${from.host}`);
      }
      
      console.log(`   日期: ${envelope?.date || '未知'}`);
      console.log(`   大小: ${message.size || 0} bytes`);
      console.log(`   标志: ${message.flags?.join(', ') || '无'}`);
    }

    // 测试多种正文获取方式
    console.log('\n📄 开始测试不同的正文获取方式:');
    console.log('-'.repeat(40));

    let successfulMethod = null;
    let bodyContent = null;

    // 方式1: 获取TEXT部分
    console.log('\n1️⃣ 方式1: 获取TEXT部分');
    try {
      const textResult = await client.fetch([latestId.toString()], {
        bodyParts: ['TEXT']
      });
      
      if (textResult.length > 0 && textResult[0].bodyParts?.TEXT) {
        bodyContent = textResult[0].bodyParts.TEXT;
        successfulMethod = 'TEXT';
        console.log(`✅ 成功! 获取到 ${bodyContent.length} 字符`);
      } else {
        console.log('❌ TEXT部分为空');
      }
    } catch (error) {
      console.log('❌ 获取失败:', error.message);
    }

    // 方式2: 获取第1部分
    if (!successfulMethod) {
      console.log('\n2️⃣ 方式2: 获取第1部分');
      try {
        const part1Result = await client.fetch([latestId.toString()], {
          bodyParts: ['1']
        });
        
        if (part1Result.length > 0 && part1Result[0].bodyParts?.['1']) {
          bodyContent = part1Result[0].bodyParts['1'];
          successfulMethod = '第1部分';
          console.log(`✅ 成功! 获取到 ${bodyContent.length} 字符`);
        } else {
          console.log('❌ 第1部分为空');
        }
      } catch (error) {
        console.log('❌ 获取失败:', error.message);
      }
    }

    // 方式3: 获取完整body
    if (!successfulMethod) {
      console.log('\n3️⃣ 方式3: 获取完整邮件体');
      try {
        const bodyResult = await client.fetch([latestId.toString()], {
          body: true
        });
        
        if (bodyResult.length > 0 && bodyResult[0].body) {
          bodyContent = bodyResult[0].body;
          successfulMethod = '完整邮件体';
          console.log(`✅ 成功! 获取到 ${bodyContent.length} 字符`);
        } else {
          console.log('❌ 完整邮件体为空');
        }
      } catch (error) {
        console.log('❌ 获取失败:', error.message);
      }
    }

    // 显示获取到的正文内容
    if (successfulMethod && bodyContent) {
      console.log(`\n📝 成功通过"${successfulMethod}"获取到正文内容:`);
      console.log('='.repeat(40));
      
      // 显示前300个字符的预览
      const preview = bodyContent.substring(0, 300);
      console.log('内容预览:');
      console.log(preview);
      
      if (bodyContent.length > 300) {
        console.log(`\n... (还有 ${bodyContent.length - 300} 个字符)`);
      }
      
      console.log(`\n📊 内容统计:`);
      console.log(`   总字符数: ${bodyContent.length}`);
      console.log(`   行数: ${bodyContent.split('\n').length}`);
      console.log(`   是否包含HTML: ${bodyContent.includes('<html>') || bodyContent.includes('<HTML>') ? '是' : '否'}`);
      
    } else {
      console.log('\n❌ 所有方式都无法获取到正文内容');
    }

    // 尝试获取邮件结构信息（可能失败，但提供额外信息）
    console.log('\n🔍 尝试获取邮件结构信息...');
    try {
      const structureResult = await client.fetch([latestId.toString()], {
        bodyStructure: true
      });
      
      if (structureResult.length > 0 && structureResult[0].bodyStructure) {
        const structure = structureResult[0].bodyStructure;
        console.log('✅ 邮件结构信息:');
        console.log(`   类型: ${structure.type}/${structure.subtype}`);
        console.log(`   编码: ${structure.encoding || '未知'}`);
        
        if (structure.parameters) {
          console.log(`   参数: ${JSON.stringify(structure.parameters)}`);
        }
        
        if (structure.type === 'MULTIPART' && structure.childParts) {
          console.log(`   子部分数量: ${structure.childParts.length}`);
          structure.childParts.forEach((child: any, i: number) => {
            console.log(`     ${i + 1}. ${child.type}/${child.subtype}`);
          });
        }
      }
    } catch (structureError) {
      console.log('⚠️  邮件结构获取失败 (这是deno-imap的已知问题)');
      console.log(`   错误: ${structureError.message}`);
    }

    console.log('\n🎉 QQ邮箱正文获取测试完成！');

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    
    // 提供针对性的错误解决建议
    if (error.message.includes('Authentication failed') || error.message.includes('Invalid credentials')) {
      console.log('\n💡 认证失败的可能原因：');
      console.log('   1. QQ邮箱地址错误');
      console.log('   2. 授权码错误（应该是16位）');
      console.log('   3. 未开启IMAP服务');
      console.log('   4. 使用了登录密码而不是授权码');
    } else if (error.message.includes('Connection') || error.message.includes('timeout')) {
      console.log('\n💡 连接失败的可能原因：');
      console.log('   1. 网络连接问题');
      console.log('   2. 防火墙阻止连接');
      console.log('   3. QQ邮箱服务器临时不可用');
    }
    
    console.log('\n📞 如需帮助，请检查：');
    console.log('   - QQ邮箱设置是否正确');
    console.log('   - 网络连接是否正常');
    console.log('   - 授权码是否有效');
    
  } finally {
    try {
      await client.disconnect();
      console.log('\n🔌 已断开QQ邮箱连接');
    } catch (disconnectError) {
      console.error('断开连接时出错:', disconnectError.message);
    }
  }
}

// 运行测试
if (import.meta.main) {
  testQQEmailBody().catch(error => {
    console.error('程序异常:', error);
    console.log('\n请检查配置并重试');
  });
}