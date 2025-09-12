import 'dart:async';
import '../../domain/entities/invoice_entity.dart';
import '../utils/logger.dart';

/// 智能分页管理器
/// 支持预加载、虚拟滚动和智能缓存
class SmartPaginationManager {
  static final SmartPaginationManager _instance =
      SmartPaginationManager._internal();
  factory SmartPaginationManager() => _instance;
  SmartPaginationManager._internal();

  // 分页配置
  static const int _defaultPageSize = 20;
  // 预加载阈值：剩余几项时开始预加载（当前未使用但保留以备将来功能扩展）
  // ignore: unused_field
  static const int _prefetchThreshold = 5;
  static const int _maxCachedPages = 10;

  // 缓存的页面数据
  final Map<String, _PageData> _cachedPages = {};

  // 预加载任务跟踪
  final Set<String> _prefetchingPages = {};

  /// 智能获取数据（带预加载）
  Future<PaginationResult<InvoiceEntity>> getInvoicesPage({
    required int page,
    int pageSize = _defaultPageSize,
    required Future<List<InvoiceEntity>> Function(int page, int pageSize)
        fetchFunction,
    Map<String, dynamic>? filters,
  }) async {
    final pageKey = _generatePageKey(page, pageSize, filters);

    // 1. 检查缓存
    if (_cachedPages.containsKey(pageKey) &&
        !_cachedPages[pageKey]!.isExpired) {
      final cachedData = _cachedPages[pageKey]!;

      // 触发预加载检查
      _checkPrefetchOpportunity(page, pageSize, fetchFunction, filters);

      return PaginationResult<InvoiceEntity>(
        items: cachedData.items,
        currentPage: page,
        pageSize: pageSize,
        totalItems: cachedData.totalItems,
        hasNextPage: cachedData.hasNextPage,
        isFromCache: true,
      );
    }

    // 2. 从服务器获取数据
    try {
      final items = await fetchFunction(page, pageSize);

      // 3. 缓存结果
      _cachePageData(pageKey, items, page, pageSize);

      // 4. 启动预加载
      _startPrefetch(page, pageSize, fetchFunction, filters);

      return PaginationResult<InvoiceEntity>(
        items: items,
        currentPage: page,
        pageSize: pageSize,
        totalItems: null, // 需要从响应或另外获取
        hasNextPage: items.length == pageSize,
        isFromCache: false,
      );
    } catch (e) {
      // 5. 错误时尝试返回陈旧缓存
      final staleData = _cachedPages[pageKey];
      if (staleData != null) {
        return PaginationResult<InvoiceEntity>(
          items: staleData.items,
          currentPage: page,
          pageSize: pageSize,
          totalItems: staleData.totalItems,
          hasNextPage: staleData.hasNextPage,
          isFromCache: true,
          error: e is Exception ? e : Exception(e.toString()),
        );
      }

      rethrow;
    }
  }

  /// 检查预加载时机
  void _checkPrefetchOpportunity(
    int currentPage,
    int pageSize,
    Future<List<InvoiceEntity>> Function(int, int) fetchFunction,
    Map<String, dynamic>? filters,
  ) {
    // 预加载下一页
    final nextPage = currentPage + 1;
    final nextPageKey = _generatePageKey(nextPage, pageSize, filters);

    if (!_cachedPages.containsKey(nextPageKey) &&
        !_prefetchingPages.contains(nextPageKey)) {
      _prefetchPage(nextPageKey, nextPage, pageSize, fetchFunction);
    }
  }

  /// 启动预加载任务
  void _startPrefetch(
    int currentPage,
    int pageSize,
    Future<List<InvoiceEntity>> Function(int, int) fetchFunction,
    Map<String, dynamic>? filters,
  ) {
    // 预加载后续几页
    for (int i = 1; i <= 2; i++) {
      final prefetchPage = currentPage + i;
      final prefetchKey = _generatePageKey(prefetchPage, pageSize, filters);

      if (!_cachedPages.containsKey(prefetchKey) &&
          !_prefetchingPages.contains(prefetchKey)) {
        _prefetchPage(prefetchKey, prefetchPage, pageSize, fetchFunction);
      }
    }
  }

