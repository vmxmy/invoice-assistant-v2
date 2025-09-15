import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart'; // ⚠️ 需要保留：使用 ColorScheme, ThemeMode, Brightness 类
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
      primaryContrastingColor:
          isDark ? CupertinoColors.white : CupertinoColors.black,
      scaffoldBackgroundColor:
          isDark ? CupertinoColors.black : CupertinoColors.systemBackground,
      barBackgroundColor: isDark
          ? CupertinoColors.systemGrey6.darkColor
          : CupertinoColors.systemBackground,
      textTheme: CupertinoTextThemeData(
        primaryColor: isDark ? CupertinoColors.white : CupertinoColors.black,
        textStyle: TextStyle(
          color: isDark ? CupertinoColors.white : CupertinoColors.black,
          fontSize: 17,
          letterSpacing: -0.41,
        ),
        actionTextStyle: TextStyle(
          color: _primaryColor,
          fontSize: 17,
          letterSpacing: -0.41,
        ),
        tabLabelTextStyle: TextStyle(
          color: isDark ? CupertinoColors.white : CupertinoColors.black,
          fontSize: 10,
          letterSpacing: -0.24,
        ),
        navTitleTextStyle: TextStyle(
          color: isDark ? CupertinoColors.white : CupertinoColors.black,
          fontSize: 17,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.41,
        ),
        navLargeTitleTextStyle: TextStyle(
          color: isDark ? CupertinoColors.white : CupertinoColors.black,
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
        return WidgetsBinding.instance.platformDispatcher.platformBrightness ==
            Brightness.dark;
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

  /// 获取兼容 Material ColorScheme 的颜色方案（增强版）
  /// 支持动态主色调，与当前设置的 _primaryColor 同步
  ColorScheme get materialColorScheme {
    final isDark = _isDarkMode();

    if (isDark) {
      return ColorScheme.dark(
        primary: _primaryColor,
        onPrimary: CupertinoColors.white,
        secondary: _primaryColor.withValues(alpha: 0.8),
        onSecondary: CupertinoColors.white,
        surface: CupertinoColors.black,
        onSurface: CupertinoColors.white,
        surfaceContainerHighest: CupertinoColors.systemGrey6.darkColor,
        onSurfaceVariant: CupertinoColors.systemGrey2.darkColor,
        outline: CupertinoColors.systemGrey4.darkColor,
        shadow: CupertinoColors.black,
        scrim: CupertinoColors.black.withValues(alpha: 0.5),
      );
    } else {
      return ColorScheme.light(
        primary: _primaryColor,
        onPrimary: CupertinoColors.white,
        secondary: _primaryColor.withValues(alpha: 0.8),
        onSecondary: CupertinoColors.white,
        surface: CupertinoColors.systemBackground,
        onSurface: CupertinoColors.black,
        surfaceContainerHighest: CupertinoColors.systemGrey6,
        onSurfaceVariant: CupertinoColors.systemGrey2,
        outline: CupertinoColors.systemGrey4,
        shadow: CupertinoColors.black.withValues(alpha: 0.2),
        scrim: CupertinoColors.black.withValues(alpha: 0.3),
      );
    }
  }

  // ==================== 主题状态便捷方法 ====================

  /// 获取当前主题状态信息
  ThemeState get currentThemeState {
    return ThemeState(
      themeMode: _themeMode,
      isDarkMode: _isDarkMode(),
      primaryColor: _primaryColor,
      primaryColorName: currentColorName,
      brightness: _isDarkMode() ? Brightness.dark : Brightness.light,
    );
  }

  /// 判断当前是否为深色模式
  bool get isDarkMode => _isDarkMode();

  /// 判断当前是否为浅色模式
  bool get isLightMode => !_isDarkMode();

  /// 判断当前是否跟随系统主题
  bool get isSystemTheme => _themeMode == ThemeMode.system;

  /// 获取当前主题模式的描述文本
  String get themeModeDescription {
    switch (_themeMode) {
      case ThemeMode.light:
        return '浅色模式';
      case ThemeMode.dark:
        return '深色模式';
      case ThemeMode.system:
        return '跟随系统';
    }
  }

  // ==================== 主题切换动画支持 ====================

  /// 切换主题模式（带动画效果支持）
  /// [mode] - 目标主题模式
  /// [animationDuration] - 动画持续时间（可选）
  Future<void> setThemeModeAnimated(
    ThemeMode mode, {
    Duration? animationDuration,
  }) async {
    if (_themeMode != mode) {
      // 如果提供了动画持续时间，可以被外部动画系统使用
      if (animationDuration != null) {
        // 通知监听者开始动画
        _notifyAnimationStart(animationDuration);
      }

      _themeMode = mode;
      await _saveThemeMode();
      notifyListeners();

      // 动画结束通知
      if (animationDuration != null) {
        await Future.delayed(animationDuration);
        _notifyAnimationEnd();
      }
    }
  }

  /// 设置主色调（带动画效果支持）
  /// [color] - 目标颜色
  /// [animationDuration] - 动画持续时间（可选）
  Future<void> setPrimaryColorAnimated(
    Color color, {
    Duration? animationDuration,
  }) async {
    if (_primaryColor != color) {
      if (animationDuration != null) {
        _notifyAnimationStart(animationDuration);
      }

      _primaryColor = color;
      await _savePrimaryColor();
      notifyListeners();

      if (animationDuration != null) {
        await Future.delayed(animationDuration);
        _notifyAnimationEnd();
      }
    }
  }

  /// 循环切换主题模式（浅色 -> 深色 -> 系统 -> 浅色...）
  Future<void> toggleThemeMode({Duration? animationDuration}) async {
    final nextMode = switch (_themeMode) {
      ThemeMode.light => ThemeMode.dark,
      ThemeMode.dark => ThemeMode.system,
      ThemeMode.system => ThemeMode.light,
    };

    await setThemeModeAnimated(nextMode, animationDuration: animationDuration);
  }

  /// 动画状态回调
  void Function(Duration)? _onAnimationStart;
  void Function()? _onAnimationEnd;

  /// 设置动画状态回调
  void setAnimationCallbacks({
    void Function(Duration)? onStart,
    void Function()? onEnd,
  }) {
    _onAnimationStart = onStart;
    _onAnimationEnd = onEnd;
  }

  void _notifyAnimationStart(Duration duration) {
    _onAnimationStart?.call(duration);
  }

  void _notifyAnimationEnd() {
    _onAnimationEnd?.call();
  }

  // ==================== 颜色工具方法 ====================

  /// 根据当前主题获取对比色
  Color getContrastingColor([Color? baseColor]) {
    final color = baseColor ?? _primaryColor;
    return color.computeLuminance() > 0.5
        ? (_isDarkMode() ? CupertinoColors.white : CupertinoColors.black)
        : CupertinoColors.white;
  }

  /// 获取当前主色调的不同透明度版本
  Color getPrimaryColorWithAlpha(double alpha) {
    return _primaryColor.withValues(alpha: alpha);
  }

  /// 获取适配当前主题的系统颜色
  /// 注意：此方法需要在有BuildContext的环境中使用
  /// 如果没有BuildContext，建议直接使用systemColor.darkColor或systemColor本身
  Color getSystemColor(CupertinoDynamicColor systemColor) {
    // 对于没有BuildContext的情况，根据当前主题返回相应颜色
    if (_isDarkMode()) {
      return systemColor.darkColor;
    } else {
      return systemColor;
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

/// 主题状态信息类
/// 包含当前主题的完整状态信息，用于状态查询和调试
class ThemeState {
  const ThemeState({
    required this.themeMode,
    required this.isDarkMode,
    required this.primaryColor,
    required this.primaryColorName,
    required this.brightness,
  });

  /// 当前主题模式
  final ThemeMode themeMode;

  /// 是否为深色模式
  final bool isDarkMode;

  /// 当前主色调
  final Color primaryColor;

  /// 当前主色调名称
  final String primaryColorName;

  /// 当前亮度
  final Brightness brightness;

  /// 是否为浅色模式
  bool get isLightMode => !isDarkMode;

  /// 是否跟随系统主题
  bool get isSystemTheme => themeMode == ThemeMode.system;

  @override
  String toString() {
    return 'ThemeState(mode: $themeMode, isDark: $isDarkMode, color: $primaryColorName, brightness: $brightness)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ThemeState &&
        other.themeMode == themeMode &&
        other.isDarkMode == isDarkMode &&
        other.primaryColor == primaryColor &&
        other.primaryColorName == primaryColorName &&
        other.brightness == brightness;
  }

  @override
  int get hashCode {
    return Object.hash(
      themeMode,
      isDarkMode,
      primaryColor,
      primaryColorName,
      brightness,
    );
  }
}
