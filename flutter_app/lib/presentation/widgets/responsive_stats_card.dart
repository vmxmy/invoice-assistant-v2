import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../../core/theme/app_theme_constants.dart';
import '../../core/theme/app_typography.dart';

/// 响应式统计卡片组件
/// 根据屏幕尺寸自动调整布局，完全基于FlexColorScheme主题
class ResponsiveStatsCard extends StatelessWidget {
  final List<ReimbursementSetEntity> reimbursementSets;

  const ResponsiveStatsCard({
    super.key,
    required this.reimbursementSets,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(AppThemeConstants.spacing16),
      child: _buildStatsCard(context),
    );
  }

  Widget _buildStatsCard(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isCompactScreen = screenWidth < 400;
    final colorScheme = Theme.of(context).colorScheme;
    
    // 计算统计数据
    final stats = _calculateStats();
    final statItems = _buildStatItems(context, stats);
    
    return Card(
      elevation: 4,
      shadowColor: Colors.black.withValues(alpha: 0.1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppThemeConstants.radiusMedium),
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppThemeConstants.radiusMedium),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              colorScheme.primary.withValues(alpha: 0.05),
              colorScheme.secondary.withValues(alpha: 0.03),
            ],
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppThemeConstants.spacing20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 标题区域
              _buildHeader(context),
              
              const SizedBox(height: AppThemeConstants.spacing20),
              
              // 统计网格 - 响应式布局
              if (isCompactScreen)
                _buildCompactStatsGrid(context, statItems)
              else
                _buildRegularStatsRow(context, statItems),
              
