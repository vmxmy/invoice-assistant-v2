import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:file_picker/file_picker.dart';
import 'package:go_router/go_router.dart';
import '../../core/di/injection_container.dart';
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
    return BlocProvider(
      create: (context) => sl<InvoiceBloc>(),
      child: Scaffold(
        appBar: AppBar(
          title: const Text('上传发票'),
          centerTitle: true,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.help_outline),
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
                child: Column(
                  children: [
                    // 上传区域
                    Expanded(
                      child: _buildUploadArea(context, state),
                    ),
                    
                    // 底部操作栏
                    if (_selectedFiles.isNotEmpty && state is! InvoiceUploading)
                      _buildActionBar(context),
                  ],
                ),
              ),
            );
          },
        ),
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
    return Container(
      decoration: BoxDecoration(
        border: Border.all(
          color: _isDragging ? Theme.of(context).primaryColor : Colors.grey.shade300,
          width: 2,
          style: BorderStyle.solid,
        ),
        borderRadius: BorderRadius.circular(12),
        color: _isDragging 
          ? Theme.of(context).primaryColor.withValues(alpha: 0.1)
          : Colors.grey.shade50,
      ),
      child: InkWell(
        onTap: _pickFiles,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                _selectedFiles.isEmpty ? Icons.cloud_upload_outlined : Icons.folder_open,
                size: 80,
                color: Theme.of(context).primaryColor,
              ),
              const SizedBox(height: 24),
              
              Text(
                _selectedFiles.isEmpty ? '选择PDF发票文件' : '已选择 ${_selectedFiles.length} 个文件',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: Theme.of(context).primaryColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              
              Text(
                _selectedFiles.isEmpty 
                  ? '点击此处选择PDF文件\n支持多文件选择，最多5个文件'
                  : '点击重新选择文件',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 24),
              
              // 文件格式说明
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _buildBadge('PDF格式', Icons.picture_as_pdf),
                  _buildBadge('多文件', Icons.library_add),
                  _buildBadge('最多5个', Icons.filter_5),
                  _buildBadge('OCR识别', Icons.text_fields),
                ],
              ),
              
              // 已选文件列表
              if (_selectedFiles.isNotEmpty) ...[
                const SizedBox(height: 24),
                const Divider(),
                const SizedBox(height: 16),
                
                Text(
                  '已选择的文件:',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                
                ...List.generate(_selectedFiles.length, (index) {
                  final filePath = _selectedFiles[index];
                  final fileName = filePath.split('/').last;
                  final file = File(filePath);
                  final fileSize = file.existsSync() ? file.lengthSync() : 0;
                  
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: Colors.grey.shade200),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: ListTile(
                      leading: const Icon(Icons.picture_as_pdf, color: Colors.red),
                      title: Text(
                        fileName,
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                      subtitle: Text(_formatFileSize(fileSize)),
                      trailing: IconButton(
                        icon: const Icon(Icons.close, color: Colors.grey),
                        onPressed: () => _removeFile(index),
                      ),
                    ),
                  );
                }),
              ],
            ],
          ),
        ),
      ),
    );
  }

  /// 构建标签
  Widget _buildBadge(String text, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).primaryColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).primaryColor.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 16,
            color: Theme.of(context).primaryColor,
          ),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              color: Theme.of(context).primaryColor,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
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
            child: OutlinedButton.icon(
              onPressed: () {
                setState(() {
                  _selectedFiles.clear();
                });
              },
              icon: const Icon(Icons.clear),
              label: const Text('清空'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            flex: 2,
            child: ElevatedButton.icon(
              onPressed: _startUpload,
              icon: const Icon(Icons.upload),
              label: Text('上传 ${_selectedFiles.length} 个文件'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
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
        print('📁 [UploadPage] 开始选择文件');
        print('📁 [UploadPage] FilePicker平台: ${FilePicker.platform.runtimeType}');
      }

      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
        allowMultiple: true,
      );
      
      if (AppConfig.enableLogging) {
        print('📁 [UploadPage] FilePicker结果: ${result != null ? '有结果' : 'null'}');
        if (result != null) {
          print('📁 [UploadPage] 文件数量: ${result.files.length}');
          for (var file in result.files) {
            print('📁 [UploadPage] 文件: ${file.name}, 路径: ${file.path}');
          }
        }
      }

      if (result != null && result.files.isNotEmpty) {
        final selectedPaths = result.paths
            .where((path) => path != null)
            .cast<String>()
            .take(5) // 限制最多5个文件
            .toList();

        if (selectedPaths.length != result.paths.length) {
          AppFeedback.warning(context, '文件数量限制', message: '最多只能选择5个文件，已自动截取前5个');
        }

        setState(() {
          _selectedFiles.clear();
          _selectedFiles.addAll(selectedPaths);
        });

        if (AppConfig.enableLogging) {
          print('📁 [UploadPage] 选择了 ${_selectedFiles.length} 个文件');
        }
      }
    } catch (error) {
      if (AppConfig.enableLogging) {
        print('❌ [UploadPage] 选择文件失败: $error');
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

  /// 开始上传
  void _startUpload() {
    if (_selectedFiles.isEmpty) {
      AppFeedback.warning(context, '请先选择要上传的文件');
      return;
    }

    if (AppConfig.enableLogging) {
      print('🚀 [UploadPage] 开始上传 ${_selectedFiles.length} 个文件');
    }

    // 发送批量上传事件
    context.read<InvoiceBloc>().add(
      UploadInvoices(filePaths: List.from(_selectedFiles)),
    );
  }

  /// 处理上传完成
  void _handleUploadCompleted(BuildContext context, InvoiceUploadCompleted state) {
    if (AppConfig.enableLogging) {
      print('✅ [UploadPage] 上传完成 - 成功: ${state.successCount}, 失败: ${state.failureCount}, 重复: ${state.duplicateCount}');
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
        title: const Text('上传帮助'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('📄 支持的文件格式:'),
            Text('• PDF格式的发票文件', style: TextStyle(fontSize: 14)),
            SizedBox(height: 12),
            Text('📊 功能特性:'),
            Text('• 自动OCR识别发票信息', style: TextStyle(fontSize: 14)),
            Text('• 智能去重检查', style: TextStyle(fontSize: 14)),
            Text('• 支持批量上传（最多5个文件）', style: TextStyle(fontSize: 14)),
            Text('• 支持火车票和普通发票', style: TextStyle(fontSize: 14)),
            SizedBox(height: 12),
            Text('⚠️ 注意事项:'),
            Text('• 请确保PDF文件清晰可读', style: TextStyle(fontSize: 14)),
            Text('• 重复文件会自动跳过', style: TextStyle(fontSize: 14)),
            Text('• 处理时间取决于文件大小和复杂度', style: TextStyle(fontSize: 14)),
          ],
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

  /// 格式化文件大小
  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}