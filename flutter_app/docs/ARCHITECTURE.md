# 发票助手 Flutter 应用架构文档

## 概述

本项目采用**清洁架构（Clean Architecture）**模式，结合**BLoC状态管理**，确保代码的可维护性、可测试性和可扩展性。

## 架构原则

### 1. 分层架构
- **关注点分离**: 每一层只负责特定的功能
- **依赖倒置**: 高层模块不依赖低层模块，都依赖抽象
- **单一职责**: 每个类和模块都有明确的单一职责

### 2. 依赖方向
```
Presentation Layer ──→ Domain Layer ←── Data Layer
                            ↑
                       Core Layer
```

## 项目结构

```
lib/
├── core/                    # 核心基础设施层 ✅
│   ├── constants/          # 应用常量
│   │   └── app_constants.dart
│   ├── widgets/            # 通用UI组件
│   │   ├── loading_widget.dart
│   │   └── error_widget.dart
│   ├── config/             # 应用配置
│   │   ├── app_config.dart
│   │   └── supabase_config.dart
│   ├── di/                 # 依赖注入
│   │   └── injection_container.dart
│   ├── network/            # 网络相关工具
│   │   ├── network_info.dart
│   │   └── supabase_client.dart
│   └── utils/              # 工具类
│       └── dynamic_enum_manager.dart
├── domain/                  # 领域业务层 ✅
│   ├── entities/           # 业务实体
│   │   ├── invoice_entity.dart
│   │   └── dynamic_invoice_entity.dart
│   ├── value_objects/      # 值对象
│   │   └── invoice_status.dart
│   ├── repositories/       # 仓储接口
│   │   └── invoice_repository.dart
│   └── usecases/          # 用例
│       ├── get_invoices_usecase.dart
│       ├── get_invoice_stats_usecase.dart
│       ├── delete_invoice_usecase.dart
│       └── update_invoice_status_usecase.dart
├── data/                   # 数据访问层 ✅
│   ├── dtos/              # 数据传输对象
│   │   └── invoice_dto.dart
│   ├── models/            # 数据模型
│   │   ├── invoice_model.dart
│   │   ├── invoice_model.freezed.dart
│   │   └── invoice_model.g.dart
│   ├── datasources/       # 数据源
│   │   └── invoice_remote_datasource.dart
│   └── repositories/      # 仓储实现
│       └── invoice_repository_impl.dart
├── presentation/          # 表现层 ✅
│   ├── bloc/             # BLoC状态管理
│   │   ├── invoice_bloc.dart
│   │   ├── invoice_event.dart
│   │   └── invoice_state.dart
│   ├── state/            # 通用状态类
│   │   └── app_state.dart
│   ├── pages/            # 页面
│   │   ├── invoice_management_page.dart
│   │   ├── login_page.dart
│   │   ├── main_page.dart
│   │   └── analysis_page.dart
│   └── widgets/          # UI组件
│       ├── invoice_card_widget.dart
│       └── invoice_stats_widget.dart
├── app.dart               # 应用入口
└── main.dart             # 主函数
```

## 各层详细说明

### 🎯 Domain Layer (领域层)

**职责**: 包含纯业务逻辑，不依赖任何外部框架

#### Entities (实体)
- `InvoiceEntity`: 发票业务实体
- `DynamicInvoiceEntity`: 动态发票实体
- 包含业务规则和计算逻辑
- 无任何外部依赖

#### Value Objects (值对象)
- `InvoiceStatus`: 发票状态枚举
  ```dart
  enum InvoiceStatus {
    pending, processing, completed, failed, verified, unreimbursed, reimbursed
  }
  ```
- 包含业务相关的枚举和值对象
- 提供类型安全和业务验证

#### Repository Interfaces (仓储接口)
- `InvoiceRepository`: 定义数据访问契约
- 支持依赖倒置原则
- 包含数据传输对象定义

#### Use Cases (用例)
- `GetInvoicesUseCase`: 获取发票列表业务逻辑
- `GetInvoiceStatsUseCase`: 获取统计数据业务逻辑
- `DeleteInvoiceUseCase`: 删除发票业务逻辑
- `UpdateInvoiceStatusUseCase`: 更新发票状态业务逻辑

