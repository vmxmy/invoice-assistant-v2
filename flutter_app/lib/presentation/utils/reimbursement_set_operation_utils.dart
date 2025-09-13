import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../../domain/entities/invoice_entity.dart';
// ReimbursementSetStatus 已在 reimbursement_set_entity.dart 中定义
import '../../core/events/app_event_bus.dart';
import '../widgets/unified_bottom_sheet.dart';

/// 报销集操作工具类 - 统一处理所有报销集操作确认逻辑
/// 职责：UI确认逻辑 + 事件触发，不直接调用BLoC
class ReimbursementSetOperationUtils {
  ReimbursementSetOperationUtils._();
  
  static final AppEventBus _eventBus = AppEventBus.instance;

  /// 生成智能报销集名称
  /// 规则：当前日期+发票数量+发票总金额
  static String generateSmartName(List<InvoiceEntity> invoices) {
    final now = DateTime.now();
    final dateStr = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    
    final invoiceCount = invoices.length;
    final totalAmount = invoices.fold<double>(0.0, (sum, invoice) => sum + invoice.displayAmount);
    
    // 格式化总金额，保留2位小数
    final formattedAmount = totalAmount.toStringAsFixed(2);
    
    return '$dateStr · ${invoiceCount}张发票 · ¥$formattedAmount';
  }

  /// 显示创建报销集对话框
  static Future<void> showCreateDialog({
    required BuildContext context,
    required List<String> invoiceIds,
    List<InvoiceEntity>? invoices,
    String? defaultName,
    String? defaultDescription,
  }) async {
    final colorScheme = Theme.of(context).colorScheme;
    
    // 生成智能默认名称
    String smartDefaultName = defaultName ?? '';
    if (smartDefaultName.isEmpty && invoices != null && invoices.isNotEmpty) {
      smartDefaultName = generateSmartName(invoices);
    }
    
    final nameController = TextEditingController(text: smartDefaultName);
    final descriptionController = TextEditingController(text: defaultDescription);

    // 构建创建表单内容
    final createForm = StatefulBuilder(
      builder: (context, setState) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 标题区域
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: colorScheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Icon(
                  CupertinoIcons.folder_badge_plus,
                  color: colorScheme.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '创建报销集',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: colorScheme.onSurface,
                        ),
                  ),
                  Text(
                    '将 ${invoiceIds.length} 张发票组织到报销集中',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),
          
          // 表单字段
          CupertinoTextField(
            controller: nameController,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: colorScheme.onSurface,
                ),
            placeholder: '报销集名称',
            maxLength: 100,
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
            padding: const EdgeInsets.all(16),
          ),
          const SizedBox(height: 16),
          
