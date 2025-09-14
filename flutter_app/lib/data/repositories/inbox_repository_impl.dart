/// 收件箱仓库实现
/// 实现数据层到业务层的转换
library;

import '../../core/error/exceptions.dart';
import '../../core/error/result.dart';
import '../../domain/entities/email_record.dart';
import '../../domain/entities/email_detail.dart';
import '../../domain/entities/inbox_stats.dart';
import '../../domain/entities/email_filters.dart';
import '../../domain/repositories/inbox_repository.dart';
import '../datasources/inbox_datasource.dart';

class InboxRepositoryImpl implements InboxRepository {
  final InboxDataSource dataSource;

  InboxRepositoryImpl({required this.dataSource});

  @override
  Future<Result<({List<EmailRecord> emails, int totalCount})>> getUserEmails({
    required String userId,
    required int page,
    required int pageSize,
    EmailFilters? filters,
  }) async {
    try {
      final emailModels = await dataSource.getUserEmails(
        userId: userId,
        page: page,
        pageSize: pageSize,
        filters: filters,
      );

      // 转换为实体并获取总数
      final emails = emailModels.map((model) => model.toEntity()).toList();
      final totalCount = emailModels.isNotEmpty ? emailModels.first.totalCount ?? 0 : 0;

      return Result.success((emails: emails, totalCount: totalCount));
    } on ServerException catch (e) {
      return Result.failure(e.message);
    } catch (e) {
      return Result.failure('获取邮件列表时发生未知错误: ${e.toString()}');
    }
  }

  @override
  Future<Result<EmailDetail>> getEmailDetail({
    required String emailId,
    required String userId,
  }) async {
    try {
      final emailDetailModel = await dataSource.getEmailDetail(
        emailId: emailId,
        userId: userId,
      );

      return Result.success(emailDetailModel);
    } on ServerException catch (e) {
      return Result.failure(e.message);
    } catch (e) {
      return Result.failure('获取邮件详情时发生未知错误: ${e.toString()}');
    }
  }

  @override
  Future<Result<InboxStats>> getInboxStats({
    required String userId,
  }) async {
    try {
      final statsModel = await dataSource.getInboxStats(userId: userId);
      return Result.success(statsModel.toEntity());
    } on ServerException catch (e) {
      return Result.failure(e.message);
    } catch (e) {
      return Result.failure('获取收件箱统计时发生未知错误: ${e.toString()}');
    }
  }

  @override
  Future<Result<void>> markEmailAsRead({
    required String emailId,
    required String userId,
  }) async {
    try {
      await dataSource.markEmailAsRead(
        emailId: emailId,
        userId: userId,
      );
      return Result.success(null);
    } on ServerException catch (e) {
      return Result.failure(e.message);
    } catch (e) {
      return Result.failure('标记邮件已读时发生未知错误: ${e.toString()}');
    }
  }

  @override
  Future<Result<void>> deleteEmail({
    required String emailId,
    required String userId,
  }) async {
    try {
      await dataSource.deleteEmail(
        emailId: emailId,
        userId: userId,
      );
      return Result.success(null);
    } on ServerException catch (e) {
      return Result.failure(e.message);
    } catch (e) {
      return Result.failure('删除邮件时发生未知错误: ${e.toString()}');
    }
  }

  @override
  Future<Result<void>> batchEmailOperation({
    required List<String> emailIds,
    required String userId,
    required String action,
  }) async {
    try {
      await dataSource.batchEmailOperation(
        emailIds: emailIds,
        userId: userId,
        action: action,
      );
      return Result.success(null);
    } on ServerException catch (e) {
      return Result.failure(e.message);
    } catch (e) {
      return Result.failure('批量操作邮件时发生未知错误: ${e.toString()}');
    }
  }

  /// 使用备用查询方法获取邮件列表
  /// 当RPC函数不可用时的备选方案
  Future<Result<({List<EmailRecord> emails, int totalCount})>> getUserEmailsViaView({
    required String userId,
    required int page,
    required int pageSize,
    EmailFilters? filters,
  }) async {
    try {
      final result = await dataSource.queryInboxView(
        userId: userId,
        filters: filters,
        page: page,
        pageSize: pageSize,
      );

      final emails = result.emails.map((model) => model.toEntity()).toList();
      
      return Result.success((emails: emails, totalCount: result.totalCount));
    } on ServerException catch (e) {
      return Result.failure(e.message);
    } catch (e) {
      return Result.failure('查询邮件视图时发生未知错误: ${e.toString()}');
    }
  }
}