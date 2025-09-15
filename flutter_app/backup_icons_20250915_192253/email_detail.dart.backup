/// 邮件详情实体
/// 对应Web项目的EmailDetail接口
library;

import 'package:equatable/equatable.dart';
import 'email_record.dart';

class EmailDetail extends Equatable {
  final EmailRecord baseInfo;
  final String? emailBodyText;
  final String? emailBodyHtml;
  final String? emailBodyPreview;
  final List<String>? attachmentNames;
  final bool? shouldProcess;
  final List<String>? matchedKeywords;
  final String? extractedSubject;
  final Map<String, dynamic>? keywordStats;
  final bool node3Executed;
  final String? node3Status;
  final Map<String, dynamic>? verificationLinks;
  final String? primaryVerificationLink;
  final String? targetUserEmail;
  final String? linkQuality;
  final String? extractionCompleteness;
  final bool node4Executed;
  final String? node4Status;
  final int? totalAttachments;
  final int? pdfAttachments;
  final int? successfulProcessing;
  final int? failedProcessing;
  final Map<String, dynamic>? processingResults;
  final String? mappedUserId;
  final String? mappingMethod;
  final String? mappingError;
  final String? errorSummary;
  final int? totalProcessingTime;
  final Map<String, dynamic>? node2RawOutput;
  final Map<String, dynamic>? node3RawOutput;
  final Map<String, dynamic>? node4RawOutput;
  final Map<String, dynamic>? triggerRawData;
  final List<String>? recommendations;

  const EmailDetail({
    required this.baseInfo,
    this.emailBodyText,
    this.emailBodyHtml,
    this.emailBodyPreview,
    this.attachmentNames,
    this.shouldProcess,
    this.matchedKeywords,
    this.extractedSubject,
    this.keywordStats,
    required this.node3Executed,
    this.node3Status,
    this.verificationLinks,
    this.primaryVerificationLink,
    this.targetUserEmail,
    this.linkQuality,
    this.extractionCompleteness,
    required this.node4Executed,
    this.node4Status,
    this.totalAttachments,
    this.pdfAttachments,
    this.successfulProcessing,
    this.failedProcessing,
    this.processingResults,
    this.mappedUserId,
    this.mappingMethod,
    this.mappingError,
    this.errorSummary,
    this.totalProcessingTime,
    this.node2RawOutput,
    this.node3RawOutput,
    this.node4RawOutput,
    this.triggerRawData,
    this.recommendations,
  });

  @override
  List<Object?> get props => [
    baseInfo,
    emailBodyText,
    emailBodyHtml,
    emailBodyPreview,
    attachmentNames,
    shouldProcess,
    matchedKeywords,
    extractedSubject,
    keywordStats,
    node3Executed,
    node3Status,
    verificationLinks,
    primaryVerificationLink,
    targetUserEmail,
    linkQuality,
    extractionCompleteness,
    node4Executed,
    node4Status,
    totalAttachments,
    pdfAttachments,
    successfulProcessing,
    failedProcessing,
    processingResults,
    mappedUserId,
    mappingMethod,
    mappingError,
    errorSummary,
    totalProcessingTime,
    node2RawOutput,
    node3RawOutput,
    node4RawOutput,
    triggerRawData,
    recommendations,
  ];

  // 便捷访问基础信息属性
  String get id => baseInfo.id;
  String? get emailSubject => baseInfo.emailSubject;
  String? get fromEmail => baseInfo.fromEmail;
  String? get fromName => baseInfo.fromName;
  String get emailCategory => baseInfo.emailCategory;
  String get overallStatus => baseInfo.overallStatus;
  bool get hasAttachments => baseInfo.hasAttachments;
  int get attachmentCount => baseInfo.attachmentCount;
  DateTime? get emailDate => baseInfo.emailDate;
  DateTime get createdAt => baseInfo.createdAt;

  // 获取邮件正文预览
  String get bodyPreview {
    if (emailBodyPreview?.isNotEmpty == true) {
      return emailBodyPreview!;
    }
    if (emailBodyText?.isNotEmpty == true) {
      return emailBodyText!.length > 200 
        ? '${emailBodyText!.substring(0, 200)}...'
        : emailBodyText!;
    }
    return '无邮件正文';
  }

  // 处理成功率
  double? get successRate {
    if (totalAttachments == null || totalAttachments == 0) {
      return null;
    }
    final success = successfulProcessing ?? 0;
    return success / totalAttachments!;
  }

  // 是否有处理错误
  bool get hasProcessingErrors {
    return failedProcessing != null && failedProcessing! > 0;
  }

  // 是否有处理统计数据
  bool get hasProcessingStats {
    return (successfulProcessing != null && successfulProcessing! > 0) ||
           (failedProcessing != null && failedProcessing! > 0);
  }

