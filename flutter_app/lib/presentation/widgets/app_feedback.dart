import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'unified_bottom_sheet.dart';

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

  static Map<FeedbackType, FeedbackTheme> _getThemes(BuildContext context) => {
        FeedbackType.success: FeedbackTheme(
          backgroundColor: Theme.of(context).colorScheme.primary,
          icon: CupertinoIcons.check_mark_circled_solid,
          iconColor: Theme.of(context).colorScheme.onPrimary,
          textColor: Theme.of(context).colorScheme.onPrimary,
        ),
        FeedbackType.error: FeedbackTheme(
          backgroundColor: Theme.of(context).colorScheme.error,
          icon: CupertinoIcons.exclamationmark_circle_fill,
          iconColor: Theme.of(context).colorScheme.onError,
          textColor: Theme.of(context).colorScheme.onError,
        ),
        FeedbackType.warning: FeedbackTheme(
          backgroundColor: Theme.of(context).colorScheme.tertiary,
          icon: CupertinoIcons.exclamationmark_triangle_fill,
          iconColor: Theme.of(context).colorScheme.onTertiary,
          textColor: Theme.of(context).colorScheme.onTertiary,
        ),
        FeedbackType.info: FeedbackTheme(
          backgroundColor: Theme.of(context).colorScheme.secondary,
          icon: CupertinoIcons.info_circle_fill,
          iconColor: Theme.of(context).colorScheme.onSecondary,
          textColor: Theme.of(context).colorScheme.onSecondary,
        ),
      };

  static FeedbackTheme getTheme(BuildContext context, FeedbackType type) {
    final themes = _getThemes(context);
    return themes[type] ?? themes[FeedbackType.info]!;
  }
}

/// 统一反馈管理器
class AppFeedback {
  /// 显示反馈消息 - 使用Cupertino原生方式
  static void show(
    BuildContext context,
    FeedbackConfig config,
  ) {
    final theme = FeedbackTheme.getTheme(context, config.type);

    // 确保在下一帧显示，避免上下文问题
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (context.mounted) {
        _showCupertinoFeedback(context, config, theme);
      }
    });
  }

  /// 显示Cupertino风格的反馈
  static void _showCupertinoFeedback(
    BuildContext context,
    FeedbackConfig config,
    FeedbackTheme theme,
  ) {
    // 对于简单消息使用顶部Banner
    if (config.message == null && config.action == null) {
      _showTopBanner(context, config, theme);
    } else {
      // 对于复杂消息使用底部Sheet
      _showFeedbackBottomSheet(context, config, theme);
    }
  }

  /// 显示顶部Banner样式反馈
  static void _showTopBanner(
    BuildContext context,
    FeedbackConfig config,
    FeedbackTheme theme,
  ) {
    final overlay = Overlay.of(context);
    late OverlayEntry overlayEntry;

    overlayEntry = OverlayEntry(
      builder: (context) => _CupertinoFeedbackBanner(
        config: config,
        theme: theme,
        onDismiss: () => overlayEntry.remove(),
      ),
    );

    overlay.insert(overlayEntry);

    // 自动移除
    Timer(config.duration ?? _getDefaultDuration(config.type), () {
      if (overlayEntry.mounted) {
        overlayEntry.remove();
      }
    });
  }

  /// 显示底部Sheet样式反馈
  static void _showFeedbackBottomSheet(
    BuildContext context,
    FeedbackConfig config,
    FeedbackTheme theme,
  ) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _CupertinoFeedbackSheet(
        config: config,
        theme: theme,
      ),
    );
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
    return UnifiedBottomSheet.showConfirmDialog(
      context: context,
      title: title,
      content: message ?? '',
      confirmText: confirmText,
      cancelText: cancelText,
      confirmColor: confirmColor,
      icon: Icons.help_outline,
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

/// Cupertino风格的顶部Banner反馈组件
class _CupertinoFeedbackBanner extends StatefulWidget {
  final FeedbackConfig config;
  final FeedbackTheme theme;
  final VoidCallback onDismiss;

  const _CupertinoFeedbackBanner({
    required this.config,
    required this.theme,
    required this.onDismiss,
  });

  @override
  State<_CupertinoFeedbackBanner> createState() => _CupertinoFeedbackBannerState();
}

class _CupertinoFeedbackBannerState extends State<_CupertinoFeedbackBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    ));
    
    _opacityAnimation = Tween<double>(
      begin: 0,
      end: 1,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    ));

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _dismiss() async {
    await _controller.reverse();
    widget.onDismiss();
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final safeTop = mediaQuery.padding.top;

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SlideTransition(
        position: _slideAnimation,
        child: FadeTransition(
          opacity: _opacityAnimation,
          child: GestureDetector(
            onTap: _dismiss,
            child: Container(
              margin: EdgeInsets.fromLTRB(16, safeTop + 8, 16, 0),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: widget.theme.backgroundColor,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Icon(
                    widget.theme.icon,
                    color: widget.theme.iconColor,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      widget.config.title,
                      style: TextStyle(
                        color: widget.theme.textColor,
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      ),
                    ),
                  ),
                  Icon(
                    CupertinoIcons.xmark,
                    color: widget.theme.textColor.withValues(alpha: 0.5),
                    size: 16,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Cupertino风格的底部Sheet反馈组件
class _CupertinoFeedbackSheet extends StatelessWidget {
  final FeedbackConfig config;
  final FeedbackTheme theme;

  const _CupertinoFeedbackSheet({
    required this.config,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.15),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 拖拽指示器
          Container(
            margin: const EdgeInsets.only(top: 8),
            width: 32,
            height: 4,
            decoration: BoxDecoration(
              color: colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // 图标
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: theme.backgroundColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(28),
                  ),
                  child: Icon(
                    theme.icon,
                    size: 28,
                    color: theme.backgroundColor,
                  ),
                ),
                const SizedBox(height: 16),

                // 标题
                Text(
                  config.title,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                // 消息
                if (config.message != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    config.message!,
                    style: TextStyle(
                      fontSize: 14,
                      color: colorScheme.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],

                const SizedBox(height: 24),

                // 按钮组
                Row(
                  children: [
                    // 关闭按钮
                    Expanded(
                      child: CupertinoButton(
                        onPressed: () => Navigator.of(context).pop(),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        color: colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(12),
                        child: Text(
                          '关闭',
                          style: TextStyle(
                            color: colorScheme.onSurfaceVariant,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ),

                    // 操作按钮（如果有）
                    if (config.action != null && config.actionLabel != null) ...[
                      const SizedBox(width: 12),
                      Expanded(
                        child: CupertinoButton(
                          onPressed: () {
                            Navigator.of(context).pop();
                            config.action!();
                          },
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          color: theme.backgroundColor,
                          borderRadius: BorderRadius.circular(12),
                          child: Text(
                            config.actionLabel!,
                            style: TextStyle(
                              color: theme.textColor,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
