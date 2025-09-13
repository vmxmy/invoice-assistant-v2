import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../core/events/app_event_bus.dart';

/// 发票状态操作工具类 - 统一处理发票状态操作确认逻辑
/// 职责：UI确认逻辑 + 事件触发，不直接调用BLoC
class InvoiceStatusOperationUtils {
  InvoiceStatusOperationUtils._();
  
  static final AppEventBus _eventBus = AppEventBus.instance;

  /// 显示发票状态修改操作表（iOS风格）
  static Future<void> showStatusActionSheet({
    required BuildContext context,
    required InvoiceEntity invoice,
  }) async {
    final isCurrentlyReimbursed = invoice.status == InvoiceStatus.reimbursed;

    await showCupertinoModalPopup(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text(
          '修改发票状态',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
        message: Text(
          invoice.sellerName ?? invoice.invoiceNumber,
          style: TextStyle(
              fontSize: 14,
              color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
        actions: [
          if (!isCurrentlyReimbursed)
            CupertinoActionSheetAction(
              onPressed: () {
                Navigator.pop(context);
                _updateInvoiceStatus(invoice.id, InvoiceStatus.reimbursed);
                _showStatusChangeSuccess(context, '已报销');
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    CupertinoIcons.checkmark_circle_fill,
                    color: Theme.of(context).colorScheme.primary,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '标记为已报销',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
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
                _updateInvoiceStatus(invoice.id, InvoiceStatus.unsubmitted);
                _showStatusChangeSuccess(context, '未报销');
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    CupertinoIcons.time_solid,
                    color: Theme.of(context).colorScheme.tertiary,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '标记为未报销',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.tertiary,
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

  /// 通过事件总线更新发票状态
  static void _updateInvoiceStatus(String invoiceId, InvoiceStatus newStatus) {
    _eventBus.emit(
      UpdateInvoiceStatusRequestEvent(
        invoiceId: invoiceId,
        newStatus: newStatus,
        timestamp: DateTime.now(),
      ),
    );
  }

  /// 显示状态修改成功提示
  static void _showStatusChangeSuccess(BuildContext context, String statusText) {
    if (!context.mounted) return;
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(child: Text('已标记为$statusText')),
          ],
        ),
        backgroundColor: Theme.of(context).colorScheme.secondary,
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}