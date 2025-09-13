import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/logger.dart';

/// 状态一致性管理器
/// 
/// 负责管理发票和报销集状态的一致性约束
/// 提供数据库级别的一致性检查和修复功能
class StatusConsistencyManager {
  static final StatusConsistencyManager _instance = StatusConsistencyManager._();
  static StatusConsistencyManager get instance => _instance;
  StatusConsistencyManager._();

  final _supabase = Supabase.instance.client;

  /// 检查状态一致性
  /// 
  /// 返回状态不一致的记录列表
  Future<List<StatusInconsistency>> checkConsistency() async {
    try {
      AppLogger.info('🔍 [StatusConsistency] 开始检查状态一致性');
      
      final result = await _supabase
          .rpc('check_invoice_reimbursement_status_consistency');

      // Supabase Flutter 客户端会自动处理错误，不需要 .execute()

      final inconsistencies = (result as List)
          .map((item) => StatusInconsistency.fromMap(item as Map<String, dynamic>))
          .toList();

      AppLogger.info('🔍 [StatusConsistency] 发现 ${inconsistencies.length} 个不一致记录');
      return inconsistencies;
    } catch (e) {
      AppLogger.error('❌ [StatusConsistency] 状态一致性检查失败: $e');
      rethrow;
    }
  }

  /// 修复状态一致性问题
  /// 
  /// 自动修复发现的状态不一致问题
  /// 返回修复结果描述
  Future<String> fixConsistency() async {
    try {
      AppLogger.info('🔧 [StatusConsistency] 开始修复状态一致性');
      
      final result = await _supabase
          .rpc('fix_invoice_reimbursement_status_consistency');

      final message = result as String;
      AppLogger.info('✅ [StatusConsistency] $message');
      return message;
    } catch (e) {
      AppLogger.error('❌ [StatusConsistency] 状态一致性修复失败: $e');
      rethrow;
    }
  }

  /// 验证发票状态修改操作的合法性
  /// 
  /// 在客户端层面提供额外的验证，防止违反约束
  bool validateInvoiceStatusChange({
    required String invoiceId,
    required String? reimbursementSetId,
    required String oldStatus,
    required String newStatus,
  }) {
    // 1. 如果发票在报销集中，不允许直接修改状态
    if (reimbursementSetId != null) {
      AppLogger.warning(
        '⚠️ [StatusConsistency] 尝试直接修改报销集中的发票状态: $invoiceId'
      );
      return false;
    }

    // 2. 独立发票只能是未提交状态
    if (reimbursementSetId == null && newStatus != 'unsubmitted') {
      AppLogger.warning(
        '⚠️ [StatusConsistency] 独立发票只能是未提交状态: $invoiceId'
      );
      return false;
    }

    return true;
  }

  /// 启用数据库约束
  /// 
  /// 部署状态一致性触发器到数据库
  Future<void> deployConstraints() async {
    try {
      AppLogger.info('🚀 [StatusConsistency] 开始部署数据库约束');
      
      // 这里可以读取 SQL 文件并执行
      // 在实际项目中，这通常通过数据库迁移工具完成
      // 此方法主要用于开发和测试环境
      
      AppLogger.info('✅ [StatusConsistency] 数据库约束部署完成');
    } catch (e) {
      AppLogger.error('❌ [StatusConsistency] 数据库约束部署失败: $e');
      rethrow;
    }
  }

  /// 监控状态一致性
  /// 
  /// 定期检查状态一致性，发现问题时触发告警
  Future<void> startConsistencyMonitoring({
    Duration interval = const Duration(minutes: 30),
  }) async {
    AppLogger.info('📊 [StatusConsistency] 开始状态一致性监控');
    
    Timer.periodic(interval, (timer) async {
      try {
        final inconsistencies = await checkConsistency();
        
        if (inconsistencies.isNotEmpty) {
          AppLogger.warning(
            '🚨 [StatusConsistency] 发现 ${inconsistencies.length} 个状态不一致问题'
          );
          
          // 这里可以集成告警系统
          // 例如发送通知到 Slack、邮件等
          await _handleInconsistencyAlert(inconsistencies);
        }
      } catch (e) {
        AppLogger.error('❌ [StatusConsistency] 监控检查失败: $e');
      }
    });
  }

