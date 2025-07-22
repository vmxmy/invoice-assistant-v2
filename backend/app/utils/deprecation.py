"""
废弃代码管理工具
"""
import warnings
import logging
from functools import wraps
from typing import Callable, Optional

logger = logging.getLogger(__name__)


def deprecated(reason: str, version: Optional[str] = None) -> Callable:
    """标记函数或方法为废弃
    
    Args:
        reason: 废弃原因和替代方案
        version: 废弃版本号
        
    Example:
        @deprecated("使用 new_function 替代", version="2.0")
        def old_function():
            pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 发出废弃警告
            warning_msg = f"{func.__name__} 已废弃"
            if version:
                warning_msg += f" (自版本 {version})"
            warning_msg += f". {reason}"
            
            warnings.warn(
                warning_msg,
                DeprecationWarning,
                stacklevel=2
            )
            
            # 记录到日志
            logger.warning(
                f"调用了废弃的函数 {func.__module__}.{func.__name__}: {reason}"
            )
            
            # 调用原函数
            return func(*args, **kwargs)
        
        # 更新文档字符串
        if wrapper.__doc__:
            wrapper.__doc__ = f"{wrapper.__doc__}\n\n.. deprecated:: {version or '2.0'}\n   {reason}"
        else:
            wrapper.__doc__ = f".. deprecated:: {version or '2.0'}\n   {reason}"
        
        return wrapper
    return decorator


def deprecated_parameter(param_name: str, reason: str, version: Optional[str] = None) -> Callable:
    """标记函数参数为废弃
    
    Args:
        param_name: 废弃的参数名
        reason: 废弃原因
        version: 废弃版本号
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            if param_name in kwargs:
                warning_msg = f"参数 '{param_name}' 已废弃"
                if version:
                    warning_msg += f" (自版本 {version})"
                warning_msg += f". {reason}"
                
                warnings.warn(
                    warning_msg,
                    DeprecationWarning,
                    stacklevel=2
                )
                
                logger.warning(
                    f"使用了废弃的参数 {param_name} in {func.__module__}.{func.__name__}: {reason}"
                )
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


class DeprecationMonitor:
    """废弃代码使用监控"""
    
    def __init__(self):
        self.usage_count = {}
        
    def track_usage(self, feature_name: str, user_id: Optional[str] = None):
        """跟踪废弃功能的使用情况"""
        if feature_name not in self.usage_count:
            self.usage_count[feature_name] = {
                'count': 0,
                'users': set()
            }
        
        self.usage_count[feature_name]['count'] += 1
        if user_id:
            self.usage_count[feature_name]['users'].add(user_id)
    
    def get_usage_report(self) -> dict:
        """获取使用报告"""
        report = {}
        for feature, data in self.usage_count.items():
            report[feature] = {
                'total_calls': data['count'],
                'unique_users': len(data['users']),
                'user_list': list(data['users'])[:10]  # 只显示前10个用户
            }
        return report
    
    def clear_stats(self):
        """清空统计数据"""
        self.usage_count.clear()


# 全局监控实例
deprecation_monitor = DeprecationMonitor()