/// 发票数据传输对象
class InvoiceDto {
  final String id;
  final String? invoiceNumber;
  final String? sellerName;
  final double? totalAmount;
  final DateTime invoiceDate;
  final DateTime? consumptionDate;
  final String status;
  final String? category;
  final String? notes;
  final String? imageUrl;
  final String? ocrResult;
  final bool isVerified;
  final DateTime createdAt;
  final DateTime updatedAt;

  const InvoiceDto({
    required this.id,
    this.invoiceNumber,
    this.sellerName,
    this.totalAmount,
    required this.invoiceDate,
    this.consumptionDate,
    required this.status,
    this.category,
    this.notes,
    this.imageUrl,
    this.ocrResult,
    required this.isVerified,
    required this.createdAt,
    required this.updatedAt,
  });

  /// 从JSON创建DTO
  factory InvoiceDto.fromJson(Map<String, dynamic> json) {
    return InvoiceDto(
      id: json['id'] as String,
      invoiceNumber: json['invoice_number'] as String?,
      sellerName: json['seller_name'] as String?,
      totalAmount: (json['total_amount'] as num?)?.toDouble(),
      invoiceDate: DateTime.parse(json['invoice_date'] as String),
      consumptionDate: json['consumption_date'] != null
          ? DateTime.parse(json['consumption_date'] as String)
          : null,
      status: json['status'] as String,
      category: json['category'] as String?,
      notes: json['notes'] as String?,
      imageUrl: json['image_url'] as String?,
      ocrResult: json['ocr_result'] as String?,
      isVerified: json['is_verified'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  /// 转换为JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'invoice_number': invoiceNumber,
      'seller_name': sellerName,
      'total_amount': totalAmount,
      'invoice_date': invoiceDate.toIso8601String(),
      'consumption_date': consumptionDate?.toIso8601String(),
      'status': status,
      'category': category,
      'notes': notes,
      'image_url': imageUrl,
      'ocr_result': ocrResult,
      'is_verified': isVerified,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  /// 创建副本
  InvoiceDto copyWith({
    String? id,
    String? invoiceNumber,
    String? sellerName,
    double? totalAmount,
    DateTime? invoiceDate,
    DateTime? consumptionDate,
    String? status,
    String? category,
    String? notes,
    String? imageUrl,
    String? ocrResult,
    bool? isVerified,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return InvoiceDto(
      id: id ?? this.id,
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      sellerName: sellerName ?? this.sellerName,
      totalAmount: totalAmount ?? this.totalAmount,
      invoiceDate: invoiceDate ?? this.invoiceDate,
      consumptionDate: consumptionDate ?? this.consumptionDate,
      status: status ?? this.status,
      category: category ?? this.category,
      notes: notes ?? this.notes,
      imageUrl: imageUrl ?? this.imageUrl,
      ocrResult: ocrResult ?? this.ocrResult,
      isVerified: isVerified ?? this.isVerified,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}