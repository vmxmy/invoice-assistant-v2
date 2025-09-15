import 'dart:io';

/// 上传事件基类
abstract class UploadEvent {
  const UploadEvent();
}

/// 选择文件事件
class SelectFiles extends UploadEvent {
  final List<File> files;
  
  const SelectFiles(this.files);
  
  @override
  String toString() => 'SelectFiles(${files.length} files)';
}

/// 添加文件事件
class AddFiles extends UploadEvent {
  final List<File> files;
  
  const AddFiles(this.files);
  
  @override
  String toString() => 'AddFiles(${files.length} files)';
}

/// 移除文件事件
class RemoveFile extends UploadEvent {
  final int index;
  
  const RemoveFile(this.index);
  
  @override
  String toString() => 'RemoveFile($index)';
}

/// 清空文件事件
class ClearFiles extends UploadEvent {
  const ClearFiles();
  
  @override
  String toString() => 'ClearFiles()';
}

/// 开始上传事件
class StartUpload extends UploadEvent {
  const StartUpload();
  
  @override
  String toString() => 'StartUpload()';
}

/// 取消上传事件
class CancelUpload extends UploadEvent {
  const CancelUpload();
  
  @override
  String toString() => 'CancelUpload()';
}

/// 重试上传事件
class RetryUpload extends UploadEvent {
  final List<int>? failedIndices; // null表示重试所有失败的文件
  
  const RetryUpload([this.failedIndices]);
  
  @override
  String toString() => 'RetryUpload($failedIndices)';
}

/// 重置状态事件
class ResetUpload extends UploadEvent {
  const ResetUpload();
  
  @override
  String toString() => 'ResetUpload()';
}

/// 更新进度事件（内部使用）
class UpdateProgress extends UploadEvent {
  final int fileIndex;
  final double progress;
  
  const UpdateProgress(this.fileIndex, this.progress);
  
  @override
  String toString() => '_UpdateProgress($fileIndex, $progress)';
}

/// 文件上传完成事件（内部使用）
class FileUploadCompleted extends UploadEvent {
  final int fileIndex;
  final bool success;
  final String? errorMessage;
  final String? invoiceId;
  
  const FileUploadCompleted(
    this.fileIndex, 
    this.success, {
    this.errorMessage,
    this.invoiceId,
  });
  
  @override
  String toString() => '_FileUploadCompleted($fileIndex, $success, $errorMessage)';
}