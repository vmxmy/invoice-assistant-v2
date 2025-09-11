import '../utils/logger.dart';
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flex_color_scheme/flex_color_scheme.dart';

/// 主题预设管理器 - 负责加载和管理外部配置文件中的主题预设
class ThemePresetManager {
  static const String _presetFile = 'assets/theme_presets.json';
  
  static List<ThemePlaygroundPreset> _presets = [];
  static bool _isLoaded = false;
  
  /// 获取所有预设
  static List<ThemePlaygroundPreset> get presets => List.unmodifiable(_presets);
  
  /// 按分类获取预设
  static Map<String, List<ThemePlaygroundPreset>> get presetsByCategory {
    final Map<String, List<ThemePlaygroundPreset>> grouped = {};
    for (final preset in _presets) {
      grouped.putIfAbsent(preset.category, () => []).add(preset);
    }
    return grouped;
  }
  
  /// 从配置文件加载预设
  static Future<void> loadPresets() async {
    if (_isLoaded) return;
    
    try {
      final String jsonString = await rootBundle.loadString(_presetFile);
      final Map<String, dynamic> config = json.decode(jsonString);
      
      final List<dynamic> presetsData = config['presets'] ?? [];
      _presets = presetsData.map((data) => ThemePlaygroundPreset.fromJson(data)).toList();
      
      _isLoaded = true;
      AppLogger.debug('✅ 加载了 ${_presets.length} 个主题预设', tag: 'Debug');
    } catch (e) {
      AppLogger.debug('❌ 加载主题预设失败: $e', tag: 'Debug');
      _presets = [];
      _isLoaded = true;
    }
  }
  
  /// 重新加载预设（用于开发时热重载）
  static Future<void> reloadPresets() async {
    _isLoaded = false;
    await loadPresets();
  }
  
  /// 检查是否已加载
  static bool get isLoaded => _isLoaded;
  
  /// 获取预设总数
  static int get presetCount => _presets.length;
  
  /// 根据名称查找预设
  static ThemePlaygroundPreset? findPresetByName(String name) {
    try {
      return _presets.firstWhere((preset) => preset.name == name);
    } catch (e) {
      return null;
    }
  }
  
  /// 根据 scheme 查找预设
  static List<ThemePlaygroundPreset> findPresetsByScheme(FlexScheme scheme) {
    return _presets.where((preset) => preset.scheme == scheme).toList();
  }
}

/// Themes Playground 预设配置类 - 支持 JSON 序列化
class ThemePlaygroundPreset {
  const ThemePlaygroundPreset({
    required this.name,
    required this.description,
    required this.scheme,
    required this.surfaceMode,
    required this.blendLevel,
    required this.appBarStyle,
    required this.defaultRadius,
    required this.category,
    this.author,
    this.tags = const [],
    // 高级 SubThemes 配置
    this.interactionEffects = true,
    this.tintedDisabledControls = true,
    this.blendOnColors = false,
    this.useM2StyleDividerInM3 = true,
    this.inputDecoratorIsFilled = false,
    this.inputDecoratorBorderType = FlexInputBorderType.outline,
    this.alignedDropdown = true,
    this.navigationRailUseIndicator = false,
    this.useCupertinoOverride = false,
    // 自定义颜色支持
    this.customColors,
  });
  
  final String name;
  final String description;
  final FlexScheme scheme;
  final FlexSurfaceMode surfaceMode;
  final int blendLevel;
  final FlexAppBarStyle appBarStyle;
  final double defaultRadius;
  final String category;
  final String? author;
  final List<String> tags;
  
  // 高级 SubThemes 配置选项
  final bool interactionEffects;
  final bool tintedDisabledControls;
  final bool blendOnColors;
  final bool useM2StyleDividerInM3;
  final bool inputDecoratorIsFilled;
  final FlexInputBorderType inputDecoratorBorderType;
  final bool alignedDropdown;
  final bool navigationRailUseIndicator;
  final bool useCupertinoOverride;
  
  // 自定义颜色配置（当 scheme 为 custom 时使用）
  final Map<String, dynamic>? customColors;
  
  /// 是否使用自定义颜色
  bool get isCustomColors => scheme.name == 'custom' && customColors != null;
  
  /// 创建自定义 FlexSchemeColor（亮色模式）
  FlexSchemeColor? get customFlexSchemeColorLight {
    if (!isCustomColors || customColors == null) return null;
    
    final colors = customColors!;
    return FlexSchemeColor(
      primary: Color(int.parse(colors['primary'] as String)),
      primaryContainer: Color(int.parse(colors['primaryContainer'] as String)),
      secondary: Color(int.parse(colors['secondary'] as String)),
      secondaryContainer: Color(int.parse(colors['secondaryContainer'] as String)),
      tertiary: Color(int.parse(colors['tertiary'] as String)),
      tertiaryContainer: Color(int.parse(colors['tertiaryContainer'] as String)),
      appBarColor: Color(int.parse(colors['appBarColor'] as String)),
      swapOnMaterial3: colors['swapOnMaterial3'] as bool? ?? true,
    );
  }
  
