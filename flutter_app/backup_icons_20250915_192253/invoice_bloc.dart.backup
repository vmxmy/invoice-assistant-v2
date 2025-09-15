import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/usecases/get_invoices_usecase.dart';
import '../../domain/usecases/get_invoice_detail_usecase_production.dart';
import '../../domain/exceptions/invoice_exceptions.dart';
import '../../domain/usecases/get_invoice_stats_usecase.dart';
import '../../domain/usecases/delete_invoice_usecase.dart';
import '../../domain/usecases/update_invoice_status_usecase.dart';
import '../../domain/usecases/upload_invoice_usecase.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../core/config/app_constants.dart';
import '../../core/constants/message_constants.dart';
import '../../domain/repositories/invoice_repository.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../core/config/app_config.dart';
import '../../core/utils/logger.dart';
import '../../core/events/app_event_bus.dart';
import '../widgets/optimistic_ui_handler.dart';
// import '../widgets/enhanced_error_handler.dart'; // 未使用
import 'invoice_event.dart';
import 'invoice_state.dart';

/// 发票业务逻辑控制器
class InvoiceBloc extends Bloc<InvoiceEvent, InvoiceState> {
  final GetInvoicesUseCase _getInvoicesUseCase;
  final GetInvoiceDetailUseCaseProduction _getInvoiceDetailUseCase;
  final GetInvoiceStatsUseCase _getInvoiceStatsUseCase;
  final DeleteInvoiceUseCase _deleteInvoiceUseCase;
  final UpdateInvoiceStatusUseCase _updateInvoiceStatusUseCase;
  final UploadInvoiceUseCase _uploadInvoiceUseCase;
  final AppEventBus _eventBus;

  // 乐观UI处理器
  final OptimisticUIHandler _optimisticUI = OptimisticUIHandler();
  final SmartLoadingManager _loadingManager = SmartLoadingManager();

  // 内部状态管理
  final List<InvoiceEntity> _allInvoices = [];
  int _currentPage = 1;
  int _totalCount = 0;
  bool _hasMore = true;
  InvoiceFilters? _currentFilters; // 保存当前的筛选条件
  DateTime? _lastDataLoadTime; // 最后一次数据加载时间
  
  // 事件监听订阅
  StreamSubscription<ReimbursementSetChangedEvent>? _reimbursementEventSubscription;
  StreamSubscription<AppEvent>? _appEventSubscription;

  InvoiceBloc({
    required GetInvoicesUseCase getInvoicesUseCase,
    required GetInvoiceDetailUseCaseProduction getInvoiceDetailUseCase,
    required GetInvoiceStatsUseCase getInvoiceStatsUseCase,
    required DeleteInvoiceUseCase deleteInvoiceUseCase,
    required UpdateInvoiceStatusUseCase updateInvoiceStatusUseCase,
    required UploadInvoiceUseCase uploadInvoiceUseCase,
    AppEventBus? eventBus,
  })  : _getInvoicesUseCase = getInvoicesUseCase,
        _getInvoiceDetailUseCase = getInvoiceDetailUseCase,
        _getInvoiceStatsUseCase = getInvoiceStatsUseCase,
        _deleteInvoiceUseCase = deleteInvoiceUseCase,
        _updateInvoiceStatusUseCase = updateInvoiceStatusUseCase,
        _uploadInvoiceUseCase = uploadInvoiceUseCase,
        _eventBus = eventBus ?? AppEventBus.instance,
        super(InvoiceInitial()) {
    // 注册事件处理器
    on<LoadInvoices>(_onLoadInvoices);
    on<LoadMoreInvoices>(_onLoadMoreInvoices);
    on<RefreshInvoices>(_onRefreshInvoices);
    on<ClearFiltersAndReload>(_onClearFiltersAndReload);
    on<DeleteInvoice>(_onDeleteInvoice);
    on<DeleteInvoices>(_onDeleteInvoices);
    on<LoadInvoiceStats>(_onLoadInvoiceStats);
    on<LoadInvoiceDetail>(_onLoadInvoiceDetail);
    on<UpdateInvoiceStatus>(_onUpdateInvoiceStatus);
    on<UploadInvoice>(_onUploadInvoice);
    on<UploadInvoices>(_onUploadInvoices);
    on<CancelUpload>(_onCancelUpload);
    on<RetryUpload>(_onRetryUpload);
    on<ClearUploadResults>(_onClearUploadResults);
    on<ClearInvoices>(_onClearInvoices);
    
    // 监听报销集变更事件
    _setupReimbursementEventSubscription();
    // 监听应用生命周期事件
    _setupAppEventSubscription();
  }
  
