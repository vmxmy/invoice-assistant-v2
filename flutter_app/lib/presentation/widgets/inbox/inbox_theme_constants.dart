/// 收件箱组件专用主题常量
/// 基于全局主题常量，为收件箱相关组件提供统一的样式常量
library;

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../../core/theme/design_constants.dart';

class InboxThemeConstants {
  InboxThemeConstants._();

  // ==================== 收件箱特定颜色常量 ====================
  
  /// 邮件分类颜色系统 - 基于 Cupertino 系统颜色
  static Map<String, CupertinoDynamicColor> get categoryColors => {
    'verification': CupertinoColors.systemBlue,
    'invoice': CupertinoColors.systemGreen,
    'other': CupertinoColors.systemGrey,
    'unknown': CupertinoColors.systemGrey2,
  };
  
  /// 状态颜色系统 - 基于 Cupertino 系统颜色
  static Map<String, CupertinoDynamicColor> get statusColors => {
    'success': CupertinoColors.systemGreen,
    'warning': CupertinoColors.systemOrange,
    'error': CupertinoColors.systemRed,
    'info': CupertinoColors.systemBlue,
    'processing': CupertinoColors.systemPurple,
    'neutral': CupertinoColors.systemGrey,
  };

  // ==================== 收件箱组件尺寸常量 ====================
  
  /// 邮件列表项内边距
  static const EdgeInsets emailListItemPadding = DesignConstants.cardPadding;
  
  /// 邮件列表项紧凑内边距
  static const EdgeInsets emailListItemPaddingCompact = DesignConstants.cardPaddingCompact;
  
  /// 统计组件外边距
  static const EdgeInsets statsWidgetMargin = EdgeInsets.fromLTRB(
    DesignConstants.spacingL,
    DesignConstants.spacingS,
    DesignConstants.spacingL,
    DesignConstants.spacingS,
  );
  
  /// 统计组件内边距
  static const EdgeInsets statsWidgetPadding = DesignConstants.cardPaddingCompact;
  
  /// 邮件详情页面内边距
  static const EdgeInsets emailDetailPadding = EdgeInsets.fromLTRB(
    DesignConstants.spacingL,
    DesignConstants.spacingS,
    DesignConstants.spacingL,
    DesignConstants.spacingL,
  );
  
  /// 邮件详情区块内边距
  static const EdgeInsets emailDetailSectionPadding = DesignConstants.cardPaddingCompact;
  
  /// 邮件详情区块间距
  static const double emailDetailSectionSpacing = DesignConstants.spacingL + DesignConstants.spacingXS;
  
  /// 邮件详情区块紧凑间距 - 用于非重要区域
  static const double emailDetailSectionSpacingCompact = DesignConstants.spacingM;
  
  /// 邮件头部紧凑内边距
  static const EdgeInsets emailHeaderPaddingCompact = EdgeInsets.all(DesignConstants.spacingM);
  
  /// 状态区域紧凑内边距
  static const EdgeInsets statusSectionPaddingCompact = EdgeInsets.symmetric(
    horizontal: DesignConstants.spacingM,
    vertical: DesignConstants.spacingS,
  );
  
  /// 过滤器组件内边距
  static const EdgeInsets filterWidgetPadding = DesignConstants.cardPaddingCompact;

  // ==================== 收件箱字体尺寸常量 ====================
  
  /// 邮件主题字体大小
  static const double emailSubjectFontSize = DesignConstants.fontSizeSubtitle;
  
  /// 邮件发件人字体大小
  static const double emailSenderFontSize = DesignConstants.fontSizeBody;
  
  /// 邮件预览文字大小
  static const double emailPreviewFontSize = DesignConstants.fontSizeBody;
  
  /// 邮件时间文字大小
  static const double emailTimeFontSize = DesignConstants.fontSizeCaption;
  
  /// 统计标签文字大小
  static const double statsLabelFontSize = DesignConstants.fontSizeCaption;
  
  /// 统计数值文字大小
  static const double statsValueFontSize = DesignConstants.fontSizeTitle;

  // ==================== 收件箱图标尺寸常量 ====================
  
  /// 邮件状态图标大小
  static const double emailStatusIconSize = DesignConstants.iconSizeS;
  
  /// 邮件类型图标大小
  static const double emailCategoryIconSize = DesignConstants.iconSizeS;
  
  /// 统计图标大小
  static const double statsIconSize = DesignConstants.iconSizeS;
  
  /// 操作按钮图标大小
  static const double actionIconSize = DesignConstants.iconSizeM;
  
  /// 头像图标大小（邮件详情页）- 压缩版
  static const double avatarSize = DesignConstants.iconSizeL + DesignConstants.spacingXS;
  
  /// 头像内部图标大小
  static const double avatarIconSize = DesignConstants.iconSizeS;

  // ==================== 收件箱圆角常量 ====================
  
  /// 邮件列表项圆角
  static const double emailListItemRadius = DesignConstants.radiusMedium;
  
  /// 邮件详情区块圆角
  static const double emailDetailSectionRadius = DesignConstants.radiusMedium;
  
  /// 过滤器组件圆角
  static const double filterWidgetRadius = DesignConstants.radiusLarge;
  
  /// 头像圆角
  static const double avatarRadius = avatarSize / 2;

  // ==================== 收件箱动画时长 ====================
  
  /// 邮件列表项展开/折叠动画
  static const Duration emailExpandAnimation = DesignConstants.animationNormal;
  
  /// 过滤器展开/折叠动画
  static const Duration filterExpandAnimation = DesignConstants.animationNormal;
  
  /// 状态切换动画
  static const Duration statusChangeAnimation = DesignConstants.animationFast;

  // ==================== 实用方法 ====================
  
  /// 根据邮件分类获取主题色
  static Color getCategoryColor(String category, BuildContext context) {
    switch (category.toLowerCase()) {
      case 'verification':
        return CupertinoColors.systemBlue.resolveFrom(context);
      case 'invoice':
        return CupertinoColors.systemGreen.resolveFrom(context);
      case 'other':
        return CupertinoColors.systemOrange.resolveFrom(context);
      default:
        return CupertinoColors.systemGrey.resolveFrom(context);
    }
  }
  
  /// 根据状态获取主题色
  static Color getStatusColor(String status, BuildContext context) {
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        return CupertinoColors.systemGreen.resolveFrom(context);
      case 'warning':
      case 'pending':
        return CupertinoColors.systemOrange.resolveFrom(context);
      case 'error':
      case 'failed':
        return CupertinoColors.systemRed.resolveFrom(context);
      case 'info':
      case 'processing':
        return CupertinoColors.systemBlue.resolveFrom(context);
      default:
        return CupertinoColors.systemGrey.resolveFrom(context);
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