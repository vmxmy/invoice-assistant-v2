import 'package:flutter/material.dart';

/// 组件主题常量
/// 
/// 提供统一的设计系统常量，确保所有组件使用一致的样式
class ComponentThemeConstants {
  ComponentThemeConstants._();

  // ==================== 圆角常量 ====================
  
  /// 小圆角 - 用于按钮、标签等小元素
  static const double radiusSmall = 8.0;
  
  /// 中等圆角 - 用于卡片、对话框等
  static const double radiusMedium = 12.0;
  
  /// 大圆角 - 用于底部Sheet、大型容器
  static const double radiusLarge = 16.0;
  
  /// 超大圆角 - 用于特殊UI元素
  static const double radiusXLarge = 24.0;

  // ==================== 间距常量 ====================
  
  /// 超小间距 - 4px
  static const double spacingXS = 4.0;
  
  /// 小间距 - 8px
  static const double spacingS = 8.0;
  
  /// 中等间距 - 12px
  static const double spacingM = 12.0;
  
  /// 大间距 - 16px
  static const double spacingL = 16.0;
  
  /// 超大间距 - 24px
  static const double spacingXL = 24.0;
  
  /// 巨大间距 - 32px
  static const double spacingXXL = 32.0;

  // ==================== 按钮尺寸常量 ====================
  
  /// 小按钮高度
  static const double buttonHeightSmall = 32.0;
  
  /// 中等按钮高度
  static const double buttonHeightMedium = 40.0;
  
  /// 大按钮高度
  static const double buttonHeightLarge = 48.0;
  
  /// 底部导航栏高度（符合最小触摸目标）
  static const double bottomNavigationBarHeight = 56.0;

  // ==================== 图标尺寸常量 ====================
  
  /// 超小图标
  static const double iconSizeXS = 12.0;
  
  /// 小图标
  static const double iconSizeS = 16.0;
  
  /// 中等图标
  static const double iconSizeM = 20.0;
  
  /// 大图标
  static const double iconSizeL = 24.0;
  
  /// 超大图标
  static const double iconSizeXL = 32.0;

  // ==================== 卡片相关常量 ====================
  
  /// 卡片默认内边距
  static const EdgeInsets cardPadding = EdgeInsets.all(spacingL);
  
  /// 卡片紧凑内边距
  static const EdgeInsets cardPaddingCompact = EdgeInsets.all(spacingM);
  
  /// 卡片宽松内边距
  static const EdgeInsets cardPaddingLoose = EdgeInsets.all(spacingXL);
  
  /// 卡片默认外边距
  static const EdgeInsets cardMargin = EdgeInsets.symmetric(
    horizontal: spacingL,
    vertical: spacingS,
  );

  // ==================== 阴影常量 ====================
  
  /// 轻微阴影 - 用于卡片默认状态
  static List<BoxShadow> shadowLight(ColorScheme colorScheme) => [
        BoxShadow(
          color: colorScheme.shadow.withValues(alpha: 0.08),
          offset: const Offset(0, 1),
          blurRadius: 3,
          spreadRadius: 0,
        ),
      ];
  
  /// 中等阴影 - 用于悬停状态
  static List<BoxShadow> shadowMedium(ColorScheme colorScheme) => [
        BoxShadow(
          color: colorScheme.shadow.withValues(alpha: 0.12),
          offset: const Offset(0, 2),
          blurRadius: 6,
          spreadRadius: 0,
        ),
      ];
  
  /// 重阴影 - 用于模态框、重要元素
  static List<BoxShadow> shadowHeavy(ColorScheme colorScheme) => [
        BoxShadow(
          color: colorScheme.shadow.withValues(alpha: 0.16),
          offset: const Offset(0, 4),
          blurRadius: 12,
          spreadRadius: 0,
        ),
      ];
  
  /// 彩色阴影 - 用于选中状态
  static List<BoxShadow> shadowColored(Color color) => [
        BoxShadow(
          color: color.withValues(alpha: 0.15),
          offset: const Offset(0, 2),
          blurRadius: 8,
          spreadRadius: 0,
        ),
      ];

  // ==================== 动画时长常量 ====================
  
  /// 快速动画 - 200ms
  static const Duration animationFast = Duration(milliseconds: 200);
  
  /// 正常动画 - 300ms
  static const Duration animationNormal = Duration(milliseconds: 300);
  
  /// 慢速动画 - 500ms
  static const Duration animationSlow = Duration(milliseconds: 500);

  // ==================== 透明度常量 ====================
  
  /// 禁用状态透明度
  static const double opacityDisabled = 0.38;
  
  /// 次要内容透明度
  static const double opacitySecondary = 0.6;
  
  /// 辅助内容透明度
  static const double opacityTertiary = 0.38;
  
  /// 覆盖层透明度
  static const double opacityOverlay = 0.08;
  
  /// 悬停状态透明度
  static const double opacityHover = 0.04;

  // ==================== 文字尺寸常量 ====================
  
  /// 小标签文字
  static const double fontSizeCaption = 12.0;
  
  /// 正文文字
  static const double fontSizeBody = 14.0;
  
  /// 副标题文字
  static const double fontSizeSubtitle = 16.0;
  
  /// 标题文字
  static const double fontSizeTitle = 18.0;
  
  /// 大标题文字
  static const double fontSizeHeadline = 24.0;

  // ==================== 行高常量 ====================
  
  /// 紧凑行高
  static const double lineHeightCompact = 1.2;
  
  /// 正常行高
  static const double lineHeightNormal = 1.4;
  
  /// 宽松行高
  static const double lineHeightLoose = 1.6;

  // ==================== 边框常量 ====================
  
  /// 细边框宽度
  static const double borderWidthThin = 0.5;
  
  /// 正常边框宽度
  static const double borderWidthNormal = 1.0;
  
  /// 粗边框宽度
  static const double borderWidthThick = 2.0;

  // ==================== 响应式断点 ====================
  
  /// 手机端断点
  static const double breakpointMobile = 480.0;
  
  /// 平板端断点
  static const double breakpointTablet = 768.0;
  
  /// 桌面端断点
  static const double breakpointDesktop = 1024.0;
  
  /// 大屏断点
  static const double breakpointLarge = 1440.0;

  // ==================== 实用方法 ====================
  
  /// 根据屏幕宽度获取设备类型
  static DeviceType getDeviceType(double width) {
    if (width < breakpointMobile) return DeviceType.mobile;
    if (width < breakpointTablet) return DeviceType.tablet;
    if (width < breakpointDesktop) return DeviceType.desktop;
    return DeviceType.large;
  }
  
  /// 根据设备类型获取响应式间距
  static double getResponsiveSpacing(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.mobile:
        return spacingM;
      case DeviceType.tablet:
        return spacingL;
      case DeviceType.desktop:
      case DeviceType.large:
        return spacingXL;
    }
  }
  
  /// 根据设备类型获取卡片最大宽度
  static double getCardMaxWidth(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.mobile:
        return double.infinity;
      case DeviceType.tablet:
        return 600.0;
      case DeviceType.desktop:
      case DeviceType.large:
        return 800.0;
    }
  }
}

/// 设备类型枚举
enum DeviceType {
  mobile,
  tablet,
  desktop,
  large,
}