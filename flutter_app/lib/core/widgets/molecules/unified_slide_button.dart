import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

/// 统一的滑动按钮样式组件
/// 
/// 基于UI审计结果，统一发票卡片和报销集卡片的滑动按钮样式
/// 遵循UIOS Human Interface Guidelines和项目的Cupertino主题系统
class UnifiedSlideButton extends StatelessWidget {
  /// 图标
  final IconData icon;
  
  /// 按钮文本标签
  final String label;
  
  /// 按钮背景色
  final Color backgroundColor;
  
  /// 前景色（图标和文字颜色）
  final Color foregroundColor;
  
  /// 点击回调
  final VoidCallback onTap;
  
  /// 语义化标签（无障碍支持）
  final String? semanticLabel;
  
  /// 语义化提示（无障碍支持）
  final String? semanticHint;
  
  /// 按钮类型，影响视觉样式
  final SlideButtonType type;
  
  /// 按钮位置，影响圆角设置
  final SlideButtonPosition position;
  
  /// 是否启用阴影效果
  final bool enableElevation;
  
  /// 自定义圆角设置
  final BorderRadius? borderRadius;

  const UnifiedSlideButton({
    super.key,
    required this.icon,
    required this.label,
    required this.backgroundColor,
    required this.foregroundColor,
    required this.onTap,
    this.semanticLabel,
    this.semanticHint,
    this.type = SlideButtonType.primary,
    this.position = SlideButtonPosition.middle,
    this.enableElevation = true,
    this.borderRadius,
  });

  /// 创建导出按钮的便捷构造函数
  factory UnifiedSlideButton.export({
    required VoidCallback onTap,
    required ColorScheme colorScheme,
    SlideButtonPosition position = SlideButtonPosition.left,
  }) {
    return UnifiedSlideButton(
      icon: CupertinoIcons.cloud_download,
      label: '导出',
      backgroundColor: colorScheme.primary,
      foregroundColor: colorScheme.onPrimary,
      onTap: onTap,
      semanticLabel: '导出',
      semanticHint: '导出文件',
      type: SlideButtonType.primary,
      position: position,
    );
  }

  /// 创建删除按钮的便捷构造函数
  factory UnifiedSlideButton.delete({
    required VoidCallback onTap,
    required ColorScheme colorScheme,
    SlideButtonPosition position = SlideButtonPosition.right,
  }) {
    return UnifiedSlideButton(
      icon: CupertinoIcons.delete,
      label: '删除',
      backgroundColor: colorScheme.error,
      foregroundColor: colorScheme.onError,
      onTap: onTap,
      semanticLabel: '删除',
      semanticHint: '删除此项',
      type: SlideButtonType.destructive,
      position: position,
    );
  }

  /// 创建分享按钮的便捷构造函数
  factory UnifiedSlideButton.share({
    required VoidCallback onTap,
    required ColorScheme colorScheme,
    SlideButtonPosition position = SlideButtonPosition.left,
  }) {
    return UnifiedSlideButton(
      icon: CupertinoIcons.share,
      label: '分享',
      backgroundColor: colorScheme.primary,
      foregroundColor: colorScheme.onPrimary,
      onTap: onTap,
      semanticLabel: '分享',
      semanticHint: '分享此项',
      type: SlideButtonType.primary,
      position: position,
    );
  }

  /// 创建加入报销集按钮的便捷构造函数
  factory UnifiedSlideButton.addToSet({
    required VoidCallback onTap,
    required ColorScheme colorScheme,
    SlideButtonPosition position = SlideButtonPosition.right,
  }) {
    return UnifiedSlideButton(
      icon: CupertinoIcons.folder_badge_plus,
      label: '加入',
      backgroundColor: colorScheme.secondary,
      foregroundColor: colorScheme.onSecondary,
      onTap: onTap,
      semanticLabel: '加入报销集',
      semanticHint: '将发票加入报销集',
      type: SlideButtonType.secondary,
      position: position,
    );
  }

