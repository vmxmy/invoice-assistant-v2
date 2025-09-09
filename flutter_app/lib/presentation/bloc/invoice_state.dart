import 'package:equatable/equatable.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/repositories/invoice_repository.dart';

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
  List<Object> get props => [invoices, currentPage, totalCount, hasMore, isLoadingMore];

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