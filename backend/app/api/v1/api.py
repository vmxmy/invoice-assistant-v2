"""
API v1 路由聚合

将所有 v1 版本的 API 路由聚合到一个地方。
"""

from fastapi import APIRouter

from app.api.v1.endpoints import users
from app.api.v1.endpoints import enhanced_files
from app.utils.responses import success_response, error_response
from app.core.exceptions import NotFoundError, ValidationError

api_router = APIRouter()

# 注册各个模块的路由
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(enhanced_files.router, prefix="/files", tags=["enhanced-files"])

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

# 响应格式示例端点
@api_router.get("/response-examples/success")
async def response_success_example():
    """成功响应示例"""
    return success_response(
        data={"id": 1, "name": "测试用户", "email": "test@example.com"},
        message="获取用户信息成功"
    )

@api_router.get("/response-examples/error")
async def response_error_example():
    """错误响应示例"""
    return error_response(
        message="用户不存在",
        error_code="USER_NOT_FOUND",
        details={"user_id": 999},
        status_code=404
    )

@api_router.get("/response-examples/exception/{item_id}")
async def response_exception_example(item_id: int):
    """异常处理示例"""
    if item_id == 0:
        raise ValidationError(
            message="ID 不能为 0",
            details={"item_id": item_id}
        )
    
    if item_id < 0:
        raise NotFoundError(
            resource="项目",
            details={"item_id": item_id}
        )
    
    return success_response(
        data={"id": item_id, "name": f"项目 {item_id}"},
        message="获取成功"
    )