import 'dart:async';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../../domain/value_objects/invoice_status.dart';

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

/// 报销集状态变更事件 - 用于状态一致性约束
class ReimbursementSetStatusChangedEvent extends ReimbursementSetChangedEvent {
  final String setId;
  final String newStatus;
  final String? oldStatus;
  final List<String> affectedInvoiceIds;
  final DateTime timestamp;
  
  const ReimbursementSetStatusChangedEvent({
    required this.setId,
    required this.newStatus,
    this.oldStatus,
    this.affectedInvoiceIds = const [],
    required this.timestamp,
  });
  
  @override
  String toString() => 'ReimbursementSetStatusChangedEvent(setId: $setId, $oldStatus -> $newStatus, invoices: ${affectedInvoiceIds.length})';
}

/// 发票状态同步事件 - 专门用于报销集状态变更导致的发票状态同步
class InvoiceStatusSyncedEvent extends InvoiceChangedEvent {
  final List<String> invoiceIds;
  final String newStatus;
  final String? oldStatus;
  final String reimbursementSetId;
  final DateTime timestamp;

  const InvoiceStatusSyncedEvent({
    required this.invoiceIds,
    required this.newStatus,
    this.oldStatus,
    required this.reimbursementSetId,
    required this.timestamp,
  });

  @override
  String toString() => 'InvoiceStatusSyncedEvent(invoices: ${invoiceIds.length}, $oldStatus -> $newStatus, setId: $reimbursementSetId)';
}

/// 状态一致性检查事件 - 用于验证发票与报销集状态同步
class StatusConsistencyCheckEvent extends AppEvent {
  final String reimbursementSetId;
  final DateTime timestamp;
  
  const StatusConsistencyCheckEvent({
    required this.reimbursementSetId,
    required this.timestamp,
  });
  
  @override
  String toString() => 'StatusConsistencyCheckEvent(setId: $reimbursementSetId)';
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

/// 页面导航事件
class PageNavigationEvent extends AppEvent {
  final String fromRoute;
  final String toRoute;
  final DateTime timestamp;
  
  const PageNavigationEvent({
    required this.fromRoute,
    required this.toRoute,
    required this.timestamp,
  });
}

/// 报销集详情页返回事件
class ReimbursementSetDetailPageReturnEvent extends PageNavigationEvent {
  final String reimbursementSetId;
  
  const ReimbursementSetDetailPageReturnEvent({
    required this.reimbursementSetId,
    required super.fromRoute,
    required super.toRoute,
    required super.timestamp,
  });
}

/// UI操作请求事件基类
abstract class UIActionRequestEvent extends AppEvent {
  const UIActionRequestEvent();
}

/// 报销集操作请求事件
abstract class ReimbursementSetActionRequestEvent extends UIActionRequestEvent {
  const ReimbursementSetActionRequestEvent();
}

/// 创建报销集请求事件
class CreateReimbursementSetRequestEvent extends ReimbursementSetActionRequestEvent {
  final String setName;
  final String? description;
  final List<String> invoiceIds;
  final DateTime timestamp;
  
  const CreateReimbursementSetRequestEvent({
    required this.setName,
    this.description,
    required this.invoiceIds,
    required this.timestamp,
  });
  
  @override
  String toString() => 'CreateReimbursementSetRequestEvent(setName: $setName, invoices: ${invoiceIds.length})';
}

/// 删除报销集请求事件
class DeleteReimbursementSetRequestEvent extends ReimbursementSetActionRequestEvent {
  final String setId;
  final DateTime timestamp;
  
  const DeleteReimbursementSetRequestEvent({
    required this.setId,
    required this.timestamp,
  });
  
  @override
  String toString() => 'DeleteReimbursementSetRequestEvent(setId: $setId)';
}

/// 发票加入报销集请求事件
class AddInvoicesToSetRequestEvent extends ReimbursementSetActionRequestEvent {
  final String setId;
  final List<String> invoiceIds;
  final DateTime timestamp;
  
  const AddInvoicesToSetRequestEvent({
    required this.setId,
    required this.invoiceIds,
    required this.timestamp,
  });
  
  @override
  String toString() => 'AddInvoicesToSetRequestEvent(setId: $setId, invoices: ${invoiceIds.length})';
}

/// 发票移出报销集请求事件
class RemoveInvoicesFromSetRequestEvent extends ReimbursementSetActionRequestEvent {
  final List<String> invoiceIds;
  final DateTime timestamp;
  
  const RemoveInvoicesFromSetRequestEvent({
    required this.invoiceIds,
    required this.timestamp,
  });
  
  @override
  String toString() => 'RemoveInvoicesFromSetRequestEvent(invoices: ${invoiceIds.length})';
}

/// 发票操作请求事件基类
abstract class InvoiceActionRequestEvent extends UIActionRequestEvent {
  const InvoiceActionRequestEvent();
}

/// 发票删除请求事件
class DeleteInvoiceRequestEvent extends InvoiceActionRequestEvent {
  final String invoiceId;
  final DateTime timestamp;
  
  const DeleteInvoiceRequestEvent({
    required this.invoiceId,
    required this.timestamp,
  });
  
  @override
  String toString() => 'DeleteInvoiceRequestEvent(invoiceId: $invoiceId)';
}

/// 批量发票删除请求事件
class DeleteInvoicesRequestEvent extends InvoiceActionRequestEvent {
  final List<String> invoiceIds;
  final DateTime timestamp;
  
  const DeleteInvoicesRequestEvent({
    required this.invoiceIds,
    required this.timestamp,
  });
  
  @override
  String toString() => 'DeleteInvoicesRequestEvent(invoices: ${invoiceIds.length})';
}

/// 报销集更新请求事件
class UpdateReimbursementSetRequestEvent extends ReimbursementSetActionRequestEvent {
  final String setId;
  final String setName;
  final String? description;
  final DateTime timestamp;
  
  const UpdateReimbursementSetRequestEvent({
    required this.setId,
    required this.setName,
    this.description,
    required this.timestamp,
  });
  
  @override
  String toString() => 'UpdateReimbursementSetRequestEvent(setId: $setId, name: $setName)';
}

/// 报销集状态更新请求事件
class UpdateReimbursementSetStatusRequestEvent extends ReimbursementSetActionRequestEvent {
  final String setId;
  final ReimbursementSetStatus newStatus;
  final DateTime timestamp;
  
  const UpdateReimbursementSetStatusRequestEvent({
    required this.setId,
    required this.newStatus,
    required this.timestamp,
  });
  
  @override
  String toString() => 'UpdateReimbursementSetStatusRequestEvent(setId: $setId, status: $newStatus)';
}

/// 发票状态更新请求事件
class UpdateInvoiceStatusRequestEvent extends InvoiceActionRequestEvent {
  final String invoiceId;
  final InvoiceStatus newStatus;
  final DateTime timestamp;
  
  const UpdateInvoiceStatusRequestEvent({
    required this.invoiceId,
    required this.newStatus,
    required this.timestamp,
  });
  
  @override
  String toString() => 'UpdateInvoiceStatusRequestEvent(invoiceId: $invoiceId, status: $newStatus)';
}