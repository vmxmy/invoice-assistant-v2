import 'package:flutter/material.dart';
import '../../../../domain/entities/invoice_entity.dart';
import '../../atoms/app_text.dart';
import '../../atoms/app_icon.dart';
import '../../../../presentation/widgets/invoice_status_badge.dart';

/// 发票卡片头部组件
///
/// 负责显示发票的主要信息：标题、副标题和状态徽章
/// 支持选择模式下的选择框显示
class InvoiceCardHeader extends StatelessWidget {
  /// 发票实体
  final InvoiceEntity invoice;

  /// 主标题文本（通常是销售方名称或发票号码）
  final String title;

  /// 副标题文本（通常是购买方名称或日期）
  final String? subtitle;

  /// 状态变更回调 - 已移除，发票状态必须通过报销集来修改
  // final ValueChanged<InvoiceStatus>? onStatusChanged;

  /// 是否只显示消费日期
  final bool showConsumptionDateOnly;

  /// 是否处于选择模式
  final bool isSelectionMode;

  /// 是否被选中
  final bool isSelected;

  /// 选择状态切换回调
  final VoidCallback? onSelectionToggle;

  /// 自定义trailing组件，覆盖默认的状态徽章
  final Widget? trailing;

  const InvoiceCardHeader({
    super.key,
    required this.invoice,
    required this.title,
    this.subtitle,
    // this.onStatusChanged, // 已移除
    this.showConsumptionDateOnly = false,
    this.isSelectionMode = false,
    this.isSelected = false,
    this.onSelectionToggle,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // 选择框（多选模式下显示）
        if (isSelectionMode) ...[
          _buildSelectionCheckbox(context),
          SizedBox(width: 12.0),
        ],

        // 主内容区域
        Expanded(
          child: _buildMainContent(context),
        ),
      ],
    );
  }

  /// 构建选择框
  Widget _buildSelectionCheckbox(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return GestureDetector(
      onTap: onSelectionToggle,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 24,
        height: 24,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(6),
          color: isSelected ? colorScheme.primary : colorScheme.surface,
          border: Border.all(
            color: isSelected
                ? colorScheme.primary
                : colorScheme.outline.withValues(alpha: 0.6),
            width: isSelected ? 0 : 2,
          ),
        ),
        child: isSelected
            ? Icon(
                Icons.check,
                size: 16,
                color: colorScheme.onPrimary,
              )
            : null,
      ),
    );
  }

  /// 构建主内容区域
  Widget _buildMainContent(BuildContext context) {
    return Row(
      children: [
        // 标题和副标题区域
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // 主标题
              AppText(
                text: title,
                variant: TextVariant.titleMedium,
                maxLines: 1,
                semanticLabel: '发票标题: $title',
              ),

              // 副标题（如果存在）
              if (subtitle != null && subtitle!.isNotEmpty) ...[
                SizedBox(height: 4.0),
                AppText(
                  text: subtitle!,
                  variant: TextVariant.bodySmall,
                  maxLines: 1,
                  semanticLabel: '发票副标题: $subtitle',
                ),
              ],
            ],
          ),
        ),

        SizedBox(width: 12.0),

        // 右侧内容（状态徽章或自定义组件）
        _buildTrailing(context),
      ],
    );
  }

  /// 构建右侧内容
  Widget _buildTrailing(BuildContext context) {
    if (trailing != null) {
      return trailing!;
    }

    // 使用只读状态徽章 - 发票状态不可独立修改
    return InvoiceStatusBadge(
      invoice: invoice,
      // 移除状态修改回调，改为只读显示
      // onStatusChanged: onStatusChanged,
      size: BadgeSize.medium,
      showConsumptionDateOnly: showConsumptionDateOnly,
    );
  }
}

/// 简化版本的发票卡片头部
///
/// 只显示标题和副标题，不包含状态徽章和选择框
class InvoiceCardHeaderSimple extends StatelessWidget {
  /// 主标题
  final String title;

  /// 副标题
  final String? subtitle;

  /// 主标题样式
  final TextVariant titleVariant;

  /// 副标题样式
  final TextVariant subtitleVariant;

  /// 自定义主标题颜色
  final Color? titleColor;

  /// 自定义副标题颜色
  final Color? subtitleColor;

  /// 右侧组件
  final Widget? trailing;

  const InvoiceCardHeaderSimple({
    super.key,
    required this.title,
    this.subtitle,
    this.titleVariant = TextVariant.titleMedium,
    this.subtitleVariant = TextVariant.bodySmall,
    this.titleColor,
    this.subtitleColor,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              AppText(
                text: title,
                variant: titleVariant,
                color: titleColor,
                maxLines: 1,
              ),
              if (subtitle != null && subtitle!.isNotEmpty) ...[
                SizedBox(height: 4.0),
                AppText(
                  text: subtitle!,
                  variant: subtitleVariant,
                  color: subtitleColor,
                  maxLines: 1,
                ),
              ],
            ],
          ),
        ),
        if (trailing != null) ...[
          SizedBox(width: 12.0),
          trailing!,
        ],
      ],
    );
  }
}

/// 带图标的发票卡片头部
///
/// 在标题前添加图标显示
class InvoiceCardHeaderWithIcon extends StatelessWidget {
  /// 标题前的图标
  final IconData icon;

  /// 主标题
  final String title;

  /// 副标题
  final String? subtitle;

  /// 图标颜色
  final Color? iconColor;

  /// 图标尺寸
  final IconSize iconSize;

  /// 右侧组件
  final Widget? trailing;

  const InvoiceCardHeaderWithIcon({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.iconColor,
    this.iconSize = IconSize.small,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        AppIcon(
          icon: icon,
          size: iconSize,
          color: iconColor,
        ),
        SizedBox(width: 12.0),
        Expanded(
          child: InvoiceCardHeaderSimple(
            title: title,
            subtitle: subtitle,
          ),
        ),
        if (trailing != null) ...[
          SizedBox(width: 12.0),
          trailing!,
        ],
      ],
    );
  }
}
