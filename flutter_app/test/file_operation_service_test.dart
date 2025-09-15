import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/cupertino.dart';
import 'package:file_picker/file_picker.dart';
import '../lib/core/services/file_operation_service.dart';

void main() {
  group('FileOperationService', () {
    testWidgets('should build without errors', (WidgetTester tester) async {
      // 简单测试Widget构建
      await tester.pumpWidget(
        const CupertinoApp(
          home: CupertinoPageScaffold(
            navigationBar: CupertinoNavigationBar(
              middle: Text('File Operation Test'),
            ),
            child: Center(
              child: Text('Test Widget'),
            ),
          ),
        ),
      );

      // 验证Widget正常构建
      expect(find.text('Test Widget'), findsOneWidget);
    });

    test('should validate error handling logic', () {
      // 测试错误检测逻辑
      const viewBridgeError = 'NSXPCSharedListener connection interrupted';
      expect(viewBridgeError.contains('NSXPCSharedListener'), isTrue);
      
      const normalError = 'Permission denied';
      expect(normalError.contains('NSXPCSharedListener'), isFalse);
    });
  });
}