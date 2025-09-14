import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';
import '../../utils/icon_mapping.dart';

/// iOS风格的帮助面板组件
/// 
/// 提供标准的iOS风格帮助信息展示
/// 支持Action Sheet和Alert Dialog两种展示模式
class CupertinoHelpSheet {
  /// 显示Action Sheet风格的帮助
  static void showActionSheet({
    required BuildContext context,
    required String title,
    String? subtitle,
    required List<CupertinoHelpItem> items,
  }) {
    HapticFeedback.lightImpact();
    
    showCupertinoModalPopup<void>(
      context: context,
      builder: (BuildContext context) => CupertinoActionSheet(
        title: Text(
          title,
          style: AppTypography.titleMedium(context).copyWith(
            color: AppColors.onSurface(context),
            fontWeight: FontWeight.w600,
          ),
        ),
        message: subtitle != null
            ? Text(
                subtitle,
                style: AppTypography.bodyMedium(context).copyWith(
                  color: AppColors.onSurfaceVariant(context),
                ),
              )
            : null,
        actions: items
            .map((item) => CupertinoActionSheetAction(
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    Navigator.pop(context);
                    if (item.onTap != null) {
                      item.onTap!();
                    } else {
                      _showDetailedHelp(context, item);
                    }
                  },
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (item.icon != null) ...[
                        Icon(
                          item.icon,
                          color: AppColors.primary(context),
                          size: 18,
                        ),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        item.title,
                        style: TextStyle(
                          color: AppColors.primary(context),
                        ),
                      ),
                    ],
                  ),
                ))
            .toList(),
        cancelButton: CupertinoActionSheetAction(
          onPressed: () {
            HapticFeedback.lightImpact();
            Navigator.pop(context);
          },
          child: Text(
            '取消',
            style: TextStyle(
              color: AppColors.primary(context),
            ),
          ),
        ),
      ),
    );
  }

  /// 显示详细帮助对话框
  static void _showDetailedHelp(BuildContext context, CupertinoHelpItem item) {
    showCupertinoDialog<void>(
      context: context,
      builder: (BuildContext context) => CupertinoAlertDialog(
        title: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (item.icon != null) ...[
              Icon(
                item.icon,
                color: AppColors.primary(context),
                size: 20,
              ),
              const SizedBox(width: 8),
            ],
            Text(item.title),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (item.description != null) ...[
                const SizedBox(height: 16),
                Text(
                  item.description!,
                  style: AppTypography.bodyMedium(context).copyWith(
                    color: AppColors.onSurface(context),
                  ),
                ),
              ],
              if (item.details.isNotEmpty) ...[
                const SizedBox(height: 16),
                ...item.details.map((detail) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '• ',
                            style: AppTypography.bodySmall(context).copyWith(
                              color: AppColors.primary(context),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Expanded(
                            child: Text(
                              detail,
                              style: AppTypography.bodySmall(context).copyWith(
                                color: AppColors.onSurfaceVariant(context),
                              ),
                            ),
                          ),
                        ],
                      ),
                    )),
              ],
            ],
          ),
        ),
        actions: <CupertinoDialogAction>[
          CupertinoDialogAction(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.of(context).pop();
            },
            child: Text('知道了'),
          ),
        ],
      ),
    );
  }

  /// 显示上传帮助
  static void showUploadHelp(BuildContext context) {
    showActionSheet(
      context: context,
      title: '上传帮助',
      subtitle: '了解如何上传和管理发票文件',
      items: [
        CupertinoHelpItem(
          title: '支持的文件格式',
          icon: IconMapping.getCupertinoIcon('picture_as_pdf'),
          description: '了解支持的文件类型和格式要求',
          details: [
            'PDF格式的发票文件',
            '单文件大小不超过10MB',
            '支持拖拽和点击上传',
            '最多可同时选择5个文件',
          ],
        ),
        CupertinoHelpItem(
          title: '功能特性',
          icon: IconMapping.getCupertinoIcon('star'),
          description: '了解上传功能的强大特性',
          details: [
            '自动OCR识别发票信息',
            '智能去重检查（基于文件哈希）',
            '支持批量上传处理',
            '支持火车票和普通发票',
            '实时上传进度显示',
            '支持后台上传处理',
          ],
        ),
        CupertinoHelpItem(
          title: '操作指南',
          icon: IconMapping.getCupertinoIcon('info'),
          description: '学习如何高效使用上传功能',
          details: [
            '点击上传区域选择文件',
            '拖拽PDF文件到上传区域',
            '可在上传前预览和移除文件',
            '上传过程中可查看实时进度',
            '支持重试失败的上传',
          ],
        ),
        CupertinoHelpItem(
          title: '注意事项',
          icon: IconMapping.getCupertinoIcon('warning'),
          description: '使用时需要注意的重要事项',
          details: [
            '请确保PDF文件清晰可读',
            '重复文件会自动跳过',
            '处理时间取决于文件大小和复杂度',
            '网络较慢时请耐心等待',
            '建议在WiFi环境下上传大文件',
            '上传失败可尝试重新上传',
          ],
        ),
      ],
    );
  }
}

/// 帮助项数据模型
class CupertinoHelpItem {
  final String title;
  final IconData? icon;
  final String? description;
  final List<String> details;
  final VoidCallback? onTap;

  const CupertinoHelpItem({
    required this.title,
    this.icon,
    this.description,
    this.details = const [],
    this.onTap,
  });
}

/// iOS风格的功能介绍组件
class CupertinoFeatureShowcase extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color iconColor;
  final List<String> features;
  final VoidCallback? onGetStarted;

  const CupertinoFeatureShowcase({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
    required this.features,
    this.onGetStarted,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.cardBackground(context),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          // 图标和标题
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: 32,
              color: iconColor,
            ),
          ),
          
          const SizedBox(height: 16),
          
          Text(
            title,
            style: AppTypography.titleLarge(context).copyWith(
              color: AppColors.onSurface(context),
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          
          const SizedBox(height: 8),
          
          Text(
            subtitle,
            style: AppTypography.bodyMedium(context).copyWith(
              color: AppColors.onSurfaceVariant(context),
            ),
            textAlign: TextAlign.center,
          ),
          
          const SizedBox(height: 24),
          
          // 功能列表
          ...features.map((feature) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    Icon(
                      IconMapping.getCupertinoIcon('check_circle'),
                      color: AppColors.success(context),
                      size: 16,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        feature,
                        style: AppTypography.bodyMedium(context).copyWith(
                          color: AppColors.onSurface(context),
                        ),
                      ),
                    ),
                  ],
                ),
              )),
          
          if (onGetStarted != null) ...[
            const SizedBox(height: 24),
            
            CupertinoButton.filled(
              onPressed: () {
                HapticFeedback.lightImpact();
                onGetStarted!();
              },
              child: Text(
                '开始使用',
                style: AppTypography.labelLarge(context).copyWith(
                  color: CupertinoColors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}