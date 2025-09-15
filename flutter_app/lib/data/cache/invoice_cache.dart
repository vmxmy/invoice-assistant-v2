import '../../domain/entities/invoice_entity.dart';
import '../../core/utils/logger.dart';
import '../../core/config/app_constants.dart';
import '../../core/network/supabase_client.dart';

/// 发票缓存管理器 - 提供用户隔离的内存缓存功能
class InvoiceCache {
  static final InvoiceCache _instance = InvoiceCache._internal();
  factory InvoiceCache() => _instance;
  InvoiceCache._internal();

  // 当前用户ID，用于缓存隔离
  String? _currentUserId;

  // 发票列表缓存 - 按用户ID分组
  final Map<String, Map<String, _CacheEntry<List<InvoiceEntity>>>> _listCacheByUser = {};

  // 发票详情缓存 - 按用户ID分组  
  final Map<String, Map<String, _CacheEntry<InvoiceEntity>>> _detailCacheByUser = {};

  // 统计数据缓存 - 按用户ID分组
  final Map<String, _CacheEntry<int>> _countCacheByUser = {};

  // 缓存配置
  static Duration get _defaultTtl => AppConstants.invoiceListCacheTtl;
  static Duration get _countTtl => AppConstants.invoiceStatsCacheTtl;
  static int get _maxListCacheSize => AppConstants.maxListCacheSize;
  static int get _maxDetailCacheSize => AppConstants.maxDetailCacheSize;

  /// 确保当前用户上下文
  void _ensureUserContext() {
    final currentUser = SupabaseClientManager.currentUser;
    final newUserId = currentUser?.id;
    
    if (_currentUserId != newUserId) {
      if (_currentUserId != null) {
        AppLogger.info(
          '🔄 [InvoiceCache] 用户切换检测: $_currentUserId -> $newUserId',
          tag: 'Cache',
        );
      }
      
      _currentUserId = newUserId;
      
      // 为新用户初始化缓存空间
      if (newUserId != null) {
        _listCacheByUser.putIfAbsent(newUserId, () => {});
        _detailCacheByUser.putIfAbsent(newUserId, () => {});
      }
    }
  }

  /// 获取当前用户的列表缓存
  // ignore: unused_element
  Map<String, _CacheEntry<List<InvoiceEntity>>> get _listCache {
    _ensureUserContext();
    if (_currentUserId == null) return {};
    return _listCacheByUser[_currentUserId!] ?? {};
  }

  /// 获取当前用户的详情缓存
  // ignore: unused_element
  Map<String, _CacheEntry<InvoiceEntity>> get _detailCache {
    _ensureUserContext();
    if (_currentUserId == null) return {};
    return _detailCacheByUser[_currentUserId!] ?? {};
  }

  /// 获取当前用户的统计缓存
  _CacheEntry<int>? get _countCache {
    _ensureUserContext();
    if (_currentUserId == null) return null;
    return _countCacheByUser[_currentUserId!];
  }

  /// 设置当前用户的统计缓存
  set _countCache(_CacheEntry<int>? value) {
    _ensureUserContext();
    if (_currentUserId == null) return;
    
    if (value == null) {
      _countCacheByUser.remove(_currentUserId!);
    } else {
      _countCacheByUser[_currentUserId!] = value;
    }
  }

  /// 缓存发票列表
  void cacheInvoiceList(
    String cacheKey,
    List<InvoiceEntity> invoices, {
    Duration? ttl,
  }) {
    _ensureUserContext();
    if (_currentUserId == null) {
      AppLogger.warning('🚨 [InvoiceCache] 用户未登录，跳过缓存', tag: 'Cache');
      return;
    }

    final userListCache = _listCacheByUser[_currentUserId!]!;
    _cleanExpiredEntries(userListCache);

    // 限制缓存大小
    if (userListCache.length >= _maxListCacheSize) {
      final oldestKey = userListCache.keys.first;
      userListCache.remove(oldestKey);
    }

    userListCache[cacheKey] = _CacheEntry(
      data: invoices,
      expiration: DateTime.now().add(ttl ?? _defaultTtl),
    );
    
    AppLogger.debug(
      '💾 [InvoiceCache] 缓存发票列表: $_currentUserId [$cacheKey] ${invoices.length}条',
      tag: 'Cache',
    );
  }

