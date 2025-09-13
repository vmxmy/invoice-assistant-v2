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
// import 'presentation/bloc/invoice_event.dart'; // 暂时未使用
import 'presentation/bloc/reimbursement_set_bloc.dart';
import 'presentation/bloc/permission_bloc.dart';
import 'presentation/utils/permission_preloader.dart';
import 'presentation/pages/main_page.dart';
import 'presentation/pages/login_page.dart';
import 'presentation/pages/register_page.dart';
import 'presentation/pages/invoice_detail_page.dart';
import 'presentation/pages/cupertino_invoice_upload_page.dart';
import 'presentation/pages/reimbursement_set_detail_page.dart';

/// 发票助手应用根组件
class InvoiceAssistantApp extends StatefulWidget {
  const InvoiceAssistantApp({super.key});

  @override
  State<InvoiceAssistantApp> createState() => _InvoiceAssistantAppState();
}

class _InvoiceAssistantAppState extends State<InvoiceAssistantApp> {
  late final ThemeManager _themeManager;
  late final PermissionPreloader _permissionPreloader;
  StreamSubscription<AuthState>? _authStateSubscription;

  @override
  void initState() {
    super.initState();
    _themeManager = ThemeManager();
    _permissionPreloader = PermissionPreloader();
    _initializeTheme();
    // 延迟设置认证状态监听器，确保 MultiBlocProvider 完全初始化
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _setupAuthStateListener();
    });
  }

  /// 初始化主题管理器
  Future<void> _initializeTheme() async {
    await _themeManager.initialize();
  }

  /// 设置认证状态监听器
  void _setupAuthStateListener() {
    _authStateSubscription = SupabaseClientManager.authStateStream.listen((authState) {
      // 获取所有BLoC并处理认证状态变更
      if (mounted) {
        try {
          final permissionBloc = context.read<PermissionBloc>();
          final invoiceBloc = context.read<InvoiceBloc>();
          final reimbursementSetBloc = context.read<ReimbursementSetBloc>();
          
          _permissionPreloader.onAuthStateChanged(
            permissionBloc: permissionBloc,
            authState: authState,
            invoiceBloc: invoiceBloc,
            reimbursementSetBloc: reimbursementSetBloc,
          );
        } catch (e) {
          if (AppConfig.enableLogging) {
            AppLogger.error('认证状态监听器访问 BLoC 失败: $e', tag: 'App');
          }
        }
      }
    });
  }

  @override
  void dispose() {
    _authStateSubscription?.cancel();
    super.dispose();
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
                  // 不在这里立即加载数据，等到用户认证完成后再加载
                  // 避免在 Supabase 初始化完成前请求数据
                  return bloc;
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
              BlocProvider<PermissionBloc>(
                create: (context) {
                  AppLogger.debug('创建全局唯一PermissionBloc', tag: 'App');
                  final bloc = di.sl<PermissionBloc>();
                  AppLogger.debug(
                      'PermissionBloc实例创建完成 [${bloc.hashCode}]',
                      tag: 'App');
                  
                  // 如果用户已登录且邮箱已确认，使用预加载器智能加载权限
                  final user = Supabase.instance.client.auth.currentUser;
                  if (user != null && user.emailConfirmedAt != null) {
                    // 使用预加载器进行智能权限预加载
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      _permissionPreloader.preloadPermissions(permissionBloc: bloc);
                    });
                  }
                  
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
    
    // 🚨 安全检查：验证邮箱是否已确认
    final isEmailConfirmed = user?.emailConfirmedAt != null;
    final isFullyAuthenticated = isAuthenticated && isEmailConfirmed;
    
    final isLoginPage = state.uri.toString() == '/login';
    final isRegisterPage = state.uri.toString() == '/register';

    if (AppConfig.enableLogging) {
      AppLogger.debug('🔗 [Navigation] 路由重定向检查', tag: 'Navigation');
      AppLogger.debug('🔗 [Navigation] 目标路由: ${state.uri}', tag: 'Navigation');
      AppLogger.debug('🔗 [Navigation] 认证状态: $isAuthenticated', tag: 'Navigation');
      AppLogger.debug('🔗 [Navigation] 邮箱确认状态: $isEmailConfirmed', tag: 'Navigation');
      AppLogger.debug('🔗 [Navigation] 完全认证状态: $isFullyAuthenticated', tag: 'Navigation');
      AppLogger.debug('🔗 [Navigation] 是登录页: $isLoginPage', tag: 'Navigation');
      AppLogger.debug('🔗 [Navigation] 是注册页: $isRegisterPage', tag: 'Navigation');
      AppLogger.debug('🔗 [Navigation] 时间戳: ${DateTime.now().toIso8601String()}', tag: 'Navigation');
      if (user != null) {
        AppLogger.debug('🔗 [Navigation] 当前用户: ${user.email}', tag: 'Navigation');
        AppLogger.debug('🔗 [Navigation] 邮箱确认时间: ${user.emailConfirmedAt}', tag: 'Navigation');
        AppLogger.debug('🔗 [Navigation] 会话过期: ${session?.expiresAt}', tag: 'Navigation');
      }
    }

    // 🚨 安全检查：如果未完全认证(包括邮箱验证)且不在登录页或注册页，重定向到登录页
    if (!isFullyAuthenticated && !isLoginPage && !isRegisterPage) {
      if (AppConfig.enableLogging) {
        if (!isAuthenticated) {
          AppLogger.debug('🔗 [Navigation] 重定向到登录页 (未认证)', tag: 'Navigation');
        } else if (!isEmailConfirmed) {
          AppLogger.error('🚨 [Security] 重定向到登录页 (邮箱未确认): ${user.email}', tag: 'Navigation');
        }
      }
      return '/login';
    }

    // 如果已完全认证且在登录页或注册页，重定向到主页
    if (isFullyAuthenticated && (isLoginPage || isRegisterPage)) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('🔗 [Navigation] 重定向到主页 (已完全认证)', tag: 'Navigation');
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
      builder: (context, state) => const CupertinoInvoiceUploadPage(),
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
