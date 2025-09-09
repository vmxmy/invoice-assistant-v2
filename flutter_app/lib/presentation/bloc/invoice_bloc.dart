import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/usecases/get_invoices_usecase.dart';
import '../../domain/usecases/get_invoice_detail_usecase_production.dart';
import '../../domain/exceptions/invoice_exceptions.dart';
import '../../domain/usecases/get_invoice_stats_usecase.dart';
import '../../domain/usecases/delete_invoice_usecase.dart';
import '../../domain/usecases/update_invoice_status_usecase.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../core/config/app_config.dart';
import 'invoice_event.dart';
import 'invoice_state.dart';

/// 发票业务逻辑控制器
class InvoiceBloc extends Bloc<InvoiceEvent, InvoiceState> {
  final GetInvoicesUseCase _getInvoicesUseCase;
  final GetInvoiceDetailUseCaseProduction _getInvoiceDetailUseCase;
  final GetInvoiceStatsUseCase _getInvoiceStatsUseCase;
  final DeleteInvoiceUseCase _deleteInvoiceUseCase;
  final UpdateInvoiceStatusUseCase _updateInvoiceStatusUseCase;

  // 内部状态管理
  final List<InvoiceEntity> _allInvoices = [];
  int _currentPage = 1;
  int _totalCount = 0;
  bool _hasMore = true;

  InvoiceBloc({
    required GetInvoicesUseCase getInvoicesUseCase,
    required GetInvoiceDetailUseCaseProduction getInvoiceDetailUseCase,
    required GetInvoiceStatsUseCase getInvoiceStatsUseCase,
    required DeleteInvoiceUseCase deleteInvoiceUseCase,
    required UpdateInvoiceStatusUseCase updateInvoiceStatusUseCase,
  }) : 
    _getInvoicesUseCase = getInvoicesUseCase,
    _getInvoiceDetailUseCase = getInvoiceDetailUseCase,
    _getInvoiceStatsUseCase = getInvoiceStatsUseCase,
    _deleteInvoiceUseCase = deleteInvoiceUseCase,
    _updateInvoiceStatusUseCase = updateInvoiceStatusUseCase,
    super(InvoiceInitial()) {
    
    // 注册事件处理器
    on<LoadInvoices>(_onLoadInvoices);
    on<LoadMoreInvoices>(_onLoadMoreInvoices);
    on<RefreshInvoices>(_onRefreshInvoices);
    on<DeleteInvoice>(_onDeleteInvoice);
    on<DeleteInvoices>(_onDeleteInvoices);
    on<LoadInvoiceStats>(_onLoadInvoiceStats);
    on<LoadInvoiceDetail>(_onLoadInvoiceDetail);
    on<UpdateInvoiceStatus>(_onUpdateInvoiceStatus);
  }

  /// 处理加载发票列表事件
  Future<void> _onLoadInvoices(LoadInvoices event, Emitter<InvoiceState> emit) async {
    try {
      if (AppConfig.enableLogging) {
        print('🔄 [InvoiceBloc] 开始加载发票列表 - 页码: ${event.page}, 刷新: ${event.refresh}');
      }

      // 如果是刷新操作，显示加载状态
      if (event.refresh || event.page == 1) {
        emit(InvoiceLoading());
        _allInvoices.clear();
        _currentPage = 1;
      }

      // 调用用例获取数据
      final result = await _getInvoicesUseCase(
        page: event.page,
        pageSize: event.pageSize,
        filters: event.filters,
        sortField: event.sortField,
        sortAscending: event.sortAscending,
      );

      // 更新内部状态
      if (event.page == 1) {
        _allInvoices.clear();
      }
      _allInvoices.addAll(result.invoices);
      _currentPage = event.page;
      _totalCount = result.total;
      _hasMore = result.hasMore;

      // 发送成功状态
      emit(InvoiceLoaded(
        invoices: List.from(_allInvoices),
        currentPage: _currentPage,
        totalCount: _totalCount,
        hasMore: _hasMore,
      ));

      if (AppConfig.enableLogging) {
        print('✅ [InvoiceBloc] 发票列表加载成功 - 总数: ${_allInvoices.length}');
        print('✅ [InvoiceBloc] 分页状态 - currentPage: $_currentPage, totalCount: $_totalCount, hasMore: $_hasMore');
      }

    } catch (error) {
      if (AppConfig.enableLogging) {
        print('❌ [InvoiceBloc] 加载发票列表失败: $error');
      }
      
      emit(InvoiceError(
        message: '加载发票列表失败: ${error.toString()}',
        errorCode: 'LOAD_INVOICES_ERROR',
      ));
    }
  }

