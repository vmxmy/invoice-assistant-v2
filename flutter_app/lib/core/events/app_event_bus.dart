import 'dart:async';

/// 应用全局事件总线
/// 
/// 用于解耦不同 Bloc 之间的通信，避免直接依赖
class AppEventBus {
  AppEventBus._();
  
  static final AppEventBus _instance = AppEventBus._();
  static AppEventBus get instance => _instance;
  
  final StreamController<AppEvent> _controller = StreamController<AppEvent>.broadcast();
  
  /// 事件流
  Stream<AppEvent> get stream => _controller.stream;
  
  /// 发送事件
  void emit(AppEvent event) {
    _controller.add(event);
  }
  
  /// 监听特定类型的事件
  Stream<T> on<T extends AppEvent>() {
    return stream.where((event) => event is T).cast<T>();
  }
  
  /// 销毁事件总线
  void dispose() {
    _controller.close();
  }
}

/// 应用事件基类
abstract class AppEvent {
  const AppEvent();
}

/// 报销集变更事件
abstract class ReimbursementSetChangedEvent extends AppEvent {
  const ReimbursementSetChangedEvent();
}

/// 报销集创建事件
class ReimbursementSetCreatedEvent extends ReimbursementSetChangedEvent {
  final String setId;
  final List<String> affectedInvoiceIds;
  
  const ReimbursementSetCreatedEvent({
    required this.setId,
    required this.affectedInvoiceIds,
  });
}

/// 报销集删除事件
class ReimbursementSetDeletedEvent extends ReimbursementSetChangedEvent {
  final String setId;
  final List<String> affectedInvoiceIds;
  
  const ReimbursementSetDeletedEvent({
    required this.setId,
    required this.affectedInvoiceIds,
  });
}

/// 发票添加到报销集事件
class InvoicesAddedToSetEvent extends ReimbursementSetChangedEvent {
  final String setId;
  final List<String> invoiceIds;
  
  const InvoicesAddedToSetEvent({
    required this.setId,
    required this.invoiceIds,
  });
}

/// 发票从报销集移除事件
class InvoicesRemovedFromSetEvent extends ReimbursementSetChangedEvent {
  final List<String> invoiceIds;
  
  const InvoicesRemovedFromSetEvent({
    required this.invoiceIds,
  });
}

/// 发票相关事件基类
abstract class InvoiceChangedEvent extends AppEvent {
  const InvoiceChangedEvent();
}

/// 发票状态变更事件
class InvoiceStatusChangedEvent extends InvoiceChangedEvent {
  final String invoiceId;
  final String newStatus;
  final String? oldStatus;
  
  const InvoiceStatusChangedEvent({
    required this.invoiceId,
    required this.newStatus,
    this.oldStatus,
  });
}

/// 发票删除事件
class InvoiceDeletedEvent extends InvoiceChangedEvent {
  final String invoiceId;
  final bool wasInReimbursementSet;
  final String? reimbursementSetId;
  
  const InvoiceDeletedEvent({
    required this.invoiceId,
    this.wasInReimbursementSet = false,
    this.reimbursementSetId,
  });
}

/// 批量发票删除事件
class InvoicesDeletedEvent extends InvoiceChangedEvent {
  final List<String> invoiceIds;
  final List<String> affectedReimbursementSetIds;
  
  const InvoicesDeletedEvent({
    required this.invoiceIds,
    this.affectedReimbursementSetIds = const [],
  });
}

/// 发票创建事件
class InvoiceCreatedEvent extends InvoiceChangedEvent {
  final String invoiceId;
  final Map<String, dynamic> metadata;
  
  const InvoiceCreatedEvent({
    required this.invoiceId,
    this.metadata = const {},
  });
}

/// 批量发票上传完成事件
class InvoicesUploadedEvent extends InvoiceChangedEvent {
  final List<String> successfulInvoiceIds;
  final int failureCount;
  final int duplicateCount;
  
  const InvoicesUploadedEvent({
    required this.successfulInvoiceIds,
    required this.failureCount,
    required this.duplicateCount,
  });
}

/// 报销集状态变更事件
class ReimbursementSetStatusChangedEvent extends ReimbursementSetChangedEvent {
  final String setId;
  final String newStatus;
  final String? oldStatus;
  final List<String> affectedInvoiceIds;
  
  const ReimbursementSetStatusChangedEvent({
    required this.setId,
    required this.newStatus,
    this.oldStatus,
    this.affectedInvoiceIds = const [],
  });
}

/// 应用生命周期事件
abstract class AppLifecycleEvent extends AppEvent {
  const AppLifecycleEvent();
}

/// 应用恢复前台事件
class AppResumedEvent extends AppLifecycleEvent {
  final DateTime resumeTime;
  
  const AppResumedEvent({
    required this.resumeTime,
  });
}

/// Tab切换事件
class TabChangedEvent extends AppEvent {
  final int newTabIndex;
  final int oldTabIndex;
  final String tabName;
  
  const TabChangedEvent({
    required this.newTabIndex,
    required this.oldTabIndex,
    required this.tabName,
  });
}

/// 数据刷新请求事件
class DataRefreshRequestedEvent extends AppEvent {
  final String moduleType;
  final Map<String, dynamic> parameters;
  
  const DataRefreshRequestedEvent({
    required this.moduleType,
    this.parameters = const {},
  });
}