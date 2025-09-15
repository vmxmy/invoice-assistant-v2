import 'package:flutter/cupertino.dart';
import 'package:provider/provider.dart';

import 'cupertino_semantic_colors.dart';
import 'cupertino_theme_manager.dart';

/// Cupertino主题颜色扩展类
///
/// 为BuildContext提供便捷的Cupertino主题颜色访问方法，
/// 完全基于CupertinoThemeManager和CupertinoSemanticColors，
/// 遵循iOS Human Interface Guidelines的设计规范。
///
/// 使用示例：
/// ```dart
/// Widget build(BuildContext context) {
///   return Container(
///     color: context.backgroundColor,
///     child: Text(
///       'Hello World',
///       style: TextStyle(color: context.textColor),
///     ),
///   );
/// }
/// ```
extension CupertinoThemeExtensions on BuildContext {
  // ==================== 核心主题数据访问 ====================

  /// 获取当前Cupertino主题数据
  CupertinoThemeData get cupertinoTheme => CupertinoTheme.of(this);

  /// 获取主题管理器实例（如果可用）
  CupertinoThemeManager? get themeManager {
    try {
      return read<CupertinoThemeManager>();
    } catch (e) {
      return null;
    }
  }

  /// 判断当前是否为深色模式
  bool get isDarkMode => cupertinoTheme.brightness == Brightness.dark;

  // ==================== 主色调系统 ====================

  /// 主色调 - 来自CupertinoThemeManager或默认系统蓝色
  Color get primaryColor {
    final manager = themeManager;
    if (manager != null) {
      return manager.primaryColor;
    }
    return cupertinoTheme.primaryColor;
  }

  /// 主色调对比色 - 在主色调背景上使用的文本颜色
  Color get primaryContrastingColor {
    return cupertinoTheme.primaryContrastingColor;
  }

  // ==================== 背景颜色系统 ====================

  /// 主背景色 - 最高层级的背景颜色
  Color get backgroundColor {
    return cupertinoTheme.scaffoldBackgroundColor;
  }

  /// 次级背景色 - 分组内容的背景
  Color get secondaryBackgroundColor {
    return CupertinoSemanticColors.secondarySystemBackground.resolveFrom(this);
  }

  /// 三级背景色 - 分组背景内的内容背景
  Color get tertiaryBackgroundColor {
    return CupertinoSemanticColors.tertiarySystemBackground.resolveFrom(this);
  }

  /// 导航栏背景色
  Color get barBackgroundColor {
    return cupertinoTheme.barBackgroundColor;
  }

  // ==================== 文本颜色系统 ====================

  /// 主文本颜色 - 主要文本内容
  Color get textColor {
    return cupertinoTheme.textTheme.textStyle.color ??
        CupertinoSemanticColors.label.resolveFrom(this);
  }

  /// 次级文本颜色 - 次要文本内容
  Color get secondaryTextColor {
    return CupertinoSemanticColors.secondaryLabel.resolveFrom(this);
  }

  /// 三级文本颜色 - 占位符文本
  Color get tertiaryTextColor {
    return CupertinoSemanticColors.tertiaryLabel.resolveFrom(this);
  }

  /// 四级文本颜色 - 禁用文本
  Color get quaternaryTextColor {
    return CupertinoSemanticColors.quaternaryLabel.resolveFrom(this);
  }

  /// 导航标题颜色
  Color get navTitleColor {
    return cupertinoTheme.textTheme.navTitleTextStyle.color ?? textColor;
  }

  /// 操作文本颜色（链接、按钮等）
  Color get actionTextColor {
    return cupertinoTheme.textTheme.actionTextStyle.color ?? primaryColor;
  }

  // ==================== 分隔符和边框颜色 ====================

  /// 边框颜色 - 标准分隔符
  Color get borderColor {
    return CupertinoSemanticColors.separator.resolveFrom(this);
  }

  /// 不透明边框颜色
  Color get opaqueBorderColor {
    return CupertinoSemanticColors.opaqueSeparator.resolveFrom(this);
  }

  // ==================== 填充颜色系统 ====================

  /// 系统填充色 - 薄材质上的覆盖层
  Color get systemFillColor {
    return CupertinoSemanticColors.systemFill.resolveFrom(this);
  }

  /// 次级系统填充色 - 中等厚度材质上的覆盖层
  Color get secondarySystemFillColor {
    return CupertinoSemanticColors.secondarySystemFill.resolveFrom(this);
  }

  /// 三级系统填充色 - 厚材质上的覆盖层
  Color get tertiarySystemFillColor {
    return CupertinoSemanticColors.tertiarySystemFill.resolveFrom(this);
  }

  /// 四级系统填充色 - 最厚材质上的覆盖层
  Color get quaternarySystemFillColor {
    return CupertinoSemanticColors.quaternarySystemFill.resolveFrom(this);
  }

