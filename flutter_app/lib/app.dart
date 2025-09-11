import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'core/config/app_config.dart';
import 'core/di/injection_container.dart' as di;
import 'core/network/supabase_client.dart';
import 'presentation/bloc/invoice_bloc.dart';
import 'presentation/bloc/invoice_event.dart';
import 'presentation/bloc/reimbursement_set_bloc.dart';
import 'presentation/pages/main_page.dart';
import 'presentation/pages/login_page.dart';
import 'presentation/pages/register_page.dart';
import 'presentation/pages/invoice_detail_page.dart';
import 'presentation/pages/invoice_upload_page.dart';
import 'presentation/pages/reimbursement_set_detail_page.dart';

/// 发票助手应用根组件
class InvoiceAssistantApp extends StatelessWidget {
  const InvoiceAssistantApp({super.key});

  @override
  Widget build(BuildContext context) {
    // 打印应用配置信息（仅调试模式）
    if (AppConfig.enableLogging) {
      print('🚀 [App] 启动发票助手应用');
    }

    return MultiBlocProvider(
      providers: [
        BlocProvider<InvoiceBloc>(
          create: (context) {
            print('🏭 [App] 创建全局唯一InvoiceBloc');
            final bloc = di.sl<InvoiceBloc>();
            print('🏭 [App:${bloc.hashCode}] InvoiceBloc实例创建完成');
            return bloc
              ..add(const LoadInvoices(refresh: true))
              ..add(const LoadInvoiceStats());
          },
        ),
        BlocProvider<ReimbursementSetBloc>(
          create: (context) {
            print('🏭 [App] 创建全局唯一ReimbursementSetBloc');
            final bloc = di.sl<ReimbursementSetBloc>();
            print('🏭 [App:${bloc.hashCode}] ReimbursementSetBloc实例创建完成');
            return bloc;
          },
        ),
      ],
      child: MaterialApp.router(
        title: AppConfig.appName,
        debugShowCheckedModeBanner: false,
        
        // 使用 FlexColorScheme 主题管理 - 冷色调优雅财务应用主题
        theme: FlexThemeData.light(
          scheme: FlexScheme.deepBlue,
          surfaceMode: FlexSurfaceMode.levelSurfacesLowScaffold,
          blendLevel: 15,
          appBarStyle: FlexAppBarStyle.primary,
          appBarOpacity: 0.96,
          transparentStatusBar: true,
          appBarElevation: 0.5,
          // 统一字体管理 - 确保字体一致性
          fontFamily: null, // 使用系统默认字体以确保跨平台一致性
          subThemesData: const FlexSubThemesData(
            // 冷色调专业混合设置
            blendOnLevel: 12,
            blendOnColors: false,
            // 字体和排版 - 启用Material 3字体系统
            useMaterial3Typography: true,
            useM2StyleDividerInM3: true,
            // 组件对齐和行为
            alignedDropdown: true,
            useInputDecoratorThemeInDialogs: true,
            // 冷色调几何设计 - 专业而精致
            defaultRadius: 14.0,
            cardRadius: 18.0,
            elevatedButtonRadius: 12.0,
            filledButtonRadius: 12.0,
            outlinedButtonRadius: 12.0,
            textButtonRadius: 12.0,
            // 输入框圆角 - 冷色调偏好较小圆角
            inputDecoratorRadius: 14.0,
            // 对话框和底部表单
            dialogRadius: 20.0,
            bottomSheetRadius: 24.0,
            // 导航栏优化 - 冷色调强调清晰度
            bottomNavigationBarElevation: 8.0,
            navigationBarLabelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            navigationBarOpacity: 0.96,
            // 冷色调视觉效果
            interactionEffects: true,
            tintedDisabledControls: true,
            // FAB 样式 - 更专业的圆形设计
            fabUseShape: true,
            fabAlwaysCircular: true,
            fabRadius: 16.0,
            // 增强专业感
            adaptiveRemoveElevationTint: FlexAdaptive.off(),
            adaptiveElevationShadowsBack: FlexAdaptive.off(),
          ),
          keyColors: const FlexKeyColors(
            useSecondary: true,
            useTertiary: true,
            keepPrimary: true,
            keepSecondary: true,
            keepTertiary: true,
          ),
          visualDensity: FlexColorScheme.comfortablePlatformDensity,
          useMaterial3: true,
          swapLegacyOnMaterial3: true,
        ),
        darkTheme: FlexThemeData.dark(
          scheme: FlexScheme.deepBlue,
          surfaceMode: FlexSurfaceMode.levelSurfacesLowScaffold,
          blendLevel: 22,
          appBarStyle: FlexAppBarStyle.background,
          appBarOpacity: 0.94,
          transparentStatusBar: true,
          appBarElevation: 0,
          // 统一字体管理 - 深色主题保持字体一致性
          fontFamily: null, // 使用系统默认字体以确保跨平台一致性
          subThemesData: const FlexSubThemesData(
            // 深色冷色调专业混合设置
            blendOnLevel: 25,
            blendOnColors: false,
            // 字体和排版 - 启用Material 3字体系统
            useMaterial3Typography: true,
            useM2StyleDividerInM3: true,
            // 组件对齐和行为
            alignedDropdown: true,
            useInputDecoratorThemeInDialogs: true,
            // 深色冷色调几何设计 - 与亮色主题一致
            defaultRadius: 14.0,
            cardRadius: 18.0,
            elevatedButtonRadius: 12.0,
            filledButtonRadius: 12.0,
            outlinedButtonRadius: 12.0,
            textButtonRadius: 12.0,
            // 输入框圆角
            inputDecoratorRadius: 14.0,
            // 对话框和底部表单
            dialogRadius: 20.0,
            bottomSheetRadius: 24.0,
            // 导航栏优化 - 深色主题保持专业感
            bottomNavigationBarElevation: 6.0,
            navigationBarLabelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            navigationBarOpacity: 0.93,
            // 深色主题的冷色调视觉效果
            interactionEffects: true,
            tintedDisabledControls: true,
            // FAB 样式 - 保持圆形专业感
            fabUseShape: true,
            fabAlwaysCircular: true,
            fabRadius: 16.0,
            // 深色主题增强专业感
            adaptiveRemoveElevationTint: FlexAdaptive.off(),
            adaptiveElevationShadowsBack: FlexAdaptive.off(),
          ),
          keyColors: const FlexKeyColors(
            useSecondary: true,
            useTertiary: true,
            keepPrimary: true,
            keepSecondary: true,
            keepTertiary: true,
          ),
          visualDensity: FlexColorScheme.comfortablePlatformDensity,
          useMaterial3: true,
          swapLegacyOnMaterial3: true,
        ),
        themeMode: ThemeMode.system,
        
        // 应用配置
        locale: const Locale('zh', 'CN'),
        
        // 路由配置
        routerConfig: _router,
        
        // 全局导航配置
        builder: (context, child) {
          return MediaQuery(
            // 强制文字缩放为1.0，保持设计一致性
            data: MediaQuery.of(context).copyWith(textScaler: const TextScaler.linear(1.0)),
            child: child!,
          );
        },
      ),
    );
  }
}

