#!/bin/bash
# Render 启动脚本 - 构建数据库 URL 并启动应用

# 如果没有设置 DATABASE_URL，从组件构建它
if [ -z "$DATABASE_URL" ]; then
    if [ -n "$DATABASE_HOST" ] && [ -n "$DATABASE_USER" ] && [ -n "$DATABASE_PASSWORD" ]; then
        # 构建 DATABASE_URL
        export DATABASE_URL="postgresql://${DATABASE_USER}.sfenhhtvcyslxplvewmt:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}"
        echo "构建的 DATABASE_URL: postgresql://${DATABASE_USER}.sfenhhtvcyslxplvewmt:***@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}"
    fi
fi

# 启动应用
exec gunicorn app.main:app \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:$PORT \
    --timeout 300 \
    --keep-alive 2 \
    --worker-connections 1000 \
    --max-requests 500 \
    --max-requests-jitter 50 \
    --preload