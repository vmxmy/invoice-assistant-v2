#!/bin/bash

# 历史邮件处理脚本启动器
# 使用现有的邮箱扫描功能处理历史邮件

echo "🚀 开始历史邮件发票处理..."

# 设置环境变量
export NODE_ENV=production
export SUPABASE_URL="https://sfenhhtvcyslxplvewmt.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE"

# 检查Node.js依赖
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js"
    exit 1
fi

# 安装必要的依赖（如果还没有）
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install imap mailparser
fi

# 运行历史邮件处理脚本
echo "📧 启动历史邮件扫描..."
node process_historical_emails.js

echo "✅ 历史邮件处理完成！"