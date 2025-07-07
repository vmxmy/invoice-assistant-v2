# Vercel 部署指南

## 📋 部署前准备

### 1. 确认构建配置
- ✅ `vercel.json` 已创建
- ✅ `package.json` 构建脚本正确
- ✅ `.env.example` 环境变量示例

### 2. 环境变量配置
在 Vercel Dashboard 中设置以下环境变量：

#### 必需的环境变量
```bash
# Supabase 配置
VITE_SUPABASE_URL=https://sfenhhtvcyslxplvewmt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE

# 后端 API 地址 (部署后端后更新)
VITE_API_URL=https://your-backend.railway.app

# 生产环境标识
NODE_ENV=production
```

#### 可选的环境变量
```bash
VITE_DEBUG=false
VITE_APP_NAME=发票助手
VITE_APP_VERSION=2.0
```

## 🚀 部署步骤

### 方式1: 通过 Vercel CLI
```bash
# 安装 Vercel CLI
npm i -g vercel

# 在项目根目录运行
cd frontend
vercel

# 首次部署会提示设置项目
# 选择合适的设置并确认
```

### 方式2: 通过 Git 集成
1. 将代码推送到 GitHub
2. 在 Vercel Dashboard 中点击 "Add New Project"
3. 导入 GitHub 仓库
4. 设置 Root Directory 为 `frontend`
5. 配置环境变量
6. 点击 Deploy

## ⚙️ 构建配置说明

### Vercel 检测
Vercel 会自动检测 Vite 项目并使用以下配置：
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 自定义配置
如需自定义，可以在 `vercel.json` 中修改：
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci"
}
```

## 🔍 部署后验证

### 功能检查清单
- [ ] 网站可以正常访问
- [ ] 所有路由导航正常 (SPA 重写生效)
- [ ] 登录/注册功能正常
- [ ] Supabase 连接正常
- [ ] API 请求正常 (检查 Network 面板)
- [ ] 静态资源加载正常
- [ ] 移动端适配正常

### 性能检查
- [ ] Lighthouse 评分 > 90
- [ ] 首屏加载时间 < 3s
- [ ] 资源缓存策略生效

## 🐛 常见问题

### 1. 路由 404 错误
**问题**: 直接访问 `/dashboard` 返回 404
**解决**: 确认 `vercel.json` 中的 `rewrites` 配置正确

### 2. 环境变量未生效
**问题**: `import.meta.env.VITE_*` 为 undefined
**解决**: 
- 确认变量名以 `VITE_` 开头
- 在 Vercel Dashboard 中正确设置
- 重新部署

### 3. API 请求失败
**问题**: 请求后端 API 时 CORS 错误或连接失败
**解决**:
- 确认 `VITE_API_URL` 正确
- 检查后端 CORS 配置
- 确认后端服务正常运行

### 4. 构建失败
**问题**: TypeScript 编译错误或依赖问题
**解决**:
- 本地运行 `npm run build` 检查
- 更新 `package-lock.json`
- 检查 Node.js 版本兼容性

## 📊 部署后监控

### Vercel Analytics
启用 Vercel Analytics 来监控：
- 页面访问量
- 性能指标
- 用户行为

### 错误监控
建议集成错误监控服务：
- Sentry
- LogRocket
- Rollbar

## 🔄 更新和回滚

### 自动部署
- 每次 push 到 main 分支自动部署
- Preview 部署：每个 PR 自动生成预览链接

### 手动回滚
在 Vercel Dashboard 的 Deployments 页面：
1. 找到稳定的历史版本
2. 点击 "Promote to Production"

## 🌐 自定义域名

### 添加域名
1. 在 Vercel Dashboard 中选择项目
2. 进入 Settings > Domains
3. 添加自定义域名
4. 配置 DNS 记录

### SSL 证书
Vercel 自动提供 SSL 证书，无需额外配置。