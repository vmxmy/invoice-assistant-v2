import 'package:flutter/cupertino.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:invoice_assistant/core/theme/cupertino_theme_manager.dart';
import 'package:invoice_assistant/core/widgets/atoms/app_button.dart';

void main() {
  group('AppButton', () {
    late CupertinoThemeManager themeManager;

    setUp(() {
      themeManager = CupertinoThemeManager();
    });

    Widget createTestWidget(Widget child) {
      return ChangeNotifierProvider<CupertinoThemeManager>.value(
        value: themeManager,
        child: CupertinoApp(
          home: CupertinoPageScaffold(
            child: child,
          ),
        ),
      );
    }

    testWidgets('should render with default properties',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestWidget(
          const AppButton(
            text: 'Test Button',
          ),
        ),
      );

      expect(find.text('Test Button'), findsOneWidget);
      expect(find.byType(AppButton), findsOneWidget);
    });

    testWidgets('should handle onPressed callback',
        (WidgetTester tester) async {
      bool wasPressed = false;

      await tester.pumpWidget(
        createTestWidget(
          AppButton(
            text: 'Test Button',
            onPressed: () {
              wasPressed = true;
            },
          ),
        ),
      );

      await tester.tap(find.text('Test Button'));
      await tester.pumpAndSettle();

      expect(wasPressed, isTrue);
    });

    testWidgets('should be disabled when onPressed is null',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestWidget(
          const AppButton(
            text: 'Disabled Button',
            onPressed: null,
          ),
        ),
      );

      final button =
          tester.widget<CupertinoButton>(find.byType(CupertinoButton));
      expect(button.onPressed, isNull);
    });

    testWidgets('should show loading state', (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestWidget(
          const AppButton(
            text: 'Test Button',
            loading: true,
          ),
        ),
      );

      expect(find.byType(CupertinoActivityIndicator), findsOneWidget);
      expect(find.text('加载中...'), findsOneWidget);
    });

    testWidgets('should show icon when provided', (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestWidget(
          AppButton(
            text: 'Test Button',
            icon: CupertinoIcons.heart,
            onPressed: () {},
          ),
        ),
      );

      expect(find.byIcon(CupertinoIcons.heart), findsOneWidget);
      expect(find.text('Test Button'), findsOneWidget);
    });

    testWidgets('should apply semantic label', (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestWidget(
          AppButton(
            text: 'Test Button',
            semanticLabel: 'Custom Semantic Label',
            onPressed: () {},
          ),
        ),
      );

      final semantics = tester.getSemantics(find.byType(AppButton));
      expect(semantics.label, equals('Custom Semantic Label'));
    });

    testWidgets('should use text as semantic label when semanticLabel is null',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestWidget(
          AppButton(
            text: 'Test Button',
            onPressed: () {},
          ),
        ),
      );

      final semantics = tester.getSemantics(find.byType(AppButton));
      expect(semantics.label, equals('Test Button'));
    });

    testWidgets('should apply fullWidth when specified',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestWidget(
          AppButton(
            text: 'Full Width Button',
            fullWidth: true,
            onPressed: () {},
          ),
        ),
      );

      final sizedBox = tester.widget<SizedBox>(
        find
            .descendant(
              of: find.byType(AppButton),
              matching: find.byType(SizedBox),
            )
            .first,
      );

      expect(sizedBox.width, equals(double.infinity));
    });

    group('Button Styles', () {
      testWidgets('should render filled style', (WidgetTester tester) async {
        await tester.pumpWidget(
          createTestWidget(
            AppButton(
              text: 'Filled Button',
              style: AppButtonStyle.filled,
              onPressed: () {},
            ),
          ),
        );

        expect(find.text('Filled Button'), findsOneWidget);
        expect(find.byType(AppButton), findsOneWidget);
      });

      testWidgets('should render ghost style with border',
          (WidgetTester tester) async {
        await tester.pumpWidget(
          createTestWidget(
            AppButton(
              text: 'Ghost Button',
              style: AppButtonStyle.ghost,
              onPressed: () {},
            ),
          ),
        );

        expect(find.text('Ghost Button'), findsOneWidget);
        expect(find.byType(Container), findsOneWidget); // Container for border
      });

      testWidgets('should render destructive style',
          (WidgetTester tester) async {
        await tester.pumpWidget(
          createTestWidget(
            AppButton(
              text: 'Destructive Button',
              style: AppButtonStyle.destructive,
              onPressed: () {},
            ),
          ),
        );

        expect(find.text('Destructive Button'), findsOneWidget);
        expect(find.byType(AppButton), findsOneWidget);
      });
    });

    group('Button Sizes', () {
      testWidgets('should render small size', (WidgetTester tester) async {
        await tester.pumpWidget(
          createTestWidget(
            AppButton(
              text: 'Small Button',
              size: AppButtonSize.small,
              onPressed: () {},
            ),
          ),
        );

        final sizedBox = tester.widget<SizedBox>(
          find
              .descendant(
                of: find.byType(AppButton),
                matching: find.byType(SizedBox),
              )
              .first,
        );

        expect(sizedBox.height, equals(44.0));
      });

      testWidgets('should render medium size', (WidgetTester tester) async {
        await tester.pumpWidget(
          createTestWidget(
            AppButton(
              text: 'Medium Button',
              size: AppButtonSize.medium,
              onPressed: () {},
            ),
          ),
        );

        final sizedBox = tester.widget<SizedBox>(
          find
              .descendant(
                of: find.byType(AppButton),
                matching: find.byType(SizedBox),
              )
              .first,
        );

        expect(sizedBox.height, equals(50.0));
      });

      testWidgets('should render large size', (WidgetTester tester) async {
        await tester.pumpWidget(
          createTestWidget(
            AppButton(
              text: 'Large Button',
              size: AppButtonSize.large,
              onPressed: () {},
            ),
          ),
        );

        final sizedBox = tester.widget<SizedBox>(
          find
              .descendant(
                of: find.byType(AppButton),
                matching: find.byType(SizedBox),
              )
              .first,
        );

        expect(sizedBox.height, equals(56.0));
      });
    });
  });
}
