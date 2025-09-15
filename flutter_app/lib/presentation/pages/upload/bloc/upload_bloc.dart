import 'dart:async';
import 'dart:io';
import 'dart:collection';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../domain/usecases/upload_invoice_usecase.dart';
import '../../../../core/events/app_event_bus.dart';
import '../../../../core/constants/message_constants.dart';
import '../../../../core/config/app_constants.dart';
import '../utils/upload_validator.dart';
import '../utils/upload_config.dart';
import 'upload_event.dart';
import 'upload_state.dart';

/// 上传业务逻辑控制器
class UploadBloc extends Bloc<UploadEvent, UploadState> {
  final UploadInvoiceUseCase _uploadUseCase;

  // 内部状态
  final List<File> _selectedFiles = [];
  final Map<int, CancelToken> _uploadTokens = {};
  bool _disposed = false;

  UploadBloc({
    required UploadInvoiceUseCase uploadUseCase,
    required AppEventBus eventBus, // Keep parameter for compatibility
  })  : _uploadUseCase = uploadUseCase,
        super(const UploadInitial()) {
    // 注册事件处理器
    on<SelectFiles>(_onSelectFiles);
    on<AddFiles>(_onAddFiles);
    on<RemoveFile>(_onRemoveFile);
    on<ClearFiles>(_onClearFiles);
    on<StartUpload>(_onStartUpload);
    on<CancelUpload>(_onCancelUpload);
    on<RetryUpload>(_onRetryUpload);
    on<ResetUpload>(_onResetUpload);
    on<UpdateProgress>(_onUpdateProgress);
    on<FileUploadCompleted>(_onFileUploadCompleted);
  }

  @override
  Future<void> close() {
    _disposed = true;
    _cancelAllUploads();
    return super.close();
  }

  /// 选择文件
  Future<void> _onSelectFiles(
      SelectFiles event, Emitter<UploadState> emit) async {
    if (_disposed) return;

    _selectedFiles.clear();
    _selectedFiles.addAll(event.files);

    final validation = UploadValidator.validateFileList(_selectedFiles);
    emit(FilesSelected(_selectedFiles,
        validationError: validation.isValid ? null : validation.errorMessage));
  }

  /// 添加文件
  Future<void> _onAddFiles(AddFiles event, Emitter<UploadState> emit) async {
    if (_disposed) return;

    // 检查总文件数量限制
    final totalFiles = _selectedFiles.length + event.files.length;
    if (totalFiles > UploadConfig.maxFileCount) {
      emit(FilesSelected(_selectedFiles,
          validationError: '文件总数超过限制（最多${UploadConfig.maxFileCount}个）'));
      return;
    }

    // 过滤重复文件
    final newFiles = <File>[];
    final existingPaths = _selectedFiles.map((f) => f.path).toSet();

    for (final file in event.files) {
      if (!existingPaths.contains(file.path)) {
        newFiles.add(file);
      }
    }

    _selectedFiles.addAll(newFiles);

    final validation = UploadValidator.validateFileList(_selectedFiles);
    emit(FilesSelected(_selectedFiles,
        validationError: validation.isValid ? null : validation.errorMessage));
  }

  /// 移除文件
  Future<void> _onRemoveFile(
      RemoveFile event, Emitter<UploadState> emit) async {
    if (_disposed || event.index < 0 || event.index >= _selectedFiles.length) {
      return;
    }

    _selectedFiles.removeAt(event.index);

    if (_selectedFiles.isEmpty) {
      emit(const UploadInitial());
    } else {
      final validation = UploadValidator.validateFileList(_selectedFiles);
      emit(FilesSelected(_selectedFiles,
          validationError:
              validation.isValid ? null : validation.errorMessage));
    }
  }

  /// 清空文件
  Future<void> _onClearFiles(
      ClearFiles event, Emitter<UploadState> emit) async {
    if (_disposed) return;

    _selectedFiles.clear();
    _cancelAllUploads();
    emit(const UploadInitial());
  }

  /// 重置上传
  Future<void> _onResetUpload(
      ResetUpload event, Emitter<UploadState> emit) async {
    if (_disposed) return;

    _cancelAllUploads();

    if (_selectedFiles.isEmpty) {
      emit(const UploadInitial());
    } else {
      final validation = UploadValidator.validateFileList(_selectedFiles);
      emit(FilesSelected(_selectedFiles,
          validationError:
              validation.isValid ? null : validation.errorMessage));
    }
  }

