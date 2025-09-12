import 'package:flutter/material.dart';
import '../../../domain/entities/reimbursement_set_entity.dart';
import '../../../domain/entities/invoice_entity.dart';
import '../../../presentation/widgets/optimized_reimbursement_set_card.dart';
import '../../../presentation/widgets/invoice_card_widget.dart';
import '../../theme/component_theme_constants.dart';
import 'responsive_grid_view.dart';

/// 响应式报销集合网格视图组件
/// 
/// 根据屏幕尺寸自动调整报销集合卡片的网格布局
class ReimbursementSetGridView extends StatelessWidget {
  /// 报销集合列表
  final List<ReimbursementSetEntity> reimbursementSets;
  
  /// 报销集合点击回调
  final ValueChanged<ReimbursementSetEntity>? onSetTap;
  
  /// 报销集合长按回调
  final ValueChanged<ReimbursementSetEntity>? onSetLongPress;
  
  /// 报销集合删除回调
  final ValueChanged<ReimbursementSetEntity>? onSetDelete;
  
  /// 状态变更回调
  final void Function(ReimbursementSetEntity, ReimbursementSetStatus)? onStatusChange;
  
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
  final ReimbursementSetGridLayoutMode layoutMode;

  const ReimbursementSetGridView({
    super.key,
    required this.reimbursementSets,
    this.onSetTap,
    this.onSetLongPress,
    this.onSetDelete,
    this.onStatusChange,
    this.controller,
    this.physics,
    this.shrinkWrap = false,
    this.showLoading = false,
    this.emptyWidget,
    this.loadingWidget,
    this.layoutMode = ReimbursementSetGridLayoutMode.adaptive,
  });

  @override
  Widget build(BuildContext context) {
    // 显示加载状态
    if (showLoading) {
      return _buildLoadingState();
    }
    
    // 显示空状态
    if (reimbursementSets.isEmpty) {
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
                Icons.folder_outlined,
                size: 80,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: ComponentThemeConstants.spacingL),
              Text(
                '暂无报销集合',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: ComponentThemeConstants.spacingS),
              Text(
                '创建第一个报销集合开始管理发票',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        );
  }

  /// 根据布局模式构建网格
  Widget _buildGridByLayoutMode(BuildContext context) {
    switch (layoutMode) {
      case ReimbursementSetGridLayoutMode.fixed:
        return _buildFixedGrid();
      case ReimbursementSetGridLayoutMode.staggered:
        return _buildStaggeredGrid();
      case ReimbursementSetGridLayoutMode.adaptive:
        return _buildAdaptiveGrid();
    }
  }

  /// 构建固定网格
  Widget _buildFixedGrid() {
    return ResponsiveGridView(
      itemBuilder: (context, index) => _buildReimbursementSetCard(reimbursementSets[index]),
      itemCount: reimbursementSets.length,
      controller: controller,
      physics: physics,
      shrinkWrap: shrinkWrap,
      childAspectRatio: 1.2, // 报销集合卡片的宽高比
      minItemWidth: 320.0, // 报销集合卡片的最小宽度
    );
  }

  /// 构建交错网格
  Widget _buildStaggeredGrid() {
    return ResponsiveStaggeredGridView(
      itemBuilder: (context, index) => _buildReimbursementSetCard(reimbursementSets[index]),
      itemCount: reimbursementSets.length,
      controller: controller,
      physics: physics,
      shrinkWrap: shrinkWrap,
      maxCrossAxisExtent: 350.0,
      childAspectRatio: 1.15,
    );
  }

  /// 构建自适应网格
  Widget _buildAdaptiveGrid() {
    return AdaptiveGridView(
      itemBuilder: (context, index) => _buildReimbursementSetCard(reimbursementSets[index]),
      itemCount: reimbursementSets.length,
      controller: controller,
      physics: physics,
      shrinkWrap: shrinkWrap,
      config: const AdaptiveGridConfig(
        mobileConfig: GridConfig(
          crossAxisCount: 1,
          childAspectRatio: 2.8, // 移动端较宽的卡片
          mainAxisSpacing: ComponentThemeConstants.spacingM,
        ),
        tabletConfig: GridConfig(
          crossAxisCount: 2,
          childAspectRatio: 1.4,
          mainAxisSpacing: ComponentThemeConstants.spacingL,
        ),
        desktopConfig: GridConfig(
          crossAxisCount: 2,
          childAspectRatio: 1.6,
          mainAxisSpacing: ComponentThemeConstants.spacingL,
        ),
        largeConfig: GridConfig(
          crossAxisCount: 3,
          childAspectRatio: 1.5,
          mainAxisSpacing: ComponentThemeConstants.spacingL,
        ),
      ),
    );
  }

  /// 构建报销集合卡片
  Widget _buildReimbursementSetCard(ReimbursementSetEntity reimbursementSet) {
    return OptimizedReimbursementSetCard(
      key: ValueKey(reimbursementSet.id),
      reimbursementSet: reimbursementSet,
      onTap: () => onSetTap?.call(reimbursementSet),
      onDelete: () => onSetDelete?.call(reimbursementSet),
      onStatusChange: (newStatus) => onStatusChange?.call(reimbursementSet, newStatus),
    );
  }
}