  /// 设置报销集事件监听
  void _setupReimbursementEventSubscription() {
    _reimbursementEventSubscription = _eventBus.on<ReimbursementSetChangedEvent>().listen(
      (event) {
        
        // 处理报销集状态变更事件 - 核心状态一致性逻辑
        if (event is ReimbursementSetStatusChangedEvent) {
          _handleReimbursementSetStatusChanged(event);
        } else if (event is ReimbursementSetDeletedEvent) {
          _handleReimbursementSetDeleted(event);
        } else if (event is ReimbursementSetCreatedEvent) {
          _handleReimbursementSetCreated(event);
          // 刷新UI状态 - 立即显示更新
          // ignore: invalid_use_of_visible_for_testing_member
          emit(InvoiceLoaded(
            invoices: List.from(_allInvoices),
            currentPage: _currentPage,
            totalCount: _totalCount,
            hasMore: _hasMore,
          ));
        } else if (event is InvoicesAddedToSetEvent) {
          _handleInvoicesAddedToSet(event);
          // 刷新UI状态 - 立即显示更新
          // ignore: invalid_use_of_visible_for_testing_member
          emit(InvoiceLoaded(
            invoices: List.from(_allInvoices),
            currentPage: _currentPage,
            totalCount: _totalCount,
            hasMore: _hasMore,
          ));
        } else {
          // 其他报销集变更事件，正常刷新
          add(const RefreshInvoices());
        }
      },
    );
  }
  
  /// 处理发票加入报销集事件 - 更新受影响发票的状态
  void _handleInvoicesAddedToSet(InvoicesAddedToSetEvent event) async {
    
    try {
      // 更新本地缓存中的发票状态 - 添加报销集ID
      if (event.invoiceIds.isNotEmpty) {
        for (int i = 0; i < _allInvoices.length; i++) {
          final invoice = _allInvoices[i];
          if (event.invoiceIds.contains(invoice.id)) {
            // 发票加入报销集，更新reimbursementSetId
            final updatedInvoice = invoice.copyWith(
              reimbursementSetId: event.setId,
              updatedAt: DateTime.now(),
            );
            _allInvoices[i] = updatedInvoice;
          }
        }
      }
      
      
    } catch (e) {
      // 发生错误时依然刷新，让用户看到最新状态
      add(const RefreshInvoices());
    }
  }

  /// 处理报销集创建事件 - 更新受影响发票的状态
  void _handleReimbursementSetCreated(ReimbursementSetCreatedEvent event) async {
    
    try {
      // 更新本地缓存中的发票状态 - 添加报销集ID
      if (event.affectedInvoiceIds.isNotEmpty) {
        for (int i = 0; i < _allInvoices.length; i++) {
          final invoice = _allInvoices[i];
          if (event.affectedInvoiceIds.contains(invoice.id)) {
            // 发票加入报销集，更新reimbursementSetId
            final updatedInvoice = invoice.copyWith(
              reimbursementSetId: event.setId,
              updatedAt: DateTime.now(),
            );
            _allInvoices[i] = updatedInvoice;
          }
        }
      }
      
      
    } catch (e) {
      // 发生错误时依然刷新，让用户看到最新状态
      add(const RefreshInvoices());
    }
  }

  /// 处理报销集删除事件 - 更新受影响发票的状态
  void _handleReimbursementSetDeleted(ReimbursementSetDeletedEvent event) async {
    
    try {
      // 更新本地缓存中的发票状态 - 将状态改为待报销
      if (event.affectedInvoiceIds.isNotEmpty) {
        for (int i = 0; i < _allInvoices.length; i++) {
          final invoice = _allInvoices[i];
          if (event.affectedInvoiceIds.contains(invoice.id)) {
            // 报销集删除后，发票状态改为待报销
            final updatedInvoice = invoice.copyWith(
              status: InvoiceStatus.unsubmitted,
              reimbursementSetId: null,
              updatedAt: DateTime.now(),
            );
            _allInvoices[i] = updatedInvoice;
          }
        }
      }
      
      // 刷新UI状态
      add(const RefreshInvoices());
      
    } catch (e) {
      // 发生错误时依然刷新，让用户看到最新状态
      add(const RefreshInvoices());
    }
  }

