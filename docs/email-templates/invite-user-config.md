# 用户邀请邮件模板配置

## 📧 Supabase Dashboard 配置

### 1. 进入邮件模板设置
```
项目 → Authentication → Settings → Email Templates → Invite User
```

### 2. 邮件主题配置

#### 中文主题选项：
```
👥 邀请加入团队 - 发票管理系统
```

或者：
```
🎉 您被邀请加入发票管理团队 - 开启智能办公之旅
```

或者：
```
🚀 专业邀请：加入发票管理系统团队
```

### 3. 邮件正文配置

#### 🎨 完整版模板
使用 `invite-user-template.html` 的内容，包含：
- 详细的功能介绍和价值展示
- 完整的入门指南步骤
- 社会证明和统计数据
- 专业的绿色协作主题设计

#### ⚡ 简洁版模板  
使用 `invite-user-simple.html` 的内容，包含：
- 核心邀请信息
- 主要功能亮点
- 简化的操作流程

#### 🚀 极简版本（直接复制使用）
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 40px; border-radius: 12px; border: 2px solid #10b981;">
    <h1 style="color: #065f46; text-align: center; margin-bottom: 20px;">👥 邀请加入团队</h1>
    
    <div style="background: white; border-radius: 10px; padding: 25px; margin: 20px 0;">
      <div style="background: #f0fdf4; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <p style="margin: 0; color: #059669; text-align: center;">
          🎉 您已被 <strong>{{.InviterEmail}}</strong> 邀请加入发票管理系统！
        </p>
      </div>
      
      <p style="font-size: 16px; margin-bottom: 25px; text-align: center;">
        体验AI智能发票处理，开启高效的团队协作：
      </p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="{{.ConfirmationURL}}" 
           style="display: inline-block; 
                  background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                  color: white; 
                  text-decoration: none; 
                  padding: 18px 40px; 
                  border-radius: 10px; 
                  font-weight: bold;">
          🚀 接受邀请并加入
        </a>
      </div>
      
      <div style="background: #f8fafc; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <div style="text-align: center;">
          <strong>✨ 核心功能：</strong> AI智能识别 • 邮箱扫描 • 团队协作 • 数据导出
        </div>
      </div>
      
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; font-size: 14px; color: #92400e; text-align: center;">
        ⏰ 邀请链接7天内有效，请尽快完成注册！
      </div>
    </div>
    
    <p style="text-align: center; font-size: 12px; color: #065f46;">
      无法点击？复制链接：{{.ConfirmationURL}}<br>
      需要帮助？联系邀请人：{{.InviterEmail}}
    </p>
  </div>
</div>
```

## 🎯 模板特色

### 👥 团队协作主题
- **绿色主题** - 绿色渐变体现团队合作和成长
- **价值展示** - 突出AI智能功能和团队协作优势
- **社会证明** - 展示用户数量和成功案例
- **行动导向** - 清晰的邀请接受流程

### 🚀 功能亮点展示
- **AI智能识别** - 自动提取发票关键信息
- **邮箱扫描** - 从邮件附件自动提取发票
- **团队协作** - 多人同时管理发票数据
- **数据导出** - Excel报表一键生成

### 💡 用户引导优化
- **入门指南** - 详细的4步快速上手流程
- **功能预览** - 网格布局展示核心功能
- **统计数据** - 用户数量、处理发票数等社会证明
- **帮助支持** - 清晰的联系方式和帮助渠道

## 🔧 特殊变量说明

### 用户邀请模板专用变量
```html
{{.Email}}           <!-- 被邀请人邮箱地址 -->
{{.InviterEmail}}    <!-- 邀请人邮箱地址 -->
{{.ConfirmationURL}} <!-- 邀请确认链接 -->
{{.Token}}           <!-- 邀请令牌 -->
{{.SiteURL}}         <!-- 网站URL -->
{{.SiteName}}        <!-- 网站名称 -->
```

### 变量使用示例
```html
<!-- 显示邀请信息 -->
<p>您被 <strong>{{.InviterEmail}}</strong> 邀请加入团队</p>
<p>邀请邮箱：<strong>{{.Email}}</strong></p>

