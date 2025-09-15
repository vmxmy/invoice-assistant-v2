import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// 设备类型枚举
enum DeviceType {
  small,
  medium,
  large,
  tablet,
}

/// iOS-first 主题适配器
/// 为现有组件提供从 Material 到 Cupertino 的无缝过渡
/// 遵循 Apple Human Interface Guidelines 和 2025 最佳实践
class IOSThemeAdapter {
  IOSThemeAdapter._();
  
  /// 获取适配的 ColorScheme（过渡期兼容）
  /// 将 Cupertino 颜色映射为 Material ColorScheme 格式
  static ColorScheme getCompatibleColorScheme(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    
    if (isDark) {
      return const ColorScheme.dark(
        primary: CupertinoColors.systemBlue,
        onPrimary: CupertinoColors.white,
        secondary: CupertinoColors.systemGreen,
        onSecondary: CupertinoColors.white,
        surface: CupertinoColors.black,
        onSurface: CupertinoColors.white,
        surfaceContainerHighest: CupertinoColors.systemGrey6,
        onSurfaceVariant: CupertinoColors.systemGrey2,
        outline: CupertinoColors.systemGrey4,
        error: CupertinoColors.systemRed,
        onError: CupertinoColors.white,
      );
    } else {
      return const ColorScheme.light(
        primary: CupertinoColors.systemBlue,
        onPrimary: CupertinoColors.white,
        secondary: CupertinoColors.systemGreen,
        onSecondary: CupertinoColors.white,
        surface: CupertinoColors.systemBackground,
        onSurface: CupertinoColors.black,
        surfaceContainerHighest: CupertinoColors.systemGrey6,
        onSurfaceVariant: CupertinoColors.systemGrey,
        outline: CupertinoColors.systemGrey3,
        error: CupertinoColors.systemRed,
        onError: CupertinoColors.white,
      );
    }
  }
  
  /// 获取适配的 TextTheme
  /// 基于 iOS 排版系统创建 Material TextTheme
  static TextTheme getCompatibleTextTheme(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? CupertinoColors.white : CupertinoColors.black;
    final secondaryTextColor = isDark ? CupertinoColors.systemGrey2 : CupertinoColors.systemGrey;
    
    return TextTheme(
      // iOS Large Title - 34pt Bold
      headlineLarge: TextStyle(
        fontSize: 34.0,
        fontWeight: FontWeight.bold,
        color: textColor,
        letterSpacing: 0.41,
      ),
      
      // iOS Title 1 - 22pt Regular
      headlineMedium: TextStyle(
        fontSize: 22.0,
        fontWeight: FontWeight.w600,
        color: textColor,
        letterSpacing: 0.35,
      ),
      
      // iOS Title 2 - 17pt Semibold
      titleLarge: TextStyle(
        fontSize: 17.0,
        fontWeight: FontWeight.w600,
        color: textColor,
        letterSpacing: -0.41,
      ),
      
      // iOS Title 3 - 16pt Regular
      titleMedium: TextStyle(
        fontSize: 16.0,
        fontWeight: FontWeight.w400,
        color: textColor,
        letterSpacing: -0.31,
      ),
      
      // iOS Body - 14pt Regular
      bodyLarge: TextStyle(
        fontSize: 14.0,
        fontWeight: FontWeight.w400,
        color: textColor,
        letterSpacing: -0.15,
      ),
      
      // iOS Caption 1 - 12pt Regular
      bodyMedium: TextStyle(
        fontSize: 12.0,
        fontWeight: FontWeight.w400,
        color: secondaryTextColor,
        letterSpacing: 0.0,
      ),
      
      // iOS Caption 2 - 11pt Regular
      bodySmall: TextStyle(
        fontSize: 11.0,
        fontWeight: FontWeight.w400,
        color: secondaryTextColor,
        letterSpacing: 0.07,
      ),
      
      // Labels
      labelLarge: TextStyle(
        fontSize: 17.0,
        fontWeight: FontWeight.w600,
        color: textColor,
        letterSpacing: -0.41,
      ),
      
      labelMedium: TextStyle(
        fontSize: 14.0,
        fontWeight: FontWeight.w500,
        color: textColor,
        letterSpacing: -0.15,
      ),
      
      labelSmall: TextStyle(
        fontSize: 12.0,
        fontWeight: FontWeight.w500,
        color: secondaryTextColor,
        letterSpacing: 0.0,
      ),
    );
  }
  
