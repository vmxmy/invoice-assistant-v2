# 邮箱更改确认模板配置

## 📧 Supabase Dashboard 配置

### 1. 进入邮件模板设置
```
项目 → Authentication → Settings → Email Templates → Confirm Email Change
```

### 2. 邮件主题配置

#### 中文主题选项：
```
🔄 确认邮箱更改 - 发票管理系统
```

或者：
```
📧 邮箱更改确认通知 - 发票管理系统
```

或者：
```
重要：确认您的邮箱更改请求 - 发票管理系统
```

### 3. 邮件正文配置

#### 🎨 完整版模板
使用 `confirm-email-change-template.html` 的内容，包含：
- 详细的邮箱变更信息展示
- 清晰的步骤说明
- 完整的安全警告
- 专业的视觉设计

#### ⚡ 简洁版模板  
使用 `confirm-email-change-simple.html` 的内容，包含：
- 核心信息突出
- 简洁的操作流程
- 重要安全提醒

#### 🚀 极简版本（直接复制使用）
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #fef7e3 0%, #fef3c7 100%); padding: 35px; border-radius: 10px; border: 2px solid #f59e0b;">
    <h1 style="color: #92400e; text-align: center; margin-bottom: 20px;">🔄 确认邮箱更改</h1>
    
    <div style="background: white; border-radius: 8px; padding: 25px; margin: 20px 0;">
      <p style="font-size: 16px; margin-bottom: 20px;">
        我们收到了更改您账户邮箱地址的请求，请确认此次更改：
      </p>
      
      <div style="background: #f3f4f6; border-radius: 6px; padding: 15px; margin: 20px 0; text-align: center;">
        <div style="margin-bottom: 10px;">
          <span style="color: #6b7280;">原邮箱：</span>
          <div style="font-family: monospace; color: #dc2626; font-weight: bold;">{{.Email}}</div>
        </div>
        <div style="margin: 10px 0; color: #f59e0b; font-size: 18px;">⬇️</div>
        <div>
          <span style="color: #6b7280;">新邮箱：</span>
          <div style="font-family: monospace; color: #059669; font-weight: bold;">{{.NewEmail}}</div>
        </div>
      </div>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="{{.ConfirmationURL}}" 
           style="display: inline-block; 
                  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
                  color: white; 
                  text-decoration: none; 
                  padding: 15px 35px; 
                  border-radius: 8px; 
                  font-weight: bold;">
          ✅ 确认邮箱更改
        </a>
      </div>
      
      <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 6px; padding: 15px; font-size: 14px; color: #dc2626;">
        <strong>⚠️ 重要：</strong> 确认链接24小时内有效。如非本人操作，请立即联系客服。
      </div>
    </div>
    
    <p style="text-align: center; font-size: 12px; color: #78716c;">
      无法点击？复制链接：{{.ConfirmationURL}}
    </p>
  </div>
</div>
```

## 🎯 模板特色

### 🔄 邮箱变更专用设计
- **对比展示** - 清晰显示原邮箱 vs 新邮箱
- **流程指引** - 详细说明确认后的变化
- **安全第一** - 突出安全警告和注意事项
- **专业视觉** - 橙色主题体现变更的重要性

### 🔐 安全特性强化
- **时效性强调** - 明确24小时有效期
- **风险提醒** - 详细的安全注意事项
- **紧急联系** - 提供客服联系方式
- **操作确认** - 明确非本人操作的处理方式

### 💡 用户体验优化
- **信息对比** - 直观的新旧邮箱对比
- **操作预期** - 详细说明确认后会发生什么
- **帮助支持** - 完整的故障排除信息
- **品牌一致** - 与系统整体风格统一

## 🔧 特殊变量说明

### 邮箱更改模板专用变量
```html
{{.Email}}           <!-- 当前(原)邮箱地址 -->
{{.NewEmail}}        <!-- 新邮箱地址 -->
{{.ConfirmationURL}} <!-- 确认更改链接 -->
{{.Token}}           <!-- 验证令牌 -->
{{.SiteURL}}         <!-- 网站URL -->
{{.SiteName}}        <!-- 网站名称 -->
```

### 变量使用示例
```html
<!-- 显示邮箱变更信息 -->
<p>您正在将邮箱从 <strong>{{.Email}}</strong> 更改为 <strong>{{.NewEmail}}</strong></p>

<!-- 确认链接 -->
<a href="{{.ConfirmationURL}}">确认邮箱更改</a>

<!-- 网站引用 -->
<p>如有疑问，请访问 <a href="{{.SiteURL}}">{{.SiteName}}</a></p>
```

## 📱 测试流程

### 1. 前端配置确认
确保你的前端有邮箱更改功能：

```typescript
// 邮箱更改功能示例
const changeEmail = async (newEmail: string) => {
  const { error } = await supabase.auth.updateUser({
    email: newEmail
  })
  
  if (error) {
    console.error('邮箱更改失败:', error)
  } else {
    console.log('邮箱更改请求已发送，请检查新邮箱')
  }
}
```

### 2. 测试步骤
1. **保存模板** - 在 Supabase Dashboard 保存配置
2. **发起更改** - 在用户设置中更改邮箱
3. **检查邮件** - 在新邮箱中查看确认邮件
4. **测试链接** - 点击确认链接测试功能
5. **验证结果** - 确认邮箱更改生效

### 3. 注意事项
- 确认邮件发送到 **新邮箱地址**
- 确认后原邮箱会收到通知
- 测试时确保新邮箱可以正常接收邮件

## 🛡️ 安全最佳实践

### 1. 双重通知机制
```html
<!-- 建议同时发送通知到原邮箱 -->
<p>为了您的账户安全，我们也会向您的原邮箱发送此次更改的通知。</p>
```

### 2. 时效性控制
```html
<!-- 强调时效性 -->
<p><strong>重要：</strong>此确认链接将在24小时后失效，请及时确认。</p>
```

### 3. 紧急联系方式
```html
<!-- 提供紧急联系 -->
<p>如果这不是您的操作，请立即联系客服：support@yoursite.com</p>
```

## 🎨 设计自定义

### 更改颜色主题
```css
/* 将橙色主题改为其他颜色 */
#f59e0b → #ef4444  /* 红色警告主题 */
#f59e0b → #0ea5e9  /* 蓝色信息主题 */
#f59e0b → #8b5cf6  /* 紫色主题 */
```

### 添加公司品牌
```html
<!-- 在模板中添加公司logo -->
<div style="text-align: center; margin-bottom: 20px;">
  <img src="your-logo-url" alt="公司Logo" style="max-width: 120px;">
</div>
```

### 多语言版本
根据用户语言偏好，可以创建英文版本：

```
Subject: Confirm Email Change - Invoice Management System
```

## 🚨 故障排除

### 常见问题
1. **邮件未收到** - 检查新邮箱是否正确，查看垃圾邮件
2. **链接失效** - 确认是否在24小时内，重新发起更改
3. **确认失败** - 检查网络连接，联系技术支持

### 调试技巧
- 在测试环境先验证模板
- 检查Supabase的邮件发送日志
- 确认用户权限和邮箱状态

这个邮箱更改确认模板将帮助用户安全、便捷地更改邮箱地址！ 🔄✅