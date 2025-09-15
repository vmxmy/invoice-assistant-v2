import 'app_config.dart';
import '../utils/logger.dart';
import '../exceptions/configuration_exception.dart';

/// Supabase 配置管理
/// 复用现有前端的 Supabase 配置，保持完全兼容
class SupabaseConfig {
  // 私有构造函数，确保单例模式
  SupabaseConfig._();

  static final SupabaseConfig _instance = SupabaseConfig._();
  static SupabaseConfig get instance => _instance;

  // Supabase 配置 - 只从环境变量获取，不提供硬编码默认值
  static const String supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const String supabaseAnonKey =
      String.fromEnvironment('SUPABASE_ANON_KEY');

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
      supabaseUrl.contains('localhost') || supabaseUrl.contains('127.0.0.1');

  static bool get isProduction => !isLocal && !AppConfig.isDebugMode;

  /// 验证 Supabase 配置 - 增强安全验证
  static bool validateConfig() {
    try {
      // 🚨 安全检查：必须配置环境变量
      if (supabaseUrl.isEmpty) {
        if (AppConfig.enableLogging) {
          AppLogger.error('CRITICAL: SUPABASE_URL 环境变量未配置', tag: 'Security');
        }
        throw ConfigurationException(
            'Missing SUPABASE_URL environment variable');
      }

      if (supabaseAnonKey.isEmpty) {
        if (AppConfig.enableLogging) {
          AppLogger.error('CRITICAL: SUPABASE_ANON_KEY 环境变量未配置',
              tag: 'Security');
        }
        throw ConfigurationException(
            'Missing SUPABASE_ANON_KEY environment variable');
      }

      // 检查 URL 格式
      final uri = Uri.tryParse(supabaseUrl);
      if (uri == null || !uri.isAbsolute) {
        if (AppConfig.enableLogging) {
          AppLogger.error(
              'Invalid Supabase URL format: ${supabaseUrl.substring(0, 20)}...',
              tag: 'Config');
        }
        return false;
      }

      // 🚨 安全检查：验证是否为合法的 Supabase 域名
      if (!uri.host.endsWith('.supabase.co') &&
          !uri.host.contains('localhost') &&
          !uri.host.contains('127.0.0.1')) {
        if (AppConfig.enableLogging) {
          AppLogger.error('Untrusted Supabase domain: ${uri.host}',
              tag: 'Security');
        }
        return false;
      }

      // 🚨 安全检查：强制 HTTPS（除非本地开发）
      if (uri.scheme != 'https' && !isLocal) {
        if (AppConfig.enableLogging) {
          AppLogger.error('HTTPS required for production', tag: 'Security');
        }
        return false;
      }

      // 检查密钥格式（JWT 格式验证）
      if (!_isValidJWTFormat(supabaseAnonKey)) {
        if (AppConfig.enableLogging) {
          AppLogger.error('Invalid JWT format for anon key', tag: 'Security');
        }
        return false;
      }

      // 环境一致性检查
      if (isProduction && isLocal) {
        if (AppConfig.enableLogging) {
          AppLogger.warning('Production environment with local URL',
              tag: 'Config');
        }
      }

      if (AppConfig.enableLogging) {
        AppLogger.info('✅ Supabase configuration validated successfully',
            tag: 'Security');
      }

      return true;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('Supabase config validation error',
            tag: 'Config', error: e);
      }
      return false;
    }
  }

  /// 验证 JWT 格式
  static bool _isValidJWTFormat(String token) {
    if (token.isEmpty) return false;

    // JWT 应该有三个部分，用 . 分隔
    final parts = token.split('.');
    if (parts.length != 3) return false;

    // 每个部分都应该是有效的 base64 编码
    try {
      for (final part in parts) {
        if (part.isEmpty) return false;
        // 尝试解码 base64（添加必要的填充）
        String padded = part;
        while (padded.length % 4 != 0) {
          padded += '=';
        }
        Uri.decodeComponent(padded);
      }
      return true;
    } catch (e) {
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