  /// 处理报销集状态变更事件 - 刷新数据以获取最新状态
  void _handleReimbursementSetStatusChanged(ReimbursementSetStatusChangedEvent event) async {
    try {
      // 后端已经直接更新了数据库中的发票状态，前端只需要刷新数据
      // 刷新发票数据以获取最新的状态
      add(const RefreshInvoices());
      
      // 发送状态同步确认事件
      _eventBus.emit(InvoiceStatusSyncedEvent(
        invoiceIds: event.affectedInvoiceIds,
        newStatus: event.newStatus,
        oldStatus: event.oldStatus,
        reimbursementSetId: event.setId,
        timestamp: DateTime.now(),
      ));
      
    } catch (e) {
      // 发送一致性检查事件以触发后续处理
      _eventBus.emit(StatusConsistencyCheckEvent(
        reimbursementSetId: event.setId,
        timestamp: DateTime.now(),
      ));
    }
  }
  
  /// 将报销集状态映射为发票状态
  /// TODO: 未来功能 - 报销集状态同步时使用
  InvoiceStatus _mapReimbursementStatusToInvoiceStatus(String reimbursementStatus) {
    switch (reimbursementStatus) {
      case 'unsubmitted':
        return InvoiceStatus.unsubmitted;
      case 'submitted':
        return InvoiceStatus.submitted;
      case 'reimbursed':
        return InvoiceStatus.reimbursed;
      default:
        return InvoiceStatus.unsubmitted;
    }
  }
  
  /// 检查数据是否过期（超过5分钟）
  bool _isDataStale() {
    if (_lastDataLoadTime == null) return true;
    final now = DateTime.now();
    final difference = now.difference(_lastDataLoadTime!);
    return difference.inMinutes > 5;
  }

  /// 设置应用事件监听
  void _setupAppEventSubscription() {
    _appEventSubscription = _eventBus.stream.listen(
      (event) {
        if (event is TabChangedEvent) {
          // 切换到发票Tab时，只在没有数据或数据过期时才刷新
          if (event.newTabIndex == 0 && event.tabName == '发票') {
            
            // 检查是否需要刷新：没有数据或者数据过期（超过5分钟）
            final currentState = state;
            final needsRefresh = currentState is! InvoiceLoaded || 
                _allInvoices.isEmpty || 
                _isDataStale();
                
            if (needsRefresh) {
              if (AppConfig.enableLogging) {
              }
              add(const LoadInvoices(refresh: true));
            } else {
              if (AppConfig.enableLogging) {
              }
            }
          }
        } else if (event is AppResumedEvent) {
          // 应用恢复时刷新发票数据
          add(const RefreshInvoices());
        }
      },
    );
  }
  
  /// 销毁时清理资源
  @override
  Future<void> close() {
    _reimbursementEventSubscription?.cancel();
    _appEventSubscription?.cancel();
    return super.close();
  }

  /// 处理加载发票列表事件
  Future<void> _onLoadInvoices(
      LoadInvoices event, Emitter<InvoiceState> emit) async {
    final loadingKey = 'load_invoices_${event.page}';

    try {

      // 设置智能加载状态
      if (!event.refresh && event.page == 1 && _allInvoices.isEmpty) {
        _loadingManager.setLoading(loadingKey, message: '正在加载发票列表...');
        emit(InvoiceLoading());
      } else if (event.refresh) {
        _loadingManager.setLoading(loadingKey, message: '正在刷新数据...');
      } else {
        _loadingManager.setLoading(loadingKey, message: '正在加载更多...');
      }

      // 如果是刷新操作或第一页，完整重置状态
      if (event.refresh || event.page == 1) {
        _allInvoices.clear();
        _currentPage = 1;
        _hasMore = true;        // 🔧 重要：重置hasMore状态
        _totalCount = 0;        // 🔧 重要：重置总数
      }

      // 保存当前筛选条件
      _currentFilters = event.filters;

      // 调用用例获取数据
      final result = await _getInvoicesUseCase(
        page: event.page,
        pageSize: event.pageSize,
        filters: event.filters,
        sortField: event.sortField,
        sortAscending: event.sortAscending,
      );

      // 更新内部状态
      _allInvoices.addAll(result.invoices);
      _currentPage = event.page;
      _totalCount = result.total;
      _hasMore = result.hasMore;

      // 清除加载状态
      _loadingManager.clearLoading(loadingKey);

      // 更新最后加载时间
      _lastDataLoadTime = DateTime.now();

      // 异步加载统计数据
      InvoiceStats? stats;
      try {
        stats = await _getInvoiceStatsUseCase();
      } catch (e) {
        if (AppConfig.enableLogging) {
          AppLogger.debug('⚠️ [InvoiceBloc] 统计数据加载失败: $e', tag: 'Debug');
        }
        // 统计数据加载失败不影响主要功能，继续发送列表状态
      }

      // 发送包含统计数据的完整状态
      emit(InvoiceCompleteState(
        invoices: List.from(_allInvoices),
        currentPage: _currentPage,
        totalCount: _totalCount,
        hasMore: _hasMore,
        stats: stats,
        isLoadingStats: false,
      ));

    } catch (error) {
      // 清除加载状态
      _loadingManager.clearLoading(loadingKey);


      emit(InvoiceError(
        message: '加载发票列表失败: ${error.toString()}',
        errorCode: 'LOAD_INVOICES_ERROR',
      ));
    }
  }

