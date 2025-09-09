# 发票助手 Flutter 应用

基于 Flutter 的 iOS 发票管理应用，集成 Supabase 后端服务。

## 功能特性

- 📱 原生 iOS 体验
- 🎨 FlexColorScheme 主题系统
- 🔗 Supabase 后端集成
- 📄 发票上传和 OCR 处理
- 📊 数据分析和可视化
- 📧 邮件收件箱管理

## 技术栈

- **Flutter**: 最新稳定版
- **状态管理**: Riverpod
- **路由**: go_router
- **主题**: FlexColorScheme
- **后端**: Supabase
- **图表**: fl_chart

## 开发环境要求

- Flutter SDK (>= 3.0.0)
- Xcode (iOS 15+)
- iOS 模拟器或真机

## 快速开始

### 1. 安装依赖

```bash
flutter pub get
```

### 2. 配置环境变量

复制现有项目的 Supabase 配置：

```bash
# 从 frontend/.env 复制 Supabase 配置
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 运行应用

```bash
# iOS 模拟器
flutter run

# Web 开发调试
flutter run -d web
```

## 项目结构

```
lib/
├── core/                    # 核心配置和服务
│   ├── config/             # 应用和 Supabase 配置
│   ├── network/            # 网络服务
│   ├── theme/              # 主题系统
│   └── utils/              # 工具类
├── features/               # 功能模块
│   ├── dashboard/          # 仪表板
│   ├── invoices/           # 发票管理
│   ├── upload/             # 上传功能
│   └── profile/            # 用户中心
├── shared/                 # 共享组件
│   ├── widgets/            # 通用 UI 组件
│   ├── providers/          # 全局状态管理
│   ├── models/             # 数据模型
│   └── constants/          # 常量定义
├── main.dart               # 应用入口
└── app.dart                # 应用根组件
```

## 开发进度

- ✅ 项目基础架构
- ⏳ 用户认证系统
- ⏳ 发票上传功能
- ⏳ 发票管理系统
- ⏳ 数据分析仪表板
- ⏳ 收件箱管理
- ⏳ iOS 原生体验优化

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License