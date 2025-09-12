import 'package:freezed_annotation/freezed_annotation.dart';
import '../../domain/entities/reimbursement_set_entity.dart';

part 'reimbursement_set_model.freezed.dart';
part 'reimbursement_set_model.g.dart';

@freezed
class ReimbursementSetModel with _$ReimbursementSetModel {
  const ReimbursementSetModel._();

  const factory ReimbursementSetModel({
    required String id,
    @JsonKey(name: 'user_id') required String userId,
    @JsonKey(name: 'set_name') required String setName,
    String? description,
    required String status,
    @JsonKey(name: 'submitted_at') DateTime? submittedAt,
    @JsonKey(name: 'reimbursed_at') DateTime? reimbursedAt,
    @JsonKey(name: 'total_amount') @Default(0.0) double totalAmount,
    @JsonKey(name: 'invoice_count') @Default(0) int invoiceCount,
    @JsonKey(name: 'approver_id') String? approverId,
    @JsonKey(name: 'approval_notes') String? approvalNotes,
    @JsonKey(name: 'created_at') required DateTime createdAt,
    @JsonKey(name: 'updated_at') required DateTime updatedAt,
    // 扩展字段（来自视图查询）
    @JsonKey(name: 'user_email') String? userEmail,
    @JsonKey(name: 'approver_email') String? approverEmail,
    @JsonKey(name: 'earliest_invoice_date') DateTime? earliestInvoiceDate,
    @JsonKey(name: 'latest_invoice_date') DateTime? latestInvoiceDate,
    @JsonKey(name: 'region_count') int? regionCount,
    @JsonKey(name: 'category_count') int? categoryCount,
  }) = _ReimbursementSetModel;

  factory ReimbursementSetModel.fromJson(Map<String, dynamic> json) =>
      _$ReimbursementSetModelFromJson(json);

  /// 转换为实体对象
  ReimbursementSetEntity toEntity() {
    return ReimbursementSetEntity(
      id: id,
      userId: userId,
      setName: setName,
      description: description,
      status: ReimbursementSetStatus.fromString(status),
      submittedAt: submittedAt,
      reimbursedAt: reimbursedAt,
      totalAmount: totalAmount,
      invoiceCount: invoiceCount,
      approverId: approverId,
      approvalNotes: approvalNotes,
      createdAt: createdAt,
      updatedAt: updatedAt,
      userEmail: userEmail,
      approverEmail: approverEmail,
      earliestInvoiceDate: earliestInvoiceDate,
      latestInvoiceDate: latestInvoiceDate,
      regionCount: regionCount,
      categoryCount: categoryCount,
    );
  }

  /// 从实体对象创建模型
  static ReimbursementSetModel fromEntity(ReimbursementSetEntity entity) {
    return ReimbursementSetModel(
      id: entity.id,
      userId: entity.userId,
      setName: entity.setName,
      description: entity.description,
      status: entity.status.value,
      submittedAt: entity.submittedAt,
      reimbursedAt: entity.reimbursedAt,
      totalAmount: entity.totalAmount,
      invoiceCount: entity.invoiceCount,
      approverId: entity.approverId,
      approvalNotes: entity.approvalNotes,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      userEmail: entity.userEmail,
      approverEmail: entity.approverEmail,
      earliestInvoiceDate: entity.earliestInvoiceDate,
      latestInvoiceDate: entity.latestInvoiceDate,
      regionCount: entity.regionCount,
      categoryCount: entity.categoryCount,
    );
  }

  /// 用于创建新报销集的工厂构造函数
  factory ReimbursementSetModel.create({
    required String userId,
    required String setName,
    String? description,
  }) {
    final now = DateTime.now();
    return ReimbursementSetModel(
      id: '', // 将由数据库生成
      userId: userId,
      setName: setName,
      description: description,
      status: 'unsubmitted',
      createdAt: now,
      updatedAt: now,
    );
  }
}

/// 创建报销集的请求模型
@freezed
class CreateReimbursementSetRequest with _$CreateReimbursementSetRequest {
  const factory CreateReimbursementSetRequest({
    @JsonKey(name: 'set_name') required String setName,
    String? description,
    @JsonKey(name: 'invoice_ids') required List<String> invoiceIds,
  }) = _CreateReimbursementSetRequest;

  factory CreateReimbursementSetRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateReimbursementSetRequestFromJson(json);
}

/// 更新报销集状态的请求模型
@freezed
class UpdateReimbursementSetStatusRequest
    with _$UpdateReimbursementSetStatusRequest {
  const factory UpdateReimbursementSetStatusRequest({
    required String status,
    @JsonKey(name: 'approval_notes') String? approvalNotes,
  }) = _UpdateReimbursementSetStatusRequest;

  factory UpdateReimbursementSetStatusRequest.fromJson(
          Map<String, dynamic> json) =>
      _$UpdateReimbursementSetStatusRequestFromJson(json);
}
