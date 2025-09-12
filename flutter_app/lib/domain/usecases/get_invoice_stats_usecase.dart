import '../repositories/invoice_repository.dart';

/// 获取发票统计用例
class GetInvoiceStatsUseCase {
  final InvoiceRepository _repository;

  const GetInvoiceStatsUseCase(this._repository);

  /// 执行用例 - 获取发票统计信息
  Future<InvoiceStats> call() async {
    return await _repository.getInvoiceStats();
  }
}
