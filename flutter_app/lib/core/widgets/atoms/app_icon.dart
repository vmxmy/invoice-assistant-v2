import 'package:flutter/material.dart';

/// 图标尺寸枚举
enum IconSize {
  extraSmall,
  small,
  medium,
  large,
  extraLarge,
}

/// 图标变体枚举
enum IconVariant {
  filled,    // 实心图标
  outlined,  // 轮廓图标
  rounded,   // 圆角图标
  sharp,     // 尖角图标
}

/// 统一的应用图标组件
/// 
/// 提供一致的图标样式和尺寸标准
/// 
/// 示例用法:
/// ```dart
/// AppIcon(
///   icon: CupertinoIcons.heart,
///   size: IconSize.medium,
///   color: colorScheme.primary,
/// )
/// ```
class AppIcon extends StatelessWidget {
  /// 图标数据
  final IconData icon;
  
  /// 图标尺寸
  final IconSize size;
  
  /// 自定义图标颜色，为null时使用主题默认颜色
  final Color? color;
  
  /// 语义化标签，用于无障碍支持
  final String? semanticLabel;
  
  /// 自定义图标大小，覆盖size参数
  final double? customSize;
  
  /// 图标变体（预留扩展）
  final IconVariant variant;
  
  /// 是否应用阴影效果
  final bool applyShadow;
  
  /// 阴影颜色
  final Color? shadowColor;

  const AppIcon({
    super.key,
    required this.icon,
    this.size = IconSize.medium,
    this.color,
    this.semanticLabel,
    this.customSize,
    this.variant = IconVariant.filled,
    this.applyShadow = false,
    this.shadowColor,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveSize = customSize ?? _getIconSize();
    final effectiveColor = color ?? colorScheme.onSurface;
    
    Widget iconWidget = Icon(
      icon,
      size: effectiveSize,
      color: effectiveColor,
      semanticLabel: semanticLabel,
    );
    
    if (applyShadow) {
      iconWidget = Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: (shadowColor ?? effectiveColor).withValues(alpha: 0.3),
              offset: const Offset(0, 2),
              blurRadius: 4,
            ),
          ],
        ),
        child: iconWidget,
      );
    }
    
    return iconWidget;
  }

  /// 根据尺寸枚举获取图标大小
  double _getIconSize() {
    switch (size) {
      case IconSize.extraSmall:
        return 12.0;
      case IconSize.small:
        return 16.0;
      case IconSize.medium:
        return 20.0;
      case IconSize.large:
        return 24.0;
      case IconSize.extraLarge:
        return 32.0;
    }
  }
}

/// 带背景的图标组件
/// 
/// 为图标添加圆形或方形背景
class AppIconWithBackground extends StatelessWidget {
  /// 图标数据
  final IconData icon;
  
  /// 图标尺寸
  final IconSize iconSize;
  
  /// 背景形状
  final BackgroundShape backgroundShape;
  
  /// 背景颜色，为null时使用主题颜色
  final Color? backgroundColor;
  
  /// 图标颜色，为null时使用主题颜色
  final Color? iconColor;
  
  /// 自定义背景大小
  final double? backgroundSize;
  
  /// 语义化标签
  final String? semanticLabel;
  
  /// 点击事件回调
  final VoidCallback? onTap;

  const AppIconWithBackground({
    super.key,
    required this.icon,
    this.iconSize = IconSize.medium,
    this.backgroundShape = BackgroundShape.circle,
    this.backgroundColor,
    this.iconColor,
    this.backgroundSize,
    this.semanticLabel,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveBackgroundSize = backgroundSize ?? _getBackgroundSize();
    final effectiveBackgroundColor = backgroundColor ?? colorScheme.primaryContainer;
    final effectiveIconColor = iconColor ?? colorScheme.onPrimaryContainer;
    
    Widget container = Container(
      width: effectiveBackgroundSize,
      height: effectiveBackgroundSize,
      decoration: BoxDecoration(
        color: effectiveBackgroundColor,
        shape: backgroundShape == BackgroundShape.circle 
            ? BoxShape.circle 
            : BoxShape.rectangle,
        borderRadius: backgroundShape == BackgroundShape.roundedSquare
            ? BorderRadius.circular(8.0)
            : null,
      ),
      child: Center(
        child: AppIcon(
          icon: icon,
          size: iconSize,
          color: effectiveIconColor,
          semanticLabel: semanticLabel,
        ),
      ),
    );
    
    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: backgroundShape == BackgroundShape.circle
              ? BorderRadius.circular(effectiveBackgroundSize / 2)
              : BorderRadius.circular(8.0),
          child: container,
        ),
      );
    }
    
    return container;
  }

  /// 根据图标尺寸计算背景尺寸
  double _getBackgroundSize() {
    switch (iconSize) {
      case IconSize.extraSmall:
        return 24.0;
      case IconSize.small:
        return 32.0;
      case IconSize.medium:
        return 40.0;
      case IconSize.large:
        return 48.0;
      case IconSize.extraLarge:
        return 56.0;
    }
  }
}

