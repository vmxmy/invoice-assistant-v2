import 'package:equatable/equatable.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/repositories/invoice_repository.dart';
import '../../domain/usecases/upload_invoice_usecase.dart';
import '../../core/constants/message_constants.dart';

/// 发票状态基类
abstract class InvoiceState extends Equatable {
  const InvoiceState();

  @override
  List<Object?> get props => [];
}

/// 初始状态
class InvoiceInitial extends InvoiceState {}

/// 加载中状态
class InvoiceLoading extends InvoiceState {}

/// 发票列表加载成功状态
class InvoiceLoaded extends InvoiceState {
  final List<InvoiceEntity> invoices;
  final int currentPage;
  final int totalCount;
  final bool hasMore;
  final bool isLoadingMore;

  const InvoiceLoaded({
    required this.invoices,
    required this.currentPage,
    required this.totalCount,
    required this.hasMore,
    this.isLoadingMore = false,
  });

  @override
  List<Object> get props =>
      [invoices, currentPage, totalCount, hasMore, isLoadingMore];

  /// 创建加载更多状态的副本
  InvoiceLoaded copyWith({
    List<InvoiceEntity>? invoices,
    int? currentPage,
    int? totalCount,
    bool? hasMore,
    bool? isLoadingMore,
  }) {
    return InvoiceLoaded(
      invoices: invoices ?? this.invoices,
      currentPage: currentPage ?? this.currentPage,
      totalCount: totalCount ?? this.totalCount,
      hasMore: hasMore ?? this.hasMore,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }
}

/// 发票统计加载成功状态
class InvoiceStatsLoaded extends InvoiceState {
  final InvoiceStats stats;

  const InvoiceStatsLoaded(this.stats);

  @override
  List<Object> get props => [stats];
}

/// 发票详情加载中状态
class InvoiceDetailLoading extends InvoiceState {}

/// 发票详情加载成功状态
class InvoiceDetailLoaded extends InvoiceState {
  final InvoiceEntity invoice;

  const InvoiceDetailLoaded(this.invoice);

  @override
  List<Object> get props => [invoice];
}

/// 错误状态
class InvoiceError extends InvoiceState {
  final String message;
  final String? errorCode;

  const InvoiceError({
    required this.message,
    this.errorCode,
  });

  @override
  List<Object?> get props => [message, errorCode];
}

/// 删除成功状态
class InvoiceDeleteSuccess extends InvoiceState {
  final String message;

  const InvoiceDeleteSuccess(this.message);

  @override
  List<Object> get props => [message];
}

/// 组合状态 - 同时包含列表和统计数据
class InvoiceCompleteState extends InvoiceState {
  final List<InvoiceEntity> invoices;
  final int currentPage;
  final int totalCount;
  final bool hasMore;
  final bool isLoadingMore;
  final InvoiceStats? stats;
  final bool isLoadingStats;

  const InvoiceCompleteState({
    required this.invoices,
    required this.currentPage,
    required this.totalCount,
    required this.hasMore,
    this.isLoadingMore = false,
    this.stats,
    this.isLoadingStats = false,
  });

  @override
  List<Object?> get props => [
        invoices,
        currentPage,
        totalCount,
        hasMore,
        isLoadingMore,
        stats,
        isLoadingStats,
      ];

  InvoiceCompleteState copyWith({
    List<InvoiceEntity>? invoices,
    int? currentPage,
    int? totalCount,
    bool? hasMore,
    bool? isLoadingMore,
    InvoiceStats? stats,
    bool? isLoadingStats,
  }) {
    return InvoiceCompleteState(
      invoices: invoices ?? this.invoices,
      currentPage: currentPage ?? this.currentPage,
      totalCount: totalCount ?? this.totalCount,
      hasMore: hasMore ?? this.hasMore,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      stats: stats ?? this.stats,
      isLoadingStats: isLoadingStats ?? this.isLoadingStats,
    );
  }
}

/// 发票上传状态
class InvoiceUploading extends InvoiceState {
  final List<UploadProgress> progresses;
  final int completedCount;
  final int totalCount;

  const InvoiceUploading({
    required this.progresses,
    required this.completedCount,
    required this.totalCount,
  });

  @override
  List<Object> get props => [progresses, completedCount, totalCount];

  /// 获取指定文件的上传进度
  UploadProgress? getProgress(String filePath) {
    try {
      return progresses.firstWhere((p) => p.filePath == filePath);
    } catch (e) {
      return null;
    }
  }

