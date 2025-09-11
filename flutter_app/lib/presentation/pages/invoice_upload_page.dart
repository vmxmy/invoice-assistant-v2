import '../../core/utils/logger.dart';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:file_picker/file_picker.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_config.dart';
import '../bloc/invoice_bloc.dart';
import '../bloc/invoice_event.dart';
import '../bloc/invoice_state.dart';
import '../widgets/upload_progress_widget.dart';
import '../widgets/upload_result_widget.dart';
import '../widgets/app_feedback.dart';

/// 发票上传页面
class InvoiceUploadPage extends StatefulWidget {
  const InvoiceUploadPage({super.key});

  @override
  State<InvoiceUploadPage> createState() => _InvoiceUploadPageState();
}

class _InvoiceUploadPageState extends State<InvoiceUploadPage> {
  final List<String> _selectedFiles = [];
  bool _isDragging = false;

  @override
  Widget build(BuildContext context) {
    // 使用App级别的BLoC实例，确保状态同步
    final bloc = context.read<InvoiceBloc>();
    if (AppConfig.enableLogging) {
      AppLogger.debug('📤 [UploadPage:${bloc.hashCode}] 使用来自App级的全局InvoiceBloc', tag: 'Debug');
    }
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('上传发票'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(CupertinoIcons.back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(CupertinoIcons.question_circle),
            onPressed: () => _showHelpDialog(context),
          ),
        ],
      ),
      body: BlocConsumer<InvoiceBloc, InvoiceState>(
        listener: (context, state) {
          if (state is InvoiceUploadCompleted) {
            _handleUploadCompleted(context, state);
          } else if (state is InvoiceError) {
            AppFeedback.error(context, '操作失败', message: state.message);
          }
        },
        builder: (context, state) {
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  // 对于宽屏设备（如Mac），限制内容宽度并居中显示
                  final bool isWideScreen = constraints.maxWidth > 800;
                  final double contentWidth = isWideScreen ? 600.0 : constraints.maxWidth;
                  
                  Widget content = Column(
                    children: [
                      // 上传区域
                      Expanded(
                        child: _buildUploadArea(context, state),
                      ),
                      
                      // 底部操作栏
                      if (_selectedFiles.isNotEmpty && state is! InvoiceUploading)
                        _buildActionBar(context),
                    ],
                  );
                  
                  if (isWideScreen) {
                    return Center(
                      child: SizedBox(
                        width: contentWidth,
                        child: content,
                      ),
                    );
                  }
                  
                  return content;
                },
              ),
            ),
          );
        },
      ),
    );
  }

  /// 构建上传区域
  Widget _buildUploadArea(BuildContext context, InvoiceState state) {
    if (state is InvoiceUploading) {
      return UploadProgressWidget(
        progresses: state.progresses,
        completedCount: state.completedCount,
        totalCount: state.totalCount,
        onCancel: () {
          context.read<InvoiceBloc>().add(const CancelUpload());
        },
      );
    }

    if (state is InvoiceUploadCompleted) {
      return UploadResultWidget(
        results: state.results,
        successCount: state.successCount,
        failureCount: state.failureCount,
        duplicateCount: state.duplicateCount,
        onRetry: (filePath) {
          context.read<InvoiceBloc>().add(RetryUpload(filePath: filePath));
        },
        onClear: () {
          context.read<InvoiceBloc>().add(const ClearUploadResults());
          setState(() {
            _selectedFiles.clear();
          });
        },
        onViewInvoice: (invoice) {
          // 导航到发票详情页面
          context.push('/invoice-detail/${invoice.id}');
        },
      );
    }

    return _buildFilePicker(context);
  }

  /// 构建文件选择器
  Widget _buildFilePicker(BuildContext context) {
    return DragTarget<List<String>>(
      onWillAcceptWithDetails: (details) {
        setState(() {
          _isDragging = true;
        });
        return true;
      },
      onLeave: (data) {
        setState(() {
          _isDragging = false;
        });
      },
      onAcceptWithDetails: (details) {
        setState(() {
          _isDragging = false;
        });
        _handleDroppedFiles(details.data);
      },
      builder: (context, candidateData, rejectedData) {
        return Container(
          decoration: BoxDecoration(
            border: Border.all(
              color: _isDragging ? Theme.of(context).primaryColor : Colors.grey.shade300,
              width: _isDragging ? 3 : 2,
              style: _isDragging ? BorderStyle.solid : BorderStyle.solid,
            ),
            borderRadius: BorderRadius.circular(12),
            color: _isDragging 
              ? Theme.of(context).primaryColor.withValues(alpha: 0.15)
              : Colors.grey.shade50,
          ),
          child: Semantics(
            label: _selectedFiles.isEmpty 
              ? '选择PDF发票文件或拖拽文件到此处上传，最多5个文件，单文件不超过10MB'
              : '已选择${_selectedFiles.length}个文件，点击重新选择',
            button: true,
            child: InkWell(
              onTap: _pickFiles,
              borderRadius: BorderRadius.circular(12),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Center(
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _selectedFiles.isEmpty ? CupertinoIcons.cloud_upload : CupertinoIcons.folder_open,
                            size: 32,
                            color: Theme.of(context).primaryColor,
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _selectedFiles.isEmpty ? '选择PDF发票文件' : '已选择 ${_selectedFiles.length} 个文件',
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: Theme.of(context).primaryColor,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _selectedFiles.isEmpty 
                                  ? (_isDragging 
                                    ? '释放文件到此处上传'
                                    : '点击选择或拖拽文件')
                                  : '点击重新选择文件',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: _isDragging ? Theme.of(context).primaryColor : Colors.grey.shade600,
                                  fontWeight: _isDragging ? FontWeight.w500 : FontWeight.normal,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      
                      // 已选文件列表
                      if (_selectedFiles.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        
                        ...List.generate(_selectedFiles.length, (index) {
                          final filePath = _selectedFiles[index];
                          final fileName = filePath.split('/').last;
                          final file = File(filePath);
                          final fileSize = file.existsSync() ? file.lengthSync() : 0;
                          
                          return Semantics(
                            label: 'PDF文件 $fileName，大小 ${_formatFileSize(fileSize)}',
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                border: Border.all(color: Colors.grey.shade200),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: ListTile(
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                leading: const Icon(CupertinoIcons.doc_text, color: Colors.red),
                                title: Text(
                                  fileName,
                                  style: const TextStyle(fontWeight: FontWeight.w500),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                subtitle: Text(
                                  _formatFileSize(fileSize),
                                  style: TextStyle(
                                    color: Colors.grey.shade600,
                                    fontSize: 12,
                                  ),
                                ),
                                trailing: Semantics(
                                  label: '移除文件 $fileName',
                                  button: true,
                                  child: IconButton(
                                    icon: const Icon(CupertinoIcons.xmark, color: Colors.grey),
                                    onPressed: () => _removeFile(index),
                                    tooltip: '移除此文件',
                                    constraints: const BoxConstraints(
                                      minWidth: 40,
                                      minHeight: 40,
                                    ),
                                    padding: const EdgeInsets.all(8),
                                  ),
                                ),
                              ),
                            ),
                          );
                        }),
                      ],
                    ],
                  ),
                ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }


  /// 构建底部操作栏
  Widget _buildActionBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              label: '清空所有已选择的文件',
              child: OutlinedButton.icon(
                onPressed: () {
                  setState(() {
                    _selectedFiles.clear();
                  });
                },
                icon: const Icon(CupertinoIcons.clear),
                label: const Text('清空'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            flex: 2,
            child: Semantics(
              label: '开始上传${_selectedFiles.length}个已选择的PDF文件',
              child: ElevatedButton.icon(
                onPressed: _startUpload,
                icon: const Icon(CupertinoIcons.cloud_upload),
                label: Text('上传 ${_selectedFiles.length} 个文件'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 选择文件
  Future<void> _pickFiles() async {
    try {
      if (AppConfig.enableLogging) {
        AppLogger.debug('📁 [UploadPage] 开始选择文件', tag: 'Debug');
        AppLogger.debug('📁 [UploadPage] FilePicker平台: ${FilePicker.platform.runtimeType}', tag: 'Debug');
      }

      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
        allowMultiple: true,
      );
      
      if (AppConfig.enableLogging) {
        print('📁 [UploadPage] FilePicker结果: ${result != null ? '有结果' : 'null'}');
        if (result != null) {
          AppLogger.debug('📁 [UploadPage] 文件数量: ${result.files.length}', tag: 'Debug');
          for (var file in result.files) {
            AppLogger.debug('📁 [UploadPage] 文件: ${file.name}, 路径: ${file.path}', tag: 'Debug');
          }
        }
      }

      if (result != null && result.files.isNotEmpty) {
        final selectedPaths = result.paths
            .where((path) => path != null)
            .cast<String>()
            .toList();

        // 检查文件大小
        const maxFileSize = 10 * 1024 * 1024; // 10MB
        final validFiles = <String>[];
        final oversizedFiles = <String>[];

        for (final filePath in selectedPaths.take(5)) {
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

        // 显示相应的警告信息
        if (oversizedFiles.isNotEmpty) {
          AppFeedback.warning(context, '文件过大', 
            message: '${oversizedFiles.length}个文件超过10MB大小限制，已自动忽略');
        }

        if (selectedPaths.length > 5) {
          AppFeedback.warning(context, '文件数量限制', 
            message: '最多只能选择5个文件，已自动截取前5个有效文件');
        }

        if (validFiles.isNotEmpty) {
          setState(() {
            _selectedFiles.clear();
            _selectedFiles.addAll(validFiles);
          });

          if (AppConfig.enableLogging) {
            AppLogger.debug('📁 [UploadPage] 选择了 ${validFiles.length} 个有效文件', tag: 'Debug');
          }
        } else {
          AppFeedback.error(context, '无有效文件', message: '所选文件都不符合要求（格式或大小）');
        }
      }
    } catch (error) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [UploadPage] 选择文件失败: $error', tag: 'Debug');
      }
      
      if (mounted) {
        AppFeedback.error(context, '文件选择失败', message: error.toString());
      }
    }
  }

  /// 移除文件
  void _removeFile(int index) {
    setState(() {
      _selectedFiles.removeAt(index);
    });
  }

  /// 处理拖拽文件
  Future<void> _handleDroppedFiles(List<String> filePaths) async {
    try {
      if (AppConfig.enableLogging) {
        AppLogger.debug('📁 [UploadPage] 处理拖拽文件: ${filePaths.length}个', tag: 'Debug');
      }

      // 过滤PDF文件
      final pdfFiles = filePaths.where((path) {
        return path.toLowerCase().endsWith('.pdf');
      }).toList();

      if (pdfFiles.isEmpty) {
        AppFeedback.warning(context, '文件格式不支持', message: '仅支持PDF格式的文件');
        return;
      }

      if (pdfFiles.length != filePaths.length) {
        AppFeedback.warning(context, '部分文件已过滤', 
          message: '已过滤掉非PDF格式的文件，仅保留${pdfFiles.length}个PDF文件');
      }

      // 检查文件大小
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      final validFiles = <String>[];
      final oversizedFiles = <String>[];

      for (final filePath in pdfFiles.take(5)) {
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

      if (oversizedFiles.isNotEmpty) {
        AppFeedback.warning(context, '文件过大', 
          message: '${oversizedFiles.length}个文件超过10MB大小限制，已自动忽略');
      }

      if (pdfFiles.length > 5) {
        AppFeedback.warning(context, '文件数量限制', 
          message: '最多只能选择5个文件，已自动截取前5个有效文件');
      }

      if (validFiles.isNotEmpty) {
        setState(() {
          _selectedFiles.clear();
          _selectedFiles.addAll(validFiles);
        });

        if (AppConfig.enableLogging) {
          AppLogger.debug('📁 [UploadPage] 拖拽添加了 ${validFiles.length} 个有效文件', tag: 'Debug');
        }
      } else {
        AppFeedback.error(context, '无有效文件', message: '没有找到符合要求的PDF文件');
      }
    } catch (error) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [UploadPage] 处理拖拽文件失败: $error', tag: 'Debug');
      }
      AppFeedback.error(context, '处理文件失败', message: error.toString());
    }
  }

  /// 开始上传
  void _startUpload() {
    if (_selectedFiles.isEmpty) {
      AppFeedback.warning(context, '请先选择要上传的文件');
      return;
    }

    if (AppConfig.enableLogging) {
      AppLogger.debug('🚀 [UploadPage] 开始上传 ${_selectedFiles.length} 个文件', tag: 'Debug');
    }

    // 发送批量上传事件
    context.read<InvoiceBloc>().add(
      UploadInvoices(filePaths: List.from(_selectedFiles)),
    );
  }

  /// 处理上传完成
  void _handleUploadCompleted(BuildContext context, InvoiceUploadCompleted state) {
    if (AppConfig.enableLogging) {
      AppLogger.debug('✅ [UploadPage] 上传完成 - 成功: ${state.successCount}, 失败: ${state.failureCount}, 重复: ${state.duplicateCount}', tag: 'Debug');
    }
    
    // 构建消息内容
    String title;
    String details;
    FeedbackType type;
    
    if (state.hasFailure && !state.hasSuccess) {
      title = '上传失败';
      details = '${state.failureCount}个文件上传失败，请检查网络连接后重试';
      type = FeedbackType.error;
    } else if (state.hasFailure) {
      title = '部分上传成功';
      details = '${state.successCount}个成功，${state.failureCount}个失败';
      if (state.hasDuplicate) {
        details += '，${state.duplicateCount}个重复';
      }
      type = FeedbackType.warning;
    } else if (state.hasSuccess) {
      title = '上传成功！';
      if (state.hasDuplicate) {
        details = '${state.successCount}个文件已成功上传，${state.duplicateCount}个文件已存在';
      } else {
        details = '${state.successCount}个文件已成功上传并开始处理';
      }
      type = FeedbackType.success;
    } else {
      title = '上传完成';
      details = '所有文件已处理';
      type = FeedbackType.info;
    }
    
    AppFeedback.show(
      context,
      FeedbackConfig(
        title: title,
        message: details,
        type: type,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  /// 显示帮助对话框
  void _showHelpDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(CupertinoIcons.question_circle, color: Theme.of(context).primaryColor),
            const SizedBox(width: 8),
            const Text('上传帮助'),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHelpSection(
                '📄 支持的文件格式',
                [
                  'PDF格式的发票文件',
                  '单文件大小不超过10MB',
                  '支持拖拽和点击上传',
                ]
              ),
              const SizedBox(height: 16),
              _buildHelpSection(
                '📊 功能特性',
                [
                  '自动OCR识别发票信息',
                  '智能去重检查（基于文件哈希）',
                  '支持批量上传（最多5个文件）',
                  '支持火车票和普通发票',
                  '实时上传进度显示',
                ]
              ),
              const SizedBox(height: 16),
              _buildHelpSection(
                '🎯 操作指南',
                [
                  '点击上传区域选择文件',
                  '拖拽PDF文件到上传区域',
                  '可在上传前预览和移除文件',
                  '上传过程中可查看实时进度',
                ]
              ),
              const SizedBox(height: 16),
              _buildHelpSection(
                '⚠️ 注意事项',
                [
                  '请确保PDF文件清晰可读',
                  '重复文件会自动跳过',
                  '处理时间取决于文件大小和复杂度',
                  '网络较慢时请耐心等待',
                  '建议在WiFi环境下上传大文件',
                ]
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('知道了'),
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
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 8),
        ...items.map((item) => Padding(
          padding: const EdgeInsets.only(left: 8, bottom: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('• ', style: TextStyle(fontSize: 14)),
              Expanded(
                child: Text(
                  item,
                  style: const TextStyle(fontSize: 14),
                ),
              ),
            ],
          ),
        )).toList(),
      ],
    );
  }

  /// 格式化文件大小
  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}