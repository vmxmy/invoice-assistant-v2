import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../theme/cupertino_theme_extensions.dart';

/// AppTextField - 统一的文本输入组件
///
/// 基于CupertinoTextField的实现，符合iOS Human Interface Guidelines，
/// 提供丰富的功能特性和完整的状态管理。
///
/// 主要特性：
/// - 多种输入类型支持（文本、密码、邮箱、数字等）
/// - 验证状态显示（正常、错误、成功）
/// - 前缀和后缀图标支持
/// - 清除按钮功能
/// - 字符计数显示
/// - 多行文本支持
/// - 完整的无障碍支持
/// - 自适应主题颜色
///
/// 使用示例：
/// ```dart
/// AppTextField(
///   placeholder: '请输入用户名',
///   type: AppTextFieldType.text,
///   prefixIcon: CupertinoIcons.person,
///   onChanged: (value) => print('输入: $value'),
///   validator: (value) => value?.isEmpty == true ? '请输入用户名' : null,
/// )
/// ```

/// 文本输入框类型枚举
enum AppTextFieldType {
  /// 普通文本
  text,

  /// 密码输入
  password,

  /// 邮箱地址
  email,

  /// 手机号码
  phone,

  /// 数字输入
  number,

  /// 搜索输入
  search,

  /// 多行文本
  multiline,

  /// URL地址
  url,
}

/// 验证状态枚举
enum AppTextFieldValidationState {
  /// 正常状态
  normal,

  /// 错误状态
  error,

  /// 成功状态
  success,

  /// 警告状态
  warning,
}

/// 统一文本输入组件
class AppTextField extends StatefulWidget {
  /// 构造函数
  const AppTextField({
    super.key,
    this.controller,
    this.placeholder,
    this.type = AppTextFieldType.text,
    this.validationState = AppTextFieldValidationState.normal,
    this.prefixIcon,
    this.suffixIcon,
    this.showClearButton = false,
    this.showCharacterCount = false,
    this.maxLength,
    this.maxLines = 1,
    this.minLines,
    this.enabled = true,
    this.readOnly = false,
    this.obscureText,
    this.onChanged,
    this.onSubmitted,
    this.onTap,
    this.validator,
    this.errorText,
    this.helperText,
    this.focusNode,
    this.keyboardType,
    this.textInputAction,
    this.inputFormatters,
    this.autofocus = false,
    this.textAlign = TextAlign.start,
    this.textCapitalization = TextCapitalization.none,
    this.style,
    this.decoration,
    this.padding,
    this.enableInteractiveSelection = true,
    this.onEditingComplete,
    this.contextMenuBuilder,
    this.magnifierConfiguration,
    this.scrollPhysics,
    this.scrollController,
    this.restorationId,
    this.enableIMEPersonalizedLearning = true,
  });

  /// 文本控制器
  final TextEditingController? controller;

  /// 占位符文本
  final String? placeholder;

  /// 输入框类型
  final AppTextFieldType type;

  /// 验证状态
  final AppTextFieldValidationState validationState;

  /// 前缀图标
  final IconData? prefixIcon;

  /// 后缀图标
  final IconData? suffixIcon;

  /// 是否显示清除按钮
  final bool showClearButton;

  /// 是否显示字符计数
  final bool showCharacterCount;

  /// 最大字符数
  final int? maxLength;

  /// 最大行数
  final int maxLines;

  /// 最小行数
  final int? minLines;

  /// 是否启用
  final bool enabled;

  /// 是否只读
  final bool readOnly;

  /// 是否隐藏文本（密码输入）
  final bool? obscureText;

  /// 文本改变回调
  final ValueChanged<String>? onChanged;

  /// 提交回调
  final ValueChanged<String>? onSubmitted;

  /// 点击回调
  final VoidCallback? onTap;

  /// 验证器
  final String? Function(String?)? validator;

  /// 错误文本
  final String? errorText;

  /// 帮助文本
  final String? helperText;

  /// 焦点节点
  final FocusNode? focusNode;

  /// 键盘类型
  final TextInputType? keyboardType;

  /// 文本输入操作
  final TextInputAction? textInputAction;

  /// 输入格式器
  final List<TextInputFormatter>? inputFormatters;

  /// 自动对焦
  final bool autofocus;

  /// 文本对齐
  final TextAlign textAlign;

  /// 文本大小写
  final TextCapitalization textCapitalization;

  /// 文本样式
  final TextStyle? style;

  /// 装饰器
  final BoxDecoration? decoration;

  /// 内边距
  final EdgeInsetsGeometry? padding;

  /// 是否启用交互选择
  final bool enableInteractiveSelection;

  /// 编辑完成回调
  final VoidCallback? onEditingComplete;

