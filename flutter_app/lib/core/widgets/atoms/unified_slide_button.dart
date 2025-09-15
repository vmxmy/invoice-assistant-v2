import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../../theme/design_constants.dart';
import '../../constants/accessibility_constants.dart';
import '../molecules/slide_button_content.dart';

/// 滑动按钮类型枚举
/// 定义不同操作类型的语义化分类
enum SlideButtonType {
  /// 主要操作 - 积极、建设性的操作（导出、分享、创建）
  primary,
  
  /// 次要操作 - 中性的功能性操作（查看、编辑、移动）
  secondary,
  
  /// 危险操作 - 不可逆或有风险的操作（删除、移出）
  destructive,
  
  /// 中性操作 - 状态变更类操作（归档、收藏、切换）
  neutral,
}

/// 统一滑动按钮组件
/// 
/// 提供一致的视觉样式、交互反馈和无障碍支持的滑动操作按钮。
/// 完全集成Cupertino主题系统，支持iOS Human Interface Guidelines。
/// 
/// 特性：
/// - 主题感知的颜色系统
/// - 智能圆角处理（根据位置调整）
/// - 标准化的尺寸和间距
/// - 完整的无障碍支持
/// - 自动关闭功能
/// - 触觉反馈
/// - 高对比度模式适配
class UnifiedSlideButton extends StatelessWidget {
  /// 按钮图标
  final IconData icon;
  
  /// 按钮标签文本
  final String label;
  
  /// 按钮类型（影响颜色主题）
  final SlideButtonType type;
  
  /// 点击回调
  final VoidCallback onPressed;
  
  /// 无障碍提示文本
  final String? semanticHint;
  
  /// 是否位于滑动区域的开始位置
  final bool isStart;
  
  /// 是否位于滑动区域的结束位置
  final bool isEnd;
  
  /// 是否启用触觉反馈
  final bool enableHapticFeedback;
  
  /// 自定义背景色（覆盖主题色）
  final Color? customBackgroundColor;
  
  /// 自定义前景色（覆盖主题色）
  final Color? customForegroundColor;
  
  /// 按钮弹性系数（影响宽度分配）
  final double flex;
  
  /// 是否禁用按钮
  final bool isDisabled;

