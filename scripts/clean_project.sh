#!/bin/bash

echo "🧹 清理项目文件..."

# 移动测试文件到 tests 目录
echo "📁 整理测试文件..."
mkdir -p tests
mv test-*.py tests/ 2>/dev/null || true
mv test_*.py tests/ 2>/dev/null || true
mv debug-*.py tests/ 2>/dev/null || true
mv analyze-*.py tests/ 2>/dev/null || true

# 删除敏感文件
echo "🔒 删除敏感文件..."
rm -f auth_request.json
rm -f .auth_token
rm -f .user_token
rm -f *.key
rm -f *.pem

# 删除临时文件和系统文件
echo "🗑️  删除临时文件..."
find . -name "*.log" -delete 2>/dev/null || true
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true
find . -name "*.swp" -delete 2>/dev/null || true
find . -name "*~" -delete 2>/dev/null || true

# 清理 Python 缓存
echo "🐍 清理 Python 缓存..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true

# 清理测试输出
echo "📊 清理测试输出..."
rm -rf test_output/
rm -rf scripts/test_results/

# 清理监控数据（可选）
read -p "是否清理监控数据文件? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f backend/monitoring/*.json
    echo "✅ 监控数据已清理"
fi

echo "✨ 项目清理完成！"

# 显示清理后的状态
echo ""
echo "📋 当前 Git 状态："
git status --short | wc -l | xargs echo "未提交文件数："