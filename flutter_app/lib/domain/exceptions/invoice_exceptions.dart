/// 发票相关异常定义
abstract class InvoiceException implements Exception {
  final String message;
  final String? errorCode;
  final dynamic originalError;

  const InvoiceException(this.message, {this.errorCode, this.originalError});

  @override
  String toString() => message;
}

/// 发票未找到异常
class InvoiceNotFoundException extends InvoiceException {
  const InvoiceNotFoundException(String invoiceId)
      : super('发票不存在或已被删除', errorCode: 'INVOICE_NOT_FOUND');
}

/// 权限不足异常
class InvoicePermissionDeniedException extends InvoiceException {
  const InvoicePermissionDeniedException()
      : super('没有权限访问此发票', errorCode: 'PERMISSION_DENIED');
}

/// 网络异常
class InvoiceNetworkException extends InvoiceException {
  const InvoiceNetworkException(super.message, {super.originalError})
      : super(errorCode: 'NETWORK_ERROR');
}

/// 数据格式异常
class InvoiceDataFormatException extends InvoiceException {
  const InvoiceDataFormatException(String message, {dynamic originalError})
      : super('发票数据格式异常: $message',
            errorCode: 'DATA_FORMAT_ERROR', originalError: originalError);
}

/// 服务器异常
class InvoiceServerException extends InvoiceException {
  const InvoiceServerException(String message, {dynamic originalError})
      : super('服务器错误: $message',
            errorCode: 'SERVER_ERROR', originalError: originalError);
}

/// 跨用户发票重复异常
class CrossUserDuplicateException extends InvoiceException {
  final String invoiceNumber;
  final String originalUserEmail;
  final String originalUploadTime;
  final String originalInvoiceId;
  final double similarityScore;
  final String warning;
  final List<String> recommendations;

  const CrossUserDuplicateException({
    required String message,
    required this.invoiceNumber,
    required this.originalUserEmail,
    required this.originalUploadTime,
    required this.originalInvoiceId,
    required this.similarityScore,
    required this.warning,
    required this.recommendations,
  }) : super(message, errorCode: 'CROSS_USER_DUPLICATE');

  @override
  String toString() {
    return '跨用户发票重复: $message\n'
        '发票号: $invoiceNumber\n'
        '原用户: $originalUserEmail\n'
        '上传时间: $originalUploadTime\n'
        '相似度: ${(similarityScore * 100).toStringAsFixed(1)}%';
  }
}
