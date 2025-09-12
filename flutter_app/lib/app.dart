import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart';
import 'core/config/app_config.dart';
import 'core/utils/logger.dart';
import 'core/di/injection_container.dart' as di;
import 'core/network/supabase_client.dart';
import 'core/theme/theme_manager.dart';
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
class InvoiceAssistantApp extends StatefulWidget {
  const InvoiceAssistantApp({super.key});

  @override
  State<InvoiceAssistantApp> createState() => _InvoiceAssistantAppState();
}

class _InvoiceAssistantAppState extends State<InvoiceAssistantApp> {
  late final ThemeManager _themeManager;

  @override
  void initState() {
    super.initState();
    _themeManager = ThemeManager();
    _initializeTheme();
  }

  /// 初始化主题管理器
  Future<void> _initializeTheme() async {
    await _themeManager.initialize();
  }

  @override
  Widget build(BuildContext context) {
    // 记录应用启动信息
    if (AppConfig.enableLogging) {
      AppLogger.info('启动发票助手应用', tag: 'App');
    }

    return ChangeNotifierProvider.value(
      value: _themeManager,
      child: Consumer<ThemeManager>(
        builder: (context, themeManager, child) {
          return MultiBlocProvider(
            providers: [
              BlocProvider<InvoiceBloc>(
                create: (context) {
                  AppLogger.debug('创建全局唯一InvoiceBloc', tag: 'App');
                  final bloc = di.sl<InvoiceBloc>();
                  AppLogger.debug('InvoiceBloc实例创建完成 [${bloc.hashCode}]',
                      tag: 'App');
                  return bloc
                    ..add(const LoadInvoices(refresh: true))
                    ..add(const LoadInvoiceStats());
                },
              ),
              BlocProvider<ReimbursementSetBloc>(
                create: (context) {
                  AppLogger.debug('创建全局唯一ReimbursementSetBloc', tag: 'App');
                  final bloc = di.sl<ReimbursementSetBloc>();
                  AppLogger.debug(
                      'ReimbursementSetBloc实例创建完成 [${bloc.hashCode}]',
                      tag: 'App');
                  return bloc;
                },
              ),
            ],
            child: CupertinoApp.router(
              title: AppConfig.appName,
              debugShowCheckedModeBanner: false,

              // 使用 ThemeManager 动态主题管理 - 转换为Cupertino主题
              theme: _buildCupertinoTheme(themeManager),

              // 应用配置
              locale: const Locale('zh', 'CN'),
              
              // 添加本地化支持
              localizationsDelegates: const [
                GlobalMaterialLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
              ],
              supportedLocales: const [
                Locale('zh', 'CN'),
                Locale('en', 'US'),
              ],

              // 路由配置
              routerConfig: _router,

              // 全局导航配置
              builder: (context, child) {
                return MediaQuery(
                  // 强制文字缩放为1.0，保持设计一致性
                  data: MediaQuery.of(context)
                      .copyWith(textScaler: const TextScaler.linear(1.0)),
                  child: child!,
                );
              },
            ),
          );
        },
      ),
    );
  }

  /// 构建Cupertino主题
  static CupertinoThemeData _buildCupertinoTheme(ThemeManager themeManager) {
    // 判断当前是否为暗色模式
    final isDark = themeManager.themeMode == ThemeMode.dark || 
                  (themeManager.themeMode == ThemeMode.system && 
                   WidgetsBinding.instance.platformDispatcher.platformBrightness == Brightness.dark);
    
    // 获取当前ColorScheme
    final colorScheme = isDark 
      ? themeManager.darkTheme.colorScheme 
      : themeManager.lightTheme.colorScheme;
    
    return CupertinoThemeData(
      brightness: isDark ? Brightness.dark : Brightness.light,
      primaryColor: colorScheme.primary,
      primaryContrastingColor: colorScheme.onPrimary,
      scaffoldBackgroundColor: colorScheme.surface,
      barBackgroundColor: colorScheme.surface,
      textTheme: CupertinoTextThemeData(
        primaryColor: colorScheme.onSurface,
        textStyle: TextStyle(
          color: colorScheme.onSurface,
          fontSize: 17,
          letterSpacing: -0.41,
        ),
        actionTextStyle: TextStyle(
          color: colorScheme.primary,
          fontSize: 17,
          letterSpacing: -0.41,
        ),
        tabLabelTextStyle: TextStyle(
          color: colorScheme.onSurface,
          fontSize: 10,
          letterSpacing: -0.24,
        ),
        navTitleTextStyle: TextStyle(
          color: colorScheme.onSurface,
          fontSize: 17,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.41,
        ),
        navLargeTitleTextStyle: TextStyle(
          color: colorScheme.onSurface,
          fontSize: 34,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.41,
        ),
        navActionTextStyle: TextStyle(
          color: colorScheme.primary,
          fontSize: 17,
          letterSpacing: -0.41,
        ),
      ),
    );
  }
}

/// 应用路由配置
final _router = GoRouter(
  initialLocation: '/',
  refreshListenable:
      GoRouterRefreshStream(SupabaseClientManager.authStateStream),
  redirect: (context, state) {
    final session = Supabase.instance.client.auth.currentSession;
    final user = Supabase.instance.client.auth.currentUser;
    final isAuthenticated = session != null && user != null;
    final isLoginPage = state.uri.toString() == '/login';

    if (AppConfig.enableLogging) {
      AppLogger.debug('路由重定向检查 - 认证状态: $isAuthenticated, 当前页: ${state.uri}',
          tag: 'Auth');
      if (user != null) {
        AppLogger.debug('当前用户: ${user.email}, 会话过期: ${session?.expiresAt}',
            tag: 'Auth');
      }
    }

    // 如果未登录且不在登录页，重定向到登录页
    if (!isAuthenticated && !isLoginPage) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('重定向到登录页', tag: 'Auth');
      }
      return '/login';
    }

    // 如果已登录且在登录页，重定向到主页
    if (isAuthenticated && isLoginPage) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('重定向到主页', tag: 'Auth');
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
