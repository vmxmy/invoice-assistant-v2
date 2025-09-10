import 'package:flutter/material.dart';

/// 应用反馈类型
enum FeedbackType {
  success,
  error,
  warning,
  info,
}

/// 反馈内容配置
class FeedbackConfig {
  final String title;
  final String? message;
  final FeedbackType type;
  final Duration? duration;
  final VoidCallback? action;
  final String? actionLabel;

  const FeedbackConfig({
    required this.title,
    this.message,
    required this.type,
    this.duration,
    this.action,
    this.actionLabel,
  });

  /// 快捷构造方法
  static FeedbackConfig success({
    required String title,
    String? message,
    Duration? duration,
  }) =>
      FeedbackConfig(
        title: title,
        message: message,
        type: FeedbackType.success,
        duration: duration,
      );

  static FeedbackConfig error({
    required String title,
    String? message,
    Duration? duration,
    VoidCallback? action,
    String? actionLabel,
  }) =>
      FeedbackConfig(
        title: title,
        message: message,
        type: FeedbackType.error,
        duration: duration,
        action: action,
        actionLabel: actionLabel,
      );

  static FeedbackConfig warning({
    required String title,
    String? message,
    Duration? duration,
  }) =>
      FeedbackConfig(
        title: title,
        message: message,
        type: FeedbackType.warning,
        duration: duration,
      );

  static FeedbackConfig info({
    required String title,
    String? message,
    Duration? duration,
  }) =>
      FeedbackConfig(
        title: title,
        message: message,
        type: FeedbackType.info,
        duration: duration,
      );
}

/// 反馈主题配置
class FeedbackTheme {
  final Color backgroundColor;
  final IconData icon;
  final Color iconColor;
  final Color textColor;

  const FeedbackTheme({
    required this.backgroundColor,
    required this.icon,
    required this.iconColor,
    required this.textColor,
  });

  static const Map<FeedbackType, FeedbackTheme> _themes = {
    FeedbackType.success: FeedbackTheme(
      backgroundColor: Color(0xFF4CAF50),
      icon: Icons.check_circle,
      iconColor: Colors.white,
      textColor: Colors.white,
    ),
    FeedbackType.error: FeedbackTheme(
      backgroundColor: Color(0xFFF44336),
      icon: Icons.error,
      iconColor: Colors.white,
      textColor: Colors.white,
    ),
    FeedbackType.warning: FeedbackTheme(
      backgroundColor: Color(0xFFFF9800),
      icon: Icons.warning,
      iconColor: Colors.white,
      textColor: Colors.white,
    ),
    FeedbackType.info: FeedbackTheme(
      backgroundColor: Color(0xFF2196F3),
      icon: Icons.info,
      iconColor: Colors.white,
      textColor: Colors.white,
    ),
  };

  static FeedbackTheme getTheme(FeedbackType type) =>
      _themes[type] ?? _themes[FeedbackType.info]!;
}

/// 统一反馈管理器
class AppFeedback {
  /// 显示反馈消息
  static void show(
    BuildContext context,
    FeedbackConfig config,
  ) {
    final theme = FeedbackTheme.getTheme(config.type);
    
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: _buildContent(config, theme),
        backgroundColor: theme.backgroundColor,
        duration: config.duration ?? _getDefaultDuration(config.type),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        margin: const EdgeInsets.all(16),
        elevation: 8,
        action: config.action != null && config.actionLabel != null
            ? SnackBarAction(
                label: config.actionLabel!,
                textColor: theme.textColor,
                onPressed: config.action!,
              )
            : null,
      ),
    );
  }

  /// 构建内容
  static Widget _buildContent(FeedbackConfig config, FeedbackTheme theme) {
    if (config.message == null) {
      // 单行简单模式
      return Row(
        children: [
          Icon(theme.icon, color: theme.iconColor, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              config.title,
              style: TextStyle(
                color: theme.textColor,
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
            ),
          ),
        ],
      );
    } else {
      // 多行详细模式
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(theme.icon, color: theme.iconColor, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  config.title,
                  style: TextStyle(
                    color: theme.textColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  config.message!,
                  style: TextStyle(
                    color: theme.textColor,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }
  }

  /// 获取默认持续时间
  static Duration _getDefaultDuration(FeedbackType type) {
    switch (type) {
      case FeedbackType.success:
        return const Duration(seconds: 3);
      case FeedbackType.error:
        return const Duration(seconds: 5);
      case FeedbackType.warning:
        return const Duration(seconds: 4);
      case FeedbackType.info:
        return const Duration(seconds: 3);
    }
  }

  /// 快捷方法
  static void success(
    BuildContext context,
    String title, {
    String? message,
    Duration? duration,
  }) {
    show(
      context,
      FeedbackConfig.success(
        title: title,
        message: message,
        duration: duration,
      ),
    );
  }

  static void error(
    BuildContext context,
    String title, {
    String? message,
    Duration? duration,
    VoidCallback? action,
    String? actionLabel,
  }) {
    show(
      context,
      FeedbackConfig.error(
        title: title,
        message: message,
        duration: duration,
        action: action,
        actionLabel: actionLabel,
      ),
    );
  }

  static void warning(
    BuildContext context,
    String title, {
    String? message,
    Duration? duration,
  }) {
    show(
      context,
      FeedbackConfig.warning(
        title: title,
        message: message,
        duration: duration,
      ),
    );
  }

  static void info(
    BuildContext context,
    String title, {
    String? message,
    Duration? duration,
  }) {
    show(
      context,
      FeedbackConfig.info(
        title: title,
        message: message,
        duration: duration,
      ),
    );
  }

  /// 操作结果反馈
  static void operationResult(
    BuildContext context, {
    required bool isSuccess,
    required String operation,
    String? details,
    VoidCallback? retryAction,
  }) {
    if (isSuccess) {
      success(
        context,
        '$operation成功',
        message: details,
      );
    } else {
      error(
        context,
        '$operation失败',
        message: details,
        action: retryAction,
        actionLabel: '重试',
      );
    }
  }

  /// 显示对话框确认
  static Future<bool?> showConfirmDialog(
    BuildContext context, {
    required String title,
    String? message,
    String confirmText = '确定',
    String cancelText = '取消',
    Color? confirmColor,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: message != null ? Text(message) : null,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(cancelText),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: confirmColor != null
                ? TextButton.styleFrom(foregroundColor: confirmColor)
                : null,
            child: Text(confirmText),
          ),
        ],
      ),
    );
  }

  /// 显示加载对话框
  static void showLoading(
    BuildContext context, {
    String message = '处理中...',
  }) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => PopScope(
        canPop: false,
        child: AlertDialog(
          content: Row(
            children: [
              const CircularProgressIndicator(),
              const SizedBox(width: 20),
              Expanded(child: Text(message)),
            ],
          ),
        ),
      ),
    );
  }

  /// 隐藏加载对话框
  static void hideLoading(BuildContext context) {
    Navigator.of(context).pop();
  }
}