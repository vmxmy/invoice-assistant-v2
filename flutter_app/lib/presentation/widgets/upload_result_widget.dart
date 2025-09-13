import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../domain/entities/invoice_entity.dart';
import '../bloc/invoice_state.dart';
// 移除旧主题系统，使用 FlexColorScheme 统一主题管理
// import '../../core/theme/app_typography.dart';

/// 上传结果显示组件
class UploadResultWidget extends StatelessWidget {
  final List<UploadResult> results;
  final int successCount;
  final int failureCount;
  final int duplicateCount;
  final bool hasCrossUserDuplicate;
  final Function(String)? onRetry;
  final VoidCallback? onClear;
  final Function(InvoiceEntity)? onViewInvoice;

  const UploadResultWidget({
    super.key,
    required this.results,
    required this.successCount,
    required this.failureCount,
    required this.duplicateCount,
    this.hasCrossUserDuplicate = false,
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

        // 跨用户重复警告
        if (hasCrossUserDuplicate) ...[
          _buildCrossUserDuplicateWarning(context),
          const SizedBox(height: 24),
        ],

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
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: summaryColor,
                        letterSpacing: -0.41,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '共处理 ${results.length} 个文件',
                      style: TextStyle(
                        fontSize: 15,
                        color: colorScheme.onSurfaceVariant,
                        letterSpacing: -0.23,
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
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
                letterSpacing: -0.41,
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

    if (result.isSuccess && !result.isDuplicate && !result.isCrossUserDuplicate) {
      badgeText = '上传成功';
      badgeColor = colorScheme.primary;
    } else if (result.isDuplicate) {
      badgeText = '该发票已存在';
      badgeColor = colorScheme.tertiary;
    } else if (result.isCrossUserDuplicate) {
      badgeText = '检测到跨用户重复发票';
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
      return CupertinoButton(
        padding: EdgeInsets.zero,
        onPressed: () => onViewInvoice?.call(result.invoice!),
        child: Icon(
          CupertinoIcons.eye,
          color: colorScheme.primary,
          size: 20,
        ),
      );
    } else if (result.isError) {
      // 上传失败，显示重试按钮
      return CupertinoButton(
        padding: EdgeInsets.zero,
        onPressed: () => onRetry?.call(result.filePath),
        child: Icon(
          CupertinoIcons.refresh,
          color: colorScheme.tertiary,
          size: 20,
        ),
      );
    }

    return const SizedBox.shrink();
  }

  /// 构建操作按钮
  Widget _buildActionButtons(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // 主要操作按钮 - 完成
          SizedBox(
            width: double.infinity,
            child: CupertinoButton.filled(
              onPressed: onClear,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    CupertinoIcons.checkmark,
                    color: colorScheme.onPrimary,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '完成',
                    style: TextStyle(
                      color: colorScheme.onPrimary,
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.41,
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // 次要操作按钮 - 重试（如果有失败文件）
          if (failureCount > 0) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: CupertinoButton(
                onPressed: () {
                  // 重试失败的文件
                  for (final result in results) {
                    if (result.isError) {
                      onRetry?.call(result.filePath);
                    }
                  }
                },
                color: colorScheme.surfaceContainerLow,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      CupertinoIcons.refresh,
                      color: colorScheme.tertiary,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '重试失败文件 ($failureCount)',
                      style: TextStyle(
                        color: colorScheme.tertiary,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        letterSpacing: -0.32,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// 构建跨用户重复警告
  Widget _buildCrossUserDuplicateWarning(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    // 获取跨用户重复的结果信息
    final crossUserDuplicates = results
        .where((result) => result.isCrossUserDuplicate)
        .toList();

    if (crossUserDuplicates.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.tertiaryContainer,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.tertiary.withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 警告标题
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: colorScheme.tertiary.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  CupertinoIcons.exclamationmark_triangle_fill,
                  color: colorScheme.tertiary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '发现跨用户重复发票',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: colorScheme.onTertiaryContainer,
                        letterSpacing: -0.41,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '检测到 ${crossUserDuplicates.length} 张发票已被其他用户上传',
                      style: TextStyle(
                        fontSize: 14,
                        color: colorScheme.onTertiaryContainer,
                        letterSpacing: -0.23,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // 重复发票详情
          ...crossUserDuplicates.map((result) {
            final duplicateInfo = result.crossUserDuplicateInfo;
            if (duplicateInfo == null) return const SizedBox.shrink();
            
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: colorScheme.tertiary.withValues(alpha: 0.2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 文件名
                  Row(
                    children: [
                      Icon(
                        CupertinoIcons.doc_text,
                        color: colorScheme.tertiary,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          result.fileName,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                            letterSpacing: -0.23,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // 重复信息
                  _buildDuplicateInfoRow(
                    context,
                    '发票号码',
                    duplicateInfo.invoiceNumber,
                    CupertinoIcons.number,
                  ),
                  _buildDuplicateInfoRow(
                    context,
                    '原上传用户',
                    _maskEmail(duplicateInfo.originalUserEmail),
                    CupertinoIcons.person,
                  ),
                  _buildDuplicateInfoRow(
                    context,
                    '上传时间',
                    duplicateInfo.formattedUploadTime,
                    CupertinoIcons.clock,
                  ),
                  _buildDuplicateInfoRow(
                    context,
                    '相似度',
                    duplicateInfo.formattedSimilarityScore,
                    CupertinoIcons.chart_bar,
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // 建议
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: colorScheme.tertiary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              CupertinoIcons.lightbulb,
                              color: colorScheme.onTertiaryContainer,
                              size: 16,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '建议',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: colorScheme.onTertiaryContainer,
                                fontSize: 14,
                                letterSpacing: -0.23,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ...duplicateInfo.recommendations.map((recommendation) => 
                          Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Text(
                              '• $recommendation',
                              style: TextStyle(
                                color: colorScheme.onTertiaryContainer,
                                fontSize: 13,
                                letterSpacing: -0.08,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  /// 构建重复信息行
  Widget _buildDuplicateInfoRow(
    BuildContext context,
    String label,
    String value,
    IconData icon,
  ) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(
            icon,
            size: 16,
            color: colorScheme.tertiary,
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                color: colorScheme.onSurfaceVariant,
                letterSpacing: -0.23,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                letterSpacing: -0.23,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 邮箱地址脱敏处理
  String _maskEmail(String email) {
    final parts = email.split('@');
    if (parts.length != 2) return email;
    
    final username = parts[0];
    final domain = parts[1];
    
    if (username.length <= 2) {
      return '$username***@$domain';
    }
    
    final masked = '${username.substring(0, 2)}***${username.substring(username.length - 1)}';
    return '$masked@$domain';
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
