// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'reimbursement_set_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ReimbursementSetModelImpl _$$ReimbursementSetModelImplFromJson(
        Map<String, dynamic> json) =>
    _$ReimbursementSetModelImpl(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      setName: json['set_name'] as String,
      description: json['description'] as String?,
      status: json['status'] as String,
      submittedAt: json['submitted_at'] == null
          ? null
          : DateTime.parse(json['submitted_at'] as String),
      reimbursedAt: json['reimbursed_at'] == null
          ? null
          : DateTime.parse(json['reimbursed_at'] as String),
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      invoiceCount: (json['invoice_count'] as num?)?.toInt() ?? 0,
      approverId: json['approver_id'] as String?,
      approvalNotes: json['approval_notes'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      userEmail: json['user_email'] as String?,
      approverEmail: json['approver_email'] as String?,
      earliestInvoiceDate: json['earliest_invoice_date'] == null
          ? null
          : DateTime.parse(json['earliest_invoice_date'] as String),
      latestInvoiceDate: json['latest_invoice_date'] == null
          ? null
          : DateTime.parse(json['latest_invoice_date'] as String),
      regionCount: (json['region_count'] as num?)?.toInt(),
      categoryCount: (json['category_count'] as num?)?.toInt(),
    );

Map<String, dynamic> _$$ReimbursementSetModelImplToJson(
        _$ReimbursementSetModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'user_id': instance.userId,
      'set_name': instance.setName,
      'description': instance.description,
      'status': instance.status,
      'submitted_at': instance.submittedAt?.toIso8601String(),
      'reimbursed_at': instance.reimbursedAt?.toIso8601String(),
      'total_amount': instance.totalAmount,
      'invoice_count': instance.invoiceCount,
      'approver_id': instance.approverId,
      'approval_notes': instance.approvalNotes,
      'created_at': instance.createdAt.toIso8601String(),
      'updated_at': instance.updatedAt.toIso8601String(),
      'user_email': instance.userEmail,
      'approver_email': instance.approverEmail,
      'earliest_invoice_date': instance.earliestInvoiceDate?.toIso8601String(),
      'latest_invoice_date': instance.latestInvoiceDate?.toIso8601String(),
      'region_count': instance.regionCount,
      'category_count': instance.categoryCount,
    };

_$CreateReimbursementSetRequestImpl
    _$$CreateReimbursementSetRequestImplFromJson(Map<String, dynamic> json) =>
        _$CreateReimbursementSetRequestImpl(
          setName: json['set_name'] as String,
          description: json['description'] as String?,
          invoiceIds: (json['invoice_ids'] as List<dynamic>)
              .map((e) => e as String)
              .toList(),
        );

Map<String, dynamic> _$$CreateReimbursementSetRequestImplToJson(
        _$CreateReimbursementSetRequestImpl instance) =>
    <String, dynamic>{
      'set_name': instance.setName,
      'description': instance.description,
      'invoice_ids': instance.invoiceIds,
    };

_$UpdateReimbursementSetStatusRequestImpl
    _$$UpdateReimbursementSetStatusRequestImplFromJson(
            Map<String, dynamic> json) =>
        _$UpdateReimbursementSetStatusRequestImpl(
          status: json['status'] as String,
          approvalNotes: json['approval_notes'] as String?,
        );

Map<String, dynamic> _$$UpdateReimbursementSetStatusRequestImplToJson(
        _$UpdateReimbursementSetStatusRequestImpl instance) =>
    <String, dynamic>{
      'status': instance.status,
      'approval_notes': instance.approvalNotes,
    };
