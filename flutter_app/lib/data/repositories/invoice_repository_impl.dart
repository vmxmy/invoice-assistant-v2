import '../../core/utils/logger.dart';
import 'dart:typed_data';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/repositories/invoice_repository.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../domain/exceptions/invoice_exceptions.dart';
import '../../domain/usecases/upload_invoice_usecase.dart';
import '../datasources/invoice_remote_datasource.dart';
import '../models/invoice_model.dart';
import '../cache/invoice_cache.dart';
import '../../core/config/app_config.dart';

/// 发票仓库实现 - 数据层对领域层接口的具体实现
class InvoiceRepositoryImpl implements InvoiceRepository {
  final InvoiceRemoteDataSource _remoteDataSource;
  final InvoiceCache _cache = InvoiceCache();

  InvoiceRepositoryImpl(this._remoteDataSource);

  @override
  Future<InvoiceListResult> getInvoices({
    int page = 1,
    int pageSize = 20,
    InvoiceFilters? filters,
    String sortField = 'created_at',
    bool sortAscending = false,
  }) async {
    try {
      // 生成缓存key
      final filtersHash = _cache.generateFiltersHash(filters);
      final cacheKey = _cache.generateListCacheKey(
        page: page,
        pageSize: pageSize,
        sortField: sortField,
        sortAscending: sortAscending,
        filtersHash: filtersHash,
      );

      // 检查是否有筛选条件或强制刷新，这些情况下跳过缓存
      final hasFilters = filters != null &&
          (filters.overdue == true ||
              filters.urgent == true ||
              (filters.status != null && filters.status!.isNotEmpty) ||
              (filters.globalSearch != null &&
                  filters.globalSearch!.isNotEmpty));

      final forceRefresh = filters?.forceRefresh == true;
      final shouldSkipCache = hasFilters || forceRefresh;

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '🔍 [Repository] 缓存检查 - hasFilters: $hasFilters, forceRefresh: $forceRefresh, skipCache: $shouldSkipCache',
            tag: 'Debug');
      }

      // 只有在没有筛选条件且不强制刷新时才尝试使用缓存
      if (!shouldSkipCache) {
        final cachedInvoices = _cache.getCachedInvoiceList(cacheKey);

        if (cachedInvoices != null) {
          // 缓存命中列表数据，但总数仍需重新查询以确保筛选条件正确
          final totalCount =
              await _remoteDataSource.getInvoicesCount(filters: filters);
          final currentTotal = (page - 1) * pageSize + cachedInvoices.length;
          final hasMore = currentTotal < totalCount;

          if (AppConfig.enableLogging) {
            AppLogger.debug(
                '✅ [Repository] 使用缓存数据 - ${cachedInvoices.length}条记录',
                tag: 'Debug');
          }

          return InvoiceListResult(
            invoices: cachedInvoices,
            total: totalCount,
            page: page,
            pageSize: pageSize,
            hasMore: hasMore,
          );
        }
      } else {
        if (AppConfig.enableLogging) {
          AppLogger.debug('🔍 [Repository] 有筛选条件，跳过缓存，直接查询数据源', tag: 'Debug');
        }
      }

      // 缓存未命中，从远程获取数据
      // 总是重新查询总数，确保筛选条件正确应用
      final results = await Future.wait([
        _remoteDataSource.getInvoices(
          page: page,
          pageSize: pageSize,
          filters: filters,
          sortField: sortField,
          sortAscending: sortAscending,
        ),
        _remoteDataSource.getInvoicesCount(filters: filters), // 总是使用当前筛选条件查询总数
      ]);

      final invoiceModels = results[0] as List<InvoiceModel>;
      final totalCount = results[1] as int;

      // 转换为领域实体列表并验证数据
      final invoiceEntities = <InvoiceEntity>[];
      for (final model in invoiceModels) {
        try {
          final entity = model.toEntity();
          // 数据完整性验证
          _validateInvoiceEntity(entity);
          invoiceEntities.add(entity);

          // 同时缓存详情数据
          _cache.cacheInvoiceDetail(entity.id, entity);
        } catch (e) {
          // 记录数据转换错误但不中断整体流程
          AppLogger.debug('⚠️ [Repository] 发票数据转换失败 ID: ${model.id}, Error: $e',
              tag: 'Debug');
          continue; // 跳过有问题的数据
        }
      }

