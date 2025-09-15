import 'package:flutter/material.dart';
import '../../theme/design_constants.dart';

/// 文本变体枚举
enum TextVariant {
  displayLarge,
  displayMedium, 
  displaySmall,
  headlineLarge,
  headlineMedium,
  headlineSmall,
  titleLarge,
  titleMedium,
  titleSmall,
  bodyLarge,
  bodyMedium,
  bodySmall,
  labelLarge,
  labelMedium,
  labelSmall,
}

/// 统一的应用文本组件
/// 
/// 提供一致的文本样式和行为，自动适配主题
/// 
/// 示例用法:
/// ```dart
/// AppText(
///   text: '标题文本',
///   variant: TextVariant.titleLarge,
///   color: colorScheme.primary,
/// )
/// ```
class AppText extends StatelessWidget {
  /// 显示的文本内容
  final String text;
  
  /// 文本变体，决定文本的样式
  final TextVariant variant;
  
  /// 文本对齐方式
  final TextAlign? textAlign;
  
  /// 最大行数，超出时显示省略号
  final int? maxLines;
  
  /// 自定义文本颜色，为null时使用主题默认颜色
  final Color? color;
  
  /// 文本溢出处理方式
  final TextOverflow? overflow;
  
  /// 自定义字体粗细
  final FontWeight? fontWeight;
  
  /// 自定义字体大小
  final double? fontSize;
  
  /// 自定义行高
  final double? height;
  
  /// 自定义字符间距
  final double? letterSpacing;
  
  /// 语义化标签，用于无障碍支持
  final String? semanticLabel;
  
  /// 是否可选择文本
  final bool selectable;

  const AppText({
    super.key,
    required this.text,
    this.variant = TextVariant.bodyMedium,
    this.textAlign,
    this.maxLines,
    this.color,
    this.overflow,
    this.fontWeight,
    this.fontSize,
    this.height,
    this.letterSpacing,
    this.semanticLabel,
    this.selectable = false,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;
    
    final effectiveStyle = _getTextStyle(textTheme, colorScheme);
    
    if (selectable) {
      return SelectableText(
        text,
        style: effectiveStyle,
        textAlign: textAlign,
        maxLines: maxLines,
        semanticsLabel: semanticLabel,
      );
    }
    
    return Text(
      text,
      style: effectiveStyle,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow ?? (maxLines != null ? TextOverflow.ellipsis : null),
      semanticsLabel: semanticLabel,
    );
  }

  /// 获取文本样式
  TextStyle _getTextStyle(TextTheme textTheme, ColorScheme colorScheme) {
    TextStyle baseStyle = _getBaseStyle(textTheme);
    
    return baseStyle.copyWith(
      color: color ?? _getDefaultColor(colorScheme),
      fontWeight: fontWeight,
      fontSize: fontSize,
      height: height,
      letterSpacing: letterSpacing,
    );
  }

  /// 获取基础样式
  TextStyle _getBaseStyle(TextTheme textTheme) {
    switch (variant) {
      case TextVariant.displayLarge:
        return textTheme.displayLarge ?? const TextStyle(fontSize: 57);
      case TextVariant.displayMedium:
        return textTheme.displayMedium ?? const TextStyle(fontSize: 45);
      case TextVariant.displaySmall:
        return textTheme.displaySmall ?? const TextStyle(fontSize: 36);
      case TextVariant.headlineLarge:
        return textTheme.headlineLarge ?? const TextStyle(fontSize: 32);
      case TextVariant.headlineMedium:
        return textTheme.headlineMedium ?? const TextStyle(fontSize: 28);
      case TextVariant.headlineSmall:
        return textTheme.headlineSmall ?? const TextStyle(fontSize: 24);
      case TextVariant.titleLarge:
        return textTheme.titleLarge ?? const TextStyle(fontSize: 22);
      case TextVariant.titleMedium:
        return textTheme.titleMedium ?? const TextStyle(fontSize: 16);
      case TextVariant.titleSmall:
        return textTheme.titleSmall ?? const TextStyle(fontSize: 14);
      case TextVariant.bodyLarge:
        return textTheme.bodyLarge ?? const TextStyle(fontSize: 16);
      case TextVariant.bodyMedium:
        return textTheme.bodyMedium ?? const TextStyle(fontSize: 14);
      case TextVariant.bodySmall:
        return textTheme.bodySmall ?? const TextStyle(fontSize: 12);
      case TextVariant.labelLarge:
        return textTheme.labelLarge ?? const TextStyle(fontSize: 14);
      case TextVariant.labelMedium:
        return textTheme.labelMedium ?? const TextStyle(fontSize: 12);
      case TextVariant.labelSmall:
        return textTheme.labelSmall ?? const TextStyle(fontSize: 11);
    }
  }

  /// 获取默认颜色
  Color _getDefaultColor(ColorScheme colorScheme) {
    switch (variant) {
      case TextVariant.displayLarge:
      case TextVariant.displayMedium:
      case TextVariant.displaySmall:
      case TextVariant.headlineLarge:
      case TextVariant.headlineMedium:
      case TextVariant.headlineSmall:
      case TextVariant.titleLarge:
      case TextVariant.titleMedium:
      case TextVariant.titleSmall:
        return colorScheme.onSurface;
      case TextVariant.bodyLarge:
      case TextVariant.bodyMedium:
        return colorScheme.onSurface;
      case TextVariant.bodySmall:
      case TextVariant.labelLarge:
      case TextVariant.labelMedium:
      case TextVariant.labelSmall:
        return colorScheme.onSurfaceVariant;
    }
  }
}

/// 富文本组件
/// 
/// 支持多种文本样式的混合显示
class AppRichText extends StatelessWidget {
  /// 文本片段列表
  final List<TextSpan> textSpans;
  