  /// 创建假的 Theme 来兼容现有组件
  /// 这是过渡期的临时方案
  static ThemeData createCompatibleTheme(BuildContext context) {
    final colorScheme = getCompatibleColorScheme(context);
    final textTheme = getCompatibleTextTheme(context);
    
    return ThemeData.from(
      colorScheme: colorScheme,
      textTheme: textTheme,
      useMaterial3: false, // iOS 不使用 Material 3
    ).copyWith(
      // iOS 特定的组件主题
      appBarTheme: AppBarTheme(
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true, // iOS 标准居中
        titleTextStyle: textTheme.titleLarge,
      ),
      
      cardTheme: CardThemeData(
        color: colorScheme.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12.0),
        ),
        margin: const EdgeInsets.symmetric(
          horizontal: 16.0,
          vertical: 8.0,
        ),
      ),
      
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8.0),
          ),
          minimumSize: const Size.fromHeight(44.0),
        ),
      ),
      
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: colorScheme.primary,
          side: BorderSide(color: colorScheme.outline),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8.0),
          ),
          minimumSize: const Size.fromHeight(44.0),
        ),
      ),
      
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: colorScheme.primary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8.0),
          ),
        ),
      ),
      
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8.0),
          borderSide: BorderSide(color: colorScheme.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8.0),
          borderSide: BorderSide(color: colorScheme.outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8.0),
          borderSide: BorderSide(color: colorScheme.primary, width: 2),
        ),
        filled: true,
        fillColor: colorScheme.surface,
        contentPadding: const EdgeInsets.all(16.0),
      ),
      
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: colorScheme.surface,
        selectedItemColor: colorScheme.primary,
        unselectedItemColor: colorScheme.onSurfaceVariant,
        elevation: 0,
        type: BottomNavigationBarType.fixed,
      ),
      
      tabBarTheme: TabBarThemeData(
        labelColor: colorScheme.primary,
        unselectedLabelColor: colorScheme.onSurfaceVariant,
        indicator: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: colorScheme.primary,
              width: 2,
            ),
          ),
        ),
      ),
      
      dividerTheme: DividerThemeData(
        color: colorScheme.outline.withValues(alpha: 0.3),
        thickness: 0.5,
      ),
      
      listTileTheme: ListTileThemeData(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16.0,
          vertical: 8.0,
        ),
        minVerticalPadding: 8.0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8.0),
        ),
      ),
      
      dialogTheme: DialogThemeData(
        backgroundColor: colorScheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16.0),
        ),
        titleTextStyle: textTheme.titleLarge,
        contentTextStyle: textTheme.bodyLarge,
      ),
      
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: colorScheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(24.0),
          ),
        ),
      ),
      
      snackBarTheme: SnackBarThemeData(
        backgroundColor: colorScheme.surface,
        contentTextStyle: textTheme.bodyMedium,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8.0),
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
  
  /// 获取适配的设备信息
  static DeviceType getDeviceType(BuildContext context) {
    final size = MediaQuery.of(context).size;
    if (size.width < 375) return DeviceType.small;
    if (size.width < 390) return DeviceType.medium;
    if (size.width < 430) return DeviceType.large;
    return DeviceType.tablet;
  }
  
  /// 获取适配的安全区域
  static EdgeInsets getSafeAreaPadding(BuildContext context) {
    final padding = MediaQuery.of(context).padding;
    return EdgeInsets.only(
      top: padding.top,
      bottom: padding.bottom + 34.0,
      left: padding.left,
      right: padding.right,
    );
  }
  
  /// 获取适配的动画曲线（iOS 风格）
  static Curve get iosAnimationCurve => Curves.easeInOut;
  
  /// 获取适配的动画时长
  static Duration get iosAnimationDuration => const Duration(milliseconds: 300);
  
  /// 判断是否为深色模式
  static bool isDarkMode(BuildContext context) {
    return CupertinoTheme.of(context).brightness == Brightness.dark;
  }
  
  /// 获取系统状态栏样式
  static SystemUiOverlayStyle getSystemUiOverlayStyle(BuildContext context) {
    final isDark = isDarkMode(context);
    return isDark 
        ? SystemUiOverlayStyle.light 
        : SystemUiOverlayStyle.dark;
  }
}

/// 提供 Theme.of(context) 兼容性的扩展
extension BuildContextThemeExtension on BuildContext {
  /// 获取兼容的主题数据
  ThemeData get compatibleTheme => IOSThemeAdapter.createCompatibleTheme(this);
  
  /// 获取兼容的颜色方案
  ColorScheme get compatibleColorScheme => IOSThemeAdapter.getCompatibleColorScheme(this);
  
  /// 获取兼容的文字主题
  TextTheme get compatibleTextTheme => IOSThemeAdapter.getCompatibleTextTheme(this);
}