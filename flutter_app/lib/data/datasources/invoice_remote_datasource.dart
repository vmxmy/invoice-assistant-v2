import 'dart:typed_data';
import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
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
  static const String _viewName = 'invoices'; // 可以切换到视图

  @override
  Future<List<InvoiceModel>> getInvoices({
    int page = 1,
    int pageSize = 20, // 设置为20以测试无限滚动
    InvoiceFilters? filters,
    String sortField = 'created_at',
    bool sortAscending = false,
  }) async {
    try {
      // 验证认证状态
      final session = SupabaseClientManager.client.auth.currentSession;
      final currentUser = SupabaseClientManager.currentUser;
      
      if (session == null || currentUser == null) {
        if (AppConfig.enableLogging) {
          print('❌ [RemoteDataSource] 用户未认证 - Session: ${session != null}, User: ${currentUser?.email}');
        }
        throw Exception('用户未登录或会话已过期');
      }

      // 检查会话是否过期
      if (session.expiresAt != null && DateTime.now().millisecondsSinceEpoch > session.expiresAt! * 1000) {
        if (AppConfig.enableLogging) {
          print('❌ [RemoteDataSource] 用户会话已过期');
        }
        throw Exception('用户会话已过期，请重新登录');
      }

      if (AppConfig.enableLogging) {
        print('🔍 [RemoteDataSource] 查询发票 - 用户ID: ${currentUser.id}');
        print('🔍 [RemoteDataSource] 用户邮箱: ${currentUser.email}');
        print('🔍 [RemoteDataSource] 会话状态 - 过期时间: ${DateTime.fromMillisecondsSinceEpoch(session.expiresAt! * 1000)}');
        print('🔍 [RemoteDataSource] 分页参数 - page: $page, pageSize: $pageSize');
      }

      // 构建基础查询
      var query = SupabaseClientManager.from(_viewName)
          .select()
          .eq('user_id', currentUser.id)
          .neq('status', 'deleted');

      if (AppConfig.enableLogging) {
        print('🔍 [RemoteDataSource] 查询条件 - 表: $_viewName, user_id: ${currentUser.id}, status != deleted');
      }

      // 应用筛选条件
      if (filters != null) {
        _applyFilters(query, filters);
      }

      // 先执行一个简单查询检查用户的记录数
      if (AppConfig.enableLogging) {
        try {
          final debugQuery = SupabaseClientManager.from(_tableName)
              .select('id, user_id, status')
              .eq('user_id', currentUser.id)
              .neq('status', 'deleted');
          final debugResponse = await debugQuery;
          print('🔍 [调试] 用户发票总记录数: ${debugResponse.length}');
          if (debugResponse.isNotEmpty) {
            final firstRecord = debugResponse[0];
            print('🔍 [调试] 第一条记录: user_id=${firstRecord['user_id']}, status=${firstRecord['status']}');
          }
        } catch (e) {
          print('⚠️ [调试] 调试查询失败: $e');
        }
      }

      // 执行查询并获取结果
      final response = await query
          .order(sortField, ascending: sortAscending)
          .range((page - 1) * pageSize, page * pageSize - 1);

      if (AppConfig.enableLogging) {
        print('✅ [RemoteDataSource] 查询执行成功: ${response.length}条记录');
        print('🔍 [RemoteDataSource] 分页范围: ${(page - 1) * pageSize} - ${page * pageSize - 1}');
      }

      // 转换为数据模型
      final invoiceModels = (response as List<dynamic>)
          .map((item) => InvoiceModel.fromJson(item as Map<String, dynamic>))
          .toList();

      return invoiceModels;
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ [RemoteDataSource] 获取发票列表失败: $e');
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

      // 构建计数查询 - 使用Supabase count功能
      var countQuery = SupabaseClientManager.from(_viewName)
          .select('id')
          .eq('user_id', currentUser.id)
          .neq('status', 'deleted');

      // 应用筛选条件
      if (filters != null) {
        _applyFilters(countQuery, filters);
      }

      // 执行计数查询
      final response = await countQuery;
      final count = (response as List).length;

      if (AppConfig.enableLogging) {
        print('✅ [RemoteDataSource] 获取发票总数成功: $count条记录');
      }

      return count;
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ [RemoteDataSource] 获取发票总数失败: $e');
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
        print('❌ [RemoteDataSource] 获取发票详情失败: $e');
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
        print('❌ [RemoteDataSource] 创建发票失败: $e');
      }
      rethrow;
    }
  }

  @override
  Future<InvoiceModel> updateInvoice(String id, UpdateInvoiceRequest request) async {
    try {
      final currentUser = SupabaseClientManager.currentUser;
      if (currentUser == null) {
        throw Exception('用户未登录');
      }

      final data = <String, dynamic>{
        'updated_at': DateTime.now().toIso8601String(),
      };

      // 只更新提供的字段
      if (request.invoiceNumber != null) data['invoice_number'] = request.invoiceNumber;
      if (request.invoiceDate != null) data['invoice_date'] = request.invoiceDate!.toIso8601String();
      if (request.consumptionDate != null) data['consumption_date'] = request.consumptionDate!.toIso8601String();
      if (request.sellerName != null) data['seller_name'] = request.sellerName;
      if (request.buyerName != null) data['buyer_name'] = request.buyerName;
      if (request.amount != null) data['amount_without_tax'] = request.amount;
      if (request.totalAmount != null) data['total_amount'] = request.totalAmount;
      if (request.taxAmount != null) data['tax_amount'] = request.taxAmount;
      if (request.currency != null) data['currency'] = request.currency;
      if (request.category != null) data['category'] = request.category;
      if (request.status != null) data['status'] = request.status!.name;
      if (request.invoiceType != null) data['invoice_type'] = request.invoiceType;
      if (request.fileUrl != null) data['file_url'] = request.fileUrl;
      if (request.filePath != null) data['file_path'] = request.filePath;
      if (request.isVerified != null) data['is_verified'] = request.isVerified;
      if (request.verificationNotes != null) data['verification_notes'] = request.verificationNotes;
      if (request.extractedData != null) data['extracted_data'] = request.extractedData;

      final response = await SupabaseClientManager.from(_tableName)
          .update(data)
          .eq('id', id)
          .eq('user_id', currentUser.id)
          .select()
          .single();

      return InvoiceModel.fromJson(response);
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ [RemoteDataSource] 更新发票失败: $e');
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
        print('🔄 [RemoteDataSource] 更新发票状态: $id -> ${status.name}');
      }

      await SupabaseClientManager.from(_tableName)
          .update({
            'status': status.name,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', id)
          .eq('user_id', currentUser.id);

      if (AppConfig.enableLogging) {
        print('✅ [RemoteDataSource] 发票状态更新成功: ${status.displayName}');
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ [RemoteDataSource] 更新发票状态失败: $e');
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
        print('🗑️ [RemoteDataSource] 开始永久删除发票: $id');
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
        print('📄 [RemoteDataSource] 发票文件信息 - path: $filePath, hash: $fileHash');
      }

      // 2. 删除哈希记录（与Web端顺序保持一致）
      if (fileHash != null) {
        try {
          await SupabaseClientManager.from('file_hashes')
              .delete()
              .eq('file_hash', fileHash)
              .eq('user_id', currentUser.id);
          
          if (AppConfig.enableLogging) {
            print('✅ [RemoteDataSource] 哈希记录删除成功');
          }
        } catch (hashError) {
          if (AppConfig.enableLogging) {
            print('⚠️ [RemoteDataSource] 删除哈希记录失败: $hashError');
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
        print('✅ [RemoteDataSource] 发票记录删除成功');
      }

      // 4. 删除存储桶中的文件
      if (filePath != null && filePath.isNotEmpty) {
        try {
          await SupabaseClientManager.client.storage
              .from('invoice-files')
              .remove([filePath]);
          
          if (AppConfig.enableLogging) {
            print('✅ [RemoteDataSource] 存储文件删除成功: $filePath');
          }
        } catch (storageError) {
          if (AppConfig.enableLogging) {
            print('⚠️ [RemoteDataSource] 删除存储文件失败: $storageError');
          }
          // 不抛出异常，允许继续执行
        }
      }

      if (AppConfig.enableLogging) {
        print('🎉 [RemoteDataSource] 发票永久删除完成: $id');
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ [RemoteDataSource] 删除发票失败: $e');
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
        print('🗑️ [RemoteDataSource] 开始批量永久删除发票: ${ids.length}个');
      }

      // 逐个删除发票，确保每个发票都完整删除
      for (final id in ids) {
        await deleteInvoice(id);
      }

      if (AppConfig.enableLogging) {
        print('🎉 [RemoteDataSource] 批量永久删除完成: ${ids.length}个');
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ [RemoteDataSource] 批量删除发票失败: $e');
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
          categoryAmounts[invoice.category!] = (categoryAmounts[invoice.category!] ?? 0.0) + amount;
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
        print('❌ [RemoteDataSource] 获取发票统计失败: $e');
      }
      rethrow;
    }
  }

  /// 应用筛选条件
  void _applyFilters(dynamic query, InvoiceFilters filters) {
    // 全局搜索
    if (filters.globalSearch != null && filters.globalSearch!.isNotEmpty) {
      final search = '%${filters.globalSearch}%';
      query.or('invoice_number.ilike.$search,seller_name.ilike.$search,buyer_name.ilike.$search');
    }

    // 其他筛选条件
    if (filters.sellerName != null && filters.sellerName!.isNotEmpty) {
      query.ilike('seller_name', '%${filters.sellerName}%');
    }

    if (filters.buyerName != null && filters.buyerName!.isNotEmpty) {
      query.ilike('buyer_name', '%${filters.buyerName}%');
    }

    if (filters.invoiceNumber != null && filters.invoiceNumber!.isNotEmpty) {
      query.ilike('invoice_number', '%${filters.invoiceNumber}%');
    }

    if (filters.invoiceType != null && filters.invoiceType!.isNotEmpty) {
      query.eq('invoice_type', filters.invoiceType);
    }

    if (filters.dateFrom != null) {
      query.gte('invoice_date', filters.dateFrom!.toIso8601String());
    }
    if (filters.dateTo != null) {
      query.lte('invoice_date', filters.dateTo!.toIso8601String());
    }

    if (filters.amountMin != null) {
      query.gte('total_amount', filters.amountMin);
    }
    if (filters.amountMax != null) {
      query.lte('total_amount', filters.amountMax);
    }

    if (filters.status != null && filters.status!.isNotEmpty) {
      final statusValues = filters.status!.map((s) => s.name).toList();
      query.inFilter('status', statusValues);
    }

    if (filters.source != null && filters.source!.isNotEmpty) {
      final sourceValues = filters.source!.map((s) => s.name).toList();
      query.inFilter('source', sourceValues);
    }

    if (filters.category != null && filters.category!.isNotEmpty) {
      query.eq('category', filters.category);
    }

    if (filters.isVerified != null) {
      query.eq('is_verified', filters.isVerified);
    }
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
          print('❌ [RemoteDataSource] 用户未认证');
        }
        throw UploadInvoiceException('用户未登录');
      }

      if (AppConfig.enableLogging) {
        print('📤 [RemoteDataSource] 开始上传发票');
        print('📤 [RemoteDataSource] 用户ID: ${currentUser.id}');
        print('📤 [RemoteDataSource] 文件名: $fileName');
        print('📤 [RemoteDataSource] 文件大小: ${fileBytes.length} bytes');
        print('📤 [RemoteDataSource] 文件哈希: ${fileHash.substring(0, 16)}...');
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
        print('📤 [RemoteDataSource] 发送请求到Edge Function');
      }

      // 发送请求
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (AppConfig.enableLogging) {
        print('📤 [RemoteDataSource] Edge Function响应状态: ${response.statusCode}');
      }

      if (response.statusCode != 200) {
        final errorBody = response.body;
        if (AppConfig.enableLogging) {
          print('❌ [RemoteDataSource] Edge Function调用失败: $errorBody');
        }
        throw UploadInvoiceException('上传处理失败: ${response.statusCode} - $errorBody');
      }

      // 解析响应
      final responseData = jsonDecode(response.body);
      
      if (AppConfig.enableLogging) {
        print('✅ [RemoteDataSource] Edge Function响应解析完成');
        print('✅ [RemoteDataSource] 成功: ${responseData['success']}');
        print('✅ [RemoteDataSource] 是否重复: ${responseData['isDuplicate']}');
        print('🔍 [RemoteDataSource] 完整响应数据: $responseData');
      }

      // 处理响应
      if (responseData['isDuplicate'] == true) {
        // 重复文件处理
        final existingData = responseData['data'];
        final isEmptyData = existingData == null || existingData.isEmpty || existingData['id'] == null;
        
        if (responseData['canRestore'] == true) {
          // 可以恢复的删除文件
          return UploadInvoiceResult.duplicate(
            duplicateInfo: DuplicateInvoiceInfo(
              existingInvoiceId: isEmptyData ? 'unknown' : existingData['id'],
              existingInvoice: isEmptyData ? null : _parseInvoiceFromResponse(existingData),
              uploadCount: existingData?['upload_count'] ?? 1,
              message: responseData['message'] ?? '检测到相同文件在回收站中',
              canRestore: true,
              deletedInvoice: isEmptyData ? null : _parseInvoiceFromResponse(existingData),
            ),
            fileName: fileName,
          );
        } else {
          // 普通重复文件
          return UploadInvoiceResult.duplicate(
            duplicateInfo: DuplicateInvoiceInfo(
              existingInvoiceId: isEmptyData ? 'unknown' : existingData['id'],
              existingInvoice: isEmptyData ? null : _parseInvoiceFromResponse(existingData),
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
        print('❌ [RemoteDataSource] 上传失败: $e');
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
        print('🔍 [RemoteDataSource] 开始解析发票数据: ${data.keys.toList()}');
      }
      final model = InvoiceModel.fromJson(data);
      return model.toEntity();
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('❌ [RemoteDataSource] 发票数据解析失败: $e');
        print('❌ [RemoteDataSource] 原始数据: $data');
      }
      rethrow;
    }
  }
}