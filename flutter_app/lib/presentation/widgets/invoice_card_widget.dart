import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:go_router/go_router.dart';
import 'dart:io';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../core/utils/invoice_file_utils.dart';
import '../../core/utils/icon_mapping.dart';
import '../../core/constants/accessibility_constants.dart';
import '../../core/events/app_event_bus.dart';
import '../../core/widgets/atoms/app_card.dart';
import '../../core/widgets/organisms/invoice_card/invoice_card_header.dart';
import '../../core/widgets/organisms/invoice_card/invoice_card_body.dart';
import '../../core/widgets/organisms/invoice_card/invoice_card_actions.dart';
import '../../core/widgets/organisms/invoice_card/invoice_card_slidable.dart';
import '../../core/widgets/molecules/reimbursement_set_badge.dart';
import 'invoice_status_badge.dart' as status_badge;
import 'unified_bottom_sheet.dart';
import '../utils/invoice_to_set_operation_utils.dart';

/// 发票卡片组件 - 展示单个发票的信息
class InvoiceCardWidget extends StatefulWidget {
  final InvoiceEntity invoice;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;
  // 移除状态修改回调 - 发票状态必须通过报销集来修改
  // final ValueChanged<InvoiceStatus>? onStatusChanged;
  final bool showConsumptionDateOnly;
  final bool isSelectionMode;
  final bool isSelected;
  final VoidCallback? onLongPress;
  final VoidCallback? onSelectionToggle;

  /// 自定义左滑操作（从右往左滑动时显示的操作）
  final List<SlideAction>? customStartActions;

  /// 自定义右滑操作（从左往右滑动时显示的操作）
  final List<SlideAction>? customEndActions;

  /// 是否启用滑动功能
  final bool enableSwipe;

  /// 报销集跳转回调
  final ValueChanged<String>? onReimbursementSetTap;

  const InvoiceCardWidget({
    super.key,
    required this.invoice,
    this.onTap,
    this.onDelete,
    // 移除状态修改回调参数
    // this.onStatusChanged,
    this.showConsumptionDateOnly = false,
    this.isSelectionMode = false,
    this.isSelected = false,
    this.onLongPress,
    this.onSelectionToggle,
    this.customStartActions,
    this.customEndActions,
    this.enableSwipe = true,
    this.onReimbursementSetTap,
  });

  @override
  State<InvoiceCardWidget> createState() => _InvoiceCardWidgetState();
}

class _InvoiceCardWidgetState extends State<InvoiceCardWidget> {
  final SlidableController _slidableController = SlidableController();
  late final AppEventBus _eventBus;

  @override
  void initState() {
    super.initState();
    _eventBus = AppEventBus.instance;
  }

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

