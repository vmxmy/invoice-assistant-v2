import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../../theme/design_constants.dart';
import '../../atoms/app_text.dart';
import '../../atoms/app_icon.dart';
import '../../atoms/app_button.dart';

/// 操作项数据类
class ActionItem {
  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final Color? color;
  final String? tooltip;
  final bool isDestructive;
  final bool isLoading;

  const ActionItem({
    required this.icon,
    required this.label,
    this.onPressed,
    this.color,
    this.tooltip,
    this.isDestructive = false,
    this.isLoading = false,
  });
}

/// 发票卡片操作组件
/// 
/// 负责显示卡片底部的操作按钮和时间信息
class InvoiceCardActions extends StatelessWidget {
  /// 相对时间文本（如"2小时前"）
  final String timeText;
  
  /// 操作项列表
  final List<ActionItem> actions;
  
  /// 操作项显示方式
  final ActionDisplayMode displayMode;
  
  /// 是否显示时间信息
  final bool showTime;
  
  /// 自定义时间样式
  final TextStyle? timeStyle;
  
  /// 操作项之间的间距
  final double actionSpacing;
  
  /// 最大操作项数量（超出时显示更多按钮）
  final int maxVisibleActions;

  const InvoiceCardActions({
    super.key,
    required this.timeText,
    this.actions = const [],
    this.displayMode = ActionDisplayMode.iconsOnly,
    this.showTime = true,
    this.timeStyle,
    this.actionSpacing = DesignConstants.spacingS,
    this.maxVisibleActions = 3,
  });

  @override
  Widget build(BuildContext context) {
    if (!showTime && actions.isEmpty) {
      return const SizedBox.shrink();
    }
    
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // 左侧：时间信息
        if (showTime) _buildTimeInfo(context),
        
        // 右侧：操作按钮
        if (actions.isNotEmpty) _buildActions(context),
      ],
    );
  }

  /// 构建时间信息
  Widget _buildTimeInfo(BuildContext context) {
    return AppText(
      text: timeText,
      variant: TextVariant.bodySmall,
      color: Theme.of(context).colorScheme.onSurfaceVariant,
      semanticLabel: '创建时间: $timeText',
    );
  }

  /// 构建操作按钮区域
  Widget _buildActions(BuildContext context) {
    final visibleActions = actions.take(maxVisibleActions).toList();
    final hasMoreActions = actions.length > maxVisibleActions;
    
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // 显示的操作项
        ...visibleActions.map((action) => _buildActionItem(context, action)),
        
        // 更多操作按钮
        if (hasMoreActions) ...[
          SizedBox(width: actionSpacing),
          _buildMoreActionsButton(context),
        ],
      ],
    );
  }

  /// 构建单个操作项
  Widget _buildActionItem(BuildContext context, ActionItem action) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveColor = action.isDestructive
        ? colorScheme.error
        : (action.color ?? colorScheme.onSurfaceVariant);
    
    Widget actionWidget;
    
    switch (displayMode) {
      case ActionDisplayMode.iconsOnly:
        actionWidget = _buildIconAction(context, action, effectiveColor);
        break;
      case ActionDisplayMode.labelsOnly:
        actionWidget = _buildLabelAction(context, action, effectiveColor);
        break;
      case ActionDisplayMode.iconsWithLabels:
        actionWidget = _buildIconWithLabelAction(context, action, effectiveColor);
        break;
      case ActionDisplayMode.buttons:
        actionWidget = _buildButtonAction(context, action);
        break;
    }
    
    // 添加Tooltip（如果有）
    if (action.tooltip != null) {
      actionWidget = Tooltip(
        message: action.tooltip!,
        child: actionWidget,
      );
    }
    
    // 添加间距
    return Padding(
      padding: EdgeInsets.only(right: actionSpacing),
      child: actionWidget,
    );
  }

  /// 构建纯图标操作
  Widget _buildIconAction(BuildContext context, ActionItem action, Color color) {
    return InkWell(
      onTap: action.onPressed,
      borderRadius: BorderRadius.circular(DesignConstants.radiusSmall),
      child: Padding(
        padding: const EdgeInsets.all(DesignConstants.spacingXS),
        child: action.isLoading
            ? SizedBox(
                width: DesignConstants.iconSizeS,
                height: DesignConstants.iconSizeS,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(color),
                ),
              )
            : AppIcon(
                icon: action.icon,
                size: IconSize.small,
                color: color,
                semanticLabel: action.label,
              ),
      ),
    );
  }

  /// 构建纯标签操作
  Widget _buildLabelAction(BuildContext context, ActionItem action, Color color) {
    return InkWell(
      onTap: action.onPressed,
      borderRadius: BorderRadius.circular(DesignConstants.radiusSmall),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: DesignConstants.spacingS,
          vertical: DesignConstants.spacingXS,
        ),
        child: AppText(
          text: action.label,
          variant: TextVariant.bodySmall,
          color: color,
        ),
      ),
    );
  }

  /// 构建图标+标签操作
  Widget _buildIconWithLabelAction(BuildContext context, ActionItem action, Color color) {
    return InkWell(
      onTap: action.onPressed,
      borderRadius: BorderRadius.circular(DesignConstants.radiusSmall),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: DesignConstants.spacingS,
          vertical: DesignConstants.spacingXS,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            action.isLoading
                ? SizedBox(
                    width: DesignConstants.iconSizeXS,
                    height: DesignConstants.iconSizeXS,
                    child: CircularProgressIndicator(
                      strokeWidth: 1.5,
                      valueColor: AlwaysStoppedAnimation(color),
                    ),
                  )
                : AppIcon(
                    icon: action.icon,
                    size: IconSize.extraSmall,
                    color: color,
                  ),
            SizedBox(width: DesignConstants.spacingXS),
            AppText(
              text: action.label,
              variant: TextVariant.bodySmall,
              color: color,
            ),
          ],
        ),
      ),
    );
  }

  /// 构建按钮操作
  Widget _buildButtonAction(BuildContext context, ActionItem action) {
    return AppButton(
      text: action.label,
      icon: action.icon,
      onPressed: action.onPressed,
      variant: action.isDestructive ? ButtonVariant.error : ButtonVariant.outline,
      size: ButtonSize.small,
      loading: action.isLoading,
    );
  }

  /// 构建更多操作按钮
  Widget _buildMoreActionsButton(BuildContext context) {
    return InkWell(
      onTap: () => _showMoreActionsMenu(context),
      borderRadius: BorderRadius.circular(DesignConstants.radiusSmall),
      child: Padding(
        padding: const EdgeInsets.all(DesignConstants.spacingXS),
        child: AppIcon(
          icon: CupertinoIcons.ellipsis,
          size: IconSize.small,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
          semanticLabel: '更多操作',
        ),
      ),
    );
  }

  /// 显示更多操作菜单
  void _showMoreActionsMenu(BuildContext context) {
    final hiddenActions = actions.skip(maxVisibleActions).toList();
    
    showModalBottomSheet(
      context: context,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(DesignConstants.radiusLarge),
        ),
      ),
      builder: (context) => _MoreActionsBottomSheet(actions: hiddenActions),
    );
  }
}

