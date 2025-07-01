"""
API v1 路由聚合

将所有 v1 版本的 API 路由聚合到一个地方。
"""

from fastapi import APIRouter

from app.api.v1.endpoints import users

api_router = APIRouter()

# 注册各个模块的路由
api_router.include_router(users.router, prefix="/users", tags=["users"])

# 健康检查端点
@api_router.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "ok", "version": "v1"}

# 数据库连接测试端点
@api_router.get("/db-test")
async def test_database():
    """测试数据库连接"""
    from sqlalchemy import text
    from app.main import engine
    
    try:
        with engine.connect() as connection:
            # 测试查询
            result = connection.execute(text("SELECT 1 as test"))
            test_value = result.scalar()
            
            # 获取数据库版本
            result = connection.execute(text("SELECT version()"))
            version = result.scalar()
            
            # 获取当前数据库
            result = connection.execute(text("SELECT current_database()"))
            db_name = result.scalar()
            
            return {
                "status": "connected",
                "test_query": test_value,
                "database": db_name,
                "version": version,
                "connection_type": "psycopg2 with NullPool"
            }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "connection_type": "psycopg2 with NullPool"
        }