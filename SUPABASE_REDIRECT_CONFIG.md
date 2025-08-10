# Supabase 邮件重定向 URL 配置指南

## 问题说明
Supabase 发送的确认邮件重定向链接默认会使用 Site URL，如果没有正确配置，会导致邮件链接指向错误的域名。

## 配置步骤

### 1. Supabase Dashboard 配置（生产环境）

登录 [Supabase Dashboard](https://app.supabase.com) 并进入你的项目：

1. **导航到 Authentication → URL Configuration**

2. **配置 Site URL**（最重要）：
   ```
   Site URL: https://fp.gaoxin.net.cn
   ```

3. **配置 Redirect URLs**（白名单）：
   添加以下所有 URL：
   ```
   https://fp.gaoxin.net.cn
   https://fp.gaoxin.net.cn/email-confirmation
   https://fp.gaoxin.net.cn/magic-link-callback
   ```

### 2. 本地开发环境配置

修改 `supabase/config.toml`：

```toml
[auth]
site_url = "https://fp.gaoxin.net.cn"
additional_redirect_urls = [
  "http://localhost:3000",
  "http://localhost:5174", 
  "https://fp.gaoxin.net.cn",
  "https://fp.gaoxin.net.cn/email-confirmation",
  "https://fp.gaoxin.net.cn/magic-link-callback"
]
```

### 3. 环境变量配置

确保 `frontend/.env.production` 包含：

```env
VITE_APP_DOMAIN=https://fp.gaoxin.net.cn
```

### 4. 邮件模板配置（可选）

如果需要自定义邮件模板，在 Supabase Dashboard：

1. **Authentication → Email Templates**
2. 修改以下模板：
   - **Confirm signup**：用户注册确认
   - **Magic Link**：魔法链接登录
   - **Reset Password**：密码重置

确保模板中的链接使用 `{{ .ConfirmationURL }}` 变量。

### 5. 验证配置

1. **测试注册流程**：
   - 注册新用户
   - 检查邮件中的确认链接是否指向 `https://fp.gaoxin.net.cn/email-confirmation`

2. **测试魔法链接**：
   - 使用魔法链接登录
   - 检查邮件中的链接是否指向 `https://fp.gaoxin.net.cn/magic-link-callback`

## 常见问题

### 邮件链接仍然指向 localhost
- 确认 Supabase Dashboard 中的 Site URL 已更新
- 清除浏览器缓存并重新构建应用
- 检查是否有多个 Supabase 项目，确保配置的是正确的项目

### 重定向被拒绝
- 确保目标 URL 在 Redirect URLs 白名单中
- URL 必须完全匹配（包括协议 https://）

### 邮件没有收到
- 检查垃圾邮件文件夹
- 确认 Supabase 项目的邮件服务是否正常
- 检查 Authentication → Logs 中的错误信息

## 注意事项

1. **Site URL** 是最关键的配置，它决定了邮件中链接的基础域名
2. **Redirect URLs** 是安全白名单，必须包含所有可能的重定向目标
3. 修改配置后，新的设置会立即生效，不需要重启服务
4. 生产环境的配置必须在 Supabase Dashboard 中设置，本地 config.toml 只影响本地开发