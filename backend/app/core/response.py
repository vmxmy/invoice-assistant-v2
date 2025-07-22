"""API响应工具模块"""
from typing import Any, Optional, Dict, Union
from pydantic import BaseModel


class APIResponse(BaseModel):
    """标准API响应格式"""
    success: bool = True
    message: str = "操作成功"
    data: Optional[Any] = None
    code: str = "OK"
    timestamp: Optional[str] = None
    
    class Config:
        json_encoders = {
            # 可以在这里添加自定义的JSON编码器
        }


def success_response(
    data: Any = None,
    message: str = "操作成功",
    code: str = "OK"
) -> Dict[str, Any]:
    """创建成功响应
    
    Args:
        data: 响应数据
        message: 响应消息
        code: 响应代码
        
    Returns:
        标准格式的成功响应
    """
    return {
        "success": True,
        "message": message,
        "data": data,
        "code": code
    }


def error_response(
    message: str = "操作失败",
    code: str = "ERROR",
    data: Any = None
) -> Dict[str, Any]:
    """创建错误响应
    
    Args:
        message: 错误消息
        code: 错误代码
        data: 错误数据
        
    Returns:
        标准格式的错误响应
    """
    return {
        "success": False,
        "message": message,
        "data": data,
        "code": code
    }