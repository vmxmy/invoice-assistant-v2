import 'dart:math';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../../domain/entities/invoice_entity.dart';
// ReimbursementSetStatus 已在 reimbursement_set_entity.dart 中定义
import '../../core/events/app_event_bus.dart';
import '../widgets/unified_bottom_sheet.dart';

/// 报销集操作工具类 - 统一处理所有报销集操作确认逻辑
/// 职责：UI确认逻辑 + 事件触发，不直接调用BLoC
/// 
/// ## 智能命名功能增强
/// 
/// ### 命名规则
/// 格式：`{YYYY-MM-DD}~{YYYY-MM-DD}_{invoicesCount}张发票_¥{totalAmount}`
/// 
/// ### 示例
/// - 单日发票：`2024-11-15_3张发票_¥1234.56`
/// - 跨日发票：`2024-10-01~2024-12-30_5张发票_¥2567.89`
/// - 跨年发票：`2024-12-25~2025-02-10_8张发票_¥4321.00`
/// 
/// ### 功能特性
/// 1. **智能日期范围检测**：自动分析发票的消费日期范围
/// 2. **优雅的单日显示**：同一天发票显示为单日格式
/// 3. **跨期显示**：跨日、跨月或跨年发票显示完整日期范围
/// 4. **精确金额计算**：自动汇总所有发票金额，保留2位小数
/// 5. **fallback机制**：消费日期缺失时使用发票日期
/// 6. **详细统计**：提供月度分组统计和各种统计信息
class ReimbursementSetOperationUtils {
  ReimbursementSetOperationUtils._();
  
  static final AppEventBus _eventBus = AppEventBus.instance;

  /// 生成智能报销集名称
  /// 增强版规则：消费日期范围 + 发票数量 + 发票总金额
  /// 格式：{YYYY-MM-DD}~{YYYY-MM-DD}_{invoicesCount}张发票_¥{totalAmount}
  static String generateSmartName(List<InvoiceEntity> invoices) {
    if (invoices.isEmpty) {
      final now = DateTime.now();
      final currentDate = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
      return '${currentDate}_0张发票_¥0.00';
    }
    
    // 1. 获取消费日期范围
    final dateRange = _getConsumptionDateRange(invoices);
    
    // 2. 获取发票数量
    final invoiceCount = invoices.length;
    
    // 3. 获取总金额
    final totalAmount = invoices.fold<double>(0.0, (sum, invoice) => sum + invoice.displayAmount);
    final formattedAmount = totalAmount.toStringAsFixed(2);
    
    // 4. 生成智能命名
    return '${dateRange}_$invoiceCount张发票_¥$formattedAmount';
  }

  /// 获取发票的消费日期范围
  /// 返回格式：{YYYY-MM-DD}~{YYYY-MM-DD} 或 {YYYY-MM-DD}（单日）
  static String _getConsumptionDateRange(List<InvoiceEntity> invoices) {
    if (invoices.isEmpty) {
      final now = DateTime.now();
      final currentDate = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
      return currentDate;
    }
    
    // 收集所有有效的消费日期
    final consumptionDates = <DateTime>[];
    
    for (final invoice in invoices) {
      // 优先使用消费日期，如果没有则使用发票日期
      final date = invoice.consumptionDate ?? invoice.invoiceDate;
      consumptionDates.add(date);
    }
    
    if (consumptionDates.isEmpty) {
      final now = DateTime.now();
      final currentDate = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
      return currentDate;
    }
    
    // 排序日期
    consumptionDates.sort();
    
    // 获取最早和最晚的日期
    final earliestDate = consumptionDates.first;
    final latestDate = consumptionDates.last;
    
    final startDate = '${earliestDate.year}-${earliestDate.month.toString().padLeft(2, '0')}-${earliestDate.day.toString().padLeft(2, '0')}';
    final endDate = '${latestDate.year}-${latestDate.month.toString().padLeft(2, '0')}-${latestDate.day.toString().padLeft(2, '0')}';
    
    // 如果是同一天，返回单日格式
    if (startDate == endDate) {
      return startDate;
    }
    
    // 返回范围格式
    return '$startDate~$endDate';
  }

