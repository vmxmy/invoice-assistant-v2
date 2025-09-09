/// 应用配置管理
/// 管理应用级别的配置常量和环境变量
class AppConfig {
  // 私有构造函数，确保单例模式
  AppConfig._();
  
  static final AppConfig _instance = AppConfig._();
  static AppConfig get instance => _instance;
  
  // 应用基础信息
  static const String appName = '发票助手';
  static const String packageName = 'com.invoiceassist.flutter';
  static const String version = '1.0.0';
  static const int buildNumber = 1;
  
  // 支持的最低 iOS 版本
  static const String minIOSVersion = '15.0';
  
  // 调试配置
  static const bool isDebugMode = bool.fromEnvironment('DEBUG', defaultValue: false);
  static const bool enableLogging = bool.fromEnvironment('ENABLE_LOGGING', defaultValue: true);
  
  // 网络配置
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const int maxRetries = 3;
  
  // UI 配置
  static const Duration animationDuration = Duration(milliseconds: 300);
  static const double defaultPadding = 16.0;
  static const double defaultRadius = 8.0;
  
  // 缓存配置
  static const Duration cacheExpiration = Duration(hours: 1);
  static const int maxCacheSize = 100; // MB
  
  // 文件上传配置
  static const int maxImageSize = 10 * 1024 * 1024; // 10MB
  static const List<String> supportedImageTypes = ['jpg', 'jpeg', 'png', 'pdf'];
  
  /// 验证应用配置是否完整
  static bool validateConfig() {
    try {
      // 检查基础配置
      if (appName.isEmpty || packageName.isEmpty) {
        return false;
      }
      
      // 检查版本信息
      if (version.isEmpty || buildNumber <= 0) {
        return false;
      }
      
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /// 获取配置信息摘要
  static Map<String, dynamic> getConfigSummary() {
    return {
      'appName': appName,
      'packageName': packageName,
      'version': version,
      'buildNumber': buildNumber,
      'isDebugMode': isDebugMode,
      'enableLogging': enableLogging,
      'minIOSVersion': minIOSVersion,
    };
  }
  
  /// 打印配置信息（仅在调试模式下）
  static void printConfig() {
    if (isDebugMode && enableLogging) {
      print('🔧 App Configuration:');
      final config = getConfigSummary();
      config.forEach((key, value) {
        print('   $key: $value');
      });
    }
  }
}