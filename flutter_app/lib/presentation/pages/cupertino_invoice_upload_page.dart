import '../../core/utils/logger.dart';
import 'dart:io';
import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:file_picker/file_picker.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/icon_mapping.dart';
import '../../core/widgets/atoms/app_button_cupertino.dart';
import '../../core/widgets/atoms/app_button.dart';
import '../bloc/invoice_bloc.dart';
import '../bloc/invoice_event.dart';
import '../bloc/invoice_state.dart';
import '../widgets/upload_progress_widget.dart';
import '../widgets/upload_result_widget.dart';

/// iOS风格的发票上传页面
/// 
/// 遵循iOS Human Interface Guidelines设计规范
/// 支持拖拽上传、触觉反馈和无障碍功能
class CupertinoInvoiceUploadPage extends StatefulWidget {
  const CupertinoInvoiceUploadPage({super.key});

  @override
  State<CupertinoInvoiceUploadPage> createState() => _CupertinoInvoiceUploadPageState();
}

class _CupertinoInvoiceUploadPageState extends State<CupertinoInvoiceUploadPage>
    with TickerProviderStateMixin {
  final List<String> _selectedFiles = [];
  bool _isDragging = false;
  late AnimationController _bounceController;
  late Animation<double> _bounceAnimation;
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _bounceController.dispose();
    super.dispose();
  }

  /// 防抖setState
  void _debouncedSetState(VoidCallback fn) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 100), () {
      if (mounted) {
        setState(fn);
      }
    });
  }

  /// 设置动画
  void _setupAnimations() {
    _bounceController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    
    _bounceAnimation = Tween<double>(
      begin: 1.0,
      end: 0.95,
    ).animate(CurvedAnimation(
      parent: _bounceController,
      curve: Curves.easeInOut,
    ));
  }

  @override
  Widget build(BuildContext context) {
    // 使用App级别的BLoC实例
    final bloc = context.read<InvoiceBloc>();
    if (AppConfig.enableLogging) {
      AppLogger.debug('📤 [CupertinoUploadPage:${bloc.hashCode}] 使用来自App级的全局InvoiceBloc',
          tag: 'Debug');
    }

    return CupertinoPageScaffold(
      backgroundColor: AppColors.background(context),
      navigationBar: _buildNavigationBar(context),
      child: SafeArea(
        child: BlocConsumer<InvoiceBloc, InvoiceState>(
          listener: _handleStateChanges,
          builder: (context, state) => _buildBody(context, state),
        ),
      ),
    );
  }

  /// 构建导航栏
  CupertinoNavigationBar _buildNavigationBar(BuildContext context) {
    return CupertinoNavigationBar(
      backgroundColor: AppColors.elevatedBackground(context),
      border: Border(
        bottom: BorderSide(
          color: AppColors.divider(context),
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
              IconMapping.getCupertinoIcon('arrow_back'),
              color: AppColors.primary(context),
              size: 18,
            ),
            const SizedBox(width: 4),
            Text(
              '返回',
              style: AppTypography.bodyMedium(context).copyWith(
                color: AppColors.primary(context),
              ),
            ),
          ],
        ),
      ),
      middle: Text(
        '上传发票',
        style: AppTypography.titleMedium(context).copyWith(
          color: AppColors.onSurface(context),
          fontWeight: FontWeight.w600,
        ),
      ),
      trailing: CupertinoButton(
        padding: EdgeInsets.zero,
        onPressed: () => _showHelpActionSheet(context),
        child: Icon(
          IconMapping.getCupertinoIcon('info'),
          color: AppColors.primary(context),
          size: 22,
        ),
      ),
    );
  }

  /// 构建主体内容
  Widget _buildBody(BuildContext context, InvoiceState state) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: constraints.maxHeight,
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                key: const ValueKey('main_upload_column'),
                children: [
                  // 上传区域
                  SizedBox(
                    height: constraints.maxHeight - 32 - 
                           (_selectedFiles.isNotEmpty && state is! InvoiceUploading ? 120 : 0),
                    child: _buildUploadArea(context, state),
                  ),

                  // 底部操作栏
                  if (_selectedFiles.isNotEmpty && state is! InvoiceUploading)
                    _buildActionBar(context),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  /// 处理状态变化
  void _handleStateChanges(BuildContext context, InvoiceState state) {
    if (state is InvoiceUploadCompleted) {
      _handleUploadCompleted(context, state);
    } else if (state is InvoiceError) {
      _showErrorAlert(context, '操作失败', state.message);
    }
  }

  /// 构建上传区域
  Widget _buildUploadArea(BuildContext context, InvoiceState state) {
    if (state is InvoiceUploading) {
      return _buildUploadProgress(context, state);
    }

    if (state is InvoiceUploadCompleted) {
      return _buildUploadResult(context, state);
    }

    return _buildFilePicker(context);
  }

  /// 构建上传进度视图
  Widget _buildUploadProgress(BuildContext context, InvoiceUploading state) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardBackground(context),
        borderRadius: BorderRadius.circular(12),
      ),
      child: UploadProgressWidget(
        progresses: state.progresses,
        completedCount: state.completedCount,
        totalCount: state.totalCount,
        onCancel: () {
          HapticFeedback.lightImpact();
          context.read<InvoiceBloc>().add(const CancelUpload());
        },
      ),
    );
  }

  /// 构建上传结果视图
  Widget _buildUploadResult(BuildContext context, InvoiceUploadCompleted state) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardBackground(context),
        borderRadius: BorderRadius.circular(12),
      ),
      child: UploadResultWidget(
        results: state.results,
        successCount: state.successCount,
        failureCount: state.failureCount,
        duplicateCount: state.duplicateCount,
        onRetry: (filePath) {
          HapticFeedback.lightImpact();
          context.read<InvoiceBloc>().add(RetryUpload(filePath: filePath));
        },
        onClear: () {
          HapticFeedback.lightImpact();
          context.read<InvoiceBloc>().add(const ClearUploadResults());
          if (mounted) {
            setState(() {
              _selectedFiles.clear();
            });
          }
        },
        onViewInvoice: (invoice) {
          HapticFeedback.lightImpact();
          context.push('/invoice-detail/${invoice.id}');
        },
      ),
    );
  }

  /// 构建文件选择器
  Widget _buildFilePicker(BuildContext context) {
    return AnimatedBuilder(
      animation: _bounceAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _isDragging ? _bounceAnimation.value : 1.0,
          child: DragTarget<List<String>>(
            onWillAcceptWithDetails: (details) {
              if (mounted) {
                setState(() {
                  _isDragging = true;
                });
                _bounceController.forward();
                HapticFeedback.selectionClick();
              }
              return true;
            },
            onLeave: (data) {
              if (mounted) {
                setState(() {
                  _isDragging = false;
                });
                _bounceController.reverse();
              }
            },
            onAcceptWithDetails: (details) {
              if (mounted) {
                setState(() {
                  _isDragging = false;
                });
                _bounceController.reverse();
                HapticFeedback.lightImpact();
                _handleDroppedFiles(details.data);
              }
            },
            builder: (context, candidateData, rejectedData) {
              return _buildDropZone(context);
            },
          ),
        );
      },
    );
  }

  /// 构建拖拽区域
  Widget _buildDropZone(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxWidth < 400;
        final padding = isCompact ? 16.0 : 24.0;
        final borderRadius = isCompact ? 12.0 : 16.0;
        final spacing = isCompact ? 24.0 : 32.0;
        final fileListSpacing = isCompact ? 8.0 : 12.0;
        
        return Container(
          decoration: BoxDecoration(
            color: _isDragging
                ? AppColors.primaryWithOpacity(context, 0.1)
                : AppColors.cardBackground(context),
            border: Border.all(
              color: _isDragging
                  ? AppColors.primary(context)
                  : AppColors.divider(context),
              width: _isDragging ? 2 : 1,
            ),
            borderRadius: BorderRadius.circular(borderRadius),
          ),
          child: CupertinoButton(
            padding: EdgeInsets.all(padding),
            onPressed: _pickFiles,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // 图标和主要文本
                _buildDropZoneHeader(context, isCompact: isCompact),
                
                SizedBox(height: spacing),
                
                // 已选文件列表
                if (_selectedFiles.isNotEmpty) ...[
                  _buildSelectedFilesList(context),
                  SizedBox(height: fileListSpacing),
                ],
                
                // 说明文字
                _buildDropZoneDescription(context, isCompact: isCompact),
              ],
            ),
          ),
        );
      },
    );
  }

  /// 构建拖拽区域头部
  Widget _buildDropZoneHeader(BuildContext context, {required bool isCompact}) {
    final iconContainerSize = isCompact ? 60.0 : 80.0;
    final iconSize = isCompact ? 24.0 : 28.0;
    final titleSpacing = isCompact ? 8.0 : 12.0;
    final subtitleSpacing = isCompact ? 4.0 : 6.0;
    
    // 响应式文本样式
    final titleStyle = isCompact 
        ? AppTypography.titleSmall(context)
        : AppTypography.titleMedium(context);
    
    final subtitleStyle = isCompact
        ? AppTypography.bodySmall(context)
        : AppTypography.bodyMedium(context);
    
    return Column(
      children: [
        Container(
          width: iconContainerSize,
          height: iconContainerSize,
          decoration: BoxDecoration(
            color: _isDragging
                ? AppColors.primary(context).withValues(alpha: 0.1)
                : AppColors.disabled(context),
            shape: BoxShape.circle,
          ),
          child: Icon(
            _selectedFiles.isEmpty
                ? IconMapping.getCupertinoIcon('upload')
                : IconMapping.getCupertinoIcon('folder'),
            size: iconSize,
            color: _isDragging
                ? AppColors.primary(context)
                : AppColors.onSurfaceVariant(context),
          ),
        ),
        
        SizedBox(height: titleSpacing),
        
        Text(
          _selectedFiles.isEmpty
              ? (_isDragging ? '释放文件到此处' : '选择PDF发票文件')
              : '已选择 ${_selectedFiles.length} 个文件',
          style: titleStyle.copyWith(
            color: _isDragging
                ? AppColors.primary(context)
                : AppColors.onSurface(context),
            fontWeight: FontWeight.w600,
          ),
          textAlign: TextAlign.center,
          maxLines: isCompact ? 2 : 1,
          overflow: TextOverflow.ellipsis,
        ),
        
        SizedBox(height: subtitleSpacing),
        
        Text(
          _selectedFiles.isEmpty
              ? (isCompact ? '点击选择文件' : '点击选择或拖拽文件到此处')
              : '点击重新选择文件',
          style: subtitleStyle.copyWith(
            color: AppColors.onSurfaceVariant(context),
          ),
          textAlign: TextAlign.center,
          maxLines: isCompact ? 2 : 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  /// 构建已选文件列表
  Widget _buildSelectedFilesList(BuildContext context) {
    if (_selectedFiles.isEmpty) {
      return const SizedBox.shrink();
    }
    
    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxWidth < 400;
        final maxHeight = isCompact ? 150.0 : 200.0;
        final itemSpacing = isCompact ? 4.0 : 6.0;
        
        return Container(
          constraints: BoxConstraints(maxHeight: maxHeight),
          child: ListView.separated(
            shrinkWrap: true,
            itemCount: _selectedFiles.length,
            separatorBuilder: (context, index) => SizedBox(height: itemSpacing),
            itemBuilder: (context, index) {
              if (index >= _selectedFiles.length) {
                return const SizedBox.shrink();
              }
              final filePath = _selectedFiles[index];
              final fileName = filePath.split('/').last;
              final file = File(filePath);
              final fileSize = file.existsSync() ? file.lengthSync() : 0;

              final itemPadding = isCompact ? 8.0 : 12.0;
              final iconSize = isCompact ? 16.0 : 18.0;
              final iconSpacing = isCompact ? 8.0 : 12.0;
              final borderRadius = isCompact ? 6.0 : 8.0;

              return Container(
                padding: EdgeInsets.all(itemPadding),
                decoration: BoxDecoration(
                  color: AppColors.cardBackground(context),
                  borderRadius: BorderRadius.circular(borderRadius),
                  border: Border.all(
                    color: AppColors.divider(context),
                    width: 0.5,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      IconMapping.getCupertinoIcon('picture_as_pdf'),
                      color: AppColors.error(context),
                      size: iconSize,
                    ),
                    
                    SizedBox(width: iconSpacing),
                    
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            fileName,
                            style: (isCompact 
                                ? AppTypography.bodySmall(context) 
                                : AppTypography.bodyMedium(context)).copyWith(
                              color: AppColors.onSurface(context),
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          
                          SizedBox(height: isCompact ? 2.0 : 3.0),
                          
                          Text(
                            _formatFileSize(fileSize),
                            style: (isCompact 
                                ? AppTypography.labelSmall(context) 
                                : AppTypography.bodySmall(context)).copyWith(
                              color: AppColors.onSurfaceVariant(context),
                            ),
                          ),
                        ],
                      ),
                    ),
                    
                    CupertinoButton(
                      padding: EdgeInsets.all(isCompact ? 2.0 : 3.0),
                      onPressed: () {
                        HapticFeedback.lightImpact();
                        if (index < _selectedFiles.length) {
                          _removeFile(index);
                        }
                      },
                      child: Icon(
                        IconMapping.getCupertinoIcon('clear'),
                        color: AppColors.disabled(context),
                        size: iconSize,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }

  /// 构建拖拽区域说明
  Widget _buildDropZoneDescription(BuildContext context, {required bool isCompact}) {
    final padding = isCompact ? 8.0 : 12.0;
    final borderRadius = isCompact ? 6.0 : 8.0;
    final spacing = isCompact ? 4.0 : 6.0;
    
    return Container(
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: AppColors.surfaceWithOpacity(context, 0.2),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: Column(
        children: [
          Text(
            '支持的文件格式',
            style: (isCompact ? AppTypography.labelSmall(context) : AppTypography.labelMedium(context)).copyWith(
              color: AppColors.onSurface(context),
              fontWeight: FontWeight.w600,
            ),
          ),
          
          SizedBox(height: spacing),
          
          Text(
            isCompact 
                ? 'PDF • 最多5个 • <10MB'
                : 'PDF格式 • 最多5个文件 • 单文件不超过10MB',
            style: AppTypography.bodySmall(context).copyWith(
              color: AppColors.onSurfaceVariant(context),
            ),
            textAlign: TextAlign.center,
            maxLines: isCompact ? 2 : 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  /// 构建底部操作栏
  Widget _buildActionBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(top: 16),
      child: Column(
        children: [
          // 主要操作按钮 - 上传
          SizedBox(
            width: double.infinity,
            child: AppButtonCupertino(
              text: '上传 ${_selectedFiles.length} 个文件',
              variant: ButtonVariant.primary,
              size: ButtonSize.large,
              icon: IconMapping.getCupertinoIcon('upload'),
              onPressed: _startUpload,
            ),
          ),
          
          const SizedBox(height: 12),
          
          // 次要操作按钮 - 清空
          SizedBox(
            width: double.infinity,
            child: AppButtonCupertino(
              text: '清空选择',
              variant: ButtonVariant.secondary,
              size: ButtonSize.medium,
              icon: IconMapping.getCupertinoIcon('clear'),
              onPressed: () {
                HapticFeedback.lightImpact();
                if (mounted) {
                  setState(() {
                    _selectedFiles.clear();
                  });
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  /// 选择文件
  Future<void> _pickFiles() async {
    try {
      HapticFeedback.selectionClick();
      
      if (AppConfig.enableLogging) {
        AppLogger.debug('📁 [CupertinoUploadPage] 开始选择文件', tag: 'Debug');
      }

      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
        allowMultiple: true,
      );

      if (result != null && result.files.isNotEmpty) {
        final selectedPaths =
            result.paths.where((path) => path != null).cast<String>().toList();

        await _processSelectedFiles(selectedPaths);
      }
    } catch (error) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [CupertinoUploadPage] 选择文件失败: $error', tag: 'Debug');
      }

      if (mounted) {
        _showErrorAlert(context, '文件选择失败', error.toString());
      }
    }
  }

  /// 处理选中的文件
  Future<void> _processSelectedFiles(List<String> filePaths) async {
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    final validFiles = <String>[];
    final oversizedFiles = <String>[];

    for (final filePath in filePaths.take(5)) {
      final file = File(filePath);
      if (file.existsSync()) {
        final fileSize = file.lengthSync();
        if (fileSize <= maxFileSize) {
          validFiles.add(filePath);
        } else {
          oversizedFiles.add(filePath);
        }
      }
    }

    if (mounted) {
      if (oversizedFiles.isNotEmpty) {
        _showWarningAlert(context, '文件过大',
            '${oversizedFiles.length}个文件超过10MB大小限制，已自动忽略');
      }

      if (filePaths.length > 5) {
        _showWarningAlert(context, '文件数量限制',
            '最多只能选择5个文件，已自动截取前5个有效文件');
      }
    }

    if (validFiles.isNotEmpty && mounted) {
      _debouncedSetState(() {
        // 更安全的列表更新方式
        final newFiles = List<String>.from(validFiles);
        _selectedFiles
          ..clear()
          ..addAll(newFiles);
      });

      HapticFeedback.lightImpact();

      if (AppConfig.enableLogging) {
        AppLogger.debug('📁 [CupertinoUploadPage] 选择了 ${validFiles.length} 个有效文件',
            tag: 'Debug');
      }
    } else {
      if (mounted) {
        _showErrorAlert(context, '无有效文件', '所选文件都不符合要求（格式或大小）');
      }
    }
  }

  /// 移除文件
  void _removeFile(int index) {
    if (mounted && index >= 0 && index < _selectedFiles.length) {
      setState(() {
        _selectedFiles.removeAt(index);
      });
    }
  }

  /// 处理拖拽文件
  Future<void> _handleDroppedFiles(List<String> filePaths) async {
    try {
      if (AppConfig.enableLogging) {
        AppLogger.debug('📁 [CupertinoUploadPage] 处理拖拽文件: ${filePaths.length}个',
            tag: 'Debug');
      }

      // 过滤PDF文件
      final pdfFiles = filePaths.where((path) {
        return path.toLowerCase().endsWith('.pdf');
      }).toList();

      if (pdfFiles.isEmpty) {
        _showWarningAlert(context, '文件格式不支持', '仅支持PDF格式的文件');
        return;
      }

      if (pdfFiles.length != filePaths.length) {
        _showWarningAlert(context, '部分文件已过滤',
            '已过滤掉非PDF格式的文件，仅保留${pdfFiles.length}个PDF文件');
      }

      await _processSelectedFiles(pdfFiles);
    } catch (error) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [CupertinoUploadPage] 处理拖拽文件失败: $error', tag: 'Debug');
      }
      if (mounted) {
        _showErrorAlert(context, '处理文件失败', error.toString());
      }
    }
  }

  /// 开始上传
  void _startUpload() {
    if (_selectedFiles.isEmpty) {
      _showWarningAlert(context, '请先选择要上传的文件', '');
      return;
    }

    HapticFeedback.lightImpact();

    if (AppConfig.enableLogging) {
      AppLogger.debug('🚀 [CupertinoUploadPage] 开始上传 ${_selectedFiles.length} 个文件',
          tag: 'Debug');
    }

    context.read<InvoiceBloc>().add(
          UploadInvoices(filePaths: List.from(_selectedFiles)),
        );
  }

  /// 处理上传完成
  void _handleUploadCompleted(
      BuildContext context, InvoiceUploadCompleted state) {
    if (AppConfig.enableLogging) {
      AppLogger.debug(
          '✅ [CupertinoUploadPage] 上传完成 - 成功: ${state.successCount}, 失败: ${state.failureCount}, 重复: ${state.duplicateCount}',
          tag: 'Debug');
    }

    String title;
    String message;

    if (state.hasFailure && !state.hasSuccess) {
      title = '上传失败';
      message = '${state.failureCount}个文件上传失败，请检查网络连接后重试';
      HapticFeedback.heavyImpact();
    } else if (state.hasFailure) {
      title = '部分上传成功';
      message = '${state.successCount}个成功，${state.failureCount}个失败';
      if (state.hasDuplicate) {
        message += '，${state.duplicateCount}个重复';
      }
      HapticFeedback.mediumImpact();
    } else if (state.hasSuccess) {
      title = '上传成功！';
      if (state.hasDuplicate) {
        message = '${state.successCount}个文件已成功上传，${state.duplicateCount}个文件已存在';
      } else {
        message = '${state.successCount}个文件已成功上传并开始处理';
      }
      HapticFeedback.lightImpact();
    } else {
      title = '上传完成';
      message = '所有文件已处理';
      HapticFeedback.lightImpact();
    }

    _showResultAlert(context, title, message);
  }

  /// 显示帮助Action Sheet
  void _showHelpActionSheet(BuildContext context) {
    HapticFeedback.lightImpact();
    
    showCupertinoModalPopup<void>(
      context: context,
      builder: (BuildContext context) => CupertinoActionSheet(
        title: Text(
          '上传帮助',
          style: AppTypography.titleMedium(context).copyWith(
            color: AppColors.onSurface(context),
          ),
        ),
        message: Text(
          '支持PDF格式发票文件，单文件不超过10MB',
          style: AppTypography.bodyMedium(context).copyWith(
            color: AppColors.onSurfaceVariant(context),
          ),
        ),
        actions: <CupertinoActionSheetAction>[
          CupertinoActionSheetAction(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
              _showDetailedHelp(context);
            },
            child: Text(
              '查看详细说明',
              style: TextStyle(color: AppColors.primary(context)),
            ),
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          onPressed: () {
            HapticFeedback.lightImpact();
            Navigator.pop(context);
          },
          child: Text(
            '取消',
            style: TextStyle(color: AppColors.primary(context)),
          ),
        ),
      ),
    );
  }

  /// 显示详细帮助
  void _showDetailedHelp(BuildContext context) {
    showCupertinoDialog<void>(
      context: context,
      builder: (BuildContext context) => CupertinoAlertDialog(
        title: Text('上传帮助'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              _buildHelpSection('📄 支持的文件格式', [
                'PDF格式的发票文件',
                '单文件大小不超过10MB',
                '支持拖拽和点击上传',
              ]),
              const SizedBox(height: 16),
              _buildHelpSection('📊 功能特性', [
                '自动OCR识别发票信息',
                '智能去重检查',
                '支持批量上传（最多5个文件）',
                '实时上传进度显示',
              ]),
              const SizedBox(height: 16),
              _buildHelpSection('⚠️ 注意事项', [
                '请确保PDF文件清晰可读',
                '重复文件会自动跳过',
                '建议在WiFi环境下上传',
              ]),
            ],
          ),
        ),
        actions: <CupertinoDialogAction>[
          CupertinoDialogAction(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.of(context).pop();
            },
            child: Text('知道了'),
          ),
        ],
      ),
    );
  }

  /// 构建帮助章节
  Widget _buildHelpSection(String title, List<String> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: AppTypography.labelMedium(context).copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.onSurface(context),
          ),
        ),
        const SizedBox(height: 8),
        ...items.map((item) => Padding(
              padding: const EdgeInsets.only(left: 8, bottom: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '• ',
                    style: AppTypography.bodySmall(context).copyWith(
                      color: AppColors.onSurfaceVariant(context),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      item,
                      style: AppTypography.bodySmall(context).copyWith(
                        color: AppColors.onSurfaceVariant(context),
                      ),
                    ),
                  ),
                ],
              ),
            )),
      ],
    );
  }

  /// 显示错误警告
  void _showErrorAlert(BuildContext context, String title, String message) {
    HapticFeedback.heavyImpact();
    
    showCupertinoDialog<void>(
      context: context,
      builder: (BuildContext context) => CupertinoAlertDialog(
        title: Text(title),
        content: Text(message),
        actions: <CupertinoDialogAction>[
          CupertinoDialogAction(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.of(context).pop();
            },
            child: Text('确定'),
          ),
        ],
      ),
    );
  }

  /// 显示警告信息
  void _showWarningAlert(BuildContext context, String title, String message) {
    HapticFeedback.mediumImpact();
    
    showCupertinoDialog<void>(
      context: context,
      builder: (BuildContext context) => CupertinoAlertDialog(
        title: Text(title),
        content: Text(message),
        actions: <CupertinoDialogAction>[
          CupertinoDialogAction(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.of(context).pop();
            },
            child: Text('确定'),
          ),
        ],
      ),
    );
  }

  /// 显示结果信息
  void _showResultAlert(BuildContext context, String title, String message) {
    showCupertinoDialog<void>(
      context: context,
      builder: (BuildContext context) => CupertinoAlertDialog(
        title: Text(title),
        content: Text(message),
        actions: <CupertinoDialogAction>[
          CupertinoDialogAction(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.of(context).pop();
            },
            child: Text('确定'),
          ),
        ],
      ),
    );
  }

  /// 格式化文件大小
  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}