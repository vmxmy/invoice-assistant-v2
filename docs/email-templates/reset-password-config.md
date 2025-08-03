# 重置密码邮件模板配置

## 📧 Supabase Dashboard 配置

### 1. 进入邮件模板设置
```
项目 → Authentication → Settings → Email Templates → Reset Your Password
```

### 2. 邮件主题配置

#### 中文主题选项：
```
🔐 重置密码 - 发票管理系统
```

或者：
```
🔄 密码重置确认 - 发票管理系统
```

或者：
```
安全提醒：重置您的账户密码 - 发票管理系统
```

### 3. 邮件正文配置

#### 🎨 完整版模板
使用 `reset-password-template.html` 的内容，包含：
- 详细的安全提醒和风险警告
- 完整的密码要求说明
- 安全最佳实践指导
- 专业的红色安全主题设计

#### ⚡ 简洁版模板  
使用 `reset-password-simple.html` 的内容，包含：
- 核心重置信息
- 简化的安全要求
- 重要安全提醒

#### 🚀 极简版本（直接复制使用）
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); padding: 35px; border-radius: 10px; border: 2px solid #ef4444;">
    <h1 style="color: #7f1d1d; text-align: center; margin-bottom: 20px;">🔐 重置密码</h1>
    
    <div style="background: white; border-radius: 8px; padding: 25px; margin: 20px 0;">
      <div style="background: #fef2f2; border-radius: 6px; padding: 15px; margin-bottom: 20px; border-left: 4px solid #ef4444;">
        <p style="margin: 0; color: #dc2626; font-weight: bold;">
          🚨 我们收到了重置您账户密码的请求
        </p>
      </div>
      
      <div style="background: #f3f4f6; border-radius: 6px; padding: 15px; margin: 20px 0; text-align: center;">
        <div style="margin-bottom: 8px;">
          <span style="color: #6b7280;">账户邮箱：</span>
          <div style="font-family: monospace; color: #ef4444; font-weight: bold;">{{.Email}}</div>
        </div>
        <div style="font-size: 13px; color: #6b7280;">
          <strong>有效期：</strong> 1小时 | <strong>请求时间：</strong> 刚刚
        </div>
      </div>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="{{.ConfirmationURL}}" 
           style="display: inline-block; 
                  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
                  color: white; 
                  text-decoration: none; 
                  padding: 15px 35px; 
                  border-radius: 8px; 
                  font-weight: bold;">
          🔄 立即重置密码
        </a>
      </div>
      
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; font-size: 14px; color: #92400e; text-align: center;">
        ⏰ 重置链接1小时内有效，如非本人操作请联系客服
      </div>
    </div>
    
    <p style="text-align: center; font-size: 12px; color: #7f1d1d;">
      无法点击？复制链接：{{.ConfirmationURL}}<br>
      🆘 如非本人操作，请立即联系客服
    </p>
  </div>
</div>
```

## 🎯 模板特色

### 🔐 安全主题设计
- **红色主题** - 红色渐变体现安全警告和重要性
- **风险警告** - 突出非本人操作的安全风险
- **时效提醒** - 强调1小时有效期限制
- **安全指导** - 提供密码安全最佳实践

### 🛡️ 密码安全强化
- **强密码要求** - 详细说明密码复杂度要求
- **安全提示** - 提供密码管理最佳实践
- **防范建议** - 避免使用个人信息作为密码
- **定期更换** - 建议定期更新密码

### 💡 用户体验优化
- **紧急感设计** - 突出时效性和重要性
- **操作清晰** - 明确的重置流程指导
- **故障备份** - 提供手动链接复制选项
- **帮助支持** - 清晰的客服联系方式

## 🔧 特殊变量说明

### 密码重置模板专用变量
```html
{{.Email}}           <!-- 用户邮箱地址 -->
{{.ConfirmationURL}} <!-- 密码重置链接 -->
{{.Token}}           <!-- 重置令牌 -->
{{.SiteURL}}         <!-- 网站URL -->
{{.SiteName}}        <!-- 网站名称 -->
```

### 变量使用示例
```html
<!-- 显示用户信息 -->
<p>您的账户：<strong>{{.Email}}</strong> 申请了密码重置</p>

