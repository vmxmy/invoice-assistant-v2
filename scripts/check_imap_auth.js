#!/usr/bin/env node
/**
 * 检查QQ邮箱IMAP认证参数
 */

// 验证QQ邮箱授权码格式
function validateQQAuthCode(authCode) {
    console.log('🔍 验证QQ邮箱授权码格式...')
    console.log(`授权码: ${authCode}`)
    console.log(`长度: ${authCode.length}`)
    console.log(`格式: ${/^[a-zA-Z0-9]+$/.test(authCode) ? '有效' : '无效'}`)
    
    if (authCode.length === 16 && /^[a-zA-Z0-9]+$/.test(authCode)) {
        console.log('✅ 这是一个有效的QQ邮箱授权码格式')
        return true
    } else {
        console.log('❌ 授权码格式无效')
        return false
    }
}

// 检查IMAP连接参数
function checkIMAPConfig() {
    console.log('📧 QQ邮箱IMAP配置检查:')
    
    const config = {
        host: 'imap.qq.com',
        port: 993,
        secure: true,
        email: 'vmxmy@qq.com',
        authCode: 'lagrezfyfpnobgic'
    }
    
    console.log(`   服务器: ${config.host}`)
    console.log(`   端口: ${config.port}`)
    console.log(`   SSL/TLS: ${config.secure ? '启用' : '禁用'}`)
    console.log(`   邮箱: ${config.email}`)
    console.log(`   授权码: ${config.authCode.substring(0, 4)}****`)
    
    // 验证授权码
    const isValidAuth = validateQQAuthCode(config.authCode)
    
    // 检查邮箱后缀
    const isQQEmail = config.email.endsWith('@qq.com')
    console.log(`✅ QQ邮箱格式: ${isQQEmail ? '正确' : '错误'}`)
    
    // 检查端口
    const isCorrectPort = config.port === 993
    console.log(`✅ IMAP端口: ${isCorrectPort ? '正确' : '错误'}`)
    
    return {
        isValid: isValidAuth && isQQEmail && isCorrectPort,
        config: config
    }
}

// 生成测试Edge Function的简化版本
function generateSimplifiedTest() {
    console.log('\n🔧 生成简化的IMAP测试...')
    
    const testCode = `
// 简化的IMAP连接测试（在Edge Function中使用）
async function testSimpleIMAPConnection() {
    try {
        const config = {
            hostname: 'imap.qq.com',
            port: 993,
            tls: true,
            auth: {
                username: 'vmxmy@qq.com',
                password: 'lagrezfyfpnobgic'
            }
        }
        
        console.log('🔗 测试IMAP连接配置:', JSON.stringify({
            ...config,
            auth: { ...config.auth, password: '****' }
        }))
        
        const imapClient = new ImapClient(config)
        await imapClient.connect()
        
        console.log('✅ IMAP连接成功!')
        
        await imapClient.selectMailbox('INBOX')
        console.log('✅ INBOX选择成功!')
        
        const messages = await imapClient.search(['ALL'])
        console.log(\`📧 找到 \${messages.length} 封邮件\`)
        
        await imapClient.logout()
        return true
        
    } catch (error) {
        console.error('❌ IMAP连接失败:', error.message)
        console.error('错误代码:', error.code)
        console.error('错误类型:', error.constructor.name)
        return false
    }
}
`
    
    console.log('📝 测试代码生成完成，可以在Edge Function中使用')
    return testCode
}

// 主函数
function main() {
    console.log('🔍 QQ邮箱IMAP认证检查')
    console.log('='.repeat(50))
    
    const result = checkIMAPConfig()
    
    if (result.isValid) {
        console.log('\n✅ IMAP配置看起来正确')
        console.log('\n💡 可能的问题:')
        console.log('1. QQ邮箱可能需要先登录网页版激活IMAP')
        console.log('2. 授权码可能已过期，需要重新生成')
        console.log('3. Deno IMAP库的连接方式可能与标准不同')
        console.log('4. 网络或防火墙问题')
        
        generateSimplifiedTest()
        
    } else {
        console.log('\n❌ IMAP配置有问题，请检查:')
        console.log('1. 邮箱地址格式')
        console.log('2. 授权码格式')
        console.log('3. IMAP服务器设置')
    }
    
    console.log('\n🔧 建议的下一步:')
    console.log('1. 登录QQ邮箱网页版确认IMAP已启用')
    console.log('2. 重新生成授权码')
    console.log('3. 在Edge Function中添加更详细的错误日志')
    console.log('4. 尝试使用不同的IMAP库或连接方式')
}

main()