#!/bin/bash
# 安装前端用户注册所需依赖

echo "📦 安装Supabase SDK和其他依赖..."

npm install @supabase/supabase-js
npm install react-router-dom @types/react-router-dom
npm install lucide-react  # 图标库
npm install clsx tailwindcss  # 样式工具 (可选)

echo "✅ 依赖安装完成！"
echo ""
echo "接下来需要："
echo "1. 创建环境变量文件 (.env)"
echo "2. 配置Supabase客户端"
echo "3. 创建认证上下文和组件"
echo "4. 添加路由配置"