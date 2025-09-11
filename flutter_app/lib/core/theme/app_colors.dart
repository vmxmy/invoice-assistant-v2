import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

/// 应用统一颜色管理
/// 基于 FlexColorScheme 提供语义化的颜色定义
class AppColors {
  /// 私有构造函数防止实例化
  AppColors._();

  /// 从上下文获取当前主题的颜色方案
  static ColorScheme _getColorScheme(BuildContext context) {
    return Theme.of(context).colorScheme;
  }

  // ======================
  // 语义化颜色定义
  // ======================

  /// 成功状态颜色 (绿色系)
  static Color success(BuildContext context) => _getColorScheme(context).tertiary;
  static Color onSuccess(BuildContext context) => _getColorScheme(context).onTertiary;
  static Color successContainer(BuildContext context) => _getColorScheme(context).tertiaryContainer;

  /// 警告状态颜色 (橙色系)
  static Color warning(BuildContext context) => const Color(0xFFFF9500); // iOS 橙色
  static Color onWarning(BuildContext context) => Colors.white;
  static Color warningContainer(BuildContext context) => warning(context).withValues(alpha: 0.1);

  /// 错误状态颜色 (红色系)
  static Color error(BuildContext context) => _getColorScheme(context).error;
  static Color onError(BuildContext context) => _getColorScheme(context).onError;
  static Color errorContainer(BuildContext context) => _getColorScheme(context).errorContainer;

  /// 信息状态颜色 (蓝色系)
  static Color info(BuildContext context) => _getColorScheme(context).primary;
  static Color onInfo(BuildContext context) => _getColorScheme(context).onPrimary;
  static Color infoContainer(BuildContext context) => _getColorScheme(context).primaryContainer;

  // ======================
  // 发票状态特定颜色
  // ======================

  /// 已报销状态
  static Color reimbursed(BuildContext context) => success(context);
  static Color onReimbursed(BuildContext context) => onSuccess(context);

  /// 逾期状态
  static Color overdue(BuildContext context) => error(context);
  static Color onOverdue(BuildContext context) => onError(context);

  /// 紧急状态
  static Color urgent(BuildContext context) => warning(context);
  static Color onUrgent(BuildContext context) => onWarning(context);

  /// 正常待报销状态
  static Color pending(BuildContext context) => info(context);
  static Color onPending(BuildContext context) => onInfo(context);

  // ======================
  // 表面颜色 (背景、卡片等)
  // ======================

  /// 主要背景色
  static Color background(BuildContext context) => _getColorScheme(context).surface;
  
  /// 卡片背景色
  static Color cardBackground(BuildContext context) => _getColorScheme(context).surfaceContainerLowest;
  
  /// 高亮背景色
  static Color elevatedBackground(BuildContext context) => _getColorScheme(context).surfaceContainerHigh;

  /// 分割线颜色
  static Color divider(BuildContext context) => _getColorScheme(context).outlineVariant;

  // ======================
  // 文本颜色
  // ======================

  /// 主要文本颜色
  static Color onSurface(BuildContext context) => _getColorScheme(context).onSurface;
  
  /// 次要文本颜色
  static Color onSurfaceVariant(BuildContext context) => _getColorScheme(context).onSurfaceVariant;
  
  /// 禁用文本颜色
  static Color disabled(BuildContext context) => _getColorScheme(context).onSurface.withValues(alpha: 0.38);

  // ======================
  // 交互颜色
  // ======================

  /// 主要操作颜色
  static Color primary(BuildContext context) => _getColorScheme(context).primary;
  static Color onPrimary(BuildContext context) => _getColorScheme(context).onPrimary;

  /// 次要操作颜色  
  static Color secondary(BuildContext context) => _getColorScheme(context).secondary;
  static Color onSecondary(BuildContext context) => _getColorScheme(context).onSecondary;

  // ======================
  // 特殊场景颜色
  // ======================

  /// 覆盖层背景 (模态、对话框等)
  static Color overlay(BuildContext context) => Colors.black.withValues(alpha: 0.6);

  /// 骨架屏颜色
  static Color skeleton(BuildContext context) => _getColorScheme(context).surfaceContainerHighest;

  /// 图片查看器背景
  static Color imageViewerBackground(BuildContext context) => Colors.black;

  // ======================
  // 图表和数据可视化颜色
  // ======================

  /// 图表颜色调色板 (确保在明暗主题下都有良好对比度)
  static List<Color> chartColors(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? _chartColorsDark : _chartColorsLight;
  }

  static const List<Color> _chartColorsLight = [
    Color(0xFF2196F3), // 蓝色
    Color(0xFFFF9800), // 橙色  
    Color(0xFF4CAF50), // 绿色
    Color(0xFF9C27B0), // 紫色
    Color(0xFF607D8B), // 蓝灰色
    Color(0xFFE91E63), // 粉色
    Color(0xFF795548), // 棕色
    Color(0xFF009688), // 青色
  ];

  static const List<Color> _chartColorsDark = [
    Color(0xFF64B5F6), // 浅蓝色
    Color(0xFFFFB74D), // 浅橙色
    Color(0xFF81C784), // 浅绿色
    Color(0xFFBA68C8), // 浅紫色
    Color(0xFF90A4AE), // 浅蓝灰色
    Color(0xFFF06292), // 浅粉色
    Color(0xFFA1887F), // 浅棕色
    Color(0xFF4DB6AC), // 浅青色
  ];

  // ======================
  // 分类特定颜色 (发票类别等)
  // ======================

  /// 获取分类颜色 (用于发票分类、统计图表等)
  static Color getCategoryColor(BuildContext context, int index) {
    final colors = chartColors(context);
    return colors[index % colors.length];
  }

  // ======================
  // 辅助方法
  // ======================

  /// 根据背景色自动选择合适的前景色
  static Color getContrastingColor(Color backgroundColor) {
    // 计算相对亮度
    final luminance = backgroundColor.computeLuminance();
    return luminance > 0.5 ? Colors.black : Colors.white;
  }

  /// 创建带透明度的表面颜色
  static Color surfaceWithOpacity(BuildContext context, double opacity) {
    return _getColorScheme(context).surface.withValues(alpha: opacity);
  }

  /// 创建带透明度的主色调
  static Color primaryWithOpacity(BuildContext context, double opacity) {
    return primary(context).withValues(alpha: opacity);
  }
}

/// 旧版兼容性扩展
/// 为了逐步迁移现有代码，提供静态颜色常量
extension AppColorsLegacy on AppColors {
  /// 兼容性：成功色
  static const Color successStatic = Color(0xFF4CAF50);
  
  /// 兼容性：警告色
  static const Color warningStatic = Color(0xFFFF9500);
  
  /// 兼容性：错误色
  static const Color errorStatic = Color(0xFFF44336);
  
  /// 兼容性：信息色
  static const Color infoStatic = Color(0xFF2196F3);
}