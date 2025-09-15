#!/bin/bash

# Flutter应用启动脚本 - 从.env文件加载环境变量

set -e

# 检查是否在Flutter项目根目录
if [ ! -f "pubspec.yaml" ]; then
    echo "❌ 错误：请在Flutter项目根目录运行此脚本"
    exit 1
fi

# 检查.env文件是否存在
if [ ! -f ".env" ]; then
    echo "❌ 错误：.env文件不存在"
    echo "请确保.env文件包含正确的SUPABASE_URL和SUPABASE_ANON_KEY"
    exit 1
fi

echo "🚀 启动Flutter应用（从.env文件加载配置）..."

# 从.env文件读取环境变量
set -a  # 自动导出变量
source .env
set +a  # 关闭自动导出

# 验证必需的环境变量
if [ -z "$SUPABASE_URL" ]; then
    echo "❌ 错误：SUPABASE_URL 环境变量未设置"
    exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ 错误：SUPABASE_ANON_KEY 环境变量未设置"
    exit 1
fi

echo "✅ 配置验证通过"
echo "📱 启动Flutter应用..."

# 运行Flutter应用
flutter run \
  --dart-define=SUPABASE_URL="$SUPABASE_URL" \
  --dart-define=SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  --dart-define=BUILD_ENVIRONMENT="${BUILD_ENVIRONMENT:-development}" \
  --dart-define=ENABLE_DEBUG_MODE="${ENABLE_DEBUG_MODE:-true}" \
  --dart-define=APP_VERSION="${APP_VERSION:-1.0.0}"