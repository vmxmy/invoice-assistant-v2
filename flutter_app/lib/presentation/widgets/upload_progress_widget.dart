import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../bloc/invoice_state.dart';
import 'unified_bottom_sheet.dart';

/// 上传进度显示组件
class UploadProgressWidget extends StatelessWidget {
  final List<UploadProgress> progresses;
  final int completedCount;
  final int totalCount;
  final VoidCallback? onCancel;

  const UploadProgressWidget({
    super.key,
    required this.progresses,
    required this.completedCount,
    required this.totalCount,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // 总体进度
        _buildOverallProgress(context),
        const SizedBox(height: 24),

        // 文件列表进度
        Expanded(
          child: _buildFileProgressList(context),
        ),

        // 处理说明
        _buildProcessDescription(context),
      ],
    );
  }

  /// 构建总体进度
  Widget _buildOverallProgress(BuildContext context) {
    final overallProgress = totalCount > 0 ? completedCount / totalCount : 0.0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).colorScheme.shadow.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Icon(
                CupertinoIcons.cloud_upload,
                color: Theme.of(context).primaryColor,
                size: 28,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '正在处理文件...',
                      style:
                          Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                    ),
                    Text(
                      '$completedCount / $totalCount 完成',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                    ),
                  ],
                ),
              ),
              Column(
                children: [
                  Text(
                    '${(overallProgress * 100).toInt()}%',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).primaryColor,
                        ),
                  ),
                  if (onCancel != null) ...[
                    const SizedBox(height: 8),
                    SizedBox(
                      width: 32,
                      height: 32,
                      child: IconButton(
                        onPressed: () => _showCancelConfirmDialog(context),
                        icon: const Icon(CupertinoIcons.xmark, size: 18),
                        style: IconButton.styleFrom(
                          backgroundColor: Theme.of(context)
                              .colorScheme
                              .error
                              .withValues(alpha: 0.1),
                          foregroundColor: Theme.of(context).colorScheme.error,
                        ),
                        tooltip: '取消上传',
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          // 总体进度条
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: overallProgress,
              minHeight: 8,
              backgroundColor:
                  Theme.of(context).colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation<Color>(
                Theme.of(context).colorScheme.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 构建文件进度列表
  Widget _buildFileProgressList(BuildContext context) {
    return ListView.builder(
      itemCount: progresses.length,
      itemBuilder: (context, index) {
        final progress = progresses[index];
        return _buildFileProgressItem(context, progress);
      },
    );
  }

  /// 构建单个文件进度项
  Widget _buildFileProgressItem(BuildContext context, UploadProgress progress) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _getStageColor(context, progress.stage).withValues(alpha: 0.2),
        ),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).colorScheme.shadow.withValues(alpha: 0.05),
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
                color: Theme.of(context).colorScheme.error,
                size: 24,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      progress.fileName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      progress.message ?? progress.stage.displayName,
                      style: TextStyle(
                        fontSize: 12,
                        color: _getStageColor(context, progress.stage),
                      ),
                    ),
                  ],
                ),
              ),

              // 状态图标和进度
              _buildStageIcon(context, progress.stage),
              const SizedBox(width: 8),
              if (!progress.isCompleted) ...[
                SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    value: progress.progress,
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      _getStageColor(context, progress.stage),
                    ),
                  ),
                ),
              ],
            ],
          ),

          const SizedBox(height: 12),

          // 进度条
          if (!progress.isCompleted) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress.progress,
                minHeight: 6,
                backgroundColor:
                    Theme.of(context).colorScheme.surfaceContainerHighest,
                valueColor: AlwaysStoppedAnimation<Color>(
                  _getStageColor(context, progress.stage),
                ),
              ),
            ),
          ],

          // 错误信息
          if (progress.error != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                    color: Theme.of(context)
                        .colorScheme
                        .error
                        .withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 16,
                    color: Theme.of(context).colorScheme.onErrorContainer,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      progress.error!,
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onErrorContainer,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// 构建处理流程说明
  Widget _buildProcessDescription(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color:
                Theme.of(context).colorScheme.primary.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.info_outline,
                color: Theme.of(context).colorScheme.onPrimaryContainer,
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                '处理流程',
                style: TextStyle(
                  fontWeight: FontWeight.w500,
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '计算哈希 → 检查重复 → 上传文件 → OCR识别 → 保存数据',
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).colorScheme.onPrimaryContainer,
            ),
          ),
        ],
      ),
    );
  }

  /// 构建阶段图标
  Widget _buildStageIcon(BuildContext context, UploadStage stage) {
    IconData icon;
    Color color = _getStageColor(context, stage);

    switch (stage) {
      case UploadStage.preparing:
        icon = Icons.hourglass_empty;
        break;
      case UploadStage.hashing:
        icon = Icons.tag;
        break;
      case UploadStage.uploading:
        icon = Icons.cloud_upload;
        break;
      case UploadStage.processing:
        icon = Icons.text_fields;
        break;
      case UploadStage.success:
        icon = Icons.check_circle;
        break;
      case UploadStage.duplicate:
        icon = Icons.content_copy;
        break;
      case UploadStage.error:
        icon = Icons.error;
        break;
    }

    return Icon(icon, color: color, size: 20);
  }

  /// 获取阶段颜色
  Color _getStageColor(BuildContext context, UploadStage stage) {
    final colorScheme = Theme.of(context).colorScheme;

    switch (stage) {
      case UploadStage.preparing:
        return colorScheme.onSurfaceVariant;
      case UploadStage.hashing:
        return colorScheme.primary;
      case UploadStage.uploading:
        return colorScheme.tertiary;
      case UploadStage.processing:
        return colorScheme.secondary;
      case UploadStage.success:
        return colorScheme.primary;
      case UploadStage.duplicate:
        return colorScheme.tertiary;
      case UploadStage.error:
        return colorScheme.error;
    }
  }

  /// 显示取消确认对话框
  void _showCancelConfirmDialog(BuildContext context) {
    UnifiedBottomSheet.showConfirmDialog(
      context: context,
      title: '取消上传',
      content: '确定要取消当前的上传任务吗？\n\n已上传的文件将会保留，未完成的文件将停止处理。',
      confirmText: '确认取消',
      cancelText: '继续上传',
      icon: Icons.warning_amber_outlined,
      confirmColor: Theme.of(context).colorScheme.error,
    ).then((confirmed) {
      if (confirmed == true) {
        onCancel?.call();
      }
    });
  }
}
