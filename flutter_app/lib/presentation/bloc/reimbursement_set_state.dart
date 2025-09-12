import 'package:equatable/equatable.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/repositories/reimbursement_set_repository.dart';

/// 报销集状态基类
abstract class ReimbursementSetState extends Equatable {
  const ReimbursementSetState();

  @override
  List<Object?> get props => [];
}

/// 初始状态
class ReimbursementSetInitial extends ReimbursementSetState {
  const ReimbursementSetInitial();
}

/// 加载中状态
class ReimbursementSetLoading extends ReimbursementSetState {
  const ReimbursementSetLoading();
}

/// 报销集列表加载成功
class ReimbursementSetLoaded extends ReimbursementSetState {
  final List<ReimbursementSetEntity> reimbursementSets;
  final bool isRefreshing;

  const ReimbursementSetLoaded({
    required this.reimbursementSets,
    this.isRefreshing = false,
  });

  @override
  List<Object?> get props => [reimbursementSets, isRefreshing];

  /// 复制状态并修改字段
  ReimbursementSetLoaded copyWith({
    List<ReimbursementSetEntity>? reimbursementSets,
    bool? isRefreshing,
  }) {
    return ReimbursementSetLoaded(
      reimbursementSets: reimbursementSets ?? this.reimbursementSets,
      isRefreshing: isRefreshing ?? this.isRefreshing,
    );
  }
}

/// 报销集详情加载成功
class ReimbursementSetDetailLoaded extends ReimbursementSetState {
  final ReimbursementSetEntity reimbursementSet;
  final List<InvoiceEntity> invoices;

  const ReimbursementSetDetailLoaded({
    required this.reimbursementSet,
    required this.invoices,
  });

  @override
  List<Object?> get props => [reimbursementSet, invoices];
}

/// 未分配发票加载成功
class UnassignedInvoicesLoaded extends ReimbursementSetState {
  final List<InvoiceEntity> unassignedInvoices;

  const UnassignedInvoicesLoaded(this.unassignedInvoices);

  @override
  List<Object?> get props => [unassignedInvoices];
}

/// 报销集统计信息加载成功
class ReimbursementSetStatsLoaded extends ReimbursementSetState {
  final ReimbursementSetStats stats;

  const ReimbursementSetStatsLoaded(this.stats);

  @override
  List<Object?> get props => [stats];
}

/// 操作成功状态
class ReimbursementSetOperationSuccess extends ReimbursementSetState {
  final String message;
  final ReimbursementSetOperationType operationType;
  final String? entityId; // 可以是报销集ID或其他相关ID

  const ReimbursementSetOperationSuccess({
    required this.message,
    required this.operationType,
    this.entityId,
  });

  @override
  List<Object?> get props => [message, operationType, entityId];
}

/// 操作失败状态
class ReimbursementSetError extends ReimbursementSetState {
  final String message;
  final ReimbursementSetOperationType? operationType;

  const ReimbursementSetError({
    required this.message,
    this.operationType,
  });

  @override
  List<Object?> get props => [message, operationType];
}

/// 创建报销集成功
class ReimbursementSetCreateSuccess extends ReimbursementSetState {
  final ReimbursementSetEntity createdSet;
  final String message;

  const ReimbursementSetCreateSuccess({
    required this.createdSet,
    required this.message,
  });

  @override
  List<Object?> get props => [createdSet, message];
}

/// 删除报销集成功
class ReimbursementSetDeleteSuccess extends ReimbursementSetState {
  final String message;
  final String deletedSetId;

  const ReimbursementSetDeleteSuccess({
    required this.message,
    required this.deletedSetId,
  });

  @override
  List<Object?> get props => [message, deletedSetId];
}

/// 状态更新成功
class ReimbursementSetStatusUpdateSuccess extends ReimbursementSetState {
  final ReimbursementSetEntity updatedSet;
  final String message;

  const ReimbursementSetStatusUpdateSuccess({
    required this.updatedSet,
    required this.message,
  });

  @override
  List<Object?> get props => [updatedSet, message];
}

/// 报销集操作类型枚举
enum ReimbursementSetOperationType {
  create,
  update,
  delete,
  statusUpdate,
  addInvoices,
  removeInvoices,
  load,
  refresh,
}

/// 扩展操作类型以获得用户友好的描述
extension ReimbursementSetOperationTypeExtension
    on ReimbursementSetOperationType {
  String get description {
    switch (this) {
      case ReimbursementSetOperationType.create:
        return '创建报销集';
      case ReimbursementSetOperationType.update:
        return '更新报销集';
      case ReimbursementSetOperationType.delete:
        return '删除报销集';
      case ReimbursementSetOperationType.statusUpdate:
        return '更新状态';
      case ReimbursementSetOperationType.addInvoices:
        return '添加发票';
      case ReimbursementSetOperationType.removeInvoices:
        return '移除发票';
      case ReimbursementSetOperationType.load:
        return '加载数据';
      case ReimbursementSetOperationType.refresh:
        return '刷新数据';
    }
  }
}
