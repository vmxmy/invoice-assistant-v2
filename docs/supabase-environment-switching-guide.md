# Supabase 环境切换配置指南

## 概述

本项目已配置完整的多环境 Supabase 切换系统，支持在本地开发、测试和生产环境之间轻松切换。

## 配置文件结构

### 环境配置文件

| 文件 | 用途 | Supabase 实例 |
|------|------|---------------|
| `.env.development` | 本地开发环境 | `http://localhost:54321` |
| `.env.production` | 生产环境模板 | 远程生产实例 |
| `.env.staging` | 测试环境模板 | 远程测试实例 |
| `.env.local` | 本地覆盖配置 | 开发者个人配置 |

### 环境变量说明

```bash
# Supabase 配置
VITE_SUPABASE_URL=           # Supabase 项目 URL
VITE_SUPABASE_ANON_KEY=      # 匿名访问密钥

# 环境标识
VITE_APP_ENV=                # 环境名称 (development/staging/production)

# 应用配置
VITE_APP_NAME=发票助手        # 应用名称
VITE_APP_VERSION=2.0.0       # 应用版本

# 调试配置
VITE_DEBUG_MODE=             # 是否启用调试模式 (true/false)
```

## 使用方法

### 本地开发

```bash
# 一键启动本地开发环境
npm run supabase:local

# 或分步执行
supabase start              # 启动本地 Supabase
npm run env:local          # 切换到本地环境
npm run dev                # 启动开发服务器
```

### 环境切换

```bash
# 快速切换环境
npm run env:local          # 切换到本地环境
npm run env:staging        # 切换到测试环境  
npm run env:prod           # 切换到生产环境

# 检查当前环境
npm run env:check          # 显示当前环境配置

# 手动切换 (更多选项)
node scripts/env-switch.js local
node scripts/env-switch.js staging --force
```

### 构建部署

```bash
# 生产构建
npm run build              # 自动使用 .env.production

# 测试构建
npm run build:staging      # 使用 .env.staging

# 本地预览
npm run preview            # 预览构建结果
```

### Supabase 管理

```bash
# Supabase 服务管理
npm run supabase:start     # 启动本地 Supabase
npm run supabase:stop      # 停止本地 Supabase
npm run supabase:status    # 查看服务状态

# 数据库管理
supabase db reset          # 重置本地数据库
supabase db push           # 推送迁移到远程
supabase migration new     # 创建新迁移
```

## 环境切换工具详解

### scripts/env-switch.js

智能环境切换工具，支持以下功能：

```bash
# 基本用法
node scripts/env-switch.js <环境名称> [选项]

# 支持的环境别名
local, dev, development     # 本地开发环境
staging, stage             # 预发布/测试环境  
prod, production           # 生产环境

# 选项
--force, -f               # 强制覆盖现有 .env 文件
--help, -h                # 显示帮助信息
```

### 功能特性

- ✅ 自动备份现有配置到 `.env.backup`
- ✅ 智能环境验证和警告
- ✅ 显示关键配置信息
- ✅ 环境特定的操作提示
- ✅ 错误处理和回滚机制

## 代码集成

### Supabase 客户端 (src/lib/supabase.ts)

增强的 Supabase 客户端配置包含：

```typescript
// 环境信息
export const config = {
  url: supabaseUrl,
  env: appEnv,
  isLocal: boolean,         // 是否本地环境
  isProduction: boolean,    // 是否生产环境
  isStaging: boolean,       // 是否测试环境
  isDevelopment: boolean,   // 是否开发环境
  debugMode: boolean,       // 是否调试模式
  hasKey: boolean          // 是否有有效密钥
}
```

### 在组件中使用

```typescript
import { supabase, config } from '@/lib/supabase'

// 检查环境
if (config.isDevelopment) {
  console.log('开发环境特定逻辑')
}

// 调试信息
if (config.debugMode) {
  console.log('当前环境:', config.env)
}
```