  /// 处理加载更多发票事件
  Future<void> _onLoadMoreInvoices(
      LoadMoreInvoices event, Emitter<InvoiceState> emit) async {
    final currentState = state;

    if (AppConfig.enableLogging) {
      if (currentState is InvoiceLoaded || currentState is InvoiceCompleteState) {
      }
    }

    // 支持两种状态：InvoiceLoaded 和 InvoiceCompleteState
    bool hasMore = false;
    bool isLoadingMore = false;
    
    if (currentState is InvoiceLoaded) {
      hasMore = currentState.hasMore;
      isLoadingMore = currentState.isLoadingMore;
    } else if (currentState is InvoiceCompleteState) {
      hasMore = currentState.hasMore;
      isLoadingMore = currentState.isLoadingMore;
    } else {
      return; // 不支持的状态类型
    }

    if (!hasMore || isLoadingMore) {
      return;
    }

    try {

      // 显示加载更多状态
      if (currentState is InvoiceLoaded) {
        emit(currentState.copyWith(isLoadingMore: true));
      } else if (currentState is InvoiceCompleteState) {
        emit(currentState.copyWith(isLoadingMore: true));
      }

      if (AppConfig.enableLogging) {
      }

      final result = await _getInvoicesUseCase(
        page: _currentPage + 1,
        pageSize: AppConstants.defaultPageSize, // 使用统一配置的页面大小
        filters: _currentFilters, // 使用保存的筛选条件
      );

      // 追加新数据
      _allInvoices.addAll(result.invoices);
      _currentPage++;
      _hasMore = result.hasMore;

      // 发送更新后的状态，保持统计数据
      if (currentState is InvoiceCompleteState) {
        emit(currentState.copyWith(
          invoices: List.from(_allInvoices),
          currentPage: _currentPage,
          hasMore: _hasMore,
          isLoadingMore: false,
        ));
      } else {
        // 兼容旧的 InvoiceLoaded 状态
        emit(InvoiceLoaded(
          invoices: List.from(_allInvoices),
          currentPage: _currentPage,
          totalCount: _totalCount,
          hasMore: _hasMore,
          isLoadingMore: false,
        ));
      }

    } catch (error) {

      // 根据状态类型进行错误处理
      if (currentState is InvoiceCompleteState) {
        emit(currentState.copyWith(isLoadingMore: false));
      } else if (currentState is InvoiceLoaded) {
        emit(currentState.copyWith(isLoadingMore: false));
      }
      
      emit(InvoiceError(
        message: '加载更多发票失败: ${error.toString()}',
        errorCode: 'LOAD_MORE_INVOICES_ERROR',
      ));
    }
  }

  /// 处理刷新发票列表事件
  Future<void> _onRefreshInvoices(
      RefreshInvoices event, Emitter<InvoiceState> emit) async {
    add(LoadInvoices(
      page: 1,
      refresh: true,
      filters: _currentFilters, // 使用保存的筛选条件
    ));
  }

  /// 处理清除筛选并重新加载事件
  /// 专门用于取消筛选后的完整数据重载，确保状态完整重置
  Future<void> _onClearFiltersAndReload(
      ClearFiltersAndReload event, Emitter<InvoiceState> emit) async {
    
    // 完整重置到初始状态
    _resetToInitialState();
    
    // 发送加载状态
    emit(InvoiceLoading());
    
    // 加载第一页无筛选数据（无任何筛选条件）
    add(const LoadInvoices(
      page: 1,
      refresh: true,
      filters: null, // 明确指定无筛选条件
    ));
  }

  /// 重置内部状态到初始状态
  /// 确保所有状态变量都正确初始化
  void _resetToInitialState() {
    _allInvoices.clear();
    _currentPage = 1;
    _hasMore = true;
    _totalCount = 0;
    _currentFilters = null;
    _lastDataLoadTime = null;
    
    if (AppConfig.enableLogging) {
      AppLogger.debug('✅ [InvoiceBloc] 状态已重置到初始状态', tag: 'Debug');
    }
  }

