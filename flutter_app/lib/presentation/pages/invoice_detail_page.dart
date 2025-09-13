import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../domain/entities/invoice_entity.dart';
import '../bloc/invoice_bloc.dart';
import '../bloc/invoice_event.dart';
import '../bloc/invoice_state.dart';
// import '../widgets/invoice_pdf_viewer.dart'; // 未使用
import '../widgets/adaptive_pdf_container.dart';
import '../widgets/app_feedback.dart';
import '../widgets/invoice_status_badge.dart';
import '../widgets/detail_page_styles.dart';

/// 发票详情页面 - iOS风格设计
class InvoiceDetailPage extends StatefulWidget {
  final String invoiceId;

  const InvoiceDetailPage({
    super.key,
    required this.invoiceId,
  });

  @override
  State<InvoiceDetailPage> createState() => _InvoiceDetailPageState();
}

class _InvoiceDetailPageState extends State<InvoiceDetailPage> {
  bool _showAdvancedInfo = false;

  @override
  void initState() {
    super.initState();
    // 加载发票详情
    context.read<InvoiceBloc>().add(LoadInvoiceDetail(widget.invoiceId));
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<InvoiceBloc, InvoiceState>(
      listener: (context, state) {
        if (state is InvoiceDeleteSuccess) {
          AppFeedback.success(context, state.message);
          // 返回到上一页面
          context.pop();
        } else if (state is InvoiceError) {
          AppFeedback.error(context, '操作失败', message: state.message);
        }
      },
      buildWhen: (previous, current) =>
          current is InvoiceDetailLoaded ||
          current is InvoiceDetailLoading ||
          current is InvoiceError,
      builder: (context, state) {
        if (state is InvoiceDetailLoading) {
          return _buildLoadingPage();
        }

        if (state is InvoiceError) {
          return _buildErrorPage(state.message);
        }

        if (state is InvoiceDetailLoaded) {
          return _buildDetailPage(state.invoice);
        }

        return _buildErrorPage('发票未找到');
      },
    );
  }

