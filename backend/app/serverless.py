"""
Serverless 优化的 FastAPI 应用
适配 Vercel Functions，移除需要持久化的功能
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import time
import logging
import os

from app.core.config import settings
from app.core.exceptions import AppException

# 配置日志（简化版）
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建 FastAPI 应用实例（无 lifespan，适配 serverless）
app = FastAPI(
    title=settings.app_name,
    description=settings.app_description + " (Serverless Version)",
    version=settings.app_version,
    debug=settings.debug,
    docs_url=settings.docs_url if settings.enable_docs else None,
    redoc_url=settings.redoc_url if settings.enable_docs else None,
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=[
        "Authorization", "Content-Type", "X-Requested-With",
        "X-Request-ID", "Accept", "Accept-Language",
        "Content-Language", "Cache-Control"
    ],
    expose_headers=["X-Process-Time", "X-Request-ID"],
    max_age=86400,
)

# 请求处理中间件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """请求日志中间件"""
    start_time = time.time()
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    
    logger.info(f"📥 {request.method} {request.url.path} - Client: {client_ip}")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    logger.info(f"📤 {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.3f}s")
    
    return response

# 全局异常处理
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """处理 HTTP 异常"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url.path)
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """处理请求验证异常"""
    return JSONResponse(
        status_code=422,
        content={
            "error": True,
            "message": "请求参数验证失败",
            "details": exc.errors(),
            "status_code": 422
        }
    )

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """处理应用自定义异常"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.message,
            "code": exc.code,
            "status_code": exc.status_code
        }
    )

# 基础路由
@app.get("/", tags=["系统"])
async def root():
    """根路径"""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "environment": "serverless",
        "timestamp": time.time()
    }

@app.get("/health", tags=["系统"])
async def health_check():
    """健康检查（Serverless 版本，不检查数据库）"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "environment": "serverless",
        "checks": {
            "application": "healthy",
            "database": "not_applicable"  # Serverless 函数不维持数据库连接
        }
    }

@app.get("/info", tags=["系统"])
async def app_info():
    """应用信息"""
    return {
        "app_name": settings.app_name,
        "version": settings.app_version,
        "description": settings.app_description,
        "environment": "serverless",
        "debug": settings.debug,
        "api_prefix": settings.api_v1_prefix,
        "features": {
            "serverless": True,
            "cors_enabled": True,
            "auth_enabled": True,
        }
    }

# 注册 API 路由（简化版，只包含核心功能）
from app.api.v1 import auth, users  # 只导入轻量级的路由

# 手动注册路由，避免重复导入
app.include_router(auth.router, prefix=f"{settings.api_v1_prefix}/auth", tags=["认证"])
app.include_router(users.router, prefix=f"{settings.api_v1_prefix}/users", tags=["用户"])

# 导出应用
__all__ = ["app"]