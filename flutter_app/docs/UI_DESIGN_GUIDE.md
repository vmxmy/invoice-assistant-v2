# 发票助手 UI 设计规范与最佳实践指南

## 概述

本文档定义了发票助手应用的UI设计规范、组件标准和最佳实践，确保整个应用的视觉一致性、用户体验和无障碍性。

## 设计原则

### 1. 一致性原则
- 统一的视觉语言和交互模式
- 组件复用和模块化设计
- 颜色、字体、间距的标准化

### 2. 简洁性原则  
- 扁平化设计，去除不必要的装饰
- 信息层级清晰，重点突出
- 减少用户认知负担

### 3. 无障碍性原则
- 符合WCAG 2.1 AA级标准
- 良好的颜色对比度
- 完善的语义标签和屏幕阅读器支持

## 主题系统

### FlexColorScheme 主题管理

应用采用 FlexColorScheme 作为主题管理系统，提供浅色和深色两套主题：

```dart
// 浅色主题
final lightTheme = FlexThemeData.light(
  scheme: FlexScheme.blue,
  surfaceMode: FlexSurfaceMode.highScaffoldLowSurface,
  blendLevel: 20,
);

// 深色主题  
final darkTheme = FlexThemeData.dark(
  scheme: FlexScheme.blue,
  surfaceMode: FlexSurfaceMode.highScaffoldLowSurface,
  blendLevel: 15,
);
```

### 颜色规范

#### 主色调
- **Primary**: 应用主色，用于主要操作按钮、活动状态
- **Secondary**: 辅助色，用于次要操作和强调
- **Tertiary**: 第三色，用于特殊状态和装饰

#### 语义颜色
- **Error**: 错误状态，删除操作
- **Warning**: 警告状态  
- **Success**: 成功状态，已完成操作
- **Info**: 信息状态

#### 中性颜色
- **Surface**: 卡片背景
- **Background**: 页面背景
- **Outline**: 边框颜色
- **Shadow**: 阴影颜色

### 颜色对比度标准

所有颜色组合必须符合WCAG 2.1 AA级标准：

- **普通文本**: 对比度≥4.5:1
- **大文本**(≥18pt或≥14pt加粗): 对比度≥3:1
- **AAA级增强标准**: 对比度≥7:1

使用 `AccessibilityConstants.calculateContrastRatio()` 验证对比度。

## 字体系统

### 字体层级

基于Material Design 3字体规范：

```dart
// 标题类
headlineLarge: 32sp, weight: 400
headlineMedium: 28sp, weight: 400  
headlineSmall: 24sp, weight: 400

// 标题类
titleLarge: 22sp, weight: 500
titleMedium: 16sp, weight: 500
titleSmall: 14sp, weight: 500

// 正文类
bodyLarge: 16sp, weight: 400
bodyMedium: 14sp, weight: 400
bodySmall: 12sp, weight: 400

// 标签类
labelLarge: 14sp, weight: 500
labelMedium: 12sp, weight: 500
labelSmall: 11sp, weight: 500
```

### 字体使用规范

- **卡片标题**: titleMedium (16sp, weight: 600)
- **卡片次要信息**: bodySmall (12sp)
- **按钮文字**: labelLarge (14sp, weight: 500)
- **状态徽章**: labelSmall (11sp, weight: 500)

## 布局系统

### 间距标准

使用8pt网格系统：

```dart
static const double spacing4 = 4.0;   // 内容间微小间距
static const double spacing8 = 8.0;   // 元素间基础间距
static const double spacing12 = 12.0; // 组件间标准间距
static const double spacing16 = 16.0; // 区块间大间距
static const double spacing24 = 24.0; // 页面间距
static const double spacing32 = 32.0; // 大块间距
```

### 圆角规范

```dart
static const double radiusSmall = 8.0;   // 小圆角：按钮、输入框
static const double radiusMedium = 12.0; // 中圆角：卡片
static const double radiusLarge = 16.0;  // 大圆角：底部Sheet
```

### 卡片规范

#### 标准卡片样式

```dart
Container(
  margin: EdgeInsets.only(bottom: 12),
  decoration: BoxDecoration(
    color: colorScheme.surface,
    borderRadius: BorderRadius.circular(12),
    border: Border.all(
      color: colorScheme.outline.withValues(alpha: 0.12),
      width: 1,
    ),
    boxShadow: [
      BoxShadow(
        color: colorScheme.shadow.withValues(alpha: 0.08),
        blurRadius: 8,
        offset: Offset(0, 2),
      ),
    ],
  ),
  child: Padding(
    padding: EdgeInsets.all(16),
    child: content,
  ),
)
```

