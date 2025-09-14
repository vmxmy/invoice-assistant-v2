import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/injection_container.dart';
import '../../../core/events/app_event_bus.dart';
import '../../widgets/unified_bottom_sheet.dart';
import 'bloc/upload_bloc.dart';
import 'bloc/upload_event.dart';
import 'bloc/upload_state.dart';
import 'widgets/ios_file_picker_widget.dart';
import 'widgets/ios_upload_progress_widget.dart';

/// iOS风格的发票上传页面包装器
/// 提供UploadBloc并包装内部实现
class IOSStyleUploadPage extends StatelessWidget {
  const IOSStyleUploadPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => UploadBloc(
        uploadUseCase: sl(),
        eventBus: sl(),
      ),
      child: const _IOSStyleUploadPageImpl(),
    );
  }
}

/// iOS风格的发票上传页面内部实现
/// 
/// 设计理念：
/// - 遵循iOS Human Interface Guidelines
/// - 使用系统标准颜色和字体
/// - 流畅的动画和过渡效果
/// - 直观的手势操作
/// - 清晰的视觉层次结构
class _IOSStyleUploadPageImpl extends StatefulWidget {
  const _IOSStyleUploadPageImpl();

  @override
  State<_IOSStyleUploadPageImpl> createState() => _IOSStyleUploadPageImplState();
}

