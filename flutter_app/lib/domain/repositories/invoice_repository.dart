import 'dart:typed_data';
import '../entities/invoice_entity.dart';
import '../value_objects/invoice_status.dart';
import '../usecases/upload_invoice_usecase.dart';

/// 发票仓库接口 - 定义业务需要的数据操作方法
/// 这是一个抽象接口，具体实现在数据层
abstract class InvoiceRepository {
  /// 获取发票列表
  Future<InvoiceListResult> getInvoices({
    int page = 1,
    int pageSize = 20,
    InvoiceFilters? filters,
    String sortField = 'created_at',
    bool sortAscending = false,
  });

  /// 根据ID获取发票详情
  Future<InvoiceEntity> getInvoiceById(String id);

  /// 创建新发票
  Future<InvoiceEntity> createInvoice(CreateInvoiceRequest request);

  /// 更新发票
  Future<InvoiceEntity> updateInvoice(String id, UpdateInvoiceRequest request);

  /// 更新发票状态
  Future<void> updateInvoiceStatus(String id, InvoiceStatus status);

  /// 删除发票（软删除）
  Future<void> deleteInvoice(String id);

  /// 批量删除发票
  Future<void> deleteInvoices(List<String> ids);

  /// 获取发票统计信息
  Future<InvoiceStats> getInvoiceStats();

  /// 上传发票文件并进行OCR处理
  Future<UploadInvoiceResult> uploadInvoice({
    required Uint8List fileBytes,
    required String fileName,
    required String fileHash,
  });
}

/// 发票列表结果
class InvoiceListResult {
  final List<InvoiceEntity> invoices;
  final int total;
  final int page;
  final int pageSize;
  final bool hasMore;

  const InvoiceListResult({
    required this.invoices,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.hasMore,
  });
}

/// 发票筛选参数
class InvoiceFilters {
  final String? sellerName;
  final String? buyerName;
  final String? invoiceNumber;
  final String? invoiceType;
  final DateTime? dateFrom;
  final DateTime? dateTo;
  final double? amountMin;
  final double? amountMax;
  final List<InvoiceStatus>? status;
  final List<InvoiceSource>? source;
  final String? category;
  final List<String>? tags;
  final String? globalSearch;
  final bool? isVerified;
  final bool? overdue;
  final bool? urgent;
  final bool? forceRefresh; // 强制刷新，绕过缓存

  const InvoiceFilters({
    this.sellerName,
    this.buyerName,
    this.invoiceNumber,
    this.invoiceType,
    this.dateFrom,
    this.dateTo,
    this.amountMin,
    this.amountMax,
    this.status,
    this.source,
    this.category,
    this.tags,
    this.globalSearch,
    this.isVerified,
    this.overdue,
    this.urgent,
    this.forceRefresh,
  });
}

/// 创建发票请求
class CreateInvoiceRequest {
  final String invoiceNumber;
  final DateTime invoiceDate;
  final DateTime? consumptionDate;
  final String? sellerName;
  final String? buyerName;
  final double amount;
  final double? totalAmount;
  final double? taxAmount;
  final String? currency;
  final String? category;
  final String? invoiceType;
  final String? fileUrl;
  final String? filePath;
  final Map<String, dynamic>? extractedData;

  const CreateInvoiceRequest({
    required this.invoiceNumber,
    required this.invoiceDate,
    this.consumptionDate,
    this.sellerName,
    this.buyerName,
    required this.amount,
    this.totalAmount,
    this.taxAmount,
    this.currency = 'CNY',
    this.category,
    this.invoiceType,
    this.fileUrl,
    this.filePath,
    this.extractedData,
  });
}

/// 更新发票请求
class UpdateInvoiceRequest {
  final String? invoiceNumber;
  final DateTime? invoiceDate;
  final DateTime? consumptionDate;
  final String? sellerName;
  final String? buyerName;
  final double? amount;
  final double? totalAmount;
  final double? taxAmount;
  final String? currency;
  final String? category;
  final InvoiceStatus? status;
  final String? invoiceType;
  final String? fileUrl;
  final String? filePath;
  final bool? isVerified;
  final String? verificationNotes;
  final Map<String, dynamic>? extractedData;

  const UpdateInvoiceRequest({
    this.invoiceNumber,
    this.invoiceDate,
    this.consumptionDate,
    this.sellerName,
    this.buyerName,
    this.amount,
    this.totalAmount,
    this.taxAmount,
    this.currency,
    this.category,
    this.status,
    this.invoiceType,
    this.fileUrl,
    this.filePath,
    this.isVerified,
    this.verificationNotes,
    this.extractedData,
  });
}

/// 发票统计数据
class InvoiceStats {
  final int totalCount;
  final int monthlyCount;
  final double totalAmount;
  final double monthlyAmount;
  final double averageAmount;
  final DateTime? lastInvoiceDate;
  final Map<String, int> statusCounts;
  final Map<String, double> categoryAmounts;
  final Map<String, int> sourceCounts;

  const InvoiceStats({
    required this.totalCount,
    required this.monthlyCount,
    required this.totalAmount,
    required this.monthlyAmount,
    required this.averageAmount,
    this.lastInvoiceDate,
    required this.statusCounts,
    required this.categoryAmounts,
    required this.sourceCounts,
  });

  /// 动态获取特定状态的计数
  int getStatusCount(String status) {
    return statusCounts[status] ?? 0;
  }

  /// 动态获取已报销发票数量
  int get reimbursedCount => getStatusCount('已报销');

  /// 动态获取未报销发票数量
  int get unreimbursedCount => getStatusCount('未报销');
}