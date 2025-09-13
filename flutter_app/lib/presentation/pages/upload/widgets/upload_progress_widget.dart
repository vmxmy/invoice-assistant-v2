import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../bloc/upload_state.dart';
import '../utils/upload_config.dart';
import '../utils/upload_validator.dart';

/// 上传进度显示组件
class UploadProgressWidget extends StatelessWidget {
  final List<FileUploadProgress> progresses;
  final VoidCallback? onCancel;
  
  const UploadProgressWidget({
    super.key,
    required this.progresses,
    this.onCancel,
  });
  
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final config = UploadConfig.getScreenConfig(constraints.maxWidth);
        
        return Container(
          constraints: const BoxConstraints.expand(),
          padding: EdgeInsets.all(config.padding),
          child: Column(
            children: [
              // 头部信息
              _buildHeader(context, config),
              
              SizedBox(height: config.spacing),
              
              // 整体进度
              _buildOverallProgress(context, config),
              
              SizedBox(height: config.spacing * 1.5),
              
              // 文件列表
              Expanded(
                child: _buildFileList(context, config),
              ),
              
              if (onCancel != null) ...[
                SizedBox(height: config.spacing),
                _buildCancelButton(context, config),
              ],
            ],
          ),
        );
      },
    );
  }
  
  Widget _buildHeader(BuildContext context, UploadScreenConfig config) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    final completedCount = progresses.where((p) => p.isCompleted).length;
    final failedCount = progresses.where((p) => p.isFailed).length;
    final totalCount = progresses.length;
    
    return Row(
      children: [
        Container(
          width: config.iconSize * 1.5,
          height: config.iconSize * 1.5,
          decoration: BoxDecoration(
            color: colorScheme.primaryContainer,
            borderRadius: BorderRadius.circular(config.radius * 0.75),
          ),
          child: Icon(
            CupertinoIcons.cloud_upload,
            size: config.iconSize * 0.8,
            color: colorScheme.primary,
          ),
        ),
        
        SizedBox(width: config.spacing),
        
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '正在上传文件',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w600,
                ),
              ),
              
              Text(
                '已完成 $completedCount/$totalCount${failedCount > 0 ? '，失败 $failedCount' : ''}',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
  
  Widget _buildOverallProgress(BuildContext context, UploadScreenConfig config) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    final completedCount = progresses.where((p) => p.isCompleted).length;
    final totalCount = progresses.length;
    final overallProgress = totalCount > 0 ? completedCount / totalCount : 0.0;
    
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '整体进度',
              style: theme.textTheme.labelMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            Text(
              '${(overallProgress * 100).toInt()}%',
              style: theme.textTheme.labelMedium?.copyWith(
                color: colorScheme.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        
        SizedBox(height: config.spacing * 0.5),
        
        LinearProgressIndicator(
          value: overallProgress,
          backgroundColor: colorScheme.surfaceContainerHighest,
          valueColor: AlwaysStoppedAnimation<Color>(colorScheme.primary),
          minHeight: 6,
        ),
      ],
    );
  }
  
  Widget _buildFileList(BuildContext context, UploadScreenConfig config) {
    return ListView.separated(
      itemCount: progresses.length,
      separatorBuilder: (context, index) => SizedBox(height: config.spacing * 0.75),
      itemBuilder: (context, index) {
        final progress = progresses[index];
        return _buildFileProgressItem(context, config, progress);
      },
    );
  }
  
  Widget _buildFileProgressItem(
    BuildContext context,
    UploadScreenConfig config,
    FileUploadProgress progress,
  ) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return Container(
      padding: EdgeInsets.all(config.spacing),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(config.radius),
        border: progress.isFailed
            ? Border.all(color: colorScheme.error.withValues(alpha: 0.3))
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 文件信息行
          Row(
            children: [
              // 文件图标
              _buildFileIcon(context, progress),
              
              SizedBox(width: config.spacing),
              
              // 文件信息
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      progress.fileName,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    
                    Text(
                      _formatFileSize(progress.file),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              
              // 状态图标
              _buildStatusIcon(context, progress),
            ],
          ),
          
          SizedBox(height: config.spacing * 0.75),
          
          // 进度条或错误信息
          if (progress.isFailed)
            _buildErrorInfo(context, config, progress)
          else
            _buildProgressBar(context, config, progress),
        ],
      ),
    );
  }
  
  Widget _buildFileIcon(BuildContext context, FileUploadProgress progress) {
    final colorScheme = Theme.of(context).colorScheme;
    
    IconData iconData;
    Color iconColor;
    
    if (progress.isFailed) {
      iconData = CupertinoIcons.xmark_circle;
      iconColor = colorScheme.error;
    } else if (progress.isCompleted) {
      iconData = CupertinoIcons.checkmark_circle;
      iconColor = colorScheme.primary;
    } else if (UploadValidator.isImageFile(progress.file.path)) {
      iconData = CupertinoIcons.photo;
      iconColor = colorScheme.onSurfaceVariant;
    } else if (UploadValidator.isPdfFile(progress.file.path)) {
      iconData = CupertinoIcons.doc_text;
      iconColor = colorScheme.onSurfaceVariant;
    } else {
      iconData = CupertinoIcons.doc;
      iconColor = colorScheme.onSurfaceVariant;
    }
    
    return Icon(
      iconData,
      size: 24,
      color: iconColor,
    );
  }
  
  Widget _buildStatusIcon(BuildContext context, FileUploadProgress progress) {
    final colorScheme = Theme.of(context).colorScheme;
    
    if (progress.isCompleted) {
      return Icon(
        CupertinoIcons.checkmark_circle_fill,
        color: colorScheme.primary,
        size: 20,
      );
    } else if (progress.isFailed) {
      return Icon(
        CupertinoIcons.xmark_circle_fill,
        color: colorScheme.error,
        size: 20,
      );
    } else if (progress.isUploading) {
      return SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(colorScheme.primary),
        ),
      );
    } else {
      return Icon(
        CupertinoIcons.clock,
        color: colorScheme.onSurfaceVariant,
        size: 20,
      );
    }
  }
  
  Widget _buildProgressBar(
    BuildContext context,
    UploadScreenConfig config,
    FileUploadProgress progress,
  ) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              _getStatusText(progress),
              style: theme.textTheme.labelSmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            Text(
              '${(progress.progress * 100).toInt()}%',
              style: theme.textTheme.labelSmall?.copyWith(
                color: colorScheme.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        
        SizedBox(height: config.spacing * 0.25),
        
        LinearProgressIndicator(
          value: progress.progress,
          backgroundColor: colorScheme.surfaceContainerHighest,
          valueColor: AlwaysStoppedAnimation<Color>(colorScheme.primary),
          minHeight: 4,
        ),
      ],
    );
  }
  
  Widget _buildErrorInfo(
    BuildContext context,
    UploadScreenConfig config,
    FileUploadProgress progress,
  ) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return Container(
      padding: EdgeInsets.all(config.spacing * 0.75),
      decoration: BoxDecoration(
        color: colorScheme.errorContainer.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(config.radius * 0.75),
      ),
      child: Row(
        children: [
          Icon(
            CupertinoIcons.exclamationmark_triangle,
            size: 16,
            color: colorScheme.error,
          ),
          
          SizedBox(width: config.spacing * 0.5),
          
          Expanded(
            child: Text(
              progress.errorMessage ?? '上传失败',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.error,
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildCancelButton(BuildContext context, UploadScreenConfig config) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return SizedBox(
      width: double.infinity,
      child: CupertinoButton(
        onPressed: onCancel,
        color: colorScheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(config.radius),
        child: Text(
          '取消上传',
          style: theme.textTheme.labelLarge?.copyWith(
            color: colorScheme.onSurface,
          ),
        ),
      ),
    );
  }
  
  String _getStatusText(FileUploadProgress progress) {
    switch (progress.status) {
      case UploadStatus.pending:
        return '等待上传';
      case UploadStatus.uploading:
        return '正在上传';
      case UploadStatus.completed:
        return '上传完成';
      case UploadStatus.failed:
        return '上传失败';
    }
  }
  
  String _formatFileSize(File file) {
    try {
      final bytes = file.lengthSync();
      return UploadValidator.formatFileSize(bytes);
    } catch (e) {
      return '未知大小';
    }
  }
}