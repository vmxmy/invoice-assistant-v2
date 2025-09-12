import '../../core/utils/logger.dart';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:provider/provider.dart';
import '../bloc/invoice_bloc.dart';
// import '../bloc/invoice_event.dart'; // 未使用
import 'invoice_management_page.dart';
import 'invoice_upload_page.dart';
import '../../core/network/supabase_client.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/theme_manager.dart';
import '../widgets/theme_selector_widget.dart';
import '../../debug_query_test.dart';

/// 主页面 - 包含底部导航栏的容器页面
class MainPage extends StatefulWidget {
  const MainPage({super.key});

  @override
  State<MainPage> createState() => _MainPageState();
}

class _MainPageState extends State<MainPage> {
  int _currentIndex = 0;
  late PageController _pageController;

  final List<NavigationItem> _navigationItems = [
    NavigationItem(
      icon: CupertinoIcons.doc,
      activeIcon: CupertinoIcons.doc_text,
      label: '发票管理',
    ),
    NavigationItem(
      icon: CupertinoIcons.cloud_upload,
      activeIcon: CupertinoIcons.cloud_upload_fill,
      label: '上传发票',
    ),
    NavigationItem(
      icon: CupertinoIcons.chart_bar,
      activeIcon: CupertinoIcons.chart_bar_fill,
      label: '数据分析',
    ),
    NavigationItem(
      icon: CupertinoIcons.settings,
      activeIcon: CupertinoIcons.settings_solid,
      label: '设置',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onItemTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    AppLogger.debug('🏗️ [MainPage] MainPage重建 - currentIndex: $_currentIndex',
        tag: 'Debug');
    final bloc = context.read<InvoiceBloc>();
    AppLogger.debug('🏭 [MainPage:${bloc.hashCode}] 使用来自App级的全局InvoiceBloc',
        tag: 'Debug');

    return Scaffold(
      body: PageView(
        controller: _pageController,
        onPageChanged: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        children: [
          // 发票管理页面
          const InvoiceManagementPage(),

          // 上传发票页面
          const InvoiceUploadPage(),

          // 数据分析页面
          _buildAnalysisPage(),

          // 设置页面
          _buildSettingsPage(),
        ],
      ),
      bottomNavigationBar: _buildBottomNavigationBar(context),
    );
  }

  Widget _buildBottomNavigationBar(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: theme.shadowColor.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: _navigationItems.asMap().entries.map((entry) {
              final index = entry.key;
              final item = entry.value;
              final isActive = index == _currentIndex;

              return _buildNavigationItem(
                context,
                item: item,
                isActive: isActive,
                onTap: () => _onItemTapped(index),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  Widget _buildNavigationItem(
    BuildContext context, {
    required NavigationItem item,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);

    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 图标容器
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: isActive
                      ? theme.colorScheme.primary.withValues(alpha: 0.1)
                      : theme.colorScheme.surface.withValues(alpha: 0),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  isActive ? (item.activeIcon ?? item.icon) : item.icon,
                  size: 22,
                  color: isActive
                      ? theme.colorScheme.primary
                      : theme.colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
              const SizedBox(height: 2),

              // 标签文字
              Text(
                item.label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: isActive
                      ? theme.colorScheme.primary
                      : theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 数据分析页面
  Widget _buildAnalysisPage() {
    return Scaffold(
      appBar: AppBar(
        title: const Text('数据分析'),
        centerTitle: true,
        automaticallyImplyLeading: false,
      ),
      body: Builder(
        builder: (context) {
          final theme = Theme.of(context);
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  CupertinoIcons.chart_bar,
                  size: 80,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(height: 16),
                Text(
                  '数据分析功能',
                  style: TextStyle(
                    fontSize: 18,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '敬请期待',
                  style: TextStyle(
                    fontSize: 14,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // 设置页面
  Widget _buildSettingsPage() {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('设置'),
        centerTitle: true,
        automaticallyImplyLeading: false,
      ),
      body: ListView(
        children: [
          const SizedBox(height: 16),
          // 用户信息
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: ListTile(
              leading: const CircleAvatar(
                child: Icon(CupertinoIcons.person),
              ),
              title: Text(SupabaseClientManager.currentUser?.email ?? '未登录'),
              subtitle: const Text('当前用户'),
            ),
          ),

          const SizedBox(height: 16),

          // 设置选项
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(CupertinoIcons.info_circle),
                  title: const Text('应用信息'),
                  subtitle: Text('版本 ${AppConfig.version}'),
                  trailing: const Icon(CupertinoIcons.chevron_right),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: Icon(CupertinoIcons.exclamationmark_triangle,
                      color: theme.colorScheme.tertiary),
                  title: const Text('调试信息'),
                  subtitle: const Text('查看用户ID和数据库连接状态'),
                  trailing: const Icon(CupertinoIcons.chevron_right),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const DebugQueryTestPage(),
                      ),
                    );
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(CupertinoIcons.paintbrush_fill),
                  title: const Text('主题设置'),
                  subtitle: Text(
                      '当前：${context.watch<ThemeManager>().currentThemeName}'),
                  trailing: const Icon(CupertinoIcons.chevron_right),
                  onTap: () {
                    final themeManager = context.read<ThemeManager>();
                    showThemeSelector(context, themeManager);
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(CupertinoIcons.question_circle),
                  title: const Text('帮助与支持'),
                  trailing: const Icon(CupertinoIcons.chevron_right),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: Icon(CupertinoIcons.square_arrow_right,
                      color: theme.colorScheme.error),
                  title: Text('退出登录',
                      style: TextStyle(color: theme.colorScheme.error)),
                  onTap: () async {
                    final shouldLogout = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('退出登录'),
                        content: const Text('确定要退出登录吗？'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.of(context).pop(false),
                            child: const Text('取消'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.of(context).pop(true),
                            child: const Text('确定'),
                          ),
                        ],
                      ),
                    );

                    if (shouldLogout == true && mounted) {
                      try {
                        await SupabaseClientManager.signOut();
                        if (mounted) {
                          Navigator.of(context).pushNamedAndRemoveUntil(
                            '/login',
                            (route) => false,
                          );
                        }
                      } catch (e) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('退出登录失败: ${e.toString()}'),
                              backgroundColor: theme.colorScheme.error,
                            ),
                          );
                        }
                      }
                    }
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 导航项数据类
class NavigationItem {
  const NavigationItem({
    required this.icon,
    required this.label,
    this.activeIcon,
  });

  final IconData icon;
  final IconData? activeIcon;
  final String label;
}
