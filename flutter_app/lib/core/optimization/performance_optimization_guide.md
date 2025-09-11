# Flutter应用性能优化指南

## 基于发票详情页的快速加载分析

### 核心优化策略

#### 1. 多层缓存架构
```dart
// 通用缓存管理器模板
class GenericCache<T> {
  final Map<String, _CacheEntry<T>> _cache = {};
  final int _maxSize;
  final Duration _defaultTtl;
  
  GenericCache({
    int maxSize = 50,
    Duration defaultTtl = const Duration(minutes: 5),
  }) : _maxSize = maxSize, _defaultTtl = defaultTtl;
  
  // LRU淘汰策略
  void _evictLRU() {
    if (_cache.length >= _maxSize) {
      final oldestKey = _cache.keys.first;
      _cache.remove(oldestKey);
    }
  }
  
  // 缓存数据
  void cache(String key, T data, {Duration? ttl}) {
    _cleanExpired();
    _evictLRU();
    _cache[key] = _CacheEntry(
      data: data,
      expiration: DateTime.now().add(ttl ?? _defaultTtl),
    );
  }
  
  // 获取缓存
  T? get(String key) {
    final entry = _cache[key];
    if (entry?.isExpired == false) {
      return entry!.data;
    }
    return null;
  }
}
```

#### 2. Repository层预缓存策略
```dart
// 在列表查询时预缓存详情
Future<List<Entity>> getEntities() async {
  final entities = await _dataSource.getEntities();
  
  // 预缓存每个实体的详情
  for (final entity in entities) {
    _cache.cacheDetail(entity.id, entity);
  }
  
  return entities;
}
```

#### 3. 智能重试机制
```dart
class RetryableUseCase<T> {
  static const int _maxRetries = 3;
  static const Duration _baseDelay = Duration(milliseconds: 500);
  
  Future<T> executeWithRetry(Future<T> Function() operation) async {
    for (int attempt = 0; attempt <= _maxRetries; attempt++) {
      try {
        return await operation();
      } catch (e) {
        if (attempt == _maxRetries || !_shouldRetry(e)) {
          rethrow;
        }
        await Future.delayed(_calculateDelay(attempt));
      }
    }
    throw Exception('Max retries exceeded');
  }
  
  bool _shouldRetry(dynamic error) {
    final errorStr = error.toString().toLowerCase();
    return errorStr.contains('timeout') || 
           errorStr.contains('network') ||
           errorStr.contains('connection');
  }
  
  Duration _calculateDelay(int attempt) {
    return Duration(
      milliseconds: (_baseDelay.inMilliseconds * (2.0 * attempt)).round(),
    );
  }
}
```

### 应用建议

#### 对于列表页面:
1. **虚拟滚动**: 只渲染可见区域的项目
2. **分页预加载**: 提前加载下一页数据
3. **图片懒加载**: 使用`CachedNetworkImage`
4. **状态预测**: 预测用户可能点击的项目并预加载

#### 对于详情页面:
1. **骨架屏**: 显示加载占位符而不是空白页
2. **分层渲染**: 先显示基础信息，再显示复杂组件
3. **数据预取**: 在列表页点击时就开始获取详情
4. **离线缓存**: 缓存最近查看的详情页

#### 对于搜索功能:
1. **防抖输入**: 避免频繁请求
2. **结果缓存**: 缓存搜索结果
3. **智能补全**: 预测用户输入
4. **历史记录**: 缓存用户搜索历史

### 性能监控

#### 关键指标:
- **TTFB**: 首字节时间
- **FCP**: 首次内容绘制
- **LCP**: 最大内容绘制
- **缓存命中率**: 缓存有效性指标

#### 监控代码:
```dart
class PerformanceMonitor {
  static void trackLoadTime(String operation, int milliseconds) {
    if (milliseconds > 1000) {
      print('⚠️ [Performance] Slow operation: $operation took ${milliseconds}ms');
    } else {
      print('✅ [Performance] $operation completed in ${milliseconds}ms');
    }
  }
  
  static void trackCacheHit(String cacheType, bool hit) {
    final status = hit ? 'HIT' : 'MISS';
    print('📊 [Cache] $cacheType: $status');
  }
}
```

### 实施优先级

1. **高优先级**: 
   - 实施基础缓存机制
   - 添加重试逻辑
   - 骨架屏占位符

2. **中优先级**:
   - 预加载优化
   - 性能监控
   - 离线支持

3. **低优先级**:
   - 高级预测算法
   - 复杂动画优化
   - A/B测试框架

### 注意事项

1. **内存管理**: 缓存不能无限增长，需要合理的淘汰策略
2. **数据一致性**: 缓存更新和失效策略要正确
3. **网络优化**: 合并请求，减少往返次数
4. **用户体验**: 优化要对用户可感知，不能只看技术指标

这套优化策略已经在发票详情页验证有效，可以应用到其他模块提升整体应用性能。