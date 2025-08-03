# 魔法链接邮件模板配置

## 📧 Supabase Dashboard 配置

### 1. 进入邮件模板设置
```
项目 → Authentication → Settings → Email Templates → Magic Link
```

### 2. 邮件主题配置

#### 中文主题选项：
```
🚀 您的专属登录链接 - 发票管理系统
```

或者：
```
✨ 魔法登录链接 - 发票管理系统
```

或者：
```
一键登录您的账户 - 发票管理系统
```

### 3. 邮件正文配置

#### 🎨 完整版模板
使用 `magic-link-template.html` 的内容，包含：
- 渐变设计和动效
- 功能特点介绍
- 详细的安全提醒
- 跨设备响应式布局

#### ⚡ 简洁版模板  
使用 `magic-link-simple.html` 的内容，包含：
- 简洁清晰的设计
- 核心功能突出
- 快速配置

#### 🚀 极简版本（直接复制使用）
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 35px; border-radius: 10px; text-align: center;">
    <h1 style="color: #7c3aed; margin-bottom: 15px;">✨ 魔法登录</h1>
    <p style="font-size: 16px; color: #475569; margin-bottom: 25px;">
      点击下面的按钮即可安全登录发票管理系统，无需输入密码：
    </p>
    <a href="{{.ConfirmationURL}}" 
       style="display: inline-block; 
              background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
              color: white; 
              text-decoration: none; 
              padding: 15px 40px; 
              border-radius: 8px; 
              font-weight: bold; 
              margin: 20px 0;">
      🚀 立即登录
    </a>
    <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
      此链接1小时内有效，仅限您本人使用。如非本人操作请忽略此邮件。
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
    <p style="font-size: 12px; color: #94a3b8;">
      无法点击？复制链接：{{.ConfirmationURL}}
    </p>
  </div>
</div>
```

## 🎯 模板特色

### ✨ 设计亮点
- **渐变色彩** - 紫色主题体现"魔法"概念
- **视觉层次** - 清晰的信息结构
- **响应式** - 手机和电脑都完美显示
- **品牌一致** - 与发票管理系统风格统一

### 🔐 安全特性
- **时效提醒** - 明确1小时有效期
- **使用限制** - 强调仅限本人使用  
- **防误用** - 清晰的非本人操作提醒
- **备用方案** - 提供文本链接

### 💡 用户体验
- **操作引导** - 清晰的行动号召
- **功能说明** - 解释魔法链接优势
- **技术支持** - 提供备用访问方式
- **品牌推广** - 自然融入产品特色

## 🔧 技术配置

### 前端代码配置
确保你的前端代码正确设置了魔法链接：

```typescript
// useAuth.ts 中的魔法链接配置
const signInWithMagicLink = async (email: string) => {
  const currentURL = window.location.origin
  const redirectURL = `${currentURL}/magic-link-callback`
  
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: redirectURL
    }
  })
  
  // 处理结果...
}
```

### 回调页面路由
确保已配置魔法链接回调路由：

```typescript
// App.tsx
<Route path="/magic-link-callback" element={<MagicLinkCallbackPage />} />
```

## 📱 测试步骤

1. **保存模板** - 在 Supabase Dashboard 保存配置
2. **测试发送** - 在登录页面选择"魔法链接登录"
3. **检查邮件** - 确认邮件样式和内容
4. **测试链接** - 点击确认跳转和登录流程
5. **移动端测试** - 在手机上查看邮件显示效果

## 🛠️ 自定义选项

### 更改主色调
将模板中的紫色 `#7c3aed` 替换为你的品牌色：

```css
/* 示例：更换为蓝色主题 */
#7c3aed → #2563eb  /* 主色 */
#a855f7 → #3b82f6  /* 渐变色 */
```

### 添加公司信息
在模板末尾添加公司详细信息：

```html
<div style="text-align: center; margin-top: 20px;">
  <p>公司名称 | 联系电话 | 官网地址</p>
</div>
```

### 多语言支持
可以根据用户语言偏好创建不同语言版本的模板。

## 🎨 设计规范

- **主色调**: 紫色渐变 (#7c3aed 到 #a855f7)
- **字体**: 系统字体栈，确保跨平台兼容
- **按钮**: 圆角 8px，阴影效果
- **间距**: 一致的 padding 和 margin
- **图标**: Emoji 图标，universal 支持

这个魔法链接模板将为你的用户提供安全、便捷、美观的登录体验！