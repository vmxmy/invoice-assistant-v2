import 'package:flutter/material.dart';
import '../constants/accessibility_constants.dart';

/// 无障碍性验证工具类
/// 用于验证UI组件的无障碍性
class AccessibilityValidator {
  AccessibilityValidator._();

  /// 验证主题颜色对比度
  static AccessibilityReport validateThemeContrast(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final results = AccessibilityConstants.validateThemeColors(colorScheme);
    
    final issues = <AccessibilityIssue>[];
    
    results.forEach((key, value) {
      if (!(value['compliant'] as bool)) {
        issues.add(AccessibilityIssue(
          type: AccessibilityIssueType.contrast,
          severity: AccessibilitySeverity.error,
          description: '颜色对比度不足: $key',
          ratio: value['ratio'] as double,
          recommendation: '调整颜色以提高对比度至 ${AccessibilityConstants.minContrastRatio}:1 以上',
        ));
      }
    });
    
    return AccessibilityReport(
      issues: issues,
      totalChecks: results.length,
      passedChecks: results.values.where((v) => v['compliant'] as bool).length,
    );
  }

  /// 验证文本可读性
  static List<AccessibilityIssue> validateTextReadability(
    BuildContext context,
    TextStyle textStyle,
    Color backgroundColor,
  ) {
    final issues = <AccessibilityIssue>[];
    
    if (textStyle.color == null) return issues;
    
    final fontSize = textStyle.fontSize ?? Theme.of(context).textTheme.bodyMedium?.fontSize ?? 14.0;
    final isLargeText = fontSize >= AccessibilityConstants.largeTextSize ||
        (fontSize >= AccessibilityConstants.largeBoldTextSize && 
         (textStyle.fontWeight?.index ?? 0) >= FontWeight.bold.index);
    
    final ratio = AccessibilityConstants.calculateContrastRatio(
      textStyle.color!,
      backgroundColor,
    );
    
    if (!AccessibilityConstants.isAACompliant(textStyle.color!, backgroundColor, isLargeText: isLargeText)) {
      issues.add(AccessibilityIssue(
        type: AccessibilityIssueType.contrast,
        severity: AccessibilitySeverity.error,
        description: '文本对比度不足',
        ratio: ratio,
        recommendation: '调整前景色或背景色以提高对比度',
        element: '文本样式',
      ));
    }
    
    return issues;
  }

  /// 验证按钮可访问性
  static List<AccessibilityIssue> validateButtonAccessibility({
    required double size,
    String? semanticLabel,
    String? tooltip,
  }) {
    final issues = <AccessibilityIssue>[];
    
    // 验证最小触摸目标大小 (44x44 pt)
    const minTouchTargetSize = 44.0;
    if (size < minTouchTargetSize) {
      issues.add(AccessibilityIssue(
        type: AccessibilityIssueType.touchTarget,
        severity: AccessibilitySeverity.warning,
        description: '触摸目标过小',
        touchTargetSize: size,
        recommendation: '增加按钮大小至至少 ${minTouchTargetSize}x${minTouchTargetSize} pt',
        element: '按钮',
      ));
    }
    
    // 验证语义标签
    if (semanticLabel == null || semanticLabel.isEmpty) {
      issues.add(AccessibilityIssue(
        type: AccessibilityIssueType.semantics,
        severity: AccessibilitySeverity.warning,
        description: '缺少语义标签',
        recommendation: '为按钮添加描述性的语义标签',
        element: '按钮',
      ));
    }
    
    return issues;
  }

  /// 生成无障碍性测试报告
  static AccessibilityReport generateFullReport(BuildContext context) {
    final themeReport = validateThemeContrast(context);
    
    return AccessibilityReport(
      issues: themeReport.issues,
      totalChecks: themeReport.totalChecks,
      passedChecks: themeReport.passedChecks,
    );
  }
}

/// 无障碍性问题类型
enum AccessibilityIssueType {
  contrast,
  semantics,
  touchTarget,
  navigation,
}

/// 无障碍性问题严重程度
enum AccessibilitySeverity {
  error,
  warning,
  info,
}

/// 无障碍性问题
class AccessibilityIssue {
  final AccessibilityIssueType type;
  final AccessibilitySeverity severity;
  final String description;
  final String recommendation;
  final String? element;
  final double? ratio;
  final double? touchTargetSize;

  const AccessibilityIssue({
    required this.type,
    required this.severity,
    required this.description,
    required this.recommendation,
    this.element,
    this.ratio,
    this.touchTargetSize,
  });

  @override
  String toString() {
    return '${severity.name.toUpperCase()}: $description ($element)';
  }
}

/// 无障碍性测试报告
class AccessibilityReport {
  final List<AccessibilityIssue> issues;
  final int totalChecks;
  final int passedChecks;

  const AccessibilityReport({
    required this.issues,
    required this.totalChecks,
    required this.passedChecks,
  });

  int get failedChecks => totalChecks - passedChecks;
  double get passRate => totalChecks > 0 ? passedChecks / totalChecks : 0.0;

  /// 按严重程度分组问题
  Map<AccessibilitySeverity, List<AccessibilityIssue>> get issuesBySeverity {
    final Map<AccessibilitySeverity, List<AccessibilityIssue>> grouped = {};
    
    for (final issue in issues) {
      grouped.putIfAbsent(issue.severity, () => []).add(issue);
    }
    
    return grouped;
  }

  /// 生成简要报告
  String get summary {
    final buffer = StringBuffer();
    buffer.writeln('无障碍性测试报告');
    buffer.writeln('总检查项: $totalChecks');
    buffer.writeln('通过: $passedChecks');
    buffer.writeln('失败: $failedChecks');
    buffer.writeln('通过率: ${(passRate * 100).toStringAsFixed(1)}%');
    
    if (issues.isNotEmpty) {
      buffer.writeln('\n问题详情:');
      final grouped = issuesBySeverity;
      
      for (final severity in AccessibilitySeverity.values) {
        final severityIssues = grouped[severity] ?? [];
        if (severityIssues.isNotEmpty) {
          buffer.writeln('  ${severity.name.toUpperCase()}: ${severityIssues.length}');
        }
      }
    }
    
    return buffer.toString();
  }
}