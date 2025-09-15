import 'package:flutter/cupertino.dart';
import 'app_button.dart';

/// AppButton组件使用示例
///
/// 展示AppButton组件的各种用法和样式
class AppButtonExamples extends StatelessWidget {
  const AppButtonExamples({super.key});

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('AppButton 组件示例'),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 基础样式示例
              _buildSection('基础样式', [
                AppButton(
                  text: '填充按钮',
                  style: AppButtonStyle.filled,
                  onPressed: () => _showPressed(context, '填充按钮'),
                ),
                const SizedBox(height: 12),
                AppButton(
                  text: '幽灵按钮',
                  style: AppButtonStyle.ghost,
                  onPressed: () => _showPressed(context, '幽灵按钮'),
                ),
                const SizedBox(height: 12),
                AppButton(
                  text: '危险按钮',
                  style: AppButtonStyle.destructive,
                  onPressed: () => _showPressed(context, '危险按钮'),
                ),
              ]),

              const SizedBox(height: 32),

              // 尺寸示例
              _buildSection('不同尺寸', [
                AppButton(
                  text: '小按钮',
                  size: AppButtonSize.small,
                  onPressed: () => _showPressed(context, '小按钮'),
                ),
                const SizedBox(height: 12),
                AppButton(
                  text: '中等按钮',
                  size: AppButtonSize.medium,
                  onPressed: () => _showPressed(context, '中等按钮'),
                ),
                const SizedBox(height: 12),
                AppButton(
                  text: '大按钮',
                  size: AppButtonSize.large,
                  onPressed: () => _showPressed(context, '大按钮'),
                ),
              ]),

              const SizedBox(height: 32),

              // 带图标示例
              _buildSection('带图标按钮', [
                AppButton(
                  text: '保存',
                  icon: CupertinoIcons.download_circle,
                  onPressed: () => _showPressed(context, '保存按钮'),
                ),
                const SizedBox(height: 12),
                AppButton(
                  text: '删除',
                  icon: CupertinoIcons.delete,
                  style: AppButtonStyle.destructive,
                  onPressed: () => _showPressed(context, '删除按钮'),
                ),
                const SizedBox(height: 12),
                AppButton(
                  text: '分享',
                  icon: CupertinoIcons.share,
                  style: AppButtonStyle.ghost,
                  size: AppButtonSize.small,
                  onPressed: () => _showPressed(context, '分享按钮'),
                ),
              ]),

              const SizedBox(height: 32),

              // 状态示例
              _buildSection('按钮状态', [
                const AppButton(
                  text: '加载中...',
                  loading: true,
                ),
                const SizedBox(height: 12),
                const AppButton(
                  text: '禁用按钮',
                  onPressed: null, // 禁用状态
                ),
                const SizedBox(height: 12),
                AppButton(
                  text: '全宽按钮',
                  fullWidth: true,
                  onPressed: () => _showPressed(context, '全宽按钮'),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }

  /// 构建示例分组
  Widget _buildSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 16),
        ...children,
      ],
    );
  }

  /// 显示按钮点击提示
  void _showPressed(BuildContext context, String buttonName) {
    showCupertinoDialog(
      context: context,
      builder: (BuildContext context) => CupertinoAlertDialog(
        title: const Text('按钮点击'),
        content: Text('您点击了：$buttonName'),
        actions: <CupertinoDialogAction>[
          CupertinoDialogAction(
            child: const Text('确定'),
            onPressed: () {
              Navigator.of(context).pop();
            },
          ),
        ],
      ),
    );
  }
}