### 📊 Data Layer (数据层)

**职责**: 处理数据的获取、存储和转换

#### DTOs (数据传输对象)
- `InvoiceDto`: 纯数据传输对象
- 专注于数据结构，不包含业务逻辑
- 用于API数据传输

#### Models (数据模型)
- `InvoiceModel`: 用于JSON序列化的数据模型
- 使用Freezed生成不可变对象
- 包含与Entity的转换方法

#### Data Sources (数据源)
- `InvoiceRemoteDataSource`: Supabase API数据源
- 处理网络请求和响应
- 包含错误处理和重试逻辑

#### Repository Implementation (仓储实现)
- `InvoiceRepositoryImpl`: Repository接口的具体实现
- 协调数据源和实体转换
- 处理数据缓存逻辑

### 🖼️ Presentation Layer (表现层)

**职责**: 处理用户界面和用户交互

#### BLoC (业务逻辑组件)
- `InvoiceBloc`: 发票相关状态管理
- `InvoiceEvent`: 用户事件定义
- `InvoiceState`: 应用状态定义

#### State Management (状态管理)
- `AppState`: 通用应用状态基类
- 支持泛型状态定义
- 统一的状态处理模式

#### Pages (页面)
- `InvoiceManagementPage`: 发票管理主页面
- `LoginPage`: 登录页面
- `MainPage`: 主页面
- `AnalysisPage`: 数据分析页面
- 使用BLoC模式管理状态

#### Widgets (组件)
- `InvoiceCardWidget`: 发票卡片组件
- `InvoiceStatsWidget`: 统计信息组件
- 可复用的UI组件

### ⚙️ Core Layer (核心层)

**职责**: 提供跨层的共享功能

#### Constants (常量)
- `AppConstants`: 应用级常量定义
- 包含UI常量、动画时间、文件大小限制等

#### Widgets (通用组件)
- `LoadingWidget`: 通用加载组件
- `AppErrorWidget`: 通用错误展示组件
- 跨页面复用的UI组件

#### Config (配置)
- `AppConfig`: 应用配置管理
- `SupabaseConfig`: Supabase连接配置

#### Dependency Injection (依赖注入)
- 使用GetIt管理依赖关系
- 支持单例和工厂模式
- 简化测试和模拟

#### Network (网络)
- Supabase客户端封装
- 网络状态检测
- 统一错误处理

#### Utils (工具类)
- `DynamicEnumManager`: 动态枚举管理
- 其他通用工具函数

## 数据流

```
UI Event ──→ BLoC ──→ UseCase ──→ Repository Interface
                                        │
Response ←── BLoC ←── UseCase ←── Repository Impl ←── DataSource ←── API
```

1. **用户交互**: 用户在UI上执行操作
2. **事件分发**: UI发送事件到BLoC
3. **业务处理**: BLoC调用相应的UseCase
4. **数据访问**: UseCase通过Repository接口访问数据
5. **数据获取**: Repository实现调用DataSource获取数据
6. **数据转换**: 将数据模型转换为领域实体
7. **状态更新**: BLoC更新状态并通知UI

## 状态管理

### BLoC Pattern
- **Events**: 用户操作和系统事件
- **States**: 应用的不同状态
- **Transitions**: 状态之间的转换逻辑

### 状态类型
```dart
// 通用状态基类
abstract class AppState extends Equatable {
  const AppState();
}

// 具体状态实现
class AppInitial extends AppState { ... }
class AppLoading extends AppState { ... }
class AppSuccess<T> extends AppState { ... }
class AppError extends AppState { ... }
class AppEmpty extends AppState { ... }
```

### 发票管理状态
- `InvoiceInitial`: 初始状态
- `InvoiceLoading`: 加载状态
- `InvoiceLoaded`: 数据加载完成
- `InvoiceError`: 错误状态
- `InvoiceStatsLoaded`: 统计数据加载完成

## 关键特性

### 1. 平台感知
```dart
// Web环境兼容的平台检测
bool get isIOS => !kIsWeb && Platform.isIOS;

// 根据平台显示不同信息
if (isIOS) {
  // iOS特定逻辑
}
```

