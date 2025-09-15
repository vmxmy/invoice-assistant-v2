import 'dart:io';

/// 上传状态基类
abstract class UploadState {
  const UploadState();
}

/// 初始状态
class UploadInitial extends UploadState {
  const UploadInitial();

  @override
  String toString() => 'UploadInitial()';
}

/// 文件已选择状态
class FilesSelected extends UploadState {
  final List<File> files;
  final String? validationError;

  const FilesSelected(this.files, {this.validationError});

  bool get isValid => validationError == null;

  @override
  String toString() =>
      'FilesSelected(${files.length} files, error: $validationError)';
}

/// 上传中状态 - 同时显示进度和实时结果
class UploadInProgress extends UploadState {
  final List<File> files;
  final List<FileUploadProgress> progresses;
  final List<UploadResult> completedResults; // 新增：已完成的文件结果
  final int completedCount;
  final int failedCount;

  const UploadInProgress({
    required this.files,
    required this.progresses,
    required this.completedResults,
    required this.completedCount,
    required this.failedCount,
  });

  int get totalCount => files.length;
  double get overallProgress =>
      totalCount > 0 ? completedCount / totalCount : 0.0;
  bool get hasFailures => failedCount > 0;
  bool get isCompleted => completedCount + failedCount == totalCount;

  // 获取指定索引的上传结果（如果已完成）
  UploadResult? getResultForIndex(int index) {
    try {
      return completedResults.firstWhere((result) => result.index == index);
    } catch (e) {
      return null;
    }
  }

  // 检查指定文件是否已完成（成功或失败）
  bool isFileCompleted(int index) {
    return getResultForIndex(index) != null;
  }

  @override
  String toString() =>
      'UploadInProgress($completedCount/$totalCount, $failedCount failed)';
}

/// 上传完成状态
class UploadCompleted extends UploadState {
  final List<File> files;
  final List<UploadResult> results;

  const UploadCompleted({
    required this.files,
    required this.results,
  });

  int get successCount => results.where((r) => r.success).length;
  int get failedCount => results.where((r) => !r.success).length;
  int get totalCount => results.length;
  bool get hasFailures => failedCount > 0;
  bool get allSucceeded => failedCount == 0;

  List<UploadResult> get successResults =>
      results.where((r) => r.success).toList();
  List<UploadResult> get failedResults =>
      results.where((r) => !r.success).toList();

  @override
  String toString() => 'UploadCompleted($successCount/$totalCount succeeded)';
}

/// 上传失败状态
class UploadError extends UploadState {
  final String message;
  final List<File>? files;

  const UploadError(this.message, {this.files});

  @override
  String toString() => 'UploadError($message)';
}

/// 文件上传进度
class FileUploadProgress {
  final int index;
  final File file;
  final double progress; // 0.0 - 1.0
  final UploadStatus status;
  final String? errorMessage;
  final String? invoiceId;

  const FileUploadProgress({
    required this.index,
    required this.file,
    required this.progress,
    required this.status,
    this.errorMessage,
    this.invoiceId,
  });

  String get fileName => file.path.split('/').last;
  bool get isCompleted => status == UploadStatus.completed;
  bool get isFailed => status == UploadStatus.failed;
  bool get isUploading => status == UploadStatus.uploading;
  bool get isPending => status == UploadStatus.pending;

  FileUploadProgress copyWith({
    double? progress,
    UploadStatus? status,
    String? errorMessage,
    String? invoiceId,
  }) {
    return FileUploadProgress(
      index: index,
      file: file,
      progress: progress ?? this.progress,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
      invoiceId: invoiceId ?? this.invoiceId,
    );
  }

  @override
  String toString() =>
      'FileUploadProgress($index: $fileName, $progress, $status)';
}

/// 上传状态枚举
enum UploadStatus {
  pending, // 等待上传
  uploading, // 上传中
  completed, // 上传成功
  failed, // 上传失败
}

/// 上传结果
class UploadResult {
  final int index;
  final File file;
  final bool success;
  final String? errorMessage;
  final String? invoiceId;
  final DateTime uploadTime;

  const UploadResult({
    required this.index,
    required this.file,
    required this.success,
    this.errorMessage,
    this.invoiceId,
    required this.uploadTime,
  });

  String get fileName => file.path.split('/').last;

  @override
  String toString() => 'UploadResult($index: $fileName, success: $success)';
}