  // ==================== 功能性颜色 ====================

  /// 错误颜色 - 错误状态、危险操作
  Color get errorColor {
    return CupertinoSemanticColors.error.resolveFrom(this);
  }

  /// 成功颜色 - 成功状态、确认操作
  Color get successColor {
    return CupertinoSemanticColors.success.resolveFrom(this);
  }

  /// 警告颜色 - 警告状态、需要注意
  Color get warningColor {
    return CupertinoSemanticColors.warning.resolveFrom(this);
  }

  /// 信息颜色 - 信息提示
  Color get infoColor {
    return CupertinoSemanticColors.info.resolveFrom(this);
  }

  /// 次要操作颜色
  Color get secondaryColor {
    return CupertinoSemanticColors.secondary.resolveFrom(this);
  }

  // ==================== 状态颜色 ====================

  /// 激活状态颜色
  Color get activeColor {
    return CupertinoSemanticColors.active.resolveFrom(this);
  }

  /// 选中状态颜色
  Color get selectedColor {
    return CupertinoSemanticColors.selected.resolveFrom(this);
  }

  /// 禁用状态颜色
  Color get disabledColor {
    return CupertinoSemanticColors.disabled.resolveFrom(this);
  }

  /// 占位符颜色
  Color get placeholderColor {
    return CupertinoSemanticColors.placeholder.resolveFrom(this);
  }

  // ==================== 灰色系统 ====================

  /// 系统灰色 - 层级1（最浅）
  Color get systemGrayColor {
    return CupertinoSemanticColors.systemGray.resolveFrom(this);
  }

  /// 系统灰色 - 层级2
  Color get systemGray2Color {
    return CupertinoSemanticColors.systemGray2.resolveFrom(this);
  }

  /// 系统灰色 - 层级3
  Color get systemGray3Color {
    return CupertinoSemanticColors.systemGray3.resolveFrom(this);
  }

  /// 系统灰色 - 层级4
  Color get systemGray4Color {
    return CupertinoSemanticColors.systemGray4.resolveFrom(this);
  }

  /// 系统灰色 - 层级5
  Color get systemGray5Color {
    return CupertinoSemanticColors.systemGray5.resolveFrom(this);
  }

  /// 系统灰色 - 层级6（最深）
  Color get systemGray6Color {
    return CupertinoSemanticColors.systemGray6.resolveFrom(this);
  }

  // ==================== 业务语义颜色 ====================

  /// 发票相关颜色
  Color get invoiceColor {
    return CupertinoSemanticColors.invoice.resolveFrom(this);
  }

  /// 报销集相关颜色
  Color get reimbursementSetColor {
    return CupertinoSemanticColors.reimbursementSet.resolveFrom(this);
  }

  /// 导出操作颜色
  Color get exportColor {
    return CupertinoSemanticColors.export.resolveFrom(this);
  }

  /// 分享操作颜色
  Color get shareColor {
    return CupertinoSemanticColors.share.resolveFrom(this);
  }

  /// 编辑操作颜色
  Color get editColor {
    return CupertinoSemanticColors.edit.resolveFrom(this);
  }

  /// 删除操作颜色
  Color get deleteColor {
    return CupertinoSemanticColors.delete.resolveFrom(this);
  }

  /// 收藏操作颜色
  Color get favoriteColor {
    return CupertinoSemanticColors.favorite.resolveFrom(this);
  }

  /// 归档操作颜色
  Color get archiveColor {
    return CupertinoSemanticColors.archive.resolveFrom(this);
  }

  // ==================== 工具方法 ====================

  /// 根据操作类型获取对应颜色
  Color getActionColor(String action) {
    return CupertinoSemanticColors.getActionColor(action).resolveFrom(this);
  }

  /// 根据状态获取对应颜色
  Color getStatusColor(String status) {
    return CupertinoSemanticColors.getStatusColor(status).resolveFrom(this);
  }

  /// 根据分类获取对应颜色
  Color getCategoryColor(String category) {
    return CupertinoSemanticColors.getCategoryColor(category).resolveFrom(this);
  }

  /// 为颜色添加透明度
  Color withColorAlpha(Color color, double alpha) {
    return color.withValues(alpha: alpha);
  }

  /// 获取颜色的对比色（自动判断深浅）
  Color getContrastingColor(Color backgroundColor) {
    return backgroundColor.computeLuminance() > 0.5
        ? textColor
        : (isDarkMode ? CupertinoColors.white : CupertinoColors.black);
  }

  /// 判断颜色是否为深色
  bool isColorDark(Color color) {
    return color.computeLuminance() < 0.5;
  }

  /// 获取适合在指定背景色上显示的文本颜色
  Color getTextColorForBackground(Color backgroundColor) {
    return isColorDark(backgroundColor)
        ? CupertinoColors.white
        : CupertinoColors.black;
  }
}