### 2. 类型安全
- 使用枚举确保状态类型安全
- 值对象模式防止原始类型滥用
- Freezed生成不可变数据模型

### 3. 错误处理
- 统一错误处理机制
- 用户友好的错误信息
- 自动重试机制

### 4. 性能优化
- 无限滚动分页加载
- 组件懒加载
- 状态缓存机制

## 开发指南

### 添加新功能的标准流程

1. **Domain Layer First**
   ```dart
   // 1. 定义值对象
   enum NewFeatureStatus { ... }
   
   // 2. 创建实体
   class NewFeatureEntity { ... }
   
   // 3. 定义仓储接口
   abstract class NewFeatureRepository { ... }
   
   // 4. 实现用例
   class GetNewFeatureUseCase { ... }
   ```

2. **Data Layer Implementation**
   ```dart
   // 5. 创建DTO
   class NewFeatureDto { ... }
   
   // 6. 创建数据模型
   @freezed
   class NewFeatureModel { ... }
   
   // 7. 实现数据源
   class NewFeatureRemoteDataSource { ... }
   
   // 8. 实现仓储
   class NewFeatureRepositoryImpl { ... }
   ```

3. **Presentation Layer**
   ```dart
   // 9. 定义BLoC事件和状态
   abstract class NewFeatureEvent { ... }
   abstract class NewFeatureState { ... }
   
   // 10. 实现BLoC
   class NewFeatureBloc { ... }
   
   // 11. 创建UI组件
   class NewFeatureWidget { ... }
   
   // 12. 创建页面
   class NewFeaturePage { ... }
   ```

### 依赖注入注册
```dart
// 在 injection_container.dart 中注册
void init() {
  // Repository
  sl.registerLazySingleton<NewFeatureRepository>(
    () => NewFeatureRepositoryImpl(sl()),
  );
  
  // Use Cases
  sl.registerLazySingleton(() => GetNewFeatureUseCase(sl()));
  
  // BLoC
  sl.registerFactory(() => NewFeatureBloc(sl()));
}
```

## 测试策略

### 测试金字塔
```
       ┌─────────────┐
       │ Widget Tests│ (少量)
       └─────────────┘
      ┌───────────────┐
      │Integration Tests│ (中量)
      └───────────────┘  
    ┌─────────────────────┐
    │   Unit Tests        │ (大量)
    └─────────────────────┘
```

### 单元测试
- **Domain层**: 测试业务逻辑和用例
- **Data层**: 测试数据转换和API调用
- **Presentation层**: 测试BLoC逻辑

### 集成测试
- 端到端用户流程测试
- API集成测试
- 数据库操作测试

### Widget测试
- UI组件功能测试
- 用户交互测试
- 状态变化测试

## 性能监控

### 关键指标
- 应用启动时间
- 页面加载时间
- 内存使用情况
- 网络请求响应时间

### 优化策略
- 代码分割和懒加载
- 图片压缩和缓存
- 数据库查询优化
- 状态管理优化

## 代码规范

### 命名约定
- **文件名**: 使用snake_case
- **类名**: 使用PascalCase
- **变量/方法名**: 使用camelCase
- **常量**: 使用SCREAMING_SNAKE_CASE

### 文件组织
- 每个文件只包含一个主要类
- 相关的小类可以放在同一文件
- 使用barrel文件导出公共接口

### 导入顺序
```dart
// 1. Dart核心库
import 'dart:io';

// 2. Flutter框架
import 'package:flutter/material.dart';

// 3. 第三方包
import 'package:flutter_bloc/flutter_bloc.dart';

// 4. 项目内部导入 (按层级顺序)
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../widgets/invoice_card_widget.dart';
```

## 部署和维护

### 构建配置
- 开发环境配置
- 生产环境配置
- 测试环境配置

### CI/CD流程
1. 代码提交触发CI
2. 运行所有测试
3. 代码质量检查
4. 构建应用
5. 部署到相应环境

### 监控和日志
- 错误监控和报告
- 性能指标收集
- 用户行为分析

这个架构设计确保了代码的**可维护性**、**可测试性**和**可扩展性**，为长期项目发展提供了坚实的基础。