  /// 创建自定义 FlexSchemeColor（暗色模式）
  FlexSchemeColor? get customFlexSchemeColorDark {
    if (!isCustomColors || customColors == null) return null;
    
    final colors = customColors!;
    return FlexSchemeColor(
      primary: Color(int.parse(colors['primaryDark'] as String)),
      primaryContainer: Color(int.parse(colors['primaryContainerDark'] as String)),
      primaryLightRef: Color(int.parse(colors['primaryLightRef'] as String)),
      secondary: Color(int.parse(colors['secondaryDark'] as String)),
      secondaryContainer: Color(int.parse(colors['secondaryContainerDark'] as String)),
      secondaryLightRef: Color(int.parse(colors['secondaryLightRef'] as String)),
      tertiary: Color(int.parse(colors['tertiaryDark'] as String)),
      tertiaryContainer: Color(int.parse(colors['tertiaryContainerDark'] as String)),
      tertiaryLightRef: Color(int.parse(colors['tertiaryLightRef'] as String)),
      appBarColor: Color(int.parse(colors['appBarColorDark'] as String)),
      swapOnMaterial3: colors['swapOnMaterial3'] as bool? ?? true,
    );
  }
  
  /// 从 JSON 创建预设
  factory ThemePlaygroundPreset.fromJson(Map<String, dynamic> json) {
    return ThemePlaygroundPreset(
      name: json['name'] as String,
      description: json['description'] as String,
      scheme: _parseScheme(json['scheme'] as String),
      surfaceMode: _parseSurfaceMode(json['surfaceMode'] as String),
      blendLevel: json['blendLevel'] as int,
      appBarStyle: _parseAppBarStyle(json['appBarStyle'] as String),
      defaultRadius: (json['defaultRadius'] as num).toDouble(),
      category: json['category'] as String,
      author: json['author'] as String?,
      tags: (json['tags'] as List<dynamic>?)?.cast<String>() ?? [],
      // 高级配置选项
      interactionEffects: json['interactionEffects'] as bool? ?? true,
      tintedDisabledControls: json['tintedDisabledControls'] as bool? ?? true,
      blendOnColors: json['blendOnColors'] as bool? ?? false,
      useM2StyleDividerInM3: json['useM2StyleDividerInM3'] as bool? ?? true,
      inputDecoratorIsFilled: json['inputDecoratorIsFilled'] as bool? ?? false,
      inputDecoratorBorderType: _parseInputBorderType(json['inputDecoratorBorderType'] as String?),
      alignedDropdown: json['alignedDropdown'] as bool? ?? true,
      navigationRailUseIndicator: json['navigationRailUseIndicator'] as bool? ?? false,
      useCupertinoOverride: json['useCupertinoOverride'] as bool? ?? false,
      // 自定义颜色配置
      customColors: json['customColors'] as Map<String, dynamic>?,
    );
  }
  
  /// 转换为 JSON
  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
      'scheme': scheme.name,
      'surfaceMode': surfaceMode.name,
      'blendLevel': blendLevel,
      'appBarStyle': appBarStyle.name,
      'defaultRadius': defaultRadius,
      'category': category,
      if (author != null) 'author': author,
      'tags': tags,
      // 高级配置选项
      'interactionEffects': interactionEffects,
      'tintedDisabledControls': tintedDisabledControls,
      'blendOnColors': blendOnColors,
      'useM2StyleDividerInM3': useM2StyleDividerInM3,
      'inputDecoratorIsFilled': inputDecoratorIsFilled,
      'inputDecoratorBorderType': inputDecoratorBorderType.name,
      'alignedDropdown': alignedDropdown,
      'navigationRailUseIndicator': navigationRailUseIndicator,
      'useCupertinoOverride': useCupertinoOverride,
      // 自定义颜色配置
      if (customColors != null) 'customColors': customColors,
    };
  }
  
  /// 解析 FlexScheme
  static FlexScheme _parseScheme(String schemeName) {
    // 对于自定义颜色方案，使用一个占位符方案
    if (schemeName == 'custom') {
      return FlexScheme.material; // 使用 material 作为占位符，实际颜色由 customColors 定义
    }
    
    try {
      return FlexScheme.values.firstWhere((s) => s.name == schemeName);
    } catch (e) {
      AppLogger.debug('⚠️ 未知的 scheme: $schemeName, 使用默认值', tag: 'Debug');
      return FlexScheme.deepBlue;
    }
  }
  
  /// 解析 FlexSurfaceMode
  static FlexSurfaceMode _parseSurfaceMode(String modeName) {
    try {
      return FlexSurfaceMode.values.firstWhere((m) => m.name == modeName);
    } catch (e) {
      AppLogger.debug('⚠️ 未知的 surfaceMode: $modeName, 使用默认值', tag: 'Debug');
      return FlexSurfaceMode.levelSurfacesLowScaffold;
    }
  }
  
  /// 解析 FlexAppBarStyle
  static FlexAppBarStyle _parseAppBarStyle(String styleName) {
    try {
      return FlexAppBarStyle.values.firstWhere((s) => s.name == styleName);
    } catch (e) {
      AppLogger.debug('⚠️ 未知的 appBarStyle: $styleName, 使用默认值', tag: 'Debug');
      return FlexAppBarStyle.primary;
    }
  }
  
  /// 解析 FlexInputBorderType
  static FlexInputBorderType _parseInputBorderType(String? borderTypeName) {
    if (borderTypeName == null) return FlexInputBorderType.outline;
    try {
      return FlexInputBorderType.values.firstWhere((t) => t.name == borderTypeName);
    } catch (e) {
      AppLogger.debug('⚠️ 未知的 inputBorderType: $borderTypeName, 使用默认值', tag: 'Debug');
      return FlexInputBorderType.outline;
    }
  }
  
  @override
  String toString() {
    return 'ThemePlaygroundPreset(name: $name, scheme: ${scheme.name}, category: $category)';
  }
  
  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ThemePlaygroundPreset &&
        other.name == name &&
        other.scheme == scheme;
  }
  
  @override
  int get hashCode => name.hashCode ^ scheme.hashCode;
}