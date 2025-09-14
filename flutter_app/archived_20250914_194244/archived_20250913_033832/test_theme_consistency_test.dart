import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../lib/core/constants/accessibility_constants.dart';
// import '../lib/core/utils/accessibility_validator.dart'; // 已删除

/// 主题一致性测试用例
/// 确保应用主题符合无障碍标准和设计规范
void main() {
  group('主题一致性测试', () {
    testWidgets('浅色主题颜色对比度测试', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.light(),
          home: Builder(
            builder: (context) {
              final report = AccessibilityValidator.validateThemeContrast(context);
              
              // 验证至少80%的颜色对比度符合标准
              expect(report.passRate, greaterThanOrEqualTo(0.8),
                reason: '浅色主题对比度通过率应不低于80%\n${report.summary}');
              
              return const Scaffold();
            },
          ),
        ),
      );
    });

    testWidgets('深色主题颜色对比度测试', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.dark(),
          home: Builder(
            builder: (context) {
              final report = AccessibilityValidator.validateThemeContrast(context);
              
              // 验证至少80%的颜色对比度符合标准
              expect(report.passRate, greaterThanOrEqualTo(0.8),
                reason: '深色主题对比度通过率应不低于80%\n${report.summary}');
              
              return const Scaffold();
            },
          ),
        ),
      );
    });

    testWidgets('主要颜色对比度具体测试', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.light(),
          home: Builder(
            builder: (context) {
              final colorScheme = Theme.of(context).colorScheme;
              
              // 测试主要文本颜色对比度
              final primaryTextRatio = AccessibilityConstants.calculateContrastRatio(
                colorScheme.onSurface,
                colorScheme.surface,
              );
              
              expect(primaryTextRatio, greaterThanOrEqualTo(AccessibilityConstants.minContrastRatio),
                reason: '主要文本对比度应符合AA标准 ($primaryTextRatio:1)');
              
              // 测试主色彩对比度
              final primaryRatio = AccessibilityConstants.calculateContrastRatio(
                colorScheme.onPrimary,
                colorScheme.primary,
              );
              
              expect(primaryRatio, greaterThanOrEqualTo(AccessibilityConstants.minContrastRatio),
                reason: '主色彩对比度应符合AA标准 ($primaryRatio:1)');
              
              // 测试错误色对比度
              final errorRatio = AccessibilityConstants.calculateContrastRatio(
                colorScheme.onError,
                colorScheme.error,
              );
              
              expect(errorRatio, greaterThanOrEqualTo(AccessibilityConstants.minContrastRatio),
                reason: '错误色对比度应符合AA标准 ($errorRatio:1)');
              
              return const Scaffold();
            },
          ),
        ),
      );
    });

    test('颜色对比度计算测试', () {
      // 测试已知对比度的颜色组合
      final blackWhiteRatio = AccessibilityConstants.calculateContrastRatio(
        Colors.black,
        Colors.white,
      );
      
      expect(blackWhiteRatio, closeTo(21.0, 0.1), 
        reason: '黑白对比度应接近21:1');
      
      // 测试相同颜色的对比度
      final sameColorRatio = AccessibilityConstants.calculateContrastRatio(
        Colors.blue,
        Colors.blue,
      );
      
      expect(sameColorRatio, closeTo(1.0, 0.1),
        reason: '相同颜色对比度应为1:1');
    });

    test('无障碍性常量测试', () {
      // 验证常量值正确
      expect(AccessibilityConstants.minContrastRatio, equals(4.5));
      expect(AccessibilityConstants.enhancedContrastRatio, equals(7.0));
      expect(AccessibilityConstants.largeTextMinContrast, equals(3.0));
      expect(AccessibilityConstants.largeTextSize, equals(18.0));
      expect(AccessibilityConstants.largeBoldTextSize, equals(14.0));
    });

    test('对比度等级描述测试', () {
      expect(AccessibilityConstants.getContrastRatingDescription(8.0), 
        equals('AAA级 (增强对比度)'));
      expect(AccessibilityConstants.getContrastRatingDescription(5.0), 
        equals('AA级 (标准对比度)'));
      expect(AccessibilityConstants.getContrastRatingDescription(3.5), 
        equals('大文本AA级'));
      expect(AccessibilityConstants.getContrastRatingDescription(2.0), 
        equals('不符合无障碍标准'));
    });

    testWidgets('按钮可访问性测试', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ElevatedButton(
              onPressed: () {},
              child: const Text('测试按钮'),
            ),
          ),
        ),
      );

      // 测试按钮尺寸
      final buttonFinder = find.byType(ElevatedButton);
      expect(buttonFinder, findsOneWidget);

      final buttonWidget = tester.widget<ElevatedButton>(buttonFinder);
      expect(buttonWidget.child, isA<Text>());

      // 测试按钮可点击区域
      final buttonSize = tester.getSize(buttonFinder);
      expect(buttonSize.height, greaterThanOrEqualTo(44.0), 
        reason: '按钮高度应至少44pt以确保易于点击');
      expect(buttonSize.width, greaterThanOrEqualTo(44.0),
        reason: '按钮宽度应至少44pt以确保易于点击');
    });

    testWidgets('语义标签存在性测试', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                Semantics(
                  label: AccessibilityConstants.cardActionHint,
                  child: Container(
                    height: 100,
                    width: 100,
                    color: Colors.blue,
                  ),
                ),
                Semantics(
                  label: AccessibilityConstants.deleteButtonLabel,
                  child: IconButton(
                    onPressed: () {},
                    icon: const Icon(Icons.delete),
                  ),
                ),
              ],
            ),
          ),
        ),
      );

      // 验证语义组件存在
      expect(find.bySemanticsLabel(AccessibilityConstants.cardActionHint), findsOneWidget);
      expect(find.bySemanticsLabel(AccessibilityConstants.deleteButtonLabel), findsOneWidget);
    });

    group('文本可读性测试', () {
      testWidgets('大文本对比度要求', (WidgetTester tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              backgroundColor: Colors.white,
              body: Text(
                '大文本测试',
                style: TextStyle(
                  fontSize: AccessibilityConstants.largeTextSize,
                  color: Colors.grey[600], // 较低对比度
                ),
              ),
            ),
          ),
        );

        final textWidget = tester.widget<Text>(find.byType(Text));
        final issues = AccessibilityValidator.validateTextReadability(
          tester.element(find.byType(Scaffold)),
          textWidget.style!,
          Colors.white,
        );

        // 大文本的对比度要求较低，应该通过
        expect(issues, isEmpty, reason: '大文本应该通过较低的对比度要求');
      });

      testWidgets('普通文本对比度要求', (WidgetTester tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              backgroundColor: Colors.white,
              body: Text(
                '普通文本测试',
                style: TextStyle(
                  fontSize: 14.0,
                  color: Colors.grey[600], // 较低对比度
                ),
              ),
            ),
          ),
        );

        final textWidget = tester.widget<Text>(find.byType(Text));
        final issues = AccessibilityValidator.validateTextReadability(
          tester.element(find.byType(Scaffold)),
          textWidget.style!,
          Colors.white,
        );

        // 普通文本的对比度要求较高，可能不通过
        expect(issues.isNotEmpty, isTrue, reason: '较低对比度的普通文本应该被标记为问题');
      });
    });

    group('AccessibilityValidator 测试', () {
      test('按钮可访问性验证', () {
        // 测试小按钮
        var issues = AccessibilityValidator.validateButtonAccessibility(
          size: 30.0,
          semanticLabel: null,
        );
        
        expect(issues.length, equals(2), reason: '小按钮且无语义标签应有2个问题');
        expect(issues.any((i) => i.type == AccessibilityIssueType.touchTarget), isTrue);
        expect(issues.any((i) => i.type == AccessibilityIssueType.semantics), isTrue);

        // 测试合规按钮
        issues = AccessibilityValidator.validateButtonAccessibility(
          size: 50.0,
          semanticLabel: '删除按钮',
        );
        
        expect(issues, isEmpty, reason: '大尺寸且有语义标签的按钮应无问题');
      });

      test('AccessibilityReport 功能测试', () {
        final issues = [
          AccessibilityIssue(
            type: AccessibilityIssueType.contrast,
            severity: AccessibilitySeverity.error,
            description: '对比度不足',
            recommendation: '调整颜色',
            ratio: 3.0,
          ),
          AccessibilityIssue(
            type: AccessibilityIssueType.semantics,
            severity: AccessibilitySeverity.warning,
            description: '缺少标签',
            recommendation: '添加语义标签',
          ),
        ];

        final report = AccessibilityReport(
          issues: issues,
          totalChecks: 5,
          passedChecks: 3,
        );

        expect(report.failedChecks, equals(2));
        expect(report.passRate, equals(0.6));
        expect(report.issuesBySeverity[AccessibilitySeverity.error]?.length, equals(1));
        expect(report.issuesBySeverity[AccessibilitySeverity.warning]?.length, equals(1));
        expect(report.summary, contains('通过率: 60.0%'));
      });
    });
  });
}