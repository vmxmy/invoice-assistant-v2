import 'package:flutter/material.dart';
import 'dart:math' as math;

/// 无障碍性和颜色对比度常量
/// 遵循 WCAG 2.1 AA 级别标准
class AccessibilityConstants {
  AccessibilityConstants._();

  // ==================== 颜色对比度标准 ====================

  /// WCAG AA 级别最小对比度比率 (4.5:1)
  static const double minContrastRatio = 4.5;

  /// WCAG AAA 级别增强对比度比率 (7:1) 
  static const double enhancedContrastRatio = 7.0;

  /// 大文本最小对比度比率 (3:1)
  static const double largeTextMinContrast = 3.0;

  // ==================== 文本大小分类 ====================

  /// 大文本大小阈值 (18pt 或 14pt 粗体)
  static const double largeTextSize = 18.0;
  static const double largeBoldTextSize = 14.0;

  // ==================== 常用语义标签 ====================

  /// 卡片操作语义标签
  static const String cardActionHint = '双击打开详情，长按进入多选模式';

  /// 删除按钮语义标签
  static const String deleteButtonLabel = '删除';
  static const String deleteButtonHint = '删除此项目';

  /// 状态徽章语义标签
  static const String statusBadgeLabel = '状态';
  static const String statusBadgeHint = '点击修改状态';

  /// 多选模式语义标签
  static const String multiSelectModeLabel = '多选模式';
  static const String selectedItemLabel = '已选中';
  static const String unselectedItemLabel = '未选中';

  /// 金额显示语义标签
  static const String amountLabel = '金额';

  /// 日期显示语义标签
  static const String dateLabel = '日期';

  /// 月份头部语义标签
  static const String monthHeaderLabel = '月份分组';
  static const String monthHeaderHint = '长按选择该月所有发票';

  /// 滑动删除语义标签
  static const String swipeDeleteLabel = '滑动删除';
  static const String swipeDeleteHint = '向左滑动显示删除选项';

  /// 底部弹出框语义标签
  static const String bottomSheetLabel = '操作选项';
  static const String confirmDialogLabel = '确认对话框';

  // ==================== 颜色对比度验证 ====================

  /// 计算相对亮度 (根据 WCAG 标准)
  static double calculateRelativeLuminance(Color color) {
    double r = _sRGBtoLinear(((color.r * 255.0).round() & 0xff) / 255.0);
    double g = _sRGBtoLinear(((color.g * 255.0).round() & 0xff) / 255.0);
    double b = _sRGBtoLinear(((color.b * 255.0).round() & 0xff) / 255.0);
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /// sRGB 到线性 RGB 转换
  static double _sRGBtoLinear(double colorChannel) {
    if (colorChannel <= 0.03928) {
      return colorChannel / 12.92;
    } else {
      return math.pow((colorChannel + 0.055) / 1.055, 2.4).toDouble();
    }
  }

  /// 计算对比度比率
  static double calculateContrastRatio(Color color1, Color color2) {
    double luminance1 = calculateRelativeLuminance(color1);
    double luminance2 = calculateRelativeLuminance(color2);
    
    double lighter = math.max(luminance1, luminance2);
    double darker = math.min(luminance1, luminance2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /// 验证颜色对比度是否符合 AA 标准
  static bool isAACompliant(Color foreground, Color background, {bool isLargeText = false}) {
    double ratio = calculateContrastRatio(foreground, background);
    double requiredRatio = isLargeText ? largeTextMinContrast : minContrastRatio;
    return ratio >= requiredRatio;
  }

  /// 验证颜色对比度是否符合 AAA 标准
  static bool isAAACompliant(Color foreground, Color background) {
    double ratio = calculateContrastRatio(foreground, background);
    return ratio >= enhancedContrastRatio;
  }

  /// 获取对比度等级描述
  static String getContrastRatingDescription(double ratio) {
    if (ratio >= enhancedContrastRatio) {
      return 'AAA级 (增强对比度)';
    } else if (ratio >= minContrastRatio) {
      return 'AA级 (标准对比度)';
    } else if (ratio >= largeTextMinContrast) {
      return '大文本AA级';
    } else {
      return '不符合无障碍标准';
    }
  }

  // ==================== 主题色彩验证 ====================

  /// 验证主题颜色的无障碍性
  static Map<String, dynamic> validateThemeColors(ColorScheme colorScheme) {
    final results = <String, dynamic>{};
    
    // 主色彩对比度验证
    results['primary_on_surface'] = {
      'ratio': calculateContrastRatio(colorScheme.primary, colorScheme.surface),
      'compliant': isAACompliant(colorScheme.primary, colorScheme.surface),
    };
    
    results['on_primary_primary'] = {
      'ratio': calculateContrastRatio(colorScheme.onPrimary, colorScheme.primary),
      'compliant': isAACompliant(colorScheme.onPrimary, colorScheme.primary),
    };
    
    results['on_surface_surface'] = {
      'ratio': calculateContrastRatio(colorScheme.onSurface, colorScheme.surface),
      'compliant': isAACompliant(colorScheme.onSurface, colorScheme.surface),
    };
    
    results['error_surface'] = {
      'ratio': calculateContrastRatio(colorScheme.error, colorScheme.surface),
      'compliant': isAACompliant(colorScheme.error, colorScheme.surface),
    };
    
    results['secondary_surface'] = {
      'ratio': calculateContrastRatio(colorScheme.secondary, colorScheme.surface),
      'compliant': isAACompliant(colorScheme.secondary, colorScheme.surface),
    };
    
    return results;
  }

  // ==================== 调试工具 ====================

  /// 打印颜色对比度信息（仅在调试模式下）
  static void debugPrintContrastInfo(Color foreground, Color background, String description) {
    assert(() {
      double ratio = calculateContrastRatio(foreground, background);
      String rating = getContrastRatingDescription(ratio);
      print('对比度分析 - $description: ${ratio.toStringAsFixed(2)}:1 ($rating)');
      return true;
    }());
  }
}