  /// 是否全部完成
  bool get isAllCompleted => completedCount >= totalCount;

  /// 总体进度 (0.0 - 1.0)
  double get overallProgress =>
      totalCount > 0 ? completedCount / totalCount : 0.0;
}

/// 发票上传完成状态
class InvoiceUploadCompleted extends InvoiceState {
  final List<UploadResult> results;
  final int successCount;
  final int failureCount;
  final int duplicateCount;
  final bool hasCrossUserDuplicate;

  const InvoiceUploadCompleted({
    required this.results,
    required this.successCount,
    required this.failureCount,
    required this.duplicateCount,
    this.hasCrossUserDuplicate = false,
  });

  @override
  List<Object> get props =>
      [results, successCount, failureCount, duplicateCount, hasCrossUserDuplicate];

  /// 是否有成功的上传
  bool get hasSuccess => successCount > 0;

  /// 是否有失败的上传
  bool get hasFailure => failureCount > 0;

  /// 是否有重复的文件
  bool get hasDuplicate => duplicateCount > 0;

  /// 总数
  int get totalCount => results.length;
}

/// 上传进度
class UploadProgress {
  final String filePath;
  final String fileName;
  final UploadStage stage;
  final double progress;
  final String? message;
  final String? error;

  const UploadProgress({
    required this.filePath,
    required this.fileName,
    required this.stage,
    required this.progress,
    this.message,
    this.error,
  });

  UploadProgress copyWith({
    String? filePath,
    String? fileName,
    UploadStage? stage,
    double? progress,
    String? message,
    String? error,
  }) {
    return UploadProgress(
      filePath: filePath ?? this.filePath,
      fileName: fileName ?? this.fileName,
      stage: stage ?? this.stage,
      progress: progress ?? this.progress,
      message: message ?? this.message,
      error: error ?? this.error,
    );
  }

  bool get isCompleted =>
      stage == UploadStage.success ||
      stage == UploadStage.duplicate ||
      stage == UploadStage.error;
  bool get isError => stage == UploadStage.error;
  bool get isSuccess => stage == UploadStage.success;
  bool get isDuplicate => stage == UploadStage.duplicate;
}

/// 上传阶段
enum UploadStage {
  preparing, // 准备中
  hashing, // 计算哈希
  uploading, // 上传中
  processing, // OCR处理中
  success, // 成功
  duplicate, // 重复
  error, // 错误
}

/// 上传结果
class UploadResult {
  final String filePath;
  final String fileName;
  final bool isSuccess;
  final InvoiceEntity? invoice;
  final DuplicateInvoiceInfo? duplicateInfo;
  final String? error;
  final bool isCrossUserDuplicate;
  final CrossUserDuplicateInfo? crossUserDuplicateInfo;

  const UploadResult({
    required this.filePath,
    required this.fileName,
    required this.isSuccess,
    this.invoice,
    this.duplicateInfo,
    this.error,
    this.isCrossUserDuplicate = false,
    this.crossUserDuplicateInfo,
  });

  bool get isDuplicate => duplicateInfo != null;
  bool get isError => !isSuccess && error != null;
}

/// 跨用户重复检测信息
class CrossUserDuplicateInfo {
  final String invoiceNumber;
  final String originalUserEmail;
  final String originalUploadTime;
  final String originalInvoiceId;
  final double similarityScore;
  final String warning;
  final List<String> recommendations;

  const CrossUserDuplicateInfo({
    required this.invoiceNumber,
    required this.originalUserEmail,
    required this.originalUploadTime,
    required this.originalInvoiceId,
    required this.similarityScore,
    required this.warning,
    required this.recommendations,
  });

  String get formattedUploadTime {
    try {
      final dateTime = DateTime.parse(originalUploadTime);
      return '${dateTime.year}年${dateTime.month}月${dateTime.day}日 ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return originalUploadTime;
    }
  }

  String get formattedSimilarityScore {
    return '${(similarityScore * 100).toStringAsFixed(1)}%';
  }
}

extension UploadStageExtension on UploadStage {
  String get displayName {
    switch (this) {
      case UploadStage.preparing:
        return '准备中';
      case UploadStage.hashing:
        return '计算哈希';
      case UploadStage.uploading:
        return '上传中';
      case UploadStage.processing:
        return 'OCR识别中';
      case UploadStage.success:
        return '上传成功';
      case UploadStage.duplicate:
        return MessageConstants.getBadgeText('duplicate');
      case UploadStage.error:
        return '上传失败';
    }
  }
}