          CupertinoTextField(
            controller: descriptionController,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: colorScheme.onSurface,
                ),
            placeholder: '描述（可选）',
            maxLines: 3,
            maxLength: 500,
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
            padding: const EdgeInsets.all(16),
          ),
          const SizedBox(height: 24),
          
          // 按钮组
          Row(
            children: [
              // 取消按钮
              Expanded(
                child: CupertinoButton(
                  onPressed: () => Navigator.of(context).pop(),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  color: colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                  child: Text(
                    '取消',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              
              // 创建按钮
              Expanded(
                child: CupertinoButton(
                  onPressed: () {
                    final name = nameController.text.trim();
                    if (name.isNotEmpty) {
                      Navigator.pop(context);
                      // 通过事件总线触发创建操作
                      _eventBus.emit(
                        CreateReimbursementSetRequestEvent(
                          setName: name,
                          description: descriptionController.text.trim().isEmpty
                              ? null
                              : descriptionController.text.trim(),
                          invoiceIds: invoiceIds,
                          timestamp: DateTime.now(),
                        ),
                      );
                    }
                  },
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  color: colorScheme.primary,
                  borderRadius: BorderRadius.circular(12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        CupertinoIcons.add,
                        size: 18,
                        color: colorScheme.onPrimary,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '创建',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: colorScheme.onPrimary,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );

    // 使用 UnifiedBottomSheet
    await UnifiedBottomSheet.showCustomSheet(
      context: context,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: createForm,
      ),
      showCloseButton: false,
    );
  }

  /// 显示状态更新确认对话框
  static Future<void> showStatusUpdateConfirmation({
    required BuildContext context,
    required String setId,
    required ReimbursementSetStatus currentStatus,
    required ReimbursementSetStatus nextStatus,
    String? setName,
    int? invoiceCount,
  }) async {
    final colorScheme = Theme.of(context).colorScheme;
    
    // 根据状态变更生成确认内容
    final (title, content, confirmText, icon) = _getStatusUpdateContent(
      currentStatus, 
      nextStatus, 
      setName ?? '报销集',
      invoiceCount ?? 0,
    );

    final result = await UnifiedBottomSheet.showConfirmDialog(
      context: context,
      title: title,
      content: content,
      confirmText: confirmText,
      confirmColor: _getStatusColor(colorScheme, nextStatus),
      icon: icon,
    );

    if (result == true && context.mounted) {
      // 通过事件总线触发状态更新
      _eventBus.emit(
        UpdateReimbursementSetStatusRequestEvent(
          setId: setId,
          newStatus: nextStatus,
          timestamp: DateTime.now(),
        ),
      );
    }
  }

  /// 显示删除确认对话框
  static Future<void> showDeleteConfirmation({
    required BuildContext context,
    required String setId,
    String? setName,
    int? invoiceCount,
  }) async {
    final colorScheme = Theme.of(context).colorScheme;

    final result = await UnifiedBottomSheet.showConfirmDialog(
      context: context,
      title: '删除报销集',
      content: '确定要删除报销集"${setName ?? '未知报销集'}"吗？\n\n'
          '• 包含的${invoiceCount ?? 0}张发票将重新变为未分配状态\n'
          '• 此操作无法撤销\n'
          '• 所有相关的历史记录将被清除',
      confirmText: '确认删除',
      confirmColor: colorScheme.error,
      icon: CupertinoIcons.delete,
    );

    if (result == true && context.mounted) {
      // 通过事件总线触发删除操作
      _eventBus.emit(
        DeleteReimbursementSetRequestEvent(
          setId: setId,
          timestamp: DateTime.now(),
        ),
      );
    }
  }

  /// 显示编辑对话框
  static Future<void> showEditDialog({
    required BuildContext context,
    required String setId,
    String? currentName,
    String? currentDescription,
  }) async {
    final colorScheme = Theme.of(context).colorScheme;
    final nameController = TextEditingController(text: currentName);
    final descriptionController = TextEditingController(text: currentDescription);

    // 构建编辑表单内容
    final editForm = StatefulBuilder(
      builder: (context, setState) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 标题区域
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: colorScheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Icon(
                  CupertinoIcons.pencil,
                  color: colorScheme.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Text(
                '编辑报销集',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onSurface,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          
          // 表单字段
          CupertinoTextField(
            controller: nameController,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: colorScheme.onSurface,
                ),
            placeholder: '报销集名称',
            maxLength: 100,
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
            padding: const EdgeInsets.all(16),
          ),
          const SizedBox(height: 16),
          
          CupertinoTextField(
            controller: descriptionController,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: colorScheme.onSurface,
                ),
            placeholder: '描述（可选）',
            maxLines: 3,
            maxLength: 500,
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
            padding: const EdgeInsets.all(16),
          ),
          const SizedBox(height: 24),
          
          // 按钮组
          Row(
            children: [
              // 取消按钮
              Expanded(
                child: CupertinoButton(
                  onPressed: () => Navigator.of(context).pop(),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  color: colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                  child: Text(
                    '取消',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              
              // 保存按钮
              Expanded(
                child: CupertinoButton(
                  onPressed: () {
                    final name = nameController.text.trim();
                    if (name.isNotEmpty) {
                      Navigator.pop(context);
                      // 通过事件总线触发更新操作
                      _eventBus.emit(
                        UpdateReimbursementSetRequestEvent(
                          setId: setId,
                          setName: name,
                          description: descriptionController.text.trim().isEmpty
                              ? null
                              : descriptionController.text.trim(),
                          timestamp: DateTime.now(),
                        ),
                      );
                    }
                  },
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  color: colorScheme.primary,
                  borderRadius: BorderRadius.circular(12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        CupertinoIcons.checkmark,
                        size: 18,
                        color: colorScheme.onPrimary,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '保存',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: colorScheme.onPrimary,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );

    // 使用 UnifiedBottomSheet
    await UnifiedBottomSheet.showCustomSheet(
      context: context,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: editForm,
      ),
      showCloseButton: false,
    );
  }

  /// 获取状态更新的确认内容
  static (String, String, String, IconData) _getStatusUpdateContent(
    ReimbursementSetStatus currentStatus,
    ReimbursementSetStatus nextStatus,
    String setName,
    int invoiceCount,
  ) {
    switch (nextStatus) {
      case ReimbursementSetStatus.submitted:
        return (
          '提交报销集',
          '确定要提交报销集"$setName"吗？\n\n'
              '• 包含 $invoiceCount 张发票\n'
              '• 提交后发票状态将变为已提交\n'
              '• 提交后仍可以修改状态',
          '确认提交',
          CupertinoIcons.paperplane,
        );
      
      case ReimbursementSetStatus.reimbursed:
        return (
          '标记为已报销',
          '确定要将报销集"$setName"标记为已报销吗？\n\n'
              '• 包含 $invoiceCount 张发票\n'
              '• 所有发票状态将变为已报销\n'
              '• 可以撤回到已提交状态',
          '确认报销',
          CupertinoIcons.checkmark_circle,
        );
      
      case ReimbursementSetStatus.unsubmitted:
        return (
          '撤回报销集',
          '确定要将报销集"$setName"撤回到草稿状态吗？\n\n'
              '• 包含 $invoiceCount 张发票\n'
              '• 所有发票状态将变为未提交\n'
              '• 可以继续编辑和修改',
          '确认撤回',
          CupertinoIcons.arrow_counterclockwise,
        );
    }
  }

  /// 获取状态对应的颜色
  static Color _getStatusColor(ColorScheme colorScheme, ReimbursementSetStatus status) {
    switch (status) {
      case ReimbursementSetStatus.unsubmitted:
        return colorScheme.secondary;
      case ReimbursementSetStatus.submitted:
        return colorScheme.tertiary;
      case ReimbursementSetStatus.reimbursed:
        return colorScheme.primary;
    }
  }
}