import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
// 移除旧主题系统，使用 FlexColorScheme 统一主题管理
// import '../../core/theme/app_typography.dart';

/// 统一的底部弹出Sheet组件
/// 提供一致的视觉体验和交互模式
class UnifiedBottomSheet {
  // 私有构造函数，防止实例化
  UnifiedBottomSheet._();

  /// 显示确认对话框
  static Future<bool?> showConfirmDialog({
    required BuildContext context,
    required String title,
    required String content,
    String confirmText = '确认',
    String cancelText = '取消',
    Color? confirmColor,
    IconData? icon,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _ConfirmBottomSheet(
        title: title,
        content: content,
        confirmText: confirmText,
        cancelText: cancelText,
        confirmColor: confirmColor,
        icon: icon,
      ),
    );
  }

  /// 显示操作选择Sheet
  static Future<T?> showActionSheet<T>({
    required BuildContext context,
    required String title,
    String? message,
    required List<BottomSheetAction<T>> actions,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _ActionBottomSheet<T>(
        title: title,
        message: message,
        actions: actions,
      ),
    );
  }

  /// 显示自定义内容Sheet
  static Future<T?> showCustomSheet<T>({
    required BuildContext context,
    required Widget child,
    String? title,
    bool showCloseButton = true,
    double? height,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _CustomBottomSheet(
        title: title,
        showCloseButton: showCloseButton,
        height: height,
        child: child,
      ),
    );
  }

  /// 显示加载Sheet
  static Future<void> showLoadingSheet({
    required BuildContext context,
    String message = '处理中...',
    bool isDismissible = false,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: isDismissible,
      enableDrag: isDismissible,
      builder: (context) => _LoadingBottomSheet(
        message: message,
        isDismissible: isDismissible,
      ),
    );
  }

  /// 显示结果反馈Sheet
  static Future<void> showResultSheet({
    required BuildContext context,
    required bool isSuccess,
    required String title,
    required String message,
    IconData? icon,
    Duration autoCloseDuration = const Duration(seconds: 2),
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _ResultBottomSheet(
        isSuccess: isSuccess,
        title: title,
        message: message,
        icon: icon,
        autoCloseDuration: autoCloseDuration,
      ),
    );
  }
}

/// 确认对话框底部Sheet
class _ConfirmBottomSheet extends StatelessWidget {
  final String title;
  final String content;
  final String confirmText;
  final String cancelText;
  final Color? confirmColor;
  final IconData? icon;

