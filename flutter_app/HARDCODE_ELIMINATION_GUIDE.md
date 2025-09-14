# 硬编码消除指南

## 🎯 核心原则

**UI相关常量（间距、尺寸、圆角、字体大小）**：
- ✅ 直接使用Flutter主题系统的语义语法
- ❌ 不创建额外的映射层或常量文件
- ❌ 不使用硬编码数值

**业务逻辑常量**：
- ✅ 集中到配置文件管理
- ✅ 使用语义化命名
- ✅ 提供辅助方法

## 📋 配置文件结构

```
lib/core/config/
├── app_constants.dart           # 应用级通用常量（网络、缓存、文件等）
├── business_constants.dart      # 业务逻辑相关常量（状态、限制、规则等）
└── message_constants.dart       # 消息映射配置（已存在）
```

## 🎨 UI常量正确使用方式

### ❌ 错误做法 - 不要这样做：

```dart
// 不要创建UI常量文件
class UIConstants {
  static const double spacingL = 16.0;
  static const double fontSize14 = 14.0;
  static const double radiusM = 8.0;
}

// 不要使用硬编码
padding: const EdgeInsets.all(16.0)
style: TextStyle(fontSize: 14)
borderRadius: BorderRadius.circular(8.0)
```

### ✅ 正确做法 - 直接使用主题语义：

```dart
// 字体：使用主题文本样式
Text(
  'Hello',
  style: Theme.of(context).textTheme.bodyMedium,  // 而不是 fontSize: 14
)

// 颜色：使用主题颜色
Container(
  color: Theme.of(context).colorScheme.primary,  // 而不是 Colors.blue
  child: Text(
    'Hello',
    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
      color: Theme.of(context).colorScheme.onPrimary,  // 语义化颜色
    ),
  ),
)

// 间距：使用Material 3规范
Padding(
  padding: const EdgeInsets.all(16.0),  // Material Design标准间距
  child: Card(
    child: Padding(
      padding: const EdgeInsets.all(12.0),  // 卡片内标准间距
      child: content,
    ),
  ),
)

// 圆角：使用主题形状
Card(
  shape: Theme.of(context).cardTheme.shape,  // 主题定义的卡片形状
  child: content,
)

// 按钮：完全依赖主题
ElevatedButton(
  onPressed: onPressed,
  child: Text('按钮'),  // 主题会自动应用样式
)
```

## 🔢 业务常量管理

### 文件大小和限制

```dart
// 使用
import '../core/config/app_constants.dart';

if (file.lengthSync() > AppConstants.maxFileSize) {
  throw Exception('文件太大');
}

String formattedSize = AppConstants.getFormattedFileSize(file.lengthSync());
```

### 时间间隔

```dart
// 使用
import '../core/config/app_constants.dart';

await Future.delayed(AppConstants.normalAnimationDuration);
Timer.periodic(AppConstants.invoiceListCacheTtl, callback);
```

### 业务规则

```dart
// 使用
import '../core/config/business_constants.dart';

if (BusinessConstants.isLargeAmountInvoice(amount)) {
  // 大额发票处理逻辑
}

if (!BusinessConstants.isSupportedFileExtension(extension)) {
  // 不支持的文件类型
}
```

## 🚫 完全不需要的常量

以下类型的常量完全不需要创建：

### 1. UI尺寸常量
```dart
// ❌ 不要创建这些
static const double buttonHeight = 48.0;
static const double iconSize = 24.0; 
static const double appBarHeight = 56.0;

// ✅ 直接使用或让Flutter处理
SizedBox(height: 48), // 明确的尺寸
Icon(Icons.home),     // 使用默认尺寸
AppBar(title: Text('Title')), // 使用默认高度
```

