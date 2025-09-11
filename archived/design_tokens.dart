import 'package:flutter/material.dart';

/// 设计令牌系统 - 统一的设计语言
/// 基于Material Design 3、8dp网格系统和FlexColorScheme语义颜色
class DesignTokens {
  DesignTokens._();
  
  // ==================== 颜色系统 ====================
  
  /// FlexColorScheme 语义状态颜色
  static const Color statusDraft = Color(0xFFFF9800);      // 橙色 - 草稿状态 (Warning)
  static const Color statusSubmitted = Color(0xFF9C27B0);  // 紫色 - 已提交状态 (Info) 
  static const Color statusReimbursed = Color(0xFF4CAF50); // 绿色 - 已报销状态 (Success)
  static const Color statusError = Color(0xFFF44336);      // 红色 - 错误状态 (Error)
  
  /// FlexColorScheme 主要语义颜色
  static const Color primary = Color(0xFF2196F3);          // 主要颜色 (Primary)
  static const Color primaryContainer = Color(0xFFE3F2FD); // 主要容器颜色
  static const Color secondary = Color(0xFF03DAC6);        // 次要颜色 (Secondary)
  static const Color secondaryContainer = Color(0xFFE0F2F1); // 次要容器颜色
  
  /// FlexColorScheme 表面和背景颜色
  static const Color surface = Color(0xFFFAFAFA);          // 表面颜色
  static const Color surfaceVariant = Color(0xFFF5F5F5);   // 表面变体
  static const Color surfaceContainer = Color(0xFFF3F4F6); // 表面容器
  static const Color surfaceContainerHigh = Color(0xFFECEDEF); // 高级表面容器
  
  /// FlexColorScheme 语义文本颜色
  static const Color onPrimary = Color(0xFFFFFFFF);        // 主要颜色上的文本
  static const Color onSecondary = Color(0xFF000000);      // 次要颜色上的文本
  static const Color onSurface = Color(0xFF212121);        // 表面上的文本
  static const Color onSurfaceVariant = Color(0xFF757575); // 表面变体上的文本
  
  /// 传统文本颜色 (兼容)
  static const Color textPrimary = onSurface;              // 主要文本
  static const Color textSecondary = onSurfaceVariant;     // 次要文本
  static const Color textDisabled = Color(0xFFBDBDBD);     // 禁用文本
  
  /// 背景颜色
  static const Color backgroundLight = Color(0xFFFFFFFF);
  static const Color backgroundDark = Color(0xFF121212);
  static const Color backgroundCard = surface;
  
  // ==================== 间距系统 ====================
  
  /// 基于8dp网格系统的间距定义
  static const double spacing2 = 2.0;    // 最小间距
  static const double spacing4 = 4.0;    // 很小间距
  static const double spacing6 = 6.0;    // 小间距（非标准）
  static const double spacing8 = 8.0;    // 小间距
  static const double spacing12 = 12.0;  // 标准小间距
  static const double spacing16 = 16.0;  // 标准间距
  static const double spacing20 = 20.0;  // 大间距
  static const double spacing24 = 24.0;  // 很大间距
  static const double spacing32 = 32.0;  // 超大间距
  
  // ==================== 圆角系统 ====================
  
  static const double radiusSmall = 8.0;   // 小圆角
  static const double radiusMedium = 12.0; // 中等圆角
  static const double radiusLarge = 16.0;  // 大圆角
  static const double radiusXLarge = 20.0; // 超大圆角
  
  // ==================== 阴影系统 ====================
  
  /// 卡片阴影
  static const List<BoxShadow> shadowCard = [
    BoxShadow(
      color: Color(0x0F000000),
      blurRadius: 4,
      offset: Offset(0, 2),
    ),
  ];
  
  /// 浮起阴影
  static const List<BoxShadow> shadowElevated = [
    BoxShadow(
      color: Color(0x1F000000),
      blurRadius: 8,
      offset: Offset(0, 4),
    ),
  ];
  
  /// 深度阴影
  static const List<BoxShadow> shadowDeep = [
    BoxShadow(
      color: Color(0x3D000000),
      blurRadius: 12,
      offset: Offset(0, 6),
    ),
  ];
  
  // ==================== 字体系统 ====================
  
  /// 标题样式
  static const TextStyle headlineLarge = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.5,
    height: 1.3,
  );
  
  static const TextStyle headlineMedium = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.3,
    height: 1.3,
  );
  
  static const TextStyle headlineSmall = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    letterSpacing: 0,
    height: 1.4,
  );
  
  /// 标题样式
  static const TextStyle titleLarge = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    letterSpacing: 0,
    height: 1.4,
  );
  
  static const TextStyle titleMedium = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    height: 1.4,
  );
  
  static const TextStyle titleSmall = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    height: 1.4,
  );
  
  /// 正文样式
  static const TextStyle bodyLarge = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.1,
    height: 1.5,
  );
  
  static const TextStyle bodyMedium = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.2,
    height: 1.4,
  );
  
  static const TextStyle bodySmall = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.4,
    height: 1.3,
  );
  
  /// 标签样式
  static const TextStyle labelLarge = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    height: 1.4,
  );
  
  static const TextStyle labelMedium = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.5,
    height: 1.3,
  );
  
  static const TextStyle labelSmall = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.5,
    height: 1.3,
  );
  
  // ==================== 尺寸系统 ====================
  
  /// 最小触摸目标大小（遵循Material Design指导原则）
  static const double minTouchTarget = 48.0;
  
  /// 图标尺寸
  static const double iconSmall = 16.0;
  static const double iconMedium = 20.0;
  static const double iconLarge = 24.0;
  static const double iconXLarge = 32.0;
  
  /// 头像尺寸
  static const double avatarSmall = 32.0;
  static const double avatarMedium = 40.0;
  static const double avatarLarge = 48.0;
  
  // ==================== 动画系统 ====================
  
  /// 动画时长
  static const Duration animationFast = Duration(milliseconds: 150);
  static const Duration animationMedium = Duration(milliseconds: 250);
  static const Duration animationSlow = Duration(milliseconds: 350);
  
  /// 动画曲线
  static const Curve curveStandard = Curves.easeInOut;
  static const Curve curveDecelerate = Curves.easeOut;
  static const Curve curveAccelerate = Curves.easeIn;
  
  // ==================== 状态配置 ====================
  
  /// 获取状态配置
  static StatusConfig getStatusConfig(String statusValue) {
    switch (statusValue) {
      case 'draft':
        return const StatusConfig(
          color: statusDraft,
          label: '草稿',
          description: '可编辑状态',
        );
      case 'submitted':
        return const StatusConfig(
          color: statusSubmitted,
          label: '已提交',
          description: '等待审批',
        );
      case 'reimbursed':
        return const StatusConfig(
          color: statusReimbursed,
          label: '已报销',
          description: '已完成',
        );
      default:
        return const StatusConfig(
          color: textDisabled,
          label: '未知',
          description: '未知状态',
        );
    }
  }
  
  // ==================== 辅助方法 ====================
  
  /// 获取文本颜色（根据背景色自动判断）
  static Color getTextColor(Color backgroundColor) {
    final luminance = backgroundColor.computeLuminance();
    return luminance > 0.5 ? textPrimary : Colors.white;
  }
  
  /// 获取对比色
  static Color getContrastColor(Color color) {
    return color.computeLuminance() > 0.5 ? Colors.black : Colors.white;
  }
  
  /// 创建颜色变体（透明度变化）
  static Color withAlpha(Color color, double alpha) {
    return color.withValues(alpha: alpha);
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