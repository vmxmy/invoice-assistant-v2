import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../../theme/component_theme_constants.dart';

/// 选择框样式枚举
enum SelectionStyle {
  checkbox,     // 复选框样式
  circle,       // 圆形样式
  rounded,      // 圆角方形样式
  material,     // Material Design样式
}

/// 发票卡片选择组件
/// 
/// 负责处理多选模式下的选择框显示和交互
class InvoiceCardSelection extends StatefulWidget {
  /// 是否被选中
  final bool isSelected;
  
  /// 选择状态变更回调
  final ValueChanged<bool>? onSelectionChanged;
  
  /// 选择框样式
  final SelectionStyle style;
  
  /// 自定义选中颜色
  final Color? selectedColor;
  
  /// 自定义未选中颜色
  final Color? unselectedColor;
  
  /// 选择框大小
  final double size;
  
  /// 动画时长
  final Duration animationDuration;
  
  /// 是否启用动画
  final bool enableAnimation;
  
  /// 语义化标签
  final String? semanticLabel;
  
  /// 是否启用点击效果
  final bool enableTapEffect;

  const InvoiceCardSelection({
    super.key,
    required this.isSelected,
    this.onSelectionChanged,
    this.style = SelectionStyle.rounded,
    this.selectedColor,
    this.unselectedColor,
    this.size = 24.0,
    this.animationDuration = ComponentThemeConstants.animationFast,
    this.enableAnimation = true,
    this.semanticLabel,
    this.enableTapEffect = true,
  });

  @override
  State<InvoiceCardSelection> createState() => _InvoiceCardSelectionState();
}

class _InvoiceCardSelectionState extends State<InvoiceCardSelection>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _initializeAnimations() {
    _animationController = AnimationController(
      duration: widget.animationDuration,
      vsync: this,
    );

