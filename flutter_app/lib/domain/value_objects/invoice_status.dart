/// 发票状态枚举 - 与报销集状态保持一致
enum InvoiceStatus {
  unsubmitted('unsubmitted', '待报销', '发票尚未提交到报销集'),
  submitted('submitted', '已提交', '发票已提交到报销集待审核'),
  reimbursed('reimbursed', '已报销', '发票已完成报销');

  const InvoiceStatus(this.value, this.displayName, this.description);

  final String value;
  final String displayName;
  final String description;

  /// 从字符串值获取枚举
  static InvoiceStatus fromString(String value) {
    return InvoiceStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => InvoiceStatus.unsubmitted,
    );
  }

  /// 获取状态对应的颜色
  String get colorName {
    switch (this) {
      case InvoiceStatus.unsubmitted:
        return 'orange';
      case InvoiceStatus.submitted:
        return 'blue';
      case InvoiceStatus.reimbursed:
        return 'green';
    }
  }

  /// 是否为最终状态
  bool get isFinalStatus {
    return this == InvoiceStatus.reimbursed;
  }

  /// 是否可以加入报销集
  bool get canAddToReimbursementSet {
    return this == InvoiceStatus.unsubmitted;
  }

  /// 是否已在报销集中
  bool get isInReimbursementSet {
    return this == InvoiceStatus.submitted || this == InvoiceStatus.reimbursed;
  }
}