  /// 开始上传
  Future<void> _onStartUpload(
      StartUpload event, Emitter<UploadState> emit) async {
    if (_disposed || _selectedFiles.isEmpty) return;

    // 最终验证
    final validation = UploadValidator.validateFileList(_selectedFiles);
    if (!validation.isValid) {
      emit(UploadError(validation.errorMessage!));
      return;
    }

    // 初始化进度
    final progresses = _selectedFiles.asMap().entries.map((entry) {
      return FileUploadProgress(
        index: entry.key,
        file: entry.value,
        progress: 0.0,
        status: UploadStatus.pending,
      );
    }).toList();

    emit(UploadInProgress(
      files: List.from(_selectedFiles),
      progresses: progresses,
      completedResults: [], // 初始时没有完成的结果
      completedCount: 0,
      failedCount: 0,
    ));

    // 并发上传文件
    await _uploadFiles();
  }

  /// 取消上传
  Future<void> _onCancelUpload(
      CancelUpload event, Emitter<UploadState> emit) async {
    if (_disposed) return;

    _cancelAllUploads();

    if (_selectedFiles.isNotEmpty) {
      final validation = UploadValidator.validateFileList(_selectedFiles);
      emit(FilesSelected(_selectedFiles,
          validationError:
              validation.isValid ? null : validation.errorMessage));
    } else {
      emit(const UploadInitial());
    }
  }

  /// 重试上传
  Future<void> _onRetryUpload(
      RetryUpload event, Emitter<UploadState> emit) async {
    if (_disposed) return;

    final currentState = state;
    if (currentState is! UploadCompleted) return;

    // 确定要重试的文件
    final filesToRetry = <int>[];
    if (event.failedIndices != null) {
      filesToRetry.addAll(event.failedIndices!);
    } else {
      // 重试所有失败的文件
      for (int i = 0; i < currentState.results.length; i++) {
        if (!currentState.results[i].success) {
          filesToRetry.add(i);
        }
      }
    }

    if (filesToRetry.isEmpty) return;

    // 重置进度状态
    final progresses = List<FileUploadProgress>.from(
        currentState.files.asMap().entries.map((entry) {
      final index = entry.key;
      final file = entry.value;
      final existingResult = currentState.results[index];

      if (filesToRetry.contains(index)) {
        return FileUploadProgress(
          index: index,
          file: file,
          progress: 0.0,
          status: UploadStatus.pending,
        );
      } else {
        return FileUploadProgress(
          index: index,
          file: file,
          progress: 1.0,
          status: existingResult.success
              ? UploadStatus.completed
              : UploadStatus.failed,
          errorMessage: existingResult.errorMessage,
          invoiceId: existingResult.invoiceId,
        );
      }
    }));

    final completedCount =
        progresses.where((p) => p.status == UploadStatus.completed).length;
    final failedCount =
        progresses.where((p) => p.status == UploadStatus.failed).length;

    emit(UploadInProgress(
      files: currentState.files,
      progresses: progresses,
      completedResults: currentState.results, // 使用 results 而不是 completedResults
      completedCount: completedCount,
      failedCount: failedCount,
    ));

    // 重新上传失败的文件
    await _uploadFiles(retryIndices: filesToRetry);
  }

  /// 更新进度
  Future<void> _onUpdateProgress(
      UpdateProgress event, Emitter<UploadState> emit) async {
    if (_disposed) return;

    final currentState = state;
    if (currentState is! UploadInProgress) return;

    final updatedProgresses = currentState.progresses.map((p) {
      if (p.index == event.fileIndex) {
        return p.copyWith(
          progress: event.progress,
          status: event.progress >= 1.0
              ? UploadStatus.uploading
              : UploadStatus.uploading,
        );
      }
      return p;
    }).toList();

    emit(UploadInProgress(
      files: currentState.files,
      progresses: updatedProgresses,
      completedResults: currentState.completedResults, // 保持现有结果
      completedCount: currentState.completedCount,
      failedCount: currentState.failedCount,
    ));
  }

