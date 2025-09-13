import '../../core/utils/logger.dart';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';
import '../../core/network/supabase_client.dart';
import '../../core/config/app_config.dart';

/// 简单的登录页面
class LoginPage extends StatefulWidget {
  final VoidCallback onLoginSuccess;

  const LoginPage({super.key, required this.onLoginSuccess});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _checkExistingSession();
  }

  /// 检查是否有现有会话
  Future<void> _checkExistingSession() async {
    try {
      final session = SupabaseClientManager.client.auth.currentSession;
      final user = SupabaseClientManager.client.auth.currentUser;

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '🔐 [Login] 检查现有会话 - Session: ${session != null}, User: ${user?.email}',
            tag: 'Debug');
      }

      if (session != null && user != null) {
        if (AppConfig.enableLogging) {
          AppLogger.debug('✅ [Login] 找到有效会话，自动登录', tag: 'Debug');
        }
        widget.onLoginSuccess();
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('⚠️ [Login] 会话检查失败: $e', tag: 'Debug');
      }
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_isLoading) return;

    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      setState(() {
        _errorMessage = '请输入邮箱和密码';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (AppConfig.enableLogging) {
        AppLogger.debug('🔐 [Login] 开始登录尝试: $email', tag: 'Debug');
      }

      final response = await SupabaseClientManager.signInWithPassword(
        email: email,
        password: password,
      );

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '🔐 [Login] 登录响应 - User: ${response.user?.email}, Session: ${response.session != null}',
            tag: 'Debug');
      }

      if (response.user != null && response.session != null) {
        if (AppConfig.enableLogging) {
          AppLogger.debug('✅ [Login] 登录成功，用户ID: ${response.user!.id}',
              tag: 'Debug');
        }
        widget.onLoginSuccess();
      } else {
        setState(() {
          _errorMessage = '登录失败：未获得有效的用户会话';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = '登录失败: ${e.toString()}';
      });
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [Login] 登录错误: $e', tag: 'Debug');
        AppLogger.debug('❌ [Login] 错误类型: ${e.runtimeType}', tag: 'Debug');
      }
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return CupertinoPageScaffold(
      backgroundColor: colorScheme.surface,
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height -
                  MediaQuery.of(context).padding.top -
                  MediaQuery.of(context).padding.bottom -
                  48,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Logo区域
                const Icon(
                  CupertinoIcons.doc_text,
                  size: 80,
                  color: Colors.blue,
                ),
                const SizedBox(height: 16),
                const Text(
                  '发票助手',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  '简化您的发票管理',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 48),

                // 表单区域
                Container(
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: colorScheme.outline.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      children: [
                        CupertinoTextField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          placeholder: '邮箱地址',
                          prefix: Padding(
                            padding: const EdgeInsets.only(left: 8),
                            child: Icon(
                              CupertinoIcons.mail,
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                          style: TextStyle(color: colorScheme.onSurface),
                          decoration: BoxDecoration(
                            color: colorScheme.surface,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: colorScheme.outline.withValues(alpha: 0.3),
                            ),
                          ),
                          padding: const EdgeInsets.all(16),
                        ),
                        const SizedBox(height: 16),
                        CupertinoTextField(
                          controller: _passwordController,
                          obscureText: true,
                          placeholder: '密码',
                          prefix: Padding(
                            padding: const EdgeInsets.only(left: 8),
                            child: Icon(
                              CupertinoIcons.lock,
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                          style: TextStyle(color: colorScheme.onSurface),
                          decoration: BoxDecoration(
                            color: colorScheme.surface,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: colorScheme.outline.withValues(alpha: 0.3),
                            ),
                          ),
                          padding: const EdgeInsets.all(16),
                        ),
                        const SizedBox(height: 24),

                        // 错误消息
                        if (_errorMessage != null)
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            margin: const EdgeInsets.only(bottom: 16),
                            decoration: BoxDecoration(
                              color: colorScheme.errorContainer,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: colorScheme.error.withValues(alpha: 0.3)),
                            ),
                            child: Text(
                              _errorMessage!,
                              style: TextStyle(color: colorScheme.onErrorContainer),
                            ),
                          ),

                        // 登录按钮
                        SizedBox(
                          width: double.infinity,
                          child: CupertinoButton(
                            onPressed: _isLoading ? null : _login,
                            color: colorScheme.primary,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            borderRadius: BorderRadius.circular(12),
                            child: _isLoading
                                ? SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CupertinoActivityIndicator(
                                      color: colorScheme.onPrimary,
                                    ),
                                  )
                                : Text(
                                    '登录',
                                    style: TextStyle(
                                      fontSize: 16,
                                      color: colorScheme.onPrimary,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // 注册链接
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '还没有账户？',
                      style: TextStyle(color: colorScheme.onSurfaceVariant),
                    ),
                    CupertinoButton(
                      onPressed: () => context.push('/register'),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text(
                        '立即注册',
                        style: TextStyle(color: colorScheme.primary),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // 说明文字
                const Text(
                  '请使用您的账户登录',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
