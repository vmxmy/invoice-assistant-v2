import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../core/theme/app_theme_constants.dart';
import '../../core/theme/app_typography.dart';
import '../bloc/reimbursement_set_bloc.dart';
import '../bloc/reimbursement_set_event.dart';
import '../bloc/reimbursement_set_state.dart';
import '../widgets/invoice_card_widget.dart';
import '../widgets/skeleton_loader.dart';
import '../widgets/app_feedback.dart';

/// 报销集详情页面
class ReimbursementSetDetailPage extends StatefulWidget {
  final String reimbursementSetId;

  const ReimbursementSetDetailPage({
    super.key,
    required this.reimbursementSetId,
  });

  @override
  State<ReimbursementSetDetailPage> createState() => _ReimbursementSetDetailPageState();
}

class _ReimbursementSetDetailPageState extends State<ReimbursementSetDetailPage> {
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
    return SliverAppBar(
      pinned: true,
      floating: false,
      expandedHeight: 0,
      toolbarHeight: kToolbarHeight,
      title: Text(
        _reimbursementSet?.setName ?? '报销集详情',
        style: AppTypography.titleLarge(context).copyWith(
          fontWeight: FontWeight.w600,
        ),
      ),
      actions: [
        if (_reimbursementSet != null)
          PopupMenuButton<String>(
            icon: const Icon(CupertinoIcons.ellipsis),
            onSelected: _handleMenuAction,
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(CupertinoIcons.pencil, size: AppThemeConstants.iconMedium),
                    const SizedBox(width: AppThemeConstants.spacing8),
                    const Text('编辑'),
                  ],
                ),
              ),
              if (_reimbursementSet!.isDraft)
                PopupMenuItem(
                  value: 'submit',
                  child: Row(
                    children: [
                      Icon(CupertinoIcons.paperplane, size: AppThemeConstants.iconMedium),
                      const SizedBox(width: AppThemeConstants.spacing8),
                      const Text('提交'),
                    ],
                  ),
                ),
              if (_reimbursementSet!.isSubmitted)
                PopupMenuItem(
                  value: 'reimburse',
                  child: Row(
                    children: [
                      Icon(CupertinoIcons.checkmark_circle, size: AppThemeConstants.iconMedium),
                      const SizedBox(width: AppThemeConstants.spacing8),
                      const Text('已报销'),
                    ],
                  ),
                ),
              const PopupMenuDivider(),
              PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(CupertinoIcons.delete, size: AppThemeConstants.iconMedium, color: Theme.of(context).colorScheme.error),
                    const SizedBox(width: AppThemeConstants.spacing8),
                    Text('删除', style: TextStyle(color: Theme.of(context).colorScheme.error)),
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
    
    return Padding(
      padding: const EdgeInsets.all(AppThemeConstants.spacing16),
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
                      style: AppTypography.headlineMedium(context).copyWith(
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    if (set.description?.isNotEmpty == true) ...[
                      const SizedBox(height: AppThemeConstants.spacing4),
                      Text(
                        set.description!,
                        style: AppTypography.bodyMedium(context).copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              // 状态标签
              _buildCompactStatusChip(set.status),
            ],
          ),
          
          const SizedBox(height: AppThemeConstants.spacing16),
          
          // 简洁的统计信息
          Row(
            children: [
              _buildSimpleStatItem(
                CupertinoIcons.doc_text,
                '${set.invoiceCount}',
                '张发票',
                Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(width: AppThemeConstants.spacing24),
              _buildSimpleStatItem(
                CupertinoIcons.money_dollar_circle,
                '¥${set.totalAmount.toStringAsFixed(2)}',
                '总金额',
                Theme.of(context).colorScheme.tertiary,
              ),
              const SizedBox(width: AppThemeConstants.spacing24),
              _buildSimpleStatItem(
                CupertinoIcons.clock,
                _formatSimpleDate(set.createdAt),
                '创建时间',
                Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ],
          ),
          
          const SizedBox(height: AppThemeConstants.spacing16),
          const Divider(height: 1),
        ],
      ),
    );
  }


  /// 显示状态转换对话框
  void _showStatusTransitionDialog(ReimbursementSetStatus nextStatus) {
    if (_reimbursementSet == null) return;

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
        confirmColor = Theme.of(context).colorScheme.tertiary;
        confirmIcon = CupertinoIcons.paperplane;
        break;
      case ReimbursementSetStatus.reimbursed:
        title = '标记已报销';
        content = '确定要将报销集 "${_reimbursementSet!.setName}" 标记为已报销吗？\n\n'
                 '✅ 标记后将进入归档状态\n'
                 '🔒 将无法再进行任何修改操作\n'
                 '📁 可以导出报销凭证留档';
        confirmText = '确认标记';
        confirmColor = Theme.of(context).colorScheme.secondary;
        confirmIcon = CupertinoIcons.checkmark_circle;
        break;
      default:
        return;
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        title: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: confirmColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  confirmIcon,
                  color: confirmColor,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
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
              style: const TextStyle(height: 1.5),
            ),
            const SizedBox(height: 20),
            
