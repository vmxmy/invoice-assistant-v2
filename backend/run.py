#!/usr/bin/env python3
"""
后端服务启动脚本
"""

import uvicorn
from app.core.config import get_settings

def main():
    """启动应用"""
    settings = get_settings()
    
    print(f"🚀 启动 {settings.app_name} v{settings.app_version}")
    print(f"📍 地址: http://{settings.app_host}:{settings.app_port}")
    print(f"📄 文档: http://localhost:{settings.app_port}{settings.docs_url}")
    print(f"🔧 环境: {'开发' if settings.is_development else '生产'}")
    
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.is_development,
        log_level=settings.log_level.lower()
    )

if __name__ == "__main__":
    main()