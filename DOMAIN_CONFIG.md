# 域名配置说明

## 问题描述

注册确认邮件中的链接使用了 localhost 域名，导致生产环境用户无法正确访问确认链接。

## 解决方案

### 1. Supabase 配置 (supabase/config.toml)

```toml
[auth]
# 生产环境的基础URL，用于邮件中的链接构建
site_url = "https://invoice-assistant-v2.vercel.app"
# 允许的重定向URL列表
additional_redirect_urls = [
  "http://localhost:3000", 
  "https://localhost:3000", 
  "https://invoice-assistant-v2.vercel.app"
]
```

### 2. 前端环境变量配置

#### 开发环境 (.env)
```env
VITE_APP_DOMAIN=http://localhost:3000
```

#### 生产环境 (.env.production)
```env
VITE_APP_DOMAIN=https://invoice-assistant-v2.vercel.app
```

### 3. 代码修改 (useAuth.ts)

```typescript
// 获取应用的基础URL - 使用环境变量配置的域名
const configuredDomain = import.meta.env.VITE_APP_DOMAIN
const currentURL = configuredDomain || window.location.origin
const redirectURL = `${currentURL}/email-confirmation`
```

## 工作原理

1. **开发环境**: 使用 `http://localhost:3000`
2. **生产环境**: 使用 `https://invoice-assistant-v2.vercel.app`
3. **后备方案**: 如果环境变量未设置，使用 `window.location.origin`

## 部署注意事项

1. 确保 Vercel 等部署平台正确设置了环境变量
2. Supabase 项目的 Auth 配置需要同步更新
3. 测试注册流程确保邮件链接正确

## 调试信息

代码中包含调试日志，可以在浏览器控制台查看：
- `configuredDomain`: 环境变量配置的域名
- `windowOrigin`: 当前页面的域名
- `currentURL`: 最终使用的域名
- `redirectURL`: 完整的重定向URL