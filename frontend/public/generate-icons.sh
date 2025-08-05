#!/bin/bash

# 生成发票应用图标的脚本
# 使用 macOS 内置工具

cd "$(dirname "$0")"

echo "开始生成图标..."

# 首先使用 qlmanage 将 SVG 转换为大尺寸 PNG
echo "Converting SVG to PNG..."
qlmanage -t -s 1024 -o . invoice-icon.svg

# 重命名生成的文件
if [ -f "invoice-icon.svg.png" ]; then
    mv invoice-icon.svg.png temp-icon-1024.png
else
    echo "错误：无法生成初始 PNG 文件"
    exit 1
fi

# 创建 icons 目录（如果不存在）
mkdir -p icons

# 定义需要的图标尺寸
sizes=(16 32 48 72 96 128 144 152 180 192 384 512)

# 使用 sips 生成各种尺寸
for size in "${sizes[@]}"; do
    echo "生成 ${size}x${size} 图标..."
    sips -z $size $size temp-icon-1024.png --out "icons/icon-${size}x${size}.png" >/dev/null 2>&1
done

# 生成 Apple Touch 图标（带白色背景）
echo "生成 Apple Touch 图标..."
# 180x180 for iPhone
sips -z 180 180 temp-icon-1024.png --out "icons/apple-touch-icon.png" >/dev/null 2>&1

# 生成 favicon.ico（多尺寸）
echo "生成 favicon.ico..."
# 使用 16x16 和 32x32 创建 ico 文件
cp icons/icon-32x32.png favicon-32.png
cp icons/icon-16x16.png favicon-16.png

# 清理临时文件
rm -f temp-icon-1024.png favicon-32.png favicon-16.png

echo "✅ 图标生成完成！"
echo ""
echo "生成的图标文件："
ls -la icons/icon-*.png | awk '{print "  - " $9 " (" $5 " bytes)"}'