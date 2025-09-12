import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:io';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../core/utils/invoice_file_utils.dart';
import '../../core/utils/icon_mapping.dart';
import '../../core/constants/accessibility_constants.dart';
import 'invoice_status_badge.dart';
import 'uniform_card_styles.dart';
import 'unified_bottom_sheet.dart';

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
                color: colorScheme.primary,
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
                          color: Colors.white, // 保持 const，使用固定颜色确保与背景对比
                          size: 24,
                        ),
                        SizedBox(height: 4),
                        Text(
                          '分享',
                          style: TextStyle(
                            color: Colors.white, // 保持 const，使用固定颜色确保与背景对比
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
                color: colorScheme.error,
                elevation: widget.isSelected ? 8 : 2, // 匹配Card的elevation
                borderRadius: const BorderRadius.only(
                  topRight: Radius.circular(12),
                  bottomRight: Radius.circular(12),
                ),
                child: InkWell(
                  onTap: () async {
                    // 使用统一的底部Sheet确认对话框
                    final result = await UnifiedBottomSheet.showConfirmDialog(
                      context: context,
                      title: '删除发票',
                      content: '确定要删除 ${widget.invoice.sellerName ?? widget.invoice.invoiceNumber} 吗？此操作无法撤销。',
                      confirmText: '删除',
                      confirmColor: colorScheme.error,
                      icon: CupertinoIcons.delete,
                    );
                    
                    if (result == true) {
                      widget.onDelete?.call();
                    }
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
                          color: Colors.white, // 保持 const，使用固定颜色确保与背景对比
                          size: 24,
                        ),
                        SizedBox(height: 4),
                        Text(
                          '删除',
                          style: TextStyle(
                            color: Colors.white, // 保持 const，使用固定颜色确保与背景对比
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
      child: Semantics(
        label: '发票: ${widget.invoice.sellerName ?? widget.invoice.invoiceNumber ?? '未知发票'}',
        hint: AccessibilityConstants.cardActionHint,
        child: UniformCardStyles.buildCard(
          context: context,
          isSelected: widget.isSelected,
          onTap: widget.isSelectionMode ? widget.onSelectionToggle : widget.onTap,
          onLongPress: widget.onLongPress,
          child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 头部信息行
            Row(
              children: [
                // 现代化的选择框（多选模式下显示）
                if (widget.isSelectionMode) ...[
                  _buildModernCheckbox(colorScheme),
                  const SizedBox(width: UniformCardStyles.spacing12),
                ],
                Expanded(
                  child: UniformCardStyles.buildSimpleHeaderRow(
                    context: context,
                    title: widget.invoice.sellerName ?? widget.invoice.invoiceNumber,
                    subtitle: widget.invoice.buyerName ?? _getFormattedDate(),
                    trailing: InteractiveInvoiceStatusBadge(
                      invoice: widget.invoice,
                      onStatusChanged: widget.onStatusChanged,
                      size: BadgeSize.medium,
                      showConsumptionDateOnly: widget.showConsumptionDateOnly,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: UniformCardStyles.spacing12),

            // 消费日期和类型 + 金额显示行
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // 左侧：消费日期和类型图标（仅在有消费日期或类型时显示）
                Row(
                  children: [
                    // 消费日期（仅在有消费日期时显示）
                    if (_getFormattedDate().isNotEmpty) ...[
                      UniformCardStyles.buildInfoItem(
                        context: context,
                        icon: _getDateIcon(),
                        text: _getFormattedDate(),
                      ),
                      const SizedBox(width: UniformCardStyles.spacing8),
                    ],
                    // 消费类型图标
                    if (_getCategoryText().isNotEmpty)
                      Icon(
                        IconMapping.getCategoryIcon(_getCategoryText()),
                        size: UniformCardStyles.smallIconSize,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                  ],
                ),
                // 右侧：金额（无标签）
                Text(
                  widget.invoice.formattedAmount,
                  style: UniformCardStyles.cardAmount(context),
                ),
              ],
            ),

            const SizedBox(height: UniformCardStyles.spacing12),

            // 底部信息行
            UniformCardStyles.buildBottomRow(
              context: context,
              timeText: _formatRelativeTime(widget.invoice.createdAt ?? DateTime.now()),
              actionIcons: _buildActionIcons(context),
            ),
          ],
        ),
        ),
      ),
    );
  }

  /// 获取格式化的日期 - 优先显示消费日期
  String _getFormattedDate() {
    // 优先返回消费日期，如果没有则不显示任何日期
    if (widget.invoice.consumptionDate != null) {
      return widget.invoice.formattedConsumptionDate ?? '';
    }
    return ''; // 没有消费日期就不显示日期
  }

  /// 获取消费类型文本
  String _getCategoryText() {
    String? expenseCategory = widget.invoice.expenseCategory;
    if (expenseCategory == 'null') expenseCategory = null;
    return expenseCategory ?? '';
  }

  /// 获取日期图标 - 只显示消费日期的购物车图标
  IconData _getDateIcon() {
    return CupertinoIcons.cart; // 消费日期统一使用购物车图标
  }

  /// 格式化相对时间
  String _formatRelativeTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 0) {
      return '${difference.inDays}天前';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}小时前';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}分钟前';
    } else {
      return '刚刚';
    }
  }

  /// 构建操作图标列表
  List<Widget> _buildActionIcons(BuildContext context) {
    final actionIcons = <Widget>[];
    // 目前不需要额外的操作图标，保持简洁
    return actionIcons;
  }

  /// 构建日期信息
  Widget _buildDateInfo(BuildContext context, TextTheme textTheme) {
    final colorScheme = Theme.of(context).colorScheme;

    // 根据平台和设置决定显示哪个日期
    String dateText;
    IconData dateIcon;

    if (widget.showConsumptionDateOnly &&
        widget.invoice.consumptionDate != null) {
      // 显示消费日期
      dateText = widget.invoice.formattedConsumptionDate ??
          widget.invoice.formattedDate;
      dateIcon = CupertinoIcons.cart;
    } else if (widget.invoice.consumptionDate != null &&
        !widget.showConsumptionDateOnly) {
      // 显示消费日期（如果存在）
      dateText = widget.invoice.formattedConsumptionDate ??
          widget.invoice.formattedDate;
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
    final colorScheme = Theme.of(context).colorScheme;

    showCupertinoModalPopup(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text(
          '发票操作',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
        message: Text(
          widget.invoice.sellerName ?? widget.invoice.invoiceNumber,
          style: TextStyle(fontSize: 14, color: colorScheme.onSurfaceVariant),
        ),
        actions: [
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context);
              _downloadAndViewPdf(context);
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  CupertinoIcons.doc_text_viewfinder,
                  color: colorScheme.primary,
                  size: 24,
                ),
                SizedBox(width: 12),
                Text(
                  '查看PDF',
                  style: TextStyle(
                    color: colorScheme.primary,
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
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  CupertinoIcons.share,
                  color: colorScheme.secondary,
                  size: 24,
                ),
                SizedBox(width: 12),
                Text(
                  '分享发票',
                  style: TextStyle(
                    color: colorScheme.secondary,
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
          child: Text(
            '取消',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: colorScheme.primary,
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

      if (context.mounted) {
        final errorMessage = InvoiceFileUtils.getDownloadErrorMessage(e);
        _showErrorMessage(context, errorMessage);
      }
    }
  }

  /// 简化的加载对话框关闭方法
  void _closeLoadingDialog() {
    // print('🔄 [UI] 尝试关闭加载对话框...');

    if (!mounted) {
      // print('❌ [UI] Widget已卸载，无法关闭对话框');
      return;
    }

    try {
      if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
        // print('✅ [UI] 加载对话框关闭成功');
      } else {
        // print('⚠️ [UI] 没有对话框可以关闭');
      }
    } catch (e) {
      // print('❌ [UI] 关闭对话框失败: $e');
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
        // print('❌ [分享] Widget已被销毁，取消分享操作');
        return;
      }

      _showLoadingDialog(context, '正在准备分享...');
      dialogShown = true;

      // print('📥 [分享] 开始下载PDF文件...');
      final downloadedFile =
          await InvoiceFileUtils.downloadInvoicePdfToTempFile(widget.invoice);
      // print('✅ [分享] PDF文件下载完成: ${downloadedFile.path}');

      // 确保关闭加载对话框
      if (dialogShown && mounted) {
        // print('🔄 [分享] 准备关闭加载对话框...');
        _closeLoadingDialog();
        dialogShown = false;
        // print('✅ [分享] 加载对话框关闭完成');
      }

      // 检查Widget是否仍然挂载
      if (!mounted) {
        // print('❌ [分享] Widget在下载完成后被销毁，无法显示分享菜单');
        return;
      }

      // print('📤 [分享] 准备显示分享菜单...');
      await _showShareSheet(downloadedFile);
      // print('✅ [分享] 分享菜单已显示');
    } catch (e) {
      // print('❌ [分享] 分享过程出现异常: $e');

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
    // print('🔄 [UI] 显示加载对话框: $message');

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
                // print('🔄 [UI] 用户点击取消按钮');
                Navigator.of(context).pop();
              },
              child: const Text('取消'),
            ),
          ],
        ),
      ),
    ).then((_) {
      // print('✅ [UI] 加载对话框已关闭');
    });
  }

  /// 显示iOS分享菜单
  Future<void> _showShareSheet(File file) async {
    try {
      final displayName =
          InvoiceFileUtils.getInvoiceDisplayName(widget.invoice);

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
    final colorScheme = Theme.of(context).colorScheme;

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(
                CupertinoIcons.exclamationmark_triangle,
                color: Colors.white, // 保持 const，错误消息通常使用白色图标
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(child: Text(message)),
            ],
          ),
          backgroundColor: colorScheme.error,
          duration: const Duration(seconds: 3),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
    }
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
    final colorScheme = Theme.of(context).colorScheme;

    if (widget.isSelectionMode && widget.isSelected) {
      // 选中状态下使用轻微的彩色阴影
      return [
        BoxShadow(
          color: colorScheme.primary.withValues(alpha: 0.15),
          offset: const Offset(0, 1),
          blurRadius: 3,
          spreadRadius: 0,
        ),
      ];
    }

    // 默认状态使用极轻微的阴影
    return [
      BoxShadow(
        color: colorScheme.shadow.withValues(alpha: 0.04),
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
          color: widget.isSelected ? colorScheme.primary : colorScheme.surface,
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
