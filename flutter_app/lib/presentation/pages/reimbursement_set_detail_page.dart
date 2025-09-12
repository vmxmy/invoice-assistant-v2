import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../core/theme/app_theme_constants.dart';
import '../bloc/reimbursement_set_bloc.dart';
import '../bloc/reimbursement_set_event.dart';
import '../bloc/reimbursement_set_state.dart';
import '../widgets/invoice_card_widget.dart';
import '../widgets/skeleton_loader.dart';
import '../widgets/app_feedback.dart';
import '../widgets/detail_page_styles.dart';

/// 报销集详情页面
class ReimbursementSetDetailPage extends StatefulWidget {
  final String reimbursementSetId;

  const ReimbursementSetDetailPage({
    super.key,
    required this.reimbursementSetId,
  });

  @override
  State<ReimbursementSetDetailPage> createState() =>
      _ReimbursementSetDetailPageState();
}

class _ReimbursementSetDetailPageState
    extends State<ReimbursementSetDetailPage> {
  ReimbursementSetEntity? _reimbursementSet;
  List<InvoiceEntity> _invoices = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadReimbursementSetDetail();
  }

  void _loadReimbursementSetDetail() {
    context.read<ReimbursementSetBloc>().add(
          LoadReimbursementSetDetail(widget.reimbursementSetId),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocConsumer<ReimbursementSetBloc, ReimbursementSetState>(
        listener: (context, state) {
          if (state is ReimbursementSetDetailLoaded) {
            setState(() {
              _reimbursementSet = state.reimbursementSet;
              _invoices = state.invoices;
              _isLoading = false;
            });
          } else if (state is ReimbursementSetError) {
            setState(() => _isLoading = false);
            AppFeedback.error(context, state.message);
          } else if (state is ReimbursementSetDeleteSuccess) {
            // 报销集删除成功，返回上一页
            context.pop();
            AppFeedback.success(context, state.message);
          } else if (state is ReimbursementSetStatusUpdateSuccess) {
            // 状态更新成功，刷新数据
            _loadReimbursementSetDetail();
            AppFeedback.success(context, '状态更新成功');
          }
        },
        builder: (context, state) {
          if (_isLoading) {
            return const InvoiceListSkeleton();
          }

          if (_reimbursementSet == null) {
            return _buildErrorView();
          }

          return RefreshIndicator(
            onRefresh: () async => _loadReimbursementSetDetail(),
            child: CustomScrollView(
              slivers: [
                // 极简AppBar
                _buildSimpleAppBar(),

                // 简化的报销集信息
                SliverToBoxAdapter(
                  child: _buildSimplifiedHeader(),
                ),

                // 发票列表
                _buildInvoiceList(),
              ],
            ),
          );
        },
      ),
    );
  }

  /// 构建极简AppBar
  Widget _buildSimpleAppBar() {
    final colorScheme = Theme.of(context).colorScheme;

    return SliverAppBar(
      pinned: true,
      floating: false,
      expandedHeight: 0,
      toolbarHeight: kToolbarHeight,
      backgroundColor: colorScheme.surface,
      foregroundColor: colorScheme.onSurface,
      title: Text(
        _reimbursementSet?.setName ?? '报销集详情',
        style: DetailPageStyles.pageTitle(context),
      ),
      actions: [
        if (_reimbursementSet != null)
          PopupMenuButton<String>(
            icon: Icon(
              CupertinoIcons.ellipsis,
              color: colorScheme.onSurface,
            ),
            onSelected: _handleMenuAction,
            color: colorScheme.surfaceContainer,
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(
                      CupertinoIcons.pencil,
                      size: AppThemeConstants.iconMedium,
                      color: colorScheme.primary,
                    ),
                    const SizedBox(width: AppThemeConstants.spacing8),
                    Text(
                      '编辑',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: colorScheme.onSurface,
                          ),
                    ),
                  ],
                ),
              ),
              if (_reimbursementSet!.isDraft)
                PopupMenuItem(
                  value: 'submit',
                  child: Row(
                    children: [
                      Icon(
                        CupertinoIcons.paperplane,
                        size: AppThemeConstants.iconMedium,
                        color: colorScheme.tertiary,
                      ),
                      const SizedBox(width: AppThemeConstants.spacing8),
                      Text(
                        '提交',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: colorScheme.onSurface,
                            ),
                      ),
                    ],
                  ),
                ),
              if (_reimbursementSet!.isSubmitted)
                PopupMenuItem(
                  value: 'reimburse',
                  child: Row(
                    children: [
                      Icon(
                        CupertinoIcons.checkmark_circle,
                        size: AppThemeConstants.iconMedium,
                        color: colorScheme.secondary,
                      ),
                      const SizedBox(width: AppThemeConstants.spacing8),
                      Text(
                        '已报销',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: colorScheme.onSurface,
                            ),
                      ),
                    ],
                  ),
                ),
              const PopupMenuDivider(),
              PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(
                      CupertinoIcons.delete,
                      size: AppThemeConstants.iconMedium,
                      color: colorScheme.error,
                    ),
                    const SizedBox(width: AppThemeConstants.spacing8),
                    Text(
                      '删除',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: colorScheme.error,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
      ],
    );
  }

  /// 构建简化的头部信息
  Widget _buildSimplifiedHeader() {
    final set = _reimbursementSet!;
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      margin: const EdgeInsets.all(AppThemeConstants.spacing16),
      padding: const EdgeInsets.all(AppThemeConstants.spacing16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(AppThemeConstants.radiusLarge),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 状态和基本信息行
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      set.setName,
                      style: DetailPageStyles.amountText(context).copyWith(
                        fontSize: 24, // 略小于发票金额的字体
                      ),
                    ),
                    if (set.description?.isNotEmpty == true) ...[
                      const SizedBox(height: AppThemeConstants.spacing4),
                      Text(
                        set.description!,
                        style: DetailPageStyles.secondaryText(context).copyWith(
                              height: 1.4,
                            ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: AppThemeConstants.spacing12),
              // 状态标签
              _buildCompactStatusChip(set.status),
            ],
          ),

          const SizedBox(height: AppThemeConstants.spacing20),

          // 简洁的统计信息卡片
          Container(
            padding: const EdgeInsets.all(AppThemeConstants.spacing16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  colorScheme.primary.withValues(alpha: 0.03),
                  colorScheme.primary.withValues(alpha: 0.08),
                ],
              ),
              borderRadius:
                  BorderRadius.circular(AppThemeConstants.radiusMedium),
              border: Border.all(
                color: colorScheme.primary.withValues(alpha: 0.1),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: _buildSimpleStatItem(
                    CupertinoIcons.doc_text,
                    '${set.invoiceCount}',
                    '张发票',
                    colorScheme.primary,
                  ),
                ),
                Container(
                  width: 1,
                  height: 32,
                  color: colorScheme.outline.withValues(alpha: 0.2),
                ),
                Expanded(
                  child: _buildSimpleStatItem(
                    CupertinoIcons.money_dollar_circle,
                    '¥${set.totalAmount.toStringAsFixed(2)}',
                    '总金额',
                    colorScheme.secondary,
                  ),
                ),
                Container(
                  width: 1,
                  height: 32,
                  color: colorScheme.outline.withValues(alpha: 0.2),
                ),
                Expanded(
                  child: _buildSimpleStatItem(
                    CupertinoIcons.clock,
                    _formatSimpleDate(set.createdAt),
                    '创建时间',
                    colorScheme.tertiary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// 显示状态转换对话框
  void _showStatusTransitionDialog(ReimbursementSetStatus nextStatus) {
    if (_reimbursementSet == null) return;

    final colorScheme = Theme.of(context).colorScheme;
    String title;
    String content;
    String confirmText;
    Color confirmColor;
    IconData confirmIcon;

    switch (nextStatus) {
      case ReimbursementSetStatus.submitted:
        title = '提交报销集';
        content = '确定要提交报销集 "${_reimbursementSet!.setName}" 吗？\n\n'
            '⚠️ 提交后将无法再修改报销集和发票内容\n'
            '📋 请确认所有信息都已填写正确\n'
            '💰 确认发票金额和明细无误';
        confirmText = '确认提交';
        confirmColor = colorScheme.tertiary;
        confirmIcon = CupertinoIcons.paperplane;
        break;
      case ReimbursementSetStatus.reimbursed:
        title = '标记已报销';
        content = '确定要将报销集 "${_reimbursementSet!.setName}" 标记为已报销吗？\n\n'
            '✅ 标记后将进入归档状态\n'
            '🔒 将无法再进行任何修改操作\n'
            '📁 可以导出报销凭证留档';
        confirmText = '确认标记';
        confirmColor = colorScheme.secondary;
        confirmIcon = CupertinoIcons.checkmark_circle;
        break;
      default:
        return;
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: colorScheme.surfaceContainer,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppThemeConstants.radiusLarge),
        ),
        title: Container(
          padding:
              const EdgeInsets.symmetric(vertical: AppThemeConstants.spacing8),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppThemeConstants.spacing8),
                decoration: BoxDecoration(
                  color: confirmColor.withValues(alpha: 0.1),
                  borderRadius:
                      BorderRadius.circular(AppThemeConstants.radiusSmall),
                ),
                child: Icon(
                  confirmIcon,
                  color: confirmColor,
                  size: AppThemeConstants.iconLarge,
                ),
              ),
              const SizedBox(width: AppThemeConstants.spacing12),
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: colorScheme.onSurface,
                      ),
                ),
              ),
            ],
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              content,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    height: 1.5,
                    color: colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: AppThemeConstants.spacing20),

            // 报销集信息摘要
            Container(
              padding: const EdgeInsets.all(AppThemeConstants.spacing16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    confirmColor.withValues(alpha: 0.05),
                    confirmColor.withValues(alpha: 0.1),
                  ],
                ),
                borderRadius:
                    BorderRadius.circular(AppThemeConstants.radiusMedium),
                border: Border.all(
                  color: confirmColor.withValues(alpha: 0.2),
                ),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(
                        CupertinoIcons.folder_badge_plus,
                        color: confirmColor,
                        size: AppThemeConstants.iconMedium,
                      ),
                      const SizedBox(width: AppThemeConstants.spacing8),
                      Expanded(
                        child: Text(
                          _reimbursementSet!.setName,
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color: confirmColor,
                                  ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppThemeConstants.spacing12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildSummaryItem(
                        '包含发票',
                        '${_invoices.length} 张',
                        CupertinoIcons.doc_text,
                        confirmColor,
                      ),
                      _buildSummaryItem(
                        '总金额',
                        '¥${_reimbursementSet!.totalAmount.toStringAsFixed(2)}',
                        CupertinoIcons.money_dollar_circle,
                        confirmColor,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            style: TextButton.styleFrom(
              foregroundColor: colorScheme.onSurfaceVariant,
            ),
            child: const Text('取消'),
          ),
          const SizedBox(width: AppThemeConstants.spacing8),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              _updateStatus(nextStatus);
            },
            icon: Icon(confirmIcon, size: AppThemeConstants.iconSmall),
            label: Text(confirmText),
            style: ElevatedButton.styleFrom(
              backgroundColor: confirmColor,
              foregroundColor: colorScheme.onPrimary,
              padding: const EdgeInsets.symmetric(
                horizontal: AppThemeConstants.spacing20,
                vertical: AppThemeConstants.spacing12,
              ),
              shape: RoundedRectangleBorder(
                borderRadius:
                    BorderRadius.circular(AppThemeConstants.radiusMedium),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 构建摘要信息项
  Widget _buildSummaryItem(
      String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Icon(
          icon,
          color: color,
          size: AppThemeConstants.iconMedium,
        ),
        const SizedBox(height: AppThemeConstants.spacing4),
        Text(
          value,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: color,
                fontWeight: FontWeight.w600,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: color.withValues(alpha: 0.7),
              ),
        ),
      ],
    );
  }

  Widget _buildInvoiceList() {
    final colorScheme = Theme.of(context).colorScheme;

    if (_invoices.isEmpty) {
      return SliverFillRemaining(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(AppThemeConstants.spacing20),
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest,
                  borderRadius:
                      BorderRadius.circular(AppThemeConstants.radiusXLarge),
                ),
                child: Icon(
                  CupertinoIcons.doc,
                  size: 48,
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: AppThemeConstants.spacing16),
              Text(
                '该报销集暂无发票',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
              ),
              const SizedBox(height: AppThemeConstants.spacing8),
              Text(
                '可以从发票管理页面添加发票到此报销集',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color:
                          colorScheme.onSurfaceVariant.withValues(alpha: 0.7),
                    ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final invoice = _invoices[index];
          return Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppThemeConstants.spacing16,
              vertical: AppThemeConstants.spacing4,
            ),
            child: InvoiceCardWidget(
              invoice: invoice,
              onTap: () => context.push('/invoice-detail/${invoice.id}'),
            ),
          );
        },
        childCount: _invoices.length,
      ),
    );
  }

  Widget _buildErrorView() {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(AppThemeConstants.spacing20),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(AppThemeConstants.spacing20),
              decoration: BoxDecoration(
                color: colorScheme.errorContainer,
                borderRadius:
                    BorderRadius.circular(AppThemeConstants.radiusXLarge),
              ),
              child: Icon(
                CupertinoIcons.exclamationmark_triangle,
                size: 48,
                color: colorScheme.error,
              ),
            ),
            const SizedBox(height: AppThemeConstants.spacing16),
            Text(
              '加载失败',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: colorScheme.onSurface,
                  ),
            ),
            const SizedBox(height: AppThemeConstants.spacing8),
            Text(
              '无法获取报销集详情',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: AppThemeConstants.spacing20),
            ElevatedButton.icon(
              onPressed: () {
                setState(() => _isLoading = true);
                _loadReimbursementSetDetail();
              },
              icon: Icon(
                CupertinoIcons.refresh,
                size: AppThemeConstants.iconSmall,
              ),
              label: const Text('重试'),
              style: ElevatedButton.styleFrom(
                backgroundColor: colorScheme.primary,
                foregroundColor: colorScheme.onPrimary,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppThemeConstants.spacing24,
                  vertical: AppThemeConstants.spacing12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius:
                      BorderRadius.circular(AppThemeConstants.radiusMedium),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleMenuAction(String action) {
    switch (action) {
      case 'edit':
        _showEditDialog();
        break;
      case 'submit':
        _updateStatus(ReimbursementSetStatus.submitted);
        break;
      case 'reimburse':
        _updateStatus(ReimbursementSetStatus.reimbursed);
        break;
      case 'delete':
        _showDeleteConfirmation();
        break;
    }
  }

  void _showEditDialog() {
    final colorScheme = Theme.of(context).colorScheme;
    final nameController =
        TextEditingController(text: _reimbursementSet?.setName);
    final descriptionController =
        TextEditingController(text: _reimbursementSet?.description);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: colorScheme.surfaceContainer,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppThemeConstants.radiusLarge),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(AppThemeConstants.spacing8),
              decoration: BoxDecoration(
                color: colorScheme.primary.withValues(alpha: 0.1),
                borderRadius:
                    BorderRadius.circular(AppThemeConstants.radiusSmall),
              ),
              child: Icon(
                CupertinoIcons.pencil,
                color: colorScheme.primary,
                size: AppThemeConstants.iconMedium,
              ),
            ),
            const SizedBox(width: AppThemeConstants.spacing12),
            Text(
              '编辑报销集',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: colorScheme.onSurface,
                  ),
            ),
          ],
        ),
        content: SizedBox(
          width: MediaQuery.of(context).size.width * 0.8,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: colorScheme.onSurface,
                    ),
                decoration: InputDecoration(
                  labelText: '报销集名称',
                  labelStyle: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                  border: OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(AppThemeConstants.radiusMedium),
                    borderSide: BorderSide(color: colorScheme.outline),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(AppThemeConstants.radiusMedium),
                    borderSide:
                        BorderSide(color: colorScheme.primary, width: 2),
                  ),
                  filled: true,
                  fillColor: colorScheme.surface,
                ),
                maxLength: 100,
              ),
              const SizedBox(height: AppThemeConstants.spacing16),
              TextField(
                controller: descriptionController,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: colorScheme.onSurface,
                    ),
                decoration: InputDecoration(
                  labelText: '描述（可选）',
                  labelStyle: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                  border: OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(AppThemeConstants.radiusMedium),
                    borderSide: BorderSide(color: colorScheme.outline),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(AppThemeConstants.radiusMedium),
                    borderSide:
                        BorderSide(color: colorScheme.primary, width: 2),
                  ),
                  filled: true,
                  fillColor: colorScheme.surface,
                ),
                maxLines: 3,
                maxLength: 500,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            style: TextButton.styleFrom(
              foregroundColor: colorScheme.onSurfaceVariant,
            ),
            child: const Text('取消'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              final name = nameController.text.trim();
              if (name.isNotEmpty) {
                Navigator.pop(context);
                context.read<ReimbursementSetBloc>().add(
                      UpdateReimbursementSet(
                        setId: widget.reimbursementSetId,
                        setName: name,
                        description: descriptionController.text.trim().isEmpty
                            ? null
                            : descriptionController.text.trim(),
                      ),
                    );
              }
            },
            icon: Icon(
              CupertinoIcons.checkmark,
              size: AppThemeConstants.iconSmall,
            ),
            label: const Text('保存'),
            style: ElevatedButton.styleFrom(
              backgroundColor: colorScheme.primary,
              foregroundColor: colorScheme.onPrimary,
              shape: RoundedRectangleBorder(
                borderRadius:
                    BorderRadius.circular(AppThemeConstants.radiusMedium),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _updateStatus(ReimbursementSetStatus newStatus) {
    context.read<ReimbursementSetBloc>().add(
          UpdateReimbursementSetStatus(
            setId: widget.reimbursementSetId,
            status: newStatus,
          ),
        );
  }

  void _showDeleteConfirmation() {
    final colorScheme = Theme.of(context).colorScheme;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: colorScheme.surfaceContainer,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppThemeConstants.radiusLarge),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(AppThemeConstants.spacing8),
              decoration: BoxDecoration(
                color: colorScheme.errorContainer,
                borderRadius:
                    BorderRadius.circular(AppThemeConstants.radiusSmall),
              ),
              child: Icon(
                CupertinoIcons.delete,
                color: colorScheme.error,
                size: AppThemeConstants.iconMedium,
              ),
            ),
            const SizedBox(width: AppThemeConstants.spacing12),
            Text(
              '删除报销集',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: colorScheme.error,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '确定要删除报销集 "${_reimbursementSet?.setName}" 吗？',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w500,
                  ),
            ),
            const SizedBox(height: AppThemeConstants.spacing12),
            Container(
              padding: const EdgeInsets.all(AppThemeConstants.spacing16),
              decoration: BoxDecoration(
                color: colorScheme.errorContainer.withValues(alpha: 0.3),
                borderRadius:
                    BorderRadius.circular(AppThemeConstants.radiusMedium),
                border: Border.all(
                  color: colorScheme.error.withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        CupertinoIcons.exclamationmark_triangle_fill,
                        color: colorScheme.error,
                        size: AppThemeConstants.iconSmall,
                      ),
                      const SizedBox(width: AppThemeConstants.spacing8),
                      Text(
                        '注意事项：',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: colorScheme.error,
                              fontWeight: FontWeight.w500,
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppThemeConstants.spacing8),
                  Text(
                    '• 包含的 ${_invoices.length} 张发票将重新变为未分配状态\n'
                    '• 此操作无法撤销\n'
                    '• 所有相关的历史记录将被清除',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onErrorContainer,
                          height: 1.4,
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            style: TextButton.styleFrom(
              foregroundColor: colorScheme.onSurfaceVariant,
            ),
            child: const Text('取消'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(context);
              context.read<ReimbursementSetBloc>().add(
                    DeleteReimbursementSet(widget.reimbursementSetId),
                  );
            },
            icon: Icon(
              CupertinoIcons.delete,
              size: AppThemeConstants.iconSmall,
            ),
            label: const Text('确认删除'),
            style: ElevatedButton.styleFrom(
              backgroundColor: colorScheme.error,
              foregroundColor: colorScheme.onError,
              shape: RoundedRectangleBorder(
                borderRadius:
                    BorderRadius.circular(AppThemeConstants.radiusMedium),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 构建简洁的状态芯片
  Widget _buildCompactStatusChip(ReimbursementSetStatus status) {
    final statusConfig =
        AppThemeConstants.getStatusConfig(context, status.value);
    final nextStatus = _getNextStatus(status);
    final isClickable = nextStatus != null;

    return InkWell(
      onTap: nextStatus != null
          ? () => _showStatusTransitionDialog(nextStatus)
          : null,
      borderRadius: BorderRadius.circular(AppThemeConstants.radiusLarge),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppThemeConstants.spacing12,
          vertical: AppThemeConstants.spacing6,
        ),
        decoration: BoxDecoration(
          color: statusConfig.color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(AppThemeConstants.radiusLarge),
          border: Border.all(
            color: statusConfig.color,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _getStatusIcon(status),
              size: AppThemeConstants.iconSmall,
              color: statusConfig.color,
            ),
            const SizedBox(width: AppThemeConstants.spacing4),
            Text(
              statusConfig.label,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: statusConfig.color,
                    fontWeight: FontWeight.w500,
                  ),
            ),
            if (isClickable) ...[
              const SizedBox(width: AppThemeConstants.spacing4),
              Icon(
                CupertinoIcons.chevron_forward,
                size: 10,
                color: statusConfig.color.withValues(alpha: 0.7),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// 构建简单的统计项
  Widget _buildSimpleStatItem(
    IconData icon,
    String value,
    String label,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(
        vertical: AppThemeConstants.spacing4,
        horizontal: AppThemeConstants.spacing8,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: AppThemeConstants.iconMedium,
            color: color,
          ),
          const SizedBox(height: AppThemeConstants.spacing4),
          Text(
            value,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontWeight: FontWeight.w600,
                ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: color,
                ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  /// 获取状态图标
  IconData _getStatusIcon(ReimbursementSetStatus status) {
    switch (status) {
      case ReimbursementSetStatus.draft:
        return CupertinoIcons.pencil;
      case ReimbursementSetStatus.submitted:
        return CupertinoIcons.paperplane;
      case ReimbursementSetStatus.reimbursed:
        return CupertinoIcons.checkmark_circle;
    }
  }

  /// 简化的日期格式化
  String _formatSimpleDate(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays == 0) {
      return '今天';
    } else if (difference.inDays == 1) {
      return '昨天';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}天前';
    } else {
      return '${dateTime.month.toString().padLeft(2, '0')}-${dateTime.day.toString().padLeft(2, '0')}';
    }
  }

  /// 获取下一个状态
  ReimbursementSetStatus? _getNextStatus(ReimbursementSetStatus current) {
    switch (current) {
      case ReimbursementSetStatus.draft:
        return ReimbursementSetStatus.submitted;
      case ReimbursementSetStatus.submitted:
        return ReimbursementSetStatus.reimbursed;
      case ReimbursementSetStatus.reimbursed:
        return null;
    }
  }
}
