import '../utils/logger.dart';
import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';
import '../network/supabase_client.dart';
import '../config/app_config.dart';
import '../../domain/entities/invoice_entity.dart';

/// 发票文件处理工具类
/// 提供可复用的PDF下载和处理功能
class InvoiceFileUtils {
  /// 安全的日志记录方法 - 避免敏感信息泄露
  static void _logSecure(String message, {String? sensitiveData}) {
    if (AppConfig.enableLogging && AppConfig.isDebugMode) {
      if (sensitiveData != null) {
        // 脱敏处理：只显示前3和后3个字符
        final maskedData = sensitiveData.length > 6
            ? '${sensitiveData.substring(0, 3)}***${sensitiveData.substring(sensitiveData.length - 3)}'
            : '***';
        AppLogger.debug('$message $maskedData', tag: 'Debug');
      } else {
        AppLogger.debug(message, tag: 'SecureLog');
      }
    }
  }

  /// 文件下载安全限制配置
  static const int _maxFileSize = 50 * 1024 * 1024; // 50MB
  static const Duration _downloadTimeout = Duration(seconds: 60); // 60秒超时
  static const int _maxRetries = 3; // 最大重试次数
  static const Duration _retryDelay = Duration(seconds: 2); // 重试间隔

  /// 获取发票的有效PDF字节数据
  /// 使用与批量下载完全相同的逻辑，增加安全检查和重试机制
  static Future<Uint8List> getInvoicePdfBytes(InvoiceEntity invoice) async {
    _logSecure('📥 [下载] 正在下载发票', sensitiveData: invoice.fileUrl);

    // 检查文件信息（与批量下载一致）
    if (!invoice.hasFile) {
      _logSecure('⚠️ [下载] 发票无文件: ${invoice.invoiceNumber}');
      throw Exception('发票没有关联的文件信息');
    }

    // 检查网络连接状态
    if (!await _isNetworkAvailable()) {
      throw createSafeException('网络不可用，请检查网络连接', 'Network unavailable');
    }

    // 解析文件路径
    final String filePath;
    try {
      filePath = SupabaseClientManager.extractFilePathFromUrl(invoice.fileUrl!);
      _logSecure('📥 [下载] 提取的文件路径', sensitiveData: filePath);
    } catch (e) {
      throw createSafeException('文件链接格式错误', e);
    }

    // 带重试的下载
    return await _downloadWithRetry(
      bucketName: 'invoice-files',
      filePath: filePath,
      invoiceNumber: invoice.invoiceNumber,
    );
  }

  /// 带重试机制的下载方法
  static Future<Uint8List> _downloadWithRetry({
    required String bucketName,
    required String filePath,
    required String invoiceNumber,
    int retryCount = 0,
  }) async {
    try {
      _logSecure(
          '📥 [下载] 尝试下载 (${retryCount + 1}/${_maxRetries + 1}): $invoiceNumber');

      // 添加下载超时保护
      final Uint8List fileBytes = await SupabaseClientManager.downloadFile(
        bucketName: bucketName,
        filePath: filePath,
      ).timeout(_downloadTimeout, onTimeout: () {
        throw createSafeException('下载超时',
            'Download timeout after ${_downloadTimeout.inSeconds} seconds');
      });

      // 文件大小安全检查
      if (!_isFileSizeSafe(fileBytes.length)) {
        _logSecure('❌ [安全] 文件大小超限: ${fileBytes.length} bytes');
        throw createSafeException(
            '文件过大', 'File size ${fileBytes.length} exceeds limit');
      }

      // 文件内容安全检查
      if (!_isValidPdfContent(fileBytes)) {
        _logSecure('❌ [安全] PDF文件格式验证失败');
        throw createSafeException('文件格式异常', 'Invalid PDF format detected');
      }

      _logSecure('✅ [下载] 成功下载: $invoiceNumber (${fileBytes.length} bytes)');
      return fileBytes;
    } catch (e) {
      _logSecure('❌ [下载] 下载失败 (尝试 ${retryCount + 1}): $invoiceNumber - $e');

      // 如果是安全检查错误，不重试
      if (e.toString().contains('文件过大') ||
          e.toString().contains('文件格式异常') ||
          e.toString().contains('文件链接格式错误')) {
        rethrow;
      }

      // 达到最大重试次数
      if (retryCount >= _maxRetries) {
        throw createSafeException('下载失败，已重试$_maxRetries次', e);
      }

      // 等待后重试
      _logSecure('⏳ [下载] ${_retryDelay.inSeconds}秒后重试...');
      await Future.delayed(_retryDelay);

      // 重试前再次检查网络
      if (!await _isNetworkAvailable()) {
        throw createSafeException('网络连接中断，请检查网络后重试', 'Network connection lost');
      }

      return await _downloadWithRetry(
        bucketName: bucketName,
        filePath: filePath,
        invoiceNumber: invoiceNumber,
        retryCount: retryCount + 1,
      );
    }
  }

