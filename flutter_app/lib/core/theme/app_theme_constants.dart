import 'package:flutter/material.dart';

/// 应用主题常量 - 与Cupertino主题系统完全集成的设计系统
/// 替代DesignTokens，所有值都来源于Cupertino主题系统
class AppThemeConstants {
  AppThemeConstants._();

  // ==================== 间距系统 ====================
  /// 基于iOS Human Interface Guidelines的8dp网格系统
  static const double spacing2 = 2.0;
  static const double spacing4 = 4.0;
  static const double spacing6 = 6.0;
  static const double spacing8 = 8.0;
  static const double spacing12 = 12.0;
  static const double spacing16 = 16.0;
  static const double spacing20 = 20.0;
  static const double spacing24 = 24.0;
  static const double spacing32 = 32.0;

  // ==================== 圆角系统 ====================
  /// 与Cupertino主题系统配置保持一致的圆角设计
  static const double radiusSmall = 8.0;
  static const double radiusMedium = 12.0;
  static const double radiusLarge = 16.0;
  static const double radiusXLarge = 20.0;

  // ==================== 尺寸系统 ====================
  /// iOS Human Interface Guidelines指导原则的触摸目标和图标尺寸
  static const double minTouchTarget = 48.0;

  static const double iconSmall = 16.0;
  static const double iconMedium = 20.0;
  static const double iconLarge = 24.0;
  static const double iconXLarge = 32.0;

  static const double avatarSmall = 32.0;
  static const double avatarMedium = 40.0;
  static const double avatarLarge = 48.0;

  // ==================== 动画系统 ====================
  static const Duration animationFast = Duration(milliseconds: 150);
  static const Duration animationMedium = Duration(milliseconds: 250);
  static const Duration animationSlow = Duration(milliseconds: 350);

  static const Curve curveStandard = Curves.easeInOut;
  static const Curve curveDecelerate = Curves.easeOut;
  static const Curve curveAccelerate = Curves.easeIn;

  // ==================== 主题感知的动态颜色获取 ====================

  /// 获取状态配置（使用主题颜色）
  static StatusConfig getStatusConfig(
      BuildContext context, String statusValue) {
    final colorScheme = Theme.of(context).colorScheme;

    switch (statusValue) {
      case 'unsubmitted':
        return StatusConfig(
          color: colorScheme.primary,
          label: '未提交',
          description: '可编辑状态',
        );
      case 'submitted':
        return StatusConfig(
          color: colorScheme.secondary,
          label: '已提交',
          description: '等待审批',
        );
      case 'reimbursed':
        return StatusConfig(
          color: colorScheme.tertiary,
          label: '已报销',
          description: '已完成',
        );
      default:
        return StatusConfig(
          color: colorScheme.outline,
          label: '未知',
          description: '未知状态',
        );
    }
  }

  // ==================== 主题感知的阴影系统 ====================

  /// 获取主题感知的卡片阴影
  static List<BoxShadow> getCardShadow(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return [
      BoxShadow(
        color: isDark
            ? Colors.black.withValues(alpha: 0.3)
            : Colors.black.withValues(alpha: 0.1),
        blurRadius: 4,
        offset: const Offset(0, 2),
      ),
    ];
  }

  /// 获取主题感知的浮起阴影
  static List<BoxShadow> getElevatedShadow(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return [
      BoxShadow(
        color: isDark
            ? Colors.black.withValues(alpha: 0.4)
            : Colors.black.withValues(alpha: 0.15),
        blurRadius: 8,
        offset: const Offset(0, 4),
      ),
    ];
  }

  // ==================== 辅助方法 ====================

  /// 获取文本颜色（根据背景色自动判断，使用主题颜色）
  static Color getTextColor(BuildContext context, Color backgroundColor) {
    final colorScheme = Theme.of(context).colorScheme;
    final luminance = backgroundColor.computeLuminance();
    return luminance > 0.5 ? colorScheme.onSurface : colorScheme.onPrimary;
  }

  /// 获取对比色（使用主题颜色）
  static Color getContrastColor(BuildContext context, Color color) {
    final colorScheme = Theme.of(context).colorScheme;
    return color.computeLuminance() > 0.5
        ? colorScheme.onSurface
        : colorScheme.surface;
  }
}

/// 状态配置类
class StatusConfig {
  const StatusConfig({
    required this.color,
    required this.label,
    required this.description,
  });

  final Color color;
  final String label;
  final String description;
}

/// 统计项数据类
class StatItem {
  const StatItem({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.unit,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final String? unit;
}

/// 状态步骤类
class StatusStep {
  const StatusStep({
    required this.statusValue,
    required this.title,
    required this.icon,
    this.description,
  });

  final String statusValue;
  final String title;
  final IconData icon;
  final String? description;
}
