/// 邮件详情数据模型
/// 用于从Supabase响应转换为EmailDetail实体
library;

import '../../domain/entities/email_detail.dart';
import 'email_record_model.dart';

class EmailDetailModel extends EmailDetail {
  const EmailDetailModel({
    required super.baseInfo,
    super.emailBodyText,
    super.emailBodyHtml,
    super.emailBodyPreview,
    super.attachmentNames,
    super.shouldProcess,
    super.matchedKeywords,
    super.extractedSubject,
    super.keywordStats,
    required super.node3Executed,
    super.node3Status,
    super.verificationLinks,
    super.primaryVerificationLink,
    super.targetUserEmail,
    super.linkQuality,
    super.extractionCompleteness,
    required super.node4Executed,
    super.node4Status,
    super.totalAttachments,
    super.pdfAttachments,
    super.successfulProcessing,
    super.failedProcessing,
    super.processingResults,
    super.mappedUserId,
    super.mappingMethod,
    super.mappingError,
    super.errorSummary,
    super.totalProcessingTime,
    super.node2RawOutput,
    super.node3RawOutput,
    super.node4RawOutput,
    super.triggerRawData,
    super.recommendations,
  });

  /// 从Supabase JSON响应创建模型
  factory EmailDetailModel.fromJson(Map<String, dynamic> json) {
    print('🔍 EmailDetailModel.fromJson 输入数据: ${json.keys}');
    
    try {
      // 先创建基础邮件记录信息
      final baseInfo = EmailRecordModel.fromJson(json);
      print('✅ 基础邮件记录创建成功');

      return EmailDetailModel(
        baseInfo: baseInfo,
        emailBodyText: json['email_body_text']?.toString(),
        emailBodyHtml: json['email_body_html']?.toString(),
        emailBodyPreview: json['email_body_preview']?.toString(),
        attachmentNames: _safeStringList(json['attachment_names']),
        shouldProcess: json['should_process'] as bool?,
        matchedKeywords: _safeStringList(json['matched_keywords']),
        extractedSubject: json['extracted_subject']?.toString(),
        keywordStats: _safeMap(json['keyword_stats']),
        node3Executed: json['node3_executed'] as bool? ?? false,
        node3Status: json['node3_status']?.toString(),
        verificationLinks: _safeMap(json['verification_links']),
        primaryVerificationLink: json['primary_verification_link']?.toString(),
        targetUserEmail: json['target_user_email']?.toString(),
        linkQuality: json['link_quality']?.toString(),
        extractionCompleteness: json['extraction_completeness']?.toString(),
        node4Executed: json['node4_executed'] as bool? ?? false,
        node4Status: json['node4_status']?.toString(),
        totalAttachments: _safeInt(json['total_attachments']),
        pdfAttachments: _safeInt(json['pdf_attachments']),
        successfulProcessing: _safeInt(json['successful_processing']),
        failedProcessing: _safeInt(json['failed_processing']),
        processingResults: _safeMap(json['processing_results']),
        mappedUserId: json['mapped_user_id']?.toString(),
        mappingMethod: json['mapping_method']?.toString(),
        mappingError: json['mapping_error']?.toString(),
        errorSummary: json['error_summary']?.toString(),
        totalProcessingTime: _safeInt(json['total_processing_time']),
        node2RawOutput: _safeMap(json['node2_raw_output']),
        node3RawOutput: _safeMap(json['node3_raw_output']),
        node4RawOutput: _safeMap(json['node4_raw_output']),
        triggerRawData: _safeMap(json['trigger_raw_data']),
        recommendations: _safeStringList(json['recommendations']),
      );
    } catch (e) {
      print('❌ EmailDetailModel.fromJson 解析失败: $e');
      rethrow;
    }
  }

  /// 安全地解析字符串列表
  static List<String>? _safeStringList(dynamic value) {
    if (value == null) return null;
    if (value is List) {
      return value.map((e) => e.toString()).toList();
    }
    return null;
  }

  /// 安全地解析Map
  static Map<String, dynamic>? _safeMap(dynamic value) {
    if (value == null) return null;
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    return null;
  }

