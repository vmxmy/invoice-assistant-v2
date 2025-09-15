import 'package:flutter/cupertino.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:invoice_assistant/core/utils/cupertino_dialog_utils.dart';

void main() {
  group('CupertinoDialogUtils Tests', () {
    late Widget testApp;

    setUp(() {
      testApp = CupertinoApp(
        home: const CupertinoPageScaffold(
          child: Center(
            child: Text('Test App'),
          ),
        ),
      );
    });

    testWidgets('showConfirmDialog - 显示确认对话框', (WidgetTester tester) async {
      await tester.pumpWidget(testApp);

      // 显示确认对话框
      late bool? result;
      final context = tester.element(find.byType(CupertinoPageScaffold));

      final future = CupertinoDialogUtils.showConfirmDialog(
        context,
        title: '删除确认',
        message: '确定要删除这个项目吗？',
        confirmText: '删除',
        cancelText: '取消',
        isDestructive: true,
      );

      await tester.pumpAndSettle();

      // 验证对话框元素
      expect(find.text('删除确认'), findsOneWidget);
      expect(find.text('确定要删除这个项目吗？'), findsOneWidget);
      expect(find.text('删除'), findsOneWidget);
      expect(find.text('取消'), findsOneWidget);

      // 点击确认按钮
      await tester.tap(find.text('删除'));
      await tester.pumpAndSettle();

      result = await future;
      expect(result, isTrue);
    });

    testWidgets('showInfoDialog - 显示信息对话框', (WidgetTester tester) async {
      await tester.pumpWidget(testApp);

      final context = tester.element(find.byType(CupertinoPageScaffold));

      final future = CupertinoDialogUtils.showInfoDialog(
        context,
        title: '提示信息',
        message: '这是一条重要信息',
        buttonText: '知道了',
      );

      await tester.pumpAndSettle();

      // 验证对话框元素
      expect(find.text('提示信息'), findsOneWidget);
      expect(find.text('这是一条重要信息'), findsOneWidget);
      expect(find.text('知道了'), findsOneWidget);
      expect(find.byIcon(CupertinoIcons.info_circle), findsOneWidget);

      // 点击按钮
      await tester.tap(find.text('知道了'));
      await tester.pumpAndSettle();

      final result = await future;
      expect(result, isTrue);
    });

    testWidgets('showErrorDialog - 显示错误对话框', (WidgetTester tester) async {
      await tester.pumpWidget(testApp);

      final context = tester.element(find.byType(CupertinoPageScaffold));

      final future = CupertinoDialogUtils.showErrorDialog(
        context,
        title: '操作失败',
        message: '网络连接超时，请重试',
        buttonText: '重试',
      );

      await tester.pumpAndSettle();

      // 验证对话框元素
      expect(find.text('操作失败'), findsOneWidget);
      expect(find.text('网络连接超时，请重试'), findsOneWidget);
      expect(find.text('重试'), findsOneWidget);
      expect(
          find.byIcon(CupertinoIcons.exclamationmark_circle), findsOneWidget);

      // 点击按钮
      await tester.tap(find.text('重试'));
      await tester.pumpAndSettle();

      final result = await future;
      expect(result, isTrue);
    });

    testWidgets('showSuccessDialog - 显示成功对话框', (WidgetTester tester) async {
      await tester.pumpWidget(testApp);

      final context = tester.element(find.byType(CupertinoPageScaffold));

      final future = CupertinoDialogUtils.showSuccessDialog(
        context,
        title: '操作成功',
        message: '文件已成功上传',
        buttonText: '完成',
      );

      await tester.pumpAndSettle();

      // 验证对话框元素
      expect(find.text('操作成功'), findsOneWidget);
      expect(find.text('文件已成功上传'), findsOneWidget);
      expect(find.text('完成'), findsOneWidget);
      expect(find.byIcon(CupertinoIcons.checkmark_circle), findsOneWidget);

      // 点击按钮
      await tester.tap(find.text('完成'));
      await tester.pumpAndSettle();

      final result = await future;
      expect(result, isTrue);
    });

    testWidgets('showChoiceDialog - 显示选择对话框', (WidgetTester tester) async {
      await tester.pumpWidget(testApp);

      final context = tester.element(find.byType(CupertinoPageScaffold));

      final options = [
        DialogOption(
          value: 'edit',
          label: '编辑',
          icon: CupertinoIcons.pen,
          isDefault: true,
        ),
        DialogOption(
          value: 'delete',
          label: '删除',
          icon: CupertinoIcons.delete,
          isDestructive: true,
        ),
      ];

      final future = CupertinoDialogUtils.showChoiceDialog<String>(
        context,
        title: '选择操作',
        message: '请选择要执行的操作',
        options: options,
        cancelText: '取消',
      );

      await tester.pumpAndSettle();

      // 验证对话框元素
      expect(find.text('选择操作'), findsOneWidget);
      expect(find.text('请选择要执行的操作'), findsOneWidget);
      expect(find.text('编辑'), findsOneWidget);
      expect(find.text('删除'), findsOneWidget);
      expect(find.text('取消'), findsOneWidget);
      expect(find.byIcon(CupertinoIcons.pen), findsOneWidget);
      expect(find.byIcon(CupertinoIcons.delete), findsOneWidget);

      // 点击编辑选项
      await tester.tap(find.text('编辑'));
      await tester.pumpAndSettle();

      final result = await future;
      expect(result, equals('edit'));
    });

    testWidgets('showInputDialog - 显示输入对话框', (WidgetTester tester) async {
      await tester.pumpWidget(testApp);

      final context = tester.element(find.byType(CupertinoPageScaffold));

      final future = CupertinoDialogUtils.showInputDialog(
        context,
        title: '输入名称',
        message: '请输入新的文件名',
        placeholder: '文件名',
        initialValue: 'document',
        confirmText: '确认',
        cancelText: '取消',
        validator: (value) {
          if (value == null || value.isEmpty) {
            return '文件名不能为空';
          }
          if (value.length < 3) {
            return '文件名至少3个字符';
          }
          return null;
        },
      );

      await tester.pumpAndSettle();

      // 验证对话框元素
      expect(find.text('输入名称'), findsOneWidget);
      expect(find.text('请输入新的文件名'), findsOneWidget);
      expect(find.text('确认'), findsOneWidget);
      expect(find.text('取消'), findsOneWidget);

      // 查找输入框
      final textFieldFinder = find.byType(CupertinoTextField);
      expect(textFieldFinder, findsOneWidget);

      // 修改输入内容
      await tester.enterText(textFieldFinder, 'new_document');
      await tester.pump();

      // 点击确认按钮
      await tester.tap(find.text('确认'));
      await tester.pumpAndSettle();

      final result = await future;
      expect(result, equals('new_document'));
    });

    testWidgets('showInputDialog - 验证输入验证', (WidgetTester tester) async {
      await tester.pumpWidget(testApp);

      final context = tester.element(find.byType(CupertinoPageScaffold));

      final future = CupertinoDialogUtils.showInputDialog(
        context,
        title: '输入名称',
        message: '请输入新的文件名',
        placeholder: '文件名',
        confirmText: '确认',
        cancelText: '取消',
        validator: (value) {
          if (value == null || value.isEmpty) {
            return '文件名不能为空';
          }
          if (value.length < 3) {
            return '文件名至少3个字符';
          }
          return null;
        },
      );

      await tester.pumpAndSettle();

      // 输入无效内容
      final textFieldFinder = find.byType(CupertinoTextField);
      await tester.enterText(textFieldFinder, 'ab');
      await tester.pump();

      // 点击确认按钮（应该显示错误）
      await tester.tap(find.text('确认'));
      await tester.pumpAndSettle();

      // 验证错误消息显示
      expect(find.text('文件名至少3个字符'), findsOneWidget);

      // 输入有效内容
      await tester.enterText(textFieldFinder, 'valid_name');
      await tester.pump();

      // 再次点击确认按钮
      await tester.tap(find.text('确认'));
      await tester.pumpAndSettle();

      final result = await future;
      expect(result, equals('valid_name'));
    });

    testWidgets('showBottomSheet - 显示底部弹窗', (WidgetTester tester) async {
      await tester.pumpWidget(testApp);

      final context = tester.element(find.byType(CupertinoPageScaffold));

      final actions = [
        DialogOption(
          value: 'camera',
          label: '拍照',
          icon: CupertinoIcons.camera,
        ),
        DialogOption(
          value: 'gallery',
          label: '从相册选择',
          icon: CupertinoIcons.photo,
          isDefault: true,
        ),
        DialogOption(
          value: 'remove',
          label: '移除图片',
          icon: CupertinoIcons.trash,
          isDestructive: true,
        ),
      ];

      final future = CupertinoDialogUtils.showBottomSheet<String>(
        context,
        title: '选择图片来源',
        message: '请选择图片的来源方式',
        actions: actions,
        cancelText: '取消',
      );

      await tester.pumpAndSettle();

      // 验证弹窗元素
      expect(find.text('选择图片来源'), findsOneWidget);
      expect(find.text('请选择图片的来源方式'), findsOneWidget);
      expect(find.text('拍照'), findsOneWidget);
      expect(find.text('从相册选择'), findsOneWidget);
      expect(find.text('移除图片'), findsOneWidget);
      expect(find.text('取消'), findsOneWidget);
      expect(find.byIcon(CupertinoIcons.camera), findsOneWidget);
      expect(find.byIcon(CupertinoIcons.photo), findsOneWidget);
      expect(find.byIcon(CupertinoIcons.trash), findsOneWidget);

      // 点击相册选项
      await tester.tap(find.text('从相册选择'));
      await tester.pumpAndSettle();

      final result = await future;
      expect(result, equals('gallery'));
    });

    testWidgets('showLoadingDialog - 显示加载对话框', (WidgetTester tester) async {
      await tester.pumpWidget(testApp);

      final context = tester.element(find.byType(CupertinoPageScaffold));

      CupertinoDialogUtils.showLoadingDialog(
        context,
        message: '正在处理...',
      );

      await tester.pump();

      // 验证加载对话框元素
      expect(find.text('正在处理...'), findsOneWidget);
      expect(find.byType(CupertinoActivityIndicator), findsOneWidget);

      // 手动关闭对话框
      CupertinoDialogUtils.dismissDialog(context);
      await tester.pump();

      // 验证对话框已关闭
      expect(find.text('正在处理...'), findsNothing);
    });

    // 注意: showQuickToast方法由于使用定时器，在测试环境中较复杂，
    // 在实际应用中可以通过UI测试验证其功能

    testWidgets('DialogOption - 验证选项数据类', (WidgetTester tester) async {
      final option = DialogOption(
        value: 'test',
        label: '测试选项',
        icon: CupertinoIcons.star,
        isDestructive: true,
        isDefault: false,
        semanticLabel: '测试选项的无障碍标签',
      );

      expect(option.value, equals('test'));
      expect(option.label, equals('测试选项'));
      expect(option.icon, equals(CupertinoIcons.star));
      expect(option.isDestructive, isTrue);
      expect(option.isDefault, isFalse);
      expect(option.semanticLabel, equals('测试选项的无障碍标签'));
    });

    testWidgets('空选项列表应抛出异常', (WidgetTester tester) async {
      await tester.pumpWidget(testApp);

      final context = tester.element(find.byType(CupertinoPageScaffold));

      expect(
        () => CupertinoDialogUtils.showChoiceDialog<String>(
          context,
          title: '选择操作',
          options: [], // 空列表
        ),
        throwsArgumentError,
      );

      expect(
        () => CupertinoDialogUtils.showBottomSheet<String>(
          context,
          actions: [], // 空列表
        ),
        throwsArgumentError,
      );
    });
  });
}
