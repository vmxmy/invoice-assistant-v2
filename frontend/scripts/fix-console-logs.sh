#!/bin/bash

# 批量修复console日志为logger调用的脚本

echo "开始修复console日志..."

# 查找所有需要修复的文件
FILES=$(find frontend/src -name "*.ts" -o -name "*.tsx" | xargs grep -l "console\.")

for FILE in $FILES; do
    echo "修复文件: $FILE"
    
    # 检查文件是否已经导入了logger
    if ! grep -q "import.*logger.*from.*utils/logger" "$FILE"; then
        echo "  添加logger导入"
        # 在import语句后添加logger导入
        sed -i '' '/^import.*from/a \
import { logger } from '"'"'../utils/logger'"'"';
' "$FILE"
    fi
    
    # 替换console调用
    sed -i '' 's/console\.log/logger.log/g' "$FILE"
    sed -i '' 's/console\.error/logger.error/g' "$FILE"
    sed -i '' 's/console\.warn/logger.warn/g' "$FILE"
    sed -i '' 's/console\.info/logger.info/g' "$FILE"
    
    echo "  ✅ 完成"
done

echo "✅ 所有文件修复完成！"