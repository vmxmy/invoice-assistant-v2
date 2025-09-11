import '../../domain/entities/invoice_entity.dart';

/// 发票缓存管理器 - 提供内存缓存功能
class InvoiceCache {
  static final InvoiceCache _instance = InvoiceCache._internal();
  factory InvoiceCache() => _instance;
  InvoiceCache._internal();

  // 发票列表缓存
  final Map<String, _CacheEntry<List<InvoiceEntity>>> _listCache = {};
  
  // 发票详情缓存
  final Map<String, _CacheEntry<InvoiceEntity>> _detailCache = {};
  
  // 统计数据缓存
  _CacheEntry<int>? _countCache;
  
  // 缓存配置
  static const Duration _defaultTtl = Duration(minutes: 5);
  static const Duration _countTtl = Duration(minutes: 2);
  static const int _maxListCacheSize = 10;
  static const int _maxDetailCacheSize = 50;

  /// 缓存发票列表
  void cacheInvoiceList(
    String cacheKey, 
    List<InvoiceEntity> invoices, {
    Duration? ttl,
  }) {
    _cleanExpiredEntries(_listCache);
    
    // 限制缓存大小
    if (_listCache.length >= _maxListCacheSize) {
      final oldestKey = _listCache.keys.first;
      _listCache.remove(oldestKey);
    }
    
    _listCache[cacheKey] = _CacheEntry(
      data: invoices,
      expiration: DateTime.now().add(ttl ?? _defaultTtl),
    );
  }

  /// 获取缓存的发票列表
  List<InvoiceEntity>? getCachedInvoiceList(String cacheKey) {
    final entry = _listCache[cacheKey];
    if (entry != null && !entry.isExpired) {
      return entry.data;
    }
    
    // 清理过期条目
    if (entry != null && entry.isExpired) {
      _listCache.remove(cacheKey);
    }
    
    return null;
  }

  /// 缓存发票详情
  void cacheInvoiceDetail(
    String invoiceId, 
    InvoiceEntity invoice, {
    Duration? ttl,
  }) {
    _cleanExpiredEntries(_detailCache);
    
    // 限制缓存大小
    if (_detailCache.length >= _maxDetailCacheSize) {
      final oldestKey = _detailCache.keys.first;
      _detailCache.remove(oldestKey);
    }
    
    _detailCache[invoiceId] = _CacheEntry(
      data: invoice,
      expiration: DateTime.now().add(ttl ?? _defaultTtl),
    );
  }

  /// 获取缓存的发票详情
  InvoiceEntity? getCachedInvoiceDetail(String invoiceId) {
    final entry = _detailCache[invoiceId];
    if (entry != null && !entry.isExpired) {
      return entry.data;
    }
    
    // 清理过期条目
    if (entry != null && entry.isExpired) {
      _detailCache.remove(invoiceId);
    }
    
    return null;
  }

  /// 缓存发票总数
  void cacheInvoicesCount(int count, {Duration? ttl}) {
    _countCache = _CacheEntry(
      data: count,
      expiration: DateTime.now().add(ttl ?? _countTtl),
    );
  }

  /// 获取缓存的发票总数
  int? getCachedInvoicesCount() {
    if (_countCache != null && !_countCache!.isExpired) {
      return _countCache!.data;
    }
    
    // 清理过期条目
    if (_countCache != null && _countCache!.isExpired) {
      _countCache = null;
    }
    
    return null;
  }

  /// 生成列表缓存key
  String generateListCacheKey({
    int page = 1,
    int pageSize = 20,
    String sortField = 'created_at',
    bool sortAscending = false,
    String? filtersHash,
  }) {
    return 'list_${page}_${pageSize}_${sortField}_${sortAscending}_${filtersHash ?? 'no_filter'}';
  }

  /// 生成筛选条件哈希
  String? generateFiltersHash(dynamic filters) {
    if (filters == null) return null;
    
    // 这里应该根据实际的筛选条件生成哈希
    // 简化实现，实际项目中应使用更复杂的哈希算法
    return filters.toString().hashCode.toString();
  }

  /// 无效化相关缓存
  void invalidateCache({
    String? invoiceId,
    bool invalidateList = false,
    bool invalidateCount = false,
  }) {
    if (invoiceId != null) {
      _detailCache.remove(invoiceId);
    }
    
    if (invalidateList) {
      _listCache.clear();
    }
    
    if (invalidateCount) {
      _countCache = null;
    }
  }

  /// 清理所有缓存
  void clearAllCache() {
    _listCache.clear();
    _detailCache.clear();
    _countCache = null;
  }

  /// 清理过期条目
  void _cleanExpiredEntries<T>(Map<String, _CacheEntry<T>> cache) {
    final expiredKeys = <String>[];
    
    cache.forEach((key, entry) {
      if (entry.isExpired) {
        expiredKeys.add(key);
      }
    });
    
    for (final key in expiredKeys) {
      cache.remove(key);
    }
  }

  /// 获取缓存统计信息
  Map<String, dynamic> getCacheStats() {
    return {
      'listCacheSize': _listCache.length,
      'detailCacheSize': _detailCache.length,
      'hasCountCache': _countCache != null && !_countCache!.isExpired,
      'expiredListEntries': _listCache.values.where((e) => e.isExpired).length,
      'expiredDetailEntries': _detailCache.values.where((e) => e.isExpired).length,
    };
  }
}

/// 缓存条目
class _CacheEntry<T> {
  final T data;
  final DateTime expiration;

  _CacheEntry({
    required this.data,
    required this.expiration,
  });

  bool get isExpired => DateTime.now().isAfter(expiration);
}