  /// 处理加载更多发票事件
  Future<void> _onLoadMoreInvoices(LoadMoreInvoices event, Emitter<InvoiceState> emit) async {
    final currentState = state;
    
    if (AppConfig.enableLogging) {
      print('🔄 [InvoiceBloc] 收到加载更多请求');
      print('🔄 [InvoiceBloc] 当前状态: ${currentState.runtimeType}');
      if (currentState is InvoiceLoaded) {
        print('🔄 [InvoiceBloc] hasMore: ${currentState.hasMore}, isLoadingMore: ${currentState.isLoadingMore}');
      }
    }
    
    if (currentState is! InvoiceLoaded || !currentState.hasMore || currentState.isLoadingMore) {
      if (AppConfig.enableLogging) {
        print('🔄 [InvoiceBloc] 跳过加载更多 - 条件不满足');
      }
      return;
    }

    try {
      if (AppConfig.enableLogging) {
        print('🔄 [InvoiceBloc] 加载更多发票 - 下一页: ${_currentPage + 1}');
      }

      // 显示加载更多状态
      emit(currentState.copyWith(isLoadingMore: true));

      final result = await _getInvoicesUseCase(
        page: _currentPage + 1,
        pageSize: 20, // 设置为20以测试无限滚动
      );

      // 追加新数据
      _allInvoices.addAll(result.invoices);
      _currentPage++;
      _hasMore = result.hasMore;

      emit(InvoiceLoaded(
        invoices: List.from(_allInvoices),
        currentPage: _currentPage,
        totalCount: _totalCount,
        hasMore: _hasMore,
        isLoadingMore: false,
      ));

      if (AppConfig.enableLogging) {
        print('✅ [InvoiceBloc] 加载更多发票成功 - 当前总数: ${_allInvoices.length}');
      }

    } catch (error) {
      if (AppConfig.enableLogging) {
        print('❌ [InvoiceBloc] 加载更多发票失败: $error');
      }

      emit(currentState.copyWith(isLoadingMore: false));
      emit(InvoiceError(
        message: '加载更多发票失败: ${error.toString()}',
        errorCode: 'LOAD_MORE_INVOICES_ERROR',
      ));
    }
  }

  /// 处理刷新发票列表事件
  Future<void> _onRefreshInvoices(RefreshInvoices event, Emitter<InvoiceState> emit) async {
    add(const LoadInvoices(page: 1, refresh: true));
  }

  /// 处理删除单个发票事件
  Future<void> _onDeleteInvoice(DeleteInvoice event, Emitter<InvoiceState> emit) async {
    try {
      if (AppConfig.enableLogging) {
        print('🗑️ [InvoiceBloc] 删除发票: ${event.invoiceId}');
      }

      await _deleteInvoiceUseCase(event.invoiceId);

      // 从本地列表中移除
      _allInvoices.removeWhere((invoice) => invoice.id == event.invoiceId);
      _totalCount--;

      // 发送删除成功状态
      emit(InvoiceDeleteSuccess('发票删除成功'));

      // 更新列表状态
      emit(InvoiceLoaded(
        invoices: List.from(_allInvoices),
        currentPage: _currentPage,
        totalCount: _totalCount,
        hasMore: _hasMore,
      ));

      if (AppConfig.enableLogging) {
        print('✅ [InvoiceBloc] 发票删除成功');
      }

    } catch (error) {
      if (AppConfig.enableLogging) {
        print('❌ [InvoiceBloc] 删除发票失败: $error');
      }

      emit(InvoiceError(
        message: '删除发票失败: ${error.toString()}',
        errorCode: 'DELETE_INVOICE_ERROR',
      ));
    }
  }

  /// 处理批量删除发票事件
  Future<void> _onDeleteInvoices(DeleteInvoices event, Emitter<InvoiceState> emit) async {
    try {
      if (AppConfig.enableLogging) {
        print('🗑️ [InvoiceBloc] 批量删除发票: ${event.invoiceIds.length}个');
      }

      await _deleteInvoiceUseCase.callBatch(event.invoiceIds);

      // 从本地列表中批量移除
      _allInvoices.removeWhere((invoice) => event.invoiceIds.contains(invoice.id));
      _totalCount -= event.invoiceIds.length;

      emit(InvoiceDeleteSuccess('${event.invoiceIds.length}个发票删除成功'));

      // 更新列表状态
      emit(InvoiceLoaded(
        invoices: List.from(_allInvoices),
        currentPage: _currentPage,
        totalCount: _totalCount,
        hasMore: _hasMore,
      ));

      if (AppConfig.enableLogging) {
        print('✅ [InvoiceBloc] 批量删除发票成功');
      }

    } catch (error) {
      if (AppConfig.enableLogging) {
        print('❌ [InvoiceBloc] 批量删除发票失败: $error');
      }

      emit(InvoiceError(
        message: '批量删除发票失败: ${error.toString()}',
        errorCode: 'DELETE_INVOICES_ERROR',
      ));
    }
  }

