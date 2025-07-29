#!/usr/bin/env node
/**
 * JavaScript版本的邮箱密码解密脚本
 * 使用Node.js的crypto模块实现与Python backend相同的解密逻辑
 */

const crypto = require('crypto');

async function decryptQQPassword() {
    console.log('🔓 开始使用JavaScript解密QQ邮箱授权码...');
    
    // 从数据库查询得到的加密密码
    const encryptedPassword = "Z0FBQUFBQm9lMURnNkhKSkhISEhFMkY2YmZvSXZWcm16cTJkQ1Q0aXo0RVBPdEk1WXBYYktPSWFFQWVtM1hTeVMzeXJRcUg4NDlnSGl2ZHdVYU9sWlZubHJRY3dEVTdOY21icUlyMmxkTVBSWW1HVlc5MVFrYjg9";
    
    // 主密钥（与Python backend配置相同）
    const masterKey = Buffer.from('change-this-secret-key-in-production', 'utf8');
    
    try {
        // 1. 解码base64数据
        const combinedBuffer = Buffer.from(encryptedPassword, 'base64');
        console.log('📦 解码后总长度:', combinedBuffer.length);
        
        // 2. 提取盐值（前16字节）和加密数据
        const salt = combinedBuffer.slice(0, 16);
        const encryptedData = combinedBuffer.slice(16);
        
        console.log('🧂 盐值长度:', salt.length);
        console.log('🔒 加密数据长度:', encryptedData.length);
        
        // 3. 使用PBKDF2派生密钥（与Python相同的参数）
        const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
        const base64Key = derivedKey.toString('base64');
        
        console.log('🔑 派生密钥长度:', derivedKey.length);
        
        // 4. 创建Fernet解密器（模拟Python的Fernet）
        // Fernet使用AES-128-CBC + HMAC-SHA256
        
        // Fernet数据格式：版本(1) + 时间戳(8) + IV(16) + 密文 + HMAC(32)
        if (encryptedData.length < 57) {
            throw new Error('Fernet数据格式不正确，长度太短');
        }
        
        // 提取Fernet各部分
        const version = encryptedData[0];
        const timestamp = encryptedData.slice(1, 9);
        const iv = encryptedData.slice(9, 25);
        const ciphertext = encryptedData.slice(25, encryptedData.length - 32);
        const hmac = encryptedData.slice(-32);
        
        console.log('📋 Fernet版本:', version);
        console.log('⏰ 时间戳长度:', timestamp.length);
        console.log('🔑 IV长度:', iv.length);
        console.log('📄 密文长度:', ciphertext.length);
        console.log('🔏 HMAC长度:', hmac.length);
        
        // 5. 验证HMAC（可选，先跳过直接解密）
        
        // 6. AES解密
        const decipher = crypto.createDecipheriv('aes-128-cbc', derivedKey.slice(0, 16), iv);
        decipher.setAutoPadding(true);
        
        let decrypted = decipher.update(ciphertext);
        const final = decipher.final();
        decrypted = Buffer.concat([decrypted, final]);
        
        const qqAuthCode = decrypted.toString('utf8');
        
        console.log('✅ JavaScript解密成功！');
        console.log('🔓 QQ邮箱授权码:', qqAuthCode);
        
        // 验证授权码格式
        if (qqAuthCode.length === 16 && /^[a-zA-Z0-9]+$/.test(qqAuthCode)) {
            console.log('✅ 这是一个有效的QQ邮箱授权码格式');
        } else {
            console.log('⚠️ 授权码格式可能不标准，长度:', qqAuthCode.length);
        }
        
        return qqAuthCode;
        
    } catch (error) {
        console.error('❌ JavaScript解密失败:', error.message);
        console.log('🔄 尝试不同的解密参数...');
        
        // 尝试备用解密方法
        try {
            return await tryAlternativeDecryption(encryptedPassword, masterKey);
        } catch (altError) {
            console.error('❌ 备用解密也失败:', altError.message);
            return null;
        }
    }
}

async function tryAlternativeDecryption(encryptedPassword, masterKey) {
    console.log('🔄 尝试简化的Fernet解密...');
    
    const combinedBuffer = Buffer.from(encryptedPassword, 'base64');
    const salt = combinedBuffer.slice(0, 16);
    const fernetData = combinedBuffer.slice(16);
    
    // 使用完整的32字节密钥进行AES-256-GCM解密
    const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
    
    // 假设这是简化的AES加密（不是标准Fernet）
    if (fernetData.length >= 32) {
        const iv = fernetData.slice(0, 16);
        const ciphertext = fernetData.slice(16);
        
        try {
            const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, iv);
            let decrypted = decipher.update(ciphertext);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            const result = decrypted.toString('utf8');
            console.log('✅ 备用方法解密成功:', result);
            return result;
        } catch (e) {
            console.log('⚠️ 备用方法也失败');
            throw e;
        }
    }
    
    throw new Error('无法找到合适的解密方法');
}

// 主执行函数
async function main() {
    const authCode = await decryptQQPassword();
    
    if (authCode) {
        console.log('\n📋 复制此授权码到Edge Function:');
        console.log(`'${authCode}'`);
        console.log('\n🔧 使用步骤:');
        console.log('1. 复制上面的授权码');
        console.log('2. 替换Edge Function中的 realAuthCode 变量');
        console.log('3. 重新部署Edge Function');
        console.log('4. 运行测试脚本验证连接');
    } else {
        console.log('\n❌ 解密失败，建议：');
        console.log('1. 检查master_key配置');
        console.log('2. 确认加密数据完整性');
        console.log('3. 重新生成QQ邮箱授权码');
    }
}

// 运行脚本
if (require.main === module) {
    main().catch(console.error);
}