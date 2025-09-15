# Flutter应用架构体系文档

## 📱 项目概述

这是一个智能发票管理系统的Flutter客户端，采用现代化Clean Architecture + BLoC + Event Bus架构模式。应用遵循iOS Human Interface Guidelines，同时兼容Material 3设计系统。

## 🎨 主题管理体系

### 核心架构


## 🧩 组件管理体系

### 架构模式
采用 **Atomic Design + Feature-Based** 组织结构

### 组件层级

#### 1. **Atomic Level - 原子组件**
- **位置**: `/lib/core/widgets/`
- **特点**: 最基础的UI元素
- **例子**: 
  - `loading_widget.dart` - 加载指示器
  - `error_widget.dart` - 错误显示组件

#### 2. **Molecular Level - 分子组件**
- **位置**: `/lib/presentation/widgets/`
- **特点**: 组合多个原子组件
- **例子**:
  - `unified_bottom_sheet.dart` - 统一底部弹窗
  - `invoice_card_widget.dart` - 发票卡片
  - `theme_selector_widget.dart` - 主题选择器

#### 3. **Organism Level - 有机组件**
- **位置**: `/lib/presentation/pages/`
- **特点**: 完整的业务功能模块
- **例子**:
  - `upload/` - 完整的上传模块
  - `invoice_management_page.dart` - 发票管理页面

### 上传模块案例

#### 完整的模块结构
```
upload/
├── bloc/                    # 状态管理
│   ├── upload_bloc.dart
│   ├── upload_event.dart
│   └── upload_state.dart
├── widgets/                 # 专用组件
│   ├── ios_file_picker_widget.dart
│   ├── ios_upload_progress_widget.dart
│   └── ios_upload_result_widget.dart
├── utils/                   # 工具类
│   ├── upload_config.dart
│   └── upload_validator.dart
└── ios_style_upload_page.dart  # 主页面
```

#### 组件复用原则
- **统一设计语言**: 所有组件遵循 iOS HIG + Material 3
- **主题一致性**: 通过 `Theme.of(context).colorScheme` 统一颜色
- **响应式设计**: 支持不同屏幕尺寸适配

---

## 🚌 状态总线管理体系

### 核心架构
**BLoC Pattern + Event Bus + Clean Architecture**

### 全局状态总线

#### 1. **AppEventBus** - 事件总线
- **位置**: `/lib/core/events/app_event_bus.dart`
- **模式**: 单例 + Stream-based
- **功能**: 解耦不同BLoC之间的通信

```dart
class AppEventBus {
  static final AppEventBus _instance = AppEventBus._();
  static AppEventBus get instance => _instance;
  
  final StreamController<AppEvent> _controller = 
      StreamController<AppEvent>.broadcast();
  
  Stream<AppEvent> get stream => _controller.stream;
  
  void emit(AppEvent event) => _controller.add(event);
  
  Stream<T> on<T extends AppEvent>() => 
      stream.where((event) => event is T).cast<T>();
}
```

#### 2. **事件类型体系**
完整的事件类型定义：

```dart
// 基础事件
abstract class AppEvent {
  const AppEvent();
}

// 报销集事件
class ReimbursementSetCreatedEvent extends AppEvent {
  final String setId;
  final List<String> affectedInvoiceIds;
}

// 发票事件  
class InvoiceStatusChangedEvent extends AppEvent {
  final String invoiceId;
  final InvoiceStatus newStatus;
  final InvoiceStatus oldStatus;
}

// UI导航事件
class TabChangedEvent extends AppEvent {
  final int newTabIndex;
  final int oldTabIndex;
  final String tabName;
}
```

### BLoC状态管理

#### 1. **全局BLoC提供器**
在 `app.dart` 中注册：

```dart
MultiBlocProvider(
  providers: [
    BlocProvider<InvoiceBloc>(create: (context) => di.sl<InvoiceBloc>()),
    BlocProvider<ReimbursementSetBloc>(create: (context) => di.sl<ReimbursementSetBloc>()),
    BlocProvider<PermissionBloc>(create: (context) => di.sl<PermissionBloc>()),
  ],
  child: CupertinoApp.router(...)
)
```

