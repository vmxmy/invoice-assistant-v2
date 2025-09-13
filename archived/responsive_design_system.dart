import 'package:flutter/material.dart';

/// 设备类型枚举
enum DeviceType {
  compact,    // 小屏手机 (<400dp)
  medium,     // 大屏手机/小平板 (400-600dp)
  large,      // 平板 (600-840dp)
  extraLarge, // 桌面/大平板 (>840dp)
}

/// 响应式间距系统
class ResponsiveSpacing {
  static double xs(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.compact:
        return 4.0;
      case DeviceType.medium:
        return 6.0;
      case DeviceType.large:
        return 8.0;
      case DeviceType.extraLarge:
        return 8.0;
    }
  }

  static double sm(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.compact:
        return 8.0;
      case DeviceType.medium:
        return 12.0;
      case DeviceType.large:
        return 16.0;
      case DeviceType.extraLarge:
        return 16.0;
    }
  }

  static double md(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.compact:
        return 16.0;
      case DeviceType.medium:
        return 20.0;
      case DeviceType.large:
        return 24.0;
      case DeviceType.extraLarge:
        return 32.0;
    }
  }

  static double lg(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.compact:
        return 24.0;
      case DeviceType.medium:
        return 32.0;
      case DeviceType.large:
        return 40.0;
      case DeviceType.extraLarge:
        return 48.0;
    }
  }

  static double xl(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.compact:
        return 32.0;
      case DeviceType.medium:
        return 48.0;
      case DeviceType.large:
        return 64.0;
      case DeviceType.extraLarge:
        return 80.0;
    }
  }
}

/// 响应式图标尺寸
class ResponsiveIconSize {
  static double small(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.compact:
        return 16.0;
      case DeviceType.medium:
        return 18.0;
      case DeviceType.large:
        return 20.0;
      case DeviceType.extraLarge:
        return 24.0;
    }
  }

  static double medium(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.compact:
        return 24.0;
      case DeviceType.medium:
        return 28.0;
      case DeviceType.large:
        return 32.0;
      case DeviceType.extraLarge:
        return 40.0;
    }
  }

  static double large(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.compact:
        return 32.0;
      case DeviceType.medium:
        return 40.0;
      case DeviceType.large:
        return 48.0;
      case DeviceType.extraLarge:
        return 64.0;
    }
  }
}

/// 响应式圆角半径
class ResponsiveBorderRadius {
  static double small(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.compact:
        return 6.0;
      case DeviceType.medium:
        return 8.0;
      case DeviceType.large:
        return 8.0;
      case DeviceType.extraLarge:
        return 12.0;
    }
  }

  static double medium(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.compact:
        return 12.0;
      case DeviceType.medium:
        return 16.0;
      case DeviceType.large:
        return 16.0;
      case DeviceType.extraLarge:
        return 20.0;
    }
  }

  static double large(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.compact:
        return 16.0;
      case DeviceType.medium:
        return 20.0;
      case DeviceType.large:
        return 24.0;
      case DeviceType.extraLarge:
        return 32.0;
    }
  }
}

/// 响应式容器尺寸
class ResponsiveContainerSize {
  static double iconContainer(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.compact:
        return 60.0;
      case DeviceType.medium:
        return 80.0;
      case DeviceType.large:
        return 100.0;
      case DeviceType.extraLarge:
        return 120.0;
    }
  }

  static double listMaxHeight(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.compact:
        return 150.0;
      case DeviceType.medium:
        return 200.0;
      case DeviceType.large:
        return 250.0;
      case DeviceType.extraLarge:
        return 300.0;
    }
  }
}

/// 响应式文本缩放
class ResponsiveTextScale {
  static double scale(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.compact:
        return 0.9;
      case DeviceType.medium:
        return 1.0;
      case DeviceType.large:
        return 1.1;
      case DeviceType.extraLarge:
        return 1.2;
    }
  }
}

/// 统一的响应式设计系统
/// 提供断点、间距、尺寸的标准化管理
class ResponsiveDesignSystem {
  ResponsiveDesignSystem._();

  /// 断点定义
  static const double _compactBreakpoint = 400.0;
  static const double _mediumBreakpoint = 600.0;
  static const double _largeBreakpoint = 840.0;
  static const double _extraLargeBreakpoint = 1200.0;

  /// 根据宽度获取设备类型
  static DeviceType getDeviceType(double width) {
    if (width < _compactBreakpoint) return DeviceType.compact;
    if (width < _mediumBreakpoint) return DeviceType.medium;
    if (width < _largeBreakpoint) return DeviceType.large;
    return DeviceType.extraLarge;
  }

  /// 快捷方法：判断是否为紧凑屏幕
  static bool isCompact(DeviceType deviceType) {
    return deviceType == DeviceType.compact;
  }

  /// 快捷方法：判断是否为大屏幕
  static bool isLarge(DeviceType deviceType) {
    return deviceType == DeviceType.large || deviceType == DeviceType.extraLarge;
  }
}

/// 响应式建构器 Widget
class ResponsiveBuilder extends StatelessWidget {
  final Widget Function(BuildContext context, DeviceType deviceType) builder;

  const ResponsiveBuilder({
    super.key,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final deviceType = ResponsiveDesignSystem.getDeviceType(constraints.maxWidth);
        return builder(context, deviceType);
      },
    );
  }
}

/// 响应式扩展方法
extension ResponsiveContext on BuildContext {
  DeviceType get deviceType {
    return ResponsiveDesignSystem.getDeviceType(MediaQuery.of(this).size.width);
  }

  bool get isCompactDevice {
    return ResponsiveDesignSystem.isCompact(deviceType);
  }

  bool get isLargeDevice {
    return ResponsiveDesignSystem.isLarge(deviceType);
  }
}