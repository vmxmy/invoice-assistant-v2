"""
统一错误处理工具

提供标准化的错误处理和日志记录功能。
"""

import traceback
import logging
from typing import Optional, Dict, Any, Union
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from pydantic import ValidationError as PydanticValidationError

from app.core.exceptions import (
    AppException, 
    AuthenticationError, 
    AuthorizationError,
    ValidationError,
    BusinessLogicError,
    NotFoundError
)

logger = logging.getLogger(__name__)


class ErrorHandler:
    """统一错误处理器"""
    
    @staticmethod
    def log_error(
        error: Exception,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> str:
        """
        记录错误日志
        
        Args:
            error: 异常实例
            context: 错误上下文
            user_id: 用户ID
            request_id: 请求ID
            
        Returns:
            str: 错误ID用于追踪
        """
        
        error_id = str(uuid4())
        error_type = type(error).__name__
        error_message = str(error)
        
        # 构建日志上下文
        log_context = {
            "error_id": error_id,
            "error_type": error_type,
            "error_message": error_message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "request_id": request_id,
            "context": context or {},
            "traceback": traceback.format_exc() if logger.isEnabledFor(logging.DEBUG) else None
        }
        
        # 根据错误类型选择日志级别
        if isinstance(error, (AuthenticationError, AuthorizationError)):
            logger.warning(f"Security error [{error_id}]: {error_message}", extra=log_context)
        elif isinstance(error, ValidationError):
            logger.info(f"Validation error [{error_id}]: {error_message}", extra=log_context)
        elif isinstance(error, BusinessLogicError):
            logger.warning(f"Business logic error [{error_id}]: {error_message}", extra=log_context)
        elif isinstance(error, SQLAlchemyError):
            logger.error(f"Database error [{error_id}]: {error_message}", extra=log_context)
        else:
            logger.error(f"Unexpected error [{error_id}]: {error_message}", extra=log_context)
        
        return error_id
    
    @staticmethod
    def handle_database_error(error: SQLAlchemyError) -> HTTPException:
        """
        处理数据库错误
        
        Args:
            error: SQLAlchemy错误
            
        Returns:
            HTTPException: 标准化的HTTP异常
        """
        
        error_id = ErrorHandler.log_error(error)
        
        if isinstance(error, IntegrityError):
            # 完整性约束错误
            if "unique" in str(error).lower():
                return HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "type": "duplicate_resource",
                        "message": "资源已存在",
                        "error_id": error_id
                    }
                )
            elif "foreign key" in str(error).lower():
                return HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "type": "invalid_reference",
                        "message": "引用的资源不存在",
                        "error_id": error_id
                    }
                )
            else:
                return HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "type": "data_integrity_error",
                        "message": "数据完整性错误",
                        "error_id": error_id
                    }
                )
        else:
            # 其他数据库错误
            return HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "type": "database_error",
                    "message": "数据库操作失败",
                    "error_id": error_id
                }
            )
    
    @staticmethod
    def handle_validation_error(error: Union[PydanticValidationError, ValidationError]) -> HTTPException:
        """
        处理验证错误
        
        Args:
            error: 验证错误
            
        Returns:
            HTTPException: 标准化的HTTP异常
        """
        
        error_id = ErrorHandler.log_error(error)
        
        if isinstance(error, PydanticValidationError):
            # Pydantic验证错误
            return HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "type": "validation_error",
                    "message": "请求参数验证失败",
                    "errors": error.errors(),
                    "error_id": error_id
                }
            )
        else:
            # 自定义验证错误
            return HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "type": "validation_error",
                    "message": str(error),
                    "error_id": error_id
                }
            )
    
    @staticmethod
    def handle_business_error(error: BusinessLogicError) -> HTTPException:
        """
        处理业务逻辑错误
        
        Args:
            error: 业务逻辑错误
            
        Returns:
            HTTPException: 标准化的HTTP异常
        """
        
        error_id = ErrorHandler.log_error(error)
        
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "type": "business_logic_error",
                "message": str(error),
                "error_id": error_id
            }
        )
    
    @staticmethod
    def handle_auth_error(error: Union[AuthenticationError, AuthorizationError]) -> HTTPException:
        """
        处理认证/授权错误
        
        Args:
            error: 认证或授权错误
            
        Returns:
            HTTPException: 标准化的HTTP异常
        """
        
        error_id = ErrorHandler.log_error(error)
        
        if isinstance(error, AuthenticationError):
            return HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "type": "authentication_error",
                    "message": "认证失败",
                    "error_id": error_id
                }
            )
        else:  # AuthorizationError
            return HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "type": "authorization_error",
                    "message": "权限不足",
                    "error_id": error_id
                }
            )
    
    @staticmethod
    def handle_not_found_error(error: NotFoundError) -> HTTPException:
        """
        处理资源不存在错误
        
        Args:
            error: 资源不存在错误
            
        Returns:
            HTTPException: 标准化的HTTP异常
        """
        
        error_id = ErrorHandler.log_error(error)
        
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "type": "not_found_error",
                "message": str(error),
                "error_id": error_id
            }
        )
    
    @staticmethod
    def handle_generic_error(error: Exception) -> HTTPException:
        """
        处理通用错误
        
        Args:
            error: 通用异常
            
        Returns:
            HTTPException: 标准化的HTTP异常
        """
        
        error_id = ErrorHandler.log_error(error)
        
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "type": "internal_server_error",
                "message": "服务器内部错误",
                "error_id": error_id
            }
        )


