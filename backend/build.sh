#!/usr/bin/env bash
# Render 构建脚本 - 安装系统依赖

set -e

echo "Installing system dependencies..."

# 更新包管理器
apt-get update

# 安装必要的系统依赖
apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-chi-sim \
    tesseract-ocr-chi-tra \
    && rm -rf /var/lib/apt/lists/*

echo "System dependencies installed successfully"

# 安装 Python 依赖
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Build completed successfully"