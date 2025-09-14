/// 应用硬编码常量统一配置中心
/// 
/// 这个文件集中管理所有应用中的硬编码数值，便于统一维护和调整
/// 
/// 组织原则：
/// 1. 按功能模块分组
/// 2. 使用语义化命名
/// 3. 提供详细注释
/// 4. 遵循Flutter最佳实践
class AppConstants {
  // 私有构造函数，防止实例化
  AppConstants._();

  /// ====== 文件上传相关常量 ======
  
  /// 最大文件大小 (10MB)
  static const int maxFileSize = 10 * 1024 * 1024;
  
  /// 最大文件数量
  static const int maxFileCount = 5;
  
  /// 支持的文件格式
  static const List<String> supportedFileExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
  
  /// 上传并发限制
  static const int maxConcurrentUploads = 3;
  
  /// 上传重试次数
  static const int uploadRetryCount = 3;

  /// ====== 网络请求相关常量 ======
  
  /// 默认请求超时时间 (30秒)
  static const Duration defaultRequestTimeout = Duration(seconds: 30);
  
  /// 文件上传超时时间 (2分钟)
  static const Duration uploadTimeout = Duration(minutes: 2);
  
  /// 连接超时时间 (10秒)
  static const Duration connectionTimeout = Duration(seconds: 10);
  
  /// 最大重试次数
  static const int maxRetryAttempts = 3;
  
  /// 下载超时时间 (60秒)
  static const Duration downloadTimeout = Duration(seconds: 60);
  
  /// 最大下载文件大小 (50MB)
  static const int maxDownloadFileSize = 50 * 1024 * 1024;

  /// ====== 缓存相关常量 ======
  
  /// 发票列表缓存时间 (5分钟)
  static const Duration invoiceListCacheTtl = Duration(minutes: 5);
  
  /// 发票统计缓存时间 (2分钟)
  static const Duration invoiceStatsCacheTtl = Duration(minutes: 2);
  
  /// 权限缓存时间 (2小时)
  static const Duration permissionsCacheTtl = Duration(hours: 2);
  
  /// 最大列表缓存数量
  static const int maxListCacheSize = 10;
  
  /// 最大详情缓存数量
  static const int maxDetailCacheSize = 50;

  /// ====== 分页相关常量 ======
  
  /// 默认页面大小
  static const int defaultPageSize = 20;
  
  /// 大页面大小 (用于一次性获取)
  static const int largePageSize = 1000;
  
  /// 最小页面大小
  static const int minPageSize = 5;
  
  /// 最大页面大小
  static const int maxPageSize = 100;

  /// ====== 动画相关常量 ======
  
  /// 快速动画时长 (200ms)
  static const Duration fastAnimationDuration = Duration(milliseconds: 200);
  
  /// 普通动画时长 (300ms)
  static const Duration normalAnimationDuration = Duration(milliseconds: 300);
  
  /// 慢速动画时长 (500ms)
  static const Duration slowAnimationDuration = Duration(milliseconds: 500);
  
  /// 长动画时长 (1000ms)
  static const Duration longAnimationDuration = Duration(milliseconds: 1000);

  /// ====== 业务逻辑相关常量 ======
  
  /// 发票过期天数 (90天)
  static const int invoiceOverdueDays = 90;
  
  /// 发票紧急天数 (60天)
  static const int invoiceUrgentDays = 60;
  
  /// 最大未来日期范围 (1年)
  static const int maxFutureDays = 365;
  
  /// 金额显示阈值 - 万元
  static const double amountWanThreshold = 10000;
  
  /// 金额显示阈值 - 千元
  static const double amountThousandThreshold = 1000;

  /// ====== 数据处理相关常量 ======
  
  /// OCR处理步骤数
  static const int ocrProcessSteps = 20;
  
  /// OCR每步延迟时间 (150ms)
  static const Duration ocrStepDelay = Duration(milliseconds: 150);
  
  /// 权限检查超时 (3秒)
  static const Duration permissionCheckTimeout = Duration(seconds: 3);

  /// ====== 用户界面相关常量 ======
  
  /// PDF容器横向A4比例
  static const double landscapeA4Ratio = 0.707;
  
  /// 文件大小转换单位 (KB)
  static const int fileSizeKbUnit = 1024;
  
  /// 最小触摸目标大小 (44dp)
  static const double minTouchTargetSize = 44.0;
  
  /// URL签名有效期 (1小时)
  static const int urlSignatureExpiration = 3600;

  /// ====== 延迟相关常量 ======
  
