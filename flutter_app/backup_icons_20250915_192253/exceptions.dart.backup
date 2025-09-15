/// 核心异常定义
library;

/// 服务器异常
class ServerException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic originalError;

  const ServerException({
    required this.message,
    this.statusCode,
    this.originalError,
  });

  @override
  String toString() => 'ServerException: $message';
}

/// 缓存异常
class CacheException implements Exception {
  final String message;
  final dynamic originalError;

  const CacheException({
    required this.message,
    this.originalError,
  });

  @override
  String toString() => 'CacheException: $message';
}

/// 网络异常
class NetworkException implements Exception {
  final String message;
  final dynamic originalError;

  const NetworkException({
    required this.message,
    this.originalError,
  });

  @override
  String toString() => 'NetworkException: $message';
}

/// 解析异常
class ParseException implements Exception {
  final String message;
  final dynamic originalError;

  const ParseException({
    required this.message,
    this.originalError,
  });

  @override
  String toString() => 'ParseException: $message';
}

/// 验证异常
class ValidationException implements Exception {
  final String message;
  final Map<String, dynamic>? errors;

  const ValidationException({
    required this.message,
    this.errors,
  });

  @override
  String toString() => 'ValidationException: $message';
}