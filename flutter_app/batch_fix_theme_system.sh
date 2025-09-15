#!/bin/bash

# 批量修复Theme系统调用的脚本
# 替换常见的Theme.of(context)模式为Cupertino等价物

set -euo pipefail

# 颜色输出配置
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 统计变量
TOTAL_REPLACEMENTS=0

print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 批量替换Theme调用
fix_theme_calls() {
    print_status "$BLUE" "🔧 开始批量修复Theme系统调用..."
    
    # 1. Theme.of(context).colorScheme → CupertinoColors (常用颜色)
    print_status "$YELLOW" "修复常用颜色获取..."
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/Theme\.of(context)\.colorScheme\.primary/CupertinoColors.activeBlue.resolveFrom(context)/g' {} \;
    
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/Theme\.of(context)\.colorScheme\.onPrimary/CupertinoColors.white.resolveFrom(context)/g' {} \;
        
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/Theme\.of(context)\.colorScheme\.surface/CupertinoColors.systemBackground.resolveFrom(context)/g' {} \;
        
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/Theme\.of(context)\.colorScheme\.onSurface/CupertinoColors.label.resolveFrom(context)/g' {} \;
        
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/Theme\.of(context)\.colorScheme\.error/CupertinoSemanticColors.error.resolveFrom(context)/g' {} \;
        
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/Theme\.of(context)\.colorScheme\.onError/CupertinoColors.white.resolveFrom(context)/g' {} \;
    
    # 2. Theme.of(context).textTheme → CupertinoTheme文本样式
    print_status "$YELLOW" "修复文本主题..."
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/Theme\.of(context)\.textTheme\.titleLarge/CupertinoTheme.of(context).textTheme.navTitleTextStyle/g' {} \;
        
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/Theme\.of(context)\.textTheme\.titleMedium/CupertinoTheme.of(context).textTheme.textStyle/g' {} \;
        
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/Theme\.of(context)\.textTheme\.bodyLarge/CupertinoTheme.of(context).textTheme.textStyle/g' {} \;
        
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/Theme\.of(context)\.textTheme\.bodyMedium/CupertinoTheme.of(context).textTheme.textStyle/g' {} \;
    
    # 3. 更复杂的ColorScheme调用 → 自定义颜色适配器
    print_status "$YELLOW" "修复复杂颜色调用..."
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/Theme\.of(context)\.colorScheme/ColorSchemeAdapter.of(context)/g' {} \;
    
    # 4. 主题亮度检测
    print_status "$YELLOW" "修复主题亮度检测..."
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/Theme\.of(context)\.brightness/CupertinoTheme.of(context).brightness/g' {} \;
    
    print_status "$GREEN" "✅ 批量Theme系统调用修复完成！"
}

