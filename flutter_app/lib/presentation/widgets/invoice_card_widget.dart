import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';

/// 发票紧急程度枚举
enum UrgencyLevel {
  normal,   // 普通（≤60天）
  urgent,   // 紧急（60-90天）
  overdue,  // 逾期（>90天）
}

/// 发票卡片组件 - 展示单个发票的信息
class InvoiceCardWidget extends StatelessWidget {
  final InvoiceEntity invoice;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;
  final ValueChanged<InvoiceStatus>? onStatusChanged;
  final bool showConsumptionDateOnly;
  final bool isSelectionMode;
  final bool isSelected;
  final VoidCallback? onLongPress;
  final VoidCallback? onSelectionToggle;

  const InvoiceCardWidget({
    super.key,
    required this.invoice,
    this.onTap,
    this.onDelete,
    this.onStatusChanged,
    this.showConsumptionDateOnly = false,
    this.isSelectionMode = false,
    this.isSelected = false,
    this.onLongPress,
    this.onSelectionToggle,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Slidable(
      key: Key('invoice_${invoice.id}'),
      enabled: !isSelectionMode, // 多选模式下禁用滑动
      endActionPane: ActionPane(
        motion: const StretchMotion(),
        extentRatio: 0.25, // 固定宽度比例
        children: [
          // 自定义删除按钮容器，与Card严格对齐
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 12), // 匹配Card的底部margin
              child: Material(
                color: Colors.red,
                elevation: isSelected ? 8 : 2, // 匹配Card的elevation
                borderRadius: const BorderRadius.only(
                  topRight: Radius.circular(12),
                  bottomRight: Radius.circular(12),
                ),
                child: InkWell(
                  onTap: () {
                    // 显示确认对话框
                    showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('删除发票'),
                        content: Text('确定要删除 ${invoice.sellerName ?? invoice.invoiceNumber} 吗？此操作无法撤销。'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.of(context).pop(false),
                            child: const Text('取消'),
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.of(context).pop(true);
                              onDelete?.call();
                            },
                            style: TextButton.styleFrom(foregroundColor: Colors.red),
                            child: const Text('删除'),
                          ),
                        ],
                      ),
                    );
                  },
                  borderRadius: const BorderRadius.only(
                    topRight: Radius.circular(12),
                    bottomRight: Radius.circular(12),
                  ),
                  child: Container(
                    padding: const EdgeInsets.all(16), // 匹配Card的内边距
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.delete,
                          color: Colors.white,
                          size: 24,
                        ),
                        SizedBox(height: 4),
                        Text(
                          '删除',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      child: Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: isSelected ? 8 : 2,
      color: isSelected ? colorScheme.primaryContainer.withValues(alpha: 0.3) : null,
      child: InkWell(
        onTap: isSelectionMode ? onSelectionToggle : onTap,
        onLongPress: onLongPress,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 头部信息行
              Row(
                children: [
                  // 选择框（多选模式下显示）
                  if (isSelectionMode) ...[
                    Checkbox(
                      value: isSelected,
                      onChanged: (_) => onSelectionToggle?.call(),
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 卖方名称和状态徽章在同一行水平对齐
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                invoice.sellerName ?? invoice.invoiceNumber ?? '未知发票',
                                style: textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            // 状态徽章与销售方文字水平对齐
                            _buildStatusBadge(context, colorScheme),
                          ],
                        ),
                        const SizedBox(height: 4),
                        // 买方名称和分类在同一行
                        if (invoice.buyerName?.isNotEmpty == true || invoice.category?.isNotEmpty == true)
                          Row(
                            children: [
                              // 买方名称
                              if (invoice.buyerName?.isNotEmpty == true) ...[
                                Expanded(
                                  child: Text(
                                    invoice.buyerName!,
                                    style: textTheme.bodyMedium?.copyWith(
                                      color: colorScheme.onSurfaceVariant,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                              ],
                            ],
                          ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // 分类、日期和金额信息
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // 左侧：日期信息和分类图标
                  Row(
                    children: [
                      // 日期信息
                      _buildDateInfo(context, textTheme),
                      const SizedBox(width: 8),
                      // 分类图标
                      Builder(
                        builder: (context) {
                          // 处理字符串 "null" 的情况
                          String? expenseCategory = invoice.expenseCategory;
                          if (expenseCategory == 'null') expenseCategory = null;
                          
                          final categoryText = expenseCategory ?? '';
                          
                          if (categoryText.isNotEmpty) {
                            // 根据分类获取对应图标
                            String getCategoryIcon(String category) {
                              switch (category.toLowerCase()) {
                                case '餐饮服务':
                                case '餐饮':
                                  return '🍽️';
                                case '交通':
                                case '出租车':
                                case '网约车':
                                  return '🚕';
                                case '高铁':
                                case '火车票':
                                  return '🚄';
                                case '飞机':
                                case '机票':
                                  return '✈️';
                                case '住宿':
                                case '酒店':
                                  return '🏨';
                                case '办公':
                                case '办公用品':
                                  return '💼';
                                case '加油':
                                case '油费':
                                  return '⛽';
                                case '停车':
                                  return '🅿️';
                                case '医疗':
                                  return '🏥';
                                case '购物':
                                  return '🛍️';
                                default:
                                  return '📄';
                              }
                            }
                            
                            return Text(
                              getCategoryIcon(categoryText),
                              style: const TextStyle(
                                fontSize: 16, // 纯图标可以稍大一些
                              ),
                            );
                          } else {
                            return const SizedBox.shrink();
                          }
                        },
                      ),
                    ],
                  ),
                  // 右侧：金额
                  Text(
                    invoice.formattedAmount,
                    style: textTheme.titleMedium?.copyWith(
                      color: colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),

            ],
          ),
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

  /// 根据发票状态和紧急程度获取颜色
  Color _getStatusColor(bool isReimbursed) {
    if (isReimbursed) {
      return CupertinoColors.systemGreen; // 已报销：绿色
    }
    
    // 未报销的发票根据紧急程度分色
    final urgencyLevel = _getUrgencyLevel();
    switch (urgencyLevel) {
      case UrgencyLevel.overdue:
        return CupertinoColors.systemRed; // 逾期：红色
      case UrgencyLevel.urgent:
        return CupertinoColors.systemOrange; // 紧急：橙色
      case UrgencyLevel.normal:
        return CupertinoColors.systemBlue; // 普通：蓝色
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
  
  /// 根据状态和紧急程度获取图标
  IconData _getStatusIcon(bool isReimbursed) {
    if (isReimbursed) {
      return CupertinoIcons.checkmark_circle_fill; // 已报销：勾选图标
    }
    
    final urgencyLevel = _getUrgencyLevel();
    switch (urgencyLevel) {
      case UrgencyLevel.overdue:
        return CupertinoIcons.exclamationmark_triangle_fill; // 逾期：警告图标
      case UrgencyLevel.urgent:
        return CupertinoIcons.clock_fill; // 紧急：时钟图标
      case UrgencyLevel.normal:
        return CupertinoIcons.time_solid; // 普通：时间图标
    }
  }
  
  /// 根据状态和紧急程度获取文本
  String _getStatusText(bool isReimbursed) {
    if (isReimbursed) {
      return '已报销';
    }
    
    final urgencyLevel = _getUrgencyLevel();
    switch (urgencyLevel) {
      case UrgencyLevel.overdue:
        return '逾期';
      case UrgencyLevel.urgent:
        return '紧急';
      case UrgencyLevel.normal:
        return '未报销';
    }
  }

  /// 构建状态徽章（iOS风格）
  Widget _buildStatusBadge(BuildContext context, ColorScheme colorScheme) {
    final isReimbursed = invoice.status == InvoiceStatus.reimbursed;
    
    // 根据紧急程度确定颜色
    final statusColor = _getStatusColor(isReimbursed);
    
    return GestureDetector(
      onTap: onStatusChanged != null ? () => _showStatusActionSheet(context) : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), // 减小内边距
        decoration: BoxDecoration(
          color: statusColor.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12), // 减小圆角
          border: Border.all(
            color: statusColor.withOpacity(0.3),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _getStatusIcon(isReimbursed),
              size: 12, // 减小图标尺寸
              color: statusColor,
            ),
            const SizedBox(width: 4), // 减小间距
            Text(
              _getStatusText(isReimbursed),
              style: TextStyle(
                fontSize: 11, // 减小字体
                fontWeight: FontWeight.w600,
                color: statusColor,
              ),
            ),
          ],
        ),
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