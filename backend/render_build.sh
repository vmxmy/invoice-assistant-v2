#!/usr/bin/env bash
# Render 构建脚本 - 仅安装 Python 依赖

set -e

echo "Installing Python dependencies..."

# 升级 pip
pip install --upgrade pip

# 安装依赖
pip install -r requirements.txt

# 安装 gunicorn（如果不在 requirements.txt 中）
pip install gunicorn

echo "Build completed successfully"