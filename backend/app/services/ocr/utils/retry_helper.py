"""
重试辅助工具
"""

import asyncio
import random
import time
from typing import Callable, Any, Type, Union, Tuple, TypeVar, Awaitable
import logging

from ..exceptions import OCRError, OCRTimeoutError, OCRAPIError

logger = logging.getLogger(__name__)

T = TypeVar('T')


class RetryHelper:
    """重试辅助器，支持指数退避"""
    
    def __init__(
        self,
        max_retries: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 60.0,
        backoff_factor: float = 2.0,
        jitter: bool = True
    ):
        """
        初始化重试配置
        
        Args:
            max_retries: 最大重试次数
            initial_delay: 初始延迟时间(秒)
            max_delay: 最大延迟时间(秒)
            backoff_factor: 退避因子
            jitter: 是否添加随机抖动
        """
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.backoff_factor = backoff_factor
        self.jitter = jitter
    
    async def retry_async(
        self,
        func: Callable[..., Awaitable[T]],
        *args,
        retryable_exceptions: Tuple[Type[Exception], ...] = (OCRAPIError,),
        **kwargs
    ) -> T:
        """
        异步重试装饰器
        
        Args:
            func: 要重试的异步函数
            *args: 函数参数
            retryable_exceptions: 可重试的异常类型
            **kwargs: 函数关键字参数
            
        Returns:
            函数执行结果
            
        Raises:
            最后一次执行的异常
        """
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                result = await func(*args, **kwargs)
                if attempt > 0:
                    logger.info(f"重试成功，尝试次数: {attempt + 1}")
                return result
                
            except Exception as e:
                last_exception = e
                
                # 检查是否为可重试异常
                if not isinstance(e, retryable_exceptions):
                    logger.error(f"不可重试异常: {type(e).__name__}: {e}")
                    raise
                
                # 最后一次尝试，不再重试
                if attempt == self.max_retries:
                    logger.error(f"重试次数耗尽，最终失败: {type(e).__name__}: {e}")
                    raise
                
                # 计算延迟时间
                delay = self._calculate_delay(attempt)
                
                logger.warning(
                    f"尝试 {attempt + 1}/{self.max_retries + 1} 失败: {type(e).__name__}: {e}, "
                    f"将在 {delay:.2f}秒后重试"
                )
                
                # 等待后重试
                await asyncio.sleep(delay)
        
        # 理论上不会到达这里
        if last_exception:
            raise last_exception
    
    def retry_sync(
        self,
        func: Callable[..., T],
        *args,
        retryable_exceptions: Tuple[Type[Exception], ...] = (OCRAPIError,),
        **kwargs
    ) -> T:
        """
        同步重试装饰器
        
        Args:
            func: 要重试的同步函数
            *args: 函数参数
            retryable_exceptions: 可重试的异常类型
            **kwargs: 函数关键字参数
            
        Returns:
            函数执行结果
            
        Raises:
            最后一次执行的异常
        """
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                result = func(*args, **kwargs)
                if attempt > 0:
                    logger.info(f"重试成功，尝试次数: {attempt + 1}")
                return result
                
            except Exception as e:
                last_exception = e
                
                # 检查是否为可重试异常
                if not isinstance(e, retryable_exceptions):
                    logger.error(f"不可重试异常: {type(e).__name__}: {e}")
                    raise
                
                # 最后一次尝试，不再重试
                if attempt == self.max_retries:
                    logger.error(f"重试次数耗尽，最终失败: {type(e).__name__}: {e}")
                    raise
                
                # 计算延迟时间
                delay = self._calculate_delay(attempt)
                
                logger.warning(
                    f"尝试 {attempt + 1}/{self.max_retries + 1} 失败: {type(e).__name__}: {e}, "
                    f"将在 {delay:.2f}秒后重试"
                )
                
                # 等待后重试
                time.sleep(delay)
        
        # 理论上不会到达这里
        if last_exception:
            raise last_exception
    
    def _calculate_delay(self, attempt: int) -> float:
        """
        计算延迟时间（指数退避 + 可选抖动）
        
        Args:
            attempt: 当前尝试次数（从0开始）
            
        Returns:
            延迟时间（秒）
        """
        # 指数退避
        delay = self.initial_delay * (self.backoff_factor ** attempt)
        
        # 限制最大延迟
        delay = min(delay, self.max_delay)
        
        # 添加随机抖动（避免雷群效应）
        if self.jitter:
            jitter_range = delay * 0.1  # 10%的抖动
            delay += random.uniform(-jitter_range, jitter_range)
        
        return max(0, delay)


class SmartPoller:
    """智能轮询器，支持指数退避"""
    
    def __init__(
        self,
        initial_interval: int = 10,
        max_interval: int = 60,
        backoff_factor: float = 1.5,
        timeout: int = 600
    ):
        """
        初始化轮询配置
        
        Args:
            initial_interval: 初始轮询间隔(秒)
            max_interval: 最大轮询间隔(秒)
            backoff_factor: 退避因子
            timeout: 总超时时间(秒)
        """
        self.initial_interval = initial_interval
        self.max_interval = max_interval
        self.backoff_factor = backoff_factor
        self.timeout = timeout
        self.current_interval = initial_interval
    
    async def poll_until_complete(
        self,
        check_func: Callable,
        *args,
        **kwargs
    ) -> Any:
        """
        轮询直到完成
        
        Args:
            check_func: 检查函数，返回(is_complete, result)
            *args: 检查函数参数
            **kwargs: 检查函数关键字参数
            
        Returns:
            轮询结果
            
        Raises:
            OCRTimeoutError: 轮询超时
        """
        start_time = time.time()
        poll_count = 0
        
        logger.info(f"开始轮询，超时时间: {self.timeout}秒")
        
        while time.time() - start_time < self.timeout:
            poll_count += 1
            
            try:
                is_complete, result = await check_func(*args, **kwargs)
                
                if is_complete:
                    elapsed = time.time() - start_time
                    logger.info(f"轮询完成，总耗时: {elapsed:.2f}秒，轮询次数: {poll_count}")
                    return result
                
                logger.debug(f"轮询 #{poll_count}，状态未完成，等待 {self.current_interval}秒")
                
                # 等待下次轮询
                await asyncio.sleep(self.current_interval)
                
                # 更新轮询间隔（指数退避）
                self._update_interval()
                
            except Exception as e:
                logger.error(f"轮询检查失败: {e}")
                # 继续轮询，但记录错误
                await asyncio.sleep(self.current_interval)
                self._update_interval()
        
        # 超时
        elapsed = time.time() - start_time
        raise OCRTimeoutError(f"轮询超时: {elapsed:.2f}秒，轮询次数: {poll_count}")
    
    def _update_interval(self):
        """更新轮询间隔（指数退避）"""
        self.current_interval = min(
            self.current_interval * self.backoff_factor,
            self.max_interval
        )
    
    def reset(self):
        """重置轮询间隔"""
        self.current_interval = self.initial_interval 