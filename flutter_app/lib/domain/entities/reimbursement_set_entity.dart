import 'package:equatable/equatable.dart';

/// 报销集状态枚举 - 与发票状态保持一致
enum ReimbursementSetStatus {
  unsubmitted('unsubmitted', '未提交'),
  submitted('submitted', '已提交'),
  reimbursed('reimbursed', '已报销');

  const ReimbursementSetStatus(this.value, this.displayName);

  final String value;
  final String displayName;

  static ReimbursementSetStatus fromString(String value) {
    return ReimbursementSetStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => ReimbursementSetStatus.unsubmitted,
    );
  }

  /// 是否可以编辑
  bool get canEdit {
    return this == ReimbursementSetStatus.unsubmitted;
  }

  /// 是否可以提交
  bool get canSubmit {
    return this == ReimbursementSetStatus.unsubmitted;
  }

  /// 是否可以标记为已报销
  bool get canMarkReimbursed {
    return this == ReimbursementSetStatus.submitted;
  }

  /// 是否为最终状态
  bool get isFinalStatus {
    return this == ReimbursementSetStatus.reimbursed;
  }
}

/// 报销集实体
class ReimbursementSetEntity extends Equatable {
  final String id;
  final String userId;
  final String setName;
  final String? description;
  final ReimbursementSetStatus status;
  final DateTime? submittedAt;
  final DateTime? reimbursedAt;
  final double totalAmount;
  final int invoiceCount;
  final String? approverId;
  final String? approvalNotes;
  final DateTime createdAt;
  final DateTime updatedAt;

  // 扩展信息（来自视图）
  final String? userEmail;
  final String? approverEmail;
  final DateTime? earliestInvoiceDate;
  final DateTime? latestInvoiceDate;
  final int? regionCount;
  final int? categoryCount;

  const ReimbursementSetEntity({
    required this.id,
    required this.userId,
    required this.setName,
    this.description,
    required this.status,
    this.submittedAt,
    this.reimbursedAt,
    required this.totalAmount,
    required this.invoiceCount,
    this.approverId,
    this.approvalNotes,
    required this.createdAt,
    required this.updatedAt,
    this.userEmail,
    this.approverEmail,
    this.earliestInvoiceDate,
    this.latestInvoiceDate,
    this.regionCount,
    this.categoryCount,
  });

  /// 是否为未提交状态
  bool get isDraft => status == ReimbursementSetStatus.unsubmitted;

  /// 是否已提交
  bool get isSubmitted => status == ReimbursementSetStatus.submitted;

  /// 是否已报销
  bool get isReimbursed => status == ReimbursementSetStatus.reimbursed;

  /// 是否可以编辑（只有未提交状态可以编辑）
  bool get canEdit => status.canEdit;

  /// 是否可以提交（未提交状态且有发票）
  bool get canSubmit => status.canSubmit && invoiceCount > 0;

  /// 是否可以标记为已报销（已提交状态）
  bool get canMarkReimbursed => status.canMarkReimbursed;

  /// 获取状态显示文本
  String get statusDisplayName => status.displayName;

  /// 获取时间范围文本
  String get dateRangeText {
    if (earliestInvoiceDate == null || latestInvoiceDate == null) {
      return '暂无发票';
    }

    if (earliestInvoiceDate == latestInvoiceDate) {
      return '${earliestInvoiceDate!.year}-${earliestInvoiceDate!.month.toString().padLeft(2, '0')}-${earliestInvoiceDate!.day.toString().padLeft(2, '0')}';
    }

    return '${earliestInvoiceDate!.year}-${earliestInvoiceDate!.month.toString().padLeft(2, '0')}-${earliestInvoiceDate!.day.toString().padLeft(2, '0')} 至 ${latestInvoiceDate!.year}-${latestInvoiceDate!.month.toString().padLeft(2, '0')}-${latestInvoiceDate!.day.toString().padLeft(2, '0')}';
  }

  /// 获取分类统计文本
  String get categorySummary {
    final regions = regionCount ?? 0;
    final categories = categoryCount ?? 0;

    final List<String> parts = [];
    if (regions > 0) {
      parts.add('$regions个地区');
    }
    if (categories > 0) {
      parts.add('$categories种类型');
    }

    return parts.isEmpty ? '无分类' : parts.join('，');
  }

  @override
  List<Object?> get props => [
        id,
        userId,
        setName,
        description,
        status,
        submittedAt,
        reimbursedAt,
        totalAmount,
        invoiceCount,
        approverId,
        approvalNotes,
        createdAt,
        updatedAt,
        userEmail,
        approverEmail,
        earliestInvoiceDate,
        latestInvoiceDate,
        regionCount,
        categoryCount,
      ];

  /// 复制并修改部分字段
  ReimbursementSetEntity copyWith({
    String? id,
    String? userId,
    String? setName,
    String? description,
    ReimbursementSetStatus? status,
    DateTime? submittedAt,
    DateTime? reimbursedAt,
    double? totalAmount,
    int? invoiceCount,
    String? approverId,
    String? approvalNotes,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? userEmail,
    String? approverEmail,
    DateTime? earliestInvoiceDate,
    DateTime? latestInvoiceDate,
    int? regionCount,
    int? categoryCount,
  }) {
    return ReimbursementSetEntity(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      setName: setName ?? this.setName,
      description: description ?? this.description,
      status: status ?? this.status,
      submittedAt: submittedAt ?? this.submittedAt,
      reimbursedAt: reimbursedAt ?? this.reimbursedAt,
      totalAmount: totalAmount ?? this.totalAmount,
      invoiceCount: invoiceCount ?? this.invoiceCount,
      approverId: approverId ?? this.approverId,
      approvalNotes: approvalNotes ?? this.approvalNotes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      userEmail: userEmail ?? this.userEmail,
      approverEmail: approverEmail ?? this.approverEmail,
      earliestInvoiceDate: earliestInvoiceDate ?? this.earliestInvoiceDate,
      latestInvoiceDate: latestInvoiceDate ?? this.latestInvoiceDate,
      regionCount: regionCount ?? this.regionCount,
      categoryCount: categoryCount ?? this.categoryCount,
    );
  }

  @override
  String toString() {
    return 'ReimbursementSetEntity(id: $id, setName: $setName, status: $status, totalAmount: $totalAmount, invoiceCount: $invoiceCount)';
  }
}
