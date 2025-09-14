# Flutter应用架构体系文档

## 📱 项目概述

这是一个智能发票管理系统的Flutter客户端，采用现代化Clean Architecture + BLoC + Event Bus架构模式。应用遵循iOS Human Interface Guidelines，同时兼容Material 3设计系统。

## 🎨 主题管理体系

### 核心架构
基于 **FlexColorScheme + Material 3 + Cupertino** 的统一主题系统

### 关键组件

#### 1. **ThemeManager** - 主题管理器
- **位置**: `/lib/core/theme/theme_manager.dart`
- **功能**: 
  - 动态主题切换 (Light/Dark/System)
  - FlexColorScheme集成
  - Material 3 ColorScheme管理
  - Cupertino主题转换

```dart
class ThemeManager extends ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.system;
  late ThemeData _lightTheme;
  late ThemeData _darkTheme;
  
  // Material 3 + FlexColorScheme
  ThemeData get lightTheme => FlexThemeData.light(
    scheme: FlexScheme.material,
    useMaterial3: true,
  );
}
```

#### 2. **主题常量系统**
- `app_theme_constants.dart` - 应用级主题常量
- `component_theme_constants.dart` - 组件级主题常量
- `theme_preset_manager.dart` - 预设主题管理

#### 3. **Cupertino适配**
在 `app.dart` 中实现 Material → Cupertino 主题转换：

```dart
static CupertinoThemeData _buildCupertinoTheme(ThemeManager themeManager) {
  final colorScheme = isDark ? darkTheme.colorScheme : lightTheme.colorScheme;
  
  return CupertinoThemeData(
    brightness: isDark ? Brightness.dark : Brightness.light,
    primaryColor: colorScheme.primary,
    scaffoldBackgroundColor: colorScheme.surface,
    // Material 3 颜色映射到 Cupertino
  );
}
```

#### 4. **语义化颜色使用**
现代化的颜色引用方式：

```dart
// ✅ 正确：使用语义化颜色
final colorScheme = Theme.of(context).colorScheme;
color: colorScheme.primary
color: colorScheme.onSurface.withValues(alpha: 0.7)
color: colorScheme.surfaceContainerHighest

// ❌ 废弃：硬编码颜色
color: Color(0xFF1976D2)
color: Colors.grey[300]
```

---

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
- **统一性**: FlexColorScheme确保Material 3标准
- **灵活性**: 支持动态主题切换
- **跨平台**: Material + Cupertino双支持
- **语义化**: 使用语义颜色而非硬编码

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

#### FlexColorScheme主题管理
现代Material 3主题系统：
- 动态颜色支持
- 语义化颜色命名
- 多主题预设
- 自动深色模式

---

## 🔧 开发指南

### 新建页面流程
1. 在 `presentation/pages/` 创建页面目录
2. 实现BLoC状态管理 (Event/State/Bloc)
3. 创建页面组件，遵循iOS设计规范
4. 在 `app.dart` 中注册路由
5. 如需跨模块通信，使用事件总线

### 主题使用规范
```dart
// 获取颜色方案
final colorScheme = Theme.of(context).colorScheme;

// 使用语义颜色
backgroundColor: colorScheme.surface,
textColor: colorScheme.onSurface,
primaryColor: colorScheme.primary,
```

### 事件总线使用
```dart
// 发送事件
final eventBus = sl<AppEventBus>();
eventBus.emit(MyEvent(data: data));

// 监听事件
eventBus.on<MyEvent>().listen((event) {
  // 处理事件
});
```

---

## ⚙️ 硬编码常量管理系统

### 核心原则
**分离关注点**: UI常量使用主题系统，业务常量集中配置管理

### 配置文件架构

#### 1. **应用配置常量** - `/lib/core/config/app_constants.dart`
集中管理应用级通用配置：

```dart
class AppConstants {
  AppConstants._(); // 私有构造函数
  
  /// ====== 文件上传相关 ======
  static const int maxFileSize = 10 * 1024 * 1024; // 10MB
  static const int maxFileCount = 5;
  static const List<String> supportedFileExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
  static const int maxConcurrentUploads = 3;
  
  /// ====== 网络请求相关 ======
  static const Duration defaultRequestTimeout = Duration(seconds: 30);
  static const Duration uploadTimeout = Duration(minutes: 2);
  static const int maxRetryAttempts = 3;
  
  /// ====== 缓存相关 ======
  static const Duration invoiceListCacheTtl = Duration(minutes: 5);
  static const Duration invoiceStatsCacheTtl = Duration(minutes: 2);
  static const Duration permissionsCacheTtl = Duration(hours: 2);
  
  /// ====== 分页相关 ======
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  /// ====== 动画相关 ======
  static const Duration normalAnimationDuration = Duration(milliseconds: 300);
  static const Duration fastAnimationDuration = Duration(milliseconds: 200);
  
  /// ====== 业务逻辑相关 ======
  static const int invoiceOverdueDays = 90;
  static const int invoiceUrgentDays = 60;
  static const double amountWanThreshold = 10000;
  
  /// ====== 辅助方法 ======
  static String getFormattedAmount(double amount) {
    if (amount >= amountWanThreshold) {
      return '¥${(amount / amountWanThreshold).toStringAsFixed(2)}万';
    }
    return '¥${amount.toStringAsFixed(2)}';
  }
}
```