# 创建ColorScheme适配器
create_color_scheme_adapter() {
    print_status "$BLUE" "🔧 创建ColorScheme适配器..."
    
    cat > lib/core/theme/color_scheme_adapter.dart << 'EOF'
import 'package:flutter/cupertino.dart';

/// ColorScheme适配器
/// 将Material的ColorScheme API适配到Cupertino颜色系统
class ColorSchemeAdapter {
  final BuildContext context;
  
  const ColorSchemeAdapter(this.context);
  
  static ColorSchemeAdapter of(BuildContext context) {
    return ColorSchemeAdapter(context);
  }
  
  // 主要颜色
  Color get primary => CupertinoColors.activeBlue.resolveFrom(context);
  Color get onPrimary => CupertinoColors.white.resolveFrom(context);
  Color get secondary => CupertinoColors.activeOrange.resolveFrom(context);
  Color get onSecondary => CupertinoColors.white.resolveFrom(context);
  Color get tertiary => CupertinoColors.activeGreen.resolveFrom(context);
  Color get onTertiary => CupertinoColors.white.resolveFrom(context);
  
  // 表面颜色
  Color get surface => CupertinoColors.systemBackground.resolveFrom(context);
  Color get onSurface => CupertinoColors.label.resolveFrom(context);
  Color get surfaceVariant => CupertinoColors.secondarySystemBackground.resolveFrom(context);
  Color get onSurfaceVariant => CupertinoColors.secondaryLabel.resolveFrom(context);
  Color get surfaceContainer => CupertinoColors.tertiarySystemBackground.resolveFrom(context);
  Color get surfaceContainerHighest => CupertinoColors.quaternarySystemBackground.resolveFrom(context);
  
  // 错误颜色
  Color get error => CupertinoSemanticColors.error.resolveFrom(context);
  Color get onError => CupertinoColors.white.resolveFrom(context);
  Color get errorContainer => CupertinoSemanticColors.error.resolveFrom(context).withOpacity(0.1);
  Color get onErrorContainer => CupertinoSemanticColors.error.resolveFrom(context);
  
  // 轮廓颜色
  Color get outline => CupertinoColors.systemGrey.resolveFrom(context);
  Color get outlineVariant => CupertinoColors.systemGrey2.resolveFrom(context);
  
  // 阴影和涂层
  Color get shadow => CupertinoColors.black.resolveFrom(context);
  Color get scrim => CupertinoColors.black.resolveFrom(context);
  
  // 反转表面
  Color get inverseSurface => CupertinoColors.label.resolveFrom(context);
  Color get onInverseSurface => CupertinoColors.systemBackground.resolveFrom(context);
  Color get inversePrimary => primary.withOpacity(0.8);
}

/// 语义化颜色扩展
class CupertinoSemanticColors {
  static const CupertinoDynamicColor error = CupertinoColors.destructiveRed;
  static const CupertinoDynamicColor success = CupertinoColors.activeGreen;
  static const CupertinoDynamicColor warning = CupertinoColors.activeOrange;
  static const CupertinoDynamicColor info = CupertinoColors.activeBlue;
  
  // 标签颜色
  static const CupertinoDynamicColor primaryLabel = CupertinoColors.label;
  static const CupertinoDynamicColor secondaryLabel = CupertinoColors.secondaryLabel;
  static const CupertinoDynamicColor tertiaryLabel = CupertinoColors.tertiaryLabel;
  static const CupertinoDynamicColor quaternaryLabel = CupertinoColors.quaternaryLabel;
  
  // 背景颜色 
  static const CupertinoDynamicColor primaryBackground = CupertinoColors.systemBackground;
  static const CupertinoDynamicColor secondaryBackground = CupertinoColors.secondarySystemBackground;
  static const CupertinoDynamicColor tertiaryBackground = CupertinoColors.tertiarySystemBackground;
  
  // 分组背景
  static const CupertinoDynamicColor systemGroupedBackground = CupertinoColors.systemGroupedBackground;
  static const CupertinoDynamicColor secondarySystemGroupedBackground = CupertinoColors.secondarySystemGroupedBackground;
  static const CupertinoDynamicColor tertiarySystemGroupedBackground = CupertinoColors.tertiarySystemGroupedBackground;
  
  // 填充颜色
  static const CupertinoDynamicColor systemFill = CupertinoColors.systemFill;
  static const CupertinoDynamicColor secondarySystemFill = CupertinoColors.secondarySystemFill;
  static const CupertinoDynamicColor tertiarySystemFill = CupertinoColors.tertiarySystemFill;
  static const CupertinoDynamicColor quaternarySystemFill = CupertinoColors.quaternarySystemFill;
  
  // 分隔符颜色
  static const CupertinoDynamicColor separator = CupertinoColors.separator;
  static const CupertinoDynamicColor opaqueSeparator = CupertinoColors.opaqueSeparator;
  
  // 链接颜色
  static const CupertinoDynamicColor link = CupertinoColors.link;
}
EOF

    print_status "$GREEN" "✅ ColorScheme适配器创建完成！"
}

# 验证修复结果
verify_fixes() {
    print_status "$BLUE" "🔍 验证修复结果..."
    
    # 统计剩余的Theme.of(context)调用
    local remaining_calls
    remaining_calls=$(grep -r "Theme\.of(context)" lib --include="*.dart" | wc -l | tr -d ' ')
    
    print_status "$YELLOW" "剩余Theme.of(context)调用: $remaining_calls"
    
    # 运行检测脚本查看改进
    if [[ -f "./detect_legacy_theme.sh" ]]; then
        echo "运行检测脚本..."
        ./detect_legacy_theme.sh --format summary
    else
        print_status "$YELLOW" "检测脚本不存在，请手动运行检测"
    fi
}

# 主函数
main() {
    print_status "$BLUE" "================================================"
    print_status "$BLUE" "  Theme系统批量修复工具 v1.0"
    print_status "$BLUE" "================================================"
    echo ""
    
    # 备份当前状态
    print_status "$YELLOW" "📦 创建git stash备份..."
    git add .
    git stash push -m "Backup before Theme system batch fix - $(date)"
    
    # 创建适配器
    create_color_scheme_adapter
    
    # 执行修复
    fix_theme_calls
    
    # 验证结果
    verify_fixes
    
    print_status "$GREEN" "🎉 Theme系统批量修复完成！"
    print_status "$YELLOW" "⚠️  注意: 可能需要手动调整复杂的主题调用"
    print_status "$YELLOW" "⚠️  记得导入ColorSchemeAdapter: import '../../core/theme/color_scheme_adapter.dart';"
    print_status "$YELLOW" "⚠️  运行 'flutter analyze' 检查编译错误"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi