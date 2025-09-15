import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../../domain/entities/invoice_entity.dart';
import '../atoms/app_text.dart';
import '../atoms/app_icon.dart';

/// 报销集状态徽章
///
/// 用于显示发票是否已加入报销集的状态指示器
/// 支持点击跳转到报销集详情页面
class ReimbursementSetBadge extends StatelessWidget {
  /// 发票实体
  final InvoiceEntity invoice;

  /// 点击跳转到报销集回调
  final VoidCallback? onTap;

  /// 徽章尺寸
  final BadgeSize size;

  /// 是否显示文本标签
  final bool showLabel;

  /// 自定义背景颜色
  final Color? backgroundColor;

  /// 自定义前景色
  final Color? foregroundColor;

  const ReimbursementSetBadge({
    super.key,
    required this.invoice,
    this.onTap,
    this.size = BadgeSize.medium,
    this.showLabel = true,
    this.backgroundColor,
    this.foregroundColor,
  });

  @override
  Widget build(BuildContext context) {
    // 如果发票未在报销集中，不显示徽章
    if (!invoice.isInReimbursementSet) {
      return const SizedBox.shrink();
    }

    final colorScheme = Theme.of(context).colorScheme;
    final bgColor = backgroundColor ?? colorScheme.primaryContainer;
    final fgColor = foregroundColor ?? colorScheme.onPrimaryContainer;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: _getPadding(),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(_getBorderRadius()),
          border: Border.all(
            color: fgColor.withValues(alpha: 0.2),
            width: 0.5,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcon(
              icon: CupertinoIcons.folder_fill,
              size: _getIconSize(),
              color: fgColor,
              semanticLabel: '已加入报销集',
            ),
            if (showLabel) ...[
              SizedBox(width: _getSpacing()),
              AppText(
                text: '已归集',
                variant: _getTextVariant(),
                color: fgColor,
                fontWeight: FontWeight.w500,
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// 获取内边距
  EdgeInsets _getPadding() {
    switch (size) {
      case BadgeSize.small:
        return const EdgeInsets.symmetric(horizontal: 6, vertical: 2);
      case BadgeSize.medium:
        return const EdgeInsets.symmetric(horizontal: 8, vertical: 4);
      case BadgeSize.large:
        return const EdgeInsets.symmetric(horizontal: 10, vertical: 6);
    }
  }

  /// 获取圆角半径
  double _getBorderRadius() {
    switch (size) {
      case BadgeSize.small:
        return 8;
      case BadgeSize.medium:
        return 10;
      case BadgeSize.large:
        return 12;
    }
  }

  /// 获取图标尺寸
  IconSize _getIconSize() {
    switch (size) {
      case BadgeSize.small:
        return IconSize.extraSmall;
      case BadgeSize.medium:
        return IconSize.small;
      case BadgeSize.large:
        return IconSize.medium;
    }
  }

  /// 获取间距
  double _getSpacing() {
    switch (size) {
      case BadgeSize.small:
        return 3;
      case BadgeSize.medium:
        return 4;
      case BadgeSize.large:
        return 6;
    }
  }

  /// 获取文字样式
  TextVariant _getTextVariant() {
    switch (size) {
      case BadgeSize.small:
        return TextVariant.labelSmall;
      case BadgeSize.medium:
        return TextVariant.labelMedium;
      case BadgeSize.large:
        return TextVariant.labelLarge;
    }
  }
}

/// 简化版报销集指示器
///
/// 仅显示图标，不显示文字，适用于空间紧张的场景
class ReimbursementSetIndicator extends StatelessWidget {
  /// 发票实体
  final InvoiceEntity invoice;

  /// 点击跳转到报销集回调
  final VoidCallback? onTap;

  /// 指示器尺寸
  final double size;

  /// 自定义颜色
  final Color? color;

  const ReimbursementSetIndicator({
    super.key,
    required this.invoice,
    this.onTap,
    this.size = 24,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    // 如果发票未在报销集中，不显示指示器
    if (!invoice.isInReimbursementSet) {
      return const SizedBox.shrink();
    }

    final colorScheme = Theme.of(context).colorScheme;
    final indicatorColor = color ?? colorScheme.primary;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: indicatorColor.withValues(alpha: 0.1),
          shape: BoxShape.circle,
          border: Border.all(
            color: indicatorColor.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
        child: Icon(
          CupertinoIcons.folder_fill,
          size: size * 0.6,
          color: indicatorColor,
        ),
      ),
    );
  }
}

/// 彩色条状态指示器
///
/// 在卡片左侧显示一个细条，用于指示报销集状态
class ReimbursementSetStatusStrip extends StatelessWidget {
  /// 发票实体
  final InvoiceEntity invoice;

  /// 条的宽度
  final double width;

  /// 条的高度
  final double height;

  /// 自定义颜色
  final Color? color;

  const ReimbursementSetStatusStrip({
    super.key,
    required this.invoice,
    this.width = 4,
    this.height = 40,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    // 如果发票未在报销集中，不显示状态条
    if (!invoice.isInReimbursementSet) {
      return const SizedBox.shrink();
    }

    final colorScheme = Theme.of(context).colorScheme;
    final stripColor = color ?? colorScheme.primary;

    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: stripColor,
        borderRadius: BorderRadius.circular(width / 2),
      ),
    );
  }
}

/// 徽章尺寸枚举
enum BadgeSize {
  small,
  medium,
  large,
}
