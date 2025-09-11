import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../core/theme/app_colors.dart';

/// 发票紧急程度枚举
enum UrgencyLevel {
  normal,   // 普通（≤60天）
  urgent,   // 紧急（60-90天）
  overdue,  // 逾期（>90天）
}

/// 统一的发票状态徽章组件
/// 支持不同大小和样式，可在发票卡片和详情页面中复用
class InvoiceStatusBadge extends StatelessWidget {
  final InvoiceEntity invoice;
  final VoidCallback? onTap;
  final BadgeSize size;
  final bool showConsumptionDateOnly;
  
  const InvoiceStatusBadge({
    super.key,
    required this.invoice,
    this.onTap,
    this.size = BadgeSize.medium,
    this.showConsumptionDateOnly = false,
  });

  @override
  Widget build(BuildContext context) {
    final isReimbursed = invoice.status == InvoiceStatus.reimbursed;
    final statusColor = _getStatusColor(context, isReimbursed);
    final statusText = _getStatusText(isReimbursed);
    final statusIcon = _getStatusIcon(isReimbursed);
    
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: _getPadding(),
        decoration: BoxDecoration(
          color: statusColor.withValues(alpha: 0.15),
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

  /// 获取状态颜色（基于紧急程度）
  Color _getStatusColor(BuildContext context, bool isReimbursed) {
    if (isReimbursed) {
      return AppColors.reimbursed(context); // 已报销：绿色
    }
    
    // 未报销状态根据紧急程度确定颜色
    switch (_getUrgencyLevel()) {
      case UrgencyLevel.overdue:
        return AppColors.overdue(context); // 逾期：红色
      case UrgencyLevel.urgent:
        return AppColors.urgent(context); // 紧急：橙色
      case UrgencyLevel.normal:
        return AppColors.pending(context); // 普通：蓝色
    }
  }

  /// 获取发票的紧急程度
  UrgencyLevel _getUrgencyLevel() {
    final now = DateTime.now();
    final consumptionDate = invoice.consumptionDate ?? invoice.invoiceDate;
    final daysSinceConsumption = now.difference(consumptionDate).inDays;
    
    if (daysSinceConsumption > 90) {
      return UrgencyLevel.overdue; // 超过90天：逾期
    } else if (daysSinceConsumption > 60) {
      return UrgencyLevel.urgent; // 超过60天：紧急
    } else {
      return UrgencyLevel.normal; // 60天以内：普通
    }
  }

  /// 获取状态文本
  String _getStatusText(bool isReimbursed) {
    if (isReimbursed) {
      return '已报销';
    }
    
    // 根据紧急程度返回不同的文本
    switch (_getUrgencyLevel()) {
      case UrgencyLevel.overdue:
        return '逾期';
      case UrgencyLevel.urgent:
        return '紧急';
      case UrgencyLevel.normal:
        return '未报销';
    }
  }

  /// 获取状态图标
  IconData _getStatusIcon(bool isReimbursed) {
    if (isReimbursed) {
      return CupertinoIcons.checkmark_circle_fill;
    }
    
    switch (_getUrgencyLevel()) {
      case UrgencyLevel.overdue:
        return CupertinoIcons.exclamationmark_triangle_fill;
      case UrgencyLevel.urgent:
        return CupertinoIcons.clock_fill;
      case UrgencyLevel.normal:
        return CupertinoIcons.time_solid;
    }
  }

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

/// 徽章大小枚举
enum BadgeSize {
  small,   // 小型（适用于列表项）
  medium,  // 中型（默认）
  large,   // 大型（适用于详情页面）
}

/// 带操作表的发票状态徽章
/// 点击时显示iOS风格的状态切换菜单
class InteractiveInvoiceStatusBadge extends StatelessWidget {
  final InvoiceEntity invoice;
  final ValueChanged<InvoiceStatus>? onStatusChanged;
  final BadgeSize size;
  final bool showConsumptionDateOnly;
  
  const InteractiveInvoiceStatusBadge({
    super.key,
    required this.invoice,
    this.onStatusChanged,
    this.size = BadgeSize.medium,
    this.showConsumptionDateOnly = false,
  });

  @override
  Widget build(BuildContext context) {
    return InvoiceStatusBadge(
      invoice: invoice,
      size: size,
      showConsumptionDateOnly: showConsumptionDateOnly,
      onTap: onStatusChanged != null ? () => _showStatusActionSheet(context) : null,
    );
  }

  /// 显示状态切换操作表（iOS风格）
  void _showStatusActionSheet(BuildContext context) {
    final isCurrentlyReimbursed = invoice.status == InvoiceStatus.reimbursed;
    
    showCupertinoModalPopup(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text(
          '修改发票状态',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
        message: Text(
          invoice.sellerName ?? (invoice.invoiceNumber ?? '未知发票'),
          style: TextStyle(fontSize: 14, color: AppColors.onSurfaceVariant(context)),
        ),
        actions: [
          if (!isCurrentlyReimbursed)
            CupertinoActionSheetAction(
              onPressed: () {
                Navigator.pop(context);
                onStatusChanged?.call(InvoiceStatus.reimbursed);
                _showStatusChangeSuccess(context, '已报销');
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    CupertinoIcons.checkmark_circle_fill,
                    color: AppColors.reimbursed(context),
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '标记为已报销',
                    style: TextStyle(
                      color: AppColors.reimbursed(context),
                      fontSize: 18,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          if (isCurrentlyReimbursed)
            CupertinoActionSheetAction(
              onPressed: () {
                Navigator.pop(context);
                onStatusChanged?.call(InvoiceStatus.unreimbursed);
                _showStatusChangeSuccess(context, '未报销');
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    CupertinoIcons.time_solid,
                    color: AppColors.urgent(context),
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '标记为未报销',
                    style: TextStyle(
                      color: AppColors.urgent(context),
                      fontSize: 18,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
        ],
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(context),
          child: const Text(
            '取消',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
        ),
      ),
    );
  }

  /// 显示状态修改成功提示
  void _showStatusChangeSuccess(BuildContext context, String statusText) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.check_circle, color: AppColors.onSuccess(context)),
            const SizedBox(width: 8),
            Text('已标记为$statusText'),
          ],
        ),
        backgroundColor: AppColors.success(context),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}