import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../domain/entities/invoice_entity.dart';
import '../bloc/invoice_state.dart';
import '../../core/theme/app_typography.dart';

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
    final colorScheme = Theme.of(context).colorScheme;
    final hasFailure = failureCount > 0;
    final hasSuccess = successCount > 0;
    final hasDuplicate = duplicateCount > 0;

    Color summaryColor;
    IconData summaryIcon;
    String summaryTitle;

    if (hasFailure && hasSuccess) {
      // 既有成功又有失败
      summaryColor = colorScheme.tertiary;
      summaryIcon = CupertinoIcons.exclamationmark_triangle;
      summaryTitle = '部分文件上传失败';
    } else if (hasFailure && !hasSuccess && !hasDuplicate) {
      // 只有失败
      summaryColor = colorScheme.error;
      summaryIcon = CupertinoIcons.exclamationmark_triangle;
      summaryTitle = '上传失败';
    } else if (hasSuccess && !hasFailure) {
      // 有成功，无失败
      summaryColor = colorScheme.primary;
      summaryIcon = CupertinoIcons.checkmark_circle_fill;
      summaryTitle = hasDuplicate ? '上传完成（含重复文件）' : '全部文件上传成功！';
    } else if (!hasSuccess && !hasFailure && hasDuplicate) {
      // 只有重复文件，没有成功和失败
      summaryColor = colorScheme.tertiary;
      summaryIcon = CupertinoIcons.info_circle;
      summaryTitle = '文件重复处理完成';
    } else {
      // 兜底情况（可能包含失败+重复的情况）
      summaryColor = colorScheme.tertiary;
      summaryIcon = CupertinoIcons.exclamationmark_triangle;
      summaryTitle = '处理完成';
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surface,
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
                      style: AppTypography.headlineSmall(context).copyWith(
                        fontWeight: FontWeight.bold,
                        color: summaryColor,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '共处理 ${results.length} 个文件',
                      style: AppTypography.bodyMedium(context).copyWith(
                        color: colorScheme.onSurfaceVariant,
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
                  CupertinoIcons.checkmark_circle_fill,
                  colorScheme.primary,
                  '成功',
                  successCount,
                ),
                if (hasDuplicate || hasFailure) const SizedBox(width: 16),
              ],
              if (hasDuplicate) ...[
                _buildStatItem(
                  context,
                  CupertinoIcons.doc_on_clipboard,
                  colorScheme.tertiary,
                  '重复',
                  duplicateCount,
                ),
                if (hasFailure) const SizedBox(width: 16),
              ],
              if (hasFailure) ...[
                _buildStatItem(
                  context,
                  CupertinoIcons.exclamationmark_triangle,
                  colorScheme.error,
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
              style: AppTypography.titleMedium(context).copyWith(
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
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.05),
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
                CupertinoIcons.doc_text,
                color: colorScheme.error,
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
                  ],
                ),
              ),

              // 操作按钮
              _buildResultActions(context, result),
            ],
          ),

          // 结果徽章
          const SizedBox(height: 12),
          _buildResultBadge(context, result),
        ],
      ),
    );
  }

  /// 构建结果徽章
  Widget _buildResultBadge(BuildContext context, UploadResult result) {
    final colorScheme = Theme.of(context).colorScheme;
    String badgeText;
    Color badgeColor;

    if (result.isSuccess && !result.isDuplicate) {
      badgeText = '上传成功';
      badgeColor = colorScheme.primary;
    } else if (result.isDuplicate) {
      badgeText = '该发票已存在';
      badgeColor = colorScheme.tertiary;
    } else {
      // 错误情况，显示友好错误信息
      badgeText = _getFriendlyErrorMessage(result.error ?? '上传失败');
      badgeColor = colorScheme.error;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: badgeColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: badgeColor.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Text(
        badgeText,
        style: TextStyle(
          fontSize: 12,
          color: badgeColor.withValues(alpha: 0.8),
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  /// 构建结果操作按钮
  Widget _buildResultActions(BuildContext context, UploadResult result) {
    final colorScheme = Theme.of(context).colorScheme;

    if (result.isSuccess && result.invoice != null) {
      // 成功上传，显示查看按钮
      return IconButton(
        onPressed: () => onViewInvoice?.call(result.invoice!),
        icon: const Icon(CupertinoIcons.eye),
        tooltip: '查看发票',
        color: colorScheme.primary,
      );
    } else if (result.isError) {
      // 上传失败，显示重试按钮
      return IconButton(
        onPressed: () => onRetry?.call(result.filePath),
        icon: const Icon(CupertinoIcons.refresh),
        tooltip: '重试',
        color: colorScheme.tertiary,
      );
    }

    return const SizedBox.shrink();
  }

  /// 构建操作按钮
  Widget _buildActionButtons(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // 主要操作按钮 - 完成
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: onClear,
              icon: const Icon(CupertinoIcons.checkmark),
              label: const Text('完成'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                textStyle: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
              ),
            ),
          ),
          
          // 次要操作按钮 - 重试（如果有失败文件）
          if (failureCount > 0) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  // 重试失败的文件
                  for (final result in results) {
                    if (result.isError) {
                      onRetry?.call(result.filePath);
                    }
                  }
                },
                icon: const Icon(CupertinoIcons.refresh),
                label: Text('重试失败文件 ($failureCount)'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Theme.of(context).colorScheme.tertiary,
                  side: BorderSide(color: Theme.of(context).colorScheme.tertiary),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  textStyle: const TextStyle(fontSize: 16),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// 将技术错误信息转换为用户友好的错误信息
  String _getFriendlyErrorMessage(String originalError) {
    // 移除技术性前缀
    String cleanError = originalError;
    if (cleanError.contains('UploadInvoiceException:')) {
      cleanError = cleanError.split('UploadInvoiceException:').last.trim();
    }

    // 常见错误模式匹配
    if (cleanError.contains('网络连接') ||
        cleanError.contains('connection') ||
        cleanError.contains('timeout')) {
      return '网络连接异常，请检查网络后重试';
    } else if (cleanError.contains('文件大小') ||
        cleanError.contains('file size') ||
        cleanError.contains('too large')) {
      return '文件大小超出限制，单个文件不能超过10MB';
    } else if (cleanError.contains('格式') ||
        cleanError.contains('format') ||
        cleanError.contains('invalid')) {
      return '文件格式不支持，请选择PDF格式的发票文件';
    } else if (cleanError.contains('服务器错误') ||
        cleanError.contains('server error') ||
        cleanError.contains('internal error')) {
      return '服务器暂时无法处理请求，请稍后重试';
    } else if (cleanError.contains('权限') ||
        cleanError.contains('permission') ||
        cleanError.contains('unauthorized')) {
      return '操作权限不足，请重新登录后重试';
    } else if (cleanError.contains('数据操作失败') ||
        cleanError.contains('database')) {
      return '数据保存失败，请检查网络连接后重试';
    } else if (cleanError.contains('重复') || cleanError.contains('duplicate')) {
      return '该文件已存在，无需重复上传';
    } else if (cleanError.contains('OCR') || cleanError.contains('识别')) {
      return '发票信息识别失败，请确保文件清晰可读';
    } else if (cleanError.contains('uploadInvoice')) {
      return '上传服务暂时不可用，请稍后重试';
    }

    // 如果没有匹配到特定错误，返回简化的通用错误
    if (cleanError.length > 50) {
      return '上传失败，请检查文件格式和网络连接后重试';
    }

    return cleanError.isNotEmpty ? cleanError : '上传失败，请重试';
  }
}
