import 'package:flutter/cupertino.dart';

/// Cupertino语义颜色系统
/// 
/// 提供符合iOS Human Interface Guidelines的语义颜色，
/// 自动适配深浅模式，完全替代硬编码颜色。
/// 
/// 基于iOS 15+的设计语言，提供层次化的颜色语义：
/// - 系统颜色：背景、标签、填充
/// - 功能颜色：主要、次要、成功、警告、错误
/// - 状态颜色：激活、禁用、选中
class CupertinoSemanticColors {
  CupertinoSemanticColors._();

  // ==================== 系统级语义颜色 ====================
  
  /// 主背景色 - 最高层级的背景
  static const CupertinoDynamicColor systemBackground = CupertinoColors.systemBackground;
  
  /// 次级背景色 - 分组内容的背景
  static const CupertinoDynamicColor secondarySystemBackground = CupertinoColors.secondarySystemBackground;
  
  /// 三级背景色 - 分组背景内的内容背景
  static const CupertinoDynamicColor tertiarySystemBackground = CupertinoColors.tertiarySystemBackground;
  
  /// 主标签色 - 主要文本内容
  static const CupertinoDynamicColor label = CupertinoColors.label;
  
  /// 次级标签色 - 次要文本内容
  static const CupertinoDynamicColor secondaryLabel = CupertinoColors.secondaryLabel;
  
  /// 三级标签色 - 占位符文本
  static const CupertinoDynamicColor tertiaryLabel = CupertinoColors.tertiaryLabel;
  
  /// 四级标签色 - 禁用文本
  static const CupertinoDynamicColor quaternaryLabel = CupertinoColors.quaternaryLabel;

  // ==================== 填充颜色 ====================
  
  /// 系统填充色 - 薄材质上的覆盖层
  static const CupertinoDynamicColor systemFill = CupertinoColors.systemFill;
  
  /// 次级系统填充色 - 中等厚度材质上的覆盖层
  static const CupertinoDynamicColor secondarySystemFill = CupertinoColors.secondarySystemFill;
  
  /// 三级系统填充色 - 厚材质上的覆盖层
  static const CupertinoDynamicColor tertiarySystemFill = CupertinoColors.tertiarySystemFill;
  
  /// 四级系统填充色 - 最厚材质上的覆盖层
  static const CupertinoDynamicColor quaternarySystemFill = CupertinoColors.quaternarySystemFill;

  // ==================== 分隔符和边框 ====================
  
  /// 分隔符颜色 - 列表项之间的分隔线
  static const CupertinoDynamicColor separator = CupertinoColors.separator;
  
  /// 不透明分隔符 - 不透明的分隔线
  static const CupertinoDynamicColor opaqueSeparator = CupertinoColors.opaqueSeparator;

  // ==================== 功能性语义颜色 ====================
  
  /// 主要操作色 - 主要按钮、链接
  static const CupertinoDynamicColor primary = CupertinoColors.activeBlue;
  
  /// 次要操作色 - 次要按钮
  static const CupertinoDynamicColor secondary = CupertinoColors.systemIndigo;
  
  /// 成功色 - 成功状态、确认操作
  static const CupertinoDynamicColor success = CupertinoColors.systemGreen;
  
  /// 警告色 - 警告状态、需要注意
  static const CupertinoDynamicColor warning = CupertinoColors.systemOrange;
  
  /// 错误色 - 错误状态、危险操作
  static const CupertinoDynamicColor error = CupertinoColors.systemRed;
  
  /// 信息色 - 信息提示
  static const CupertinoDynamicColor info = CupertinoColors.systemBlue;

  // ==================== 业务语义颜色 ====================
  
  /// 发票相关操作
  static const CupertinoDynamicColor invoice = CupertinoColors.systemGreen;
  
  /// 报销集相关操作
  static const CupertinoDynamicColor reimbursementSet = CupertinoColors.systemBlue;
  
  /// 导出操作
  static const CupertinoDynamicColor export = CupertinoColors.systemIndigo;
  
  /// 分享操作
  static const CupertinoDynamicColor share = CupertinoColors.systemTeal;
  
