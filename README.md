# 发票助手 V2

[![Version](https://img.shields.io/badge/version-v2.0.19-blue.svg)](https://github.com/yourusername/invoice-assist-v2)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-powered-green.svg)](https://supabase.com/)

现代化的智能发票管理系统，基于 React + Supabase 架构，支持邮件自动收集、OCR 识别和全面的发票管理功能。

## 🌐 在线体验

**体验地址**：[https://fp.gaoxin.net.cn](https://fp.gaoxin.net.cn)

快速体验智能发票管理的完整功能，无需安装即可使用。

## ✨ 特性

### 🤖 智能处理
- **自动邮件扫描**：支持 QQ、163、Gmail 等主流邮箱
- **AI OCR 识别**：集成阿里云和 MinERU API，识别准确率 >95%
- **智能分类**：自动识别增值税发票、火车票、机票行程单等多种票据类型
- **批量处理**：支持大量发票的并行处理

### 📱 现代化界面
- **响应式设计**：完美适配桌面端和移动端
- **PWA 支持**：支持离线使用和移动端安装
- **手势操作**：移动端支持滑动、捏合等手势操作
- **动画优化**：流畅的页面转场和微交互

### 🛠️ 强大功能
- **实时同步**：基于 Supabase 实时数据库
- **高级搜索**：支持多维度筛选和全文搜索
- **数据统计**：可视化图表和报表分析
- **批量操作**：支持批量下载、导出和删除
- **收纳箱功能**：邮件自动处理和管理

### 🔒 安全可靠
- **数据加密**：所有敏感信息均加密存储
- **权限控制**：基于角色的访问控制
- **审计日志**：完整的操作记录追踪
- **备份恢复**：自动数据备份机制

## 🏗️ 技术架构

### 前端技术栈
- **React 19.1.1** - 现代化 UI 框架
- **TypeScript 5.8.3** - 类型安全开发
- **Vite 7.0.0** - 高性能构建工具
- **DaisyUI 5.0.43** - 优雅的 UI 组件库
- **TanStack Query 5.81.5** - 强大的数据状态管理
- **Framer Motion** - 流畅的动画库
- **Tailwind CSS 4** - 现代化样式框架

### 后端服务
- **Supabase** - 开源的 Firebase 替代方案
  - PostgreSQL 数据库
  - 实时数据订阅
  - 用户认证和授权
  - Edge Functions
- **Edge Functions** - 无服务器计算
  - OCR 处理服务
  - 邮件扫描任务
  - 文件处理

### 移动端支持
- **Capacitor** - 原生移动应用
- **PWA** - 渐进式 Web 应用
- **React Native 兼容** - 代码复用

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/yourusername/invoice-assistant-v2.git
cd invoice-assistant-v2/frontend
```

2. **安装依赖**
```bash
npm install
```

3. **环境配置**
```bash
# 复制环境配置文件
cp .env.example .env

# 编辑环境变量
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **启动开发服务器**
```bash
npm run dev
```

5. **打开浏览器**
访问 [http://localhost:5173](http://localhost:5173)

### 生产部署

1. **构建生产版本**
```bash
npm run build:production
```

2. **预览生产版本**
```bash
npm run preview
```

3. **部署到 Vercel**
```bash
npm run deploy:prod
```

## 📱 移动端开发

### Android 开发
```bash
# 构建并同步
npm run mobile:build

# 在 Android Studio 中打开
npm run mobile:open:android

# 开发模式运行
npm run mobile:android:dev
```

### iOS 开发
```bash
# 构建并同步
npm run mobile:build

# 在 Xcode 中打开
npm run mobile:open:ios

# 开发模式运行
npm run mobile:ios:dev
```

## 🗂️ 项目结构

```
frontend/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── invoice/        # 发票相关组件
│   │   ├── mobile/         # 移动端组件
│   │   ├── navigation/     # 导航组件
│   │   └── ui/            # 基础 UI 组件
│   ├── pages/              # 页面组件
│   ├── hooks/              # 自定义 Hooks
│   ├── services/           # 业务逻辑服务
│   ├── utils/              # 工具函数
│   ├── types/              # TypeScript 类型定义
│   └── styles/            # 样式文件
├── public/                 # 静态资源
├── android/               # Android 原生代码
├── ios/                   # iOS 原生代码
└── docs/                  # 项目文档
```

## 🛠️ 开发指南

### 代码规范
```bash
# 代码检查
npm run lint

# 自动修复
npm run lint:fix

# 类型检查
npm run type-check
```

### 环境切换
```bash
# 本地开发环境
npm run env:local

# 测试环境
npm run env:staging

# 生产环境
npm run env:prod
```

### 版本管理
```bash
# 补丁版本（修复 bug）
npm run version:patch

# 次要版本（新功能）
npm run version:minor

# 主要版本（破坏性更改）
npm run version:major
```

## 🔧 配置说明

### 环境变量
| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_APP_ENV` | 应用环境 | `local/staging/production` |
| `VITE_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJ...` |

### Supabase 配置
项目使用 Supabase 作为后端服务，需要配置：
- 数据库表结构
- 行级安全策略（RLS）
- Edge Functions
- 存储桶设置

详细配置请参考 [Supabase 配置文档](docs/supabase-setup.md)

## 📊 核心功能

### 发票管理
- **上传方式**：拖拽上传、批量上传、邮件自动收集
- **文件支持**：PDF、JPG、PNG 格式
- **OCR 识别**：自动提取发票信息
- **手动编辑**：支持修改识别错误的字段
- **分类管理**：自动分类和手动标签

### 数据统计
- **实时统计**：发票总数、总金额、月度趋势
- **可视化图表**：柱状图、折线图、饼图
- **报表导出**：Excel、PDF 格式导出
- **自定义筛选**：按日期、类型、金额范围筛选

### 邮件扫描
- **邮箱支持**：QQ 邮箱、163 邮箱、Gmail、Outlook
- **自动扫描**：定时检查新邮件
- **智能过滤**：识别包含发票的邮件
- **历史处理**：处理历史邮件中的发票

## 🧪 测试

### 运行测试
```bash
# 单元测试
npm run test

# 测试覆盖率
npm run test:coverage

# E2E 测试
npm run test:e2e
```

### 测试环境
项目包含完整的测试体系：
- 单元测试（Jest + Testing Library）
- 集成测试
- E2E 测试（Playwright）
- 视觉回归测试

## 📈 性能优化

### 已实现优化
- **代码分割**：按路由和功能模块分割
- **懒加载**：组件和页面懒加载
- **虚拟滚动**：大列表性能优化
- **缓存策略**：智能数据缓存
- **图片优化**：懒加载和压缩
- **内存管理**：自动内存清理

### 性能指标
- **首屏加载**：< 2s
- **页面切换**：< 300ms
- **大列表滚动**：60fps
- **内存使用**：< 100MB

## 🔄 更新日志

### v2.0.19 (2025-01-19)
- 修复 React Hook 依赖数组稳定性问题
- 移除发票管理页面数据已加载徽章
- 移除移动端悬浮上传按钮
- 修复 React 19 生产环境兼容性问题
- 恢复 PWA 功能

### v2.0.18 (2025-01-15)
- 优化移动端手势系统
- 改进发票卡片交互体验
- 性能优化和内存管理
- 修复移动端兼容性问题

[查看完整更新日志](CHANGELOG.md)

## 🤝 贡献指南

### 贡献流程
1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范
- 遵循 [ESLint 配置](eslint.config.js)
- 使用 [Prettier](https://prettier.io/) 格式化代码
- 编写单元测试
- 更新相关文档

### 问题反馈
- [GitHub Issues](https://github.com/yourusername/invoice-assistant-v2/issues)
- [讨论区](https://github.com/yourusername/invoice-assistant-v2/discussions)

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)

## 🙏 致谢

- [React](https://reactjs.org/) - 优秀的 UI 框架
- [Supabase](https://supabase.com/) - 强大的开源后端服务
- [DaisyUI](https://daisyui.com/) - 美观的组件库
- [Tailwind CSS](https://tailwindcss.com/) - 实用的样式框架

## 🌟 Star History

如果这个项目对您有帮助，请给我们一个 ⭐️

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/invoice-assistant-v2&type=Date)](https://star-history.com/#yourusername/invoice-assistant-v2&Date)

---

<div align="center">

**[在线体验](https://fp.gaoxin.net.cn)** • 
**[文档](docs/)** • 
**[GitHub](https://github.com/yourusername/invoice-assistant-v2)** • 
**[反馈](https://github.com/yourusername/invoice-assistant-v2/issues)**

Made with ❤️ by [Invoice Assist Team](https://github.com/yourusername)

</div>