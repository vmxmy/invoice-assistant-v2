"""
API v1 路由器

聚合所有 v1 版本的 API 端点。
"""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, profiles, invoices, files

# 创建 v1 API 路由器
api_router = APIRouter()

# 注册各模块的路由
api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(users.router, prefix="/users", tags=["用户"])
api_router.include_router(profiles.router, prefix="/profiles", tags=["档案"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["发票"])
api_router.include_router(files.router, prefix="/files", tags=["文件管理"])

# 可选：添加版本信息端点
@api_router.get("/version", tags=["系统"])
async def get_api_version():
    """获取 API 版本信息"""
    return {
        "version": "1.0.0",
        "description": "发票助手 API v1",
        "endpoints": {
            "auth": "/auth",
            "users": "/users", 
            "profiles": "/profiles",
            "invoices": "/invoices",
            "files": "/files"
        }
    }