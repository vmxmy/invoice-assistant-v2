/// 收件箱组件专用主题常量
/// 基于全局主题常量，为收件箱相关组件提供统一的样式常量
library;

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

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
  static const EdgeInsets emailListItemPadding = EdgeInsets.all(16.0);
  
  /// 邮件列表项紧凑内边距
  static const EdgeInsets emailListItemPaddingCompact = EdgeInsets.all(12.0);
  
  /// 统计组件外边距
  static const EdgeInsets statsWidgetMargin = EdgeInsets.fromLTRB(
    16.0,
    8.0,
    16.0,
    8.0,
  );
  
  /// 统计组件内边距
  static const EdgeInsets statsWidgetPadding = EdgeInsets.all(12.0);
  
  /// 邮件详情页面内边距
  static const EdgeInsets emailDetailPadding = EdgeInsets.fromLTRB(
    16.0,
    8.0,
    16.0,
    16.0,
  );
  
  /// 邮件详情区块内边距
  static const EdgeInsets emailDetailSectionPadding = EdgeInsets.all(12.0);
  
  /// 邮件详情区块间距
  static const double emailDetailSectionSpacing = 16.0 + 4.0;
  
  /// 邮件详情区块紧凑间距 - 用于非重要区域
  static const double emailDetailSectionSpacingCompact = 12.0;
  
  /// 邮件头部紧凑内边距
  static const EdgeInsets emailHeaderPaddingCompact = EdgeInsets.all(12.0);
  
  /// 状态区域紧凑内边距
  static const EdgeInsets statusSectionPaddingCompact = EdgeInsets.symmetric(
    horizontal: 12.0,
    vertical: 8.0,
  );
  
  /// 过滤器组件内边距
  static const EdgeInsets filterWidgetPadding = EdgeInsets.all(12.0);

  // ==================== 收件箱字体尺寸常量 ====================
  
  /// 邮件主题字体大小
  static const double emailSubjectFontSize = 16.0;
  
  /// 邮件发件人字体大小
  static const double emailSenderFontSize = 14.0;
  
  /// 邮件预览文字大小
  static const double emailPreviewFontSize = 14.0;
  
  /// 邮件时间文字大小
  static const double emailTimeFontSize = 12.0;
  
  /// 统计标签文字大小
  static const double statsLabelFontSize = 12.0;
  
  /// 统计数值文字大小
  static const double statsValueFontSize = 17.0;

  // ==================== 收件箱图标尺寸常量 ====================
  
  /// 邮件状态图标大小
  static const double emailStatusIconSize = 16.0;
  
  /// 邮件类型图标大小
  static const double emailCategoryIconSize = 16.0;
  
  /// 统计图标大小
  static const double statsIconSize = 16.0;
  
  /// 操作按钮图标大小
  static const double actionIconSize = 20.0;
  
  /// 头像图标大小（邮件详情页）- 压缩版
  static const double avatarSize = 24.0 + 4.0;
  
  /// 头像内部图标大小
  static const double avatarIconSize = 16.0;

  // ==================== 收件箱圆角常量 ====================
  
  /// 邮件列表项圆角
  static const double emailListItemRadius = 12.0;
  
  /// 邮件详情区块圆角
  static const double emailDetailSectionRadius = 12.0;
  
  /// 过滤器组件圆角
  static const double filterWidgetRadius = 16.0;
  
  /// 头像圆角
  static const double avatarRadius = avatarSize / 2;

  // ==================== 收件箱动画时长 ====================
  
  /// 邮件列表项展开/折叠动画
  static const Duration emailExpandAnimation = Duration(milliseconds: 300);
  
  /// 过滤器展开/折叠动画
  static const Duration filterExpandAnimation = Duration(milliseconds: 300);
  
  /// 状态切换动画
  static const Duration statusChangeAnimation = Duration(milliseconds: 200);

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