import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../utils/invoice_status_operation_utils.dart';

/// 发票紧急程度枚举
enum UrgencyLevel {
  normal, // 普通（≤60天）
  urgent, // 紧急（60-90天）
  overdue, // 逾期（>90天）
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
    // 使用新的状态显示系统，遵循状态一致性约束
    final effectiveStatus = invoice.effectiveStatus;
    final statusColor = _getStatusColorNew(context, effectiveStatus);
    final statusText = invoice.statusDisplayText; // 使用 entity 的状态显示文本
    final statusIcon = _getStatusIconNew(effectiveStatus);

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


  /// 新的状态颜色获取方法 - 基于紧急程度和状态
  Color _getStatusColorNew(BuildContext context, InvoiceStatus status) {
    final colorScheme = Theme.of(context).colorScheme;
    
    // 获取要显示的状态（报销集中用有效状态，独立发票用原始状态）
    final displayStatus = invoice.isInReimbursementSet ? status : invoice.rawStatus;
    
    // 如果发票已报销，直接显示绿色
    if (displayStatus == InvoiceStatus.reimbursed) {
      return colorScheme.secondary; // 绿色
    }
    
    // 待报销发票根据紧急程度决定颜色
    switch (_getUrgencyLevel()) {
      case UrgencyLevel.overdue:
        return colorScheme.error; // 逾期：红色
      case UrgencyLevel.urgent:
        return colorScheme.tertiary; // 紧急：橙色（使用语义颜色）
      case UrgencyLevel.normal:
        return colorScheme.primary; // 普通：蓝色
    }
  }

  /// 新的状态图标获取方法 - 基于有效状态
  IconData _getStatusIconNew(InvoiceStatus status) {
    // 获取要显示的状态（报销集中用有效状态，独立发票用原始状态）
    final displayStatus = invoice.isInReimbursementSet ? status : invoice.rawStatus;
    
    switch (displayStatus) {
      case InvoiceStatus.unsubmitted:
        return CupertinoIcons.doc_text;
      case InvoiceStatus.submitted:
        return CupertinoIcons.paperplane;
      case InvoiceStatus.reimbursed:
        return CupertinoIcons.checkmark_circle_fill;
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
  small, // 小型（适用于列表项）
  medium, // 中型（默认）
  large, // 大型（适用于详情页面）
}

/// 带操作表的发票状态徽章
/// 点击时显示iOS风格的状态切换菜单
/// 职责：UI展示 + 触发操作工具类，不直接处理业务逻辑
class InteractiveInvoiceStatusBadge extends StatelessWidget {
  final InvoiceEntity invoice;
  final bool enableStatusChange;
  final BadgeSize size;
  final bool showConsumptionDateOnly;

  const InteractiveInvoiceStatusBadge({
    super.key,
    required this.invoice,
    this.enableStatusChange = true,
    this.size = BadgeSize.medium,
    this.showConsumptionDateOnly = false,
  });

  @override
  Widget build(BuildContext context) {
    return InvoiceStatusBadge(
      invoice: invoice,
      size: size,
      showConsumptionDateOnly: showConsumptionDateOnly,
      onTap: enableStatusChange
          ? () => _handleStatusTap(context)
          : null,
    );
  }

  /// 处理状态点击 - 使用工具类（职责分离）
  void _handleStatusTap(BuildContext context) {
    InvoiceStatusOperationUtils.showStatusActionSheet(
      context: context,
      invoice: invoice,
    );
  }

}