    _scaleAnimation = Tween<double>(
      begin: 0.8,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.elasticOut,
    ));

    _opacityAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));

    if (widget.isSelected) {
      _animationController.value = 1.0;
    }
  }

  @override
  void didUpdateWidget(InvoiceCardSelection oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    if (widget.isSelected != oldWidget.isSelected && widget.enableAnimation) {
      if (widget.isSelected) {
        _animationController.forward();
      } else {
        _animationController.reverse();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    Widget selectionWidget = _buildSelectionWidget(context, colorScheme);
    
    if (widget.enableAnimation) {
      selectionWidget = AnimatedBuilder(
        animation: _animationController,
        builder: (context, child) {
          return Transform.scale(
            scale: widget.isSelected ? _scaleAnimation.value : 1.0,
            child: Opacity(
              opacity: widget.isSelected ? 1.0 : _opacityAnimation.value + 0.3,
              child: child,
            ),
          );
        },
        child: selectionWidget,
      );
    }
    
    return Semantics(
      label: widget.semanticLabel ?? (widget.isSelected ? '已选中' : '未选中'),
      button: true,
      selected: widget.isSelected,
      onTap: () => _handleTap(),
      child: GestureDetector(
        onTap: () => _handleTap(),
        child: widget.enableTapEffect
            ? _buildWithTapEffect(selectionWidget)
            : selectionWidget,
      ),
    );
  }

  /// 构建选择组件
  Widget _buildSelectionWidget(BuildContext context, ColorScheme colorScheme) {
    switch (widget.style) {
      case SelectionStyle.checkbox:
        return _buildCheckboxStyle(colorScheme);
      case SelectionStyle.circle:
        return _buildCircleStyle(colorScheme);
      case SelectionStyle.rounded:
        return _buildRoundedStyle(colorScheme);
      case SelectionStyle.material:
        return _buildMaterialStyle(colorScheme);
    }
  }

  /// 构建复选框样式
  Widget _buildCheckboxStyle(ColorScheme colorScheme) {
    return Container(
      width: widget.size,
      height: widget.size,
      decoration: BoxDecoration(
        color: widget.isSelected 
            ? (widget.selectedColor ?? colorScheme.primary)
            : Colors.transparent,
        border: Border.all(
          color: widget.isSelected
              ? (widget.selectedColor ?? colorScheme.primary)
              : (widget.unselectedColor ?? colorScheme.outline),
          width: 2.0,
        ),
        borderRadius: BorderRadius.circular(4.0),
      ),
      child: widget.isSelected
          ? Icon(
              Icons.check,
              size: widget.size * 0.7,
              color: colorScheme.onPrimary,
            )
          : null,
    );
  }

  /// 构建圆形样式
  Widget _buildCircleStyle(ColorScheme colorScheme) {
    return Container(
      width: widget.size,
      height: widget.size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: widget.isSelected 
            ? (widget.selectedColor ?? colorScheme.primary)
            : Colors.transparent,
        border: Border.all(
          color: widget.isSelected
              ? (widget.selectedColor ?? colorScheme.primary)
              : (widget.unselectedColor ?? colorScheme.outline),
          width: 2.0,
        ),
      ),
      child: widget.isSelected
          ? Icon(
              Icons.check,
              size: widget.size * 0.6,
              color: colorScheme.onPrimary,
            )
          : null,
    );
  }

  /// 构建圆角样式（默认样式）
  Widget _buildRoundedStyle(ColorScheme colorScheme) {
    return Container(
      width: widget.size,
      height: widget.size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(6.0),
        color: widget.isSelected 
            ? (widget.selectedColor ?? colorScheme.primary)
            : (widget.unselectedColor ?? colorScheme.surface),
        border: Border.all(
          color: widget.isSelected
              ? (widget.selectedColor ?? colorScheme.primary)
              : (widget.unselectedColor ?? colorScheme.outline.withValues(alpha: 0.6)),
          width: widget.isSelected ? 0 : 2,
        ),
      ),
      child: widget.isSelected
          ? Icon(
              CupertinoIcons.checkmark,
              size: widget.size * 0.7,
              color: colorScheme.onPrimary,
            )
          : null,
    );
  }

  /// 构建Material样式
  Widget _buildMaterialStyle(ColorScheme colorScheme) {
    return Checkbox(
      value: widget.isSelected,
      onChanged: (value) {
        if (value != null) {
          widget.onSelectionChanged?.call(value);
        }
      },
      activeColor: widget.selectedColor ?? colorScheme.primary,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
    );
  }

  /// 构建带点击效果的组件
  Widget _buildWithTapEffect(Widget child) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(
          widget.style == SelectionStyle.circle ? widget.size / 2 : 6.0,
        ),
        onTap: () => _handleTap(),
        child: Padding(
          padding: const EdgeInsets.all(ComponentThemeConstants.spacingXS),
          child: child,
        ),
      ),
    );
  }

  /// 处理点击事件
  void _handleTap() {
    widget.onSelectionChanged?.call(!widget.isSelected);
  }
}

/// 批量选择控制器
/// 
/// 用于管理多个选择框的状态
class SelectionController extends ChangeNotifier {
  final Set<String> _selectedIds = <String>{};
  bool _isSelectionMode = false;

  /// 获取选中的ID列表
  Set<String> get selectedIds => Set.unmodifiable(_selectedIds);

  /// 获取选中项数量
  int get selectedCount => _selectedIds.length;

  /// 是否处于选择模式
  bool get isSelectionMode => _isSelectionMode;

  /// 是否全部选中
  bool get isAllSelected => _selectedIds.isNotEmpty;

  /// 是否没有选中任何项
  bool get hasSelection => _selectedIds.isNotEmpty;

  /// 检查指定ID是否被选中
  bool isSelected(String id) => _selectedIds.contains(id);

  /// 切换选择模式
  void toggleSelectionMode() {
    _isSelectionMode = !_isSelectionMode;
    if (!_isSelectionMode) {
      _selectedIds.clear();
    }
    notifyListeners();
  }

