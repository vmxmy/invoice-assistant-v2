import 'package:flutter/material.dart';
import '../../domain/repositories/invoice_repository.dart';

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
    final textTheme = Theme.of(context).textTheme;

    return Container(
      margin: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 标题
          Text(
            '发票统计',
            style: textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          
          // 统计卡片网格
          _buildStatsGrid(context, colorScheme, textTheme),
          
          const SizedBox(height: 16),
          
          // 本月统计
          _buildMonthlyStats(context, colorScheme, textTheme),
        ],
      ),
    );
  }

  /// 构建统计网格
  Widget _buildStatsGrid(BuildContext context, ColorScheme colorScheme, TextTheme textTheme) {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            context,
            title: '总数',
            value: stats.totalCount.toString(),
            icon: Icons.receipt_long,
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
            icon: Icons.attach_money,
            color: colorScheme.secondary,
            backgroundColor: colorScheme.secondaryContainer,
          ),
        ),
      ],
    );
  }

  /// 构建本月统计
  Widget _buildMonthlyStats(BuildContext context, ColorScheme colorScheme, TextTheme textTheme) {
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
                Icons.calendar_month,
                size: 20,
                color: colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 8),
              Text(
                '本月统计',
                style: textTheme.titleSmall?.copyWith(
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
                icon: Icons.description,
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
                icon: Icons.monetization_on,
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
                icon: Icons.trending_up,
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
    final textTheme = Theme.of(context).textTheme;

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
                style: textTheme.bodyMedium?.copyWith(
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
            style: textTheme.headlineSmall?.copyWith(
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
    final textTheme = Theme.of(context).textTheme;
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
          style: textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
            color: colorScheme.onSurface,
          ),
        ),
        Text(
          label,
          style: textTheme.bodySmall?.copyWith(
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