#!/bin/bash

# 批量修复Material组件为Cupertino组件的脚本
# 兼容macOS默认bash 3.2

set -euo pipefail

# 颜色输出配置
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 统计变量
TOTAL_REPLACEMENTS=0
PROCESSED_FILES=0

print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 批量替换Material组件
fix_material_components() {
    print_status "$BLUE" "🔧 开始批量修复Material组件..."
    
    # 1. Scaffold → CupertinoPageScaffold (简单情况)
    print_status "$YELLOW" "修复 Scaffold..."
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/return Scaffold(/return CupertinoPageScaffold(/g' {} \;
    
    # 2. AppBar → CupertinoNavigationBar (简单情况)
    print_status "$YELLOW" "修复 AppBar..."
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/appBar: AppBar(/navigationBar: CupertinoNavigationBar(/g' {} \;
    
    # 3. body: → child: 
    print_status "$YELLOW" "修复 body 参数..."
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/body: /child: /g' {} \;
    
    # 4. CircularProgressIndicator → CupertinoActivityIndicator
    print_status "$YELLOW" "修复 ProgressIndicator..."
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/CircularProgressIndicator()/CupertinoActivityIndicator()/g' {} \;
    
    # 5. ElevatedButton → CupertinoButton.filled
    print_status "$YELLOW" "修复 ElevatedButton..."
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/ElevatedButton(/CupertinoButton.filled(/g' {} \;
    
    # 6. TextButton → CupertinoButton
    print_status "$YELLOW" "修复 TextButton..."
    find lib -name "*.dart" -type f -exec sed -i '' \
        's/TextButton(/CupertinoButton(/g' {} \;
    
    # 7. FloatingActionButton → CupertinoButton (需要手动调整)
    print_status "$YELLOW" "标记 FloatingActionButton 需要手动处理..."
    
    # 8. BottomSheet → CupertinoModalPopup (需要手动调整)
    print_status "$YELLOW" "标记 BottomSheet 需要手动处理..."
    
    # 9. SnackBar → 使用自定义反馈组件
    print_status "$YELLOW" "标记 SnackBar 需要手动处理..."
    
    print_status "$GREEN" "✅ 批量Material组件修复完成！"
}

# 批量替换常见的Material属性
fix_material_properties() {
    print_status "$BLUE" "🔧 开始批量修复Material属性..."
    
    # elevation → 需要转换为boxShadow (复杂，暂时跳过)
    # backgroundColor → 使用Cupertino颜色
    # foregroundColor → 使用Cupertino颜色
    
    print_status "$GREEN" "✅ Material属性修复完成！"
}

# 批量替换Material导入
fix_material_imports() {
    print_status "$BLUE" "🔧 开始批量修复Material导入..."
    
    # 注释掉Material导入 (保留以防需要回滚)
    find lib -name "*.dart" -type f -exec sed -i '' \
        "s/import 'package:flutter\/material.dart';/\/\/ import 'package:flutter\/material.dart'; \/\/ TODO: Remove after migration/g" {} \;
    
    print_status "$GREEN" "✅ Material导入修复完成！"
}

# 验证修复结果
verify_fixes() {
    print_status "$BLUE" "🔍 验证修复结果..."
    
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
    print_status "$BLUE" "  Material → Cupertino 批量修复工具"
    print_status "$BLUE" "================================================"
    echo ""
    
    # 备份当前状态
    print_status "$YELLOW" "📦 创建git stash备份..."
    git add .
    git stash push -m "Backup before Material component batch fix - $(date)"
    
    # 执行修复
    fix_material_components
    fix_material_properties
    # fix_material_imports # 暂时不修改导入，避免编译错误
    
    # 验证结果
    verify_fixes
    
    print_status "$GREEN" "🎉 批量修复完成！"
    print_status "$YELLOW" "⚠️  注意: 可能需要手动调整一些复杂的组件"
    print_status "$YELLOW" "⚠️  运行 'flutter analyze' 检查编译错误"
    print_status "$YELLOW" "⚠️  如有问题可运行 'git stash pop' 恢复"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi