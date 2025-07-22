"""
统一API响应格式基类

基于2025年API最佳实践，采用直接响应模式，避免不必要的响应包装。
支持FastAPI的自动文档生成和类型验证。
"""

from typing import TypeVar, Generic, List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime

T = TypeVar('T')

class BaseListResponse(BaseModel, Generic[T]):
    """
    通用列表响应格式
    
    用于返回分页列表数据，包含必要的分页信息
    """
    items: List[T] = Field(..., description="数据列表")
    total: int = Field(..., description="总数量")
    page: int = Field(default=1, ge=1, description="当前页码")
    page_size: int = Field(default=20, ge=1, le=100, description="每页大小")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class BaseResponse(BaseModel):
    """
    基础响应格式
    
    用于仅返回操作结果消息，无具体数据的情况
    如：删除操作、状态更新等
    """
    message: str = Field(default="操作成功", description="响应消息")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow, description="响应时间")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ErrorDetail(BaseModel):
    """
    标准错误详情格式
    
    用于HTTP 4xx/5xx状态码时的错误响应
    """
    detail: str = Field(..., description="错误详情")
    code: Optional[str] = Field(None, description="业务错误代码")
    field: Optional[str] = Field(None, description="相关字段名（用于表单验证错误）")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="错误发生时间")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ValidationErrorDetail(BaseModel):
    """
    字段验证错误详情
    
    用于表单验证失败时的详细错误信息
    """
    field: str = Field(..., description="错误字段")
    message: str = Field(..., description="错误消息")
    value: Optional[Any] = Field(None, description="错误值")


class ValidationErrorResponse(BaseModel):
    """
    验证错误响应格式
    
    用于HTTP 422状态码的验证错误响应
    """
    detail: str = Field(default="输入数据验证失败", description="总体错误描述")
    errors: List[ValidationErrorDetail] = Field(..., description="具体字段错误列表")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="错误发生时间")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class HealthResponse(BaseModel):
    """
    健康检查响应格式
    """
    status: str = Field(..., description="服务状态", example="healthy")
    version: Optional[str] = Field(None, description="服务版本")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="检查时间")
    dependencies: Optional[Dict[str, str]] = Field(None, description="依赖服务状态")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class StatisticsResponse(BaseModel):
    """
    统计数据响应格式
    
    用于各种统计接口的通用响应格式
    """
    period: str = Field(..., description="统计周期", example="last_30_days")
    metrics: Dict[str, Any] = Field(..., description="统计指标")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="统计生成时间")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# 常用的便捷类型别名
StringListResponse = BaseListResponse[str]
IntListResponse = BaseListResponse[int]

# 通用响应工具函数
def create_list_response(
    items: List[T], 
    total: int, 
    page: int = 1, 
    page_size: int = 20
) -> BaseListResponse[T]:
    """
    创建列表响应的便捷函数
    
    Args:
        items: 数据列表
        total: 总数量
        page: 当前页码
        page_size: 每页大小
        
    Returns:
        BaseListResponse实例
    """
    return BaseListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


def create_success_response(message: str = "操作成功") -> BaseResponse:
    """
    创建成功响应的便捷函数
    
    Args:
        message: 成功消息
        
    Returns:
        BaseResponse实例
    """
    return BaseResponse(message=message)


def create_error_detail(
    detail: str,
    code: Optional[str] = None,
    field: Optional[str] = None
) -> ErrorDetail:
    """
    创建错误详情的便捷函数
    
    Args:
        detail: 错误详情
        code: 错误代码
        field: 相关字段
        
    Returns:
        ErrorDetail实例
    """
    return ErrorDetail(detail=detail, code=code, field=field)