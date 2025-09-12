import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../../core/theme/app_theme_constants.dart';
import '../bloc/reimbursement_set_bloc.dart';
import '../bloc/reimbursement_set_event.dart';
import 'unified_bottom_sheet.dart';

/// 统一的报销集状态按钮组件
/// 可在卡片和详情页中复用，提供一致的状态转换体验
class ReimbursementStatusButton extends StatelessWidget {
  final ReimbursementSetEntity reimbursementSet;
  final List<dynamic> invoices; // 可以是发票数量或发票列表
  final bool isCompact; // 是否为紧凑模式（用于卡片）

  const ReimbursementStatusButton({
    super.key,
    required this.reimbursementSet,
    required this.invoices,
    this.isCompact = false,
  });

  @override
  Widget build(BuildContext context) {
    final statusConfig = AppThemeConstants.getStatusConfig(context, reimbursementSet.status.value);
    final nextStatus = _getNextStatus(reimbursementSet.status);
    final isClickable = nextStatus != null;

    return InkWell(
      onTap: nextStatus != null
          ? () => _showStatusTransitionBottomSheet(context, nextStatus)
          : null,
      borderRadius: BorderRadius.circular(AppThemeConstants.radiusLarge),
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: isCompact ? AppThemeConstants.spacing8 : AppThemeConstants.spacing12,
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
              _getStatusIcon(reimbursementSet.status),
              size: isCompact ? AppThemeConstants.iconSmall - 2 : AppThemeConstants.iconSmall,
              color: statusConfig.color,
            ),
            SizedBox(width: isCompact ? 3 : AppThemeConstants.spacing4),
            Text(
              statusConfig.label,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: statusConfig.color,
                    fontWeight: FontWeight.w500,
                    fontSize: isCompact ? 11 : null,
                  ),
            ),
            if (isClickable) ...[
              SizedBox(width: isCompact ? 2 : AppThemeConstants.spacing4),
              Icon(
                CupertinoIcons.chevron_forward,
                size: isCompact ? 8 : 10,
                color: statusConfig.color.withValues(alpha: 0.7),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// 显示状态转换底部弹窗
  void _showStatusTransitionBottomSheet(BuildContext context, ReimbursementSetStatus nextStatus) {
    final colorScheme = Theme.of(context).colorScheme;
    String title;
    String content;
    String confirmText;
    Color confirmColor;
    IconData confirmIcon;

    switch (nextStatus) {
      case ReimbursementSetStatus.submitted:
        if (reimbursementSet.status == ReimbursementSetStatus.reimbursed) {
          // 从已报销撤回到已提交
          title = '撤回报销状态';
          content = '确定要撤回报销集"${reimbursementSet.setName}"的报销状态吗？\n\n'
              '🔄 撤回后将变更为"已提交"状态\n'
              '⚠️ 可以重新进行状态变更操作\n'
              '📝 可能需要重新审批或处理';
          confirmText = '确认撤回';
          confirmColor = colorScheme.error;
          confirmIcon = CupertinoIcons.arrow_counterclockwise;
        } else {
          // 从未提交到已提交
          title = '提交报销集';
          content = '确定要提交报销集"${reimbursementSet.setName}"吗？\n\n'
              '⚠️ 提交后将无法再修改报销集和发票内容\n'
              '📋 请确认所有信息都已填写正确\n'
              '💰 确认发票金额和明细无误';
          confirmText = '确认提交';
          confirmColor = colorScheme.tertiary;
          confirmIcon = CupertinoIcons.paperplane;
        }
        break;
      case ReimbursementSetStatus.reimbursed:
        title = '标记已报销';
        content = '确定要将报销集"${reimbursementSet.setName}"标记为已报销吗？\n\n'
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

    // 构建自定义内容Widget
    final customContent = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 图标和标题
        Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: confirmColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(28),
              ),
              child: Icon(
                confirmIcon,
                size: 28,
                color: confirmColor,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: colorScheme.onSurface,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    reimbursementSet.setName,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),

        // 详细说明
        Text(
          content,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                height: 1.5,
                color: colorScheme.onSurfaceVariant,
              ),
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
                      reimbursementSet.setName,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
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
                    context,
                    '包含发票',
                    '${_getInvoiceCount()} 张',
                    CupertinoIcons.doc_text,
                    confirmColor,
                  ),
                  _buildSummaryItem(
                    context,
                    '总金额',
                    '¥${reimbursementSet.totalAmount.toStringAsFixed(2)}',
                    CupertinoIcons.money_dollar_circle,
                    confirmColor,
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // 按钮组
        Row(
          children: [
            // 取消按钮
            Expanded(
              child: CupertinoButton(
                onPressed: () => Navigator.of(context).pop(false),
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

            // 确认按钮
            Expanded(
              child: CupertinoButton(
                onPressed: () => Navigator.of(context).pop(true),
                padding: const EdgeInsets.symmetric(vertical: 16),
                color: confirmColor,
                borderRadius: BorderRadius.circular(12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      confirmIcon,
                      size: 18,
                      color: colorScheme.onPrimary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      confirmText,
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
    );

    // 使用 UnifiedBottomSheet 显示确认对话框
    UnifiedBottomSheet.showCustomSheet<bool>(
      context: context,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: customContent,
      ),
      showCloseButton: false,
    ).then((result) {
      if (result == true) {
        // 用户确认，更新状态
        context.read<ReimbursementSetBloc>().add(
              UpdateReimbursementSetStatus(
                setId: reimbursementSet.id,
                status: nextStatus,
              ),
            );
      }
    });
  }

  /// 构建摘要信息项
  Widget _buildSummaryItem(
    BuildContext context,
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Column(
      children: [
        Icon(
          icon,
          color: color,
          size: 18,
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
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

  /// 获取发票数量
  int _getInvoiceCount() {
    if (invoices is List) {
      return (invoices as List).length;
    } else if (invoices is int) {
      return invoices as int;
    }
    return 0;
  }

  /// 获取状态图标
  IconData _getStatusIcon(ReimbursementSetStatus status) {
    switch (status) {
      case ReimbursementSetStatus.unsubmitted:
        return CupertinoIcons.pencil;
      case ReimbursementSetStatus.submitted:
        return CupertinoIcons.paperplane;
      case ReimbursementSetStatus.reimbursed:
        return CupertinoIcons.checkmark_circle;
    }
  }

  /// 获取下一个状态
  ReimbursementSetStatus? _getNextStatus(ReimbursementSetStatus current) {
    switch (current) {
      case ReimbursementSetStatus.unsubmitted:
        return ReimbursementSetStatus.submitted;
      case ReimbursementSetStatus.submitted:
        return ReimbursementSetStatus.reimbursed;
      case ReimbursementSetStatus.reimbursed:
        return ReimbursementSetStatus.submitted; // 允许从已报销撤回到已提交
    }
  }
}