  /// 获取缓存的发票列表
  List<InvoiceEntity>? getCachedInvoiceList(String cacheKey) {
    _ensureUserContext();
    if (_currentUserId == null) return null;

    final userListCache = _listCacheByUser[_currentUserId!] ?? {};
    final entry = userListCache[cacheKey];
    
    if (entry != null && !entry.isExpired) {
      AppLogger.debug(
        '✅ [InvoiceCache] 命中发票列表缓存: $_currentUserId [$cacheKey]',
        tag: 'Cache',
      );
      return entry.data;
    }

    // 清理过期条目
    if (entry != null && entry.isExpired) {
      userListCache.remove(cacheKey);
      AppLogger.debug(
        '🗑️ [InvoiceCache] 清理过期列表缓存: $_currentUserId [$cacheKey]',
        tag: 'Cache',
      );
    }

    return null;
  }

  /// 缓存发票详情
  void cacheInvoiceDetail(
    String invoiceId,
    InvoiceEntity invoice, {
    Duration? ttl,
  }) {
    _ensureUserContext();
    if (_currentUserId == null) {
      AppLogger.warning('🚨 [InvoiceCache] 用户未登录，跳过详情缓存', tag: 'Cache');
      return;
    }

    final userDetailCache = _detailCacheByUser[_currentUserId!]!;
    _cleanExpiredEntries(userDetailCache);

    // 限制缓存大小
    if (userDetailCache.length >= _maxDetailCacheSize) {
      final oldestKey = userDetailCache.keys.first;
      userDetailCache.remove(oldestKey);
    }

    userDetailCache[invoiceId] = _CacheEntry(
      data: invoice,
      expiration: DateTime.now().add(ttl ?? _defaultTtl),
    );
    
    AppLogger.debug(
      '💾 [InvoiceCache] 缓存发票详情: $_currentUserId [$invoiceId]',
      tag: 'Cache',
    );
  }

  /// 获取缓存的发票详情
  InvoiceEntity? getCachedInvoiceDetail(String invoiceId) {
    _ensureUserContext();
    if (_currentUserId == null) return null;

    final userDetailCache = _detailCacheByUser[_currentUserId!] ?? {};
    final entry = userDetailCache[invoiceId];
    
    if (entry != null && !entry.isExpired) {
      AppLogger.debug(
        '✅ [InvoiceCache] 命中发票详情缓存: $_currentUserId [$invoiceId]',
        tag: 'Cache',
      );
      return entry.data;
    }

    // 清理过期条目
    if (entry != null && entry.isExpired) {
      userDetailCache.remove(invoiceId);
      AppLogger.debug(
        '🗑️ [InvoiceCache] 清理过期详情缓存: $_currentUserId [$invoiceId]',
        tag: 'Cache',
      );
    }

    return null;
  }

  /// 缓存发票总数
  void cacheInvoicesCount(int count, {Duration? ttl}) {
    _ensureUserContext();
    if (_currentUserId == null) {
      AppLogger.warning('🚨 [InvoiceCache] 用户未登录，跳过统计缓存', tag: 'Cache');
      return;
    }

    _countCache = _CacheEntry(
      data: count,
      expiration: DateTime.now().add(ttl ?? _countTtl),
    );
    
    AppLogger.debug(
      '💾 [InvoiceCache] 缓存发票总数: $_currentUserId [$count]',
      tag: 'Cache',
    );
  }

