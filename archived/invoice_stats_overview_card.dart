import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../core/theme/component_theme_constants.dart';

/// 发票统计概览卡片
/// 显示发票总数量、总金额、未报销数量、未报销金额等关键统计信息
class InvoiceStatsOverviewCard extends StatelessWidget {
  const InvoiceStatsOverviewCard({
    super.key,
    required this.invoices,
    this.isLoading = false,
  });

  final List<InvoiceEntity> invoices;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    // 计算统计数据
    final stats = _calculateStats(invoices);
    
    return Container(
      margin: const EdgeInsets.fromLTRB(
        ComponentThemeConstants.spacingL,
        ComponentThemeConstants.spacingS,
        ComponentThemeConstants.spacingL,
        ComponentThemeConstants.spacingM,
      ),
      padding: const EdgeInsets.all(ComponentThemeConstants.spacingL),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(ComponentThemeConstants.radiusMedium),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.5),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: isLoading ? _buildLoadingState(colorScheme) : _buildStatsContent(context, stats, colorScheme),
    );
  }

  /// 构建加载状态
  Widget _buildLoadingState(ColorScheme colorScheme) {
    return Row(
      children: [
        Expanded(
          child: _buildStatItem(
            icon: CupertinoIcons.doc_text,
            label: '发票总数',
            value: '--',
            colorScheme: colorScheme,
          ),
        ),
        const SizedBox(width: ComponentThemeConstants.spacingL),
        Expanded(
          child: _buildStatItem(
            icon: CupertinoIcons.money_dollar_circle,
            label: '总金额',
            value: '--',
            colorScheme: colorScheme,
          ),
        ),
        const SizedBox(width: ComponentThemeConstants.spacingL),
        Expanded(
          child: _buildStatItem(
            icon: CupertinoIcons.clock,
            label: '未报销',
            value: '--',
            colorScheme: colorScheme,
          ),
        ),
      ],
    );
  }

  /// 构建统计内容
  Widget _buildStatsContent(BuildContext context, InvoiceStats stats, ColorScheme colorScheme) {
    return Row(
      children: [
        // 发票总数
        Expanded(
          child: _buildStatItem(
            icon: CupertinoIcons.doc_text,
            label: '发票总数',
            value: '${stats.totalCount}张',
            colorScheme: colorScheme,
          ),
        ),
        
        const SizedBox(width: ComponentThemeConstants.spacingM),
        
        // 总金额
        Expanded(
          child: _buildStatItem(
            icon: CupertinoIcons.money_dollar_circle,
            label: '总金额',
            value: _formatAmount(stats.totalAmount),
            colorScheme: colorScheme,
          ),
        ),
        
        const SizedBox(width: ComponentThemeConstants.spacingM),
        
        // 未报销信息
        Expanded(
          child: _buildStatItem(
            icon: CupertinoIcons.clock,
            label: '未报销',
            value: '${stats.unreimbursedCount}张',
            subtitle: _formatAmount(stats.unreimbursedAmount),
            colorScheme: colorScheme,
            isHighlight: stats.unreimbursedCount > 0,
          ),
        ),
      ],
    );
  }

  /// 构建单个统计项
  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
    String? subtitle,
    required ColorScheme colorScheme,
    bool isHighlight = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // 图标和标签
        Row(
          children: [
            Icon(
              icon,
              size: ComponentThemeConstants.iconSizeXS,
              color: isHighlight 
                  ? colorScheme.primary 
                  : colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: ComponentThemeConstants.spacingXS),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: ComponentThemeConstants.fontSizeCaption,
                  color: colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w500,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        
        const SizedBox(height: ComponentThemeConstants.spacingXS),
        
        // 主要数值
        Text(
          value,
          style: TextStyle(
            fontSize: ComponentThemeConstants.fontSizeBody,
            fontWeight: FontWeight.w600,
            color: isHighlight 
                ? colorScheme.primary 
                : colorScheme.onSurface,
          ),
        ),
        
        // 副标题（如金额）
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: ComponentThemeConstants.fontSizeCaption - 1,
              color: isHighlight 
                  ? colorScheme.primary.withValues(alpha: 0.8)
                  : colorScheme.onSurfaceVariant.withValues(alpha: 0.8),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ],
    );
  }

  /// 计算统计数据
  InvoiceStats _calculateStats(List<InvoiceEntity> invoices) {
    if (invoices.isEmpty) {
      return InvoiceStats(
        totalCount: 0,
        totalAmount: 0.0,
        unreimbursedCount: 0,
        unreimbursedAmount: 0.0,
      );
    }

    int totalCount = invoices.length;
    double totalAmount = 0.0;
    int unreimbursedCount = 0;
    double unreimbursedAmount = 0.0;

    for (final invoice in invoices) {
      totalAmount += invoice.amount;
      
      // 未报销：未提交和已提交状态都算未报销
      if (invoice.status == InvoiceStatus.unsubmitted || 
          invoice.status == InvoiceStatus.submitted) {
        unreimbursedCount++;
        unreimbursedAmount += invoice.amount;
      }
    }

    return InvoiceStats(
      totalCount: totalCount,
      totalAmount: totalAmount,
      unreimbursedCount: unreimbursedCount,
      unreimbursedAmount: unreimbursedAmount,
    );
  }

  /// 格式化金额显示
  String _formatAmount(double amount) {
    if (amount >= 10000) {
      return '¥${(amount / 10000).toStringAsFixed(1)}万';
    } else if (amount >= 1000) {
      return '¥${(amount / 1000).toStringAsFixed(1)}k';
    } else {
      return '¥${amount.toStringAsFixed(0)}';
    }
  }
}

/// 发票统计数据类
class InvoiceStats {
  final int totalCount;
  final double totalAmount;
  final int unreimbursedCount;
  final double unreimbursedAmount;

  const InvoiceStats({
    required this.totalCount,
    required this.totalAmount,
    required this.unreimbursedCount,
    required this.unreimbursedAmount,
  });
}