  /// 进入选择模式
  void enterSelectionMode() {
    if (!_isSelectionMode) {
      _isSelectionMode = true;
      notifyListeners();
    }
  }

  /// 退出选择模式
  void exitSelectionMode() {
    if (_isSelectionMode) {
      _isSelectionMode = false;
      _selectedIds.clear();
      notifyListeners();
    }
  }

  /// 切换单个项的选择状态
  void toggleSelection(String id) {
    if (_selectedIds.contains(id)) {
      _selectedIds.remove(id);
    } else {
      _selectedIds.add(id);
    }
    
    // 如果没有选中任何项，自动退出选择模式
    if (_selectedIds.isEmpty) {
      _isSelectionMode = false;
    }
    
    notifyListeners();
  }

  /// 选择单个项
  void selectItem(String id) {
    if (!_selectedIds.contains(id)) {
      _selectedIds.add(id);
      notifyListeners();
    }
  }

  /// 取消选择单个项
  void deselectItem(String id) {
    if (_selectedIds.remove(id)) {
      // 如果没有选中任何项，自动退出选择模式
      if (_selectedIds.isEmpty) {
        _isSelectionMode = false;
      }
      notifyListeners();
    }
  }

  /// 全选
  void selectAll(List<String> ids) {
    _selectedIds.addAll(ids);
    notifyListeners();
  }

  /// 取消全选
  void deselectAll() {
    if (_selectedIds.isNotEmpty) {
      _selectedIds.clear();
      _isSelectionMode = false;
      notifyListeners();
    }
  }

  /// 反选
  void invertSelection(List<String> allIds) {
    final Set<String> newSelection = <String>{};
    for (final id in allIds) {
      if (!_selectedIds.contains(id)) {
        newSelection.add(id);
      }
    }
    _selectedIds.clear();
    _selectedIds.addAll(newSelection);
    notifyListeners();
  }

  /// 清理资源
  @override
  void dispose() {
    _selectedIds.clear();
    super.dispose();
  }
}

/// 批量操作栏组件
/// 
/// 在选择模式下显示批量操作选项
class BatchActionBar extends StatelessWidget {
  /// 选择控制器
  final SelectionController controller;
  
  /// 批量操作列表
  final List<BatchAction> actions;
  
  /// 背景颜色
  final Color? backgroundColor;
  
  /// 是否显示选中数量
  final bool showSelectedCount;

  const BatchActionBar({
    super.key,
    required this.controller,
    required this.actions,
    this.backgroundColor,
    this.showSelectedCount = true,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return AnimatedContainer(
      duration: ComponentThemeConstants.animationNormal,
      height: controller.isSelectionMode ? 60.0 : 0.0,
      decoration: BoxDecoration(
        color: backgroundColor ?? colorScheme.surface,
        border: Border(
          top: BorderSide(
            color: colorScheme.outline.withValues(alpha: 0.2),
            width: 1.0,
          ),
        ),
      ),
      child: controller.isSelectionMode
          ? Row(
              children: [
                // 取消按钮
                IconButton(
                  onPressed: controller.exitSelectionMode,
                  icon: const Icon(Icons.close),
                ),
                
                // 选中数量
                if (showSelectedCount) ...[
                  Text('已选中 ${controller.selectedCount} 项'),
                  const Spacer(),
                ],
                
                // 批量操作按钮
                ...actions.map((action) => _buildActionButton(context, action)),
              ],
            )
          : null,
    );
  }

  Widget _buildActionButton(BuildContext context, BatchAction action) {
    return IconButton(
      onPressed: controller.hasSelection ? action.onPressed : null,
      icon: Icon(
        action.icon,
        color: action.isDestructive 
            ? Theme.of(context).colorScheme.error 
            : null,
      ),
      tooltip: action.label,
    );
  }
}

/// 批量操作数据类
class BatchAction {
  final IconData icon;
  final String label;
  final VoidCallback onPressed;
  final bool isDestructive;

  const BatchAction({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.isDestructive = false,
  });
}