  /// 构建头部右侧内容（报销集徽章 + 状态徽章）
  Widget? _buildHeaderTrailing() {
    // 在选择模式下，不显示额外的trailing内容，让选择框更突出
    if (widget.isSelectionMode) {
      return null;
    }

    // 创建状态徽章
    final statusBadge = status_badge.InvoiceStatusBadge(
      invoice: widget.invoice,
      size: status_badge.BadgeSize.small,
      showConsumptionDateOnly: widget.showConsumptionDateOnly,
    );

    // 如果发票在报销集中，同时显示报销集徽章和状态徽章
    if (widget.invoice.isInReimbursementSet) {
      final reimbursementBadge = ReimbursementSetBadge(
        invoice: widget.invoice,
        size: BadgeSize.small,
        showLabel: false, // 在卡片头部只显示图标，节省空间
        onTap: widget.onReimbursementSetTap != null &&
                widget.invoice.reimbursementSetId != null
            ? () => widget
                .onReimbursementSetTap!(widget.invoice.reimbursementSetId!)
            : null,
      );

      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          reimbursementBadge,
          const SizedBox(width: 6),
          statusBadge,
        ],
      );
    }

    // 独立发票只显示状态徽章
    return statusBadge;
  }

  // 移除_handleReimbursementSetStateChange方法
  // 报销集状态监听已统一到InvoiceManagementPage
  // 避免重复的成功消息显示

  @override
  Widget build(BuildContext context) {
    // 移除BlocListener - 报销集状态监听已统一到InvoiceManagementPage
    // 避免重复显示成功消息

    return Semantics(
      label:
          '发票: ${(widget.invoice.sellerName?.isNotEmpty ?? false) ? widget.invoice.sellerName : widget.invoice.invoiceNumber.isNotEmpty ? widget.invoice.invoiceNumber : '未知发票'}',
      hint: AccessibilityConstants.cardActionHint,
      child: InvoiceCardSlidable(
        slidableKey: _slidableController.key,
        enabled: !widget.isSelectionMode && widget.enableSwipe,
        startActions: _buildStartActions(),
        endActions: _buildEndActions(),
        groupTag: 'invoice-cards', // 所有发票卡片使用相同的 groupTag
        child: AppCard(
          isSelected: widget.isSelected,
          onTap:
              widget.isSelectionMode ? widget.onSelectionToggle : widget.onTap,
          onLongPress: widget.onLongPress,
          margin: EdgeInsets.only(
            left: 16.0,
            right: 16.0,
            top: 8.0,
            bottom: 8.0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // 头部组件
              InvoiceCardHeader(
                invoice: widget.invoice,
                title: (widget.invoice.sellerName?.isNotEmpty ?? false)
                    ? widget.invoice.sellerName!
                    : widget.invoice.invoiceNumber.isNotEmpty
                        ? widget.invoice.invoiceNumber
                        : '未知发票',
                subtitle: widget.invoice.buyerName,
                // 移除状态修改回调参数
                // onStatusChanged: widget.onStatusChanged,
                showConsumptionDateOnly: widget.showConsumptionDateOnly,
                isSelectionMode: widget.isSelectionMode,
                isSelected: widget.isSelected,
                onSelectionToggle: widget.onSelectionToggle,
                trailing: _buildHeaderTrailing(),
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

  /// 构建左滑操作 - 固定为分享功能
  List<SlideAction> _buildStartActions() {
    // 如果提供了自定义操作，使用自定义操作
    if (widget.customStartActions != null) {
      return widget.customStartActions!;
    }

    // 左滑固定显示分享操作
    return [
      InvoiceSlideActions.share(
        onPressed: () => _handleDownloadAndShare(context),
      ),
    ];
  }

  /// 构建右滑操作 - 根据发票状态智能生成
  List<SlideAction> _buildEndActions() {
    // 如果提供了自定义操作，使用自定义操作
    if (widget.customEndActions != null) {
      return widget.customEndActions!;
    }

    // 根据发票状态生成操作（加入/移出报销集 + 删除）
    return _createStatusBasedActions();
  }

  /// 根据发票状态创建滑动操作
  List<SlideAction> _createStatusBasedActions() {
    final invoice = widget.invoice;

    // 独立发票（未加入报销集）
    if (!invoice.isInReimbursementSet) {
      return InvoiceStatusSlidableActionsFactory.createForIndependentInvoice(
        onDelete: _handleDelete,
        onAddToReimbursementSet: () => _handleAddToReimbursementSet(context),
        onAddToExistingSet: () => _addToExistingReimbursementSet(context),
      );
    }

    // 报销集中的发票
    switch (invoice.effectiveStatus) {
      case InvoiceStatus.unsubmitted:
        return InvoiceStatusSlidableActionsFactory.createForUnsubmittedInSet(
          onRemoveFromSet: () => _handleRemoveFromReimbursementSet(context),
          onViewReimbursementSet: invoice.isInReimbursementSet
              ? () => _handleViewReimbursementSet(context)
              : null,
        );

      case InvoiceStatus.submitted:
        return InvoiceStatusSlidableActionsFactory.createForSubmittedInSet();

      case InvoiceStatus.reimbursed:
        return InvoiceStatusSlidableActionsFactory.createForReimbursedInvoice();
    }
  }

  /// 处理删除操作 - 直接触发回调，由父组件处理确认逻辑
  void _handleDelete() {
    widget.onDelete?.call();
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
    if (!mounted) {
      return;
    }

    try {
      if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      } else {}
    } catch (e) {
      // Ignore operation failure
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
        return;
      }

      _showLoadingDialog(context, '正在准备分享...');
      dialogShown = true;

      final downloadedFile =
          await InvoiceFileUtils.downloadInvoicePdfToTempFile(widget.invoice);

      // 确保关闭加载对话框
      if (dialogShown && mounted) {
        _closeLoadingDialog();
        dialogShown = false;
      }

      // 检查Widget是否仍然挂载
      if (!mounted) {
        return;
      }

      await _showShareSheet(downloadedFile);
    } catch (e) {
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

  /// 显示加载对话框（使用统一的BottomSheet）
  void _showLoadingDialog(BuildContext context, String message) {
    UnifiedBottomSheet.showLoadingSheet(
      context: context,
      message: message,
      isDismissible: true,
    );
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
    if (mounted) {
      showCupertinoDialog(
        context: context,
        builder: (context) => CupertinoAlertDialog(
          title: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                CupertinoIcons.exclamationmark_triangle,
                color: CupertinoColors.systemRed,
                size: 20,
              ),
              const SizedBox(width: 8),
              const Text('错误'),
            ],
          ),
          content: Text(message),
          actions: [
            CupertinoDialogAction(
              child: const Text('确定'),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      );
    }
  }

  /// 处理加入报销集操作
  void _handleAddToReimbursementSet(BuildContext context) {
    showCupertinoModalPopup(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: Text(
          '加入报销集',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        message: Text(
          '将 ${widget.invoice.sellerName ?? widget.invoice.invoiceNumber} 加入到报销集中',
          style: TextStyle(
            fontSize: 14,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        actions: [
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context);
              _createNewReimbursementSet(context);
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  IconMapping.getCupertinoIcon('folder_badge_plus'),
                  color: Theme.of(context).colorScheme.primary,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Text(
                  '创建新报销集',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
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
              _addToExistingReimbursementSet(context);
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  IconMapping.getCupertinoIcon('folder_badge_plus'),
                  color: Theme.of(context).colorScheme.secondary,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Text(
                  '加入现有报销集',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.secondary,
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

  /// 处理从报销集移出操作
  void _handleRemoveFromReimbursementSet(BuildContext context) async {
    final invoice = widget.invoice;
    final reimbursementSetName = '报销集';
    final colorScheme = Theme.of(context).colorScheme;

    final result = await UnifiedBottomSheet.showConfirmDialog(
      context: context,
      title: '移出报销集',
      content:
          '确定要将 ${invoice.sellerName ?? invoice.invoiceNumber} 从 $reimbursementSetName 中移出吗？',
      confirmText: '移出',
      confirmColor: colorScheme.error,
      icon: IconMapping.getCupertinoIcon('folder_badge_minus'),
    );

    if (result == true && context.mounted) {
      _executeRemoveFromReimbursementSet(context);
    }
  }

  /// 处理查看关联报销集详情
  void _handleViewReimbursementSet(BuildContext context) {
    final invoice = widget.invoice;

    // 检查发票是否有关联的报销集ID
    if (invoice.reimbursementSetId == null || !invoice.isInReimbursementSet) {
      // 如果没有关联的报销集，显示提示
      showCupertinoDialog(
        context: context,
        builder: (context) => CupertinoAlertDialog(
          title: const Text('提示'),
          content: const Text('该发票未关联任何报销集'),
          actions: [
            CupertinoDialogAction(
              child: const Text('确定'),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      );
      return;
    }

    // 跳转到报销集详情页面
    context.push('/reimbursement-set/${invoice.reimbursementSetId}');
  }

  /// 创建新报销集并加入发票
  void _createNewReimbursementSet(BuildContext context) {
    // 使用智能生成的默认名称直接创建报销集
    final now = DateTime.now();
    final monthName = '${now.year}年${now.month.toString().padLeft(2, '0')}月';
    final defaultName = '$monthName报销单_单张发票';

    _executeCreateReimbursementSet(context, defaultName, null);
  }

  /// 加入到现有报销集
  void _addToExistingReimbursementSet(BuildContext context) {
    InvoiceToSetOperationUtils.showSelectExistingSetDialog(
      context: context,
      invoiceIds: [widget.invoice.id],
      invoices: [widget.invoice],
    );
  }

  /// 执行创建报销集并加入发票
  void _executeCreateReimbursementSet(
    BuildContext context,
    String setName,
    String? description,
  ) {
    try {
      // 通过事件总线发送创建报销集请求
      _eventBus.emit(
        CreateReimbursementSetRequestEvent(
          setName: setName,
          description: description,
          invoiceIds: [widget.invoice.id],
          timestamp: DateTime.now(),
        ),
      );

      // 不显示"正在..."消息，让用户通过状态变化看到结果
    } catch (e) {
      _showErrorMessage(context, '创建报销集失败: ${e.toString()}');
    }
  }

  /// 执行从报销集移出操作
  void _executeRemoveFromReimbursementSet(BuildContext context) {
    try {
      // 通过事件总线发送移出发票请求
      _eventBus.emit(
        RemoveInvoicesFromSetRequestEvent(
          invoiceIds: [widget.invoice.id],
          timestamp: DateTime.now(),
        ),
      );

      // 不显示"正在..."消息，让用户通过状态变化看到结果
    } catch (e) {
      _showErrorMessage(context, '移出发票失败: ${e.toString()}');
    }
  }
}
