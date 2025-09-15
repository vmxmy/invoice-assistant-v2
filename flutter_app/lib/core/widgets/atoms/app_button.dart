import 'package:flutter/cupertino.dart';
import '../../theme/cupertino_theme_extensions.dart';

/// 按钮样式枚举
/// 遵循iOS Human Interface Guidelines设计规范
enum AppButtonStyle {
  /// 填充按钮 - 主要操作，具有实心背景
  filled,

  /// 幽灵按钮 - 次要操作，透明背景带边框
  ghost,

  /// 危险按钮 - 危险操作，如删除
  destructive,
}

/// 按钮尺寸枚举
/// 符合iOS触摸目标最小44pt的规范
enum AppButtonSize {
  /// 小按钮 - 44pt高度
  small,

  /// 中等按钮 - 50pt高度
  medium,

  /// 大按钮 - 56pt高度
  large,
}

/// 统一的应用按钮组件
///
/// 基于Cupertino设计系统，遵循iOS Human Interface Guidelines，
/// 支持多种样式、尺寸和状态，提供完整的无障碍支持。
///
/// 主要特性：
/// - 符合iOS设计规范的外观和交互
/// - 支持filled、ghost、destructive三种样式
/// - 三种尺寸满足不同场景需求
/// - 完整的加载状态和禁用状态支持
/// - 支持图标和文本组合显示
/// - 完善的无障碍支持
/// - 使用Cupertino主题颜色系统
///
/// 示例用法:
/// ```dart
/// // 基础用法
/// AppButton(
///   text: '确认',
///   onPressed: () => print('按钮被点击'),
/// )
///
/// // 带图标的危险操作按钮
/// AppButton(
///   text: '删除',
///   icon: CupertinoIcons.delete,
///   style: AppButtonStyle.destructive,
///   onPressed: () => handleDelete(),
/// )
///
/// // 加载状态按钮
/// AppButton(
///   text: '提交',
///   loading: true,
///   size: AppButtonSize.large,
/// )
/// ```
class AppButton extends StatelessWidget {
  /// 按钮显示的文本
  final String text;

  /// 点击事件回调，为null时按钮禁用
  final VoidCallback? onPressed;

  /// 按钮样式，决定按钮的外观
  ///
  /// 可选值: filled, ghost, destructive
  final AppButtonStyle style;

  /// 按钮尺寸
  ///
  /// 可选值: small (44pt), medium (50pt), large (56pt)
  final AppButtonSize size;

  /// 可选的图标，显示在文本左侧
  /// 建议使用CupertinoIcons中的图标
  final IconData? icon;

  /// 是否显示加载状态
  ///
  /// 为true时显示旋转的活动指示器，禁用点击
  final bool loading;

  /// 是否显示全宽按钮
  ///
  /// 为true时按钮会占据父容器的全部宽度
  final bool fullWidth;

  /// 语义化标签，用于VoiceOver等辅助功能
  ///
  /// 如果未提供，将使用text作为默认值
  final String? semanticLabel;

  /// 自定义按钮内边距
  ///
  /// 如果未提供，将根据size自动计算
  final EdgeInsets? padding;

