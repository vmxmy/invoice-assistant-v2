import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';

/// 发票卡片组件 - 展示单个发票的信息
class InvoiceCardWidget extends StatelessWidget {
  final InvoiceEntity invoice;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;
  final ValueChanged<InvoiceStatus>? onStatusChanged;
  final bool showConsumptionDateOnly;

  const InvoiceCardWidget({
    super.key,
    required this.invoice,
    this.onTap,
    this.onDelete,
    this.onStatusChanged,
    this.showConsumptionDateOnly = false,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 头部信息行
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 卖方名称或发票号码
                        Text(
                          invoice.sellerName ?? invoice.invoiceNumber ?? '未知发票',
                          style: textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        // 日期信息（根据平台显示不同日期）
                        _buildDateInfo(context, textTheme),
                      ],
                    ),
                  ),
                  // 状态和操作按钮
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _buildStatusBadge(context, colorScheme),
                      if (onDelete != null) ...[
                        const SizedBox(width: 12),
                        _buildDeleteButton(colorScheme),
                      ],
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // 金额信息
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '金额',
                    style: textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                  Text(
                    invoice.formattedAmount,
                    style: textTheme.titleMedium?.copyWith(
                      color: colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),

              // 如果有买方名称，显示买方信息
              if (invoice.buyerName?.isNotEmpty == true) ...[
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '买方',
                      style: textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                    Expanded(
                      child: Text(
                        invoice.buyerName!,
                        style: textTheme.bodyMedium,
                        textAlign: TextAlign.end,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],

              // 显示进度条（基于报销状态）
              if (invoice.status == InvoiceStatus.unreimbursed) ...[
                const SizedBox(height: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '处理进度',
                          style: textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                        Text(
                          '${(invoice.progressPercent * 100).toInt()}%',
                          style: textTheme.bodySmall?.copyWith(
                            color: colorScheme.primary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    LinearProgressIndicator(
                      value: invoice.progressPercent,
                      backgroundColor: colorScheme.surfaceContainerHighest,
                      valueColor: AlwaysStoppedAnimation<Color>(colorScheme.primary),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  /// 构建日期信息
  Widget _buildDateInfo(BuildContext context, TextTheme textTheme) {
    final colorScheme = Theme.of(context).colorScheme;
    
    // 根据平台和设置决定显示哪个日期
    String dateText;
    IconData dateIcon;
    
    if (showConsumptionDateOnly && invoice.consumptionDate != null) {
      // 显示消费日期
      dateText = invoice.formattedConsumptionDate ?? invoice.formattedDate;
      dateIcon = Icons.shopping_cart_outlined;
    } else if (invoice.consumptionDate != null && !showConsumptionDateOnly) {
      // 显示消费日期（如果存在）
      dateText = invoice.formattedConsumptionDate ?? invoice.formattedDate;
      dateIcon = Icons.shopping_cart_outlined;
    } else {
      // 显示发票日期
      dateText = invoice.formattedDate;
      dateIcon = Icons.receipt_outlined;
    }

    return Row(
      children: [
        Icon(
          dateIcon,
          size: 14,
          color: colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: 4),
        Text(
          dateText,
          style: textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  /// 构建状态徽章（iOS风格）
  Widget _buildStatusBadge(BuildContext context, ColorScheme colorScheme) {
    final isReimbursed = invoice.status == InvoiceStatus.reimbursed;
    final statusColor = isReimbursed 
        ? CupertinoColors.systemGreen 
        : CupertinoColors.systemOrange;
    
    return GestureDetector(
      onTap: onStatusChanged != null ? () => _showStatusActionSheet(context) : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: statusColor.withOpacity(0.15),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: statusColor.withOpacity(0.3),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isReimbursed 
                  ? CupertinoIcons.checkmark_circle_fill
                  : CupertinoIcons.time_solid,
              size: 16,
              color: statusColor,
            ),
            const SizedBox(width: 6),
            Text(
              isReimbursed ? '已报销' : '未报销',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: statusColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建删除按钮（优化触摸目标）
  Widget _buildDeleteButton(ColorScheme colorScheme) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: CupertinoColors.systemRed.withOpacity(0.1),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: CupertinoColors.systemRed.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: IconButton(
        onPressed: onDelete,
        icon: const Icon(CupertinoIcons.delete),
        iconSize: 18,
        color: CupertinoColors.systemRed,
        tooltip: '删除发票',
      ),
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
          invoice.sellerName ?? invoice.invoiceNumber ?? '未知发票',
          style: const TextStyle(fontSize: 14, color: CupertinoColors.systemGrey),
        ),
        actions: [
          if (!isCurrentlyReimbursed)
            CupertinoActionSheetAction(
              onPressed: () {
                Navigator.pop(context);
                onStatusChanged?.call(InvoiceStatus.reimbursed);
                _showStatusChangeSuccess(context, '已报销');
              },
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    CupertinoIcons.checkmark_circle_fill,
                    color: CupertinoColors.systemGreen,
                    size: 24,
                  ),
                  SizedBox(width: 12),
                  Text(
                    '标记为已报销',
                    style: TextStyle(
                      color: CupertinoColors.systemGreen,
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
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    CupertinoIcons.time,
                    color: CupertinoColors.systemOrange,
                    size: 24,
                  ),
                  SizedBox(width: 12),
                  Text(
                    '标记为未报销',
                    style: TextStyle(
                      color: CupertinoColors.systemOrange,
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
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: CupertinoColors.systemBlue,
            ),
          ),
        ),
      ),
    );
  }

  /// 显示状态变更成功提示
  void _showStatusChangeSuccess(BuildContext context, String newStatusText) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(
              CupertinoIcons.checkmark_circle_fill,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text('状态已更新为「$newStatusText」'),
          ],
        ),
        backgroundColor: CupertinoColors.systemGreen,
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}