<!-- 重置链接 -->
<a href="{{.ConfirmationURL}}">立即重置密码</a>

<!-- 网站引用 -->
<p>返回 <a href="{{.SiteURL}}">{{.SiteName}}</a> 继续使用</p>
```

## 📱 实施和测试

### 1. 前端密码重置功能
确保你的前端有密码重置功能：

```typescript
// 密码重置功能示例
const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })
  
  if (error) {
    console.error('密码重置请求失败:', error)
  } else {
    console.log('密码重置邮件已发送到:', email)
  }
}
```

### 2. 密码重置页面
创建密码重置处理页面：

```typescript
// ResetPasswordPage.tsx
const ResetPasswordPage = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      alert('密码不匹配')
      return
    }
    
    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: password
    })
    
    if (error) {
      console.error('密码更新失败:', error)
    } else {
      console.log('密码更新成功')
      // 重定向到登录页或仪表板
      navigate('/login')
    }
    setLoading(false)
  }
  
  // 渲染密码重置表单...
}
```

### 3. 测试步骤
1. **配置模板** - 在 Supabase Dashboard 保存重置模板
2. **发起重置** - 在登录页面测试"忘记密码"功能
3. **检查邮件** - 确认重置邮件格式和内容
4. **测试链接** - 点击重置链接测试功能
5. **验证密码** - 确认新密码设置生效

## 🛡️ 安全最佳实践

### 1. 时效性控制
```html
<!-- 强调时效性 -->
<p><strong>重要：</strong>此重置链接将在1小时后失效，请及时使用。</p>
```

### 2. 多重验证
```html
<!-- 建议额外验证 -->
<p>为了您的安全，重置后建议立即登录验证功能正常。</p>
```

### 3. 异常监控
```html
<!-- 异常操作提醒 -->
<p>如果您没有申请密码重置，请立即联系客服并检查账户安全。</p>
```

## 🎨 设计自定义

### 更改主题色彩
```css
/* 将红色主题改为其他颜色 */
#ef4444 → #f59e0b  /* 橙色警告主题 */
#ef4444 → #8b5cf6  /* 紫色主题 */
#ef4444 → #0ea5e9  /* 蓝色信息主题 */
```

### 添加品牌元素
```html
<!-- 在模板中添加公司logo -->
<div style="text-align: center; margin-bottom: 20px;">
  <img src="your-logo-url" alt="公司Logo" style="max-width: 120px;">
</div>
```

### 自定义密码要求
根据你的密码策略修改要求：

```html
<div class="requirement">
  <span class="requirement-icon">✓</span>
  <span class="requirement-text">你的自定义密码要求</span>
</div>
```

## 🚨 故障排除

### 常见问题
1. **邮件未收到** - 检查邮箱拼写，查看垃圾邮件文件夹
2. **链接失效** - 确认是否在1小时内，重新申请重置
3. **重置失败** - 检查新密码是否符合安全要求

### 调试技巧
- 在测试环境先验证模板
- 检查Supabase的邮件发送日志
- 确认用户状态和权限

### 安全检查清单
- [ ] 重置链接有效期设置正确
- [ ] 密码复杂度要求明确
- [ ] 异常操作警告清晰
- [ ] 客服联系方式有效
- [ ] 测试完整的重置流程

## 📊 密码安全最佳实践

### 1. 强密码策略
- 最少8个字符
- 包含大小写字母
- 包含数字和特殊字符
- 避免常见密码模式

### 2. 用户教育
- 提供密码管理器建议
- 强调不复用密码
- 定期更换密码提醒

### 3. 系统防护
- 限制重置请求频率
- 监控异常重置行为
- 记录重置操作日志

这个密码重置模板将帮助用户安全、便捷地重置密码，确保账户安全！ 🔐🛡️