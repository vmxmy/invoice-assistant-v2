import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../core/widgets/organisms/invoice_card/invoice_card_slidable.dart';
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
import '../utils/invoice_delete_utils.dart';
import '../utils/reimbursement_set_operation_utils.dart';
import '../widgets/detail_page_styles.dart';
import '../widgets/reimbursement_status_button.dart';
import '../widgets/unified_bottom_sheet.dart';
import '../../core/events/app_event_bus.dart';

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
  final AppEventBus _eventBus = AppEventBus.instance;

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
  void dispose() {
    // 发送返回事件，通知报销集列表页面刷新
    _eventBus.emit(ReimbursementSetDetailPageReturnEvent(
      reimbursementSetId: widget.reimbursementSetId,
      fromRoute: '/reimbursement-set/${widget.reimbursementSetId}',
      toRoute: '/',
      timestamp: DateTime.now(),
    ));
    super.dispose();
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
            // 状态更新成功，只有当前显示的报销集是更新的目标时才刷新详情
            if (state.updatedSet.id == widget.reimbursementSetId) {
              _loadReimbursementSetDetail();
            }
            AppFeedback.success(context, '状态更新成功');
          } else if (state is ReimbursementSetOperationSuccess) {
            // 处理所有其他操作成功状态（添加发票、移出发票等）
            // 只有与当前详情页相关的操作才刷新详情数据
            if (state.entityId == widget.reimbursementSetId) {
              _loadReimbursementSetDetail();
            }
            AppFeedback.success(context, state.message);
          } else if (state is ReimbursementSetCreateSuccess) {
            // 创建报销集成功（虽然在详情页不太可能发生）
            AppFeedback.success(context, state.message);
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
              // 自定义右滑操作：根据报销集状态显示不同操作
              customEndActions: _buildReimbursementSetDetailEndActions(invoice),
              // 保持默认的左滑分享功能
              customStartActions: null, // 使用默认的分享功能
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
    // 使用工具类处理编辑逻辑（职责分离）
    ReimbursementSetOperationUtils.showEditDialog(
      context: context,
      setId: widget.reimbursementSetId,
      currentName: _reimbursementSet?.setName,
      currentDescription: _reimbursementSet?.description,
    );
  }

  void _updateStatus(ReimbursementSetStatus newStatus) {
    // 使用工具类处理状态更新逻辑（职责分离）
    ReimbursementSetOperationUtils.showStatusUpdateConfirmation(
      context: context,
      setId: widget.reimbursementSetId,
      currentStatus: _reimbursementSet!.status,
      nextStatus: newStatus,
      setName: _reimbursementSet!.setName,
      invoiceCount: _invoices.length,
    );
  }

  void _showDeleteConfirmation() {
    // 使用工具类处理删除逻辑（职责分离）
    ReimbursementSetOperationUtils.showDeleteConfirmation(
      context: context,
      setId: widget.reimbursementSetId,
      setName: _reimbursementSet?.setName,
      invoiceCount: _invoices.length,
    );
  }

  /// 从报销集中移出发票
  void _removeInvoiceFromSet(String invoiceId) {
    UnifiedBottomSheet.showConfirmDialog(
      context: context,
      title: '移出发票',
      content: '确定要将此发票从当前报销集中移出吗？\n\n'
          '• 发票将变为未分配状态\n'
          '• 发票本身不会被删除\n'
          '• 可以重新加入其他报销集',
      confirmText: '确认移出',
      cancelText: '取消',
      confirmColor: Colors.orange,
      icon: CupertinoIcons.minus_circle,
    ).then((result) {
      if (result == true && mounted) {
        context.read<ReimbursementSetBloc>().add(
              RemoveInvoicesFromReimbursementSet([invoiceId]),
            );
        
        // 显示成功反馈
        if (mounted) {
          AppFeedback.success(
            context,
            '发票已从报销集中移出',
          );
        }
        
        // 刷新发票列表
        setState(() {
          _invoices.removeWhere((invoice) => invoice.id == invoiceId);
        });
      }
    });
  }

  /// 删除发票
  void _deleteInvoice(String invoiceId) {
    InvoiceDeleteUtils.showDeleteFromSetConfirmation(
      context: context,
      invoiceId: invoiceId,
      setName: _reimbursementSet?.setName,
      onDeleted: () {
        AppFeedback.success(
          context,
          '发票已删除',
        );
        
        // 刷新发票列表
        setState(() {
          _invoices.removeWhere((invoice) => invoice.id == invoiceId);
        });
      },
    );
  }

  /// 构建报销单详情页面的右滑操作
  List<SlideAction> _buildReimbursementSetDetailEndActions(InvoiceEntity invoice) {
    List<SlideAction> actions = [];

    // 检查报销集状态，决定显示什么操作
    if (_reimbursementSet?.status == ReimbursementSetStatus.unsubmitted) {
      // 未提交状态：可以移出和删除
      actions.add(InvoiceSlideActions.remove(
        onPressed: () => _removeInvoiceFromSet(invoice.id),
      ));
      actions.add(InvoiceSlideActions.delete(
        onPressed: () => _deleteInvoice(invoice.id),
      ));
    } else if (_reimbursementSet?.status == ReimbursementSetStatus.submitted) {
      // 已提交状态：只能查看，不能修改
      actions.add(InvoiceSlideActions.view(
        onPressed: () => context.push('/invoice-detail/${invoice.id}'),
      ));
    } else if (_reimbursementSet?.status == ReimbursementSetStatus.reimbursed) {
      // 已报销状态：只能查看和归档
      actions.add(InvoiceSlideActions.view(
        onPressed: () => context.push('/invoice-detail/${invoice.id}'),
      ));
      actions.add(InvoiceSlideActions.archive(
        onPressed: () => _archiveInvoice(invoice.id),
      ));
    }

    return actions;
  }

  /// 归档发票
  void _archiveInvoice(String invoiceId) {
    // 暂未实现归档功能
    AppFeedback.info(context, '归档功能待实现');
  }
}