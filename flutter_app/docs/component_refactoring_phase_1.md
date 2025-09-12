# 组件化拆分实施文档 - 第一阶段：基础重构

## 📋 阶段概览

**时间预估**: 1-2周  
**目标**: 创建基础组件库，重构核心业务组件  
**优先级**: 高  

## 🎯 核心目标

1. **建立原子组件库**: 创建统一的基础UI组件
2. **重构InvoiceCardWidget**: 拆分为可复用子组件  
3. **统一主题系统**: 确保所有组件使用FlexColorScheme
4. **优化文件结构**: 按功能和复用性重新组织组件

## 📁 新建目录结构

```
lib/core/widgets/
├── atoms/              # 原子组件 (最小不可分割)
│   ├── app_button.dart
│   ├── app_card.dart
│   ├── app_text.dart
│   ├── app_icon.dart
│   └── app_divider.dart
├── molecules/          # 分子组件 (原子组合)
│   ├── status_badge.dart
│   ├── action_sheet.dart
│   ├── confirm_dialog.dart
│   └── loading_overlay.dart
└── organisms/          # 生物体组件 (复杂业务组件)
    ├── invoice_card/
    │   ├── invoice_card_widget.dart
    │   ├── invoice_card_header.dart
    │   ├── invoice_card_body.dart
    │   ├── invoice_card_actions.dart
    │   ├── invoice_card_selection.dart
    │   └── invoice_card_slidable.dart
    └── pdf_viewer/
        ├── pdf_viewer_container.dart
        ├── pdf_zoom_controls.dart
        ├── pdf_navigation_bar.dart
        └── pdf_error_boundary.dart
```

## 🔧 详细任务清单

### 1. 创建原子组件库 (3-4天)

#### 1.1 AppButton 组件
```dart
// lib/core/widgets/atoms/app_button.dart
class AppButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final ButtonVariant variant;
  final ButtonSize size;
  final IconData? icon;
  final bool loading;
  
  // 支持 primary, secondary, outline, ghost 等变体
  // 支持 small, medium, large 等尺寸
}
```

**实现要点:**
- 使用FlexColorScheme的colorScheme
- 支持loading状态
- 统一圆角、间距、字体
- 无障碍支持

#### 1.2 AppCard 组件
```dart
// lib/core/widgets/atoms/app_card.dart
class AppCard extends StatelessWidget {
  final Widget child;
  final bool isSelected;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final EdgeInsets? padding;
  final double? elevation;
}
```

**实现要点:**
- 统一卡片样式和阴影
- 支持选中状态视觉反馈
- 响应式padding
- 主题色彩适配

#### 1.3 AppText 组件
```dart
// lib/core/widgets/atoms/app_text.dart
class AppText extends StatelessWidget {
  final String text;
  final TextVariant variant;
  final TextAlign? textAlign;
  final int? maxLines;
  final Color? color;
}

enum TextVariant {
  displayLarge, displayMedium, displaySmall,
  headlineLarge, headlineMedium, headlineSmall,
  titleLarge, titleMedium, titleSmall,
  bodyLarge, bodyMedium, bodySmall,
  labelLarge, labelMedium, labelSmall
}
```

**实现要点:**
- 映射到Theme.of(context).textTheme
- 支持主题色彩
- 统一行高和字间距
- 支持文本溢出处理

#### 1.4 AppIcon 组件
```dart
// lib/core/widgets/atoms/app_icon.dart
class AppIcon extends StatelessWidget {
  final IconData icon;
  final IconSize size;
  final Color? color;
  final String? semanticLabel;
}

enum IconSize { small, medium, large, extraLarge }
```

### 2. 创建分子组件 (2-3天)

#### 2.1 StatusBadge 组件
```dart
// lib/core/widgets/molecules/status_badge.dart
class StatusBadge extends StatelessWidget {
  final String text;
  final StatusType type;
  final BadgeSize size;
  final bool interactive;
  final VoidCallback? onTap;
}
```

**特点:**
- 从现有InvoiceStatusBadge重构而来
- 支持多种状态类型 (success, warning, error, info)
- 统一颜色和尺寸系统

#### 2.2 ActionSheet 组件
```dart
// lib/core/widgets/molecules/action_sheet.dart
class ActionSheet extends StatelessWidget {
  final String title;
  final String? message;
  final List<ActionSheetAction> actions;
  final ActionSheetAction? cancelAction;
}
```

**特点:**
- 跨平台兼容 (Material + Cupertino)
- 统一的操作表样式
- 支持图标和颜色定制

### 3. 重构InvoiceCardWidget (4-5天)

#### 3.1 拆分策略
将741行的InvoiceCardWidget拆分为5个独立组件:

**InvoiceCardWidget (主容器, ~100行)**
```dart
class InvoiceCardWidget extends StatefulWidget {
  // 保留主要的状态管理和事件处理
  // 负责协调子组件交互
  @override
  Widget build(BuildContext context) {
    return Slidable(
      // 滑动操作委托给InvoiceCardSlidable
      child: AppCard(
        // 使用新的AppCard组件
        child: Column(
          children: [
            InvoiceCardHeader(...),
            InvoiceCardBody(...),
            InvoiceCardActions(...),
          ],
        ),
      ),
    );
  }
}
```

