import '../repositories/invoice_repository.dart';

/// 删除发票用例
class DeleteInvoiceUseCase {
  final InvoiceRepository _repository;

  const DeleteInvoiceUseCase(this._repository);

  /// 执行用例 - 删除单个发票
  Future<void> call(String invoiceId) async {
    // 业务规则验证
    if (invoiceId.isEmpty) {
      throw ArgumentError('发票ID不能为空');
    }

    return await _repository.deleteInvoice(invoiceId);
  }

  /// 执行用例 - 批量删除发票
  Future<void> callBatch(List<String> invoiceIds) async {
    // 业务规则验证
    if (invoiceIds.isEmpty) {
      throw ArgumentError('发票ID列表不能为空');
    }

    if (invoiceIds.length > 50) {
      throw ArgumentError('批量删除不能超过50个发票');
    }

    return await _repository.deleteInvoices(invoiceIds);
  }
}
