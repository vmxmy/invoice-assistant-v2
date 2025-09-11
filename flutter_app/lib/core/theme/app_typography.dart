import 'package:flutter/material.dart';

/// 应用字体主题管理
/// 基于FlexColorScheme和Material 3字体系统
/// 提供语义化的字体使用方法
class AppTypography {
  const AppTypography._();

  /// 从当前上下文获取字体主题
  static TextTheme _getTextTheme(BuildContext context) {
    return Theme.of(context).textTheme;
  }

  // ==================== 标题样式 ====================

  /// 大标题 - 用于页面主标题
  static TextStyle headlineLarge(BuildContext context) {
    return _getTextTheme(context).headlineLarge ?? const TextStyle(
      fontSize: 28,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.5,
      height: 1.3,
    );
  }

  /// 中等标题 - 用于区块标题
  static TextStyle headlineMedium(BuildContext context) {
    return _getTextTheme(context).headlineMedium ?? const TextStyle(
      fontSize: 24,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.3,
      height: 1.3,
    );
  }

  /// 小标题 - 用于卡片标题
  static TextStyle headlineSmall(BuildContext context) {
    return _getTextTheme(context).headlineSmall ?? const TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w600,
      letterSpacing: 0,
      height: 1.4,
    );
  }

  // ==================== 标题样式 ====================

  /// 大标题 - 用于导航栏标题
  static TextStyle titleLarge(BuildContext context) {
    return _getTextTheme(context).titleLarge ?? const TextStyle(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      letterSpacing: 0,
      height: 1.4,
    );
  }

  /// 中等标题 - 用于列表项标题
  static TextStyle titleMedium(BuildContext context) {
    return _getTextTheme(context).titleMedium ?? const TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w500,
      letterSpacing: 0.1,
      height: 1.4,
    );
  }

  /// 小标题 - 用于小组件标题
  static TextStyle titleSmall(BuildContext context) {
    return _getTextTheme(context).titleSmall ?? const TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w500,
      letterSpacing: 0.1,
      height: 1.4,
    );
  }

  // ==================== 正文样式 ====================

  /// 大正文 - 用于主要内容
  static TextStyle bodyLarge(BuildContext context) {
    return _getTextTheme(context).bodyLarge ?? const TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      letterSpacing: 0.1,
      height: 1.5,
    );
  }

  /// 中等正文 - 用于普通内容
  static TextStyle bodyMedium(BuildContext context) {
    return _getTextTheme(context).bodyMedium ?? const TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      letterSpacing: 0.2,
      height: 1.4,
    );
  }

  /// 小正文 - 用于说明文字
  static TextStyle bodySmall(BuildContext context) {
    return _getTextTheme(context).bodySmall ?? const TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w400,
      letterSpacing: 0.4,
      height: 1.3,
    );
  }

  // ==================== 标签样式 ====================

  /// 大标签 - 用于按钮文字
  static TextStyle labelLarge(BuildContext context) {
    return _getTextTheme(context).labelLarge ?? const TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w500,
      letterSpacing: 0.1,
      height: 1.4,
    );
  }

  /// 中等标签 - 用于小按钮和标签
  static TextStyle labelMedium(BuildContext context) {
    return _getTextTheme(context).labelMedium ?? const TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w500,
      letterSpacing: 0.5,
      height: 1.3,
    );
  }

  /// 小标签 - 用于状态标签
  static TextStyle labelSmall(BuildContext context) {
    return _getTextTheme(context).labelSmall ?? const TextStyle(
      fontSize: 11,
      fontWeight: FontWeight.w500,
      letterSpacing: 0.5,
      height: 1.3,
    );
  }

  // ==================== 显示样式 ====================

  /// 超大显示 - 用于特殊展示
  static TextStyle displayLarge(BuildContext context) {
    return _getTextTheme(context).displayLarge ?? const TextStyle(
      fontSize: 36,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.8,
      height: 1.2,
    );
  }

  /// 大显示 - 用于数字展示
  static TextStyle displayMedium(BuildContext context) {
    return _getTextTheme(context).displayMedium ?? const TextStyle(
      fontSize: 32,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.6,
      height: 1.2,
    );
  }

  /// 小显示 - 用于重要数据
  static TextStyle displaySmall(BuildContext context) {
    return _getTextTheme(context).displaySmall ?? const TextStyle(
      fontSize: 28,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.4,
      height: 1.3,
    );
  }

  // ==================== 语义化字体方法 ====================

  /// 金额显示字体 - 专门用于金额数字
  static TextStyle currency(BuildContext context, {double? fontSize}) {
    return titleMedium(context).copyWith(
      fontSize: fontSize ?? 16,
      fontWeight: FontWeight.w600,
      fontFeatures: const [FontFeature.tabularFigures()], // 等宽数字
    );
  }

  /// 金额大数字显示
  static TextStyle currencyLarge(BuildContext context) {
    return headlineMedium(context).copyWith(
      fontWeight: FontWeight.w700,
      fontFeatures: const [FontFeature.tabularFigures()],
    );
  }

  /// 状态文字 - 用于状态标签
  static TextStyle status(BuildContext context) {
    return labelMedium(context).copyWith(
      fontWeight: FontWeight.w600,
    );
  }

  /// 时间戳显示
  static TextStyle timestamp(BuildContext context) {
    return bodySmall(context).copyWith(
      fontFeatures: const [FontFeature.tabularFigures()],
    );
  }

  /// 数据表格字体 - 等宽数字显示
  static TextStyle dataTable(BuildContext context) {
    return bodyMedium(context).copyWith(
      fontFeatures: const [FontFeature.tabularFigures()],
    );
  }

  /// 错误信息字体
  static TextStyle error(BuildContext context) {
    return bodyMedium(context).copyWith(
      color: Theme.of(context).colorScheme.error,
    );
  }

  /// 成功信息字体
  static TextStyle success(BuildContext context) {
    return bodyMedium(context).copyWith(
      color: const Color(0xFF4CAF50), // 绿色
    );
  }

  /// 警告信息字体
  static TextStyle warning(BuildContext context) {
    return bodyMedium(context).copyWith(
      color: const Color(0xFFFF9800), // 橙色
    );
  }

  /// 次要信息字体
  static TextStyle secondary(BuildContext context) {
    return bodyMedium(context).copyWith(
      color: Theme.of(context).colorScheme.onSurfaceVariant,
    );
  }

  /// 禁用状态字体
  static TextStyle disabled(BuildContext context) {
    return bodyMedium(context).copyWith(
      color: Theme.of(context).disabledColor,
    );
  }
}