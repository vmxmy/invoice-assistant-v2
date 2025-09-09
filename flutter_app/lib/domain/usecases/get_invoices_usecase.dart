import '../repositories/invoice_repository.dart';

/// 获取发票列表用例
class GetInvoicesUseCase {
  final InvoiceRepository _repository;

  const GetInvoicesUseCase(this._repository);

  /// 执行用例 - 获取发票列表
  Future<InvoiceListResult> call({
    int page = 1,
    int pageSize = 20,
    InvoiceFilters? filters,
    String sortField = 'created_at',
    bool sortAscending = false,
  }) async {
    // 这里可以添加业务逻辑验证
    if (page < 1) {
      throw ArgumentError('页码必须大于0');
    }
    
    if (pageSize < 1 || pageSize > 100) {
      throw ArgumentError('每页大小必须在1-100之间');
    }

    return await _repository.getInvoices(
      page: page,
      pageSize: pageSize,
      filters: filters,
      sortField: sortField,
      sortAscending: sortAscending,
    );
  }
}