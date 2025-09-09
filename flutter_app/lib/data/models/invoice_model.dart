import 'package:freezed_annotation/freezed_annotation.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';

part 'invoice_model.freezed.dart';
part 'invoice_model.g.dart';

/// 发票数据模型 - 负责与外部API/数据库交互的序列化
@freezed
class InvoiceModel with _$InvoiceModel {
  const factory InvoiceModel({
    required String id,
    @JsonKey(name: 'invoice_number') required String invoiceNumber,
    @JsonKey(name: 'invoice_date') required DateTime invoiceDate,
    @JsonKey(name: 'consumption_date') DateTime? consumptionDate,
    @JsonKey(name: 'user_id') required String userId,
    
    // 基本信息
    @JsonKey(name: 'seller_name') String? sellerName,
    @JsonKey(name: 'buyer_name') String? buyerName,
    @JsonKey(name: 'seller_tax_number') String? sellerTaxId,
    @JsonKey(name: 'buyer_tax_number') String? buyerTaxId,
    
    // 金额信息
    @Default(0.0) @JsonKey(name: 'amount_without_tax') double amount,
    @JsonKey(name: 'total_amount') double? totalAmount,
    @JsonKey(name: 'tax_amount') double? taxAmount,
    @Default('CNY') String currency,
    
    // 分类和状态
    String? category,
    @Default(InvoiceStatus.unreimbursed) InvoiceStatus status,
    @JsonKey(name: 'invoice_type') String? invoiceType,
    @JsonKey(name: 'invoice_code') String? invoiceCode,
    
    // 文件信息
    @JsonKey(name: 'file_url') String? fileUrl,
    @JsonKey(name: 'file_path') String? filePath,
    @JsonKey(name: 'file_hash') String? fileHash,
    @JsonKey(name: 'file_size') int? fileSize,
    
    // 处理状态
    @JsonKey(name: 'processing_status') String? processingStatus,
    @Default(false) @JsonKey(name: 'is_verified') bool isVerified,
    @JsonKey(name: 'verification_notes') String? verificationNotes,
    @JsonKey(name: 'verified_at') DateTime? verifiedAt,
    @JsonKey(name: 'verified_by') String? verifiedBy,
    
    // 数据来源
    @Default(InvoiceSource.upload) InvoiceSource source,
    @JsonKey(name: 'source_metadata') Map<String, dynamic>? sourceMetadata,
    @JsonKey(name: 'email_task_id') String? emailTaskId,
    
    // 标签和元数据
    @Default([]) List<String> tags,
    @JsonKey(name: 'extracted_data') Map<String, dynamic>? extractedData,
    Map<String, dynamic>? metadata,
    
    // 时间戳
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
    @JsonKey(name: 'deleted_at') DateTime? deletedAt,
    @JsonKey(name: 'completed_at') DateTime? completedAt,
    @JsonKey(name: 'started_at') DateTime? startedAt,
    @JsonKey(name: 'last_activity_at') DateTime? lastActivityAt,
    
    // 版本控制
    @Default(1) int version,
    @JsonKey(name: 'created_by') String? createdBy,
    @JsonKey(name: 'updated_by') String? updatedBy,
  }) = _InvoiceModel;

  factory InvoiceModel.fromJson(Map<String, dynamic> json) => _$InvoiceModelFromJson(json);
}

/// 扩展方法 - 将数据模型转换为领域实体
extension InvoiceModelToEntity on InvoiceModel {
  InvoiceEntity toEntity() {
    return InvoiceEntity(
      id: id,
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      consumptionDate: consumptionDate,
      userId: userId,
      sellerName: sellerName,
      buyerName: buyerName,
      sellerTaxId: sellerTaxId,
      buyerTaxId: buyerTaxId,
      amount: amount,
      totalAmount: totalAmount,
      taxAmount: taxAmount,
      currency: currency,
      category: category,
      status: status,
      invoiceType: invoiceType,
      invoiceCode: invoiceCode,
      fileUrl: fileUrl,
      filePath: filePath,
      fileHash: fileHash,
      fileSize: fileSize,
      processingStatus: processingStatus,
      isVerified: isVerified,
      verificationNotes: verificationNotes,
      verifiedAt: verifiedAt,
      verifiedBy: verifiedBy,
      source: source,
      sourceMetadata: sourceMetadata ?? {},
      emailTaskId: emailTaskId,
      tags: tags,
      extractedData: extractedData ?? {},
      metadata: metadata ?? {},
      createdAt: createdAt,
      updatedAt: updatedAt,
      deletedAt: deletedAt,
      completedAt: completedAt,
      startedAt: startedAt,
      lastActivityAt: lastActivityAt,
      version: version,
      createdBy: createdBy,
      updatedBy: updatedBy,
    );
  }
}

/// 扩展方法 - 将领域实体转换为数据模型
extension InvoiceEntityToModel on InvoiceEntity {
  InvoiceModel toModel() {
    return InvoiceModel(
      id: id,
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      consumptionDate: consumptionDate,
      userId: userId,
      sellerName: sellerName,
      buyerName: buyerName,
      sellerTaxId: sellerTaxId,
      buyerTaxId: buyerTaxId,
      amount: amount,
      totalAmount: totalAmount,
      taxAmount: taxAmount,
      currency: currency,
      category: category,
      status: status,
      invoiceType: invoiceType,
      invoiceCode: invoiceCode,
      fileUrl: fileUrl,
      filePath: filePath,
      fileHash: fileHash,
      fileSize: fileSize,
      processingStatus: processingStatus,
      isVerified: isVerified,
      verificationNotes: verificationNotes,
      verifiedAt: verifiedAt,
      verifiedBy: verifiedBy,
      source: source,
      sourceMetadata: sourceMetadata,
      emailTaskId: emailTaskId,
      tags: tags,
      extractedData: extractedData,
      metadata: metadata,
      createdAt: createdAt,
      updatedAt: updatedAt,
      deletedAt: deletedAt,
      completedAt: completedAt,
      startedAt: startedAt,
      lastActivityAt: lastActivityAt,
      version: version,
      createdBy: createdBy,
      updatedBy: updatedBy,
    );
  }
}