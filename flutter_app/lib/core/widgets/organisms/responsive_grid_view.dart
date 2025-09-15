import 'package:flutter/material.dart';
import '../../theme/ios_theme_adapter.dart';

/// 响应式网格视图组件
/// 
/// 根据屏幕尺寸自动调整列数和布局，提供一致的网格体验
class ResponsiveGridView extends StatelessWidget {
  /// 子组件构建器
  final Widget Function(BuildContext context, int index) itemBuilder;
  
  /// 子组件数量
  final int itemCount;
  
  /// 最小卡片宽度 (用于计算列数)
  final double minItemWidth;
  
  /// 主轴间距
  final double mainAxisSpacing;
  
  /// 横轴间距
  final double crossAxisSpacing;
  
  /// 网格内边距
  final EdgeInsets padding;
  
  /// 子组件宽高比
  final double childAspectRatio;
  
  /// 滚动控制器
  final ScrollController? controller;
  
  /// 滚动物理效果
  final ScrollPhysics? physics;
  
  /// 是否收缩包装
  final bool shrinkWrap;

  const ResponsiveGridView({
    super.key,
    required this.itemBuilder,
    required this.itemCount,
    this.minItemWidth = 200.0,
    this.mainAxisSpacing = 12.0,
    this.crossAxisSpacing = 12.0,
    this.padding = const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
    this.childAspectRatio = 1.0,
    this.controller,
    this.physics,
    this.shrinkWrap = false,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = _calculateCrossAxisCount(constraints.maxWidth);
        
        return GridView.builder(
          controller: controller,
          physics: physics,
          shrinkWrap: shrinkWrap,
          padding: padding,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            mainAxisSpacing: mainAxisSpacing,
            crossAxisSpacing: crossAxisSpacing,
            childAspectRatio: childAspectRatio,
          ),
          itemCount: itemCount,
          itemBuilder: itemBuilder,
        );
      },
    );
  }

  /// 计算横轴子组件数量
  int _calculateCrossAxisCount(double availableWidth) {
    // 减去内边距
    final contentWidth = availableWidth - padding.horizontal;
    
    // 计算理论上可以容纳的列数
    final theoreticalCount = (contentWidth + crossAxisSpacing) / (minItemWidth + crossAxisSpacing);
    
    // 至少1列，最多根据设备类型限制
    final deviceType = DeviceType.medium;
    final maxColumns = _getMaxColumnsForDevice(deviceType);
    
    return theoreticalCount.floor().clamp(1, maxColumns);
  }
  
  /// 根据设备类型获取最大列数
  int _getMaxColumnsForDevice(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.small:
      case DeviceType.medium:
        return 1;
      case DeviceType.large:
        return 2;
      case DeviceType.tablet:
        return 3;
    }
  }
}

/// 响应式交错网格视图组件
/// 
/// 使用 SliverGridDelegateWithMaxCrossAxisExtent 实现更灵活的布局
class ResponsiveStaggeredGridView extends StatelessWidget {
  /// 子组件构建器
  final Widget Function(BuildContext context, int index) itemBuilder;
  
  /// 子组件数量
  final int itemCount;
  
  /// 横轴最大范围
  final double maxCrossAxisExtent;
  
  /// 主轴间距
  final double mainAxisSpacing;
  
  /// 横轴间距
  final double crossAxisSpacing;
  
  /// 网格内边距
  final EdgeInsets padding;
  
  /// 子组件宽高比
  final double childAspectRatio;
  
  /// 滚动控制器
  final ScrollController? controller;
  
  /// 滚动物理效果
  final ScrollPhysics? physics;
  
  /// 是否收缩包装
  final bool shrinkWrap;

  const ResponsiveStaggeredGridView({
    super.key,
    required this.itemBuilder,
    required this.itemCount,
    this.maxCrossAxisExtent = 250.0,
    this.mainAxisSpacing = 12.0,
    this.crossAxisSpacing = 12.0,
    this.padding = const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
    this.childAspectRatio = 1.2,
    this.controller,
    this.physics,
    this.shrinkWrap = false,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final deviceType = DeviceType.medium;
        final responsiveMaxExtent = _getResponsiveMaxExtent(deviceType);
        
        return GridView.builder(
          controller: controller,
          physics: physics,
          shrinkWrap: shrinkWrap,
          padding: padding,
          gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: responsiveMaxExtent,
            mainAxisSpacing: mainAxisSpacing,
            crossAxisSpacing: crossAxisSpacing,
            childAspectRatio: childAspectRatio,
          ),
          itemCount: itemCount,
          itemBuilder: itemBuilder,
        );
      },
    );
  }
  
  /// 根据设备类型获取响应式最大横轴范围
  double _getResponsiveMaxExtent(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.small:
      case DeviceType.medium:
        return double.infinity; // 单列
      case DeviceType.large:
        return maxCrossAxisExtent * 0.8;
      case DeviceType.tablet:
        return maxCrossAxisExtent;
    }
  }
}