### 2. 间距常量
```dart
// ❌ 不要创建这些
static const double spacingS = 8.0;
static const double spacingM = 16.0;

// ✅ 直接使用Material Design规范
padding: const EdgeInsets.all(8.0),   // 小间距
padding: const EdgeInsets.all(16.0),  // 标准间距
padding: const EdgeInsets.all(24.0),  // 大间距
```

### 3. 字体大小常量
```dart
// ❌ 不要创建这些
static const double fontSizeSmall = 12.0;
static const double fontSizeLarge = 18.0;

// ✅ 使用主题文本样式
style: Theme.of(context).textTheme.bodySmall,   // 小字体
style: Theme.of(context).textTheme.bodyLarge,   // 大字体
style: Theme.of(context).textTheme.headlineSmall, // 标题字体
```

### 4. 颜色常量
```dart
// ❌ 不要创建这些
static const Color primaryColor = Color(0xFF1976D2);

// ✅ 使用主题颜色
color: Theme.of(context).colorScheme.primary,
backgroundColor: Theme.of(context).colorScheme.surface,
```

## 📖 主题系统使用参考

### Material 3 文本样式层级

```dart
// Display styles (大显示文本)
Theme.of(context).textTheme.displayLarge    // 57sp
Theme.of(context).textTheme.displayMedium   // 45sp  
Theme.of(context).textTheme.displaySmall    // 36sp

// Headline styles (标题)
Theme.of(context).textTheme.headlineLarge   // 32sp
Theme.of(context).textTheme.headlineMedium  // 28sp
Theme.of(context).textTheme.headlineSmall   // 24sp

// Title styles (小标题)
Theme.of(context).textTheme.titleLarge      // 22sp
Theme.of(context).textTheme.titleMedium     // 16sp, Medium weight
Theme.of(context).textTheme.titleSmall      // 14sp, Medium weight

// Body styles (正文)
Theme.of(context).textTheme.bodyLarge       // 16sp
Theme.of(context).textTheme.bodyMedium      // 14sp (最常用)
Theme.of(context).textTheme.bodySmall       // 12sp

// Label styles (标签)
Theme.of(context).textTheme.labelLarge      // 14sp, Medium weight
Theme.of(context).textTheme.labelMedium     // 12sp, Medium weight
Theme.of(context).textTheme.labelSmall      // 11sp, Medium weight
```

### Material 3 颜色系统

```dart
// 主色调
Theme.of(context).colorScheme.primary           // 主色
Theme.of(context).colorScheme.onPrimary         // 主色上的文字
Theme.of(context).colorScheme.primaryContainer  // 主色容器
Theme.of(context).colorScheme.onPrimaryContainer // 主色容器上的文字

// 次要色调
Theme.of(context).colorScheme.secondary
Theme.of(context).colorScheme.onSecondary

// 表面颜色
Theme.of(context).colorScheme.surface           // 表面色
Theme.of(context).colorScheme.onSurface         // 表面上的文字
Theme.of(context).colorScheme.surfaceContainerHighest // 高层表面

// 错误颜色
Theme.of(context).colorScheme.error
Theme.of(context).colorScheme.onError
```

## ✅ 迁移检查清单

### 删除不必要的文件
- [ ] 删除所有UI常量定义文件
- [ ] 删除间距、字体、颜色等硬编码常量
- [ ] 删除主题映射辅助类

### 保留必要的配置
- [ ] 保留业务逻辑常量（文件大小、时间限制等）
- [ ] 保留应用配置常量（网络超时、缓存时间等）
- [ ] 保留消息映射配置

### 代码迁移
- [ ] 将所有硬编码间距改为直接数值或删除
- [ ] 将所有硬编码字体大小改为主题文本样式
- [ ] 将所有硬编码颜色改为主题颜色
- [ ] 将所有硬编码圆角改为主题形状

### 验证
- [ ] UI一致性检查
- [ ] 不同主题切换测试
- [ ] 响应式布局测试

---

**核心思想**：让Flutter主题系统做它该做的事，我们只管理真正的业务配置常量。