#!/bin/bash

# 旧主题系统遗留代码检测工具
# 用于检测Flutter项目中Material Design和自定义主题系统的遗留代码
# 兼容macOS默认bash 3.2

set -euo pipefail

# 颜色输出配置
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 全局统计变量
HIGH_RISK_COUNT=0
MEDIUM_RISK_COUNT=0
LOW_RISK_COUNT=0
TOTAL_FILES_SCANNED=0

# 配置
SCAN_DIR="lib"
OUTPUT_FORMAT="detailed" # detailed | summary | json
SHOW_CONTEXT=true
MAX_CONTEXT_LINES=3

# 工具函数
print_header() {
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN}  旧主题系统遗留代码检测工具 v2.0${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo ""
}

print_colored() {
    local color=$1
    local text=$2
    echo -e "${color}${text}${NC}"
}

print_section() {
    local title=$1
    echo ""
    print_colored "$BLUE" "📋 $title"
    echo "----------------------------------------"
}

# 检查工具依赖
check_dependencies() {
    local missing_tools=()
    
    if ! command -v grep >/dev/null 2>&1; then
        missing_tools+=("grep")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_colored "$RED" "❌ 缺少必要工具: ${missing_tools[*]}"
        exit 1
    fi
}

# 获取修复建议
get_fix_suggestion() {
    local pattern_name=$1
    case $pattern_name in
        "material_widgets")
            echo "替换为对应的Cupertino组件：Material→Container, Scaffold→CupertinoPageScaffold, AppBar→CupertinoNavigationBar"
            ;;
        "hardcoded_colors")
            echo "使用CupertinoSemanticColors中的语义颜色替代硬编码颜色"
            ;;
        "theme_system")
            echo "移除Theme系统调用，直接使用Cupertino组件的原生样式"
            ;;
        "material_imports")
            echo "仅导入'package:flutter/cupertino.dart'，移除material.dart导入"
            ;;
        "flex_color_scheme")
            echo "完全移除FlexColorScheme，使用纯Cupertino颜色系统"
            ;;
        "custom_theme")
            echo "移除自定义主题管理器，使用CupertinoTheme.of(context)获取系统主题"
            ;;
        "material_properties")
            echo "移除Material特有属性，使用Cupertino等效属性"
            ;;
        "material_animations")
            echo "使用CupertinoPageTransition等Cupertino动画替代"
            ;;
        *)
            echo "请参考Cupertino设计系统文档进行迁移"
            ;;
    esac
}

# 获取风险级别
get_risk_level() {
    local pattern_name=$1
    case $pattern_name in
        "material_widgets"|"hardcoded_colors"|"theme_system")
            echo "HIGH"
            ;;
        "material_imports"|"flex_color_scheme"|"custom_theme")
            echo "MEDIUM"
            ;;
        "material_properties"|"material_animations")
            echo "LOW"
            ;;
        *)
            echo "UNKNOWN"
            ;;
    esac
}

# 执行单个模式检测
run_pattern_detection() {
    local pattern_name=$1
    local pattern=$2
    local risk_level=$(get_risk_level "$pattern_name")
    
    local temp_file=$(mktemp)
    local match_count=0
    
    # 执行搜索
    grep -r -n --include="*.dart" -E "$pattern" "$SCAN_DIR" > "$temp_file" 2>/dev/null || true
    match_count=$(wc -l < "$temp_file" | tr -d ' ')
    
    if [ "$match_count" -gt 0 ]; then
        # 更新统计
        case $risk_level in
            "HIGH") 
                HIGH_RISK_COUNT=$((HIGH_RISK_COUNT + match_count))
                ;;
            "MEDIUM") 
                MEDIUM_RISK_COUNT=$((MEDIUM_RISK_COUNT + match_count))
                ;;
            "LOW") 
                LOW_RISK_COUNT=$((LOW_RISK_COUNT + match_count))
                ;;
        esac
        
        # 显示结果
        print_detection_results "$pattern_name" "$risk_level" "$match_count" "$temp_file"
    fi
    
    rm -f "$temp_file"
}

# 显示检测结果
print_detection_results() {
    local pattern_name=$1
    local risk_level=$2
    local match_count=$3
    local results_file=$4
    
    # 选择颜色和图标
    local color=""
    local icon=""
    case $risk_level in
        "HIGH") 
            color=$RED
            icon="🚨"
            ;;
        "MEDIUM") 
            color=$YELLOW
            icon="⚠️"
            ;;
        "LOW") 
            color=$CYAN
            icon="ℹ️"
            ;;
    esac
    
    # 显示标题
    print_colored "$color" "$icon $pattern_name ($risk_level 风险): $match_count 处发现"
    
    if [ "$OUTPUT_FORMAT" = "detailed" ]; then
        # 显示详细结果
        local file_count=0
        local current_file=""
        
        while IFS= read -r line; do
            if [ -z "$line" ]; then
                continue
            fi
            
            local file_path=$(echo "$line" | cut -d: -f1)
            local line_number=$(echo "$line" | cut -d: -f2)
            local content=$(echo "$line" | cut -d: -f3-)
            
            # 新文件时显示文件名
            if [ "$file_path" != "$current_file" ]; then
                if [ $file_count -gt 0 ]; then
                    echo ""
                fi
                print_colored "$PURPLE" "  📁 $file_path"
                current_file="$file_path"
                file_count=$((file_count + 1))
            fi
            
            # 显示匹配行
            echo "    🔍 Line $line_number: $(echo "$content" | sed 's/^[[:space:]]*//')"
            
        done < "$results_file"
        
        # 显示修复建议
        local suggestion=$(get_fix_suggestion "$pattern_name")
        if [ -n "$suggestion" ]; then
            echo ""
            print_colored "$GREEN" "  💡 修复建议: $suggestion"
        fi
        
        echo ""
    fi
}