  // 链接质量状态
  String get linkQualityDisplayName {
    switch (linkQuality) {
      case 'high':
        return '高质量';
      case 'medium':
        return '中等';
      case 'low':
        return '低质量';
      default:
        return linkQuality ?? '未知';
    }
  }

  // 提取完整性状态
  String get extractionCompletenessDisplayName {
    switch (extractionCompleteness) {
      case 'complete':
        return '完整';
      case 'partial':
        return '部分';
      case 'incomplete':
        return '不完整';
      default:
        return extractionCompleteness ?? '未知';
    }
  }

  // 映射方法显示名称
  String get mappingMethodDisplayName {
    switch (mappingMethod) {
      case 'email_match':
        return '邮箱匹配';
      case 'name_match':
        return '姓名匹配';
      case 'auto_created':
        return '自动创建';
      default:
        return mappingMethod ?? '未知方法';
    }
  }

  // 处理时间格式化显示
  String get processingTimeDisplayName {
    if (totalProcessingTime == null) {
      return '未记录';
    }
    
    final seconds = totalProcessingTime! / 1000;
    if (seconds < 60) {
      return '${seconds.toStringAsFixed(1)}秒';
    } else if (seconds < 3600) {
      final minutes = seconds / 60;
      return '${minutes.toStringAsFixed(1)}分钟';
    } else {
      final hours = seconds / 3600;
      return '${hours.toStringAsFixed(1)}小时';
    }
  }

  EmailDetail copyWith({
    EmailRecord? baseInfo,
    String? emailBodyText,
    String? emailBodyHtml,
    String? emailBodyPreview,
    List<String>? attachmentNames,
    bool? shouldProcess,
    List<String>? matchedKeywords,
    String? extractedSubject,
    Map<String, dynamic>? keywordStats,
    bool? node3Executed,
    String? node3Status,
    Map<String, dynamic>? verificationLinks,
    String? primaryVerificationLink,
    String? targetUserEmail,
    String? linkQuality,
    String? extractionCompleteness,
    bool? node4Executed,
    String? node4Status,
    int? totalAttachments,
    int? pdfAttachments,
    int? successfulProcessing,
    int? failedProcessing,
    Map<String, dynamic>? processingResults,
    String? mappedUserId,
    String? mappingMethod,
    String? mappingError,
    String? errorSummary,
    int? totalProcessingTime,
    Map<String, dynamic>? node2RawOutput,
    Map<String, dynamic>? node3RawOutput,
    Map<String, dynamic>? node4RawOutput,
    Map<String, dynamic>? triggerRawData,
    List<String>? recommendations,
  }) {
    return EmailDetail(
      baseInfo: baseInfo ?? this.baseInfo,
      emailBodyText: emailBodyText ?? this.emailBodyText,
      emailBodyHtml: emailBodyHtml ?? this.emailBodyHtml,
      emailBodyPreview: emailBodyPreview ?? this.emailBodyPreview,
      attachmentNames: attachmentNames ?? this.attachmentNames,
      shouldProcess: shouldProcess ?? this.shouldProcess,
      matchedKeywords: matchedKeywords ?? this.matchedKeywords,
      extractedSubject: extractedSubject ?? this.extractedSubject,
      keywordStats: keywordStats ?? this.keywordStats,
      node3Executed: node3Executed ?? this.node3Executed,
      node3Status: node3Status ?? this.node3Status,
      verificationLinks: verificationLinks ?? this.verificationLinks,
      primaryVerificationLink: primaryVerificationLink ?? this.primaryVerificationLink,
      targetUserEmail: targetUserEmail ?? this.targetUserEmail,
      linkQuality: linkQuality ?? this.linkQuality,
      extractionCompleteness: extractionCompleteness ?? this.extractionCompleteness,
      node4Executed: node4Executed ?? this.node4Executed,
      node4Status: node4Status ?? this.node4Status,
      totalAttachments: totalAttachments ?? this.totalAttachments,
      pdfAttachments: pdfAttachments ?? this.pdfAttachments,
      successfulProcessing: successfulProcessing ?? this.successfulProcessing,
      failedProcessing: failedProcessing ?? this.failedProcessing,
      processingResults: processingResults ?? this.processingResults,
      mappedUserId: mappedUserId ?? this.mappedUserId,
      mappingMethod: mappingMethod ?? this.mappingMethod,
      mappingError: mappingError ?? this.mappingError,
      errorSummary: errorSummary ?? this.errorSummary,
      totalProcessingTime: totalProcessingTime ?? this.totalProcessingTime,
      node2RawOutput: node2RawOutput ?? this.node2RawOutput,
      node3RawOutput: node3RawOutput ?? this.node3RawOutput,
      node4RawOutput: node4RawOutput ?? this.node4RawOutput,
      triggerRawData: triggerRawData ?? this.triggerRawData,
      recommendations: recommendations ?? this.recommendations,
    );
  }
}