  /// 上下文菜单构建器
  final Widget Function(BuildContext, EditableTextState)? contextMenuBuilder;

  /// 放大镜配置
  final TextMagnifierConfiguration? magnifierConfiguration;

  /// 滚动物理
  final ScrollPhysics? scrollPhysics;

  /// 滚动控制器
  final ScrollController? scrollController;

  /// 恢复ID
  final String? restorationId;

  /// 启用IME个性化学习
  final bool enableIMEPersonalizedLearning;

  @override
  State<AppTextField> createState() => _AppTextFieldState();

  /// 创建密码输入框
  static AppTextField password({
    Key? key,
    TextEditingController? controller,
    String? placeholder = '请输入密码',
    String? Function(String?)? validator,
    ValueChanged<String>? onChanged,
    ValueChanged<String>? onSubmitted,
    bool autofocus = false,
  }) {
    return AppTextField(
      key: key,
      controller: controller,
      placeholder: placeholder,
      type: AppTextFieldType.password,
      validator: validator,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      autofocus: autofocus,
      prefixIcon: CupertinoIcons.lock,
    );
  }

  /// 创建邮箱输入框
  static AppTextField email({
    Key? key,
    TextEditingController? controller,
    String? placeholder = '请输入邮箱地址',
    String? Function(String?)? validator,
    ValueChanged<String>? onChanged,
    ValueChanged<String>? onSubmitted,
    bool autofocus = false,
  }) {
    return AppTextField(
      key: key,
      controller: controller,
      placeholder: placeholder,
      type: AppTextFieldType.email,
      validator: validator,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      autofocus: autofocus,
      prefixIcon: CupertinoIcons.mail,
      showClearButton: true,
    );
  }

  /// 创建搜索输入框
  static AppTextField search({
    Key? key,
    TextEditingController? controller,
    String? placeholder = '搜索',
    ValueChanged<String>? onChanged,
    ValueChanged<String>? onSubmitted,
    bool autofocus = false,
  }) {
    return AppTextField(
      key: key,
      controller: controller,
      placeholder: placeholder,
      type: AppTextFieldType.search,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      autofocus: autofocus,
      prefixIcon: CupertinoIcons.search,
      showClearButton: true,
      textInputAction: TextInputAction.search,
    );
  }

  /// 创建数字输入框
  static AppTextField number({
    Key? key,
    TextEditingController? controller,
    String? placeholder = '请输入数字',
    int? maxLength,
    String? Function(String?)? validator,
    ValueChanged<String>? onChanged,
    ValueChanged<String>? onSubmitted,
    bool autofocus = false,
  }) {
    return AppTextField(
      key: key,
      controller: controller,
      placeholder: placeholder,
      type: AppTextFieldType.number,
      maxLength: maxLength,
      validator: validator,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      autofocus: autofocus,
      showCharacterCount: maxLength != null,
    );
  }

  /// 创建多行文本输入框
  static AppTextField multiline({
    Key? key,
    TextEditingController? controller,
    String? placeholder = '请输入内容',
    int maxLines = 4,
    int? maxLength,
    String? Function(String?)? validator,
    ValueChanged<String>? onChanged,
    bool autofocus = false,
    bool showCharacterCount = true,
  }) {
    return AppTextField(
      key: key,
      controller: controller,
      placeholder: placeholder,
      type: AppTextFieldType.multiline,
      maxLines: maxLines,
      maxLength: maxLength,
      validator: validator,
      onChanged: onChanged,
      autofocus: autofocus,
      showCharacterCount: showCharacterCount,
    );
  }
}

class _AppTextFieldState extends State<AppTextField> {
  late TextEditingController _controller;
  late FocusNode _focusNode;
  bool _isFocused = false;
  bool _obscureText = false;
  String? _errorText;

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ?? TextEditingController();
    _focusNode = widget.focusNode ?? FocusNode();
    _obscureText = _getInitialObscureText();

    _focusNode.addListener(_onFocusChanged);
    _controller.addListener(_onTextChanged);

