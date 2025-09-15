/// 邮件详情底部弹窗组件
/// 显示邮件的完整详细信息
library;

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../domain/entities/email_detail.dart';
import '../unified_bottom_sheet.dart';
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
    final sheet = EmailDetailSheet(
      emailDetail: emailDetail,
      onMarkAsRead: onMarkAsRead,
      onDelete: onDelete,
    );
    
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    final isDark = brightness == Brightness.dark;
    
    return UnifiedBottomSheet.showCustomSheetWithActions(
      context: context,
      title: '邮件详情',
      maxHeight: MediaQuery.of(context).size.height * 0.9,
      child: sheet._buildContent(context),
      actions: sheet._buildActions(context, brightness, isDark),
    );
  }

  @override
  Widget build(BuildContext context) {
    // 直接返回内容，不再包装UnifiedBottomSheet
    return _buildContent(context);
  }

  Widget _buildContent(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    final isDark = brightness == Brightness.dark;
    
    return SingleChildScrollView(
      padding: InboxThemeConstants.emailDetailPadding,
      physics: const BouncingScrollPhysics(), // iOS风格滚动
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 邮件基本信息 - 紧凑布局
          _buildEmailHeaderCompact(context, brightness, isDark),
          
          SizedBox(height: InboxThemeConstants.emailDetailSectionSpacingCompact),
          
          // 处理状态和分类 - 紧凑布局
          _buildStatusSectionCompact(context, brightness, isDark),
          
          SizedBox(height: InboxThemeConstants.emailDetailSectionSpacing),
          
          // 邮件正文 - 主要内容区域
          if (emailDetail.bodyPreview.isNotEmpty)
            _buildEmailBody(context, brightness, isDark),
          
          SizedBox(height: InboxThemeConstants.emailDetailSectionSpacing),
          
          // 附件信息 - 减少间距
          if (emailDetail.hasAttachments) ...[
            SizedBox(height: InboxThemeConstants.emailDetailSectionSpacingCompact),
            _buildAttachmentsSection(context, brightness, isDark),
          ],
          
          // 处理详情 - 减少间距
          SizedBox(height: InboxThemeConstants.emailDetailSectionSpacingCompact),
          _buildProcessingDetails(context, brightness, isDark),
          
          // 技术详情（可折叠）- 减少间距
          SizedBox(height: InboxThemeConstants.emailDetailSectionSpacingCompact),
          _buildTechnicalDetails(context, brightness, isDark),
          
          // 底部间距
          SizedBox(height: 16.0),
        ],
      ),
    );
  }

  /// 构建操作按钮
  List<Widget> _buildActions(BuildContext context, Brightness brightness, bool isDark) {
    return [
      if (onMarkAsRead != null)
        _buildActionButton(
          icon: CupertinoIcons.eye,
          label: '标记已读',
          onTap: onMarkAsRead!,
          color: CupertinoColors.systemBlue.resolveFrom(context),
        ),
      if (onDelete != null)
        _buildActionButton(
          icon: CupertinoIcons.delete,
          label: '删除',
          onTap: () {
            _showDeleteConfirmation(context);
          },
          color: CupertinoColors.systemRed.resolveFrom(context),
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
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08 * 1.5),
          borderRadius: BorderRadius.circular(16.0 + 6),
          border: Border.all(
            color: color.withValues(alpha: 0.08 * 2.5),
            width: 1.0,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16.0, color: color),
            SizedBox(width: 8.0 - 1),
            Text(
              label,
              style: TextStyle(
                fontSize: 16.0,
                fontWeight: FontWeight.w600,
                color: color,
                // 优化字母间距
              letterSpacing: -0.1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建紧凑版邮件头部信息
  Widget _buildEmailHeaderCompact(BuildContext context, Brightness brightness, bool isDark) {
    return Container(
      padding: InboxThemeConstants.emailHeaderPaddingCompact,
      decoration: BoxDecoration(
        color: isDark ? CupertinoColors.systemGrey6.darkColor : CupertinoColors.systemGrey6.color,
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
                  CupertinoColors.systemBlue.resolveFrom(context).withValues(alpha: 0.08 * 1.875),
                  CupertinoColors.systemBlue.resolveFrom(context).withValues(alpha: 0.08 * 0.625),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(InboxThemeConstants.avatarRadius),
            ),
            child: Icon(
              CupertinoIcons.person_fill,
              size: InboxThemeConstants.avatarIconSize,
              color: CupertinoColors.systemBlue.resolveFrom(context),
            ),
          ),
          SizedBox(width: 8.0),
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
                          color: CupertinoColors.label.resolveFrom(context),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    SizedBox(width: 8.0),
                    Icon(
                      CupertinoIcons.time,
                      size: 12.0,
                      color: CupertinoColors.secondaryLabel.resolveFrom(context),
                    ),
                    SizedBox(width: 4.0),
                    Text(
                      _formatDateTime(emailDetail.emailDate ?? emailDetail.createdAt),
                      style: TextStyle(
                        fontSize: 12.0,
                        color: CupertinoColors.secondaryLabel.resolveFrom(context),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 4.0),
                // 邮件主题 - 紧凑显示
                Text(
                  emailDetail.baseInfo.displaySubject,
                  style: TextStyle(
                    fontSize: 14.0,
                    fontWeight: FontWeight.w500,
                    color: CupertinoColors.label.resolveFrom(context),
                    height: 1.2,
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
  Widget _buildStatusSectionCompact(BuildContext context, Brightness brightness, bool isDark) {
    return Container(
      padding: InboxThemeConstants.statusSectionPaddingCompact,
      decoration: BoxDecoration(
        color: isDark ? CupertinoColors.systemGrey5.darkColor : CupertinoColors.systemGrey5.color,
        borderRadius: BorderRadius.circular(8.0),
      ),
      child: Row(
        children: [
          StatusBadge(
            text: emailDetail.baseInfo.statusDisplayName,
            status: _mapToStatusBadgeStatus(emailDetail.overallStatus),
            size: StatusBadgeSize.small, // 使用小尺寸
          ),
          SizedBox(width: 8.0),
          _buildCategoryChipCompact(context, brightness, isDark),
          const Spacer(),
          // 简化的统计信息
          if (emailDetail.hasProcessingStats)
            _buildCompactProcessingStats(context, brightness, isDark),
        ],
      ),
    );
  }

  /// 构建紧凑版分类标签
  Widget _buildCategoryChipCompact(BuildContext context, Brightness brightness, bool isDark) {
    final config = _getCategoryConfig(emailDetail.emailCategory, context, brightness, isDark);
    
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: 8.0,
        vertical: 4.0,
      ),
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.08 * 1.25),
        borderRadius: BorderRadius.circular(8.0),
        border: Border.all(
          color: config.color.withValues(alpha: 0.08 * 2.5),
          width: 1.0,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            config.icon,
            style: TextStyle(fontSize: 12.0),
          ),
          SizedBox(width: 4.0),
          Text(
            config.label,
            style: TextStyle(
              fontSize: 12.0,
              fontWeight: FontWeight.w500,
              color: config.color,
            ),
          ),
        ],
      ),
    );
  }

  /// 构建紧凑版处理统计
  Widget _buildCompactProcessingStats(BuildContext context, Brightness brightness, bool isDark) {
    if (!emailDetail.hasProcessingStats) return const SizedBox.shrink();
    
    final total = emailDetail.totalAttachments ?? 0;
    final success = emailDetail.successfulProcessing ?? 0;
    
    if (total == 0) return const SizedBox.shrink();
    
    return Text(
      '$success/$total',
      style: TextStyle(
        fontSize: 12.0,
        color: CupertinoColors.secondaryLabel.resolveFrom(context),
      ),
    );
  }


  /// 构建邮件正文
  Widget _buildEmailBody(BuildContext context, Brightness brightness, bool isDark) {
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
        color: isDark ? CupertinoColors.systemGrey6.darkColor : CupertinoColors.systemGrey6.color,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(
          color: (isDark ? CupertinoColors.systemGrey3.darkColor : CupertinoColors.systemGrey3.color).withValues(alpha: 0.08),
          width: 1.0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 头部标题
          Padding(
            padding: EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Text(
                  '邮件正文',
                  style: TextStyle(
                    fontSize: 14.0,
                    fontWeight: FontWeight.w600,
                    color: CupertinoColors.label.resolveFrom(context),
                  ),
                ),
                const Spacer(),
                if (useHtmlRender)
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: CupertinoColors.systemBlue.resolveFrom(context).withValues(alpha: 0.08 * 1.25),
                      borderRadius: BorderRadius.circular(8.0),
                    ),
                    child: Text(
                      'HTML',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: CupertinoColors.systemBlue.resolveFrom(context),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          
          // 可滚动的邮件内容区域
          Container(
            constraints: BoxConstraints(maxHeight: 200), // 使用约束而非固定高度
            padding: EdgeInsets.fromLTRB(
              16.0 + 2,
              0,
              16.0 + 2,
              16.0 + 2,
            ),
            child: useHtmlRender ? _buildHtmlContent(displayContent, context, brightness, isDark) 
                                : _buildTextContent(displayContent, context, brightness, isDark),
          ),
        ],
      ),
    );
  }

  /// 构建HTML内容
  Widget _buildHtmlContent(String htmlContent, BuildContext context, Brightness brightness, bool isDark) {
    return _buildScrollableContentWithIndicator(
      child: Html(
        data: htmlContent,
        style: {
          'body': Style(
            margin: Margins.zero,
            padding: HtmlPaddings.zero,
            fontSize: FontSize(15),
            lineHeight: const LineHeight(1.6),
            color: CupertinoColors.label.resolveFrom(context).withValues(alpha: 0.6 + 0.25),
          ),
          'p': Style(
            margin: Margins.only(bottom: 12),
          ),
          'h1, h2, h3, h4, h5, h6': Style(
            fontWeight: FontWeight.w600,
            color: CupertinoColors.label.resolveFrom(context),
            margin: Margins.only(top: 16, bottom: 8),
          ),
          'a': Style(
            color: CupertinoColors.systemBlue.resolveFrom(context),
            textDecoration: TextDecoration.underline,
          ),
          'blockquote': Style(
            margin: Margins.only(left: 16, top: 8, bottom: 8),
            padding: HtmlPaddings.only(left: 12),
            border: Border(
              left: BorderSide(
                color: (isDark ? CupertinoColors.systemGrey3.darkColor : CupertinoColors.systemGrey3.color).withValues(alpha: 0.4 - 0.08),
                width: 3,
              ),
            ),
            backgroundColor: isDark ? CupertinoColors.systemGrey5.darkColor : CupertinoColors.systemGrey5.color,
          ),
          'code': Style(
            backgroundColor: isDark ? CupertinoColors.systemGrey5.darkColor : CupertinoColors.systemGrey5.color,
            padding: HtmlPaddings.symmetric(horizontal: 4, vertical: 2),
            fontFamily: 'Courier',
          ),
          'pre': Style(
            backgroundColor: isDark ? CupertinoColors.systemGrey5.darkColor : CupertinoColors.systemGrey5.color,
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
  Widget _buildTextContent(String textContent, BuildContext context, Brightness brightness, bool isDark) {
    return _buildScrollableContentWithIndicator(
      child: SelectableText(
        textContent,
        style: TextStyle(
          fontSize: 16.0,
          color: CupertinoColors.label.resolveFrom(context).withValues(alpha: 0.6 + 0.25),
          height: 1.6,
          // 优化字母间距
              letterSpacing: -0.1,
        ),
      ),
    );
  }

  /// 构建带滚动指示器的内容容器
  Widget _buildScrollableContentWithIndicator({required Widget child}) {
    return StatefulBuilder(
      builder: (context, setState) {
        final scrollController = ScrollController();
        double scrollProgress = 0.0;
        int totalLines = 0;
        int visibleLines = 0;
        bool showIndicator = false;
        
        // 监听滚动变化
        void updateScrollInfo() {
          if (scrollController.hasClients) {
            final maxScrollExtent = scrollController.position.maxScrollExtent;
            final currentScroll = scrollController.position.pixels;
            final viewportHeight = scrollController.position.viewportDimension;
            
            // 只有当内容确实可以滚动时才显示指示器
            final canScroll = maxScrollExtent > 10; // 至少10像素的滚动空间才显示
            
            if (canScroll) {
              final newScrollProgress = currentScroll / maxScrollExtent;
              final contentHeight = maxScrollExtent + viewportHeight;
              final lineHeight = 16.0 * 1.6;
              
              final newTotalLines = (contentHeight / lineHeight).ceil();
              final newVisibleLines = (viewportHeight / lineHeight).ceil();
              
              // 减少不必要的重绘
              if ((newScrollProgress - scrollProgress).abs() > 0.01 ||
                  newTotalLines != totalLines || 
                  newVisibleLines != visibleLines ||
                  showIndicator != canScroll) {
                setState(() {
                  scrollProgress = newScrollProgress;
                  totalLines = newTotalLines;
                  visibleLines = newVisibleLines;
                  showIndicator = canScroll;
                });
              }
            } else if (showIndicator) {
              setState(() {
                showIndicator = false;
              });
            }
          }
        }
        
        scrollController.addListener(updateScrollInfo);
        
        // 内容加载后检查是否需要显示指示器
        WidgetsBinding.instance.addPostFrameCallback((_) {
          updateScrollInfo();
        });
        
        return Stack(
          children: [
            // 主要的滚动内容
            Scrollbar(
              controller: scrollController,
              thumbVisibility: true,
              trackVisibility: true,
              thickness: 4.0,
              radius: Radius.circular(8.0),
              child: SingleChildScrollView(
                controller: scrollController,
                physics: const BouncingScrollPhysics(),
                padding: EdgeInsets.only(right: 12.0), // 为滚动条预留空间
                child: child,
              ),
            ),
            
            // 内容位置指示器 - 仅在内容可滚动时显示
            if (showIndicator)
              Positioned(
                top: 4.0,
                right: 4.0,
                child: AnimatedOpacity(
                  opacity: showIndicator ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 200),
                  child: _buildContentPositionIndicator(
                    scrollProgress: scrollProgress,
                    totalLines: totalLines,
                    visibleLines: visibleLines,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  /// 构建内容位置指示器
  Widget _buildContentPositionIndicator({
    required double scrollProgress,
    required int totalLines,
    required int visibleLines,
  }) {
    return Builder(
      builder: (context) {
        final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
        final isDark = brightness == Brightness.dark;
        
        return Container(
          padding: EdgeInsets.symmetric(
            horizontal: 8.0 - 2,
            vertical: 4.0 / 2,
          ),
          decoration: BoxDecoration(
            color: (isDark ? CupertinoColors.systemGrey6.darkColor : CupertinoColors.systemGrey6.color).withValues(
              alpha: 0.08 * 11, // ~0.88
            ),
            borderRadius: BorderRadius.circular(8.0),
            border: Border.all(
              color: (isDark ? CupertinoColors.systemGrey3.darkColor : CupertinoColors.systemGrey3.color).withValues(
                alpha: 0.08 * 2, // ~0.16
              ),
              width: 1.0,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 滚动进度条
              Container(
                width: 16.0,
                height: 16.0 * 3, // 48px
                decoration: BoxDecoration(
                  color: isDark ? CupertinoColors.systemGrey5.darkColor : CupertinoColors.systemGrey5.color,
                  borderRadius: BorderRadius.circular(8.0 / 2),
                  border: Border.all(
                    color: (isDark ? CupertinoColors.systemGrey3.darkColor : CupertinoColors.systemGrey3.color).withValues(
                      alpha: 0.08,
                    ),
                    width: 1.0,
                  ),
                ),
                child: Stack(
                  children: [
                    // 进度填充
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: Container(
                        height: (16.0 * 3) * scrollProgress,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.bottomCenter,
                            end: Alignment.topCenter,
                            colors: [
                              CupertinoColors.systemBlue.resolveFrom(context),
                              CupertinoColors.systemBlue.resolveFrom(context).withValues(alpha: 0.6),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(8.0 / 2),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              SizedBox(height: 4.0 / 2),
              
              // 内容统计信息
              Text(
                '${(scrollProgress * 100).round()}%',
                style: TextStyle(
                  fontSize: 12.0 - 2,
                  fontWeight: FontWeight.w600,
                  color: CupertinoColors.label.resolveFrom(context).withValues(
                    alpha: 0.6 + 0.2,
                  ),
                ),
              ),
              
              SizedBox(height: 4.0 / 4),
              
              // 行数信息
              if (totalLines > visibleLines)
                Text(
                  '$visibleLines/$totalLines',
                  style: TextStyle(
                    fontSize: 12.0 - 3,
                    color: CupertinoColors.secondaryLabel.resolveFrom(context),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  /// 启动URL
  void _launchUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      // URL启动失败，忽略错误
    }
  }


  /// 构建附件区域
  Widget _buildAttachmentsSection(BuildContext context, Brightness brightness, bool isDark) {
    return Container(
      padding: EdgeInsets.all(12.0),
      decoration: BoxDecoration(
        color: isDark ? CupertinoColors.systemGrey5.darkColor : CupertinoColors.systemGrey5.color,
        borderRadius: BorderRadius.circular(12.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                CupertinoIcons.paperclip,
                size: 16.0,
                color: CupertinoColors.secondaryLabel.resolveFrom(context),
              ),
              SizedBox(width: 6),
              Text(
                '附件信息',
                style: TextStyle(
                  fontSize: 14.0 - 1,
                  fontWeight: FontWeight.w600,
                  color: CupertinoColors.label.resolveFrom(context),
                ),
              ),
            ],
          ),
          
          SizedBox(height: 12.0),
          
          if (emailDetail.totalAttachments != null) ...[
            _buildAttachmentStat('总附件数', '${emailDetail.totalAttachments}', context, brightness, isDark),
            if (emailDetail.pdfAttachments != null)
              _buildAttachmentStat('PDF文件', '${emailDetail.pdfAttachments}', context, brightness, isDark),
            if (emailDetail.successfulProcessing != null)
              _buildAttachmentStat('处理成功', '${emailDetail.successfulProcessing}', context, brightness, isDark),
            if (emailDetail.failedProcessing != null && emailDetail.failedProcessing! > 0)
              _buildAttachmentStat('处理失败', '${emailDetail.failedProcessing}', context, brightness, isDark),
          ],
          
          if (emailDetail.attachmentNames?.isNotEmpty == true) ...[
            SizedBox(height: 8.0),
            const Divider(),
            SizedBox(height: 8.0),
            ...emailDetail.attachmentNames!.map((name) => _buildAttachmentItem(name, context, brightness, isDark)),
          ],
        ],
      ),
    );
  }

  /// 构建处理详情
  Widget _buildProcessingDetails(BuildContext context, Brightness brightness, bool isDark) {
    return Container(
      padding: EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: isDark ? CupertinoColors.systemGrey6.darkColor : CupertinoColors.systemGrey6.color,
        borderRadius: BorderRadius.circular(12.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '处理详情',
            style: TextStyle(
              fontSize: 14.0,
              fontWeight: FontWeight.w600,
              color: CupertinoColors.label.resolveFrom(context),
            ),
          ),
          
          SizedBox(height: 12.0),
          
          if (emailDetail.matchedKeywords?.isNotEmpty == true) ...[
            _buildDetailItem('匹配关键词', emailDetail.matchedKeywords!.join(', '), context, brightness, isDark),
            SizedBox(height: 8.0),
          ],
          
          if (emailDetail.extractionCompleteness != null)
            _buildDetailItem('提取完整性', emailDetail.extractionCompletenessDisplayName, context, brightness, isDark),
          
          if (emailDetail.linkQuality != null) ...[
            SizedBox(height: 8.0),
            _buildDetailItem('链接质量', emailDetail.linkQualityDisplayName, context, brightness, isDark),
          ],
          
          if (emailDetail.mappingMethod != null) ...[
            SizedBox(height: 8.0),
            _buildDetailItem('用户映射', emailDetail.mappingMethodDisplayName, context, brightness, isDark),
          ],
          
          if (emailDetail.recommendations?.isNotEmpty == true) ...[
            SizedBox(height: 12.0),
            Text(
              '处理建议',
              style: TextStyle(
                fontSize: 14.0 - 1,
                fontWeight: FontWeight.w600,
                color: CupertinoColors.label.resolveFrom(context).withValues(alpha: 0.6 + 0.2),
              ),
            ),
            SizedBox(height: 6),
            ...emailDetail.recommendations!.map((rec) => Padding(
              padding: EdgeInsets.only(top: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('• ', style: TextStyle(color: CupertinoColors.systemBlue.resolveFrom(context))),
                  Expanded(
                    child: Text(
                      rec,
                      style: TextStyle(
                        fontSize: 14.0 - 1,
                        color: CupertinoColors.label.resolveFrom(context).withValues(alpha: 0.6 + 0.1),
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
  Widget _buildTechnicalDetails(BuildContext context, Brightness brightness, bool isDark) {
    return CupertinoButton(
      padding: EdgeInsets.zero,
      onPressed: () {
        // 可以实现展开/收起功能
      },
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: isDark ? CupertinoColors.systemGrey5.darkColor : CupertinoColors.systemGrey5.color,
          borderRadius: BorderRadius.circular(12.0),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '技术详情',
              style: TextStyle(
                fontSize: 14.0,
                fontWeight: FontWeight.w600,
                color: CupertinoColors.label.resolveFrom(context),
              ),
            ),
            SizedBox(height: 12.0),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
            _buildDetailItem('邮件ID', emailDetail.id, context, brightness, isDark),
            SizedBox(height: 8.0),
            _buildDetailItem('工作流ID', emailDetail.baseInfo.workflowExecutionId, context, brightness, isDark),
            SizedBox(height: 8.0),
            _buildDetailItem('触发事件ID', emailDetail.baseInfo.triggerEventId, context, brightness, isDark),
            SizedBox(height: 8.0),
            _buildDetailItem('执行路径', emailDetail.baseInfo.executionPath, context, brightness, isDark),
            if (emailDetail.mappedUserId != null) ...[
              SizedBox(height: 8.0),
              _buildDetailItem('映射用户ID', emailDetail.mappedUserId!, context, brightness, isDark),
            ],
          ],
            ),
          ],
        ),
      ),
    );
  }



  /// 构建附件统计项
  Widget _buildAttachmentStat(String label, String value, BuildContext context, Brightness brightness, bool isDark) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14.0 - 1,
              color: CupertinoColors.secondaryLabel.resolveFrom(context),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 14.0 - 1,
              fontWeight: FontWeight.w600,
              color: CupertinoColors.label.resolveFrom(context),
            ),
          ),
        ],
      ),
    );
  }

  /// 构建附件项
  Widget _buildAttachmentItem(String name, BuildContext context, Brightness brightness, bool isDark) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(
            CupertinoIcons.doc,
            size: 16.0,
            color: CupertinoColors.secondaryLabel.resolveFrom(context),
          ),
          SizedBox(width: 8.0),
          Expanded(
            child: Text(
              name,
              style: TextStyle(
                fontSize: 14.0 - 1,
                color: CupertinoColors.label.resolveFrom(context).withValues(alpha: 0.6 + 0.2),
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
  Widget _buildDetailItem(String label, String value, BuildContext context, Brightness brightness, bool isDark) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 8.0,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14.0 - 1,
              color: CupertinoColors.secondaryLabel.resolveFrom(context),
            ),
          ),
        ),
        SizedBox(width: 8.0),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontSize: 14.0 - 1,
              fontWeight: FontWeight.w500,
              color: CupertinoColors.label.resolveFrom(context),
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
  ({String label, String icon, Color color}) _getCategoryConfig(String category, BuildContext context, Brightness brightness, bool isDark) {
    switch (category) {
      case 'verification':
        return (label: '验证邮件', icon: '🔐', color: CupertinoColors.systemBlue.resolveFrom(context));
      case 'invoice':
        return (label: '发票邮件', icon: '📄', color: CupertinoColors.systemGreen.resolveFrom(context));
      case 'other':
        return (label: '其他', icon: '📧', color: CupertinoColors.systemOrange.resolveFrom(context));
      default:
        return (label: '未知', icon: '❓', color: CupertinoColors.systemGrey.resolveFrom(context));
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