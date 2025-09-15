import 'dart:typed_data';
import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';
import '../config/app_config.dart';
import '../utils/logger.dart';

/// Supabase 客户端封装
/// 提供单例模式的 Supabase 客户端和统一的数据访问接口
class SupabaseClientManager {
  static SupabaseClientManager? _instance;
  static SupabaseClient? _client;

  SupabaseClientManager._();

  /// 获取单例实例
  static SupabaseClientManager get instance {
    _instance ??= SupabaseClientManager._();
    return _instance!;
  }

  /// 获取 Supabase 客户端
  static SupabaseClient get client {
    if (_client == null) {
      throw StateError(
          'Supabase client not initialized. Call initialize() first.');
    }
    return _client!;
  }

  /// 初始化 Supabase 客户端
  static Future<bool> initialize() async {
    try {
      // 验证配置
      if (!SupabaseConfig.validateConfig()) {
        throw Exception('Invalid Supabase configuration');
      }

      if (AppConfig.enableLogging) {
        AppLogger.info('Initializing Supabase client...', tag: 'Supabase');
        SupabaseConfig.printConfigStatus();
      }

      // 初始化 Supabase
      await Supabase.initialize(
        url: SupabaseConfig.supabaseUrl,
        anonKey: SupabaseConfig.supabaseAnonKey,
        authOptions: const FlutterAuthClientOptions(
          authFlowType: AuthFlowType.pkce,
        ),
      );

      _client = Supabase.instance.client;

      // 设置全局头部
      _client!.headers.addAll(SupabaseConfig.globalHeaders);

      if (AppConfig.enableLogging) {
        AppLogger.info('Supabase client initialized successfully',
            tag: 'Supabase');
        AppLogger.debug('   URL: ${SupabaseConfig.supabaseUrl}',
            tag: 'Supabase');
        AppLogger.debug(
            '   Auth Flow: ${SupabaseConfig.authConfig['flowType']}',
            tag: 'Supabase');
      }

      return true;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('Failed to initialize Supabase client',
            tag: 'Supabase', error: e);
      }
      return false;
    }
  }

  /// 检查客户端是否已初始化
  static bool get isInitialized => _client != null;

  /// 获取当前用户
  static User? get currentUser => _client?.auth.currentUser;

  /// 检查用户是否已登录
  static bool get isAuthenticated => currentUser != null;

  /// 获取认证状态流
  static Stream<AuthState> get authStateStream {
    if (!isInitialized) {
      throw StateError('Supabase client not initialized');
    }
    return _client!.auth.onAuthStateChange;
  }

  /// 用户登录
  static Future<AuthResponse> signInWithPassword({
    required String email,
    required String password,
  }) async {
    if (!isInitialized) {
      throw StateError('Supabase client not initialized');
    }

    try {
      final response = await _client!.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (AppConfig.enableLogging && response.user != null) {
        AppLogger.info('User signed in successfully', tag: 'Supabase');
      }

      return response;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('Sign in failed', tag: 'Supabase', error: e);
      }
      rethrow;
    }
  }

  /// 用户注册
  static Future<AuthResponse> signUpWithPassword({
    required String email,
    required String password,
    Map<String, dynamic>? data,
  }) async {
    if (!isInitialized) {
      throw StateError('Supabase client not initialized');
    }

    try {
      final response = await _client!.auth.signUp(
        email: email,
        password: password,
        data: data,
      );

      if (AppConfig.enableLogging) {
        AppLogger.info('User signed up successfully', tag: 'Supabase');
      }

      return response;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('Sign up failed', tag: 'Supabase', error: e);
      }
      rethrow;
    }
  }

  /// 用户登出
  static Future<void> signOut() async {
    if (!isInitialized) {
      throw StateError('Supabase client not initialized');
    }

    try {
      await _client!.auth.signOut();

      if (AppConfig.enableLogging) {
        AppLogger.info('User signed out successfully', tag: 'Supabase');
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('Sign out failed', tag: 'Supabase', error: e);
      }
      rethrow;
    }
  }

  /// 重置密码
  static Future<void> resetPassword(String email) async {
    if (!isInitialized) {
      throw StateError('Supabase client not initialized');
    }

    try {
      await _client!.auth.resetPasswordForEmail(email);

      if (AppConfig.enableLogging) {
        AppLogger.info('Password reset email sent', tag: 'Supabase');
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('Password reset failed', tag: 'Supabase', error: e);
      }
      rethrow;
    }
  }

  /// 通用数据库查询
  static SupabaseQueryBuilder from(String table) {
    if (!isInitialized) {
      throw StateError('Supabase client not initialized');
    }
    return _client!.from(table);
  }

  /// 调用 Edge Function
  static Future<FunctionResponse> invokeFunction(
    String functionName, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) async {
    if (!isInitialized) {
      throw StateError('Supabase client not initialized');
    }

    try {
      final response = await _client!.functions.invoke(
        functionName,
        body: body,
        headers: headers,
      );

      if (AppConfig.enableLogging) {
        AppLogger.info('Edge Function "$functionName" invoked successfully',
            tag: 'Supabase');
      }

      return response;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('Edge Function "$functionName" failed',
            tag: 'Supabase', error: e);
      }
      rethrow;
    }
  }

  /// 文件上传到存储桶
  static Future<String> uploadFile({
    required String bucketName,
    required String fileName,
    required Uint8List fileBytes,
    Map<String, String>? metadata,
  }) async {
    if (!isInitialized) {
      throw StateError('Supabase client not initialized');
    }

    try {
      final path = await _client!.storage
          .from(bucketName)
          .uploadBinary(fileName, fileBytes,
              fileOptions: FileOptions(
                metadata: metadata,
              ));

      if (AppConfig.enableLogging) {
        AppLogger.info('File uploaded successfully: $path', tag: 'Supabase');
      }

      return path;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('File upload failed', tag: 'Supabase', error: e);
      }
      rethrow;
    }
  }

  /// 获取存储文件的签名URL
  static Future<String> getSignedUrl({
    required String bucketName,
    required String filePath,
    int expiresIn = 3600, // 默认1小时过期
  }) async {
    if (!isInitialized) {
      throw StateError('Supabase client not initialized');
    }

    try {
      final signedUrl = await _client!.storage
          .from(bucketName)
          .createSignedUrl(filePath, expiresIn);

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            'Signed URL created successfully for: ${filePath.substring(0, 20)}...',
            tag: 'Supabase');
      }

      return signedUrl;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('Failed to create signed URL',
            tag: 'Supabase', error: e);
      }
      rethrow;
    }
  }

  /// 获取当前用户的访问令牌（增强安全验证）
  static String? get accessToken {
    if (!isInitialized || !isAuthenticated) {
      return null;
    }

    final session = _client!.auth.currentSession;
    if (session == null) {
      if (AppConfig.enableLogging) {
        AppLogger.warning('🚨 [Auth] 会话不存在', tag: 'Security');
      }
      return null;
    }

    // 🚨 安全检查：验证token有效期
    final now = DateTime.now().millisecondsSinceEpoch / 1000;
    if (session.expiresAt != null && session.expiresAt! <= now) {
      if (AppConfig.enableLogging) {
        AppLogger.warning(
            '🚨 [Auth] Token已过期: expires=${DateTime.fromMillisecondsSinceEpoch((session.expiresAt! * 1000).round())}',
            tag: 'Security');
      }
      // 自动清理过期token
      _handleExpiredToken();
      return null;
    }

    // 🚨 安全检查：验证JWT格式
    if (!_isValidJWTFormat(session.accessToken)) {
      if (AppConfig.enableLogging) {
        AppLogger.error('🚨 [Auth] Token格式无效', tag: 'Security');
      }
      return null;
    }

    // 🚨 安全检查：验证token声明
    if (!_validateTokenClaims(session.accessToken)) {
      if (AppConfig.enableLogging) {
        AppLogger.error('🚨 [Auth] Token声明验证失败', tag: 'Security');
      }
      return null;
    }

    return session.accessToken;
  }

  /// 获取认证头信息（用于API请求）
  static Map<String, String> get authHeaders {
    final token = accessToken;
    if (token == null) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('🚨 [Auth] 无效token，返回空认证头', tag: 'Security');
      }
      return {};
    }

    return {
      'Authorization': 'Bearer $token',
      'apikey': SupabaseConfig.supabaseAnonKey,
      'Content-Type': 'application/json',
      'X-Client-Type': 'flutter-mobile',
      'X-Request-Time': DateTime.now().toIso8601String(),
    };
  }

  /// 下载存储文件（带认证）
  static Future<Uint8List> downloadFile({
    required String bucketName,
    required String filePath,
  }) async {
    if (!isInitialized) {
      throw StateError('Supabase client not initialized');
    }

    try {
      final fileBytes =
          await _client!.storage.from(bucketName).download(filePath);

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            'File downloaded successfully: ${filePath.substring(0, 20)}..., size: ${fileBytes.length} bytes',
            tag: 'Supabase');
      }

      return fileBytes;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('Failed to download file', tag: 'Supabase', error: e);
      }
      rethrow;
    }
  }

  /// 从完整的存储URL提取文件路径 - 增强安全验证
  static String extractFilePathFromUrl(String fullUrl) {
    // 输入验证
    if (fullUrl.isEmpty) {
      throw ArgumentError('URL不能为空');
    }

    // 验证URL格式
    final Uri uri;
    try {
      uri = Uri.parse(fullUrl);
    } catch (e) {
      throw ArgumentError('无效的URL格式: $fullUrl');
    }

    // 验证域名是否为可信的Supabase域名
    if (!_isValidSupabaseDomain(uri.host)) {
      throw ArgumentError('不受信任的域名: ${uri.host}');
    }

    // 验证协议
    if (uri.scheme != 'https') {
      throw ArgumentError('只允许HTTPS协议');
    }

    final pathSegments = uri.pathSegments;

    // 安全日志记录（脱敏URL）
    if (AppConfig.enableLogging && AppConfig.isDebugMode) {
      final maskedUrl = fullUrl.length > 50
          ? '${fullUrl.substring(0, 30)}***${fullUrl.substring(fullUrl.length - 20)}'
          : 'URL***';
      AppLogger.debug('URL解析 - 解析URL: $maskedUrl', tag: 'Supabase');
      AppLogger.debug('URL解析 - 路径段数: ${pathSegments.length}', tag: 'Supabase');
    }

    // 验证路径结构
    if (pathSegments.length < 6 ||
        pathSegments[0] != 'storage' ||
        pathSegments[1] != 'v1' ||
        pathSegments[2] != 'object' ||
        pathSegments[4] != 'invoice-files') {
      throw ArgumentError('无效的Supabase存储URL结构');
    }

    // 提取文件路径（跳过前5个段：storage/v1/object/public/invoice-files）
    final filePath = pathSegments.skip(5).join('/');

    // 验证文件路径安全性
    if (!_isValidFilePath(filePath)) {
      throw ArgumentError('不安全的文件路径');
    }

    if (AppConfig.enableLogging && AppConfig.isDebugMode) {
      final maskedPath = filePath.length > 20
          ? '${filePath.substring(0, 10)}***${filePath.substring(filePath.length - 10)}'
          : 'path***';
      AppLogger.debug('URL解析 - 提取路径: $maskedPath', tag: 'Supabase');
    }

    return filePath;
  }

  /// 验证是否为有效的Supabase域名
  static bool _isValidSupabaseDomain(String host) {
    // 验证Supabase官方域名格式
    if (host.endsWith('.supabase.co')) {
      return true;
    }

    // 允许本地开发环境
    if (AppConfig.isDebugMode && (host == 'localhost' || host == '127.0.0.1')) {
      return true;
    }

    return false;
  }

  /// 验证文件路径安全性
  static bool _isValidFilePath(String filePath) {
    // 检查路径遍历攻击
    if (filePath.contains('..') || filePath.contains('//')) {
      return false;
    }

    // 检查非法字符
    final RegExp invalidChars = RegExp(r'[<>:"|?*\x00-\x1f]');
    if (invalidChars.hasMatch(filePath)) {
      return false;
    }

    // 检查路径长度
    if (filePath.length > 500) {
      return false;
    }

    // 验证是否为PDF文件
    if (!filePath.toLowerCase().endsWith('.pdf')) {
      return false;
    }

    return true;
  }

  /// 获取客户端状态信息
  static Map<String, dynamic> getClientStatus() {
    return {
      'isInitialized': isInitialized,
      'isAuthenticated': isAuthenticated,
      'currentUser': currentUser != null ? '[AUTHENTICATED]' : 'None',
      'clientId': _client?.hashCode.toString() ?? 'Not initialized',
    };
  }

  /// 打印客户端状态（仅在调试模式下）
  static void printClientStatus() {
    if (AppConfig.isDebugMode && AppConfig.enableLogging) {
      AppLogger.debug('Supabase Client Status:', tag: 'Supabase');
      final status = getClientStatus();
      status.forEach((key, value) {
        AppLogger.debug('   $key: $value', tag: 'Supabase');
      });
    }
  }

  /// 🔐 安全增强：验证JWT格式
  static bool _isValidJWTFormat(String token) {
    if (token.isEmpty) return false;

    // JWT应该有三个部分，用 . 分隔
    final parts = token.split('.');
    if (parts.length != 3) {
      if (AppConfig.enableLogging) {
        AppLogger.warning('🚨 [Auth] JWT格式错误：部分数量不正确', tag: 'Security');
      }
      return false;
    }

    // 验证每个部分都是有效的 base64 编码
    try {
      for (int i = 0; i < parts.length; i++) {
        final part = parts[i];
        if (part.isEmpty) {
          if (AppConfig.enableLogging) {
            AppLogger.warning('🚨 [Auth] JWT部分${i + 1}为空', tag: 'Security');
          }
          return false;
        }

        // 添加必要的填充并尝试解码
        String padded = part;
        while (padded.length % 4 != 0) {
          padded += '=';
        }

        try {
          base64Url.decode(padded);
        } catch (e) {
          if (AppConfig.enableLogging) {
            AppLogger.warning('🚨 [Auth] JWT部分${i + 1} base64解码失败',
                tag: 'Security');
          }
          return false;
        }
      }
      return true;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('🚨 [Auth] JWT格式验证异常', tag: 'Security', error: e);
      }
      return false;
    }
  }

  /// 🔐 安全增强：验证JWT声明
  static bool _validateTokenClaims(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return false;

      // 解码JWT payload
      String payload = parts[1];
      while (payload.length % 4 != 0) {
        payload += '=';
      }

      final decodedPayload = utf8.decode(base64Url.decode(payload));
      final claims = json.decode(decodedPayload) as Map<String, dynamic>;

      // 验证必要的声明
      final requiredClaims = ['iss', 'sub', 'aud', 'exp', 'iat'];
      for (final claim in requiredClaims) {
        if (!claims.containsKey(claim)) {
          if (AppConfig.enableLogging) {
            AppLogger.warning('🚨 [Auth] JWT缺少必要声明: $claim', tag: 'Security');
          }
          return false;
        }
      }

      // 验证发行者
      final issuer = claims['iss'] as String?;
      if (issuer == null || !issuer.contains('supabase')) {
        if (AppConfig.enableLogging) {
          AppLogger.warning('🚨 [Auth] JWT发行者验证失败', tag: 'Security');
        }
        return false;
      }

      // 验证受众
      final audience = claims['aud'] as String?;
      if (audience == null || audience != 'authenticated') {
        if (AppConfig.enableLogging) {
          AppLogger.warning('🚨 [Auth] JWT受众验证失败', tag: 'Security');
        }
        return false;
      }

      // 验证过期时间
      final exp = claims['exp'] as int?;
      if (exp == null) {
        if (AppConfig.enableLogging) {
          AppLogger.warning('🚨 [Auth] JWT过期时间缺失', tag: 'Security');
        }
        return false;
      }

      final now = DateTime.now().millisecondsSinceEpoch / 1000;
      if (exp <= now) {
        if (AppConfig.enableLogging) {
          AppLogger.warning('🚨 [Auth] JWT已过期: exp=$exp, now=$now',
              tag: 'Security');
        }
        return false;
      }

      // 验证签发时间
      final iat = claims['iat'] as int?;
      if (iat == null || iat > now + 60) {
        // 允许1分钟的时钟偏差
        if (AppConfig.enableLogging) {
          AppLogger.warning('🚨 [Auth] JWT签发时间无效', tag: 'Security');
        }
        return false;
      }

      if (AppConfig.enableLogging && AppConfig.isDebugMode) {
        AppLogger.debug('✅ [Auth] JWT声明验证通过', tag: 'Security');
      }

      return true;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('🚨 [Auth] JWT声明验证异常', tag: 'Security', error: e);
      }
      return false;
    }
  }

  /// 🔐 安全增强：处理过期token
  static void _handleExpiredToken() {
    try {
      if (AppConfig.enableLogging) {
        AppLogger.warning('🚨 [Auth] 处理过期token，尝试自动刷新', tag: 'Security');
      }

      // 尝试刷新token（Supabase会自动处理）
      // 如果刷新失败，用户需要重新登录
      _client?.auth.refreshSession();
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('🚨 [Auth] Token刷新失败', tag: 'Security', error: e);
      }
    }
  }
}
