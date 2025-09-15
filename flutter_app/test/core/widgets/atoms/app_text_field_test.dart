import 'package:flutter/cupertino.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:invoice_assistant/core/widgets/atoms/app_text_field.dart';

/// AppTextField 组件单元测试
///
/// 测试覆盖：
/// - 基础功能
/// - 输入类型
/// - 验证状态
/// - 便捷构造器
/// - 用户交互
void main() {
  group('AppTextField Tests', () {
    testWidgets('基础文本输入测试', (WidgetTester tester) async {
      final controller = TextEditingController();
      String? changedValue;

      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: AppTextField(
              controller: controller,
              placeholder: '请输入文本',
              onChanged: (value) => changedValue = value,
            ),
          ),
        ),
      );

      // 查找输入框
      final textField = find.byType(CupertinoTextField);
      expect(textField, findsOneWidget);

      // 查找占位符
      expect(find.text('请输入文本'), findsOneWidget);

      // 输入文本
      await tester.enterText(textField, 'Hello World');
      await tester.pump();

      // 验证回调和控制器
      expect(changedValue, equals('Hello World'));
      expect(controller.text, equals('Hello World'));
    });

    testWidgets('密码输入框测试', (WidgetTester tester) async {
      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: AppTextField.password(),
          ),
        ),
      );

      // 查找密码输入框
      final textField = find.byType(CupertinoTextField);
      expect(textField, findsOneWidget);

      // 查找前缀锁定图标
      expect(find.byIcon(CupertinoIcons.lock), findsOneWidget);

      // 查找显示/隐藏密码按钮
      final eyeButton = find.byIcon(CupertinoIcons.eye_slash);
      expect(eyeButton, findsOneWidget);

      // 点击显示密码按钮
      await tester.tap(eyeButton);
      await tester.pump();

      // 验证图标变化为眼睛图标
      expect(find.byIcon(CupertinoIcons.eye), findsOneWidget);
    });

    testWidgets('邮箱输入框测试', (WidgetTester tester) async {
      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: AppTextField.email(),
          ),
        ),
      );

      // 查找邮件图标
      expect(find.byIcon(CupertinoIcons.mail), findsOneWidget);

      // 输入邮箱文本
      final textField = find.byType(CupertinoTextField);
      await tester.enterText(textField, 'test@example.com');
      await tester.pump();

      // 查找清除按钮（因为showClearButton为true且有文本）
      await tester.pumpAndSettle();
      expect(find.byIcon(CupertinoIcons.clear_circled_solid), findsOneWidget);
    });

    testWidgets('搜索输入框测试', (WidgetTester tester) async {
      String? submittedValue;

      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: AppTextField.search(
              onSubmitted: (value) => submittedValue = value,
            ),
          ),
        ),
      );

      // 查找搜索图标
      expect(find.byIcon(CupertinoIcons.search), findsOneWidget);

      // 输入搜索文本并提交
      final textField = find.byType(CupertinoTextField);
      await tester.enterText(textField, 'search query');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pump();

      // 验证提交回调
      expect(submittedValue, equals('search query'));
    });

    testWidgets('数字输入框测试', (WidgetTester tester) async {
      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: AppTextField.number(
              maxLength: 5,
            ),
          ),
        ),
      );

      final textField = find.byType(CupertinoTextField);

      // 输入数字
      await tester.enterText(textField, '12345');
      await tester.pumpAndSettle();

      // 验证字符计数显示
      expect(find.textContaining('5'), findsOneWidget);
    });

    testWidgets('多行文本输入框测试', (WidgetTester tester) async {
      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: AppTextField.multiline(
              maxLength: 100,
            ),
          ),
        ),
      );

      final textField = find.byType(CupertinoTextField);

      // 输入多行文本
      await tester.enterText(textField, 'Line 1\nLine 2\nLine 3');
      await tester.pumpAndSettle();

      // 验证字符计数
      expect(find.textContaining('17'), findsOneWidget);
    });

    testWidgets('验证状态测试', (WidgetTester tester) async {
      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: AppTextField(
              placeholder: '测试验证',
              validationState: AppTextFieldValidationState.error,
              errorText: '输入错误',
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return '不能为空';
                }
                return null;
              },
            ),
          ),
        ),
      );

      // 查找错误文本 - 可能需要触发验证
      final textField = find.byType(CupertinoTextField);
      await tester.enterText(textField, '');
      await tester.pump();

      expect(find.text('输入错误'), findsOneWidget);
    });

    testWidgets('清除按钮功能测试', (WidgetTester tester) async {
      final controller = TextEditingController(text: 'test text');

      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: AppTextField(
              controller: controller,
              showClearButton: true,
            ),
          ),
        ),
      );

      // 查找清除按钮
      final clearButton = find.byIcon(CupertinoIcons.clear_circled_solid);
      expect(clearButton, findsOneWidget);

      // 点击清除按钮
      await tester.tap(clearButton);
      await tester.pump();

      // 验证文本被清空
      expect(controller.text, isEmpty);
    });

    testWidgets('前缀和后缀图标测试', (WidgetTester tester) async {
      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: AppTextField(
              prefixIcon: CupertinoIcons.person,
              suffixIcon: CupertinoIcons.checkmark,
            ),
          ),
        ),
      );

      // 验证前缀图标
      expect(find.byIcon(CupertinoIcons.person), findsOneWidget);

      // 验证后缀图标
      expect(find.byIcon(CupertinoIcons.checkmark), findsOneWidget);
    });

    testWidgets('禁用状态测试', (WidgetTester tester) async {
      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: AppTextField(
              placeholder: '禁用输入框',
              enabled: false,
            ),
          ),
        ),
      );

      final textField = find.byType(CupertinoTextField);
      expect(textField, findsOneWidget);

      // 尝试输入文本（应该无效）
      await tester.enterText(textField, 'should not work');
      await tester.pump();

      // 验证没有文本被输入
      final cupertinoTextField = tester.widget<CupertinoTextField>(textField);
      expect(cupertinoTextField.enabled, isFalse);
    });

    testWidgets('字符计数功能测试', (WidgetTester tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: AppTextField(
              controller: controller,
              showCharacterCount: true,
              maxLength: 20,
            ),
          ),
        ),
      );

      // 初始字符计数
      expect(find.text('0/20'), findsOneWidget);

      // 输入文本
      await tester.enterText(find.byType(CupertinoTextField), 'Hello');
      await tester.pumpAndSettle();

      // 验证字符计数更新
      expect(find.textContaining('5'), findsOneWidget);
    });

    test('输入类型键盘映射测试', () {
      // 创建不同类型的输入框并验证键盘类型
      final emailField = AppTextField.email();
      final numberField = AppTextField.number();
      final searchField = AppTextField.search();
      final multilineField = AppTextField.multiline();

      expect(emailField.type, equals(AppTextFieldType.email));
      expect(numberField.type, equals(AppTextFieldType.number));
      expect(searchField.type, equals(AppTextFieldType.search));
      expect(multilineField.type, equals(AppTextFieldType.multiline));
    });

    test('验证状态枚举测试', () {
      // 验证所有验证状态枚举值
      expect(AppTextFieldValidationState.values.length, equals(4));
      expect(AppTextFieldValidationState.values,
          contains(AppTextFieldValidationState.normal));
      expect(AppTextFieldValidationState.values,
          contains(AppTextFieldValidationState.error));
      expect(AppTextFieldValidationState.values,
          contains(AppTextFieldValidationState.success));
      expect(AppTextFieldValidationState.values,
          contains(AppTextFieldValidationState.warning));
    });
  });
}
