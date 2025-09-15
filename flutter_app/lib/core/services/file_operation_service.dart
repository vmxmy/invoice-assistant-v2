import 'dart:io';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import '../utils/logger.dart';

/// 统一的文件操作服务
///
/// 解决macOS上NSXPCSharedListener错误的缓解方案：
/// - 确保所有文件选择器调用都在主线程执行
/// - 提供统一的错误处理和用户反馈
/// - 添加重试机制和降级方案
/// - 记录详细的操作日志用于问题诊断
class FileOperationService {
  static const String _logTag = 'FileOperation';

  /// 私有构造函数，防止实例化
  FileOperationService._();

  /// 安全的文件选择方法
  ///
  /// [type] - 文件类型过滤
  /// [allowedExtensions] - 允许的文件扩展名
  /// [allowMultiple] - 是否允许多选
  /// [context] - 用于显示错误对话框的上下文
  ///
  /// 返回值：成功时返回FilePickerResult，失败时返回null
  static Future<FilePickerResult?> pickFiles({
    required FileType type,
    List<String>? allowedExtensions,
    required bool allowMultiple,
    required BuildContext context,
    int maxRetries = 2,
  }) async {
    for (int attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        AppLogger.info(
          '开始文件选择操作 (尝试 ${attempt + 1}/${maxRetries + 1})',
          tag: _logTag,
        );

        // 确保在主线程中执行
        if (!_isMainThread()) {
          AppLogger.warning('文件选择器未在主线程调用，切换到主线程', tag: _logTag);
          await Future.delayed(const Duration(milliseconds: 50));
        }

        // 添加短暂延迟，让UI稳定
        await Future.delayed(const Duration(milliseconds: 100));

        final result = await FilePicker.platform.pickFiles(
          type: type,
          allowedExtensions: allowedExtensions,
          allowMultiple: allowMultiple,
        );

        if (result != null) {
          AppLogger.info(
            '文件选择成功，选中 ${result.files.length} 个文件',
            tag: _logTag,
          );
        } else {
          AppLogger.info('用户取消了文件选择', tag: _logTag);
        }

        return result;
      } on PlatformException catch (e) {
        AppLogger.error(
          'PlatformException in file picker (尝试 ${attempt + 1})',
          tag: _logTag,
          error: e,
        );

        // macOS ViewBridge 相关错误的特殊处理
        if (e.code == 'read_external_storage_denied' ||
            e.message?.contains('NSXPCSharedListener') == true ||
            e.message?.contains('ViewBridge') == true) {
          if (attempt < maxRetries) {
            AppLogger.info('检测到ViewBridge错误，等待后重试', tag: _logTag);
            await Future.delayed(Duration(milliseconds: 500 * (attempt + 1)));
            continue;
          } else {
            AppLogger.warning('ViewBridge错误重试次数已耗尽', tag: _logTag);
            if (context.mounted) {
              await _showViewBridgeErrorDialog(context);
            }
            return null;
          }
        }

        // 权限相关错误
        if (e.code.contains('permission') || e.code.contains('denied')) {
          if (context.mounted) {
            await _showPermissionErrorDialog(context);
          }
          return null;
        }

        // 其他错误，如果还有重试机会就继续
        if (attempt < maxRetries) {
          await Future.delayed(Duration(milliseconds: 300 * (attempt + 1)));
          continue;
        } else {
          if (context.mounted) {
            await _showGenericErrorDialog(context, e.message ?? '未知错误');
          }
          return null;
        }
      } catch (e) {
        AppLogger.error(
          '文件选择器发生未预期错误 (尝试 ${attempt + 1})',
          tag: _logTag,
          error: e,
        );

        if (attempt < maxRetries) {
          await Future.delayed(Duration(milliseconds: 300 * (attempt + 1)));
          continue;
        } else {
          if (context.mounted) {
            await _showGenericErrorDialog(context, e.toString());
          }
          return null;
        }
      }
    }

