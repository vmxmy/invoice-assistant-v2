/// 收件箱BLoC状态定义
library;

import 'package:equatable/equatable.dart';
import '../../../domain/entities/email_record.dart';
import '../../../domain/entities/inbox_stats.dart';
import '../../../domain/entities/email_filters.dart';

abstract class InboxState extends Equatable {
  const InboxState();

  @override
  List<Object?> get props => [];
}

/// 初始状态
class InboxInitial extends InboxState {
  const InboxInitial();

  @override
  String toString() => 'InboxInitial()';
}

/// 加载中状态
class InboxLoading extends InboxState {
  final bool isFirstLoad; // 是否为首次加载
  final bool isRefreshing; // 是否为刷新
  final bool isLoadingMore; // 是否为加载更多

  const InboxLoading({
    this.isFirstLoad = true,
    this.isRefreshing = false,
    this.isLoadingMore = false,
  });

  @override
  List<Object?> get props => [isFirstLoad, isRefreshing, isLoadingMore];

  @override
  String toString() =>
      'InboxLoading(isFirstLoad: $isFirstLoad, isRefreshing: $isRefreshing, isLoadingMore: $isLoadingMore)';
}

/// 已加载状态
class InboxLoaded extends InboxState {
  final List<EmailRecord> emails;
  final InboxStats stats;
  final int totalCount;
  final int currentPage;
  final int pageSize;
  final bool hasMore;
  final EmailFilters activeFilters;
  final String? selectedEmailId;
  final bool isRefreshing;
  final bool isLoadingMore;
  final DateTime? lastUpdated;

  const InboxLoaded({
    required this.emails,
    required this.stats,
    required this.totalCount,
    required this.currentPage,
    required this.pageSize,
    required this.hasMore,
    required this.activeFilters,
    this.selectedEmailId,
    this.isRefreshing = false,
    this.isLoadingMore = false,
    this.lastUpdated,
  });

  @override
  List<Object?> get props => [
        emails,
        stats,
        totalCount,
        currentPage,
        pageSize,
        hasMore,
        activeFilters,
        selectedEmailId,
        isRefreshing,
        isLoadingMore,
        lastUpdated,
      ];

  /// 计算总页数
  int get totalPages => (totalCount / pageSize).ceil();

  /// 当前显示的邮件数量范围
  String get displayRange {
    if (emails.isEmpty) return '0-0';
    final start = (currentPage - 1) * pageSize + 1;
    final end = start + emails.length - 1;
    return '$start-$end';
  }

  /// 是否有选中的邮件
  bool get hasSelectedEmail => selectedEmailId != null;

  /// 是否有活动过滤器
  bool get hasActiveFilters => activeFilters.hasFilters;

  /// 复制状态并更新部分属性
  InboxLoaded copyWith({
    List<EmailRecord>? emails,
    InboxStats? stats,
    int? totalCount,
    int? currentPage,
    int? pageSize,
    bool? hasMore,
    EmailFilters? activeFilters,
    String? selectedEmailId,
    bool? clearSelectedEmailId,
    bool? isRefreshing,
    bool? isLoadingMore,
    DateTime? lastUpdated,
  }) {
    return InboxLoaded(
      emails: emails ?? this.emails,
      stats: stats ?? this.stats,
      totalCount: totalCount ?? this.totalCount,
      currentPage: currentPage ?? this.currentPage,
      pageSize: pageSize ?? this.pageSize,
      hasMore: hasMore ?? this.hasMore,
      activeFilters: activeFilters ?? this.activeFilters,
      selectedEmailId: clearSelectedEmailId == true
          ? null
          : (selectedEmailId ?? this.selectedEmailId),
      isRefreshing: isRefreshing ?? this.isRefreshing,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }

  @override
  String toString() =>
      'InboxLoaded(emails: ${emails.length}, totalCount: $totalCount, currentPage: $currentPage, hasMore: $hasMore)';
}

/// 错误状态
class InboxError extends InboxState {
  final String message;
  final String? errorCode;
  final bool canRetry;
  final InboxLoaded? previousState; // 保留之前的状态用于重试

  const InboxError({
    required this.message,
    this.errorCode,
    this.canRetry = true,
    this.previousState,
  });

  @override
  List<Object?> get props => [message, errorCode, canRetry, previousState];

  @override
  String toString() => 'InboxError(message: $message, canRetry: $canRetry)';
}

/// 空状态（没有邮件）
class InboxEmpty extends InboxState {
  final InboxStats stats;
  final EmailFilters activeFilters;
  final String? emptyMessage;

  const InboxEmpty({
    required this.stats,
    required this.activeFilters,
    this.emptyMessage,
  });

  /// 获取空状态的显示消息
  String get displayMessage {
    if (emptyMessage != null) return emptyMessage!;

    if (activeFilters.hasFilters) {
      return '没有找到符合条件的邮件\n请尝试调整过滤条件';
    }

    return '暂无邮件记录\n邮件处理后会自动显示在这里';
  }

  @override
  List<Object?> get props => [stats, activeFilters, emptyMessage];

  @override
  String toString() =>
      'InboxEmpty(activeFilters: $activeFilters, message: $emptyMessage)';
}

/// 操作中状态（标记已读、删除等）
class InboxOperating extends InboxState {
  final InboxLoaded baseState;
  final String operation; // 'marking_read', 'deleting', 'batch_operation'
  final String? targetEmailId;
  final List<String>? targetEmailIds;

  const InboxOperating({
    required this.baseState,
    required this.operation,
    this.targetEmailId,
    this.targetEmailIds,
  });

  @override
  List<Object?> get props =>
      [baseState, operation, targetEmailId, targetEmailIds];

  @override
  String toString() =>
      'InboxOperating(operation: $operation, targetEmailId: $targetEmailId)';
}

/// 操作成功状态
class InboxOperationSuccess extends InboxState {
  final InboxLoaded baseState;
  final String operation;
  final String successMessage;

  const InboxOperationSuccess({
    required this.baseState,
    required this.operation,
    required this.successMessage,
  });

  @override
  List<Object?> get props => [baseState, operation, successMessage];

  @override
  String toString() =>
      'InboxOperationSuccess(operation: $operation, message: $successMessage)';
}
