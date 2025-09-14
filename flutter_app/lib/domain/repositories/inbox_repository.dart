/// 收件箱数据仓库接口
/// 定义收件箱相关的数据操作契约
library;

import '../entities/email_record.dart';
import '../entities/email_detail.dart';
import '../entities/inbox_stats.dart';
import '../entities/email_filters.dart';
import '../../core/error/result.dart';

abstract class InboxRepository {
  /// 获取用户邮件列表
  /// 
  /// [userId] 用户ID
  /// [page] 页码，从1开始
  /// [pageSize] 每页数量
  /// [filters] 过滤条件
  /// 
  /// 返回邮件列表和总数信息
  Future<Result<({List<EmailRecord> emails, int totalCount})>> getUserEmails({
    required String userId,
    required int page,
    required int pageSize,
    EmailFilters? filters,
  });

  /// 获取邮件详情
  /// 
  /// [emailId] 邮件ID
  /// [userId] 用户ID
  /// 
  /// 返回邮件详细信息
  Future<Result<EmailDetail>> getEmailDetail({
    required String emailId,
    required String userId,
  });

  /// 获取收件箱统计信息
  /// 
  /// [userId] 用户ID
  /// 
  /// 返回统计信息
  Future<Result<InboxStats>> getInboxStats({
    required String userId,
  });

  /// 标记邮件为已读
  /// 
  /// [emailId] 邮件ID
  /// [userId] 用户ID
  Future<Result<void>> markEmailAsRead({
    required String emailId,
    required String userId,
  });

  /// 删除邮件
  /// 
  /// [emailId] 邮件ID
  /// [userId] 用户ID
  Future<Result<void>> deleteEmail({
    required String emailId,
    required String userId,
  });

  /// 批量操作邮件
  /// 
  /// [emailIds] 邮件ID列表
  /// [userId] 用户ID
  /// [action] 操作类型：'read', 'delete'
  Future<Result<void>> batchEmailOperation({
    required List<String> emailIds,
    required String userId,
    required String action,
  });
}