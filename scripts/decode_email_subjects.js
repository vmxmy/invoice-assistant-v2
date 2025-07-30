#!/usr/bin/env node
/**
 * 解码邮件标题以确认是否包含发票相关内容
 */

function decodeBase64Subject(encodedSubject) {
    try {
        // 处理 =?utf-8?B?...?= 格式
        const match = encodedSubject.match(/=\?utf-8\?B\?([^?]+)\?=/);
        if (match) {
            const base64Content = match[1];
            const decoded = Buffer.from(base64Content, 'base64').toString('utf-8');
            return decoded;
        }
        return encodedSubject;
    } catch (error) {
        return encodedSubject;
    }
}

// 测试解码之前扫描到的邮件标题
const encodedSubjects = [
    "=?utf-8?B?W0FEXSDnsr7lvanpgYrmiLLlhKrmg6DmhbbnpZ3mlrDlubQ=?=",
    "=?utf-8?B?5oiR5Lus5b6I5b+r5Lya5LuO5oKo55qE5Y2h5YaF5omj5qy+?=",
    "=?utf-8?B?5L2g55qE6YCa55+l6K6+572u5bey5pu05paw?=",
    "=?utf-8?B?QW1hem9uIFdlYiBTZXJ2aWNlcyBCaWxsaW5nIFN0YXRlbWVudCBBdmFpbGFibGUgW0FjY291bnQ6MzM2NTA0NzY2MTY5XQ==?=",
    "=?utf-8?B?W+mHjeimgV0g5pyA5ZCO6YCa55+l77ya6K+356uL5Y2z5pSv5LuY5oKo55qEIEFwcCBTdG9yZSDotKbljZU=?="
];

console.log('📧 解码邮件标题分析');
console.log('='.repeat(60));

encodedSubjects.forEach((subject, index) => {
    const decoded = decodeBase64Subject(subject);
    console.log(`${index + 1}. 原始: ${subject.substring(0, 50)}...`);
    console.log(`   解码: ${decoded}`);
    console.log(`   是否包含发票: ${decoded.includes('发票') || decoded.includes('invoice') || decoded.includes('bill') ? '✅ 是' : '❌ 否'}`);
    console.log('');
});

console.log('💡 建议调整搜索策略:');
console.log('1. 搜索更多关键词: bill, billing, statement, 账单, 收据');
console.log('2. 扩大时间范围到更早的邮件');
console.log('3. 搜索特定发件人（如财务部门）');
console.log('4. 检查其他邮件文件夹（如已发送、垃圾邮件）');