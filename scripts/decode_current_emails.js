#!/usr/bin/env node
/**
 * 解码当前扫描到的邮件标题，确认内容
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

// 从之前的扫描结果中解码标题
const emailSubjects = [
    "=?utf-8?B?W0FEXSDnsr7lvanpgYrmiLLlhKrmg6DmhbbnpZ3mlrDlubQ=?=",
    "=?utf-8?B?5oiR5Lus5b6I5b+r5Lya5LuO5oKo55qE5Y2h5YaF5omj5qy+?=",
    "=?utf-8?B?5L2g55qE6YCa55+l6K6+572u5bey5pu05paw?=",
    "=?utf-8?B?QW1hem9uIFdlYiBTZXJ2aWNlcyBCaWxsaW5nIFN0YXRlbWVudCBBdmFpbGFibGUgW0FjY291bnQ6MzM2NTA0NzY2MTY5XQ==?=",
    "=?utf-8?B?W+mHjeimgV0g5pyA5ZCO6YCa55+l77ya6K+356uL5Y2z5pSv5LuY5oKo55qEIEFwcCBTdG9yZSDotKbljZU=?="
];

console.log('📧 解码当前邮件标题');
console.log('='.repeat(60));

emailSubjects.forEach((subject, index) => {
    const decoded = decodeBase64Subject(subject);
    console.log(`${index + 1}. 解码: ${decoded}`);
    
    // 检查是否包含账单相关内容
    const isBillRelated = decoded.includes('发票') || 
                         decoded.includes('invoice') || 
                         decoded.includes('bill') || 
                         decoded.includes('billing') || 
                         decoded.includes('statement') || 
                         decoded.includes('账单') || 
                         decoded.includes('收据') ||
                         decoded.includes('payment') ||
                         decoded.includes('付款');
    
    if (isBillRelated) {
        console.log(`   🎯 这是账单相关邮件!`);
    } else {
        console.log(`   ℹ️ 非账单邮件`);
    }
    console.log('');
});

console.log('💡 发现:');
console.log('- 找到了 Amazon Web Services Billing Statement');
console.log('- 找到了 App Store 账单相关邮件');
console.log('但目标发票邮件日期是 2025年7月22日，需要调整搜索时间范围');
console.log('');
console.log('🎯 下一步: 搜索2025年7月22日前后的邮件');