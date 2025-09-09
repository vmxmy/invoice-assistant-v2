# 功能设计：01-项目基础架构

## 概述
建立 Flutter iOS 应用的完整技术架构，集成 Supabase 后端、FlexColorScheme 主题系统和现代化的状态管理。

## 架构设计

### 系统架构图
```
┌─────────────────────────────────────────────┐
│                Flutter App                   │
├─────────────────────────────────────────────┤
│  UI Layer (FlexColorScheme + Material)      │
├─────────────────────────────────────────────┤
│  State Management Layer (Riverpod)          │
├─────────────────────────────────────────────┤
│  Business Logic Layer (Features)            │
├─────────────────────────────────────────────┤
│  Data Layer (Supabase Client)               │
├─────────────────────────────────────────────┤
│  Network Layer (HTTP + WebSocket)           │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│          Supabase Backend                    │
│  (复用现有配置和数据库结构)                    │
└─────────────────────────────────────────────┘
```

### 项目目录结构
```
flutter_app/
├── lib/
│   ├── core/                    # 核心配置和服务
│   │   ├── config/
│   │   │   ├── app_config.dart       # 应用配置
│   │   │   └── supabase_config.dart  # Supabase配置
│   │   ├── network/
│   │   │   ├── supabase_client.dart  # Supabase客户端封装
│   │   │   └── network_info.dart     # 网络状态检查
│   │   ├── theme/
│   │   │   ├── app_theme.dart        # FlexColorScheme主题
│   │   │   └── theme_constants.dart  # 主题常量
│   │   └── utils/
│   │       ├── logger.dart           # 日志工具
│   │       └── validators.dart       # 验证工具
│   ├── features/                # 功能模块
│   │   ├── dashboard/           # 仪表板
│   │   │   ├── presentation/
│   │   │   ├── providers/
│   │   │   └── widgets/
│   │   ├── invoices/            # 发票管理
│   │   │   ├── presentation/
│   │   │   ├── providers/
│   │   │   └── widgets/
│   │   ├── upload/              # 上传功能
│   │   │   ├── presentation/
│   │   │   ├── providers/
│   │   │   └── widgets/
│   │   └── profile/             # 用户中心
│   │       ├── presentation/
│   │       ├── providers/
│   │       └── widgets/
│   ├── shared/                  # 共享组件
│   │   ├── widgets/             # 通用UI组件
│   │   │   ├── bottom_navigation.dart
│   │   │   ├── loading_widget.dart
│   │   │   └── error_widget.dart
│   │   ├── providers/           # 全局状态管理
│   │   │   ├── auth_provider.dart
│   │   │   ├── theme_provider.dart
│   │   │   └── network_provider.dart
│   │   ├── models/              # 数据模型
│   │   └── constants/           # 常量定义
│   ├── main.dart                # 应用入口
│   └── app.dart                 # 应用根组件
├── android/                     # Android配置
├── ios/                         # iOS配置
├── web/                         # Web配置
├── assets/                      # 资源文件
│   ├── images/
│   └── icons/
├── pubspec.yaml                 # 依赖配置
└── README.md                    # 项目说明
```

## 组件设计

### 1. 核心配置组件

#### AppConfig
- **职责**: 管理应用全局配置
- **接口**: 提供环境变量访问方法
- **依赖**: 无

#### SupabaseClient
- **职责**: 封装 Supabase 客户端，提供统一的数据访问接口
- **接口**: 
  - `initialize()` - 初始化客户端
  - `getUser()` - 获取当前用户
  - `signOut()` - 用户登出
- **依赖**: supabase_flutter

### 2. 主题系统组件

#### AppTheme
- **职责**: 配置 FlexColorScheme 主题
- **接口**: 
  - `lightTheme` - 亮色主题
  - `darkTheme` - 暗色主题
- **依赖**: flex_color_scheme

#### ThemeProvider
- **职责**: 管理主题状态，支持亮暗模式切换
- **接口**: 
  - `currentThemeMode` - 当前主题模式
  - `toggleTheme()` - 切换主题
- **依赖**: riverpod

### 3. 路由导航组件

#### AppRouter
- **职责**: 配置应用路由和导航
- **接口**: 路由定义和导航方法
- **依赖**: go_router

#### BottomNavigation
- **职责**: 底部导航栏实现
- **接口**: 导航项配置和页面切换
- **依赖**: flutter/material

### 4. 状态管理组件

#### AuthProvider
- **职责**: 管理用户认证状态
- **接口**: 
  - `currentUser` - 当前用户信息
  - `isAuthenticated` - 认证状态
  - `signIn/signOut` - 登录登出方法
- **依赖**: supabase_flutter, riverpod

## 数据模型

### 用户数据模型
复用现有 Supabase 数据库结构：
- users 表
- invoices 表  
- emails 表
- 其他现有表结构

### 本地状态模型
```dart
// 应用状态
class AppState {
  final bool isLoading;
  final String? error;
  final ThemeMode themeMode;
}

// 网络状态
enum NetworkStatus {
  connected,
  disconnected,
  unknown
}
```

## API 设计

### Supabase 集成接口
```dart
abstract class SupabaseService {
  Future<User?> getCurrentUser();
  Future<List<Invoice>> getInvoices();
  Future<List<Email>> getEmails();
  Stream<AuthState> get authStateStream;
}
```

## UI/UX 设计

### 主题配置
- **FlexColorScheme 标准配色方案**
- **Material Design 3.0 组件**
- **iOS 风格适配**
- **亮色/暗色主题支持**

### 导航结构
```
底部导航栏 (4个主要标签)
├── 仪表板 (Dashboard)
├── 发票管理 (Invoices)  
├── 上传 (Upload)
└── 用户中心 (Profile)
    ├── 收件箱 (Inbox) - 子页面
    └── 设置 (Settings) - 子页面
```

### 响应式设计
- **iPhone 优化布局**
- **安全区域适配**
- **动态字体大小支持**

## 技术栈

### 核心依赖（使用最新版本）
```yaml
dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^latest  # Supabase集成
  flex_color_scheme: ^latest # 主题系统
  go_router: ^latest         # 路由管理
  flutter_riverpod: ^latest  # 状态管理
  connectivity_plus: ^latest # 网络状态检查
```

### 开发工具
```yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^latest
  build_runner: ^latest
```

## 实现注意事项

### 1. 应用启动流程
```dart
main() -> 
检查网络连接 -> 
初始化Supabase -> 
验证用户登录状态 -> 
加载主题设置 -> 
启动应用
```

### 2. 错误处理策略
- **网络错误**: 显示重试按钮和离线模式提示
- **认证错误**: 自动跳转到登录页面  
- **Supabase错误**: 友好的错误提示和日志记录

### 3. 性能优化
- **懒加载**: 功能模块按需加载
- **缓存策略**: 合理缓存用户数据和配置
- **内存管理**: 及时释放不必要的资源

### 4. 安全考虑
- **环境变量管理**: 敏感配置使用 dart-define
- **网络请求**: 使用 HTTPS 和证书绑定
- **数据验证**: 输入数据严格验证

### 5. 开发最佳实践
- **代码规范**: 遵循 Flutter/Dart 官方规范
- **测试覆盖**: 单元测试和集成测试
- **文档更新**: 及时更新技术文档