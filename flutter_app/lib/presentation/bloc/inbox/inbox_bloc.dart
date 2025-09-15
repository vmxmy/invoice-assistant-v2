/// 收件箱BLoC实现
/// 处理收件箱相关的业务逻辑和状态管理
library;

import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/repositories/inbox_repository.dart';
import '../../../domain/entities/email_filters.dart';
import '../../../domain/entities/inbox_stats.dart';
import '../../../core/events/app_event_bus.dart';
import '../../../core/events/inbox_events.dart';
import 'inbox_event.dart';
import 'inbox_state.dart';

class InboxBloc extends Bloc<InboxEvent, InboxState> {
  final InboxRepository repository;
  final AppEventBus eventBus;

  // 内部状态管理
  String? _currentUserId;
  EmailFilters _currentFilters = const EmailFilters();
  int _currentPage = 1;
  int _currentPageSize = 20;

  StreamSubscription? _eventBusSubscription;

  InboxBloc({
    required this.repository,
    required this.eventBus,
  }) : super(const InboxInitial()) {
    // 注册事件处理器
    on<LoadEmailsRequested>(_onLoadEmailsRequested);
    on<LoadMoreEmailsRequested>(_onLoadMoreEmailsRequested);
    on<EmailFiltersChanged>(_onEmailFiltersChanged);
    on<EmailSearchRequested>(_onEmailSearchRequested);
    on<EmailSelected>(_onEmailSelected);
    on<EmailSelectionCleared>(_onEmailSelectionCleared);
    on<RefreshRequested>(_onRefreshRequested);
    on<LoadInboxStatsRequested>(_onLoadInboxStatsRequested);
    on<MarkEmailAsReadRequested>(_onMarkEmailAsReadRequested);
    on<DeleteEmailRequested>(_onDeleteEmailRequested);
    on<BatchEmailOperationRequested>(_onBatchEmailOperationRequested);
    on<PageChangedRequested>(_onPageChangedRequested);
    on<PageSizeChanged>(_onPageSizeChanged);
    on<RetryRequested>(_onRetryRequested);

    // 监听全局事件
    _setupEventBusListeners();
  }

  /// 设置事件总线监听器
  void _setupEventBusListeners() {
    _eventBusSubscription?.cancel();
    _eventBusSubscription = eventBus.stream.listen(_handleGlobalEvent);
  }

  /// 处理全局事件
  void _handleGlobalEvent(AppEvent event) {
    if (_currentUserId == null) return;

    switch (event.runtimeType) {
      case DataRefreshRequestedEvent _:
        add(RefreshRequested(userId: _currentUserId!));
        break;
      case AppResumedEvent _:
        // 应用恢复时刷新数据
        add(RefreshRequested(userId: _currentUserId!));
        break;
    }
  }

  /// 加载邮件列表
  Future<void> _onLoadEmailsRequested(
    LoadEmailsRequested event,
    Emitter<InboxState> emit,
  ) async {
    _currentUserId = event.userId;
    _currentFilters = event.filters;
    _currentPage = event.page;
    _currentPageSize = event.pageSize;

    // 如果是刷新操作且当前有数据，显示刷新状态
    if (event.isRefresh && state is InboxLoaded) {
      emit((state as InboxLoaded).copyWith(isRefreshing: true));
    } else {
      emit(InboxLoading(
        isFirstLoad: state is InboxInitial,
        isRefreshing: event.isRefresh,
      ));
    }

    try {
      // 同时加载邮件列表和统计信息
      final results = await Future.wait([
        repository.getUserEmails(
          userId: event.userId,
          page: event.page,
          pageSize: event.pageSize,
          filters: event.filters,
        ),
        repository.getInboxStats(userId: event.userId),
      ]);

      final emailsResult = results[0] as dynamic;
      final statsResult = results[1] as dynamic;

      if (emailsResult.isSuccess && statsResult.isSuccess) {
        final emailsData = emailsResult.data;
        final stats = statsResult.data as InboxStats;

        final totalPages = (emailsData.totalCount / event.pageSize).ceil();
        final hasMore = event.page < totalPages;

        if (emailsData.emails.isEmpty && event.page == 1) {
          emit(InboxEmpty(
            stats: stats,
            activeFilters: event.filters,
          ));
        } else {
          emit(InboxLoaded(
            emails: emailsData.emails,
            stats: stats,
            totalCount: emailsData.totalCount,
            currentPage: event.page,
            pageSize: event.pageSize,
            hasMore: hasMore,
            activeFilters: event.filters,
            lastUpdated: DateTime.now(),
          ));

          // 发送统计更新事件
          _emitStatsUpdatedEvent(stats);
        }
      } else {
        final error =
            emailsResult.isFailure ? emailsResult.error : statsResult.error;
        emit(InboxError(
          message: error,
          canRetry: true,
          previousState: state is InboxLoaded ? state as InboxLoaded : null,
        ));
      }
    } catch (e) {
      emit(InboxError(
        message: '加载邮件列表失败: ${e.toString()}',
        canRetry: true,
        previousState: state is InboxLoaded ? state as InboxLoaded : null,
      ));
    }
  }

