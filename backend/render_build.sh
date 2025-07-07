#!/usr/bin/env bash
# Render 构建脚本 - 快速安装依赖

set -e

echo "Installing Python dependencies with cache..."

# 升级 pip
pip install --upgrade pip

# 使用缓存安装依赖
pip install --cache-dir /opt/render/.cache/pip -r requirements.txt

echo "Build completed successfully"