# 环境变量调试和修复指南

## 问题诊断

当前问题：Supabase 邮件重定向链接指向 `localhost:3000` 而不是 `https://fp.gaoxin.net.cn`

## 调试步骤

### 1. 验证 .env.production 文件

在生产服务器上执行：
```bash
cd frontend

# 检查文件是否存在
ls -la .env.production

# 查看文件内容
cat .env.production

# 确保包含以下内容
# VITE_APP_DOMAIN=https://fp.gaoxin.net.cn
```

### 2. 重新构建并验证

```bash
cd frontend

# 清理旧的构建
rm -rf dist
rm -rf node_modules/.vite

# 方式1：依赖 .env.production 文件
npm run build

# 方式2：显式指定环境变量（推荐用于测试）
VITE_APP_DOMAIN=https://fp.gaoxin.net.cn npm run build

# 验证构建结果
grep -r "fp.gaoxin.net.cn" dist/
grep -r "VITE_APP_DOMAIN" dist/
```

### 3. 检查构建后的调试信息

构建并部署后，访问应用会看到：
1. **控制台输出**：打开浏览器开发者工具，查看控制台中的环境变量表格
2. **调试面板**：如果 `VITE_APP_DOMAIN` 未定义，页面右下角会显示调试面板

### 4. 验证 Supabase Dashboard 配置

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 进入项目 → Authentication → URL Configuration
3. 确认配置：
   ```
   Site URL: https://fp.gaoxin.net.cn
   
   Redirect URLs:
   - https://fp.gaoxin.net.cn
   - https://fp.gaoxin.net.cn/email-confirmation
   - https://fp.gaoxin.net.cn/magic-link-callback
   ```

## 解决方案

### 方案 A：修复环境变量（推荐）

1. **创建正确的 .env.production**
```bash
cd frontend
cat > .env.production << EOF
# Production environment variables
VITE_APP_DOMAIN=https://fp.gaoxin.net.cn

# Supabase配置（替换为你的生产环境值）
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_anon_key
EOF
```

2. **重新构建**
```bash
npm run build
```

3. **部署并测试**

### 方案 B：使用环境变量注入（CI/CD）

如果使用 CI/CD 系统，在构建命令中注入：
```bash
VITE_APP_DOMAIN=https://fp.gaoxin.net.cn npm run build
```

### 方案 C：代码级修复（临时方案）

修改 `frontend/src/hooks/useAuth.ts`：
```typescript
// 第152行附近
const configuredDomain = import.meta.env.VITE_APP_DOMAIN || 
                        (import.meta.env.PROD ? 'https://fp.gaoxin.net.cn' : undefined)
```

## 验证成功标准

1. **构建验证**：
   - `dist` 目录中包含 `fp.gaoxin.net.cn` 字符串
   - 调试面板不再显示警告

2. **运行时验证**：
   - 浏览器控制台显示正确的 `VITE_APP_DOMAIN`
   - 注册/登录时控制台日志显示正确的 `redirectURL`

3. **邮件验证**：
   - 收到的邮件中链接指向 `https://fp.gaoxin.net.cn`
   - 点击链接能正确跳转

## 常见问题

### Q: 构建后仍然没有环境变量
A: 确保 `.env.production` 在 `frontend` 目录下，不是项目根目录

### Q: 邮件链接还是 localhost
A: 检查 Supabase Dashboard 的 Site URL 配置，这是最关键的设置

### Q: 调试面板显示 undefined
A: 环境变量没有被正确加载，检查文件名和位置

## 移除调试代码

问题解决后，可以移除调试代码：
1. 删除 `frontend/src/utils/debugEnv.ts`
2. 从 `App.tsx` 中移除调试导入和调用

## 联系支持

如果问题持续，请提供：
1. 浏览器控制台的环境变量输出截图
2. `.env.production` 文件内容（隐藏敏感信息）
3. Supabase Dashboard URL Configuration 截图