/// 响应式报销集合Sliver网格视图组件
/// 
/// 用于在CustomScrollView中使用的网格布局
class ReimbursementSetSliverGridView extends StatelessWidget {
  /// 报销集合列表
  final List<ReimbursementSetEntity> reimbursementSets;
  
  /// 报销集合点击回调
  final ValueChanged<ReimbursementSetEntity>? onSetTap;
  
  /// 报销集合长按回调
  final ValueChanged<ReimbursementSetEntity>? onSetLongPress;
  
  /// 报销集合删除回调
  final ValueChanged<ReimbursementSetEntity>? onSetDelete;
  
  /// 状态变更回调
  final void Function(ReimbursementSetEntity, ReimbursementSetStatus)? onStatusChange;
  
  /// 网格布局模式
  final ReimbursementSetGridLayoutMode layoutMode;

  const ReimbursementSetSliverGridView({
    super.key,
    required this.reimbursementSets,
    this.onSetTap,
    this.onSetLongPress,
    this.onSetDelete,
    this.onStatusChange,
    this.layoutMode = ReimbursementSetGridLayoutMode.adaptive,
  });

  @override
  Widget build(BuildContext context) {
    if (reimbursementSets.isEmpty) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final deviceType = ComponentThemeConstants.getDeviceType(constraints.maxWidth);
        final gridDelegate = _getGridDelegateForDevice(deviceType);
        
        return SliverGrid(
          gridDelegate: gridDelegate,
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final reimbursementSet = reimbursementSets[index];
              return OptimizedReimbursementSetCard(
                key: ValueKey(reimbursementSet.id),
                reimbursementSet: reimbursementSet,
                onTap: () => onSetTap?.call(reimbursementSet),
                onDelete: () => onSetDelete?.call(reimbursementSet),
                onStatusChange: (newStatus) => onStatusChange?.call(reimbursementSet, newStatus),
              );
            },
            childCount: reimbursementSets.length,
          ),
        );
      },
    );
  }

  /// 根据设备类型获取网格代理
  SliverGridDelegate _getGridDelegateForDevice(DeviceType deviceType) {
    const config = AdaptiveGridConfig(
      mobileConfig: GridConfig(
        crossAxisCount: 1,
        childAspectRatio: 2.8,
      ),
      tabletConfig: GridConfig(
        crossAxisCount: 2,
        childAspectRatio: 1.4,
      ),
      desktopConfig: GridConfig(
        crossAxisCount: 2,
        childAspectRatio: 1.6,
      ),
      largeConfig: GridConfig(
        crossAxisCount: 3,
        childAspectRatio: 1.5,
      ),
    );
    return config.getDelegateForDevice(deviceType);
  }

}

/// 混合网格视图组件
/// 
/// 同时显示发票和报销集合，自动处理不同类型的卡片
class MixedItemGridView extends StatelessWidget {
  /// 发票列表
  final List<InvoiceEntity> invoices;
  
  /// 报销集合列表
  final List<ReimbursementSetEntity> reimbursementSets;
  
  /// 发票点击回调
  final ValueChanged<InvoiceEntity>? onInvoiceTap;
  
  /// 报销集合点击回调
  final ValueChanged<ReimbursementSetEntity>? onSetTap;
  
  /// 滚动控制器
  final ScrollController? controller;
  
  /// 滚动物理效果
  final ScrollPhysics? physics;
  
  /// 是否收缩包装
  final bool shrinkWrap;

  const MixedItemGridView({
    super.key,
    required this.invoices,
    required this.reimbursementSets,
    this.onInvoiceTap,
    this.onSetTap,
    this.controller,
    this.physics,
    this.shrinkWrap = false,
  });

  @override
  Widget build(BuildContext context) {
    final allItems = <dynamic>[
      ...reimbursementSets,
      ...invoices,
    ];
    
    if (allItems.isEmpty) {
      return _buildEmptyState(context);
    }

    return AdaptiveGridView(
      itemBuilder: (context, index) {
        final item = allItems[index];
        if (item is ReimbursementSetEntity) {
          return OptimizedReimbursementSetCard(
            key: ValueKey('set_${item.id}'),
            reimbursementSet: item,
            onTap: () => onSetTap?.call(item),
            onDelete: () {}, // No-op for now
            onStatusChange: (status) {}, // No-op for now
          );
        } else if (item is InvoiceEntity) {
          return InvoiceCardWidget(
            key: ValueKey('invoice_${item.id}'),
            invoice: item,
            onTap: () => onInvoiceTap?.call(item),
          );
        } else {
          return const SizedBox.shrink();
        }
      },
      itemCount: allItems.length,
      controller: controller,
      physics: physics,
      shrinkWrap: shrinkWrap,
    );
  }

  /// 构建空状态
  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.inbox_outlined,
            size: 80,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: ComponentThemeConstants.spacingL),
          Text(
            '暂无数据',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

/// 报销集合网格布局模式枚举
enum ReimbursementSetGridLayoutMode {
  /// 固定网格 - 使用固定的最小卡片宽度
  fixed,
  
  /// 交错网格 - 使用最大横轴范围
  staggered,
  
  /// 自适应网格 - 根据设备类型自动选择最佳布局
  adaptive,
}