  /// 获取发票统计信息
  /// 返回包含数量、总金额、日期范围的详细信息
  static Map<String, dynamic> getInvoiceStatistics(List<InvoiceEntity> invoices) {
    final dateRange = _getConsumptionDateRange(invoices);
    final invoiceCount = invoices.length;
    final totalAmount = invoices.fold<double>(0.0, (sum, invoice) => sum + invoice.displayAmount);
    
    // 按月份分组统计
    final monthlyStats = <String, Map<String, dynamic>>{};
    for (final invoice in invoices) {
      final date = invoice.consumptionDate ?? invoice.invoiceDate;
      final monthKey = '${date.year}-${date.month.toString().padLeft(2, '0')}';
      
      if (!monthlyStats.containsKey(monthKey)) {
        monthlyStats[monthKey] = {
          'count': 0,
          'amount': 0.0,
          'invoices': <InvoiceEntity>[],
        };
      }
      
      monthlyStats[monthKey]!['count'] = monthlyStats[monthKey]!['count'] + 1;
      monthlyStats[monthKey]!['amount'] = monthlyStats[monthKey]!['amount'] + invoice.displayAmount;
      (monthlyStats[monthKey]!['invoices'] as List<InvoiceEntity>).add(invoice);
    }
    
    return {
      'dateRange': dateRange,
      'totalCount': invoiceCount,
      'totalAmount': totalAmount,
      'formattedAmount': totalAmount.toStringAsFixed(2),
      'monthlyStats': monthlyStats,
      'smartName': generateSmartName(invoices),
    };
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
          '确定要将报销集"$setName"撤回到待报销状态吗？\n\n'
              '• 包含 $invoiceCount 张发票\n'
              '• 所有发票状态将变为未提交\n'
              '• 可以继续编辑和修改',
          '确认撤回',
          CupertinoIcons.arrow_counterclockwise,
        );
    }
  }

  /// 显示状态选择底部弹出框
  static Future<void> showStatusSelectionBottomSheet({
    required BuildContext context,
    required String setId,
    required ReimbursementSetStatus currentStatus,
    required String setName,
    required int invoiceCount,
  }) async {
    await UnifiedBottomSheet.showCustomSheet(
      context: context,
      title: '选择状态',
      child: _buildStatusSelectionContent(
        context: context,
        setId: setId,
        currentStatus: currentStatus,
        setName: setName,
        invoiceCount: invoiceCount,
      ),
    );
  }

  /// 构建状态选择内容
  static Widget _buildStatusSelectionContent({
    required BuildContext context,
    required String setId,
    required ReimbursementSetStatus currentStatus,
    required String setName,
    required int invoiceCount,
  }) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;
    
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // 当前报销集信息卡片
        Container(
          padding: const EdgeInsets.all(16),
          margin: const EdgeInsets.only(bottom: 20),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainer,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.08),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              // 文件夹图标
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  CupertinoIcons.folder_fill,
                  color: colorScheme.onPrimaryContainer,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              
              // 报销集信息
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      setName,
                      style: textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurface,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$invoiceCount 张发票',
                      style: textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        
        // 状态选项列表
        ...ReimbursementSetStatus.values.map((status) => 
          _buildStatusOption(
            context: context,
            setId: setId,
            status: status,
            isCurrentStatus: status == currentStatus,
            setName: setName,
            invoiceCount: invoiceCount,
          ),
        ),
        
        const SizedBox(height: 12),
      ],
    );
  }

  /// 构建单个状态选项
  static Widget _buildStatusOption({
    required BuildContext context,
    required String setId,
    required ReimbursementSetStatus status,
    required bool isCurrentStatus,
    required String setName,
    required int invoiceCount,
  }) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;
    
    final statusColor = _getStatusColor(colorScheme, status);
    final statusIcon = _getStatusIcon(status);
    final statusText = _getStatusDisplayText(status);
    final statusDescription = _getStatusDescription(status);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Semantics(
        button: true,
        enabled: !isCurrentStatus,
        hint: isCurrentStatus 
          ? '当前状态：$statusText' 
          : '点击切换到$statusText状态',
        child: CupertinoButton(
          onPressed: isCurrentStatus ? null : () {
            // 添加触觉反馈
            HapticFeedback.selectionClick();
            Navigator.of(context).pop();
            _updateReimbursementSetStatus(
              context: context,
              setId: setId,
              newStatus: status,
            );
          },
          padding: EdgeInsets.zero,
          child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            // 使用Cupertino主题系统规范的表面色彩层级
            color: isCurrentStatus 
              ? statusColor.withValues(alpha: 0.06)
              : colorScheme.surfaceContainerLow,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isCurrentStatus 
                ? statusColor.withValues(alpha: 0.2)
                : colorScheme.outline.withValues(alpha: 0.12),
              width: isCurrentStatus ? 1.5 : 1,
            ),
            // 添加微妙阴影增强层次感
            boxShadow: isCurrentStatus ? [
              BoxShadow(
                color: statusColor.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ] : null,
          ),
          child: Row(
            children: [
              // 状态图标容器 - 使用主题颜色系统
              AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isCurrentStatus
                    ? statusColor.withValues(alpha: 0.15)
                    : statusColor.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  statusIcon,
                  color: statusColor,
                  size: 24,
                  semanticLabel: '$statusText状态图标',
                ),
              ),
              const SizedBox(width: 16),
              
              // 状态文本信息 - 严格使用textTheme
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          statusText,
                          style: textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: isCurrentStatus 
                              ? statusColor 
                              : colorScheme.onSurface,
                            letterSpacing: -0.2,
                          ),
                        ),
                        if (isCurrentStatus) ...[
                          const SizedBox(width: 10),
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10, 
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: statusColor,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '当前',
                              style: textTheme.labelSmall?.copyWith(
                                // 使用对比色确保可读性
                                color: _getContrastColor(statusColor, colorScheme),
                                fontWeight: FontWeight.w700,
                                fontSize: _getResponsiveFontSize(context, 10),
                                letterSpacing: 0.2,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      statusDescription,
                      style: textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                        fontSize: _getResponsiveFontSize(context, 13),
                        height: 1.3,
                        letterSpacing: -0.1,
                      ),
                    ),
                  ],
                ),
              ),
              
              // 右侧指示器 - 符合无障碍要求
              if (!isCurrentStatus)
                Container(
                  padding: const EdgeInsets.all(6),
                  child: Icon(
                    CupertinoIcons.chevron_right,
                    color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                    size: 16,
                    semanticLabel: '选择$statusText状态',
                  ),
                ),
            ],
          ),
        ),
        ),
      ),
    );
  }

  /// 获取符合WCAG AA标准的对比色，确保文本可读性
  static Color _getContrastColor(Color backgroundColor, ColorScheme colorScheme) {
    // 计算与白色和黑色的对比度
    final whiteContrast = _calculateContrastRatio(backgroundColor, Colors.white);
    final blackContrast = _calculateContrastRatio(backgroundColor, Colors.black);
    final onSurfaceContrast = _calculateContrastRatio(backgroundColor, colorScheme.onSurface);
    final surfaceContrast = _calculateContrastRatio(backgroundColor, colorScheme.surface);
    
    // WCAG AA 标准要求最小对比度为 4.5:1 (普通文本) 或 3:1 (大文本)
    // 这里使用 4.5:1 标准确保更好的可读性
    const minContrastRatio = 4.5;
    
    // 按优先级选择最佳对比色
    if (onSurfaceContrast >= minContrastRatio) {
      return colorScheme.onSurface;
    } else if (surfaceContrast >= minContrastRatio) {
      return colorScheme.surface;
    } else if (whiteContrast >= minContrastRatio) {
      return Colors.white;
    } else if (blackContrast >= minContrastRatio) {
      return Colors.black;
    } else {
      // 如果都不满足，选择对比度最高的
      if (whiteContrast > blackContrast) {
        return Colors.white;
      } else {
        return Colors.black;
      }
    }
  }
  
  /// 计算两种颜色之间的对比度（WCAG 标准）
  static double _calculateContrastRatio(Color color1, Color color2) {
    final lum1 = _getRelativeLuminance(color1);
    final lum2 = _getRelativeLuminance(color2);
    final lighter = lum1 > lum2 ? lum1 : lum2;
    final darker = lum1 > lum2 ? lum2 : lum1;
    return (lighter + 0.05) / (darker + 0.05);
  }
  
  /// 计算颜色的相对亮度（WCAG 标准）
  static double _getRelativeLuminance(Color color) {
    final r = _getLinearRGB((color.r * 255.0).round() / 255.0);
    final g = _getLinearRGB((color.g * 255.0).round() / 255.0);
    final b = _getLinearRGB((color.b * 255.0).round() / 255.0);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  
  /// 转换为线性RGB值（WCAG 标准）
  static double _getLinearRGB(double value) {
    if (value <= 0.03928) {
      return value / 12.92;
    } else {
      return pow((value + 0.055) / 1.055, 2.4).toDouble();
    }
  }
  
  
  /// 获取响应式字体大小，支持系统字体缩放设置
  static double _getResponsiveFontSize(BuildContext context, double baseFontSize) {
    final textScaleFactor = _getTextScaleFactor(context);
    return baseFontSize * textScaleFactor;
  }
  
  /// 获取文本缩放因子，限制在合理范围内以保持界面可用性
  static double _getTextScaleFactor(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final scaleFactor = mediaQuery.textScaler.scale(1.0);
    
    // 将缩放因子限制在 0.8 到 1.5 之间，确保界面仍然可用
    // 这符合 Flutter 和 iOS/Android 的最佳实践
    return scaleFactor.clamp(0.8, 1.5);
  }

  /// 更新报销集状态（不需要确认）
  static void _updateReimbursementSetStatus({
    required BuildContext context,
    required String setId,
    required ReimbursementSetStatus newStatus,
  }) {
    // 通过事件总线触发状态更新
    _eventBus.emit(
      UpdateReimbursementSetStatusRequestEvent(
        setId: setId,
        newStatus: newStatus,
        timestamp: DateTime.now(),
      ),
    );
  }

  /// 获取状态显示文本
  static String _getStatusDisplayText(ReimbursementSetStatus status) {
    switch (status) {
      case ReimbursementSetStatus.unsubmitted:
        return '待报销';
      case ReimbursementSetStatus.submitted:
        return '已提交';
      case ReimbursementSetStatus.reimbursed:
        return '已报销';
    }
  }

  /// 获取状态描述
  static String _getStatusDescription(ReimbursementSetStatus status) {
    switch (status) {
      case ReimbursementSetStatus.unsubmitted:
        return '可以编辑和修改，未提交审核';
      case ReimbursementSetStatus.submitted:
        return '已提交审核，等待处理';
      case ReimbursementSetStatus.reimbursed:
        return '已完成报销，发票已处理';
    }
  }


  /// 获取状态图标
  static IconData _getStatusIcon(ReimbursementSetStatus status) {
    switch (status) {
      case ReimbursementSetStatus.unsubmitted:
        return CupertinoIcons.doc_text;
      case ReimbursementSetStatus.submitted:
        return CupertinoIcons.paperplane;
      case ReimbursementSetStatus.reimbursed:
        return CupertinoIcons.checkmark_circle_fill;
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