import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:io';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../core/utils/invoice_file_utils.dart';

/// 发票紧急程度枚举
enum UrgencyLevel {
  normal,   // 普通（≤60天）
  urgent,   // 紧急（60-90天）
  overdue,  // 逾期（>90天）
}

/// 发票卡片组件 - 展示单个发票的信息
class InvoiceCardWidget extends StatefulWidget {
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
  State<InvoiceCardWidget> createState() => _InvoiceCardWidgetState();
}

class _InvoiceCardWidgetState extends State<InvoiceCardWidget> {
  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Slidable(
      key: Key('invoice_${widget.invoice.id}'),
      enabled: !widget.isSelectionMode, // 多选模式下禁用滑动
      startActionPane: ActionPane(
        motion: const StretchMotion(),
        extentRatio: 0.25,
        children: [
          // 下载/分享按钮
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              child: Material(
                color: CupertinoColors.systemBlue,
                elevation: widget.isSelected ? 8 : 2,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  bottomLeft: Radius.circular(12),
                ),
                child: InkWell(
                  onTap: () => _handleDownloadAndShare(context),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(12),
                    bottomLeft: Radius.circular(12),
                  ),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          CupertinoIcons.share,
                          color: Colors.white,
                          size: 24,
                        ),
                        SizedBox(height: 4),
                        Text(
                          '分享',
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
                elevation: widget.isSelected ? 8 : 2, // 匹配Card的elevation
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
                        content: Text('确定要删除 ${widget.invoice.sellerName ?? widget.invoice.invoiceNumber} 吗？此操作无法撤销。'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.of(context).pop(false),
                            child: const Text('取消'),
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.of(context).pop(true);
                              widget.onDelete?.call();
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
      elevation: widget.isSelected ? 8 : 2,
      color: widget.isSelected ? colorScheme.primaryContainer.withValues(alpha: 0.3) : null,
      child: InkWell(
        onTap: widget.isSelectionMode ? widget.onSelectionToggle : widget.onTap,
        onLongPress: widget.onLongPress,
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
                  if (widget.isSelectionMode) ...[
                    Checkbox(
                      value: widget.isSelected,
                      onChanged: (_) => widget.onSelectionToggle?.call(),
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
                                widget.invoice.sellerName ?? widget.invoice.invoiceNumber ?? '未知发票',
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
                        if (widget.invoice.buyerName?.isNotEmpty == true || widget.invoice.category?.isNotEmpty == true)
                          Row(
                            children: [
                              // 买方名称
                              if (widget.invoice.buyerName?.isNotEmpty == true) ...[
                                Expanded(
                                  child: Text(
                                    widget.invoice.buyerName!,
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
                          String? expenseCategory = widget.invoice.expenseCategory;
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
                    widget.invoice.formattedAmount,
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
    
    if (widget.showConsumptionDateOnly && widget.invoice.consumptionDate != null) {
      // 显示消费日期
      dateText = widget.invoice.formattedConsumptionDate ?? widget.invoice.formattedDate;
      dateIcon = Icons.shopping_cart_outlined;
    } else if (widget.invoice.consumptionDate != null && !widget.showConsumptionDateOnly) {
      // 显示消费日期（如果存在）
      dateText = widget.invoice.formattedConsumptionDate ?? widget.invoice.formattedDate;
      dateIcon = Icons.shopping_cart_outlined;
    } else {
      // 显示发票日期
      dateText = widget.invoice.formattedDate;
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
    final consumptionDate = widget.invoice.consumptionDate ?? widget.invoice.invoiceDate;
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
    final isReimbursed = widget.invoice.status == InvoiceStatus.reimbursed;
    
    // 根据紧急程度确定颜色
    final statusColor = _getStatusColor(isReimbursed);
    
    return GestureDetector(
      onTap: widget.onStatusChanged != null ? () => _showStatusActionSheet(context) : null,
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
    final isCurrentlyReimbursed = widget.invoice.status == InvoiceStatus.reimbursed;
    
    showCupertinoModalPopup(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text(
          '修改发票状态',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
        message: Text(
          widget.invoice.sellerName ?? widget.invoice.invoiceNumber ?? '未知发票',
          style: const TextStyle(fontSize: 14, color: CupertinoColors.systemGrey),
        ),
        actions: [
          if (!isCurrentlyReimbursed)
            CupertinoActionSheetAction(
              onPressed: () {
                Navigator.pop(context);
                widget.onStatusChanged?.call(InvoiceStatus.reimbursed);
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
                widget.onStatusChanged?.call(InvoiceStatus.unreimbursed);
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

  /// 处理下载和分享功能  
  Future<void> _handleDownloadAndShare(BuildContext context) async {
    // 显示分析菜单而不是直接分享
    _showAnalysisActionSheet(context);
  }

  /// 显示PDF分析菜单
  void _showAnalysisActionSheet(BuildContext context) {
    showCupertinoModalPopup(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text(
          '发票操作',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
        message: Text(
          widget.invoice.sellerName ?? widget.invoice.invoiceNumber ?? '未知发票',
          style: const TextStyle(fontSize: 14, color: CupertinoColors.systemGrey),
        ),
        actions: [
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context);
              _downloadAndViewPdf(context);
            },
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  CupertinoIcons.doc_text_viewfinder,
                  color: CupertinoColors.systemBlue,
                  size: 24,
                ),
                SizedBox(width: 12),
                Text(
                  '查看PDF',
                  style: TextStyle(
                    color: CupertinoColors.systemBlue,
                    fontSize: 18,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context);
              _downloadAndShare(context);
            },
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  CupertinoIcons.share,
                  color: CupertinoColors.systemGreen,
                  size: 24,
                ),
                SizedBox(width: 12),
                Text(
                  '分享发票',
                  style: TextStyle(
                    color: CupertinoColors.systemGreen,
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

  /// 下载并查看PDF
  Future<void> _downloadAndViewPdf(BuildContext context) async {
    // 检查是否有有效的PDF文件
    if (!InvoiceFileUtils.hasValidPdfFile(widget.invoice)) {
      _showErrorMessage(context, '该发票没有PDF文件');
      return;
    }

    if (!context.mounted) return;
    
    _showLoadingDialog(context, '正在生成访问链接...');
    
    try {
      // 获取带认证的PDF签名URL
      final pdfUrl = await InvoiceFileUtils.getPdfDownloadUrl(widget.invoice);
      
      // 立即关闭对话框
      _closeLoadingDialog();

      // 在浏览器中打开PDF URL（不等待结果）
      final Uri url = Uri.parse(pdfUrl);
      if (await canLaunchUrl(url)) {
        // 使用 unawaited 或者不等待 launchUrl 完成
        launchUrl(
          url,
          mode: LaunchMode.externalApplication, // 在外部浏览器中打开
        ).ignore(); // 不等待浏览器打开完成
      } else {
        if (context.mounted) {
          _showErrorMessage(context, '无法打开PDF链接');
        }
      }
    } catch (e) {
      // 确保在异常时也关闭加载对话框
      _closeLoadingDialog();
      
      if (mounted) {
        final errorMessage = InvoiceFileUtils.getDownloadErrorMessage(e);
        _showErrorMessage(context, errorMessage);
      }
    }
  }

  /// 简化的加载对话框关闭方法
  void _closeLoadingDialog() {
    print('🔄 [UI] 尝试关闭加载对话框...');
    
    if (!mounted) {
      print('❌ [UI] Widget已卸载，无法关闭对话框');
      return;
    }
    
    try {
      if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
        print('✅ [UI] 加载对话框关闭成功');
      } else {
        print('⚠️ [UI] 没有对话框可以关闭');
      }
    } catch (e) {
      print('❌ [UI] 关闭对话框失败: $e');
    }
  }

  /// 下载并分享
  Future<void> _downloadAndShare(BuildContext context) async {
    bool dialogShown = false;
    
    try {
      // 检查是否有有效的PDF文件
      if (!InvoiceFileUtils.hasValidPdfFile(widget.invoice)) {
        if (mounted) {
          _showErrorMessage(context, '该发票没有PDF文件');
        }
        return;
      }

      // 检查Widget是否仍然挂载
      if (!mounted) {
        print('❌ [分享] Widget已被销毁，取消分享操作');
        return;
      }

      _showLoadingDialog(context, '正在准备分享...');
      dialogShown = true;

      print('📥 [分享] 开始下载PDF文件...');
      final downloadedFile = await InvoiceFileUtils.downloadInvoicePdfToTempFile(widget.invoice);
      print('✅ [分享] PDF文件下载完成: ${downloadedFile.path}');

      // 确保关闭加载对话框
      if (dialogShown && mounted) {
        print('🔄 [分享] 准备关闭加载对话框...');
        _closeLoadingDialog();
        dialogShown = false;
        print('✅ [分享] 加载对话框关闭完成');
      }

      // 检查Widget是否仍然挂载
      if (!mounted) {
        print('❌ [分享] Widget在下载完成后被销毁，无法显示分享菜单');
        return;
      }

      print('📤 [分享] 准备显示分享菜单...');
      await _showShareSheet(downloadedFile);
      print('✅ [分享] 分享菜单已显示');
      
    } catch (e) {
      print('❌ [分享] 分享过程出现异常: $e');
      
      // 确保关闭加载对话框
      if (dialogShown && mounted) {
        _closeLoadingDialog();
      }
      
      if (mounted) {
        final errorMessage = InvoiceFileUtils.getDownloadErrorMessage(e);
        _showErrorMessage(this.context, errorMessage);
      }
    }
  }




  /// 显示加载对话框（带取消按钮防止卡住）
  void _showLoadingDialog(BuildContext context, String message) {
    print('🔄 [UI] 显示加载对话框: $message');
    
    showDialog(
      context: context,
      barrierDismissible: true, // 允许点击外部取消
      builder: (context) => AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CupertinoActivityIndicator(radius: 20),
            const SizedBox(height: 16),
            Text(
              message,
              style: const TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () {
                print('🔄 [UI] 用户点击取消按钮');
                Navigator.of(context).pop();
              },
              child: const Text('取消'),
            ),
          ],
        ),
      ),
    ).then((_) {
      print('✅ [UI] 加载对话框已关闭');
    });
  }


  /// 显示iOS分享菜单
  Future<void> _showShareSheet(File file) async {
    try {
      final displayName = InvoiceFileUtils.getInvoiceDisplayName(widget.invoice);

      await Share.shareXFiles(
        [XFile(file.path)],
        subject: '发票分享 - $displayName',
      );
    } catch (e) {
      if (mounted) {
        final errorMessage = InvoiceFileUtils.getDownloadErrorMessage(e);
        _showErrorMessage(context, '分享失败：$errorMessage');
      }
    }
  }

  /// 显示错误消息
  void _showErrorMessage(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(
              CupertinoIcons.exclamationmark_triangle,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: CupertinoColors.systemRed,
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  /// 显示成功消息
  void _showSuccessMessage(BuildContext context, String message) {
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
            Expanded(child: Text(message)),
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