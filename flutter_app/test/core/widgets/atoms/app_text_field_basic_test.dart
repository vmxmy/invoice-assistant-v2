import 'package:flutter/cupertino.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:invoice_assistant/core/widgets/atoms/app_text_field.dart';

/// AppTextField 基础功能测试
void main() {
  group('AppTextField Basic Tests', () {
    testWidgets('基础文本输入创建测试', (WidgetTester tester) async {
      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: AppTextField(
              placeholder: '测试占位符',
            ),
          ),
        ),
      );

      // 验证组件成功创建
      expect(find.byType(AppTextField), findsOneWidget);
      expect(find.byType(CupertinoTextField), findsOneWidget);
      expect(find.text('测试占位符'), findsOneWidget);
    });

    testWidgets('便捷构造器创建测试', (WidgetTester tester) async {
      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: Column(
              children: [
                AppTextField.password(),
                AppTextField.email(),
                AppTextField.search(),
                AppTextField.number(),
                AppTextField.multiline(),
              ],
            ),
          ),
        ),
      );

      // 验证所有类型的输入框都能创建
      expect(find.byType(AppTextField), findsNWidgets(5));
      expect(find.byType(CupertinoTextField), findsNWidgets(5));
    });

    test('枚举值测试', () {
      // 测试输入类型枚举
      expect(AppTextFieldType.values.length, equals(8));
      expect(AppTextFieldType.values, contains(AppTextFieldType.text));
      expect(AppTextFieldType.values, contains(AppTextFieldType.password));
      expect(AppTextFieldType.values, contains(AppTextFieldType.email));
      expect(AppTextFieldType.values, contains(AppTextFieldType.phone));
      expect(AppTextFieldType.values, contains(AppTextFieldType.number));
      expect(AppTextFieldType.values, contains(AppTextFieldType.search));
      expect(AppTextFieldType.values, contains(AppTextFieldType.multiline));
      expect(AppTextFieldType.values, contains(AppTextFieldType.url));

      // 测试验证状态枚举
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

    testWidgets('属性配置测试', (WidgetTester tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: AppTextField(
              controller: controller,
              placeholder: '测试属性',
              type: AppTextFieldType.email,
              validationState: AppTextFieldValidationState.success,
              prefixIcon: CupertinoIcons.person,
              suffixIcon: CupertinoIcons.checkmark,
              showClearButton: true,
              showCharacterCount: true,
              maxLength: 50,
              enabled: true,
              autofocus: false,
            ),
          ),
        ),
      );

      // 验证组件属性配置正确
      final textFieldWidget =
          tester.widget<AppTextField>(find.byType(AppTextField));
      expect(textFieldWidget.controller, equals(controller));
      expect(textFieldWidget.placeholder, equals('测试属性'));
      expect(textFieldWidget.type, equals(AppTextFieldType.email));
      expect(textFieldWidget.validationState,
          equals(AppTextFieldValidationState.success));
      expect(textFieldWidget.prefixIcon, equals(CupertinoIcons.person));
      expect(textFieldWidget.suffixIcon, equals(CupertinoIcons.checkmark));
      expect(textFieldWidget.showClearButton, isTrue);
      expect(textFieldWidget.showCharacterCount, isTrue);
      expect(textFieldWidget.maxLength, equals(50));
      expect(textFieldWidget.enabled, isTrue);
      expect(textFieldWidget.autofocus, isFalse);
    });

    testWidgets('回调函数测试', (WidgetTester tester) async {
      String? changedValue;
      String? submittedValue;
      bool tapped = false;

      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: AppTextField(
              placeholder: '回调测试',
              onChanged: (value) => changedValue = value,
              onSubmitted: (value) => submittedValue = value,
              onTap: () => tapped = true,
            ),
          ),
        ),
      );

      final textFieldFinder = find.byType(CupertinoTextField);

      // 测试点击回调
      await tester.tap(textFieldFinder);
      await tester.pump();
      expect(tapped, isTrue);

      // 测试文本变化回调
      await tester.enterText(textFieldFinder, '测试文本');
      await tester.pump();
      expect(changedValue, equals('测试文本'));

      // 测试提交回调
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pump();
      expect(submittedValue, equals('测试文本'));
    });

    testWidgets('验证器功能测试', (WidgetTester tester) async {
      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: AppTextField(
              placeholder: '验证测试',
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return '不能为空';
                }
                if (value.length < 3) {
                  return '长度不能少于3位';
                }
                return null;
              },
              onChanged: (value) {
                // 触发验证（在实际组件中会自动调用）
              },
            ),
          ),
        ),
      );

      // 验证器本身是正确的
      final textFieldWidget =
          tester.widget<AppTextField>(find.byType(AppTextField));
      expect(textFieldWidget.validator, isNotNull);

      // 测试验证逻辑
      expect(textFieldWidget.validator!(''), equals('不能为空'));
      expect(textFieldWidget.validator!('ab'), equals('长度不能少于3位'));
      expect(textFieldWidget.validator!('abc'), isNull);
    });

    testWidgets('静态构造器参数测试', (WidgetTester tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(
        CupertinoApp(
          home: CupertinoPageScaffold(
            child: Column(
              children: [
                AppTextField.password(
                  controller: controller,
                  placeholder: '密码测试',
                  autofocus: true,
                ),
                AppTextField.email(
                  placeholder: '邮箱测试',
                ),
                AppTextField.search(
                  placeholder: '搜索测试',
                ),
                AppTextField.number(
                  placeholder: '数字测试',
                  maxLength: 10,
                ),
                AppTextField.multiline(
                  placeholder: '多行测试',
                  maxLines: 3,
                  maxLength: 100,
                ),
              ],
            ),
          ),
        ),
      );

      final textFields =
          tester.widgetList<AppTextField>(find.byType(AppTextField));

      // 验证密码输入框
      final passwordField = textFields.elementAt(0);
      expect(passwordField.type, equals(AppTextFieldType.password));
      expect(passwordField.controller, equals(controller));
      expect(passwordField.placeholder, equals('密码测试'));
      expect(passwordField.autofocus, isTrue);

      // 验证邮箱输入框
      final emailField = textFields.elementAt(1);
      expect(emailField.type, equals(AppTextFieldType.email));
      expect(emailField.placeholder, equals('邮箱测试'));
      expect(emailField.showClearButton, isTrue);

      // 验证搜索输入框
      final searchField = textFields.elementAt(2);
      expect(searchField.type, equals(AppTextFieldType.search));
      expect(searchField.placeholder, equals('搜索测试'));
      expect(searchField.showClearButton, isTrue);

      // 验证数字输入框
      final numberField = textFields.elementAt(3);
      expect(numberField.type, equals(AppTextFieldType.number));
      expect(numberField.placeholder, equals('数字测试'));
      expect(numberField.maxLength, equals(10));

      // 验证多行输入框
      final multilineField = textFields.elementAt(4);
      expect(multilineField.type, equals(AppTextFieldType.multiline));
      expect(multilineField.placeholder, equals('多行测试'));
      expect(multilineField.maxLines, equals(3));
      expect(multilineField.maxLength, equals(100));
    });
  });
}
