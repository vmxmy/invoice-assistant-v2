import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../core/config/app_config.dart';

/// 增强型错误处理和用户反馈组件
class EnhancedErrorHandler {
  static final EnhancedErrorHandler _instance =
      EnhancedErrorHandler._internal();
  factory EnhancedErrorHandler() => _instance;
  EnhancedErrorHandler._internal();

  /// 显示友好的错误消息
  static void showErrorSnackBar(
    BuildContext context,
    String error, {
    Duration duration = const Duration(seconds: 4),
    VoidCallback? onRetry,
    String? retryText,
  }) {
    final friendlyMessage = getFriendlyErrorMessage(error);

    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              CupertinoIcons.exclamationmark_triangle,
              color: Theme.of(context).colorScheme.onError,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                friendlyMessage,
                style: const TextStyle(fontSize: 14),
              ),
            ),
          ],
        ),
        backgroundColor: Theme.of(context).colorScheme.error,
        duration: duration,
        action: onRetry != null
            ? SnackBarAction(
                label: retryText ?? '重试',
                textColor: Theme.of(context).colorScheme.onError,
                onPressed: onRetry,
              )
            : null,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  /// 显示成功消息
  static void showSuccessSnackBar(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 2),
  }) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              CupertinoIcons.checkmark_circle,
              color: Theme.of(context).colorScheme.onPrimary,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(fontSize: 14),
              ),
            ),
          ],
        ),
        backgroundColor: Theme.of(context).colorScheme.primary,
        duration: duration,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  /// 显示信息提示
  static void showInfoSnackBar(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 3),
    Color? backgroundColor,
  }) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              CupertinoIcons.info_circle,
              color: Theme.of(context).colorScheme.onSecondary,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(fontSize: 14),
              ),
            ),
          ],
        ),
        backgroundColor:
            backgroundColor ?? Theme.of(context).colorScheme.secondary,
        duration: duration,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  /// 显示错误对话框
  static Future<void> showErrorDialog(
    BuildContext context,
    String error, {
    String? title,
    VoidCallback? onRetry,
    String? retryText,
    VoidCallback? onCancel,
    String? cancelText,
  }) async {
    final friendlyMessage = getFriendlyErrorMessage(error);

    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(
                CupertinoIcons.exclamationmark_triangle,
                color: Theme.of(context).colorScheme.error,
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(title ?? '操作失败'),
            ],
          ),
          content: SingleChildScrollView(
            child: Text(friendlyMessage),
          ),
          actions: [
            if (onCancel != null)
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  onCancel();
                },
                child: Text(cancelText ?? '取消'),
              ),
            if (onRetry != null)
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  onRetry();
                },
                child: Text(retryText ?? '重试'),
              )
            else
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('确定'),
              ),
          ],
        );
      },
    );
  }

  /// 将技术错误转换为用户友好的消息
  static String getFriendlyErrorMessage(String error) {
    final lowerError = error.toLowerCase();

    // 网络相关错误
    if (lowerError.contains('network') ||
        lowerError.contains('connection') ||
        lowerError.contains('timeout') ||
        lowerError.contains('failed to connect')) {
      return '网络连接异常，请检查网络设置后重试';
    }

    // 认证相关错误
    if (lowerError.contains('unauthorized') ||
        lowerError.contains('authentication') ||
        lowerError.contains('401')) {
      return '登录已过期，请重新登录';
    }

    // 权限相关错误
    if (lowerError.contains('forbidden') ||
        lowerError.contains('permission') ||
        lowerError.contains('403')) {
      return '权限不足，无法执行此操作';
    }

    // 服务器错误
    if (lowerError.contains('server') ||
        lowerError.contains('500') ||
        lowerError.contains('502') ||
        lowerError.contains('503')) {
      return '服务器暂时不可用，请稍后重试';
    }

    // 文件相关错误
    if (lowerError.contains('file not found') || lowerError.contains('404')) {
      return '请求的文件不存在';
    }

    // 存储空间错误
    if (lowerError.contains('storage') || lowerError.contains('disk full')) {
      return '存储空间不足，请清理空间后重试';
    }

    // 格式错误
    if (lowerError.contains('format') || lowerError.contains('invalid')) {
      return '文件格式不正确或数据有误';
    }

    // 如果包含特定的业务错误信息，直接返回
    if (error.contains('发票') ||
        error.contains('上传') ||
        error.contains('下载') ||
        error.contains('删除') ||
        error.contains('更新')) {
      return error;
    }

    // 默认友好消息
    return '操作失败，请稍后重试';
  }
}

/// 错误边界组件
class ErrorBoundary extends StatefulWidget {
  final Widget child;
  final Widget Function(FlutterErrorDetails)? errorWidgetBuilder;
  final void Function(FlutterErrorDetails)? onError;

  const ErrorBoundary({
    super.key,
    required this.child,
    this.errorWidgetBuilder,
    this.onError,
  });

  @override
  State<ErrorBoundary> createState() => _ErrorBoundaryState();
}

class _ErrorBoundaryState extends State<ErrorBoundary> {
  FlutterErrorDetails? _errorDetails;

  @override
  void initState() {
    super.initState();
    // 设置错误处理器
    FlutterError.onError = (FlutterErrorDetails details) {
      if (AppConfig.enableLogging) {
        // print('❌ [ErrorBoundary] Flutter错误: ${details.exception}');
      }

      widget.onError?.call(details);

      if (mounted) {
        setState(() {
          _errorDetails = details;
        });
      }
    };
  }

  @override
  Widget build(BuildContext context) {
    if (_errorDetails != null) {
      return widget.errorWidgetBuilder?.call(_errorDetails!) ??
          _buildDefaultErrorWidget();
    }

    return widget.child;
  }

  Widget _buildDefaultErrorWidget() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              CupertinoIcons.exclamationmark_triangle,
              size: 64,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              '应用出现错误',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Theme.of(context).colorScheme.error,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              '请重启应用或联系技术支持',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _errorDetails = null;
                });
              },
              child: const Text('重试'),
            ),
          ],
        ),
      ),
    );
  }
}

/// 网络状态指示器
class NetworkStatusIndicator extends StatefulWidget {
  final Widget child;

  const NetworkStatusIndicator({
    super.key,
    required this.child,
  });

  @override
  State<NetworkStatusIndicator> createState() => _NetworkStatusIndicatorState();
}

class _NetworkStatusIndicatorState extends State<NetworkStatusIndicator> {
  final bool _showOfflineMessage = false;

  @override
  void initState() {
    super.initState();
    // 这里应该集成网络状态监听
    // 例如使用 connectivity_plus 包
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_showOfflineMessage)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              color: Theme.of(context).colorScheme.error,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.cloud_off,
                    color: Theme.of(context).colorScheme.onError,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '网络连接已断开',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onError,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