#### 选中状态卡片

- 边框：`colorScheme.primary`，宽度2px
- 阴影：增强至12px模糊，透明度0.12

## 组件规范

### 1. 统一卡片组件 (UniformCardStyles)

提供一致的卡片视觉风格：

#### 构建方法
- `buildCard()`: 标准卡片容器
- `buildSimpleHeaderRow()`: 简化头部信息行
- `buildAmountRow()`: 金额显示行  
- `buildBottomRow()`: 底部信息行
- `buildStatusBadge()`: 状态徽章
- `buildActionButton()`: 操作按钮

#### 使用示例

```dart
UniformCardStyles.buildCard(
  context: context,
  isSelected: isSelected,
  onTap: onTap,
  child: Column(
    children: [
      UniformCardStyles.buildSimpleHeaderRow(
        context: context,
        title: '发票名称',
        subtitle: '次要信息',
        trailing: statusBadge,
      ),
      UniformCardStyles.buildAmountRow(
        context: context,
        label: '金额',
        amount: '¥999.00',
      ),
    ],
  ),
)
```

### 2. 统一底部弹出框 (UnifiedBottomSheet)

提供一致的模态交互：

#### 三种类型
1. **确认对话框**: `showConfirmDialog()`
2. **操作选择**: `showActionSheet()`  
3. **自定义内容**: `showCustomSheet()`

#### 设计特点
- 圆角16px的卡片样式
- 顶部拖拽指示器
- 半透明遮罩，提升场景感知
- 支持下拉手势关闭

### 3. 可交互状态徽章

#### 视觉设计
```dart
Container(
  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
  decoration: BoxDecoration(
    color: statusColor.withValues(alpha: 0.15),
    borderRadius: BorderRadius.circular(12),
    border: Border.all(
      color: statusColor.withValues(alpha: 0.3),
      width: 1,
    ),
  ),
  child: Row(
    children: [
      Icon(statusIcon, size: 14, color: statusColor),
      SizedBox(width: 6),
      Text(statusText, style: statusTextStyle),
    ],
  ),
)
```

#### 状态配置
- **草稿**: 灰色，铅笔图标
- **已提交**: 蓝色，纸飞机图标
- **已报销**: 绿色，对勾图标

### 4. 滑动操作组件

使用 `flutter_slidable` 实现左右滑动操作：

#### 配置参数
- **motion**: `StretchMotion()` 拉伸动画
- **extentRatio**: 0.25 固定宽度比例
- **elevation**: 2 阴影层级

#### 视觉对齐
- 操作按钮与卡片严格对齐
- 相同的圆角半径(12px)
- 匹配的内边距(16px)

## 微交互动画

### 1. 触摸反馈动画

#### BounceButton 组件
```dart
BounceButton(
  onPressed: onTap,
  scale: 0.95,          // 缩放比例
  duration: Duration(milliseconds: 100),
  hapticFeedback: true, // 触觉反馈
  child: widget,
)
```

#### 适用场景
- 卡片点击
- 按钮点击  
- 状态徽章交互

### 2. 页面转场动画

#### 转场类型
- **fadeTransition**: 渐变转场
- **slideTransition**: 滑动转场
- **slideAndFadeTransition**: 组合转场
- **materialTransition**: Material风格
- **cupertinoTransition**: iOS风格

#### 推荐配置
```dart
PageTransitions.slideAndFadeTransition(
  page: targetPage,
  duration: Duration(milliseconds: 350),
  curve: Curves.easeInOut,
)
```

### 3. 触觉反馈

#### 反馈类型
- **lightImpact**: 轻触反馈，一般点击
- **mediumImpact**: 中等反馈，重要操作  
- **heavyImpact**: 重反馈，警告操作
- **selectionClick**: 选择反馈，多选操作

## 无障碍性规范

### 1. 语义标签

#### 必需标签
所有可交互组件必须包含语义标签：

```dart
Semantics(
  label: '发票: 商家名称',
  hint: AccessibilityConstants.cardActionHint,
  child: widget,
)
```

#### 标准标签常量
```dart
// 卡片操作
cardActionHint = '双击打开详情，长按进入多选模式';

// 按钮操作
deleteButtonLabel = '删除';
deleteButtonHint = '删除此项目';

// 状态信息
statusBadgeLabel = '状态';
statusBadgeHint = '点击修改状态';
```