/// 自适应网格组件
/// 
/// 结合了固定列数和最大范围的优点，提供最佳的响应式体验
class AdaptiveGridView extends StatelessWidget {
  /// 子组件构建器
  final Widget Function(BuildContext context, int index) itemBuilder;
  
  /// 子组件数量
  final int itemCount;
  
  /// 网格配置
  final AdaptiveGridConfig config;
  
  /// 滚动控制器
  final ScrollController? controller;
  
  /// 滚动物理效果
  final ScrollPhysics? physics;
  
  /// 是否收缩包装
  final bool shrinkWrap;
  
  /// 网格内边距
  final EdgeInsets padding;

  const AdaptiveGridView({
    super.key,
    required this.itemBuilder,
    required this.itemCount,
    this.config = const AdaptiveGridConfig(),
    this.controller,
    this.physics,
    this.shrinkWrap = false,
    this.padding = const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final deviceType = DeviceType.medium;
        final gridDelegate = config.getDelegateForDevice(deviceType);
        
        return GridView.builder(
          controller: controller,
          physics: physics,
          shrinkWrap: shrinkWrap,
          padding: padding,
          gridDelegate: gridDelegate,
          itemCount: itemCount,
          itemBuilder: itemBuilder,
        );
      },
    );
  }
}

/// 自适应网格配置
class AdaptiveGridConfig {
  /// 移动端配置
  final GridConfig mobileConfig;
  
  /// 平板端配置
  final GridConfig tabletConfig;
  
  /// 桌面端配置
  final GridConfig desktopConfig;
  
  /// 大屏配置
  final GridConfig largeConfig;

  const AdaptiveGridConfig({
    this.mobileConfig = const GridConfig(crossAxisCount: 1),
    this.tabletConfig = const GridConfig(crossAxisCount: 2),
    this.desktopConfig = const GridConfig(crossAxisCount: 3),
    this.largeConfig = const GridConfig(crossAxisCount: 4),
  });

  /// 根据设备类型获取对应的网格代理
  SliverGridDelegate getDelegateForDevice(DeviceType deviceType) {
    final config = switch (deviceType) {
      DeviceType.small => mobileConfig,
      DeviceType.medium => mobileConfig,
      DeviceType.large => largeConfig,
      DeviceType.tablet => tabletConfig,
    };
    
    return config.createDelegate();
  }
}

/// 网格配置
class GridConfig {
  /// 横轴数量 (如果设置则使用固定列数)
  final int? crossAxisCount;
  
  /// 横轴最大范围 (如果设置则使用最大范围)
  final double? maxCrossAxisExtent;
  
  /// 主轴间距
  final double mainAxisSpacing;
  
  /// 横轴间距
  final double crossAxisSpacing;
  
  /// 子组件宽高比
  final double childAspectRatio;

  const GridConfig({
    this.crossAxisCount,
    this.maxCrossAxisExtent,
    this.mainAxisSpacing = 12.0,
    this.crossAxisSpacing = 12.0,
    this.childAspectRatio = 1.2,
  }) : assert(crossAxisCount != null || maxCrossAxisExtent != null,
             'Either crossAxisCount or maxCrossAxisExtent must be provided');

  /// 创建网格代理
  SliverGridDelegate createDelegate() {
    if (crossAxisCount != null) {
      return SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount!,
        mainAxisSpacing: mainAxisSpacing,
        crossAxisSpacing: crossAxisSpacing,
        childAspectRatio: childAspectRatio,
      );
    } else {
      return SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: maxCrossAxisExtent!,
        mainAxisSpacing: mainAxisSpacing,
        crossAxisSpacing: crossAxisSpacing,
        childAspectRatio: childAspectRatio,
      );
    }
  }
}