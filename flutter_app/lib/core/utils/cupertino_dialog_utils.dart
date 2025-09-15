import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../theme/cupertino_theme_extensions.dart';

/// 对话框选项数据类
class DialogOption<T> {
  const DialogOption({
    required this.value,
    required this.label,
    this.isDestructive = false,
    this.isDefault = false,
    this.icon,
    this.semanticLabel,
  });

  /// 选项值
  final T value;

  /// 显示文本
  final String label;

  /// 是否为破坏性操作
  final bool isDestructive;

  /// 是否为默认选项
  final bool isDefault;

  /// 选项图标
  final IconData? icon;

  /// 无障碍标签
  final String? semanticLabel;
}

/// Cupertino对话框工具类
///
/// 提供各种类型的iOS风格对话框，遵循Apple Human Interface Guidelines，
/// 使用项目的CupertinoThemeExtensions颜色系统，支持完整的无障碍功能。
///
/// 支持的对话框类型：
/// - 确认对话框 (showConfirmDialog)
/// - 信息对话框 (showInfoDialog)
/// - 错误对话框 (showErrorDialog)
/// - 成功对话框 (showSuccessDialog)
/// - 选择对话框 (showChoiceDialog)
/// - 输入对话框 (showInputDialog)
/// - 底部弹窗 (showBottomSheet)
///
/// 使用示例：
/// ```dart
/// // 确认对话框
/// final result = await CupertinoDialogUtils.showConfirmDialog(
///   context,
///   title: '删除发票',
///   message: '确定要删除这张发票吗？此操作无法撤销。',
///   confirmText: '删除',
///   cancelText: '取消',
///   isDestructive: true,
/// );
///
/// if (result == true) {
///   // 执行删除操作
/// }
/// ```
class CupertinoDialogUtils {
  CupertinoDialogUtils._();

  // ==================== 确认对话框 ====================

