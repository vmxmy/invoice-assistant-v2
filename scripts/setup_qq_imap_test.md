# QQ邮箱IMAP测试设置指南

## 1. 准备QQ邮箱账号
- 使用您的QQ邮箱账号（如：1234567890@qq.com）
- 或者创建一个专门用于测试的QQ邮箱

## 2. 开启IMAP服务并获取授权码

### 步骤：
1. **登录QQ邮箱** (https://mail.qq.com)
2. **进入设置**：点击右上角齿轮图标 → 设置
3. **选择账户页面**：点击左侧"账户"选项
4. **开启IMAP服务**：
   - 找到"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"
   - 开启"IMAP/SMTP服务"
5. **生成授权码**：
   - 点击"生成授权码"
   - 按照提示发送短信
   - 获得16位授权码（如：abcdefghijklmnop）

## 3. 设置环境变量

在终端中运行：
```bash
export QQ_EMAIL="你的QQ邮箱@qq.com"
export QQ_AUTH_CODE="你的16位授权码"
```

## 4. 准备测试邮件

为了测试PDF附件检测，建议：
1. 发送几封包含PDF附件的邮件到这个QQ邮箱
2. 邮件主题包含"发票"关键词
3. 确保PDF文件确实作为附件发送（不是链接）

## 5. 运行测试

```bash
deno run --allow-net --allow-env test_real_qq_imap.ts
```

## 注意事项

- **授权码不是QQ密码**：必须使用生成的16位授权码
- **IMAP端口**：993（SSL加密）
- **服务器地址**：imap.qq.com
- **安全性**：测试完成后可以关闭IMAP服务或删除授权码