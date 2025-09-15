import 'package:flutter/material.dart';

/// 滑动按钮内容组件
///
/// 负责渲染按钮内部的图标和文字内容，
/// 支持不同状态下的样式变化和适配
class SlideButtonContent extends StatelessWidget {
  /// 按钮图标
  final IconData icon;

  /// 按钮标签
  final String label;

  /// 图标颜色
  final Color iconColor;

  /// 文字颜色
  final Color textColor;

  /// 是否禁用状态
  final bool isDisabled;

  /// 图标大小
  final double? iconSize;

  /// 文字样式
  final TextStyle? textStyle;

  const SlideButtonContent({
    super.key,
    required this.icon,
    required this.label,
    required this.iconColor,
    required this.textColor,
    this.isDisabled = false,
    this.iconSize,
    this.textStyle,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveIconColor =
        isDisabled ? iconColor.withValues(alpha: 0.38) : iconColor;
    final effectiveTextColor =
        isDisabled ? textColor.withValues(alpha: 0.38) : textColor;

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        // 图标
        Icon(
          icon,
          size: iconSize ?? 20, // iOS Human Interface Guidelines推荐的小图标尺寸
          color: effectiveIconColor,
        ),

        // 间距
        SizedBox(height: 4.0),

        // 标签文字
        Flexible(
          child: Text(
            label,
            style: (textStyle ?? theme.textTheme.labelMedium)?.copyWith(
              color: effectiveTextColor,
              fontWeight: FontWeight.w500,
              fontSize: 12, // 统一的小尺寸文字
            ),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
