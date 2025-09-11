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
        AppLogger.debug('🔐 [Login] 检查现有会话 - Session: ${session != null}, User: ${user?.email}', tag: 'Debug');
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
        AppLogger.debug('🔐 [Login] 登录响应 - User: ${response.user?.email}, Session: ${response.session != null}', tag: 'Debug');
      }

      if (response.user != null && response.session != null) {
        if (AppConfig.enableLogging) {
          AppLogger.debug('✅ [Login] 登录成功，用户ID: ${response.user!.id}', tag: 'Debug');
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
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height - MediaQuery.of(context).padding.top - MediaQuery.of(context).padding.bottom - 48,
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
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    children: [
                      TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: '邮箱地址',
                          prefixIcon: Icon(CupertinoIcons.mail),
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _passwordController,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: '密码',
                          prefixIcon: Icon(CupertinoIcons.lock),
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // 错误消息
                      if (_errorMessage != null)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.red.shade200),
                          ),
                          child: Text(
                            _errorMessage!,
                            style: TextStyle(color: Colors.red.shade700),
                          ),
                        ),

                      // 登录按钮
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _login,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            foregroundColor: Colors.white,
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : const Text(
                                  '登录',
                                  style: TextStyle(fontSize: 16),
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
                  const Text(
                    '还没有账户？',
                    style: TextStyle(color: Colors.grey),
                  ),
                  TextButton(
                    onPressed: () => context.push('/register'),
                    child: const Text(
                      '立即注册',
                      style: TextStyle(color: Colors.blue),
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