  /// UI状态更新延迟 (100ms)
  static const Duration uiUpdateDelay = Duration(milliseconds: 100);
  
  /// 短延迟 (100ms)
  static const Duration shortDelay = Duration(milliseconds: 100);
  
  /// 中等延迟 (500ms) 
  static const Duration mediumDelay = Duration(milliseconds: 500);
  
  /// 长延迟 (1秒)
  static const Duration longDelay = Duration(seconds: 1);

  /// ====== 颜色相关常量 ======
  
  /// 橙色警告色值
  static const int warningColorValue = 0xFFFF9800;
  
  /// 透明度 - 10%
  static const double opacity10 = 0.1;
  
  /// 透明度 - 30%
  static const double opacity30 = 0.3;
  
  /// 透明度 - 50%
  static const double opacity50 = 0.5;
  
  /// 透明度 - 80%
  static const double opacity80 = 0.8;

  /// ====== 正则表达式常量 ======
  
  /// 邮箱验证正则
  static const String emailRegex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';
  
  /// 手机号验证正则
  static const String phoneRegex = r'^1[3-9]\d{9}$';
  
  /// 数字验证正则
  static const String numberRegex = r'^\d+(\.\d+)?$';
  
  /// 文件扩展名提取正则
  static const String fileExtensionRegex = r'\.([a-zA-Z0-9]+)$';

  /// ====== 格式化相关常量 ======
  
  /// 日期格式
  static const String dateFormat = 'yyyy-MM-dd';
  
  /// 日期时间格式
  static const String dateTimeFormat = 'yyyy-MM-dd HH:mm:ss';
  
  /// 金额小数位数
  static const int amountDecimalPlaces = 2;
  
  /// 文件大小小数位数
  static const int fileSizeDecimalPlaces = 1;

  /// ====== 限制相关常量 ======
  
  /// 最大输入长度
  static const int maxInputLength = 1000;
  
  /// 发票名称最大长度
  static const int maxInvoiceNameLength = 200;
  
  /// 备注最大长度  
  static const int maxCommentLength = 500;
  
  /// 最大错误消息长度
  static const int maxErrorMessageLength = 200;

  /// ====== 开发调试相关常量 ======
  
  /// 调试模式下的延迟时间
  static const Duration debugDelay = Duration(milliseconds: 500);
  
  /// 测试数据生成数量
  static const int testDataCount = 10;
  
  /// 日志标签最大长度
  static const int maxLogTagLength = 20;

  /// ====== 性能相关常量 ======
  
  /// 列表滚动预加载阈值
  static const double scrollLoadThreshold = 200.0;
  
  /// 图片缓存大小 (50MB)
  static const int imageCacheSize = 50 * 1024 * 1024;
  
  /// 最大内存使用量 (100MB)
  static const int maxMemoryUsage = 100 * 1024 * 1024;

  /// ====== 辅助方法 ======
  
  /// 检查文件大小是否合法
  static bool isFileSizeValid(int sizeInBytes) {
    return sizeInBytes <= maxFileSize;
  }
  
  /// 检查文件扩展名是否支持
  static bool isFileExtensionSupported(String extension) {
    return supportedFileExtensions.contains(extension.toLowerCase());
  }
  
  /// 获取格式化的文件大小
  static String getFormattedFileSize(int sizeInBytes) {
    if (sizeInBytes < fileSizeKbUnit) {
      return '${sizeInBytes}B';
    } else if (sizeInBytes < fileSizeKbUnit * fileSizeKbUnit) {
      return '${(sizeInBytes / fileSizeKbUnit).toStringAsFixed(fileSizeDecimalPlaces)}KB';
    } else {
      return '${(sizeInBytes / (fileSizeKbUnit * fileSizeKbUnit)).toStringAsFixed(fileSizeDecimalPlaces)}MB';
    }
  }
  
  /// 获取格式化的金额
  static String getFormattedAmount(double amount) {
    if (amount >= amountWanThreshold) {
      return '¥${(amount / amountWanThreshold).toStringAsFixed(amountDecimalPlaces)}万';
    } else if (amount >= amountThousandThreshold) {
      return '¥${(amount / amountThousandThreshold).toStringAsFixed(amountDecimalPlaces)}k';
    } else {
      return '¥${amount.toStringAsFixed(amountDecimalPlaces)}';
    }
  }
  
  /// 验证邮箱格式
  static bool isValidEmail(String email) {
    return RegExp(emailRegex).hasMatch(email);
  }
  
  /// 验证手机号格式
  static bool isValidPhone(String phone) {
    return RegExp(phoneRegex).hasMatch(phone);
  }
}