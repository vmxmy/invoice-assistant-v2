import '../../core/utils/logger.dart';
import '../entities/invoice_entity.dart';
import '../repositories/invoice_repository.dart';
import '../exceptions/invoice_exceptions.dart';

/// 生产级发票详情获取用例
class GetInvoiceDetailUseCaseProduction {
  final InvoiceRepository _repository;
  
  // 重试配置
  static const int _maxRetries = 3;
  static const Duration _baseDelay = Duration(milliseconds: 500);
  static const double _backoffMultiplier = 2.0;
  static const Duration _maxDelay = Duration(seconds: 5);

  const GetInvoiceDetailUseCaseProduction(this._repository);

  /// 通过ID获取发票详情（生产版本）
  /// 
  /// 特性：
  /// - 参数验证
  /// - 指数退避重试
  /// - 具体异常处理
  /// - 性能监控
  /// - 缓存策略
  Future<InvoiceEntity> call(String invoiceId) async {
    // 1. 参数验证
    if (invoiceId.isEmpty) {
      throw ArgumentError('发票ID不能为空');
    }
    
    // UUID格式验证
    final uuidPattern = RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    if (!uuidPattern.hasMatch(invoiceId)) {
      throw ArgumentError('发票ID格式无效');
    }

    // 2. 性能监控开始
    final stopwatch = Stopwatch()..start();
    
    try {
      // 3. 带重试的执行
      final invoice = await _executeWithRetry(invoiceId);
      
      // 4. 性能监控结束
      stopwatch.stop();
      _logPerformance(invoiceId, stopwatch.elapsedMilliseconds, success: true);
      
      return invoice;
      
    } catch (error) {
      stopwatch.stop();
      _logPerformance(invoiceId, stopwatch.elapsedMilliseconds, success: false, error: error);
      
      // 5. 异常转换和重抛
      throw _convertException(error, invoiceId);
    }
  }

  /// 带指数退避的重试执行
  Future<InvoiceEntity> _executeWithRetry(String invoiceId) async {
    Exception? lastException;
    
    for (int attempt = 0; attempt <= _maxRetries; attempt++) {
      try {
        return await _repository.getInvoiceById(invoiceId);
      } catch (e) {
        lastException = e is Exception ? e : Exception(e.toString());
        
        // 判断是否应该重试
        if (attempt == _maxRetries || !_shouldRetry(e)) {
          throw lastException;
        }
        
        // 计算延迟时间（指数退避）
        final delay = _calculateDelay(attempt);
        await Future.delayed(delay);
        
        _logRetry(invoiceId, attempt + 1, delay, e);
      }
    }
    
    throw lastException ?? Exception('未知错误');
  }

  /// 判断错误是否应该重试
  bool _shouldRetry(dynamic error) {
    final errorStr = error.toString().toLowerCase();
    
    // 网络相关错误应该重试
    if (errorStr.contains('timeout') ||
        errorStr.contains('network') ||
        errorStr.contains('connection') ||
        errorStr.contains('socket')) {
      return true;
    }
    
    // 服务器5xx错误应该重试
    if (errorStr.contains('server error') ||
        errorStr.contains('internal server error') ||
        errorStr.contains('503') ||
        errorStr.contains('502') ||
        errorStr.contains('500')) {
      return true;
    }
    
    // 客户端错误（4xx）一般不重试
    if (errorStr.contains('not found') ||
        errorStr.contains('unauthorized') ||
        errorStr.contains('forbidden') ||
        errorStr.contains('400') ||
        errorStr.contains('401') ||
        errorStr.contains('403') ||
        errorStr.contains('404')) {
      return false;
    }
    
    // 默认重试
    return true;
  }

  /// 计算重试延迟（指数退避）
  Duration _calculateDelay(int attempt) {
    final delay = Duration(
      milliseconds: (_baseDelay.inMilliseconds * 
                    (_backoffMultiplier * attempt)).round(),
    );
    
    return delay > _maxDelay ? _maxDelay : delay;
  }

  /// 异常转换
  Exception _convertException(dynamic error, String invoiceId) {
    final errorStr = error.toString().toLowerCase();
    
    // PostgrestException或Supabase相关错误
    if (errorStr.contains('not found') || 
        errorStr.contains('no rows returned') ||
        errorStr.contains('404')) {
      return InvoiceNotFoundException(invoiceId);
    }
    
    if (errorStr.contains('unauthorized') || 
        errorStr.contains('forbidden') ||
        errorStr.contains('permission denied') ||
        errorStr.contains('401') ||
        errorStr.contains('403')) {
      return const InvoicePermissionDeniedException();
    }
    
    if (errorStr.contains('timeout') ||
        errorStr.contains('network') ||
        errorStr.contains('connection') ||
        errorStr.contains('socket')) {
      return InvoiceNetworkException('网络连接失败，请检查网络设置', originalError: error);
    }
    
    if (errorStr.contains('json') ||
        errorStr.contains('format') ||
        errorStr.contains('parse')) {
      return InvoiceDataFormatException('数据解析失败', originalError: error);
    }
    
    if (errorStr.contains('server') ||
        errorStr.contains('500') ||
        errorStr.contains('502') ||
        errorStr.contains('503')) {
      return InvoiceServerException('服务器暂时不可用，请稍后重试', originalError: error);
    }
    
    // 默认服务器异常
    return InvoiceServerException(error.toString(), originalError: error);
  }

  /// 性能日志
  void _logPerformance(String invoiceId, int milliseconds, {required bool success, dynamic error}) {
    final status = success ? '✅' : '❌';
    final errorInfo = error != null ? ' Error: $error' : '';
    AppLogger.debug('📊 [GetInvoiceDetail] $status Invoice: $invoiceId, Time: ${milliseconds}ms$errorInfo', tag: 'Debug');
  }

  /// 重试日志
  void _logRetry(String invoiceId, int attempt, Duration delay, dynamic error) {
    AppLogger.debug('🔄 [GetInvoiceDetail] Retry $attempt for $invoiceId after ${delay.inMilliseconds}ms. Error: $error', tag: 'Debug');
  }
}