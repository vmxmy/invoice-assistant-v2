import 'package:equatable/equatable.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/repositories/invoice_repository.dart';
import '../../domain/value_objects/invoice_status.dart';

/// 发票事件基类
abstract class InvoiceEvent extends Equatable {
  const InvoiceEvent();

  @override
  List<Object?> get props => [];
}

/// 加载发票列表事件
class LoadInvoices extends InvoiceEvent {
  final int page;
  final int pageSize;
  final InvoiceFilters? filters;
  final String sortField;
  final bool sortAscending;
  final bool refresh; // 是否刷新数据

  const LoadInvoices({
    this.page = 1,
    this.pageSize = 20, // 设置为20以测试无限滚动
    this.filters,
    this.sortField = 'created_at',
    this.sortAscending = false,
    this.refresh = false,
  });

  @override
  List<Object?> get props => [page, pageSize, filters, sortField, sortAscending, refresh];
}

/// 加载更多发票事件
class LoadMoreInvoices extends InvoiceEvent {
  const LoadMoreInvoices();
}

/// 刷新发票列表事件
class RefreshInvoices extends InvoiceEvent {
  const RefreshInvoices();
}

/// 删除发票事件
class DeleteInvoice extends InvoiceEvent {
  final String invoiceId;

  const DeleteInvoice(this.invoiceId);

  @override
  List<Object> get props => [invoiceId];
}

/// 批量删除发票事件
class DeleteInvoices extends InvoiceEvent {
  final List<String> invoiceIds;

  const DeleteInvoices(this.invoiceIds);

  @override
  List<Object> get props => [invoiceIds];
}

/// 加载发票统计事件
class LoadInvoiceStats extends InvoiceEvent {
  const LoadInvoiceStats();
}

/// 加载发票详情事件
class LoadInvoiceDetail extends InvoiceEvent {
  final String invoiceId;

  const LoadInvoiceDetail(this.invoiceId);

  @override
  List<Object> get props => [invoiceId];
}

/// 更新发票状态事件
class UpdateInvoiceStatus extends InvoiceEvent {
  final String invoiceId;
  final InvoiceStatus newStatus;

  const UpdateInvoiceStatus({
    required this.invoiceId,
    required this.newStatus,
  });

  @override
  List<Object> get props => [invoiceId, newStatus];
}