import '../../../core/utils/dynamic_enum_manager.dart';

/// 动态发票实体 - 使用字符串而非硬编码枚举
class DynamicInvoiceEntity {
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

  // 分类和状态 - 使用字符串而非枚举
  final String? category;
  final String status; // 动态状态
  final String? invoiceType;
  final String? invoiceCode;

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

  // 数据来源 - 使用字符串而非枚举
  final String source; // 动态来源
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

  const DynamicInvoiceEntity({
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
    this.status = 'unsubmitted', // 默认待报销
    this.invoiceType,
    this.invoiceCode,
    this.fileUrl,
    this.filePath,
    this.fileHash,
    this.fileSize,
    this.processingStatus,
    this.isVerified = false,
    this.verificationNotes,
    this.verifiedAt,
    this.verifiedBy,
    this.source = 'upload', // 默认上传
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

  /// 业务逻辑：是否已报销
  bool get isReimbursed => status == 'reimbursed';

  /// 业务逻辑：是否待报销
  bool get isUnreimbursed => status == 'unsubmitted';

  /// 业务逻辑：是否已删除
  bool get isDeleted => deletedAt != null;

  /// 业务逻辑：是否有附件
  bool get hasFile => fileUrl != null && fileUrl!.isNotEmpty;

  /// 业务逻辑：获取报销进度百分比
  double get progressPercent {
    return isReimbursed ? 1.0 : 0.0;
  }

  /// 动态获取状态显示名称
  String get statusDisplayName {
    return DynamicEnumManager.instance
        .getDisplayNameByValue('invoice_status', status);
  }

  /// 动态获取来源显示名称
  String get sourceDisplayName {
    return DynamicEnumManager.instance
        .getDisplayNameByValue('invoice_source', source);
  }

  /// 复制实体并更新字段
  DynamicInvoiceEntity copyWith({
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
    String? status,
    String? invoiceType,
    String? invoiceCode,
    String? fileUrl,
    String? filePath,
    String? fileHash,
    int? fileSize,
    String? processingStatus,
    bool? isVerified,
    String? verificationNotes,
    DateTime? verifiedAt,
    String? verifiedBy,
    String? source,
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
    return DynamicInvoiceEntity(
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
      status: status ?? this.status,
      invoiceType: invoiceType ?? this.invoiceType,
      invoiceCode: invoiceCode ?? this.invoiceCode,
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
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is DynamicInvoiceEntity && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}
