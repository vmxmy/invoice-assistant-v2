import 'package:flutter/material.dart';
import '../../../domain/entities/invoice_entity.dart';
import '../../../presentation/widgets/invoice_card_widget.dart';
import 'responsive_grid_view.dart';
import '../../theme/ios_theme_adapter.dart';

/// 响应式发票网格视图组件
/// 
/// 根据屏幕尺寸自动调整发票卡片的网格布局
class InvoiceGridView extends StatelessWidget {
  /// 发票列表
  final List<InvoiceEntity> invoices;
  
  /// 发票点击回调
  final ValueChanged<InvoiceEntity>? onInvoiceTap;
  
  /// 发票长按回调
  final ValueChanged<InvoiceEntity>? onInvoiceLongPress;
  
  /// 滚动控制器
  final ScrollController? controller;
  
  /// 滚动物理效果
  final ScrollPhysics? physics;
  
  /// 是否收缩包装
  final bool shrinkWrap;
  
  /// 是否显示加载指示器
  final bool showLoading;
  
  /// 空状态占位组件
  final Widget? emptyWidget;
  
  /// 加载指示器组件
  final Widget? loadingWidget;
  
  /// 网格布局模式
  final InvoiceGridLayoutMode layoutMode;

  const InvoiceGridView({
    super.key,
    required this.invoices,
    this.onInvoiceTap,
    this.onInvoiceLongPress,
    this.controller,
    this.physics,
    this.shrinkWrap = false,
    this.showLoading = false,
    this.emptyWidget,
    this.loadingWidget,
    this.layoutMode = InvoiceGridLayoutMode.adaptive,
  });

  @override
  Widget build(BuildContext context) {
    // 显示加载状态
    if (showLoading) {
      return _buildLoadingState();
    }
    
    // 显示空状态
    if (invoices.isEmpty) {
      return _buildEmptyState(context);
    }
    
    // 根据布局模式构建网格
    return _buildGridByLayoutMode(context);
  }

  /// 构建加载状态
  Widget _buildLoadingState() {
    return loadingWidget ??
        const Center(
          child: CircularProgressIndicator(),
        );
  }

  /// 构建空状态
  Widget _buildEmptyState(BuildContext context) {
    return emptyWidget ??
        Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.receipt_long,
                size: 80,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: 16.0),
              Text(
                '暂无发票数据',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        );
  }

  /// 根据布局模式构建网格
  Widget _buildGridByLayoutMode(BuildContext context) {
    switch (layoutMode) {
      case InvoiceGridLayoutMode.fixed:
        return _buildFixedGrid();
      case InvoiceGridLayoutMode.staggered:
        return _buildStaggeredGrid();
      case InvoiceGridLayoutMode.adaptive:
        return _buildAdaptiveGrid();
    }
  }

  /// 构建固定网格
  Widget _buildFixedGrid() {
    return ResponsiveGridView(
      itemBuilder: (context, index) => _buildInvoiceCard(invoices[index]),
      itemCount: invoices.length,
      controller: controller,
      physics: physics,
      shrinkWrap: shrinkWrap,
      childAspectRatio: 1.4, // 发票卡片的宽高比
      minItemWidth: 280.0, // 发票卡片的最小宽度
    );
  }

  /// 构建交错网格
  Widget _buildStaggeredGrid() {
    return ResponsiveStaggeredGridView(
      itemBuilder: (context, index) => _buildInvoiceCard(invoices[index]),
      itemCount: invoices.length,
      controller: controller,
      physics: physics,
      shrinkWrap: shrinkWrap,
      maxCrossAxisExtent: 300.0,
      childAspectRatio: 1.3,
    );
  }

  /// 构建自适应网格
  Widget _buildAdaptiveGrid() {
    return AdaptiveGridView(
      itemBuilder: (context, index) => _buildInvoiceCard(invoices[index]),
      itemCount: invoices.length,
      controller: controller,
      physics: physics,
      shrinkWrap: shrinkWrap,
      config: const AdaptiveGridConfig(
        mobileConfig: GridConfig(
          crossAxisCount: 1,
          childAspectRatio: 3.5, // 移动端较宽的卡片
        ),
        tabletConfig: GridConfig(
          crossAxisCount: 2,
          childAspectRatio: 1.6,
        ),
        desktopConfig: GridConfig(
          crossAxisCount: 3,
          childAspectRatio: 1.4,
        ),
        largeConfig: GridConfig(
          crossAxisCount: 4,
          childAspectRatio: 1.3,
        ),
      ),
    );
  }

  /// 构建发票卡片
  Widget _buildInvoiceCard(InvoiceEntity invoice) {
    return InvoiceCardWidget(
      key: ValueKey(invoice.id),
      invoice: invoice,
      onTap: () => onInvoiceTap?.call(invoice),
      onLongPress: () => onInvoiceLongPress?.call(invoice),
      showConsumptionDateOnly: true,
    );
  }
}

/// 响应式发票Sliver网格视图组件
/// 
/// 用于在CustomScrollView中使用的网格布局
class InvoiceSliverGridView extends StatelessWidget {
  /// 发票列表
  final List<InvoiceEntity> invoices;
  
  /// 发票点击回调
  final ValueChanged<InvoiceEntity>? onInvoiceTap;
  
  /// 发票长按回调
  final ValueChanged<InvoiceEntity>? onInvoiceLongPress;
  
  /// 网格布局模式
  final InvoiceGridLayoutMode layoutMode;

  const InvoiceSliverGridView({
    super.key,
    required this.invoices,
    this.onInvoiceTap,
    this.onInvoiceLongPress,
    this.layoutMode = InvoiceGridLayoutMode.adaptive,
  });

  @override
  Widget build(BuildContext context) {
    if (invoices.isEmpty) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final deviceType = DeviceType.medium;
        final gridDelegate = _getGridDelegateForDevice(deviceType);
        
        return SliverGrid(
          gridDelegate: gridDelegate,
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final invoice = invoices[index];
              return InvoiceCardWidget(
                key: ValueKey(invoice.id),
                invoice: invoice,
                onTap: () => onInvoiceTap?.call(invoice),
                onLongPress: () => onInvoiceLongPress?.call(invoice),
                showConsumptionDateOnly: true,
              );
            },
            childCount: invoices.length,
          ),
        );
      },
    );
  }

  /// 根据设备类型获取网格代理
  SliverGridDelegate _getGridDelegateForDevice(DeviceType deviceType) {
    const config = AdaptiveGridConfig();
    return config.getDelegateForDevice(deviceType);
  }
}

/// 发票网格布局模式枚举
enum InvoiceGridLayoutMode {
  /// 固定网格 - 使用固定的最小卡片宽度
  fixed,
  
  /// 交错网格 - 使用最大横轴范围
  staggered,
  
  /// 自适应网格 - 根据设备类型自动选择最佳布局
  adaptive,
}