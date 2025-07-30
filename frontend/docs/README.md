# 智能发票管理系统 V2 前端

基于 React + TypeScript + Vite + DaisyUI 构建的现代化发票管理系统前端应用。

## 功能特性

- 📱 **响应式设计** - 支持桌面和移动端
- 🎨 **多主题支持** - 内置 32 种 DaisyUI 官方主题
- 📊 **数据可视化** - 丰富的图表展示发票统计
- 📧 **邮箱集成** - 自动从邮箱导入发票
- 🔍 **智能识别** - AI 驱动的发票信息提取
- 💾 **云端存储** - 基于 Supabase 的数据持久化

## 技术栈

- **框架**: React 19.1.0
- **语言**: TypeScript 5.8.3
- **构建工具**: Vite 7.0.0
- **UI 组件**: DaisyUI 5.0.43 + Tailwind CSS
- **状态管理**: React Query 5.81.5
- **后端服务**: Supabase
- **图表库**: Recharts
- **HTTP 客户端**: Axios
- **路由**: React Router v6

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 环境配置

复制环境变量示例文件并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下变量：

```env
# Supabase 配置
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 后端API配置
VITE_API_URL=http://localhost:8070

# 应用配置
VITE_APP_NAME=发票助手
VITE_APP_VERSION=2.0.0
```

### 开发模式

```bash
npm run dev
```

应用将在 http://localhost:5174 启动

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```
frontend/
├── src/
│   ├── components/      # React 组件
│   │   ├── auth/       # 认证相关组件
│   │   ├── dashboard/  # 仪表盘组件
│   │   ├── email/      # 邮件相关组件
│   │   ├── invoice/    # 发票相关组件
│   │   ├── layout/     # 布局组件
│   │   └── ui/         # 通用 UI 组件
│   ├── contexts/       # React Context
│   ├── hooks/          # 自定义 Hooks
│   ├── pages/          # 页面组件
│   ├── services/       # API 服务
│   ├── styles/         # 样式文件
│   ├── types/          # TypeScript 类型定义
│   └── utils/          # 工具函数
├── public/             # 静态资源
└── dist/              # 构建输出
```

## 主要功能模块

### 1. 用户认证
- 注册/登录
- 个人资料管理
- 密码修改

### 2. 发票管理
- 发票上传（支持 PDF）
- 发票列表查看
- 发票详情编辑
- 批量操作

### 3. 邮箱集成
- 邮箱账户配置
- 自动扫描发票邮件
- 批量导入发票

### 4. 数据分析
- 发票统计仪表盘
- 费用分类分析
- 月度趋势图表

## 开发指南

### 代码风格

项目使用 ESLint 和 Prettier 进行代码格式化：

```bash
# 检查代码风格
npm run lint

# 格式化代码
npm run format
```

### 提交规范

使用语义化提交信息：

- `feat`: 新功能
- `fix`: 修复问题
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具链相关

### 测试

```bash
# 运行测试
npm run test

# 运行测试覆盖率
npm run test:coverage
```

## 部署指南

### 使用 Vercel

1. Fork 本仓库
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署

### 使用 Nginx

1. 构建生产版本
2. 将 `dist` 目录内容复制到服务器
3. 配置 Nginx：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 常见问题

### Q: 如何更改主题？
A: 点击右上角的主题选择器，选择喜欢的主题即可。

### Q: 如何配置邮箱？
A: 在设置页面添加邮箱账户，需要使用邮箱授权码而非登录密码。

### Q: 支持哪些邮箱？
A: 目前支持 QQ、163、126、Gmail、Outlook 等主流邮箱。

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

- 项目主页: [https://github.com/yourusername/invoice-assist-v2](https://github.com/yourusername/invoice-assist-v2)
- Issue 反馈: [https://github.com/yourusername/invoice-assist-v2/issues](https://github.com/yourusername/invoice-assist-v2/issues)