// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'invoice_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$InvoiceModelImpl _$$InvoiceModelImplFromJson(Map<String, dynamic> json) =>
    _$InvoiceModelImpl(
      id: json['id'] as String,
      invoiceNumber: json['invoice_number'] as String,
      invoiceDate: DateTime.parse(json['invoice_date'] as String),
      consumptionDate: json['consumption_date'] == null
          ? null
          : DateTime.parse(json['consumption_date'] as String),
      userId: json['user_id'] as String,
      sellerName: json['seller_name'] as String?,
      buyerName: json['buyer_name'] as String?,
      sellerTaxId: json['seller_tax_number'] as String?,
      buyerTaxId: json['buyer_tax_number'] as String?,
      amount: (json['amount_without_tax'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['total_amount'] as num?)?.toDouble(),
      taxAmount: (json['tax_amount'] as num?)?.toDouble(),
      currency: json['currency'] as String? ?? 'CNY',
      category: json['category'] as String?,
      expenseCategory: json['expense_category'] as String?,
      primaryCategoryName: json['primary_category_name'] as String?,
      status: $enumDecodeNullable(_$InvoiceStatusEnumMap, json['status']) ??
          InvoiceStatus.unsubmitted,
      invoiceType: json['invoice_type'] as String?,
      invoiceCode: json['invoice_code'] as String?,
      fileUrl: json['file_url'] as String?,
      filePath: json['file_path'] as String?,
      fileHash: json['file_hash'] as String?,
      fileSize: (json['file_size'] as num?)?.toInt(),
      processingStatus: json['processing_status'] as String?,
      isVerified: json['is_verified'] as bool? ?? false,
      verificationNotes: json['verification_notes'] as String?,
      verifiedAt: json['verified_at'] == null
          ? null
          : DateTime.parse(json['verified_at'] as String),
      verifiedBy: json['verified_by'] as String?,
      source: $enumDecodeNullable(_$InvoiceSourceEnumMap, json['source']) ??
          InvoiceSource.upload,
      sourceMetadata: json['source_metadata'] as Map<String, dynamic>?,
      emailTaskId: json['email_task_id'] as String?,
      tags:
          (json['tags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
              const [],
      extractedData: json['extracted_data'] as Map<String, dynamic>?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
      deletedAt: json['deleted_at'] == null
          ? null
          : DateTime.parse(json['deleted_at'] as String),
      completedAt: json['completed_at'] == null
          ? null
          : DateTime.parse(json['completed_at'] as String),
      startedAt: json['started_at'] == null
          ? null
          : DateTime.parse(json['started_at'] as String),
      lastActivityAt: json['last_activity_at'] == null
          ? null
          : DateTime.parse(json['last_activity_at'] as String),
      version: (json['version'] as num?)?.toInt() ?? 1,
      createdBy: json['created_by'] as String?,
      updatedBy: json['updated_by'] as String?,
    );

Map<String, dynamic> _$$InvoiceModelImplToJson(_$InvoiceModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'invoice_number': instance.invoiceNumber,
      'invoice_date': instance.invoiceDate.toIso8601String(),
      'consumption_date': instance.consumptionDate?.toIso8601String(),
      'user_id': instance.userId,
      'seller_name': instance.sellerName,
      'buyer_name': instance.buyerName,
      'seller_tax_number': instance.sellerTaxId,
      'buyer_tax_number': instance.buyerTaxId,
      'amount_without_tax': instance.amount,
      'total_amount': instance.totalAmount,
      'tax_amount': instance.taxAmount,
      'currency': instance.currency,
      'category': instance.category,
      'expense_category': instance.expenseCategory,
      'primary_category_name': instance.primaryCategoryName,
      'status': _$InvoiceStatusEnumMap[instance.status]!,
      'invoice_type': instance.invoiceType,
      'invoice_code': instance.invoiceCode,
      'file_url': instance.fileUrl,
      'file_path': instance.filePath,
      'file_hash': instance.fileHash,
      'file_size': instance.fileSize,
      'processing_status': instance.processingStatus,
      'is_verified': instance.isVerified,
      'verification_notes': instance.verificationNotes,
      'verified_at': instance.verifiedAt?.toIso8601String(),
      'verified_by': instance.verifiedBy,
      'source': _$InvoiceSourceEnumMap[instance.source]!,
      'source_metadata': instance.sourceMetadata,
      'email_task_id': instance.emailTaskId,
      'tags': instance.tags,
      'extracted_data': instance.extractedData,
      'metadata': instance.metadata,
      'created_at': instance.createdAt?.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
      'deleted_at': instance.deletedAt?.toIso8601String(),
      'completed_at': instance.completedAt?.toIso8601String(),
      'started_at': instance.startedAt?.toIso8601String(),
      'last_activity_at': instance.lastActivityAt?.toIso8601String(),
      'version': instance.version,
      'created_by': instance.createdBy,
      'updated_by': instance.updatedBy,
    };

const _$InvoiceStatusEnumMap = {
  InvoiceStatus.unsubmitted: 'unsubmitted',
  InvoiceStatus.submitted: 'submitted',
  InvoiceStatus.reimbursed: 'reimbursed',
};

const _$InvoiceSourceEnumMap = {
  InvoiceSource.upload: 'upload',
  InvoiceSource.manual: 'manual',
  InvoiceSource.email: 'email',
  InvoiceSource.scanner: 'scanner',
  InvoiceSource.api: 'api',
  InvoiceSource.batch: 'batch',
};