# 扫描文件系统
scan_filesystem() {
    print_section "扫描项目文件"
    
    if [ ! -d "$SCAN_DIR" ]; then
        print_colored "$RED" "❌ 扫描目录不存在: $SCAN_DIR"
        exit 1
    fi
    
    TOTAL_FILES_SCANNED=$(find "$SCAN_DIR" -name "*.dart" | wc -l | tr -d ' ')
    print_colored "$GREEN" "📊 扫描范围: $SCAN_DIR ($TOTAL_FILES_SCANNED 个Dart文件)"
    echo ""
}

# 执行所有检测
run_all_detections() {
    print_section "执行遗留代码检测"
    
    # 定义所有检测项目
    local detections=(
        "material_widgets|Material|Scaffold|AppBar|FloatingActionButton|BottomNavigationBar|Drawer|Card|Chip|DataTable|ExpansionTile"
        "hardcoded_colors|Color\(0x[A-Fa-f0-9]{8}\)|Colors\.(red|green|blue|orange|purple|pink|yellow|brown|cyan|teal|lime|indigo|grey)"
        "theme_system|Theme\.of\(context\)|ThemeData\(|MaterialApp\(theme:|CupertinoApp\(theme:"
        "material_imports|import 'package:flutter/material.dart'"
        "flex_color_scheme|FlexColorScheme|flexSchemeColor|FlexSubThemesData|FlexKeyColors"
        "custom_theme|ThemeManager|ThemeProvider|DynamicColorBuilder|ColorSchemeBuilder"
        "material_properties|elevation:|shadowColor:|surfaceTintColor:|materialTapTargetSize:|visualDensity:"
        "material_animations|SlideTransition|FadeTransition|ScaleTransition|RotationTransition"
    )
    
    local total=${#detections[@]}
    local current=0
    
    for detection in "${detections[@]}"; do
        current=$((current + 1))
        local pattern_name=$(echo "$detection" | cut -d'|' -f1)
        local pattern=$(echo "$detection" | cut -d'|' -f2-)
        
        echo -n "[$current/$total] 检测 $pattern_name... "
        run_pattern_detection "$pattern_name" "$pattern"
        echo "✓"
    done
}

# 生成检测报告
generate_report() {
    print_section "检测结果汇总"
    
    local total_issues=$((HIGH_RISK_COUNT + MEDIUM_RISK_COUNT + LOW_RISK_COUNT))
    
    echo "📊 统计信息:"
    echo "   总计文件: $TOTAL_FILES_SCANNED"
    echo "   总计问题: $total_issues"
    print_colored "$RED" "   🚨 高风险: $HIGH_RISK_COUNT"
    print_colored "$YELLOW" "   ⚠️  中风险: $MEDIUM_RISK_COUNT"
    print_colored "$CYAN" "   ℹ️  低风险: $LOW_RISK_COUNT"
    
    echo ""
    
    # 风险评估
    if [ $HIGH_RISK_COUNT -gt 0 ]; then
        print_colored "$RED" "🚨 项目存在高风险遗留代码，需要立即处理！"
        print_colored "$YELLOW" "   建议优先处理Material组件、硬编码颜色和Theme系统调用"
    elif [ $MEDIUM_RISK_COUNT -gt 0 ]; then
        print_colored "$YELLOW" "⚠️  项目存在中等风险遗留代码，建议尽快处理"
        print_colored "$GREEN" "   可以逐步迁移到纯Cupertino设计系统"
    elif [ $LOW_RISK_COUNT -gt 0 ]; then
        print_colored "$CYAN" "ℹ️  项目存在少量低风险遗留代码"
        print_colored "$GREEN" "   主要是细节优化，可以按需处理"
    else
        print_colored "$GREEN" "✅ 恭喜！项目已完全迁移到纯Cupertino设计系统"
    fi
    
    # 整体建议
    echo ""
    print_colored "$BLUE" "🎯 迁移建议:"
    echo "   1. 优先处理高风险项目（Material组件 → Cupertino组件）"
    echo "   2. 替换硬编码颜色为语义颜色"
    echo "   3. 移除Theme系统，使用Cupertino原生样式"
    echo "   4. 清理Material导入，统一使用cupertino.dart"
    echo "   5. 移除自定义主题管理器"
}

# 主函数
main() {
    print_header
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --format)
                OUTPUT_FORMAT="$2"
                shift 2
                ;;
            --no-context)
                SHOW_CONTEXT=false
                shift
                ;;
            --dir)
                SCAN_DIR="$2"
                shift 2
                ;;
            --help|-h)
                cat << EOF
使用方法: $0 [选项]

选项:
    --format FORMAT    输出格式 (detailed|summary|json)
    --no-context      不显示代码上下文
    --dir DIR         指定扫描目录 (默认: lib)
    --help, -h        显示此帮助信息

示例:
    $0                          # 详细模式检测
    $0 --format summary         # 简洁模式检测
    $0 --dir src --no-context   # 扫描src目录，不显示上下文
EOF
                exit 0
                ;;
            *)
                print_colored "$RED" "未知选项: $1"
                print_colored "$YELLOW" "使用 --help 查看可用选项"
                exit 1
                ;;
        esac
    done
    
    # 执行检测流程
    check_dependencies
    scan_filesystem
    run_all_detections
    generate_report
    
    # 返回适当的退出码
    if [ $HIGH_RISK_COUNT -gt 0 ]; then
        exit 2  # 高风险
    elif [ $MEDIUM_RISK_COUNT -gt 0 ]; then
        exit 1  # 中风险
    else
        exit 0  # 无风险或低风险
    fi
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi