import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'theme_preset_manager.dart';

/// 主题管理器 - 支持FlexColorScheme高级主题配置和自定义设置
class ThemeManager extends ChangeNotifier {
  static const String _themeKey = 'selected_theme';
  static const String _themeModeKey = 'theme_mode';
  static const String _surfaceModeKey = 'surface_mode';
  static const String _blendLevelKey = 'blend_level';
  static const String _appBarStyleKey = 'app_bar_style';
  static const String _useMaterial3Key = 'use_material3';
  static const String _defaultRadiusKey = 'default_radius';
  
  FlexScheme _currentScheme = FlexScheme.deepBlue;
  ThemeMode _themeMode = ThemeMode.system;
  FlexSurfaceMode _surfaceMode = FlexSurfaceMode.levelSurfacesLowScaffold;
  int _blendLevel = 15;
  FlexAppBarStyle _appBarStyle = FlexAppBarStyle.primary;
  bool _useMaterial3 = true;
  double _defaultRadius = 14.0;
  ThemePlaygroundPreset? _currentPreset;
  
  FlexScheme get currentScheme => _currentScheme;
  ThemeMode get themeMode => _themeMode;
  FlexSurfaceMode get surfaceMode => _surfaceMode;
  int get blendLevel => _blendLevel;
  FlexAppBarStyle get appBarStyle => _appBarStyle;
  bool get useMaterial3 => _useMaterial3;
  double get defaultRadius => _defaultRadius;
  
  /// 获取当前主题的显示名称
  String get currentThemeName => _getThemeDisplayName(_currentScheme);
  
  /// 获取预设主题（从配置文件加载）
  static List<ThemePlaygroundPreset> get playgroundPresets => ThemePresetManager.presets;
  
  /// 按分类获取预设主题
  static Map<String, List<ThemePlaygroundPreset>> get presetsByCategory => ThemePresetManager.presetsByCategory;
  
  /// 所有可用的主题配置
  static const List<ThemeConfig> availableThemes = [
    // Material主题系列
    ThemeConfig(
      scheme: FlexScheme.material,
      name: 'Material默认',
      description: 'Google Material Design 默认配色',
      category: 'Material',
    ),
    ThemeConfig(
      scheme: FlexScheme.materialHc,
      name: 'Material高对比度',
      description: 'Material Design 高对比度版本',
      category: 'Material',
    ),
    
    // 蓝色系列
    ThemeConfig(
      scheme: FlexScheme.blue,
      name: '经典蓝',
      description: '经典的蓝色配色方案',
      category: '蓝色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.indigo,
      name: '靛蓝',
      description: '深邃的靛蓝色调',
      category: '蓝色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.hippieBlue,
      name: '嬉皮蓝',
      description: '活泼的嬉皮蓝色',
      category: '蓝色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.aquaBlue,
      name: '水蓝',
      description: '清新的水蓝色',
      category: '蓝色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.brandBlue,
      name: '品牌蓝',
      description: '专业的品牌蓝色',
      category: '蓝色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.deepBlue,
      name: '深蓝海洋',
      description: '深邃的海洋蓝色（当前使用）',
      category: '蓝色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.sakura,
      name: '樱花蓝',
      description: '优雅的樱花蓝',
      category: '蓝色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.mandyRed,
      name: '曼迪红',
      description: '温暖的曼迪红色',
      category: '蓝色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.red,
      name: '经典红',
      description: '经典的红色配色',
      category: '红色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.redWine,
      name: '红酒',
      description: '深沉的红酒色',
      category: '红色系',
    ),
    
    // 绿色系列
    ThemeConfig(
      scheme: FlexScheme.purpleM3,
      name: 'Material 3紫',
      description: 'Material 3 紫色主题',
      category: '紫色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.green,
      name: '经典绿',
      description: '经典的绿色配色',
      category: '绿色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.money,
      name: '金钱绿',
      description: '象征财富的绿色',
      category: '绿色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.jungle,
      name: '丛林绿',
      description: '自然的丛林绿色',
      category: '绿色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.greyLaw,
      name: '法律灰',
      description: '专业的法律灰色',
      category: '绿色系',
    ),
    
    // 暖色系列
    ThemeConfig(
      scheme: FlexScheme.wasabi,
      name: '芥末绿',
      description: '独特的芥末绿色',
      category: '暖色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.gold,
      name: '黄金',
      description: '奢华的黄金色',
      category: '暖色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.mango,
      name: '芒果橙',
      description: '热带芒果橙色',
      category: '暖色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.amber,
      name: '琥珀黄',
      description: '温暖的琥珀黄',
      category: '暖色系',
    ),
    
    // 冷色系列
    ThemeConfig(
      scheme: FlexScheme.vesuviusBurn,
      name: '维苏威火山',
      description: '火山灰的冷峻色调',
      category: '冷色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.deepPurple,
      name: '深紫',
      description: '神秘的深紫色',
      category: '冷色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.ebonyClay,
      name: '乌木粘土',
      description: '沉稳的乌木色',
      category: '冷色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.barossa,
      name: '巴罗莎',
      description: '优雅的巴罗莎色',
      category: '冷色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.shark,
      name: '鲨鱼灰',
      description: '现代的鲨鱼灰',
      category: '冷色系',
    ),
    ThemeConfig(
      scheme: FlexScheme.bigStone,
      name: '巨石灰',
      description: '坚实的巨石灰',
      category: '冷色系',
    ),
    
    // 特殊主题
    ThemeConfig(
      scheme: FlexScheme.damask,
      name: '锦缎',
      description: '华丽的锦缎色彩',
      category: '特殊',
    ),
    ThemeConfig(
      scheme: FlexScheme.bahamaBlue,
      name: '巴哈马蓝',
      description: '热带海洋蓝',
      category: '特殊',
    ),
    ThemeConfig(
      scheme: FlexScheme.mallardGreen,
      name: '野鸭绿',
      description: '自然野鸭绿',
      category: '特殊',
    ),
    ThemeConfig(
      scheme: FlexScheme.espresso,
      name: '浓缩咖啡',
      description: '浓郁的咖啡色',
      category: '特殊',
    ),
    ThemeConfig(
      scheme: FlexScheme.outerSpace,
      name: '外太空',
      description: '神秘的外太空色',
      category: '特殊',
    ),
    ThemeConfig(
      scheme: FlexScheme.blueWhale,
      name: '蓝鲸',
      description: '深邃的蓝鲸色',
      category: '特殊',
    ),
    ThemeConfig(
      scheme: FlexScheme.sanJuanBlue,
      name: '圣胡安蓝',
      description: '优雅的圣胡安蓝',
      category: '特殊',
    ),
    ThemeConfig(
      scheme: FlexScheme.rosewood,
      name: '红木',
      description: '经典的红木色',
      category: '特殊',
    ),
    ThemeConfig(
      scheme: FlexScheme.blumineBlue,
      name: '蓝铜矿蓝',
      description: '稀有的蓝铜矿色',
      category: '特殊',
    ),
  ];
  
  /// 根据分类获取主题列表
  static Map<String, List<ThemeConfig>> get themesByCategory {
    final Map<String, List<ThemeConfig>> grouped = {};
    for (final theme in availableThemes) {
      grouped.putIfAbsent(theme.category, () => []).add(theme);
    }
    return grouped;
  }
  
  /// 初始化主题管理器
  Future<void> initialize() async {
    // 首先加载预设配置
    await ThemePresetManager.loadPresets();
    
    final prefs = await SharedPreferences.getInstance();
    
    // 加载保存的主题
    final savedTheme = prefs.getString(_themeKey);
    if (savedTheme != null) {
      final scheme = FlexScheme.values.firstWhere(
        (s) => s.name == savedTheme,
        orElse: () => FlexScheme.deepBlue,
      );
      _currentScheme = scheme;
    }
    
    // 加载保存的主题模式
    final savedMode = prefs.getString(_themeModeKey);
    if (savedMode != null) {
      _themeMode = ThemeMode.values.firstWhere(
        (m) => m.name == savedMode,
        orElse: () => ThemeMode.system,
      );
    }
    
    // 加载表面模式
    final savedSurfaceMode = prefs.getString(_surfaceModeKey);
    if (savedSurfaceMode != null) {
      _surfaceMode = FlexSurfaceMode.values.firstWhere(
        (m) => m.name == savedSurfaceMode,
        orElse: () => FlexSurfaceMode.levelSurfacesLowScaffold,
      );
    }
    
    // 加载混合级别
    _blendLevel = prefs.getInt(_blendLevelKey) ?? 15;
    
    // 加载应用栏样式
    final savedAppBarStyle = prefs.getString(_appBarStyleKey);
    if (savedAppBarStyle != null) {
      _appBarStyle = FlexAppBarStyle.values.firstWhere(
        (s) => s.name == savedAppBarStyle,
        orElse: () => FlexAppBarStyle.primary,
      );
    }
    
    // 加载Material 3设置
    _useMaterial3 = prefs.getBool(_useMaterial3Key) ?? true;
    
    // 加载默认圆角
    _defaultRadius = prefs.getDouble(_defaultRadiusKey) ?? 14.0;
    
    notifyListeners();
  }
  
