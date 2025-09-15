import 'package:flutter/material.dart';

/// 分割线类型枚举
enum DividerType {
  horizontal, // 水平分割线
  vertical, // 垂直分割线
}

/// 分割线样式枚举
enum DividerStyle {
  solid, // 实线
  dotted, // 点线
  dashed, // 虚线
}

/// 统一的应用分割线组件
///
/// 提供一致的分割线样式和间距
///
/// 示例用法:
/// ```dart
/// AppDivider(
///   type: DividerType.horizontal,
///   style: DividerStyle.solid,
///   indent: 16.0,
/// )
/// ```
class AppDivider extends StatelessWidget {
  /// 分割线类型
  final DividerType type;

  /// 分割线样式
  final DividerStyle style;

  /// 分割线颜色，为null时使用主题默认颜色
  final Color? color;

  /// 分割线厚度
  final double thickness;

  /// 起始缩进
  final double indent;

  /// 结束缩进
  final double endIndent;

  /// 分割线高度（仅用于水平分割线）
  final double? height;

  /// 分割线宽度（仅用于垂直分割线）
  final double? width;

  const AppDivider({
    super.key,
    this.type = DividerType.horizontal,
    this.style = DividerStyle.solid,
    this.color,
    this.thickness = 1.0,
    this.indent = 0.0,
    this.endIndent = 0.0,
    this.height,
    this.width,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveColor = color ?? colorScheme.outline.withValues(alpha: 0.12);

    switch (style) {
      case DividerStyle.solid:
        return _buildSolidDivider(effectiveColor);
      case DividerStyle.dotted:
        return _buildDottedDivider(effectiveColor);
      case DividerStyle.dashed:
        return _buildDashedDivider(effectiveColor);
    }
  }

  /// 构建实线分割线
  Widget _buildSolidDivider(Color effectiveColor) {
    if (type == DividerType.horizontal) {
      return Container(
        height: height ?? thickness,
        margin: EdgeInsets.only(
          left: indent,
          right: endIndent,
        ),
        color: effectiveColor,
      );
    } else {
      return Container(
        width: width ?? thickness,
        margin: EdgeInsets.only(
          top: indent,
          bottom: endIndent,
        ),
        color: effectiveColor,
      );
    }
  }

  /// 构建点线分割线
  Widget _buildDottedDivider(Color effectiveColor) {
    return CustomPaint(
      size: type == DividerType.horizontal
          ? Size(double.infinity, height ?? thickness)
          : Size(width ?? thickness, double.infinity),
      painter: _DottedLinePainter(
        color: effectiveColor,
        thickness: thickness,
        type: type,
        indent: indent,
        endIndent: endIndent,
      ),
    );
  }

  /// 构建虚线分割线
  Widget _buildDashedDivider(Color effectiveColor) {
    return CustomPaint(
      size: type == DividerType.horizontal
          ? Size(double.infinity, height ?? thickness)
          : Size(width ?? thickness, double.infinity),
      painter: _DashedLinePainter(
        color: effectiveColor,
        thickness: thickness,
        type: type,
        indent: indent,
        endIndent: endIndent,
      ),
    );
  }
}

/// 带标签的分割线
///
/// 在分割线中间显示文本标签
class AppDividerWithLabel extends StatelessWidget {
  /// 标签文本
  final String label;

  /// 标签样式
  final TextStyle? labelStyle;

  /// 分割线颜色
  final Color? color;

  /// 分割线厚度
  final double thickness;

  /// 标签与分割线之间的间距
  final double spacing;

  /// 标签背景颜色，为null时使用透明背景
  final Color? labelBackgroundColor;

  /// 标签内边距
  final EdgeInsets labelPadding;

  const AppDividerWithLabel({
    super.key,
    required this.label,
    this.labelStyle,
    this.color,
    this.thickness = 1.0,
    this.spacing = 12.0,
    this.labelBackgroundColor,
    this.labelPadding = const EdgeInsets.symmetric(
      horizontal: 12.0,
    ),
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final effectiveColor = color ?? colorScheme.outline.withValues(alpha: 0.12);
    final effectiveLabelStyle = labelStyle ??
        textTheme.labelMedium?.copyWith(
          color: colorScheme.onSurfaceVariant,
        );

    return Row(
      children: [
        Expanded(
          child: AppDivider(
            type: DividerType.horizontal,
            color: effectiveColor,
            thickness: thickness,
          ),
        ),
        SizedBox(width: spacing),
        Container(
          padding: labelPadding,
          decoration: labelBackgroundColor != null
              ? BoxDecoration(
                  color: labelBackgroundColor,
                  borderRadius: BorderRadius.circular(
                    8.0,
                  ),
                )
              : null,
          child: Text(
            label,
            style: effectiveLabelStyle,
          ),
        ),
        SizedBox(width: spacing),
        Expanded(
          child: AppDivider(
            type: DividerType.horizontal,
            color: effectiveColor,
            thickness: thickness,
          ),
        ),
      ],
    );
  }
}

/// 带图标的分割线
///
/// 在分割线中间显示图标
class AppDividerWithIcon extends StatelessWidget {
  /// 图标数据
  final IconData icon;

