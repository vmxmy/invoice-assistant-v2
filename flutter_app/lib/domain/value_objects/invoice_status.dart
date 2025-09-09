/// 发票状态枚举
enum InvoiceStatus {
  pending('pending', '待处理', '发票正在等待处理'),
  processing('processing', '处理中', '发票正在识别处理中'),
  completed('completed', '已完成', '发票识别已完成'),
  failed('failed', '失败', '发票识别失败'),
  verified('verified', '已验证', '发票已验证确认'),
  unreimbursed('unreimbursed', '未报销', '发票未进行报销'),
  reimbursed('reimbursed', '已报销', '发票已完成报销');

  const InvoiceStatus(this.value, this.displayName, this.description);

  final String value;
  final String displayName;
  final String description;

  /// 从字符串值获取枚举
  static InvoiceStatus fromString(String value) {
    return InvoiceStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => InvoiceStatus.pending,
    );
  }

  /// 获取状态对应的颜色
  String get colorName {
    switch (this) {
      case InvoiceStatus.pending:
        return 'orange';
      case InvoiceStatus.processing:
        return 'blue';
      case InvoiceStatus.completed:
        return 'green';
      case InvoiceStatus.failed:
        return 'red';
      case InvoiceStatus.verified:
        return 'purple';
      case InvoiceStatus.unreimbursed:
        return 'amber';
      case InvoiceStatus.reimbursed:
        return 'teal';
    }
  }

  /// 是否为最终状态
  bool get isFinalStatus {
    return this == InvoiceStatus.completed || 
           this == InvoiceStatus.failed || 
           this == InvoiceStatus.verified ||
           this == InvoiceStatus.reimbursed;
  }
}