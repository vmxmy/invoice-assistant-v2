import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'unified_slide_button.dart';

/// UnifiedSlideButton 使用示例和最佳实践指南
/// 
/// 本文件展示了如何正确使用统一滑动按钮组件
class UnifiedSlideButtonExample extends StatelessWidget {
  const UnifiedSlideButtonExample({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('滑动按钮示例'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 示例1: 单个按钮 - 导出功能
          _buildExampleCard(
            context,
            title: '单个导出按钮示例',
            description: '左滑显示导出功能',
            child: Slidable(
              startActionPane: ActionPane(
                motion: const StretchMotion(),
                extentRatio: 0.25,
                children: [
                  UnifiedSlideButton.export(
                    onTap: () => _showMessage(context, '导出功能被触发'),
                    colorScheme: colorScheme,
                    position: SlideButtonPosition.single,
                  ),
                ],
              ),
              child: _buildSampleCard(context, '左滑查看导出按钮'),
            ),
          ),

          const SizedBox(height: 20),

          // 示例2: 单个按钮 - 删除功能
          _buildExampleCard(
            context,
            title: '单个删除按钮示例',
            description: '右滑显示删除功能',
            child: Slidable(
              endActionPane: ActionPane(
                motion: const StretchMotion(),
                extentRatio: 0.25,
                children: [
                  UnifiedSlideButton.delete(
                    onTap: () => _showMessage(context, '删除功能被触发'),
                    colorScheme: colorScheme,
                    position: SlideButtonPosition.single,
                  ),
                ],
              ),
              child: _buildSampleCard(context, '右滑查看删除按钮'),
            ),
          ),

          const SizedBox(height: 20),

          // 示例3: 多个按钮组合 - 左滑区域
          _buildExampleCard(
            context,
            title: '多按钮组合示例（左滑）',
            description: '左滑显示分享和导出功能',
            child: Slidable(
              startActionPane: ActionPane(
                motion: const StretchMotion(),
                extentRatio: 0.5, // 两个按钮需要更大的宽度
                children: [
                  UnifiedSlideButton.share(
                    onTap: () => _showMessage(context, '分享功能被触发'),
                    colorScheme: colorScheme,
                    position: SlideButtonPosition.left,
                  ),
                  UnifiedSlideButton.export(
                    onTap: () => _showMessage(context, '导出功能被触发'),
                    colorScheme: colorScheme,
                    position: SlideButtonPosition.right,
                  ),
                ],
              ),
              child: _buildSampleCard(context, '左滑查看分享和导出按钮'),
            ),
          ),

          const SizedBox(height: 20),

          // 示例4: 多个按钮组合 - 右滑区域
          _buildExampleCard(
            context,
            title: '多按钮组合示例（右滑）',
            description: '右滑显示加入和删除功能',
            child: Slidable(
              endActionPane: ActionPane(
                motion: const StretchMotion(),
                extentRatio: 0.5, // 两个按钮需要更大的宽度
                children: [
                  UnifiedSlideButton.addToSet(
                    onTap: () => _showMessage(context, '加入报销集功能被触发'),
                    colorScheme: colorScheme,
                    position: SlideButtonPosition.left,
                  ),
                  UnifiedSlideButton.delete(
                    onTap: () => _showMessage(context, '删除功能被触发'),
                    colorScheme: colorScheme,
                    position: SlideButtonPosition.right,
                  ),
                ],
              ),
              child: _buildSampleCard(context, '右滑查看加入和删除按钮'),
            ),
          ),

          const SizedBox(height: 20),

          // 示例5: 自定义按钮
          _buildExampleCard(
            context,
            title: '自定义按钮示例',
            description: '使用自定义颜色和图标的按钮',
            child: Slidable(
              startActionPane: ActionPane(
                motion: const StretchMotion(),
                extentRatio: 0.25,
                children: [
                  UnifiedSlideButton(
                    icon: CupertinoIcons.heart,
                    label: '收藏',
                    backgroundColor: CupertinoColors.destructiveRed.resolveFrom(context),
                    foregroundColor: Colors.white,
                    onTap: () => _showMessage(context, '收藏功能被触发'),
                    semanticLabel: '收藏',
                    semanticHint: '添加到收藏夹',
                    type: SlideButtonType.primary,
                    position: SlideButtonPosition.single,
                  ),
                ],
              ),
              child: _buildSampleCard(context, '左滑查看自定义收藏按钮'),
            ),
          ),

          const SizedBox(height: 40),

          // 最佳实践说明
          _buildBestPracticesSection(context),
        ],
      ),
    );
  }

  Widget _buildExampleCard(
    BuildContext context, {
    required String title,
    required String description,
    required Widget child,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          description,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
          ),
        ),
        const SizedBox(height: 12),
        child,
      ],
    );
  }

  Widget _buildSampleCard(BuildContext context, String text) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: CupertinoColors.systemGrey4,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(
            CupertinoIcons.doc_text,
            size: 24,
            color: CupertinoColors.systemGrey.resolveFrom(context),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Icon(
            CupertinoIcons.chevron_right,
            size: 16,
            color: CupertinoColors.systemGrey.resolveFrom(context),
          ),
        ],
      ),
    );
  }

  Widget _buildBestPracticesSection(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '最佳实践指南',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildPracticeItem(
              context,
              '1. 按钮位置',
              '• 左滑用于积极操作（分享、导出、收藏）\n• 右滑用于管理操作（删除、加入、移出）',
            ),
            _buildPracticeItem(
              context,
              '2. 颜色使用',
              '• 使用 colorScheme 确保主题一致性\n• 危险操作使用 error 色\n• 主要操作使用 primary 色\n• 次要操作使用 secondary 色',
            ),
            _buildPracticeItem(
              context,
              '3. 扩展比例',
              '• 单个按钮使用 0.25 extentRatio\n• 两个按钮使用 0.5 extentRatio\n• 三个或更多按钮考虑重新设计',
            ),
            _buildPracticeItem(
              context,
              '4. 无障碍支持',
              '• 始终提供 semanticLabel\n• 为复杂操作提供 semanticHint\n• 确保足够的点击区域大小',
            ),
            _buildPracticeItem(
              context,
              '5. 位置设置',
              '• 单个按钮使用 SlideButtonPosition.single\n• 多个按钮设置正确的 left/right 位置\n• 让组件自动处理圆角设置',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPracticeItem(BuildContext context, String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: CupertinoColors.activeBlue.resolveFrom(context),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            content,
            style: const TextStyle(
              fontSize: 14,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  void _showMessage(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 2),
      ),
    );
  }
}

