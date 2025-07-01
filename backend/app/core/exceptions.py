"""
自定义异常类模块

定义应用中使用的各种异常类。
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class InvoiceAssistantException(Exception):
    """发票助手基础异常类"""
    
    def __init__(
        self,
        message: str,
        code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)


class APIException(HTTPException):
    """API 异常基类"""
    
    def __init__(
        self,
        status_code: int,
        message: str,
        code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ):
        detail = {
            "message": message,
            "code": code or self.__class__.__name__,
            "details": details or {}
        }
        super().__init__(status_code=status_code, detail=detail, headers=headers)


# 认证相关异常
class AuthenticationError(APIException):
    """认证失败异常"""
    
    def __init__(self, message: str = "认证失败", **kwargs):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=message,
            **kwargs
        )


class AuthorizationError(APIException):
    """授权失败异常"""
    
    def __init__(self, message: str = "无权访问", **kwargs):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=message,
            **kwargs
        )


class TokenExpiredError(AuthenticationError):
    """Token 过期异常"""
    
    def __init__(self, message: str = "Token 已过期", **kwargs):
        super().__init__(message=message, code="TOKEN_EXPIRED", **kwargs)


class InvalidTokenError(AuthenticationError):
    """无效 Token 异常"""
    
    def __init__(self, message: str = "无效的 Token", **kwargs):
        super().__init__(message=message, code="INVALID_TOKEN", **kwargs)


# 数据相关异常
class NotFoundError(APIException):
    """资源不存在异常"""
    
    def __init__(self, 
                 resource: str = "资源",
                 message: Optional[str] = None,
                 **kwargs):
        msg = message or f"{resource}不存在"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=msg,
            **kwargs
        )


class DuplicateError(APIException):
    """重复资源异常"""
    
    def __init__(self,
                 resource: str = "资源",
                 message: Optional[str] = None,
                 **kwargs):
        msg = message or f"{resource}已存在"
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            message=msg,
            **kwargs
        )


class ValidationError(APIException):
    """数据验证异常"""
    
    def __init__(self, message: str = "数据验证失败", **kwargs):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message=message,
            **kwargs
        )


# 业务逻辑异常
class BusinessLogicError(APIException):
    """业务逻辑异常"""
    
    def __init__(self, message: str, **kwargs):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            **kwargs
        )


class InvoiceProcessingError(BusinessLogicError):
    """发票处理异常"""
    
    def __init__(self, message: str = "发票处理失败", **kwargs):
        super().__init__(message=message, code="INVOICE_PROCESSING_ERROR", **kwargs)


class EmailProcessingError(BusinessLogicError):
    """邮件处理异常"""
    
    def __init__(self, message: str = "邮件处理失败", **kwargs):
        super().__init__(message=message, code="EMAIL_PROCESSING_ERROR", **kwargs)


class OCRError(BusinessLogicError):
    """OCR 识别异常"""
    
    def __init__(self, message: str = "OCR 识别失败", **kwargs):
        super().__init__(message=message, code="OCR_ERROR", **kwargs)


# 系统异常
class DatabaseError(APIException):
    """数据库异常"""
    
    def __init__(self, message: str = "数据库操作失败", **kwargs):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=message,
            code="DATABASE_ERROR",
            **kwargs
        )


class ExternalServiceError(APIException):
    """外部服务异常"""
    
    def __init__(self,
                 service: str,
                 message: Optional[str] = None,
                 **kwargs):
        msg = message or f"{service}服务异常"
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            message=msg,
            code="EXTERNAL_SERVICE_ERROR",
            **kwargs
        )


class ConfigurationError(InvoiceAssistantException):
    """配置错误异常"""
    
    def __init__(self, message: str = "配置错误", **kwargs):
        super().__init__(message=message, code="CONFIGURATION_ERROR")