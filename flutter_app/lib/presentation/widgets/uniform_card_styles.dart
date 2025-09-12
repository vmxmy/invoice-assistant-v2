import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

/// 统一卡片样式组件
/// 为发票卡片和报销集卡片提供一致的视觉风格
class UniformCardStyles {
  // 私有构造函数，防止实例化
  UniformCardStyles._();

  // ==================== 卡片装饰 ====================

  /// 标准卡片装饰
  static Decoration cardDecoration(BuildContext context, {bool isSelected = false}) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return BoxDecoration(
      color: colorScheme.surface,
      borderRadius: BorderRadius.circular(cardRadius),
      border: isSelected 
          ? Border.all(
              color: colorScheme.primary,
              width: 2,
            )
          : Border.all(
              color: colorScheme.outline.withValues(alpha: 0.12),
              width: 1,
            ),
      boxShadow: [
        BoxShadow(
          color: colorScheme.shadow.withValues(alpha: isSelected ? 0.12 : 0.08),
          blurRadius: isSelected ? 12 : 8,
          offset: const Offset(0, 2),
        ),
      ],
    );
  }

  /// 卡片内边距
  static const EdgeInsets cardPadding = EdgeInsets.all(16.0);

  /// 卡片外边距
  static const EdgeInsets cardMargin = EdgeInsets.only(bottom: 12.0);

  /// 卡片圆角半径
  static const double cardRadius = 12.0;

  // ==================== 文本样式 ====================

  /// 卡片标题样式
  static TextStyle cardTitle(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    
    return textTheme.titleMedium!.copyWith(
      color: colorScheme.onSurface,
      fontWeight: FontWeight.w600,
    );
  }

  /// 卡片金额样式
  static TextStyle cardAmount(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    
    return textTheme.titleMedium!.copyWith(
      color: colorScheme.primary,
      fontWeight: FontWeight.bold,
    );
  }

  /// 卡片次要信息样式
  static TextStyle cardSecondaryText(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    
    return textTheme.bodySmall!.copyWith(
      color: colorScheme.onSurfaceVariant,
    );
  }

  /// 卡片标签样式
  static TextStyle cardLabel(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    
    return textTheme.bodySmall!.copyWith(
      color: colorScheme.onSurfaceVariant,
    );
  }

  // ==================== 图标样式 ====================

  /// 主要图标容器装饰
  static Decoration iconContainerDecoration(BuildContext context, Color iconColor) {
    return BoxDecoration(
      color: iconColor.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(8),
    );
  }

  /// 图标容器尺寸
  static const double iconContainerSize = 40.0;

  /// 图标尺寸
  static const double iconSize = 20.0;

  /// 小图标尺寸
  static const double smallIconSize = 16.0;

  // ==================== 状态徽章样式 ====================

  /// 状态徽章装饰
  static Decoration statusBadgeDecoration(BuildContext context, Color statusColor) {
    return BoxDecoration(
      color: statusColor.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(12),
    );
  }

  /// 状态徽章内边距
  static const EdgeInsets statusBadgePadding = EdgeInsets.symmetric(
    horizontal: 8,
    vertical: 4,
  );

  /// 状态徽章文字样式
  static TextStyle statusBadgeText(BuildContext context, Color statusColor) {
    final textTheme = Theme.of(context).textTheme;
    
    return textTheme.labelSmall!.copyWith(
      color: statusColor,
      fontWeight: FontWeight.w500,
    );
  }

  // ==================== 操作按钮样式 ====================

  /// 圆形操作按钮装饰
  static Decoration actionButtonDecoration(BuildContext context, Color buttonColor) {
    return BoxDecoration(
      color: buttonColor.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(16),
    );
  }

  /// 操作按钮尺寸
  static const double actionButtonSize = 32.0;

  /// 操作按钮图标尺寸
  static const double actionButtonIconSize = 16.0;

  // ==================== 间距常量 ====================

  static const double spacing4 = 4.0;
  static const double spacing8 = 8.0;
  static const double spacing12 = 12.0;
  static const double spacing16 = 16.0;

  // ==================== 组件构建器 ====================

  /// 构建标准卡片容器
  static Widget buildCard({
    required BuildContext context,
    required Widget child,
    bool isSelected = false,
    VoidCallback? onTap,
    VoidCallback? onLongPress,
  }) {
    return Container(
      margin: cardMargin,
      decoration: cardDecoration(context, isSelected: isSelected),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          onLongPress: onLongPress,
          borderRadius: BorderRadius.circular(cardRadius),
          child: Padding(
            padding: cardPadding,
            child: child,
          ),
        ),
      ),
    );
  }

  /// 构建头部信息行
  static Widget buildHeaderRow({
    required BuildContext context,
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    Widget? trailing,
  }) {
    return Row(
      children: [
        // 图标容器
        Container(
          width: iconContainerSize,
          height: iconContainerSize,
          decoration: iconContainerDecoration(context, iconColor),
          child: Icon(
            icon,
            color: iconColor,
            size: iconSize,
          ),
        ),
        const SizedBox(width: spacing12),
        
        // 主要信息
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: cardTitle(context),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: cardSecondaryText(context),
              ),
            ],
          ),
        ),

        // 尾部组件（如状态徽章）
        if (trailing != null) trailing,
      ],
    );
  }

  /// 构建简化头部信息行（无图标）
  static Widget buildSimpleHeaderRow({
    required BuildContext context,
    required String title,
    required String subtitle,
    Widget? trailing,
  }) {
    return Row(
      children: [
        // 主要信息
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: cardTitle(context),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: cardSecondaryText(context),
              ),
            ],
          ),
        ),

        // 尾部组件（如状态徽章）
        if (trailing != null) trailing,
      ],
    );
  }

  /// 构建金额显示行
  static Widget buildAmountRow({
    required BuildContext context,
    required String label,
    required String amount,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: cardLabel(context),
        ),
        Text(
          amount,
          style: cardAmount(context),
        ),
      ],
    );
  }

  /// 构建底部信息行
  static Widget buildBottomRow({
    required BuildContext context,
    required String timeText,
    required List<Widget> actionIcons,
  }) {
    return Row(
      children: [
        const Spacer(),
        
        // 操作图标组
        Row(
          mainAxisSize: MainAxisSize.min,
          children: _intersperse(actionIcons, const SizedBox(width: spacing8)),
        ),
      ],
    );
  }

  /// 构建状态徽章
  static Widget buildStatusBadge({
    required BuildContext context,
    required String label,
    required Color color,
    IconData? icon,
  }) {
    return Container(
      padding: statusBadgePadding,
      decoration: statusBadgeDecoration(context, color),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: smallIconSize, color: color),
            const SizedBox(width: spacing4),
          ],
          Text(
            label,
            style: statusBadgeText(context, color),
          ),
        ],
      ),
    );
  }

  /// 构建操作按钮
  static Widget buildActionButton({
    required BuildContext context,
    required IconData icon,
    required Color color,
    required VoidCallback onPressed,
  }) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(actionButtonSize / 2),
      child: Container(
        width: actionButtonSize,
        height: actionButtonSize,
        decoration: actionButtonDecoration(context, color),
        child: Icon(
          icon,
          size: actionButtonIconSize,
          color: color,
        ),
      ),
    );
  }

  /// 构建信息项
  static Widget buildInfoItem({
    required BuildContext context,
    required IconData icon,
    required String text,
    Color? iconColor,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: smallIconSize,
          color: iconColor ?? colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: spacing4),
        Text(
          text,
          style: cardSecondaryText(context),
        ),
      ],
    );
  }

  // ==================== 工具方法 ====================

  /// 在列表元素间插入分隔符
  static List<Widget> _intersperse(List<Widget> list, Widget separator) {
    if (list.isEmpty) return list;
    
    final result = <Widget>[];
    for (int i = 0; i < list.length; i++) {
      if (i > 0) result.add(separator);
      result.add(list[i]);
    }
    return result;
  }
}