  /// 文本对齐方式
  final TextAlign? textAlign;
  
  /// 最大行数
  final int? maxLines;
  
  /// 文本溢出处理方式
  final TextOverflow? overflow;
  
  /// 语义化标签，用于无障碍支持
  final String? semanticLabel;
  
  /// 是否可选择文本
  final bool selectable;

  const AppRichText({
    super.key,
    required this.textSpans,
    this.textAlign,
    this.maxLines,
    this.overflow,
    this.semanticLabel,
    this.selectable = false,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    
    final richText = RichText(
      text: TextSpan(
        style: textTheme.bodyMedium,
        children: textSpans,
      ),
      textAlign: textAlign ?? TextAlign.start,
      maxLines: maxLines,
      overflow: overflow ?? (maxLines != null ? TextOverflow.ellipsis : TextOverflow.visible),
    );
    
    if (selectable) {
      return SelectableText.rich(
        TextSpan(
          style: textTheme.bodyMedium,
          children: textSpans,
        ),
        textAlign: textAlign,
        maxLines: maxLines,
      );
    }
    
    if (semanticLabel != null) {
      return Semantics(
        label: semanticLabel,
        child: richText,
      );
    }
    
    return richText;
  }
}

/// 带图标的文本组件
/// 
/// 在文本前或后添加图标
class AppTextWithIcon extends StatelessWidget {
  /// 显示的文本内容
  final String text;
  
  /// 图标
  final IconData icon;
  
  /// 图标位置
  final IconPosition iconPosition;
  
  /// 文本变体
  final TextVariant variant;
  
  /// 图标和文本之间的间距
  final double spacing;
  
  /// 文本颜色
  final Color? textColor;
  
  /// 图标颜色
  final Color? iconColor;
  
  /// 自定义图标大小
  final double? iconSize;
  
  /// 最大行数
  final int? maxLines;
  
  /// 语义化标签
  final String? semanticLabel;

  const AppTextWithIcon({
    super.key,
    required this.text,
    required this.icon,
    this.iconPosition = IconPosition.leading,
    this.variant = TextVariant.bodyMedium,
    this.spacing = DesignConstants.spacingS,
    this.textColor,
    this.iconColor,
    this.iconSize,
    this.maxLines,
    this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveIconSize = iconSize ?? _getDefaultIconSize();
    
    final iconWidget = Icon(
      icon,
      size: effectiveIconSize,
      color: iconColor ?? textColor ?? colorScheme.onSurfaceVariant,
    );
    
    final textWidget = Flexible(
      child: AppText(
        text: text,
        variant: variant,
        color: textColor,
        maxLines: maxLines,
        semanticLabel: semanticLabel,
      ),
    );
    
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: iconPosition == IconPosition.leading
          ? [iconWidget, SizedBox(width: spacing), textWidget]
          : [textWidget, SizedBox(width: spacing), iconWidget],
    );
  }

  /// 根据文本变体获取默认图标大小
  double _getDefaultIconSize() {
    switch (variant) {
      case TextVariant.displayLarge:
      case TextVariant.displayMedium:
      case TextVariant.displaySmall:
        return DesignConstants.iconSizeXL;
      case TextVariant.headlineLarge:
      case TextVariant.headlineMedium:
      case TextVariant.headlineSmall:
        return DesignConstants.iconSizeL;
      case TextVariant.titleLarge:
      case TextVariant.titleMedium:
      case TextVariant.titleSmall:
        return DesignConstants.iconSizeM;
      case TextVariant.bodyLarge:
      case TextVariant.bodyMedium:
      case TextVariant.labelLarge:
        return DesignConstants.iconSizeS;
      case TextVariant.bodySmall:
      case TextVariant.labelMedium:
      case TextVariant.labelSmall:
        return DesignConstants.iconSizeXS;
    }
  }
}

/// 图标位置枚举
enum IconPosition {
  leading,  // 图标在前
  trailing, // 图标在后
}