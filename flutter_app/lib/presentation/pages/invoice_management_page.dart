import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import '../../domain/value_objects/invoice_status.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../core/di/injection_container.dart';
import '../../core/network/supabase_client.dart';
import '../../core/config/app_config.dart';
import '../../domain/entities/invoice_entity.dart';
import '../bloc/invoice_bloc.dart';
import '../bloc/invoice_event.dart';
import '../bloc/invoice_state.dart';
import '../widgets/invoice_card_widget.dart';
import '../widgets/invoice_stats_widget.dart';

/// 发票管理页面 - 使用新的分层架构
class InvoiceManagementPage extends StatefulWidget {
  const InvoiceManagementPage({super.key});

  @override
  State<InvoiceManagementPage> createState() => _InvoiceManagementPageState();
}

class _InvoiceManagementPageState extends State<InvoiceManagementPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late ScrollController _scrollController;
  String _searchQuery = '';
  String _selectedFilter = '全部';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _scrollController = ScrollController();
    
    // 监听滚动事件实现无限滚动
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (AppConfig.enableLogging) {
      print('📜 [Scroll] 滚动事件 - 位置: ${_scrollController.offset.toStringAsFixed(1)}');
    }
    
    if (_isBottom) {
      final currentState = context.read<InvoiceBloc>().state;
      if (AppConfig.enableLogging) {
        print('📜 [Scroll] 检测到底部，触发加载更多发票');
        if (currentState is InvoiceLoaded) {
          print('📜 [Scroll] 当前状态 - 已加载: ${currentState.invoices.length}, hasMore: ${currentState.hasMore}, isLoadingMore: ${currentState.isLoadingMore}');
        }
      }
      context.read<InvoiceBloc>().add(const LoadMoreInvoices());
    }
  }

  bool get _isBottom {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    final threshold = maxScroll * 0.8; // 降低阈值，80%时就触发
    final isBottom = currentScroll >= threshold;
    
    if (AppConfig.enableLogging) {
      if (isBottom) {
        print('📜 [Scroll] ✅ 达到加载阈值 - current: ${currentScroll.toStringAsFixed(1)}, max: ${maxScroll.toStringAsFixed(1)}, threshold: ${threshold.toStringAsFixed(1)}');
      } else if (currentScroll > maxScroll * 0.7) {
        print('📜 [Scroll] ⚠️ 接近底部 - current: ${currentScroll.toStringAsFixed(1)}, max: ${maxScroll.toStringAsFixed(1)}, 进度: ${(currentScroll / maxScroll * 100).toStringAsFixed(1)}%');
      }
    }
    
    return isBottom;
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<InvoiceBloc>()
        ..add(const LoadInvoices(refresh: true))
        ..add(const LoadInvoiceStats()),
      child: Scaffold(
        body: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            _buildAppBar(context),
          ],
          body: TabBarView(
            controller: _tabController,
            children: [
              _buildAllInvoicesTab(),
              _buildMonthlyInvoicesTab(),
              _buildFavoritesTab(),
            ],
          ),
        ),
      ),
    );
  }

  /// 构建应用栏
  Widget _buildAppBar(BuildContext context) {
    return SliverAppBar(
      title: const Text('发票管理'),
      centerTitle: true,
      floating: true,
      pinned: true,
      actions: [],
      bottom: TabBar(
        controller: _tabController,
        tabs: const [
          Tab(text: '全部发票'),
          Tab(text: '本月发票'),
          Tab(text: '收藏'),
        ],
      ),
    );
  }

  /// 构建全部发票标签页
  Widget _buildAllInvoicesTab() {
    return BlocBuilder<InvoiceBloc, InvoiceState>(
      buildWhen: (previous, current) => 
        current is InvoiceLoading || 
        current is InvoiceError || 
        current is InvoiceLoaded,
      builder: (context, state) {
        if (state is InvoiceLoading) {
          return const Center(child: CircularProgressIndicator());
        }
        
        if (state is InvoiceError) {
          return _buildErrorWidget(state.message, () {
            context.read<InvoiceBloc>().add(const LoadInvoices(refresh: true));
          });
        }
        
        if (state is InvoiceLoaded) {
          return Column(
            children: [
              // 搜索和筛选栏
              if (_searchQuery.isNotEmpty || _selectedFilter != '全部')
                _buildSearchFilterBar(),
              
              // 发票列表
              Expanded(
                child: _buildInvoiceList(state.invoices, state.isLoadingMore),
              ),
            ],
          );
        }
        
        return const Center(child: Text('暂无数据'));
      },
    );
  }

  /// 构建本月发票标签页
  Widget _buildMonthlyInvoicesTab() {
    return BlocBuilder<InvoiceBloc, InvoiceState>(
      buildWhen: (previous, current) => 
        current is InvoiceLoading || 
        current is InvoiceError || 
        current is InvoiceLoaded,
      builder: (context, state) {
        if (state is InvoiceLoading) {
          return const Center(child: CircularProgressIndicator());
        }
        
        if (state is InvoiceLoaded) {
          // 筛选本月发票
          final now = DateTime.now();
          final currentMonthInvoices = state.invoices.where((invoice) {
            return invoice.invoiceDate.year == now.year && 
                   invoice.invoiceDate.month == now.month;
          }).toList();

          return Column(
            children: [
              // 统计卡片
              BlocBuilder<InvoiceBloc, InvoiceState>(
                buildWhen: (previous, current) => current is InvoiceStatsLoaded,
                builder: (context, statsState) {
                  if (statsState is InvoiceStatsLoaded) {
                    return InvoiceStatsWidget(stats: statsState.stats);
                  }
                  return const SizedBox.shrink();
                },
              ),
              
              // 本月发票列表
              Expanded(
                child: _buildInvoiceList(currentMonthInvoices, false),
              ),
            ],
          );
        }
        
        return const Center(child: Text('暂无数据'));
      },
    );
  }

  /// 构建收藏标签页
  Widget _buildFavoritesTab() {
    return BlocBuilder<InvoiceBloc, InvoiceState>(
      buildWhen: (previous, current) => 
        current is InvoiceLoading || 
        current is InvoiceError || 
        current is InvoiceLoaded,
      builder: (context, state) {
        if (state is InvoiceLoaded) {
          // 筛选已验证的发票作为收藏
          final favoriteInvoices = state.invoices.where((invoice) {
            return invoice.isVerified; // 使用已验证字段替代状态判断
          }).toList();

          return _buildInvoiceList(favoriteInvoices, false);
        }
        
        return const Center(child: Text('暂无收藏的发票'));
      },
    );
  }

  /// 构建发票列表
  Widget _buildInvoiceList(List<InvoiceEntity> invoices, bool isLoadingMore) {
    if (invoices.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('暂无发票', style: TextStyle(fontSize: 18, color: Colors.grey)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        context.read<InvoiceBloc>().add(const RefreshInvoices());
      },
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        itemCount: invoices.length + (isLoadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == invoices.length) {
            return const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            );
          }

          final invoice = invoices[index];
          return InvoiceCardWidget(
            invoice: invoice,
            onTap: () => _viewInvoiceDetail(invoice),
            onDelete: () => _showDeleteConfirmation(invoice),
            onStatusChanged: (newStatus) => _handleStatusChange(invoice, newStatus),
            showConsumptionDateOnly: !kIsWeb && Platform.isIOS,
          );
        },
      ),
    );
  }

  /// 构建搜索筛选栏
  Widget _buildSearchFilterBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).dividerColor,
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        children: [
          if (_searchQuery.isNotEmpty) ...[
            Chip(
              label: Text('搜索: $_searchQuery'),
              onDeleted: () => setState(() => _searchQuery = ''),
            ),
            const SizedBox(width: 8),
          ],
          if (_selectedFilter != '全部') ...[
            Chip(
              label: Text('筛选: $_selectedFilter'),
              onDeleted: () => setState(() => _selectedFilter = '全部'),
            ),
          ],
        ],
      ),
    );
  }

  /// 构建错误组件
  Widget _buildErrorWidget(String message, VoidCallback onRetry) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.red.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            '加载失败',
            style: TextStyle(
              fontSize: 18,
              color: Colors.red.withValues(alpha: 0.7),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.withValues(alpha: 0.8),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: onRetry,
            child: const Text('重试'),
          ),
        ],
      ),
    );
  }


  /// 查看发票详情
  void _viewInvoiceDetail(InvoiceEntity invoice) {
    context.push('/invoice-detail/${invoice.id}');
  }

  /// 显示删除确认对话框
  void _showDeleteConfirmation(InvoiceEntity invoice) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除发票'),
        content: Text('确定要删除 ${invoice.sellerName ?? invoice.invoiceNumber} 吗？此操作无法撤销。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<InvoiceBloc>().add(DeleteInvoice(invoice.id));
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('删除'),
          ),
        ],
      ),
    );
  }

  /// 处理发票状态切换
  void _handleStatusChange(InvoiceEntity invoice, InvoiceStatus newStatus) {
    context.read<InvoiceBloc>().add(UpdateInvoiceStatus(
      invoiceId: invoice.id,
      newStatus: newStatus,
    ));
  }
}