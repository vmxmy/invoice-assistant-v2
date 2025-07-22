"""
性能监控服务

监控统一发票处理的性能指标，包括：
- 处理时间
- 内存使用
- 并发处理能力
- 错误率
"""

import time
import psutil
import asyncio
import logging
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from functools import wraps
import json
from pathlib import Path

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """性能监控器"""
    
    def __init__(self, metrics_dir: Optional[Path] = None):
        """初始化监控器
        
        Args:
            metrics_dir: 指标存储目录
        """
        self.metrics_dir = metrics_dir or Path("backend/monitoring/metrics")
        self.metrics_dir.mkdir(parents=True, exist_ok=True)
        
        self.current_metrics = {
            'processing_times': [],
            'memory_usage': [],
            'concurrent_tasks': 0,
            'error_count': 0,
            'success_count': 0,
            'ocr_times': [],
            'db_times': [],
            'file_io_times': []
        }
        
        self.performance_thresholds = {
            'max_processing_time': 10.0,  # 秒
            'max_memory_usage': 500,  # MB
            'max_error_rate': 0.05,  # 5%
            'min_success_rate': 0.95  # 95%
        }
    
    @asynccontextmanager
    async def track_operation(self, operation_name: str, metadata: Optional[Dict[str, Any]] = None):
        """跟踪操作性能
        
        Args:
            operation_name: 操作名称
            metadata: 额外的元数据
        """
        start_time = time.time()
        start_memory = self._get_memory_usage()
        
        # 增加并发任务计数
        self.current_metrics['concurrent_tasks'] += 1
        
        try:
            yield
            
            # 记录成功
            self.current_metrics['success_count'] += 1
            
        except Exception as e:
            # 记录错误
            self.current_metrics['error_count'] += 1
            logger.error(f"操作 {operation_name} 失败: {str(e)}")
            raise
        
        finally:
            # 计算耗时和内存变化
            end_time = time.time()
            end_memory = self._get_memory_usage()
            
            duration = end_time - start_time
            memory_delta = end_memory - start_memory
            
            # 减少并发任务计数
            self.current_metrics['concurrent_tasks'] -= 1
            
            # 记录指标
            metric_data = {
                'operation': operation_name,
                'duration': duration,
                'memory_delta': memory_delta,
                'timestamp': datetime.utcnow().isoformat(),
                'metadata': metadata
            }
            
            # 分类记录
            if operation_name.startswith('ocr_'):
                self.current_metrics['ocr_times'].append(duration)
            elif operation_name.startswith('db_'):
                self.current_metrics['db_times'].append(duration)
            elif operation_name.startswith('file_'):
                self.current_metrics['file_io_times'].append(duration)
            else:
                self.current_metrics['processing_times'].append(duration)
            
            self.current_metrics['memory_usage'].append(end_memory)
            
            # 检查性能阈值
            self._check_thresholds(operation_name, duration, end_memory)
            
            # 定期保存指标
            if len(self.current_metrics['processing_times']) % 100 == 0:
                await self.save_metrics()
    
    def track_batch_processing(self, func: Callable) -> Callable:
        """批量处理性能跟踪装饰器"""
        @wraps(func)
        async def wrapper(*args, **kwargs):
            batch_size = kwargs.get('batch_size', len(args[1]) if len(args) > 1 else 0)
            
            async with self.track_operation(
                f"batch_processing_{func.__name__}",
                metadata={'batch_size': batch_size}
            ):
                result = await func(*args, **kwargs)
                
                # 记录批处理特定指标
                if isinstance(result, dict):
                    if 'success_rate' in result:
                        self._record_batch_metrics(result)
                
                return result
        
        return wrapper
    
    def _get_memory_usage(self) -> float:
        """获取当前进程内存使用（MB）"""
        process = psutil.Process()
        return process.memory_info().rss / 1024 / 1024
    
    def _check_thresholds(self, operation: str, duration: float, memory: float):
        """检查性能阈值"""
        alerts = []
        
        if duration > self.performance_thresholds['max_processing_time']:
            alerts.append({
                'type': 'slow_processing',
                'operation': operation,
                'duration': duration,
                'threshold': self.performance_thresholds['max_processing_time']
            })
        
        if memory > self.performance_thresholds['max_memory_usage']:
            alerts.append({
                'type': 'high_memory',
                'operation': operation,
                'memory': memory,
                'threshold': self.performance_thresholds['max_memory_usage']
            })
        
        # 计算错误率
        total = self.current_metrics['success_count'] + self.current_metrics['error_count']
        if total > 0:
            error_rate = self.current_metrics['error_count'] / total
            if error_rate > self.performance_thresholds['max_error_rate']:
                alerts.append({
                    'type': 'high_error_rate',
                    'error_rate': error_rate,
                    'threshold': self.performance_thresholds['max_error_rate']
                })
        
        # 记录告警
        for alert in alerts:
            logger.warning(f"性能告警: {alert}")
            self._save_alert(alert)
    
    def _record_batch_metrics(self, batch_result: Dict[str, Any]):
        """记录批处理指标"""
        metrics = {
            'batch_size': batch_result.get('total_files', 0),
            'success_count': batch_result.get('successful_files', 0),
            'failure_count': batch_result.get('failed_files', 0),
            'success_rate': batch_result.get('success_rate', 0),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # 保存批处理指标
        batch_metrics_file = self.metrics_dir / f"batch_metrics_{datetime.now().strftime('%Y%m%d')}.jsonl"
        with open(batch_metrics_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(metrics, ensure_ascii=False) + '\n')
    
    def _save_alert(self, alert: Dict[str, Any]):
        """保存性能告警"""
        alert['timestamp'] = datetime.utcnow().isoformat()
        
        alerts_file = self.metrics_dir / f"performance_alerts_{datetime.now().strftime('%Y%m%d')}.jsonl"
        with open(alerts_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(alert, ensure_ascii=False) + '\n')
    
    async def save_metrics(self):
        """保存当前指标"""
        metrics_summary = {
            'timestamp': datetime.utcnow().isoformat(),
            'processing': {
                'avg_time': self._calculate_avg(self.current_metrics['processing_times']),
                'max_time': max(self.current_metrics['processing_times']) if self.current_metrics['processing_times'] else 0,
                'min_time': min(self.current_metrics['processing_times']) if self.current_metrics['processing_times'] else 0,
                'count': len(self.current_metrics['processing_times'])
            },
            'ocr': {
                'avg_time': self._calculate_avg(self.current_metrics['ocr_times']),
                'count': len(self.current_metrics['ocr_times'])
            },
            'database': {
                'avg_time': self._calculate_avg(self.current_metrics['db_times']),
                'count': len(self.current_metrics['db_times'])
            },
            'file_io': {
                'avg_time': self._calculate_avg(self.current_metrics['file_io_times']),
                'count': len(self.current_metrics['file_io_times'])
            },
            'memory': {
                'avg_usage': self._calculate_avg(self.current_metrics['memory_usage']),
                'max_usage': max(self.current_metrics['memory_usage']) if self.current_metrics['memory_usage'] else 0,
                'current_usage': self._get_memory_usage()
            },
            'concurrency': {
                'current_tasks': self.current_metrics['concurrent_tasks'],
                'max_concurrent': max([self.current_metrics['concurrent_tasks']] + 
                                     [m.get('concurrent_tasks', 0) for m in self.current_metrics.get('history', [])])
            },
            'reliability': {
                'success_count': self.current_metrics['success_count'],
                'error_count': self.current_metrics['error_count'],
                'success_rate': self._calculate_success_rate()
            }
        }
        
        # 保存汇总指标
        summary_file = self.metrics_dir / f"metrics_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(metrics_summary, f, ensure_ascii=False, indent=2)
        
        logger.info(f"性能指标已保存: {summary_file}")
        
        # 重置部分指标（保留历史）
        self._reset_metrics()
    
    def _calculate_avg(self, values: List[float]) -> float:
        """计算平均值"""
        if not values:
            return 0.0
        return sum(values) / len(values)
    
    def _calculate_success_rate(self) -> float:
        """计算成功率"""
        total = self.current_metrics['success_count'] + self.current_metrics['error_count']
        if total == 0:
            return 0.0
        return self.current_metrics['success_count'] / total
    
    def _reset_metrics(self):
        """重置短期指标"""
        # 保留一些历史数据
        self.current_metrics['processing_times'] = self.current_metrics['processing_times'][-100:]
        self.current_metrics['memory_usage'] = self.current_metrics['memory_usage'][-100:]
        self.current_metrics['ocr_times'] = self.current_metrics['ocr_times'][-50:]
        self.current_metrics['db_times'] = self.current_metrics['db_times'][-50:]
        self.current_metrics['file_io_times'] = self.current_metrics['file_io_times'][-50:]
    
    def get_performance_report(self) -> Dict[str, Any]:
        """获取性能报告"""
        return {
            'summary': {
                'avg_processing_time': self._calculate_avg(self.current_metrics['processing_times']),
                'avg_memory_usage': self._calculate_avg(self.current_metrics['memory_usage']),
                'success_rate': self._calculate_success_rate(),
                'current_concurrent_tasks': self.current_metrics['concurrent_tasks']
            },
            'details': {
                'processing_stats': self._get_stats(self.current_metrics['processing_times']),
                'ocr_stats': self._get_stats(self.current_metrics['ocr_times']),
                'db_stats': self._get_stats(self.current_metrics['db_times']),
                'memory_stats': self._get_stats(self.current_metrics['memory_usage'])
            },
            'alerts': self._get_recent_alerts()
        }
    
    def _get_stats(self, values: List[float]) -> Dict[str, float]:
        """获取统计信息"""
        if not values:
            return {'avg': 0, 'min': 0, 'max': 0, 'count': 0}
        
        return {
            'avg': self._calculate_avg(values),
            'min': min(values),
            'max': max(values),
            'count': len(values),
            'p50': self._calculate_percentile(values, 50),
            'p90': self._calculate_percentile(values, 90),
            'p99': self._calculate_percentile(values, 99)
        }
    
    def _calculate_percentile(self, values: List[float], percentile: int) -> float:
        """计算百分位数"""
        if not values:
            return 0.0
        
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile / 100)
        return sorted_values[min(index, len(sorted_values) - 1)]
    
    def _get_recent_alerts(self) -> List[Dict[str, Any]]:
        """获取最近的告警"""
        alerts = []
        alerts_file = self.metrics_dir / f"performance_alerts_{datetime.now().strftime('%Y%m%d')}.jsonl"
        
        if alerts_file.exists():
            with open(alerts_file, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        alert = json.loads(line)
                        alerts.append(alert)
                    except:
                        continue
        
        # 返回最近10条告警
        return alerts[-10:]


# 全局性能监控器实例
performance_monitor = PerformanceMonitor()


def monitor_performance(operation_name: str):
    """性能监控装饰器
    
    Args:
        operation_name: 操作名称
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            async with performance_monitor.track_operation(operation_name):
                return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # 同步函数的监控（简化版）
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                performance_monitor.current_metrics['success_count'] += 1
                return result
            except Exception as e:
                performance_monitor.current_metrics['error_count'] += 1
                raise
            finally:
                duration = time.time() - start_time
                performance_monitor.current_metrics['processing_times'].append(duration)
        
        # 根据函数类型返回相应的包装器
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator