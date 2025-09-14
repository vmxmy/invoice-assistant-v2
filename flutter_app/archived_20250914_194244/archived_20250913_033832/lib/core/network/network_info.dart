import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../config/app_config.dart';
import '../utils/logger.dart';

/// 网络连接状态枚举
enum NetworkStatus {
  connected,
  disconnected,
  unknown,
}

/// 网络连接类型枚举
enum NetworkType {
  mobile,
  wifi,
  ethernet,
  vpn,
  other,
  none,
}

/// 网络状态信息类
class NetworkInfo {
  final NetworkStatus status;
  final NetworkType type;
  final String? typeName;
  final DateTime timestamp;

  const NetworkInfo({
    required this.status,
    required this.type,
    this.typeName,
    required this.timestamp,
  });

  factory NetworkInfo.disconnected() {
    return NetworkInfo(
      status: NetworkStatus.disconnected,
      type: NetworkType.none,
      timestamp: DateTime.now(),
    );
  }

  factory NetworkInfo.unknown() {
    return NetworkInfo(
      status: NetworkStatus.unknown,
      type: NetworkType.other,
      timestamp: DateTime.now(),
    );
  }

  @override
  String toString() {
    return 'NetworkInfo(status: $status, type: $type, timestamp: $timestamp)';
  }

  Map<String, dynamic> toMap() {
    return {
      'status': status.name,
      'type': type.name,
      'typeName': typeName,
      'timestamp': timestamp.toIso8601String(),
    };
  }
}

/// 网络状态检查服务
/// 提供网络连接状态监听和检查功能
class NetworkService {
  static NetworkService? _instance;
  static final Connectivity _connectivity = Connectivity();

  StreamSubscription<List<ConnectivityResult>>? _subscription;
  final StreamController<NetworkInfo> _networkStatusController =
      StreamController<NetworkInfo>.broadcast();

  NetworkInfo _currentNetworkInfo = NetworkInfo.unknown();

  NetworkService._();

  /// 获取单例实例
  static NetworkService get instance {
    _instance ??= NetworkService._();
    return _instance!;
  }

  /// 获取当前网络状态
  NetworkInfo get currentNetworkInfo => _currentNetworkInfo;

  /// 网络状态变化流
  Stream<NetworkInfo> get networkStatusStream =>
      _networkStatusController.stream;

  /// 是否已连接网络
  bool get isConnected => _currentNetworkInfo.status == NetworkStatus.connected;

  /// 是否使用移动网络
  bool get isMobileNetwork => _currentNetworkInfo.type == NetworkType.mobile;

  /// 是否使用 WiFi
  bool get isWiFiNetwork => _currentNetworkInfo.type == NetworkType.wifi;

  /// 初始化网络状态监听
  Future<void> initialize() async {
    if (AppConfig.enableLogging) {
      AppLogger.info('Initializing network service', tag: 'Network');
    }

    try {
      // 获取初始网络状态
      await _updateNetworkStatus();

      // 开始监听网络状态变化
      _subscription = _connectivity.onConnectivityChanged.listen(
        _onConnectivityChanged,
        onError: (error) {
          if (AppConfig.enableLogging) {
            AppLogger.error('Network connectivity error',
                tag: 'Network', error: error);
          }
          _updateNetworkInfo(NetworkInfo.unknown());
        },
      );

      if (AppConfig.enableLogging) {
        AppLogger.info('Network service initialized successfully',
            tag: 'Network');
        printNetworkStatus();
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('Failed to initialize network service',
            tag: 'Network', error: e);
      }
      _updateNetworkInfo(NetworkInfo.unknown());
    }
  }

  /// 停止网络状态监听
  void dispose() {
    _subscription?.cancel();
    _networkStatusController.close();
    if (AppConfig.enableLogging) {
      AppLogger.info('Network service disposed', tag: 'Network');
    }
  }