  /// 文件上传完成
  Future<void> _onFileUploadCompleted(
      FileUploadCompleted event, Emitter<UploadState> emit) async {
    if (_disposed) return;

    final currentState = state;
    if (currentState is! UploadInProgress) {
      return;
    }

    final updatedProgresses = currentState.progresses.map((p) {
      if (p.index == event.fileIndex) {
        return p.copyWith(
          progress: 1.0,
          status: event.success ? UploadStatus.completed : UploadStatus.failed,
          errorMessage: event.errorMessage,
          invoiceId: event.invoiceId,
        );
      }
      return p;
    }).toList();

    final completedCount = updatedProgresses
        .where((p) => p.status == UploadStatus.completed)
        .length;
    final failedCount =
        updatedProgresses.where((p) => p.status == UploadStatus.failed).length;

    // 更新已完成的结果列表（包括成功和失败的）
    final updatedResults = <UploadResult>[];
    for (final progress in updatedProgresses) {
      if (progress.status == UploadStatus.completed ||
          progress.status == UploadStatus.failed) {
        updatedResults.add(UploadResult(
          index: progress.index,
          file: progress.file,
          success: progress.status == UploadStatus.completed,
          errorMessage: progress.errorMessage,
          invoiceId: progress.invoiceId,
          uploadTime: DateTime.now(),
        ));
      }
    }

    // 检查是否全部完成
    if (completedCount + failedCount == currentState.totalCount) {
      // 转换为结果
      final results = updatedProgresses.map((p) {
        return UploadResult(
          index: p.index,
          file: p.file,
          success: p.status == UploadStatus.completed,
          errorMessage: p.errorMessage,
          invoiceId: p.invoiceId,
          uploadTime: DateTime.now(),
        );
      }).toList();

      emit(UploadCompleted(
        files: currentState.files,
        results: results,
      ));

      // 上传完成，结果已经通过状态传递
    } else {
      emit(UploadInProgress(
        files: currentState.files,
        progresses: updatedProgresses,
        completedResults: updatedResults, // 添加实时结果
        completedCount: completedCount,
        failedCount: failedCount,
      ));
    }
  }

  /// 执行文件上传
  Future<void> _uploadFiles({List<int>? retryIndices}) async {
    final filesToUpload =
        retryIndices ?? List.generate(_selectedFiles.length, (i) => i);

    // 并发上传，限制并发数
    final semaphore = Semaphore(AppConstants.maxConcurrentUploads);

    await Future.wait(
      filesToUpload.map((index) => _uploadSingleFile(index, semaphore)),
    );
  }

  /// 上传单个文件
  Future<void> _uploadSingleFile(int index, Semaphore semaphore) async {
    await semaphore.acquire();

    try {
      if (_disposed || index >= _selectedFiles.length) return;

      final file = _selectedFiles[index];
      final cancelToken = CancelToken();
      _uploadTokens[index] = cancelToken;

      final result = await _uploadUseCase.call(
        UploadInvoiceParams(filePath: file.path),
        onProgress: (sent, total) {
          if (!_disposed && !cancelToken.isCancelled) {
            final progress = sent / total;
            add(UpdateProgress(index, progress));
          }
        },
      );

      if (!_disposed && !cancelToken.isCancelled) {
        // 根据结果类型处理不同情况
        if (result.isDuplicate) {
          // 重复发票 - 视为特殊的失败情况，但提供重复信息
          add(FileUploadCompleted(
            index,
            false, // 重复发票视为失败
            invoiceId: result.duplicateInfo?.existingInvoiceId,
            errorMessage: MessageConstants.getDuplicateMessage(
                result.duplicateInfo?.message),
          ));
        } else if (result.isSuccess && result.invoice != null) {
          // 真正的上传成功
          add(FileUploadCompleted(
            index,
            true,
            invoiceId: result.invoice!.id,
            errorMessage: null,
          ));
        } else {
          // 上传失败
          add(FileUploadCompleted(
            index,
            false,
            invoiceId: null,
            errorMessage:
                MessageConstants.getErrorMessage(result.error?.message),
          ));
        }
      }
    } catch (e) {
      if (!_disposed) {
        add(FileUploadCompleted(index, false, errorMessage: e.toString()));
      }
    } finally {
      _uploadTokens.remove(index);
      semaphore.release();
    }
  }

  /// 取消所有上传
  void _cancelAllUploads() {
    for (final token in _uploadTokens.values) {
      token.cancel();
    }
    _uploadTokens.clear();
  }
}

/// 信号量实现
class Semaphore {
  final int maxCount;
  int _currentCount;
  final Queue<Completer<void>> _waitQueue = Queue<Completer<void>>();

  Semaphore(this.maxCount) : _currentCount = maxCount;

  Future<void> acquire() async {
    if (_currentCount > 0) {
      _currentCount--;
      return;
    }

    final completer = Completer<void>();
    _waitQueue.add(completer);
    return completer.future;
  }

  void release() {
    if (_waitQueue.isNotEmpty) {
      final completer = _waitQueue.removeFirst();
      completer.complete();
    } else {
      _currentCount++;
    }
  }
}

/// 取消令牌
class CancelToken {
  bool _isCancelled = false;

  bool get isCancelled => _isCancelled;

  void cancel() {
    _isCancelled = true;
  }
}
