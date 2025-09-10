import 'package:flutter/material.dart';
import '../bloc/invoice_state.dart';

/// 上传进度显示组件
class UploadProgressWidget extends StatelessWidget {
  final List<UploadProgress> progresses;
  final int completedCount;
  final int totalCount;

  const UploadProgressWidget({
    super.key,
    required this.progresses,
    required this.completedCount,
    required this.totalCount,
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.1),
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
                Icons.cloud_upload,
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
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '$completedCount / $totalCount 完成',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                '${(overallProgress * 100).toInt()}%',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).primaryColor,
                ),
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
              backgroundColor: Colors.grey.shade200,
              valueColor: AlwaysStoppedAnimation<Color>(
                Theme.of(context).primaryColor,
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _getStageColor(progress.stage).withValues(alpha: 0.2),
        ),
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
                        color: _getStageColor(progress.stage),
                      ),
                    ),
                  ],
                ),
              ),
              
              // 状态图标和进度
              _buildStageIcon(progress.stage),
              const SizedBox(width: 8),
              if (!progress.isCompleted) ...[
                SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    value: progress.progress,
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      _getStageColor(progress.stage),
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
                backgroundColor: Colors.grey.shade200,
                valueColor: AlwaysStoppedAnimation<Color>(
                  _getStageColor(progress.stage),
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
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 16,
                    color: Colors.red.shade600,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      progress.error!,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.red.shade600,
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
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.info_outline,
                color: Colors.blue.shade600,
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                '处理流程',
                style: TextStyle(
                  fontWeight: FontWeight.w500,
                  color: Colors.blue.shade700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '计算哈希 → 检查重复 → 上传文件 → OCR识别 → 保存数据',
            style: TextStyle(
              fontSize: 12,
              color: Colors.blue.shade600,
            ),
          ),
        ],
      ),
    );
  }

  /// 构建阶段图标
  Widget _buildStageIcon(UploadStage stage) {
    IconData icon;
    Color color = _getStageColor(stage);

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
  Color _getStageColor(UploadStage stage) {
    switch (stage) {
      case UploadStage.preparing:
        return Colors.grey;
      case UploadStage.hashing:
        return Colors.blue;
      case UploadStage.uploading:
        return Colors.orange;
      case UploadStage.processing:
        return Colors.purple;
      case UploadStage.success:
        return Colors.green;
      case UploadStage.duplicate:
        return Colors.amber;
      case UploadStage.error:
        return Colors.red;
    }
  }
}