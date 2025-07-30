/**
 * 邮箱配置示例文件
 * 
 * 使用方法：
 * 1. 复制此文件为 email_config.ts
 * 2. 修改下面的配置信息
 * 3. 确保已开启邮箱的IMAP服务
 */

export const EMAIL_CONFIG = {
  // QQ邮箱配置
  host: 'imap.qq.com',
  port: 993,
  tls: true,
  username: 'your@qq.com',        // 替换为你的QQ邮箱
  password: 'your-auth-code'      // 替换为你的QQ邮箱授权码（不是登录密码）
};

// 其他邮箱配置示例：

// 163邮箱配置
export const EMAIL_CONFIG_163 = {
  host: 'imap.163.com',
  port: 993,
  tls: true,
  username: 'your@163.com',
  password: 'your-client-password'  // 163邮箱的客户端授权密码
};

// Gmail配置
export const EMAIL_CONFIG_GMAIL = {
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  username: 'your@gmail.com',
  password: 'your-app-password'     // Gmail应用专用密码
};

// Outlook配置
export const EMAIL_CONFIG_OUTLOOK = {
  host: 'outlook.office365.com',
  port: 993,
  tls: true,
  username: 'your@outlook.com',
  password: 'your-password'
};

/**
 * 如何获取各邮箱的授权码/密码：
 * 
 * QQ邮箱：
 * 1. 登录QQ邮箱 -> 设置 -> 账户
 * 2. 开启IMAP/SMTP服务
 * 3. 生成授权码（16位）
 * 
 * 163邮箱：
 * 1. 登录163邮箱 -> 设置 -> 客户端授权密码
 * 2. 开启IMAP/SMTP服务
 * 3. 设置客户端授权密码
 * 
 * Gmail：
 * 1. 开启两步验证
 * 2. 生成应用专用密码
 * 3. 使用应用专用密码而不是登录密码
 * 
 * Outlook：
 * 1. 可直接使用登录密码
 * 2. 如果开启了两步验证，需要使用应用密码
 */