/// 应用路由配置
final _router = GoRouter(
  initialLocation: '/',
  refreshListenable: GoRouterRefreshStream(SupabaseClientManager.authStateStream),
  redirect: (context, state) {
    final session = Supabase.instance.client.auth.currentSession;
    final user = Supabase.instance.client.auth.currentUser;
    final isAuthenticated = session != null && user != null;
    final isLoginPage = state.uri.toString() == '/login';
    
    if (AppConfig.enableLogging) {
      print('🔐 [Auth] 路由重定向检查 - 认证状态: $isAuthenticated, 当前页: ${state.uri}');
      if (user != null) {
        print('🔐 [Auth] 当前用户: ${user.email}, 会话过期: ${session?.expiresAt}');
      }
    }
    
    // 如果未登录且不在登录页，重定向到登录页
    if (!isAuthenticated && !isLoginPage) {
      if (AppConfig.enableLogging) {
        print('🔐 [Auth] 重定向到登录页');
      }
      return '/login';
    }
    
    // 如果已登录且在登录页，重定向到主页
    if (isAuthenticated && isLoginPage) {
      if (AppConfig.enableLogging) {
        print('🔐 [Auth] 重定向到主页');
      }
      return '/';
    }
    
    return null;
  },
  routes: [
    GoRoute(
      path: '/',
      name: 'home',
      builder: (context, state) => const MainPage(),
    ),
    GoRoute(
      path: '/login',
      name: 'login',
      builder: (context, state) => LoginPage(
        onLoginSuccess: () {
          context.go('/');
        },
      ),
    ),
    GoRoute(
      path: '/register',
      name: 'register',
      builder: (context, state) => RegisterPage(
        onRegisterSuccess: () {
          context.go('/');
        },
      ),
    ),
    GoRoute(
      path: '/invoice-detail/:id',
      name: 'invoice-detail',
      builder: (context, state) {
        final invoiceId = state.pathParameters['id']!;
        // Note: InvoiceDetailPage will access InvoiceBloc from MainPage's BlocProvider
        // This route should only be accessible from within the main app flow
        return InvoiceDetailPage(invoiceId: invoiceId);
      },
    ),
    GoRoute(
      path: '/upload',
      name: 'upload',
      builder: (context, state) => const InvoiceUploadPage(),
    ),
    GoRoute(
      path: '/reimbursement-set/:id',
      name: 'reimbursement-set-detail',
      builder: (context, state) {
        final setId = state.pathParameters['id']!;
        // Note: ReimbursementSetDetailPage will access ReimbursementSetBloc from MainPage's BlocProvider
        // This route should only be accessible from within the main app flow
        return ReimbursementSetDetailPage(reimbursementSetId: setId);
      },
    ),
  ],
);

/// 监听认证状态变化的刷新流
class GoRouterRefreshStream extends ChangeNotifier {
  late final StreamSubscription _subscription;

  GoRouterRefreshStream(Stream<AuthState> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) {
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
