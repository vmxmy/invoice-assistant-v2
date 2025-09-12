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
import '../widgets/reimbursement_status_button.dart';
import '../widgets/unified_bottom_sheet.dart';

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

  /// 构建核心信息卡片 - 遵循发票详情页设计标准
  Widget _buildSimplifiedHeader() {
    final set = _reimbursementSet!;
    
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          // 核心信息卡片
          _buildCoreInfoCard(set),
        ],
      ),
    );
  }

  /// 第一层：核心信息卡片
  Widget _buildCoreInfoCard(ReimbursementSetEntity set) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 总金额 - 最重要的信息
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '报销总金额',
                  style: DetailPageStyles.labelText(context),
                ),
                ReimbursementStatusButton(
                  reimbursementSet: set,
                  invoices: _invoices,
                  isCompact: true,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                '¥${set.totalAmount.toStringAsFixed(2)}',
                style: DetailPageStyles.amountText(context),
                textAlign: TextAlign.right,
              ),
            ),

            const SizedBox(height: 16),

            // 基本信息行
            _buildInfoRow(
                '包含发票', '${set.invoiceCount} 张', CupertinoIcons.doc_text),
            _buildInfoRow('创建时间', _formatDetailDate(set.createdAt),
                CupertinoIcons.calendar),
            if (set.description?.isNotEmpty == true)
              _buildInfoRow('描述', set.description!, CupertinoIcons.text_quote),
          ],
        ),
      ),
    );
  }

  /// 信息行组件 - 与发票详情页保持一致
  Widget _buildInfoRow(String label, String value, IconData icon,
      {Color? textColor}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            size: 18,
            color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.7),
          ),
          const SizedBox(width: 12),
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: Theme.of(context)
                  .colorScheme
                  .onSurface
                  .withValues(alpha: 0.7),
            ),
          ),
          Expanded(
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                value,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: textColor ?? Theme.of(context).colorScheme.onSurface,
                ),
                textAlign: TextAlign.right,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 详细的日期格式化
  String _formatDetailDate(DateTime dateTime) {
    return '${dateTime.year}-${dateTime.month.toString().padLeft(2, '0')}-${dateTime.day.toString().padLeft(2, '0')} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
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

    // 构建编辑表单内容
    final editForm = StatefulBuilder(
      builder: (context, setState) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 标题区域
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: colorScheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Icon(
                  CupertinoIcons.pencil,
                  color: colorScheme.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Text(
                '编辑报销集',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onSurface,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          
          // 表单字段
          CupertinoTextField(
            controller: nameController,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: colorScheme.onSurface,
                ),
            placeholder: '报销集名称',
            maxLength: 100,
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
            padding: const EdgeInsets.all(16),
          ),
          const SizedBox(height: 16),
          
          CupertinoTextField(
            controller: descriptionController,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: colorScheme.onSurface,
                ),
            placeholder: '描述（可选）',
            maxLines: 3,
            maxLength: 500,
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
            padding: const EdgeInsets.all(16),
          ),
          const SizedBox(height: 24),
          
          // 按钮组
          Row(
            children: [
              // 取消按钮
              Expanded(
                child: CupertinoButton(
                  onPressed: () => Navigator.of(context).pop(),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  color: colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                  child: Text(
                    '取消',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              
              // 保存按钮
              Expanded(
                child: CupertinoButton(
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
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  color: colorScheme.primary,
                  borderRadius: BorderRadius.circular(12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        CupertinoIcons.checkmark,
                        size: 18,
                        color: colorScheme.onPrimary,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '保存',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: colorScheme.onPrimary,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );

    // 使用 UnifiedBottomSheet
    UnifiedBottomSheet.showCustomSheet(
      context: context,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: editForm,
      ),
      showCloseButton: false,
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
    UnifiedBottomSheet.showConfirmDialog(
      context: context,
      title: '删除报销集',
      content: '确定要删除报销集"${_reimbursementSet?.setName}"吗？\n\n'
          '• 包含的${_invoices.length}张发票将重新变为未分配状态\n'
          '• 此操作无法撤销\n'
          '• 所有相关的历史记录将被清除',
      confirmText: '确认删除',
      cancelText: '取消',
      confirmColor: Theme.of(context).colorScheme.error,
      icon: CupertinoIcons.delete,
    ).then((result) {
      if (result == true) {
        context.read<ReimbursementSetBloc>().add(
              DeleteReimbursementSet(widget.reimbursementSetId),
            );
      }
    });
  }
}