  Widget _buildLoadingPage() {
    return Scaffold(
      appBar: AppBar(
        title: const Text('发票详情'),
        centerTitle: true,
      ),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('加载中...', style: TextStyle(color: Colors.grey)),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorPage(String message) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('发票详情'),
        centerTitle: true,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              CupertinoIcons.exclamationmark_triangle,
              size: 64,
              color: Colors.red.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 16),
            Text(
              '加载失败',
              style: TextStyle(
                fontSize: 18,
                color: Colors.red.withValues(alpha: 0.7),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.withValues(alpha: 0.8),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                context
                    .read<InvoiceBloc>()
                    .add(LoadInvoiceDetail(widget.invoiceId));
              },
              child: const Text('重试'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailPage(InvoiceEntity invoice) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // 可折叠的应用栏 - 显示发票图片或状态
          _buildSliverAppBar(invoice, colorScheme),

          // 主要内容区域
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 第一层：核心信息卡片
                  _buildCoreInfoCard(invoice, colorScheme),
                  const SizedBox(height: 16),

                  // 第二层：基本信息卡片
                  _buildBasicInfoCard(invoice, colorScheme),
                  const SizedBox(height: 16),

                  // PDF查看器容器
                  if (invoice.hasFile)
                    _buildPdfViewerCard(invoice, colorScheme),
                  if (invoice.hasFile) const SizedBox(height: 16),

                  // 第三层：详细信息 (可展开)
                  _buildAdvancedInfoCard(invoice, colorScheme),
                  const SizedBox(height: 16),

                  // 操作按钮区域
                  _buildActionButtons(invoice, colorScheme),

                  // 底部安全区域
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSliverAppBar(InvoiceEntity invoice, ColorScheme colorScheme) {
    return SliverAppBar(
      floating: false,
      pinned: true,
      title: Text(
        invoice.sellerName ?? invoice.invoiceNumber,
        style: const TextStyle(fontSize: 16),
      ),
    );
  }

  /// 第一层：核心信息卡片
  Widget _buildCoreInfoCard(InvoiceEntity invoice, ColorScheme colorScheme) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 金额 - 最重要的信息
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '发票金额',
                  style: DetailPageStyles.labelText(context),
                ),
                InteractiveInvoiceStatusBadge(
                  invoice: invoice,
                  enableStatusChange: true,
                  size: BadgeSize.large,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                invoice.formattedAmount,
                style: DetailPageStyles.amountText(context),
                textAlign: TextAlign.right,
              ),
            ),

            if (invoice.taxAmount != null && invoice.taxAmount! > 0) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  '含税额：¥${invoice.taxAmount!.toStringAsFixed(2)}',
                  style: DetailPageStyles.secondaryText(context),
                  textAlign: TextAlign.right,
                ),
              ),
            ],

            const SizedBox(height: 16),

            // 基本信息行
            _buildInfoRow(
                '开票日期', invoice.formattedDate, CupertinoIcons.calendar),
            if (invoice.consumptionDate != null)
              _buildInfoRow('消费日期', invoice.formattedConsumptionDate ?? '',
                  CupertinoIcons.cart),
            if (invoice.sellerName?.isNotEmpty == true)
              _buildInfoRow('销售方', invoice.sellerName ?? '',
                  CupertinoIcons.building_2_fill),
          ],
        ),
      ),
    );
  }

  /// 第二层：基本信息卡片
  Widget _buildBasicInfoCard(InvoiceEntity invoice, ColorScheme colorScheme) {
    return Card(
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '基本信息',
              style: DetailPageStyles.mainTitle(context),
            ),
            const SizedBox(height: 12),
            _buildInfoRow('发票号码', invoice.invoiceNumber, CupertinoIcons.number),
            if (invoice.buyerName?.isNotEmpty == true)
              _buildInfoRow(
                  '购买方', invoice.buyerName ?? '', CupertinoIcons.person),
            if (invoice.invoiceType?.isNotEmpty == true)
              _buildInfoRow(
                  '发票类型', invoice.invoiceType ?? '', Icons.category_outlined),
            if (invoice.category?.isNotEmpty == true)
              _buildInfoRow('分类', invoice.category ?? '', Icons.label_outline),
            _buildInfoRow(
                '数据来源', invoice.source.displayName, Icons.source_outlined),
          ],
        ),
      ),
    );
  }

  /// 第三层：详细信息卡片 (可展开)
  Widget _buildAdvancedInfoCard(
      InvoiceEntity invoice, ColorScheme colorScheme) {
    return Card(
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            GestureDetector(
              onTap: () {
                setState(() {
                  _showAdvancedInfo = !_showAdvancedInfo;
                });
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '详细信息',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  Icon(
                    _showAdvancedInfo
                        ? Icons.keyboard_arrow_up
                        : Icons.keyboard_arrow_down,
                    color: colorScheme.primary,
                  ),
                ],
              ),
            ),
            if (_showAdvancedInfo) ...[
              const SizedBox(height: 12),

              // 税务信息
              if (invoice.sellerTaxId?.isNotEmpty == true)
                _buildInfoRow('销售方税号', invoice.sellerTaxId ?? '',
                    Icons.account_balance_outlined),

              if (invoice.buyerTaxId?.isNotEmpty == true)
                _buildInfoRow('购买方税号', invoice.buyerTaxId ?? '',
                    Icons.credit_card_outlined),

              // 验证信息
              _buildInfoRow(
                '验证状态',
                invoice.isVerified ? '已验证' : '未验证',
                invoice.isVerified ? Icons.verified : Icons.pending_outlined,
                textColor: invoice.isVerified ? Colors.green : Colors.orange,
              ),

              if (invoice.verifiedAt != null)
                _buildInfoRow('验证时间', _formatDateTime(invoice.verifiedAt!),
                    Icons.schedule),

              // 文件信息
              if (invoice.hasFile) ...[
                _buildInfoRow(
                    '文件大小',
                    invoice.fileSize != null
                        ? _formatFileSize(invoice.fileSize!)
                        : '未知',
                    Icons.attachment),
              ],

              // 标签
              if (invoice.tags.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  '标签',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: invoice.tags
                      .map((tag) => Chip(
                            label: Text(tag),
                            visualDensity: VisualDensity.compact,
                          ))
                      .toList(),
                ),
              ],

              // 时间信息
              if (invoice.createdAt != null)
                _buildInfoRow('创建时间', _formatDateTime(invoice.createdAt!),
                    Icons.add_circle_outline),

              if (invoice.updatedAt != null)
                _buildInfoRow(
                    '更新时间', _formatDateTime(invoice.updatedAt!), Icons.update),
            ],
          ],
        ),
      ),
    );
  }

  /// 操作按钮区域
  Widget _buildActionButtons(InvoiceEntity invoice, ColorScheme colorScheme) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => _shareInvoice(invoice),
            icon: const Icon(Icons.share),
            label: const Text('分享'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => _exportInvoice(invoice),
            icon: const Icon(Icons.download),
            label: const Text('导出'),
          ),
        ),
      ],
    );
  }

  /// 信息行组件
  Widget _buildInfoRow(String label, String value, IconData icon,
      {Color? textColor}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            size: 18,
            color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.7),
          ),
          const SizedBox(width: 12),
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: Theme.of(context)
                  .colorScheme
                  .onSurface
                  .withValues(alpha: 0.7),
            ),
          ),
          Expanded(
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                value,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: textColor ?? Theme.of(context).colorScheme.onSurface,
                ),
                textAlign: TextAlign.right,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 工具方法
  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.year}-${dateTime.month.toString().padLeft(2, '0')}-${dateTime.day.toString().padLeft(2, '0')} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }



  void _shareInvoice(InvoiceEntity invoice) {
    // 实现分享功能
    AppFeedback.info(context, '分享功能开发中...');
  }

  void _exportInvoice(InvoiceEntity invoice) {
    // 实现导出功能
    AppFeedback.info(context, '导出功能开发中...');
  }

  /// PDF查看器卡片
  Widget _buildPdfViewerCard(InvoiceEntity invoice, ColorScheme colorScheme) {
    return Card(
      elevation: 2,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 卡片标题
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Icon(
                  Icons.picture_as_pdf,
                  size: 20,
                  color: colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  '发票PDF',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
                const Spacer(),
                // 全屏按钮
                IconButton(
                  icon: const Icon(Icons.fullscreen),
                  iconSize: 20,
                  onPressed: () {
                    // 触发PDF查看器的全屏模式
                    if (invoice.fileUrl != null) {
                      // 这里可以添加全屏PDF查看逻辑
                    }
                  },
                  tooltip: '全屏查看',
                ),
              ],
            ),
          ),

          // PDF查看器容器 - 自适应高度
          Container(
            margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: colorScheme.outline.withValues(alpha: 0.3),
                width: 1,
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: AdaptivePdfContainer(
                pdfUrl: invoice.fileUrl!,
                filePath: invoice.filePath,
                heroTag: 'invoice_detail_${invoice.id}',
                minHeight: 300,
                maxHeight: 800,
              ),
            ),
          ),
        ],
      ),
    );
  }

}