  const UnifiedSlideButton({
    super.key,
    required this.icon,
    required this.label,
    required this.type,
    required this.onPressed,
    this.semanticHint,
    this.isStart = false,
    this.isEnd = false,
    this.enableHapticFeedback = true,
    this.customBackgroundColor,
    this.customForegroundColor,
    this.flex = 1.0,
    this.isDisabled = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    // 获取主题感知的颜色
    final colors = _getThemeColors(colorScheme);
    final backgroundColor = customBackgroundColor ?? colors.backgroundColor;
    final foregroundColor = customForegroundColor ?? colors.foregroundColor;
    
    // 计算智能圆角
    final borderRadius = _calculateBorderRadius();
    
    return Expanded(
      flex: (flex * 100).toInt(),
      child: Container(
        height: double.infinity,
        decoration: BoxDecoration(
          // 添加分隔边框（除了起始位置）
          border: Border(
            left: isStart ? BorderSide.none : BorderSide(
              color: Colors.white.withValues(alpha: 0.2),
              width: 0.5,
            ),
          ),
        ),
        child: Material(
          color: backgroundColor,
          elevation: 1, // 统一的轻微阴影
          borderRadius: borderRadius,
          child: Semantics(
            label: label,
            hint: semanticHint ?? _getDefaultSemanticHint(),
            button: true,
            enabled: !isDisabled,
            child: InkWell(
              onTap: isDisabled ? null : _handleTap,
              borderRadius: borderRadius,
              splashColor: foregroundColor.withValues(alpha: 0.1),
              highlightColor: foregroundColor.withValues(alpha: 0.05),
              child: Container(
                constraints: const BoxConstraints(
                  minHeight: 48, // 最小触摸区域
                ),
                padding: EdgeInsets.symmetric(
                  horizontal: DesignConstants.spacingM,
                  vertical: DesignConstants.spacingS,
                ),
                child: SlideButtonContent(
                  icon: icon,
                  label: label,
                  iconColor: foregroundColor,
                  textColor: foregroundColor,
                  isDisabled: isDisabled,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// 获取主题感知的颜色配置
  _ButtonColors _getThemeColors(ColorScheme colorScheme) {
    switch (type) {
      case SlideButtonType.primary:
        return _ButtonColors(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
        );
      case SlideButtonType.secondary:
        return _ButtonColors(
          backgroundColor: colorScheme.secondary,
          foregroundColor: colorScheme.onSecondary,
        );
      case SlideButtonType.destructive:
        return _ButtonColors(
          backgroundColor: colorScheme.error,
          foregroundColor: colorScheme.onError,
        );
      case SlideButtonType.neutral:
        return _ButtonColors(
          backgroundColor: colorScheme.surface,
          foregroundColor: colorScheme.onSurface,
        );
    }
  }

  /// 计算智能圆角
  /// 根据按钮在滑动区域中的位置动态调整圆角
  BorderRadius _calculateBorderRadius() {
    const radius = Radius.circular(12);
    
    if (isStart && isEnd) {
      // 单独的按钮，四个角都有圆角
      return BorderRadius.circular(12);
    } else if (isStart) {
      // 起始位置，左侧圆角
      return const BorderRadius.only(
        topLeft: radius,
        bottomLeft: radius,
      );
    } else if (isEnd) {
      // 结束位置，右侧圆角
      return const BorderRadius.only(
        topRight: radius,
        bottomRight: radius,
      );
    } else {
      // 中间位置，无圆角
      return BorderRadius.zero;
    }
  }

  /// 获取默认的语义化提示
  String _getDefaultSemanticHint() {
    switch (type) {
      case SlideButtonType.primary:
        return '执行主要操作';
      case SlideButtonType.secondary:
        return '执行辅助操作';
      case SlideButtonType.destructive:
        return '执行删除操作，此操作可能无法撤销';
      case SlideButtonType.neutral:
        return '执行状态变更操作';
    }
  }

  /// 处理点击事件
  void _handleTap() {
    // 触觉反馈
    if (enableHapticFeedback) {
      switch (type) {
        case SlideButtonType.destructive:
          HapticFeedback.mediumImpact();
          break;
        default:
          HapticFeedback.lightImpact();
          break;
      }
    }

    // 执行回调
    onPressed();
  }
}

/// 按钮颜色配置私有类
class _ButtonColors {
  final Color backgroundColor;
  final Color foregroundColor;

  const _ButtonColors({
    required this.backgroundColor,
    required this.foregroundColor,
  });
}

/// 统一滑动按钮预设工厂
/// 
/// 提供常用操作的快速创建方法，确保一致性
class UnifiedSlideButtonPresets {
  UnifiedSlideButtonPresets._();

  /// 创建导出按钮
  static UnifiedSlideButton export({
    required VoidCallback onPressed,
    bool isStart = false,
    bool isEnd = false,
  }) {
    return UnifiedSlideButton(
      icon: CupertinoIcons.cloud_download,
      label: '导出',
      type: SlideButtonType.primary,
      onPressed: onPressed,
      semanticHint: '导出文件到本地或分享',
      isStart: isStart,
      isEnd: isEnd,
    );
  }

  /// 创建分享按钮
  static UnifiedSlideButton share({
    required VoidCallback onPressed,
    bool isStart = false,
    bool isEnd = false,
  }) {
    return UnifiedSlideButton(
      icon: CupertinoIcons.share,
      label: '分享',
      type: SlideButtonType.primary,
      onPressed: onPressed,
      semanticHint: '分享给其他应用或联系人',
      isStart: isStart,
      isEnd: isEnd,
    );
  }

  /// 创建删除按钮
  static UnifiedSlideButton delete({
    required VoidCallback onPressed,
    bool isStart = false,
    bool isEnd = false,
  }) {
    return UnifiedSlideButton(
      icon: CupertinoIcons.delete,
      label: '删除',
      type: SlideButtonType.destructive,
      onPressed: onPressed,
      semanticHint: AccessibilityConstants.deleteButtonHint,
      isStart: isStart,
      isEnd: isEnd,
    );
  }

  /// 创建查看按钮
  static UnifiedSlideButton view({
    required VoidCallback onPressed,
    bool isStart = false,
    bool isEnd = false,
  }) {
    return UnifiedSlideButton(
      icon: CupertinoIcons.eye,
      label: '查看',
      type: SlideButtonType.secondary,
      onPressed: onPressed,
      semanticHint: '查看详细信息',
      isStart: isStart,
      isEnd: isEnd,
    );
  }

  /// 创建编辑按钮
  static UnifiedSlideButton edit({
    required VoidCallback onPressed,
    bool isStart = false,
    bool isEnd = false,
  }) {
    return UnifiedSlideButton(
      icon: CupertinoIcons.pencil,
      label: '编辑',
      type: SlideButtonType.secondary,
      onPressed: onPressed,
      semanticHint: '编辑内容信息',
      isStart: isStart,
      isEnd: isEnd,
    );
  }

  /// 创建移出按钮
  static UnifiedSlideButton remove({
    required VoidCallback onPressed,
    bool isStart = false,
    bool isEnd = false,
  }) {
    return UnifiedSlideButton(
      icon: CupertinoIcons.folder_badge_minus,
      label: '移出',
      type: SlideButtonType.destructive,
      onPressed: onPressed,
      semanticHint: '从当前集合中移出',
      isStart: isStart,
      isEnd: isEnd,
    );
  }

  /// 创建加入按钮
  static UnifiedSlideButton add({
    required VoidCallback onPressed,
    String label = '加入',
    bool isStart = false,
    bool isEnd = false,
  }) {
    return UnifiedSlideButton(
      icon: CupertinoIcons.folder_badge_plus,
      label: label,
      type: SlideButtonType.primary,
      onPressed: onPressed,
      semanticHint: '加入到集合中',
      isStart: isStart,
      isEnd: isEnd,
    );
  }

  /// 创建归档按钮
  static UnifiedSlideButton archive({
    required VoidCallback onPressed,
    bool isStart = false,
    bool isEnd = false,
  }) {
    return UnifiedSlideButton(
      icon: CupertinoIcons.archivebox,
      label: '归档',
      type: SlideButtonType.neutral,
      onPressed: onPressed,
      semanticHint: '移动到归档区域',
      isStart: isStart,
      isEnd: isEnd,
    );
  }
}