  /// 处理删除单个发票事件
  Future<void> _onDeleteInvoice(
      DeleteInvoice event, Emitter<InvoiceState> emit) async {
    // 找到要删除的发票
    final invoiceToDelete = _allInvoices.firstWhere(
      (invoice) => invoice.id == event.invoiceId,
      orElse: () => throw Exception('发票不存在'),
    );

    // 使用乐观UI更新
    await _optimisticUI.optimisticDeleteInvoice(
      invoiceId: event.invoiceId,
      invoice: invoiceToDelete,
      serverDelete: () => _deleteInvoiceUseCase(event.invoiceId),
      onSuccess: () {
        // 立即从UI移除
        _allInvoices.removeWhere((invoice) => invoice.id == event.invoiceId);
        _totalCount--;

        if (AppConfig.enableLogging) {
          // print('🗑️ [Optimistic] 发票已从UI移除: ${event.invoiceId}');
        }

        emit(InvoiceDeleteSuccess('发票删除成功'));
        
        // 发送发票删除事件
        _eventBus.emit(InvoiceDeletedEvent(
          invoiceId: event.invoiceId,
          wasInReimbursementSet: invoiceToDelete.isInReimbursementSet,
          reimbursementSetId: invoiceToDelete.reimbursementSetId,
        ));
        
        emit(InvoiceLoaded(
          invoices: List.from(_allInvoices),
          currentPage: _currentPage,
          totalCount: _totalCount,
          hasMore: _hasMore,
        ));
      },
      onError: (error) {
        // 失败时恢复发票到列表
        if (!_allInvoices.any((invoice) => invoice.id == event.invoiceId)) {
          _allInvoices.add(invoiceToDelete);
          _totalCount++;
        }

        if (AppConfig.enableLogging) {
          // print('❌ [Optimistic] 删除失败，已恢复发票: $error');
        }

        emit(InvoiceError(
          message: '删除发票失败: ${error.toString()}',
          errorCode: 'DELETE_INVOICE_ERROR',
        ));

        // 更新列表状态
        emit(InvoiceLoaded(
          invoices: List.from(_allInvoices),
          currentPage: _currentPage,
          totalCount: _totalCount,
          hasMore: _hasMore,
        ));
      },
    );
  }

  /// 处理批量删除发票事件
  Future<void> _onDeleteInvoices(
      DeleteInvoices event, Emitter<InvoiceState> emit) async {
    try {

      await _deleteInvoiceUseCase.callBatch(event.invoiceIds);

      // 从本地列表中批量移除
      _allInvoices
          .removeWhere((invoice) => event.invoiceIds.contains(invoice.id));
      _totalCount -= event.invoiceIds.length;


      // 先发送删除成功状态用于显示snackbar
      emit(InvoiceDeleteSuccess('${event.invoiceIds.length}个发票删除成功'));

      // 收集受影响的报销集ID
      final affectedReimbursementSetIds = <String>[];
      for (final invoice in _allInvoices) {
        if (event.invoiceIds.contains(invoice.id) && 
            invoice.isInReimbursementSet && 
            invoice.reimbursementSetId != null) {
          if (!affectedReimbursementSetIds.contains(invoice.reimbursementSetId!)) {
            affectedReimbursementSetIds.add(invoice.reimbursementSetId!);
          }
        }
      }

      // 发送批量发票删除事件
      _eventBus.emit(InvoicesDeletedEvent(
        invoiceIds: event.invoiceIds,
        affectedReimbursementSetIds: affectedReimbursementSetIds,
      ));

      // 给监听器足够时间处理snackbar显示
      await Future.delayed(const Duration(milliseconds: 500));

      // 然后更新列表状态
      emit(InvoiceLoaded(
        invoices: List.from(_allInvoices),
        currentPage: _currentPage,
        totalCount: _totalCount,
        hasMore: _hasMore,
      ));
    } catch (error) {

      emit(InvoiceError(
        message: '批量删除发票失败: ${error.toString()}',
        errorCode: 'DELETE_INVOICES_ERROR',
      ));
    }
  }

  /// 处理加载发票统计事件
  Future<void> _onLoadInvoiceStats(
      LoadInvoiceStats event, Emitter<InvoiceState> emit) async {
    try {

      final stats = await _getInvoiceStatsUseCase();

      emit(InvoiceStatsLoaded(stats));

    } catch (error) {

      emit(InvoiceError(
        message: '加载发票统计失败: ${error.toString()}',
        errorCode: 'LOAD_STATS_ERROR',
      ));
    }
  }