/// 徽章图标组件
/// 
/// 在图标右上角显示红点或数字徽章
class AppIconWithBadge extends StatelessWidget {
  /// 图标数据
  final IconData icon;
  
  /// 图标尺寸
  final IconSize iconSize;
  
  /// 图标颜色
  final Color? iconColor;
  
  /// 是否显示徽章
  final bool showBadge;
  
  /// 徽章文本，为null时显示红点
  final String? badgeText;
  
  /// 徽章背景颜色
  final Color? badgeColor;
  
  /// 徽章文本颜色
  final Color? badgeTextColor;
  
  /// 语义化标签
  final String? semanticLabel;

  const AppIconWithBadge({
    super.key,
    required this.icon,
    this.iconSize = IconSize.medium,
    this.iconColor,
    this.showBadge = false,
    this.badgeText,
    this.badgeColor,
    this.badgeTextColor,
    this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Stack(
      clipBehavior: Clip.none,
      children: [
        AppIcon(
          icon: icon,
          size: iconSize,
          color: iconColor,
          semanticLabel: semanticLabel,
        ),
        if (showBadge)
          Positioned(
            right: -6,
            top: -6,
            child: Container(
              padding: badgeText != null
                  ? const EdgeInsets.symmetric(horizontal: 6, vertical: 2)
                  : null,
              decoration: BoxDecoration(
                color: badgeColor ?? colorScheme.error,
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.2),
                    offset: const Offset(0, 1),
                    blurRadius: 2,
                  ),
                ],
              ),
              constraints: const BoxConstraints(
                minWidth: 12,
                minHeight: 12,
              ),
              child: badgeText != null
                  ? Center(
                      child: Text(
                        badgeText!,
                        style: TextStyle(
                          color: badgeTextColor ?? colorScheme.onError,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    )
                  : null,
            ),
          ),
      ],
    );
  }
}

/// 动画图标组件
/// 
/// 支持旋转、缩放等动画效果
class AppAnimatedIcon extends StatefulWidget {
  /// 图标数据
  final IconData icon;
  
  /// 图标尺寸
  final IconSize iconSize;
  
  /// 图标颜色
  final Color? iconColor;
  
  /// 动画类型
  final AnimationType animationType;
  
  /// 动画时长
  final Duration duration;
  
  /// 是否自动开始动画
  final bool autoStart;
  
  /// 语义化标签
  final String? semanticLabel;

  const AppAnimatedIcon({
    super.key,
    required this.icon,
    this.iconSize = IconSize.medium,
    this.iconColor,
    this.animationType = AnimationType.rotation,
    this.duration = const Duration(seconds: 1),
    this.autoStart = true,
    this.semanticLabel,
  });

  @override
  State<AppAnimatedIcon> createState() => _AppAnimatedIconState();
}

class _AppAnimatedIconState extends State<AppAnimatedIcon>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: widget.duration,
      vsync: this,
    );
    
    switch (widget.animationType) {
      case AnimationType.rotation:
        _animation = Tween<double>(begin: 0.0, end: 1.0).animate(_controller);
        break;
      case AnimationType.scale:
        _animation = Tween<double>(begin: 0.8, end: 1.2).animate(
          CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
        );
        break;
      case AnimationType.fade:
        _animation = Tween<double>(begin: 0.3, end: 1.0).animate(_controller);
        break;
    }
    
    if (widget.autoStart) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        switch (widget.animationType) {
          case AnimationType.rotation:
            return Transform.rotate(
              angle: _animation.value * 2 * 3.14159,
              child: child,
            );
          case AnimationType.scale:
            return Transform.scale(
              scale: _animation.value,
              child: child,
            );
          case AnimationType.fade:
            return Opacity(
              opacity: _animation.value,
              child: child,
            );
        }
      },
      child: AppIcon(
        icon: widget.icon,
        size: widget.iconSize,
        color: widget.iconColor,
        semanticLabel: widget.semanticLabel,
      ),
    );
  }
}

/// 背景形状枚举
enum BackgroundShape {
  circle,        // 圆形
  square,        // 正方形
  roundedSquare, // 圆角正方形
}

/// 动画类型枚举
enum AnimationType {
  rotation, // 旋转
  scale,    // 缩放
  fade,     // 淡入淡出
}