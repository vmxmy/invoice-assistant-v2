#!/bin/bash

# 前端快速启动脚本 - 配置好.env后一键上线

set -e

echo "🚀 发票助手前端 - 快速启动"
echo "================================"

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "❌ 错误: .env 文件不存在"
    echo "请先配置 .env 文件"
    exit 1
fi

echo "✅ .env 文件检查通过"

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker 未安装"
    echo "请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误: Docker Compose 未安装"
    echo "请先安装 Docker Compose"
    exit 1
fi

echo "✅ Docker 环境检查通过"

# 停止可能存在的容器
echo "🛑 停止现有容器..."
docker-compose down 2>/dev/null || true

# 启动生产环境
echo "🚀 启动生产环境..."
docker-compose --profile prod up --build -d

echo ""
echo "🎉 启动成功!"
echo "================================"
echo "📱 访问地址: http://localhost"
echo "🏥 健康检查: http://localhost/health"
echo "📋 查看日志: docker-compose logs -f frontend-prod"
echo "🛑 停止服务: docker-compose down"
echo ""
echo "✨ 发票助手前端已成功上线!"