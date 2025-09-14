/// 收件箱BLoC事件定义
library;

import 'package:equatable/equatable.dart';
import '../../../domain/entities/email_filters.dart';

abstract class InboxEvent extends Equatable {
  const InboxEvent();

  @override
  List<Object?> get props => [];
}

/// 加载邮件列表请求
class LoadEmailsRequested extends InboxEvent {
  final String userId;
  final int page;
  final int pageSize;
  final EmailFilters filters;
  final bool isRefresh; // 是否为刷新操作

  const LoadEmailsRequested({
    required this.userId,
    this.page = 1,
    this.pageSize = 20,
    this.filters = const EmailFilters(),
    this.isRefresh = false,
  });

  @override
  List<Object?> get props => [userId, page, pageSize, filters, isRefresh];

  @override
  String toString() => 'LoadEmailsRequested(userId: $userId, page: $page, pageSize: $pageSize, isRefresh: $isRefresh)';
}

/// 加载更多邮件
class LoadMoreEmailsRequested extends InboxEvent {
  final String userId;

  const LoadMoreEmailsRequested({required this.userId});

  @override
  List<Object?> get props => [userId];

  @override
  String toString() => 'LoadMoreEmailsRequested(userId: $userId)';
}

/// 邮件过滤器变更
class EmailFiltersChanged extends InboxEvent {
  final EmailFilters filters;

  const EmailFiltersChanged({required this.filters});

  @override
  List<Object?> get props => [filters];

  @override
  String toString() => 'EmailFiltersChanged(filters: $filters)';
}

/// 搜索邮件
class EmailSearchRequested extends InboxEvent {
  final String userId;
  final String searchQuery;

  const EmailSearchRequested({
    required this.userId,
    required this.searchQuery,
  });

  @override
  List<Object?> get props => [userId, searchQuery];

  @override
  String toString() => 'EmailSearchRequested(userId: $userId, searchQuery: $searchQuery)';
}

/// 邮件选择
class EmailSelected extends InboxEvent {
  final String emailId;

  const EmailSelected({required this.emailId});

  @override
  List<Object?> get props => [emailId];

  @override
  String toString() => 'EmailSelected(emailId: $emailId)';
}

/// 清除邮件选择
class EmailSelectionCleared extends InboxEvent {
  const EmailSelectionCleared();

  @override
  String toString() => 'EmailSelectionCleared()';
}

/// 刷新请求
class RefreshRequested extends InboxEvent {
  final String userId;

  const RefreshRequested({required this.userId});

  @override
  List<Object?> get props => [userId];

  @override
  String toString() => 'RefreshRequested(userId: $userId)';
}

/// 加载收件箱统计
class LoadInboxStatsRequested extends InboxEvent {
  final String userId;

  const LoadInboxStatsRequested({required this.userId});

  @override
  List<Object?> get props => [userId];

  @override
  String toString() => 'LoadInboxStatsRequested(userId: $userId)';
}

/// 标记邮件为已读
class MarkEmailAsReadRequested extends InboxEvent {
  final String emailId;
  final String userId;

  const MarkEmailAsReadRequested({
    required this.emailId,
    required this.userId,
  });

  @override
  List<Object?> get props => [emailId, userId];

  @override
  String toString() => 'MarkEmailAsReadRequested(emailId: $emailId, userId: $userId)';
}

/// 删除邮件
class DeleteEmailRequested extends InboxEvent {
  final String emailId;
  final String userId;

  const DeleteEmailRequested({
    required this.emailId,
    required this.userId,
  });

  @override
  List<Object?> get props => [emailId, userId];

  @override
  String toString() => 'DeleteEmailRequested(emailId: $emailId, userId: $userId)';
}

/// 批量邮件操作
class BatchEmailOperationRequested extends InboxEvent {
  final List<String> emailIds;
  final String action;
  final String userId;

  const BatchEmailOperationRequested({
    required this.emailIds,
    required this.action,
    required this.userId,
  });

  @override
  List<Object?> get props => [emailIds, action, userId];

  @override
  String toString() => 'BatchEmailOperationRequested(emailIds: ${emailIds.length} items, action: $action, userId: $userId)';
}

/// 分页变更
class PageChangedRequested extends InboxEvent {
  final int newPage;
  final String userId;

  const PageChangedRequested({
    required this.newPage,
    required this.userId,
  });

  @override
  List<Object?> get props => [newPage, userId];

  @override
  String toString() => 'PageChangedRequested(newPage: $newPage, userId: $userId)';
}

/// 页面大小变更
class PageSizeChanged extends InboxEvent {
  final int newPageSize;
  final String userId;

  const PageSizeChanged({
    required this.newPageSize,
    required this.userId,
  });

  @override
  List<Object?> get props => [newPageSize, userId];

  @override
  String toString() => 'PageSizeChanged(newPageSize: $newPageSize, userId: $userId)';
}

/// 重试操作
class RetryRequested extends InboxEvent {
  final String userId;

  const RetryRequested({required this.userId});

  @override
  List<Object?> get props => [userId];

  @override
  String toString() => 'RetryRequested(userId: $userId)';
}