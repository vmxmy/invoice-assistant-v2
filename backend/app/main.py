"""
FastAPI 应用入口

采用禅道设计理念：简单、清晰、自然
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import time
import logging
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db, get_db_session
from app.core.exceptions import AppException
from app.middleware.query_monitoring_middleware import QueryMonitoringMiddleware, setup_sqlalchemy_monitoring


# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format=settings.log_format
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化
    logger.info("🚀 启动 FastAPI 应用")
    
    # 打印 CORS 配置用于调试
    logger.info(f"🌐 CORS 配置:")
    logger.info(f"   原始配置: {settings.cors_origins}")
    logger.info(f"   解析后的源列表: {settings.cors_origins_list}")
    logger.info(f"   允许凭证: {settings.cors_allow_credentials}")
    
    try:
        await init_db()
        logger.info("✅ 数据库连接已初始化")
        
        # 设置查询监控
        if settings.enable_query_monitoring:
            setup_sqlalchemy_monitoring()
            logger.info("✅ 查询监控已启用")
            
    except Exception as e:
        logger.warning(f"⚠️  数据库连接失败，将以只读模式运行: {e}")
        # 继续运行，但某些功能可能不可用
    
    yield
    
    # 关闭时清理
    logger.info("🛑 关闭 FastAPI 应用")


# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
    docs_url=settings.docs_url if settings.enable_docs else None,
    redoc_url=settings.redoc_url if settings.enable_docs else None,
)


# ===== 中间件配置 =====

# CORS 中间件 - 安全配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],  # 允许所有方法
    allow_headers=["*"],  # 允许所有头部
    expose_headers=["X-Process-Time", "X-Request-ID"],
    max_age=86400,  # 24小时预检请求缓存
)

# 信任主机中间件（生产环境）
if settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            "localhost", 
            "127.0.0.1", 
            "*.supabase.co",
            "*.vercel.app",
            "*.onrender.com",
            "invoice-assistant-v2.onrender.com"
        ]
    )

# 查询监控中间件
if settings.enable_query_monitoring:
    app.add_middleware(
        QueryMonitoringMiddleware,
        enable_monitoring=settings.enable_query_monitoring
    )


# ===== 请求处理中间件 =====

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """请求日志中间件"""
    start_time = time.time()
    
    # 记录请求
    logger.info(
        f"📥 {request.method} {request.url.path} - "
        f"Client: {request.client.host if request.client else 'unknown'}"
    )
    
    # 处理请求
    response = await call_next(request)
    
    # 记录响应
    process_time = time.time() - start_time
    logger.info(
        f"📤 {request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.3f}s"
    )
    
    # 添加响应头
    response.headers["X-Process-Time"] = str(process_time)
    
    return response


# ===== 异常处理器 =====

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """自定义应用异常处理器"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "type": exc.error_type,
                "message": exc.message,
                "details": exc.details,
                "timestamp": time.time()
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """请求验证异常处理器"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "type": "validation_error",
                "message": "请求参数验证失败",
                "details": exc.errors(),
                "timestamp": time.time()
            }
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """HTTP 异常处理器"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "type": "http_error",
                "message": exc.detail,
                "timestamp": time.time()
            }
        },
    )


@app.exception_handler(500)
async def internal_server_error_handler(request: Request, exc: Exception):
    """内部服务器错误处理器"""
    logger.error(f"❌ 内部服务器错误: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "type": "internal_server_error",
                "message": "内部服务器错误" if settings.is_production else str(exc),
                "timestamp": time.time()
            }
        },
    )


# ===== 基础路由 =====

@app.get("/", tags=["系统"])
async def root():
    """根路径 - 系统信息"""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "description": settings.app_description,
        "status": "running",
        "environment": "development" if settings.is_development else "production",
        "api_prefix": settings.api_v1_prefix,
        "docs_url": settings.docs_url if settings.enable_docs else None,
        "timestamp": time.time()
    }


@app.get("/health", tags=["系统"])
async def health_check():
    """健康检查"""
    try:
        # 测试数据库连接
        from app.core.database import get_db_context
        from sqlalchemy import text
        async with get_db_context() as session:
            await session.execute(text("SELECT 1"))
        
        db_status = "healthy"
    except Exception as e:
        logger.error(f"❌ 数据库健康检查失败: {str(e)}")
        db_status = "unhealthy"
    
    is_healthy = db_status == "healthy"
    
    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "timestamp": time.time(),
        "checks": {
            "database": db_status,
        }
    }


@app.get("/info", tags=["系统"])
async def app_info():
    """应用信息"""
    return {
        "app_name": settings.app_name,
        "version": settings.app_version,
        "description": settings.app_description,
        "debug": settings.debug,
        "api_prefix": settings.api_v1_prefix,
        "database_url": settings.database_url.split("@")[-1] if "@" in settings.database_url else "***",
        "features": {
            "supabase_auth": True,
            "file_upload": True,
            "ocr_processing": True,
            "email_processing": True,
        }
    }


@app.get("/cors-debug", tags=["系统"])
async def cors_debug():
    """CORS 配置调试信息"""
    import os
    return {
        "cors_origins_raw": settings.cors_origins,
        "cors_origins_list": settings.cors_origins_list,
        "cors_allow_credentials": settings.cors_allow_credentials,
        "environment_variable": os.getenv("CORS_ORIGINS", "未设置"),
        "all_env_vars": {
            k: v for k, v in os.environ.items() 
            if "CORS" in k.upper()
        }
    }


# ===== API 路由注册 =====

# 注册 v1 API 路由
from app.api.v1.router import api_router
app.include_router(api_router, prefix=settings.api_v1_prefix)


if __name__ == "__main__":
    import uvicorn
    
    # 开发模式启动
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.is_development,
        log_level=settings.log_level.lower()
    )