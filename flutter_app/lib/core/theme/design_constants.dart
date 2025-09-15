import 'package:flutter/cupertino.dart';

/// 统一的设计常量管理
/// 遵循 iOS Human Interface Guidelines，专注于 Cupertino 设计系统
class DesignConstants {
  DesignConstants._();

  // ==================== iOS 标准间距 ====================
  
  /// 超小间距 - 4pt (iOS标准)
  static const double spacingXS = 4.0;
  
  /// 小间距 - 8pt (iOS标准)
  static const double spacingS = 8.0;
  
  /// 中等间距 - 12pt
  static const double spacingM = 12.0;
  
  /// 大间距 - 16pt (iOS标准)
  static const double spacingL = 16.0;
  
  /// 超大间距 - 24pt
  static const double spacingXL = 24.0;
  
  /// 巨大间距 - 32pt
  static const double spacingXXL = 32.0;

  // ==================== iOS 标准圆角 ====================
  
  /// 小圆角 - 8pt (iOS标准)
  static const double radiusSmall = 8.0;
  
  /// 中等圆角 - 12pt (iOS标准)
  static const double radiusMedium = 12.0;
  
  /// 大圆角 - 16pt
  static const double radiusLarge = 16.0;
  
  /// 超大圆角 - 24pt
  static const double radiusXLarge = 24.0;

  // ==================== iOS 标准字体尺寸 ====================
  
  /// 小标签文字 - 12pt
  static const double fontSizeCaption = 12.0;
  
  /// 正文文字 - 14pt
  static const double fontSizeBody = 14.0;
  
  /// 副标题文字 - 16pt
  static const double fontSizeSubtitle = 16.0;
  
  /// 标题文字 - 17pt (iOS标准)
  static const double fontSizeTitle = 17.0;
  
  /// 大标题文字 - 22pt
  static const double fontSizeHeadline = 22.0;
  
  /// 导航大标题 - 34pt (iOS标准)
  static const double fontSizeLargeTitle = 34.0;

  // ==================== iOS 标准图标尺寸 ====================
  
  /// 小图标 - 16pt
  static const double iconSizeS = 16.0;
  
  /// 中等图标 - 20pt
  static const double iconSizeM = 20.0;
  
  /// 大图标 - 24pt
  static const double iconSizeL = 24.0;
  
  /// 超大图标 - 32pt
  static const double iconSizeXL = 32.0;
  
  /// 微小图标 - 12pt
  static const double iconSizeXS = 12.0;

  // ==================== iOS 标准按钮高度 ====================
  
  /// 小按钮高度 - 32pt
  static const double buttonHeightSmall = 32.0;
  
  /// 中等按钮高度 - 44pt (iOS最小触摸目标)
  static const double buttonHeightMedium = 44.0;
  
  /// 大按钮高度 - 50pt
  static const double buttonHeightLarge = 50.0;

  // ==================== iOS 标准动画时长 ====================
  
  /// 快速动画 - 200ms
  static const Duration animationFast = Duration(milliseconds: 200);
  
  /// 正常动画 - 300ms
  static const Duration animationNormal = Duration(milliseconds: 300);
  
  /// 慢速动画 - 500ms
  static const Duration animationSlow = Duration(milliseconds: 500);

  // ==================== 透明度常量 ====================
  
  /// 禁用状态透明度
  static const double opacityDisabled = 0.3;
  
  /// 次要内容透明度
  static const double opacitySecondary = 0.6;
  
  /// 辅助内容透明度
  static const double opacityTertiary = 0.4;
  
  /// 遮罩层透明度
  static const double opacityOverlay = 0.08;

  // ==================== 响应式断点 ====================
  
  /// iPhone SE/小屏手机
  static const double breakpointSmall = 375.0;
  
  /// 标准iPhone
  static const double breakpointMedium = 390.0;
  
  /// iPhone Plus/Max
  static const double breakpointLarge = 430.0;
  
  /// iPad/平板
  static const double breakpointTablet = 768.0;

  // ==================== 业务相关常量 ====================
  
  /// 发票卡片最小宽度
  static const double invoiceCardMinWidth = 280.0;
  
  /// 报销集卡片最小宽度
  static const double reimbursementSetCardMinWidth = 320.0;
  
  /// 列表项最小高度 (iOS 标准)
  static const double listItemMinHeight = 44.0;
  
  /// 搜索栏高度 (iOS 标准)
  static const double searchBarHeight = 36.0;
  
