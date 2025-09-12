import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:io';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../core/utils/invoice_file_utils.dart';
import '../../core/constants/accessibility_constants.dart';
import '../../core/widgets/atoms/app_card.dart';
import '../../core/widgets/organisms/invoice_card/invoice_card_header.dart';
import '../../core/widgets/organisms/invoice_card/invoice_card_body.dart';
import '../../core/widgets/organisms/invoice_card/invoice_card_actions.dart';
import '../../core/widgets/organisms/invoice_card/invoice_card_slidable.dart';
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
  final SlidableController _slidableController = SlidableController();

  @override
  void didUpdateWidget(InvoiceCardWidget oldWidget) {
    super.didUpdateWidget(oldWidget);

    // 当进入多选模式时，重置所有滑动状态
    if (widget.isSelectionMode && !oldWidget.isSelectionMode) {
      _slidableController.close();
    }
  }

  @override
  void dispose() {
    _slidableController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '发票: ${(widget.invoice.sellerName?.isNotEmpty ?? false) ? widget.invoice.sellerName : widget.invoice.invoiceNumber.isNotEmpty ? widget.invoice.invoiceNumber : '未知发票'}',
      hint: AccessibilityConstants.cardActionHint,
      child: InvoiceCardSlidable(
        slidableKey: _slidableController.key,
        enabled: !widget.isSelectionMode,
        startActions: _buildStartActions(),
        endActions: _buildEndActions(),
        child: AppCard(
          isSelected: widget.isSelected,
          onTap: widget.isSelectionMode ? widget.onSelectionToggle : widget.onTap,
          onLongPress: widget.onLongPress,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // 头部组件
              InvoiceCardHeader(
                invoice: widget.invoice,
                title: (widget.invoice.sellerName?.isNotEmpty ?? false) ? widget.invoice.sellerName! : widget.invoice.invoiceNumber.isNotEmpty ? widget.invoice.invoiceNumber : '未知发票',
                subtitle: widget.invoice.buyerName,
                onStatusChanged: widget.onStatusChanged,
                showConsumptionDateOnly: widget.showConsumptionDateOnly,
                isSelectionMode: widget.isSelectionMode,
                isSelected: widget.isSelected,
                onSelectionToggle: widget.onSelectionToggle,
              ),
              
              // 主体组件
              InvoiceCardBody(
                invoice: widget.invoice,
                showConsumptionDateOnly: widget.showConsumptionDateOnly,
              ),
              
              // 底部操作组件（不显示时间）
              InvoiceCardActions(
                timeText: '',
                actions: [],
                showTime: false,
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 构建左滑操作
  List<SlideAction> _buildStartActions() {
    return [
      InvoiceSlideActions.share(
        onPressed: () => _handleDownloadAndShare(context),
      ),
    ];
  }

  /// 构建右滑操作
  List<SlideAction> _buildEndActions() {
    return [
      InvoiceSlideActions.delete(
        onPressed: () => _handleDelete(context),
      ),
    ];
  }

  /// 处理删除操作
  Future<void> _handleDelete(BuildContext context) async {
    final colorScheme = Theme.of(context).colorScheme;
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

}
