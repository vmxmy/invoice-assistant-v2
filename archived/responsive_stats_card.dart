import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../../core/theme/app_theme_constants.dart';
// 移除旧主题系统，使用 FlexColorScheme 统一主题管理

/// 简化的统计卡片组件
/// 极简设计，紧凑布局，减少视觉干扰
class ResponsiveStatsCard extends StatelessWidget {
  final List<ReimbursementSetEntity> reimbursementSets;

  const ResponsiveStatsCard({
    super.key,
    required this.reimbursementSets,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(
          horizontal: AppThemeConstants.spacing16,
          vertical: AppThemeConstants.spacing8),
      child: _buildCompactStatsCard(context),
    );
  }

  /// 极简统计卡片 - 单行显示核心数据
  Widget _buildCompactStatsCard(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final stats = _calculateStats();

    if (stats.totalCount == 0) {
      return const SizedBox.shrink(); // 无数据时不显示
    }

    return Container(
      padding: const EdgeInsets.all(AppThemeConstants.spacing12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(AppThemeConstants.radiusSmall),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          // 图标
          Icon(
            CupertinoIcons.folder_fill_badge_person_crop,
            color: colorScheme.primary,
            size: AppThemeConstants.iconMedium,
          ),
          const SizedBox(width: AppThemeConstants.spacing8),

          // 核心统计 - 紧凑显示
          Expanded(
            child: Row(
              children: [
                // 总数
                _buildCompactStat(context, '报销集', '${stats.totalCount}',
                    colorScheme.onSurface),
                const SizedBox(width: AppThemeConstants.spacing16),

                // 未提交数（仅在有未提交时显示）
                if (stats.unsubmittedCount > 0) ...[
                  _buildCompactStat(context, '未提交', '${stats.unsubmittedCount}',
                      colorScheme.primary),
                  const SizedBox(width: AppThemeConstants.spacing16),
                ],

                // 总金额（仅在大于0时显示）
                if (stats.totalAmount > 0)
                  _buildCompactStat(
                      context,
                      '总额',
                      '¥${stats.totalAmount.toStringAsFixed(0)}',
                      colorScheme.tertiary),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// 构建紧凑统计项 - 标签:数值格式
  Widget _buildCompactStat(
      BuildContext context, String label, String value, Color color) {
    return RichText(
      text: TextSpan(
        children: [
          TextSpan(
            text: '$label: ',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: color.withValues(alpha: 0.7),
            ),
          ),
          TextSpan(
            text: value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  // ==================== 数据处理 ====================

  /// 计算统计数据
  ReimbursementSetStats _calculateStats() {
    final totalCount = reimbursementSets.length;
    final unsubmittedCount = reimbursementSets.where((set) => set.isDraft).length;
    final submittedCount =
        reimbursementSets.where((set) => set.isSubmitted).length;
    final reimbursedCount =
        reimbursementSets.where((set) => set.isReimbursed).length;
    final totalAmount = reimbursementSets.fold<double>(
      0,
      (sum, set) => sum + set.totalAmount,
    );

    return ReimbursementSetStats(
      totalCount: totalCount,
      unsubmittedCount: unsubmittedCount,
      submittedCount: submittedCount,
      reimbursedCount: reimbursedCount,
      totalAmount: totalAmount,
    );
  }
}

/// 报销集统计数据类
class ReimbursementSetStats {
  const ReimbursementSetStats({
    required this.totalCount,
    required this.unsubmittedCount,
    required this.submittedCount,
    required this.reimbursedCount,
    required this.totalAmount,
  });

  final int totalCount;
  final int unsubmittedCount;
  final int submittedCount;
  final int reimbursedCount;
  final double totalAmount;
}
