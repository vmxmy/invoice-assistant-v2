import '../../core/utils/logger.dart';
import 'dart:io';
import 'dart:typed_data';
// import 'dart:convert'; // 未使用
import 'package:crypto/crypto.dart';
import '../repositories/invoice_repository.dart';
import '../entities/invoice_entity.dart';
import '../../core/config/app_config.dart';

/// 发票上传用例
class UploadInvoiceUseCase {
  final InvoiceRepository repository;

  const UploadInvoiceUseCase(this.repository);

  /// 上传单个发票文件并进行OCR处理
  Future<UploadInvoiceResult> call(UploadInvoiceParams params) async {
    if (AppConfig.enableLogging) {
      AppLogger.debug('📤 [UploadInvoiceUseCase] 开始上传发票文件', tag: 'Debug');
      AppLogger.debug('📤 [UploadInvoiceUseCase] 文件路径: ${params.filePath}',
          tag: 'Debug');
    }

    try {
      // 验证文件
      final file = File(params.filePath);
      if (!await file.exists()) {
        throw UploadInvoiceException('文件不存在: ${params.filePath}');
      }

      final fileBytes = await file.readAsBytes();
      if (fileBytes.isEmpty) {
        throw UploadInvoiceException('文件为空');
      }

      // 计算文件哈希用于去重检查
      final fileHash = _calculateFileHash(fileBytes);

      if (AppConfig.enableLogging) {
        AppLogger.debug(
            '📤 [UploadInvoiceUseCase] 文件哈希: ${fileHash.substring(0, 16)}...',
            tag: 'Debug');
        AppLogger.debug(
            '📤 [UploadInvoiceUseCase] 文件大小: ${fileBytes.length} bytes',
            tag: 'Debug');
      }

      // 调用远程数据源进行上传和OCR处理
      final result = await repository.uploadInvoice(
        fileBytes: fileBytes,
        fileName: _getFileName(params.filePath),
        fileHash: fileHash,
      );

      if (AppConfig.enableLogging) {
        AppLogger.debug('✅ [UploadInvoiceUseCase] 发票上传成功', tag: 'Debug');
        AppLogger.debug('✅ [UploadInvoiceUseCase] 发票ID: ${result.invoice?.id}',
            tag: 'Debug');
        AppLogger.debug('✅ [UploadInvoiceUseCase] 是否重复: ${result.isDuplicate}',
            tag: 'Debug');
      }

      return result;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ [UploadInvoiceUseCase] 上传失败: $e', tag: 'Debug');
      }

      if (e is UploadInvoiceException) {
        rethrow;
      }

      throw UploadInvoiceException('上传失败: ${e.toString()}');
    }
  }

  /// 批量上传发票文件
  Future<List<UploadInvoiceResult>> callBatch(
      List<UploadInvoiceParams> paramsList) async {
    if (AppConfig.enableLogging) {
      AppLogger.debug(
          '📤 [UploadInvoiceUseCase] 开始批量上传 ${paramsList.length} 个文件',
          tag: 'Debug');
    }

    final results = <UploadInvoiceResult>[];

    for (int i = 0; i < paramsList.length; i++) {
      try {
        final result = await call(paramsList[i]);
        results.add(result);

        if (AppConfig.enableLogging) {
          AppLogger.debug(
              '✅ [UploadInvoiceUseCase] 批量上传进度: ${i + 1}/${paramsList.length}',
              tag: 'Debug');
        }
      } catch (e) {
        if (AppConfig.enableLogging) {
          AppLogger.debug('❌ [UploadInvoiceUseCase] 批量上传第${i + 1}个文件失败: $e',
              tag: 'Debug');
        }

        results.add(UploadInvoiceResult.error(
          error: e is UploadInvoiceException
              ? e
              : UploadInvoiceException(e.toString()),
          fileName: _getFileName(paramsList[i].filePath),
        ));
      }
    }

    if (AppConfig.enableLogging) {
      final successCount = results.where((r) => r.isSuccess).length;
      AppLogger.debug(
          '✅ [UploadInvoiceUseCase] 批量上传完成: $successCount/${paramsList.length} 成功',
          tag: 'Debug');
    }

    return results;
  }

  /// 计算文件SHA-256哈希值
  String _calculateFileHash(Uint8List fileBytes) {
    final digest = sha256.convert(fileBytes);
    return digest.toString();
  }

  /// 从文件路径提取文件名
  String _getFileName(String filePath) {
    return filePath.split('/').last;
  }
}

/// 上传发票参数
class UploadInvoiceParams {
  final String filePath;
  final Map<String, dynamic>? metadata;

  const UploadInvoiceParams({
    required this.filePath,
    this.metadata,
  });
}

/// 上传发票结果
class UploadInvoiceResult {
  final InvoiceEntity? invoice;
  final bool isDuplicate;
  final DuplicateInvoiceInfo? duplicateInfo;
  final UploadInvoiceException? error;
  final String? fileName;
  final bool isSuccess;

  const UploadInvoiceResult._({
    this.invoice,
    this.isDuplicate = false,
    this.duplicateInfo,
    this.error,
    this.fileName,
    required this.isSuccess,
  });

  /// 成功上传新发票
  factory UploadInvoiceResult.success({
    required InvoiceEntity invoice,
  }) {
    return UploadInvoiceResult._(
      invoice: invoice,
      isSuccess: true,
    );
  }

  /// 检测到重复发票
  factory UploadInvoiceResult.duplicate({
    required DuplicateInvoiceInfo duplicateInfo,
    String? fileName,
  }) {
    return UploadInvoiceResult._(
      isDuplicate: true,
      duplicateInfo: duplicateInfo,
      fileName: fileName,
      isSuccess: true,
    );
  }

  /// 上传失败
  factory UploadInvoiceResult.error({
    required UploadInvoiceException error,
    String? fileName,
  }) {
    return UploadInvoiceResult._(
      error: error,
      fileName: fileName,
      isSuccess: false,
    );
  }
}

/// 重复发票信息
class DuplicateInvoiceInfo {
  final String existingInvoiceId;
  final InvoiceEntity? existingInvoice;
  final int uploadCount;
  final String message;
  final bool canRestore;
  final InvoiceEntity? deletedInvoice;

  const DuplicateInvoiceInfo({
    required this.existingInvoiceId,
    this.existingInvoice,
    required this.uploadCount,
    required this.message,
    this.canRestore = false,
    this.deletedInvoice,
  });
}

/// 上传发票异常
class UploadInvoiceException implements Exception {
  final String message;
  final String? code;
  final dynamic originalError;

  const UploadInvoiceException(
    this.message, {
    this.code,
    this.originalError,
  });

  @override
  String toString() => 'UploadInvoiceException: $message';
}
