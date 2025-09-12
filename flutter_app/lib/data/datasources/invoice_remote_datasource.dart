import '../../core/utils/logger.dart';
import 'dart:typed_data';
import 'dart:convert';
// import 'package:supabase_flutter/supabase_flutter.dart'; // 未使用
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../models/invoice_model.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../domain/repositories/invoice_repository.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/usecases/upload_invoice_usecase.dart';
import '../../core/network/supabase_client.dart';
import '../../core/config/app_config.dart';
import '../../core/config/supabase_config.dart';

/// 发票远程数据源 - 负责与Supabase API交互
abstract class InvoiceRemoteDataSource {
  Future<List<InvoiceModel>> getInvoices({
    int page = 1,
    int pageSize = 20,
    InvoiceFilters? filters,
    String sortField = 'created_at',
    bool sortAscending = false,
  });

  Future<int> getInvoicesCount({InvoiceFilters? filters});
  Future<InvoiceModel> getInvoiceById(String id);
  Future<InvoiceModel> createInvoice(CreateInvoiceRequest request);
  Future<InvoiceModel> updateInvoice(String id, UpdateInvoiceRequest request);
  Future<void> updateInvoiceStatus(String id, InvoiceStatus status);
  Future<void> deleteInvoice(String id);
  Future<void> deleteInvoices(List<String> ids);
  Future<InvoiceStats> getInvoiceStats();
  Future<UploadInvoiceResult> uploadInvoice({
    required Uint8List fileBytes,
    required String fileName,
    required String fileHash,
  });
}

class InvoiceRemoteDataSourceImpl implements InvoiceRemoteDataSource {
  static const String _tableName = 'invoices';
  static const String _viewName = 'v_invoice_detail'; // 使用与web项目相同的视图

  @override
  Future<List<InvoiceModel>> getInvoices({
    int page = 1,
    int pageSize = 20, // 设置为20以测试无限滚动
    InvoiceFilters? filters,
    String sortField = 'created_at',
    bool sortAscending = false,
  }) async {
    try {
      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '🔍 [RemoteDataSource] getInvoices 调用 - filters: $filters',
            tag: 'Debug');
        AppLogger.debug(
            '🔍 [RemoteDataSource] getInvoices 参数 - page: $page, pageSize: $pageSize',
            tag: 'Debug');
      }

      // 验证认证状态
      final session = SupabaseClientManager.client.auth.currentSession;
      final currentUser = SupabaseClientManager.currentUser;

      if (session == null || currentUser == null) {
        if (AppConfig.enableLogging) {
          AppLogger.debug(
              '❌ [RemoteDataSource] 用户未认证 - Session: ${session != null}, User: ${currentUser?.email}',
              tag: 'Debug');
        }
        throw Exception('用户未登录或会话已过期');
      }

      // 检查会话是否过期
      if (session.expiresAt != null &&
          DateTime.now().millisecondsSinceEpoch > session.expiresAt! * 1000) {
        if (AppConfig.enableLogging) {
          AppLogger.debug('❌ [RemoteDataSource] 用户会话已过期', tag: 'Debug');
        }
        throw Exception('用户会话已过期，请重新登录');
      }

      if (AppConfig.enableLogging) {
        AppLogger.debug('🔍 [RemoteDataSource] 查询发票 - 用户ID: ${currentUser.id}',
            tag: 'Debug');
        AppLogger.debug('🔍 [RemoteDataSource] 用户邮箱: ${currentUser.email}',
            tag: 'Debug');
        AppLogger.debug(
            '🔍 [RemoteDataSource] 会话状态 - 过期时间: ${DateTime.fromMillisecondsSinceEpoch(session.expiresAt! * 1000)}',
            tag: 'Debug');
        AppLogger.debug(
            '🔍 [RemoteDataSource] 分页参数 - page: $page, pageSize: $pageSize',
            tag: 'Debug');
      }

