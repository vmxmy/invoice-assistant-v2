import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import '../../../theme/component_theme_constants.dart';
import '../../atoms/app_icon.dart';
import '../../atoms/app_text.dart';

/// 滑动操作数据类
class SlideAction {
  final IconData icon;
  final String label;
  final Color backgroundColor;
  final Color foregroundColor;
  final VoidCallback onPressed;
  final String? tooltip;
  final bool isDestructive;
  final double flex;

  const SlideAction({
    required this.icon,
    required this.label,
    required this.backgroundColor,
    required this.foregroundColor,
    required this.onPressed,
    this.tooltip,
    this.isDestructive = false,
    this.flex = 1.0,
  });
}

/// 发票卡片滑动操作组件
/// 
/// 负责处理左滑和右滑的操作功能
class InvoiceCardSlidable extends StatefulWidget {
  /// 子组件
  final Widget child;
  
  /// 左滑操作列表
  final List<SlideAction> startActions;
  
  /// 右滑操作列表
  final List<SlideAction> endActions;
  
  /// 是否启用滑动
  final bool enabled;
  
  /// 滑动范围比例
  final double extentRatio;
  
  /// 滑动动画
  final Widget motion;
  
  /// 滑动阈值 (已废弃，保留以兼容旧API)
  @Deprecated('dismissalThreshold is no longer supported in flutter_slidable 3.x')
  final double dismissalThreshold;
  
  /// 是否在滑动时关闭其他滑动项
  final bool closeOnScroll;
  
  /// 滑动键，用于控制滑动状态
  final Key? slidableKey;

  const InvoiceCardSlidable({
    super.key,
    required this.child,
    this.startActions = const [],
    this.endActions = const [],
    this.enabled = true,
    this.extentRatio = 0.25,
    this.motion = const StretchMotion(),
    this.dismissalThreshold = 0.4,
    this.closeOnScroll = true,
    this.slidableKey,
  });

  @override
  State<InvoiceCardSlidable> createState() => _InvoiceCardSlidableState();
}

class _InvoiceCardSlidableState extends State<InvoiceCardSlidable> {
  @override
  Widget build(BuildContext context) {
    // 如果没有操作或禁用，直接返回子组件
    if (!widget.enabled || 
        (widget.startActions.isEmpty && widget.endActions.isEmpty)) {
      return widget.child;
    }
    
    return Slidable(
      key: widget.slidableKey,
      enabled: widget.enabled,
      closeOnScroll: widget.closeOnScroll,
      
      // 左滑操作面板
      startActionPane: widget.startActions.isNotEmpty
          ? ActionPane(
              motion: widget.motion,
              extentRatio: widget.extentRatio,
              children: widget.startActions.map(_buildSlidableAction).toList(),
            )
          : null,
      
      // 右滑操作面板
      endActionPane: widget.endActions.isNotEmpty
          ? ActionPane(
              motion: widget.motion,
              extentRatio: widget.extentRatio,
              children: widget.endActions.map(_buildSlidableAction).toList(),
            )
          : null,
      
      child: widget.child,
    );
  }

  /// 构建滑动操作项
  Widget _buildSlidableAction(SlideAction action) {
    return SlidableAction(
      onPressed: (context) => action.onPressed(),
      backgroundColor: action.backgroundColor,
      foregroundColor: action.foregroundColor,
      icon: action.icon,
      label: action.label,
      flex: (action.flex * 100).toInt(),
    );
  }
}

/// 自定义滑动操作项组件
/// 
/// 提供更多自定义选项的滑动操作
class CustomSlidableAction extends StatelessWidget {
  /// 操作数据
  final SlideAction action;
  
  /// 是否是左侧操作（影响圆角方向）
  final bool isStart;
  
  /// 是否是最后一个操作项
  final bool isLast;
  
  /// 自定义内容构建器
  final Widget Function(BuildContext, SlideAction)? contentBuilder;

