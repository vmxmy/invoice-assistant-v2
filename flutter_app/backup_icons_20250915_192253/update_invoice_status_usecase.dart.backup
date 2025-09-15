// import '../entities/invoice_entity.dart'; // 未使用
import '../repositories/invoice_repository.dart';
import '../value_objects/invoice_status.dart';

/// 更新发票状态用例
class UpdateInvoiceStatusUseCase {
  final InvoiceRepository _repository;

  const UpdateInvoiceStatusUseCase(this._repository);

  /// 执行用例 - 更新发票状态
  Future<void> call(String invoiceId, InvoiceStatus newStatus) async {
    // 业务逻辑验证
    if (invoiceId.isEmpty) {
      throw ArgumentError('发票ID不能为空');
    }

    return await _repository.updateInvoiceStatus(invoiceId, newStatus);
  }
}
