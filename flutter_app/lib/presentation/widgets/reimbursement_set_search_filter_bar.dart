import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

/// 报销集搜索和筛选工具栏
/// 包含搜索框、快捷筛选按钮和状态管理
class ReimbursementSetSearchFilterBar extends StatefulWidget {
  const ReimbursementSetSearchFilterBar({
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
  final ValueChanged<ReimbursementSetFilterOptions>? onFilterChanged;

  /// 筛选条件清除回调（带刷新，绕过缓存）
  final ValueChanged<ReimbursementSetFilterOptions>? onFilterClearWithRefresh;

  /// 初始搜索查询
  final String initialSearchQuery;

  /// 是否显示快捷筛选按钮
  final bool showQuickFilters;

  /// 是否显示搜索框
  final bool showSearchBox;

  @override
  State<ReimbursementSetSearchFilterBar> createState() =>
      _ReimbursementSetSearchFilterBarState();
}

class _ReimbursementSetSearchFilterBarState
    extends State<ReimbursementSetSearchFilterBar> {
  late TextEditingController _searchController;
  late ReimbursementSetFilterOptions _currentFilter;
  bool _isSearchFocused = false;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(text: widget.initialSearchQuery);
    _currentFilter = ReimbursementSetFilterOptions();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(
        16.0,
        8.0,
        16.0,
        12.0,
      ),
      decoration: BoxDecoration(
        color: CupertinoColors.systemGroupedBackground.resolveFrom(context),
        border: Border(
          bottom: BorderSide(
            color: CupertinoColors.separator.resolveFrom(context),
            width: 0.5,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 搜索框区域
          if (widget.showSearchBox) _buildSearchBox(context),

          // 间距
          if (widget.showSearchBox && widget.showQuickFilters)
            const SizedBox(height: 12.0),

          // 快捷筛选按钮区域
          if (widget.showQuickFilters)
            _buildQuickFilters(
                Theme.of(context), Theme.of(context).colorScheme),
        ],
      ),
    );
  }

  /// 构建搜索框
  Widget _buildSearchBox(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      height: 44.0,
      decoration: BoxDecoration(
        color: CupertinoColors.tertiarySystemFill.resolveFrom(context),
        borderRadius: BorderRadius.circular(8.0),
        border: Border.all(
          color: _isSearchFocused
              ? CupertinoColors.activeBlue.resolveFrom(context)
              : CupertinoColors.separator.resolveFrom(context),
          width: _isSearchFocused ? 1.5 : 1,
        ),
      ),
      child: Row(
        children: [
          // 搜索图标
          Padding(
            padding: const EdgeInsets.only(left: 12.0),
            child: Icon(
              CupertinoIcons.search,
              color: _isSearchFocused
                  ? colorScheme.primary
                  : colorScheme.onSurfaceVariant,
              size: 16.0,
            ),
          ),

          // 搜索输入框
          Expanded(
            child: CupertinoTextField(
              controller: _searchController,
              onChanged: (value) {
                setState(() {}); // 触发重建以更新清除按钮显示
                widget.onSearchChanged?.call(value);
              },
              onTap: () {
                setState(() => _isSearchFocused = true);
              },
              onTapOutside: (_) {
                setState(() => _isSearchFocused = false);
              },
              placeholder: '搜索报销集名称、金额、地区...',
              placeholderStyle: TextStyle(
                color: colorScheme.onSurfaceVariant,
                fontSize: 14.0,
              ),
              style: TextStyle(
                fontSize: 14.0,
                color: colorScheme.onSurface,
              ),
              decoration: const BoxDecoration(),
              padding: const EdgeInsets.symmetric(
                horizontal: 12.0,
                vertical: 0,
              ),
            ),
          ),

          // 清除按钮
          if (_searchController.text.isNotEmpty)
            CupertinoButton(
              onPressed: () {
                _searchController.clear();
                setState(() {});
                widget.onSearchChanged?.call('');
              },
              padding: const EdgeInsets.all(4.0),
              child: Icon(
                CupertinoIcons.clear_circled_solid,
                color: colorScheme.onSurfaceVariant,
                size: 12.0,
              ),
            ),
        ],
      ),
    );
  }