class _IOSStyleUploadPageImplState extends State<_IOSStyleUploadPageImpl>
    with TickerProviderStateMixin {
  
  late AnimationController _fadeController;
  late AnimationController _slideController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  bool _isNavigating = false; // 防止重复导航

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
  }

  void _initializeAnimations() {
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 350),
      vsync: this,
    );

    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOut,
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutCubic,
    ));

    // 启动进入动画
    _fadeController.forward();
    _slideController.forward();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return CupertinoPageScaffold(
      backgroundColor: colorScheme.surface,
      navigationBar: _buildNavigationBar(context),
      child: SafeArea(
        child: BlocConsumer<UploadBloc, UploadState>(
          listener: _handleStateChanges,
          builder: (context, state) => AnimatedSwitcher(
            duration: const Duration(milliseconds: 400),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            transitionBuilder: (child, animation) => SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, 0.02),
                end: Offset.zero,
              ).animate(animation),
              child: FadeTransition(
                opacity: animation,
                child: child,
              ),
            ),
            child: _buildMainContent(context, state),
          ),
        ),
      ),
    );
  }

  CupertinoNavigationBar _buildNavigationBar(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return CupertinoNavigationBar(
      backgroundColor: colorScheme.surface.withValues(alpha: 0.8),
      border: null, // iOS 15+ 风格：无边框
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 16),
      leading: BlocBuilder<UploadBloc, UploadState>(
        builder: (context, state) {
          if (state is UploadInProgress) {
            // 上传中显示取消按钮
            return CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: () => _showCancelConfirmation(context),
              child: Text(
                '取消',
                style: TextStyle(
                  color: colorScheme.error,
                  fontSize: 17,
                  fontWeight: FontWeight.w400,
                ),
              ),
            );
          }
          return CupertinoButton(
            padding: EdgeInsets.zero,
            onPressed: () {
              HapticFeedback.lightImpact();
              context.pop();
            },
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  CupertinoIcons.chevron_left,
                  color: colorScheme.primary,
                  size: 18,
                ),
                const SizedBox(width: 2),
                Text(
                  '返回',
                  style: TextStyle(
                    color: colorScheme.primary,
                    fontSize: 17,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ],
            ),
          );
        },
      ),
      middle: const Text(
        '上传发票',
        style: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.41,
        ),
      ),
      trailing: BlocBuilder<UploadBloc, UploadState>(
        builder: (context, state) {
          if (state is! UploadInProgress) {
            return CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: () => _showHelpSheet(context),
              child: Icon(
                CupertinoIcons.question_circle,
                color: colorScheme.primary,
                size: 22,
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildMainContent(BuildContext context, UploadState state) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _slideAnimation,
        child: _buildContentForState(context, state),
      ),
    );
  }

  Widget _buildContentForState(BuildContext context, UploadState state) {
    if (state is UploadInitial || state is FilesSelected) {
      return _buildFileSelection(context, state);
    } else if (state is UploadInProgress) {
      return _buildUploadProgress(context, state);
    } else if (state is UploadCompleted) {
      // UploadCompleted 状态继续显示进度页面，显示最终结果
      final mockInProgressState = UploadInProgress(
        files: state.files,
        progresses: state.results.map((result) => FileUploadProgress(
          index: result.index,
          file: result.file,
          progress: 1.0,
          status: result.success ? UploadStatus.completed : UploadStatus.failed,
          errorMessage: result.errorMessage,
          invoiceId: result.invoiceId,
        )).toList(),
        completedResults: state.results,
        completedCount: state.successCount,
        failedCount: state.failedCount,
      );
      
      return _buildUploadProgress(context, mockInProgressState);
    } else if (state is UploadError) {
      return _buildErrorState(context, state);
    } else {
      // 这应该不会发生，但为了安全起见
      return _buildErrorState(context, const UploadError('未知状态类型'));
    }
  }

  Widget _buildFileSelection(BuildContext context, UploadState state) {
    final files = state is FilesSelected ? state.files : <File>[];
    final error = state is FilesSelected ? state.validationError : null;

    return IOSFilePickerWidget(
      selectedFiles: files,
      validationError: error,
      onFilesSelected: (selectedFiles) {
        HapticFeedback.selectionClick();
        final bloc = context.read<UploadBloc>();
        bloc.add(SelectFiles(selectedFiles));
        
        // 如果文件选择有效，直接开始上传
        if (selectedFiles.isNotEmpty) {
          // 延迟一下让状态更新完成，然后检查验证状态并自动开始上传
          Future.delayed(const Duration(milliseconds: 100), () {
            if (!mounted) return;
            
            final currentState = bloc.state;
            // 只有在文件验证通过的情况下才自动开始上传
            if (currentState is FilesSelected && currentState.isValid) {
              HapticFeedback.mediumImpact();
              bloc.add(const StartUpload());
            }
          });
        }
      },
      onStartUpload: () {
        HapticFeedback.mediumImpact();
        context.read<UploadBloc>().add(const StartUpload());
      },
      onRemoveFile: (index) {
        HapticFeedback.lightImpact();
        final updatedFiles = List<File>.from(files);
        updatedFiles.removeAt(index);
        context.read<UploadBloc>().add(SelectFiles(updatedFiles));
      },
    );
  }

  Widget _buildUploadProgress(BuildContext context, UploadState state) {
    if (state is UploadInProgress) {
      return IOSUploadProgressWidget(
        files: state.files,
        progresses: state.progresses,
        completedResults: state.completedResults, // 传递实时结果
        isCompleted: state.isCompleted, // 当所有文件完成时为true
        onCancel: !state.isCompleted ? () {
          _showCancelConfirmation(context);
        } : null,
        onRetryFailed: state.hasFailures && state.isCompleted ? () {
          HapticFeedback.lightImpact();
          final failedIndices = <int>[];
          for (int i = 0; i < state.completedResults.length; i++) {
            final result = state.getResultForIndex(i);
            if (result != null && !result.success) {
              failedIndices.add(i);
            }
          }
          context.read<UploadBloc>().add(RetryUpload(failedIndices));
        } : null,
        onUploadMore: state.isCompleted ? () {
          HapticFeedback.lightImpact();
          context.read<UploadBloc>().add(const ResetUpload());
        } : null,
        onClose: state.isCompleted ? () {
          if (_isNavigating) {
            return;
          }
          
          _isNavigating = true;
          HapticFeedback.lightImpact();
          
          // 检查当前路由
          // GoRouterState.of(context).uri.toString();
          
          // 延迟一下再导航，确保状态稳定
          Future.delayed(const Duration(milliseconds: 100), () {
            if (!mounted) return;
            
            // 由于上传页面在MainPage的PageView内部，需要通过事件总线通知切换tab
            try {
              // 使用事件总线通知MainPage切换到发票管理页面
              final eventBus = sl<AppEventBus>();
              eventBus.emit(TabChangedEvent(
                newTabIndex: 0,
                oldTabIndex: 1, 
                tabName: '发票管理',
              )); 
              _isNavigating = false; // 重置状态
            } catch (e) {
              _isNavigating = false; // 重置状态
            }
          });
        } : null,
      );
    } else {
      return const Center(child: Text('Invalid state'));
    }
  }


  Widget _buildErrorState(BuildContext context, UploadError state) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // iOS风格错误图标
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: colorScheme.errorContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(
                CupertinoIcons.exclamationmark_triangle_fill,
                size: 40,
                color: colorScheme.error,
              ),
            ),
            
            const SizedBox(height: 24),
            
            Text(
              '上传失败',
              style: CupertinoTheme.of(context).textTheme.navLargeTitleTextStyle.copyWith(
                fontSize: 22,
                fontWeight: FontWeight.w600,
              ),
            ),
            
            const SizedBox(height: 8),
            
            Text(
              state.message,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: colorScheme.onSurface.withValues(alpha: 0.7),
                height: 1.4,
              ),
            ),
            
            const SizedBox(height: 32),
            
            // 重试按钮
            SizedBox(
              width: double.infinity,
              child: CupertinoButton.filled(
                onPressed: () {
                  HapticFeedback.lightImpact();
                  context.read<UploadBloc>().add(const ResetUpload());
                },
                child: const Text(
                  '重新选择',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleStateChanges(BuildContext context, UploadState state) {
    if (state is UploadError) {
      HapticFeedback.heavyImpact();
    } else if (state is UploadCompleted) {
      // 只提供触觉反馈，不显示提示框，因为结果已在页面中显示
      if (state.allSucceeded) {
        HapticFeedback.mediumImpact();
      } else {
        HapticFeedback.lightImpact();
      }
    }
  }

  Future<void> _showCancelConfirmation(BuildContext context) async {
    final bloc = context.read<UploadBloc>();
    final colorScheme = Theme.of(context).colorScheme;
    
    final confirmed = await UnifiedBottomSheet.showConfirmDialog(
      context: context,
      title: '取消上传',
      content: '确定要取消正在进行的上传吗？已上传的文件不会受到影响。',
      confirmText: '取消上传',
      cancelText: '继续上传',
      confirmColor: colorScheme.error,
      icon: CupertinoIcons.stop_circle,
    );
    
    if (confirmed == true && mounted) {
      bloc.add(const CancelUpload());
    }
  }

  void _showHelpSheet(BuildContext context) {
    UnifiedBottomSheet.showActionSheet<String>(
      context: context,
      title: '上传帮助',
      message: '选择要上传的发票文件，支持 PDF、JPG、PNG 格式',
      actions: [
        BottomSheetAction<String>(
          title: '支持的文件格式',
          value: 'formats',
          icon: CupertinoIcons.doc_text,
          onPressed: () => _showFileFormats(context),
        ),
        BottomSheetAction<String>(
          title: '文件大小限制',
          value: 'size',
          icon: CupertinoIcons.folder,
          onPressed: () => _showFileSizeLimit(context),
        ),
        BottomSheetAction<String>(
          title: '上传技巧',
          value: 'tips',
          icon: CupertinoIcons.lightbulb,
          onPressed: () => _showUploadTips(context),
        ),
      ],
    );
  }

  void _showFileFormats(BuildContext context) {
    UnifiedBottomSheet.showResultSheet(
      context: context,
      isSuccess: true,
      title: '支持的文件格式',
      message: '• PDF 文档\n• JPG/JPEG 图片\n• PNG 图片\n• WebP 图片',
      icon: CupertinoIcons.doc_text_fill,
      autoCloseDuration: const Duration(seconds: 3),
    );
  }

  void _showFileSizeLimit(BuildContext context) {
    UnifiedBottomSheet.showResultSheet(
      context: context,
      isSuccess: true,
      title: '文件大小限制',
      message: '单个文件不超过 10MB\n一次最多上传 5 个文件',
      icon: CupertinoIcons.folder_fill,
      autoCloseDuration: const Duration(seconds: 3),
    );
  }

  void _showUploadTips(BuildContext context) {
    UnifiedBottomSheet.showResultSheet(
      context: context,
      isSuccess: true,
      title: '上传技巧',
      message: '• 确保发票内容清晰可见\n• 避免反光和阴影\n• PDF 格式识别效果更好\n• 一次可以选择多个文件',
      icon: CupertinoIcons.lightbulb_fill,
      autoCloseDuration: const Duration(seconds: 4),
    );
  }

}