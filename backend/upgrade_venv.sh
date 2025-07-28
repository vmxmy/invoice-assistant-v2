#!/bin/bash

# 虚拟环境 Python 版本升级脚本

echo "🐍 虚拟环境 Python 版本升级工具"
echo "================================="

# 检查参数
if [ $# -eq 0 ]; then
    echo "用法: ./upgrade_venv.sh <python版本>"
    echo "示例: ./upgrade_venv.sh python3.9"
    echo ""
    echo "可用的 Python 版本:"
    ls /usr/bin/python3* 2>/dev/null | grep -E "python3\.[0-9]+$"
    exit 1
fi

NEW_PYTHON=$1

# 检查新 Python 是否存在
if ! command -v $NEW_PYTHON &> /dev/null; then
    echo "❌ 错误: $NEW_PYTHON 未安装"
    echo "请先安装: sudo dnf install $NEW_PYTHON"
    exit 1
fi

# 显示版本信息
echo "📊 版本信息:"
echo "   新版本: $($NEW_PYTHON --version)"
if [ -f "venv/bin/python" ]; then
    echo "   当前版本: $(venv/bin/python --version)"
fi

# 确认继续
read -p "确认升级? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⏹️  已取消"
    exit 1
fi

# 步骤 1: 备份依赖
echo "📦 备份当前依赖..."
if [ -d "venv" ]; then
    source venv/bin/activate
    pip freeze > requirements-current.txt
    deactivate
    echo "✅ 依赖已保存到 requirements-current.txt"
else
    echo "⚠️  未找到现有虚拟环境"
fi

# 步骤 2: 备份旧环境
if [ -d "venv" ]; then
    echo "📁 备份旧环境..."
    mv venv venv_backup_$(date +%Y%m%d_%H%M%S)
    echo "✅ 旧环境已备份"
fi

# 步骤 3: 创建新环境
echo "🔧 创建新虚拟环境..."
$NEW_PYTHON -m venv venv

# 步骤 4: 安装依赖
echo "📥 安装依赖..."
source venv/bin/activate
pip install --upgrade pip setuptools wheel

# 尝试安装依赖
if [ -f "requirements.txt" ]; then
    echo "📦 安装 requirements.txt..."
    if pip install -r requirements.txt; then
        echo "✅ 所有依赖安装成功!"
    else
        echo "⚠️  部分依赖安装失败"
        if [ -f "requirements-compat.txt" ]; then
            echo "📦 尝试安装兼容版本..."
            pip install -r requirements-compat.txt
        fi
    fi
elif [ -f "requirements-current.txt" ]; then
    echo "📦 安装备份的依赖..."
    pip install -r requirements-current.txt
fi

# 显示结果
echo ""
echo "✅ 升级完成!"
echo "📊 新环境信息:"
echo "   Python 版本: $(python --version)"
echo "   pip 版本: $(pip --version)"
echo ""
echo "💡 使用方法:"
echo "   激活环境: source venv/bin/activate"
echo "   查看已安装包: pip list"
echo ""
echo "🔄 如需回滚:"
echo "   rm -rf venv"
echo "   mv venv_backup_* venv"