/// 统一底部弹窗组件
/// 提供一致的底部弹窗UI和交互体验
library;

import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

class UnifiedBottomSheet extends StatelessWidget {
  final String title;
  final Widget child;
  final List<Widget>? actions;
  final double? maxHeight;
  final bool isDismissible;
  final bool enableDrag;

  const UnifiedBottomSheet({
    super.key,
    required this.title,
    required this.child,
    this.actions,
    this.maxHeight,
    this.isDismissible = true,
    this.enableDrag = true,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final screenHeight = MediaQuery.of(context).size.height;
    final effectiveMaxHeight = maxHeight ?? screenHeight * 0.9;

    return Container(
      constraints: BoxConstraints(
        maxHeight: effectiveMaxHeight,
      ),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(20),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 拖拽指示器
          if (enableDrag) _buildDragIndicator(colorScheme),

          // 头部
          _buildHeader(context, colorScheme),

          // 内容区域
          Flexible(
            child: child,
          ),
        ],
      ),
    );
  }

  /// 构建拖拽指示器
  Widget _buildDragIndicator(ColorScheme colorScheme) {
    return Container(
      margin: const EdgeInsets.only(top: 8, bottom: 4),
      width: 36,
      height: 4,
      decoration: BoxDecoration(
        color: colorScheme.onSurface.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }

  /// 构建头部
  Widget _buildHeader(BuildContext context, ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: colorScheme.outline.withValues(alpha: 0.2),
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface,
              ),
            ),
          ),
          if (actions?.isNotEmpty == true) ...[
            const SizedBox(width: 12),
            ...actions!.map((action) => Padding(
              padding: const EdgeInsets.only(left: 8),
              child: action,
            )),
          ],
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              Navigator.of(context).pop();
            },
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                CupertinoIcons.xmark,
                size: 16,
                color: colorScheme.onSurface.withValues(alpha: 0.7),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 显示底部弹窗
  static Future<T?> show<T>({
    required BuildContext context,
    required String title,
    required Widget child,
    List<Widget>? actions,
    double? maxHeight,
    bool isDismissible = true,
    bool enableDrag = true,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: isDismissible,
      enableDrag: enableDrag,
      builder: (context) => UnifiedBottomSheet(
        title: title,
        actions: actions,
        maxHeight: maxHeight,
        isDismissible: isDismissible,
        enableDrag: enableDrag,
        child: child,
      ),
    );
  }

  /// 显示确认对话框
  static Future<bool?> showConfirmDialog({
    required BuildContext context,
    required String title,
    required String content,
    String? confirmText = '确定',
    String? cancelText = '取消',
    Color? confirmColor,
    IconData? icon,
  }) {
    final colorScheme = Theme.of(context).colorScheme;

    return showCupertinoDialog<bool>(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 20,
                color: confirmColor ?? colorScheme.primary,
              ),
              const SizedBox(width: 8),
            ],
            Text(title),
          ],
        ),
        content: Text(content),
        actions: [
          CupertinoDialogAction(
            child: Text(cancelText!),
            onPressed: () => Navigator.pop(context, false),
          ),
          CupertinoDialogAction(
            isDefaultAction: true,
            textStyle: TextStyle(
              color: confirmColor ?? colorScheme.primary,
              fontWeight: FontWeight.w600,
            ),
            child: Text(confirmText!),
            onPressed: () => Navigator.pop(context, true),
          ),
        ],
      ),
    );
  }
}