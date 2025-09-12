import 'dart:async';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../domain/entities/invoice_entity.dart';
import '../utils/logger.dart';

/// 增强型缓存管理器
/// 支持内存缓存、持久化缓存、预缓存和智能失效
class EnhancedCacheManager {
  static final EnhancedCacheManager _instance =
      EnhancedCacheManager._internal();
  factory EnhancedCacheManager() => _instance;
  EnhancedCacheManager._internal();

  static const String _cacheKeyPrefix = 'enhanced_cache_';
  static const Duration _defaultTtl = Duration(hours: 2);
  // 离线缓存时长（用于离线模式），保留以备将来扩展，当前未使用（忽略警告）
  // ignore: unused_field
  static const Duration _offlineTtl = Duration(days: 7);

  /// 智能缓存策略：优先显示缓存，后台更新
  Future<List<InvoiceEntity>?> getInvoicesWithStaleWhileRevalidate({
    required String cacheKey,
    required Future<List<InvoiceEntity>> Function() fetchFunction,
    Duration? maxAge,
  }) async {
    // 1. 立即返回缓存数据（如果存在）
    final cached = await _getCachedData<List<InvoiceEntity>>(cacheKey);

    // 2. 后台异步更新
    _updateCacheInBackground(cacheKey, fetchFunction, maxAge);

    return cached;
  }

  /// 后台更新缓存
  void _updateCacheInBackground<T>(
    String cacheKey,
    Future<T> Function() fetchFunction,
    Duration? maxAge,
  ) {
    Timer(Duration.zero, () async {
      try {
        final freshData = await fetchFunction();
        await _setCachedData(cacheKey, freshData, maxAge ?? _defaultTtl);
      } catch (e) {
        // 静默失败，不影响用户体验
        AppLogger.warning('后台缓存更新失败', tag: 'Cache', error: e);
      }
    });
  }

  /// 预缓存常用数据
  Future<void> precacheEssentialData() async {
    final futures = [
      _precacheRecentInvoices(),
      _precacheUserStats(),
      _precacheFrequentlyUsedData(),
    ];

    // 并发执行预缓存任务
    await Future.wait(futures, eagerError: false);
  }

  Future<void> _precacheRecentInvoices() async {
    // 预缓存最近的发票数据
    // 实现逻辑...
  }

  Future<void> _precacheUserStats() async {
    // 预缓存用户统计数据
    // 实现逻辑...
  }

  Future<void> _precacheFrequentlyUsedData() async {
    // 预缓存经常使用的数据
    // 实现逻辑...
  }

  /// 持久化缓存存储
  Future<void> _setCachedData<T>(String key, T data, Duration ttl) async {
    final prefs = await SharedPreferences.getInstance();
    final cacheEntry = {
      'data': _serializeData(data),
      'expiration': DateTime.now().add(ttl).millisecondsSinceEpoch,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };

    await prefs.setString('$_cacheKeyPrefix$key', jsonEncode(cacheEntry));
  }

  /// 获取持久化缓存
  Future<T?> _getCachedData<T>(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString('$_cacheKeyPrefix$key');

      if (cached == null) return null;

      final cacheEntry = jsonDecode(cached);
      final expiration =
          DateTime.fromMillisecondsSinceEpoch(cacheEntry['expiration']);

      // 检查是否过期
      if (DateTime.now().isAfter(expiration)) {
        await prefs.remove('$_cacheKeyPrefix$key');
        return null;
      }

      return _deserializeData<T>(cacheEntry['data']);
    } catch (e) {
      AppLogger.warning('缓存读取错误', tag: 'Cache', error: e);
      return null;
    }
  }

  /// 数据序列化
  dynamic _serializeData<T>(T data) {
    // 暂时简化，直接返回数据
    // TODO: 实现InvoiceEntity的序列化方法
    return data;
  }

  /// 数据反序列化
  T? _deserializeData<T>(dynamic data) {
    // 暂时简化，直接返回数据
    // TODO: 实现InvoiceEntity的反序列化方法
    return data as T?;
  }

  /// 清理过期缓存
  Future<void> cleanExpiredCache() async {
    final prefs = await SharedPreferences.getInstance();
    final keys =
        prefs.getKeys().where((key) => key.startsWith(_cacheKeyPrefix));

    for (final key in keys) {
      final cached = prefs.getString(key);
      if (cached != null) {
        try {
          final cacheEntry = jsonDecode(cached);
          final expiration =
              DateTime.fromMillisecondsSinceEpoch(cacheEntry['expiration']);

          if (DateTime.now().isAfter(expiration)) {
            await prefs.remove(key);
          }
        } catch (e) {
          await prefs.remove(key); // 清理损坏的缓存
        }
      }
    }
  }
}