  /// 检查网络可用性
  static Future<bool> _isNetworkAvailable() async {
    try {
      // 简单的网络连接检查
      final result = await HttpClient()
          .getUrl(Uri.parse('https://www.google.com'))
          .timeout(Duration(seconds: 5));
      final response = await result.close().timeout(Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (e) {
      _logSecure('❌ [网络] 网络连接检查失败: $e');
      return false;
    }
  }

  /// 下载发票PDF到临时文件
  /// 返回File对象，用于分享或打开
  static Future<File> downloadInvoicePdfToTempFile(
      InvoiceEntity invoice) async {
    try {
      // 获取PDF字节数据
      final fileBytes = await getInvoicePdfBytes(invoice);

      // 保存到临时文件
      final directory = await getTemporaryDirectory();
      final fileName = _generateFileName(invoice);
      final file = File('${directory.path}/$fileName');

      await file.writeAsBytes(fileBytes);

      return file;
    } catch (e) {
      rethrow;
    }
  }

  /// 生成安全的文件名（新规则：消费日期+销售方+金额.pdf）
  static String _generateFileName(InvoiceEntity invoice) {
    // 使用新的文件名生成规则
    return generateInvoiceFileName(invoice);
  }

  /// 检查发票是否有有效的PDF文件（与批量下载完全相同的逻辑）
  static bool hasValidPdfFile(InvoiceEntity invoice) {
    // 与批量下载一致的检查：使用 invoice.hasFile
    return invoice.hasFile;
  }

  /// 获取发票文件的显示名称（用于UI显示）
  static String getInvoiceDisplayName(InvoiceEntity invoice) {
    return invoice.sellerName ?? '未知发票';
  }

  /// 生成发票文件名：消费日期+销售方+金额.pdf
  static String generateInvoiceFileName(InvoiceEntity invoice) {
    // 格式化消费日期 (YYYY-MM-DD)
    String dateStr = '未知日期';
    if (invoice.consumptionDate != null) {
      final date = invoice.consumptionDate!;
      dateStr =
          '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    }

    // 销售方名称（清理特殊字符，避免文件名问题）
    String sellerName = invoice.sellerName ?? '未知销售方';
    // 移除文件名中不允许的字符
    sellerName = sellerName.replaceAll(RegExp(r'[<>:"/\\|?*]'), '_');

    // 金额（保留两位小数）
    String amountStr = '0.00元';
    if (invoice.totalAmount != null) {
      amountStr = '${invoice.totalAmount!.toStringAsFixed(2)}元';
    }

    // 组合文件名：消费日期+销售方+金额.pdf
    return '${dateStr}_${sellerName}_$amountStr.pdf';
  }

  /// 获取PDF的签名下载URL（用于在浏览器中打开）
  static Future<String> getPdfDownloadUrl(InvoiceEntity invoice) async {
    if (!invoice.hasFile) {
      throw Exception('发票没有关联的文件信息');
    }

    try {
      // 提取文件路径
      final filePath =
          SupabaseClientManager.extractFilePathFromUrl(invoice.fileUrl!);

      // 获取带认证的签名URL，设置较长的过期时间（2小时）
      final signedUrl = await SupabaseClientManager.getSignedUrl(
        bucketName: 'invoice-files',
        filePath: filePath,
        expiresIn: 7200, // 2小时过期
      );

      return signedUrl;
    } catch (e) {
      throw createSafeException('获取PDF访问链接失败', e);
    }
  }

  /// 处理常见的下载错误，返回用户友好的错误消息（脱敏处理）
  static String getDownloadErrorMessage(dynamic error) {
    final errorString = error.toString().toLowerCase();

    // 网络相关错误
    if (errorString.contains('超时') || errorString.contains('timeout')) {
      return '网络超时，请检查网络连接';
    }

    // 文件不存在
    if (errorString.contains('404') || errorString.contains('not found')) {
      return 'PDF文件不存在';
    }

    // 权限相关错误
    if (errorString.contains('403') ||
        errorString.contains('unauthorized') ||
        errorString.contains('forbidden')) {
      return '没有访问权限';
    }

    // 认证相关错误
    if (errorString.contains('401') ||
        errorString.contains('未认证') ||
        errorString.contains('unauthenticated')) {
      return '请先登录';
    }

    // URL解析错误
    if (errorString.contains('无法解析文件路径') ||
        errorString.contains('invalid url') ||
        errorString.contains('url格式') ||
        errorString.contains('不受信任的域名')) {
      return '文件链接格式错误';
    }

    // 文件信息错误
    if (errorString.contains('没有关联的文件信息') || errorString.contains('无文件')) {
      return '该发票没有PDF文件';
    }

    // 网络连接错误
    if (errorString.contains('connection') ||
        errorString.contains('network') ||
        errorString.contains('连接')) {
      return '网络连接异常，请重试';
    }

    // 文件大小或格式错误
    if (errorString.contains('file size') ||
        errorString.contains('format') ||
        errorString.contains('文件大小') ||
        errorString.contains('格式')) {
      return '文件格式或大小异常';
    }

    // SSL/TLS错误
    if (errorString.contains('certificate') ||
        errorString.contains('ssl') ||
        errorString.contains('tls')) {
      return '安全连接异常，请重试';
    }

    // 服务器错误
    if (errorString.contains('500') ||
        errorString.contains('502') ||
        errorString.contains('503') ||
        errorString.contains('server error')) {
      return '服务器暂时不可用，请稍后重试';
    }

    // 通用错误 - 不暴露具体错误详情
    _logSecure('❌ [错误] 下载错误详情', sensitiveData: error.toString());
    return '下载失败，请重试';
  }

  /// 安全的异常处理 - 记录详细错误但返回用户友好的消息
  static Exception createSafeException(
      String userMessage, dynamic originalError) {
    // 在调试模式下记录详细错误
    if (AppConfig.enableLogging && AppConfig.isDebugMode) {
      _logSecure('❌ [异常] 详细错误信息', sensitiveData: originalError?.toString());
    }

    // 返回脱敏的异常信息
    return Exception(userMessage);
  }

  /// 检查文件大小是否安全
  static bool _isFileSizeSafe(int fileSize) {
    if (fileSize <= 0) {
      return false;
    }

    if (fileSize > _maxFileSize) {
      return false;
    }

    return true;
  }

  /// 验证PDF文件内容格式
  static bool _isValidPdfContent(Uint8List fileBytes) {
    if (fileBytes.isEmpty) {
      return false;
    }

    // 检查PDF文件头
    if (fileBytes.length < 5) {
      return false;
    }

    // PDF文件应该以 "%PDF-" 开头
    final String header = String.fromCharCodes(fileBytes.take(5));
    if (!header.startsWith('%PDF-')) {
      return false;
    }

    // 检查PDF文件尾部是否有EOF标记
    if (fileBytes.length >= 5) {
      final String tail =
          String.fromCharCodes(fileBytes.skip(fileBytes.length - 5));
      if (!tail.contains('%%EOF')) {
        // 有些PDF文件可能在EOF后还有额外字符，检查更大的尾部范围
        if (fileBytes.length >= 20) {
          final String largeTail =
              String.fromCharCodes(fileBytes.skip(fileBytes.length - 20));
          if (!largeTail.contains('%%EOF')) {
            _logSecure('⚠️ [安全] PDF文件缺少EOF标记');
            return false;
          }
        } else {
          return false;
        }
      }
    }

    return true;
  }
}
