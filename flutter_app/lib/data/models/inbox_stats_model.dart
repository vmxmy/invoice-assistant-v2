/// 收件箱统计数据模型
/// 用于从Supabase响应转换为InboxStats实体
library;

import '../../domain/entities/inbox_stats.dart';

class InboxStatsModel extends InboxStats {
  const InboxStatsModel({
    required super.totalEmails,
    required super.unreadEmails,
    required super.verificationEmails,
    required super.invoiceEmails,
    required super.successfulProcessing,
    required super.failedProcessing,
    required super.emailsWithAttachments,
    required super.emailsWithBody,
    required super.recentEmailsToday,
    required super.recentEmailsWeek,
  });

  /// 从Supabase JSON响应创建模型
  factory InboxStatsModel.fromJson(Map<String, dynamic> json) {
    return InboxStatsModel(
      totalEmails: json['total_emails'] as int? ?? 0,
      unreadEmails: json['unread_emails'] as int? ?? 0,
      verificationEmails: json['verification_emails'] as int? ?? 0,
      invoiceEmails: json['invoice_emails'] as int? ?? 0,
      successfulProcessing: json['successful_processing'] as int? ?? 0,
      failedProcessing: json['failed_processing'] as int? ?? 0,
      emailsWithAttachments: json['emails_with_attachments'] as int? ?? 0,
      emailsWithBody: json['emails_with_body'] as int? ?? 0,
      recentEmailsToday: json['recent_emails_today'] as int? ?? 0,
      recentEmailsWeek: json['recent_emails_week'] as int? ?? 0,
    );
  }

  /// 转换为JSON
  Map<String, dynamic> toJson() {
    return {
      'total_emails': totalEmails,
      'unread_emails': unreadEmails,
      'verification_emails': verificationEmails,
      'invoice_emails': invoiceEmails,
      'successful_processing': successfulProcessing,
      'failed_processing': failedProcessing,
      'emails_with_attachments': emailsWithAttachments,
      'emails_with_body': emailsWithBody,
      'recent_emails_today': recentEmailsToday,
      'recent_emails_week': recentEmailsWeek,
    };
  }

  /// 转换为实体
  InboxStats toEntity() {
    return InboxStats(
      totalEmails: totalEmails,
      unreadEmails: unreadEmails,
      verificationEmails: verificationEmails,
      invoiceEmails: invoiceEmails,
      successfulProcessing: successfulProcessing,
      failedProcessing: failedProcessing,
      emailsWithAttachments: emailsWithAttachments,
      emailsWithBody: emailsWithBody,
      recentEmailsToday: recentEmailsToday,
      recentEmailsWeek: recentEmailsWeek,
    );
  }

  /// 从实体创建模型
  factory InboxStatsModel.fromEntity(InboxStats entity) {
    return InboxStatsModel(
      totalEmails: entity.totalEmails,
      unreadEmails: entity.unreadEmails,
      verificationEmails: entity.verificationEmails,
      invoiceEmails: entity.invoiceEmails,
      successfulProcessing: entity.successfulProcessing,
      failedProcessing: entity.failedProcessing,
      emailsWithAttachments: entity.emailsWithAttachments,
      emailsWithBody: entity.emailsWithBody,
      recentEmailsToday: entity.recentEmailsToday,
      recentEmailsWeek: entity.recentEmailsWeek,
    );
  }

  @override
  InboxStatsModel copyWith({
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
    return InboxStatsModel(
      totalEmails: totalEmails ?? this.totalEmails,
      unreadEmails: unreadEmails ?? this.unreadEmails,
      verificationEmails: verificationEmails ?? this.verificationEmails,
      invoiceEmails: invoiceEmails ?? this.invoiceEmails,
      successfulProcessing: successfulProcessing ?? this.successfulProcessing,
      failedProcessing: failedProcessing ?? this.failedProcessing,
      emailsWithAttachments:
          emailsWithAttachments ?? this.emailsWithAttachments,
      emailsWithBody: emailsWithBody ?? this.emailsWithBody,
      recentEmailsToday: recentEmailsToday ?? this.recentEmailsToday,
      recentEmailsWeek: recentEmailsWeek ?? this.recentEmailsWeek,
    );
  }
}