  /// 创建移出报销集按钮的便捷构造函数
  factory UnifiedSlideButton.removeFromSet({
    required VoidCallback onTap,
    required ColorScheme colorScheme,
    SlideButtonPosition position = SlideButtonPosition.right,
  }) {
    return UnifiedSlideButton(
      icon: CupertinoIcons.folder_badge_minus,
      label: '移出',
      backgroundColor: colorScheme.tertiary,
      foregroundColor: colorScheme.onTertiary,
      onTap: onTap,
      semanticLabel: '移出报销集',
      semanticHint: '将发票移出报销集',
      type: SlideButtonType.secondary,
      position: position,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        height: double.infinity, // 🔑 填满整个滑动区域高度，确保与卡片等高
        margin: const EdgeInsets.only(bottom: 12), // 统一底部边距
        child: Container(
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: _getBorderRadius(),
            boxShadow: enableElevation ? [
              BoxShadow(
                color: CupertinoColors.black.withValues(alpha: 0.1),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ] : null,
          ),
          child: Semantics(
            label: semanticLabel ?? label,
            hint: semanticHint,
            button: true,
            child: CupertinoButton(
              onPressed: onTap,
              padding: EdgeInsets.zero,
              borderRadius: _getBorderRadius(),
              child: Container(
                padding: const EdgeInsets.all(16), // 统一内边距
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      icon,
                      color: foregroundColor,
                      size: 24, // 统一图标大小
                    ),
                    const SizedBox(height: 4), // 统一间距
                    Text(
                      label,
                      style: TextStyle(
                        color: foregroundColor,
                        fontSize: 12, // 统一字体大小
                        fontWeight: FontWeight.w500, // 统一字重
                        height: 1.2, // 统一行高
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// 根据位置计算边框圆角
  BorderRadius _getBorderRadius() {
    if (borderRadius != null) return borderRadius!;
    
    const radius = Radius.circular(12); // 统一圆角半径
    
    switch (position) {
      case SlideButtonPosition.left:
        return const BorderRadius.only(
          topRight: radius,
          bottomRight: radius,
        );
      case SlideButtonPosition.right:
        return const BorderRadius.only(
          topLeft: radius,
          bottomLeft: radius,
        );
      case SlideButtonPosition.middle:
        return BorderRadius.zero;
      case SlideButtonPosition.single:
        return BorderRadius.all(radius);
    }
  }
}

/// 滑动按钮类型枚举
enum SlideButtonType {
  /// 主要操作按钮
  primary,
  
  /// 次要操作按钮
  secondary,
  
  /// 危险操作按钮
  destructive,
  
  /// 中性操作按钮
  neutral,
}

/// 滑动按钮位置枚举
enum SlideButtonPosition {
  /// 左侧位置（右侧圆角）
  left,
  
  /// 右侧位置（左侧圆角）
  right,
  
  /// 中间位置（无圆角）
  middle,
  
  /// 单独按钮（全圆角）
  single,
}

/// 统一的滑动按钮组
/// 
/// 用于管理一组滑动按钮的布局和样式
class UnifiedSlideButtonGroup extends StatelessWidget {
  /// 按钮列表
  final List<UnifiedSlideButton> buttons;
  
  /// 是否为左滑区域
  final bool isStartActionPane;
  
  /// 扩展比例
  final double extentRatio;

  const UnifiedSlideButtonGroup({
    super.key,
    required this.buttons,
    this.isStartActionPane = false,
    this.extentRatio = 0.25,
  });

  @override
  Widget build(BuildContext context) {
    if (buttons.isEmpty) return const SizedBox.shrink();
    
    // 为多按钮组合自动设置位置
    final adjustedButtons = _adjustButtonPositions(buttons);
    
    return SizedBox(
      width: MediaQuery.of(context).size.width * extentRatio,
      child: Row(
        children: adjustedButtons,
      ),
    );
  }

  /// 调整按钮位置属性
  List<UnifiedSlideButton> _adjustButtonPositions(List<UnifiedSlideButton> originalButtons) {
    if (originalButtons.length == 1) {
      // 单个按钮使用single位置
      final button = originalButtons.first;
      return [
        UnifiedSlideButton(
          icon: button.icon,
          label: button.label,
          backgroundColor: button.backgroundColor,
          foregroundColor: button.foregroundColor,
          onTap: button.onTap,
          semanticLabel: button.semanticLabel,
          semanticHint: button.semanticHint,
          type: button.type,
          position: SlideButtonPosition.single,
          enableElevation: button.enableElevation,
        ),
      ];
    }
    
    // 多个按钮时设置首末位置
    return originalButtons.asMap().entries.map((entry) {
      final index = entry.key;
      final button = entry.value;
      final isFirst = index == 0;
      final isLast = index == originalButtons.length - 1;
      
      SlideButtonPosition position;
      if (isStartActionPane) {
        // 左滑区域：第一个按钮左侧圆角，最后一个按钮右侧圆角
        if (isFirst && isLast) {
          position = SlideButtonPosition.single;
        } else if (isFirst) {
          position = SlideButtonPosition.left;
        } else if (isLast) {
          position = SlideButtonPosition.right;
        } else {
          position = SlideButtonPosition.middle;
        }
      } else {
        // 右滑区域：第一个按钮左侧圆角，最后一个按钮右侧圆角
        if (isFirst && isLast) {
          position = SlideButtonPosition.single;
        } else if (isFirst) {
          position = SlideButtonPosition.left;
        } else if (isLast) {
          position = SlideButtonPosition.right;
        } else {
          position = SlideButtonPosition.middle;
        }
      }
      
      return UnifiedSlideButton(
        icon: button.icon,
        label: button.label,
        backgroundColor: button.backgroundColor,
        foregroundColor: button.foregroundColor,
        onTap: button.onTap,
        semanticLabel: button.semanticLabel,
        semanticHint: button.semanticHint,
        type: button.type,
        position: position,
        enableElevation: button.enableElevation,
      );
    }).toList();
  }
}

/// 滑动按钮主题配置
/// 
/// 为不同类型的按钮提供主题色彩配置
class SlideButtonTheme {
  /// 根据按钮类型和颜色方案创建颜色配置
  static SlideButtonColors getColors(SlideButtonType type, ColorScheme colorScheme) {
    switch (type) {
      case SlideButtonType.primary:
        return SlideButtonColors(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
        );
      case SlideButtonType.secondary:
        return SlideButtonColors(
          backgroundColor: colorScheme.secondary,
          foregroundColor: colorScheme.onSecondary,
        );
      case SlideButtonType.destructive:
        return SlideButtonColors(
          backgroundColor: colorScheme.error,
          foregroundColor: colorScheme.onError,
        );
      case SlideButtonType.neutral:
        return SlideButtonColors(
          backgroundColor: colorScheme.surface,
          foregroundColor: colorScheme.onSurface,
        );
    }
  }
}

/// 滑动按钮颜色配置
class SlideButtonColors {
  final Color backgroundColor;
  final Color foregroundColor;

  const SlideButtonColors({
    required this.backgroundColor,
    required this.foregroundColor,
  });
}