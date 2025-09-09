# 01 - 项目基础架构

## 功能概述
建立 Flutter iOS 应用的基础架构，集成 Supabase 后端和 FlexColorScheme 主题系统。

## EARS 格式需求

### 项目结构和配置
- **Ubiquitous**: 系统应在 `invoice-assistant-v2/flutter_app/` 目录下创建完整的 Flutter 项目结构
- **Ubiquitous**: 系统应使用 Flutter 最新稳定版本进行项目初始化
- **Ubiquitous**: 系统应配置应用包名为 `com.invoiceassist.flutter`
- **Ubiquitous**: 系统应支持 iOS 15+ 版本以符合主流兼容性要求
- **Ubiquitous**: 系统应支持现代 Web 浏览器（用于开发调试）

### Supabase 集成
- **Ubiquitous**: 系统应集成 Supabase Flutter SDK
- **Ubiquitous**: 系统应复用现有前端的 Supabase URL 和 API 密钥配置
- **Ubiquitous**: 系统应完全兼容现有数据库表结构（users, invoices, emails 等）
- **Ubiquitous**: 系统应按照标准 Flutter 开发规范管理环境变量和配置

### UI 框架和主题
- **Ubiquitous**: 系统应集成 FlexColorScheme 作为主题系统
- **Ubiquitous**: 系统应使用 FlexColorScheme 标准配色方案
- **Ubiquitous**: 系统应针对 iPhone 设备进行 UI 优化
- **Ubiquitous**: 系统应支持亮色和暗色主题切换

### 路由和导航
- **Ubiquitous**: 系统应使用 go_router 进行路由管理
- **Ubiquitous**: 系统应实现底部导航栏，包含四个主要页面：仪表板、发票管理、上传、用户中心
- **Ubiquitous**: 系统应在用户中心页面提供收件箱和设置功能的入口

### 状态管理
- **Ubiquitous**: 系统应使用 Riverpod 进行状态管理
- **Ubiquitous**: 系统应遵循 Riverpod 最佳实践进行应用状态、用户状态和 UI 状态管理

### 应用启动流程
- **Event-Driven**: 当应用启动时，系统应检查网络连接状态
- **Event-Driven**: 当应用启动时，系统应验证用户登录状态
- **Event-Driven**: 当应用启动时，系统应初始化 Supabase 客户端
- **Event-Driven**: 当应用启动时，系统应加载用户首选项和主题设置

### 错误处理
- **Conditional**: 如果 Supabase 连接失败，系统应显示友好的错误提示信息
- **Conditional**: 如果网络连接不可用，系统应显示网络状态指示并提供重试选项
- **Conditional**: 如果用户未登录，系统应导航至登录页面

## 技术要求
- Flutter 最新稳定版本
- iOS 15+ 支持
- Supabase Flutter SDK
- FlexColorScheme 主题系统
- go_router 路由管理
- Riverpod 状态管理

## 交付成果
- 完整的 Flutter 项目结构
- 配置好的 Supabase 集成
- FlexColorScheme 主题系统
- 底部导航和路由配置
- 基础状态管理架构
- 应用启动和错误处理逻辑