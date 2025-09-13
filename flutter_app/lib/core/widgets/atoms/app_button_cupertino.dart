import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../../theme/app_colors.dart';
import '../../theme/component_theme_constants.dart';
import 'app_button.dart';

/// AppButton的Cupertino风格扩展
/// 
/// 基于现有AppButton组件，提供iOS风格的外观和交互
/// 保持API一致性，仅更改视觉和交互实现
class AppButtonCupertino extends StatelessWidget {
  /// 按钮显示的文本
  final String text;
  
  /// 点击事件回调，为null时按钮禁用
  final VoidCallback? onPressed;
  
  /// 按钮变体，决定按钮的外观样式
  final ButtonVariant variant;
  
  /// 按钮尺寸
  final ButtonSize size;
  
  /// 可选的图标，显示在文本左侧
  final IconData? icon;
  
  /// 是否显示加载状态
  final bool loading;
  
  /// 语义化标签，用于无障碍支持
  final String? semanticLabel;
  
  /// 是否启用触觉反馈
  final bool enableHapticFeedback;
  
  /// 自定义按钮宽度，为null时自适应内容
  final double? width;

  const AppButtonCupertino({
    super.key,
    required this.text,
    this.onPressed,
    this.variant = ButtonVariant.primary,
    this.size = ButtonSize.medium,
    this.icon,
    this.loading = false,
    this.semanticLabel,
    this.enableHapticFeedback = true,
    this.width,
  });

  @override
  Widget build(BuildContext context) {
    final isEnabled = onPressed != null && !loading;
    
    return Semantics(
      label: semanticLabel ?? text,
      button: true,
      enabled: isEnabled,
      child: SizedBox(
        width: width,
        height: _getButtonHeight(),
        child: CupertinoButton(
          onPressed: isEnabled ? _handlePress : null,
          padding: EdgeInsets.symmetric(
            horizontal: _getHorizontalPadding(),
          ),
          borderRadius: BorderRadius.circular(_getBorderRadius()),
          color: _getBackgroundColor(context, isEnabled) ?? CupertinoColors.systemGrey4.resolveFrom(context),
          disabledColor: _getDisabledBackgroundColor(context) ?? CupertinoColors.systemGrey4.resolveFrom(context),
          pressedOpacity: _getPressedOpacity(),
          child: loading
              ? _buildLoadingContent(context)
              : _buildButtonContent(context, isEnabled),
        ),
      ),
    );
  }

  /// 处理按钮点击
  void _handlePress() {
    if (enableHapticFeedback) {
      HapticFeedback.lightImpact();
    }
    onPressed?.call();
  }

  /// 获取按钮高度
  double _getButtonHeight() {
    switch (size) {
      case ButtonSize.small:
        return ComponentThemeConstants.buttonHeightSmall;
      case ButtonSize.medium:
        return ComponentThemeConstants.buttonHeightMedium;
      case ButtonSize.large:
        return ComponentThemeConstants.buttonHeightLarge;
    }
  }

  /// 获取水平内边距
  double _getHorizontalPadding() {
    switch (size) {
      case ButtonSize.small:
        return ComponentThemeConstants.spacingM;
      case ButtonSize.medium:
        return ComponentThemeConstants.spacingL;
      case ButtonSize.large:
        return ComponentThemeConstants.spacingXL;
    }
  }

  /// 获取圆角半径
  double _getBorderRadius() {
    return ComponentThemeConstants.radiusMedium;
  }

  /// 获取按下时的不透明度
  double _getPressedOpacity() {
    switch (variant) {
      case ButtonVariant.primary:
      case ButtonVariant.error:
        return 0.8;
      case ButtonVariant.secondary:
      case ButtonVariant.outline:
        return 0.7;
      case ButtonVariant.ghost:
        return 0.5;
    }
  }

  /// 获取背景颜色 - 使用现有AppColors系统
  Color? _getBackgroundColor(BuildContext context, bool isEnabled) {
    if (!isEnabled) return null;

    switch (variant) {
      case ButtonVariant.primary:
        return AppColors.primary(context);
      case ButtonVariant.secondary:
        return AppColors.secondary(context);
      case ButtonVariant.outline:
        return null;
      case ButtonVariant.ghost:
        return null;
      case ButtonVariant.error:
        return AppColors.error(context);
    }
  }

  /// 获取禁用状态的背景颜色
  Color? _getDisabledBackgroundColor(BuildContext context) {
    switch (variant) {
      case ButtonVariant.primary:
      case ButtonVariant.secondary:
      case ButtonVariant.error:
        return CupertinoColors.systemGrey4.resolveFrom(context);
      case ButtonVariant.outline:
      case ButtonVariant.ghost:
        return null;
    }
  }

  /// 获取前景颜色 - 使用现有AppColors系统
  Color _getForegroundColor(BuildContext context, bool isEnabled) {
    if (!isEnabled) {
      return AppColors.disabled(context);
    }

    switch (variant) {
      case ButtonVariant.primary:
        return AppColors.onPrimary(context);
      case ButtonVariant.secondary:
        return AppColors.onSecondary(context);
      case ButtonVariant.outline:
        return AppColors.primary(context);
      case ButtonVariant.ghost:
        return AppColors.onSurface(context);
      case ButtonVariant.error:
        return AppColors.onError(context);
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
        textAlign: TextAlign.center,
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          icon,
          size: _getIconSize(),
          color: textColor,
        ),
        SizedBox(width: ComponentThemeConstants.spacingS),
        Flexible(
          child: Text(
            text,
            style: textStyle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }

  /// 构建加载状态内容
  Widget _buildLoadingContent(BuildContext context) {
    final textColor = _getForegroundColor(context, true);
    
    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        SizedBox(
          width: _getIconSize(),
          height: _getIconSize(),
          child: CupertinoActivityIndicator(
            color: textColor,
            radius: _getIconSize() / 2,
          ),
        ),
        SizedBox(width: ComponentThemeConstants.spacingS),
        Text(
          '加载中...',
          style: _getTextStyle().copyWith(color: textColor),
        ),
      ],
    );
  }

  /// 获取文字样式 - 使用现有样式常量
  TextStyle _getTextStyle() {
    switch (size) {
      case ButtonSize.small:
        return const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          letterSpacing: -0.08, // iOS风格字间距
        );
      case ButtonSize.medium:
        return const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          letterSpacing: -0.08,
        );
      case ButtonSize.large:
        return const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.1,
        );
    }
  }

  /// 获取图标尺寸
  double _getIconSize() {
    switch (size) {
      case ButtonSize.small:
        return 16.0;
      case ButtonSize.medium:
        return 20.0;
      case ButtonSize.large:
        return 24.0;
    }
  }
}

/// AppButton的Cupertino适配扩展
/// 提供便捷的构造方法
extension AppButtonCupertinoExtension on AppButton {
  /// 转换为Cupertino风格
  AppButtonCupertino get cupertino => AppButtonCupertino(
        text: text,
        onPressed: onPressed,
        variant: variant,
        size: size,
        icon: icon,
        loading: loading,
        semanticLabel: semanticLabel,
      );
}