#### 2. **业务配置常量** - `/lib/core/config/business_constants.dart`
业务规则和限制的配置：

```dart
/// 发票状态常量
class InvoiceStatus {
  static const String pending = 'pending';
  static const String approved = 'approved';
  static const String rejected = 'rejected';
}

/// 发票金额限制
class InvoiceAmountLimits {
  static const double minAmount = 0.01;
  static const double maxAmount = 99999999.99;
  static const double largeAmountThreshold = 10000.0;
}

/// 文件类型限制
class FileTypeConstraints {
  static const String pdf = 'pdf';
  static const int pdfMaxSize = 10 * 1024 * 1024; // 10MB
  static const List<String> supportedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
}
```

#### 3. **消息映射配置** - `/lib/core/constants/message_constants.dart`
统一管理UI文本和消息：

```dart
class MessageConstants {
  /// 获取清理后的重复发票消息
  static String getDuplicateMessage(String? originalMessage) {
    if (originalMessage == null) return '重复发票';
    
    final cleaned = originalMessage
        .replaceAll(RegExp(r'节省资源[，。、,]*\s*'), '')
        .replaceAll(RegExp(r'该文件已存在[，。、,]*\s*'), '')
        .trim();
    
    return cleaned.isEmpty ? '重复发票' : cleaned;
  }
  
  /// 统一错误消息处理
  static String getErrorMessage(String? originalMessage) {
    return originalMessage ?? '操作失败，请重试';
  }
}
```

### 使用规范

#### ✅ **正确的常量使用方式**

**1. 业务逻辑常量**
```dart
// ✅ 使用统一配置
import '../../core/config/app_constants.dart';

// 文件大小检查
if (fileSize > AppConstants.maxFileSize) {
  throw Exception('文件过大');
}

// 分页请求
final result = await getInvoices(pageSize: AppConstants.defaultPageSize);

// 缓存配置
Timer.periodic(AppConstants.invoiceListCacheTtl, callback);

// 格式化金额
final formattedAmount = AppConstants.getFormattedAmount(amount);
```

**2. UI间距和样式**
```dart
// ✅ 直接使用主题系统，不创建额外常量
Text('标题', style: Theme.of(context).textTheme.titleLarge)
padding: const EdgeInsets.all(16.0) // Material Design标准间距
color: Theme.of(context).colorScheme.primary
```

**3. 消息处理**
```dart
// ✅ 使用统一消息配置
import '../../core/constants/message_constants.dart';

final cleanMessage = MessageConstants.getDuplicateMessage(originalMessage);
final errorMessage = MessageConstants.getErrorMessage(errorInfo);
```

#### ❌ **禁止的做法**

**1. 硬编码数值**
```dart
// ❌ 不要在组件中硬编码
const maxFiles = 5;
Duration(minutes: 5)
if (amount >= 10000)
pageSize: 20
```

**2. 创建不必要的UI常量**
```dart
// ❌ 不要创建UI映射常量
class UIConstants {
  static const double spacingL = 16.0;
  static const double fontSize14 = 14.0;
}
```

**3. 分散的配置定义**
```dart
// ❌ 不要在各个文件中重复定义
static const Duration cacheTime = Duration(minutes: 5); // 重复定义
```

### 迁移指南

#### 当发现硬编码时的处理步骤：

1. **识别类型**：确定是业务逻辑常量还是UI样式
2. **选择配置文件**：业务逻辑 → `app_constants.dart`，UI → 主题系统
3. **添加常量**：在相应配置文件中添加语义化命名的常量
4. **替换使用**：将硬编码替换为配置常量的引用
5. **验证**：运行 `flutter analyze` 确保无错误

#### 示例迁移：
```dart
// 迁移前
Duration(minutes: 5) // 硬编码

// 迁移后
AppConstants.invoiceListCacheTtl // 语义化配置
```

### 配置常量命名规范

- **功能前缀**：按功能模块分组 (`invoice*`, `upload*`, `cache*`)
- **语义化命名**：描述用途而非数值 (`maxFileSize` vs `tenMB`)
- **单位后缀**：时间用 `Duration` 后缀，大小用 `Size` 后缀
- **阈值命名**：使用 `Threshold` 后缀表示临界值

### 维护指南

- **统一修改**：需要调整配置时，只需修改配置文件一处
- **向后兼容**：添加新常量时保持现有API不变
- **文档更新**：新增重要配置时更新此文档
- **定期审查**：定期检查是否有新的硬编码需要迁移

这套硬编码管理系统确保了代码的可维护性和一致性，是大型Flutter应用的最佳实践。

---

这套架构体系为Flutter应用提供了一个现代化、可维护、可扩展的基础框架，特别适合中大型应用的开发和维护。