import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../../core/theme/app_theme_constants.dart';
import '../../core/theme/app_typography.dart';

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
    return Card(
      margin: const EdgeInsets.only(bottom: AppThemeConstants.spacing12),
      elevation: 2,
      shadowColor: Colors.black.withValues(alpha: 0.1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppThemeConstants.radiusMedium),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppThemeConstants.radiusMedium),
        child: Padding(
          padding: const EdgeInsets.all(AppThemeConstants.spacing16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 简化的头部 - 只显示关键信息
              _buildSimplifiedHeader(context),
              
              const SizedBox(height: AppThemeConstants.spacing12),
              
              // 突出显示核心指标
              _buildKeyMetrics(context),
              
              const SizedBox(height: AppThemeConstants.spacing12),
              
              // 简化的底部操作区
              _buildActionBar(context),
            ],
          ),
        ),
      ),
    );
  }

  /// 构建简化的头部信息
  Widget _buildSimplifiedHeader(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Row(
      children: [
        // 报销集标题
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                reimbursementSet.setName,
                style: AppTypography.titleMedium(context).copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: AppThemeConstants.spacing4),
              Text(
                '${reimbursementSet.invoiceCount} 张发票',
                style: AppTypography.bodySmall(context).copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        
        // 状态徽章
        _buildStatusChip(context),
      ],
    );
  }

  /// 构建状态徽章（主题感知）
  Widget _buildStatusChip(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final statusConfig = AppThemeConstants.getStatusConfig(context, reimbursementSet.status.value);
    final isClickable = reimbursementSet.canEdit || reimbursementSet.canSubmit || reimbursementSet.canMarkReimbursed;

    return AnimatedContainer(
      duration: AppThemeConstants.animationMedium,
      padding: const EdgeInsets.symmetric(
        horizontal: AppThemeConstants.spacing8,
        vertical: AppThemeConstants.spacing4,
      ),
      decoration: BoxDecoration(
        color: statusConfig.color.withValues(alpha: isClickable ? 0.15 : 0.1),
        borderRadius: BorderRadius.circular(AppThemeConstants.radiusLarge),
        border: Border.all(
          color: statusConfig.color.withValues(alpha: isClickable ? 0.4 : 0.3),
          width: 1,
        ),
      ),
      child: GestureDetector(
        onTap: isClickable ? () => _showStatusChangeDialog(context) : null,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _getStatusIcon(reimbursementSet.status),
              size: AppThemeConstants.iconSmall,
              color: statusConfig.color,
            ),
            const SizedBox(width: AppThemeConstants.spacing4),
            Text(
              statusConfig.label,
              style: AppTypography.labelMedium(context).copyWith(
                color: statusConfig.color,
                fontWeight: FontWeight.w500,
              ),
            ),
            if (isClickable) ...[
              const SizedBox(width: AppThemeConstants.spacing4),
              Icon(
                CupertinoIcons.chevron_down,
                size: 12,
                color: statusConfig.color.withValues(alpha: 0.7),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// 构建核心指标显示区域
  Widget _buildKeyMetrics(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Container(
      padding: const EdgeInsets.all(AppThemeConstants.spacing12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(AppThemeConstants.radiusSmall),
        border: Border.all(
          color: colorScheme.primary.withValues(alpha: 0.1),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          // 发票数量
          _buildMetricItem(
            context,
            CupertinoIcons.doc_text,
            reimbursementSet.invoiceCount.toString(),
            '发票',
            colorScheme.primary,
          ),
          
          // 分隔线
          Container(
            margin: const EdgeInsets.symmetric(horizontal: AppThemeConstants.spacing8),
            width: 1,
            height: 24,
            color: colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
          ),
          
          // 总金额
          _buildMetricItem(
            context,
            CupertinoIcons.money_dollar_circle,
            '¥${reimbursementSet.totalAmount.toStringAsFixed(0)}',
            '总额',
            colorScheme.tertiary,
          ),
        ],
      ),
    );
  }

  /// 构建单个指标项 - 标签:数值格式
  Widget _buildMetricItem(
    BuildContext context,
    IconData icon,
    String value,
    String label,
    Color color,
  ) {
    return Expanded(
      child: Row(
        children: [
          Icon(
            icon,
            size: AppThemeConstants.iconSmall, 
            color: color,
          ),
          const SizedBox(width: AppThemeConstants.spacing4),
          Expanded(
            child: RichText(
              overflow: TextOverflow.ellipsis,
              text: TextSpan(
                children: [
                  TextSpan(
                    text: '$label: ',
                    style: AppTypography.bodySmall(context).copyWith(
                      color: color.withValues(alpha: 0.7),
                    ),
                  ),
                  TextSpan(
                    text: value,
                    style: AppTypography.titleSmall(context).copyWith(
                      color: color,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 构建简化的操作栏
  Widget _buildActionBar(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Row(
      children: [
        // 更新时间
        Icon(
          CupertinoIcons.time,
          size: AppThemeConstants.iconSmall,
          color: colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: AppThemeConstants.spacing4),
        Text(
          _formatUpdateTime(reimbursementSet.updatedAt),
          style: AppTypography.bodySmall(context).copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
        ),
        
        const Spacer(),
        
        // 快捷操作按钮
        Row(
          children: [
            // 提交按钮
            if (reimbursementSet.status == ReimbursementSetStatus.draft)
              _buildQuickActionButton(
                context,
                CupertinoIcons.paperplane,
                '提交',
                colorScheme.secondary,
                () => onStatusChange(ReimbursementSetStatus.submitted),
              ),
            
            // 完成按钮
            if (reimbursementSet.status == ReimbursementSetStatus.submitted)
              _buildQuickActionButton(
                context,
                CupertinoIcons.checkmark_circle,
                '完成',
                colorScheme.tertiary,
                () => onStatusChange(ReimbursementSetStatus.reimbursed),
              ),
            
            if (reimbursementSet.canEdit || reimbursementSet.canSubmit || reimbursementSet.canMarkReimbursed)
              const SizedBox(width: AppThemeConstants.spacing8),
            
            // 删除按钮
            _buildQuickActionButton(
              context,
              CupertinoIcons.delete,
              '删除',
              colorScheme.error,
              onDelete,
            ),
          ],
        ),
      ],
    );
  }

  /// 构建快捷操作按钮
  Widget _buildQuickActionButton(
    BuildContext context,
    IconData icon,
    String label,
    Color color,
    VoidCallback onPressed,
  ) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(AppThemeConstants.radiusSmall),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppThemeConstants.spacing8,
          vertical: AppThemeConstants.spacing4,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: AppThemeConstants.iconSmall, color: color),
            const SizedBox(width: AppThemeConstants.spacing4),
            Text(
              label,
              style: AppTypography.labelSmall(context).copyWith(
                color: color,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 显示状态变更对话框
  void _showStatusChangeDialog(BuildContext context) {
    final statusConfig = AppThemeConstants.getStatusConfig(context, reimbursementSet.status.value);
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
                borderRadius: BorderRadius.circular(AppThemeConstants.radiusSmall),
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
                borderRadius: BorderRadius.circular(AppThemeConstants.radiusSmall),
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
                borderRadius: BorderRadius.circular(AppThemeConstants.radiusSmall),
              ),
            ),
            child: Text(
              '确认',
              style: AppTypography.labelLarge(context).copyWith(
                color: Colors.white,
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