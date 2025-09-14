/// 收件箱相关事件定义
/// 用于收件箱模块与其他模块之间的通信
library;

import 'app_event_bus.dart';

/// 收件箱数据刷新事件
class InboxDataRefreshedEvent extends AppEvent {
  final int totalCount;
  final int unreadCount;
  final DateTime refreshTime;

  const InboxDataRefreshedEvent({
    required this.totalCount,
    required this.unreadCount,
    required this.refreshTime,
  });

  
  List<Object?> get props => [totalCount, unreadCount, refreshTime];

  
  @override
  String toString() => 'InboxDataRefreshedEvent(totalCount: $totalCount, unreadCount: $unreadCount, refreshTime: $refreshTime)';
}

/// 邮件状态变更事件
class EmailStatusChangedEvent extends AppEvent {
  final String emailId;
  final String newStatus;
  final String oldStatus;
  final DateTime changedAt;

  const EmailStatusChangedEvent({
    required this.emailId,
    required this.newStatus,
    required this.oldStatus,
    required this.changedAt,
  });

  
  List<Object?> get props => [emailId, newStatus, oldStatus, changedAt];

  
  @override
  String toString() => 'EmailStatusChangedEvent(emailId: $emailId, newStatus: $newStatus, oldStatus: $oldStatus)';
}

/// 邮件已读状态变更事件
class EmailReadStatusChangedEvent extends AppEvent {
  final String emailId;
  final String userId;
  final bool isRead;
  final DateTime changedAt;

  const EmailReadStatusChangedEvent({
    required this.emailId,
    required this.userId,
    required this.isRead,
    required this.changedAt,
  });

  
  List<Object?> get props => [emailId, userId, isRead, changedAt];

  
  @override
  String toString() => 'EmailReadStatusChangedEvent(emailId: $emailId, userId: $userId, isRead: $isRead)';
}

/// 邮件删除事件
class EmailDeletedEvent extends AppEvent {
  final String emailId;
  final String userId;
  final DateTime deletedAt;

  const EmailDeletedEvent({
    required this.emailId,
    required this.userId,
    required this.deletedAt,
  });

  
  List<Object?> get props => [emailId, userId, deletedAt];

  
  @override
  String toString() => 'EmailDeletedEvent(emailId: $emailId, userId: $userId, deletedAt: $deletedAt)';
}

/// 收件箱过滤器变更事件
class InboxFiltersChangedEvent extends AppEvent {
  final String? category;
  final String? status;
  final String? search;
  final DateTime? dateFrom;
  final DateTime? dateTo;
  final DateTime changedAt;

  const InboxFiltersChangedEvent({
    this.category,
    this.status,
    this.search,
    this.dateFrom,
    this.dateTo,
    required this.changedAt,
  });

  
  List<Object?> get props => [category, status, search, dateFrom, dateTo, changedAt];

  
  @override
  String toString() => 'InboxFiltersChangedEvent(category: $category, status: $status, search: $search)';
}

/// 收件箱分页变更事件
class InboxPageChangedEvent extends AppEvent {
  final int newPage;
  final int oldPage;
  final int pageSize;
  final DateTime changedAt;

  const InboxPageChangedEvent({
    required this.newPage,
    required this.oldPage,
    required this.pageSize,
    required this.changedAt,
  });

  
  List<Object?> get props => [newPage, oldPage, pageSize, changedAt];

  
  @override
  String toString() => 'InboxPageChangedEvent(newPage: $newPage, oldPage: $oldPage, pageSize: $pageSize)';
}

/// 邮件详情查看事件
class EmailDetailViewedEvent extends AppEvent {
  final String emailId;
  final String userId;
  final DateTime viewedAt;

  const EmailDetailViewedEvent({
    required this.emailId,
    required this.userId,
    required this.viewedAt,
  });

  
  List<Object?> get props => [emailId, userId, viewedAt];

  
  @override
  String toString() => 'EmailDetailViewedEvent(emailId: $emailId, userId: $userId, viewedAt: $viewedAt)';
}

/// 批量邮件操作事件
class BatchEmailOperationEvent extends AppEvent {
  final List<String> emailIds;
  final String action; // 'read', 'delete', 'archive', etc.
  final String userId;
  final DateTime operatedAt;

  const BatchEmailOperationEvent({
    required this.emailIds,
    required this.action,
    required this.userId,
    required this.operatedAt,
  });

  
  List<Object?> get props => [emailIds, action, userId, operatedAt];

  
  @override
  String toString() => 'BatchEmailOperationEvent(emailIds: ${emailIds.length} items, action: $action, userId: $userId)';
}

/// 收件箱统计更新事件
class InboxStatsUpdatedEvent extends AppEvent {
  final int totalEmails;
  final int unreadEmails;
  final int verificationEmails;
  final int invoiceEmails;
  final int successfulProcessing;
  final int failedProcessing;
  final DateTime updatedAt;

  const InboxStatsUpdatedEvent({
    required this.totalEmails,
    required this.unreadEmails,
    required this.verificationEmails,
    required this.invoiceEmails,
    required this.successfulProcessing,
    required this.failedProcessing,
    required this.updatedAt,
  });

  
  List<Object?> get props => [
    totalEmails,
    unreadEmails,
    verificationEmails,
    invoiceEmails,
    successfulProcessing,
    failedProcessing,
    updatedAt,
  ];

  
  @override
  String toString() => 'InboxStatsUpdatedEvent(totalEmails: $totalEmails, unreadEmails: $unreadEmails)';
}