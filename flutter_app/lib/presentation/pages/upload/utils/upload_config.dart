/// 上传配置管理
class UploadConfig {
  /// 最大文件大小 (10MB)
  static const int maxFileSize = 10 * 1024 * 1024;
  
  /// 最大文件数量
  static const int maxFileCount = 5;
  
  /// 支持的文件扩展名
  static const List<String> supportedExtensions = [
    'pdf', 'jpg', 'jpeg', 'png', 'webp'
  ];
  
  /// 支持的MIME类型
  static const List<String> supportedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
  ];
  
  /// 防抖延迟时间
  static const Duration debounceDelay = Duration(milliseconds: 100);
  
  /// 动画持续时间
  static const Duration animationDuration = Duration(milliseconds: 300);
  
  /// 紧凑模式断点
  static const double compactModeBreakpoint = 320;
  
  /// 响应式断点
  static const double tabletBreakpoint = 768;
  
  /// 默认内边距
  static const double defaultPadding = 16.0;
  static const double compactPadding = 12.0;
  static const double tabletPadding = 24.0;
  
  /// 圆角半径
  static const double defaultRadius = 12.0;
  static const double largeRadius = 16.0;
  
  /// 获取基于屏幕宽度的配置
  static UploadScreenConfig getScreenConfig(double screenWidth) {
    if (screenWidth < compactModeBreakpoint) {
      return const UploadScreenConfig.compact();
    } else if (screenWidth > tabletBreakpoint) {
      return const UploadScreenConfig.tablet();
    } else {
      return const UploadScreenConfig.normal();
    }
  }
}

/// 屏幕配置类
class UploadScreenConfig {
  final double padding;
  final double radius;
  final double iconSize;
  final double spacing;
  final bool isCompact;
  
  const UploadScreenConfig({
    required this.padding,
    required this.radius,
    required this.iconSize,
    required this.spacing,
    required this.isCompact,
  });
  
  const UploadScreenConfig.compact()
      : padding = UploadConfig.compactPadding,
        radius = UploadConfig.defaultRadius,
        iconSize = 24.0,
        spacing = 8.0,
        isCompact = true;
        
  const UploadScreenConfig.normal()
      : padding = UploadConfig.defaultPadding,
        radius = UploadConfig.defaultRadius,
        iconSize = 28.0,
        spacing = 12.0,
        isCompact = false;
        
  const UploadScreenConfig.tablet()
      : padding = UploadConfig.tabletPadding,
        radius = UploadConfig.largeRadius,
        iconSize = 32.0,
        spacing = 16.0,
        isCompact = false;
}