  /// 构建快捷筛选按钮
  Widget _buildQuickFilters(ThemeData theme, ColorScheme colorScheme) {
    return Wrap(
      spacing: 8.0,
      runSpacing: 8.0,
      children: [
        // 待报销
        _buildFilterChip(
          label: '待报销',
          icon: CupertinoIcons.doc_text,
          isSelected: _currentFilter.showUnsubmitted,
          onTap: () {
            final newState = !_currentFilter.showUnsubmitted;
            final newFilter = newState
                ? ReimbursementSetFilterOptions.single(unsubmitted: true)
                : ReimbursementSetFilterOptions.single();
            _updateFilter(newFilter);

            if (!newState) {
              widget.onFilterClearWithRefresh?.call(newFilter);
            }
          },
          color: Theme.of(context).colorScheme.secondary,
        ),

        // 待审核
        _buildFilterChip(
          label: '待审核',
          icon: CupertinoIcons.clock,
          isSelected: _currentFilter.showSubmitted,
          onTap: () {
            final newState = !_currentFilter.showSubmitted;
            final newFilter = newState
                ? ReimbursementSetFilterOptions.single(submitted: true)
                : ReimbursementSetFilterOptions.single();
            _updateFilter(newFilter);

            if (!newState) {
              widget.onFilterClearWithRefresh?.call(newFilter);
            }
          },
          color: Theme.of(context).colorScheme.tertiary,
        ),

        // 已报销
        _buildFilterChip(
          label: '已报销',
          icon: CupertinoIcons.checkmark_circle,
          isSelected: _currentFilter.showReimbursed,
          onTap: () {
            final newState = !_currentFilter.showReimbursed;
            final newFilter = newState
                ? ReimbursementSetFilterOptions.single(reimbursed: true)
                : ReimbursementSetFilterOptions.single();
            _updateFilter(newFilter);

            if (!newState) {
              widget.onFilterClearWithRefresh?.call(newFilter);
            }
          },
          color: Theme.of(context).colorScheme.primary,
        ),

        // 本月
        _buildFilterChip(
          label: '本月',
          icon: CupertinoIcons.calendar,
          isSelected: _currentFilter.showThisMonth,
          onTap: () {
            final newState = !_currentFilter.showThisMonth;
            final newFilter = newState
                ? ReimbursementSetFilterOptions.single(thisMonth: true)
                : ReimbursementSetFilterOptions.single();
            _updateFilter(newFilter);

            if (!newState) {
              widget.onFilterClearWithRefresh?.call(newFilter);
            }
          },
          color: Theme.of(context).colorScheme.outline,
        ),

        // 大额报销
        _buildFilterChip(
          label: '大额报销',
          icon: CupertinoIcons.money_dollar_circle,
          isSelected: _currentFilter.showLargeAmount,
          onTap: () {
            final newState = !_currentFilter.showLargeAmount;
            final newFilter = newState
                ? ReimbursementSetFilterOptions.single(largeAmount: true)
                : ReimbursementSetFilterOptions.single();
            _updateFilter(newFilter);

            if (!newState) {
              widget.onFilterClearWithRefresh?.call(newFilter);
            }
          },
          color: Theme.of(context).colorScheme.error,
        ),

        // 跨期报销
        _buildFilterChip(
          label: '跨期',
          icon: CupertinoIcons.calendar_badge_plus,
          isSelected: _currentFilter.showCrossPeriod,
          onTap: () {
            final newState = !_currentFilter.showCrossPeriod;
            final newFilter = newState
                ? ReimbursementSetFilterOptions.single(crossPeriod: true)
                : ReimbursementSetFilterOptions.single();
            _updateFilter(newFilter);

            if (!newState) {
              widget.onFilterClearWithRefresh?.call(newFilter);
            }
          },
          color: Theme.of(context).colorScheme.onSurfaceVariant,
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
        height: 32.0,
        padding: const EdgeInsets.symmetric(
          horizontal: 12.0,
          vertical: 4.0,
        ),
        decoration: BoxDecoration(
          color:
              isSelected ? color.withValues(alpha: 0.15) : colorScheme.surface,
          borderRadius: BorderRadius.circular(16.0),
          border: Border.all(
            color: isSelected ? color : colorScheme.outlineVariant,
            width: isSelected ? 1.5 : 1,
          ),
          boxShadow: isSelected ? [] : null,
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
                  size: 12.0,
                  color: isSelected ? color : colorScheme.onSurfaceVariant,
                ),
                // 徽章
                if (badge != null && !isSelected)
                  Positioned(
                    right: -3,
                    top: -3,
                    child: Container(
                      width: 8.0 + 2,
                      height: 8.0 + 2,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          badge,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface,
                            fontSize: 12.0 - 2,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),

            const SizedBox(width: 4.0),

            // 标签
            Text(
              label,
              style: TextStyle(
                fontSize: 12.0,
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
  void _updateFilter(ReimbursementSetFilterOptions newFilter) {
    setState(() {
      _currentFilter = newFilter;
    });
    widget.onFilterChanged?.call(newFilter);
  }
}

/// 报销集筛选选项类
class ReimbursementSetFilterOptions {
  final bool showAll;
  final bool showUnsubmitted;
  final bool showSubmitted;
  final bool showReimbursed;
  final bool showThisMonth;
  final bool showLargeAmount;
  final bool showCrossPeriod;

  const ReimbursementSetFilterOptions({
    this.showAll = true,
    this.showUnsubmitted = false,
    this.showSubmitted = false,
    this.showReimbursed = false,
    this.showThisMonth = false,
    this.showLargeAmount = false,
    this.showCrossPeriod = false,
  });

  /// 创建单选筛选选项（确保只有一个筛选被激活）
  static ReimbursementSetFilterOptions single({
    bool unsubmitted = false,
    bool submitted = false,
    bool reimbursed = false,
    bool thisMonth = false,
    bool largeAmount = false,
    bool crossPeriod = false,
  }) {
    // 确保只有一个为true
    if (unsubmitted) {
      return const ReimbursementSetFilterOptions(
        showAll: false,
        showUnsubmitted: true,
        showSubmitted: false,
        showReimbursed: false,
        showThisMonth: false,
        showLargeAmount: false,
        showCrossPeriod: false,
      );
    } else if (submitted) {
      return const ReimbursementSetFilterOptions(
        showAll: false,
        showUnsubmitted: false,
        showSubmitted: true,
        showReimbursed: false,
        showThisMonth: false,
        showLargeAmount: false,
        showCrossPeriod: false,
      );
    } else if (reimbursed) {
      return const ReimbursementSetFilterOptions(
        showAll: false,
        showUnsubmitted: false,
        showSubmitted: false,
        showReimbursed: true,
        showThisMonth: false,
        showLargeAmount: false,
        showCrossPeriod: false,
      );
    } else if (thisMonth) {
      return const ReimbursementSetFilterOptions(
        showAll: false,
        showUnsubmitted: false,
        showSubmitted: false,
        showReimbursed: false,
        showThisMonth: true,
        showLargeAmount: false,
        showCrossPeriod: false,
      );
    } else if (largeAmount) {
      return const ReimbursementSetFilterOptions(
        showAll: false,
        showUnsubmitted: false,
        showSubmitted: false,
        showReimbursed: false,
        showThisMonth: false,
        showLargeAmount: true,
        showCrossPeriod: false,
      );
    } else if (crossPeriod) {
      return const ReimbursementSetFilterOptions(
        showAll: false,
        showUnsubmitted: false,
        showSubmitted: false,
        showReimbursed: false,
        showThisMonth: false,
        showLargeAmount: false,
        showCrossPeriod: true,
      );
    } else {
      return const ReimbursementSetFilterOptions(
        showAll: true,
        showUnsubmitted: false,
        showSubmitted: false,
        showReimbursed: false,
        showThisMonth: false,
        showLargeAmount: false,
        showCrossPeriod: false,
      );
    }
  }

  /// 是否显示全部报销集
  bool get isAllReimbursementSets => showAll && !hasActiveFilters;

  /// 是否有任何筛选条件激活
  bool get hasActiveFilters =>
      showUnsubmitted ||
      showSubmitted ||
      showReimbursed ||
      showThisMonth ||
      showLargeAmount ||
      showCrossPeriod;

  /// 复制并修改筛选选项
  ReimbursementSetFilterOptions copyWith({
    bool? showAll,
    bool? showUnsubmitted,
    bool? showSubmitted,
    bool? showReimbursed,
    bool? showThisMonth,
    bool? showLargeAmount,
    bool? showCrossPeriod,
  }) {
    return ReimbursementSetFilterOptions(
      showAll: showAll ?? this.showAll,
      showUnsubmitted: showUnsubmitted ?? this.showUnsubmitted,
      showSubmitted: showSubmitted ?? this.showSubmitted,
      showReimbursed: showReimbursed ?? this.showReimbursed,
      showThisMonth: showThisMonth ?? this.showThisMonth,
      showLargeAmount: showLargeAmount ?? this.showLargeAmount,
      showCrossPeriod: showCrossPeriod ?? this.showCrossPeriod,
    );
  }

  @override
  String toString() {
    return 'ReimbursementSetFilterOptions(showAll: $showAll, showUnsubmitted: $showUnsubmitted, '
        'showSubmitted: $showSubmitted, showReimbursed: $showReimbursed, '
        'showThisMonth: $showThisMonth, showLargeAmount: $showLargeAmount, '
        'showCrossPeriod: $showCrossPeriod)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ReimbursementSetFilterOptions &&
        other.showAll == showAll &&
        other.showUnsubmitted == showUnsubmitted &&
        other.showSubmitted == showSubmitted &&
        other.showReimbursed == showReimbursed &&
        other.showThisMonth == showThisMonth &&
        other.showLargeAmount == showLargeAmount &&
        other.showCrossPeriod == showCrossPeriod;
  }

  @override
  int get hashCode {
    return Object.hash(
      showAll,
      showUnsubmitted,
      showSubmitted,
      showReimbursed,
      showThisMonth,
      showLargeAmount,
      showCrossPeriod,
    );
  }
}
