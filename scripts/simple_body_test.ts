#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

/**
 * 简单的邮件正文获取测试
 */

import { ImapClient } from "jsr:@bobbyg603/deno-imap";

async function simpleBodyTest() {
  console.log('🚀 简单邮件正文测试\n');

  // 邮箱配置（请修改为你的实际配置）
  const config = {
    host: 'imap.qq.com',
    port: 993,
    tls: true,
    username: '替换为你的邮箱',
    password: '替换为你的密码或授权码'
  };

  const client = new ImapClient(config);
  
  try {
    console.log('🔌 连接中...');
    await client.connect();
    await client.selectMailbox('INBOX');
    console.log('✅ 连接成功');

    // 获取最新的1封邮件
    const allIds = await client.search({});
    if (allIds.length === 0) {
      console.log('❌ 收件箱为空');
      return;
    }

    const latestId = allIds[allIds.length - 1];
    console.log(`📧 测试最新邮件: ID ${latestId}`);

    // 获取基本信息
    const basicInfo = await client.fetch([latestId.toString()], {
      envelope: true
    });

    if (basicInfo.length > 0) {
      console.log('主题:', basicInfo[0].envelope?.subject);
    }

    // 测试多种正文获取方式
    console.log('\n📄 测试不同的正文获取方式:');

    // 方式1: 获取TEXT部分
    try {
      console.log('\n1️⃣ 尝试获取TEXT部分...');
      const textResult = await client.fetch([latestId.toString()], {
        bodyParts: ['TEXT']
      });
      
      if (textResult.length > 0 && textResult[0].bodyParts?.TEXT) {
        const content = textResult[0].bodyParts.TEXT;
        console.log(`✅ 获取成功 (${content.length} 字符)`);
        console.log('预览:', content.substring(0, 100) + '...');
      } else {
        console.log('❌ TEXT部分为空');
      }
    } catch (e) {
      console.log('❌ 获取TEXT失败:', e.message);
    }

    // 方式2: 获取第1部分
    try {
      console.log('\n2️⃣ 尝试获取第1部分...');
      const part1Result = await client.fetch([latestId.toString()], {
        bodyParts: ['1']
      });
      
      if (part1Result.length > 0 && part1Result[0].bodyParts?.['1']) {
        const content = part1Result[0].bodyParts['1'];
        console.log(`✅ 获取成功 (${content.length} 字符)`);
        console.log('预览:', content.substring(0, 100) + '...');
      } else {
        console.log('❌ 第1部分为空');
      }
    } catch (e) {
      console.log('❌ 获取第1部分失败:', e.message);
    }

    // 方式3: 获取完整body
    try {
      console.log('\n3️⃣ 尝试获取完整body...');
      const bodyResult = await client.fetch([latestId.toString()], {
        body: true
      });
      
      if (bodyResult.length > 0 && bodyResult[0].body) {
        const content = bodyResult[0].body;
        console.log(`✅ 获取成功 (${content.length} 字符)`);
        console.log('预览:', content.substring(0, 100) + '...');
      } else {
        console.log('❌ body为空');
      }
    } catch (e) {
      console.log('❌ 获取body失败:', e.message);
    }

    // 方式4: 尝试获取邮件结构
    try {
      console.log('\n4️⃣ 尝试获取邮件结构...');
      const structureResult = await client.fetch([latestId.toString()], {
        bodyStructure: true
      });
      
      if (structureResult.length > 0 && structureResult[0].bodyStructure) {
        const structure = structureResult[0].bodyStructure;
        console.log('✅ 结构获取成功');
        console.log('类型:', structure.type, '/', structure.subtype);
        
        if (structure.type === 'MULTIPART' && structure.childParts) {
          console.log(`包含 ${structure.childParts.length} 个子部分:`);
          structure.childParts.forEach((child: any, i: number) => {
            console.log(`  ${i + 1}. ${child.type}/${child.subtype}`);
          });
        }
      } else {
        console.log('❌ 邮件结构为空');
      }
    } catch (e) {
      console.log('❌ 获取邮件结构失败:', e.message);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
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
  simpleBodyTest().catch(console.error);
}