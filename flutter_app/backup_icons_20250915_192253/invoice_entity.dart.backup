import 'package:equatable/equatable.dart';
import '../value_objects/invoice_status.dart';

/// 发票实体 - 纯业务模型，不依赖任何外部框架
class InvoiceEntity extends Equatable {
  final String id;
  final String invoiceNumber;
  final DateTime invoiceDate;
  final DateTime? consumptionDate;
  final String userId;

  // 基本信息
  final String? sellerName;
  final String? buyerName;
  final String? sellerTaxId;
  final String? buyerTaxId;

  // 金额信息
  final double amount;
  final double? totalAmount;
  final double? taxAmount;
  final String currency;

  // 分类和状态
  final String? category;
  final String? expenseCategory;
  final String? primaryCategoryName;
  final InvoiceStatus status;
  final String? invoiceType;
  final String? invoiceCode;
  
  // 报销集关联
  final String? reimbursementSetId;

  // 文件信息
  final String? fileUrl;
  final String? filePath;
  final String? fileHash;
  final int? fileSize;

  // 处理状态
  final String? processingStatus;
  final bool isVerified;
  final String? verificationNotes;
  final DateTime? verifiedAt;
  final String? verifiedBy;

  // 数据来源
  final InvoiceSource source;
  final Map<String, dynamic>? sourceMetadata;
  final String? emailTaskId;

  // 标签和元数据
  final List<String> tags;
  final Map<String, dynamic>? extractedData;
  final Map<String, dynamic>? metadata;

  // 时间戳
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? deletedAt;
  final DateTime? completedAt;
  final DateTime? startedAt;
  final DateTime? lastActivityAt;

  // 版本控制
  final int version;
  final String? createdBy;
  final String? updatedBy;

  const InvoiceEntity({
    required this.id,
    required this.invoiceNumber,
    required this.invoiceDate,
    this.consumptionDate,
    required this.userId,
    this.sellerName,
    this.buyerName,
    this.sellerTaxId,
    this.buyerTaxId,
    this.amount = 0.0,
    this.totalAmount,
    this.taxAmount,
    this.currency = 'CNY',
    this.category,
    this.expenseCategory,
    this.primaryCategoryName,
    this.status = InvoiceStatus.unsubmitted,
    this.invoiceType,
    this.invoiceCode,
    this.reimbursementSetId,
    this.fileUrl,
    this.filePath,
    this.fileHash,
    this.fileSize,
    this.processingStatus,
    this.isVerified = false,
    this.verificationNotes,
    this.verifiedAt,
    this.verifiedBy,
    this.source = InvoiceSource.manual,
    this.sourceMetadata,
    this.emailTaskId,
    this.tags = const [],
    this.extractedData,
    this.metadata,
    this.createdAt,
    this.updatedAt,
    this.deletedAt,
    this.completedAt,
    this.startedAt,
    this.lastActivityAt,
    this.version = 1,
    this.createdBy,
    this.updatedBy,
  });

  /// 业务逻辑：获取显示用的金额
  double get displayAmount => totalAmount ?? amount;

  /// 业务逻辑：获取格式化的金额字符串
  String get formattedAmount {
    final amount = displayAmount;
    if (currency == 'CNY') {
      return '¥${amount.toStringAsFixed(2)}';
    }
    return '$currency ${amount.toStringAsFixed(2)}';
  }

  /// 业务逻辑：获取格式化的日期字符串
  String get formattedDate {
    return '${invoiceDate.year}-${invoiceDate.month.toString().padLeft(2, '0')}-${invoiceDate.day.toString().padLeft(2, '0')}';
  }

  /// 业务逻辑：获取格式化的消费日期字符串
  String? get formattedConsumptionDate {
    if (consumptionDate == null) return null;
    return '${consumptionDate!.year}-${consumptionDate!.month.toString().padLeft(2, '0')}-${consumptionDate!.day.toString().padLeft(2, '0')}';
  }

  /// 业务逻辑：获取有效状态（考虑报销集约束）
  /// 核心原则：发票状态必须通过报销集来修改，独立发票永远是未提交状态
  InvoiceStatus get effectiveStatus {
    if (isInReimbursementSet) {
      // 如果在报销集中，使用实际存储的状态
      return status;
    } else {
      // 独立发票强制为未提交状态
      return InvoiceStatus.unsubmitted;
    }
  }

  /// 业务逻辑：原始状态（仅用于数据同步，不直接用于UI显示）
  InvoiceStatus get rawStatus => status;

  /// 业务逻辑：是否已报销（基于有效状态）
  bool get isReimbursed => effectiveStatus == InvoiceStatus.reimbursed;

  /// 业务逻辑：是否待报销（基于有效状态）
  bool get isUnreimbursed => effectiveStatus == InvoiceStatus.unsubmitted || effectiveStatus == InvoiceStatus.submitted;

  /// 业务逻辑：是否在报销集中
  bool get isInReimbursementSet => reimbursementSetId != null && reimbursementSetId!.isNotEmpty;

  /// 业务逻辑：是否可以独立修改状态（强制约束：不可以）
  bool get canChangeStatusIndependently => false;

  /// 业务逻辑：是否必须通过报销集修改状态
  bool get mustChangeStatusThroughReimbursementSet => isInReimbursementSet;

  /// 业务逻辑：是否可以加入报销集
  /// 只有未提交状态的独立发票才能加入报销集
  bool get canAddToReimbursementSet => !isInReimbursementSet && effectiveStatus == InvoiceStatus.unsubmitted;

  /// 业务逻辑：是否已删除
  bool get isDeleted => deletedAt != null;