## 安全最佳实践

### Git 版本控制

```gitignore
# 保护的文件 (已在 .gitignore 中)
.env                      # 当前环境配置
.env.local               # 本地覆盖配置
.env*.local              # 所有本地配置
.env.backup              # 备份文件

# 跟踪的模板文件
.env.development         # 本地开发模板
.env.production          # 生产环境模板 (占位符)
.env.staging            # 测试环境模板 (占位符)
```

### 生产环境密钥管理

**不要在模板文件中提交真实密钥！**

#### Vercel 部署
```bash
# 在 Vercel 项目设置中配置
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-real-production-key
VITE_APP_ENV=production
```

#### Netlify 部署
```bash
# 在 Site settings → Environment variables 中设置
VITE_SUPABASE_URL=https://your-project.supabase.co  
VITE_SUPABASE_ANON_KEY=your-real-production-key
VITE_APP_ENV=production
```

#### GitHub Actions
```yaml
# .github/workflows/deploy.yml
env:
  VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  VITE_APP_ENV: production
```

## 故障排除

### 常见问题

**1. 环境切换后连接失败**
```bash
# 检查当前配置
npm run env:check

# 验证 Supabase 服务状态
npm run supabase:status

# 重新启动本地服务
npm run supabase:stop
npm run supabase:start
```

**2. 生产环境密钥问题**
- 确认部署平台的环境变量配置
- 检查 Supabase 项目的 API 密钥
- 验证 RLS (Row Level Security) 策略

**3. 本地开发连接问题**
```bash
# 确保本地 Supabase 正在运行
supabase status

# 重置本地数据库
supabase db reset

# 检查端口占用
lsof -i :54321
```

### 调试技巧

**启用调试模式：**
```bash
# 在 .env 中设置
VITE_DEBUG_MODE=true
```

**查看环境信息：**
- 打开浏览器控制台查看环境日志
- 检查 Network 标签页中的 API 请求
- 使用 Supabase Studio 验证连接

## 团队开发工作流

### 新成员设置

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd invoice-assistant-v2/frontend
   npm install
   ```

2. **配置本地环境**
   ```bash
   # 切换到本地环境
   npm run env:local
   
   # 启动本地开发
   npm run supabase:local
   ```

3. **创建个人配置 (可选)**
   ```bash
   # 创建 .env.local 覆盖默认配置
   echo "VITE_SUPABASE_URL=https://my-dev-project.supabase.co" > .env.local
   ```

### 开发流程

1. **功能开发**
   ```bash
   npm run start:local      # 本地环境开发
   ```

2. **测试验证**
   ```bash
   npm run start:staging    # 测试环境验证
   npm run build:staging    # 构建测试版本
   ```

3. **生产部署**
   ```bash
   npm run build           # 生产构建
   # 通过 CI/CD 自动部署
   ```

## 扩展配置

### 添加新环境

1. **创建环境配置文件**
   ```bash
   cp .env.development .env.preview
   ```

2. **更新环境切换脚本**
   ```javascript
   // scripts/env-switch.js
   const envFiles = {
     // ... 现有环境
     preview: '.env.preview'
   }
   ```

3. **添加 npm 脚本**
   ```json
   {
     "scripts": {
       "env:preview": "node scripts/env-switch.js preview",
       "start:preview": "npm run env:preview && npm run dev"
     }
   }
   ```

### 自定义配置

可以根据项目需求添加更多环境变量：

```bash
# API 配置
VITE_API_URL=
VITE_API_TIMEOUT=

# 功能开关
VITE_FEATURE_FLAG_ANALYTICS=
VITE_FEATURE_FLAG_PAYMENTS=

# 第三方服务
VITE_STRIPE_PUBLIC_KEY=
VITE_ANALYTICS_ID=
```

---

**注意：** 此文档与项目代码同步维护，如有更新请及时修改对应配置。