  /// 底部安全区额外高度
  static const double bottomSafeAreaExtra = 34.0;

  // ==================== 网格布局常量 ====================
  
  /// 发票卡片宽高比 - 手机端
  static const double invoiceCardAspectRatioMobile = 3.2;
  
  /// 发票卡片宽高比 - 平板端
  static const double invoiceCardAspectRatioTablet = 1.6;
  
  /// 报销集卡片宽高比 - 手机端
  static const double reimbursementSetCardAspectRatioMobile = 2.8;
  
  /// 报销集卡片宽高比 - 平板端
  static const double reimbursementSetCardAspectRatioTablet = 1.4;

  // ==================== 实用方法 ====================
  
  /// 根据屏幕宽度获取设备类型
  static DeviceType getDeviceType(double width) {
    if (width < breakpointSmall) return DeviceType.small;
    if (width < breakpointMedium) return DeviceType.medium;
    if (width < breakpointLarge) return DeviceType.large;
    if (width < breakpointTablet) return DeviceType.phone;
    return DeviceType.tablet;
  }
  
  /// 根据设备类型获取响应式间距
  static double getResponsiveSpacing(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.small:
        return spacingM;
      case DeviceType.medium:
      case DeviceType.large:
        return spacingL;
      case DeviceType.phone:
        return spacingL;
      case DeviceType.tablet:
        return spacingXL;
    }
  }
  
  /// 根据设备类型获取发票网格列数
  static int getInvoiceGridColumns(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.small:
      case DeviceType.medium:
      case DeviceType.large:
      case DeviceType.phone:
        return 1;
      case DeviceType.tablet:
        return 2;
    }
  }
  
  /// 根据设备类型获取报销集网格列数
  static int getReimbursementSetGridColumns(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.small:
      case DeviceType.medium:
      case DeviceType.large:
      case DeviceType.phone:
        return 1;
      case DeviceType.tablet:
        return 2;
    }
  }
  
  /// 根据设备类型获取发票卡片宽高比
  static double getInvoiceCardAspectRatio(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.small:
      case DeviceType.medium:
      case DeviceType.large:
      case DeviceType.phone:
        return invoiceCardAspectRatioMobile;
      case DeviceType.tablet:
        return invoiceCardAspectRatioTablet;
    }
  }
  
  /// 根据设备类型获取报销集卡片宽高比
  static double getReimbursementSetCardAspectRatio(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.small:
      case DeviceType.medium:
      case DeviceType.large:
      case DeviceType.phone:
        return reimbursementSetCardAspectRatioMobile;
      case DeviceType.tablet:
        return reimbursementSetCardAspectRatioTablet;
    }
  }
  
  /// 计算最优网格列数
  static int calculateOptimalColumns({
    required double availableWidth,
    required double minItemWidth,
    required double spacing,
    required EdgeInsets padding,
    int maxColumns = 3,
  }) {
    final contentWidth = availableWidth - padding.horizontal;
    final theoreticalCount = (contentWidth + spacing) / (minItemWidth + spacing);
    return theoreticalCount.floor().clamp(1, maxColumns);
  }
  
  // ==================== 其他常量 ====================
  
  /// 边框宽度
  static const double borderWidthThin = 1.0;
  static const double borderWidthNormal = 1.0;
  
  /// 卡片相关常量
  static const EdgeInsets cardMargin = EdgeInsets.all(spacingS);
  static const EdgeInsets cardPaddingLoose = EdgeInsets.all(spacingL);
  
  /// 行高 - 紧凑
  static const double lineHeightCompact = 1.2;
  
  /// 行高 - 松散
  static const double lineHeightLoose = 1.6;
  
  /// 卡片内边距
  static const EdgeInsets cardPadding = EdgeInsets.all(16.0);
  
  /// 紧凑卡片内边距
  static const EdgeInsets cardPaddingCompact = EdgeInsets.all(12.0);
  
  /// 有颜色的阴影效果
  static List<BoxShadow> shadowColored(Color color) {
    return [
      BoxShadow(
        color: color.withValues(alpha: 0.15),
        blurRadius: 4,
        offset: const Offset(0, 2),
      ),
    ];
  }
}

/// 设备类型枚举 - 基于iOS设备分类
enum DeviceType {
  small,    // iPhone SE, iPhone 12 mini
  medium,   // iPhone 12, iPhone 13
  large,    // iPhone 12 Pro Max, iPhone 13 Pro Max
  phone,    // 所有iPhone（通用）
  tablet,   // iPad
}