  /// 业务逻辑：是否有附件
  bool get hasFile => fileUrl != null && fileUrl!.isNotEmpty;

  /// 业务逻辑：获取报销进度百分比（基于有效状态）
  double get progressPercent {
    switch (effectiveStatus) {
      case InvoiceStatus.unsubmitted:
        return 0.0;
      case InvoiceStatus.submitted:
        return 0.5;
      case InvoiceStatus.reimbursed:
        return 1.0;
    }
  }

  /// 业务逻辑：获取状态显示文本
  String get statusDisplayText {
    if (isInReimbursementSet) {
      return effectiveStatus.displayName;
    } else {
      // 独立发票显示其原始状态
      return rawStatus.displayName;
    }
  }

  /// 业务逻辑：获取状态描述文本
  String get statusDescription {
    if (isInReimbursementSet) {
      return effectiveStatus.description;
    } else {
      return '发票尚未加入任何报销集，需要通过报销集来进行状态管理';
    }
  }

  /// 复制实体并更新字段
  InvoiceEntity copyWith({
    String? id,
    String? invoiceNumber,
    DateTime? invoiceDate,
    DateTime? consumptionDate,
    String? userId,
    String? sellerName,
    String? buyerName,
    String? sellerTaxId,
    String? buyerTaxId,
    double? amount,
    double? totalAmount,
    double? taxAmount,
    String? currency,
    String? category,
    String? expenseCategory,
    String? primaryCategoryName,
    InvoiceStatus? status,
    String? invoiceType,
    String? invoiceCode,
    String? reimbursementSetId,
    String? fileUrl,
    String? filePath,
    String? fileHash,
    int? fileSize,
    String? processingStatus,
    bool? isVerified,
    String? verificationNotes,
    DateTime? verifiedAt,
    String? verifiedBy,
    InvoiceSource? source,
    Map<String, dynamic>? sourceMetadata,
    String? emailTaskId,
    List<String>? tags,
    Map<String, dynamic>? extractedData,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? deletedAt,
    DateTime? completedAt,
    DateTime? startedAt,
    DateTime? lastActivityAt,
    int? version,
    String? createdBy,
    String? updatedBy,
  }) {
    return InvoiceEntity(
      id: id ?? this.id,
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      invoiceDate: invoiceDate ?? this.invoiceDate,
      consumptionDate: consumptionDate ?? this.consumptionDate,
      userId: userId ?? this.userId,
      sellerName: sellerName ?? this.sellerName,
      buyerName: buyerName ?? this.buyerName,
      sellerTaxId: sellerTaxId ?? this.sellerTaxId,
      buyerTaxId: buyerTaxId ?? this.buyerTaxId,
      amount: amount ?? this.amount,
      totalAmount: totalAmount ?? this.totalAmount,
      taxAmount: taxAmount ?? this.taxAmount,
      currency: currency ?? this.currency,
      category: category ?? this.category,
      expenseCategory: expenseCategory ?? this.expenseCategory,
      primaryCategoryName: primaryCategoryName ?? this.primaryCategoryName,
      status: status ?? this.status,
      invoiceType: invoiceType ?? this.invoiceType,
      invoiceCode: invoiceCode ?? this.invoiceCode,
      reimbursementSetId: reimbursementSetId ?? this.reimbursementSetId,
      fileUrl: fileUrl ?? this.fileUrl,
      filePath: filePath ?? this.filePath,
      fileHash: fileHash ?? this.fileHash,
      fileSize: fileSize ?? this.fileSize,
      processingStatus: processingStatus ?? this.processingStatus,
      isVerified: isVerified ?? this.isVerified,
      verificationNotes: verificationNotes ?? this.verificationNotes,
      verifiedAt: verifiedAt ?? this.verifiedAt,
      verifiedBy: verifiedBy ?? this.verifiedBy,
      source: source ?? this.source,
      sourceMetadata: sourceMetadata ?? this.sourceMetadata,
      emailTaskId: emailTaskId ?? this.emailTaskId,
      tags: tags ?? this.tags,
      extractedData: extractedData ?? this.extractedData,
      metadata: metadata ?? this.metadata,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      completedAt: completedAt ?? this.completedAt,
      startedAt: startedAt ?? this.startedAt,
      lastActivityAt: lastActivityAt ?? this.lastActivityAt,
      version: version ?? this.version,
      createdBy: createdBy ?? this.createdBy,
      updatedBy: updatedBy ?? this.updatedBy,
    );
  }

  @override
  List<Object?> get props => [
        id,
        invoiceNumber,
        invoiceDate,
        consumptionDate,
        userId,
        sellerName,
        buyerName,
        sellerTaxId,
        buyerTaxId,
        amount,
        totalAmount,
        taxAmount,
        currency,
        category,
        expenseCategory,
        primaryCategoryName,
        status, // 重要：包含status字段用于比较
        invoiceType,
        invoiceCode,
        reimbursementSetId,
        fileUrl,
        filePath,
        fileHash,
        fileSize,
        processingStatus,
        isVerified,
        verificationNotes,
        verifiedAt,
        verifiedBy,
        source,
        sourceMetadata,
        emailTaskId,
        tags,
        extractedData,
        metadata,
        createdAt,
        updatedAt,
        deletedAt,
        completedAt,
        startedAt,
        lastActivityAt,
        version,
        createdBy,
        updatedBy,
      ];
}

/// 发票来源枚举
enum InvoiceSource {
  upload('上传'),
  manual('手动上传'),
  email('邮件导入'),
  scanner('扫描识别'),
  api('API导入'),
  batch('批量导入');

  const InvoiceSource(this.displayName);
  final String displayName;
}
