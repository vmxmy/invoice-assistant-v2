import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../core/theme/theme_manager.dart';
import '../../core/theme/theme_preset_manager.dart';
// 移除旧主题系统，使用 FlexColorScheme 统一主题管理
import '../../core/theme/app_theme_constants.dart';

/// 主题选择器组件 - 支持所有FlexColorScheme官方主题
class ThemeSelectorWidget extends StatefulWidget {
  final ThemeManager themeManager;
  final VoidCallback? onThemeChanged;

  const ThemeSelectorWidget({
    super.key,
    required this.themeManager,
    this.onThemeChanged,
  });

  @override
  State<ThemeSelectorWidget> createState() => _ThemeSelectorWidgetState();
}

class _ThemeSelectorWidgetState extends State<ThemeSelectorWidget>
    with SingleTickerProviderStateMixin {
  TabController? _tabController;
  final Map<String, List<ThemePlaygroundPreset>> _playgroundPresets =
      ThemeManager.presetsByCategory;
  late List<String> _categories;

  @override
  void initState() {
    super.initState();
    _updateCategories();
  }

  void _updateCategories() {
    _categories = _playgroundPresets.keys.toList();

    // 如果已存在TabController，先dispose掉
    _tabController?.dispose();

    _tabController = TabController(length: _categories.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppThemeConstants.radiusXLarge),
        ),
      ),
      child: Column(
        children: [
          // 顶部标题栏
          _buildHeader(context),

          // 主题模式切换
          _buildThemeModeSelector(context),

          // 分类标签栏
          _buildCategoryTabs(context),

          // 主题网格
          Expanded(
            child: _buildThemeGrid(context),
          ),
        ],
      ),
    );
  }

  /// 构建标题栏
  Widget _buildHeader(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(AppThemeConstants.spacing20),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppThemeConstants.radiusXLarge),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppThemeConstants.spacing8),
            decoration: BoxDecoration(
              color: colorScheme.primary.withValues(alpha: 0.1),
              borderRadius:
                  BorderRadius.circular(AppThemeConstants.radiusSmall),
            ),
            child: Icon(
              CupertinoIcons.paintbrush_fill,
              color: colorScheme.primary,
              size: AppThemeConstants.iconLarge,
            ),
          ),
          const SizedBox(width: AppThemeConstants.spacing12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '主题选择器',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: AppThemeConstants.spacing4),
                Text(
                  '当前主题：${widget.themeManager.currentThemeName}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(CupertinoIcons.xmark_circle_fill),
            iconSize: AppThemeConstants.iconLarge,
            color: colorScheme.onSurfaceVariant,
          ),
        ],
      ),
    );
  }

  /// 构建主题模式选择器
  Widget _buildThemeModeSelector(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      margin: const EdgeInsets.all(AppThemeConstants.spacing16),
      padding: const EdgeInsets.all(AppThemeConstants.spacing4),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppThemeConstants.radiusMedium),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildModeButton(
              context,
              ThemeMode.light,
              CupertinoIcons.sun_max_fill,
              '亮色',
            ),
          ),
          Expanded(
            child: _buildModeButton(
              context,
              ThemeMode.dark,
              CupertinoIcons.moon_fill,
              '暗色',
            ),
          ),
          Expanded(
            child: _buildModeButton(
              context,
              ThemeMode.system,
              CupertinoIcons.device_phone_portrait,
              '跟随系统',
            ),
          ),
        ],
      ),
    );
  }

  /// 构建单个模式按钮
  Widget _buildModeButton(
    BuildContext context,
    ThemeMode mode,
    IconData icon,
    String label,
  ) {
    final colorScheme = Theme.of(context).colorScheme;
    final isSelected = widget.themeManager.themeMode == mode;

    return GestureDetector(
      onTap: () {
        widget.themeManager.setThemeMode(mode);
        widget.onThemeChanged?.call();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppThemeConstants.spacing8,
          vertical: AppThemeConstants.spacing12,
        ),
        decoration: BoxDecoration(
          color: isSelected
              ? colorScheme.primary.withValues(alpha: 0.1)
              : Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(AppThemeConstants.radiusSmall),
          border: isSelected
              ? Border.all(color: colorScheme.primary, width: 2)
              : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected
                  ? colorScheme.primary
                  : colorScheme.onSurfaceVariant,
              size: AppThemeConstants.iconMedium,
            ),
            const SizedBox(height: AppThemeConstants.spacing4),
            Text(
              label,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: isSelected
                    ? colorScheme.primary
                    : colorScheme.onSurfaceVariant,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建分类标签栏
  Widget _buildCategoryTabs(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    if (_tabController == null || _categories.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      height: 48,
      margin:
          const EdgeInsets.symmetric(horizontal: AppThemeConstants.spacing16),
      child: TabBar(
        controller: _tabController!,
        isScrollable: true,
        labelColor: colorScheme.primary,
        unselectedLabelColor: colorScheme.onSurfaceVariant,
        labelStyle: Theme.of(context).textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: Theme.of(context).textTheme.labelLarge,
        indicator: BoxDecoration(
          color: colorScheme.primary.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(AppThemeConstants.radiusSmall),
        ),
        indicatorPadding: const EdgeInsets.symmetric(
          horizontal: AppThemeConstants.spacing4,
          vertical: AppThemeConstants.spacing4,
        ),
        tabs: _categories.map((category) => Tab(text: category)).toList(),
      ),
    );
  }

  /// 构建主题网格
  Widget _buildThemeGrid(BuildContext context) {
    if (_tabController == null || _categories.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    return TabBarView(
      controller: _tabController!,
      children: _categories.map((category) {
        final presets = _playgroundPresets[category]!;
        return _buildPlaygroundPresetsGrid(context, presets);
      }).toList(),
    );
  }

  /// 构建 Playground 预设网格
  Widget _buildPlaygroundPresetsGrid(
      BuildContext context, List<ThemePlaygroundPreset> presets) {
    return Padding(
      padding: const EdgeInsets.all(AppThemeConstants.spacing16),
      child: GridView.builder(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 1,
          crossAxisSpacing: AppThemeConstants.spacing12,
          mainAxisSpacing: AppThemeConstants.spacing16,
          childAspectRatio: 2.5,
        ),
        itemCount: presets.length,
        itemBuilder: (context, index) {
          final preset = presets[index];
          return _buildPlaygroundPresetCard(context, preset);
        },
      ),
    );
  }

  /// 构建单个预设卡片
  Widget _buildPlaygroundPresetCard(
      BuildContext context, ThemePlaygroundPreset preset) {
    final isSelected = widget.themeManager.currentScheme == preset.scheme;
    final colorScheme = widget.themeManager.getPreviewColorScheme(
      preset.scheme,
      Theme.of(context).brightness,
    );

    return GestureDetector(
      onTap: () {
        widget.themeManager.applyPlaygroundPreset(preset);
        widget.onThemeChanged?.call();
      },
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppThemeConstants.radiusLarge),
          border: Border.all(
            color: isSelected
                ? colorScheme.primary
                : Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
            width: isSelected ? 3 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: colorScheme.primary.withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Row(
          children: [
            // 左侧颜色预览
            Expanded(
              flex: 1,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: const BorderRadius.horizontal(
                    left: Radius.circular(AppThemeConstants.radiusLarge),
                  ),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      colorScheme.primary,
                      colorScheme.secondary,
                      colorScheme.tertiary,
                    ],
                  ),
                ),
                child: Column(
                  children: [
                    // 顶部颜色条纹
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          color: colorScheme.primary,
                          borderRadius: const BorderRadius.only(
                            topLeft:
                                Radius.circular(AppThemeConstants.radiusLarge),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Container(color: colorScheme.secondary),
                    ),
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          color: colorScheme.tertiary,
                          borderRadius: const BorderRadius.only(
                            bottomLeft:
                                Radius.circular(AppThemeConstants.radiusLarge),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 右侧信息区域
            Expanded(
              flex: 2,
              child: Container(
                padding: const EdgeInsets.all(AppThemeConstants.spacing16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: const BorderRadius.horizontal(
                    right: Radius.circular(AppThemeConstants.radiusLarge),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // 主题名称
                    Text(
                      preset.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight:
                            isSelected ? FontWeight.bold : FontWeight.w600,
                        color: isSelected
                            ? colorScheme.primary
                            : Theme.of(context).colorScheme.onSurface,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: AppThemeConstants.spacing4),

                    // 主题描述
                    Text(
                      preset.description,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: AppThemeConstants.spacing8),

                    // 配置信息
                    Wrap(
                      spacing: AppThemeConstants.spacing8,
                      children: [
                        _buildConfigChip(
                            context,
                            'R${preset.defaultRadius.toInt()}',
                            colorScheme.tertiary),
                        _buildConfigChip(context, 'B${preset.blendLevel}',
                            colorScheme.secondary),
                        if (isSelected)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppThemeConstants.spacing6,
                              vertical: AppThemeConstants.spacing2,
                            ),
                            decoration: BoxDecoration(
                              color: colorScheme.primary,
                              borderRadius: BorderRadius.circular(
                                  AppThemeConstants.radiusSmall),
                            ),
                            child: Icon(
                              CupertinoIcons.checkmark,
                              color: Theme.of(context).colorScheme.onPrimary,
                              size: AppThemeConstants.iconSmall,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建配置芯片
  Widget _buildConfigChip(BuildContext context, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppThemeConstants.spacing6,
        vertical: AppThemeConstants.spacing2,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppThemeConstants.radiusSmall),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

/// 显示主题选择器的便捷方法
void showThemeSelector(BuildContext context, ThemeManager themeManager) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor:
        Theme.of(context).colorScheme.surface.withValues(alpha: 0.0),
    builder: (context) => ThemeSelectorWidget(
      themeManager: themeManager,
      onThemeChanged: () {
        // 可以在这里添加主题切换后的回调逻辑
      },
    ),
  );
}