  /// 切换主题
  Future<void> setTheme(FlexScheme scheme) async {
    if (_currentScheme != scheme) {
      _currentScheme = scheme;
      await _saveTheme();
      notifyListeners();
    }
  }
  
  /// 切换主题模式（亮色/暗色/系统）
  Future<void> setThemeMode(ThemeMode mode) async {
    if (_themeMode != mode) {
      _themeMode = mode;
      await _saveThemeMode();
      notifyListeners();
    }
  }
  
  /// 应用 Themes Playground 预设配置
  Future<void> applyPlaygroundPreset(ThemePlaygroundPreset preset) async {
    _currentScheme = preset.scheme;
    _surfaceMode = preset.surfaceMode;
    _blendLevel = preset.blendLevel;
    _appBarStyle = preset.appBarStyle;
    _defaultRadius = preset.defaultRadius;
    
    // 保存当前应用的预设，用于主题创建时参考
    _currentPreset = preset;
    
    await _saveAllSettings();
    notifyListeners();
  }
  
  /// 自定义主题设置
  Future<void> setSurfaceMode(FlexSurfaceMode mode) async {
    if (_surfaceMode != mode) {
      _surfaceMode = mode;
      await _saveSurfaceMode();
      notifyListeners();
    }
  }
  
  Future<void> setBlendLevel(int level) async {
    if (_blendLevel != level) {
      _blendLevel = level;
      await _saveBlendLevel();
      notifyListeners();
    }
  }
  
  Future<void> setAppBarStyle(FlexAppBarStyle style) async {
    if (_appBarStyle != style) {
      _appBarStyle = style;
      await _saveAppBarStyle();
      notifyListeners();
    }
  }
  
  Future<void> setDefaultRadius(double radius) async {
    if (_defaultRadius != radius) {
      _defaultRadius = radius;
      await _saveDefaultRadius();
      notifyListeners();
    }
  }
  
