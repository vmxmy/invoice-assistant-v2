# 发票助手前端 - React + TypeScript + Supabase

## 功能特性

✅ **用户认证系统**
- 用户注册（邮箱验证）
- 用户登录
- JWT Token 管理
- 自动登录状态检测

✅ **Supabase 集成**
- 认证服务集成
- 实时状态同步
- 安全的客户端配置

✅ **路由保护**
- 基于认证状态的路由守卫
- Profile 完整性检查
- 自动重定向

✅ **响应式界面**
- Tailwind CSS 样式
- 移动端适配
- 现代化UI组件

## 快速开始

### 1. 安装依赖
```bash
npm install
# 或运行预配置脚本
./install-deps.sh
```

### 2. 环境配置
确保 `.env` 文件包含：
```env
VITE_SUPABASE_URL=https://sfenhhtvcyslxplvewmt.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8090
VITE_APP_NAME=发票助手
VITE_APP_VERSION=2.0.0
```

### 3. 启动开发服务器
```bash
npm run dev
```

## 文件结构

```
src/
├── components/
│   ├── auth/
│   │   ├── SignUp.tsx          # 用户注册组件
│   │   └── SignIn.tsx          # 用户登录组件
│   ├── Dashboard.tsx           # 主页面
│   ├── SetupProfile.tsx        # Profile 设置
│   └── ProtectedRoute.tsx      # 路由保护
├── contexts/
│   └── AuthContext.tsx         # 认证上下文
├── services/
│   └── supabase.ts            # Supabase 客户端
└── App.tsx                    # 主应用入口
```

## 核心功能实现

### 认证流程

1. **用户注册**：
   - 表单验证（邮箱、密码强度、确认密码）
   - Supabase Auth 注册
   - 邮箱验证流程
   - 自动 Profile 创建

2. **用户登录**：
   - 邮箱密码验证
   - JWT Token 获取
   - 状态持久化

3. **Profile 管理**：
   - 用户资料完善
   - 后端 API 集成
   - 状态同步

## 使用方法

### 启动前端应用
```bash
cd /Users/xumingyang/app/invoice_assist/v2/frontend
npm run dev
```

### 测试注册流程
1. 访问 `http://localhost:5173/signup`
2. 填写注册表单（邮箱、密码、显示名称）
3. 点击"创建账户"
4. 检查邮箱验证邮件
5. 点击确认链接
6. 自动创建 Profile 并跳转到 Dashboard

### 测试登录流程
1. 访问 `http://localhost:5173/login`
2. 使用已注册的邮箱和密码登录
3. 成功后跳转到 Dashboard

## 技术特性

- ⚛️ **React 19** + TypeScript
- 🔥 **Vite** 构建工具
- 🎨 **Tailwind CSS** 样式框架
- 🔄 **React Router** 路由管理
- 🗄️ **Supabase** 认证服务
- 🔒 **JWT** Token 认证

## 已完成的组件

1. **Supabase 客户端配置** (`src/services/supabase.ts`)
2. **认证上下文** (`src/contexts/AuthContext.tsx`) 
3. **用户注册组件** (`src/components/auth/SignUp.tsx`)
4. **用户登录组件** (`src/components/auth/SignIn.tsx`)
5. **路由保护组件** (`src/components/ProtectedRoute.tsx`)
6. **主页面** (`src/components/Dashboard.tsx`)
7. **Profile设置** (`src/components/SetupProfile.tsx`)
8. **主应用入口** (`src/App.tsx`)

## 下一步

前端用户注册功能已完整实现，包括：
- 完整的认证流程
- 邮箱验证
- Profile 管理
- 路由保护
- 响应式界面

可以启动前端开发服务器测试完整的用户注册和登录流程。