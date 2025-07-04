"""
字典工具函数

提供字典操作的实用函数。
"""

from typing import Dict, Any


def deep_merge(base: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
    """
    深度合并两个字典
    
    Args:
        base: 基础字典
        updates: 要合并的更新字典
        
    Returns:
        合并后的新字典
        
    Example:
        >>> base = {"a": 1, "b": {"c": 2, "d": 3}}
        >>> updates = {"b": {"c": 4, "e": 5}, "f": 6}
        >>> deep_merge(base, updates)
        {"a": 1, "b": {"c": 4, "d": 3, "e": 5}, "f": 6}
    """
    result = base.copy()
    
    for key, value in updates.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    
    return result