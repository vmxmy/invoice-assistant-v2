import 'package:flutter/cupertino.dart';
import 'invoice_status_badge.dart';

/// 区域徽章组件
/// 用于显示区域统计信息，支持不同大小和样式
class RegionBadge extends StatelessWidget {
  final String regionName;
  final int invoiceCount;
  final BadgeSize size;
  final VoidCallback? onTap;

  const RegionBadge({
    super.key,
    required this.regionName,
    required this.invoiceCount,
    this.size = BadgeSize.small,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: _getPadding(),
        decoration: BoxDecoration(
          color: CupertinoColors.systemBlue.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(_getBorderRadius()),
          border: Border.all(
            color: CupertinoColors.separator.withValues(alpha: 0.2),
            width: 0.5,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              CupertinoIcons.location,
              size: _getIconSize(),
              color: CupertinoColors.systemBlue,
            ),
            SizedBox(width: _getSpacing()),
            Text(
              regionName,
              style: TextStyle(
                fontSize: _getFontSize(),
                fontWeight: FontWeight.w500,
                color: CupertinoColors.systemBlue,
              ),
            ),
            SizedBox(width: _getSpacing() * 0.5),
            Container(
              padding: EdgeInsets.symmetric(
                horizontal: _getCountPadding(),
                vertical: 1,
              ),
              decoration: BoxDecoration(
                color: CupertinoColors.systemBlue,
                borderRadius: BorderRadius.circular(_getCountRadius()),
              ),
              child: Text(
                invoiceCount.toString(),
                style: TextStyle(
                  fontSize: _getCountFontSize(),
                  fontWeight: FontWeight.w600,
                  color: CupertinoColors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 根据大小获取内边距
  EdgeInsets _getPadding() {
    switch (size) {
      case BadgeSize.small:
        return const EdgeInsets.symmetric(horizontal: 6, vertical: 3);
      case BadgeSize.medium:
        return const EdgeInsets.symmetric(horizontal: 8, vertical: 4);
      case BadgeSize.large:
        return const EdgeInsets.symmetric(horizontal: 12, vertical: 6);
    }
  }

  /// 根据大小获取圆角
  double _getBorderRadius() {
    switch (size) {
      case BadgeSize.small:
        return 8;
      case BadgeSize.medium:
        return 10;
      case BadgeSize.large:
        return 12;
    }
  }

  /// 根据大小获取图标尺寸
  double _getIconSize() {
    switch (size) {
      case BadgeSize.small:
        return 10;
      case BadgeSize.medium:
        return 12;
      case BadgeSize.large:
        return 14;
    }
  }

  /// 根据大小获取间距
  double _getSpacing() {
    switch (size) {
      case BadgeSize.small:
        return 3;
      case BadgeSize.medium:
        return 4;
      case BadgeSize.large:
        return 5;
    }
  }

  /// 根据大小获取字体大小
  double _getFontSize() {
    switch (size) {
      case BadgeSize.small:
        return 10;
      case BadgeSize.medium:
        return 12;
      case BadgeSize.large:
        return 13;
    }
  }

  /// 根据大小获取计数徽章的内边距
  double _getCountPadding() {
    switch (size) {
      case BadgeSize.small:
        return 4;
      case BadgeSize.medium:
        return 5;
      case BadgeSize.large:
        return 6;
    }
  }

  /// 根据大小获取计数徽章的圆角
  double _getCountRadius() {
    switch (size) {
      case BadgeSize.small:
        return 6;
      case BadgeSize.medium:
        return 8;
      case BadgeSize.large:
        return 10;
    }
  }

  /// 根据大小获取计数文字大小
  double _getCountFontSize() {
    switch (size) {
      case BadgeSize.small:
        return 8;
      case BadgeSize.medium:
        return 9;
      case BadgeSize.large:
        return 10;
    }
  }
}

/// 区域统计徽章组件
/// 用于显示多个区域的统计信息
class RegionStatisticsWidget extends StatelessWidget {
  final Map<String, int>? regionStatistics;
  final int maxVisibleBadges;
  final BadgeSize badgeSize;
  final VoidCallback? onMoreTap;

  const RegionStatisticsWidget({
    super.key,
    this.regionStatistics,
    this.maxVisibleBadges = 3,
    this.badgeSize = BadgeSize.small,
    this.onMoreTap,
  });

  @override
  Widget build(BuildContext context) {
    if (regionStatistics == null || regionStatistics!.isEmpty) {
      return const SizedBox.shrink();
    }

    final entries = regionStatistics!.entries.toList();

    // 按发票数量降序排列
    entries.sort((a, b) => b.value.compareTo(a.value));

    // 获取要显示的徽章
    final visibleEntries = entries.take(maxVisibleBadges).toList();
    final hasMore = entries.length > maxVisibleBadges;
    final remainingCount = entries.length - maxVisibleBadges;

    return Wrap(
      spacing: 4,
      runSpacing: 4,
      children: [
        // 显示可见的区域徽章
        ...visibleEntries.map((entry) => RegionBadge(
              regionName: entry.key == '未知区域' ? '未知' : entry.key,
              invoiceCount: entry.value,
              size: badgeSize,
            )),

        // 如果有更多区域，显示"更多"徽章
        if (hasMore)
          GestureDetector(
            onTap: onMoreTap,
            child: Container(
              padding: _getMoreBadgePadding(),
              decoration: BoxDecoration(
                color: CupertinoColors.systemGrey6,
                borderRadius: BorderRadius.circular(_getMoreBadgeRadius()),
                border: Border.all(
                  color: CupertinoColors.separator.withValues(alpha: 0.3),
                  width: 0.5,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    CupertinoIcons.ellipsis,
                    size: _getMoreIconSize(),
                    color: CupertinoColors.secondaryLabel,
                  ),
                  SizedBox(width: _getMoreSpacing()),
                  Text(
                    '+$remainingCount',
                    style: TextStyle(
                      fontSize: _getMoreFontSize(),
                      fontWeight: FontWeight.w500,
                      color: CupertinoColors.secondaryLabel,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  EdgeInsets _getMoreBadgePadding() {
    switch (badgeSize) {
      case BadgeSize.small:
        return const EdgeInsets.symmetric(horizontal: 6, vertical: 3);
      case BadgeSize.medium:
        return const EdgeInsets.symmetric(horizontal: 8, vertical: 4);
      case BadgeSize.large:
        return const EdgeInsets.symmetric(horizontal: 12, vertical: 6);
    }
  }

  double _getMoreBadgeRadius() {
    switch (badgeSize) {
      case BadgeSize.small:
        return 8;
      case BadgeSize.medium:
        return 10;
      case BadgeSize.large:
        return 12;
    }
  }

  double _getMoreIconSize() {
    switch (badgeSize) {
      case BadgeSize.small:
        return 10;
      case BadgeSize.medium:
        return 12;
      case BadgeSize.large:
        return 14;
    }
  }

  double _getMoreSpacing() {
    switch (badgeSize) {
      case BadgeSize.small:
        return 2;
      case BadgeSize.medium:
        return 3;
      case BadgeSize.large:
        return 4;
    }
  }

  double _getMoreFontSize() {
    switch (badgeSize) {
      case BadgeSize.small:
        return 10;
      case BadgeSize.medium:
        return 12;
      case BadgeSize.large:
        return 13;
    }
  }
}
