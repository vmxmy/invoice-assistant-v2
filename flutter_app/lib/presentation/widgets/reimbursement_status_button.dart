import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
// ReimbursementSetStatus 已在 reimbursement_set_entity.dart 中定义
import '../../core/theme/app_theme_constants.dart';
import '../utils/reimbursement_set_operation_utils.dart';
import 'invoice_status_badge.dart';

/// 统一的报销集状态按钮组件
/// 可在卡片和详情页中复用，提供一致的状态转换体验
/// 职责：UI展示 + 触发操作工具类，不直接调用BLoC
class ReimbursementStatusButton extends StatelessWidget {
  final ReimbursementSetEntity reimbursementSet;
  final List<dynamic> invoices; // 可以是发票数量或发票列表
  final bool isCompact; // 是否为紧凑模式（用于卡片）
  final BadgeSize size; // 徽章大小

  const ReimbursementStatusButton({
    super.key,
    required this.reimbursementSet,
    required this.invoices,
    this.isCompact = false,
    this.size = BadgeSize.medium,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final status = reimbursementSet.status;

    // 根据状态和模式决定样式
    return isCompact
        ? _buildBadgeStyle(context, colorScheme, status)
        : _buildFullButton(context, colorScheme, status);
  }

  /// 构建徽章样式按钮（与发票状态徽章一致）
  Widget _buildBadgeStyle(BuildContext context, ColorScheme colorScheme,
      ReimbursementSetStatus status) {
    final (statusText, statusColor, statusIcon) =
        _getStatusInfo(colorScheme, status);

    return GestureDetector(
      onTap: () => _handleStatusUpdate(context),
      child: Container(
        padding: _getPadding(),
        decoration: BoxDecoration(
          color: statusColor.withValues(alpha: 0.15), // 与发票徽章一致
          borderRadius: BorderRadius.circular(_getBorderRadius()),
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
              size: _getIconSize(),
              color: statusColor,
            ),
            SizedBox(width: _getSpacing()),
            Text(
              statusText,
              style: TextStyle(
                fontSize: _getFontSize(),
                fontWeight: FontWeight.w600,
                color: statusColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建完整模式按钮（用于详情页）
  Widget _buildFullButton(BuildContext context, ColorScheme colorScheme,
      ReimbursementSetStatus status) {
    final (statusText, statusColor, statusIcon) =
        _getStatusInfo(colorScheme, status);

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
  (String, Color, IconData) _getStatusInfo(
      ColorScheme colorScheme, ReimbursementSetStatus status) {
    switch (status) {
      case ReimbursementSetStatus.unsubmitted:
        return ('待报销', colorScheme.secondary, CupertinoIcons.pencil);
      case ReimbursementSetStatus.submitted:
        return ('已提交', colorScheme.tertiary, CupertinoIcons.paperplane);
      case ReimbursementSetStatus.reimbursed:
        return ('已报销', colorScheme.primary, CupertinoIcons.checkmark_circle);
    }
  }

  /// 处理状态更新操作 - 显示状态选择底部弹出框
  void _handleStatusUpdate(BuildContext context) {
    // 显示状态选择底部弹出框，让用户选择任意状态
    ReimbursementSetOperationUtils.showStatusSelectionBottomSheet(
      context: context,
      setId: reimbursementSet.id,
      currentStatus: reimbursementSet.status,
      setName: reimbursementSet.setName,
      invoiceCount: _getInvoiceCount(),
    );
  }

  /// 获取发票数量
  int _getInvoiceCount() {
    // 优先使用报销集实体中的数量，这是最准确的
    return reimbursementSet.invoiceCount;
  }

  // ==================== 尺寸方法（与发票状态徽章一致） ====================

  /// 根据大小获取内边距
  EdgeInsets _getPadding() {
    switch (size) {
      case BadgeSize.small:
        return const EdgeInsets.symmetric(horizontal: 6, vertical: 2);
      case BadgeSize.medium:
        return const EdgeInsets.symmetric(horizontal: 8, vertical: 4);
      case BadgeSize.large:
        return const EdgeInsets.symmetric(horizontal: 12, vertical: 8);
    }
  }

  /// 根据大小获取圆角
  double _getBorderRadius() {
    switch (size) {
      case BadgeSize.small:
        return 10;
      case BadgeSize.medium:
        return 12;
      case BadgeSize.large:
        return 18;
    }
  }

  /// 根据大小获取图标尺寸
  double _getIconSize() {
    switch (size) {
      case BadgeSize.small:
        return 12;
      case BadgeSize.medium:
        return 14;
      case BadgeSize.large:
        return 16;
    }
  }

  /// 根据大小获取间距
  double _getSpacing() {
    switch (size) {
      case BadgeSize.small:
        return 4;
      case BadgeSize.medium:
        return 6;
      case BadgeSize.large:
        return 6;
    }
  }

  /// 根据大小获取字体大小
  double _getFontSize() {
    switch (size) {
      case BadgeSize.small:
        return 11;
      case BadgeSize.medium:
        return 13;
      case BadgeSize.large:
        return 13;
    }
  }
}
