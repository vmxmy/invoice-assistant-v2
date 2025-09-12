import '../../core/utils/logger.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/config/app_config.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/repositories/reimbursement_set_repository.dart';
// import '../../domain/exceptions/invoice_exceptions.dart'; // 未使用
import '../models/reimbursement_set_model.dart';
import '../models/invoice_model.dart';

class ReimbursementSetRepositoryImpl implements ReimbursementSetRepository {
  final SupabaseClient _supabaseClient;

  ReimbursementSetRepositoryImpl({
    SupabaseClient? supabaseClient,
  }) : _supabaseClient = supabaseClient ?? Supabase.instance.client;

  @override
  Future<List<ReimbursementSetEntity>> getReimbursementSets() async {
    try {
      final response = await _supabaseClient
          .from('reimbursement_set_details')
          .select()
          .eq('user_id', _supabaseClient.auth.currentUser!.id)
          .order('created_at', ascending: false);

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '📊 [ReimbursementSetRepository] 获取报销集列表: ${response.length} 个',
            tag: 'Debug');
      }

      return response
          .map((json) => ReimbursementSetModel.fromJson(json).toEntity())
          .toList();
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [ReimbursementSetRepository] 获取报销集列表失败: $e',
            tag: 'Debug');
      }
      throw Exception('获取报销集列表失败: ${e.toString()}');
    }
  }

  @override
  Future<ReimbursementSetEntity> getReimbursementSetById(String id) async {
    try {
      final response = await _supabaseClient
          .from('reimbursement_set_details')
          .select()
          .eq('id', id)
          .eq('user_id', _supabaseClient.auth.currentUser!.id)
          .single();

      if (AppConfig.enableLogging) {
        AppLogger.debug('📊 [ReimbursementSetRepository] 获取报销集详情: $id',
            tag: 'Debug');
      }

      return ReimbursementSetModel.fromJson(response).toEntity();
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [ReimbursementSetRepository] 获取报销集详情失败: $e',
            tag: 'Debug');
      }
      throw Exception('获取报销集详情失败: ${e.toString()}');
    }
  }

  @override
  Future<ReimbursementSetEntity> createReimbursementSet({
    required String setName,
    String? description,
    required List<String> invoiceIds,
  }) async {
    try {
      // 检查发票是否可以分配
      final canAssign = await canAssignInvoicesToSet(invoiceIds);
      if (!canAssign) {
        throw Exception('部分发票已被分配到其他报销集');
      }

      // 开始数据库事务
      final response = await _supabaseClient
          .rpc('create_reimbursement_set_with_invoices', params: {
        'p_set_name': setName,
        'p_description': description,
        'p_invoice_ids': invoiceIds,
      });

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '📊 [ReimbursementSetRepository] 创建报销集成功: $setName, 包含 ${invoiceIds.length} 张发票',
            tag: 'Debug');
      }

      // 获取创建的报销集详情
      return await getReimbursementSetById(response);
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [ReimbursementSetRepository] 创建报销集失败: $e',
            tag: 'Debug');
      }
      throw Exception('创建报销集失败: ${e.toString()}');
    }
  }

  @override
  Future<ReimbursementSetEntity> updateReimbursementSet(
    String id, {
    String? setName,
    String? description,
  }) async {
    try {
      final updateData = <String, dynamic>{};
      if (setName != null) updateData['set_name'] = setName;
      if (description != null) updateData['description'] = description;

      await _supabaseClient
          .from('reimbursement_sets')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', _supabaseClient.auth.currentUser!.id);

      if (AppConfig.enableLogging) {
        AppLogger.debug('📊 [ReimbursementSetRepository] 更新报销集成功: $id',
            tag: 'Debug');
      }

      return await getReimbursementSetById(id);
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [ReimbursementSetRepository] 更新报销集失败: $e',
            tag: 'Debug');
      }
      throw Exception('更新报销集失败: ${e.toString()}');
    }
  }

  @override
  Future<ReimbursementSetEntity> updateReimbursementSetStatus(
    String id,
    ReimbursementSetStatus status, {
    String? approvalNotes,
  }) async {
    try {
      final updateData = <String, dynamic>{
        'status': status.value,
      };

      final now = DateTime.now().toIso8601String();

      // 获取当前报销集状态以确定时间戳更新策略
      final currentSet = await getReimbursementSetById(id);
      
      switch (status) {
        case ReimbursementSetStatus.submitted:
          // 如果是从未提交状态提交，设置提交时间
          if (currentSet.status == ReimbursementSetStatus.unsubmitted) {
            updateData['submitted_at'] = now;
          }
          // 如果是从已报销状态撤回，保留原有submitted_at，清除reimbursed_at
          if (currentSet.status == ReimbursementSetStatus.reimbursed) {
            updateData['reimbursed_at'] = null;
          }
          break;
        case ReimbursementSetStatus.reimbursed:
          updateData['reimbursed_at'] = now;
          break;
        case ReimbursementSetStatus.unsubmitted:
          // 回退到未提交状态时清除所有时间戳
          updateData['submitted_at'] = null;
          updateData['reimbursed_at'] = null;
          break;
      }

      if (approvalNotes != null) {
        updateData['approval_notes'] = approvalNotes;
      }

      await _supabaseClient
          .from('reimbursement_sets')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', _supabaseClient.auth.currentUser!.id);

      // 同步更新关联发票的状态
      await _updateAssociatedInvoicesStatus(id, status);

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '📊 [ReimbursementSetRepository] 更新报销集状态成功: $id -> ${status.value}',
            tag: 'Debug');
      }

      return await getReimbursementSetById(id);
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [ReimbursementSetRepository] 更新报销集状态失败: $e',
            tag: 'Debug');
      }
      throw Exception('更新报销集状态失败: ${e.toString()}');
    }
  }

  @override
  Future<void> deleteReimbursementSet(String id) async {
    try {
      // 先将关联的发票从报销集中移除
      await _supabaseClient.from('invoices').update({
        'reimbursement_set_id': null,
        'assigned_to_set_at': null,
      }).eq('reimbursement_set_id', id);

      // 然后删除报销集
      await _supabaseClient
          .from('reimbursement_sets')
          .delete()
          .eq('id', id)
          .eq('user_id', _supabaseClient.auth.currentUser!.id);

      if (AppConfig.enableLogging) {
        AppLogger.debug('📊 [ReimbursementSetRepository] 删除报销集成功: $id',
            tag: 'Debug');
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [ReimbursementSetRepository] 删除报销集失败: $e',
            tag: 'Debug');
      }
      throw Exception('删除报销集失败: ${e.toString()}');
    }
  }

  @override
  Future<void> addInvoicesToSet(String setId, List<String> invoiceIds) async {
    try {
      // 检查发票是否可以分配
      final canAssign = await canAssignInvoicesToSet(invoiceIds);
      if (!canAssign) {
        throw Exception('部分发票已被分配到其他报销集');
      }

      await _supabaseClient
          .from('invoices')
          .update({
            'reimbursement_set_id': setId,
            'assigned_to_set_at': DateTime.now().toIso8601String(),
          })
          .filter('id', 'in', '(${invoiceIds.join(',')})')
          .eq('user_id', _supabaseClient.auth.currentUser!.id);

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '📊 [ReimbursementSetRepository] 添加发票到报销集成功: ${invoiceIds.length} 张',
            tag: 'Debug');
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [ReimbursementSetRepository] 添加发票到报销集失败: $e',
            tag: 'Debug');
      }
      throw Exception('添加发票到报销集失败: ${e.toString()}');
    }
  }

  @override
  Future<void> removeInvoicesFromSet(List<String> invoiceIds) async {
    try {
      await _supabaseClient
          .from('invoices')
          .update({
            'reimbursement_set_id': null,
            'assigned_to_set_at': null,
          })
          .filter('id', 'in', '(${invoiceIds.join(',')})')
          .eq('user_id', _supabaseClient.auth.currentUser!.id);

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '📊 [ReimbursementSetRepository] 从报销集移除发票成功: ${invoiceIds.length} 张',
            tag: 'Debug');
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [ReimbursementSetRepository] 从报销集移除发票失败: $e',
            tag: 'Debug');
      }
      throw Exception('从报销集移除发票失败: ${e.toString()}');
    }
  }

  @override
  Future<List<InvoiceEntity>> getInvoicesInSet(String setId) async {
    try {
      final response = await _supabaseClient
          .from('invoices')
          .select()
          .eq('reimbursement_set_id', setId)
          .eq('user_id', _supabaseClient.auth.currentUser!.id)
          .order('invoice_date', ascending: false);

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '📊 [ReimbursementSetRepository] 获取报销集发票列表: ${response.length} 张',
            tag: 'Debug');
      }

      return response
          .map((json) => InvoiceModel.fromJson(json).toEntity())
          .toList();
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [ReimbursementSetRepository] 获取报销集发票列表失败: $e',
            tag: 'Debug');
      }
      throw Exception('获取报销集发票列表失败: ${e.toString()}');
    }
  }

  @override
  Future<List<InvoiceEntity>> getUnassignedInvoices({
    int? limit,
    int? offset,
  }) async {
    try {
      final baseQuery = _supabaseClient
          .from('unassigned_invoices')
          .select()
          .eq('user_id', _supabaseClient.auth.currentUser!.id);

      PostgrestTransformBuilder<PostgrestList> query = baseQuery;

      if (limit != null) {
        query = query.limit(limit);
      }
      if (offset != null) {
        query = query.range(offset, offset + (limit ?? 50) - 1);
      }

      final response = await query;

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '📊 [ReimbursementSetRepository] 获取未分配发票列表: ${response.length} 张',
            tag: 'Debug');
      }

      return response
          .map((json) => InvoiceModel.fromJson(json).toEntity())
          .toList();
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [ReimbursementSetRepository] 获取未分配发票列表失败: $e',
            tag: 'Debug');
      }
      throw Exception('获取未分配发票列表失败: ${e.toString()}');
    }
  }

  @override
  Future<bool> canAssignInvoicesToSet(List<String> invoiceIds) async {
    try {
      final response = await _supabaseClient
          .from('invoices')
          .select('id, reimbursement_set_id')
          .filter('id', 'in', '(${invoiceIds.join(',')})')
          .eq('user_id', _supabaseClient.auth.currentUser!.id);

      // 检查是否所有发票都未分配
      final canAssign =
          response.every((invoice) => invoice['reimbursement_set_id'] == null);

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '📊 [ReimbursementSetRepository] 检查发票分配状态: ${invoiceIds.length} 张发票, 可分配: $canAssign',
            tag: 'Debug');
      }

      return canAssign;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [ReimbursementSetRepository] 检查发票分配状态失败: $e',
            tag: 'Debug');
      }
      return false;
    }
  }

  @override
  Future<ReimbursementSetStats> getReimbursementSetStats() async {
    try {
      final setsResponse = await _supabaseClient
          .from('reimbursement_sets')
          .select('status, total_amount, invoice_count')
          .eq('user_id', _supabaseClient.auth.currentUser!.id);

      final unassignedResponse = await _supabaseClient
          .from('invoices')
          .select('id')
          .eq('user_id', _supabaseClient.auth.currentUser!.id)
          .filter('reimbursement_set_id', 'is', 'null');

      int totalSets = setsResponse.length;
      int unsubmittedSets = 0;
      int submittedSets = 0;
      int reimbursedSets = 0;
      double totalAmount = 0;
      int totalInvoices = 0;

      for (final set in setsResponse) {
        final status = set['status'];
        switch (status) {
          case 'unsubmitted':
            unsubmittedSets++;
            break;
          case 'submitted':
            submittedSets++;
            break;
          case 'reimbursed':
            reimbursedSets++;
            break;
        }
        totalAmount += ((set['total_amount'] ?? 0) as num).toDouble();
        totalInvoices += ((set['invoice_count'] ?? 0) as num).toInt();
      }

      final stats = ReimbursementSetStats(
        totalSets: totalSets,
        unsubmittedSets: unsubmittedSets,
        submittedSets: submittedSets,
        reimbursedSets: reimbursedSets,
        totalAmount: totalAmount,
        totalInvoices: totalInvoices,
        unassignedInvoices: unassignedResponse.length,
      );

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '📊 [ReimbursementSetRepository] 获取统计信息: 总计 $totalSets 个报销集',
            tag: 'Debug');
      }

      return stats;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [ReimbursementSetRepository] 获取统计信息失败: $e',
            tag: 'Debug');
      }
      throw Exception('获取统计信息失败: ${e.toString()}');
    }
  }

  /// 更新关联发票的状态，使其与报销集状态保持同步
  Future<void> _updateAssociatedInvoicesStatus(
    String setId,
    ReimbursementSetStatus reimbursementSetStatus,
  ) async {
    try {
      // 将报销集状态映射为发票状态
      String invoiceStatus;
      switch (reimbursementSetStatus) {
        case ReimbursementSetStatus.unsubmitted:
          invoiceStatus = 'unsubmitted';
          break;
        case ReimbursementSetStatus.submitted:
          invoiceStatus = 'submitted';
          break;
        case ReimbursementSetStatus.reimbursed:
          invoiceStatus = 'reimbursed';
          break;
      }

      // 批量更新关联发票的状态
      await _supabaseClient.from('invoices').update({
        'status': invoiceStatus,
      }).eq('reimbursement_set_id', setId).eq('user_id', _supabaseClient.auth.currentUser!.id);

      if (AppConfig.enableLogging) {
        AppLogger.debug(
          '📊 [ReimbursementSetRepository] 同步更新关联发票状态: $setId -> $invoiceStatus',
          tag: 'Debug',
        );
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug(
          '❌ [ReimbursementSetRepository] 同步更新关联发票状态失败: $e',
          tag: 'Debug',
        );
      }
      // 不抛出异常，避免影响主要的状态更新操作
    }
  }
}
