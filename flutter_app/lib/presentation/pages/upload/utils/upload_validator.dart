import 'dart:io';
import 'upload_config.dart';

/// 文件上传验证器
class UploadValidator {
  /// 验证结果
  static const ValidationResult success = ValidationResult.success();

  /// 验证单个文件
  static ValidationResult validateFile(File file) {
    // 检查文件是否存在
    if (!file.existsSync()) {
      return const ValidationResult.error('文件不存在');
    }

    // 检查文件大小
    final fileSize = file.lengthSync();
    if (fileSize > UploadConfig.maxFileSize) {
      final maxSizeMB = UploadConfig.maxFileSize / (1024 * 1024);
      return ValidationResult.error('文件大小超过限制（最大${maxSizeMB.toInt()}MB）');
    }

    if (fileSize == 0) {
      return const ValidationResult.error('文件为空');
    }

    // 检查文件扩展名
    final extension = _getFileExtension(file.path).toLowerCase();
    if (!UploadConfig.supportedExtensions.contains(extension)) {
      return ValidationResult.error(
          '不支持的文件格式，支持格式：${UploadConfig.supportedExtensions.join(', ')}');
    }

    return success;
  }

  /// 验证文件列表
  static ValidationResult validateFileList(List<File> files) {
    if (files.isEmpty) {
      return const ValidationResult.error('请选择要上传的文件');
    }

    if (files.length > UploadConfig.maxFileCount) {
      return ValidationResult.error(
          '文件数量超过限制（最多${UploadConfig.maxFileCount}个）');
    }

    // 检查重复文件
    final fileNames = <String>{};
    for (final file in files) {
      final fileName = _getFileName(file.path);
      if (fileNames.contains(fileName)) {
        return ValidationResult.error('存在重复文件：$fileName');
      }
      fileNames.add(fileName);

      // 验证单个文件
      final result = validateFile(file);
      if (!result.isValid) {
        return ValidationResult.error('$fileName: ${result.errorMessage}');
      }
    }

    return success;
  }

  /// 验证文件路径
  static ValidationResult validateFilePath(String filePath) {
    if (filePath.isEmpty) {
      return const ValidationResult.error('文件路径为空');
    }

    return validateFile(File(filePath));
  }

  /// 获取文件扩展名
  static String _getFileExtension(String filePath) {
    final lastDotIndex = filePath.lastIndexOf('.');
    if (lastDotIndex == -1 || lastDotIndex == filePath.length - 1) {
      return '';
    }
    return filePath.substring(lastDotIndex + 1);
  }

  /// 获取文件名
  static String _getFileName(String filePath) {
    return filePath.split('/').last;
  }

  /// 格式化文件大小
  static String formatFileSize(int bytes) {
    if (bytes < 1024) {
      return '$bytes B';
    } else if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    } else {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
  }

  /// 检查是否为图片文件
  static bool isImageFile(String filePath) {
    final extension = _getFileExtension(filePath).toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp'].contains(extension);
  }

  /// 检查是否为PDF文件
  static bool isPdfFile(String filePath) {
    final extension = _getFileExtension(filePath).toLowerCase();
    return extension == 'pdf';
  }
}

/// 验证结果类
class ValidationResult {
  final bool isValid;
  final String? errorMessage;

  const ValidationResult._({
    required this.isValid,
    this.errorMessage,
  });

  const ValidationResult.success() : this._(isValid: true);

  const ValidationResult.error(String message)
      : this._(
          isValid: false,
          errorMessage: message,
        );

  @override
  String toString() {
    if (isValid) {
      return 'ValidationResult.success()';
    } else {
      return 'ValidationResult.error($errorMessage)';
    }
  }
}
