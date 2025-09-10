import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/config/app_config.dart';
import 'core/di/injection_container.dart' as di;
import 'core/network/supabase_client.dart';
import 'presentation/bloc/invoice_bloc.dart';
import 'presentation/pages/main_page.dart';
import 'presentation/pages/login_page.dart';
import 'presentation/pages/register_page.dart';
import 'presentation/pages/invoice_detail_page.dart';
import 'presentation/pages/invoice_upload_page.dart';

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
        // 注册 InvoiceBloc（使用工厂模式，每次创建新实例）
        BlocProvider<InvoiceBloc>(
          create: (context) => di.sl<InvoiceBloc>(),
        ),
      ],
      child: MaterialApp.router(
        title: AppConfig.appName,
        debugShowCheckedModeBanner: false,
        
        // 使用 Material 3 设计
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: Colors.blue,
            brightness: Brightness.light,
          ),
        ),
        darkTheme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: Colors.blue,
            brightness: Brightness.dark,
          ),
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
        return InvoiceDetailPage(invoiceId: invoiceId);
      },
    ),
    GoRoute(
      path: '/upload',
      name: 'upload',
      builder: (context, state) => const InvoiceUploadPage(),
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
