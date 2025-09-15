import 'dart:io';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import '../../../../core/theme/cupertino_semantic_colors.dart';
import '../../../../core/utils/logger.dart';
import '../../../../core/services/file_operation_service.dart';

/// iOS风格的文件选择组件
///
/// 设计特点：
/// - 使用iOS系统标准的卡片设计
/// - 清晰的视觉层次和间距
/// - 流畅的动画和交互反馈
/// - 符合Apple Human Interface Guidelines
class IOSFilePickerWidget extends StatefulWidget {
  final List<File> selectedFiles;
  final String? validationError;
  final Function(List<File>) onFilesSelected;
  final VoidCallback onStartUpload;
  final Function(int) onRemoveFile;

  const IOSFilePickerWidget({
    super.key,
    required this.selectedFiles,
    this.validationError,
    required this.onFilesSelected,
    required this.onStartUpload,
    required this.onRemoveFile,
  });

  @override
  State<IOSFilePickerWidget> createState() => _IOSFilePickerWidgetState();
}

class _IOSFilePickerWidgetState extends State<IOSFilePickerWidget>
    with TickerProviderStateMixin {
  late AnimationController _bounceController;
  late Animation<double> _bounceAnimation;

  @override
  void initState() {
    super.initState();
    _bounceController = AnimationController(
      duration: const Duration(milliseconds: 150),
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
  void dispose() {
    _bounceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        // 标题和描述区域
        SliverToBoxAdapter(
          child: _buildHeader(),
        ),

        // 文件选择区域
        SliverToBoxAdapter(
          child: _buildFilePickerSection(),
        ),

        // 已选文件列表
        if (widget.selectedFiles.isNotEmpty)
          SliverToBoxAdapter(
            child: _buildSelectedFilesList(),
          ),

        // 错误信息
        if (widget.validationError != null)
          SliverToBoxAdapter(
            child: _buildErrorMessage(),
          ),

        // 注意：选择文件后会自动开始上传，无需手动点击上传按钮

        // 底部间距
        const SliverToBoxAdapter(
          child: SizedBox(height: 32),
        ),
      ],
    );
  }

  Widget _buildHeader() {
    final theme = CupertinoTheme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '选择发票文件',
            style: theme.textTheme.navLargeTitleTextStyle.copyWith(
              fontSize: 28,
              fontWeight: FontWeight.w700,
              color: CupertinoColors.label.resolveFrom(context),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '支持 PDF、JPG、PNG 格式，单个文件不超过 10MB',
            style: TextStyle(
              fontSize: 16,
              color: CupertinoColors.secondaryLabel.resolveFrom(context),
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilePickerSection() {

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        decoration: BoxDecoration(
          color: CupertinoColors.systemBackground.resolveFrom(context),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: CupertinoColors.systemGrey.resolveFrom(context).withValues(alpha: 0.1),
              offset: const Offset(0, 1),
              blurRadius: 8,
              spreadRadius: 0,
            ),
          ],
        ),
        child: Column(
          children: [
            // 拖拽区域
            _buildDragArea(),

            // 分隔线
            Container(
              height: 0.5,
              color: CupertinoColors.separator.resolveFrom(context),
              margin: const EdgeInsets.symmetric(horizontal: 16),
            ),

            // 选择按钮区域
            _buildPickerButtons(),
          ],
        ),
      ),
    );
  }

  Widget _buildDragArea() {

    return GestureDetector(
      onTap: _pickFiles,
      onTapDown: (_) => _bounceController.forward(),
      onTapUp: (_) => _bounceController.reverse(),
      onTapCancel: () => _bounceController.reverse(),
      child: AnimatedBuilder(
        animation: _bounceAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _bounceAnimation.value,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  // 图标
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: CupertinoColors.activeBlue.resolveFrom(context).withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      CupertinoIcons.cloud_upload,
                      size: 32,
                      color: CupertinoColors.activeBlue.resolveFrom(context),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // 主要文本
                  Text(
                    '轻触选择文件',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: CupertinoColors.label.resolveFrom(context),
                    ),
                  ),

                  const SizedBox(height: 4),

                  // 副标题文本
                  Text(
                    '或拖拽文件到此处',
                    style: TextStyle(
                      fontSize: 14,
                      color: CupertinoColors.secondaryLabel.resolveFrom(context),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildPickerButtons() {

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // 选择文件按钮
          SizedBox(
            width: double.infinity,
            child: CupertinoButton(
              onPressed: _pickFiles,
              color: CupertinoColors.activeBlue.resolveFrom(context),
              borderRadius: BorderRadius.circular(8),
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    CupertinoIcons.folder,
                    size: 18,
                    color: CupertinoColors.white,
                  ),
                  SizedBox(width: 8),
                  Text(
                    '选择文件',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: CupertinoColors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 12),

          // 拍照按钮
          SizedBox(
            width: double.infinity,
            child: CupertinoButton(
              onPressed: _pickFromCamera,
              color: CupertinoColors.tertiarySystemBackground.resolveFrom(context),
              borderRadius: BorderRadius.circular(8),
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    CupertinoIcons.camera,
                    size: 18,
                    color: CupertinoColors.label.resolveFrom(context),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '拍照',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: CupertinoColors.label.resolveFrom(context),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectedFilesList() {

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '已选择 ${widget.selectedFiles.length} 个文件',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: CupertinoColors.label.resolveFrom(context),
            ),
          ),
          const SizedBox(height: 4),
          if (widget.validationError == null)
            Text(
              '文件将自动开始上传',
              style: TextStyle(
                fontSize: 14,
                color: CupertinoColors.activeBlue.resolveFrom(context),
              ),
            ),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              color: CupertinoColors.systemBackground.resolveFrom(context),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: CupertinoColors.systemGrey.resolveFrom(context).withValues(alpha: 0.1),
                  offset: const Offset(0, 1),
                  blurRadius: 8,
                  spreadRadius: 0,
                ),
              ],
            ),
            child: Column(
              children: [
                for (int i = 0; i < widget.selectedFiles.length; i++) ...[
                  _buildFileItem(widget.selectedFiles[i], i),
                  if (i < widget.selectedFiles.length - 1)
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
    final fileName = file.path.split('/').last;
    final fileSize = _formatFileSize(file);
    final isImage = _isImageFile(fileName);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          // 文件图标
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isImage
                  ? CupertinoSemanticColors.success.withValues(alpha: 0.1)
                  : CupertinoColors.activeBlue.resolveFrom(context).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              isImage ? CupertinoIcons.photo : CupertinoIcons.doc_text,
              size: 20,
              color: isImage
                  ? CupertinoSemanticColors.success
                  : CupertinoColors.activeBlue.resolveFrom(context),
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
                    color: CupertinoColors.label.resolveFrom(context),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  fileSize,
                  style: TextStyle(
                    fontSize: 14,
                    color: CupertinoColors.secondaryLabel.resolveFrom(context),
                  ),
                ),
              ],
            ),
          ),

          // 删除按钮
          CupertinoButton(
            padding: EdgeInsets.zero,
            onPressed: () {
              HapticFeedback.lightImpact();
              widget.onRemoveFile(index);
            },
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: CupertinoColors.systemRed.resolveFrom(context).withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                CupertinoIcons.xmark,
                size: 16,
                color: CupertinoColors.systemRed.resolveFrom(context),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorMessage() {

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: CupertinoColors.systemRed.resolveFrom(context).withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(
              CupertinoIcons.exclamationmark_triangle_fill,
              size: 20,
              color: CupertinoColors.systemRed.resolveFrom(context),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                widget.validationError!,
                style: TextStyle(
                  fontSize: 14,
                  color: CupertinoColors.systemRed.resolveFrom(context),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickFiles() async {
    try {
      HapticFeedback.selectionClick();

      // 确保在主线程中调用文件选择器
      if (!mounted) return;
      
      final result = await FileOperationService.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
        allowMultiple: true,
        context: context,
      );

      if (result != null && mounted) {
        final files = result.paths
            .where((path) => path != null)
            .map((path) => File(path!))
            .toList();

        if (files.isNotEmpty) {
          widget.onFilesSelected(files);
        }
      }
    } catch (e) {
      AppLogger.warning('文件选择操作失败', tag: 'FilePicker', error: e);
      
      if (mounted) {
        await _showFilePickerErrorDialog();
      }
    }
  }

  Future<void> _pickFromCamera() async {
    try {
      HapticFeedback.selectionClick();

      // 确保在主线程中调用文件选择器
      if (!mounted) return;
      
      final result = await FileOperationService.pickFiles(
        type: FileType.image,
        allowMultiple: false,
        context: context,
      );

      if (result != null && result.files.single.path != null && mounted) {
        final file = File(result.files.single.path!);
        final updatedFiles = [...widget.selectedFiles, file];
        widget.onFilesSelected(updatedFiles);
      }
    } catch (e) {
      AppLogger.warning('拍照选择操作失败', tag: 'FilePicker', error: e);
      
      if (mounted) {
        await _showFilePickerErrorDialog();
      }
    }
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

  /// 显示文件选择器错误对话框
  Future<void> _showFilePickerErrorDialog() async {
    return showCupertinoDialog<void>(
      context: context,
      builder: (BuildContext context) {
        return CupertinoAlertDialog(
          title: const Text('文件选择失败'),
          content: const Text(
            '无法打开文件选择器。请检查应用权限设置，或稍后再试。',
          ),
          actions: <CupertinoDialogAction>[
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: const Text('确定'),
            ),
          ],
        );
      },
    );
  }
}