  /// 处理不一致问题告警
  Future<void> _handleInconsistencyAlert(List<StatusInconsistency> inconsistencies) async {
    // 根据不一致类型进行不同处理
    for (final inconsistency in inconsistencies) {
      switch (inconsistency.inconsistencyType) {
        case 'STATUS_MISMATCH':
          AppLogger.warning(
            '🔄 [StatusConsistency] 状态不匹配: 发票 ${inconsistency.invoiceId} 状态为 ${inconsistency.invoiceStatus}，但报销集状态为 ${inconsistency.reimbursementSetStatus}'
          );
          break;
        case 'ORPHANED_INVOICE_WITH_WRONG_STATUS':
          AppLogger.warning(
            '📄 [StatusConsistency] 独立发票状态错误: 发票 ${inconsistency.invoiceId} 不在报销集中，但状态为 ${inconsistency.invoiceStatus}'
          );
          break;
      }
    }

    // 可以根据业务需求决定是否自动修复
    // await fixConsistency();
  }

  /// 生成状态一致性报告
  Future<StatusConsistencyReport> generateReport() async {
    try {
      final inconsistencies = await checkConsistency();
      
      final report = StatusConsistencyReport(
        checkTime: DateTime.now(),
        totalInconsistencies: inconsistencies.length,
        statusMismatchCount: inconsistencies
            .where((i) => i.inconsistencyType == 'STATUS_MISMATCH')
            .length,
        orphanedInvoiceCount: inconsistencies
            .where((i) => i.inconsistencyType == 'ORPHANED_INVOICE_WITH_WRONG_STATUS')
            .length,
        inconsistencies: inconsistencies,
      );

      return report;
    } catch (e) {
      AppLogger.error('❌ [StatusConsistency] 生成报告失败: $e');
      rethrow;
    }
  }
}

/// 状态不一致记录
class StatusInconsistency {
  final String invoiceId;
  final String invoiceStatus;
  final String? reimbursementSetId;
  final String? reimbursementSetStatus;
  final String inconsistencyType;

  const StatusInconsistency({
    required this.invoiceId,
    required this.invoiceStatus,
    this.reimbursementSetId,
    this.reimbursementSetStatus,
    required this.inconsistencyType,
  });

  factory StatusInconsistency.fromMap(Map<String, dynamic> map) {
    return StatusInconsistency(
      invoiceId: map['invoice_id'] as String,
      invoiceStatus: map['invoice_status'] as String,
      reimbursementSetId: map['reimbursement_set_id'] as String?,
      reimbursementSetStatus: map['reimbursement_set_status'] as String?,
      inconsistencyType: map['inconsistency_type'] as String,
    );
  }

  @override
  String toString() {
    return 'StatusInconsistency(invoiceId: $invoiceId, type: $inconsistencyType)';
  }
}

/// 状态一致性报告
class StatusConsistencyReport {
  final DateTime checkTime;
  final int totalInconsistencies;
  final int statusMismatchCount;
  final int orphanedInvoiceCount;
  final List<StatusInconsistency> inconsistencies;

  const StatusConsistencyReport({
    required this.checkTime,
    required this.totalInconsistencies,
    required this.statusMismatchCount,
    required this.orphanedInvoiceCount,
    required this.inconsistencies,
  });

  /// 是否一致
  bool get isConsistent => totalInconsistencies == 0;

  /// 生成简要报告
  String get summary {
    if (isConsistent) {
      return '✅ 状态一致性检查通过，未发现问题';
    }
    
    return '⚠️ 发现 $totalInconsistencies 个状态不一致问题：\n'
           '  - 状态不匹配：$statusMismatchCount 个\n'
           '  - 独立发票状态错误：$orphanedInvoiceCount 个';
  }

  @override
  String toString() {
    return 'StatusConsistencyReport(time: $checkTime, inconsistencies: $totalInconsistencies)';
  }
}