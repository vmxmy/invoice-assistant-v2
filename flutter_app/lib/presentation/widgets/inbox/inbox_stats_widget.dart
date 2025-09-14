/// 收件箱统计信息组件
/// 显示邮件统计数据的概览
library;

import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../../domain/entities/inbox_stats.dart';
import '../../../core/theme/component_theme_constants.dart';
import 'inbox_theme_constants.dart';

class InboxStatsWidget extends StatelessWidget {
  final InboxStats stats;
  final bool isLoading;

  const InboxStatsWidget({
    super.key,
    required this.stats,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      margin: InboxThemeConstants.statsWidgetMargin,
      padding: InboxThemeConstants.statsWidgetPadding,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(ComponentThemeConstants.radiusMedium),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.12),
          width: ComponentThemeConstants.borderWidthThin,
        ),
      ),
      child: Column(
        children: [
          // 主要统计行
          _buildMainStatsRow(colorScheme),
          
          SizedBox(height: ComponentThemeConstants.spacingS - 2),
          
          // 分类统计行
          _buildCategoryStatsRow(colorScheme),
          
          // 处理状态行（如果有数据）
          if (_hasProcessingData())
            ...[
              SizedBox(height: ComponentThemeConstants.spacingS - 2),
              _buildProcessingStatsRow(colorScheme),
            ],
        ],
      ),
    );
  }

  /// 构建主要统计行（总邮件、未读、今日）
  Widget _buildMainStatsRow(ColorScheme colorScheme) {
    return Row(
      children: [
        // 总邮件数（最重要，放在左侧）
        Icon(
          CupertinoIcons.mail_solid,
          size: InboxThemeConstants.statsIconSize,
          color: colorScheme.primary,
        ),
        SizedBox(width: ComponentThemeConstants.spacingS - 2),
        Text(
          '${stats.totalEmails}',
          style: TextStyle(
            fontSize: InboxThemeConstants.statsValueFontSize,
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface,
          ),
        ),
        SizedBox(width: ComponentThemeConstants.spacingXS),
        Text(
          '封邮件',
          style: TextStyle(
            fontSize: ComponentThemeConstants.fontSizeBody,
            color: colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
        
        const Spacer(),
        
        // 未读徽章（如果有未读邮件）
        if (stats.unreadEmails > 0) ...[
          _buildStatBadge(
            '${stats.unreadEmails} 未读',
            InboxThemeConstants.getUnreadHighlightColor(colorScheme),
            CupertinoIcons.circle_fill,
          ),
          SizedBox(width: ComponentThemeConstants.spacingS),
        ],
        
        // 今日邮件徽章（如果有今日邮件）
        if (stats.recentEmailsToday > 0) ...[
          _buildStatBadge(
            '今日 ${stats.recentEmailsToday}',
            colorScheme.primary,
            CupertinoIcons.calendar_today,
          ),
        ],
        
        // 加载指示器
        if (isLoading) ...[
          SizedBox(width: ComponentThemeConstants.spacingS),
          SizedBox(
            width: ComponentThemeConstants.iconSizeS,
            height: ComponentThemeConstants.iconSizeS,
            child: CircularProgressIndicator(
              strokeWidth: 1.5,
              color: colorScheme.primary,
            ),
          ),
        ],
      ],
    );
  }

  /// 构建分类统计行（验证邮件、发票邮件、附件邮件）
  Widget _buildCategoryStatsRow(ColorScheme colorScheme) {
    return Row(
      children: [
        // 验证邮件
        if (stats.verificationEmails > 0) ...[
          _buildInlineStatItem(
            '验证',
            stats.verificationEmails,
            CupertinoIcons.shield_lefthalf_fill,
            InboxThemeConstants.getCategoryColor('verification', colorScheme),
            colorScheme,
          ),
          SizedBox(width: ComponentThemeConstants.spacingL),
        ],
        
        // 发票邮件
        if (stats.invoiceEmails > 0) ...[
          _buildInlineStatItem(
            '发票',
            stats.invoiceEmails,
            CupertinoIcons.doc_text_fill,
            InboxThemeConstants.getCategoryColor('invoice', colorScheme),
            colorScheme,
          ),
          SizedBox(width: ComponentThemeConstants.spacingL),
        ],
        
        // 有附件邮件
        if (stats.emailsWithAttachments > 0) ...[
          _buildInlineStatItem(
            '附件',
            stats.emailsWithAttachments,
            CupertinoIcons.paperclip,
            InboxThemeConstants.getCategoryColor('other', colorScheme),
            colorScheme,
          ),
        ],
        
        const Spacer(),
        
        // 本周统计（右侧）
        if (stats.recentEmailsWeek > 0) ...[
          Text(
            '本周 ${stats.recentEmailsWeek} 封',
            style: TextStyle(
              fontSize: ComponentThemeConstants.fontSizeCaption,
              color: colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
        ],
      ],
    );
  }

  /// 构建处理统计行
  Widget _buildProcessingStatsRow(ColorScheme colorScheme) {
    final total = stats.successfulProcessing + stats.failedProcessing;
    final successRate = total > 0 ? stats.successfulProcessing / total : 0.0;
    
    return Row(
      children: [
        // 处理状态文本
        Text(
          '处理状态',
          style: TextStyle(
            fontSize: ComponentThemeConstants.fontSizeCaption,
            color: colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
        SizedBox(width: ComponentThemeConstants.spacingM),
        
        // 成功徽章
        if (stats.successfulProcessing > 0) ...[
          _buildMiniStatBadge(
            '成功 ${stats.successfulProcessing}',
            InboxThemeConstants.getCategoryColor('invoice', colorScheme),
          ),
          SizedBox(width: ComponentThemeConstants.spacingS - 2),
        ],
        
        // 失败徽章
        if (stats.failedProcessing > 0) ...[
          _buildMiniStatBadge(
            '失败 ${stats.failedProcessing}',
            InboxThemeConstants.getStatusColor('error', colorScheme),
          ),
        ],
        
        const Spacer(),
        
        // 成功率
        if (total > 0) ...[
          Text(
            '${(successRate * 100).round()}% 成功',
            style: TextStyle(
              fontSize: ComponentThemeConstants.fontSizeCaption,
              fontWeight: FontWeight.w500,
              color: _getSuccessRateColor(successRate, colorScheme),
            ),
          ),
        ],
      ],
    );
  }

  /// 构建统计徽章
  Widget _buildStatBadge(String text, Color color, IconData icon) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: ComponentThemeConstants.spacingS - 2, vertical: ComponentThemeConstants.spacingXS - 1),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(ComponentThemeConstants.radiusMedium),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: ComponentThemeConstants.borderWidthThin,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: ComponentThemeConstants.iconSizeXS,
            color: color,
          ),
          SizedBox(width: ComponentThemeConstants.spacingXS),
          Text(
            text,
            style: TextStyle(
              fontSize: ComponentThemeConstants.fontSizeCaption,
              fontWeight: FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  /// 构建内联统计项
  Widget _buildInlineStatItem(
    String label,
    int value,
    IconData icon,
    Color color,
    ColorScheme colorScheme,
  ) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: ComponentThemeConstants.iconSizeS,
          color: color,
        ),
        SizedBox(width: ComponentThemeConstants.spacingXS),
        Text(
          '$value',
          style: TextStyle(
            fontSize: ComponentThemeConstants.fontSizeCaption,
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface,
          ),
        ),
        SizedBox(width: ComponentThemeConstants.spacingXS / 2),
        Text(
          label,
          style: TextStyle(
            fontSize: ComponentThemeConstants.fontSizeCaption,
            color: colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
      ],
    );
  }

  /// 构建迷你统计徽章
  Widget _buildMiniStatBadge(String text, Color color) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: ComponentThemeConstants.spacingS - 2, vertical: ComponentThemeConstants.spacingXS / 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: ComponentThemeConstants.fontSizeCaption - 2,
          fontWeight: FontWeight.w500,
          color: color,
        ),
      ),
    );
  }

  /// 检查是否有处理数据
  bool _hasProcessingData() {
    return stats.successfulProcessing > 0 || stats.failedProcessing > 0;
  }


  /// 获取成功率对应的颜色
  Color _getSuccessRateColor(double rate, ColorScheme colorScheme) {
    return InboxThemeConstants.getSuccessRateColor(rate, colorScheme);
  }
}