/// 收件箱数据源接口
/// 定义与外部服务（Supabase）交互的数据访问接口
library;

import '../models/email_record_model.dart';
import '../models/email_detail_model.dart';
import '../models/inbox_stats_model.dart';
import '../../domain/entities/email_filters.dart';

abstract class InboxDataSource {
  /// 调用Supabase RPC函数获取用户邮件列表
  ///
  /// [userId] 用户UUID
  /// [page] 页码
  /// [pageSize] 每页数量
  /// [filters] 过滤条件
  Future<List<EmailRecordModel>> getUserEmails({
    required String userId,
    required int page,
    required int pageSize,
    EmailFilters? filters,
  });

  /// 调用Supabase RPC函数获取邮件详情
  ///
  /// [emailId] 邮件ID
  /// [userId] 用户UUID
  Future<EmailDetailModel> getEmailDetail({
    required String emailId,
    required String userId,
  });

  /// 调用Supabase RPC函数获取收件箱统计
  ///
  /// [userId] 用户UUID
  Future<InboxStatsModel> getInboxStats({
    required String userId,
  });

  /// 直接查询收件箱视图（备用方法）
  ///
  /// [userId] 用户ID
  /// [filters] 过滤条件
  /// [page] 页码
  /// [pageSize] 每页数量
  Future<({List<EmailRecordModel> emails, int totalCount})> queryInboxView({
    required String userId,
    EmailFilters? filters,
    int page = 1,
    int pageSize = 20,
  });

  /// 标记邮件为已读
  Future<void> markEmailAsRead({
    required String emailId,
    required String userId,
  });

  /// 删除邮件
  Future<void> deleteEmail({
    required String emailId,
    required String userId,
  });

  /// 批量邮件操作
  Future<void> batchEmailOperation({
    required List<String> emailIds,
    required String userId,
    required String action,
  });
}
