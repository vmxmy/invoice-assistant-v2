import 'dart:async';
import 'dart:math';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../utils/logger.dart';

/// 优化的网络服务类
/// 包含请求批处理、连接池、重试机制和自适应超时
class OptimizedNetworkService {
  static final OptimizedNetworkService _instance =
      OptimizedNetworkService._internal();
  factory OptimizedNetworkService() => _instance;
  OptimizedNetworkService._internal();

  // 连接状态监听
  late final StreamSubscription<List<ConnectivityResult>>
      _connectivitySubscription;
  ConnectivityResult _currentConnectivity = ConnectivityResult.none;

  // 请求队列和批处理
  final List<_QueuedRequest> _requestQueue = [];
  Timer? _batchTimer;

  // 自适应超时配置
  final Map<String, Duration> _endpointTimeouts = {};
  final Map<String, List<int>> _responseTimeHistory = {};

  static const Duration _baseBatchDelay = Duration(milliseconds: 50);
  static const int _maxBatchSize = 5;
  static const int _maxRetries = 3;

  void initialize() {
    _setupConnectivityListener();
    _setupPeriodicCleanup();
  }

  /// 设置网络连接监听
  void _setupConnectivityListener() {
    _connectivitySubscription = Connectivity()
        .onConnectivityChanged
        .listen((List<ConnectivityResult> results) {
      if (results.isNotEmpty) {
        _currentConnectivity = results.first;
        _handleConnectivityChange();
      }
    });
  }

  /// 处理网络连接变化
  void _handleConnectivityChange() {
    switch (_currentConnectivity) {
      case ConnectivityResult.wifi:
        _adjustTimeoutsForWifi();
        _processQueuedRequests();
        break;
      case ConnectivityResult.mobile:
        _adjustTimeoutsForMobile();
        _processQueuedRequests();
        break;
      case ConnectivityResult.none:
        _pauseRequests();
        break;
      default:
        break;
    }
  }

  /// WiFi环境下的优化配置
  void _adjustTimeoutsForWifi() {
    _updateDefaultTimeout(Duration(seconds: 10));
  }

  /// 移动网络环境下的优化配置
  void _adjustTimeoutsForMobile() {
    _updateDefaultTimeout(Duration(seconds: 15));
  }

  void _updateDefaultTimeout(Duration timeout) {
    // 更新所有端点的默认超时
    for (final endpoint in _endpointTimeouts.keys) {
      _endpointTimeouts[endpoint] = timeout;
    }
  }

  /// 智能批处理请求
  Future<T> batchRequest<T>({
    required String endpoint,
    required Map<String, dynamic> params,
    required Future<T> Function() requestFunction,
    Duration? customTimeout,
  }) async {
    final completer = Completer<T>();

    final queuedRequest = _QueuedRequest(
      endpoint: endpoint,
      params: params,
      completer: completer,
      requestFunction: requestFunction,
      timeout: customTimeout ?? _getAdaptiveTimeout(endpoint),
    );

    _requestQueue.add(queuedRequest);
    _scheduleBatchExecution();

    return completer.future;
  }

  /// 调度批处理执行
  void _scheduleBatchExecution() {
    _batchTimer?.cancel();
    _batchTimer = Timer(_baseBatchDelay, () {
      _processBatch();
    });
  }

  /// 处理请求批次
  Future<void> _processBatch() async {
    if (_requestQueue.isEmpty) return;

    // 按端点分组请求
    final groupedRequests = <String, List<_QueuedRequest>>{};

    for (final request in _requestQueue) {
      groupedRequests.putIfAbsent(request.endpoint, () => []).add(request);
    }

    _requestQueue.clear();

    // 并发处理各组请求
    final futures = <Future>[];

    for (final endpoint in groupedRequests.keys) {
      final requests = groupedRequests[endpoint]!;
      futures.add(_processEndpointBatch(endpoint, requests));
    }

    await Future.wait(futures, eagerError: false);
  }

  /// 处理单个端点的请求批次
  Future<void> _processEndpointBatch(
      String endpoint, List<_QueuedRequest> requests) async {
    // 限制并发数量
    final chunks = _chunkList(requests, _maxBatchSize);

    for (final chunk in chunks) {
      final futures = chunk.map((request) => _executeRequest(request));
      await Future.wait(futures, eagerError: false);
    }
  }