  /// 处理加载发票详情事件
  Future<void> _onLoadInvoiceDetail(
      LoadInvoiceDetail event, Emitter<InvoiceState> emit) async {
    try {

      emit(InvoiceDetailLoading());

      // 首先从本地列表中查找
      InvoiceEntity? invoice;
      try {
        invoice = _allInvoices.firstWhere(
          (inv) => inv.id == event.invoiceId,
        );

      } catch (e) {
        // 如果本地没有找到，从远程获取

        invoice = await _getInvoiceDetailUseCase(event.invoiceId);

        // 将获取到的发票添加到本地缓存中
        if (!_allInvoices.any((inv) => inv.id == invoice!.id)) {
          _allInvoices.add(invoice);
        }
      }

      emit(InvoiceDetailLoaded(invoice));

    } on InvoiceNotFoundException catch (e) {
      emit(InvoiceError(
        message: e.message,
        errorCode: e.errorCode ?? 'INVOICE_NOT_FOUND',
      ));
    } on InvoicePermissionDeniedException catch (e) {
      emit(InvoiceError(
        message: e.message,
        errorCode: e.errorCode ?? 'PERMISSION_DENIED',
      ));
    } on InvoiceNetworkException catch (e) {
      emit(InvoiceError(
        message: e.message,
        errorCode: e.errorCode ?? 'NETWORK_ERROR',
      ));
    } on InvoiceDataFormatException catch (e) {
      emit(InvoiceError(
        message: e.message,
        errorCode: e.errorCode ?? 'DATA_FORMAT_ERROR',
      ));
    } on InvoiceServerException catch (e) {
      emit(InvoiceError(
        message: e.message,
        errorCode: e.errorCode ?? 'SERVER_ERROR',
      ));
    } catch (error) {
      emit(InvoiceError(
        message: '加载发票详情时发生未知错误',
        errorCode: 'UNKNOWN_ERROR',
      ));
    }
  }

  /// 处理更新发票状态事件
  Future<void> _onUpdateInvoiceStatus(
      UpdateInvoiceStatus event, Emitter<InvoiceState> emit) async {

    // 查找要更新的发票
    final invoiceIndex =
        _allInvoices.indexWhere((invoice) => invoice.id == event.invoiceId);
    if (invoiceIndex == -1) {
      return;
    }

    final originalInvoice = _allInvoices[invoiceIndex];

    // 使用乐观UI更新
    await _optimisticUI.optimisticUpdateInvoiceStatus(
      invoiceId: event.invoiceId,
      newStatus: event.newStatus,
      serverUpdate: () =>
          _updateInvoiceStatusUseCase(event.invoiceId, event.newStatus),
      onSuccess: () {
        // 立即更新UI
        final updatedInvoice =
            originalInvoice.copyWith(status: event.newStatus);
        _allInvoices[invoiceIndex] = updatedInvoice;

        // 发送发票状态变更事件
        _eventBus.emit(InvoiceStatusChangedEvent(
          invoiceId: event.invoiceId,
          newStatus: event.newStatus.value,
          oldStatus: originalInvoice.status.value,
        ));

        emit(InvoiceLoaded(
          invoices: List.from(_allInvoices),
          currentPage: _currentPage,
          totalCount: _totalCount,
          hasMore: _hasMore,
        ));

      },
      onError: (error) {
        // 回滚UI状态

        emit(InvoiceLoaded(
          invoices: List.from(_allInvoices),
          currentPage: _currentPage,
          totalCount: _totalCount,
          hasMore: _hasMore,
        ));
      },
    );

  }

