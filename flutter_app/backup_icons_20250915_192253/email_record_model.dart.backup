/// 邮件记录数据模型
/// 用于从Supabase响应转换为EmailRecord实体
library;

import '../../domain/entities/email_record.dart';

class EmailRecordModel extends EmailRecord {
  const EmailRecordModel({
    required super.id,
    required super.triggerEventId,
    required super.workflowExecutionId,
    super.emailSubject,
    super.fromEmail,
    super.fromName,
    super.toEmail,
    super.emailDate,
    required super.emailCategory,
    super.classificationReason,
    required super.executionPath,
    required super.overallStatus,
    required super.hasAttachments,
    required super.attachmentCount,
    super.userMappingStatus,
    required super.createdAt,
    super.totalCount,
  });

  /// 从Supabase JSON响应创建模型
  factory EmailRecordModel.fromJson(Map<String, dynamic> json) {
    return EmailRecordModel(
      id: json['id']?.toString() ?? '',
      triggerEventId: json['trigger_event_id']?.toString() ?? '',
      workflowExecutionId: json['workflow_execution_id']?.toString() ?? '',
      emailSubject: json['email_subject'] as String?,
      fromEmail: json['from_email'] as String?,
      fromName: json['from_name'] as String?,
      toEmail: json['to_email'] as String?,
      emailDate: json['email_date'] != null
          ? DateTime.parse(json['email_date'].toString())
          : null,
      emailCategory: json['email_category']?.toString() ?? '未知',
      classificationReason: json['classification_reason'] as String?,
      executionPath: json['execution_path']?.toString() ?? '',
      overallStatus: json['overall_status']?.toString() ?? 'unknown',
      hasAttachments: (json['has_attachments'] as bool?) ?? false,
      attachmentCount: (json['attachment_count'] as int?) ?? 0,
      userMappingStatus: json['user_mapping_status'] as String?,
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at'].toString())
          : DateTime.now(),
      totalCount: json['total_count'] as int?,
    );
  }

  /// 转换为JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'trigger_event_id': triggerEventId,
      'workflow_execution_id': workflowExecutionId,
      'email_subject': emailSubject,
      'from_email': fromEmail,
      'from_name': fromName,
      'to_email': toEmail,
      'email_date': emailDate?.toIso8601String(),
      'email_category': emailCategory,
      'classification_reason': classificationReason,
      'execution_path': executionPath,
      'overall_status': overallStatus,
      'has_attachments': hasAttachments,
      'attachment_count': attachmentCount,
      'user_mapping_status': userMappingStatus,
      'created_at': createdAt.toIso8601String(),
      'total_count': totalCount,
    };
  }

  /// 转换为实体
  EmailRecord toEntity() {
    return EmailRecord(
      id: id,
      triggerEventId: triggerEventId,
      workflowExecutionId: workflowExecutionId,
      emailSubject: emailSubject,
      fromEmail: fromEmail,
      fromName: fromName,
      toEmail: toEmail,
      emailDate: emailDate,
      emailCategory: emailCategory,
      classificationReason: classificationReason,
      executionPath: executionPath,
      overallStatus: overallStatus,
      hasAttachments: hasAttachments,
      attachmentCount: attachmentCount,
      userMappingStatus: userMappingStatus,
      createdAt: createdAt,
      totalCount: totalCount,
    );
  }

  /// 从实体创建模型
  factory EmailRecordModel.fromEntity(EmailRecord entity) {
    return EmailRecordModel(
      id: entity.id,
      triggerEventId: entity.triggerEventId,
      workflowExecutionId: entity.workflowExecutionId,
      emailSubject: entity.emailSubject,
      fromEmail: entity.fromEmail,
      fromName: entity.fromName,
      toEmail: entity.toEmail,
      emailDate: entity.emailDate,
      emailCategory: entity.emailCategory,
      classificationReason: entity.classificationReason,
      executionPath: entity.executionPath,
      overallStatus: entity.overallStatus,
      hasAttachments: entity.hasAttachments,
      attachmentCount: entity.attachmentCount,
      userMappingStatus: entity.userMappingStatus,
      createdAt: entity.createdAt,
      totalCount: entity.totalCount,
    );
  }

  @override
  EmailRecordModel copyWith({
    String? id,
    String? triggerEventId,
    String? workflowExecutionId,
    String? emailSubject,
    String? fromEmail,
    String? fromName,
    String? toEmail,
    DateTime? emailDate,
    String? emailCategory,
    String? classificationReason,
    String? executionPath,
    String? overallStatus,
    bool? hasAttachments,
    int? attachmentCount,
    String? userMappingStatus,
    DateTime? createdAt,
    int? totalCount,
  }) {
    return EmailRecordModel(
      id: id ?? this.id,
      triggerEventId: triggerEventId ?? this.triggerEventId,
      workflowExecutionId: workflowExecutionId ?? this.workflowExecutionId,
      emailSubject: emailSubject ?? this.emailSubject,
      fromEmail: fromEmail ?? this.fromEmail,
      fromName: fromName ?? this.fromName,
      toEmail: toEmail ?? this.toEmail,
      emailDate: emailDate ?? this.emailDate,
      emailCategory: emailCategory ?? this.emailCategory,
      classificationReason: classificationReason ?? this.classificationReason,
      executionPath: executionPath ?? this.executionPath,
      overallStatus: overallStatus ?? this.overallStatus,
      hasAttachments: hasAttachments ?? this.hasAttachments,
      attachmentCount: attachmentCount ?? this.attachmentCount,
      userMappingStatus: userMappingStatus ?? this.userMappingStatus,
      createdAt: createdAt ?? this.createdAt,
      totalCount: totalCount ?? this.totalCount,
    );
  }
}