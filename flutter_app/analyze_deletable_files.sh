#!/bin/bash

# Flutter代码可删除文件分析工具
# 系统化识别可以安全删除的遗留文件

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 配置
LIB_PATH="lib"
OUTPUT_FILE="deletable_files_analysis.txt"
TEMP_DIR="/tmp/flutter_analysis_$$"

# 创建临时目录
mkdir -p "$TEMP_DIR"

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  Flutter 可删除文件分析工具 v1.0${NC}"
echo -e "${CYAN}================================================${NC}"
echo

# 1. 扫描项目结构
echo -e "${BLUE}📋 分析项目结构${NC}"
echo "----------------------------------------"

# 统计文件类型
total_dart_files=$(find "$LIB_PATH" -name "*.dart" -type f | wc -l)
echo -e "${GREEN}📊 总计 Dart 文件: $total_dart_files 个${NC}"

# 2. 识别候选删除文件类型
echo
echo -e "${BLUE}🔍 识别候选删除文件类型${NC}"
echo "----------------------------------------"

# 创建分析结果文件
cat > "$OUTPUT_FILE" << EOF
Flutter 可删除文件分析报告
生成时间: $(date)
项目路径: $(pwd)/$LIB_PATH
总计文件: $total_dart_files

EOF

# 函数：检查文件是否被import
check_file_usage() {
    local file_path="$1"
    local file_name=$(basename "$file_path" .dart)
    local relative_path=${file_path#$LIB_PATH/}
    
    # 搜索可能的导入模式
    local import_patterns=(
        "import.*$relative_path"
        "import.*/$file_name.dart"
        "import.*'$file_name.dart'"
        "import.*\"$file_name.dart\""
    )
    
    local total_references=0
    for pattern in "${import_patterns[@]}"; do
        local count=$(grep -r "$pattern" "$LIB_PATH" --include="*.dart" 2>/dev/null | wc -l)
        total_references=$((total_references + count))
    done
    
    # 还要检查类名引用
    if [ -f "$file_path" ]; then
        # 提取主要类名（简化版）
        local class_names=$(grep -E "^class [A-Z][A-Za-z]*" "$file_path" 2>/dev/null | sed 's/class \([A-Z][A-Za-z]*\).*/\1/' || echo "")
        for class_name in $class_names; do
            if [ -n "$class_name" ]; then
                local class_refs=$(grep -r "\b$class_name\b" "$LIB_PATH" --include="*.dart" --exclude="$(basename $file_path)" 2>/dev/null | wc -l)
                total_references=$((total_references + class_refs))
            fi
        done
    fi
    
    echo "$total_references"
}

# 函数：分析文件内容特征
analyze_file_content() {
    local file_path="$1"
    local indicators=()
    
    if [ -f "$file_path" ]; then
        # 检查是否为示例文件
        if grep -q -i "example\|demo\|sample\|test.*widget" "$file_path" 2>/dev/null; then
            indicators+=("EXAMPLE")
        fi
        
        # 检查是否包含大量注释说明
        local comment_lines=$(grep -c "^[[:space:]]*//\|^[[:space:]]*\*\|^[[:space:]]*\*\*\*" "$file_path" 2>/dev/null || echo "0")
        local total_lines=$(wc -l < "$file_path" 2>/dev/null || echo "1")
        if [ "$total_lines" -gt 0 ]; then
            local comment_ratio=$((comment_lines * 100 / total_lines))
            if [ "$comment_ratio" -gt 30 ]; then
                indicators+=("HIGH_COMMENTS")
            fi
        fi
        
        # 检查是否为过时版本文件
        if echo "$file_path" | grep -q -i "v[0-9]\|_old\|_backup\|_deprecated"; then
            indicators+=("VERSIONED")
        fi
        
        # 检查Material组件密度
        local material_count=$(grep -c -E "Scaffold|AppBar|Material|Card|FloatingActionButton" "$file_path" 2>/dev/null || echo "0")
        if [ "$material_count" -gt 5 ]; then
            indicators+=("HEAVY_MATERIAL")
        fi
        
        # 检查是否为工具/实用文件
        if echo "$file_path" | grep -q -E "util|helper|tool|config" && [ "$total_lines" -lt 50 ]; then
            indicators+=("SMALL_UTIL")
        fi
    fi
    
    echo "${indicators[@]}"
}

# 3. 分析不同类别的文件
echo -e "${PURPLE}🔍 分析文件类别...${NC}"

# 使用兼容的方式存储数据
usage_data_file="$TEMP_DIR/usage_data.txt"
indicators_data_file="$TEMP_DIR/indicators_data.txt"
touch "$usage_data_file" "$indicators_data_file"

while IFS= read -r -d '' dart_file; do
    relative_path=${dart_file#$LIB_PATH/}
    
    # 分类文件
    category="OTHER"
    if echo "$relative_path" | grep -q "example\|demo"; then
        category="EXAMPLE"
    elif echo "$relative_path" | grep -q "test"; then
        category="TEST"  
    elif echo "$relative_path" | grep -q "_v[0-9]\|_old\|_backup"; then
        category="VERSIONED"
    elif echo "$relative_path" | grep -q "widget.*test\|test.*widget"; then
        category="TEST_WIDGET"
    fi
    
    # 检查使用情况
    usage_count=$(check_file_usage "$dart_file")
    file_usage_counts["$relative_path"]=$usage_count
    
    # 分析内容特征
    indicators=$(analyze_file_content "$dart_file")
    file_indicators["$relative_path"]="$indicators"
    
    # 存储分类
    if [ -z "${file_categories[$category]}" ]; then
        file_categories[$category]="$relative_path"
    else
        file_categories[$category]="${file_categories[$category]}|$relative_path"
    fi
    
done < <(find "$LIB_PATH" -name "*.dart" -type f -print0)

# 4. 生成详细报告
echo
echo -e "${BLUE}📝 生成分析报告${NC}"
echo "----------------------------------------"

# 函数：安全性评估
evaluate_safety() {
    local file="$1"
    local usage=${file_usage_counts[$file]:-0}
    local indicators=${file_indicators[$file]:-""}
    
    local safety_score=0
    local reasons=()
    
    # 使用量评估
    if [ "$usage" -eq 0 ]; then
        safety_score=$((safety_score + 40))
        reasons+=("无引用")
    elif [ "$usage" -le 2 ]; then
        safety_score=$((safety_score + 20))  
        reasons+=("引用很少($usage)")
    fi
    
    # 特征指标评估
    if [[ "$indicators" == *"EXAMPLE"* ]]; then
        safety_score=$((safety_score + 35))
        reasons+=("示例文件")
    fi
    
    if [[ "$indicators" == *"VERSIONED"* ]]; then
        safety_score=$((safety_score + 30))
        reasons+=("版本文件")
    fi
    
    if [[ "$indicators" == *"HIGH_COMMENTS"* ]]; then
        safety_score=$((safety_score + 15))
        reasons+=("大量注释")
    fi
    
    if [[ "$indicators" == *"HEAVY_MATERIAL"* ]]; then
        safety_score=$((safety_score + 25))
        reasons+=("大量Material组件")
    fi
    
    # 路径风险评估
    if echo "$file" | grep -q -E "core|main|app\.dart|injection"; then
        safety_score=$((safety_score - 50))
        reasons+=("核心文件-风险")
    fi
    
    # 确定安全等级
    local safety_level="UNKNOWN"
    if [ "$safety_score" -ge 80 ]; then
        safety_level="VERY_SAFE"
    elif [ "$safety_score" -ge 60 ]; then
        safety_level="SAFE"
    elif [ "$safety_score" -ge 40 ]; then
        safety_level="MODERATE"
    elif [ "$safety_score" -ge 20 ]; then
        safety_level="RISKY"
    else
        safety_level="DANGEROUS"
    fi
    
    echo "$safety_level|$safety_score|${reasons[@]}"
}

# 写入详细分析到文件
{
    echo "=========================================="
    echo "候选删除文件详细分析"
    echo "=========================================="
    echo
    
    # 按安全等级分组
    declare -A safety_groups
    
    for file in "${!file_usage_counts[@]}"; do
        safety_info=$(evaluate_safety "$file")
        IFS='|' read -r safety_level score reasons <<< "$safety_info"
        
        if [ -z "${safety_groups[$safety_level]}" ]; then
            safety_groups[$safety_level]="$file:$score:$reasons"
        else
            safety_groups[$safety_level]="${safety_groups[$safety_level]}^$file:$score:$reasons"  
        fi
    done
    
    # 输出各安全等级的文件
    for level in "VERY_SAFE" "SAFE" "MODERATE" "RISKY" "DANGEROUS"; do
        if [ -n "${safety_groups[$level]}" ]; then
            echo "[$level] 文件列表："
            echo "----------------------------------------"
            
            IFS='^' read -ra files <<< "${safety_groups[$level]}"
            for file_info in "${files[@]}"; do
                IFS=':' read -r file score reasons <<< "$file_info"
                usage=${file_usage_counts[$file]}
                indicators=${file_indicators[$file]}
                
                echo "文件: $file"
                echo "  安全分数: $score/100"
                echo "  引用次数: $usage"
                echo "  特征标记: $indicators"
                echo "  删除理由: $reasons"
                echo
            done
            echo
        fi
    done
    
} >> "$OUTPUT_FILE"

# 5. 在终端显示汇总
echo
echo -e "${WHITE}📊 分析汇总${NC}"
echo "----------------------------------------"

very_safe_count=0
safe_count=0
moderate_count=0

for file in "${!file_usage_counts[@]}"; do
    safety_info=$(evaluate_safety "$file")
    IFS='|' read -r safety_level score reasons <<< "$safety_info"
    
    case "$safety_level" in
        "VERY_SAFE") very_safe_count=$((very_safe_count + 1)) ;;
        "SAFE") safe_count=$((safe_count + 1)) ;;
        "MODERATE") moderate_count=$((moderate_count + 1)) ;;
    esac