### 2. 触摸目标尺寸

- **最小尺寸**: 44×44pt
- **推荐尺寸**: 48×48pt
- **按钮内边距**: 至少8pt

### 3. 颜色对比度验证

使用 `AccessibilityValidator` 进行自动化验证：

```dart
final report = AccessibilityValidator.validateThemeContrast(context);
print(report.summary); // 输出对比度报告
```

## 开发最佳实践

### 1. 组件复用

#### 优先使用统一组件
```dart
// ✅ 正确：使用统一卡片组件
UniformCardStyles.buildCard(...)

// ❌ 错误：自定义卡片样式  
Container(decoration: BoxDecoration(...))
```

#### 遵循DRY原则
- 复用 `UniformCardStyles` 的构建方法
- 使用 `AccessibilityConstants` 的标准标签
- 采用 `UnifiedBottomSheet` 的模态交互

### 2. 主题一致性

#### 使用主题颜色
```dart
// ✅ 正确：使用主题颜色
color: Theme.of(context).colorScheme.primary

// ❌ 错误：硬编码颜色
color: Colors.blue
```

#### 响应主题变化
- 所有组件必须支持浅色/深色主题
- 使用 `colorScheme` 而非固定颜色
- 测试主题切换的视觉效果

### 3. 性能优化

#### 动画性能
- 使用 `SingleTickerProviderStateMixin`
- 及时 `dispose()` 动画控制器
- 避免过度复杂的动画效果

#### 内存管理
- 使用 `const` 构造函数
- 合理使用 `ValueKey` 和 `ObjectKey`
- 避免不必要的 `setState()` 调用

### 4. 代码组织

#### 文件结构
```
lib/
├── core/
│   ├── constants/
│   │   └── accessibility_constants.dart
│   ├── animations/
│   │   ├── page_transitions.dart
│   │   └── micro_interactions.dart
│   └── utils/
│       └── accessibility_validator.dart
├── presentation/
│   └── widgets/
│       ├── uniform_card_styles.dart
│       ├── unified_bottom_sheet.dart
│       └── ...
```

#### 命名规范
- 组件名称：`PascalCase`
- 方法名称：`camelCase`  
- 常量名称：`SCREAMING_SNAKE_CASE`
- 私有方法：`_camelCase`

## 测试策略

### 1. 主题一致性测试

创建自动化测试验证主题规范：

```dart
testWidgets('主题颜色对比度测试', (WidgetTester tester) async {
  await tester.pumpWidget(MaterialApp(theme: AppTheme.lightTheme));
  
  final report = AccessibilityValidator.validateThemeContrast(context);
  expect(report.passRate, greaterThanOrEqualTo(0.8));
});
```

### 2. 无障碍性测试

- 语义标签完整性测试
- 触摸目标尺寸测试
- 颜色对比度自动验证
- 屏幕阅读器兼容性测试

### 3. 视觉回归测试

- 组件视觉效果截图对比
- 不同主题下的渲染效果
- 多设备尺寸适配测试

## 设计交付规范

### 1. 组件设计

新组件设计必须包含：
- 浅色/深色主题版本
- 各种状态(默认、悬停、点击、禁用)
- 无障碍性标注
- 尺寸规范标注

### 2. 颜色规范

- 提供16进制颜色值
- 标注对比度比率
- 说明使用场景
- 验证无障碍合规性

### 3. 动效规范  

- 描述动画类型和时长
- 提供缓动函数参数
- 说明触发条件
- 考虑性能影响

## 常见问题解答

### Q: 如何确保新组件符合设计规范？
A: 参考 `UniformCardStyles` 的实现模式，使用主题颜色，添加无障碍标签，编写对比度测试。

### Q: 什么时候需要创建新的动画效果？  
A: 优先使用现有的 `BounceButton` 和页面转场动画。只有在现有动画无法满足需求时才创建新动画。

### Q: 如何处理颜色对比度不足？
A: 使用 `AccessibilityConstants.calculateContrastRatio()` 测试，调整颜色深浅直到达标，或使用替代的视觉方案。

### Q: 多语言环境下的字体处理？
A: 使用系统字体栈，测试不同语言的渲染效果，确保字体大小在各语言下都保持合适的可读性。

---

*本文档版本: v1.0*  
*最后更新: 2024-12-09*  
*维护团队: UI/UX 设计组*