  /// 安全地解析整数
  static int? _safeInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) {
      return int.tryParse(value);
    }
    return null;
  }

  /// 转换为JSON
  Map<String, dynamic> toJson() {
    final baseJson = (baseInfo as EmailRecordModel).toJson();
    
    return {
      ...baseJson,
      'email_body_text': emailBodyText,
      'email_body_html': emailBodyHtml,
      'email_body_preview': emailBodyPreview,
      'attachment_names': attachmentNames,
      'should_process': shouldProcess,
      'matched_keywords': matchedKeywords,
      'extracted_subject': extractedSubject,
      'keyword_stats': keywordStats,
      'node3_executed': node3Executed,
      'node3_status': node3Status,
      'verification_links': verificationLinks,
      'primary_verification_link': primaryVerificationLink,
      'target_user_email': targetUserEmail,
      'link_quality': linkQuality,
      'extraction_completeness': extractionCompleteness,
      'node4_executed': node4Executed,
      'node4_status': node4Status,
      'total_attachments': totalAttachments,
      'pdf_attachments': pdfAttachments,
      'successful_processing': successfulProcessing,
      'failed_processing': failedProcessing,
      'processing_results': processingResults,
      'mapped_user_id': mappedUserId,
      'mapping_method': mappingMethod,
      'mapping_error': mappingError,
      'error_summary': errorSummary,
      'total_processing_time': totalProcessingTime,
      'node2_raw_output': node2RawOutput,
      'node3_raw_output': node3RawOutput,
      'node4_raw_output': node4RawOutput,
      'trigger_raw_data': triggerRawData,
      'recommendations': recommendations,
    };
  }

  /// 转换为实体
  EmailDetail toEntity() {
    return EmailDetail(
      baseInfo: baseInfo,
      emailBodyText: emailBodyText,
      emailBodyHtml: emailBodyHtml,
      emailBodyPreview: emailBodyPreview,
      attachmentNames: attachmentNames,
      shouldProcess: shouldProcess,
      matchedKeywords: matchedKeywords,
      extractedSubject: extractedSubject,
      keywordStats: keywordStats,
      node3Executed: node3Executed,
      node3Status: node3Status,
      verificationLinks: verificationLinks,
      primaryVerificationLink: primaryVerificationLink,
      targetUserEmail: targetUserEmail,
      linkQuality: linkQuality,
      extractionCompleteness: extractionCompleteness,
      node4Executed: node4Executed,
      node4Status: node4Status,
      totalAttachments: totalAttachments,
      pdfAttachments: pdfAttachments,
      successfulProcessing: successfulProcessing,
      failedProcessing: failedProcessing,
      processingResults: processingResults,
      mappedUserId: mappedUserId,
      mappingMethod: mappingMethod,
      mappingError: mappingError,
      errorSummary: errorSummary,
      totalProcessingTime: totalProcessingTime,
      node2RawOutput: node2RawOutput,
      node3RawOutput: node3RawOutput,
      node4RawOutput: node4RawOutput,
      triggerRawData: triggerRawData,
      recommendations: recommendations,
    );
  }

  /// 从实体创建模型
  factory EmailDetailModel.fromEntity(EmailDetail entity) {
    return EmailDetailModel(
      baseInfo: entity.baseInfo,
      emailBodyText: entity.emailBodyText,
      emailBodyHtml: entity.emailBodyHtml,
      emailBodyPreview: entity.emailBodyPreview,
      attachmentNames: entity.attachmentNames,
      shouldProcess: entity.shouldProcess,
      matchedKeywords: entity.matchedKeywords,
      extractedSubject: entity.extractedSubject,
      keywordStats: entity.keywordStats,
      node3Executed: entity.node3Executed,
      node3Status: entity.node3Status,
      verificationLinks: entity.verificationLinks,
      primaryVerificationLink: entity.primaryVerificationLink,
      targetUserEmail: entity.targetUserEmail,
      linkQuality: entity.linkQuality,
      extractionCompleteness: entity.extractionCompleteness,
      node4Executed: entity.node4Executed,
      node4Status: entity.node4Status,
      totalAttachments: entity.totalAttachments,
      pdfAttachments: entity.pdfAttachments,
      successfulProcessing: entity.successfulProcessing,
      failedProcessing: entity.failedProcessing,
      processingResults: entity.processingResults,
      mappedUserId: entity.mappedUserId,
      mappingMethod: entity.mappingMethod,
      mappingError: entity.mappingError,
      errorSummary: entity.errorSummary,
      totalProcessingTime: entity.totalProcessingTime,
      node2RawOutput: entity.node2RawOutput,
      node3RawOutput: entity.node3RawOutput,
      node4RawOutput: entity.node4RawOutput,
      triggerRawData: entity.triggerRawData,
      recommendations: entity.recommendations,
    );
  }
}