  /// 加载更多邮件
  Future<void> _onLoadMoreEmailsRequested(
    LoadMoreEmailsRequested event,
    Emitter<InboxState> emit,
  ) async {
    if (state is! InboxLoaded) return;

    final currentState = state as InboxLoaded;
    if (!currentState.hasMore || currentState.isLoadingMore) return;

    emit(currentState.copyWith(isLoadingMore: true));

    try {
      final result = await repository.getUserEmails(
        userId: event.userId,
        page: currentState.currentPage + 1,
        pageSize: currentState.pageSize,
        filters: currentState.activeFilters,
      );

      if (result.isSuccess) {
        final newEmailsData = result.data;
        final allEmails = [...currentState.emails, ...newEmailsData.emails];
        final totalPages =
            (newEmailsData.totalCount / currentState.pageSize).ceil();
        final hasMore = (currentState.currentPage + 1) < totalPages;

        emit(currentState.copyWith(
          emails: allEmails,
          currentPage: currentState.currentPage + 1,
          hasMore: hasMore,
          isLoadingMore: false,
        ));

        _currentPage = currentState.currentPage + 1;
      } else {
        emit(currentState.copyWith(isLoadingMore: false));
        // 这里可以显示一个临时错误消息
      }
    } catch (e) {
      emit(currentState.copyWith(isLoadingMore: false));
    }
  }

  /// 处理过滤器变更
  Future<void> _onEmailFiltersChanged(
    EmailFiltersChanged event,
    Emitter<InboxState> emit,
  ) async {
    if (_currentUserId == null) return;

    _currentFilters = event.filters;

    // 发送过滤器变更事件
    eventBus.emit(InboxFiltersChangedEvent(
      category: event.filters.category,
      status: event.filters.status,
      search: event.filters.search,
      dateFrom: event.filters.dateFrom,
      dateTo: event.filters.dateTo,
      changedAt: DateTime.now(),
    ));

    // 重新加载第一页数据
    add(LoadEmailsRequested(
      userId: _currentUserId!,
      page: 1,
      pageSize: _currentPageSize,
      filters: event.filters,
    ));
  }

  /// 处理邮件搜索
  Future<void> _onEmailSearchRequested(
    EmailSearchRequested event,
    Emitter<InboxState> emit,
  ) async {
    final newFilters = _currentFilters.copyWith(search: event.searchQuery);
    add(EmailFiltersChanged(filters: newFilters));
  }

  /// 处理邮件选择
  void _onEmailSelected(
    EmailSelected event,
    Emitter<InboxState> emit,
  ) {
    if (state is InboxLoaded) {
      final currentState = state as InboxLoaded;
      emit(currentState.copyWith(selectedEmailId: event.emailId));

      // 发送邮件查看事件
      if (_currentUserId != null) {
        eventBus.emit(EmailDetailViewedEvent(
          emailId: event.emailId,
          userId: _currentUserId!,
          viewedAt: DateTime.now(),
        ));
      }
    }
  }

  /// 清除邮件选择
  void _onEmailSelectionCleared(
    EmailSelectionCleared event,
    Emitter<InboxState> emit,
  ) {
    if (state is InboxLoaded) {
      final currentState = state as InboxLoaded;
      emit(currentState.copyWith(clearSelectedEmailId: true));
    }
  }

  /// 处理刷新请求
  Future<void> _onRefreshRequested(
    RefreshRequested event,
    Emitter<InboxState> emit,
  ) async {
    add(LoadEmailsRequested(
      userId: event.userId,
      page: 1,
      pageSize: _currentPageSize,
      filters: _currentFilters,
      isRefresh: true,
    ));
  }

  /// 加载收件箱统计
  Future<void> _onLoadInboxStatsRequested(
    LoadInboxStatsRequested event,
    Emitter<InboxState> emit,
  ) async {
    try {
      final result = await repository.getInboxStats(userId: event.userId);

      if (result.isSuccess) {
        final stats = result.data;

        if (state is InboxLoaded) {
          emit((state as InboxLoaded).copyWith(stats: stats));
        }

        _emitStatsUpdatedEvent(stats);
      }
    } catch (e) {
      // 静默处理统计加载失败
    }
  }

  /// 标记邮件为已读
  Future<void> _onMarkEmailAsReadRequested(
    MarkEmailAsReadRequested event,
    Emitter<InboxState> emit,
  ) async {
    if (state is! InboxLoaded) return;

    final currentState = state as InboxLoaded;
    emit(InboxOperating(
      baseState: currentState,
      operation: 'marking_read',
      targetEmailId: event.emailId,
    ));

    try {
      final result = await repository.markEmailAsRead(
        emailId: event.emailId,
        userId: event.userId,
      );

      if (result.isSuccess) {
        // 发送邮件状态变更事件
        eventBus.emit(EmailReadStatusChangedEvent(
          emailId: event.emailId,
          userId: event.userId,
          isRead: true,
          changedAt: DateTime.now(),
        ));

        emit(InboxOperationSuccess(
          baseState: currentState,
          operation: 'mark_read',
          successMessage: '邮件已标记为已读',
        ));

        // 刷新数据
        add(RefreshRequested(userId: event.userId));
      } else {
        emit(InboxError(
          message: result.error,
          previousState: currentState,
        ));
      }
    } catch (e) {
      emit(InboxError(
        message: '标记已读失败: ${e.toString()}',
        previousState: currentState,
      ));
    }
  }