  /// 显示确认对话框
  ///
  /// [context] 上下文
  /// [title] 对话框标题（必选）
  /// [message] 对话框消息内容
  /// [confirmText] 确认按钮文本，默认"确认"
  /// [cancelText] 取消按钮文本，默认"取消"
  /// [isDestructive] 确认按钮是否为破坏性操作（红色），默认false
  /// [barrierDismissible] 点击外部是否可关闭，默认false
  /// [onConfirm] 确认回调函数
  /// [onCancel] 取消回调函数
  ///
  /// 返回值：true表示确认，false表示取消，null表示点击外部关闭
  static Future<bool?> showConfirmDialog(
    BuildContext context, {
    required String title,
    String? message,
    String confirmText = '确认',
    String cancelText = '取消',
    bool isDestructive = false,
    bool barrierDismissible = false,
    VoidCallback? onConfirm,
    VoidCallback? onCancel,
  }) async {
    return showCupertinoDialog<bool>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (BuildContext context) {
        return CupertinoAlertDialog(
          title: Text(
            title,
            style: TextStyle(
              color: context.textColor,
              fontSize: 17,
              fontWeight: FontWeight.w600,
            ),
          ),
          content: message != null
              ? Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(
                    message,
                    style: TextStyle(
                      color: context.secondaryTextColor,
                      fontSize: 13,
                      height: 1.33,
                    ),
                  ),
                )
              : null,
          actions: [
            CupertinoDialogAction(
              onPressed: () {
                Navigator.of(context).pop(false);
                onCancel?.call();
              },
              child: Text(
                cancelText,
                style: TextStyle(
                  color: context.primaryColor,
                  fontSize: 17,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ),
            CupertinoDialogAction(
              isDestructiveAction: isDestructive,
              onPressed: () {
                Navigator.of(context).pop(true);
                onConfirm?.call();
              },
              child: Text(
                confirmText,
                style: TextStyle(
                  color:
                      isDestructive ? context.errorColor : context.primaryColor,
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  // ==================== 信息对话框 ====================

  /// 显示信息对话框
  ///
  /// [context] 上下文
  /// [title] 对话框标题（必选）
  /// [message] 对话框消息内容
  /// [buttonText] 按钮文本，默认"确定"
  /// [barrierDismissible] 点击外部是否可关闭，默认true
  /// [onPressed] 按钮点击回调函数
  ///
  /// 返回值：true表示点击按钮，null表示点击外部关闭
  static Future<bool?> showInfoDialog(
    BuildContext context, {
    required String title,
    String? message,
    String buttonText = '确定',
    bool barrierDismissible = true,
    VoidCallback? onPressed,
  }) async {
    return showCupertinoDialog<bool>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (BuildContext context) {
        return CupertinoAlertDialog(
          title: Row(
            children: [
              Icon(
                CupertinoIcons.info_circle,
                color: context.infoColor,
                size: 20,
                semanticLabel: '信息',
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: context.textColor,
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          content: message != null
              ? Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(
                    message,
                    style: TextStyle(
                      color: context.secondaryTextColor,
                      fontSize: 13,
                      height: 1.33,
                    ),
                  ),
                )
              : null,
          actions: [
            CupertinoDialogAction(
              onPressed: () {
                Navigator.of(context).pop(true);
                onPressed?.call();
              },
              child: Text(
                buttonText,
                style: TextStyle(
                  color: context.primaryColor,
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  // ==================== 错误对话框 ====================

  /// 显示错误对话框
  ///
  /// [context] 上下文
  /// [title] 对话框标题，默认"错误"
  /// [message] 错误消息内容（必选）
  /// [buttonText] 按钮文本，默认"确定"
  /// [barrierDismissible] 点击外部是否可关闭，默认true
  /// [onPressed] 按钮点击回调函数
  ///
  /// 返回值：true表示点击按钮，null表示点击外部关闭
  static Future<bool?> showErrorDialog(
    BuildContext context, {
    String title = '错误',
    required String message,
    String buttonText = '确定',
    bool barrierDismissible = true,
    VoidCallback? onPressed,
  }) async {
    // 触发错误反馈
    HapticFeedback.vibrate();

    return showCupertinoDialog<bool>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (BuildContext context) {
        return CupertinoAlertDialog(
          title: Row(
            children: [
              Icon(
                CupertinoIcons.exclamationmark_circle,
                color: context.errorColor,
                size: 20,
                semanticLabel: '错误',
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: context.errorColor,
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          content: Padding(
            padding: const EdgeInsets.only(top: 8.0),
            child: Text(
              message,
              style: TextStyle(
                color: context.secondaryTextColor,
                fontSize: 13,
                height: 1.33,
              ),
            ),
          ),
          actions: [
            CupertinoDialogAction(
              onPressed: () {
                Navigator.of(context).pop(true);
                onPressed?.call();
              },
              child: Text(
                buttonText,
                style: TextStyle(
                  color: context.errorColor,
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  // ==================== 成功对话框 ====================

  /// 显示成功对话框
  ///
  /// [context] 上下文
  /// [title] 对话框标题，默认"成功"
  /// [message] 成功消息内容（必选）
  /// [buttonText] 按钮文本，默认"确定"
  /// [barrierDismissible] 点击外部是否可关闭，默认true
  /// [autoDismiss] 自动关闭延迟（秒），null表示不自动关闭
  /// [onPressed] 按钮点击回调函数
  ///
  /// 返回值：true表示点击按钮，false表示自动关闭，null表示点击外部关闭
  static Future<bool?> showSuccessDialog(
    BuildContext context, {
    String title = '成功',
    required String message,
    String buttonText = '确定',
    bool barrierDismissible = true,
    int? autoDismiss,
    VoidCallback? onPressed,
  }) async {
    // 触发成功反馈
    HapticFeedback.lightImpact();

    final completer = Completer<bool?>();
    Timer? autoCloseTimer;

    // 设置自动关闭定时器
    if (autoDismiss != null && autoDismiss > 0) {
      autoCloseTimer = Timer(Duration(seconds: autoDismiss), () {
        if (context.mounted) {
          Navigator.of(context).pop(false);
          completer.complete(false);
        }
      });
    }

    final result = await showCupertinoDialog<bool>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (BuildContext context) {
        return CupertinoAlertDialog(
          title: Row(
            children: [
              Icon(
                CupertinoIcons.checkmark_circle,
                color: context.successColor,
                size: 20,
                semanticLabel: '成功',
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: context.successColor,
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          content: Padding(
            padding: const EdgeInsets.only(top: 8.0),
            child: Text(
              message,
              style: TextStyle(
                color: context.secondaryTextColor,
                fontSize: 13,
                height: 1.33,
              ),
            ),
          ),
          actions: [
            CupertinoDialogAction(
              onPressed: () {
                autoCloseTimer?.cancel();
                Navigator.of(context).pop(true);
                onPressed?.call();
              },
              child: Text(
                buttonText,
                style: TextStyle(
                  color: context.successColor,
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        );
      },
    );

    autoCloseTimer?.cancel();
    return result;
  }

  // ==================== 选择对话框 ====================

  /// 显示选择对话框
  ///
  /// [context] 上下文
  /// [title] 对话框标题（必选）
  /// [message] 对话框消息内容
  /// [options] 选项列表（必选）
  /// [cancelText] 取消按钮文本，null表示不显示取消按钮
  /// [barrierDismissible] 点击外部是否可关闭，默认true
  /// [onSelected] 选项选中回调函数
  ///
  /// 返回值：选中的选项值，null表示取消或点击外部关闭
  static Future<T?> showChoiceDialog<T>(
    BuildContext context, {
    required String title,
    String? message,
    required List<DialogOption<T>> options,
    String? cancelText = '取消',
    bool barrierDismissible = true,
    void Function(T value)? onSelected,
  }) async {
    if (options.isEmpty) {
      throw ArgumentError('选项列表不能为空');
    }

    return showCupertinoDialog<T>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (BuildContext context) {
        return CupertinoAlertDialog(
          title: Text(
            title,
            style: TextStyle(
              color: context.textColor,
              fontSize: 17,
              fontWeight: FontWeight.w600,
            ),
          ),
          content: message != null
              ? Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(
                    message,
                    style: TextStyle(
                      color: context.secondaryTextColor,
                      fontSize: 13,
                      height: 1.33,
                    ),
                  ),
                )
              : null,
          actions: [
            // 选项按钮
            ...options.map((option) {
              return CupertinoDialogAction(
                isDestructiveAction: option.isDestructive,
                isDefaultAction: option.isDefault,
                onPressed: () {
                  Navigator.of(context).pop(option.value);
                  onSelected?.call(option.value);
                },
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (option.icon != null) ...[
                      Icon(
                        option.icon,
                        size: 16,
                        color: option.isDestructive
                            ? context.errorColor
                            : context.primaryColor,
                        semanticLabel: option.semanticLabel,
                      ),
                      const SizedBox(width: 6),
                    ],
                    Flexible(
                      child: Text(
                        option.label,
                        style: TextStyle(
                          color: option.isDestructive
                              ? context.errorColor
                              : context.primaryColor,
                          fontSize: 17,
                          fontWeight: option.isDefault
                              ? FontWeight.w600
                              : FontWeight.w400,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
            // 取消按钮
            if (cancelText != null)
              CupertinoDialogAction(
                onPressed: () {
                  Navigator.of(context).pop();
                },
                child: Text(
                  cancelText,
                  style: TextStyle(
                    color: context.primaryColor,
                    fontSize: 17,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  // ==================== 输入对话框 ====================

  /// 显示输入对话框
  ///
  /// [context] 上下文
  /// [title] 对话框标题（必选）
  /// [message] 对话框消息内容
  /// [placeholder] 输入框占位符文本
  /// [initialValue] 输入框初始值
  /// [keyboardType] 键盘类型
  /// [maxLength] 最大输入长度
  /// [confirmText] 确认按钮文本，默认"确认"
  /// [cancelText] 取消按钮文本，默认"取消"
  /// [validator] 输入验证函数，返回错误信息或null
  /// [barrierDismissible] 点击外部是否可关闭，默认false
  /// [onConfirm] 确认回调函数
  /// [onCancel] 取消回调函数
  ///
  /// 返回值：输入的文本，null表示取消或点击外部关闭
  static Future<String?> showInputDialog(
    BuildContext context, {
    required String title,
    String? message,
    String? placeholder,
    String? initialValue,
    TextInputType keyboardType = TextInputType.text,
    int? maxLength,
    String confirmText = '确认',
    String cancelText = '取消',
    String? Function(String?)? validator,
    bool barrierDismissible = false,
    void Function(String value)? onConfirm,
    VoidCallback? onCancel,
  }) async {
    final controller = TextEditingController(text: initialValue);
    final focusNode = FocusNode();
    String? errorMessage;

    return showCupertinoDialog<String>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return CupertinoAlertDialog(
              title: Text(
                title,
                style: TextStyle(
                  color: context.textColor,
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (message != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8.0, bottom: 16.0),
                      child: Text(
                        message,
                        style: TextStyle(
                          color: context.secondaryTextColor,
                          fontSize: 13,
                          height: 1.33,
                        ),
                      ),
                    ),
                  CupertinoTextField(
                    controller: controller,
                    focusNode: focusNode,
                    placeholder: placeholder,
                    keyboardType: keyboardType,
                    maxLength: maxLength,
                    autofocus: true,
                    style: TextStyle(
                      color: context.textColor,
                      fontSize: 16,
                    ),
                    decoration: BoxDecoration(
                      color: context.tertiaryBackgroundColor,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: errorMessage != null
                            ? context.errorColor
                            : context.borderColor,
                        width: 1,
                      ),
                    ),
                    onChanged: (value) {
                      if (errorMessage != null) {
                        setState(() {
                          errorMessage = validator?.call(value);
                        });
                      }
                    },
                  ),
                  if (errorMessage != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8.0),
                      child: Text(
                        errorMessage!,
                        style: TextStyle(
                          color: context.errorColor,
                          fontSize: 12,
                        ),
                        textAlign: TextAlign.left,
                      ),
                    ),
                ],
              ),
              actions: [
                CupertinoDialogAction(
                  onPressed: () {
                    Navigator.of(context).pop();
                    onCancel?.call();
                  },
                  child: Text(
                    cancelText,
                    style: TextStyle(
                      color: context.primaryColor,
                      fontSize: 17,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ),
                CupertinoDialogAction(
                  onPressed: () {
                    final text = controller.text.trim();
                    final validationError = validator?.call(text);

                    if (validationError != null) {
                      setState(() {
                        errorMessage = validationError;
                      });
                      HapticFeedback.vibrate();
                      return;
                    }

                    Navigator.of(context).pop(text);
                    onConfirm?.call(text);
                  },
                  child: Text(
                    confirmText,
                    style: TextStyle(
                      color: context.primaryColor,
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            );
          },
        );
      },
    ).whenComplete(() {
      controller.dispose();
      focusNode.dispose();
    });
  }

  // ==================== 底部弹窗 ====================

  /// 显示底部弹窗
  ///
  /// [context] 上下文
  /// [title] 弹窗标题
  /// [message] 弹窗消息内容
  /// [actions] 操作按钮列表（必选）
  /// [cancelText] 取消按钮文本，null表示不显示取消按钮
  /// [barrierDismissible] 点击外部是否可关闭，默认true
  /// [onSelected] 操作选中回调函数
  ///
  /// 返回值：选中的操作值，null表示取消或点击外部关闭
  static Future<T?> showBottomSheet<T>(
    BuildContext context, {
    String? title,
    String? message,
    required List<DialogOption<T>> actions,
    String? cancelText = '取消',
    bool barrierDismissible = true,
    void Function(T value)? onSelected,
  }) async {
    if (actions.isEmpty) {
      throw ArgumentError('操作列表不能为空');
    }

    return showCupertinoModalPopup<T>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (BuildContext context) {
        return CupertinoActionSheet(
          title: title != null
              ? Text(
                  title,
                  style: TextStyle(
                    color: context.secondaryTextColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w400,
                  ),
                )
              : null,
          message: message != null
              ? Text(
                  message,
                  style: TextStyle(
                    color: context.tertiaryTextColor,
                    fontSize: 13,
                    height: 1.33,
                  ),
                )
              : null,
          actions: actions.map((action) {
            return CupertinoActionSheetAction(
              isDestructiveAction: action.isDestructive,
              isDefaultAction: action.isDefault,
              onPressed: () {
                Navigator.of(context).pop(action.value);
                onSelected?.call(action.value);
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (action.icon != null) ...[
                    Icon(
                      action.icon,
                      size: 20,
                      color: action.isDestructive
                          ? context.errorColor
                          : context.primaryColor,
                      semanticLabel: action.semanticLabel,
                    ),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    action.label,
                    style: TextStyle(
                      color: action.isDestructive
                          ? context.errorColor
                          : context.primaryColor,
                      fontSize: 20,
                      fontWeight:
                          action.isDefault ? FontWeight.w600 : FontWeight.w400,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
          cancelButton: cancelText != null
              ? CupertinoActionSheetAction(
                  onPressed: () {
                    Navigator.of(context).pop();
                  },
                  child: Text(
                    cancelText,
                    style: TextStyle(
                      color: context.primaryColor,
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                )
              : null,
        );
      },
    );
  }

  // ==================== 便捷方法 ====================

  /// 显示加载对话框
  ///
  /// [context] 上下文
  /// [message] 加载消息，默认"加载中..."
  /// [barrierDismissible] 点击外部是否可关闭，默认false
  ///
  /// 返回值：Future，可用于关闭对话框
  static Future<void> showLoadingDialog(
    BuildContext context, {
    String message = '加载中...',
    bool barrierDismissible = false,
  }) {
    return showCupertinoDialog<void>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (BuildContext context) {
        return CupertinoAlertDialog(
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CupertinoActivityIndicator(
                radius: 14,
              ),
              const SizedBox(height: 16),
              Text(
                message,
                style: TextStyle(
                  color: context.secondaryTextColor,
                  fontSize: 16,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  /// 关闭对话框
  ///
  /// [context] 上下文
  /// [result] 返回结果
  static void dismissDialog<T>(BuildContext context, [T? result]) {
    if (Navigator.canPop(context)) {
      Navigator.of(context).pop(result);
    }
  }

  /// 显示快速提示（Toast风格）
  ///
  /// [context] 上下文
  /// [message] 提示消息（必选）
  /// [type] 提示类型：success, error, warning, info
  /// [duration] 显示时长（秒），默认2秒
  static void showQuickToast(
    BuildContext context, {
    required String message,
    String type = 'info',
    int duration = 2,
  }) {
    IconData icon;
    Color color;

    switch (type) {
      case 'success':
        icon = CupertinoIcons.checkmark_circle_fill;
        color = context.successColor;
        HapticFeedback.lightImpact();
        break;
      case 'error':
        icon = CupertinoIcons.exclamationmark_circle_fill;
        color = context.errorColor;
        HapticFeedback.vibrate();
        break;
      case 'warning':
        icon = CupertinoIcons.exclamationmark_triangle_fill;
        color = context.warningColor;
        HapticFeedback.mediumImpact();
        break;
      default:
        icon = CupertinoIcons.info_circle_fill;
        color = context.infoColor;
        break;
    }

    showCupertinoDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext context) {
        // 自动关闭
        Timer(Duration(seconds: duration), () {
          if (context.mounted) {
            Navigator.of(context).pop();
          }
        });

        return Center(
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 40),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: context.tertiaryBackgroundColor,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: context.borderColor.withValues(alpha: 0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  icon,
                  color: color,
                  size: 32,
                ),
                const SizedBox(height: 12),
                Text(
                  message,
                  style: TextStyle(
                    color: context.textColor,
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
