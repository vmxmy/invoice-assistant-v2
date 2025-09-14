/// 邮件详情底部弹窗组件
/// 显示邮件的完整详细信息
library;

import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../domain/entities/email_detail.dart';
import '../../../core/theme/component_theme_constants.dart';
import '../common/unified_bottom_sheet.dart';
import '../common/status_badge.dart';
import 'inbox_theme_constants.dart';

class EmailDetailSheet extends StatelessWidget {
  final EmailDetail emailDetail;
  final VoidCallback? onMarkAsRead;
  final VoidCallback? onDelete;

  const EmailDetailSheet({
    super.key,
    required this.emailDetail,
    this.onMarkAsRead,
    this.onDelete,
  });

  static Future<void> show({
    required BuildContext context,
    required EmailDetail emailDetail,
    VoidCallback? onMarkAsRead,
    VoidCallback? onDelete,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useSafeArea: true,
      enableDrag: true,
      showDragHandle: false, // 使用自定义拖拽指示器
      isDismissible: true,
      clipBehavior: Clip.antiAlias,
      elevation: 0,
      barrierColor: Colors.black.withValues(alpha: 0.5), // 优化遮罩颜色
      transitionAnimationController: null, // 使用默认iOS动画
      builder: (context) => EmailDetailSheet(
        emailDetail: emailDetail,
        onMarkAsRead: onMarkAsRead,
        onDelete: onDelete,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return UnifiedBottomSheet(
      title: '邮件详情',
      maxHeight: MediaQuery.of(context).size.height * 0.90, // 增加高度到90%
      actions: _buildActions(context, colorScheme),
      child: SingleChildScrollView(
        padding: InboxThemeConstants.emailDetailPadding,
        physics: const BouncingScrollPhysics(), // iOS风格滚动
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 邮件基本信息 - 紧凑布局
            _buildEmailHeaderCompact(colorScheme),
            
            const SizedBox(height: InboxThemeConstants.emailDetailSectionSpacingCompact),
            
            // 处理状态和分类 - 紧凑布局
            _buildStatusSectionCompact(colorScheme),
            
            const SizedBox(height: InboxThemeConstants.emailDetailSectionSpacing),
            
            // 邮件正文 - 主要内容区域
            if (emailDetail.bodyPreview.isNotEmpty)
              _buildEmailBody(colorScheme),
            
            const SizedBox(height: InboxThemeConstants.emailDetailSectionSpacing),
            
            // 附件信息 - 减少间距
            if (emailDetail.hasAttachments) ...[
              const SizedBox(height: InboxThemeConstants.emailDetailSectionSpacingCompact),
              _buildAttachmentsSection(colorScheme),
            ],
            
            // 处理详情 - 减少间距
            const SizedBox(height: InboxThemeConstants.emailDetailSectionSpacingCompact),
            _buildProcessingDetails(colorScheme),
            
            // 技术详情（可折叠）- 减少间距
            const SizedBox(height: InboxThemeConstants.emailDetailSectionSpacingCompact),
            _buildTechnicalDetails(colorScheme),
            
            // 底部间距
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  /// 构建操作按钮
  List<Widget> _buildActions(BuildContext context, ColorScheme colorScheme) {
    return [
      if (onMarkAsRead != null)
        _buildActionButton(
          icon: CupertinoIcons.eye,
          label: '标记已读',
          onTap: onMarkAsRead!,
          color: colorScheme.primary,
        ),
      if (onDelete != null)
        _buildActionButton(
          icon: CupertinoIcons.delete,
          label: '删除',
          onTap: () {
            _showDeleteConfirmation(context);
          },
          color: colorScheme.error,
        ),
    ];
  }

  /// 构建操作按钮
  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required Color color,
  }) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: color.withValues(alpha: 0.2),
            width: 0.5,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 17, color: color),
            const SizedBox(width: 7),
            Text(
              label,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: color,
                letterSpacing: -0.1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建紧凑版邮件头部信息
  Widget _buildEmailHeaderCompact(ColorScheme colorScheme) {
    return Container(
      padding: InboxThemeConstants.emailHeaderPaddingCompact,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(InboxThemeConstants.emailDetailSectionRadius),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 简化的头像
          Container(
            width: InboxThemeConstants.avatarSize,
            height: InboxThemeConstants.avatarSize,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  colorScheme.primary.withValues(alpha: 0.15),
                  colorScheme.primary.withValues(alpha: 0.05),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(InboxThemeConstants.avatarRadius),
            ),
            child: Icon(
              CupertinoIcons.person_fill,
              size: InboxThemeConstants.avatarIconSize,
              color: colorScheme.primary,
            ),
          ),
          const SizedBox(width: ComponentThemeConstants.spacingS),
          // 发件人和时间信息 - 紧凑布局
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 发件人 + 时间 在同一行
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        emailDetail.baseInfo.displayFrom,
                        style: TextStyle(
                          fontSize: InboxThemeConstants.emailSenderFontSize,
                          fontWeight: FontWeight.w600,
                          color: colorScheme.onSurface,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: ComponentThemeConstants.spacingS),
                    Icon(
                      CupertinoIcons.time,
                      size: ComponentThemeConstants.iconSizeXS,
                      color: colorScheme.onSurface.withValues(alpha: ComponentThemeConstants.opacitySecondary),
                    ),
                    const SizedBox(width: ComponentThemeConstants.spacingXS),
                    Text(
                      _formatDateTime(emailDetail.emailDate ?? emailDetail.createdAt),
                      style: TextStyle(
                        fontSize: ComponentThemeConstants.fontSizeCaption,
                        color: colorScheme.onSurface.withValues(alpha: ComponentThemeConstants.opacitySecondary),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: ComponentThemeConstants.spacingXS),
                // 邮件主题 - 紧凑显示
                Text(
                  emailDetail.baseInfo.displaySubject,
                  style: TextStyle(
                    fontSize: ComponentThemeConstants.fontSizeBody,
                    fontWeight: FontWeight.w500,
                    color: colorScheme.onSurface,
                    height: ComponentThemeConstants.lineHeightCompact,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }


  /// 构建紧凑版状态区域
  Widget _buildStatusSectionCompact(ColorScheme colorScheme) {
    return Container(
      padding: InboxThemeConstants.statusSectionPaddingCompact,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(ComponentThemeConstants.radiusSmall),
      ),
      child: Row(
        children: [
          StatusBadge(
            text: emailDetail.baseInfo.statusDisplayName,
            status: _mapToStatusBadgeStatus(emailDetail.overallStatus),
            size: StatusBadgeSize.small, // 使用小尺寸
          ),
          const SizedBox(width: ComponentThemeConstants.spacingS),
          _buildCategoryChipCompact(colorScheme),
          const Spacer(),
          // 简化的统计信息
          if (emailDetail.hasProcessingStats)
            _buildCompactProcessingStats(colorScheme),
        ],
      ),
    );
  }

  /// 构建紧凑版分类标签
  Widget _buildCategoryChipCompact(ColorScheme colorScheme) {
    final config = _getCategoryConfig(emailDetail.emailCategory, colorScheme);
    
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: ComponentThemeConstants.spacingS,
        vertical: ComponentThemeConstants.spacingXS,
      ),
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(ComponentThemeConstants.radiusSmall),
        border: Border.all(
          color: config.color.withValues(alpha: 0.2),
          width: 0.5,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            config.icon,
            style: const TextStyle(fontSize: ComponentThemeConstants.fontSizeCaption),
          ),
          const SizedBox(width: ComponentThemeConstants.spacingXS),
          Text(
            config.label,
            style: TextStyle(
              fontSize: ComponentThemeConstants.fontSizeCaption,
              fontWeight: FontWeight.w500,
              color: config.color,
            ),
          ),
        ],
      ),
    );
  }

  /// 构建紧凑版处理统计
  Widget _buildCompactProcessingStats(ColorScheme colorScheme) {
    if (!emailDetail.hasProcessingStats) return const SizedBox.shrink();
    
    final total = emailDetail.totalAttachments ?? 0;
    final success = emailDetail.successfulProcessing ?? 0;
    
    if (total == 0) return const SizedBox.shrink();
    
    return Text(
      '$success/$total',
      style: TextStyle(
        fontSize: ComponentThemeConstants.fontSizeCaption,
        color: colorScheme.onSurface.withValues(alpha: ComponentThemeConstants.opacitySecondary),
      ),
    );
  }


  /// 构建邮件正文
  Widget _buildEmailBody(ColorScheme colorScheme) {
    // 获取邮件内容，优先使用HTML格式
    String? htmlContent = emailDetail.emailBodyHtml;
    String? textContent = emailDetail.emailBodyText;
    String previewContent = emailDetail.bodyPreview;
    
    // 确定要显示的内容和渲染方式
    bool useHtmlRender = htmlContent?.isNotEmpty == true;
    String displayContent = useHtmlRender 
        ? htmlContent! 
        : (textContent?.isNotEmpty == true ? textContent! : previewContent);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.08),
          width: 0.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 头部标题
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Text(
                  '邮件正文',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
                const Spacer(),
                if (useHtmlRender)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: colorScheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'HTML',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.primary,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          
          // 可滚动的邮件内容区域
          Container(
            height: 200, // 限制高度以启用滚动
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
            child: useHtmlRender ? _buildHtmlContent(displayContent, colorScheme) 
                                : _buildTextContent(displayContent, colorScheme),
          ),
        ],
      ),
    );
  }

  /// 构建HTML内容
  Widget _buildHtmlContent(String htmlContent, ColorScheme colorScheme) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Html(
        data: htmlContent,
        style: {
          'body': Style(
            margin: Margins.zero,
            padding: HtmlPaddings.zero,
            fontSize: FontSize(15),
            lineHeight: const LineHeight(1.6),
            color: colorScheme.onSurface.withValues(alpha: 0.85),
          ),
          'p': Style(
            margin: Margins.only(bottom: 12),
          ),
          'h1, h2, h3, h4, h5, h6': Style(
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface,
            margin: Margins.only(top: 16, bottom: 8),
          ),
          'a': Style(
            color: colorScheme.primary,
            textDecoration: TextDecoration.underline,
          ),
          'blockquote': Style(
            margin: Margins.only(left: 16, top: 8, bottom: 8),
            padding: HtmlPaddings.only(left: 12),
            border: Border(
              left: BorderSide(
                color: colorScheme.outline.withValues(alpha: 0.3),
                width: 3,
              ),
            ),
            backgroundColor: colorScheme.surfaceContainerLowest,
          ),
          'code': Style(
            backgroundColor: colorScheme.surfaceContainerLowest,
            padding: HtmlPaddings.symmetric(horizontal: 4, vertical: 2),
            fontFamily: 'Courier',
          ),
          'pre': Style(
            backgroundColor: colorScheme.surfaceContainerLowest,
            padding: HtmlPaddings.all(12),
            margin: Margins.symmetric(vertical: 8),
          ),
          'img': Style(
            width: Width(100, Unit.percent),
            height: Height.auto(),
          ),
        },
        onLinkTap: (url, attributes, element) {
          if (url != null) {
            _launchUrl(url);
          }
        },
      ),
    );
  }

  /// 构建纯文本内容
  Widget _buildTextContent(String textContent, ColorScheme colorScheme) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: SelectableText(
        textContent,
        style: TextStyle(
          fontSize: 15,
          color: colorScheme.onSurface.withValues(alpha: 0.85),
          height: 1.6,
          letterSpacing: -0.1,
        ),
      ),
    );
  }

  /// 启动URL
  void _launchUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        print('无法启动URL: $url');
      }
    } catch (e) {
      print('启动URL失败: $e');
    }
  }


  /// 构建附件区域
  Widget _buildAttachmentsSection(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                CupertinoIcons.paperclip,
                size: 14,
                color: colorScheme.onSurface.withValues(alpha: 0.6),
              ),
              const SizedBox(width: 6),
              Text(
                '附件信息',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurface,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          if (emailDetail.totalAttachments != null) ...[
            _buildAttachmentStat('总附件数', '${emailDetail.totalAttachments}', colorScheme),
            if (emailDetail.pdfAttachments != null)
              _buildAttachmentStat('PDF文件', '${emailDetail.pdfAttachments}', colorScheme),
            if (emailDetail.successfulProcessing != null)
              _buildAttachmentStat('处理成功', '${emailDetail.successfulProcessing}', colorScheme),
            if (emailDetail.failedProcessing != null && emailDetail.failedProcessing! > 0)
              _buildAttachmentStat('处理失败', '${emailDetail.failedProcessing}', colorScheme),
          ],
          
          if (emailDetail.attachmentNames?.isNotEmpty == true) ...[
            const SizedBox(height: 8),
            const Divider(),
            const SizedBox(height: 8),
            ...emailDetail.attachmentNames!.map((name) => _buildAttachmentItem(name, colorScheme)),
          ],
        ],
      ),
    );
  }

  /// 构建处理详情
  Widget _buildProcessingDetails(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '处理详情',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurface,
            ),
          ),
          
          const SizedBox(height: 12),
          
          if (emailDetail.matchedKeywords?.isNotEmpty == true) ...[
            _buildDetailItem('匹配关键词', emailDetail.matchedKeywords!.join(', '), colorScheme),
            const SizedBox(height: 8),
          ],
          
          if (emailDetail.extractionCompleteness != null)
            _buildDetailItem('提取完整性', emailDetail.extractionCompletenessDisplayName, colorScheme),
          
          if (emailDetail.linkQuality != null) ...[
            const SizedBox(height: 8),
            _buildDetailItem('链接质量', emailDetail.linkQualityDisplayName, colorScheme),
          ],
          
          if (emailDetail.mappingMethod != null) ...[
            const SizedBox(height: 8),
            _buildDetailItem('用户映射', emailDetail.mappingMethodDisplayName, colorScheme),
          ],
          
          if (emailDetail.recommendations?.isNotEmpty == true) ...[
            const SizedBox(height: 12),
            Text(
              '处理建议',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface.withValues(alpha: 0.8),
              ),
            ),
            const SizedBox(height: 6),
            ...emailDetail.recommendations!.map((rec) => Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('• ', style: TextStyle(color: colorScheme.primary)),
                  Expanded(
                    child: Text(
                      rec,
                      style: TextStyle(
                        fontSize: 13,
                        color: colorScheme.onSurface.withValues(alpha: 0.7),
                      ),
                    ),
                  ),
                ],
              ),
            )),
          ],
        ],
      ),
    );
  }

  /// 构建技术详情
  Widget _buildTechnicalDetails(ColorScheme colorScheme) {
    return Theme(
      data: ThemeData(
        dividerColor: Colors.transparent,
        colorScheme: colorScheme,
      ),
      child: ExpansionTile(
        title: Text(
          '技术详情',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface,
          ),
        ),
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerLowest,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDetailItem('邮件ID', emailDetail.id, colorScheme),
                const SizedBox(height: 8),
                _buildDetailItem('工作流ID', emailDetail.baseInfo.workflowExecutionId, colorScheme),
                const SizedBox(height: 8),
                _buildDetailItem('触发事件ID', emailDetail.baseInfo.triggerEventId, colorScheme),
                const SizedBox(height: 8),
                _buildDetailItem('执行路径', emailDetail.baseInfo.executionPath, colorScheme),
                if (emailDetail.mappedUserId != null) ...[
                  const SizedBox(height: 8),
                  _buildDetailItem('映射用户ID', emailDetail.mappedUserId!, colorScheme),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }



  /// 构建附件统计项
  Widget _buildAttachmentStat(String label, String value, ColorScheme colorScheme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: colorScheme.onSurface.withValues(alpha: 0.7),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }

  /// 构建附件项
  Widget _buildAttachmentItem(String name, ColorScheme colorScheme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(
            CupertinoIcons.doc,
            size: 16,
            color: colorScheme.onSurface.withValues(alpha: 0.6),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              name,
              style: TextStyle(
                fontSize: 13,
                color: colorScheme.onSurface.withValues(alpha: 0.8),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  /// 构建详情项
  Widget _buildDetailItem(String label, String value, ColorScheme colorScheme) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 80,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: colorScheme.onSurface,
            ),
          ),
        ),
      ],
    );
  }

  /// 显示删除确认对话框
  void _showDeleteConfirmation(BuildContext context) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('删除邮件'),
        content: const Text('确定要删除这封邮件吗？此操作无法撤销。'),
        actions: [
          CupertinoDialogAction(
            child: const Text('取消'),
            onPressed: () => Navigator.pop(context),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true,
            child: const Text('删除'),
            onPressed: () {
              Navigator.pop(context);
              if (onDelete != null) {
                onDelete!();
              }
            },
          ),
        ],
      ),
    );
  }

  /// 格式化日期时间
  String _formatDateTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return '刚刚';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}分钟前';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}小时前';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}天前';
    } else {
      return '${dateTime.year}年${dateTime.month}月${dateTime.day}日 '
             '${dateTime.hour.toString().padLeft(2, '0')}:'
             '${dateTime.minute.toString().padLeft(2, '0')}';
    }
  }

  /// 获取分类配置
  ({String label, String icon, Color color}) _getCategoryConfig(String category, ColorScheme colorScheme) {
    switch (category) {
      case 'verification':
        return (label: '验证邮件', icon: '🔐', color: InboxThemeConstants.getCategoryColor('verification', colorScheme));
      case 'invoice':
        return (label: '发票邮件', icon: '📄', color: InboxThemeConstants.getCategoryColor('invoice', colorScheme));
      case 'other':
        return (label: '其他', icon: '📧', color: InboxThemeConstants.getCategoryColor('other', colorScheme));
      default:
        return (label: '未知', icon: '❓', color: InboxThemeConstants.getCategoryColor('unknown', colorScheme));
    }
  }

  /// 映射到StatusBadge的状态
  StatusBadgeStatus _mapToStatusBadgeStatus(String status) {
    switch (status) {
      case 'success':
        return StatusBadgeStatus.success;
      case 'partial_success':
        return StatusBadgeStatus.warning;
      case 'failed':
        return StatusBadgeStatus.error;
      case 'not_processed':
        return StatusBadgeStatus.neutral;
      case 'classification_only':
        return StatusBadgeStatus.info;
      default:
        return StatusBadgeStatus.neutral;
    }
  }
}