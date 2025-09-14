/// 收件箱统计信息实体
/// 对应Web项目的InboxStats接口
library;

import 'package:equatable/equatable.dart';

class InboxStats extends Equatable {
  final int totalEmails;
  final int unreadEmails;
  final int verificationEmails;
  final int invoiceEmails;
  final int successfulProcessing;
  final int failedProcessing;
  final int emailsWithAttachments;
  final int emailsWithBody;
  final int recentEmailsToday;
  final int recentEmailsWeek;

  const InboxStats({
    required this.totalEmails,
    required this.unreadEmails,
    required this.verificationEmails,
    required this.invoiceEmails,
    required this.successfulProcessing,
    required this.failedProcessing,
    required this.emailsWithAttachments,
    required this.emailsWithBody,
    required this.recentEmailsToday,
    required this.recentEmailsWeek,
  });

  @override
  List<Object?> get props => [
    totalEmails,
    unreadEmails,
    verificationEmails,
    invoiceEmails,
    successfulProcessing,
    failedProcessing,
    emailsWithAttachments,
    emailsWithBody,
    recentEmailsToday,
    recentEmailsWeek,
  ];

  // 处理成功率
  double get successRate {
    final totalProcessed = successfulProcessing + failedProcessing;
    if (totalProcessed == 0) return 0.0;
    return successfulProcessing / totalProcessed;
  }

  // 处理失败率
  double get failureRate {
    final totalProcessed = successfulProcessing + failedProcessing;
    if (totalProcessed == 0) return 0.0;
    return failedProcessing / totalProcessed;
  }

  // 附件邮件比例
  double get attachmentEmailsRate {
    if (totalEmails == 0) return 0.0;
    return emailsWithAttachments / totalEmails;
  }

  // 有正文邮件比例
  double get bodyEmailsRate {
    if (totalEmails == 0) return 0.0;
    return emailsWithBody / totalEmails;
  }

  // 今日活跃度（今日邮件占总邮件比例）
  double get todayActivityRate {
    if (totalEmails == 0) return 0.0;
    return recentEmailsToday / totalEmails;
  }

  // 本周活跃度（本周邮件占总邮件比例）
  double get weekActivityRate {
    if (totalEmails == 0) return 0.0;
    return recentEmailsWeek / totalEmails;
  }

  // 验证邮件比例
  double get verificationEmailsRate {
    if (totalEmails == 0) return 0.0;
    return verificationEmails / totalEmails;
  }

  // 发票邮件比例
  double get invoiceEmailsRate {
    if (totalEmails == 0) return 0.0;
    return invoiceEmails / totalEmails;
  }

  // 创建空统计对象
  static const InboxStats empty = InboxStats(
    totalEmails: 0,
    unreadEmails: 0,
    verificationEmails: 0,
    invoiceEmails: 0,
    successfulProcessing: 0,
    failedProcessing: 0,
    emailsWithAttachments: 0,
    emailsWithBody: 0,
    recentEmailsToday: 0,
    recentEmailsWeek: 0,
  );

  InboxStats copyWith({
    int? totalEmails,
    int? unreadEmails,
    int? verificationEmails,
    int? invoiceEmails,
    int? successfulProcessing,
    int? failedProcessing,
    int? emailsWithAttachments,
    int? emailsWithBody,
    int? recentEmailsToday,
    int? recentEmailsWeek,
  }) {
    return InboxStats(
      totalEmails: totalEmails ?? this.totalEmails,
      unreadEmails: unreadEmails ?? this.unreadEmails,
      verificationEmails: verificationEmails ?? this.verificationEmails,
      invoiceEmails: invoiceEmails ?? this.invoiceEmails,
      successfulProcessing: successfulProcessing ?? this.successfulProcessing,
      failedProcessing: failedProcessing ?? this.failedProcessing,
      emailsWithAttachments: emailsWithAttachments ?? this.emailsWithAttachments,
      emailsWithBody: emailsWithBody ?? this.emailsWithBody,
      recentEmailsToday: recentEmailsToday ?? this.recentEmailsToday,
      recentEmailsWeek: recentEmailsWeek ?? this.recentEmailsWeek,
    );
  }
}