  const CustomSlidableAction({
    super.key,
    required this.action,
    this.isStart = false,
    this.isLast = false,
    this.contentBuilder,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      flex: (action.flex * 100).toInt(),
      child: Container(
        margin: const EdgeInsets.only(bottom: ComponentThemeConstants.spacingM),
        child: Material(
          color: action.backgroundColor,
          elevation: 2,
          borderRadius: _getBorderRadius(),
          child: InkWell(
            onTap: action.onPressed,
            borderRadius: _getBorderRadius(),
            child: contentBuilder?.call(context, action) ?? _buildDefaultContent(),
          ),
        ),
      ),
    );
  }

  /// 获取圆角配置
  BorderRadius _getBorderRadius() {
    if (isStart) {
      return const BorderRadius.only(
        topLeft: Radius.circular(ComponentThemeConstants.radiusMedium),
        bottomLeft: Radius.circular(ComponentThemeConstants.radiusMedium),
      );
    } else {
      return const BorderRadius.only(
        topRight: Radius.circular(ComponentThemeConstants.radiusMedium),
        bottomRight: Radius.circular(ComponentThemeConstants.radiusMedium),
      );
    }
  }

  /// 构建默认内容
  Widget _buildDefaultContent() {
    return Container(
      padding: const EdgeInsets.all(ComponentThemeConstants.spacingL),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AppIcon(
            icon: action.icon,
            size: IconSize.medium,
            color: action.foregroundColor,
            semanticLabel: action.label,
          ),
          SizedBox(height: ComponentThemeConstants.spacingXS),
          AppText(
            text: action.label,
            variant: TextVariant.bodySmall,
            color: action.foregroundColor,
            fontWeight: FontWeight.w500,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

/// 发票滑动操作预设
/// 
/// 提供常用的发票操作预设
class InvoiceSlideActions {
  InvoiceSlideActions._();

  /// 创建分享操作
  static SlideAction share({
    required VoidCallback onPressed,
    Color? backgroundColor,
    Color? foregroundColor,
  }) {
    return SlideAction(
      icon: CupertinoIcons.share,
      label: '分享',
      backgroundColor: backgroundColor ?? const Color(0xFF2196F3),
      foregroundColor: foregroundColor ?? Colors.white,
      onPressed: onPressed,
      tooltip: '分享发票',
    );
  }

  /// 创建删除操作
  static SlideAction delete({
    required VoidCallback onPressed,
    Color? backgroundColor,
    Color? foregroundColor,
  }) {
    return SlideAction(
      icon: CupertinoIcons.delete,
      label: '删除',
      backgroundColor: backgroundColor ?? const Color(0xFFF44336),
      foregroundColor: foregroundColor ?? Colors.white,
      onPressed: onPressed,
      tooltip: '删除发票',
      isDestructive: true,
    );
  }

  /// 创建编辑操作
  static SlideAction edit({
    required VoidCallback onPressed,
    Color? backgroundColor,
    Color? foregroundColor,
  }) {
    return SlideAction(
      icon: CupertinoIcons.pencil,
      label: '编辑',
      backgroundColor: backgroundColor ?? const Color(0xFF4CAF50),
      foregroundColor: foregroundColor ?? Colors.white,
      onPressed: onPressed,
      tooltip: '编辑发票',
    );
  }

  /// 创建查看操作
  static SlideAction view({
    required VoidCallback onPressed,
    Color? backgroundColor,
    Color? foregroundColor,
  }) {
    return SlideAction(
      icon: CupertinoIcons.eye,
      label: '查看',
      backgroundColor: backgroundColor ?? const Color(0xFF9C27B0),
      foregroundColor: foregroundColor ?? Colors.white,
      onPressed: onPressed,
      tooltip: '查看发票详情',
    );
  }

  /// 创建收藏操作
  static SlideAction favorite({
    required VoidCallback onPressed,
    required bool isFavorited,
    Color? backgroundColor,
    Color? foregroundColor,
  }) {
    return SlideAction(
      icon: isFavorited ? CupertinoIcons.heart_fill : CupertinoIcons.heart,
      label: isFavorited ? '取消收藏' : '收藏',
      backgroundColor: backgroundColor ?? const Color(0xFFE91E63),
      foregroundColor: foregroundColor ?? Colors.white,
      onPressed: onPressed,
      tooltip: isFavorited ? '取消收藏' : '添加到收藏',
    );
  }

  /// 创建归档操作
  static SlideAction archive({
    required VoidCallback onPressed,
    Color? backgroundColor,
    Color? foregroundColor,
  }) {
    return SlideAction(
      icon: CupertinoIcons.archivebox,
      label: '归档',
      backgroundColor: backgroundColor ?? const Color(0xFF607D8B),
      foregroundColor: foregroundColor ?? Colors.white,
      onPressed: onPressed,
      tooltip: '归档发票',
    );
  }

  /// 创建打印操作
  static SlideAction print({
    required VoidCallback onPressed,
    Color? backgroundColor,
    Color? foregroundColor,
  }) {
    return SlideAction(
      icon: CupertinoIcons.printer,
      label: '打印',
      backgroundColor: backgroundColor ?? const Color(0xFF795548),
      foregroundColor: foregroundColor ?? Colors.white,
      onPressed: onPressed,
      tooltip: '打印发票',
    );
  }
}

/// 滑动操作构建器
/// 
/// 用于创建复杂的滑动操作组合
class SlidableActionsBuilder {
  final List<SlideAction> _actions = [];

  /// 添加操作
  SlidableActionsBuilder add(SlideAction action) {
    _actions.add(action);
    return this;
  }

  /// 添加分享操作
  SlidableActionsBuilder addShare({required VoidCallback onPressed}) {
    return add(InvoiceSlideActions.share(onPressed: onPressed));
  }

  /// 添加删除操作
  SlidableActionsBuilder addDelete({required VoidCallback onPressed}) {
    return add(InvoiceSlideActions.delete(onPressed: onPressed));
  }

  /// 添加编辑操作
  SlidableActionsBuilder addEdit({required VoidCallback onPressed}) {
    return add(InvoiceSlideActions.edit(onPressed: onPressed));
  }

  /// 添加查看操作
  SlidableActionsBuilder addView({required VoidCallback onPressed}) {
    return add(InvoiceSlideActions.view(onPressed: onPressed));
  }

  /// 添加收藏操作
  SlidableActionsBuilder addFavorite({
    required VoidCallback onPressed,
    required bool isFavorited,
  }) {
    return add(InvoiceSlideActions.favorite(
      onPressed: onPressed,
      isFavorited: isFavorited,
    ));
  }

  /// 构建操作列表
  List<SlideAction> build() {
    return List.unmodifiable(_actions);
  }

  /// 清空操作列表
  void clear() {
    _actions.clear();
  }
}

/// 滑动操作控制器
/// 
/// 用于程序化控制滑动状态
class SlidableController extends ChangeNotifier {
  final GlobalKey<State<Slidable>> _key = GlobalKey<State<Slidable>>();
  
  /// 获取滑动组件的Key
  GlobalKey<State<Slidable>> get key => _key;

  /// 关闭滑动
  void close() {
    final state = _key.currentState;
    if (state != null && state.mounted) {
      Slidable.of(_key.currentContext!)?.close();
    }
  }

  /// 打开到起始位置（左滑）
  void openStartActionPane() {
    final state = _key.currentState;
    if (state != null && state.mounted) {
      Slidable.of(_key.currentContext!)?.openStartActionPane();
    }
  }

  /// 打开到结束位置（右滑）
  void openEndActionPane() {
    final state = _key.currentState;
    if (state != null && state.mounted) {
      Slidable.of(_key.currentContext!)?.openEndActionPane();
    }
  }

  /// 获取当前滑动比例
  double get ratio {
    final state = _key.currentState;
    if (state != null && state.mounted) {
      final context = _key.currentContext;
      if (context != null) {
        final slidableState = Slidable.of(context);
        if (slidableState != null) {
          // 简化实现，直接返回比例
          return slidableState.ratio;
        }
      }
    }
    return 0.0;
  }

  /// 是否处于打开状态
  bool get isOpen {
    final state = _key.currentState;
    if (state != null && state.mounted) {
      final context = _key.currentContext;
      if (context != null) {
        final slidableState = Slidable.of(context);
        return slidableState != null;
      }
    }
    return false;
  }
}