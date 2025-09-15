import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 简化的 Cupertino 主题管理器
/// 专注于 iOS 原生体验，移除复杂的 Material 依赖
class CupertinoThemeManager extends ChangeNotifier {
  static const String _themeModeKey = 'cupertino_theme_mode';
  static const String _primaryColorKey = 'cupertino_primary_color';
  
  ThemeMode _themeMode = ThemeMode.system;
  Color _primaryColor = CupertinoColors.systemBlue;
  
  ThemeMode get themeMode => _themeMode;
  Color get primaryColor => _primaryColor;
  
  /// 可用的主色调方案
  static const List<CupertinoColorScheme> availableColors = [
    CupertinoColorScheme(
      color: CupertinoColors.systemBlue,
      name: '系统蓝',
      description: 'iOS 标准蓝色',
    ),
    CupertinoColorScheme(
      color: CupertinoColors.systemGreen,
      name: '系统绿',
      description: 'iOS 标准绿色',
    ),
    CupertinoColorScheme(
      color: CupertinoColors.systemIndigo,
      name: '靛蓝',
      description: 'iOS 靛蓝色',
    ),
    CupertinoColorScheme(
      color: CupertinoColors.systemOrange,
      name: '橙色',
      description: 'iOS 橙色',
    ),
    CupertinoColorScheme(
      color: CupertinoColors.systemPink,
      name: '粉色',
      description: 'iOS 粉色',
    ),
    CupertinoColorScheme(
      color: CupertinoColors.systemPurple,
      name: '紫色',
      description: 'iOS 紫色',
    ),
    CupertinoColorScheme(
      color: CupertinoColors.systemRed,
      name: '红色',
      description: 'iOS 红色',
    ),
    CupertinoColorScheme(
      color: CupertinoColors.systemTeal,
      name: '青色',
      description: 'iOS 青色',
    ),
    CupertinoColorScheme(
      color: CupertinoColors.systemYellow,
      name: '黄色',
      description: 'iOS 黄色',
    ),
  ];
  
  /// 初始化主题管理器
  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    
    // 加载主题模式
    final savedMode = prefs.getString(_themeModeKey);
    if (savedMode != null) {
      _themeMode = ThemeMode.values.firstWhere(
        (m) => m.name == savedMode,
        orElse: () => ThemeMode.system,
      );
    }
    
    // 加载主色调
    final savedColorIndex = prefs.getInt(_primaryColorKey);
    if (savedColorIndex != null && 
        savedColorIndex >= 0 && 
        savedColorIndex < availableColors.length) {
      _primaryColor = availableColors[savedColorIndex].color;
    }
    
    notifyListeners();
  }
  
  /// 切换主题模式
  Future<void> setThemeMode(ThemeMode mode) async {
    if (_themeMode != mode) {
      _themeMode = mode;
      await _saveThemeMode();
      notifyListeners();
    }
  }
  
  /// 设置主色调
  Future<void> setPrimaryColor(Color color) async {
    if (_primaryColor != color) {
      _primaryColor = color;
      await _savePrimaryColor();
      notifyListeners();
    }
  }
  
  /// 获取当前主题数据
  CupertinoThemeData get themeData {
    final isDark = _isDarkMode();
    
    return CupertinoThemeData(
      brightness: isDark ? Brightness.dark : Brightness.light,
      primaryColor: _primaryColor,
      primaryContrastingColor: isDark 
          ? CupertinoColors.white 
          : CupertinoColors.black,
      scaffoldBackgroundColor: isDark 
          ? CupertinoColors.black 
          : CupertinoColors.systemBackground,
      barBackgroundColor: isDark 
          ? CupertinoColors.systemGrey6.darkColor 
          : CupertinoColors.systemBackground,
      textTheme: CupertinoTextThemeData(
        primaryColor: isDark 
            ? CupertinoColors.white 
            : CupertinoColors.black,
        textStyle: TextStyle(
          color: isDark 
              ? CupertinoColors.white 
              : CupertinoColors.black,
          fontSize: 17,
          letterSpacing: -0.41,
        ),
        actionTextStyle: TextStyle(
          color: _primaryColor,
          fontSize: 17,
          letterSpacing: -0.41,
        ),
        tabLabelTextStyle: TextStyle(
          color: isDark 
              ? CupertinoColors.white 
              : CupertinoColors.black,
          fontSize: 10,
          letterSpacing: -0.24,
        ),
        navTitleTextStyle: TextStyle(
          color: isDark 
              ? CupertinoColors.white 
              : CupertinoColors.black,
          fontSize: 17,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.41,
        ),
        navLargeTitleTextStyle: TextStyle(
          color: isDark 
              ? CupertinoColors.white 
              : CupertinoColors.black,
          fontSize: 34,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.41,
        ),
        navActionTextStyle: TextStyle(
          color: _primaryColor,
          fontSize: 17,
          letterSpacing: -0.41,
        ),
      ),
    );
  }
  
  /// 判断当前是否为深色模式
  bool _isDarkMode() {
    switch (_themeMode) {
      case ThemeMode.dark:
        return true;
      case ThemeMode.light:
        return false;
      case ThemeMode.system:
        return WidgetsBinding.instance.platformDispatcher.platformBrightness == Brightness.dark;
    }
  }
  
  /// 保存主题模式
  Future<void> _saveThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_themeModeKey, _themeMode.name);
  }
  
  /// 保存主色调
  Future<void> _savePrimaryColor() async {
    final prefs = await SharedPreferences.getInstance();
    final index = availableColors.indexWhere((c) => c.color == _primaryColor);
    await prefs.setInt(_primaryColorKey, index);
  }
  
  /// 获取当前主色调名称
  String get currentColorName {
    final scheme = availableColors.firstWhere(
      (c) => c.color == _primaryColor,
      orElse: () => availableColors.first,
    );
    return scheme.name;
  }
  
  /// 获取兼容 Material ColorScheme 的颜色方案（用于过渡期）
  ColorScheme get materialColorScheme {
    final isDark = _isDarkMode();
    
    if (isDark) {
      return const ColorScheme.dark(
        primary: CupertinoColors.systemBlue,
        onPrimary: CupertinoColors.white,
        surface: CupertinoColors.black,
        onSurface: CupertinoColors.white,
        surfaceContainerHighest: CupertinoColors.systemGrey6,
        onSurfaceVariant: CupertinoColors.systemGrey,
      );
    } else {
      return const ColorScheme.light(
        primary: CupertinoColors.systemBlue,
        onPrimary: CupertinoColors.white,
        surface: CupertinoColors.systemBackground,
        onSurface: CupertinoColors.black,
        surfaceContainerHighest: CupertinoColors.systemGrey6,
        onSurfaceVariant: CupertinoColors.systemGrey,
      );
    }
  }
}

/// Cupertino 颜色方案配置
class CupertinoColorScheme {
  const CupertinoColorScheme({
    required this.color,
    required this.name,
    required this.description,
  });
  
  final Color color;
  final String name;
  final String description;
}