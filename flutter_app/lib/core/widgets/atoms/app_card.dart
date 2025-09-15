import 'package:flutter/material.dart';
import '../../theme/design_constants.dart';

/// 统一的应用卡片组件
/// 
/// 提供一致的卡片样式和交互行为
/// 
/// 示例用法:
/// ```dart
/// AppCard(
///   child: Text('卡片内容'),
///   onTap: () => print('卡片被点击'),
///   isSelected: false,
/// )
/// ```
class AppCard extends StatelessWidget {
  /// 卡片内容
  final Widget child;
  
  /// 是否处于选中状态
  final bool isSelected;
  
  /// 点击事件回调
  final VoidCallback? onTap;
  
  /// 长按事件回调
  final VoidCallback? onLongPress;
  
  /// 自定义内边距，为null时使用默认值
  final EdgeInsets? padding;
  
  /// 自定义外边距，为null时使用默认值
  final EdgeInsets? margin;
  
  /// 自定义阴影高度，为null时使用默认值
  final double? elevation;
  
  /// 自定义背景颜色，为null时使用主题颜色
  final Color? backgroundColor;
  
  /// 自定义边框，为null时根据选中状态自动设置
  final Border? border;
  
  /// 语义化标签，用于无障碍支持
  final String? semanticLabel;
  
  /// 语义化提示，用于无障碍支持
  final String? semanticHint;
  
  /// 是否启用涟漪效果
  final bool enableRipple;

  const AppCard({
    super.key,
    required this.child,
    this.isSelected = false,
    this.onTap,
    this.onLongPress,
    this.padding,
    this.margin,
    this.elevation,
    this.backgroundColor,
    this.border,
    this.semanticLabel,
    this.semanticHint,
    this.enableRipple = true,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final hasInteraction = onTap != null || onLongPress != null;
    
    return Semantics(
      label: semanticLabel,
      hint: semanticHint,
      button: hasInteraction,
      child: Container(
        margin: margin ?? DesignConstants.cardMargin,
        child: Material(
          color: backgroundColor ?? _getBackgroundColor(colorScheme),
          elevation: elevation ?? _getElevation(),
          shadowColor: _getShadowColor(colorScheme),
          borderRadius: BorderRadius.circular(DesignConstants.radiusMedium),
          child: Container(
            decoration: BoxDecoration(
              border: border ?? _getBorder(colorScheme),
              borderRadius: BorderRadius.circular(DesignConstants.radiusMedium),
            ),
            child: hasInteraction && enableRipple
                ? _buildInteractiveCard(context)
                : _buildStaticCard(),
          ),
        ),
      ),
    );
  }

  /// 构建可交互的卡片
  Widget _buildInteractiveCard(BuildContext context) {
    return InkWell(
      onTap: onTap,
      onLongPress: onLongPress,
      borderRadius: BorderRadius.circular(DesignConstants.radiusMedium),
      child: _buildCardContent(),
    );
  }

  /// 构建静态卡片
  Widget _buildStaticCard() {
    final hasInteraction = onTap != null || onLongPress != null;
    
    if (hasInteraction && !enableRipple) {
      // 有交互但禁用涟漪效果时使用GestureDetector
      return GestureDetector(
        onTap: onTap,
        onLongPress: onLongPress,
        child: _buildCardContent(),
      );
    }
    
    return _buildCardContent();
  }

  /// 构建卡片内容
  Widget _buildCardContent() {
    return AnimatedContainer(
      duration: DesignConstants.animationFast,
      padding: padding ?? DesignConstants.cardPadding,
      child: child,
    );
  }

  /// 获取背景颜色
  Color _getBackgroundColor(ColorScheme colorScheme) {
    if (isSelected) {
      return colorScheme.primaryContainer.withValues(alpha: 0.08);
    }
    return colorScheme.surface;
  }

  /// 获取阴影高度
  double _getElevation() {
    if (isSelected) {
      return 4.0;
    }
    return 1.0;
  }

  /// 获取阴影颜色
  Color _getShadowColor(ColorScheme colorScheme) {
    if (isSelected) {
      return colorScheme.primary.withValues(alpha: 0.2);
    }
    return colorScheme.shadow.withValues(alpha: 0.1);
  }

  /// 获取边框样式
  Border? _getBorder(ColorScheme colorScheme) {
    if (isSelected) {
      return Border.all(
        color: colorScheme.primary.withValues(alpha: 0.3),
        width: DesignConstants.borderWidthNormal,
      );
    }
    
    // 非选中状态下的轻微边框，增强卡片边界
    return Border.all(
      color: colorScheme.outline.withValues(alpha: 0.12),
      width: DesignConstants.borderWidthThin,
    );
  }
}

/// 紧凑版本的应用卡片
/// 
/// 使用更小的内边距，适用于列表项等密集排列的场景
class AppCardCompact extends AppCard {
  const AppCardCompact({
    super.key,
    required super.child,
    super.isSelected,
    super.onTap,
    super.onLongPress,
    super.margin,
    super.elevation,
    super.backgroundColor,
    super.border,
    super.semanticLabel,
    super.semanticHint,
    super.enableRipple,
  }) : super(
    padding: DesignConstants.cardPaddingCompact,
  );
}

/// 宽松版本的应用卡片
/// 
/// 使用更大的内边距，适用于重要内容展示
class AppCardLoose extends AppCard {
  const AppCardLoose({
    super.key,
    required super.child,
    super.isSelected,
    super.onTap,
    super.onLongPress,
    super.margin,
    super.elevation,
    super.backgroundColor,
    super.border,
    super.semanticLabel,
    super.semanticHint,
    super.enableRipple,
  }) : super(
    padding: DesignConstants.cardPaddingLoose,
  );
}

/// 简单的分割线卡片
/// 
/// 在卡片底部添加分割线，适用于列表场景
class AppCardWithDivider extends StatelessWidget {
  final Widget child;
  final bool isSelected;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final bool showDivider;
  final EdgeInsets? padding;
  final EdgeInsets? margin;
  final String? semanticLabel;
  final String? semanticHint;

  const AppCardWithDivider({
    super.key,
    required this.child,
    this.isSelected = false,
    this.onTap,
    this.onLongPress,
    this.showDivider = true,
    this.padding,
    this.margin,
    this.semanticLabel,
    this.semanticHint,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Column(
      children: [
        AppCard(
          isSelected: isSelected,
          onTap: onTap,
          onLongPress: onLongPress,
          padding: padding,
          margin: margin,
          elevation: 0, // 移除阴影，依靠分割线分隔
          semanticLabel: semanticLabel,
          semanticHint: semanticHint,
          child: child,
        ),
        if (showDivider)
          Container(
            height: DesignConstants.borderWidthThin,
            margin: EdgeInsets.symmetric(
              horizontal: (margin ?? DesignConstants.cardMargin).horizontal / 2,
            ),
            color: colorScheme.outline.withValues(alpha: 0.12),
          ),
      ],
    );
  }
}