# 装饰器用于自动错误处理
def handle_errors(func):
    """
    自动错误处理装饰器
    
    捕获并转换常见异常为标准化的HTTP响应。
    """
    
    async def async_wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except AppException as e:
            # 应用自定义异常
            if isinstance(e, AuthenticationError):
                raise ErrorHandler.handle_auth_error(e)
            elif isinstance(e, AuthorizationError):
                raise ErrorHandler.handle_auth_error(e)
            elif isinstance(e, ValidationError):
                raise ErrorHandler.handle_validation_error(e)
            elif isinstance(e, BusinessLogicError):
                raise ErrorHandler.handle_business_error(e)
            elif isinstance(e, NotFoundError):
                raise ErrorHandler.handle_not_found_error(e)
            else:
                raise ErrorHandler.handle_generic_error(e)
        except SQLAlchemyError as e:
            raise ErrorHandler.handle_database_error(e)
        except PydanticValidationError as e:
            raise ErrorHandler.handle_validation_error(e)
        except Exception as e:
            raise ErrorHandler.handle_generic_error(e)
    
    def sync_wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except AppException as e:
            if isinstance(e, AuthenticationError):
                raise ErrorHandler.handle_auth_error(e)
            elif isinstance(e, AuthorizationError):
                raise ErrorHandler.handle_auth_error(e)
            elif isinstance(e, ValidationError):
                raise ErrorHandler.handle_validation_error(e)
            elif isinstance(e, BusinessLogicError):
                raise ErrorHandler.handle_business_error(e)
            elif isinstance(e, NotFoundError):
                raise ErrorHandler.handle_not_found_error(e)
            else:
                raise ErrorHandler.handle_generic_error(e)
        except SQLAlchemyError as e:
            raise ErrorHandler.handle_database_error(e)
        except PydanticValidationError as e:
            raise ErrorHandler.handle_validation_error(e)
        except Exception as e:
            raise ErrorHandler.handle_generic_error(e)
    
    # 判断是否为异步函数
    import inspect
    if inspect.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper


class ErrorContext:
    """错误上下文管理器"""
    
    def __init__(self, operation: str, **context):
        self.operation = operation
        self.context = context
        self.start_time = datetime.now(timezone.utc)
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_val:
            duration = (datetime.now(timezone.utc) - self.start_time).total_seconds()
            self.context.update({
                "operation": self.operation,
                "duration_seconds": duration
            })
            ErrorHandler.log_error(exc_val, context=self.context)
        return False  # 不抑制异常


# 用于API endpoint的错误处理中间件
async def error_handling_middleware(request, call_next):
    """
    全局错误处理中间件
    """
    
    try:
        response = await call_next(request)
        return response
    except HTTPException:
        # 已经是HTTP异常，直接传递
        raise
    except AppException as e:
        # 应用自定义异常
        if isinstance(e, AuthenticationError):
            raise ErrorHandler.handle_auth_error(e)
        elif isinstance(e, AuthorizationError):
            raise ErrorHandler.handle_auth_error(e)
        elif isinstance(e, ValidationError):
            raise ErrorHandler.handle_validation_error(e)
        elif isinstance(e, BusinessLogicError):
            raise ErrorHandler.handle_business_error(e)
        elif isinstance(e, NotFoundError):
            raise ErrorHandler.handle_not_found_error(e)
        else:
            raise ErrorHandler.handle_generic_error(e)
    except SQLAlchemyError as e:
        raise ErrorHandler.handle_database_error(e)
    except Exception as e:
        raise ErrorHandler.handle_generic_error(e)