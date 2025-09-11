import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/usecases/get_invoices_usecase.dart';
import '../../domain/usecases/get_invoice_detail_usecase_production.dart';
import '../../domain/exceptions/invoice_exceptions.dart';
import '../../domain/usecases/get_invoice_stats_usecase.dart';
import '../../domain/usecases/delete_invoice_usecase.dart';
import '../../domain/usecases/update_invoice_status_usecase.dart';
import '../../domain/usecases/upload_invoice_usecase.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/repositories/invoice_repository.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../core/config/app_config.dart';
import '../widgets/optimistic_ui_handler.dart';
import '../widgets/enhanced_error_handler.dart';
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
  
  // 乐观UI处理器
  final OptimisticUIHandler _optimisticUI = OptimisticUIHandler();
  final SmartLoadingManager _loadingManager = SmartLoadingManager();

  // 内部状态管理
  final List<InvoiceEntity> _allInvoices = [];
  int _currentPage = 1;
  int _totalCount = 0;
  bool _hasMore = true;
  InvoiceFilters? _currentFilters; // 保存当前的筛选条件

  InvoiceBloc({
    required GetInvoicesUseCase getInvoicesUseCase,
    required GetInvoiceDetailUseCaseProduction getInvoiceDetailUseCase,
    required GetInvoiceStatsUseCase getInvoiceStatsUseCase,
    required DeleteInvoiceUseCase deleteInvoiceUseCase,
    required UpdateInvoiceStatusUseCase updateInvoiceStatusUseCase,
    required UploadInvoiceUseCase uploadInvoiceUseCase,
  }) : 
    _getInvoicesUseCase = getInvoicesUseCase,
    _getInvoiceDetailUseCase = getInvoiceDetailUseCase,
    _getInvoiceStatsUseCase = getInvoiceStatsUseCase,
    _deleteInvoiceUseCase = deleteInvoiceUseCase,
    _updateInvoiceStatusUseCase = updateInvoiceStatusUseCase,
    _uploadInvoiceUseCase = uploadInvoiceUseCase,
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
    on<UploadInvoice>(_onUploadInvoice);
    on<UploadInvoices>(_onUploadInvoices);
    on<CancelUpload>(_onCancelUpload);
    on<RetryUpload>(_onRetryUpload);
    on<ClearUploadResults>(_onClearUploadResults);
  }

  /// 处理加载发票列表事件
  Future<void> _onLoadInvoices(LoadInvoices event, Emitter<InvoiceState> emit) async {
    final loadingKey = 'load_invoices_${event.page}';
    
    try {
      if (AppConfig.enableLogging) {
        print('🔄 [InvoiceBloc] 开始加载发票列表 - 页码: ${event.page}, 刷新: ${event.refresh}');
      }

      // 设置智能加载状态
      if (!event.refresh && event.page == 1 && _allInvoices.isEmpty) {
        _loadingManager.setLoading(loadingKey, message: '正在加载发票列表...');
        emit(InvoiceLoading());
        if (AppConfig.enableLogging) {
          print('🔄 [InvoiceBloc] 显示全屏加载状态');
        }
      } else if (event.refresh) {
        _loadingManager.setLoading(loadingKey, message: '正在刷新数据...');
        if (AppConfig.enableLogging) {
          print('🔄 [InvoiceBloc] 下拉刷新 - 不显示全屏加载状态');
        }
      } else {
        _loadingManager.setLoading(loadingKey, message: '正在加载更多...');
      }
      
      // 如果是刷新操作或第一页，清空数据
      if (event.refresh || event.page == 1) {
        _allInvoices.clear();
        _currentPage = 1;
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
      if (event.page == 1) {
        _allInvoices.clear();
      }
      _allInvoices.addAll(result.invoices);
      _currentPage = event.page;
      _totalCount = result.total;
      _hasMore = result.hasMore;

      // 清除加载状态
      _loadingManager.clearLoading(loadingKey);

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
      // 清除加载状态
      _loadingManager.clearLoading(loadingKey);
      
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

      if (AppConfig.enableLogging) {
        print('🔄 [InvoiceBloc] LoadMoreInvoices - 当前保存的筛选条件: $_currentFilters');
        if (_currentFilters != null) {
          print('🔄 [InvoiceBloc] LoadMoreInvoices - overdue: ${_currentFilters!.overdue}');
          print('🔄 [InvoiceBloc] LoadMoreInvoices - urgent: ${_currentFilters!.urgent}');
          print('🔄 [InvoiceBloc] LoadMoreInvoices - status: ${_currentFilters!.status}');
        }
      }

      final result = await _getInvoicesUseCase(
        page: _currentPage + 1,
        pageSize: 20, // 设置为20以测试无限滚动
        filters: _currentFilters, // 使用保存的筛选条件
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
    if (AppConfig.enableLogging) {
      print('🔄 [InvoiceBloc] 下拉刷新 - 使用当前筛选条件: $_currentFilters');
    }
    add(LoadInvoices(
      page: 1, 
      refresh: true,
      filters: _currentFilters, // 使用保存的筛选条件
    ));
  }

  /// 处理删除单个发票事件
  Future<void> _onDeleteInvoice(DeleteInvoice event, Emitter<InvoiceState> emit) async {
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
          print('🗑️ [Optimistic] 发票已从UI移除: ${event.invoiceId}');
        }
        
        emit(InvoiceDeleteSuccess('发票删除成功'));
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
          print('❌ [Optimistic] 删除失败，已恢复发票: $error');
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
  Future<void> _onDeleteInvoices(DeleteInvoices event, Emitter<InvoiceState> emit) async {
    try {
      if (AppConfig.enableLogging) {
        print('🗑️ [InvoiceBloc] 批量删除发票: ${event.invoiceIds.length}个');
      }

      await _deleteInvoiceUseCase.callBatch(event.invoiceIds);

      // 从本地列表中批量移除
      _allInvoices.removeWhere((invoice) => event.invoiceIds.contains(invoice.id));
      _totalCount -= event.invoiceIds.length;

      if (AppConfig.enableLogging) {
        print('✅ [InvoiceBloc] 批量删除发票成功');
      }

      // 先发送删除成功状态用于显示snackbar
      emit(InvoiceDeleteSuccess('${event.invoiceIds.length}个发票删除成功'));

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
    if (AppConfig.enableLogging) {
      print('🔄 [InvoiceBloc] 更新发票状态: ${event.invoiceId} -> ${event.newStatus.displayName}');
    }

    // 查找要更新的发票
    final invoiceIndex = _allInvoices.indexWhere((invoice) => invoice.id == event.invoiceId);
    if (invoiceIndex == -1) {
      if (AppConfig.enableLogging) {
        print('❌ [InvoiceBloc] 发票不存在: ${event.invoiceId}');
      }
      return;
    }

    final originalInvoice = _allInvoices[invoiceIndex];

    // 使用乐观UI更新
    await _optimisticUI.optimisticUpdateInvoiceStatus(
      invoiceId: event.invoiceId,
      newStatus: event.newStatus,
      serverUpdate: () => _updateInvoiceStatusUseCase(event.invoiceId, event.newStatus),
      onSuccess: () {
        // 立即更新UI
        final updatedInvoice = originalInvoice.copyWith(status: event.newStatus);
        _allInvoices[invoiceIndex] = updatedInvoice;

        emit(InvoiceLoaded(
          invoices: List.from(_allInvoices),
          currentPage: _currentPage,
          totalCount: _totalCount,
          hasMore: _hasMore,
        ));

        if (AppConfig.enableLogging) {
          print('✅ [InvoiceBloc] 发票状态即时更新: ${event.newStatus.displayName}');
        }
      },
      onError: (error) {
        // 回滚UI状态
        if (AppConfig.enableLogging) {
          print('❌ [InvoiceBloc] 发票状态更新失败，回滚: $error');
        }

        emit(InvoiceLoaded(
          invoices: List.from(_allInvoices),
          currentPage: _currentPage,
          totalCount: _totalCount,
          hasMore: _hasMore,
        ));
      },
    );

    if (AppConfig.enableLogging) {
      print('✅ [InvoiceBloc] 发票状态更新流程完成: ${event.newStatus.displayName}');
    }
  }

  /// 处理单个发票上传事件
  Future<void> _onUploadInvoice(UploadInvoice event, Emitter<InvoiceState> emit) async {
    if (AppConfig.enableLogging) {
      print('📤 [InvoiceBloc] 开始上传单个发票: ${event.filePath}');
    }

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

      if (AppConfig.enableLogging) {
        print('✅ [InvoiceBloc] 单个发票上传完成');
      }

    } catch (error) {
      if (AppConfig.enableLogging) {
        print('❌ [InvoiceBloc] 上传发票失败: $error');
      }

      final fileName = event.filePath.split('/').last;
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

  /// 处理批量发票上传事件
  Future<void> _onUploadInvoices(UploadInvoices event, Emitter<InvoiceState> emit) async {
    if (AppConfig.enableLogging) {
      print('📤 [InvoiceBloc] 开始批量上传 ${event.filePaths.length} 个发票');
    }

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
          if (AppConfig.enableLogging) {
            print('📤 [InvoiceBloc] 上传进度: ${i + 1}/${event.filePaths.length} - $fileName');
          }

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
                message: '文件重复',
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
          if (AppConfig.enableLogging) {
            print('❌ [InvoiceBloc] 文件上传失败: $fileName - $fileError');
          }

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

      if (AppConfig.enableLogging) {
        print('✅ [InvoiceBloc] 批量上传完成 - 成功: $successCount, 失败: $failureCount, 重复: $duplicateCount');
      }

    } catch (error) {
      if (AppConfig.enableLogging) {
        print('❌ [InvoiceBloc] 批量上传失败: $error');
      }

      emit(InvoiceError(
        message: '批量上传失败: ${error.toString()}',
        errorCode: 'BATCH_UPLOAD_ERROR',
      ));
    }
  }

  /// 处理取消上传事件
  Future<void> _onCancelUpload(CancelUpload event, Emitter<InvoiceState> emit) async {
    if (AppConfig.enableLogging) {
      print('⏹️ [InvoiceBloc] 取消上传');
    }
    
    // 这里可以实现取消逻辑，目前简单返回初始状态
    emit(InvoiceInitial());
  }

  /// 处理重试上传事件
  Future<void> _onRetryUpload(RetryUpload event, Emitter<InvoiceState> emit) async {
    if (AppConfig.enableLogging) {
      print('🔄 [InvoiceBloc] 重试上传: ${event.filePath}');
    }
    
    // 重新触发上传事件
    add(UploadInvoice(
      filePath: event.filePath,
      metadata: event.metadata,
    ));
  }

  /// 处理清除上传结果事件
  Future<void> _onClearUploadResults(ClearUploadResults event, Emitter<InvoiceState> emit) async {
    if (AppConfig.enableLogging) {
      print('🧹 [InvoiceBloc] 清除上传结果');
    }
    
    emit(InvoiceInitial());
  }
}