import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../core/config/app_config.dart';
import '../../core/events/app_event_bus.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/repositories/reimbursement_set_repository.dart';
import 'reimbursement_set_event.dart';
import 'reimbursement_set_state.dart';

class ReimbursementSetBloc
    extends Bloc<ReimbursementSetEvent, ReimbursementSetState> {
  final ReimbursementSetRepository _repository;
  final AppEventBus _eventBus;
  
  // 事件监听订阅
  StreamSubscription<InvoiceChangedEvent>? _invoiceEventSubscription;
  StreamSubscription<AppEvent>? _appEventSubscription;

  ReimbursementSetBloc({
    required ReimbursementSetRepository repository,
    AppEventBus? eventBus,
  })  : _repository = repository,
        _eventBus = eventBus ?? AppEventBus.instance,
        super(const ReimbursementSetInitial()) {
    // 注册事件处理器
    on<LoadReimbursementSets>(_onLoadReimbursementSets);
    on<CreateReimbursementSet>(_onCreateReimbursementSet);
    on<UpdateReimbursementSet>(_onUpdateReimbursementSet);
    on<UpdateReimbursementSetStatus>(_onUpdateReimbursementSetStatus);
    on<DeleteReimbursementSet>(_onDeleteReimbursementSet);
    on<AddInvoicesToReimbursementSet>(_onAddInvoicesToReimbursementSet);
    on<RemoveInvoicesFromReimbursementSet>(
        _onRemoveInvoicesFromReimbursementSet);
    on<LoadReimbursementSetDetail>(_onLoadReimbursementSetDetail);
    on<LoadReimbursementSetInvoices>(_onLoadReimbursementSetInvoices);
    on<LoadUnassignedInvoices>(_onLoadUnassignedInvoices);
    on<LoadReimbursementSetStats>(_onLoadReimbursementSetStats);
    on<RefreshReimbursementSets>(_onRefreshReimbursementSets);
    
    // 监听发票变更事件
    _setupInvoiceEventSubscription();
    // 监听应用生命周期事件
    _setupAppEventSubscription();
  }
  
  /// 设置发票事件监听
  void _setupInvoiceEventSubscription() {
    _invoiceEventSubscription = _eventBus.on<InvoiceChangedEvent>().listen(
      (event) {
        if (AppConfig.enableLogging) {
          // print('📊 [ReimbursementSetBloc] 收到发票变更事件: ${event.runtimeType}');
        }
        
        // 根据事件类型决定是否刷新数据
        if (event is InvoiceDeletedEvent || 
            event is InvoicesDeletedEvent ||
            event is InvoiceStatusChangedEvent ||
            event is InvoicesUploadedEvent) {
          // 这些事件可能影响报销集状态，需要刷新
          add(const LoadReimbursementSets(refresh: true));
        }
      },
    );
  }
  
  /// 设置应用事件监听
  void _setupAppEventSubscription() {
    _appEventSubscription = _eventBus.stream.listen(
      (event) {
        if (event is TabChangedEvent) {
          // 切换到报销集Tab时刷新数据
          if (event.newTabIndex == 1 && event.tabName == '报销集') {
            if (AppConfig.enableLogging) {
              // print('📊 [ReimbursementSetBloc] Tab切换到报销集，刷新数据');
            }
            add(const LoadReimbursementSets(refresh: true));
          }
        } else if (event is AppResumedEvent) {
          // 应用恢复时可以选择性刷新数据
          if (AppConfig.enableLogging) {
            // print('📊 [ReimbursementSetBloc] 应用恢复，考虑刷新数据');
          }
          // 这里可以根据需要决定是否刷新
          // add(const LoadReimbursementSets(refresh: true));
        }
      },
    );
  }

  /// 销毁时清理资源
  @override
  Future<void> close() {
    _invoiceEventSubscription?.cancel();
    _appEventSubscription?.cancel();
    return super.close();
  }

  /// 加载报销集列表
  Future<void> _onLoadReimbursementSets(
    LoadReimbursementSets event,
    Emitter<ReimbursementSetState> emit,
  ) async {
    try {
      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 开始加载报销集列表, refresh: ${event.refresh}');
      }

      // 如果是刷新操作，显示刷新状态
      if (event.refresh && state is ReimbursementSetLoaded) {
        final currentState = state as ReimbursementSetLoaded;
        emit(currentState.copyWith(isRefreshing: true));
      } else if (!event.refresh && state is! ReimbursementSetLoaded) {
        // 首次加载显示loading状态
        emit(const ReimbursementSetLoading());
      }

      final reimbursementSets = await _repository.getReimbursementSets();

      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 成功加载 ${reimbursementSets.length} 个报销集');
      }

      emit(ReimbursementSetLoaded(
        reimbursementSets: reimbursementSets,
        isRefreshing: false,
      ));
    } catch (e) {
      if (AppConfig.enableLogging) {
        // print('❌ [ReimbursementSetBloc] 加载报销集列表失败: $e');
      }

      emit(ReimbursementSetError(
        message: _getErrorMessage(e),
        operationType: ReimbursementSetOperationType.load,
      ));
    }
  }

  /// 创建新的报销集
  Future<void> _onCreateReimbursementSet(
    CreateReimbursementSet event,
    Emitter<ReimbursementSetState> emit,
  ) async {
    try {
      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 开始创建报销集: ${event.setName}');
      }

      final createdSet = await _repository.createReimbursementSet(
        setName: event.setName,
        description: event.description,
        invoiceIds: event.invoiceIds,
      );

      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 成功创建报销集: ${createdSet.id}');
      }

      emit(ReimbursementSetCreateSuccess(
        createdSet: createdSet,
        message: '成功创建报销集 "${event.setName}"',
      ));

      // 创建成功后自动刷新列表
      add(const LoadReimbursementSets(refresh: true));
      
      // 发送报销集创建事件
      _eventBus.emit(ReimbursementSetCreatedEvent(
        setId: createdSet.id,
        affectedInvoiceIds: event.invoiceIds ?? [],
      ));
    } catch (e) {
      if (AppConfig.enableLogging) {
        // print('❌ [ReimbursementSetBloc] 创建报销集失败: $e');
      }

      emit(ReimbursementSetError(
        message: _getErrorMessage(e),
        operationType: ReimbursementSetOperationType.create,
      ));
    }
  }

  /// 更新报销集信息
  Future<void> _onUpdateReimbursementSet(
    UpdateReimbursementSet event,
    Emitter<ReimbursementSetState> emit,
  ) async {
    try {
      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 开始更新报销集: ${event.setId}');
      }

      final updatedSet = await _repository.updateReimbursementSet(
        event.setId,
        setName: event.setName,
        description: event.description,
      );

      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 成功更新报销集: ${updatedSet.id}');
      }

      emit(ReimbursementSetOperationSuccess(
        message: '报销集更新成功',
        operationType: ReimbursementSetOperationType.update,
        entityId: updatedSet.id,
      ));

      // 更新成功后刷新列表
      add(const LoadReimbursementSets(refresh: true));
    } catch (e) {
      if (AppConfig.enableLogging) {
        // print('❌ [ReimbursementSetBloc] 更新报销集失败: $e');
      }

      emit(ReimbursementSetError(
        message: _getErrorMessage(e),
        operationType: ReimbursementSetOperationType.update,
      ));
    }
  }

  /// 更新报销集状态
  Future<void> _onUpdateReimbursementSetStatus(
    UpdateReimbursementSetStatus event,
    Emitter<ReimbursementSetState> emit,
  ) async {
    try {
      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 开始更新报销集状态: ${event.setId} -> ${event.status.value}');
      }

      final updatedSet = await _repository.updateReimbursementSetStatus(
        event.setId,
        event.status,
        approvalNotes: event.approvalNotes,
      );

      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 成功更新报销集状态: ${updatedSet.statusDisplayName}');
      }

      emit(ReimbursementSetStatusUpdateSuccess(
        updatedSet: updatedSet,
        message: '报销集状态已更新为 "${updatedSet.statusDisplayName}"',
      ));

      // 发送报销集状态变更事件
      _eventBus.emit(ReimbursementSetStatusChangedEvent(
        setId: event.setId,
        newStatus: event.status.value,
        affectedInvoiceIds: [], // TODO: 可以从数据库获取相关发票ID
      ));

      // 状态更新成功后刷新列表
      add(const LoadReimbursementSets(refresh: true));
    } catch (e) {
      if (AppConfig.enableLogging) {
        // print('❌ [ReimbursementSetBloc] 更新报销集状态失败: $e');
      }

      emit(ReimbursementSetError(
        message: _getErrorMessage(e),
        operationType: ReimbursementSetOperationType.statusUpdate,
      ));
    }
  }

  /// 删除报销集
  Future<void> _onDeleteReimbursementSet(
    DeleteReimbursementSet event,
    Emitter<ReimbursementSetState> emit,
  ) async {
    try {
      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 开始删除报销集: ${event.setId}');
      }

      await _repository.deleteReimbursementSet(event.setId);

      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 成功删除报销集: ${event.setId}');
      }

      emit(ReimbursementSetDeleteSuccess(
        message: '报销集删除成功',
        deletedSetId: event.setId,
      ));

      // 删除成功后刷新列表
      add(const LoadReimbursementSets(refresh: true));
      
      // 发送报销集删除事件
      _eventBus.emit(ReimbursementSetDeletedEvent(
        setId: event.setId,
        affectedInvoiceIds: [], // 删除时无法获取具体发票列表，让监听者全量刷新
      ));
    } catch (e) {
      if (AppConfig.enableLogging) {
        // print('❌ [ReimbursementSetBloc] 删除报销集失败: $e');
      }

      emit(ReimbursementSetError(
        message: _getErrorMessage(e),
        operationType: ReimbursementSetOperationType.delete,
      ));
    }
  }

  /// 向报销集添加发票
  Future<void> _onAddInvoicesToReimbursementSet(
    AddInvoicesToReimbursementSet event,
    Emitter<ReimbursementSetState> emit,
  ) async {
    try {
      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 向报销集添加发票: ${event.setId}, ${event.invoiceIds.length} 张');
      }

      await _repository.addInvoicesToSet(event.setId, event.invoiceIds);

      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 成功向报销集添加发票');
      }

      emit(ReimbursementSetOperationSuccess(
        message: '成功添加 ${event.invoiceIds.length} 张发票',
        operationType: ReimbursementSetOperationType.addInvoices,
        entityId: event.setId,
      ));

      // 添加成功后刷新相关数据
      add(const LoadReimbursementSets(refresh: true));
      
      // 发送发票添加到报销集事件
      _eventBus.emit(InvoicesAddedToSetEvent(
        setId: event.setId,
        invoiceIds: event.invoiceIds,
      ));
    } catch (e) {
      if (AppConfig.enableLogging) {
        // print('❌ [ReimbursementSetBloc] 向报销集添加发票失败: $e');
      }

      emit(ReimbursementSetError(
        message: _getErrorMessage(e),
        operationType: ReimbursementSetOperationType.addInvoices,
      ));
    }
  }

  /// 从报销集移除发票
  Future<void> _onRemoveInvoicesFromReimbursementSet(
    RemoveInvoicesFromReimbursementSet event,
    Emitter<ReimbursementSetState> emit,
  ) async {
    try {
      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 从报销集移除发票: ${event.invoiceIds.length} 张');
      }

      await _repository.removeInvoicesFromSet(event.invoiceIds);

      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 成功从报销集移除发票');
      }

      emit(ReimbursementSetOperationSuccess(
        message: '成功移除 ${event.invoiceIds.length} 张发票',
        operationType: ReimbursementSetOperationType.removeInvoices,
      ));

      // 移除成功后刷新相关数据
      add(const LoadReimbursementSets(refresh: true));
      
      // 发送发票从报销集移除事件
      _eventBus.emit(InvoicesRemovedFromSetEvent(
        invoiceIds: event.invoiceIds,
      ));
    } catch (e) {
      if (AppConfig.enableLogging) {
        // print('❌ [ReimbursementSetBloc] 从报销集移除发票失败: $e');
      }

      emit(ReimbursementSetError(
        message: _getErrorMessage(e),
        operationType: ReimbursementSetOperationType.removeInvoices,
      ));
    }
  }

  /// 加载报销集详情
  Future<void> _onLoadReimbursementSetDetail(
    LoadReimbursementSetDetail event,
    Emitter<ReimbursementSetState> emit,
  ) async {
    try {
      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 开始加载报销集详情: ${event.setId}');
      }

      emit(const ReimbursementSetLoading());

      final [reimbursementSet, invoices] = await Future.wait([
        _repository.getReimbursementSetById(event.setId),
        _repository.getInvoicesInSet(event.setId),
      ]);

      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 成功加载报销集详情和发票列表');
      }

      emit(ReimbursementSetDetailLoaded(
        reimbursementSet: reimbursementSet as ReimbursementSetEntity,
        invoices: (invoices as List).cast<InvoiceEntity>(),
      ));
    } catch (e) {
      if (AppConfig.enableLogging) {
        // print('❌ [ReimbursementSetBloc] 加载报销集详情失败: $e');
      }

      emit(ReimbursementSetError(
        message: _getErrorMessage(e),
        operationType: ReimbursementSetOperationType.load,
      ));
    }
  }

  /// 加载报销集中的发票
  Future<void> _onLoadReimbursementSetInvoices(
    LoadReimbursementSetInvoices event,
    Emitter<ReimbursementSetState> emit,
  ) async {
    try {
      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 开始加载报销集发票: ${event.setId}');
      }

      final invoices = await _repository.getInvoicesInSet(event.setId);

      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 成功加载 ${invoices.length} 张发票');
      }

      // 如果当前状态是详情加载状态，更新发票列表
      if (state is ReimbursementSetDetailLoaded) {
        final currentState = state as ReimbursementSetDetailLoaded;
        emit(ReimbursementSetDetailLoaded(
          reimbursementSet: currentState.reimbursementSet,
          invoices: invoices,
        ));
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        // print('❌ [ReimbursementSetBloc] 加载报销集发票失败: $e');
      }

      emit(ReimbursementSetError(
        message: _getErrorMessage(e),
        operationType: ReimbursementSetOperationType.load,
      ));
    }
  }

  /// 加载未分配的发票
  Future<void> _onLoadUnassignedInvoices(
    LoadUnassignedInvoices event,
    Emitter<ReimbursementSetState> emit,
  ) async {
    try {
      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 开始加载未分配发票');
      }

      final unassignedInvoices = await _repository.getUnassignedInvoices(
        limit: event.limit,
        offset: event.offset,
      );

      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 成功加载 ${unassignedInvoices.length} 张未分配发票');
      }

      emit(UnassignedInvoicesLoaded(unassignedInvoices));
    } catch (e) {
      if (AppConfig.enableLogging) {
        // print('❌ [ReimbursementSetBloc] 加载未分配发票失败: $e');
      }

      emit(ReimbursementSetError(
        message: _getErrorMessage(e),
        operationType: ReimbursementSetOperationType.load,
      ));
    }
  }

  /// 加载报销集统计信息
  Future<void> _onLoadReimbursementSetStats(
    LoadReimbursementSetStats event,
    Emitter<ReimbursementSetState> emit,
  ) async {
    try {
      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 开始加载报销集统计信息');
      }

      final stats = await _repository.getReimbursementSetStats();

      if (AppConfig.enableLogging) {
        // print('📊 [ReimbursementSetBloc] 成功加载统计信息: 总计 ${stats.totalSets} 个报销集');
      }

      emit(ReimbursementSetStatsLoaded(stats));
    } catch (e) {
      if (AppConfig.enableLogging) {
        // print('❌ [ReimbursementSetBloc] 加载统计信息失败: $e');
      }

      emit(ReimbursementSetError(
        message: _getErrorMessage(e),
        operationType: ReimbursementSetOperationType.load,
      ));
    }
  }

  /// 刷新报销集数据
  Future<void> _onRefreshReimbursementSets(
    RefreshReimbursementSets event,
    Emitter<ReimbursementSetState> emit,
  ) async {
    add(const LoadReimbursementSets(refresh: true));
  }

  /// 获取用户友好的错误信息
  String _getErrorMessage(dynamic error) {
    if (error is Exception) {
      return error.toString().replaceAll('Exception:', '').trim();
    }

    final errorString = error.toString();

    // 常见错误信息转换
    if (errorString.contains('网络')) {
      return '网络连接异常，请检查网络后重试';
    }

    if (errorString.contains('权限') || errorString.contains('unauthorized')) {
      return '权限不足，请重新登录';
    }

    if (errorString.contains('超时') || errorString.contains('timeout')) {
      return '请求超时，请稍后重试';
    }

    // 返回通用错误信息
    return '操作失败，请稍后重试';
  }
}
