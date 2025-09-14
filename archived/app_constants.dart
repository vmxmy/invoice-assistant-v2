/// 应用程序常量定义
class AppConstants {
  AppConstants._();

  // 应用信息
  static const String appName = '发票助手';
  static const String appVersion = '1.0.0';

  // 数据库相关
  static const int pageSize = 20;
  static const int maxRetryCount = 3;

  // UI相关
  static const double defaultPadding = 16.0;
  static const double defaultRadius = 12.0;
  static const double cardElevation = 2.0;

  // 动画时间
  static const Duration shortAnimationDuration = Duration(milliseconds: 200);
  static const Duration mediumAnimationDuration = Duration(milliseconds: 350);
  static const Duration longAnimationDuration = Duration(milliseconds: 500);

  // 文件大小限制
  static const int maxFileSizeMB = 10;
  static const int maxFileSize = maxFileSizeMB * 1024 * 1024; // 10MB in bytes

  // 支持的文件类型
  static const List<String> supportedImageTypes = ['jpg', 'jpeg', 'png', 'pdf'];
}
