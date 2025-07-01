"""
全局异常处理器

处理应用中的各种异常并返回标准化响应。
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import (
    APIException,
    DatabaseError,
    InvoiceAssistantException
)
from app.utils.responses import error_response
from app.utils.logger import get_logger

logger = get_logger("exception_handler")


async def api_exception_handler(request: Request, exc: APIException) -> JSONResponse:
    """处理 API 异常"""
    logger.warning(
        f"API Exception: {exc.detail['message']} - "
        f"Path: {request.url.path} - "
        f"Method: {request.method}"
    )
    
    return error_response(
        message=exc.detail["message"],
        error_code=exc.detail.get("code"),
        details=exc.detail.get("details"),
        status_code=exc.status_code
    )


async def validation_exception_handler(
    request: Request, 
    exc: RequestValidationError
) -> JSONResponse:
    """处理请求验证异常"""
    logger.warning(
        f"Validation Error: {str(exc)} - "
        f"Path: {request.url.path} - "
        f"Method: {request.method}"
    )
    
    errors = {}
    for error in exc.errors():
        loc = ".".join(str(l) for l in error["loc"][1:])  # 跳过 body
        errors[loc] = error["msg"]
    
    return error_response(
        message="请求数据验证失败",
        error_code="VALIDATION_ERROR",
        details=errors,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
    )


async def pydantic_exception_handler(
    request: Request,
    exc: ValidationError
) -> JSONResponse:
    """处理 Pydantic 验证异常"""
    logger.warning(
        f"Pydantic Validation Error: {str(exc)} - "
        f"Path: {request.url.path}"
    )
    
    return error_response(
        message="数据验证失败",
        error_code="DATA_VALIDATION_ERROR",
        details=exc.errors(),
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
    )


async def database_exception_handler(
    request: Request,
    exc: SQLAlchemyError
) -> JSONResponse:
    """处理数据库异常"""
    logger.error(
        f"Database Error: {str(exc)} - "
        f"Path: {request.url.path} - "
        f"Method: {request.method}",
        exc_info=True
    )
    
    # 在生产环境隐藏详细错误信息
    from app.core.config import get_settings
    settings = get_settings()
    
    if settings.is_production:
        message = "数据库操作失败"
        details = None
    else:
        message = "数据库操作失败"
        details = {"error": str(exc)}
    
    return error_response(
        message=message,
        error_code="DATABASE_ERROR",
        details=details,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )


async def general_exception_handler(
    request: Request,
    exc: Exception
) -> JSONResponse:
    """处理通用异常"""
    logger.error(
        f"Unhandled Exception: {str(exc)} - "
        f"Path: {request.url.path} - "
        f"Method: {request.method}",
        exc_info=True
    )
    
    # 在生产环境隐藏详细错误信息
    from app.core.config import get_settings
    settings = get_settings()
    
    if settings.is_production:
        message = "服务器内部错误"
        details = None
    else:
        message = "服务器内部错误"
        details = {"error": str(exc), "type": type(exc).__name__}
    
    return error_response(
        message=message,
        error_code="INTERNAL_SERVER_ERROR",
        details=details,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )


def register_exception_handlers(app):
    """注册所有异常处理器"""
    from fastapi.exceptions import RequestValidationError
    from pydantic import ValidationError
    from sqlalchemy.exc import SQLAlchemyError
    
    # API 异常
    app.add_exception_handler(APIException, api_exception_handler)
    
    # 验证异常
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(ValidationError, pydantic_exception_handler)
    
    # 数据库异常
    app.add_exception_handler(SQLAlchemyError, database_exception_handler)
    
    # 通用异常
    app.add_exception_handler(Exception, general_exception_handler)