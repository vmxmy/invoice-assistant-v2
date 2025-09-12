import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../domain/repositories/invoice_repository.dart';
import '../../core/theme/app_typography.dart';

/// 发票统计组件 - 显示发票统计信息
class InvoiceStatsWidget extends StatelessWidget {
  final InvoiceStats stats;

  const InvoiceStatsWidget({
    super.key,
    required this.stats,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      margin: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 标题
          Text(
            '发票统计',
            style: AppTypography.titleMedium(context).copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),

          // 统计卡片网格
          _buildStatsGrid(context, colorScheme),

          const SizedBox(height: 16),

          // 本月统计
          _buildMonthlyStats(context, colorScheme),
        ],
      ),
    );
  }

  /// 构建统计网格
  Widget _buildStatsGrid(BuildContext context, ColorScheme colorScheme) {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            context,
            title: '总数',
            value: stats.totalCount.toString(),
            icon: CupertinoIcons.doc_text,
            color: colorScheme.primary,
            backgroundColor: colorScheme.primaryContainer,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            context,
            title: '总金额',
            value: _formatCurrency(stats.totalAmount),
            icon: CupertinoIcons.money_dollar_circle,
            color: colorScheme.secondary,
            backgroundColor: colorScheme.secondaryContainer,
          ),
        ),
      ],
    );
  }

  /// 构建本月统计
  Widget _buildMonthlyStats(BuildContext context, ColorScheme colorScheme) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                CupertinoIcons.calendar,
                size: 20,
                color: colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 8),
              Text(
                '本月统计',
                style: AppTypography.titleSmall(context).copyWith(
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildMonthlyStatItem(
                context,
                label: '本月发票',
                value: stats.monthlyCount.toString(),
                icon: CupertinoIcons.doc_text,
              ),
              Container(
                width: 1,
                height: 32,
                color: colorScheme.outline.withValues(alpha: 0.3),
              ),
              _buildMonthlyStatItem(
                context,
                label: '本月金额',
                value: _formatCurrency(stats.monthlyAmount),
                icon: CupertinoIcons.money_dollar,
              ),
              Container(
                width: 1,
                height: 32,
                color: colorScheme.outline.withValues(alpha: 0.3),
              ),
              _buildMonthlyStatItem(
                context,
                label: '平均金额',
                value: _formatCurrency(stats.averageAmount),
                icon: CupertinoIcons.graph_circle,
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// 构建单个统计卡片
  Widget _buildStatCard(
    BuildContext context, {
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required Color backgroundColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: AppTypography.bodyMedium(context).copyWith(
                  color: color,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Icon(
                icon,
                color: color,
                size: 20,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: AppTypography.headlineSmall(context).copyWith(
              color: color,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  /// 构建本月统计项
  Widget _buildMonthlyStatItem(
    BuildContext context, {
    required String label,
    required String value,
    required IconData icon,
  }) {
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        Icon(
          icon,
          size: 18,
          color: colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: AppTypography.titleSmall(context).copyWith(
            fontWeight: FontWeight.bold,
            color: colorScheme.onSurface,
          ),
        ),
        Text(
          label,
          style: AppTypography.bodySmall(context).copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  /// 格式化货币金额
  String _formatCurrency(double amount) {
    if (amount >= 10000) {
      return '¥${(amount / 10000).toStringAsFixed(1)}万';
    } else if (amount >= 1000) {
      return '¥${(amount / 1000).toStringAsFixed(1)}k';
    } else {
      return '¥${amount.toStringAsFixed(0)}';
    }
  }
}