  /// 删除邮件
  Future<void> _onDeleteEmailRequested(
    DeleteEmailRequested event,
    Emitter<InboxState> emit,
  ) async {
    if (state is! InboxLoaded) return;

    final currentState = state as InboxLoaded;
    emit(InboxOperating(
      baseState: currentState,
      operation: 'deleting',
      targetEmailId: event.emailId,
    ));

    try {
      final result = await repository.deleteEmail(
        emailId: event.emailId,
        userId: event.userId,
      );

      if (result.isSuccess) {
        // 发送邮件删除事件
        eventBus.emit(EmailDeletedEvent(
          emailId: event.emailId,
          userId: event.userId,
          deletedAt: DateTime.now(),
        ));

        emit(InboxOperationSuccess(
          baseState: currentState,
          operation: 'delete',
          successMessage: '邮件已删除',
        ));

        // 刷新数据
        add(RefreshRequested(userId: event.userId));
      } else {
        emit(InboxError(
          message: result.error,
          previousState: currentState,
        ));
      }
    } catch (e) {
      emit(InboxError(
        message: '删除邮件失败: ${e.toString()}',
        previousState: currentState,
      ));
    }
  }

  /// 批量邮件操作
  Future<void> _onBatchEmailOperationRequested(
    BatchEmailOperationRequested event,
    Emitter<InboxState> emit,
  ) async {
    if (state is! InboxLoaded) return;

    final currentState = state as InboxLoaded;
    emit(InboxOperating(
      baseState: currentState,
      operation: 'batch_operation',
      targetEmailIds: event.emailIds,
    ));

    try {
      final result = await repository.batchEmailOperation(
        emailIds: event.emailIds,
        userId: event.userId,
        action: event.action,
      );

      if (result.isSuccess) {
        // 发送批量操作事件
        eventBus.emit(BatchEmailOperationEvent(
          emailIds: event.emailIds,
          action: event.action,
          userId: event.userId,
          operatedAt: DateTime.now(),
        ));

        emit(InboxOperationSuccess(
          baseState: currentState,
          operation: 'batch_${event.action}',
          successMessage: '批量操作已完成',
        ));

        // 刷新数据
        add(RefreshRequested(userId: event.userId));
      } else {
        emit(InboxError(
          message: result.error,
          previousState: currentState,
        ));
      }
    } catch (e) {
      emit(InboxError(
        message: '批量操作失败: ${e.toString()}',
        previousState: currentState,
      ));
    }
  }

  /// 处理页面变更
  Future<void> _onPageChangedRequested(
    PageChangedRequested event,
    Emitter<InboxState> emit,
  ) async {
    if (state is InboxLoaded) {
      final currentState = state as InboxLoaded;

      // 发送分页变更事件
      eventBus.emit(InboxPageChangedEvent(
        newPage: event.newPage,
        oldPage: currentState.currentPage,
        pageSize: currentState.pageSize,
        changedAt: DateTime.now(),
      ));

      add(LoadEmailsRequested(
        userId: event.userId,
        page: event.newPage,
        pageSize: currentState.pageSize,
        filters: currentState.activeFilters,
      ));
    }
  }

  /// 处理页面大小变更
  Future<void> _onPageSizeChanged(
    PageSizeChanged event,
    Emitter<InboxState> emit,
  ) async {
    _currentPageSize = event.newPageSize;

    add(LoadEmailsRequested(
      userId: event.userId,
      page: 1,
      pageSize: event.newPageSize,
      filters: _currentFilters,
    ));
  }

  /// 处理重试请求
  Future<void> _onRetryRequested(
    RetryRequested event,
    Emitter<InboxState> emit,
  ) async {
    add(LoadEmailsRequested(
      userId: event.userId,
      page: _currentPage,
      pageSize: _currentPageSize,
      filters: _currentFilters,
    ));
  }

  /// 发送统计更新事件
  void _emitStatsUpdatedEvent(InboxStats stats) {
    eventBus.emit(InboxStatsUpdatedEvent(
      totalEmails: stats.totalEmails,
      unreadEmails: stats.unreadEmails,
      verificationEmails: stats.verificationEmails,
      invoiceEmails: stats.invoiceEmails,
      successfulProcessing: stats.successfulProcessing,
      failedProcessing: stats.failedProcessing,
      updatedAt: DateTime.now(),
    ));
  }

  @override
  Future<void> close() {
    _eventBusSubscription?.cancel();
    return super.close();
  }
}
