"""
JSON序列化工具

提供安全的JSON序列化功能，处理特殊对象类型。
"""

from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Union
from uuid import UUID
import json


def serialize_for_json(obj: Any) -> Any:
    """
    安全的JSON序列化函数
    
    处理常见的Python对象类型，将其转换为JSON可序列化的格式。
    
    Args:
        obj: 需要序列化的对象
        
    Returns:
        JSON可序列化的对象
    """
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, UUID):
        return str(obj)
    elif isinstance(obj, Enum):
        return obj.value
    elif hasattr(obj, '__dict__'):
        # 处理自定义对象
        return {
            k: serialize_for_json(v) 
            for k, v in obj.__dict__.items() 
            if not k.startswith('_')
        }
    elif isinstance(obj, dict):
        return {
            k: serialize_for_json(v) 
            for k, v in obj.items()
        }
    elif isinstance(obj, (list, tuple)):
        return [serialize_for_json(item) for item in obj]
    else:
        return obj


def safe_json_dumps(data: Any, **kwargs) -> str:
    """
    安全的JSON dumps函数
    
    使用自定义序列化器处理特殊对象。
    
    Args:
        data: 需要序列化的数据
        **kwargs: 传递给json.dumps的其他参数
        
    Returns:
        JSON字符串
    """
    return json.dumps(data, default=serialize_for_json, **kwargs)


def merge_dicts(base: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
    """
    深度合并两个字典
    
    Args:
        base: 基础字典
        update: 更新字典
        
    Returns:
        合并后的新字典
    """
    result = base.copy()
    
    for key, value in update.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_dicts(result[key], value)
        else:
            result[key] = value
    
    return result