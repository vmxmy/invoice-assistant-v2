"""
标准化 API 响应格式模块

提供统一的 API 响应结构和辅助函数。
"""

from typing import Any, Dict, List, Optional, Union, TypeVar, Generic
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import status
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder


T = TypeVar('T')


class ResponseMeta(BaseModel):
    """响应元数据"""
    
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="响应时间戳")
    version: str = Field(default="v1", description="API 版本")
    request_id: Optional[str] = Field(default=None, description="请求 ID")


class ResponsePagination(BaseModel):
    """分页信息"""
    
    page: int = Field(ge=1, description="当前页码")
    page_size: int = Field(ge=1, le=100, description="每页大小")
    total_items: int = Field(ge=0, description="总记录数")
    total_pages: int = Field(ge=0, description="总页数")
    
    @classmethod
    def create(cls, page: int, page_size: int, total_items: int) -> "ResponsePagination":
        """创建分页信息"""
        total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 0
        return cls(
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages
        )


class BaseResponse(BaseModel, Generic[T]):
    """基础响应模型"""
    
    success: bool = Field(description="请求是否成功")
    message: str = Field(description="响应消息")
    data: Optional[T] = Field(default=None, description="响应数据")
    meta: ResponseMeta = Field(default_factory=ResponseMeta, description="元数据")
    code: Optional[str] = Field(default=None, description="业务状态码")


class SuccessResponse(BaseResponse[T]):
    """成功响应模型"""
    
    success: bool = Field(default=True)
    message: str = Field(default="操作成功")


class ErrorResponse(BaseResponse[None]):
    """错误响应模型"""
    
    success: bool = Field(default=False)
    error: Dict[str, Any] = Field(description="错误详情")
    

class PaginatedResponse(SuccessResponse[List[T]]):
    """分页响应模型"""
    
    pagination: ResponsePagination = Field(description="分页信息")


# 快捷响应函数
def success_response(
    data: Any = None,
    message: str = "操作成功",
    code: Optional[str] = None,
    status_code: int = status.HTTP_200_OK,
    **kwargs
) -> JSONResponse:
    """
    创建成功响应
    
    Args:
        data: 响应数据
        message: 响应消息
        code: 业务状态码
        status_code: HTTP 状态码
        **kwargs: 其他响应字段
    
    Returns:
        JSONResponse 对象
    """
    response = SuccessResponse(
        data=data,
        message=message,
        code=code,
        **kwargs
    )
    return JSONResponse(
        status_code=status_code,
        content=jsonable_encoder(response)
    )


def error_response(
    message: str,
    error_code: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    **kwargs
) -> JSONResponse:
    """
    创建错误响应
    
    Args:
        message: 错误消息
        error_code: 错误代码
        details: 错误详情
        status_code: HTTP 状态码
        **kwargs: 其他响应字段
    
    Returns:
        JSONResponse 对象
    """
    error_info = {
        "code": error_code or "ERROR",
        "message": message,
    }
    if details:
        error_info["details"] = details
        
    response = ErrorResponse(
        message=message,
        error=error_info,
        code=error_code,
        **kwargs
    )
    return JSONResponse(
        status_code=status_code,
        content=jsonable_encoder(response)
    )


def paginated_response(
    data: List[Any],
    page: int,
    page_size: int,
    total_items: int,
    message: str = "获取成功",
    **kwargs
) -> JSONResponse:
    """
    创建分页响应
    
    Args:
        data: 数据列表
        page: 当前页码
        page_size: 每页大小
        total_items: 总记录数
        message: 响应消息
        **kwargs: 其他响应字段
    
    Returns:
        JSONResponse 对象
    """
    pagination = ResponsePagination.create(
        page=page,
        page_size=page_size,
        total_items=total_items
    )
    
    response = PaginatedResponse(
        data=data,
        message=message,
        pagination=pagination,
        **kwargs
    )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=jsonable_encoder(response)
    )


def created_response(
    data: Any,
    message: str = "创建成功",
    location: Optional[str] = None,
    **kwargs
) -> JSONResponse:
    """
    创建资源成功响应
    
    Args:
        data: 创建的资源数据
        message: 响应消息
        location: 资源位置 URL
        **kwargs: 其他响应字段
    
    Returns:
        JSONResponse 对象
    """
    headers = {"Location": location} if location else None
    
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=jsonable_encoder(SuccessResponse(
            data=data,
            message=message,
            **kwargs
        )),
        headers=headers
    )


def no_content_response() -> JSONResponse:
    """
    无内容响应（用于删除等操作）
    
    Returns:
        JSONResponse 对象
    """
    return JSONResponse(
        status_code=status.HTTP_204_NO_CONTENT,
        content=None
    )


def accepted_response(
    task_id: str,
    message: str = "任务已接受",
    **kwargs
) -> JSONResponse:
    """
    异步任务接受响应
    
    Args:
        task_id: 任务 ID
        message: 响应消息
        **kwargs: 其他响应字段
    
    Returns:
        JSONResponse 对象
    """
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content=jsonable_encoder(SuccessResponse(
            data={"task_id": task_id},
            message=message,
            **kwargs
        ))
    )


# 响应示例
class ResponseExamples:
    """响应示例集合"""
    
    SUCCESS = {
        "success": True,
        "message": "操作成功",
        "data": {"id": 1, "name": "示例"},
        "meta": {
            "timestamp": "2024-01-01T00:00:00Z",
            "version": "v1"
        }
    }
    
    ERROR = {
        "success": False,
        "message": "操作失败",
        "data": None,
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "数据验证失败",
            "details": {"field": "必填字段不能为空"}
        },
        "meta": {
            "timestamp": "2024-01-01T00:00:00Z",
            "version": "v1"
        }
    }
    
    PAGINATED = {
        "success": True,
        "message": "获取成功",
        "data": [
            {"id": 1, "name": "项目1"},
            {"id": 2, "name": "项目2"}
        ],
        "pagination": {
            "page": 1,
            "page_size": 10,
            "total_items": 100,
            "total_pages": 10
        },
        "meta": {
            "timestamp": "2024-01-01T00:00:00Z",
            "version": "v1"
        }
    }