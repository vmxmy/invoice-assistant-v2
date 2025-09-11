import '../entities/reimbursement_set_entity.dart';
import '../entities/invoice_entity.dart';

/// 报销集仓库接口
abstract class ReimbursementSetRepository {
  /// 获取用户的所有报销集
  Future<List<ReimbursementSetEntity>> getReimbursementSets();
  
  /// 根据ID获取报销集详情
  Future<ReimbursementSetEntity> getReimbursementSetById(String id);
  
  /// 创建新的报销集
  Future<ReimbursementSetEntity> createReimbursementSet({
    required String setName,
    String? description,
    required List<String> invoiceIds,
  });
  
  /// 更新报销集基础信息
  Future<ReimbursementSetEntity> updateReimbursementSet(
    String id, {
    String? setName,
    String? description,
  });
  
  /// 更新报销集状态
  Future<ReimbursementSetEntity> updateReimbursementSetStatus(
    String id,
    ReimbursementSetStatus status, {
    String? approvalNotes,
  });
  
  /// 删除报销集
  Future<void> deleteReimbursementSet(String id);
  
  /// 向报销集中添加发票
  Future<void> addInvoicesToSet(String setId, List<String> invoiceIds);
  
  /// 从报销集中移除发票
  Future<void> removeInvoicesFromSet(List<String> invoiceIds);
  
  /// 获取报销集中的发票列表
  Future<List<InvoiceEntity>> getInvoicesInSet(String setId);
  
  /// 获取未分配到任何报销集的发票
  Future<List<InvoiceEntity>> getUnassignedInvoices({
    int? limit,
    int? offset,
  });
  
  /// 检查发票是否可以添加到报销集（未被其他报销集占用）
  Future<bool> canAssignInvoicesToSet(List<String> invoiceIds);
  
  /// 获取报销集统计信息
  Future<ReimbursementSetStats> getReimbursementSetStats();
}

/// 报销集统计信息
class ReimbursementSetStats {
  final int totalSets;
  final int draftSets;
  final int submittedSets;
  final int reimbursedSets;
  final double totalAmount;
  final int totalInvoices;
  final int unassignedInvoices;

  const ReimbursementSetStats({
    required this.totalSets,
    required this.draftSets,
    required this.submittedSets,
    required this.reimbursedSets,
    required this.totalAmount,
    required this.totalInvoices,
    required this.unassignedInvoices,
  });
}