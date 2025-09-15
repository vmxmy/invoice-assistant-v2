import 'package:flutter/cupertino.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/invoice_entity.dart';
import '../bloc/invoice_bloc.dart';
import '../bloc/invoice_event.dart';
import '../widgets/unified_bottom_sheet.dart';

/// 发票删除工具类 - 统一处理所有发票删除确认逻辑
class InvoiceDeleteUtils {
  InvoiceDeleteUtils._();

  /// 显示单个发票删除确认对话框
  static Future<void> showDeleteConfirmation({
    required BuildContext context,
    required InvoiceEntity invoice,
    String? customMessage,
    VoidCallback? onDeleted,
  }) async {
    final invoiceName = invoice.sellerName?.isNotEmpty == true 
        ? invoice.sellerName! 
        : invoice.invoiceNumber.isNotEmpty 
            ? invoice.invoiceNumber 
            : '未知发票';

    final result = await UnifiedBottomSheet.showConfirmDialog(
      context: context,
      title: '删除发票',
      content: customMessage ?? '确定要删除 $invoiceName 吗？此操作无法撤销。',
      confirmText: '删除',
      confirmColor: CupertinoColors.destructiveRed,
      icon: CupertinoIcons.delete,
    );

    if (result == true && context.mounted) {
      context.read<InvoiceBloc>().add(DeleteInvoice(invoice.id));
      onDeleted?.call();
    }
  }

  /// 显示批量删除确认对话框
  static Future<void> showBatchDeleteConfirmation({
    required BuildContext context,
    required List<String> invoiceIds,
    String? customMessage,
    VoidCallback? onDeleted,
  }) async {
    if (invoiceIds.isEmpty) return;

    final count = invoiceIds.length;

    final result = await UnifiedBottomSheet.showConfirmDialog(
      context: context,
      title: '批量删除',
      content: customMessage ?? '确定要删除选中的 $count 张发票吗？此操作无法撤销。',
      confirmText: '删除全部',
      confirmColor: CupertinoColors.destructiveRed,
      icon: CupertinoIcons.delete,
    );

    if (result == true && context.mounted) {
      // 使用批量删除事件，提高效率
      context.read<InvoiceBloc>().add(DeleteInvoices(invoiceIds));
      onDeleted?.call();
    }
  }

  /// 显示报销集内发票删除确认对话框
  static Future<void> showDeleteFromSetConfirmation({
    required BuildContext context,
    required String invoiceId,
    String? setName,
    VoidCallback? onDeleted,
  }) async {
    final result = await UnifiedBottomSheet.showConfirmDialog(
      context: context,
      title: '删除发票',
      content: '确定要删除此发票吗？\n\n'
          '• 发票将被永久删除\n'
          '• 此操作无法撤销\n'
          '• 相关文件也将被清理\n'
          '• 会自动从${setName ?? '报销集'}中移除',
      confirmText: '确认删除',
      confirmColor: CupertinoColors.destructiveRed,
      icon: CupertinoIcons.delete,
    );

    if (result == true && context.mounted) {
      context.read<InvoiceBloc>().add(DeleteInvoice(invoiceId));
      onDeleted?.call();
    }
  }
}