/// 卡片类型枚举
enum CardType {
  invoice,    // 发票卡片
  reimbursementSet, // 报销集卡片
}

/// 卡片主题配置
class CardThemeConfig {
  final IconData icon;
  final Color color;
  final String Function(dynamic entity) getTitle;
  final String Function(dynamic entity) getSubtitle;

  const CardThemeConfig({
    required this.icon,
    required this.color,
    required this.getTitle,
    required this.getSubtitle,
  });

  /// 获取卡片类型对应的主题配置
  static CardThemeConfig getConfig(BuildContext context, CardType type) {
    final colorScheme = Theme.of(context).colorScheme;
    
    switch (type) {
      case CardType.invoice:
        return CardThemeConfig(
          icon: CupertinoIcons.doc_text,
          color: colorScheme.primary,
          getTitle: (entity) => entity.sellerName ?? entity.invoiceNumber ?? '未知发票',
          getSubtitle: (entity) => entity.formattedDate ?? '',
        );
      
      case CardType.reimbursementSet:
        return CardThemeConfig(
          icon: CupertinoIcons.folder_fill,
          color: colorScheme.secondary,
          getTitle: (entity) => entity.setName ?? '未命名报销集',
          getSubtitle: (entity) => '${entity.invoiceCount ?? 0} 张发票',
        );
    }
  }
}