import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:sliver_tools/sliver_tools.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../domain/repositories/invoice_repository.dart';
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
import '../widgets/invoice_search_filter_bar.dart';
import '../widgets/app_feedback.dart';

/// 发票管理页面 - 使用新的分层架构
class InvoiceManagementPage extends StatefulWidget {
  const InvoiceManagementPage({super.key});

  @override
  State<InvoiceManagementPage> createState() => _InvoiceManagementPageState();
}

/// 内部页面组件，由BlocProvider包装
class _InvoiceManagementPageContent extends StatefulWidget {
  const _InvoiceManagementPageContent();

  @override
  State<_InvoiceManagementPageContent> createState() => _InvoiceManagementPageContentState();
}

class _InvoiceManagementPageState extends State<InvoiceManagementPage>
    with SingleTickerProviderStateMixin {
  @override
  Widget build(BuildContext context) {
    print('🏭 [InvoiceManagementPage] 使用来自MainPage的BlocProvider');
    return const _InvoiceManagementPageContent();
  }
}

class _InvoiceManagementPageContentState extends State<_InvoiceManagementPageContent>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _searchQuery = '';
  String _selectedFilter = '全部';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      print('📋 [TabController] 切换到Tab: ${_tabController.index}');
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    print('🏠 [InvoiceManagementPageContent] build 方法执行');
    
    return BlocListener<InvoiceBloc, InvoiceState>(
      listener: (context, state) {
        final bloc = context.read<InvoiceBloc>();
        print('🔥 [页面级Listener:${bloc.hashCode}] 接收到状态: ${state.runtimeType}');
        if (state is InvoiceDeleteSuccess) {
          print('🔥 [页面级Listener:${bloc.hashCode}] 删除成功，立即显示Snackbar: ${state.message}');
          AppFeedback.success(context, state.message);
        }
      },
      child: Scaffold(
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          _buildAppBar(context),
        ],
        body: TabBarView(
          controller: _tabController,
          children: [
            BlocProvider.value(
              value: context.read<InvoiceBloc>(),
              child: Builder(
                builder: (context) {
                  print('🏗️ [TabBarView] Builder构建AllInvoicesTab');
                  return _AllInvoicesTab(searchQuery: _searchQuery);
                },
              ),
            ),
            BlocProvider.value(
              value: context.read<InvoiceBloc>(),
              child: Builder(
                builder: (context) {
                  print('🏗️ [TabBarView] Builder构建MonthlyInvoicesTab');
                  return _MonthlyInvoicesTab();
                },
              ),
            ),
            BlocProvider.value(
              value: context.read<InvoiceBloc>(),
              child: Builder(
                builder: (context) {
                  print('🏗️ [TabBarView] Builder构建FavoritesTab');
                  return _FavoritesTab();
                },
              ),
            ),
          ],
        ),
      ),
    ),
    );
  }

  /// 构建应用栏
  Widget _buildAppBar(BuildContext context) {
    return SliverAppBar(
      toolbarHeight: 0, // 移除工具栏高度
      floating: true,
      pinned: true,
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


}

/// 全部发票标签页 - 独立组件，确保正确的上下文访问
class _AllInvoicesTab extends StatefulWidget {
  final String searchQuery;
  
  const _AllInvoicesTab({required this.searchQuery});
  
  @override
  State<_AllInvoicesTab> createState() => _AllInvoicesTabState();
}

class _AllInvoicesTabState extends State<_AllInvoicesTab> {
  late ScrollController _scrollController;
  String _selectedFilter = '全部';
  bool _isSelectionMode = false;
  Set<String> _selectedInvoices = <String>{};
  String _searchQuery = '';
  FilterOptions _currentFilterOptions = const FilterOptions();

  _AllInvoicesTabState() {
    print('🏗️ [AllInvoicesTabState] 构造函数执行');
  }

  @override
  void initState() {
    super.initState();
    print('🏗️ [AllInvoicesTabState] initState执行');
    _scrollController = ScrollController();
    _scrollController.addListener(_onScroll);
    
    // 检查当前状态，如果没有数据则加载
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final currentState = context.read<InvoiceBloc>().state;
      print('🏗️ [AllInvoicesTabState] 检查当前状态: ${currentState.runtimeType}');
      
      if (currentState is! InvoiceLoaded || currentState.invoices.isEmpty) {
        print('🏗️ [AllInvoicesTabState] 触发加载发票事件');
        context.read<InvoiceBloc>().add(const LoadInvoices(refresh: true));
      } else {
        print('🏗️ [AllInvoicesTabState] 已有数据，无需重新加载 - 发票数量: ${currentState.invoices.length}');
      }
    });
  }

  /// 进入选择模式
  void _enterSelectionMode(String invoiceId) {
    setState(() {
      _isSelectionMode = true;
      _selectedInvoices.add(invoiceId);
    });
  }

  /// 退出选择模式
  void _exitSelectionMode() {
    setState(() {
      _isSelectionMode = false;
      _selectedInvoices.clear();
    });
  }

  /// 切换发票选择状态
  void _toggleInvoiceSelection(String invoiceId) {
    setState(() {
      if (_selectedInvoices.contains(invoiceId)) {
        _selectedInvoices.remove(invoiceId);
        if (_selectedInvoices.isEmpty) {
          _isSelectionMode = false;
        }
      } else {
        _selectedInvoices.add(invoiceId);
      }
    });
  }

  /// 全选/取消全选
  void _toggleSelectAll(List<InvoiceEntity> invoices) {
    setState(() {
      if (_selectedInvoices.length == invoices.length) {
        _selectedInvoices.clear();
        _isSelectionMode = false;
      } else {
        _selectedInvoices = invoices.map((invoice) => invoice.id).toSet();
        _isSelectionMode = true;
      }
    });
  }

  /// 批量删除选中的发票
  void _deleteSelectedInvoices() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('批量删除'),
        content: Text('确定要删除选中的 ${_selectedInvoices.length} 张发票吗？此操作无法撤销。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              for (final invoiceId in _selectedInvoices) {
                context.read<InvoiceBloc>().add(DeleteInvoice(invoiceId));
              }
              _exitSelectionMode();
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('删除'),
          ),
        ],
      ),
    );
  }

  /// 处理搜索变化
  void _handleSearchChanged(String query) {
    setState(() {
      _searchQuery = query;
    });
  }

  /// 处理筛选变化
  void _handleFilterChanged(FilterOptions filterOptions) {
    print('🔍 [ManagementPage] _handleFilterChanged 被调用: $filterOptions');
    print('🔍 [ManagementPage] 逾期筛选: ${filterOptions.showOverdue}');
    print('🔍 [ManagementPage] 紧急筛选: ${filterOptions.showUrgent}'); 
    print('🔍 [ManagementPage] 待报销筛选: ${filterOptions.showUnreimbursed}');
    setState(() {
      _currentFilterOptions = filterOptions;
    });
    
    // 根据筛选条件触发相应的数据加载
    _loadInvoicesWithFilter(filterOptions);
  }

  /// 根据筛选条件加载发票
  void _loadInvoicesWithFilter(FilterOptions filterOptions) {
    final filters = InvoiceFilters(
      globalSearch: _searchQuery.isNotEmpty ? _searchQuery : null,
      overdue: filterOptions.showOverdue,
      urgent: filterOptions.showUrgent,
      status: _getStatusFromFilter(filterOptions),
    );
    
    print('🔍 [LoadInvoicesWithFilter] 构建的筛选条件: '
          'overdue=${filters.overdue}, urgent=${filters.urgent}, '
          'status=${filters.status}, search=${filters.globalSearch}');
    
    context.read<InvoiceBloc>().add(LoadInvoices(
      page: 1,
      refresh: false, // 不显示加载状态，让筛选更平滑
      filters: filters,
    ));
  }

  /// 根据筛选选项获取状态列表
  List<InvoiceStatus>? _getStatusFromFilter(FilterOptions filterOptions) {
    if (filterOptions.showUnreimbursed) {
      return [InvoiceStatus.unreimbursed];
    }
    return null; // 返回null表示不筛选状态
  }

  /// 应用搜索和筛选
  List<InvoiceEntity> _applySearchAndFilter(List<InvoiceEntity> invoices) {
    var filteredInvoices = invoices;
    
    // 应用搜索过滤
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filteredInvoices = filteredInvoices.where((invoice) {
        // 搜索发票号
        if (invoice.invoiceNumber.toLowerCase().contains(query)) {
          return true;
        }
        
        // 搜索销售方
        if (invoice.sellerName?.toLowerCase().contains(query) == true) {
          return true;
        }
        
        // 搜索金额（支持部分匹配）
        final amountStr = invoice.amount.toString();
        if (amountStr.contains(query)) {
          return true;
        }
        
        // 搜索总金额
        final totalAmountStr = invoice.totalAmount?.toString() ?? '';
        if (totalAmountStr.contains(query)) {
          return true;
        }
        
        // 搜索买方名称
        if (invoice.buyerName?.toLowerCase().contains(query) == true) {
          return true;
        }
        
        return false;
      }).toList();
    }
    
    return filteredInvoices;
  }

  /// 按月份分组发票数据（基于消费时间）
  Map<String, List<InvoiceEntity>> _groupInvoicesByMonth(List<InvoiceEntity> invoices) {
    final Map<String, List<InvoiceEntity>> groupedInvoices = {};
    
    for (final invoice in invoices) {
      // 使用消费时间进行分组，如果消费时间为空则使用开票时间作为fallback
      final dateForGrouping = invoice.consumptionDate ?? invoice.invoiceDate;
      final monthKey = '${dateForGrouping.year}年${dateForGrouping.month.toString().padLeft(2, '0')}月';
      groupedInvoices.putIfAbsent(monthKey, () => []).add(invoice);
    }
    
    // 按月份降序排序（最新的月份在前）
    final sortedKeys = groupedInvoices.keys.toList()
      ..sort((a, b) => b.compareTo(a));
    
    final sortedMap = <String, List<InvoiceEntity>>{};
    for (final key in sortedKeys) {
      // 每个月内按消费时间降序排序（如果消费时间为空则使用开票时间）
      final monthInvoices = groupedInvoices[key]!
        ..sort((a, b) {
          final dateA = a.consumptionDate ?? a.invoiceDate;
          final dateB = b.consumptionDate ?? b.invoiceDate;
          return dateB.compareTo(dateA);
        });
      sortedMap[key] = monthInvoices;
    }
    
    return sortedMap;
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (AppConfig.enableLogging) {
      print('📜 [AllInvoicesTab-Scroll] 滚动事件 - 位置: ${_scrollController.offset.toStringAsFixed(1)}');
    }
    
    // 检查是否到达底部
    if (_scrollController.offset >= _scrollController.position.maxScrollExtent - 200) {
      final currentState = context.read<InvoiceBloc>().state;
      if (AppConfig.enableLogging) {
        print('📜 [AllInvoicesTab-Scroll] 检测到底部，当前状态: ${currentState.runtimeType}');
      }
      
      if (currentState is InvoiceLoaded && currentState.hasMore && !currentState.isLoadingMore) {
        if (AppConfig.enableLogging) {
          print('📜 [AllInvoicesTab-Scroll] 🎯 触发加载更多发票');
          print('📜 [AllInvoicesTab-Scroll] 当前状态 - 已加载: ${currentState.invoices.length}, hasMore: ${currentState.hasMore}, isLoadingMore: ${currentState.isLoadingMore}');
        }
        context.read<InvoiceBloc>().add(const LoadMoreInvoices());
      } else {
        if (AppConfig.enableLogging) {
          if (currentState is InvoiceLoaded) {
            print('📜 [AllInvoicesTab-Scroll] ⚠️ 跳过加载更多 - hasMore: ${currentState.hasMore}, isLoadingMore: ${currentState.isLoadingMore}, 已加载: ${currentState.invoices.length}');
          } else {
            print('📜 [AllInvoicesTab-Scroll] ⚠️ 跳过加载更多 - 状态: ${currentState.runtimeType}');
          }
        }
      }
    }
  }


  @override
  Widget build(BuildContext context) {
    return BlocConsumer<InvoiceBloc, InvoiceState>(
      listener: (context, state) {
        if (state is InvoiceDeleteSuccess) {
          AppFeedback.success(context, state.message);
        }
      },
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
            // 错误重试时也使用当前筛选条件
            if (_currentFilterOptions.hasActiveFilters) {
              _loadInvoicesWithFilter(_currentFilterOptions);
            } else {
              context.read<InvoiceBloc>().add(const LoadInvoices(refresh: true));
            }
          });
        }
        
        if (state is InvoiceLoaded) {
          // 应用搜索和筛选
          final filteredInvoices = _applySearchAndFilter(state.invoices);
          
          return Column(
            children: [
              // 新的搜索筛选组件
              InvoiceSearchFilterBar(
                initialSearchQuery: _searchQuery,
                onSearchChanged: _handleSearchChanged,
                onFilterChanged: _handleFilterChanged,
                showQuickFilters: true,
                showSearchBox: true,
              ),
              
              // 多选操作栏
              if (_isSelectionMode)
                _buildSelectionToolbar(filteredInvoices),
              
              // 发票列表
              Expanded(
                child: _buildInvoiceList(filteredInvoices, state.isLoadingMore),
              ),
            ],
          );
        }
        
        return const Center(child: Text('暂无数据'));
      },
    );
  }

  /// 构建按月份分组的发票列表
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

    final groupedInvoices = _groupInvoicesByMonth(invoices);
    final monthKeys = groupedInvoices.keys.toList();

    return RefreshIndicator(
      onRefresh: () async {
        context.read<InvoiceBloc>().add(const RefreshInvoices());
      },
      child: CustomScrollView(
        controller: _scrollController,
        slivers: [
          // 为每个月份创建一个MultiSliver section
          ...monthKeys.map((monthKey) => 
            MultiSliver(
              pushPinnedChildren: true, // 防止多个header堆叠
              children: [
                // 月份标题 (粘性header)
                SliverPersistentHeader(
                  pinned: true,
                  delegate: _MonthHeaderDelegate(
                    monthKey: monthKey,
                    invoiceCount: groupedInvoices[monthKey]!.length,
                  ),
                ),
                // 该月份的发票列表
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final invoice = groupedInvoices[monthKey]![index];
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        child: InvoiceCardWidget(
                          invoice: invoice,
                          onTap: () => _viewInvoiceDetail(invoice),
                          onDelete: () => _showDeleteConfirmation(invoice),
                          onStatusChanged: (newStatus) => _handleStatusChange(invoice, newStatus),
                          showConsumptionDateOnly: !kIsWeb && Platform.isIOS,
                          isSelectionMode: _isSelectionMode,
                          isSelected: _selectedInvoices.contains(invoice.id),
                          onLongPress: () => _enterSelectionMode(invoice.id),
                          onSelectionToggle: () => _toggleInvoiceSelection(invoice.id),
                        ),
                      );
                    },
                    childCount: groupedInvoices[monthKey]!.length,
                  ),
                ),
              ],
            ),
          ).toList(),
          
          // 加载更多指示器
          if (isLoadingMore)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
        ],
      ),
    );
  }

  /// 构建多选工具栏
  Widget _buildSelectionToolbar(List<InvoiceEntity> allInvoices) {
    final isAllSelected = _selectedInvoices.length == allInvoices.length && allInvoices.isNotEmpty;
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).dividerColor,
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        children: [
          // 关闭选择模式
          IconButton(
            onPressed: _exitSelectionMode,
            icon: const Icon(Icons.close),
            tooltip: '取消选择',
          ),
          
          // 选择计数
          Expanded(
            child: Text(
              '已选择 ${_selectedInvoices.length} 项',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          
          // 全选/取消全选
          IconButton(
            onPressed: () => _toggleSelectAll(allInvoices),
            icon: Icon(isAllSelected ? Icons.deselect : Icons.select_all),
            tooltip: isAllSelected ? '取消全选' : '全选',
          ),
          
          // 批量删除
          if (_selectedInvoices.isNotEmpty)
            IconButton(
              onPressed: _deleteSelectedInvoices,
              icon: const Icon(Icons.delete),
              tooltip: '删除选中项',
              color: Colors.red,
            ),
        ],
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
          if (widget.searchQuery.isNotEmpty) ...[
            Chip(
              label: Text('搜索: ${widget.searchQuery}'),
              onDeleted: () {
                // 通知父级清除搜索
              },
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

/// 本月发票标签页
class _MonthlyInvoicesTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocConsumer<InvoiceBloc, InvoiceState>(
      listener: (context, state) {
        if (state is InvoiceDeleteSuccess) {
          AppFeedback.success(context, state.message);
        }
      },
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
                child: _buildMonthlyInvoiceList(currentMonthInvoices),
              ),
            ],
          );
        }
        
        return const Center(child: Text('暂无数据'));
      },
    );
  }

  Widget _buildMonthlyInvoiceList(List<InvoiceEntity> invoices) {
    if (invoices.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('本月暂无发票', style: TextStyle(fontSize: 18, color: Colors.grey)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: invoices.length,
      itemBuilder: (context, index) {
        final invoice = invoices[index];
        return InvoiceCardWidget(
          invoice: invoice,
          onTap: () => context.push('/invoice-detail/${invoice.id}'),
          onDelete: () => _showDeleteConfirmation(context, invoice),
          onStatusChanged: (newStatus) => _handleStatusChange(context, invoice, newStatus),
          showConsumptionDateOnly: !kIsWeb && Platform.isIOS,
        );
      },
    );
  }

  void _showDeleteConfirmation(BuildContext context, InvoiceEntity invoice) {
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

  void _handleStatusChange(BuildContext context, InvoiceEntity invoice, InvoiceStatus newStatus) {
    context.read<InvoiceBloc>().add(UpdateInvoiceStatus(
      invoiceId: invoice.id,
      newStatus: newStatus,
    ));
  }
}

/// 月份标题的SliverPersistentHeader委托
class _MonthHeaderDelegate extends SliverPersistentHeaderDelegate {
  final String monthKey;
  final int invoiceCount;

  _MonthHeaderDelegate({
    required this.monthKey,
    required this.invoiceCount,
  });

  @override
  double get minExtent => 48.0;

  @override
  double get maxExtent => 48.0;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    final theme = Theme.of(context);
    
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface.withValues(alpha: 0.95), // 半透明背景
        border: Border(
          bottom: BorderSide(
            color: theme.dividerColor.withValues(alpha: 0.3),
            width: 0.5,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: theme.shadowColor.withValues(alpha: 0.08),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          children: [
            Icon(
              Icons.calendar_month,
              color: theme.colorScheme.primary,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                monthKey,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.onSurface,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '$invoiceCount张',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  bool shouldRebuild(_MonthHeaderDelegate oldDelegate) {
    return oldDelegate.monthKey != monthKey || oldDelegate.invoiceCount != invoiceCount;
  }
}

/// 收藏标签页
class _FavoritesTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocConsumer<InvoiceBloc, InvoiceState>(
      listener: (context, state) {
        if (state is InvoiceDeleteSuccess) {
          AppFeedback.success(context, state.message);
        }
      },
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

          return _buildFavoritesList(favoriteInvoices);
        }
        
        return const Center(child: Text('暂无收藏的发票'));
      },
    );
  }

  Widget _buildFavoritesList(List<InvoiceEntity> invoices) {
    if (invoices.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.favorite_border, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('暂无收藏的发票', style: TextStyle(fontSize: 18, color: Colors.grey)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: invoices.length,
      itemBuilder: (context, index) {
        final invoice = invoices[index];
        return InvoiceCardWidget(
          invoice: invoice,
          onTap: () => context.push('/invoice-detail/${invoice.id}'),
          onDelete: () => _showDeleteConfirmation(context, invoice),
          onStatusChanged: (newStatus) => _handleStatusChange(context, invoice, newStatus),
          showConsumptionDateOnly: !kIsWeb && Platform.isIOS,
        );
      },
    );
  }

  void _showDeleteConfirmation(BuildContext context, InvoiceEntity invoice) {
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

  void _handleStatusChange(BuildContext context, InvoiceEntity invoice, InvoiceStatus newStatus) {
    context.read<InvoiceBloc>().add(UpdateInvoiceStatus(
      invoiceId: invoice.id,
      newStatus: newStatus,
    ));
  }
}
