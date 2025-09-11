import 'app_config.dart';
import '../utils/logger.dart';

/// Supabase 配置管理
/// 复用现有前端的 Supabase 配置，保持完全兼容
class SupabaseConfig {
  // 私有构造函数，确保单例模式
  SupabaseConfig._();
  
  static final SupabaseConfig _instance = SupabaseConfig._();
  static SupabaseConfig get instance => _instance;
  
  // Supabase 配置 - 复用现有前端配置
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://sfenhhtvcyslxplvewmt.supabase.co', // 从前端项目复用
  );
  
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY', 
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE', // 从前端项目复用
  );
  
  // 认证配置 - 与前端保持一致
  static const Map<String, dynamic> authConfig = {
    'autoRefreshToken': true,
    'persistSession': true,
    'detectSessionInUrl': false, // 禁用URL检测，避免副作用
    'flowType': 'pkce',
  };
  
  // 全局配置
  static Map<String, String> get globalHeaders => {
    'X-Client-Info': 'invoice-assist-flutter@${AppConfig.version}',
    'Content-Type': 'application/json',
  };
  
  // 环境检测
  static bool get isLocal => 
    supabaseUrl.contains('localhost') || 
    supabaseUrl.contains('127.0.0.1');
    
  static bool get isProduction => !isLocal && !AppConfig.isDebugMode;
  
  /// 验证 Supabase 配置
  static bool validateConfig() {
    try {
      // 检查 URL 格式
      final uri = Uri.tryParse(supabaseUrl);
      if (supabaseUrl.isEmpty || uri == null || !uri.isAbsolute) {
        if (AppConfig.enableLogging) {
          AppLogger.error('Invalid Supabase URL: $supabaseUrl', tag: 'Config');
        }
        return false;
      }
      
      // 检查密钥
      if (supabaseAnonKey.isEmpty || supabaseAnonKey == 'your-anon-key') {
        if (AppConfig.enableLogging) {
          AppLogger.error('Invalid Supabase Anon Key', tag: 'Config');
        }
        return false;
      }
      
      // 环境一致性检查
      if (isProduction && isLocal) {
        if (AppConfig.enableLogging) {
          AppLogger.warning('Production environment with local URL', tag: 'Config');
        }
      }
      
      return true;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('Supabase config validation error', tag: 'Config', error: e);
      }
      return false;
    }
  }
  
  /// 获取配置状态信息
  static Map<String, dynamic> getConfigStatus() {
    return {
      'hasUrl': supabaseUrl.isNotEmpty,
      'hasKey': supabaseAnonKey.isNotEmpty,
      'isLocal': isLocal,
      'isProduction': isProduction,
      'isValid': validateConfig(),
      'url': isLocal ? supabaseUrl : '${supabaseUrl.substring(0, 20)}...',
    };
  }
  
  /// 记录配置状态（仅在调试模式下）
  static void printConfigStatus() {
    if (AppConfig.isDebugMode && AppConfig.enableLogging) {
      AppLogger.config('Supabase Configuration:');
      final status = getConfigStatus();
      status.forEach((key, value) {
        AppLogger.config('   $key: $value');
      });
    }
  }
  
  /// 获取完整的 Supabase 客户端配置
  static Map<String, dynamic> getClientConfig() {
    return {
      'url': supabaseUrl,
      'anonKey': supabaseAnonKey,
      'auth': authConfig,
      'global': {
        'headers': globalHeaders,
      },
    };
  }
}