  /// 图标颜色
  final Color? iconColor;

  /// 图标大小
  final double iconSize;

  /// 分割线颜色
  final Color? color;

  /// 分割线厚度
  final double thickness;

  /// 图标与分割线之间的间距
  final double spacing;

  /// 图标背景颜色，为null时使用透明背景
  final Color? iconBackgroundColor;

  /// 图标背景大小
  final double? iconBackgroundSize;

  const AppDividerWithIcon({
    super.key,
    required this.icon,
    this.iconColor,
    this.iconSize = 16.0,
    this.color,
    this.thickness = 1.0,
    this.spacing = 12.0,
    this.iconBackgroundColor,
    this.iconBackgroundSize,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveColor = color ?? colorScheme.outline.withValues(alpha: 0.12);
    final effectiveIconColor = iconColor ?? colorScheme.onSurfaceVariant;

    Widget iconWidget = Icon(
      icon,
      color: effectiveIconColor,
      size: iconSize,
    );

    if (iconBackgroundColor != null) {
      final backgroundSize = iconBackgroundSize ?? (iconSize + 12.0);
      iconWidget = Container(
        width: backgroundSize,
        height: backgroundSize,
        decoration: BoxDecoration(
          color: iconBackgroundColor,
          shape: BoxShape.circle,
        ),
        child: Center(child: iconWidget),
      );
    }

    return Row(
      children: [
        Expanded(
          child: AppDivider(
            type: DividerType.horizontal,
            color: effectiveColor,
            thickness: thickness,
          ),
        ),
        SizedBox(width: spacing),
        iconWidget,
        SizedBox(width: spacing),
        Expanded(
          child: AppDivider(
            type: DividerType.horizontal,
            color: effectiveColor,
            thickness: thickness,
          ),
        ),
      ],
    );
  }
}

/// 点线绘制器
class _DottedLinePainter extends CustomPainter {
  final Color color;
  final double thickness;
  final DividerType type;
  final double indent;
  final double endIndent;

  _DottedLinePainter({
    required this.color,
    required this.thickness,
    required this.type,
    required this.indent,
    required this.endIndent,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = thickness
      ..strokeCap = StrokeCap.round;

    const dotSpacing = 4.0;
    final dotSize = thickness;

    if (type == DividerType.horizontal) {
      final y = size.height / 2;
      final startX = indent;
      final endX = size.width - endIndent;

      for (double x = startX; x < endX; x += dotSize + dotSpacing) {
        canvas.drawCircle(Offset(x, y), dotSize / 2, paint);
      }
    } else {
      final x = size.width / 2;
      final startY = indent;
      final endY = size.height - endIndent;

      for (double y = startY; y < endY; y += dotSize + dotSpacing) {
        canvas.drawCircle(Offset(x, y), dotSize / 2, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return oldDelegate != this;
  }
}

/// 虚线绘制器
class _DashedLinePainter extends CustomPainter {
  final Color color;
  final double thickness;
  final DividerType type;
  final double indent;
  final double endIndent;

  _DashedLinePainter({
    required this.color,
    required this.thickness,
    required this.type,
    required this.indent,
    required this.endIndent,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = thickness
      ..strokeCap = StrokeCap.square;

    const dashLength = 5.0;
    const dashSpacing = 3.0;

    if (type == DividerType.horizontal) {
      final y = size.height / 2;
      final startX = indent;
      final endX = size.width - endIndent;

      for (double x = startX; x < endX; x += dashLength + dashSpacing) {
        final endDashX = (x + dashLength).clamp(startX, endX);
        canvas.drawLine(Offset(x, y), Offset(endDashX, y), paint);
      }
    } else {
      final x = size.width / 2;
      final startY = indent;
      final endY = size.height - endIndent;

      for (double y = startY; y < endY; y += dashLength + dashSpacing) {
        final endDashY = (y + dashLength).clamp(startY, endY);
        canvas.drawLine(Offset(x, y), Offset(x, endDashY), paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return oldDelegate != this;
  }
}