/// 更多操作底部菜单
class _MoreActionsBottomSheet extends StatelessWidget {
  final List<ActionItem> actions;

  const _MoreActionsBottomSheet({required this.actions});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        vertical: DesignConstants.spacingL,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 标题
          AppText(
            text: '更多操作',
            variant: TextVariant.titleMedium,
          ),
          
          SizedBox(height: DesignConstants.spacingL),
          
          // 操作项列表
          ...actions.map((action) => _buildBottomSheetAction(context, action)),
        ],
      ),
    );
  }

  Widget _buildBottomSheetAction(BuildContext context, ActionItem action) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveColor = action.isDestructive
        ? colorScheme.error
        : colorScheme.onSurface;
    
    return InkWell(
      onTap: () {
        Navigator.of(context).pop();
        action.onPressed?.call();
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(
          horizontal: DesignConstants.spacingL,
          vertical: DesignConstants.spacingM,
        ),
        child: Row(
          children: [
            AppIcon(
              icon: action.icon,
              size: IconSize.medium,
              color: effectiveColor,
            ),
            SizedBox(width: DesignConstants.spacingL),
            AppText(
              text: action.label,
              variant: TextVariant.bodyLarge,
              color: effectiveColor,
            ),
          ],
        ),
      ),
    );
  }
}

/// 简化版本的发票卡片操作
/// 
/// 只显示时间信息，不显示操作按钮
class InvoiceCardActionsSimple extends StatelessWidget {
  /// 相对时间文本
  final String timeText;
  
  /// 自定义时间样式
  final TextStyle? timeStyle;

  const InvoiceCardActionsSimple({
    super.key,
    required this.timeText,
    this.timeStyle,
  });

  @override
  Widget build(BuildContext context) {
    return InvoiceCardActions(
      timeText: timeText,
      actions: const [],
      showTime: true,
      timeStyle: timeStyle,
    );
  }
}

/// 带快速操作的发票卡片操作
/// 
/// 预定义了常用的发票操作
class InvoiceCardActionsQuick extends StatelessWidget {
  /// 相对时间文本
  final String timeText;
  
  /// 分享操作回调
  final VoidCallback? onShare;
  
  /// 查看操作回调
  final VoidCallback? onView;
  
  /// 编辑操作回调
  final VoidCallback? onEdit;
  
  /// 删除操作回调
  final VoidCallback? onDelete;
  
  /// 是否显示删除操作
  final bool showDelete;
  
  /// 是否显示编辑操作
  final bool showEdit;

  const InvoiceCardActionsQuick({
    super.key,
    required this.timeText,
    this.onShare,
    this.onView,
    this.onEdit,
    this.onDelete,
    this.showDelete = false,
    this.showEdit = false,
  });

  @override
  Widget build(BuildContext context) {
    final actions = <ActionItem>[
      if (onShare != null)
        ActionItem(
          icon: CupertinoIcons.share,
          label: '分享',
          onPressed: onShare,
          tooltip: '分享发票',
        ),
      if (onView != null)
        ActionItem(
          icon: CupertinoIcons.eye,
          label: '查看',
          onPressed: onView,
          tooltip: '查看发票详情',
        ),
      if (showEdit && onEdit != null)
        ActionItem(
          icon: CupertinoIcons.pencil,
          label: '编辑',
          onPressed: onEdit,
          tooltip: '编辑发票信息',
        ),
      if (showDelete && onDelete != null)
        ActionItem(
          icon: CupertinoIcons.delete,
          label: '删除',
          onPressed: onDelete,
          tooltip: '删除发票',
          isDestructive: true,
        ),
    ];
    
    return InvoiceCardActions(
      timeText: timeText,
      actions: actions,
      displayMode: ActionDisplayMode.iconsOnly,
    );
  }
}

/// 操作显示模式枚举
enum ActionDisplayMode {
  iconsOnly,        // 仅显示图标
  labelsOnly,       // 仅显示标签
  iconsWithLabels,  // 显示图标和标签
  buttons,          // 显示为按钮
}