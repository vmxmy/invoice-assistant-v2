import 'dart:async';
import 'package:flutter/foundation.dart';
import 'app_event_bus.dart';
import '../config/app_config.dart';

/// 事件总线测试器
/// 
/// 用于调试和监控事件总线中的事件流转
class EventBusTester {
  final AppEventBus _eventBus;
  StreamSubscription<AppEvent>? _subscription;
  final List<AppEvent> _eventHistory = [];
  int _eventCount = 0;

  EventBusTester({AppEventBus? eventBus}) 
      : _eventBus = eventBus ?? AppEventBus.instance;

  /// 开始监听所有事件
  void startListening() {
    if (_subscription != null) {
      debugPrint('⚠️ [EventBusTester] 已在监听中');
      return;
    }

    _subscription = _eventBus.stream.listen(
      (event) {
        _eventCount++;
        _eventHistory.add(event);
        
        // 保持历史记录不超过100条
        if (_eventHistory.length > 100) {
          _eventHistory.removeAt(0);
        }

        if (AppConfig.enableLogging) {
          _logEvent(event);
        }
      },
      onError: (error) {
        debugPrint('❌ [EventBusTester] 事件监听错误: $error');
      },
    );

    debugPrint('✅ [EventBusTester] 开始监听事件总线');
  }

  /// 停止监听
  void stopListening() {
    _subscription?.cancel();
    _subscription = null;
    debugPrint('🛑 [EventBusTester] 停止监听事件总线');
  }

  /// 发送测试事件
  void sendTestEvent() {
    _eventBus.emit(DataRefreshRequestedEvent(
      moduleType: 'test',
      parameters: {'timestamp': DateTime.now().millisecondsSinceEpoch},
    ));
    debugPrint('📤 [EventBusTester] 发送测试事件');
  }

  /// 获取事件统计
  Map<String, dynamic> getStats() {
    final eventTypes = <String, int>{};
    for (final event in _eventHistory) {
      final type = event.runtimeType.toString();
      eventTypes[type] = (eventTypes[type] ?? 0) + 1;
    }

    return {
      'totalEvents': _eventCount,
      'historyEvents': _eventHistory.length,
      'eventTypes': eventTypes,
      'isListening': _subscription != null,
    };
  }

  /// 清除统计
  void clearStats() {
    _eventCount = 0;
    _eventHistory.clear();
    debugPrint('🧹 [EventBusTester] 清除事件统计');
  }

  /// 记录事件详情
  void _logEvent(AppEvent event) {
    final timestamp = DateTime.now().toString().substring(11, 19);
    String details = '';

    switch (event.runtimeType) {
      case TabChangedEvent _:
        final e = event as TabChangedEvent;
        details = '${e.oldTabIndex} → ${e.newTabIndex} (${e.tabName})';
        break;
      case InvoiceStatusChangedEvent _:
        final e = event as InvoiceStatusChangedEvent;
        details = '${e.invoiceId.substring(0, 8)}... (${e.oldStatus} → ${e.newStatus})';
        break;
      case InvoiceDeletedEvent _:
        final e = event as InvoiceDeletedEvent;
        details = '${e.invoiceId.substring(0, 8)}... (inSet: ${e.wasInReimbursementSet})';
        break;
      case ReimbursementSetCreatedEvent _:
        final e = event as ReimbursementSetCreatedEvent;
        details = '${e.setId.substring(0, 8)}... (${e.affectedInvoiceIds.length} invoices)';
        break;
      case ReimbursementSetDeletedEvent _:
        final e = event as ReimbursementSetDeletedEvent;
        details = '${e.setId.substring(0, 8)}... (${e.affectedInvoiceIds.length} invoices)';
        break;
      case AppResumedEvent _:
        final e = event as AppResumedEvent;
        details = e.resumeTime.toString().substring(11, 19);
        break;
      default:
        details = event.toString();
    }

    debugPrint('🔄 [$timestamp] [${event.runtimeType}] $details');
  }

  /// 销毁测试器
  void dispose() {
    stopListening();
    clearStats();
  }
}

/// 全局事件总线测试器实例
/// 可以在开发模式下使用
final eventBusTester = EventBusTester();

/// 开发模式辅助函数
void enableEventBusDebugging() {
  if (kDebugMode) {
    eventBusTester.startListening();
    debugPrint('🎯 [EventBusTester] 事件总线调试已启用');
  }
}

void disableEventBusDebugging() {
  if (kDebugMode) {
    eventBusTester.stopListening();
    debugPrint('🎯 [EventBusTester] 事件总线调试已禁用');
  }
}

void printEventBusStats() {
  if (kDebugMode) {
    final stats = eventBusTester.getStats();
    debugPrint('📊 [EventBusTester] 事件总线统计:');
    debugPrint('   总事件数: ${stats['totalEvents']}');
    debugPrint('   历史记录: ${stats['historyEvents']}');
    debugPrint('   监听状态: ${stats['isListening']}');
    debugPrint('   事件类型分布: ${stats['eventTypes']}');
  }
}