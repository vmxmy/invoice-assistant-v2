import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
// ReimbursementSetStatus 已在 reimbursement_set_entity.dart 中定义
import '../../core/theme/app_theme_constants.dart';
import '../utils/reimbursement_set_operation_utils.dart';

/// 统一的报销集状态按钮组件
/// 可在卡片和详情页中复用，提供一致的状态转换体验
/// 职责：UI展示 + 触发操作工具类，不直接调用BLoC
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
    final colorScheme = Theme.of(context).colorScheme;
    final status = reimbursementSet.status;
    
    // 根据状态和模式决定样式
    return isCompact ? _buildCompactButton(context, colorScheme, status) 
                    : _buildFullButton(context, colorScheme, status);
  }

  /// 构建紧凑模式按钮（用于卡片）
  Widget _buildCompactButton(BuildContext context, ColorScheme colorScheme, ReimbursementSetStatus status) {
    final (statusText, statusColor, statusIcon) = _getStatusInfo(colorScheme, status);
    
    return GestureDetector(
      onTap: () => _handleStatusUpdate(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: statusColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(AppThemeConstants.radiusSmall),
          border: Border.all(
            color: statusColor.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              statusIcon,
              size: AppThemeConstants.iconSmall,
              color: statusColor,
            ),
            const SizedBox(width: 6),
            Text(
              statusText,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: statusColor,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建完整模式按钮（用于详情页）
  Widget _buildFullButton(BuildContext context, ColorScheme colorScheme, ReimbursementSetStatus status) {
    final (statusText, statusColor, statusIcon) = _getStatusInfo(colorScheme, status);
    
    return ElevatedButton.icon(
      onPressed: () => _handleStatusUpdate(context),
      icon: Icon(statusIcon, size: AppThemeConstants.iconMedium),
      label: Text(statusText),
      style: ElevatedButton.styleFrom(
        backgroundColor: statusColor,
        foregroundColor: colorScheme.onPrimary,
        padding: const EdgeInsets.symmetric(
          horizontal: AppThemeConstants.spacing16,
          vertical: AppThemeConstants.spacing12,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppThemeConstants.radiusMedium),
        ),
      ),
    );
  }

  /// 获取状态相关信息
  (String, Color, IconData) _getStatusInfo(ColorScheme colorScheme, ReimbursementSetStatus status) {
    switch (status) {
      case ReimbursementSetStatus.unsubmitted:
        return ('草稿', colorScheme.secondary, CupertinoIcons.pencil);
      case ReimbursementSetStatus.submitted:
        return ('已提交', colorScheme.tertiary, CupertinoIcons.paperplane);
      case ReimbursementSetStatus.reimbursed:
        return ('已报销', colorScheme.primary, CupertinoIcons.checkmark_circle);
    }
  }

  /// 处理状态更新操作 - 使用工具类（职责分离）
  void _handleStatusUpdate(BuildContext context) {
    final nextStatus = _getNextStatus(reimbursementSet.status);
    if (nextStatus == null) return;

    // 使用工具类处理确认逻辑（职责分离）
    ReimbursementSetOperationUtils.showStatusUpdateConfirmation(
      context: context,
      setId: reimbursementSet.id,
      currentStatus: reimbursementSet.status,
      nextStatus: nextStatus,
      setName: reimbursementSet.setName,
      invoiceCount: _getInvoiceCount(),
    );
  }

  /// 获取发票数量
  int _getInvoiceCount() {
    // 优先使用报销集实体中的数量，这是最准确的
    return reimbursementSet.invoiceCount;
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