      // 构建基础查询
      var query = SupabaseClientManager.from(_viewName)
          .select()
          .eq('user_id', currentUser.id)
          .neq('status', 'deleted');

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '🔍 [RemoteDataSource] 查询条件 - 表: $_viewName, user_id: ${currentUser.id}, status != deleted',
            tag: 'Debug');
      }

      // 应用筛选条件 (重置逻辑已在_applyFilters内部处理)
      if (filters != null) {
        if (AppConfig.enableLogging) {
          AppLogger.debug('🔍 [RemoteDataSource] 主查询开始应用筛选条件', tag: 'Debug');
        }
        query = _applyFilters(query, filters);
        if (AppConfig.enableLogging) {
          AppLogger.debug('🔍 [RemoteDataSource] 主查询筛选条件应用完成', tag: 'Debug');
        }
      } else {
        if (AppConfig.enableLogging) {
          AppLogger.debug('🔍 [RemoteDataSource] 主查询无筛选条件，使用基础查询',
              tag: 'Debug');
        }
      }

      // 先执行一个简单查询检查用户的记录数
      if (AppConfig.enableLogging) {
        try {
          final debugQuery = SupabaseClientManager.from(_tableName)
              .select('id, user_id, status')
              .eq('user_id', currentUser.id)
              .neq('status', 'deleted');
          final debugResponse = await debugQuery;
          AppLogger.debug('🔍 [调试] 用户发票总记录数: ${debugResponse.length}',
              tag: 'Debug');
          if (debugResponse.isNotEmpty) {
            // final firstRecord = debugResponse[0]; // 未使用
            // print('🔍 [调试] 第一条记录: user_id=${firstRecord['user_id']}, status=${firstRecord['status']}');
          }
        } catch (e) {
          AppLogger.debug('⚠️ [调试] 调试查询失败: $e', tag: 'Debug');
        }
      }

      // 添加详细的查询调试
      if (AppConfig.enableLogging) {
        AppLogger.debug('🔍 [RemoteDataSource] 准备执行最终查询', tag: 'Debug');
        AppLogger.debug('🔍 [RemoteDataSource] 查询对象类型: ${query.runtimeType}',
            tag: 'Debug');
        AppLogger.debug(
            '🔍 [RemoteDataSource] 排序字段: $sortField, 升序: $sortAscending',
            tag: 'Debug');
        AppLogger.debug(
            '🔍 [RemoteDataSource] 分页范围: ${(page - 1) * pageSize} - ${page * pageSize - 1}',
            tag: 'Debug');

        // 先执行一个不分页的查询来验证总记录数
        try {
          final fullQuery = SupabaseClientManager.from(_viewName)
              .select('id')
              .eq('user_id', currentUser.id)
              .neq('status', 'deleted');

          final fullQueryWithFilters =
              filters != null ? _applyFilters(fullQuery, filters) : fullQuery;
          final fullResponse = await fullQueryWithFilters;
          AppLogger.debug(
              '🔍 [RemoteDataSource] 验证查询: 不分页时共${fullResponse.length}条记录',
              tag: 'Debug');
        } catch (e) {
          AppLogger.debug('⚠️ [RemoteDataSource] 验证查询失败: $e', tag: 'Debug');
        }
      }

      // 执行查询并获取结果
      final response = await query
          .order(sortField, ascending: sortAscending)
          .range((page - 1) * pageSize, page * pageSize - 1);

      if (AppConfig.enableLogging) {
        AppLogger.debug('✅ [RemoteDataSource] 查询执行成功: ${response.length}条记录',
            tag: 'Debug');
        AppLogger.debug(
            '🔍 [RemoteDataSource] 分页范围: ${(page - 1) * pageSize} - ${page * pageSize - 1}',
            tag: 'Debug');
        AppLogger.debug('🔍 [RemoteDataSource] 期望记录数: 最多$pageSize条',
            tag: 'Debug');
      }

      // 如果是逾期筛选，额外打印调试信息
      if (filters?.overdue == true) {
        AppLogger.debug('🔍 [RemoteDataSource] 逾期筛选结果: ${response.length}条记录',
            tag: 'Debug');
        AppLogger.debug(
            '🔍 [RemoteDataSource] 预期：应该只返回消费日期在2025-06-13之前且未报销的发票',
            tag: 'Debug');
      }

      // 转换为数据模型
      final invoiceModels = (response as List<dynamic>).map((item) {
        final jsonData = item as Map<String, dynamic>;

        // 添加调试日志检查数据库字段
        if (AppConfig.enableLogging) {
          // print('🔍 [RemoteDataSource] 原始数据 ID: ${jsonData['id']}');
          // print('🔍 [RemoteDataSource] category: "${jsonData['category']}"');
          // print('🔍 [RemoteDataSource] expense_category: "${jsonData['expense_category']}"');
          // print('🔍 [RemoteDataSource] primary_category_name: "${jsonData['primary_category_name']}"');
        }

        // 处理字符串 "null" 值，转换为真正的 null
        if (jsonData['category'] == 'null') {
          jsonData['category'] = null;
        }
        if (jsonData['expense_category'] == 'null') {
          jsonData['expense_category'] = null;
        }
        if (jsonData['primary_category_name'] == 'null') {
          jsonData['primary_category_name'] = null;
        }

        final model = InvoiceModel.fromJson(jsonData);

        // 检查模型转换后的值
        if (AppConfig.enableLogging) {
          AppLogger.debug('🔍 [RemoteDataSource] 模型转换后 ID: ${model.id}',
              tag: 'Debug');
          AppLogger.debug(
              '🔍 [RemoteDataSource] 模型.category: "${model.category}"',
              tag: 'Debug');
          AppLogger.debug(
              '🔍 [RemoteDataSource] 模型.expenseCategory: "${model.expenseCategory}"',
              tag: 'Debug');
          AppLogger.debug(
              '🔍 [RemoteDataSource] 模型.primaryCategoryName: "${model.primaryCategoryName}"',
              tag: 'Debug');
        }

        return model;
      }).toList();

      return invoiceModels;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [RemoteDataSource] 获取发票列表失败: $e', tag: 'Debug');
      }
      rethrow;
    }
  }

  @override
  Future<int> getInvoicesCount({InvoiceFilters? filters}) async {
    try {
      final currentUser = SupabaseClientManager.currentUser;
      if (currentUser == null) {
        throw Exception('用户未登录');
      }

      // 构建计数查询 - 为了与主查询保持一致，使用相同的重置逻辑
      var countQuery = SupabaseClientManager.from(_viewName)
          .select('id')
          .eq('user_id', currentUser.id)
          .neq('status', 'deleted');

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '🔍 [RemoteDataSource] 构建总数查询: user_id=${currentUser.id}, status != deleted',
            tag: 'Debug');
      }

      // 应用筛选条件 (重置逻辑已在_applyFilters内部处理)
      if (filters != null) {
        countQuery = _applyFilters(countQuery, filters);
      }

      // 执行计数查询
      final response = await countQuery;
      final count = (response as List).length;

      if (AppConfig.enableLogging) {
        AppLogger.debug('✅ [RemoteDataSource] 获取发票总数成功: $count条记录',
            tag: 'Debug');
      }

      return count;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [RemoteDataSource] 获取发票总数失败: $e', tag: 'Debug');
      }
      rethrow;
    }
  }

  @override
  Future<InvoiceModel> getInvoiceById(String id) async {
    try {
      final currentUser = SupabaseClientManager.currentUser;
      if (currentUser == null) {
        throw Exception('用户未登录');
      }

      final response = await SupabaseClientManager.from(_tableName)
          .select()
          .eq('id', id)
          .eq('user_id', currentUser.id)
          .single();

      return InvoiceModel.fromJson(response);
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [RemoteDataSource] 获取发票详情失败: $e', tag: 'Debug');
      }
      rethrow;
    }
  }

  @override
  Future<InvoiceModel> createInvoice(CreateInvoiceRequest request) async {
    try {
      final currentUser = SupabaseClientManager.currentUser;
      if (currentUser == null) {
        throw Exception('用户未登录');
      }

      final data = {
        'invoice_number': request.invoiceNumber,
        'invoice_date': request.invoiceDate.toIso8601String(),
        'consumption_date': request.consumptionDate?.toIso8601String(),
        'user_id': currentUser.id,
        'seller_name': request.sellerName,
        'buyer_name': request.buyerName,
        'amount_without_tax': request.amount,
        'total_amount': request.totalAmount,
        'tax_amount': request.taxAmount,
        'currency': request.currency,
        'category': request.category,
        'invoice_type': request.invoiceType,
        'file_url': request.fileUrl,
        'file_path': request.filePath,
        'extracted_data': request.extractedData ?? {},
        'status': 'pending',
        'created_at': DateTime.now().toIso8601String(),
        'updated_at': DateTime.now().toIso8601String(),
      };

      final response = await SupabaseClientManager.from(_tableName)
          .insert(data)
          .select()
          .single();

      return InvoiceModel.fromJson(response);
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [RemoteDataSource] 创建发票失败: $e', tag: 'Debug');
      }
      rethrow;
    }
  }

  @override
  Future<InvoiceModel> updateInvoice(
      String id, UpdateInvoiceRequest request) async {
    try {
      final currentUser = SupabaseClientManager.currentUser;
      if (currentUser == null) {
        throw Exception('用户未登录');
      }

      final data = <String, dynamic>{
        'updated_at': DateTime.now().toIso8601String(),
      };

      // 只更新提供的字段
      if (request.invoiceNumber != null) {
        data['invoice_number'] = request.invoiceNumber;
      }
      if (request.invoiceDate != null) {
        data['invoice_date'] = request.invoiceDate!.toIso8601String();
      }
      if (request.consumptionDate != null) {
        data['consumption_date'] = request.consumptionDate!.toIso8601String();
      }
      if (request.sellerName != null) {
        data['seller_name'] = request.sellerName;
      }
      if (request.buyerName != null) {
        data['buyer_name'] = request.buyerName;
      }
      if (request.amount != null) {
        data['amount_without_tax'] = request.amount;
      }
      if (request.totalAmount != null) {
        data['total_amount'] = request.totalAmount;
      }
      if (request.taxAmount != null) {
        data['tax_amount'] = request.taxAmount;
      }
      if (request.currency != null) {
        data['currency'] = request.currency;
      }
      if (request.category != null) {
        data['category'] = request.category;
      }
      if (request.status != null) {
        data['status'] = request.status!.name;
      }
      if (request.invoiceType != null) {
        data['invoice_type'] = request.invoiceType;
      }
      if (request.fileUrl != null) {
        data['file_url'] = request.fileUrl;
      }
      if (request.filePath != null) {
        data['file_path'] = request.filePath;
      }
      if (request.isVerified != null) {
        data['is_verified'] = request.isVerified;
      }
      if (request.verificationNotes != null) {
        data['verification_notes'] = request.verificationNotes;
      }
      if (request.extractedData != null) {
        data['extracted_data'] = request.extractedData;
      }

      final response = await SupabaseClientManager.from(_tableName)
          .update(data)
          .eq('id', id)
          .eq('user_id', currentUser.id)
          .select()
          .single();

      return InvoiceModel.fromJson(response);
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [RemoteDataSource] 更新发票失败: $e', tag: 'Debug');
      }
      rethrow;
    }
  }

  @override
  Future<void> updateInvoiceStatus(String id, InvoiceStatus status) async {
    try {
      final currentUser = SupabaseClientManager.currentUser;
      if (currentUser == null) {
        throw Exception('用户未登录');
      }

      if (AppConfig.enableLogging) {
        AppLogger.debug('🔄 [RemoteDataSource] 更新发票状态: $id -> ${status.name}',
            tag: 'Debug');
      }

      await SupabaseClientManager.from(_tableName)
          .update({
            'status': status.name,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', id)
          .eq('user_id', currentUser.id);

      if (AppConfig.enableLogging) {
        AppLogger.debug('✅ [RemoteDataSource] 发票状态更新成功: ${status.displayName}',
            tag: 'Debug');
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [RemoteDataSource] 更新发票状态失败: $e', tag: 'Debug');
      }
      rethrow;
    }
  }

  @override
  Future<void> deleteInvoice(String id) async {
    try {
      final currentUser = SupabaseClientManager.currentUser;
      if (currentUser == null) {
        throw Exception('用户未登录');
      }

      if (AppConfig.enableLogging) {
        AppLogger.debug('🗑️ [RemoteDataSource] 开始永久删除发票: $id', tag: 'Debug');
      }

      // 1. 先获取发票信息，包含文件路径和哈希
      final invoiceResponse = await SupabaseClientManager.from(_tableName)
          .select('file_path, file_hash')
          .eq('id', id)
          .eq('user_id', currentUser.id)
          .single();

      final filePath = invoiceResponse['file_path'] as String?;
      final fileHash = invoiceResponse['file_hash'] as String?;

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '📄 [RemoteDataSource] 发票文件信息 - path: $filePath, hash: $fileHash',
            tag: 'Debug');
      }

      // 2. 删除哈希记录（与Web端顺序保持一致）
      if (fileHash != null) {
        try {
          await SupabaseClientManager.from('file_hashes')
              .delete()
              .eq('file_hash', fileHash)
              .eq('user_id', currentUser.id);

          if (AppConfig.enableLogging) {
            AppLogger.debug('✅ [RemoteDataSource] 哈希记录删除成功', tag: 'Debug');
          }
        } catch (hashError) {
          if (AppConfig.enableLogging) {
            AppLogger.debug('⚠️ [RemoteDataSource] 删除哈希记录失败: $hashError',
                tag: 'Debug');
          }
          // 不抛出异常，允许继续执行
        }
      }

      // 3. 删除数据库记录
      await SupabaseClientManager.from(_tableName)
          .delete()
          .eq('id', id)
          .eq('user_id', currentUser.id);

      if (AppConfig.enableLogging) {
        AppLogger.debug('✅ [RemoteDataSource] 发票记录删除成功', tag: 'Debug');
      }

      // 4. 删除存储桶中的文件
      if (filePath != null && filePath.isNotEmpty) {
        try {
          await SupabaseClientManager.client.storage
              .from('invoice-files')
              .remove([filePath]);

          if (AppConfig.enableLogging) {
            AppLogger.debug('✅ [RemoteDataSource] 存储文件删除成功: $filePath',
                tag: 'Debug');
          }
        } catch (storageError) {
          if (AppConfig.enableLogging) {
            AppLogger.debug('⚠️ [RemoteDataSource] 删除存储文件失败: $storageError',
                tag: 'Debug');
          }
          // 不抛出异常，允许继续执行
        }
      }

      if (AppConfig.enableLogging) {
        AppLogger.debug('🎉 [RemoteDataSource] 发票永久删除完成: $id', tag: 'Debug');
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [RemoteDataSource] 删除发票失败: $e', tag: 'Debug');
      }
      rethrow;
    }
  }

  @override
  Future<void> deleteInvoices(List<String> ids) async {
    try {
      final currentUser = SupabaseClientManager.currentUser;
      if (currentUser == null) {
        throw Exception('用户未登录');
      }

      if (AppConfig.enableLogging) {
        AppLogger.debug('🗑️ [RemoteDataSource] 开始批量永久删除发票: ${ids.length}个',
            tag: 'Debug');
      }

      // 逐个删除发票，确保每个发票都完整删除
      for (final id in ids) {
        await deleteInvoice(id);
      }

      if (AppConfig.enableLogging) {
        AppLogger.debug('🎉 [RemoteDataSource] 批量永久删除完成: ${ids.length}个',
            tag: 'Debug');
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [RemoteDataSource] 批量删除发票失败: $e', tag: 'Debug');
      }
      rethrow;
    }
  }

  @override
  Future<InvoiceStats> getInvoiceStats() async {
    try {
      final currentUser = SupabaseClientManager.currentUser;
      if (currentUser == null) {
        throw Exception('用户未登录');
      }

      // 获取所有发票数据进行统计
      final invoicesResponse = await SupabaseClientManager.from(_tableName)
          .select()
          .eq('user_id', currentUser.id)
          .neq('status', 'deleted');

      final invoicesData = invoicesResponse as List<dynamic>;
      final invoices = invoicesData
          .map((item) => InvoiceModel.fromJson(item as Map<String, dynamic>))
          .toList();

      // 计算统计数据
      final totalCount = invoices.length;
      var monthlyCount = 0;
      var totalAmount = 0.0;
      var monthlyAmount = 0.0;

      final now = DateTime.now();
      final currentMonth = DateTime(now.year, now.month);

      final statusCounts = <String, int>{};
      final categoryAmounts = <String, double>{};
      final sourceCounts = <String, int>{};

      for (final invoice in invoices) {
        // 动态状态统计（基于显示名称）
        final statusKey = invoice.status.displayName;
        statusCounts[statusKey] = (statusCounts[statusKey] ?? 0) + 1;

        // 金额统计
        final amount = invoice.totalAmount ?? invoice.amount;
        totalAmount += amount;

        // 本月金额和数量统计
        if (invoice.invoiceDate.isAfter(currentMonth) ||
            invoice.invoiceDate.isAtSameMomentAs(currentMonth)) {
          monthlyAmount += amount;
          monthlyCount++;
        }

        // 分类金额统计
        if (invoice.category != null) {
          categoryAmounts[invoice.category!] =
              (categoryAmounts[invoice.category!] ?? 0.0) + amount;
        }

        // 来源统计
        final sourceKey = invoice.source.displayName;
        sourceCounts[sourceKey] = (sourceCounts[sourceKey] ?? 0) + 1;
      }

      // 计算平均金额
      final averageAmount = totalCount > 0 ? totalAmount / totalCount : 0.0;

      // 获取最后发票日期
      DateTime? lastInvoiceDate;
      if (invoices.isNotEmpty) {
        lastInvoiceDate = invoices
            .map((i) => i.invoiceDate)
            .reduce((a, b) => a.isAfter(b) ? a : b);
      }

      return InvoiceStats(
        totalCount: totalCount,
        monthlyCount: monthlyCount,
        totalAmount: totalAmount,
        monthlyAmount: monthlyAmount,
        averageAmount: averageAmount,
        lastInvoiceDate: lastInvoiceDate,
        statusCounts: statusCounts,
        categoryAmounts: categoryAmounts,
        sourceCounts: sourceCounts,
      );
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [RemoteDataSource] 获取发票统计失败: $e', tag: 'Debug');
      }
      rethrow;
    }
  }

  /// 应用筛选条件 - 简化逻辑，确保每次都从干净状态开始
  dynamic _applyFilters(dynamic query, InvoiceFilters filters) {
    if (AppConfig.enableLogging) {
      AppLogger.debug(
          '🔍 [RemoteDataSource] _applyFilters 调用: overdue=${filters.overdue}, urgent=${filters.urgent}, status=${filters.status}',
          tag: 'Debug');
      AppLogger.debug('🔍 [RemoteDataSource] 筛选条件验证: 是否只有一个筛选激活?',
          tag: 'Debug');
      final activeFilters = [
        if (filters.overdue == true) 'overdue',
        if (filters.urgent == true) 'urgent',
        if (filters.status?.contains(InvoiceStatus.unreimbursed) == true)
          'unreimbursed_status'
      ];
      AppLogger.debug('🔍 [RemoteDataSource] 激活的筛选: $activeFilters',
          tag: 'Debug');
      AppLogger.debug('🔄 [RemoteDataSource] 开始应用筛选条件，基础查询已准备就绪', tag: 'Debug');
    }

    // 全局搜索
    if (filters.globalSearch != null && filters.globalSearch!.isNotEmpty) {
      final search = '%${filters.globalSearch}%';
      query = query.or(
          'invoice_number.ilike.$search,seller_name.ilike.$search,buyer_name.ilike.$search');
    }

    // 其他筛选条件
    if (filters.sellerName != null && filters.sellerName!.isNotEmpty) {
      query = query.ilike('seller_name', '%${filters.sellerName}%');
    }

    if (filters.buyerName != null && filters.buyerName!.isNotEmpty) {
      query = query.ilike('buyer_name', '%${filters.buyerName}%');
    }

    if (filters.invoiceNumber != null && filters.invoiceNumber!.isNotEmpty) {
      query = query.ilike('invoice_number', '%${filters.invoiceNumber}%');
    }

    if (filters.invoiceType != null && filters.invoiceType!.isNotEmpty) {
      query = query.eq('invoice_type', filters.invoiceType);
    }

    if (filters.dateFrom != null) {
      query = query.gte('invoice_date', filters.dateFrom!.toIso8601String());
    }
    if (filters.dateTo != null) {
      query = query.lte('invoice_date', filters.dateTo!.toIso8601String());
    }

    if (filters.amountMin != null) {
      query = query.gte('total_amount', filters.amountMin);
    }
    if (filters.amountMax != null) {
      query = query.lte('total_amount', filters.amountMax);
    }

    if (filters.status != null && filters.status!.isNotEmpty) {
      final statusValues = filters.status!.map((s) => s.name).toList();
      query = query.inFilter('status', statusValues);
    }

    if (filters.source != null && filters.source!.isNotEmpty) {
      final sourceValues = filters.source!.map((s) => s.name).toList();
      query = query.inFilter('source', sourceValues);
    }

    if (filters.category != null && filters.category!.isNotEmpty) {
      query = query.eq('category', filters.category);
    }

    if (filters.isVerified != null) {
      query = query.eq('is_verified', filters.isVerified);
    }

    // 🔥 简化互斥筛选逻辑：逾期、紧急、待报销只能选择一个
    if (filters.overdue == true) {
      // 逾期筛选：>90天未报销
      final overdueDate = DateTime.now().subtract(const Duration(days: 90));
      final overdueThreshold = overdueDate.toIso8601String().split('T')[0];

      query = query.lt('consumption_date', overdueThreshold);
      query = query.eq('status', 'unreimbursed');

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '✅ [RemoteDataSource] 应用逾期筛选: consumption_date < $overdueThreshold AND status = unreimbursed',
            tag: 'Debug');
      }
    } else if (filters.urgent == true) {
      // 紧急筛选：>60天未报销
      final urgentDate = DateTime.now().subtract(const Duration(days: 60));
      final urgentThreshold = urgentDate.toIso8601String().split('T')[0];

      query = query.lt('consumption_date', urgentThreshold);
      query = query.eq('status', 'unreimbursed');

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '✅ [RemoteDataSource] 应用紧急筛选: consumption_date < $urgentThreshold AND status = unreimbursed',
            tag: 'Debug');
      }
    } else if (filters.status?.contains(InvoiceStatus.unreimbursed) == true) {
      // 待报销筛选：只看状态
      query = query.eq('status', 'unreimbursed');

      if (AppConfig.enableLogging) {
        AppLogger.debug('✅ [RemoteDataSource] 应用待报销筛选: status = unreimbursed',
            tag: 'Debug');
      }
    }

    return query;
  }

  @override
  Future<UploadInvoiceResult> uploadInvoice({
    required Uint8List fileBytes,
    required String fileName,
    required String fileHash,
  }) async {
    try {
      // 验证认证状态
      final session = SupabaseClientManager.client.auth.currentSession;
      final currentUser = SupabaseClientManager.currentUser;

      if (session == null || currentUser == null) {
        if (AppConfig.enableLogging) {
          AppLogger.debug('❌ [RemoteDataSource] 用户未认证', tag: 'Debug');
        }
        throw UploadInvoiceException('用户未登录');
      }

      if (AppConfig.enableLogging) {
        AppLogger.debug('📤 [RemoteDataSource] 开始上传发票', tag: 'Debug');
        AppLogger.debug('📤 [RemoteDataSource] 用户ID: ${currentUser.id}',
            tag: 'Debug');
        AppLogger.debug('📤 [RemoteDataSource] 文件名: $fileName', tag: 'Debug');
        AppLogger.debug('📤 [RemoteDataSource] 文件大小: ${fileBytes.length} bytes',
            tag: 'Debug');
        AppLogger.debug(
            '📤 [RemoteDataSource] 文件哈希: ${fileHash.substring(0, 16)}...',
            tag: 'Debug');
      }

      // 调用Supabase Edge Function进行OCR处理和去重检查
      final supabaseUrl = SupabaseConfig.supabaseUrl;
      final accessToken = session.accessToken;

      // 创建multipart请求
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$supabaseUrl/functions/v1/ocr-dedup-complete'),
      );

      // 添加头部
      request.headers.addAll({
        'Authorization': 'Bearer $accessToken',
        'X-User-ID': currentUser.id,
      });

      // 添加文件
      request.files.add(
        http.MultipartFile.fromBytes(
          'file',
          fileBytes,
          filename: fileName,
          contentType: MediaType('application', 'pdf'),
        ),
      );

      // 添加其他参数
      request.fields.addAll({
        'fileHash': fileHash,
        'fileSize': fileBytes.length.toString(),
        'fileName': fileName,
        'checkDeleted': 'true',
      });

      if (AppConfig.enableLogging) {
        AppLogger.debug('📤 [RemoteDataSource] 发送请求到Edge Function',
            tag: 'Debug');
      }

      // 发送请求
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '📤 [RemoteDataSource] Edge Function响应状态: ${response.statusCode}',
            tag: 'Debug');
      }

      if (response.statusCode != 200) {
        final errorBody = response.body;
        if (AppConfig.enableLogging) {
          AppLogger.debug('❌ [RemoteDataSource] Edge Function调用失败: $errorBody',
              tag: 'Debug');
        }
        throw UploadInvoiceException(
            '上传处理失败: ${response.statusCode} - $errorBody');
      }

      // 解析响应
      final responseData = jsonDecode(response.body);

      if (AppConfig.enableLogging) {
        AppLogger.debug('✅ [RemoteDataSource] Edge Function响应解析完成',
            tag: 'Debug');
        // print('✅ [RemoteDataSource] 成功: ${responseData['success']}');
        // print('✅ [RemoteDataSource] 是否重复: ${responseData['isDuplicate']}');
        AppLogger.debug('🔍 [RemoteDataSource] 完整响应数据: $responseData',
            tag: 'Debug');
      }

      // 处理响应
      if (responseData['isDuplicate'] == true) {
        // 重复文件处理
        final existingData = responseData['data'];
        final isEmptyData = existingData == null ||
            existingData.isEmpty ||
            existingData['id'] == null;

        if (responseData['canRestore'] == true) {
          // 可以恢复的删除文件
          return UploadInvoiceResult.duplicate(
            duplicateInfo: DuplicateInvoiceInfo(
              existingInvoiceId: isEmptyData ? 'unknown' : existingData['id'],
              existingInvoice:
                  isEmptyData ? null : _parseInvoiceFromResponse(existingData),
              uploadCount: existingData?['upload_count'] ?? 1,
              message: responseData['message'] ?? '检测到相同文件在回收站中',
              canRestore: true,
              deletedInvoice:
                  isEmptyData ? null : _parseInvoiceFromResponse(existingData),
            ),
            fileName: fileName,
          );
        } else {
          // 普通重复文件
          return UploadInvoiceResult.duplicate(
            duplicateInfo: DuplicateInvoiceInfo(
              existingInvoiceId: isEmptyData ? 'unknown' : existingData['id'],
              existingInvoice:
                  isEmptyData ? null : _parseInvoiceFromResponse(existingData),
              uploadCount: existingData?['upload_count'] ?? 1,
              message: responseData['message'] ?? '文件重复',
            ),
            fileName: fileName,
          );
        }
      } else {
        // 新文件上传成功
        final invoiceData = responseData['data'];
        final invoice = _parseInvoiceFromResponse(invoiceData);

        return UploadInvoiceResult.success(invoice: invoice);
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [RemoteDataSource] 上传失败: $e', tag: 'Debug');
      }

      if (e is UploadInvoiceException) {
        rethrow;
      }

      throw UploadInvoiceException('上传处理异常: ${e.toString()}');
    }
  }

  /// 从响应数据解析发票实体
  InvoiceEntity _parseInvoiceFromResponse(Map<String, dynamic> data) {
    try {
      if (AppConfig.enableLogging) {
        AppLogger.debug('🔍 [RemoteDataSource] 开始解析发票数据: ${data.keys.toList()}',
            tag: 'Debug');
      }

      // 检查必填字段，如果缺少则提供默认值
      final processedData = Map<String, dynamic>.from(data);

      // 确保必填字段存在
      if (processedData['id'] == null) {
        processedData['id'] = 'unknown';
      }
      if (processedData['invoice_number'] == null) {
        processedData['invoice_number'] = '';
      }
      if (processedData['user_id'] == null) {
        final currentUser = SupabaseClientManager.currentUser;
        processedData['user_id'] = currentUser?.id ?? 'unknown';
      }
      if (processedData['invoice_date'] == null) {
        processedData['invoice_date'] = DateTime.now().toIso8601String();
      }

      if (AppConfig.enableLogging) {
        AppLogger.debug('🔍 [RemoteDataSource] 处理后的数据: $processedData',
            tag: 'Debug');
      }

      final model = InvoiceModel.fromJson(processedData);
      return model.toEntity();
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [RemoteDataSource] 发票数据解析失败: $e', tag: 'Debug');
        AppLogger.debug('❌ [RemoteDataSource] 原始数据: $data', tag: 'Debug');
      }
      rethrow;
    }
  }
}
