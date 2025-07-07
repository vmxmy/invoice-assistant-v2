"""
Vercel Serverless 入口文件
将 FastAPI 应用适配为 Vercel Functions
"""

import os

# 检测是否在 Vercel 环境中
if os.getenv('VERCEL') or os.getenv('VERCEL_ENV'):
    # Serverless 环境，使用优化版本
    from app.serverless import app
else:
    # 本地开发或传统部署，使用完整版本
    from app.main import app

# Vercel 会自动检测并使用这个 app
# 无需额外的 handler 函数

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)