  const _ConfirmBottomSheet({
    required this.title,
    required this.content,
    required this.confirmText,
    required this.cancelText,
    this.confirmColor,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveConfirmColor = confirmColor ?? colorScheme.primary;

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
                if (icon != null) ...[
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: effectiveConfirmColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(28),
                    ),
                    child: Icon(
                      icon,
                      size: 28,
                      color: effectiveConfirmColor,
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // 标题
                Text(
                  title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),

                // 内容
                Text(
                  content,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),

                // 按钮组 - iOS 标准垂直布局
                Column(
                  children: [
                    // 确认按钮（主要操作在顶部）
                    SizedBox(
                      width: double.infinity,
                      child: CupertinoButton(
                        onPressed: () => Navigator.of(context).pop(true),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        color: effectiveConfirmColor,
                        borderRadius: BorderRadius.circular(12),
                        child: Text(
                          confirmText,
                          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: colorScheme.onPrimary,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // 取消按钮（次要操作在底部）
                    SizedBox(
                      width: double.infinity,
                      child: CupertinoButton(
                        onPressed: () => Navigator.of(context).pop(false),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        color: colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(12),
                        child: Text(
                          cancelText,
                          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ),
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

/// 操作选择底部Sheet
class _ActionBottomSheet<T> extends StatelessWidget {
  final String title;
  final String? message;
  final List<BottomSheetAction<T>> actions;

  const _ActionBottomSheet({
    required this.title,
    this.message,
    required this.actions,
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
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // 标题
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                // 消息
                if (message != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    message!,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],

                const SizedBox(height: 16),

                // 操作按钮列表
                ...actions.map(
                  (action) => Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 8),
                    child: CupertinoButton(
                      onPressed: () {
                        Navigator.of(context).pop(action.value);
                        action.onPressed?.call();
                      },
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (action.icon != null) ...[
                            Icon(
                              action.icon,
                              size: 20,
                              color: action.color ?? colorScheme.primary,
                            ),
                            const SizedBox(width: 8),
                          ],
                          Text(
                            action.title,
                            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: action.color ?? colorScheme.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // 取消按钮
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(top: 8),
                  child: CupertinoButton(
                    onPressed: () => Navigator.of(context).pop(),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    color: colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                    child: Text(
                      '取消',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 自定义内容底部Sheet
class _CustomBottomSheet extends StatelessWidget {
  final String? title;
  final bool showCloseButton;
  final double? height;
  final Widget child;

  const _CustomBottomSheet({
    this.title,
    required this.showCloseButton,
    this.height,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      height: height,
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

          // 标题栏
          if (title != null || showCloseButton)
            Container(
              padding: const EdgeInsets.fromLTRB(24, 16, 16, 8),
              child: Row(
                children: [
                  if (title != null)
                    Expanded(
                      child: Text(
                        title!,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  if (showCloseButton)
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: Icon(
                        CupertinoIcons.xmark,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                ],
              ),
            ),

          // 内容
          Flexible(child: child),
        ],
      ),
    );
  }
}

/// 加载底部Sheet
class _LoadingBottomSheet extends StatelessWidget {
  final String message;
  final bool isDismissible;

  const _LoadingBottomSheet({
    required this.message,
    required this.isDismissible,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return PopScope(
      canPop: isDismissible,
      child: Container(
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
            // 拖拽指示器（仅在可关闭时显示）
            if (isDismissible)
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
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // 加载指示器
                  CircularProgressIndicator(
                    color: colorScheme.primary,
                  ),
                  const SizedBox(height: 24),

                  // 加载消息
                  Text(
                    message,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 底部Sheet操作项
class BottomSheetAction<T> {
  final String title;
  final T value;
  final IconData? icon;
  final Color? color;
  final VoidCallback? onPressed;

  const BottomSheetAction({
    required this.title,
    required this.value,
    this.icon,
    this.color,
    this.onPressed,
  });
}

/// 结果反馈底部Sheet
class _ResultBottomSheet extends StatefulWidget {
  final bool isSuccess;
  final String title;
  final String message;
  final IconData? icon;
  final Duration autoCloseDuration;

  const _ResultBottomSheet({
    required this.isSuccess,
    required this.title,
    required this.message,
    this.icon,
    required this.autoCloseDuration,
  });

  @override
  State<_ResultBottomSheet> createState() => _ResultBottomSheetState();
}

class _ResultBottomSheetState extends State<_ResultBottomSheet> {
  @override
  void initState() {
    super.initState();
    // 自动关闭
    Future.delayed(widget.autoCloseDuration, () {
      if (mounted && Navigator.canPop(context)) {
        Navigator.of(context).pop();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor = widget.isSuccess ? colorScheme.secondary : colorScheme.error;
    final iconColor = widget.isSuccess ? colorScheme.onSecondary : colorScheme.onError;
    final textColor = widget.isSuccess ? colorScheme.onSecondary : colorScheme.onError;
    
    return Container(
      margin: const EdgeInsets.all(16),
      child: Material(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 顶部指示条
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: textColor.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              
              // 图标
              if (widget.icon != null)
                Container(
                  width: 64,
                  height: 64,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: textColor.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    widget.icon,
                    size: 32,
                    color: iconColor,
                  ),
                ),
              
              // 标题
              Text(
                widget.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: textColor,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 8),
              
              // 消息
              Text(
                widget.message,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: textColor.withValues(alpha: 0.9),
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}