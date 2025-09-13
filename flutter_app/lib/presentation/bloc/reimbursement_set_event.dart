import 'package:equatable/equatable.dart';
import '../../domain/entities/reimbursement_set_entity.dart';

/// 报销集事件基类
abstract class ReimbursementSetEvent extends Equatable {
  const ReimbursementSetEvent();

  @override
  List<Object?> get props => [];
}

/// 加载报销集列表
class LoadReimbursementSets extends ReimbursementSetEvent {
  final bool refresh;

  const LoadReimbursementSets({this.refresh = false});

  @override
  List<Object?> get props => [refresh];
}

/// 创建新的报销集
class CreateReimbursementSet extends ReimbursementSetEvent {
  final String setName;
  final String? description;
  final List<String> invoiceIds;

  const CreateReimbursementSet({
    required this.setName,
    this.description,
    required this.invoiceIds,
  });

  @override
  List<Object?> get props => [setName, description, invoiceIds];
}

/// 更新报销集信息
class UpdateReimbursementSet extends ReimbursementSetEvent {
  final String setId;
  final String? setName;
  final String? description;

  const UpdateReimbursementSet({
    required this.setId,
    this.setName,
    this.description,
  });

  @override
  List<Object?> get props => [setId, setName, description];
}

/// 更新报销集状态
class UpdateReimbursementSetStatus extends ReimbursementSetEvent {
  final String setId;
  final ReimbursementSetStatus status;
  final String? approvalNotes;

  const UpdateReimbursementSetStatus({
    required this.setId,
    required this.status,
    this.approvalNotes,
  });

  @override
  List<Object?> get props => [setId, status, approvalNotes];
}

/// 删除报销集
class DeleteReimbursementSet extends ReimbursementSetEvent {
  final String setId;

  const DeleteReimbursementSet(this.setId);

  @override
  List<Object?> get props => [setId];
}

/// 向报销集添加发票
class AddInvoicesToReimbursementSet extends ReimbursementSetEvent {
  final String setId;
  final List<String> invoiceIds;

  const AddInvoicesToReimbursementSet({
    required this.setId,
    required this.invoiceIds,
  });

  @override
  List<Object?> get props => [setId, invoiceIds];
}

/// 从报销集移除发票
class RemoveInvoicesFromReimbursementSet extends ReimbursementSetEvent {
  final List<String> invoiceIds;

  const RemoveInvoicesFromReimbursementSet(this.invoiceIds);

  @override
  List<Object?> get props => [invoiceIds];
}

/// 获取报销集详情
class LoadReimbursementSetDetail extends ReimbursementSetEvent {
  final String setId;

  const LoadReimbursementSetDetail(this.setId);

  @override
  List<Object?> get props => [setId];
}

/// 获取报销集中的发票列表
class LoadReimbursementSetInvoices extends ReimbursementSetEvent {
  final String setId;

  const LoadReimbursementSetInvoices(this.setId);

  @override
  List<Object?> get props => [setId];
}

/// 获取未分配的发票
class LoadUnassignedInvoices extends ReimbursementSetEvent {
  final int? limit;
  final int? offset;

  const LoadUnassignedInvoices({this.limit, this.offset});

  @override
  List<Object?> get props => [limit, offset];
}

/// 获取报销集统计信息
class LoadReimbursementSetStats extends ReimbursementSetEvent {
  const LoadReimbursementSetStats();
}

/// 刷新所有报销集数据
class RefreshReimbursementSets extends ReimbursementSetEvent {
  const RefreshReimbursementSets();
}

/// 清除报销集数据事件（用于用户登出/切换）
class ClearReimbursementSets extends ReimbursementSetEvent {
  const ClearReimbursementSets();
}
