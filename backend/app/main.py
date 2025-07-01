"""
发票助手 FastAPI 主应用

智能发票管理系统的主入口点。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv
import os

from app.api.v1.api import api_router
from app.core.config import get_settings

# Load environment variables from .env
load_dotenv()

# Fetch database variables
USER = os.getenv("user")
PASSWORD = os.getenv("password")
HOST = os.getenv("host")
PORT = os.getenv("port")
DBNAME = os.getenv("dbname")

# Construct the SQLAlchemy connection string
DATABASE_URL = f"postgresql+psycopg2://{USER}:{PASSWORD}@{HOST}:{PORT}/{DBNAME}?sslmode=require"

# Create the SQLAlchemy engine
# Using NullPool for pgbouncer compatibility
engine = create_engine(DATABASE_URL, poolclass=NullPool)

# Test the connection
try:
    with engine.connect() as connection:
        print("Database connection successful!")
except Exception as e:
    print(f"Failed to connect to database: {e}")

# 获取配置
settings = get_settings()

# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    docs_url=settings.docs_url if settings.enable_docs else None,
    redoc_url=settings.redoc_url if settings.enable_docs else None,
    debug=settings.debug,
)

# 配置 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 API 路由
app.include_router(api_router, prefix=settings.api_v1_prefix)

# 注册异常处理器
from app.core.handlers import register_exception_handlers
register_exception_handlers(app)

# 根路径健康检查
@app.get("/")
async def root():
    """根路径，提供 API 基本信息"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": settings.app_description,
        "docs_url": settings.docs_url if settings.enable_docs else None,
        "api_prefix": settings.api_v1_prefix,
        "status": "running",
        "environment": "development" if settings.is_development else "production"
    }

# 全局健康检查端点
@app.get("/health")
async def health_check():
    """全局健康检查端点"""
    return {
        "status": "ok", 
        "version": settings.app_version,
        "environment": "development" if settings.is_development else "production"
    }