#### 2. **BLoC间通信**
通过事件总线实现解耦通信：

```dart
class InvoiceBloc extends Bloc<InvoiceEvent, InvoiceState> {
  InvoiceBloc({required AppEventBus eventBus}) {
    // 监听外部事件
    eventBus.on<ReimbursementSetCreatedEvent>().listen((event) {
      add(RefreshInvoices()); // 响应报销集创建
    });
  }
  
  // 发送事件
  void _emitStatusChange(String invoiceId, InvoiceStatus newStatus) {
    eventBus.emit(InvoiceStatusChangedEvent(
      invoiceId: invoiceId,
      newStatus: newStatus,
      oldStatus: oldStatus,
    ));
  }
}
```

### 实际应用案例

#### Tab切换通信
上传完成后切换到发票管理tab：

```dart
// 上传页面发送事件
final eventBus = sl<AppEventBus>();
eventBus.emit(TabChangedEvent(
  newTabIndex: 0,
  oldTabIndex: 1,
  tabName: '发票管理',
));

// MainPage监听并响应
_tabChangeSubscription = di.sl<AppEventBus>().on<TabChangedEvent>().listen((event) {
  setState(() => _currentIndex = event.newTabIndex);
  _pageController.animateToPage(event.newTabIndex, ...);
});
```

---

## 🏗️ 架构优势

### 1. **主题管理优势**
### 2. **组件管理优势**  
- **可复用**: Atomic Design提高组件复用率
- **可维护**: Feature-based结构清晰
- **可扩展**: 模块化设计便于功能扩展
- **一致性**: 统一的设计语言和主题

### 3. **状态管理优势**
- **解耦**: 事件总线避免直接依赖
- **可测试**: BLoC Pattern便于单元测试  
- **可预测**: 单向数据流，状态变化可追踪
- **扩展性**: 支持复杂的跨模块通信

### 4. **整体架构优势**
- **Clean Architecture**: 分层清晰，职责明确
- **依赖注入**: 通过 `injection_container.dart` 统一管理
- **事件驱动**: 响应式架构，支持实时更新
- **类型安全**: 强类型系统，减少运行时错误

---

## 📁 项目结构

### 核心目录结构
```
lib/
├── core/                    # 核心基础设施
│   ├── theme/              # 主题管理
│   ├── events/             # 事件总线
│   ├── di/                 # 依赖注入
│   └── widgets/            # 原子组件
├── data/                   # 数据层
│   ├── datasources/        # 数据源
│   ├── repositories/       # 仓储实现
│   └── models/             # 数据模型
├── domain/                 # 业务逻辑层
│   ├── entities/           # 业务实体
│   ├── repositories/       # 仓储接口
│   └── usecases/          # 用例
└── presentation/           # 表现层
    ├── bloc/              # BLoC状态管理
    ├── pages/             # 页面组件
    └── widgets/           # 复用组件
```

### 重要模块

#### 全局状态总线模块
- **位置**: `/lib/core/events/app_event_bus.dart`
- **功能特点**:
  - 解耦不同Bloc之间的通信
  - 支持一对多和多对多通信
  - 类型安全的事件过滤
  - 完整的文档和最佳实践指南

#### Cupertino组件体系
基于iOS Human Interface Guidelines的组件设计：
- 原生iOS交互体验
- Material 3颜色系统集成
- 流畅的动画和过渡效果
- 无障碍支持


## 🔧 开发指南

### 新建页面流程
1. 在 `presentation/pages/` 创建页面目录
2. 实现BLoC状态管理 (Event/State/Bloc)
3. 创建页面组件，遵循iOS设计规范
4. 在 `app.dart` 中注册路由
5. 如需跨模块通信，使用事件总线

### 主题使用规范


## ⚙️ 硬编码常量管理系统





这套架构体系为Flutter应用提供了一个现代化、可维护、可扩展的基础框架，特别适合中大型应用的开发和维护。