      // 缓存结果（只缓存发票列表，不缓存总数）
      _cache.cacheInvoiceList(cacheKey, invoiceEntities);

      // 精确计算是否还有更多数据
      final currentTotal = (page - 1) * pageSize + invoiceEntities.length;
      final hasMore = currentTotal < totalCount;

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '📊 [Repository] 分页计算 - page: $page, pageSize: $pageSize, 当前页记录数: ${invoiceEntities.length}',
            tag: 'Debug');
        AppLogger.debug(
            '📊 [Repository] currentTotal: $currentTotal, totalCount: $totalCount, hasMore: $hasMore',
            tag: 'Debug');
      }

      return InvoiceListResult(
        invoices: invoiceEntities,
        total: totalCount,
        page: page,
        pageSize: pageSize,
        hasMore: hasMore,
      );
    } catch (e) {
      // 统一异常处理和转换
      throw _handleDataSourceException(e, 'getInvoices');
    }
  }

  @override
  Future<InvoiceEntity> getInvoiceById(String id) async {
    try {
      // 尝试从缓存获取
      final cachedInvoice = _cache.getCachedInvoiceDetail(id);
      if (cachedInvoice != null) {
        return cachedInvoice;
      }

      // 缓存未命中，从远程获取
      final invoiceModel = await _remoteDataSource.getInvoiceById(id);
      final entity = invoiceModel.toEntity();

      // 数据完整性验证
      _validateInvoiceEntity(entity);

      // 缓存结果
      _cache.cacheInvoiceDetail(id, entity);

      return entity;
    } catch (e) {
      throw _handleDataSourceException(e, 'getInvoiceById');
    }
  }

  @override
  Future<InvoiceEntity> createInvoice(CreateInvoiceRequest request) async {
    try {
      final invoiceModel = await _remoteDataSource.createInvoice(request);
      final entity = invoiceModel.toEntity();

      // 验证创建的数据
      _validateInvoiceEntity(entity);

      // 缓存新创建的发票
      _cache.cacheInvoiceDetail(entity.id, entity);

      // 失效列表缓存和总数缓存
      _cache.invalidateCache(invalidateList: true, invalidateCount: true);

      return entity;
    } catch (e) {
      throw _handleDataSourceException(e, 'createInvoice');
    }
  }

  @override
  Future<InvoiceEntity> updateInvoice(
      String id, UpdateInvoiceRequest request) async {
    try {
      final invoiceModel = await _remoteDataSource.updateInvoice(id, request);
      final entity = invoiceModel.toEntity();

      // 验证更新后的数据
      _validateInvoiceEntity(entity);

      // 更新缓存
      _cache.cacheInvoiceDetail(id, entity);

      // 失效列表缓存（因为数据已改变）
      _cache.invalidateCache(invalidateList: true);

      return entity;
    } catch (e) {
      throw _handleDataSourceException(e, 'updateInvoice');
    }
  }

  @override
  Future<void> updateInvoiceStatus(String id, InvoiceStatus status) async {
    try {
      await _remoteDataSource.updateInvoiceStatus(id, status);

      // 失效相关缓存
      _cache.invalidateCache(
        invoiceId: id,
        invalidateList: true,
      );
    } catch (e) {
      throw _handleDataSourceException(e, 'updateInvoiceStatus');
    }
  }

  @override
  Future<void> deleteInvoice(String id) async {
    try {
      await _remoteDataSource.deleteInvoice(id);

      // 失效相关缓存
      _cache.invalidateCache(
        invoiceId: id,
        invalidateList: true,
        invalidateCount: true,
      );
    } catch (e) {
      throw _handleDataSourceException(e, 'deleteInvoice');
    }
  }

  @override
  Future<void> deleteInvoices(List<String> ids) async {
    try {
      await _remoteDataSource.deleteInvoices(ids);

      // 失效所有相关缓存
      for (final id in ids) {
        _cache.invalidateCache(invoiceId: id);
      }
      _cache.invalidateCache(invalidateList: true, invalidateCount: true);
    } catch (e) {
      throw _handleDataSourceException(e, 'deleteInvoices');
    }
  }

  @override
  Future<InvoiceStats> getInvoiceStats() async {
    try {
      return await _remoteDataSource.getInvoiceStats();
    } catch (e) {
      throw _handleDataSourceException(e, 'getInvoiceStats');
    }
  }

  /// 验证发票实体数据完整性
  void _validateInvoiceEntity(InvoiceEntity entity) {
    // 基础字段验证
    if (entity.id.isEmpty) {
      throw InvoiceDataFormatException('发票ID不能为空');
    }

    if (entity.invoiceNumber.isEmpty) {
      throw InvoiceDataFormatException('发票号码不能为空');
    }

    // 金额验证
    if (entity.amount < 0) {
      throw InvoiceDataFormatException('发票金额不能为负数');
    }

    if (entity.totalAmount != null && entity.totalAmount! < 0) {
      throw InvoiceDataFormatException('发票总金额不能为负数');
    }

    // 日期验证
    final now = DateTime.now();
    final maxFutureDate = now.add(const Duration(days: 365)); // 最多一年后

    if (entity.invoiceDate.isAfter(maxFutureDate)) {
      throw InvoiceDataFormatException('发票日期不能超过一年后');
    }

    // UUID格式验证
    final uuidPattern = RegExp(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    if (!uuidPattern.hasMatch(entity.id)) {
      throw InvoiceDataFormatException('发票ID格式无效');
    }
  }

  /// 处理数据源异常并转换为领域异常
  Exception _handleDataSourceException(dynamic error, String operation) {
    final errorStr = error.toString().toLowerCase();

    // 网络相关异常
    if (errorStr.contains('timeout') ||
        errorStr.contains('network') ||
        errorStr.contains('connection') ||
        errorStr.contains('socket')) {
      return InvoiceNetworkException('网络连接失败，请检查网络设置', originalError: error);
    }

    // 权限相关异常
    if (errorStr.contains('unauthorized') ||
        errorStr.contains('forbidden') ||
        errorStr.contains('permission denied') ||
        errorStr.contains('401') ||
        errorStr.contains('403')) {
      return const InvoicePermissionDeniedException();
    }

    // 数据不存在异常
    if (errorStr.contains('not found') ||
        errorStr.contains('no rows returned') ||
        errorStr.contains('404')) {
      return InvoiceServerException('请求的数据不存在', originalError: error);
    }

    // 数据格式异常
    if (errorStr.contains('json') ||
        errorStr.contains('format') ||
        errorStr.contains('parse') ||
        errorStr.contains('invalid')) {
      return InvoiceDataFormatException('服务器返回数据格式异常', originalError: error);
    }

    // 服务器异常
    if (errorStr.contains('server') ||
        errorStr.contains('500') ||
        errorStr.contains('502') ||
        errorStr.contains('503')) {
      return InvoiceServerException('服务器暂时不可用，请稍后重试', originalError: error);
    }

    // 默认服务器异常
    return InvoiceServerException('数据操作失败: $operation', originalError: error);
  }

  @override
  Future<UploadInvoiceResult> uploadInvoice({
    required Uint8List fileBytes,
    required String fileName,
    required String fileHash,
  }) async {
    try {
      if (AppConfig.enableLogging) {
        AppLogger.debug('📤 [InvoiceRepositoryImpl] 调用远程数据源上传发票', tag: 'Debug');
        AppLogger.debug('📤 [InvoiceRepositoryImpl] 文件名: $fileName',
            tag: 'Debug');
        AppLogger.debug(
            '📤 [InvoiceRepositoryImpl] 文件大小: ${fileBytes.length} bytes',
            tag: 'Debug');
      }

      // 调用远程数据源进行上传
      final result = await _remoteDataSource.uploadInvoice(
        fileBytes: fileBytes,
        fileName: fileName,
        fileHash: fileHash,
      );

      if (AppConfig.enableLogging) {
        AppLogger.debug('✅ [InvoiceRepositoryImpl] 发票上传成功', tag: 'Debug');
      }

      // 清空缓存，因为有新的发票数据
      _cache.clearAllCache();

      return result;
    } catch (error) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [InvoiceRepositoryImpl] 上传失败: $error', tag: 'Debug');
      }

      throw _handleDataSourceException(error, 'uploadInvoice');
    }
  }
}
