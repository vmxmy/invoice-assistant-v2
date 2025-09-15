import 'package:equatable/equatable.dart';

/// 日期范围类型枚举
enum DateRangeType {
  singleDay('single_day', '单日'),
  sameMonth('same_month', '同月'),
  crossMonth('cross_month', '跨月'),
  crossYear('cross_year', '跨年');

  const DateRangeType(this.value, this.displayName);

  final String value;
  final String displayName;

  static DateRangeType fromString(String? value) {
    if (value == null) return DateRangeType.singleDay;
    return DateRangeType.values.firstWhere(
      (type) => type.value == value,
      orElse: () => DateRangeType.singleDay,
    );
  }

  /// 是否为跨期类型
  bool get isCrossPeriod {
    return this == DateRangeType.crossMonth || this == DateRangeType.crossYear;
  }

  /// 获取图标
  String get icon {
    switch (this) {
      case DateRangeType.singleDay:
        return '📅';
      case DateRangeType.sameMonth:
        return '🗓️';
      case DateRangeType.crossMonth:
        return '📊';
      case DateRangeType.crossYear:
        return '🗂️';
    }
  }
}

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

  // 新增的日期范围字段
  final DateTime? consumptionStartDate;
  final DateTime? consumptionEndDate;
  final String? dateRangeText;
  final DateRangeType? dateRangeType;
  final bool smartNameGenerated;
  final String? originalName;
  final Map<String, dynamic>? dateRangeMetadata;

  // 扩展信息（来自视图）
  final String? userEmail;
  final String? approverEmail;
  final DateTime? earliestInvoiceDate;
  final DateTime? latestInvoiceDate;
  final int? regionCount;
  final int? categoryCount;

  // 区域统计信息
  final Map<String, int>? regionStatistics;
  final Map<String, int>? provinceStatistics;

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
    // 新增的日期范围字段
    this.consumptionStartDate,
    this.consumptionEndDate,
    this.dateRangeText,
    this.dateRangeType,
    this.smartNameGenerated = false,
    this.originalName,
    this.dateRangeMetadata,
    // 扩展信息
    this.userEmail,
    this.approverEmail,
    this.earliestInvoiceDate,
    this.latestInvoiceDate,
    this.regionCount,
    this.categoryCount,
    // 区域统计信息
    this.regionStatistics,
    this.provinceStatistics,
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

  /// 获取智能生成的时间范围文本
  String get smartDateRangeText {
    // 优先使用新的日期范围文本字段
    if (dateRangeText != null && dateRangeText!.isNotEmpty) {
      return dateRangeText!;
    }

    // 回退到手动计算（为了向后兼容）
    if (consumptionStartDate == null || consumptionEndDate == null) {
      return '暂无发票';
    }

    if (consumptionStartDate == consumptionEndDate) {
      return '${consumptionStartDate!.year}-${consumptionStartDate!.month.toString().padLeft(2, '0')}-${consumptionStartDate!.day.toString().padLeft(2, '0')}';
    }

    return '${consumptionStartDate!.year}-${consumptionStartDate!.month.toString().padLeft(2, '0')}-${consumptionStartDate!.day.toString().padLeft(2, '0')}~${consumptionEndDate!.year}-${consumptionEndDate!.month.toString().padLeft(2, '0')}-${consumptionEndDate!.day.toString().padLeft(2, '0')}';
  }

  /// 获取日期范围显示文本（用于UI显示）
  String get dateRangeDisplayText {
    if (dateRangeType == null) return smartDateRangeText;

    return '${dateRangeType!.icon} ${dateRangeType!.displayName} | $smartDateRangeText';
  }

  /// 获取日期跨度天数
  int? get dateSpanDays {
    if (consumptionStartDate == null || consumptionEndDate == null) {
      return null;
    }
    return consumptionEndDate!.difference(consumptionStartDate!).inDays + 1;
  }

  /// 获取元数据中的统计信息
  int? get metadataTotalDays => dateRangeMetadata?['total_days'] as int?;
  int? get metadataSpanMonths => dateRangeMetadata?['span_months'] as int?;
  int? get metadataSpanYears => dateRangeMetadata?['span_years'] as int?;

  /// 是否使用智能命名
  bool get isSmartNamed => smartNameGenerated;

  /// 获取实际使用的名称（智能生成或原始名称）
  String get displayName =>
      smartNameGenerated && originalName != null ? originalName! : setName;

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

  /// 获取详细的区域统计文本
  String get regionSummaryText {
    if (regionStatistics == null || regionStatistics!.isEmpty) {
      return '暂无区域信息';
    }

    final entries = regionStatistics!.entries.toList();
    entries.sort((a, b) => b.value.compareTo(a.value)); // 按发票数量降序排列

    return entries.map((e) => '${e.key}(${e.value}张)').join('、');
  }

  /// 获取省份统计文本
  String get provinceSummaryText {
    if (provinceStatistics == null || provinceStatistics!.isEmpty) {
      return '暂无省份信息';
    }

    final entries = provinceStatistics!.entries.toList();
    entries.sort((a, b) => b.value.compareTo(a.value)); // 按发票数量降序排列

    return entries.map((e) => '${e.key}(${e.value}张)').join('、');
  }

  /// 获取主要区域（发票数量最多的区域）
  String? get primaryRegion {
    if (regionStatistics == null || regionStatistics!.isEmpty) {
      return null;
    }

    var maxEntry = regionStatistics!.entries.reduce(
      (a, b) => a.value > b.value ? a : b,
    );

    return maxEntry.key == '未知区域' && regionStatistics!.length > 1
        ? regionStatistics!.entries
            .where((e) => e.key != '未知区域')
            .reduce((a, b) => a.value > b.value ? a : b)
            .key
        : maxEntry.key;
  }

  /// 获取主要省份（发票数量最多的省份）
  String? get primaryProvince {
    if (provinceStatistics == null || provinceStatistics!.isEmpty) {
      return null;
    }

    var maxEntry = provinceStatistics!.entries.reduce(
      (a, b) => a.value > b.value ? a : b,
    );

    return maxEntry.key == '未知省份' && provinceStatistics!.length > 1
        ? provinceStatistics!.entries
            .where((e) => e.key != '未知省份')
            .reduce((a, b) => a.value > b.value ? a : b)
            .key
        : maxEntry.key;
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
        // 新增的日期范围字段
        consumptionStartDate,
        consumptionEndDate,
        dateRangeText,
        dateRangeType,
        smartNameGenerated,
        originalName,
        dateRangeMetadata,
        // 扩展信息
        userEmail,
        approverEmail,
        earliestInvoiceDate,
        latestInvoiceDate,
        regionCount,
        categoryCount,
        // 区域统计信息
        regionStatistics,
        provinceStatistics,
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
    // 新增的日期范围字段
    DateTime? consumptionStartDate,
    DateTime? consumptionEndDate,
    String? dateRangeText,
    DateRangeType? dateRangeType,
    bool? smartNameGenerated,
    String? originalName,
    Map<String, dynamic>? dateRangeMetadata,
    // 扩展信息
    String? userEmail,
    String? approverEmail,
    DateTime? earliestInvoiceDate,
    DateTime? latestInvoiceDate,
    int? regionCount,
    int? categoryCount,
    // 区域统计信息
    Map<String, int>? regionStatistics,
    Map<String, int>? provinceStatistics,
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
      // 新增的日期范围字段
      consumptionStartDate: consumptionStartDate ?? this.consumptionStartDate,
      consumptionEndDate: consumptionEndDate ?? this.consumptionEndDate,
      dateRangeText: dateRangeText ?? this.dateRangeText,
      dateRangeType: dateRangeType ?? this.dateRangeType,
      smartNameGenerated: smartNameGenerated ?? this.smartNameGenerated,
      originalName: originalName ?? this.originalName,
      dateRangeMetadata: dateRangeMetadata ?? this.dateRangeMetadata,
      // 扩展信息
      userEmail: userEmail ?? this.userEmail,
      approverEmail: approverEmail ?? this.approverEmail,
      earliestInvoiceDate: earliestInvoiceDate ?? this.earliestInvoiceDate,
      latestInvoiceDate: latestInvoiceDate ?? this.latestInvoiceDate,
      regionCount: regionCount ?? this.regionCount,
      categoryCount: categoryCount ?? this.categoryCount,
      // 区域统计信息
      regionStatistics: regionStatistics ?? this.regionStatistics,
      provinceStatistics: provinceStatistics ?? this.provinceStatistics,
    );
  }

  @override
  String toString() {
    return 'ReimbursementSetEntity(id: $id, setName: $setName, status: $status, totalAmount: $totalAmount, invoiceCount: $invoiceCount)';
  }
}
