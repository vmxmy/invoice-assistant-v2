import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

/// 详情页面统一样式组件
/// 提供发票详情和报销集详情页面的一致样式
class DetailPageStyles {
  // 私有构造函数，防止实例化
  DetailPageStyles._();

  // ==================== 文本样式 ====================

  /// 页面标题样式 - 用于AppBar title
  static TextStyle pageTitle(BuildContext context) {
    return const TextStyle(fontSize: 16);
  }

  /// 主要标题样式 - 用于卡片内的主标题
  static TextStyle mainTitle(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w600,
      color: colorScheme.onSurface,
    );
  }

  /// 金额样式 - 统一的金额显示
  static TextStyle amountText(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextStyle(
      fontSize: 28,
      fontWeight: FontWeight.bold,
      color: colorScheme.primary,
    );
  }

  /// 标签文字样式 - 用于各种标签
  static TextStyle labelText(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextStyle(
      fontSize: 14,
      color: colorScheme.onSurface.withValues(alpha: 0.7),
    );
  }

  /// 数值文字样式 - 用于显示具体数值
  static TextStyle valueText(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w500,
      color: colorScheme.onSurface,
    );
  }

  /// 次要信息样式 - 用于辅助信息
  static TextStyle secondaryText(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextStyle(
      fontSize: 14,
      color: colorScheme.onSurfaceVariant,
    );
  }

  /// 小号文字样式 - 用于时间等小信息
  static TextStyle captionText(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextStyle(
      fontSize: 12,
      color: colorScheme.onSurfaceVariant,
    );
  }

  /// 错误文字样式
  static TextStyle errorText(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextStyle(
      fontSize: 18,
      color: colorScheme.error.withValues(alpha: 0.7),
    );
  }

  /// 错误消息样式
  static TextStyle errorMessage(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextStyle(
      fontSize: 14,
      color: colorScheme.onSurfaceVariant.withValues(alpha: 0.8),
    );
  }

  // ==================== 卡片装饰 ====================

  /// 主要卡片装饰
  static Decoration mainCardDecoration(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return BoxDecoration(
      color: colorScheme.surface,
      borderRadius: BorderRadius.circular(12),
      boxShadow: [
        BoxShadow(
          color: colorScheme.shadow.withValues(alpha: 0.08),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ],
    );
  }

  /// 次要卡片装饰
  static Decoration secondaryCardDecoration(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return BoxDecoration(
      color: colorScheme.surface,
      borderRadius: BorderRadius.circular(8),
      border: Border.all(
        color: colorScheme.outline.withValues(alpha: 0.12),
        width: 1,
      ),
    );
  }

  /// 信息容器装饰
  static Decoration infoContainerDecoration(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return BoxDecoration(
      color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.6),
      borderRadius: BorderRadius.circular(8),
      border: Border.all(
        color: colorScheme.primary.withValues(alpha: 0.1),
        width: 1,
      ),
    );
  }

  // ==================== 图标样式 ====================

  /// 主要图标颜色
  static Color primaryIconColor(BuildContext context) {
    return Theme.of(context).colorScheme.primary.withValues(alpha: 0.7);
  }

  /// 次要图标颜色
  static Color secondaryIconColor(BuildContext context) {
    return Theme.of(context).colorScheme.onSurfaceVariant;
  }

  /// 错误图标颜色
  static Color errorIconColor(BuildContext context) {
    return Theme.of(context).colorScheme.error.withValues(alpha: 0.5);
  }

  // ==================== 组件构建器 ====================

  /// 构建信息行组件
  static Widget buildInfoRow(
    BuildContext context, {
    required String label,
    required String value,
    required IconData icon,
    Color? textColor,
    Color? iconColor,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            size: 18,
            color: iconColor ?? primaryIconColor(context),
          ),
          const SizedBox(width: 12),
          Text(
            label,
            style: labelText(context),
          ),
          Expanded(
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                value,
                style: valueText(context).copyWith(
                  color: textColor,
                ),
                textAlign: TextAlign.right,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 构建加载页面
  static Widget buildLoadingPage(BuildContext context, String title) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: Text(title, style: pageTitle(context)),
      ),
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CupertinoActivityIndicator(),
            SizedBox(height: 16),
            Text('加载中...'),
          ],
        ),
      ),
    );
  }

  /// 构建错误页面
  static Widget buildErrorPage(
    BuildContext context,
    String title,
    String message,
    VoidCallback onRetry,
  ) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: Text(title, style: pageTitle(context)),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              CupertinoIcons.exclamationmark_triangle,
              size: 64,
              color: errorIconColor(context),
            ),
            const SizedBox(height: 16),
            Text('加载失败', style: errorText(context)),
            const SizedBox(height: 8),
            Text(
              message,
              style: errorMessage(context),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onRetry,
              child: const Text('重试'),
            ),
          ],
        ),
      ),
    );
  }

  // ==================== 常量定义 ====================

  /// 标准间距
  static const double spacing4 = 4.0;
  static const double spacing8 = 8.0;
  static const double spacing12 = 12.0;
  static const double spacing16 = 16.0;
  static const double spacing24 = 24.0;
  static const double spacing32 = 32.0;

  /// 标准圆角
  static const double radius8 = 8.0;
  static const double radius12 = 12.0;
  static const double radius16 = 16.0;

  /// 标准图标尺寸
  static const double iconSmall = 16.0;
  static const double iconMedium = 20.0;
  static const double iconLarge = 24.0;
}

/// 详情页面常用组件
class DetailPageComponents {
  DetailPageComponents._();

  /// 构建分隔线
  static Widget buildDivider(BuildContext context, {double height = 1.0}) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      height: height,
      color: colorScheme.outline.withValues(alpha: 0.12),
    );
  }

  /// 构建标准卡片
  static Widget buildCard({
    required BuildContext context,
    required Widget child,
    EdgeInsetsGeometry? padding,
    EdgeInsetsGeometry? margin,
    bool isPrimary = true,
  }) {
    return Container(
      margin: margin ??
          const EdgeInsets.symmetric(vertical: DetailPageStyles.spacing8),
      decoration: isPrimary
          ? DetailPageStyles.mainCardDecoration(context)
          : DetailPageStyles.secondaryCardDecoration(context),
      child: Padding(
        padding: padding ?? const EdgeInsets.all(DetailPageStyles.spacing16),
        child: child,
      ),
    );
  }

  /// 构建状态徽章
  static Widget buildStatusBadge(
    BuildContext context, {
    required String label,
    required Color color,
    IconData? icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: DetailPageStyles.spacing8,
        vertical: DetailPageStyles.spacing4,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(DetailPageStyles.radius12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: DetailPageStyles.iconSmall, color: color),
            const SizedBox(width: DetailPageStyles.spacing4),
          ],
          Text(
            label,
            style: DetailPageStyles.captionText(context).copyWith(
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