  /// 预加载页面
  void _prefetchPage(
    String pageKey,
    int page,
    int pageSize,
    Future<List<InvoiceEntity>> Function(int, int) fetchFunction,
  ) {
    _prefetchingPages.add(pageKey);

    // 延迟执行预加载，避免影响当前页面响应
    Timer(Duration(milliseconds: 100), () async {
      try {
        final items = await fetchFunction(page, pageSize);
        _cachePageData(pageKey, items, page, pageSize);
      } catch (e) {
        // 预加载失败不影响用户体验
        AppLogger.warning('预加载第$page页失败', tag: 'Pagination', error: e);
      } finally {
        _prefetchingPages.remove(pageKey);
      }
    });
  }

  /// 缓存页面数据
  void _cachePageData(
    String pageKey,
    List<InvoiceEntity> items,
    int page,
    int pageSize,
  ) {
    // 清理过期缓存
    _cleanExpiredCache();

    // 限制缓存大小
    if (_cachedPages.length >= _maxCachedPages) {
      final oldestKey = _cachedPages.keys.first;
      _cachedPages.remove(oldestKey);
    }

    _cachedPages[pageKey] = _PageData(
      items: items,
      page: page,
      pageSize: pageSize,
      totalItems: null,
      hasNextPage: items.length == pageSize,
      timestamp: DateTime.now(),
      ttl: Duration(minutes: 5),
    );
  }

  /// 生成页面缓存键
  String _generatePageKey(
    int page,
    int pageSize,
    Map<String, dynamic>? filters,
  ) {
    final filtersHash = filters?.toString().hashCode ?? 0;
    return 'page_${page}_${pageSize}_$filtersHash';
  }

  /// 清理过期缓存
  void _cleanExpiredCache() {
    final expiredKeys = _cachedPages.entries
        .where((entry) => entry.value.isExpired)
        .map((entry) => entry.key)
        .toList();

    for (final key in expiredKeys) {
      _cachedPages.remove(key);
    }
  }

  /// 无效化相关缓存
  void invalidateCache({String? filterPattern}) {
    if (filterPattern != null) {
      final keysToRemove = _cachedPages.keys
          .where((key) => key.contains(filterPattern))
          .toList();

      for (final key in keysToRemove) {
        _cachedPages.remove(key);
      }
    } else {
      _cachedPages.clear();
    }
  }

  /// 获取缓存统计
  Map<String, dynamic> getCacheStats() {
    return {
      'cachedPages': _cachedPages.length,
      'prefetchingPages': _prefetchingPages.length,
      'totalCachedItems': _cachedPages.values
          .fold<int>(0, (sum, page) => sum + page.items.length),
      'expiredPages':
          _cachedPages.values.where((page) => page.isExpired).length,
    };
  }

  /// 预热缓存
  Future<void> warmupCache({
    required Future<List<InvoiceEntity>> Function(int, int) fetchFunction,
    int pages = 3,
    int pageSize = _defaultPageSize,
  }) async {
    final futures = <Future>[];

    for (int page = 1; page <= pages; page++) {
      _prefetchPage(
        _generatePageKey(page, pageSize, null),
        page,
        pageSize,
        fetchFunction,
      );
    }

    await Future.wait(futures, eagerError: false);
  }
}

/// 分页结果类
class PaginationResult<T> {
  final List<T> items;
  final int currentPage;
  final int pageSize;
  final int? totalItems;
  final bool hasNextPage;
  final bool isFromCache;
  final Exception? error;

  PaginationResult({
    required this.items,
    required this.currentPage,
    required this.pageSize,
    this.totalItems,
    required this.hasNextPage,
    required this.isFromCache,
    this.error,
  });

  int? get totalPages {
    if (totalItems == null) return null;
    return (totalItems! / pageSize).ceil();
  }

  bool get hasError => error != null;
  bool get isEmpty => items.isEmpty;
  int get itemCount => items.length;
}

/// 页面数据类
class _PageData {
  final List<InvoiceEntity> items;
  final int page;
  final int pageSize;
  final int? totalItems;
  final bool hasNextPage;
  final DateTime timestamp;
  final Duration ttl;

  _PageData({
    required this.items,
    required this.page,
    required this.pageSize,
    this.totalItems,
    required this.hasNextPage,
    required this.timestamp,
    required this.ttl,
  });

  bool get isExpired => DateTime.now().isAfter(timestamp.add(ttl));
}