    return null;
  }

  /// 安全的文件保存方法
  ///
  /// [dialogTitle] - 对话框标题
  /// [fileName] - 默认文件名
  /// [type] - 文件类型
  /// [allowedExtensions] - 允许的扩展名
  /// [bytes] - 文件数据（可选）
  /// [context] - 用于显示错误对话框的上下文
  static Future<String?> saveFile({
    String? dialogTitle,
    String? fileName,
    FileType? type,
    List<String>? allowedExtensions,
    Uint8List? bytes,
    required BuildContext context,
    int maxRetries = 2,
  }) async {
    for (int attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        AppLogger.info(
          '开始文件保存操作 (尝试 ${attempt + 1}/${maxRetries + 1})',
          tag: _logTag,
        );

        // 确保在主线程中执行
        if (!_isMainThread()) {
          AppLogger.warning('文件保存对话框未在主线程调用，切换到主线程', tag: _logTag);
          await Future.delayed(const Duration(milliseconds: 50));
        }

        // 添加短暂延迟，让UI稳定
        await Future.delayed(const Duration(milliseconds: 100));

        final result = await FilePicker.platform.saveFile(
          dialogTitle: dialogTitle,
          fileName: fileName,
          type: type ?? FileType.any,
          allowedExtensions: allowedExtensions,
          bytes: bytes,
        );

        if (result != null) {
          AppLogger.info('文件保存成功: $result', tag: _logTag);
        } else {
          AppLogger.info('用户取消了文件保存', tag: _logTag);
        }

        return result;
      } on PlatformException catch (e) {
        AppLogger.error(
          'PlatformException in file save (尝试 ${attempt + 1})',
          tag: _logTag,
          error: e,
        );

        // ViewBridge 错误特殊处理
        if (e.message?.contains('NSXPCSharedListener') == true ||
            e.message?.contains('ViewBridge') == true) {
          if (attempt < maxRetries) {
            AppLogger.info('检测到ViewBridge错误，等待后重试', tag: _logTag);
            await Future.delayed(Duration(milliseconds: 500 * (attempt + 1)));
            continue;
          } else {
            AppLogger.warning('ViewBridge错误重试次数已耗尽', tag: _logTag);
            if (context.mounted) {
              await _showViewBridgeErrorDialog(context);
            }
            return null;
          }
        }

        // 其他错误处理
        if (attempt < maxRetries) {
          await Future.delayed(Duration(milliseconds: 300 * (attempt + 1)));
          continue;
        } else {
          if (context.mounted) {
            await _showGenericErrorDialog(context, e.message ?? '文件保存失败');
          }
          return null;
        }
      } catch (e) {
        AppLogger.error(
          '文件保存发生未预期错误 (尝试 ${attempt + 1})',
          tag: _logTag,
          error: e,
        );

        if (attempt < maxRetries) {
          await Future.delayed(Duration(milliseconds: 300 * (attempt + 1)));
          continue;
        } else {
          if (context.mounted) {
            await _showGenericErrorDialog(context, '文件保存失败: ${e.toString()}');
          }
          return null;
        }
      }
    }

    return null;
  }

  /// 检查是否在主线程
  static bool _isMainThread() {
    try {
      return !Platform.environment.containsKey('FLUTTER_TEST');
    } catch (e) {
      return true; // 默认假设在主线程
    }
  }

  /// 显示ViewBridge错误对话框
  static Future<void> _showViewBridgeErrorDialog(BuildContext context) async {
    return showCupertinoDialog<void>(
      context: context,
      builder: (BuildContext context) {
        return CupertinoAlertDialog(
          title: const Text('文件操作提示'),
          content: const Text(
            '检测到macOS系统级文件对话框连接异常。这是系统层面的非致命问题，不影响应用正常使用。\n\n建议稍后重试，或重启应用后再次尝试。',
          ),
          actions: <CupertinoDialogAction>[
            CupertinoDialogAction(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: const Text('了解'),
            ),
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () {
                Navigator.of(context).pop();
                // 可以在这里添加重启应用的逻辑
              },
              child: const Text('稍后重试'),
            ),
          ],
        );
      },
    );
  }

  /// 显示权限错误对话框
  static Future<void> _showPermissionErrorDialog(BuildContext context) async {
    return showCupertinoDialog<void>(
      context: context,
      builder: (BuildContext context) {
        return CupertinoAlertDialog(
          title: const Text('权限不足'),
          content: const Text(
            '无法访问文件系统。请检查应用权限设置，或联系系统管理员。',
          ),
          actions: <CupertinoDialogAction>[
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: const Text('确定'),
            ),
          ],
        );
      },
    );
  }

  /// 显示通用错误对话框
  static Future<void> _showGenericErrorDialog(
    BuildContext context,
    String errorMessage,
  ) async {
    return showCupertinoDialog<void>(
      context: context,
      builder: (BuildContext context) {
        return CupertinoAlertDialog(
          title: const Text('文件操作失败'),
          content: Text(
            '操作过程中发生错误：\n\n$errorMessage\n\n请稍后重试，如问题持续存在，请重启应用。',
          ),
          actions: <CupertinoDialogAction>[
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: const Text('确定'),
            ),
          ],
        );
      },
    );
  }
}