<!-- 邀请链接 -->
<a href="{{.ConfirmationURL}}">接受邀请</a>

<!-- 联系信息 -->
<p>如有疑问，请联系邀请人：{{.InviterEmail}}</p>
```

## 📱 实施和测试

### 1. 前端邀请功能配置
如果你需要实现用户邀请功能，参考代码：

```typescript
// 邀请用户功能示例
const inviteUser = async (email: string) => {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${window.location.origin}/accept-invite`
  })
  
  if (error) {
    console.error('邀请发送失败:', error)
  } else {
    console.log('邀请已发送到:', email)
  }
}
```

### 2. 邀请接受页面
创建接受邀请的页面处理：

```typescript
// AcceptInvitePage.tsx
const AcceptInvitePage = () => {
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const handleInviteAcceptance = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')
      
      if (token) {
        // 处理邀请接受逻辑
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'invite'
        })
        
        if (!error) {
          // 重定向到设置密码页面或仪表板
          navigate('/set-password')
        }
      }
      setLoading(false)
    }
    
    handleInviteAcceptance()
  }, [])
  
  // 渲染邀请接受界面...
}
```

### 3. 测试步骤
1. **配置模板** - 在 Supabase Dashboard 保存邀请模板
2. **发送邀请** - 在管理面板或代码中测试邀请功能
3. **检查邮件** - 确认邀请邮件格式和内容
4. **测试接受** - 点击邮件链接测试接受流程
5. **验证结果** - 确认用户成功加入团队

## 🎨 设计自定义

### 更改主题色彩
```css
/* 将绿色主题改为其他颜色 */
#10b981 → #3b82f6  /* 蓝色团队主题 */
#10b981 → #8b5cf6  /* 紫色创新主题 */
#10b981 → #f59e0b  /* 橙色活力主题 */
```

### 添加公司信息
```html
<!-- 在邀请详情中添加公司信息 -->
<div class="inviter-info">
  <div>邀请人：{{.InviterEmail}}</div>
  <div>公司：您的公司名称</div>
  <div>部门：发票管理部</div>
</div>
```

### 自定义功能展示
根据你的实际功能修改功能网格：

```html
<div class="feature">
  <span class="feature-icon">🔧</span>
  <strong>自定义功能</strong><br>
  <span>功能描述</span>
</div>
```

## 🛡️ 邀请安全最佳实践

### 1. 邀请有效期控制
```html
<!-- 明确邀请有效期 -->
<p><strong>⏰ 重要：</strong>此邀请链接将在7天后失效，请及时接受邀请。</p>
```

### 2. 权限说明
```html
<!-- 说明邀请后的权限 -->
<div class="permissions-info">
  <h4>🔐 您将获得的权限：</h4>
  <ul>
    <li>查看和管理团队发票</li>
    <li>上传和处理新发票</li>
    <li>导出发票数据报表</li>
    <li>参与团队协作讨论</li>
  </ul>
</div>
```

### 3. 联系支持
```html
<!-- 提供支持联系方式 -->
<p>如有任何疑问，请联系：</p>
<ul>
  <li>邀请人：{{.InviterEmail}}</li>
  <li>技术支持：support@yoursite.com</li>
  <li>帮助中心：{{.SiteURL}}/help</li>
</ul>
```

## 📊 邀请转化优化

### 1. 紧迫感营造
- 7天有效期提醒
- 限时优惠或功能
- 团队等待提示

### 2. 价值主张强化
- 具体的功能收益
- 时间节省数据
- 成功案例展示

### 3. 降低接受门槛
- 一键接受设计
- 简化注册流程
- 清晰的帮助指引

这个用户邀请模板将帮助你有效地邀请新用户加入团队，提高邀请接受率！ 👥🚀