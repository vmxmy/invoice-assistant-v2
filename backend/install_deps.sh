#!/bin/bash

echo "🔧 安装后端依赖..."

# 检测操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📦 检测到 macOS，安装 PostgreSQL 库..."
    if ! command -v brew &> /dev/null; then
        echo "❌ 需要安装 Homebrew"
        exit 1
    fi
    brew install libpq
    export PATH="/usr/local/opt/libpq/bin:$PATH"
elif [[ -f /etc/debian_version ]]; then
    echo "📦 检测到 Debian/Ubuntu，安装依赖..."
    sudo apt-get update
    sudo apt-get install -y libpq-dev python3-dev build-essential
elif [[ -f /etc/redhat-release ]]; then
    echo "📦 检测到 CentOS/RHEL，安装依赖..."
    sudo yum install -y postgresql-devel python3-devel
else
    echo "⚠️  未知操作系统，跳过系统依赖安装"
fi

# 创建虚拟环境（如果不存在）
if [ ! -d "venv" ]; then
    echo "🐍 创建 Python 虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "🔄 激活虚拟环境..."
source venv/bin/activate

# 升级 pip
echo "📦 升级 pip..."
pip install --upgrade pip setuptools wheel

# 尝试安装完整依赖
echo "📦 安装项目依赖..."
if pip install -r requirements.txt; then
    echo "✅ 所有依赖安装成功！"
else
    echo "⚠️  部分依赖安装失败，尝试安装精简版..."
    
    # 如果失败，使用精简版
    if [ -f "requirements-minimal.txt" ]; then
        pip install -r requirements-minimal.txt
        echo "✅ 精简版依赖安装成功！"
    else
        echo "❌ 无法找到精简版依赖文件"
        echo "💡 提示：如果不需要 PostgreSQL，可以注释掉 requirements.txt 中的相关依赖"
    fi
fi

echo "🎉 安装完成！"
echo ""
echo "📋 下一步："
echo "   1. 复制环境配置: cp .env.example .env"
echo "   2. 编辑配置文件: nano .env"
echo "   3. 启动服务: uvicorn app.main:app --reload"