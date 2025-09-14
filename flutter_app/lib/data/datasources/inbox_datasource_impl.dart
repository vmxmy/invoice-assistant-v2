/// 收件箱数据源实现
/// 与Supabase交互获取邮件数据
library;

import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/error/exceptions.dart';
import '../models/email_record_model.dart';
import '../models/email_detail_model.dart';
import '../models/inbox_stats_model.dart';
import '../../domain/entities/email_filters.dart';
import 'inbox_datasource.dart';

class InboxDataSourceImpl implements InboxDataSource {
  final SupabaseClient supabaseClient;

  InboxDataSourceImpl({required this.supabaseClient});

  @override
  Future<List<EmailRecordModel>> getUserEmails({
    required String userId,
    required int page,
    required int pageSize,
    EmailFilters? filters,
  }) async {
    try {
      // 调用数据库RPC函数，对应Web项目的 get_user_emails
      final response = await supabaseClient.rpc('get_user_emails', params: {
        'user_uuid': userId,
        'limit_count': pageSize,
        'offset_count': (page - 1) * pageSize,
        'category_filter': filters?.category,
        'status_filter': filters?.status,
        'search_query': filters?.search?.isNotEmpty == true ? filters!.search : null,
      });

      if (response == null) {
        return [];
      }

      // 将响应转换为EmailRecordModel列表
      final List<dynamic> data = response as List<dynamic>;
      return data.map((json) => EmailRecordModel.fromJson(json as Map<String, dynamic>)).toList();
    } catch (e) {
      throw ServerException(
        message: '获取邮件列表失败: ${e.toString()}',
        statusCode: 500,
      );
    }
  }

  @override
  Future<EmailDetailModel> getEmailDetail({
    required String emailId,
    required String userId,
  }) async {
    try {
      // 调用数据库RPC函数，对应Web项目的 get_email_detail
      final response = await supabaseClient.rpc('get_email_detail', params: {
        'email_id': emailId,
        'user_uuid': userId,
      });


      if (response == null) {
        throw ServerException(
          message: '邮件不存在或无权限访问',
          statusCode: 404,
        );
      }

      // 处理不同的响应格式
      Map<String, dynamic> emailData;
      
      if (response is List) {
        if (response.isEmpty) {
          throw ServerException(
            message: '邮件不存在或无权限访问',
            statusCode: 404,
          );
        }
        // 安全地转换列表中的第一个元素
        final firstItem = response.first;
        if (firstItem is Map<String, dynamic>) {
          emailData = firstItem;
        } else {
          throw ServerException(
            message: '邮件数据格式错误: 期望Map<String, dynamic>，实际获得${firstItem.runtimeType}',
            statusCode: 500,
          );
        }
      } else if (response is Map<String, dynamic>) {
        emailData = response;
      } else {
        throw ServerException(
          message: '服务器返回数据格式错误: ${response.runtimeType}',
          statusCode: 500,
        );
      }

      return EmailDetailModel.fromJson(emailData);
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException(
        message: '获取邮件详情失败: ${e.toString()}',
        statusCode: 500,
      );
    }
  }

  @override
  Future<InboxStatsModel> getInboxStats({
    required String userId,
  }) async {
    try {
      // 调用数据库RPC函数，对应Web项目的 get_user_inbox_stats
      final response = await supabaseClient.rpc('get_user_inbox_stats', params: {
        'user_uuid': userId,
      });

      if (response == null) {
        // 返回空统计信息
        return const InboxStatsModel(
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
      }

      return InboxStatsModel.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      throw ServerException(
        message: '获取收件箱统计失败: ${e.toString()}',
        statusCode: 500,
      );
    }
  }

  @override
  Future<({List<EmailRecordModel> emails, int totalCount})> queryInboxView({
    required String userId,
    EmailFilters? filters,
    int page = 1,
    int pageSize = 20,
  }) async {
    // 备用方法：直接使用getUserEmails的结果
    final emails = await getUserEmails(
      userId: userId,
      filters: filters,
      page: page,
      pageSize: pageSize,
    );
    
    return (
      emails: emails,
      totalCount: emails.length,
    );
  }

  @override
  Future<void> markEmailAsRead({
    required String emailId,
    required String userId,
  }) async {
    try {
      // TODO: 实现标记已读功能
      // 这里可能需要更新邮件的已读状态或调用相应的RPC函数
      await supabaseClient.rpc('mark_email_as_read', params: {
        'email_id': emailId,
        'user_uuid': userId,
      });
    } catch (e) {
      throw ServerException(
        message: '标记邮件已读失败: ${e.toString()}',
        statusCode: 500,
      );
    }
  }

  @override
  Future<void> deleteEmail({
    required String emailId,
    required String userId,
  }) async {
    try {
      // TODO: 实现删除邮件功能
      // 这里可能需要软删除或调用相应的RPC函数
      await supabaseClient.rpc('delete_user_email', params: {
        'email_id': emailId,
        'user_uuid': userId,
      });
    } catch (e) {
      throw ServerException(
        message: '删除邮件失败: ${e.toString()}',
        statusCode: 500,
      );
    }
  }

  @override
  Future<void> batchEmailOperation({
    required List<String> emailIds,
    required String userId,
    required String action,
  }) async {
    try {
      // TODO: 实现批量操作功能
      await supabaseClient.rpc('batch_email_operation', params: {
        'email_ids': emailIds,
        'user_uuid': userId,
        'action': action,
      });
    } catch (e) {
      throw ServerException(
        message: '批量操作失败: ${e.toString()}',
        statusCode: 500,
      );
    }
  }
}