**InvoiceCardHeader (~50行)**
```dart
class InvoiceCardHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final bool showSelection;
  final bool isSelected;
  final VoidCallback? onSelectionToggle;
}
```

**InvoiceCardBody (~80行)**
```dart
class InvoiceCardBody extends StatelessWidget {
  final InvoiceEntity invoice;
  final bool showConsumptionDateOnly;
  
  // 负责显示消费日期、类型图标、金额等核心信息
}
```

**InvoiceCardActions (~60行)**
```dart
class InvoiceCardActions extends StatelessWidget {
  final List<ActionItem> actions;
  final String relativeTime;
  
  // 负责底部操作按钮和时间显示
}
```

**InvoiceCardSelection (~30行)**
```dart
class InvoiceCardSelection extends StatelessWidget {
  final bool isSelected;
  final VoidCallback? onToggle;
  
  // 负责多选模式的选择框UI
}
```

**InvoiceCardSlidable (~40行)**
```dart
class InvoiceCardSlidable extends StatelessWidget {
  final Widget child;
  final List<SlideAction> startActions;
  final List<SlideAction> endActions;
  final bool enabled;
  
  // 负责滑动操作的封装
}
```

#### 3.2 重构收益
- **可维护性**: 单个组件责任单一，易于修改
- **可测试性**: 小组件易于编写单元测试
- **可复用性**: Header、Body等可在其他地方复用
- **性能**: 精确的重建控制，减少不必要的渲染

### 4. 统一主题系统 (1-2天)

#### 4.1 创建主题常量文件
```dart
// lib/core/theme/component_theme_constants.dart
class ComponentThemeConstants {
  // 统一圆角
  static const double radiusSmall = 8.0;
  static const double radiusMedium = 12.0;
  static const double radiusLarge = 16.0;
  
  // 统一间距
  static const double spacingXS = 4.0;
  static const double spacingS = 8.0;
  static const double spacingM = 12.0;
  static const double spacingL = 16.0;
  static const double spacingXL = 24.0;
  
  // 统一阴影
  static List<BoxShadow> shadowLight(ColorScheme colorScheme) => [...];
  static List<BoxShadow> shadowMedium(ColorScheme colorScheme) => [...];
  
  // 统一动画时长
  static const Duration animationFast = Duration(milliseconds: 200);
  static const Duration animationNormal = Duration(milliseconds: 300);
}
```

#### 4.2 更新现有组件
- 移除硬编码的颜色、尺寸
- 统一使用ComponentThemeConstants
- 确保所有主题色彩来自colorScheme

## 🧪 测试策略

### 1. 组件单元测试
为每个新建的原子组件编写单元测试:

```dart
// test/core/widgets/atoms/app_button_test.dart
void main() {
  testWidgets('AppButton renders correctly', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AppButton(
          text: 'Test Button',
          onPressed: () {},
          variant: ButtonVariant.primary,
        ),
      ),
    );
    
    expect(find.text('Test Button'), findsOneWidget);
    expect(find.byType(ElevatedButton), findsOneWidget);
  });
}
```

### 2. 集成测试
确保拆分后的InvoiceCardWidget功能完整:

```dart
// test/presentation/widgets/invoice_card_integration_test.dart
void main() {
  testWidgets('InvoiceCardWidget integration test', (tester) async {
    // 测试点击、滑动、多选等功能
  });
}
```

### 3. 视觉回归测试
使用golden文件确保UI无变化:

```dart
// test/presentation/widgets/invoice_card_golden_test.dart
void main() {
  testWidgets('InvoiceCardWidget visual regression test', (tester) async {
    // 生成golden文件对比
    await expectLater(
      find.byType(InvoiceCardWidget),
      matchesGoldenFile('invoice_card_widget.png'),
    );
  });
}
```

## 📊 进度跟踪

### 第1周任务分配
- **周一-周二**: 创建原子组件库 (AppButton, AppCard)
- **周三**: 创建原子组件库 (AppText, AppIcon, AppDivider)
- **周四**: 创建分子组件 (StatusBadge, ActionSheet)
- **周五**: 开始InvoiceCardWidget拆分设计

### 第2周任务分配  
- **周一-周二**: 实现InvoiceCardWidget拆分
- **周三**: 统一主题系统，更新现有组件
- **周四**: 编写单元测试和集成测试
- **周五**: 代码审查，文档完善

## 🎉 完成标准

- [ ] 5个原子组件创建完成并测试通过
- [ ] 3个分子组件创建完成并测试通过  
- [ ] InvoiceCardWidget成功拆分为5个子组件
- [ ] 所有组件使用统一主题系统
- [ ] 单元测试覆盖率达到80%以上
- [ ] 视觉回归测试通过
- [ ] 代码审查通过
- [ ] 文档更新完成

## 🚀 下阶段预告

第一阶段完成后，将进入第二阶段：深度优化
- InvoicePDFViewer组件重构
- Context依赖注入实现
- 状态管理架构优化
- 性能监控和基准测试