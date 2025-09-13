import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../../core/constants/accessibility_constants.dart';
import '../../core/animations/micro_interactions.dart';
import 'uniform_card_styles.dart';
import 'unified_bottom_sheet.dart';
import 'reimbursement_status_button.dart';
import 'region_badge_widget.dart';
import 'invoice_status_badge.dart';

/// 优化后的报销集卡片组件
/// 基于UI专家审计建议的简化设计，完全使用FlexColorScheme主题
class OptimizedReimbursementSetCard extends StatelessWidget {
  final ReimbursementSetEntity reimbursementSet;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final Function(ReimbursementSetStatus) onStatusChange;

  const OptimizedReimbursementSetCard({
    super.key,
    required this.reimbursementSet,
    required this.onTap,
    required this.onDelete,
    required this.onStatusChange,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Slidable(
      key: ValueKey(reimbursementSet.id),
      endActionPane: ActionPane(
        motion: const StretchMotion(),
        extentRatio: 0.25, // 固定宽度比例
        children: [
          // 自定义删除按钮容器，与Card严格对齐
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 12), // 匹配Card的底部margin
              child: Material(
                color: colorScheme.error,
                elevation: 2,
                borderRadius: const BorderRadius.only(
                  topRight: Radius.circular(12),
                  bottomRight: Radius.circular(12),
                ),
                child: Semantics(
                  label: AccessibilityConstants.deleteButtonLabel,
                  hint: AccessibilityConstants.deleteButtonHint,
                  child: InkWell(
                    onTap: () async {
                      // 使用统一的底部Sheet确认对话框
                      final result = await UnifiedBottomSheet.showConfirmDialog(
                        context: context,
                        title: '删除报销集',
                        content: '确定要删除报销集 "${reimbursementSet.setName}" 吗？\n\n包含的发票将重新变为未分配状态。',
                        confirmText: '删除',
                        confirmColor: colorScheme.error,
                        icon: CupertinoIcons.delete,
                      );
                      
                      if (result == true) {
                        onDelete();
                      }
                    },
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(12),
                      bottomRight: Radius.circular(12),
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(16), // 匹配Card的内边距
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            CupertinoIcons.delete,
                            color: colorScheme.onError,
                            size: 24,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '删除',
                            style: TextStyle(
                              color: colorScheme.onError,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      child: Semantics(
        label: '报销集: ${reimbursementSet.setName}',
        hint: AccessibilityConstants.cardActionHint,
        child: BounceButton(
          onPressed: onTap,
          child: UniformCardStyles.buildCard(
            context: context,
            onTap: null, // 由 BounceButton 处理
            child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 头部信息行
              UniformCardStyles.buildSimpleHeaderRow(
                context: context,
                title: reimbursementSet.setName,
                subtitle: '${reimbursementSet.invoiceCount} 张发票',
                trailing: ReimbursementStatusButton(
                  reimbursementSet: reimbursementSet,
                  invoices: [], // 卡片模式不需要具体发票列表
                  isCompact: true,
                  size: BadgeSize.medium,
                ),
              ),

              const SizedBox(height: UniformCardStyles.spacing12),

              // 日期范围显示行（替换总金额）
              _buildDateRangeRow(context),

              const SizedBox(height: UniformCardStyles.spacing12),

              // 区域统计徽章
              _buildRegionStatistics(context),

              const SizedBox(height: UniformCardStyles.spacing8),

              // 底部信息行
              UniformCardStyles.buildBottomRow(
                context: context,
                timeText: _formatUpdateTime(reimbursementSet.updatedAt),
                actionIcons: _buildActionIcons(context),
              ),
            ],
            ),
          ),
        ),
      ),
    );
  }

  /// 构建操作图标列表
  List<Widget> _buildActionIcons(BuildContext context) {
    // 删除按钮已移至右划手势，这里返回空列表
    return <Widget>[];
  }

  /// 构建日期范围显示行
  Widget _buildDateRangeRow(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final dateRangeText = reimbursementSet.dateRangeText ?? reimbursementSet.smartDateRangeText;
    final totalAmount = reimbursementSet.totalAmount;

    return Row(
      children: [
        // 日期范围图标和文本
        Expanded(
          child: Row(
            children: [
              Icon(
                CupertinoIcons.calendar,
                size: 14,
                color: colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  dateRangeText,
                  style: textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        // 总金额（使用发票卡片相同样式）
        Text(
          '¥${totalAmount.toStringAsFixed(2)}',
          style: textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: colorScheme.primary,
          ),
        ),
      ],
    );
  }

  /// 构建区域统计徽章
  Widget _buildRegionStatistics(BuildContext context) {
    if (reimbursementSet.regionStatistics == null || 
        reimbursementSet.regionStatistics!.isEmpty) {
      return const SizedBox.shrink();
    }

    return RegionStatisticsWidget(
      regionStatistics: reimbursementSet.regionStatistics,
      maxVisibleBadges: 3,
      badgeSize: BadgeSize.small,
    );
  }



  // ==================== 辅助方法 ====================




  /// 格式化更新时间
  String _formatUpdateTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 0) {
      return '${difference.inDays}天前';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}小时前';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}分钟前';
    } else {
      return '刚刚';
    }
  }
}