    // 初始验证
    _validateInput(_controller.text);
  }

  @override
  void didUpdateWidget(AppTextField oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (widget.controller != oldWidget.controller) {
      if (oldWidget.controller == null) {
        _controller.dispose();
      }
      _controller = widget.controller ?? TextEditingController();
      _controller.addListener(_onTextChanged);
    }

    if (widget.focusNode != oldWidget.focusNode) {
      if (oldWidget.focusNode == null) {
        _focusNode.dispose();
      }
      _focusNode = widget.focusNode ?? FocusNode();
      _focusNode.addListener(_onFocusChanged);
    }

    if (widget.type != oldWidget.type) {
      _obscureText = _getInitialObscureText();
    }
  }

  @override
  void dispose() {
    if (widget.controller == null) {
      _controller.dispose();
    } else {
      _controller.removeListener(_onTextChanged);
    }

    if (widget.focusNode == null) {
      _focusNode.dispose();
    } else {
      _focusNode.removeListener(_onFocusChanged);
    }

    super.dispose();
  }

  /// 获取初始的隐藏文本状态
  bool _getInitialObscureText() {
    if (widget.obscureText != null) {
      return widget.obscureText!;
    }
    return widget.type == AppTextFieldType.password;
  }

  /// 焦点变化回调
  void _onFocusChanged() {
    setState(() {
      _isFocused = _focusNode.hasFocus;
    });
  }

  /// 文本变化回调
  void _onTextChanged() {
    final text = _controller.text;
    _validateInput(text);
    widget.onChanged?.call(text);
  }

  /// 验证输入
  void _validateInput(String text) {
    if (widget.validator != null) {
      final error = widget.validator!(text.isEmpty ? null : text);
      setState(() {
        _errorText = error;
      });
    }
  }

  /// 获取键盘类型
  TextInputType _getKeyboardType() {
    if (widget.keyboardType != null) {
      return widget.keyboardType!;
    }

    switch (widget.type) {
      case AppTextFieldType.email:
        return TextInputType.emailAddress;
      case AppTextFieldType.phone:
        return TextInputType.phone;
      case AppTextFieldType.number:
        return TextInputType.number;
      case AppTextFieldType.multiline:
        return TextInputType.multiline;
      case AppTextFieldType.url:
        return TextInputType.url;
      default:
        return TextInputType.text;
    }
  }

  /// 获取文本输入操作
  TextInputAction _getTextInputAction() {
    if (widget.textInputAction != null) {
      return widget.textInputAction!;
    }

    if (widget.type == AppTextFieldType.multiline) {
      return TextInputAction.newline;
    }

    return TextInputAction.done;
  }

  /// 获取输入格式器
  List<TextInputFormatter> _getInputFormatters() {
    final formatters = <TextInputFormatter>[];

    // 添加用户自定义格式器
    if (widget.inputFormatters != null) {
      formatters.addAll(widget.inputFormatters!);
    }

    // 添加长度限制
    if (widget.maxLength != null) {
      formatters.add(LengthLimitingTextInputFormatter(widget.maxLength));
    }

    // 根据类型添加特定格式器
    switch (widget.type) {
      case AppTextFieldType.number:
        formatters.add(FilteringTextInputFormatter.digitsOnly);
        break;
      case AppTextFieldType.phone:
        formatters
            .add(FilteringTextInputFormatter.allow(RegExp(r'[\d\+\-\s\(\)]')));
        break;
      default:
        break;
    }

    return formatters;
  }

  /// 获取边框颜色
  Color _getBorderColor(BuildContext context) {
    if (!widget.enabled) {
      return context.disabledColor;
    }

    if (_errorText != null || widget.errorText != null) {
      return context.errorColor;
    }

    switch (widget.validationState) {
      case AppTextFieldValidationState.error:
        return context.errorColor;
      case AppTextFieldValidationState.success:
        return context.successColor;
      case AppTextFieldValidationState.warning:
        return context.warningColor;
      default:
        return _isFocused ? context.primaryColor : context.borderColor;
    }
  }

  /// 获取文本样式
  TextStyle _getTextStyle(BuildContext context) {
    final baseStyle = widget.style ??
        TextStyle(
          fontSize: 17,
          color:
              widget.enabled ? context.textColor : context.quaternaryTextColor,
        );
    return baseStyle;
  }

  /// 获取占位符样式
  TextStyle _getPlaceholderStyle(BuildContext context) {
    return TextStyle(
      fontSize: 17,
      color: context.placeholderColor,
    );
  }

  /// 构建前缀图标
  Widget? _buildPrefixIcon(BuildContext context) {
    if (widget.prefixIcon == null) return null;

    return Padding(
      padding: const EdgeInsets.only(left: 12, right: 8),
      child: Icon(
        widget.prefixIcon,
        size: 20,
        color: _isFocused ? context.primaryColor : context.secondaryTextColor,
      ),
    );
  }

  /// 构建后缀图标组
  Widget? _buildSuffixWidget(BuildContext context) {
    final widgets = <Widget>[];

    // 密码显示/隐藏按钮
    if (widget.type == AppTextFieldType.password) {
      widgets.add(
        CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: () => setState(() => _obscureText = !_obscureText),
          child: Icon(
            _obscureText ? CupertinoIcons.eye_slash : CupertinoIcons.eye,
            size: 20,
            color: context.secondaryTextColor,
            semanticLabel: _obscureText ? '显示密码' : '隐藏密码',
          ),
        ),
      );
    }

    // 清除按钮
    if (widget.showClearButton &&
        _controller.text.isNotEmpty &&
        widget.enabled) {
      widgets.add(
        CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: () {
            _controller.clear();
            widget.onChanged?.call('');
          },
          child: Icon(
            CupertinoIcons.clear_circled_solid,
            size: 20,
            color: context.secondaryTextColor,
            semanticLabel: '清除文本',
          ),
        ),
      );
    }

    // 自定义后缀图标
    if (widget.suffixIcon != null) {
      widgets.add(
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: Icon(
            widget.suffixIcon,
            size: 20,
            color:
                _isFocused ? context.primaryColor : context.secondaryTextColor,
          ),
        ),
      );
    }

    if (widgets.isEmpty) return null;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: widgets
          .map((w) => Padding(
                padding: const EdgeInsets.only(left: 4),
                child: w,
              ))
          .toList(),
    );
  }

  /// 构建字符计数器
  Widget? _buildCharacterCounter(BuildContext context) {
    if (!widget.showCharacterCount) return null;

    final currentLength = _controller.text.length;
    final maxLength = widget.maxLength;

    String counterText;
    Color counterColor;

    if (maxLength != null) {
      counterText = '$currentLength/$maxLength';
      final ratio = currentLength / maxLength;
      if (ratio >= 1.0) {
        counterColor = context.errorColor;
      } else if (ratio >= 0.8) {
        counterColor = context.warningColor;
      } else {
        counterColor = context.tertiaryTextColor;
      }
    } else {
      counterText = '$currentLength';
      counterColor = context.tertiaryTextColor;
    }

    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Text(
            counterText,
            style: TextStyle(
              fontSize: 12,
              color: counterColor,
            ),
          ),
        ],
      ),
    );
  }

  /// 构建帮助文本或错误文本
  Widget? _buildHelperText(BuildContext context) {
    final errorText = _errorText ?? widget.errorText;
    final helperText = widget.helperText;

    String? displayText;
    Color? textColor;

    if (errorText != null) {
      displayText = errorText;
      textColor = context.errorColor;
    } else if (helperText != null) {
      displayText = helperText;
      textColor = context.tertiaryTextColor;
    }

    if (displayText == null || textColor == null) return null;

    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Text(
        displayText,
        style: TextStyle(
          fontSize: 12,
          color: textColor,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final borderColor = _getBorderColor(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // 主输入框
        Container(
          decoration: widget.decoration ??
              BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: borderColor,
                  width: _isFocused ? 2 : 1,
                ),
                color: widget.enabled
                    ? context.tertiaryBackgroundColor
                    : context.systemGray6Color,
              ),
          child: CupertinoTextField(
            controller: _controller,
            focusNode: _focusNode,
            placeholder: widget.placeholder,
            maxLines: widget.maxLines,
            minLines: widget.minLines,
            enabled: widget.enabled,
            readOnly: widget.readOnly,
            obscureText: _obscureText,
            keyboardType: _getKeyboardType(),
            textInputAction: _getTextInputAction(),
            inputFormatters: _getInputFormatters(),
            autofocus: widget.autofocus,
            textAlign: widget.textAlign,
            textCapitalization: widget.textCapitalization,
            style: _getTextStyle(context),
            placeholderStyle: _getPlaceholderStyle(context),
            padding: widget.padding ??
                const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
            decoration: const BoxDecoration(),
            prefix: _buildPrefixIcon(context),
            suffix: _buildSuffixWidget(context),
            onChanged: (value) {
              // onChanged 已在 _onTextChanged 中处理
            },
            onSubmitted: widget.onSubmitted,
            onTap: widget.onTap,
            enableInteractiveSelection: widget.enableInteractiveSelection,
            onEditingComplete: widget.onEditingComplete,
            contextMenuBuilder: widget.contextMenuBuilder,
            magnifierConfiguration: widget.magnifierConfiguration,
            scrollPhysics: widget.scrollPhysics,
            scrollController: widget.scrollController,
            restorationId: widget.restorationId,
            enableIMEPersonalizedLearning: widget.enableIMEPersonalizedLearning,
          ),
        ),

        // 底部信息区域
        if (widget.showCharacterCount ||
            widget.helperText != null ||
            _errorText != null ||
            widget.errorText != null)
          Row(
            children: [
              Expanded(
                child: _buildHelperText(context) ?? const SizedBox.shrink(),
              ),
              if (widget.showCharacterCount)
                _buildCharacterCounter(context) ?? const SizedBox.shrink(),
            ],
          ),
      ],
    );
  }
}
