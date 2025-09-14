/// 收件箱组件专用主题常量
/// 基于全局主题常量，为收件箱相关组件提供统一的样式常量
library;

import 'package:flutter/material.dart';
import '../../../core/theme/component_theme_constants.dart';

class InboxThemeConstants {
  InboxThemeConstants._();

  // ==================== 收件箱特定颜色常量 ====================
  
  /// 邮件分类颜色系统 - 基于语义化主题颜色
  static const Map<String, MaterialColor> categoryColors = {
    'verification': Colors.blue,
    'invoice': Colors.green,
    'other': Colors.grey,
    'unknown': Colors.blueGrey,
  };
  
  /// 状态颜色系统 - 基于语义化主题颜色
  static const Map<String, MaterialColor> statusColors = {
    'success': Colors.green,
    'warning': Colors.orange,
    'error': Colors.red,
    'info': Colors.blue,
    'processing': Colors.purple,
    'neutral': Colors.grey,
  };

  // ==================== 收件箱组件尺寸常量 ====================
  
  /// 邮件列表项内边距
  static const EdgeInsets emailListItemPadding = ComponentThemeConstants.cardPadding;
  
  /// 邮件列表项紧凑内边距
  static const EdgeInsets emailListItemPaddingCompact = ComponentThemeConstants.cardPaddingCompact;
  
  /// 统计组件外边距
  static const EdgeInsets statsWidgetMargin = EdgeInsets.fromLTRB(
    ComponentThemeConstants.spacingL,
    ComponentThemeConstants.spacingS,
    ComponentThemeConstants.spacingL,
    ComponentThemeConstants.spacingS,
  );
  
  /// 统计组件内边距
  static const EdgeInsets statsWidgetPadding = ComponentThemeConstants.cardPaddingCompact;
  
  /// 邮件详情页面内边距
  static const EdgeInsets emailDetailPadding = EdgeInsets.fromLTRB(
    ComponentThemeConstants.spacingL,
    ComponentThemeConstants.spacingS,
    ComponentThemeConstants.spacingL,
    ComponentThemeConstants.spacingL,
  );
  
  /// 邮件详情区块内边距
  static const EdgeInsets emailDetailSectionPadding = ComponentThemeConstants.cardPaddingCompact;
  
  /// 邮件详情区块间距
  static const double emailDetailSectionSpacing = ComponentThemeConstants.spacingL + ComponentThemeConstants.spacingXS;
  
  /// 邮件详情区块紧凑间距 - 用于非重要区域
  static const double emailDetailSectionSpacingCompact = ComponentThemeConstants.spacingM;
  
  /// 邮件头部紧凑内边距
  static const EdgeInsets emailHeaderPaddingCompact = EdgeInsets.all(ComponentThemeConstants.spacingM);
  
  /// 状态区域紧凑内边距
  static const EdgeInsets statusSectionPaddingCompact = EdgeInsets.symmetric(
    horizontal: ComponentThemeConstants.spacingM,
    vertical: ComponentThemeConstants.spacingS,
  );
  
  /// 过滤器组件内边距
  static const EdgeInsets filterWidgetPadding = ComponentThemeConstants.cardPaddingCompact;

  // ==================== 收件箱字体尺寸常量 ====================
  
  /// 邮件主题字体大小
  static const double emailSubjectFontSize = ComponentThemeConstants.fontSizeSubtitle;
  
  /// 邮件发件人字体大小
  static const double emailSenderFontSize = ComponentThemeConstants.fontSizeBody;
  
  /// 邮件预览文字大小
  static const double emailPreviewFontSize = ComponentThemeConstants.fontSizeBody;
  
  /// 邮件时间文字大小
  static const double emailTimeFontSize = ComponentThemeConstants.fontSizeCaption;
  
  /// 统计标签文字大小
  static const double statsLabelFontSize = ComponentThemeConstants.fontSizeCaption;
  
  /// 统计数值文字大小
  static const double statsValueFontSize = ComponentThemeConstants.fontSizeTitle;

  // ==================== 收件箱图标尺寸常量 ====================
  
  /// 邮件状态图标大小
  static const double emailStatusIconSize = ComponentThemeConstants.iconSizeS;
  
  /// 邮件类型图标大小
  static const double emailCategoryIconSize = ComponentThemeConstants.iconSizeS;
  
  /// 统计图标大小
  static const double statsIconSize = ComponentThemeConstants.iconSizeS;
  
  /// 操作按钮图标大小
  static const double actionIconSize = ComponentThemeConstants.iconSizeM;
  
  /// 头像图标大小（邮件详情页）- 压缩版
  static const double avatarSize = ComponentThemeConstants.iconSizeL + ComponentThemeConstants.spacingXS;
  
  /// 头像内部图标大小
  static const double avatarIconSize = ComponentThemeConstants.iconSizeS;

  // ==================== 收件箱圆角常量 ====================
  
  /// 邮件列表项圆角
  static const double emailListItemRadius = ComponentThemeConstants.radiusMedium;
  
  /// 邮件详情区块圆角
  static const double emailDetailSectionRadius = ComponentThemeConstants.radiusMedium;
  
  /// 过滤器组件圆角
  static const double filterWidgetRadius = ComponentThemeConstants.radiusLarge;
  
  /// 头像圆角
  static const double avatarRadius = avatarSize / 2;

  // ==================== 收件箱动画时长 ====================
  
  /// 邮件列表项展开/折叠动画
  static const Duration emailExpandAnimation = ComponentThemeConstants.animationNormal;
  
  /// 过滤器展开/折叠动画
  static const Duration filterExpandAnimation = ComponentThemeConstants.animationNormal;
  
  /// 状态切换动画
  static const Duration statusChangeAnimation = ComponentThemeConstants.animationFast;

  // ==================== 实用方法 ====================
  
  /// 根据邮件分类获取主题色
  static Color getCategoryColor(String category, ColorScheme colorScheme) {
    switch (category.toLowerCase()) {
      case 'verification':
        return colorScheme.primary;
      case 'invoice':
        return colorScheme.tertiary;
      case 'other':
        return colorScheme.outline;
      default:
        return colorScheme.onSurface.withValues(alpha: ComponentThemeConstants.opacitySecondary);
    }
  }
  
  /// 根据状态获取主题色
  static Color getStatusColor(String status, ColorScheme colorScheme) {
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        return colorScheme.tertiary;
      case 'warning':
      case 'pending':
        return colorScheme.secondary;
      case 'error':
      case 'failed':
        return colorScheme.error;
      case 'info':
      case 'processing':
        return colorScheme.primary;
      default:
        return colorScheme.outline;
    }
  }
  
  /// 根据成功率获取颜色
  static Color getSuccessRateColor(double rate, ColorScheme colorScheme) {
    if (rate >= 0.9) return colorScheme.tertiary;
    if (rate >= 0.7) return colorScheme.secondary;
    return colorScheme.error;
  }
  
  /// 获取未读邮件强调色
  static Color getUnreadHighlightColor(ColorScheme colorScheme) {
    return colorScheme.secondary;
  }
}