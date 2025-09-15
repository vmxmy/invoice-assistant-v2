/// 状态标签组件
/// 用于显示各种状态信息
library;

import 'package:flutter/material.dart';
import '../../../core/theme/cupertino_semantic_colors.dart';

/// 状态标签状态枚举
enum StatusBadgeStatus {
  success,
  warning,
  error,
  info,
  neutral,
}

/// 状态标签大小枚举
enum StatusBadgeSize {
  small,
  medium,
  large,
}

/// 状态标签组件
class StatusBadge extends StatelessWidget {
  final String text;
  final StatusBadgeStatus status;
  final StatusBadgeSize size;
  final IconData? icon;

  const StatusBadge({
    super.key,
    required this.text,
    required this.status,
    this.size = StatusBadgeSize.medium,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final config = _getStatusConfig(status, colorScheme);
    final sizeConfig = _getSizeConfig(size);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: sizeConfig.paddingHorizontal,
        vertical: sizeConfig.paddingVertical,
      ),
      decoration: BoxDecoration(
        color: config.backgroundColor,
        borderRadius: BorderRadius.circular(sizeConfig.borderRadius),
        border: Border.all(
          color: config.borderColor,
          width: 0.5,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(
              icon,
              size: sizeConfig.iconSize,
              color: config.textColor,
            ),
            SizedBox(width: sizeConfig.spacing),
          ],
          Text(
            text,
            style: TextStyle(
              fontSize: sizeConfig.fontSize,
              fontWeight: sizeConfig.fontWeight,
              color: config.textColor,
            ),
          ),
        ],
      ),
    );
  }

  /// 获取状态配置
  _StatusConfig _getStatusConfig(
      StatusBadgeStatus status, ColorScheme colorScheme) {
    switch (status) {
      case StatusBadgeStatus.success:
        return _StatusConfig(
          backgroundColor:
              CupertinoSemanticColors.success.withValues(alpha: 0.1),
          borderColor: CupertinoSemanticColors.success.withValues(alpha: 0.3),
          textColor: CupertinoSemanticColors.success,
        );
      case StatusBadgeStatus.warning:
        return _StatusConfig(
          backgroundColor:
              CupertinoSemanticColors.warning.withValues(alpha: 0.1),
          borderColor: CupertinoSemanticColors.warning.withValues(alpha: 0.3),
          textColor: CupertinoSemanticColors.warning,
        );
      case StatusBadgeStatus.error:
        return _StatusConfig(
          backgroundColor: CupertinoSemanticColors.error.withValues(alpha: 0.1),
          borderColor: CupertinoSemanticColors.error.withValues(alpha: 0.3),
          textColor: CupertinoSemanticColors.error,
        );
      case StatusBadgeStatus.info:
        return _StatusConfig(
          backgroundColor: CupertinoSemanticColors.info.withValues(alpha: 0.1),
          borderColor: CupertinoSemanticColors.info.withValues(alpha: 0.3),
          textColor: CupertinoSemanticColors.info,
        );
      case StatusBadgeStatus.neutral:
        return _StatusConfig(
          backgroundColor: colorScheme.surfaceContainerHighest,
          borderColor: colorScheme.outline.withValues(alpha: 0.3),
          textColor: colorScheme.onSurface.withValues(alpha: 0.7),
        );
    }
  }

  /// 获取大小配置
  _SizeConfig _getSizeConfig(StatusBadgeSize size) {
    switch (size) {
      case StatusBadgeSize.small:
        return _SizeConfig(
          paddingHorizontal: 6,
          paddingVertical: 2,
          fontSize: 10,
          fontWeight: FontWeight.w500,
          borderRadius: 4,
          iconSize: 10,
          spacing: 3,
        );
      case StatusBadgeSize.medium:
        return _SizeConfig(
          paddingHorizontal: 8,
          paddingVertical: 4,
          fontSize: 12,
          fontWeight: FontWeight.w500,
          borderRadius: 6,
          iconSize: 12,
          spacing: 4,
        );
      case StatusBadgeSize.large:
        return _SizeConfig(
          paddingHorizontal: 12,
          paddingVertical: 6,
          fontSize: 14,
          fontWeight: FontWeight.w600,
          borderRadius: 8,
          iconSize: 16,
          spacing: 6,
        );
    }
  }
}

/// 状态配置
class _StatusConfig {
  final Color backgroundColor;
  final Color borderColor;
  final Color textColor;

  const _StatusConfig({
    required this.backgroundColor,
    required this.borderColor,
    required this.textColor,
  });
}

/// 大小配置
class _SizeConfig {
  final double paddingHorizontal;
  final double paddingVertical;
  final double fontSize;
  final FontWeight fontWeight;
  final double borderRadius;
  final double iconSize;
  final double spacing;

  const _SizeConfig({
    required this.paddingHorizontal,
    required this.paddingVertical,
    required this.fontSize,
    required this.fontWeight,
    required this.borderRadius,
    required this.iconSize,
    required this.spacing,
  });
}
