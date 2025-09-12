import '../../core/utils/logger.dart';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:provider/provider.dart';
import '../../core/theme/component_theme_constants.dart';
import '../bloc/invoice_bloc.dart';
// import '../bloc/invoice_event.dart'; // 未使用
import 'invoice_management_page.dart';
import 'invoice_upload_page.dart';
import '../../core/network/supabase_client.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/theme_manager.dart';
import '../widgets/theme_selector_widget.dart';
import '../widgets/unified_bottom_sheet.dart';
import '../../debug_query_test.dart';

/// 导航项数据类
class NavigationItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;

  const NavigationItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
  });
}

/// 主页面 - 包含底部导航栏的容器页面
class MainPage extends StatefulWidget {
  const MainPage({super.key});

  @override
  State<MainPage> createState() => _MainPageState();
}

class _MainPageState extends State<MainPage> {
  int _currentIndex = 0;
  late PageController _pageController;


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

    return CupertinoPageScaffold(
      child: Column(
        children: [
          Expanded(
            child: PageView(
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
          ),
          _buildCupertinoTabBar(context),
        ],
      ),
    );
  }

  /// 构建Cupertino标签栏（标准高度）
  Widget _buildCupertinoTabBar(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      height: ComponentThemeConstants.bottomNavigationBarHeight,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          top: BorderSide(
            color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
            width: 0.5,
          ),
        ),
      ),
      child: CupertinoTabBar(
        currentIndex: _currentIndex,
        onTap: _onItemTapped,
        backgroundColor: Colors.transparent, // 使用容器背景色
        border: null, // 移除默认边框，使用容器边框
        items: [
          BottomNavigationBarItem(
            icon: Icon(
              CupertinoIcons.doc_text_fill,
              size: ComponentThemeConstants.iconSizeL,
            ),
            label: '发票管理',
          ),
          BottomNavigationBarItem(
            icon: Icon(
              CupertinoIcons.cloud_upload_fill,
              size: ComponentThemeConstants.iconSizeL,
            ),
            label: '上传发票',
          ),
          BottomNavigationBarItem(
            icon: Icon(
              CupertinoIcons.chart_bar_fill,
              size: ComponentThemeConstants.iconSizeL,
            ),
            label: '数据分析',
          ),
          BottomNavigationBarItem(
            icon: Icon(
              CupertinoIcons.settings_solid,
              size: ComponentThemeConstants.iconSizeL,
            ),
            label: '设置',
          ),
        ],
      ),
    );
  }


  // 数据分析页面
  Widget _buildAnalysisPage() {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('数据分析'),
        automaticallyImplyLeading: false,
      ),
      child: Builder(
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
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('设置'),
        automaticallyImplyLeading: false,
      ),
      child: ListView(
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
                    final shouldLogout = await UnifiedBottomSheet.showConfirmDialog(
                      context: context,
                      title: '退出登录',
                      content: '确定要退出登录吗？',
                      confirmText: '确定',
                      cancelText: '取消',
                      confirmColor: theme.colorScheme.error,
                      icon: CupertinoIcons.square_arrow_right,
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