  /// 处理单个发票上传事件
  Future<void> _onUploadInvoice(
      UploadInvoice event, Emitter<InvoiceState> emit) async {

    try {
      final fileName = event.filePath.split('/').last;

      // 初始化上传状态
      emit(InvoiceUploading(
        progresses: [
          UploadProgress(
            filePath: event.filePath,
            fileName: fileName,
            stage: UploadStage.preparing,
            progress: 0.0,
            message: '准备上传...',
          )
        ],
        completedCount: 0,
        totalCount: 1,
      ));

      // 更新到计算哈希阶段
      emit(InvoiceUploading(
        progresses: [
          UploadProgress(
            filePath: event.filePath,
            fileName: fileName,
            stage: UploadStage.hashing,
            progress: 0.2,
            message: '正在计算文件哈希...',
          )
        ],
        completedCount: 0,
        totalCount: 1,
      ));

      // 更新到上传阶段
      emit(InvoiceUploading(
        progresses: [
          UploadProgress(
            filePath: event.filePath,
            fileName: fileName,
            stage: UploadStage.uploading,
            progress: 0.5,
            message: '正在上传文件...',
          )
        ],
        completedCount: 0,
        totalCount: 1,
      ));

      // 更新到处理阶段
      emit(InvoiceUploading(
        progresses: [
          UploadProgress(
            filePath: event.filePath,
            fileName: fileName,
            stage: UploadStage.processing,
            progress: 0.8,
            message: '正在进行OCR识别...',
          )
        ],
        completedCount: 0,
        totalCount: 1,
      ));

      // 调用上传用例
      final result = await _uploadInvoiceUseCase(
        UploadInvoiceParams(
          filePath: event.filePath,
          metadata: event.metadata,
        ),
      );

      // 处理上传结果
      if (result.isSuccess) {
        final uploadResult = UploadResult(
          filePath: event.filePath,
          fileName: fileName,
          isSuccess: true,
          invoice: result.invoice,
          duplicateInfo: result.duplicateInfo,
        );

        if (result.isDuplicate) {
          // 重复文件
          emit(InvoiceUploadCompleted(
            results: [uploadResult],
            successCount: 0,
            failureCount: 0,
            duplicateCount: 1,
          ));
        } else {
          // 成功上传
          emit(InvoiceUploadCompleted(
            results: [uploadResult],
            successCount: 1,
            failureCount: 0,
            duplicateCount: 0,
          ));

          // 如果有新发票，添加到本地列表并刷新列表
          if (result.invoice != null) {
            _allInvoices.insert(0, result.invoice!); // 插入到列表开头
            _totalCount++;
            
            // 发送发票创建事件
            _eventBus.emit(InvoiceCreatedEvent(
              invoiceId: result.invoice!.id,
            ));
          }
        }
      } else {
        // 上传失败
        final uploadResult = UploadResult(
          filePath: event.filePath,
          fileName: fileName,
          isSuccess: false,
          error: result.error?.message ?? '上传失败',
        );

        emit(InvoiceUploadCompleted(
          results: [uploadResult],
          successCount: 0,
          failureCount: 1,
          duplicateCount: 0,
        ));
      }

    } catch (error) {

      final fileName = event.filePath.split('/').last;
      
      // 特别处理跨用户重复检测异常
      if (error is CrossUserDuplicateException) {
        final uploadResult = UploadResult(
          filePath: event.filePath,
          fileName: fileName,
          isSuccess: false,
          isCrossUserDuplicate: true,
          error: error.message,
          crossUserDuplicateInfo: CrossUserDuplicateInfo(
            invoiceNumber: error.invoiceNumber,
            originalUserEmail: error.originalUserEmail,
            originalUploadTime: error.originalUploadTime,
            originalInvoiceId: error.originalInvoiceId,
            similarityScore: error.similarityScore,
            warning: error.warning,
            recommendations: error.recommendations,
          ),
        );

        emit(InvoiceUploadCompleted(
          results: [uploadResult],
          successCount: 0,
          failureCount: 1,
          duplicateCount: 0,
          hasCrossUserDuplicate: true,
        ));
      } else {
        // 普通错误处理
        final uploadResult = UploadResult(
          filePath: event.filePath,
          fileName: fileName,
          isSuccess: false,
          error: error.toString(),
        );

        emit(InvoiceUploadCompleted(
          results: [uploadResult],
          successCount: 0,
          failureCount: 1,
          duplicateCount: 0,
        ));
      }
    }
  }

