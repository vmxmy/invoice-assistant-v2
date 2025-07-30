/**
 * 邮箱配置文件
 * 
 * 请根据你的邮箱类型修改下面的配置
 */

export const EMAIL_CONFIG = {
  // QQ邮箱配置
  host: 'imap.qq.com',
  port: 993,
  tls: true,
  username: 'vmxmy@qq.com',
  password: 'lagrezfyfpnobgic'
};

// 如果你使用的是其他邮箱，可以取消注释并修改下面的配置

/*
// 163邮箱配置
export const EMAIL_CONFIG = {
  host: 'imap.163.com',
  port: 993,
  tls: true,
  username: 'your@163.com',
  password: 'your-client-password'
};
*/

/*
// Gmail配置
export const EMAIL_CONFIG = {
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  username: 'your@gmail.com',
  password: 'your-app-password'
};
*/