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
          style: const TextStyle(
              fontSize: 14,
              color: CupertinoColors.secondaryLabel),
        ),
        actions: [
          if (!isCurrentlyReimbursed)
            CupertinoActionSheetAction(
              onPressed: () {
                Navigator.pop(context);
                _updateInvoiceStatus(invoice.id, InvoiceStatus.reimbursed);
                // 移除立即显示成功消息 - 由页面级监听器统一处理
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    CupertinoIcons.checkmark_circle_fill,
                    color: CupertinoColors.activeGreen,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    '标记为已报销',
                    style: TextStyle(
                      color: CupertinoColors.activeGreen,
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
                // 移除立即显示成功消息 - 由页面级监听器统一处理
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    CupertinoIcons.time_solid,
                    color: CupertinoColors.systemOrange,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    '标记为待报销',
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

  // 移除_showStatusChangeSuccess方法
  // 状态修改成功消息已统一到InvoiceManagementPage的监听器中处理
  // 避免重复显示成功消息
}