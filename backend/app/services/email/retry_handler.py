"""
邮件服务的错误处理和重试机制
"""
import asyncio
import functools
import logging
from typing import Callable, Optional, Type, Tuple, Union, Any
from datetime import datetime, timedelta
import random

logger = logging.getLogger(__name__)


class EmailServiceError(Exception):
    """邮件服务基础异常"""
    pass


class IMAPConnectionError(EmailServiceError):
    """IMAP 连接错误"""
    pass


class IMAPAuthenticationError(EmailServiceError):
    """IMAP 认证错误"""
    pass


class IMAPQuotaExceededError(EmailServiceError):
    """IMAP 配额超限错误"""
    pass


class IMAPServerError(EmailServiceError):
    """IMAP 服务器错误"""
    pass


class RateLimitError(EmailServiceError):
    """频率限制错误"""
    pass


class RetryableError(EmailServiceError):
    """可重试的错误"""
    pass


class NonRetryableError(EmailServiceError):
    """不可重试的错误"""
    pass


# 错误分类映射
ERROR_CLASSIFICATIONS = {
    # 可重试的错误
    "LOGIN failed": RateLimitError,
    "login frequency limit": RateLimitError,
    "Connection refused": IMAPConnectionError,
    "Connection reset": IMAPConnectionError,
    "Connection timed out": IMAPConnectionError,
    "Network is unreachable": IMAPConnectionError,
    "IMAP4 protocol error": IMAPServerError,
    "Server not responding": IMAPServerError,
    "Mailbox is locked": RetryableError,
    "Temporary failure": RetryableError,
    
    # 不可重试的错误
    "Authentication failed": IMAPAuthenticationError,
    "Invalid credentials": IMAPAuthenticationError,
    "Account disabled": NonRetryableError,
    "Mailbox does not exist": NonRetryableError,
    "Permission denied": NonRetryableError,
}


def classify_error(error: Exception) -> Type[EmailServiceError]:
    """分类错误类型"""
    error_msg = str(error).lower()
    
    for pattern, error_class in ERROR_CLASSIFICATIONS.items():
        if pattern.lower() in error_msg:
            return error_class
    
    # 默认认为是可重试的错误
    return RetryableError


class RetryConfig:
    """重试配置"""
    
    def __init__(
        self,
        max_attempts: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
        retry_on: Optional[Tuple[Type[Exception], ...]] = None,
        dont_retry_on: Optional[Tuple[Type[Exception], ...]] = None
    ):
        self.max_attempts = max_attempts
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.retry_on = retry_on or (RetryableError, RateLimitError, IMAPConnectionError, IMAPServerError)
        self.dont_retry_on = dont_retry_on or (NonRetryableError, IMAPAuthenticationError)
    
    def should_retry(self, error: Exception) -> bool:
        """判断是否应该重试"""
        error_type = classify_error(error)
        
        # 检查不可重试的错误
        if isinstance(error, self.dont_retry_on) or issubclass(error_type, self.dont_retry_on):
            return False
        
        # 检查可重试的错误
        if isinstance(error, self.retry_on) or issubclass(error_type, self.retry_on):
            return True
        
        # 默认不重试
        return False
    
    def get_delay(self, attempt: int) -> float:
        """计算重试延迟"""
        delay = min(
            self.initial_delay * (self.exponential_base ** (attempt - 1)),
            self.max_delay
        )
        
        if self.jitter:
            # 添加随机抖动，避免同时重试
            delay = delay * (0.5 + random.random())
        
        return delay


