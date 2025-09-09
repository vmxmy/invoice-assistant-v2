import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';
import '../config/app_config.dart';

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
      throw StateError('Supabase client not initialized. Call initialize() first.');
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
        print('🚀 Initializing Supabase client...');
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
        print('✅ Supabase client initialized successfully');
        print('   URL: ${SupabaseConfig.supabaseUrl}');
        print('   Auth Flow: ${SupabaseConfig.authConfig['flowType']}');
      }
      
      return true;
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ Failed to initialize Supabase client: $e');
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
        print('✅ User signed in successfully: ${response.user!.email}');
      }
      
      return response;
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ Sign in failed: $e');
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
        print('✅ User signed up successfully: $email');
      }
      
      return response;
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ Sign up failed: $e');
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
        print('✅ User signed out successfully');
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ Sign out failed: $e');
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
        print('✅ Password reset email sent to: $email');
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ Password reset failed: $e');
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
        print('✅ Edge Function "$functionName" invoked successfully');
      }
      
      return response;
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ Edge Function "$functionName" failed: $e');
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
          .uploadBinary(fileName, fileBytes, fileOptions: FileOptions(
            metadata: metadata,
          ));
      
      if (AppConfig.enableLogging) {
        print('✅ File uploaded successfully: $path');
      }
      
      return path;
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ File upload failed: $e');
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
        print('✅ Signed URL created successfully: ${filePath.substring(0, 20)}...');
      }
      
      return signedUrl;
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ Failed to create signed URL: $e');
      }
      rethrow;
    }
  }
  
  /// 从完整的存储URL提取文件路径
  static String extractFilePathFromUrl(String fullUrl) {
    // 从URL中提取文件路径部分
    // 例如: https://xxx.supabase.co/storage/v1/object/public/invoice-files/user_id/filename.pdf
    // 路径段: ['storage', 'v1', 'object', 'public', 'invoice-files', 'user_id', 'filename.pdf']
    // 需要提取: user_id/filename.pdf
    final uri = Uri.parse(fullUrl);
    final pathSegments = uri.pathSegments;
    
    print('🔍 [URL解析] 完整URL: $fullUrl');
    print('🔍 [URL解析] 路径段: $pathSegments');
    print('🔍 [URL解析] 段数: ${pathSegments.length}');
    
    if (pathSegments.length >= 6 && 
        pathSegments[0] == 'storage' && 
        pathSegments[1] == 'v1' && 
        pathSegments[2] == 'object' &&
        pathSegments[4] == 'invoice-files') {
      // 跳过前5个段：storage/v1/object/public/invoice-files
      final filePath = pathSegments.skip(5).join('/');
      print('🔍 [URL解析] 提取的文件路径: $filePath');
      return filePath;
    }
    
    throw ArgumentError('Invalid Supabase storage URL format: $fullUrl');
  }

  /// 获取客户端状态信息
  static Map<String, dynamic> getClientStatus() {
    return {
      'isInitialized': isInitialized,
      'isAuthenticated': isAuthenticated,
      'currentUser': currentUser?.email ?? 'None',
      'clientId': _client?.hashCode.toString() ?? 'Not initialized',
    };
  }
  
  /// 打印客户端状态（仅在调试模式下）
  static void printClientStatus() {
    if (AppConfig.isDebugMode && AppConfig.enableLogging) {
      print('📡 Supabase Client Status:');
      final status = getClientStatus();
      status.forEach((key, value) {
        print('   $key: $value');
      });
    }
  }
}