  /// 获取缓存的发票总数
  int? getCachedInvoicesCount() {
    _ensureUserContext();
    if (_currentUserId == null) return null;

    final countEntry = _countCache;
    if (countEntry != null && !countEntry.isExpired) {
      AppLogger.debug(
        '✅ [InvoiceCache] 命中发票总数缓存: $_currentUserId [${countEntry.data}]',
        tag: 'Cache',
      );
      return countEntry.data;
    }

    // 清理过期条目
    if (countEntry != null && countEntry.isExpired) {
      _countCache = null;
      AppLogger.debug(
        '🗑️ [InvoiceCache] 清理过期统计缓存: $_currentUserId',
        tag: 'Cache',
      );
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
    _ensureUserContext();
    if (_currentUserId == null) return;

    if (invoiceId != null) {
      final userDetailCache = _detailCacheByUser[_currentUserId!] ?? {};
      userDetailCache.remove(invoiceId);
      AppLogger.debug(
        '🗑️ [InvoiceCache] 无效化发票详情缓存: $_currentUserId [$invoiceId]',
        tag: 'Cache',
      );
    }

    if (invalidateList) {
      _listCacheByUser[_currentUserId!]?.clear();
      AppLogger.debug(
        '🗑️ [InvoiceCache] 无效化发票列表缓存: $_currentUserId',
        tag: 'Cache',
      );
    }

    if (invalidateCount) {
      _countCacheByUser.remove(_currentUserId!);
      AppLogger.debug(
        '🗑️ [InvoiceCache] 无效化发票统计缓存: $_currentUserId',
        tag: 'Cache',
      );
    }
  }

  /// 清理当前用户的所有缓存
  void clearAllCache() {
    _ensureUserContext();
    if (_currentUserId == null) return;

    _listCacheByUser[_currentUserId!]?.clear();
    _detailCacheByUser[_currentUserId!]?.clear();
    _countCacheByUser.remove(_currentUserId!);
    
    AppLogger.info(
      '🧹 [InvoiceCache] 清理当前用户所有缓存: $_currentUserId',
      tag: 'Cache',
    );
  }

  /// 彻底清理所有用户的缓存（用于调试或紧急情况）
  void clearAllUsersCache() {
    _listCacheByUser.clear();
    _detailCacheByUser.clear();
    _countCacheByUser.clear();
    _currentUserId = null;
    
    AppLogger.warning(
      '🧨 [InvoiceCache] 清理所有用户缓存（紧急清理）',
      tag: 'Cache',
    );
  }

  /// 清理指定用户的缓存（管理员功能）
  void clearUserCache(String userId) {
    _listCacheByUser.remove(userId);
    _detailCacheByUser.remove(userId);
    _countCacheByUser.remove(userId);
    
    AppLogger.info(
      '🗑️ [InvoiceCache] 清理指定用户缓存: $userId',
      tag: 'Cache',
    );
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
    _ensureUserContext();
    
    final userListCache = _listCacheByUser[_currentUserId] ?? {};
    final userDetailCache = _detailCacheByUser[_currentUserId] ?? {};
    final userCountCache = _countCacheByUser[_currentUserId];
    
    return {
      'currentUserId': _currentUserId,
      'totalUsers': _listCacheByUser.keys.length,
      'currentUserStats': {
        'listCacheSize': userListCache.length,
        'detailCacheSize': userDetailCache.length,
        'hasCountCache': userCountCache != null && !userCountCache.isExpired,
        'expiredListEntries': userListCache.values.where((e) => e.isExpired).length,
        'expiredDetailEntries': userDetailCache.values.where((e) => e.isExpired).length,
      },
      'systemStats': {
        'totalListCaches': _listCacheByUser.values.fold<int>(0, (sum, cache) => sum + cache.length),
        'totalDetailCaches': _detailCacheByUser.values.fold<int>(0, (sum, cache) => sum + cache.length),
        'totalCountCaches': _countCacheByUser.length,
      },
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