  /// 保存主题到本地存储
  Future<void> _saveTheme() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_themeKey, _currentScheme.name);
  }
  
  /// 保存主题模式到本地存储
  Future<void> _saveThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_themeModeKey, _themeMode.name);
  }
  
  /// 保存所有设置
  Future<void> _saveAllSettings() async {
    final prefs = await SharedPreferences.getInstance();
    await Future.wait([
      prefs.setString(_themeKey, _currentScheme.name),
      prefs.setString(_surfaceModeKey, _surfaceMode.name),
      prefs.setInt(_blendLevelKey, _blendLevel),
      prefs.setString(_appBarStyleKey, _appBarStyle.name),
      prefs.setBool(_useMaterial3Key, _useMaterial3),
      prefs.setDouble(_defaultRadiusKey, _defaultRadius),
    ]);
  }
  
  /// 保存表面模式
  Future<void> _saveSurfaceMode() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_surfaceModeKey, _surfaceMode.name);
  }
  
  /// 保存混合级别
  Future<void> _saveBlendLevel() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_blendLevelKey, _blendLevel);
  }
  
  /// 保存应用栏样式
  Future<void> _saveAppBarStyle() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_appBarStyleKey, _appBarStyle.name);
  }
  
  /// 保存默认圆角
  Future<void> _saveDefaultRadius() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_defaultRadiusKey, _defaultRadius);
  }
  
  /// 获取亮色主题
  ThemeData get lightTheme => _createTheme(Brightness.light);
  
  /// 获取暗色主题
  ThemeData get darkTheme => _createTheme(Brightness.dark);
  
  /// 创建主题
  ThemeData _createTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    
    if (isDark) {
      // 检查是否使用自定义颜色
      if (_currentPreset?.isCustomColors == true) {
        return FlexThemeData.dark(
          colors: _currentPreset!.customFlexSchemeColorDark,
          surfaceMode: FlexSurfaceMode.levelSurfacesLowScaffold,
          blendLevel: 22,
          appBarStyle: FlexAppBarStyle.background,
          appBarOpacity: 0.94,
          transparentStatusBar: true,
          appBarElevation: 0,
          fontFamily: null,
          subThemesData: FlexSubThemesData(
            blendOnLevel: 25,
            blendOnColors: false,
            useMaterial3Typography: true,
            useM2StyleDividerInM3: true,
            alignedDropdown: true,
            useInputDecoratorThemeInDialogs: true,
            defaultRadius: 14.0,
            cardRadius: 18.0,
            elevatedButtonRadius: 12.0,
            filledButtonRadius: 12.0,
            outlinedButtonRadius: 12.0,
            textButtonRadius: 12.0,
            inputDecoratorRadius: 14.0,
            dialogRadius: 20.0,
            bottomSheetRadius: 24.0,
            bottomNavigationBarElevation: 6.0,
            navigationBarLabelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            navigationBarOpacity: 0.93,
            interactionEffects: true,
            tintedDisabledControls: true,
            fabUseShape: true,
            fabAlwaysCircular: true,
            fabRadius: 16.0,
            adaptiveRemoveElevationTint: FlexAdaptive.off(),
            adaptiveElevationShadowsBack: FlexAdaptive.off(),
          ),
          keyColors: const FlexKeyColors(
            useSecondary: true,
            useTertiary: true,
            keepPrimary: true,
            keepSecondary: true,
            keepTertiary: true,
          ),
          visualDensity: FlexColorScheme.comfortablePlatformDensity,
          useMaterial3: _useMaterial3,
          swapLegacyOnMaterial3: true,
          // 支持Cupertino主题覆盖（当预设启用时）
          cupertinoOverrideTheme: (_currentPreset?.useCupertinoOverride ?? false)
            ? const CupertinoThemeData(applyThemeToAll: true)
            : null,
        );
      } else {
        return FlexThemeData.dark(
          scheme: _currentScheme,
          surfaceMode: FlexSurfaceMode.levelSurfacesLowScaffold,
          blendLevel: 22,
          appBarStyle: FlexAppBarStyle.background,
          appBarOpacity: 0.94,
          transparentStatusBar: true,
          appBarElevation: 0,
          fontFamily: null,
          subThemesData: FlexSubThemesData(
            blendOnLevel: 25,
            blendOnColors: false,
            useMaterial3Typography: true,
            useM2StyleDividerInM3: true,
            alignedDropdown: true,
            useInputDecoratorThemeInDialogs: true,
            defaultRadius: 14.0,
            cardRadius: 18.0,
            elevatedButtonRadius: 12.0,
            filledButtonRadius: 12.0,
            outlinedButtonRadius: 12.0,
            textButtonRadius: 12.0,
            inputDecoratorRadius: 14.0,
            dialogRadius: 20.0,
            bottomSheetRadius: 24.0,
            bottomNavigationBarElevation: 6.0,
            navigationBarLabelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            navigationBarOpacity: 0.93,
            interactionEffects: true,
            tintedDisabledControls: true,
            fabUseShape: true,
            fabAlwaysCircular: true,
            fabRadius: 16.0,
            adaptiveRemoveElevationTint: FlexAdaptive.off(),
            adaptiveElevationShadowsBack: FlexAdaptive.off(),
          ),
          keyColors: const FlexKeyColors(
            useSecondary: true,
            useTertiary: true,
            keepPrimary: true,
            keepSecondary: true,
            keepTertiary: true,
          ),
          visualDensity: FlexColorScheme.comfortablePlatformDensity,
          useMaterial3: _useMaterial3,
          swapLegacyOnMaterial3: true,
          // 支持Cupertino主题覆盖（当预设启用时）
          cupertinoOverrideTheme: (_currentPreset?.useCupertinoOverride ?? false)
            ? const CupertinoThemeData(applyThemeToAll: true)
            : null,
        );
      }
    }
    
    return FlexThemeData.light(
      scheme: _currentScheme,
      surfaceMode: _surfaceMode,
      blendLevel: _blendLevel,
      appBarStyle: _appBarStyle,
      appBarOpacity: isDark ? 0.94 : 0.96,
      transparentStatusBar: true,
      appBarElevation: isDark ? 0 : 0.5,
      fontFamily: null, // 使用系统默认字体
      subThemesData: FlexSubThemesData(
        blendOnLevel: isDark ? 25 : 12,
        blendOnColors: _currentPreset?.blendOnColors ?? false,
        useMaterial3Typography: true,
        useM2StyleDividerInM3: _currentPreset?.useM2StyleDividerInM3 ?? true,
        alignedDropdown: _currentPreset?.alignedDropdown ?? true,
        useInputDecoratorThemeInDialogs: true,
        inputDecoratorIsFilled: _currentPreset?.inputDecoratorIsFilled ?? false,
        inputDecoratorBorderType: _currentPreset?.inputDecoratorBorderType ?? FlexInputBorderType.outline,
        navigationRailUseIndicator: _currentPreset?.navigationRailUseIndicator ?? false,
        defaultRadius: _defaultRadius,
        cardRadius: _defaultRadius + 4.0,
        elevatedButtonRadius: _defaultRadius - 2.0,
        filledButtonRadius: _defaultRadius - 2.0,
        outlinedButtonRadius: _defaultRadius - 2.0,
        textButtonRadius: _defaultRadius - 2.0,
        inputDecoratorRadius: _defaultRadius,
        dialogRadius: _defaultRadius + 6.0,
        bottomSheetRadius: _defaultRadius + 10.0,
        bottomNavigationBarElevation: isDark ? 6.0 : 8.0,
        navigationBarLabelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        navigationBarOpacity: isDark ? 0.93 : 0.96,
        interactionEffects: _currentPreset?.interactionEffects ?? true,
        tintedDisabledControls: _currentPreset?.tintedDisabledControls ?? true,
        fabUseShape: true,
        fabAlwaysCircular: true,
        fabRadius: 16.0,
        adaptiveRemoveElevationTint: FlexAdaptive.off(),
        adaptiveElevationShadowsBack: FlexAdaptive.off(),
      ),
      keyColors: const FlexKeyColors(
        useSecondary: true,
        useTertiary: true,
        keepPrimary: true,
        keepSecondary: true,
        keepTertiary: true,
      ),
      visualDensity: FlexColorScheme.comfortablePlatformDensity,
      useMaterial3: true,
      swapLegacyOnMaterial3: true,
      // 支持Cupertino主题覆盖（当预设启用时）
      cupertinoOverrideTheme: (_currentPreset?.useCupertinoOverride ?? false)
        ? const CupertinoThemeData(applyThemeToAll: true)
        : null,
    );
  }
  
  /// 获取主题显示名称
  String _getThemeDisplayName(FlexScheme scheme) {
    final config = availableThemes.firstWhere(
      (t) => t.scheme == scheme,
      orElse: () => const ThemeConfig(
        scheme: FlexScheme.deepBlue,
        name: '深蓝海洋',
        description: '',
        category: '',
      ),
    );
    return config.name;
  }
  
  /// 获取主题描述
  String getThemeDescription(FlexScheme scheme) {
    final config = availableThemes.firstWhere(
      (t) => t.scheme == scheme,
      orElse: () => const ThemeConfig(
        scheme: FlexScheme.deepBlue,
        name: '深蓝海洋',
        description: '深邃的海洋蓝色',
        category: '',
      ),
    );
    return config.description;
  }
  
  /// 预览主题颜色
  ColorScheme getPreviewColorScheme(FlexScheme scheme, Brightness brightness) {
    final themeData = FlexThemeData.light(
      scheme: scheme,
      useMaterial3: true,
    );
    return brightness == Brightness.dark 
      ? FlexThemeData.dark(scheme: scheme, useMaterial3: true).colorScheme
      : themeData.colorScheme;
  }
  
  /// 从 Themes Playground URL 解析配置
  static ThemePlaygroundPreset? parsePlaygroundUrl(String url) {
    try {
      final uri = Uri.parse(url);
      final config = uri.queryParameters['config'];
      if (config == null) return null;
      
      // 在实际应用中，这里会解码 Base64 + gzip 数据
      // 目前我们使用您提供的配置创建一个预设
      return const ThemePlaygroundPreset(
        name: 'Playground 导入',
        description: '从 Themes Playground 导入的配置',
        scheme: FlexScheme.hippieBlue, // schemeIndex: 7
        surfaceMode: FlexSurfaceMode.levelSurfacesLowScaffold,
        blendLevel: 18,
        appBarStyle: FlexAppBarStyle.primary,
        defaultRadius: 16.0,
        category: 'Import',
      );
    } catch (e) {
      return null;
    }
  }
}

/// 主题配置类
class ThemeConfig {
  const ThemeConfig({
    required this.scheme,
    required this.name,
    required this.description,
    required this.category,
  });
  
  final FlexScheme scheme;
  final String name;
  final String description;
  final String category;
}