  /// 编辑操作
  static const CupertinoDynamicColor edit = CupertinoColors.systemOrange;
  
  /// 删除操作
  static const CupertinoDynamicColor delete = CupertinoColors.systemRed;
  
  /// 收藏操作
  static const CupertinoDynamicColor favorite = CupertinoColors.systemPink;
  
  /// 归档操作
  static const CupertinoDynamicColor archive = CupertinoColors.systemGrey;

  // ==================== 状态颜色 ====================
  
  /// 激活状态
  static const CupertinoDynamicColor active = CupertinoColors.activeBlue;
  
  /// 选中状态
  static const CupertinoDynamicColor selected = CupertinoColors.systemBlue;
  
  /// 禁用状态
  static const CupertinoDynamicColor disabled = CupertinoColors.inactiveGray;
  
  /// 占位符状态
  static const CupertinoDynamicColor placeholder = CupertinoColors.placeholderText;

  // ==================== 灰色层级系统 ====================
  
  /// 灰色层级1 - 最浅
  static const CupertinoDynamicColor systemGray = CupertinoColors.systemGrey;
  
  /// 灰色层级2
  static const CupertinoDynamicColor systemGray2 = CupertinoColors.systemGrey2;
  
  /// 灰色层级3
  static const CupertinoDynamicColor systemGray3 = CupertinoColors.systemGrey3;
  
  /// 灰色层级4
  static const CupertinoDynamicColor systemGray4 = CupertinoColors.systemGrey4;
  
  /// 灰色层级5
  static const CupertinoDynamicColor systemGray5 = CupertinoColors.systemGrey5;
  
  /// 灰色层级6 - 最深
  static const CupertinoDynamicColor systemGray6 = CupertinoColors.systemGrey6;

  // ==================== 颜色工具方法 ====================
  
  /// 获取操作类型对应的语义颜色
  static CupertinoDynamicColor getActionColor(String action) {
    switch (action) {
      case 'export':
        return export;
      case 'share':
        return share;
      case 'edit':
        return edit;
      case 'delete':
        return delete;
      case 'archive':
        return archive;
      case 'favorite':
        return favorite;
      case 'reimbursement':
        return reimbursementSet;
      case 'invoice':
        return invoice;
      default:
        return primary;
    }
  }
  
  /// 获取状态对应的语义颜色
  static CupertinoDynamicColor getStatusColor(String status) {
    switch (status) {
      case 'success':
      case 'completed':
      case 'approved':
        return success;
      case 'warning':
      case 'pending':
        return warning;
      case 'error':
      case 'failed':
      case 'rejected':
        return error;
      case 'info':
      case 'processing':
        return info;
      case 'disabled':
      case 'inactive':
        return disabled;
      default:
        return label;
    }
  }
  
  /// 获取分类颜色（用于邮件分类等）
  static CupertinoDynamicColor getCategoryColor(String category) {
    switch (category) {
      case 'verification':
        return info;
      case 'invoice':
        return invoice;
      case 'attachment':
        return warning;
      case 'other':
      case 'unknown':
        return systemGray;
      default:
        return systemGray2;
    }
  }
  
  /// 根据上下文解析颜色到具体Color值
  static Color resolveColor(CupertinoDynamicColor dynamicColor, BuildContext context) {
    return dynamicColor.resolveFrom(context);
  }
  
  /// 为颜色添加透明度（保持语义性）
  static CupertinoDynamicColor withAlpha(CupertinoDynamicColor color, double alpha) {
    return CupertinoDynamicColor.withBrightness(
      color: color.color.withValues(alpha: alpha),
      darkColor: color.darkColor.withValues(alpha: alpha),
    );
  }
}

/// 语义颜色扩展，为BuildContext添加便捷访问方法
extension SemanticColorsExtension on BuildContext {
  /// 获取语义颜色系统实例
  Type get semanticColors => CupertinoSemanticColors;
  
  /// 解析动态颜色
  Color resolveSemanticColor(CupertinoDynamicColor color) {
    return CupertinoSemanticColors.resolveColor(color, this);
  }
}