/// 快速使用指南
/// 
/// ```dart
/// // 1. 基础用法 - 单个导出按钮
/// Slidable(
///   startActionPane: ActionPane(
///     motion: const StretchMotion(),
///     extentRatio: 0.25,
///     children: [
///       UnifiedSlideButton.export(
///         onTap: () => exportFunction(),
///         colorScheme: Theme.of(context).colorScheme,
///         position: SlideButtonPosition.single,
///       ),
///     ],
///   ),
///   child: YourCardWidget(),
/// )
/// 
/// // 2. 多按钮组合
/// Slidable(
///   endActionPane: ActionPane(
///     motion: const StretchMotion(),
///     extentRatio: 0.5, // 注意：两个按钮需要更大宽度
///     children: [
///       UnifiedSlideButton.addToSet(
///         onTap: () => addToSetFunction(),
///         colorScheme: colorScheme,
///         position: SlideButtonPosition.left,
///       ),
///       UnifiedSlideButton.delete(
///         onTap: () => deleteFunction(),
///         colorScheme: colorScheme,
///         position: SlideButtonPosition.right,
///       ),
///     ],
///   ),
///   child: YourCardWidget(),
/// )
/// 
/// // 3. 自定义按钮
/// UnifiedSlideButton(
///   icon: CupertinoIcons.star,
///   label: '标记',
///   backgroundColor: CupertinoColors.activeOrange.resolveFrom(context),
///   foregroundColor: Colors.white,
///   onTap: () => markFunction(),
///   position: SlideButtonPosition.single,
/// )
/// ```
class UnifiedSlideButtonQuickGuide {
  // 这个类仅用于文档目的，包含使用示例代码
}