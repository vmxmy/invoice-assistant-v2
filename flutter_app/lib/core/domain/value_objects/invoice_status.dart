/// 发票状态
enum InvoiceStatus {
  /// 待处理
  pending,

  /// 已验证
  verified,

  /// 处理中
  processing,

  /// 已完成
  completed,

  /// 已拒绝
  rejected,

  /// 已删除
  deleted,
}

extension InvoiceStatusExtension on InvoiceStatus {
  /// 状态显示文本
  String get displayName {
    switch (this) {
      case InvoiceStatus.pending:
        return '待处理';
      case InvoiceStatus.verified:
        return '已验证';
      case InvoiceStatus.processing:
        return '处理中';
      case InvoiceStatus.completed:
        return '已完成';
      case InvoiceStatus.rejected:
        return '已拒绝';
      case InvoiceStatus.deleted:
        return '已删除';
    }
  }

  /// 状态颜色
  String get color {
    switch (this) {
      case InvoiceStatus.pending:
        return '#FFA726'; // 橙色
      case InvoiceStatus.verified:
        return '#42A5F5'; // 蓝色
      case InvoiceStatus.processing:
        return '#AB47BC'; // 紫色
      case InvoiceStatus.completed:
        return '#66BB6A'; // 绿色
      case InvoiceStatus.rejected:
        return '#EF5350'; // 红色
      case InvoiceStatus.deleted:
        return '#9E9E9E'; // 灰色
    }
  }

  /// 是否是终态
  bool get isFinal {
    switch (this) {
      case InvoiceStatus.completed:
      case InvoiceStatus.rejected:
      case InvoiceStatus.deleted:
        return true;
      default:
        return false;
    }
  }
}
