# Supabase 邮件模板配置指南

## 📧 配置步骤

### 1. 登录 Supabase Dashboard
1. 访问 [supabase.com](https://supabase.com)
2. 选择您的项目
3. 进入 **Authentication** → **Settings** → **Email Templates**

### 2. 配置确认邮件模板

#### 邮件主题 (Subject)
```
确认您的账户 - 发票管理系统
```

#### 邮件正文 (Body)
选择以下两个模板之一：

1. **完整版模板** - 使用 `confirm-signup-template.html` 的内容
2. **简洁版模板** - 使用 `confirm-signup-simple.html` 的内容

### 3. 可用变量

在邮件模板中可以使用以下变量：

| 变量 | 说明 | 示例 |
|------|------|------|
| `{{.Email}}` | 用户邮箱 | user@example.com |
| `{{.Token}}` | 验证令牌 | abc123... |
| `{{.TokenHash}}` | 令牌哈希 | def456... |
| `{{.SiteURL}}` | 网站URL | https://yourapp.com |
| `{{.ConfirmationURL}}` | 确认链接 | https://yourapp.com/auth/confirm?token=... |
| `{{.SiteName}}` | 网站名称 | 发票管理系统 |
| `{{.RedirectTo}}` | 重定向URL | https://yourapp.com/dashboard |

### 4. 其他邮件模板

同样的方法可以配置其他邮件模板：

#### Magic Link (魔法链接)
```html
<h2>登录链接 - {{.SiteName}}</h2>
<p>点击下面的链接登录您的账户：</p>
<a href="{{.ConfirmationURL}}">登录账户</a>
<p>此链接将在1小时后失效。</p>
```

#### Reset Password (重置密码)
```html
<h2>重置密码 - {{.SiteName}}</h2>
<p>您请求重置密码，点击下面的链接设置新密码：</p>
<a href="{{.ConfirmationURL}}">重置密码</a>
<p>如果您没有请求重置密码，请忽略此邮件。</p>
```

### 5. 高级配置

#### 自定义重定向URL
在前端代码中配置确认后的重定向：

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'https://yourapp.com/email-confirmation'
  }
})
```

#### SMTP 配置 (可选)
如果需要使用自定义SMTP服务器：

1. 进入 **Authentication** → **Settings** → **SMTP Settings**
2. 配置您的SMTP服务器信息
3. 测试邮件发送功能

### 6. 测试邮件模板

1. 保存模板配置
2. 在应用中注册新用户
3. 检查邮件是否按预期显示
4. 测试确认链接是否正常工作

### 7. 最佳实践

1. **响应式设计** - 确保邮件在移动设备上显示良好
2. **明确的行动号召** - 确认按钮要醒目
3. **安全提醒** - 说明链接有效期和安全注意事项
4. **品牌一致性** - 使用一致的颜色和字体
5. **备用链接** - 提供文本链接以防按钮不可点击

### 8. 故障排除

#### 邮件未收到
1. 检查垃圾邮件文件夹
2. 验证SMTP配置
3. 检查Supabase项目的邮件发送限制

#### 确认链接失效
1. 检查链接是否在24小时内
2. 确认`emailRedirectTo`配置正确
3. 检查前端路由配置

#### 模板显示异常
1. 验证HTML语法
2. 测试CSS在不同邮件客户端的兼容性
3. 检查变量名称拼写

## 🚀 快速配置

如果您只想快速配置，直接复制以下内容到 Supabase Dashboard：

**主题:**
```
确认您的邮箱 - 发票管理系统
```

**正文:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center;">
    <h1 style="color: #2563eb;">🧾 确认您的邮箱</h1>
    <p>感谢您注册发票管理系统！请点击下面的按钮确认您的邮箱地址：</p>
    <a href="{{.ConfirmationURL}}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; margin: 20px 0;">确认邮箱</a>
    <p style="font-size: 14px; color: #666;">此链接24小时内有效。如果您没有注册此账户，请忽略此邮件。</p>
  </div>
</div>
```

这样就完成了基本的中文邮件模板配置！