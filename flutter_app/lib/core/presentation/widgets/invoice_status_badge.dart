import 'package:flutter/cupertino.dart';
import '../../domain/value_objects/invoice_status.dart';

/// 徽章尺寸
enum BadgeSize {
  small,
  medium,
  large,
}

/// 交互式发票状态徽章
class InteractiveInvoiceStatusBadge extends StatelessWidget {
  final InvoiceStatus status;
  final BadgeSize size;
  final VoidCallback? onTap;

  const InteractiveInvoiceStatusBadge({
    super.key,
    required this.status,
    this.size = BadgeSize.medium,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // 根据尺寸确定样式
    final double fontSize;
    final EdgeInsets padding;
    final double borderRadius;

    switch (size) {
      case BadgeSize.small:
        fontSize = 10;
        padding = const EdgeInsets.symmetric(horizontal: 6, vertical: 2);
        borderRadius = 8;
        break;
      case BadgeSize.medium:
        fontSize = 12;
        padding = const EdgeInsets.symmetric(horizontal: 8, vertical: 4);
        borderRadius = 12;
        break;
      case BadgeSize.large:
        fontSize = 14;
        padding = const EdgeInsets.symmetric(horizontal: 12, vertical: 6);
        borderRadius = 16;
        break;
    }

    // 解析颜色
    final colorString = status.color;
    final color =
        Color(int.parse(colorString.substring(1), radix: 16) + 0xFF000000);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: padding,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(borderRadius),
          border: Border.all(color: color, width: 1),
        ),
        child: Text(
          status.displayName,
          style: TextStyle(
            color: color,
            fontSize: fontSize,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
