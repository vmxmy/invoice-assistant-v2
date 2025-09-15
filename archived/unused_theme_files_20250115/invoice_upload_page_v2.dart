import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:file_picker/file_picker.dart';
import '../../../core/di/injection_container.dart';
import '../../utils/cupertino_notification_utils.dart';
import 'bloc/upload_bloc.dart';
import 'bloc/upload_event.dart';
import 'bloc/upload_state.dart';
import 'widgets/upload_drop_zone_widget.dart';
import 'widgets/upload_progress_widget.dart';
import 'widgets/upload_result_widget.dart';
import 'utils/upload_config.dart';

/// 发票上传页面 V2 - 全新架构实现
class InvoiceUploadPageV2 extends StatelessWidget {
  const InvoiceUploadPageV2({super.key});
  
  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => UploadBloc(
        uploadUseCase: sl(),
        eventBus: sl(),
      ),
      child: const _UploadPageContent(),
    );
  }
}

class _UploadPageContent extends StatelessWidget {
  const _UploadPageContent();
  
  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      navigationBar: _buildNavigationBar(context),
      child: SafeArea(
        child: BlocConsumer<UploadBloc, UploadState>(
          listener: _handleStateChanges,
          builder: _buildBody,
        ),
      ),
    );
  }
  
  CupertinoNavigationBar _buildNavigationBar(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return CupertinoNavigationBar(
      backgroundColor: colorScheme.surface,
      border: Border(
        bottom: BorderSide(
          color: colorScheme.outlineVariant.withValues(alpha: 0.5),
          width: 0.5,
        ),
      ),
      leading: CupertinoButton(
        padding: EdgeInsets.zero,
        onPressed: () {
          HapticFeedback.lightImpact();
          context.pop();
        },
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              CupertinoIcons.back,
              color: colorScheme.primary,
              size: 18,
            ),
            const SizedBox(width: 4),
            Text(
              '返回',
              style: TextStyle(
                color: colorScheme.primary,
                fontSize: 17,
                letterSpacing: -0.41,
              ),
            ),
          ],
        ),
      ),
      middle: Text(
        '上传发票',
        style: Theme.of(context).textTheme.titleLarge?.copyWith(
          color: colorScheme.onSurface,
          fontWeight: FontWeight.w600,
        ),
      ),
      trailing: CupertinoButton(
        padding: EdgeInsets.zero,
        onPressed: () => _showHelpBottomSheet(context),
        child: Icon(
          CupertinoIcons.info_circle,
          color: colorScheme.primary,
          size: 22,
        ),
      ),
    );
  }
  
  void _handleStateChanges(BuildContext context, UploadState state) {
    if (state is UploadError) {
      _showErrorMessage(context, state.message);
    } else if (state is UploadCompleted) {
      if (state.allSucceeded) {
        _showSuccessMessage(context, '全部文件上传成功！');
      } else {
        _showWarningMessage(
          context,
          '上传完成：成功 ${state.successCount} 个，失败 ${state.failedCount} 个',
        );
      }
    }
  }
  
  Widget _buildBody(BuildContext context, UploadState state) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          // 主内容区域
          Expanded(
            child: _buildMainContent(context, state),
          ),
          
          // 底部操作栏（如果需要）
          if (state is FilesSelected && state.isValid)
            _buildActionBar(context, state),
        ],
      ),
    );
  }
  
  Widget _buildMainContent(BuildContext context, UploadState state) {
    // 调试状态信息
    
    if (state is UploadInProgress) {
      return _buildUploadProgress(context, state);
    } else if (state is UploadCompleted) {
      return _buildUploadResult(context, state);
    } else if (state is UploadError) {
      return _buildErrorState(context, state);
    } else {
      // UploadInitial 或 FilesSelected
      return _buildFileSelection(context, state);
    }
  }
  
  Widget _buildFileSelection(BuildContext context, UploadState state) {
    final files = state is FilesSelected ? state.files : <File>[];
    final error = state is FilesSelected ? state.validationError : null;
    
    return UploadDropZoneWidget(
      selectedFiles: files,
      validationError: error,
      onTap: () => _pickFiles(context),
      onFilesDropped: (filePaths) => _handleDroppedFiles(context, filePaths),
    );
  }
  
  Widget _buildUploadProgress(BuildContext context, UploadInProgress state) {
    return UploadProgressWidget(
      progresses: state.progresses,
      onCancel: () {
        context.read<UploadBloc>().add(const CancelUpload());
      },
    );
  }
  
  Widget _buildUploadResult(BuildContext context, UploadCompleted state) {
    return UploadResultWidget(
      results: state.results,
      onRetryFailed: state.hasFailures ? () {
        final failedIndices = <int>[];
        for (int i = 0; i < state.results.length; i++) {
          if (!state.results[i].success) {
            failedIndices.add(i);
          }
        }
        context.read<UploadBloc>().add(RetryUpload(failedIndices));
      } : null,
      onUploadMore: () {
        context.read<UploadBloc>().add(const ResetUpload());
      },
      onClose: () {
        context.pop();
      },
    );
  }
  
  Widget _buildErrorState(BuildContext context, UploadError state) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            CupertinoIcons.exclamationmark_triangle,
            size: 64,
            color: colorScheme.error,
          ),
          
          const SizedBox(height: 16),
          
          Text(
            '上传失败',
            style: theme.textTheme.headlineSmall?.copyWith(
              color: colorScheme.error,
              fontWeight: FontWeight.bold,
            ),
          ),
          
          const SizedBox(height: 8),
          
          Text(
            state.message,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          
          const SizedBox(height: 24),
          
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CupertinoButton(
                color: colorScheme.surfaceContainerHigh,
                onPressed: () {
                  if (state.files != null) {
                    context.read<UploadBloc>().add(SelectFiles(state.files!));
                  } else {
                    context.read<UploadBloc>().add(const ResetUpload());
                  }
                },
                child: Text(
                  '重试',
                  style: TextStyle(color: colorScheme.onSurface),
                ),
              ),
              
              const SizedBox(width: 16),
              
              CupertinoButton(
                color: colorScheme.primary,
                onPressed: () => context.pop(),
                child: Text(
                  '取消',
                  style: TextStyle(color: colorScheme.onPrimary),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  Widget _buildActionBar(BuildContext context, FilesSelected state) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 文件统计信息
          Row(
            children: [
              Icon(
                CupertinoIcons.doc_text,
                size: 16,
                color: colorScheme.primary,
              ),
              
              const SizedBox(width: 8),
              
              Expanded(
                child: Text(
                  '已选择 ${state.files.length} 个文件',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              
              CupertinoButton(
                padding: EdgeInsets.zero,
                minimumSize: Size.zero,
                onPressed: () {
                  context.read<UploadBloc>().add(const ClearFiles());
                },
                child: Text(
                  '清空',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.error,
                  ),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          // 操作按钮
          Row(
            children: [
              Expanded(
                child: CupertinoButton(
                  color: colorScheme.surfaceContainerHigh,
                  onPressed: () => _pickFiles(context),
                  child: Text(
                    '继续添加',
                    style: TextStyle(color: colorScheme.onSurface),
                  ),
                ),
              ),
              
              const SizedBox(width: 12),
              
              Expanded(
                flex: 2,
                child: CupertinoButton(
                  color: colorScheme.primary,
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    context.read<UploadBloc>().add(const StartUpload());
                  },
                  child: Text(
                    '开始上传',
                    style: TextStyle(
                      color: colorScheme.onPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  // 文件选择
  Future<void> _pickFiles(BuildContext context) async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: UploadConfig.supportedExtensions,
        allowMultiple: true,
        withData: false,
        withReadStream: false,
      );
      
      if (result != null && result.files.isNotEmpty && context.mounted) {
        final files = result.files
            .where((file) => file.path != null)
            .map((file) => File(file.path!))
            .toList();
        
        if (files.isNotEmpty) {
          final currentState = context.read<UploadBloc>().state;
          if (currentState is FilesSelected) {
            context.read<UploadBloc>().add(AddFiles(files));
          } else {
            context.read<UploadBloc>().add(SelectFiles(files));
          }
        }
      }
    } catch (e) {
      if (context.mounted) {
        _showErrorMessage(context, '选择文件失败：${e.toString()}');
      }
    }
  }
  
  // 处理拖拽文件
  void _handleDroppedFiles(BuildContext context, List<String> filePaths) {
    final files = filePaths.map((path) => File(path)).toList();
    final currentState = context.read<UploadBloc>().state;
    
    if (currentState is FilesSelected) {
      context.read<UploadBloc>().add(AddFiles(files));
    } else {
      context.read<UploadBloc>().add(SelectFiles(files));
    }
  }
  
  // 显示帮助底部表单
  void _showHelpBottomSheet(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    showCupertinoModalPopup<void>(
      context: context,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.6,
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        ),
        child: Column(
          children: [
            // 头部
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: colorScheme.outlineVariant.withValues(alpha: 0.5),
                  ),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '上传帮助',
                      style: theme.textTheme.titleLarge?.copyWith(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () => context.pop(),
                    child: Icon(
                      CupertinoIcons.xmark_circle_fill,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            
            // 内容
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHelpItem(
                      context,
                      icon: CupertinoIcons.doc_text,
                      title: '支持的文件格式',
                      description: 'PDF、JPG、JPEG、PNG、WebP',
                    ),
                    
                    _buildHelpItem(
                      context,
                      icon: CupertinoIcons.folder,
                      title: '文件大小限制',
                      description: '单个文件最大 ${UploadConfig.maxFileSize ~/ (1024 * 1024)}MB',
                    ),
                    
                    _buildHelpItem(
                      context,
                      icon: CupertinoIcons.number,
                      title: '文件数量限制',
                      description: '一次最多上传 ${UploadConfig.maxFileCount} 个文件',
                    ),
                    
                    _buildHelpItem(
                      context,
                      icon: CupertinoIcons.hand_draw,
                      title: '操作方式',
                      description: '点击选择文件或直接拖拽文件到上传区域',
                    ),
                    
                    _buildHelpItem(
                      context,
                      icon: CupertinoIcons.info_circle,
                      title: '注意事项',
                      description: '请确保图片清晰，文字可识别，以提高OCR识别准确率',
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildHelpItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String description,
  }) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              size: 20,
              color: colorScheme.primary,
            ),
          ),
          
          const SizedBox(width: 12),
          
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                
                const SizedBox(height: 4),
                
                Text(
                  description,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  // 消息提示方法
  void _showSuccessMessage(BuildContext context, String message) {
    CupertinoNotificationUtils.showSuccess(context, message);
  }
  
  void _showWarningMessage(BuildContext context, String message) {
    CupertinoNotificationUtils.showWarning(context, message);
  }
  
  void _showErrorMessage(BuildContext context, String message) {
    CupertinoNotificationUtils.showError(context, message);
  }
}