  const AppButton({
    super.key,
    required this.text,
    this.onPressed,
    this.style = AppButtonStyle.filled,
    this.size = AppButtonSize.medium,
    this.icon,
    this.loading = false,
    this.fullWidth = false,
    this.semanticLabel,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final isEnabled = onPressed != null && !loading;
    final effectivePadding = padding ?? _getDefaultPadding();

    return Semantics(
      label: semanticLabel ?? text,
      button: true,
      enabled: isEnabled,
      child: SizedBox(
        height: _getButtonHeight(),
        width: fullWidth ? double.infinity : null,
        child: _buildButtonWrapper(context, isEnabled, effectivePadding),
      ),
    );
  }

  /// 构建按钮包装器
  /// 为ghost样式添加边框支持
  Widget _buildButtonWrapper(
      BuildContext context, bool isEnabled, EdgeInsets effectivePadding) {
    if (style == AppButtonStyle.ghost) {
      // Ghost样式需要边框
      return Container(
        decoration: BoxDecoration(
          border: Border.all(
            color: isEnabled
                ? context.primaryColor.withValues(alpha: 0.3)
                : context.borderColor,
            width: 1.0,
          ),
          borderRadius: BorderRadius.circular(_getBorderRadius()),
        ),
        child: CupertinoButton(
          onPressed: isEnabled ? onPressed : null,
          padding: effectivePadding,
          // 不设置color和disabledColor以使用透明背景
          borderRadius: BorderRadius.circular(_getBorderRadius()),
          child: loading
              ? _buildLoadingContent(context)
              : _buildButtonContent(context, isEnabled),
        ),
      );
    } else {
      // 其他样式使用标准CupertinoButton
      return CupertinoButton(
        onPressed: isEnabled ? onPressed : null,
        padding: effectivePadding,
        color: _getBackgroundColor(context, isEnabled),
        disabledColor: _getDisabledBackgroundColor(context),
        borderRadius: BorderRadius.circular(_getBorderRadius()),
        child: loading
            ? _buildLoadingContent(context)
            : _buildButtonContent(context, isEnabled),
      );
    }
  }

  /// 获取按钮高度
  /// 遵循iOS最小触摸目标44pt的规范
  double _getButtonHeight() {
    switch (size) {
      case AppButtonSize.small:
        return 44.0; // iOS最小触摸目标
      case AppButtonSize.medium:
        return 50.0;
      case AppButtonSize.large:
        return 56.0;
    }
  }

  /// 获取默认内边距
  EdgeInsets _getDefaultPadding() {
    final horizontal = _getHorizontalPadding();
    final vertical = _getVerticalPadding();
    return EdgeInsets.symmetric(
      horizontal: horizontal,
      vertical: vertical,
    );
  }

  /// 获取水平内边距
  double _getHorizontalPadding() {
    switch (size) {
      case AppButtonSize.small:
        return 16.0;
      case AppButtonSize.medium:
        return 20.0;
      case AppButtonSize.large:
        return 24.0;
    }
  }

  /// 获取垂直内边距
  double _getVerticalPadding() {
    switch (size) {
      case AppButtonSize.small:
        return 8.0;
      case AppButtonSize.medium:
        return 10.0;
      case AppButtonSize.large:
        return 12.0;
    }
  }

  /// 获取圆角半径
  double _getBorderRadius() {
    switch (size) {
      case AppButtonSize.small:
        return 8.0;
      case AppButtonSize.medium:
        return 10.0;
      case AppButtonSize.large:
        return 12.0;
    }
  }

  /// 获取按钮背景颜色
  /// 使用Cupertino主题颜色系统
  Color? _getBackgroundColor(BuildContext context, bool isEnabled) {
    if (!isEnabled) {
      return null; // CupertinoButton会自动处理禁用状态颜色
    }

    switch (style) {
      case AppButtonStyle.filled:
        return context.primaryColor;
      case AppButtonStyle.ghost:
        return null; // 透明背景
      case AppButtonStyle.destructive:
        return context.errorColor;
    }
  }

  /// 获取禁用状态背景颜色
  Color _getDisabledBackgroundColor(BuildContext context) {
    return context.systemGray4Color;
  }

  /// 获取文本和图标颜色
  Color _getForegroundColor(BuildContext context, bool isEnabled) {
    if (!isEnabled) {
      return context.disabledColor;
    }

    switch (style) {
      case AppButtonStyle.filled:
        return context.getTextColorForBackground(context.primaryColor);
      case AppButtonStyle.ghost:
        return context.primaryColor;
      case AppButtonStyle.destructive:
        return context.getTextColorForBackground(context.errorColor);
    }
  }

  /// 构建按钮内容
  Widget _buildButtonContent(BuildContext context, bool isEnabled) {
    final textColor = _getForegroundColor(context, isEnabled);
    final textStyle = _getTextStyle().copyWith(color: textColor);

    if (icon == null) {
      return Text(
        text,
        style: textStyle,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: _getIconSize(),
          color: textColor,
        ),
        SizedBox(width: _getIconTextSpacing()),
        Flexible(
          child: Text(
            text,
            style: textStyle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  /// 构建加载状态内容
  Widget _buildLoadingContent(BuildContext context) {
    final textColor =
        _getForegroundColor(context, false); // 加载时按钮实际是禁用的但要显示正常颜色
    final textStyle = _getTextStyle().copyWith(color: textColor);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: _getIconSize(),
          height: _getIconSize(),
          child: CupertinoActivityIndicator(
            color: textColor,
            radius: _getActivityIndicatorRadius(),
          ),
        ),
        SizedBox(width: _getIconTextSpacing()),
        Text(
          '加载中...',
          style: textStyle,
        ),
      ],
    );
  }

  /// 获取文字样式
  /// 遵循iOS Typography规范
  TextStyle _getTextStyle() {
    switch (size) {
      case AppButtonSize.small:
        return const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.24,
        );
      case AppButtonSize.medium:
        return const TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.41,
        );
      case AppButtonSize.large:
        return const TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.38,
        );
    }
  }

  /// 获取图标尺寸
  double _getIconSize() {
    switch (size) {
      case AppButtonSize.small:
        return 18.0;
      case AppButtonSize.medium:
        return 20.0;
      case AppButtonSize.large:
        return 24.0;
    }
  }

  /// 获取图标和文本之间的间距
  double _getIconTextSpacing() {
    switch (size) {
      case AppButtonSize.small:
        return 6.0;
      case AppButtonSize.medium:
        return 8.0;
      case AppButtonSize.large:
        return 10.0;
    }
  }

  /// 获取活动指示器半径
  double _getActivityIndicatorRadius() {
    switch (size) {
      case AppButtonSize.small:
        return 8.0;
      case AppButtonSize.medium:
        return 10.0;
      case AppButtonSize.large:
        return 12.0;
    }
  }
}