  /// 处理批量发票上传事件
  Future<void> _onUploadInvoices(
      UploadInvoices event, Emitter<InvoiceState> emit) async {

    final List<UploadProgress> progresses = [];
    final List<UploadResult> results = [];
    int successCount = 0;
    int failureCount = 0;
    int duplicateCount = 0;

    try {
      // 初始化所有文件的上传进度
      for (final filePath in event.filePaths) {
        final fileName = filePath.split('/').last;
        progresses.add(
          UploadProgress(
            filePath: filePath,
            fileName: fileName,
            stage: UploadStage.preparing,
            progress: 0.0,
            message: '准备上传...',
          ),
        );
      }

      emit(InvoiceUploading(
        progresses: progresses,
        completedCount: 0,
        totalCount: event.filePaths.length,
      ));

      // 逐个上传文件
      for (int i = 0; i < event.filePaths.length; i++) {
        final filePath = event.filePaths[i];
        final fileName = filePath.split('/').last;

        try {

          // 更新当前文件状态
          progresses[i] = progresses[i].copyWith(
            stage: UploadStage.hashing,
            progress: 0.2,
            message: '正在计算文件哈希...',
          );
          emit(InvoiceUploading(
            progresses: List.from(progresses),
            completedCount: i,
            totalCount: event.filePaths.length,
          ));

          progresses[i] = progresses[i].copyWith(
            stage: UploadStage.uploading,
            progress: 0.5,
            message: '正在上传文件...',
          );
          emit(InvoiceUploading(
            progresses: List.from(progresses),
            completedCount: i,
            totalCount: event.filePaths.length,
          ));

          progresses[i] = progresses[i].copyWith(
            stage: UploadStage.processing,
            progress: 0.8,
            message: '正在进行OCR识别...',
          );
          emit(InvoiceUploading(
            progresses: List.from(progresses),
            completedCount: i,
            totalCount: event.filePaths.length,
          ));

          // 调用上传用例
          final result = await _uploadInvoiceUseCase(
            UploadInvoiceParams(
              filePath: filePath,
              metadata: event.metadata,
            ),
          );

          // 处理结果
          if (result.isSuccess) {
            if (result.isDuplicate) {
              progresses[i] = progresses[i].copyWith(
                stage: UploadStage.duplicate,
                progress: 1.0,
                message: MessageConstants.getBadgeText('duplicate'),
              );
              duplicateCount++;
            } else {
              progresses[i] = progresses[i].copyWith(
                stage: UploadStage.success,
                progress: 1.0,
                message: '上传成功',
              );
              successCount++;

              // 添加到本地列表
              if (result.invoice != null) {
                _allInvoices.insert(0, result.invoice!);
                _totalCount++;
              }
            }

            results.add(UploadResult(
              filePath: filePath,
              fileName: fileName,
              isSuccess: true,
              invoice: result.invoice,
              duplicateInfo: result.duplicateInfo,
            ));
          } else {
            progresses[i] = progresses[i].copyWith(
              stage: UploadStage.error,
              progress: 0.0,
              message: '上传失败',
              error: result.error?.message ?? '未知错误',
            );
            failureCount++;

            results.add(UploadResult(
              filePath: filePath,
              fileName: fileName,
              isSuccess: false,
              error: result.error?.message ?? '上传失败',
            ));
          }
        } catch (fileError) {

          progresses[i] = progresses[i].copyWith(
            stage: UploadStage.error,
            progress: 0.0,
            message: '上传失败',
            error: fileError.toString(),
          );
          failureCount++;

          results.add(UploadResult(
            filePath: filePath,
            fileName: fileName,
            isSuccess: false,
            error: fileError.toString(),
          ));
        }

        // 发送当前进度
        emit(InvoiceUploading(
          progresses: List.from(progresses),
          completedCount: i + 1,
          totalCount: event.filePaths.length,
        ));
      }

      // 发送最终完成状态
      emit(InvoiceUploadCompleted(
        results: results,
        successCount: successCount,
        failureCount: failureCount,
        duplicateCount: duplicateCount,
      ));

      // 发送批量上传完成事件
      if (successCount > 0 || failureCount > 0 || duplicateCount > 0) {
        final successfulIds = results
            .where((result) => result.isSuccess && result.invoice != null)
            .map((result) => result.invoice!.id)
            .toList();
            
        _eventBus.emit(InvoicesUploadedEvent(
          successfulInvoiceIds: successfulIds,
          failureCount: failureCount,
          duplicateCount: duplicateCount,
        ));
      }

    } catch (error) {

      emit(InvoiceError(
        message: '批量上传失败: ${error.toString()}',
        errorCode: 'BATCH_UPLOAD_ERROR',
      ));
    }
  }

  /// 处理取消上传事件
  Future<void> _onCancelUpload(
      CancelUpload event, Emitter<InvoiceState> emit) async {

    // 这里可以实现取消逻辑，目前简单返回初始状态
    emit(InvoiceInitial());
  }

  /// 处理重试上传事件
  Future<void> _onRetryUpload(
      RetryUpload event, Emitter<InvoiceState> emit) async {

    // 重新触发上传事件
    add(UploadInvoice(
      filePath: event.filePath,
      metadata: event.metadata,
    ));
  }

  /// 处理清除上传结果事件
  Future<void> _onClearUploadResults(
      ClearUploadResults event, Emitter<InvoiceState> emit) async {

    emit(InvoiceInitial());
  }

  /// 清除发票数据（用于用户登出/切换）
  Future<void> _onClearInvoices(
      ClearInvoices event, Emitter<InvoiceState> emit) async {

    // 清除内部状态
    _allInvoices.clear();
    _currentPage = 1;
    _totalCount = 0;
    _hasMore = true;
    _currentFilters = null;
    _lastDataLoadTime = null;

    // 重置状态
    emit(InvoiceInitial());
  }
}