def with_retry(
    config: Optional[RetryConfig] = None,
    on_retry: Optional[Callable] = None,
    on_error: Optional[Callable] = None
):
    """重试装饰器
    
    Args:
        config: 重试配置
        on_retry: 重试时的回调函数
        on_error: 错误时的回调函数
    """
    if config is None:
        config = RetryConfig()
    
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            last_error = None
            
            for attempt in range(1, config.max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                    
                except Exception as e:
                    last_error = e
                    
                    # 分类错误
                    error_type = classify_error(e)
                    logger.warning(
                        f"函数 {func.__name__} 执行失败 (尝试 {attempt}/{config.max_attempts}): "
                        f"{error_type.__name__}: {str(e)}"
                    )
                    
                    # 检查是否应该重试
                    if not config.should_retry(e) or attempt == config.max_attempts:
                        if on_error:
                            await on_error(e, attempt, func.__name__)
                        raise
                    
                    # 计算延迟
                    delay = config.get_delay(attempt)
                    
                    # 特殊处理频率限制错误
                    if isinstance(e, RateLimitError) or error_type == RateLimitError:
                        # 频率限制错误使用更长的延迟
                        delay = max(delay, 30.0 * attempt)
                    
                    if on_retry:
                        await on_retry(e, attempt, delay, func.__name__)
                    
                    logger.info(f"等待 {delay:.1f} 秒后重试...")
                    await asyncio.sleep(delay)
            
            # 不应该到达这里
            raise last_error
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            last_error = None
            
            for attempt in range(1, config.max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                    
                except Exception as e:
                    last_error = e
                    
                    # 分类错误
                    error_type = classify_error(e)
                    logger.warning(
                        f"函数 {func.__name__} 执行失败 (尝试 {attempt}/{config.max_attempts}): "
                        f"{error_type.__name__}: {str(e)}"
                    )
                    
                    # 检查是否应该重试
                    if not config.should_retry(e) or attempt == config.max_attempts:
                        if on_error:
                            on_error(e, attempt, func.__name__)
                        raise
                    
                    # 计算延迟
                    delay = config.get_delay(attempt)
                    
                    # 特殊处理频率限制错误
                    if isinstance(e, RateLimitError) or error_type == RateLimitError:
                        delay = max(delay, 30.0 * attempt)
                    
                    if on_retry:
                        on_retry(e, attempt, delay, func.__name__)
                    
                    logger.info(f"等待 {delay:.1f} 秒后重试...")
                    import time
                    time.sleep(delay)
            
            raise last_error
        
        # 根据函数类型返回相应的包装器
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


class CircuitBreaker:
    """断路器模式实现
    
    用于防止频繁失败的操作继续执行
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: Optional[Type[Exception]] = None
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception or Exception
        
        self._failure_count = 0
        self._last_failure_time = None
        self._state = 'closed'  # closed, open, half-open
    
    @property
    def state(self) -> str:
        """获取当前状态"""
        if self._state == 'open':
            # 检查是否可以进入半开状态
            if self._last_failure_time:
                elapsed = (datetime.now() - self._last_failure_time).total_seconds()
                if elapsed >= self.recovery_timeout:
                    self._state = 'half-open'
        
        return self._state
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """执行函数调用"""
        if self.state == 'open':
            raise EmailServiceError("Circuit breaker is open")
        
        try:
            result = func(*args, **kwargs)
            
            # 成功调用，重置失败计数
            if self._state == 'half-open':
                self._state = 'closed'
            self._failure_count = 0
            
            return result
            
        except self.expected_exception as e:
            self._failure_count += 1
            self._last_failure_time = datetime.now()
            
            if self._failure_count >= self.failure_threshold:
                self._state = 'open'
                logger.error(f"Circuit breaker opened due to {self._failure_count} failures")
            
            raise
    
    async def async_call(self, func: Callable, *args, **kwargs) -> Any:
        """异步执行函数调用"""
        if self.state == 'open':
            raise EmailServiceError("Circuit breaker is open")
        
        try:
            result = await func(*args, **kwargs)
            
            # 成功调用，重置失败计数
            if self._state == 'half-open':
                self._state = 'closed'
            self._failure_count = 0
            
            return result
            
        except self.expected_exception as e:
            self._failure_count += 1
            self._last_failure_time = datetime.now()
            
            if self._failure_count >= self.failure_threshold:
                self._state = 'open'
                logger.error(f"Circuit breaker opened due to {self._failure_count} failures")
            
            raise
    
    def reset(self):
        """重置断路器"""
        self._failure_count = 0
        self._last_failure_time = None
        self._state = 'closed'


# 预定义的重试配置
QUICK_RETRY = RetryConfig(
    max_attempts=2,
    initial_delay=0.5,
    max_delay=5.0
)

STANDARD_RETRY = RetryConfig(
    max_attempts=3,
    initial_delay=1.0,
    max_delay=30.0
)

AGGRESSIVE_RETRY = RetryConfig(
    max_attempts=5,
    initial_delay=2.0,
    max_delay=120.0
)

RATE_LIMIT_RETRY = RetryConfig(
    max_attempts=3,
    initial_delay=30.0,
    max_delay=300.0,
    retry_on=(RateLimitError,)
)