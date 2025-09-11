import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:io';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../core/utils/invoice_file_utils.dart';
import 'invoice_status_badge.dart';

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
  void didUpdateWidget(InvoiceCardWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    // 当进入多选模式时，重置所有滑动状态
    if (widget.isSelectionMode && !oldWidget.isSelectionMode) {
      _resetSlidableState();
    }
  }
  
  /// 重置滑动状态
  void _resetSlidableState() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // 使用Slidable的静态方法关闭所有活动的滑动状态
      Slidable.of(context)?.close();
    });
  }

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
                          CupertinoIcons.delete,
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
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: _getCardBackgroundColor(colorScheme),
          border: _getCardBorder(colorScheme),
          boxShadow: _getCardShadow(),
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            onTap: widget.isSelectionMode ? widget.onSelectionToggle : widget.onTap,
            onLongPress: widget.onLongPress,
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
              // 头部信息行
              Row(
                children: [
                  // 现代化的选择框（多选模式下显示）
                  if (widget.isSelectionMode) ...[
                    _buildModernCheckbox(colorScheme),
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
                            InteractiveInvoiceStatusBadge(
                              invoice: widget.invoice,
                              onStatusChanged: widget.onStatusChanged,
                              size: BadgeSize.medium,
                              showConsumptionDateOnly: widget.showConsumptionDateOnly,
                            ),
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
                            // 根据分类获取对应的CupertinoIcon
                            IconData getCategoryIcon(String category) {
                              switch (category.toLowerCase()) {
                                case '餐饮服务':
                                case '餐饮':
                                  return CupertinoIcons.house;
                                case '交通':
                                case '出租车':
                                case '网约车':
                                  return CupertinoIcons.car;
                                case '高铁':
                                case '火车票':
                                  return CupertinoIcons.train_style_one;
                                case '飞机':
                                case '机票':
                                  return CupertinoIcons.airplane;
                                case '住宿':
                                case '酒店':
                                  return CupertinoIcons.building_2_fill;
                                case '办公':
                                case '办公用品':
                                  return CupertinoIcons.briefcase;
                                case '加油':
                                case '油费':
                                  return CupertinoIcons.drop;
                                case '停车':
                                  return CupertinoIcons.car_fill;
                                case '医疗':
                                  return CupertinoIcons.heart;
                                case '购物':
                                  return CupertinoIcons.bag;
                                default:
                                  return CupertinoIcons.doc;
                              }
                            }
                            
                            return Icon(
                              getCategoryIcon(categoryText),
                              size: 16,
                              color: colorScheme.onSurfaceVariant,
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
      dateIcon = CupertinoIcons.cart;
    } else if (widget.invoice.consumptionDate != null && !widget.showConsumptionDateOnly) {
      // 显示消费日期（如果存在）
      dateText = widget.invoice.formattedConsumptionDate ?? widget.invoice.formattedDate;
      dateIcon = CupertinoIcons.cart;
    } else {
      // 显示发票日期
      dateText = widget.invoice.formattedDate;
      dateIcon = CupertinoIcons.doc;
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

  /// 获取现代化的卡片背景颜色
  Color _getCardBackgroundColor(ColorScheme colorScheme) {
    if (!widget.isSelectionMode) {
      return colorScheme.surface;
    }
    
    if (widget.isSelected) {
      return colorScheme.primaryContainer.withValues(alpha: 0.12);
    }
    
    return colorScheme.surface;
  }

  /// 获取现代化的卡片边框
  Border? _getCardBorder(ColorScheme colorScheme) {
    if (!widget.isSelectionMode) {
      return null;
    }
    
    if (widget.isSelected) {
      return Border.all(
        color: colorScheme.primary,
        width: 2.0,
      );
    }
    
    return Border.all(
      color: colorScheme.outline.withValues(alpha: 0.2),
      width: 1.0,
    );
  }

  /// 获取现代化的卡片阴影
  List<BoxShadow> _getCardShadow() {
    if (widget.isSelectionMode && widget.isSelected) {
      // 选中状态下使用轻微的彩色阴影
      return [
        BoxShadow(
          color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.15),
          offset: const Offset(0, 1),
          blurRadius: 3,
          spreadRadius: 0,
        ),
      ];
    }
    
    // 默认状态使用极轻微的阴影
    return [
      BoxShadow(
        color: Colors.black.withValues(alpha: 0.04),
        offset: const Offset(0, 1),
        blurRadius: 3,
        spreadRadius: 0,
      ),
    ];
  }

  /// 构建现代化的选择框
  Widget _buildModernCheckbox(ColorScheme colorScheme) {
    return GestureDetector(
      onTap: () => widget.onSelectionToggle?.call(),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 24,
        height: 24,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(6),
          color: widget.isSelected ? colorScheme.primary : Colors.transparent,
          border: Border.all(
            color: widget.isSelected 
                ? colorScheme.primary 
                : colorScheme.outline.withValues(alpha: 0.6),
            width: widget.isSelected ? 0 : 2,
          ),
        ),
        child: widget.isSelected
            ? Icon(
                CupertinoIcons.checkmark,
                size: 16,
                color: colorScheme.onPrimary,
              )
            : null,
      ),
    );
  }
}