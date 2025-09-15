import 'package:flutter/cupertino.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';

/// 乐观UI更新处理器
/// 提供即时反馈，后台同步数据
class OptimisticUIHandler {
  static final OptimisticUIHandler _instance = OptimisticUIHandler._internal();
  factory OptimisticUIHandler() => _instance;
  OptimisticUIHandler._internal();

  // 乐观更新的状态跟踪
  final Map<String, _OptimisticOperation> _pendingOperations = {};

  /// 乐观更新发票状态
  Future<void> optimisticUpdateInvoiceStatus({
    required String invoiceId,
    required InvoiceStatus newStatus,
    required Future<void> Function() serverUpdate,
    required VoidCallback onSuccess,
    required Function(Exception) onError,
  }) async {
    final operationId = 'status_$invoiceId';

    // 1. 立即更新UI
    _pendingOperations[operationId] = _OptimisticOperation(
      type: OperationType.statusUpdate,
      invoiceId: invoiceId,
      originalValue: null, // 应该从当前状态获取
      newValue: newStatus,
      timestamp: DateTime.now(),
    );

    onSuccess(); // 立即触发UI更新

    try {
      // 2. 后台执行服务器更新
      await serverUpdate();

      // 3. 成功后清理乐观操作
      _pendingOperations.remove(operationId);
    } catch (e) {
      // 4. 失败时回滚UI状态
      _rollbackOperation(operationId);
      onError(e is Exception ? e : Exception(e.toString()));
    }
  }

  /// 乐观删除发票
  Future<void> optimisticDeleteInvoice({
    required String invoiceId,
    required InvoiceEntity invoice,
    required Future<void> Function() serverDelete,
    required VoidCallback onSuccess,
    required Function(Exception) onError,
  }) async {
    final operationId = 'delete_$invoiceId';

    // 1. 立即从UI移除
    _pendingOperations[operationId] = _OptimisticOperation(
      type: OperationType.delete,
      invoiceId: invoiceId,
      originalValue: invoice,
      newValue: null,
      timestamp: DateTime.now(),
    );

    onSuccess(); // 立即触发UI更新

    try {
      // 2. 后台执行删除
      await serverDelete();

      // 3. 成功后清理记录
      _pendingOperations.remove(operationId);
    } catch (e) {
      // 4. 失败时恢复发票
      _rollbackOperation(operationId);
      onError(e is Exception ? e : Exception(e.toString()));
    }
  }

  /// 乐观批量操作
  Future<void> optimisticBatchUpdate({
    required List<String> invoiceIds,
    required InvoiceStatus newStatus,
    required Future<void> Function() serverBatchUpdate,
    required VoidCallback onSuccess,
    required Function(Exception) onError,
  }) async {
    final operationId = 'batch_${DateTime.now().millisecondsSinceEpoch}';

    // 1. 立即更新所有选中项的UI
    for (final invoiceId in invoiceIds) {
      _pendingOperations['${operationId}_$invoiceId'] = _OptimisticOperation(
        type: OperationType.batchStatusUpdate,
        invoiceId: invoiceId,
        originalValue: null,
        newValue: newStatus,
        timestamp: DateTime.now(),
      );
    }

    onSuccess(); // 立即触发UI更新

    try {
      // 2. 后台执行批量更新
      await serverBatchUpdate();

      // 3. 成功后清理所有操作记录
      for (final invoiceId in invoiceIds) {
        _pendingOperations.remove('${operationId}_$invoiceId');
      }
    } catch (e) {
      // 4. 失败时回滚所有更改
      for (final invoiceId in invoiceIds) {
        _rollbackOperation('${operationId}_$invoiceId');
      }
      onError(e is Exception ? e : Exception(e.toString()));
    }
  }

  /// 回滚乐观操作
  void _rollbackOperation(String operationId) {
    final operation = _pendingOperations.remove(operationId);
    if (operation != null) {
      // 触发UI回滚
      _notifyRollback(operation);
    }
  }

  /// 通知UI回滚
  void _notifyRollback(_OptimisticOperation operation) {
    // 这里应该通过事件总线或状态管理来通知UI回滚
  }

  /// 检查发票是否有待处理的乐观操作
  bool hasPendingOperation(String invoiceId) {
    return _pendingOperations.values.any((op) => op.invoiceId == invoiceId);
  }

  /// 获取待处理操作的UI状态
  /// 返回null表示无待处理操作
  bool hasPendingOperationDetails(String invoiceId) {
    return _pendingOperations.values.any((op) => op.invoiceId == invoiceId);
  }

  /// 清理超时的乐观操作
  void cleanupTimeoutOperations() {
    final cutoff = DateTime.now().subtract(const Duration(seconds: 30));
    final expiredKeys = _pendingOperations.entries
        .where((entry) => entry.value.timestamp.isBefore(cutoff))
        .map((entry) => entry.key)
        .toList();

    for (final key in expiredKeys) {
      _rollbackOperation(key);
    }
  }

  /// 获取所有待处理操作的统计
  Map<String, int> getPendingOperationsStats() {
    final stats = <String, int>{};

    for (final operation in _pendingOperations.values) {
      final type = operation.type.toString();
      stats[type] = (stats[type] ?? 0) + 1;
    }

    return stats;
  }
}

/// 乐观操作类型
enum OperationType {
  statusUpdate,
  delete,
  batchStatusUpdate,
  create,
  update,
}

/// 乐观操作记录
class _OptimisticOperation {
  final OperationType type;
  final String invoiceId;
  final dynamic originalValue;
  final dynamic newValue;
  final DateTime timestamp;

  _OptimisticOperation({
    required this.type,
    required this.invoiceId,
    required this.originalValue,
    required this.newValue,
    required this.timestamp,
  });
}

/// 智能加载状态管理器
class SmartLoadingManager {
  static final SmartLoadingManager _instance = SmartLoadingManager._internal();
  factory SmartLoadingManager() => _instance;
  SmartLoadingManager._internal();

  final Map<String, LoadingState> _loadingStates = {};

  /// 设置加载状态
  void setLoading(String key, {String? message}) {
    _loadingStates[key] = LoadingState(
      isLoading: true,
      message: message,
      startTime: DateTime.now(),
    );
  }

  /// 清除加载状态
  void clearLoading(String key) {
    _loadingStates.remove(key);
  }

  /// 获取加载状态
  LoadingState? getLoadingState(String key) {
    return _loadingStates[key];
  }

  /// 检查是否正在加载
  bool isLoading(String key) {
    return _loadingStates[key]?.isLoading ?? false;
  }

  /// 获取所有正在加载的键
  List<String> getLoadingKeys() {
    return _loadingStates.entries
        .where((entry) => entry.value.isLoading)
        .map((entry) => entry.key)
        .toList();
  }
}

/// 加载状态类
class LoadingState {
  final bool isLoading;
  final String? message;
  final DateTime startTime;

  LoadingState({
    required this.isLoading,
    this.message,
    required this.startTime,
  });

  Duration get duration => DateTime.now().difference(startTime);
}
