import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

/// 发票搜索和筛选工具栏
/// 包含搜索框、快捷筛选按钮和状态管理
class InvoiceSearchFilterBar extends StatefulWidget {
  const InvoiceSearchFilterBar({
    super.key,
    this.onSearchChanged,
    this.onFilterChanged,
    this.onFilterClearWithRefresh,
    this.initialSearchQuery = '',
    this.showQuickFilters = true,
    this.showSearchBox = true,
  });

  /// 搜索内容变化回调
  final ValueChanged<String>? onSearchChanged;

  /// 筛选条件变化回调
  final ValueChanged<FilterOptions>? onFilterChanged;

  /// 筛选条件清除回调（带刷新，绕过缓存）
  final ValueChanged<FilterOptions>? onFilterClearWithRefresh;

  /// 初始搜索查询
  final String initialSearchQuery;

  /// 是否显示快捷筛选按钮
  final bool showQuickFilters;

  /// 是否显示搜索框
  final bool showSearchBox;

  @override
  State<InvoiceSearchFilterBar> createState() => _InvoiceSearchFilterBarState();
}

class _InvoiceSearchFilterBarState extends State<InvoiceSearchFilterBar> {
  late TextEditingController _searchController;
  late FilterOptions _currentFilter;
  bool _isSearchFocused = false;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(text: widget.initialSearchQuery);
    _currentFilter = FilterOptions();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12), // 减小内边距
      decoration: BoxDecoration(
        color: colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: colorScheme.outlineVariant.withValues(alpha: 0.5),
            width: 0.5,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 搜索框区域
          if (widget.showSearchBox) _buildSearchBox(theme, colorScheme),

          // 间距
          if (widget.showSearchBox && widget.showQuickFilters)
            const SizedBox(height: 12), // 减小间距

          // 快捷筛选按钮区域
          if (widget.showQuickFilters) _buildQuickFilters(theme, colorScheme),
        ],
      ),
    );
  }

  /// 构建搜索框
  Widget _buildSearchBox(ThemeData theme, ColorScheme colorScheme) {
    return Container(
      height: 36, // 固定较小高度
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(8), // 减小圆角
        border: Border.all(
          color: _isSearchFocused
              ? colorScheme.primary
              : colorScheme.outlineVariant,
          width: _isSearchFocused ? 1.5 : 1,
        ),
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (value) {
          widget.onSearchChanged?.call(value);
        },
        onTap: () {
          setState(() => _isSearchFocused = true);
        },
        onTapOutside: (_) {
          setState(() => _isSearchFocused = false);
        },
        decoration: InputDecoration(
          hintText: '搜索发票号、销售方、金额...',
          hintStyle: TextStyle(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            fontSize: 14, // 减小字体
          ),
          prefixIcon: Icon(
            CupertinoIcons.search,
            color: _isSearchFocused
                ? colorScheme.primary
                : colorScheme.onSurfaceVariant,
            size: 16, // 减小图标
          ),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: Icon(
                    CupertinoIcons.clear_circled_solid,
                    color: colorScheme.onSurfaceVariant,
                    size: 14, // 减小图标
                  ),
                  onPressed: () {
                    _searchController.clear();
                    widget.onSearchChanged?.call('');
                  },
                  padding: EdgeInsets.zero, // 减小按钮内边距
                  constraints: const BoxConstraints(
                    minWidth: 32,
                    minHeight: 32,
                  ),
                )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 12, // 减小内边距
            vertical: 0, // 设置为0实现严格垂直居中
          ),
          isDense: true, // 紧凑模式，减少额外填充
        ),
        style: TextStyle(
          fontSize: 14, // 减小字体
          color: colorScheme.onSurface,
        ),
        textAlignVertical: TextAlignVertical.center, // 确保文本垂直居中
      ),
    );
  }

  /// 构建快捷筛选按钮
  Widget _buildQuickFilters(ThemeData theme, ColorScheme colorScheme) {
    return Wrap(
      spacing: 6, // 减小间距
      runSpacing: 6, // 减小间距
      children: [
        // 逾期发票
        _buildFilterChip(
          label: '逾期发票',
          icon: CupertinoIcons.exclamationmark_triangle,
          isSelected: _currentFilter.showOverdue,
          onTap: () {
            // 简单的toggle切换逻辑
            final newState = !_currentFilter.showOverdue;
            // print('🔍 [FilterBar] 逾期发票按钮切换: $newState');

            final newFilter = newState
                ? FilterOptions.single(overdue: true)
                : FilterOptions.single();
            _updateFilter(newFilter);

            // 如果是关闭状态（清除筛选），需要绕过缓存
            if (!newState) {
              // print('🔍 [FilterBar] 切换到关闭状态，绕过缓存重新查询');
              widget.onFilterClearWithRefresh?.call(newFilter);
            }
          },
          color: Theme.of(context).colorScheme.error,
          badge: _currentFilter.showOverdue ? null : '!',
        ),

        // 紧急处理
        _buildFilterChip(
          label: '紧急处理',
          icon: CupertinoIcons.timer,
          isSelected: _currentFilter.showUrgent,
          onTap: () {
            // 简单的toggle切换逻辑
            final newState = !_currentFilter.showUrgent;
            // print('🔍 [FilterBar] 紧急处理按钮切换: $newState');

            final newFilter = newState
                ? FilterOptions.single(urgent: true)
                : FilterOptions.single();
            _updateFilter(newFilter);

            // 如果是关闭状态（清除筛选），需要绕过缓存
            if (!newState) {
              // print('🔍 [FilterBar] 切换到关闭状态，绕过缓存重新查询');
              widget.onFilterClearWithRefresh?.call(newFilter);
            }
          },
          color: Theme.of(context).colorScheme.tertiary,
        ),

        // 待报销
        _buildFilterChip(
          label: '待报销',
          icon: CupertinoIcons.clock,
          isSelected: _currentFilter.showUnreimbursed,
          onTap: () {
            // 简单的toggle切换逻辑
            final newState = !_currentFilter.showUnreimbursed;
            // print('🔍 [FilterBar] 待报销按钮切换: $newState');

            final newFilter = newState
                ? FilterOptions.single(unreimbursed: true)
                : FilterOptions.single();
            _updateFilter(newFilter);

            // 如果是关闭状态（清除筛选），需要绕过缓存
            if (!newState) {
              // print('🔍 [FilterBar] 切换到关闭状态，绕过缓存重新查询');
              widget.onFilterClearWithRefresh?.call(newFilter);
            }
          },
          color: Theme.of(context).colorScheme.secondary,
        ),
      ],
    );
  }

  /// 构建筛选按钮
  Widget _buildFilterChip({
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
    required Color color,
    String? badge,
  }) {
    final colorScheme = Theme.of(context).colorScheme;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding:
            const EdgeInsets.symmetric(horizontal: 8, vertical: 4), // 减小内边距
        decoration: BoxDecoration(
          color:
              isSelected ? color.withValues(alpha: 0.15) : colorScheme.surface,
          borderRadius: BorderRadius.circular(16), // 减小圆角
          border: Border.all(
            color: isSelected ? color : colorScheme.outlineVariant,
            width: isSelected ? 1.5 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: color.withValues(alpha: 0.2),
                    blurRadius: 3, // 减小模糊半径
                    offset: const Offset(0, 1), // 减小偏移
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 图标
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  icon,
                  size: 14, // 减小图标尺寸
                  color: isSelected ? color : colorScheme.onSurfaceVariant,
                ),
                // 徽章
                if (badge != null && !isSelected)
                  Positioned(
                    right: -3,
                    top: -3,
                    child: Container(
                      width: 10, // 减小徽章尺寸
                      height: 10,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          badge,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface,
                            fontSize: 7, // 减小字体
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),

            const SizedBox(width: 4), // 减小间距

            // 标签
            Text(
              label,
              style: TextStyle(
                fontSize: 12, // 减小字体
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected ? color : colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 更新筛选条件
  void _updateFilter(FilterOptions newFilter) {
    // print('🔍 [FilterBar] _updateFilter 被调用: $newFilter');
    setState(() {
      _currentFilter = newFilter;
    });
    // print('🔍 [FilterBar] 调用回调函数 onFilterChanged');
    widget.onFilterChanged?.call(newFilter);
  }
}

/// 筛选选项类
class FilterOptions {
  final bool showAll;
  final bool showOverdue;
  final bool showUrgent;
  final bool showUnreimbursed;

  const FilterOptions({
    this.showAll = true,
    this.showOverdue = false,
    this.showUrgent = false,
    this.showUnreimbursed = false,
  });

  /// 创建单选筛选选项（确保只有一个筛选被激活）
  static FilterOptions single({
    bool overdue = false,
    bool urgent = false,
    bool unreimbursed = false,
  }) {
    // 确保只有一个为true
    if (overdue) {
      return const FilterOptions(
        showAll: false,
        showOverdue: true,
        showUrgent: false,
        showUnreimbursed: false,
      );
    } else if (urgent) {
      return const FilterOptions(
        showAll: false,
        showOverdue: false,
        showUrgent: true,
        showUnreimbursed: false,
      );
    } else if (unreimbursed) {
      return const FilterOptions(
        showAll: false,
        showOverdue: false,
        showUrgent: false,
        showUnreimbursed: true,
      );
    } else {
      return const FilterOptions(
        showAll: true,
        showOverdue: false,
        showUrgent: false,
        showUnreimbursed: false,
      );
    }
  }

  /// 是否显示全部发票
  bool get isAllInvoices => showAll && !hasActiveFilters;

  /// 是否有任何筛选条件激活
  bool get hasActiveFilters => showOverdue || showUrgent || showUnreimbursed;

  /// 复制并修改筛选选项
  FilterOptions copyWith({
    bool? showAll,
    bool? showOverdue,
    bool? showUrgent,
    bool? showUnreimbursed,
  }) {
    return FilterOptions(
      showAll: showAll ?? this.showAll,
      showOverdue: showOverdue ?? this.showOverdue,
      showUrgent: showUrgent ?? this.showUrgent,
      showUnreimbursed: showUnreimbursed ?? this.showUnreimbursed,
    );
  }

  @override
  String toString() {
    return 'FilterOptions(showAll: $showAll, showOverdue: $showOverdue, '
        'showUrgent: $showUrgent, showUnreimbursed: $showUnreimbursed)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is FilterOptions &&
        other.showAll == showAll &&
        other.showOverdue == showOverdue &&
        other.showUrgent == showUrgent &&
        other.showUnreimbursed == showUnreimbursed;
  }

  @override
  int get hashCode {
    return Object.hash(
      showAll,
      showOverdue,
      showUrgent,
      showUnreimbursed,
    );
  }
}
