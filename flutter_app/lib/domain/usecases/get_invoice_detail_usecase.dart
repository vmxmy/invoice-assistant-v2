import '../entities/invoice_entity.dart';
import '../repositories/invoice_repository.dart';

/// 获取发票详情用例
class GetInvoiceDetailUseCase {
  final InvoiceRepository _repository;

  const GetInvoiceDetailUseCase(this._repository);

  /// 通过ID获取发票详情
  /// 
  /// [invoiceId] 发票ID
  /// 返回 [InvoiceEntity] 发票详情实体
  Future<InvoiceEntity> call(String invoiceId) async {
    if (invoiceId.isEmpty) {
      throw ArgumentError('发票ID不能为空');
    }

    try {
      final invoice = await _repository.getInvoiceById(invoiceId);
      return invoice;
    } catch (error) {
      // 重新抛出异常以便上层处理
      rethrow;
    }
  }
}