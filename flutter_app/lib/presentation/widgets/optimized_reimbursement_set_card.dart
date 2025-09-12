import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../../core/theme/app_theme_constants.dart';
import '../../core/theme/app_typography.dart';
import '../../core/constants/accessibility_constants.dart';
import '../../core/animations/micro_interactions.dart';
import 'uniform_card_styles.dart';
import 'unified_bottom_sheet.dart';

/// 优化后的报销集卡片组件
/// 基于UI专家审计建议的简化设计，完全使用FlexColorScheme主题
class OptimizedReimbursementSetCard extends StatelessWidget {
  final ReimbursementSetEntity reimbursementSet;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final Function(ReimbursementSetStatus) onStatusChange;

  const OptimizedReimbursementSetCard({
    super.key,
    required this.reimbursementSet,
    required this.onTap,
    required this.onDelete,
    required this.onStatusChange,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Slidable(
      key: ValueKey(reimbursementSet.id),
      endActionPane: ActionPane(
        motion: const StretchMotion(),
        extentRatio: 0.25, // 固定宽度比例
        children: [
          // 自定义删除按钮容器，与Card严格对齐
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 12), // 匹配Card的底部margin
              child: Material(
                color: colorScheme.error,
                elevation: 2,
                borderRadius: const BorderRadius.only(
                  topRight: Radius.circular(12),
                  bottomRight: Radius.circular(12),
                ),
                child: Semantics(
                  label: AccessibilityConstants.deleteButtonLabel,
                  hint: AccessibilityConstants.deleteButtonHint,
                  child: InkWell(
                    onTap: () async {
                      // 使用统一的底部Sheet确认对话框
                      final result = await UnifiedBottomSheet.showConfirmDialog(
                        context: context,
                        title: '删除报销集',
                        content: '确定要删除报销集 "${reimbursementSet.setName}" 吗？\n\n包含的发票将重新变为未分配状态。',
                        confirmText: '删除',
                        confirmColor: colorScheme.error,
                        icon: CupertinoIcons.delete,
                      );
                      
                      if (result == true) {
                        onDelete();
                      }
                    },
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(12),
                      bottomRight: Radius.circular(12),
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(16), // 匹配Card的内边距
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            CupertinoIcons.delete,
                            color: colorScheme.onError,
                            size: 24,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '删除',
                            style: TextStyle(
                              color: colorScheme.onError,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      child: Semantics(
        label: '报销集: ${reimbursementSet.setName}',
        hint: AccessibilityConstants.cardActionHint,
        child: BounceButton(
          onPressed: onTap,
          child: UniformCardStyles.buildCard(
            context: context,
            onTap: null, // 由 BounceButton 处理
            child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 头部信息行
              UniformCardStyles.buildSimpleHeaderRow(
                context: context,
                title: reimbursementSet.setName,
                subtitle: '${reimbursementSet.invoiceCount} 张发票',
                trailing: _buildInteractiveStatusBadge(context),
              ),

              const SizedBox(height: UniformCardStyles.spacing12),

              // 金额显示行
              UniformCardStyles.buildAmountRow(
                context: context,
                label: '总金额',
                amount: '¥${reimbursementSet.totalAmount.toStringAsFixed(2)}',
              ),

              const SizedBox(height: UniformCardStyles.spacing12),

              // 底部信息行
              UniformCardStyles.buildBottomRow(
                context: context,
                timeText: _formatUpdateTime(reimbursementSet.updatedAt),
                actionIcons: _buildActionIcons(context),
              ),
            ],
            ),
          ),
        ),
      ),
    );
  }

  /// 构建可交互状态徽章
  Widget _buildInteractiveStatusBadge(BuildContext context) {
    final statusConfig = AppThemeConstants.getStatusConfig(
        context, reimbursementSet.status.value);

    return Semantics(
      label: '${AccessibilityConstants.statusBadgeLabel}: ${statusConfig.label}',
      hint: AccessibilityConstants.statusBadgeHint,
      child: BounceButton(
        onPressed: () => _showStatusActionSheet(context),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: statusConfig.color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: statusConfig.color.withValues(alpha: 0.3),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                _getStatusIcon(reimbursementSet.status),
                size: 14,
                color: statusConfig.color,
              ),
              const SizedBox(width: 6),
              Text(
                statusConfig.label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: statusConfig.color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 显示状态切换操作表
  void _showStatusActionSheet(BuildContext context) {
    final actions = <BottomSheetAction<ReimbursementSetStatus>>[];
    final colorScheme = Theme.of(context).colorScheme;

    // 根据当前状态构建可用操作
    switch (reimbursementSet.status) {
      case ReimbursementSetStatus.draft:
        actions.add(
          BottomSheetAction(
            title: '提交报销',
            value: ReimbursementSetStatus.submitted,
            icon: CupertinoIcons.paperplane_fill,
            color: colorScheme.secondary,
            onPressed: () => _showStatusChangeSuccess(context, '已提交'),
          ),
        );
        break;
      case ReimbursementSetStatus.submitted:
        actions.add(
          BottomSheetAction(
            title: '标记为已报销',
            value: ReimbursementSetStatus.reimbursed,
            icon: CupertinoIcons.checkmark_circle_fill,
            color: colorScheme.tertiary,
            onPressed: () => _showStatusChangeSuccess(context, '已报销'),
          ),
        );
        actions.add(
          BottomSheetAction(
            title: '退回草稿',
            value: ReimbursementSetStatus.draft,
            icon: CupertinoIcons.pencil_circle,
            color: colorScheme.outline,
            onPressed: () => _showStatusChangeSuccess(context, '草稿'),
          ),
        );
        break;
      case ReimbursementSetStatus.reimbursed:
        actions.add(
          BottomSheetAction(
            title: '退回已提交',
            value: ReimbursementSetStatus.submitted,
            icon: CupertinoIcons.paperplane,
            color: colorScheme.secondary,
            onPressed: () => _showStatusChangeSuccess(context, '已提交'),
          ),
        );
        break;
    }

    UnifiedBottomSheet.showActionSheet<ReimbursementSetStatus>(
      context: context,
      title: '修改报销集状态',
      message: reimbursementSet.setName,
      actions: actions,
    ).then((newStatus) {
      if (newStatus != null) {
        onStatusChange(newStatus);
      }
    });
  }


  /// 显示状态修改成功提示
  void _showStatusChangeSuccess(BuildContext context, String statusText) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.check_circle,
                color: Theme.of(context).colorScheme.onPrimary),
            const SizedBox(width: 8),
            Text('已标记为$statusText'),
          ],
        ),
        backgroundColor: Theme.of(context).colorScheme.primary,
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  /// 构建操作图标列表
  List<Widget> _buildActionIcons(BuildContext context) {
    // 删除按钮已移至右划手势，这里返回空列表
    return <Widget>[];
  }


  /// 显示状态变更对话框
  void _showStatusChangeDialog(BuildContext context) {
    final statusConfig = AppThemeConstants.getStatusConfig(
        context, reimbursementSet.status.value);
    final nextStatus = _getNextStatus(reimbursementSet.status);

    if (nextStatus == null) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppThemeConstants.radiusLarge),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(AppThemeConstants.spacing8),
              decoration: BoxDecoration(
                color: statusConfig.color.withValues(alpha: 0.15),
                borderRadius:
                    BorderRadius.circular(AppThemeConstants.radiusSmall),
              ),
              child: Icon(
                _getStatusIcon(nextStatus),
                color: statusConfig.color,
                size: AppThemeConstants.iconLarge,
              ),
            ),
            const SizedBox(width: AppThemeConstants.spacing12),
            Expanded(
              child: Text(
                '更改状态到 "${_getStatusLabel(nextStatus)}"',
                style: AppTypography.titleLarge(context).copyWith(
                  color: statusConfig.color,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '确定要将报销集状态更改为 "${_getStatusLabel(nextStatus)}" 吗？',
              style: AppTypography.bodyMedium(context).copyWith(
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: AppThemeConstants.spacing16),
            Container(
              padding: const EdgeInsets.all(AppThemeConstants.spacing12),
              decoration: BoxDecoration(
                color: statusConfig.color.withValues(alpha: 0.08),
                borderRadius:
                    BorderRadius.circular(AppThemeConstants.radiusSmall),
                border: Border.all(
                  color: statusConfig.color.withValues(alpha: 0.2),
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    CupertinoIcons.info_circle,
                    color: statusConfig.color,
                    size: AppThemeConstants.iconMedium,
                  ),
                  const SizedBox(width: AppThemeConstants.spacing8),
                  Expanded(
                    child: Text(
                      statusConfig.description,
                      style: AppTypography.bodySmall(context).copyWith(
                        color: statusConfig.color,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            child: Text(
              '取消',
              style: AppTypography.labelLarge(context).copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              onStatusChange(nextStatus);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: statusConfig.color,
              shape: RoundedRectangleBorder(
                borderRadius:
                    BorderRadius.circular(AppThemeConstants.radiusSmall),
              ),
            ),
            child: Text(
              '确认',
              style: AppTypography.labelLarge(context).copyWith(
                color: Theme.of(context).colorScheme.onPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ==================== 辅助方法 ====================

  /// 获取状态图标
  IconData _getStatusIcon(ReimbursementSetStatus status) {
    switch (status) {
      case ReimbursementSetStatus.draft:
        return CupertinoIcons.pencil_circle;
      case ReimbursementSetStatus.submitted:
        return CupertinoIcons.paperplane_fill;
      case ReimbursementSetStatus.reimbursed:
        return CupertinoIcons.checkmark_circle_fill;
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

  /// 获取状态标签（使用主题常量）
  String _getStatusLabel(ReimbursementSetStatus status) {
    // 这里临时使用 build context 为 null 的情况，在实际使用中需要传入正确的 context
    // 或者创建静态的标签映射
    switch (status) {
      case ReimbursementSetStatus.draft:
        return '草稿';
      case ReimbursementSetStatus.submitted:
        return '已提交';
      case ReimbursementSetStatus.reimbursed:
        return '已报销';
    }
  }

  /// 格式化更新时间
  String _formatUpdateTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 0) {
      return '${difference.inDays}天前';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}小时前';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}分钟前';
    } else {
      return '刚刚';
    }
  }
}
