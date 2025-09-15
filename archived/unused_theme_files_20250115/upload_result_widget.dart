import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../bloc/upload_state.dart';
import '../utils/upload_config.dart';
import '../utils/upload_validator.dart';

/// 上传结果展示组件
class UploadResultWidget extends StatelessWidget {
  final List<UploadResult> results;
  final VoidCallback? onRetryFailed;
  final VoidCallback? onUploadMore;
  final VoidCallback? onClose;
  
  const UploadResultWidget({
    super.key,
    required this.results,
    this.onRetryFailed,
    this.onUploadMore,
    this.onClose,
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
              // 头部总结
              _buildHeader(context, config),
              
              SizedBox(height: config.spacing * 1.5),
              
              // 统计卡片
              _buildStatsCards(context, config),
              
              SizedBox(height: config.spacing * 1.5),
              
              // 结果列表
              Expanded(
                child: _buildResultsList(context, config),
              ),
              
              SizedBox(height: config.spacing),
              
              // 操作按钮
              _buildActionButtons(context, config),
            ],
          ),
        );
      },
    );
  }
  
  Widget _buildHeader(BuildContext context, UploadScreenConfig config) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    final successCount = results.where((r) => r.success).length;
    final totalCount = results.length;
    final hasFailures = successCount < totalCount;
    
    return Row(
      children: [
        // 状态图标
        Container(
          width: config.iconSize * 2,
          height: config.iconSize * 2,
          decoration: BoxDecoration(
            color: hasFailures
                ? colorScheme.errorContainer
                : colorScheme.primaryContainer,
            borderRadius: BorderRadius.circular(config.radius),
          ),
          child: Icon(
            hasFailures
                ? CupertinoIcons.exclamationmark_circle
                : CupertinoIcons.checkmark_circle,
            size: config.iconSize,
            color: hasFailures ? colorScheme.error : colorScheme.primary,
          ),
        ),
        
        SizedBox(width: config.spacing),
        
        // 标题信息
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                hasFailures ? '上传部分完成' : '上传完成',
                style: theme.textTheme.titleLarge?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.bold,
                ),
              ),
              
              Text(
                hasFailures
                    ? '成功 $successCount 个，失败 ${totalCount - successCount} 个'
                    : '全部 $totalCount 个文件上传成功',
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
  
  Widget _buildStatsCards(BuildContext context, UploadScreenConfig config) {
    final successCount = results.where((r) => r.success).length;
    final failedCount = results.length - successCount;
    
    return Row(
      children: [
        // 成功统计
        Expanded(
          child: _buildStatCard(
            context,
            config,
            title: '成功',
            count: successCount,
            icon: CupertinoIcons.checkmark_circle,
            isSuccess: true,
          ),
        ),
        
        SizedBox(width: config.spacing),
        
        // 失败统计
        Expanded(
          child: _buildStatCard(
            context,
            config,
            title: '失败',
            count: failedCount,
            icon: CupertinoIcons.xmark_circle,
            isSuccess: false,
          ),
        ),
      ],
    );
  }
  
  Widget _buildStatCard(
    BuildContext context,
    UploadScreenConfig config, {
    required String title,
    required int count,
    required IconData icon,
    required bool isSuccess,
  }) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final color = isSuccess ? colorScheme.primary : colorScheme.error;
    final backgroundColor = isSuccess
        ? colorScheme.primaryContainer
        : colorScheme.errorContainer;
    
    return Container(
      padding: EdgeInsets.all(config.padding),
      decoration: BoxDecoration(
        color: backgroundColor.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(config.radius),
        border: Border.all(
          color: color.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            size: config.iconSize,
            color: color,
          ),
          
          SizedBox(height: config.spacing * 0.5),
          
          Text(
            count.toString(),
            style: theme.textTheme.headlineSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.bold,
            ),
          ),
          
          Text(
            title,
            style: theme.textTheme.labelMedium?.copyWith(
              color: color,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildResultsList(BuildContext context, UploadScreenConfig config) {
    return ListView.separated(
      itemCount: results.length,
      separatorBuilder: (context, index) => SizedBox(height: config.spacing * 0.75),
      itemBuilder: (context, index) {
        final result = results[index];
        return _buildResultItem(context, config, result);
      },
    );
  }
  
  Widget _buildResultItem(
    BuildContext context,
    UploadScreenConfig config,
    UploadResult result,
  ) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return Container(
      padding: EdgeInsets.all(config.padding),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(config.radius),
        border: result.success
            ? Border.all(color: colorScheme.primary.withValues(alpha: 0.2))
            : Border.all(color: colorScheme.error.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 文件信息行
          Row(
            children: [
              // 文件图标
              _buildFileIcon(context, result),
              
              SizedBox(width: config.spacing),
              
              // 文件信息
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      result.fileName,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    
                    Row(
                      children: [
                        Text(
                          _formatFileSize(result.file),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                        
                        Text(
                          ' • ${_formatUploadTime(result.uploadTime)}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              // 状态图标
              _buildStatusIcon(context, result),
            ],
          ),
          
          // 错误信息（如果有）
          if (!result.success && result.errorMessage != null) ...[
            SizedBox(height: config.spacing * 0.75),
            _buildErrorMessage(context, config, result.errorMessage!),
          ],
        ],
      ),
    );
  }
  
  Widget _buildFileIcon(BuildContext context, UploadResult result) {
    final colorScheme = Theme.of(context).colorScheme;
    
    IconData iconData;
    if (UploadValidator.isImageFile(result.file.path)) {
      iconData = CupertinoIcons.photo;
    } else if (UploadValidator.isPdfFile(result.file.path)) {
      iconData = CupertinoIcons.doc_text;
    } else {
      iconData = CupertinoIcons.doc;
    }
    
    return Icon(
      iconData,
      size: 28,
      color: colorScheme.onSurfaceVariant,
    );
  }
  
  Widget _buildStatusIcon(BuildContext context, UploadResult result) {
    final colorScheme = Theme.of(context).colorScheme;
    
    if (result.success) {
      return Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: colorScheme.primaryContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(
          CupertinoIcons.checkmark,
          color: colorScheme.primary,
          size: 16,
        ),
      );
    } else {
      return Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: colorScheme.errorContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(
          CupertinoIcons.xmark,
          color: colorScheme.error,
          size: 16,
        ),
      );
    }
  }
  
  Widget _buildErrorMessage(
    BuildContext context,
    UploadScreenConfig config,
    String errorMessage,
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
            CupertinoIcons.info_circle,
            size: 16,
            color: colorScheme.error,
          ),
          
          SizedBox(width: config.spacing * 0.5),
          
          Expanded(
            child: Text(
              errorMessage,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.error,
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildActionButtons(BuildContext context, UploadScreenConfig config) {
    final hasFailures = results.any((r) => !r.success);
    
    return Column(
      children: [
        // 主操作按钮
        Row(
          children: [
            if (hasFailures && onRetryFailed != null) ...[
              Expanded(
                child: _buildActionButton(
                  context,
                  config,
                  title: '重试失败',
                  icon: CupertinoIcons.refresh,
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    onRetryFailed?.call();
                  },
                  isPrimary: true,
                ),
              ),
              
              SizedBox(width: config.spacing),
            ],
            
            Expanded(
              child: _buildActionButton(
                context,
                config,
                title: '继续上传',
                icon: CupertinoIcons.plus,
                onPressed: () {
                  HapticFeedback.lightImpact();
                  onUploadMore?.call();
                },
                isPrimary: !hasFailures,
              ),
            ),
          ],
        ),
        
        if (onClose != null) ...[
          SizedBox(height: config.spacing * 0.75),
          
          SizedBox(
            width: double.infinity,
            child: _buildActionButton(
              context,
              config,
              title: '完成',
              icon: CupertinoIcons.checkmark,
              onPressed: () {
                HapticFeedback.lightImpact();
                onClose?.call();
              },
              isPrimary: false,
            ),
          ),
        ],
      ],
    );
  }
  
  Widget _buildActionButton(
    BuildContext context,
    UploadScreenConfig config, {
    required String title,
    required IconData icon,
    required VoidCallback onPressed,
    required bool isPrimary,
  }) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return CupertinoButton(
      onPressed: onPressed,
      color: isPrimary ? colorScheme.primary : colorScheme.surfaceContainerHigh,
      borderRadius: BorderRadius.circular(config.radius),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 18,
            color: isPrimary ? colorScheme.onPrimary : colorScheme.onSurface,
          ),
          
          const SizedBox(width: 8),
          
          Text(
            title,
            style: theme.textTheme.labelLarge?.copyWith(
              color: isPrimary ? colorScheme.onPrimary : colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
  
  String _formatFileSize(File file) {
    try {
      final bytes = file.lengthSync();
      return UploadValidator.formatFileSize(bytes);
    } catch (e) {
      return '未知大小';
    }
  }
  
  String _formatUploadTime(DateTime uploadTime) {
    final now = DateTime.now();
    final difference = now.difference(uploadTime);
    
    if (difference.inSeconds < 60) {
      return '刚刚';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}分钟前';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}小时前';
    } else {
      return '${uploadTime.month}月${uploadTime.day}日';
    }
  }
}