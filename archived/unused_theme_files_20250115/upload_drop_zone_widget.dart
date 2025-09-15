import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../utils/upload_config.dart';

/// 文件拖放区域组件
class UploadDropZoneWidget extends StatefulWidget {
  final List<File> selectedFiles;
  final VoidCallback onTap;
  final ValueChanged<List<String>>? onFilesDropped;
  final String? validationError;
  
  const UploadDropZoneWidget({
    super.key,
    required this.selectedFiles,
    required this.onTap,
    this.onFilesDropped,
    this.validationError,
  });
  
  @override
  State<UploadDropZoneWidget> createState() => _UploadDropZoneWidgetState();
}

class _UploadDropZoneWidgetState extends State<UploadDropZoneWidget>
    with SingleTickerProviderStateMixin {
  bool _isDragging = false;
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  
  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: UploadConfig.animationDuration,
      vsync: this,
    );
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 1.05,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));
  }
  
  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final config = UploadConfig.getScreenConfig(constraints.maxWidth);
        
        return AnimatedBuilder(
          animation: _scaleAnimation,
          builder: (context, child) {
            return Transform.scale(
              scale: _scaleAnimation.value,
              child: DragTarget<List<String>>(
                onWillAcceptWithDetails: (details) {
                  if (mounted) {
                    setState(() => _isDragging = true);
                    _animationController.forward();
                    HapticFeedback.selectionClick();
                  }
                  return widget.onFilesDropped != null;
                },
                onLeave: (data) {
                  if (mounted) {
                    setState(() => _isDragging = false);
                    _animationController.reverse();
                  }
                },
                onAcceptWithDetails: (details) {
                  if (mounted) {
                    setState(() => _isDragging = false);
                    _animationController.reverse();
                    HapticFeedback.lightImpact();
                    widget.onFilesDropped?.call(details.data);
                  }
                },
                builder: (context, candidateData, rejectedData) {
                  return _buildDropZone(context, config);
                },
              ),
            );
          },
        );
      },
    );
  }
  
  Widget _buildDropZone(BuildContext context, UploadScreenConfig config) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    // 确定状态颜色
    Color borderColor;
    Color backgroundColor;
    
    if (widget.validationError != null) {
      borderColor = colorScheme.error;
      backgroundColor = colorScheme.errorContainer.withValues(alpha: 0.1);
    } else if (_isDragging) {
      borderColor = colorScheme.primary;
      backgroundColor = colorScheme.primaryContainer.withValues(alpha: 0.2);
    } else {
      borderColor = colorScheme.outline;
      backgroundColor = colorScheme.surfaceContainerLow;
    }
    
    return Container(
      constraints: const BoxConstraints.expand(),
      decoration: BoxDecoration(
        color: backgroundColor,
        border: Border.all(
          color: borderColor,
          width: _isDragging ? 2 : 1,
        ),
        borderRadius: BorderRadius.circular(config.radius),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: widget.onTap,
          borderRadius: BorderRadius.circular(config.radius),
          child: Padding(
            padding: EdgeInsets.all(config.padding),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // 图标区域
                _buildIconSection(context, config),
                
                SizedBox(height: config.spacing * 2),
                
                // 文本区域
                _buildTextSection(context, config),
                
                if (widget.selectedFiles.isNotEmpty) ...[
                  SizedBox(height: config.spacing * 2),
                  _buildFileList(context, config),
                ],
                
                if (widget.validationError != null) ...[
                  SizedBox(height: config.spacing),
                  _buildErrorMessage(context, config),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
  
  Widget _buildIconSection(BuildContext context, UploadScreenConfig config) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Container(
      width: config.iconSize * 2.5,
      height: config.iconSize * 2.5,
      decoration: BoxDecoration(
        color: _isDragging
            ? colorScheme.primary.withValues(alpha: 0.2)
            : colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(config.radius),
      ),
      child: Icon(
        CupertinoIcons.cloud_upload,
        size: config.iconSize,
        color: colorScheme.primary,
      ),
    );
  }
  
  Widget _buildTextSection(BuildContext context, UploadScreenConfig config) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return Column(
      children: [
        Text(
          _isDragging ? '释放文件开始上传' : '点击选择文件或拖拽到此处',
          style: theme.textTheme.titleMedium?.copyWith(
            color: colorScheme.onSurface,
            fontWeight: FontWeight.w600,
          ),
          textAlign: TextAlign.center,
        ),
        
        SizedBox(height: config.spacing * 0.5),
        
        Text(
          '支持 PDF、JPG、PNG、WebP 格式\n单个文件最大 ${UploadConfig.maxFileSize ~/ (1024 * 1024)}MB，最多 ${UploadConfig.maxFileCount} 个文件',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
  
  Widget _buildFileList(BuildContext context, UploadScreenConfig config) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return Container(
      padding: EdgeInsets.all(config.spacing),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(config.radius * 0.75),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '已选择文件 (${widget.selectedFiles.length})',
            style: theme.textTheme.labelMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w500,
            ),
          ),
          
          SizedBox(height: config.spacing * 0.5),
          
          ...widget.selectedFiles.take(3).map((file) {
            final fileName = file.path.split('/').last;
            return Padding(
              padding: EdgeInsets.only(bottom: config.spacing * 0.25),
              child: Row(
                children: [
                  Icon(
                    _getFileIcon(fileName),
                    size: 16,
                    color: colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      fileName,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            );
          }),
          
          if (widget.selectedFiles.length > 3)
            Text(
              '... 还有 ${widget.selectedFiles.length - 3} 个文件',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
        ],
      ),
    );
  }
  
  Widget _buildErrorMessage(BuildContext context, UploadScreenConfig config) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return Container(
      padding: EdgeInsets.all(config.spacing * 0.75),
      decoration: BoxDecoration(
        color: colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(config.radius * 0.75),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            CupertinoIcons.exclamationmark_triangle,
            size: 16,
            color: colorScheme.error,
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              widget.validationError!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.error,
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  IconData _getFileIcon(String fileName) {
    final extension = fileName.split('.').last.toLowerCase();
    switch (extension) {
      case 'pdf':
        return CupertinoIcons.doc_text;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        return CupertinoIcons.photo;
      default:
        return CupertinoIcons.doc;
    }
  }
}