            // 报销集信息摘要
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    confirmColor.withValues(alpha: 0.05),
                    confirmColor.withValues(alpha: 0.1),
                  ],
                ),
                borderRadius: BorderRadius.circular(12),
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
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _reimbursementSet!.setName,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: confirmColor,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
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
            child: const Text('取消'),
          ),
          const SizedBox(width: 8),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              _updateStatus(nextStatus);
            },
            icon: Icon(confirmIcon, size: 18),
            label: Text(confirmText),
            style: ElevatedButton.styleFrom(
              backgroundColor: confirmColor,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  /// 构建摘要信息项
  Widget _buildSummaryItem(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: color,
            fontSize: 16,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: color.withValues(alpha: 0.7),
          ),
        ),
      ],
    );
  }





  Widget _buildInvoiceList() {
    if (_invoices.isEmpty) {
      return SliverFillRemaining(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(CupertinoIcons.doc, size: 64, color: Theme.of(context).colorScheme.onSurfaceVariant),
              const SizedBox(height: 16),
              Text('该报销集暂无发票', style: TextStyle(fontSize: 16, color: Theme.of(context).colorScheme.onSurfaceVariant)),
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
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(CupertinoIcons.exclamationmark_triangle, size: 64, color: Theme.of(context).colorScheme.error),
          const SizedBox(height: 16),
          Text(
            '加载失败',
            style: AppTypography.headlineSmall(context),
          ),
          const SizedBox(height: 8),
          const Text('无法获取报销集详情'),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              setState(() => _isLoading = true);
              _loadReimbursementSetDetail();
            },
            child: const Text('重试'),
          ),
        ],
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
    final nameController = TextEditingController(text: _reimbursementSet?.setName);
    final descriptionController = TextEditingController(text: _reimbursementSet?.description);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('编辑报销集'),
        content: SizedBox(
          width: MediaQuery.of(context).size.width * 0.8,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: '报销集名称',
                  border: OutlineInputBorder(),
                ),
                maxLength: 100,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: descriptionController,
                decoration: const InputDecoration(
                  labelText: '描述（可选）',
                  border: OutlineInputBorder(),
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
            child: const Text('取消'),
          ),
          ElevatedButton(
            onPressed: () {
              final name = nameController.text.trim();
              if (name.isNotEmpty) {
                Navigator.pop(context);
                context.read<ReimbursementSetBloc>().add(
                  UpdateReimbursementSet(
                    setId: widget.reimbursementSetId,
                    setName: name,
                    description: descriptionController.text.trim().isEmpty 
                        ? null : descriptionController.text.trim(),
                  ),
                );
              }
            },
            child: const Text('保存'),
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
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除报销集'),
        content: Text(
          '确定要删除报销集 "${_reimbursementSet?.setName}" 吗？\n\n'
          '包含的 ${_invoices.length} 张发票将重新变为未分配状态。\n\n'
          '此操作无法撤销。'
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<ReimbursementSetBloc>().add(
                DeleteReimbursementSet(widget.reimbursementSetId),
              );
            },
            style: TextButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
            child: const Text('删除'),
          ),
        ],
      ),
    );
  }


  /// 构建简洁的状态芯片
  Widget _buildCompactStatusChip(ReimbursementSetStatus status) {
    final statusConfig = AppThemeConstants.getStatusConfig(context, status.value);
    final nextStatus = _getNextStatus(status);
    final isClickable = nextStatus != null;
    
    return InkWell(
      onTap: nextStatus != null ? () => _showStatusTransitionDialog(nextStatus) : null,
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
              style: AppTypography.labelMedium(context).copyWith(
                color: statusConfig.color,
                fontWeight: FontWeight.w600,
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
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: AppThemeConstants.iconSmall,
          color: color,
        ),
        const SizedBox(width: AppThemeConstants.spacing4),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: AppTypography.titleSmall(context).copyWith(
                color: Theme.of(context).colorScheme.onSurface,
                fontWeight: FontWeight.w600,
              ),
            ),
            Text(
              label,
              style: AppTypography.bodySmall(context).copyWith(
                color: color,
              ),
            ),
          ],
        ),
      ],
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