  /// 手动检查网络状态
  Future<NetworkInfo> checkNetworkStatus() async {
    try {
      await _updateNetworkStatus();
      return _currentNetworkInfo;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('Failed to check network status',
            tag: 'Network', error: e);
      }
      final unknownInfo = NetworkInfo.unknown();
      _updateNetworkInfo(unknownInfo);
      return unknownInfo;
    }
  }

  /// 网络连接变化回调
  void _onConnectivityChanged(List<ConnectivityResult> results) {
    if (AppConfig.enableLogging) {
      AppLogger.debug('Network connectivity changed: $results', tag: 'Network');
    }
    _updateNetworkStatus();
  }

  /// 更新网络状态
  Future<void> _updateNetworkStatus() async {
    try {
      final results = await _connectivity.checkConnectivity();
      final networkInfo = _parseConnectivityResults(results);
      _updateNetworkInfo(networkInfo);
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('Error updating network status',
            tag: 'Network', error: e);
      }
      _updateNetworkInfo(NetworkInfo.unknown());
    }
  }

  /// 解析连接结果
  NetworkInfo _parseConnectivityResults(List<ConnectivityResult> results) {
    if (results.isEmpty || results.contains(ConnectivityResult.none)) {
      return NetworkInfo.disconnected();
    }

    // 确定主要连接类型
    NetworkType type = NetworkType.other;
    String? typeName;

    if (results.contains(ConnectivityResult.wifi)) {
      type = NetworkType.wifi;
      typeName = 'WiFi';
    } else if (results.contains(ConnectivityResult.mobile)) {
      type = NetworkType.mobile;
      typeName = 'Mobile';
    } else if (results.contains(ConnectivityResult.ethernet)) {
      type = NetworkType.ethernet;
      typeName = 'Ethernet';
    } else if (results.contains(ConnectivityResult.vpn)) {
      type = NetworkType.vpn;
      typeName = 'VPN';
    } else {
      type = NetworkType.other;
      typeName = results.first.name;
    }

    return NetworkInfo(
      status: NetworkStatus.connected,
      type: type,
      typeName: typeName,
      timestamp: DateTime.now(),
    );
  }

  /// 更新网络信息并通知监听者
  void _updateNetworkInfo(NetworkInfo networkInfo) {
    _currentNetworkInfo = networkInfo;
    _networkStatusController.add(networkInfo);

    if (AppConfig.enableLogging) {
      AppLogger.debug(
          'Network status updated: ${networkInfo.status.name} (${networkInfo.typeName ?? networkInfo.type.name})',
          tag: 'Network');
    }
  }

  /// 检查网络连接质量（简单实现）
  Future<bool> testNetworkQuality() async {
    if (!isConnected) {
      return false;
    }

    try {
      // 这里可以添加更复杂的网络质量检测逻辑
      // 例如：ping 测试、下载速度测试等

      // 简单的连接测试
      final results = await _connectivity.checkConnectivity();
      return results.isNotEmpty && !results.contains(ConnectivityResult.none);
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.warning('Network quality test failed',
            tag: 'Network', error: e);
      }
      return false;
    }
  }

  /// 等待网络连接恢复
  Future<NetworkInfo> waitForConnection({Duration? timeout}) async {
    if (isConnected) {
      return _currentNetworkInfo;
    }

    final completer = Completer<NetworkInfo>();
    StreamSubscription<NetworkInfo>? subscription;

    subscription = networkStatusStream.listen((networkInfo) {
      if (networkInfo.status == NetworkStatus.connected) {
        subscription?.cancel();
        if (!completer.isCompleted) {
          completer.complete(networkInfo);
        }
      }
    });

    // 设置超时
    if (timeout != null) {
      Timer(timeout, () {
        subscription?.cancel();
        if (!completer.isCompleted) {
          completer.complete(_currentNetworkInfo);
        }
      });
    }

    return completer.future;
  }

  /// 获取网络状态摘要
  Map<String, dynamic> getNetworkStatusSummary() {
    return {
      'isConnected': isConnected,
      'isMobileNetwork': isMobileNetwork,
      'isWiFiNetwork': isWiFiNetwork,
      'currentStatus': _currentNetworkInfo.status.name,
      'currentType': _currentNetworkInfo.type.name,
      'typeName': _currentNetworkInfo.typeName,
      'lastUpdate': _currentNetworkInfo.timestamp.toIso8601String(),
    };
  }

  /// 打印网络状态（仅在调试模式下）
  void printNetworkStatus() {
    if (AppConfig.isDebugMode && AppConfig.enableLogging) {
      AppLogger.debug('Network Status:', tag: 'Network');
      final summary = getNetworkStatusSummary();
      summary.forEach((key, value) {
        AppLogger.debug('   $key: $value', tag: 'Network');
      });
    }
  }
}