done

echo -e "${GREEN}✅ 极安全删除: $very_safe_count 个文件${NC}"
echo -e "${YELLOW}⚠️  安全删除: $safe_count 个文件${NC}" 
echo -e "${BLUE}🔍 需要检查: $moderate_count 个文件${NC}"

# 6. 生成删除脚本预览
echo
echo -e "${WHITE}🎯 推荐删除操作${NC}"
echo "----------------------------------------"

echo "# 推荐立即删除的文件（极安全）:" > "$TEMP_DIR/delete_commands.sh"
for file in "${!file_usage_counts[@]}"; do
    safety_info=$(evaluate_safety "$file")
    IFS='|' read -r safety_level score reasons <<< "$safety_info"
    
    if [ "$safety_level" = "VERY_SAFE" ]; then
        echo "mv \"$LIB_PATH/$file\" \"/Users/xumingyang/app/invoice-assistant-v2/archived/unused_theme_files_20250115/\"" >> "$TEMP_DIR/delete_commands.sh"
        echo -e "${GREEN}推荐删除: $file${NC} (${reasons})"
    fi
done

echo
echo -e "${CYAN}📄 完整分析报告已保存至: $OUTPUT_FILE${NC}"
echo -e "${CYAN}🗑️  删除命令已保存至: $TEMP_DIR/delete_commands.sh${NC}"

# 清理
# rm -rf "$TEMP_DIR"

echo
echo -e "${WHITE}分析完成！${NC}"