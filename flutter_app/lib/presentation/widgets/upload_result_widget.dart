import 'package:flutter/material.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/usecases/upload_invoice_usecase.dart';
import '../bloc/invoice_state.dart';

/// 上传结果显示组件
class UploadResultWidget extends StatelessWidget {
  final List<UploadResult> results;
  final int successCount;
  final int failureCount;
  final int duplicateCount;
  final Function(String)? onRetry;
  final VoidCallback? onClear;
  final Function(InvoiceEntity)? onViewInvoice;

  const UploadResultWidget({
    super.key,
    required this.results,
    required this.successCount,
    required this.failureCount,
    required this.duplicateCount,
    this.onRetry,
    this.onClear,
    this.onViewInvoice,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // 结果摘要
        _buildResultSummary(context),
        const SizedBox(height: 24),
        
        // 结果列表
        Expanded(
          child: _buildResultList(context),
        ),
        
        // 操作按钮
        _buildActionButtons(context),
      ],
    );
  }

  /// 构建结果摘要
  Widget _buildResultSummary(BuildContext context) {
    final hasFailure = failureCount > 0;
    final hasSuccess = successCount > 0;
    final hasDuplicate = duplicateCount > 0;

    Color summaryColor = Colors.green;
    IconData summaryIcon = Icons.check_circle;
    String summaryTitle = '上传完成！';

    if (hasFailure && !hasSuccess) {
      summaryColor = Colors.red;
      summaryIcon = Icons.error;
      summaryTitle = '上传失败';
    } else if (hasFailure) {
      summaryColor = Colors.orange;
      summaryIcon = Icons.warning;
      summaryTitle = '部分文件上传失败';
    } else if (hasSuccess && !hasFailure) {
      summaryColor = Colors.green;
      summaryIcon = Icons.check_circle_outline;
      summaryTitle = hasDuplicate ? '上传完成（含重复文件）' : '全部文件上传成功！';
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: summaryColor.withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(
            color: summaryColor.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // 主要状态
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: summaryColor.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  summaryIcon,
                  color: summaryColor,
                  size: 32,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      summaryTitle,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: summaryColor,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '共处理 ${results.length} 个文件',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 20),
          
          // 统计信息
          Row(
            children: [
              if (hasSuccess) ...[
                _buildStatItem(
                  context,
                  Icons.check_circle,
                  Colors.green,
                  '成功',
                  successCount,
                ),
                if (hasDuplicate || hasFailure) const SizedBox(width: 16),
              ],
              if (hasDuplicate) ...[
                _buildStatItem(
                  context,
                  Icons.content_copy,
                  Colors.amber,
                  '重复',
                  duplicateCount,
                ),
                if (hasFailure) const SizedBox(width: 16),
              ],
              if (hasFailure) ...[
                _buildStatItem(
                  context,
                  Icons.error,
                  Colors.red,
                  '失败',
                  failureCount,
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  /// 构建统计项
  Widget _buildStatItem(
    BuildContext context,
    IconData icon,
    Color color,
    String label,
    int count,
  ) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 4),
            Text(
              count.toString(),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建结果列表
  Widget _buildResultList(BuildContext context) {
    return ListView.builder(
      itemCount: results.length,
      itemBuilder: (context, index) {
        final result = results[index];
        return _buildResultItem(context, result);
      },
    );
  }

  /// 构建单个结果项
  Widget _buildResultItem(BuildContext context, UploadResult result) {
    Color statusColor;
    IconData statusIcon;
    String statusText;

    if (result.isSuccess) {
      if (result.isDuplicate) {
        statusColor = Colors.amber;
        statusIcon = Icons.content_copy;
        statusText = '文件重复';
      } else {
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        statusText = '上传成功';
      }
    } else {
      statusColor = Colors.red;
      statusIcon = Icons.error;
      statusText = '上传失败';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: statusColor.withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.05),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 文件信息和状态
          Row(
            children: [
              Icon(
                Icons.picture_as_pdf,
                color: Colors.red,
                size: 24,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      result.fileName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          statusIcon,
                          size: 14,
                          color: statusColor,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          statusText,
                          style: TextStyle(
                            fontSize: 12,
                            color: statusColor,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              // 操作按钮
              _buildResultActions(context, result),
            ],
          ),
          
          // 发票信息或错误信息
          if (result.isSuccess && result.invoice != null) ...[
            const SizedBox(height: 12),
            _buildInvoiceInfo(context, result.invoice!),
          ] else if (result.isDuplicate && result.duplicateInfo != null) ...[
            const SizedBox(height: 12),
            _buildDuplicateInfo(context, result.duplicateInfo!),
          ] else if (result.error != null) ...[
            const SizedBox(height: 12),
            _buildErrorInfo(context, result.error!),
          ],
        ],
      ),
    );
  }

  /// 构建结果操作按钮
  Widget _buildResultActions(BuildContext context, UploadResult result) {
    if (result.isSuccess && result.invoice != null) {
      // 成功上传，显示查看按钮
      return IconButton(
        onPressed: () => onViewInvoice?.call(result.invoice!),
        icon: const Icon(Icons.visibility),
        tooltip: '查看发票',
        color: Colors.blue,
      );
    } else if (result.isError) {
      // 上传失败，显示重试按钮
      return IconButton(
        onPressed: () => onRetry?.call(result.filePath),
        icon: const Icon(Icons.refresh),
        tooltip: '重试',
        color: Colors.orange,
      );
    }
    
    return const SizedBox.shrink();
  }

  /// 构建发票信息
  Widget _buildInvoiceInfo(BuildContext context, InvoiceEntity invoice) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.green.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.green.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '发票信息',
            style: TextStyle(
              fontWeight: FontWeight.w500,
              color: Colors.green.shade700,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 6),
          if (invoice.invoiceNumber.isNotEmpty) ...[
            _buildInfoRow('发票号码', invoice.invoiceNumber),
          ],
          if (invoice.sellerName != null && invoice.sellerName!.isNotEmpty) ...[
            _buildInfoRow('销售方', invoice.sellerName!),
          ],
          _buildInfoRow('金额', '¥${(invoice.totalAmount ?? invoice.amount).toStringAsFixed(2)}'),
          _buildInfoRow('日期', _formatDate(invoice.invoiceDate)),
        ],
      ),
    );
  }

  /// 构建重复信息
  Widget _buildDuplicateInfo(BuildContext context, DuplicateInvoiceInfo duplicateInfo) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.amber.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '重复文件信息',
            style: TextStyle(
              fontWeight: FontWeight.w500,
              color: Colors.amber.shade700,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            duplicateInfo.message,
            style: TextStyle(
              fontSize: 12,
              color: Colors.amber.shade600,
            ),
          ),
          if (duplicateInfo.canRestore) ...[
            const SizedBox(height: 8),
            Text(
              '可以选择恢复此发票',
              style: TextStyle(
                fontSize: 11,
                color: Colors.amber.shade600,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// 构建错误信息
  Widget _buildErrorInfo(BuildContext context, String error) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '错误信息',
            style: TextStyle(
              fontWeight: FontWeight.w500,
              color: Colors.red.shade700,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            error,
            style: TextStyle(
              fontSize: 12,
              color: Colors.red.shade600,
            ),
          ),
        ],
      ),
    );
  }

  /// 构建操作按钮
  Widget _buildActionButtons(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          if (failureCount > 0) ...[
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {
                  // 重试失败的文件
                  for (final result in results) {
                    if (result.isError) {
                      onRetry?.call(result.filePath);
                    }
                  }
                },
                icon: const Icon(Icons.refresh),
                label: Text('重试失败文件 ($failureCount)'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.orange,
                  side: const BorderSide(color: Colors.orange),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: ElevatedButton.icon(
              onPressed: onClear,
              icon: const Icon(Icons.done),
              label: const Text('完成'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 构建信息行
  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 60,
            child: Text(
              '$label:',
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 11),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  /// 格式化日期
  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }
}