              // 总金额卡片（如果有数据）
              if (stats.totalAmount > 0) ...[
                const SizedBox(height: AppThemeConstants.spacing16),
                _buildTotalAmountCard(context, stats.totalAmount),
              ],
            ],
          ),
        ),
      ),
    );
  }

  /// 构建标题区域
  Widget _buildHeader(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(AppThemeConstants.spacing8),
          decoration: BoxDecoration(
            color: colorScheme.primary.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(AppThemeConstants.radiusSmall),
          ),
          child: Icon(
            CupertinoIcons.folder_badge_person_crop,
            color: colorScheme.primary,
            size: AppThemeConstants.iconMedium,
          ),
        ),
        const SizedBox(width: AppThemeConstants.spacing12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '报销集概览',
                style: AppTypography.titleLarge(context).copyWith(
                  color: colorScheme.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppThemeConstants.spacing2),
              Text(
                '统计数据实时更新',
                style: AppTypography.bodySmall(context).copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// 构建紧凑屏幕的网格布局 (2x2)
  Widget _buildCompactStatsGrid(BuildContext context, List<StatItem> statItems) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: _buildStatItem(context, statItems[0])),
            const SizedBox(width: AppThemeConstants.spacing12),
            Expanded(child: _buildStatItem(context, statItems[1])),
          ],
        ),
        const SizedBox(height: AppThemeConstants.spacing12),
        Row(
          children: [
            Expanded(child: _buildStatItem(context, statItems[2])),
            const SizedBox(width: AppThemeConstants.spacing12),
            Expanded(child: _buildStatItem(context, statItems[3])),
          ],
        ),
      ],
    );
  }

  /// 构建常规屏幕的行布局 (1x4)
  Widget _buildRegularStatsRow(BuildContext context, List<StatItem> statItems) {
    return Row(
      children: statItems.map((statItem) => 
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppThemeConstants.spacing4),
            child: _buildStatItem(context, statItem),
          ),
        )
      ).toList(),
    );
  }

  /// 构建单个统计项
  Widget _buildStatItem(BuildContext context, StatItem statItem) {
    return Container(
      padding: const EdgeInsets.all(AppThemeConstants.spacing16),
      decoration: BoxDecoration(
        color: statItem.color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppThemeConstants.radiusMedium),
        border: Border.all(
          color: statItem.color.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Column(
        children: [
          // 图标
          Container(
            padding: const EdgeInsets.all(AppThemeConstants.spacing8),
            decoration: BoxDecoration(
              color: statItem.color.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(
              statItem.icon,
              color: statItem.color,
              size: AppThemeConstants.iconLarge,
            ),
          ),
          
          const SizedBox(height: AppThemeConstants.spacing8),
          
          // 数值
          Text(
            statItem.value,
            style: AppTypography.headlineSmall(context).copyWith(
              color: statItem.color,
              fontWeight: FontWeight.w800,
            ),
          ),
          
          const SizedBox(height: AppThemeConstants.spacing4),
          
          // 标签
          Text(
            statItem.label,
            style: AppTypography.bodySmall(context).copyWith(
              color: statItem.color.withValues(alpha: 0.8),
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  /// 构建总金额卡片
  Widget _buildTotalAmountCard(BuildContext context, double totalAmount) {
    final colorScheme = Theme.of(context).colorScheme;
    final statusColor = colorScheme.tertiary; // 使用tertiary作为成功/已报销状态色
    
    return Container(
      padding: const EdgeInsets.all(AppThemeConstants.spacing16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            statusColor.withValues(alpha: 0.1),
            statusColor.withValues(alpha: 0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(AppThemeConstants.radiusMedium),
        border: Border.all(
          color: statusColor.withValues(alpha: 0.3),
          width: 1.5,
        ),
      ),
      child: Row(
        children: [
          // 金额图标
          Container(
            padding: const EdgeInsets.all(AppThemeConstants.spacing8),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              CupertinoIcons.money_dollar_circle_fill,
              color: statusColor,
              size: AppThemeConstants.iconLarge,
            ),
          ),
          
          const SizedBox(width: AppThemeConstants.spacing12),
          
          // 金额信息
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '总金额',
                  style: AppTypography.bodyMedium(context).copyWith(
                    color: statusColor,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: AppThemeConstants.spacing4),
                Text(
                  '¥${totalAmount.toStringAsFixed(2)}',
                  style: AppTypography.headlineMedium(context).copyWith(
                    color: statusColor,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          
          // 趋势指示器
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppThemeConstants.spacing8,
              vertical: AppThemeConstants.spacing4,
            ),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(AppThemeConstants.radiusLarge),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  CupertinoIcons.arrow_up_right,
                  size: AppThemeConstants.iconSmall,
                  color: statusColor,
                ),
                const SizedBox(width: AppThemeConstants.spacing2),
                Text(
                  '累计',
                  style: AppTypography.labelSmall(context).copyWith(
                    color: statusColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
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
    final draftCount = reimbursementSets.where((set) => set.isDraft).length;
    final submittedCount = reimbursementSets.where((set) => set.isSubmitted).length;
    final reimbursedCount = reimbursementSets.where((set) => set.isReimbursed).length;
    final totalAmount = reimbursementSets.fold<double>(
      0, 
      (sum, set) => sum + set.totalAmount,
    );

    return ReimbursementSetStats(
      totalCount: totalCount,
      draftCount: draftCount,
      submittedCount: submittedCount,
      reimbursedCount: reimbursedCount,
      totalAmount: totalAmount,
    );
  }

  /// 构建统计项列表（使用主题颜色）
  List<StatItem> _buildStatItems(BuildContext context, ReimbursementSetStats stats) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return [
      StatItem(
        label: '总数',
        value: stats.totalCount.toString(),
        icon: CupertinoIcons.folder,
        color: colorScheme.primary,
      ),
      StatItem(
        label: '草稿',
        value: stats.draftCount.toString(),
        icon: CupertinoIcons.pencil_circle,
        color: colorScheme.primary, // 草稿状态使用primary
      ),
      StatItem(
        label: '已提交',
        value: stats.submittedCount.toString(),
        icon: CupertinoIcons.paperplane_fill,
        color: colorScheme.secondary, // 已提交状态使用secondary
      ),
      StatItem(
        label: '已报销',
        value: stats.reimbursedCount.toString(),
        icon: CupertinoIcons.checkmark_circle_fill,
        color: colorScheme.tertiary, // 已报销状态使用tertiary
      ),
    ];
  }
}

/// 报销集统计数据类
class ReimbursementSetStats {
  const ReimbursementSetStats({
    required this.totalCount,
    required this.draftCount,
    required this.submittedCount,
    required this.reimbursedCount,
    required this.totalAmount,
  });

  final int totalCount;
  final int draftCount;
  final int submittedCount;
  final int reimbursedCount;
  final double totalAmount;
}