import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../bloc/upload_state.dart';

/// iOS风格的上传进度组件
/// 
/// 设计特点：
/// - 使用iOS原生进度指示器
/// - 清晰的进度展示和文件状态
/// - 流畅的动画过渡效果
/// - 符合iOS设计规范的布局和交互
/// - 支持显示上传进度和完成结果
class IOSUploadProgressWidget extends StatefulWidget {
  final List<File> files;
  final List<FileUploadProgress>? progresses;
  final List<UploadResult> completedResults; // 改为必需的实时结果列表
  final bool isCompleted;
  final VoidCallback? onCancel;
  final VoidCallback? onRetryFailed;
  final VoidCallback? onUploadMore;
  final VoidCallback? onClose;

  const IOSUploadProgressWidget({
    super.key,
    required this.files,
    this.progresses,
    required this.completedResults, // 现在是必需的
    this.isCompleted = false,
    this.onCancel,
    this.onRetryFailed,
    this.onUploadMore,
    this.onClose,
  });

  @override
  State<IOSUploadProgressWidget> createState() => _IOSUploadProgressWidgetState();
}

class _IOSUploadProgressWidgetState extends State<IOSUploadProgressWidget>
    with TickerProviderStateMixin {
  
  late AnimationController _progressController;
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _progressController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    
    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOut,
    );

    // 启动动画
    _fadeController.forward();
    if (!widget.isCompleted) {
      _progressController.repeat();
    }
  }

  @override
  void didUpdateWidget(IOSUploadProgressWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isCompleted && !oldWidget.isCompleted) {
      _progressController.stop();
      _progressController.reset();
    } else if (!widget.isCompleted && oldWidget.isCompleted) {
      _progressController.repeat();
    }
  }

  @override
  void dispose() {
    _progressController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: CustomScrollView(
        slivers: [
          // 标题和状态区域
          SliverToBoxAdapter(
            child: _buildHeader(),
          ),
          
          // 进度/结果概览卡片
          SliverToBoxAdapter(
            child: _buildOverviewCard(),
          ),
          
          // 文件详细列表
          SliverToBoxAdapter(
            child: _buildFilesList(),
          ),
          
          // 操作按钮区域
          SliverToBoxAdapter(
            child: _buildActionButtons(),
          ),
          
          // 底部间距
          const SliverToBoxAdapter(
            child: SizedBox(height: 32),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.isCompleted ? '上传完成' : '正在上传',
            style: CupertinoTheme.of(context).textTheme.navLargeTitleTextStyle.copyWith(
              fontSize: 28,
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurface,
            ),
          ),
          
          const SizedBox(height: 8),
          
          Text(
            _getStatusDescription(),
            style: TextStyle(
              fontSize: 16,
              color: colorScheme.onSurface.withValues(alpha: 0.7),
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  String _getStatusDescription() {
    final successCount = widget.completedResults.where((r) => r.success).length;
    final failedCount = widget.completedResults.where((r) => !r.success).length;
    final totalCount = widget.files.length;
    
    if (widget.isCompleted) {
      if (successCount == totalCount) {
        return '所有文件都已成功上传';
      } else {
        return '成功上传 $successCount 个文件，失败 $failedCount 个文件';
      }
    } else {
      if (widget.completedResults.isNotEmpty) {
        return '已完成 ${widget.completedResults.length} / $totalCount 个文件';
      }
      return '请稍候，文件正在上传中...';
    }
  }

  Widget _buildOverviewCard() {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Container(
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: colorScheme.shadow.withValues(alpha: 0.1),
              offset: const Offset(0, 2),
              blurRadius: 12,
              spreadRadius: 0,
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              // 主要图标和进度
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: colorScheme.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: widget.isCompleted 
                  ? Icon(
                      _getOverallStatusIcon(),
                      size: 40,
                      color: _getOverallStatusColor(),
                    )
                  : Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          width: 40,
                          height: 40,
                          child: CircularProgressIndicator(
                            color: colorScheme.primary,
                            strokeWidth: 3,
                          ),
                        ),
                        Icon(
                          CupertinoIcons.cloud_upload,
                          size: 24,
                          color: colorScheme.primary,
                        ),
                      ],
                    ),
              ),
              
              const SizedBox(height: 16),
              
              // 主要文本
              Text(
                _getOverviewText(),
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurface,
                ),
              ),
              
              const SizedBox(height: 8),
              
              // 副标题文本
              Text(
                _getOverviewSubtext(),
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: colorScheme.onSurface.withValues(alpha: 0.7),
                  height: 1.4,
                ),
              ),
              
              if (!widget.isCompleted && widget.progresses != null) ...[
                const SizedBox(height: 16),
                _buildOverallProgress(),
              ],
            ],
          ),
        ),
      ),
    );
  }

  IconData _getOverallStatusIcon() {
    if (!widget.isCompleted) {
      return CupertinoIcons.cloud_upload; // 上传中显示上传图标
    }
    
    final hasFailures = widget.completedResults.any((r) => !r.success);
    if (hasFailures) {
      final hasSuccesses = widget.completedResults.any((r) => r.success);
      return hasSuccesses 
        ? CupertinoIcons.exclamationmark_triangle_fill
        : CupertinoIcons.xmark_circle_fill;
    }
    return CupertinoIcons.checkmark_circle_fill;
  }

  Color _getOverallStatusColor() {
    final colorScheme = Theme.of(context).colorScheme;
    
    if (!widget.isCompleted) {
      return colorScheme.primary; // 上传中显示主色
    }
    
    final hasFailures = widget.completedResults.any((r) => !r.success);
    if (hasFailures) {
      final hasSuccesses = widget.completedResults.any((r) => r.success);
      return hasSuccesses ? Colors.orange : colorScheme.error;
    }
    return Colors.green;
  }

  String _getOverviewText() {
    if (!widget.isCompleted) {
      return '正在上传文件';
    }
    
    final hasFailures = widget.completedResults.any((r) => !r.success);
    if (hasFailures) {
      final hasSuccesses = widget.completedResults.any((r) => r.success);
      return hasSuccesses ? '部分文件上传失败' : '上传失败';
    }
    return '全部上传成功';
  }

  String _getOverviewSubtext() {
    final totalCount = widget.files.length;
    final completedCount = widget.completedResults.length;
    final successCount = widget.completedResults.where((r) => r.success).length;
    final failedCount = widget.completedResults.where((r) => !r.success).length;
    
    if (!widget.isCompleted) {
      if (completedCount > 0) {
        return '已完成 $completedCount / $totalCount 个文件';
      }
      return '请保持网络连接';
    }
    
    if (successCount == totalCount) {
      return '所有 $totalCount 个文件都已成功处理';
    } else {
      return '成功 $successCount 个，失败 $failedCount 个';
    }
  }

  Widget _buildOverallProgress() {
    final colorScheme = Theme.of(context).colorScheme;
    
    if (widget.progresses == null) return const SizedBox.shrink();
    
    final totalProgress = widget.progresses!.fold<double>(0.0, (sum, p) => sum + p.progress) / widget.progresses!.length;
    
    return Column(
      children: [
        LinearProgressIndicator(
          value: totalProgress,
          backgroundColor: colorScheme.surfaceContainerHighest,
          valueColor: AlwaysStoppedAnimation<Color>(colorScheme.primary),
          minHeight: 6,
        ),
        const SizedBox(height: 8),
        Text(
          '${(totalProgress * 100).toInt()}%',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: colorScheme.primary,
          ),
        ),
      ],
    );
  }

  Widget _buildFilesList() {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '文件详情',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurface,
            ),
          ),
          
          const SizedBox(height: 12),
          
          Container(
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: widget.isCompleted && widget.completedResults.any((r) => !r.success)
                ? Border.all(color: colorScheme.error.withValues(alpha: 0.3), width: 1)
                : null,
              boxShadow: [
                BoxShadow(
                  color: colorScheme.shadow.withValues(alpha: 0.1),
                  offset: const Offset(0, 1),
                  blurRadius: 8,
                  spreadRadius: 0,
                ),
              ],
            ),
            child: Column(
              children: [
                for (int i = 0; i < widget.files.length; i++) ...[
                  _buildFileItem(widget.files[i], i),
                  if (i < widget.files.length - 1)
                    Container(
                      height: 0.5,
                      color: CupertinoColors.separator,
                      margin: const EdgeInsets.only(left: 60),
                    ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFileItem(File file, int index) {
    final colorScheme = Theme.of(context).colorScheme;
    final fileName = file.path.split('/').last;
    final fileSize = _formatFileSize(file);
    final isImage = _isImageFile(fileName);
    
    // 检查该文件是否有完成的结果
    UploadResult? completedResult;
    try {
      completedResult = widget.completedResults.firstWhere((r) => r.index == index);
    } catch (e) {
      completedResult = null;
    }
    
    // 确定状态和颜色
    Color iconColor;
    IconData statusIcon;
    String statusText;
    bool showProgress = false;
    
    if (completedResult != null) {
      // 文件已完成（成功或失败）
      if (completedResult.success) {
        iconColor = Colors.green;
        statusIcon = CupertinoIcons.checkmark_circle_fill;
        statusText = '上传成功';
      } else {
        iconColor = colorScheme.error;
        statusIcon = CupertinoIcons.xmark_circle_fill;
        statusText = completedResult.errorMessage ?? '上传失败';
      }
    } else {
      // 文件还未完成 - 显示进度或等待状态
      iconColor = isImage ? Colors.green : colorScheme.primary;
      statusIcon = isImage ? CupertinoIcons.photo : CupertinoIcons.doc_text;
      
      if (widget.progresses != null && index < widget.progresses!.length) {
        final progress = widget.progresses![index];
        if (progress.progress > 0) {
          statusText = '${(progress.progress * 100).toInt()}%';
          showProgress = true;
        } else {
          statusText = '等待中...';
        }
      } else {
        statusText = '等待中...';
      }
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          // 文件图标
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: completedResult != null && !completedResult.success
                ? colorScheme.error.withValues(alpha: 0.1)
                : iconColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              statusIcon,
              size: 20,
              color: iconColor,
            ),
          ),
          
          const SizedBox(width: 12),
          
          // 文件信息
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fileName,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: colorScheme.onSurface,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                
                const SizedBox(height: 2),
                
                Text(
                  fileSize,
                  style: TextStyle(
                    fontSize: 14,
                    color: colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(width: 12),
          
          // 状态信息
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (showProgress && widget.progresses != null && index < widget.progresses!.length) ...[
                // 显示进度指示器
                SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    value: widget.progresses![index].progress,
                    strokeWidth: 2,
                    color: Colors.green,
                    backgroundColor: colorScheme.surfaceContainerHighest,
                  ),
                ),
                const SizedBox(height: 4),
              ] else if (completedResult != null) ...[
                // 显示完成状态图标
                Icon(
                  statusIcon,
                  size: 20,
                  color: iconColor,
                ),
                const SizedBox(height: 4),
              ],
              
              Text(
                statusText,
                style: TextStyle(
                  fontSize: 12,
                  color: completedResult != null && !completedResult.success
                    ? colorScheme.error
                    : colorScheme.onSurface.withValues(alpha: 0.7),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Column(
        children: [
          if (!widget.isCompleted) ...[
            // 取消按钮（上传中）
            SizedBox(
              width: double.infinity,
              child: CupertinoButton(
                onPressed: widget.onCancel,
                color: colorScheme.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      CupertinoIcons.stop_circle,
                      size: 18,
                      color: colorScheme.error,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '取消上传',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.error,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            // 已完成状态的按钮
            if (widget.completedResults.any((r) => !r.success) && widget.onRetryFailed != null) ...[
              SizedBox(
                width: double.infinity,
                child: CupertinoButton(
                  onPressed: widget.onRetryFailed,
                  color: Colors.orange.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        CupertinoIcons.refresh,
                        size: 18,
                        color: Colors.orange,
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        '重试失败项',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.orange,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
            
            Row(
              children: [
                // 继续上传按钮
                if (widget.onUploadMore != null)
                  Expanded(
                    child: CupertinoButton(
                      onPressed: widget.onUploadMore,
                      color: colorScheme.primary,
                      borderRadius: BorderRadius.circular(12),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: const Text(
                        '继续上传',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: CupertinoColors.white,
                        ),
                      ),
                    ),
                  ),
                
                if (widget.onUploadMore != null && widget.onClose != null)
                  const SizedBox(width: 12),
                
                // 完成按钮
                if (widget.onClose != null)
                  Expanded(
                    child: CupertinoButton(
                      onPressed: widget.onClose,
                      color: colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(12),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Text(
                        '完成',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: colorScheme.onSurface,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  String _formatFileSize(File file) {
    try {
      final bytes = file.lengthSync();
      if (bytes < 1024) {
        return '${bytes}B';
      } else if (bytes < 1024 * 1024) {
        return '${(bytes / 1024).toStringAsFixed(1)}KB';
      } else {
        return '${(bytes / (1024 * 1024)).toStringAsFixed(1)}MB';
      }
    } catch (e) {
      return '未知大小';
    }
  }

  bool _isImageFile(String fileName) {
    final ext = fileName.toLowerCase().split('.').last;
    return ['jpg', 'jpeg', 'png', 'webp'].contains(ext);
  }
}