  /// 处理加载发票统计事件
  Future<void> _onLoadInvoiceStats(LoadInvoiceStats event, Emitter<InvoiceState> emit) async {
    try {
      if (AppConfig.enableLogging) {
        print('📊 [InvoiceBloc] 加载发票统计');
      }

      final stats = await _getInvoiceStatsUseCase();
      
      emit(InvoiceStatsLoaded(stats));

      if (AppConfig.enableLogging) {
        print('✅ [InvoiceBloc] 发票统计加载成功 - 总数: ${stats.totalCount}');
      }

    } catch (error) {
      if (AppConfig.enableLogging) {
        print('❌ [InvoiceBloc] 加载发票统计失败: $error');
      }

      emit(InvoiceError(
        message: '加载发票统计失败: ${error.toString()}',
        errorCode: 'LOAD_STATS_ERROR',
      ));
    }
  }

  /// 处理加载发票详情事件
  Future<void> _onLoadInvoiceDetail(LoadInvoiceDetail event, Emitter<InvoiceState> emit) async {
    try {
      if (AppConfig.enableLogging) {
        print('🔄 [InvoiceBloc] 加载发票详情: ${event.invoiceId}');
      }

      emit(InvoiceDetailLoading());

      // 首先从本地列表中查找
      InvoiceEntity? invoice;
      try {
        invoice = _allInvoices.firstWhere(
          (inv) => inv.id == event.invoiceId,
        );
        
        if (AppConfig.enableLogging) {
          print('✅ [InvoiceBloc] 从本地缓存加载发票详情: ${invoice.invoiceNumber}');
        }
      } catch (e) {
        // 如果本地没有找到，从远程获取
        if (AppConfig.enableLogging) {
          print('🌐 [InvoiceBloc] 本地缓存未找到，从远程服务器获取发票详情');
        }
        
        invoice = await _getInvoiceDetailUseCase(event.invoiceId);
        
        // 将获取到的发票添加到本地缓存中
        if (!_allInvoices.any((inv) => inv.id == invoice!.id)) {
          _allInvoices.add(invoice);
        }
      }

      emit(InvoiceDetailLoaded(invoice));

      if (AppConfig.enableLogging) {
        print('✅ [InvoiceBloc] 发票详情加载成功: ${invoice.invoiceNumber}');
      }

    } on InvoiceNotFoundException catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ [InvoiceBloc] 发票未找到: ${e.message}');
      }
      emit(InvoiceError(
        message: e.message,
        errorCode: e.errorCode ?? 'INVOICE_NOT_FOUND',
      ));
    } on InvoicePermissionDeniedException catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ [InvoiceBloc] 权限不足: ${e.message}');
      }
      emit(InvoiceError(
        message: e.message,
        errorCode: e.errorCode ?? 'PERMISSION_DENIED',
      ));
    } on InvoiceNetworkException catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ [InvoiceBloc] 网络错误: ${e.message}');
      }
      emit(InvoiceError(
        message: e.message,
        errorCode: e.errorCode ?? 'NETWORK_ERROR',
      ));
    } on InvoiceDataFormatException catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ [InvoiceBloc] 数据格式错误: ${e.message}');
      }
      emit(InvoiceError(
        message: e.message,
        errorCode: e.errorCode ?? 'DATA_FORMAT_ERROR',
      ));
    } on InvoiceServerException catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ [InvoiceBloc] 服务器错误: ${e.message}');
      }
      emit(InvoiceError(
        message: e.message,
        errorCode: e.errorCode ?? 'SERVER_ERROR',
      ));
    } catch (error) {
      if (AppConfig.enableLogging) {
        print('❌ [InvoiceBloc] 加载发票详情失败: $error');
      }
      emit(InvoiceError(
        message: '加载发票详情时发生未知错误',
        errorCode: 'UNKNOWN_ERROR',
      ));
    }
  }

  /// 处理更新发票状态事件
  Future<void> _onUpdateInvoiceStatus(UpdateInvoiceStatus event, Emitter<InvoiceState> emit) async {
    try {
      if (AppConfig.enableLogging) {
        print('🔄 [InvoiceBloc] 更新发票状态: ${event.invoiceId} -> ${event.newStatus.displayName}');
      }

      // 调用用例更新状态
      await _updateInvoiceStatusUseCase(event.invoiceId, event.newStatus);

      // 更新本地列表中对应发票的状态
      final invoiceIndex = _allInvoices.indexWhere((invoice) => invoice.id == event.invoiceId);
      if (invoiceIndex != -1) {
        final updatedInvoice = _allInvoices[invoiceIndex].copyWith(status: event.newStatus);
        _allInvoices[invoiceIndex] = updatedInvoice;

        // 发送更新后的状态
        emit(InvoiceLoaded(
          invoices: List.from(_allInvoices),
          currentPage: _currentPage,
          totalCount: _totalCount,
          hasMore: _hasMore,
        ));
      }

      if (AppConfig.enableLogging) {
        print('✅ [InvoiceBloc] 发票状态更新成功: ${event.newStatus.displayName}');
      }

    } catch (error) {
      if (AppConfig.enableLogging) {
        print('❌ [InvoiceBloc] 更新发票状态失败: $error');
      }

      emit(InvoiceError(
        message: '更新发票状态失败: ${error.toString()}',
        errorCode: 'UPDATE_STATUS_ERROR',
      ));
    }
  }
}