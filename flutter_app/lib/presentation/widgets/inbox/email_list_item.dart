/// 邮件列表项组件
/// 显示单个邮件记录的信息
library;

import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../../../domain/entities/email_record.dart';
import '../../../core/theme/cupertino_semantic_colors.dart';
import '../../widgets/common/status_badge.dart';

class EmailListItem extends StatelessWidget {
  final EmailRecord email;
  final VoidCallback onTap;
  final VoidCallback? onMarkAsRead;
  final VoidCallback? onDelete;
  final bool isSelected;

  const EmailListItem({
    super.key,
    required this.email,
    required this.onTap,
    this.onMarkAsRead,
    this.onDelete,
    this.isSelected = false,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: isSelected
            ? CupertinoColors.systemBlue.withValues(alpha: 0.1)
            : CupertinoColors.systemGrey6,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isSelected
              ? CupertinoColors.systemBlue.withValues(alpha: 0.3)
              : CupertinoColors.separator.withValues(alpha: 0.1),
          width: isSelected ? 1.5 : 0.5,
        ),
      ),
      child: GestureDetector(
        onTap: () {
          HapticFeedback.lightImpact();
          onTap();
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 头部：发件人和日期
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: _buildSenderInfo(colorScheme),
                  ),
                  const SizedBox(width: 12),
                  _buildDateInfo(colorScheme),
                ],
              ),

              const SizedBox(height: 8),

              // 邮件主题
              _buildSubjectInfo(colorScheme),

              const SizedBox(height: 12),

              // 底部：状态标签和附件信息
              Row(
                children: [
                  _buildCategoryBadge(colorScheme),
                  const SizedBox(width: 8),
                  _buildStatusBadge(colorScheme),
                  const Spacer(),
                  if (email.hasAttachments) ...[
                    _buildAttachmentInfo(colorScheme),
                    const SizedBox(width: 8),
                  ],
                  _buildActionButtons(colorScheme),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 构建发件人信息
  Widget _buildSenderInfo(ColorScheme colorScheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          email.displayFrom,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        if (email.fromEmail != null && email.fromEmail != email.fromName) ...[
          const SizedBox(height: 2),
          Text(
            email.fromEmail!,
            style: TextStyle(
              fontSize: 14,
              color: colorScheme.onSurface.withValues(alpha: 0.6),
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ],
    );
  }

  /// 构建日期信息
  Widget _buildDateInfo(ColorScheme colorScheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          _formatDate(email.emailDate ?? email.createdAt),
          style: TextStyle(
            fontSize: 12,
            color: colorScheme.onSurface.withValues(alpha: 0.5),
          ),
        ),
        if (email.emailDate != null) ...[
          const SizedBox(height: 2),
          Text(
            _formatTime(email.emailDate!),
            style: TextStyle(
              fontSize: 11,
              color: colorScheme.onSurface.withValues(alpha: 0.4),
            ),
          ),
        ],
      ],
    );
  }

  /// 构建邮件主题
  Widget _buildSubjectInfo(ColorScheme colorScheme) {
    return Text(
      email.displaySubject,
      style: TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w500,
        color: colorScheme.onSurface.withValues(alpha: 0.8),
        height: 1.3,
      ),
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
    );
  }

  /// 构建分类标签
  Widget _buildCategoryBadge(ColorScheme colorScheme) {
    final config = _getCategoryConfig(email.emailCategory);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: config.color.withValues(alpha: 0.3),
          width: 0.5,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            config.icon,
            style: const TextStyle(fontSize: 10),
          ),
          const SizedBox(width: 4),
          Text(
            config.label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: config.color,
            ),
          ),
        ],
      ),
    );
  }

  /// 构建状态标签
  Widget _buildStatusBadge(ColorScheme colorScheme) {
    return StatusBadge(
      text: email.statusDisplayName,
      status: _mapToStatusBadgeStatus(email.overallStatus),
      size: StatusBadgeSize.small,
    );
  }

  /// 构建附件信息
  Widget _buildAttachmentInfo(ColorScheme colorScheme) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          CupertinoIcons.paperclip,
          size: 14,
          color: colorScheme.onSurface.withValues(alpha: 0.6),
        ),
        const SizedBox(width: 2),
        Text(
          '${email.attachmentCount}',
          style: TextStyle(
            fontSize: 12,
            color: colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
      ],
    );
  }

  /// 构建操作按钮
  Widget _buildActionButtons(ColorScheme colorScheme) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (onMarkAsRead != null)
          _buildActionButton(
            icon: CupertinoIcons.eye,
            onTap: onMarkAsRead!,
            color: colorScheme.primary,
          ),
        if (onDelete != null) ...[
          const SizedBox(width: 8),
          _buildActionButton(
            icon: CupertinoIcons.delete,
            onTap: onDelete!,
            color: colorScheme.error,
          ),
        ],
      ],
    );
  }

  /// 构建单个操作按钮
  Widget _buildActionButton({
    required IconData icon,
    required VoidCallback onTap,
    required Color color,
  }) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(
          icon,
          size: 14,
          color: color,
        ),
      ),
    );
  }

  /// 格式化日期显示
  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final emailDate = DateTime(date.year, date.month, date.day);

    final difference = today.difference(emailDate).inDays;

    if (difference == 0) {
      return '今天';
    } else if (difference == 1) {
      return '昨天';
    } else if (difference < 7) {
      return '$difference天前';
    } else if (difference < 30) {
      final weeks = (difference / 7).floor();
      return '$weeks周前';
    } else if (date.year == now.year) {
      return '${date.month}月${date.day}日';
    } else {
      return '${date.year}年${date.month}月${date.day}日';
    }
  }

  /// 格式化时间显示
  String _formatTime(DateTime date) {
    return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  /// 获取分类配置
  ({String label, String icon, Color color}) _getCategoryConfig(
      String category) {
    switch (category) {
      case 'verification':
        return (
          label: '验证',
          icon: '🔐',
          color: CupertinoSemanticColors.info,
        );
      case 'invoice':
        return (
          label: '发票',
          icon: '📄',
          color: CupertinoSemanticColors.invoice,
        );
      case 'other':
        return (
          label: '其他',
          icon: '📧',
          color: CupertinoSemanticColors.systemGray,
        );
      default:
        return (
          label: '未知',
          icon: '❓',
          color: CupertinoSemanticColors.systemGray2,
        );
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
