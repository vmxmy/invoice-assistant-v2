/// 邮件记录实体
/// 对应Web项目的EmailRecord接口
library;

import 'package:equatable/equatable.dart';

class EmailRecord extends Equatable {
  final String id;
  final String triggerEventId;
  final String workflowExecutionId;
  final String? emailSubject;
  final String? fromEmail;
  final String? fromName;
  final String? toEmail;
  final DateTime? emailDate;
  final String emailCategory;
  final String? classificationReason;
  final String executionPath;
  final String overallStatus;
  final bool hasAttachments;
  final int attachmentCount;
  final String? userMappingStatus;
  final DateTime createdAt;
  final int? totalCount; // 用于分页总数

  const EmailRecord({
    required this.id,
    required this.triggerEventId,
    required this.workflowExecutionId,
    this.emailSubject,
    this.fromEmail,
    this.fromName,
    this.toEmail,
    this.emailDate,
    required this.emailCategory,
    this.classificationReason,
    required this.executionPath,
    required this.overallStatus,
    required this.hasAttachments,
    required this.attachmentCount,
    this.userMappingStatus,
    required this.createdAt,
    this.totalCount,
  });

  @override
  List<Object?> get props => [
    id,
    triggerEventId,
    workflowExecutionId,
    emailSubject,
    fromEmail,
    fromName,
    toEmail,
    emailDate,
    emailCategory,
    classificationReason,
    executionPath,
    overallStatus,
    hasAttachments,
    attachmentCount,
    userMappingStatus,
    createdAt,
    totalCount,
  ];

  EmailRecord copyWith({
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
    return EmailRecord(
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

  // 格式化发件人显示名称
  String get displayFrom {
    if (fromName?.isNotEmpty == true) {
      return fromName!;
    }
    if (fromEmail?.isNotEmpty == true) {
      return fromEmail!;
    }
    return '未知发件人';
  }

  // 格式化邮件主题
  String get displaySubject {
    if (emailSubject?.isNotEmpty == true) {
      return emailSubject!;
    }
    return '无主题';
  }

  // 邮件类别显示名称
  String get categoryDisplayName {
    switch (emailCategory) {
      case 'verification':
        return '验证邮件';
      case 'invoice':
        return '发票邮件';
      case 'other':
        return '其他';
      default:
        return emailCategory;
    }
  }

  // 处理状态显示名称
  String get statusDisplayName {
    switch (overallStatus) {
      case 'success':
        return '成功';
      case 'partial_success':
        return '部分成功';
      case 'failed':
        return '失败';
      case 'not_processed':
        return '未处理';
      case 'classification_only':
        return '仅分类';
      default:
        return overallStatus;
    }
  }

  // 用户映射状态显示名称
  String get userMappingStatusDisplayName {
    switch (userMappingStatus) {
      case 'found':
        return '已找到用户';
      case 'created':
        return '已创建用户';
      case 'not_found':
        return '未找到用户';
      case 'error':
        return '映射错误';
      case 'disabled':
        return '映射已禁用';
      default:
        return userMappingStatus ?? '未知状态';
    }
  }
}