  /// 执行单个请求（带重试机制）
  Future<void> _executeRequest(_QueuedRequest request) async {
    int attempts = 0;
    Exception? lastError;

    while (attempts < _maxRetries) {
      try {
        final startTime = DateTime.now();
        final result = await request.requestFunction().timeout(request.timeout);
        final responseTime =
            DateTime.now().difference(startTime).inMilliseconds;

        _recordResponseTime(request.endpoint, responseTime);
        request.completer.complete(result);
        return;
      } catch (e) {
        lastError = e is Exception ? e : Exception(e.toString());
        attempts++;

        if (attempts < _maxRetries) {
          await _getRetryDelay(attempts, request.endpoint);
        }
      }
    }

    request.completer.completeError(lastError!);
  }

  /// 获取自适应超时时间
  Duration _getAdaptiveTimeout(String endpoint) {
    // 基于历史响应时间计算超时
    final history = _responseTimeHistory[endpoint];
    if (history == null || history.isEmpty) {
      return Duration(seconds: 10); // 默认超时
    }

    final avgResponseTime = history.reduce((a, b) => a + b) / history.length;
    final adaptiveTimeout =
        Duration(milliseconds: (avgResponseTime * 3).toInt());

    // 限制超时范围在5-30秒之间
    return Duration(
      seconds: adaptiveTimeout.inSeconds.clamp(5, 30),
    );
  }

  /// 记录响应时间用于自适应优化
  void _recordResponseTime(String endpoint, int responseTimeMs) {
    _responseTimeHistory.putIfAbsent(endpoint, () => []);
    final history = _responseTimeHistory[endpoint]!;

    history.add(responseTimeMs);

    // 保持历史记录在合理范围内
    if (history.length > 10) {
      history.removeAt(0);
    }
  }

  /// 计算重试延迟（指数退避）
  Future<void> _getRetryDelay(int attempt, String endpoint) async {
    final baseDelay = Duration(milliseconds: 500);
    final exponentialDelay = Duration(
      milliseconds: baseDelay.inMilliseconds * pow(2, attempt - 1).toInt(),
    );

    // 添加随机抖动避免惊群效应
    final jitter = Duration(
      milliseconds: Random().nextInt(exponentialDelay.inMilliseconds ~/ 2),
    );

    await Future.delayed(exponentialDelay + jitter);
  }

  /// 处理排队的请求（网络恢复后）
  void _processQueuedRequests() {
    if (_requestQueue.isNotEmpty) {
      _processBatch();
    }
  }

  /// 暂停请求（网络断开时）
  void _pauseRequests() {
    // 请求留在队列中，等待网络恢复
    AppLogger.info('Network disconnected. Requests queued for retry.',
        tag: 'Network');
  }

  /// 设置定期清理
  void _setupPeriodicCleanup() {
    Timer.periodic(Duration(hours: 1), (_) {
      _cleanupResponseTimeHistory();
    });
  }

  /// 清理响应时间历史记录
  void _cleanupResponseTimeHistory() {
    // 清理超过6小时的响应时间历史记录，变量保留以备将来实现清理逻辑
    // ignore: unused_local_variable
    final cutoff = DateTime.now().subtract(Duration(hours: 6));
    // 清理逻辑...
  }

  /// 分块列表辅助方法
  List<List<T>> _chunkList<T>(List<T> list, int chunkSize) {
    final chunks = <List<T>>[];
    for (int i = 0; i < list.length; i += chunkSize) {
      chunks.add(list.sublist(i, min(i + chunkSize, list.length)));
    }
    return chunks;
  }

  void dispose() {
    _connectivitySubscription.cancel();
    _batchTimer?.cancel();
  }
}

/// 排队请求项
class _QueuedRequest<T> {
  final String endpoint;
  final Map<String, dynamic> params;
  final Completer<T> completer;
  final Future<T> Function() requestFunction;
  final Duration timeout;

  _QueuedRequest({
    required this.endpoint,
    required this.params,
    required this.completer,
    required this.requestFunction,
    required this.timeout,
  });
}
