"""
查询监控防回归系统

提供查询性能监控、回归检测和告警功能。
"""

import time
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager
from functools import wraps
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from sqlalchemy.sql import Select

logger = logging.getLogger(__name__)


@dataclass
class QueryMetrics:
    """查询性能指标"""
    query_name: str
    execution_time_ms: float
    timestamp: datetime
    query_hash: str
    params_hash: str
    result_count: Optional[int] = None
    memory_usage_mb: Optional[float] = None
    cpu_usage_percent: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            **asdict(self),
            "timestamp": self.timestamp.isoformat()
        }


@dataclass
class PerformanceBaseline:
    """性能基准"""
    query_name: str
    avg_time_ms: float
    p95_time_ms: float
    p99_time_ms: float
    max_time_ms: float
    sample_count: int
    created_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            **asdict(self),
            "created_at": self.created_at.isoformat()
        }


class QueryRegressionDetector:
    """查询性能回归检测器"""
    
    def __init__(self, 
                 regression_threshold: float = 2.0,  # 回归阈值倍数
                 min_samples: int = 10):  # 最小样本数
        self.regression_threshold = regression_threshold
        self.min_samples = min_samples
        self.baselines: Dict[str, PerformanceBaseline] = {}
    
    def load_baselines(self, baselines_file: Path) -> None:
        """加载性能基准"""
        try:
            if baselines_file.exists():
                with open(baselines_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for baseline_data in data:
                        baseline = PerformanceBaseline(
                            query_name=baseline_data['query_name'],
                            avg_time_ms=baseline_data['avg_time_ms'],
                            p95_time_ms=baseline_data['p95_time_ms'],
                            p99_time_ms=baseline_data['p99_time_ms'],
                            max_time_ms=baseline_data['max_time_ms'],
                            sample_count=baseline_data['sample_count'],
                            created_at=datetime.fromisoformat(baseline_data['created_at'])
                        )
                        self.baselines[baseline.query_name] = baseline
                logger.info(f"加载了 {len(self.baselines)} 个性能基准")
        except Exception as e:
            logger.error(f"加载性能基准失败: {e}")
    
    def save_baselines(self, baselines_file: Path) -> None:
        """保存性能基准"""
        try:
            baselines_file.parent.mkdir(parents=True, exist_ok=True)
            with open(baselines_file, 'w', encoding='utf-8') as f:
                json.dump([baseline.to_dict() for baseline in self.baselines.values()], f, indent=2)
            logger.info(f"保存了 {len(self.baselines)} 个性能基准")
        except Exception as e:
            logger.error(f"保存性能基准失败: {e}")
    
    def update_baseline(self, query_name: str, metrics: List[QueryMetrics]) -> None:
        """更新性能基准"""
        if len(metrics) < self.min_samples:
            return
        
        execution_times = [m.execution_time_ms for m in metrics]
        execution_times.sort()
        
        avg_time = sum(execution_times) / len(execution_times)
        p95_index = int(len(execution_times) * 0.95)
        p99_index = int(len(execution_times) * 0.99)
        
        baseline = PerformanceBaseline(
            query_name=query_name,
            avg_time_ms=avg_time,
            p95_time_ms=execution_times[p95_index],
            p99_time_ms=execution_times[p99_index],
            max_time_ms=max(execution_times),
            sample_count=len(execution_times),
            created_at=datetime.now()
        )
        
        self.baselines[query_name] = baseline
        logger.info(f"更新了查询 {query_name} 的性能基准: 平均 {avg_time:.2f}ms, P95 {baseline.p95_time_ms:.2f}ms")
    
    def detect_regression(self, metrics: QueryMetrics) -> Optional[Dict[str, Any]]:
        """检测性能回归"""
        baseline = self.baselines.get(metrics.query_name)
        if not baseline:
            return None
        
        # 检查是否超过回归阈值
        if metrics.execution_time_ms > baseline.p95_time_ms * self.regression_threshold:
            return {
                "query_name": metrics.query_name,
                "current_time_ms": metrics.execution_time_ms,
                "baseline_p95_ms": baseline.p95_time_ms,
                "regression_ratio": metrics.execution_time_ms / baseline.p95_time_ms,
                "threshold": self.regression_threshold,
                "severity": "critical" if metrics.execution_time_ms > baseline.max_time_ms * 2 else "warning",
                "timestamp": metrics.timestamp.isoformat()
            }
        
        return None


class QueryMonitoringMiddleware:
    """查询监控中间件"""
    
    def __init__(self, 
                 monitor_dir: Path = Path("./monitoring"),
                 max_history_days: int = 30):
        self.monitor_dir = monitor_dir
        self.monitor_dir.mkdir(parents=True, exist_ok=True)
        
        self.max_history_days = max_history_days
        self.metrics_history: Dict[str, List[QueryMetrics]] = {}
        self.detector = QueryRegressionDetector()
        
        # 加载现有基准
        baselines_file = self.monitor_dir / "baselines.json"
        self.detector.load_baselines(baselines_file)
        
        # 加载历史指标
        self._load_metrics_history()
    
    def _load_metrics_history(self) -> None:
        """加载历史指标"""
        try:
            history_file = self.monitor_dir / "metrics_history.json"
            if history_file.exists():
                with open(history_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for query_name, metrics_data in data.items():
                        self.metrics_history[query_name] = [
                            QueryMetrics(
                                query_name=m['query_name'],
                                execution_time_ms=m['execution_time_ms'],
                                timestamp=datetime.fromisoformat(m['timestamp']),
                                query_hash=m['query_hash'],
                                params_hash=m['params_hash'],
                                result_count=m.get('result_count'),
                                memory_usage_mb=m.get('memory_usage_mb'),
                                cpu_usage_percent=m.get('cpu_usage_percent')
                            )
                            for m in metrics_data
                        ]
                logger.info(f"加载了 {len(self.metrics_history)} 个查询的历史指标")
        except Exception as e:
            logger.error(f"加载历史指标失败: {e}")
    
    def _save_metrics_history(self) -> None:
        """保存历史指标"""
        try:
            # 清理过期数据
            cutoff_date = datetime.now() - timedelta(days=self.max_history_days)
            for query_name in list(self.metrics_history.keys()):
                self.metrics_history[query_name] = [
                    m for m in self.metrics_history[query_name]
                    if m.timestamp > cutoff_date
                ]
                if not self.metrics_history[query_name]:
                    del self.metrics_history[query_name]
            
            # 保存数据
            history_file = self.monitor_dir / "metrics_history.json"
            with open(history_file, 'w', encoding='utf-8') as f:
                json.dump({
                    query_name: [m.to_dict() for m in metrics]
                    for query_name, metrics in self.metrics_history.items()
                }, f, indent=2)
        except Exception as e:
            logger.error(f"保存历史指标失败: {e}")
    
    def record_metrics(self, metrics: QueryMetrics) -> Optional[Dict[str, Any]]:
        """记录查询指标并检测回归"""
        # 添加到历史记录
        if metrics.query_name not in self.metrics_history:
            self.metrics_history[metrics.query_name] = []
        
        self.metrics_history[metrics.query_name].append(metrics)
        
        # 检测回归
        regression = self.detector.detect_regression(metrics)
        if regression:
            logger.warning(f"检测到查询性能回归: {regression}")
            self._save_regression_alert(regression)
        
        # 定期更新基准
        if len(self.metrics_history[metrics.query_name]) % 50 == 0:
            self.detector.update_baseline(metrics.query_name, self.metrics_history[metrics.query_name])
            baselines_file = self.monitor_dir / "baselines.json"
            self.detector.save_baselines(baselines_file)
        
        # 定期保存历史
        if len(self.metrics_history[metrics.query_name]) % 10 == 0:
            self._save_metrics_history()
        
        return regression
    
    def _save_regression_alert(self, regression: Dict[str, Any]) -> None:
        """保存回归告警"""
        try:
            alert_file = self.monitor_dir / f"regression_alerts_{datetime.now().strftime('%Y%m%d')}.json"
            alerts = []
            
            if alert_file.exists():
                with open(alert_file, 'r', encoding='utf-8') as f:
                    alerts = json.load(f)
            
            alerts.append(regression)
            
            with open(alert_file, 'w', encoding='utf-8') as f:
                json.dump(alerts, f, indent=2)
        except Exception as e:
            logger.error(f"保存回归告警失败: {e}")
    
    @asynccontextmanager
    async def monitor_query(self, 
                          query_name: str,
                          query_hash: str = "",
                          params_hash: str = "",
                          track_result_count: bool = True):
        """查询监控上下文管理器"""
        start_time = time.time()
        result_count = None
        
        try:
            yield
        finally:
            execution_time = (time.time() - start_time) * 1000
            
            metrics = QueryMetrics(
                query_name=query_name,
                execution_time_ms=execution_time,
                timestamp=datetime.now(),
                query_hash=query_hash,
                params_hash=params_hash,
                result_count=result_count
            )
            
            # 记录指标并检测回归
            regression = self.record_metrics(metrics)
            
            # 记录日志
            if regression:
                logger.warning(
                    f"查询性能回归 - {query_name}: {execution_time:.2f}ms "
                    f"(基准P95: {regression['baseline_p95_ms']:.2f}ms, "
                    f"回归倍数: {regression['regression_ratio']:.2f}x)"
                )
            elif execution_time > 100:  # 超过100ms的查询
                logger.info(f"慢查询 - {query_name}: {execution_time:.2f}ms")
    
    def get_performance_report(self) -> Dict[str, Any]:
        """获取性能报告"""
        report = {
            "monitoring_period_days": self.max_history_days,
            "total_queries_monitored": len(self.metrics_history),
            "baselines_count": len(self.detector.baselines),
            "query_stats": {}
        }
        
        for query_name, metrics in self.metrics_history.items():
            if not metrics:
                continue
            
            execution_times = [m.execution_time_ms for m in metrics]
            execution_times.sort()
            
            stats = {
                "sample_count": len(execution_times),
                "avg_time_ms": sum(execution_times) / len(execution_times),
                "min_time_ms": min(execution_times),
                "max_time_ms": max(execution_times),
                "p50_time_ms": execution_times[int(len(execution_times) * 0.5)],
                "p95_time_ms": execution_times[int(len(execution_times) * 0.95)],
                "p99_time_ms": execution_times[int(len(execution_times) * 0.99)],
                "slow_query_count": len([t for t in execution_times if t > 100])
            }
            
            baseline = self.detector.baselines.get(query_name)
            if baseline:
                stats["has_baseline"] = True
                stats["baseline_avg_ms"] = baseline.avg_time_ms
                stats["baseline_p95_ms"] = baseline.p95_time_ms
            else:
                stats["has_baseline"] = False
            
            report["query_stats"][query_name] = stats
        
        return report


# 全局监控实例
query_monitoring = QueryMonitoringMiddleware()


def monitor_query_performance(query_name: str, 
                            track_result_count: bool = True,
                            params: Optional[Dict[str, Any]] = None):
    """查询性能监控装饰器"""
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # 生成查询和参数的哈希
            import hashlib
            
            query_str = f"{func.__module__}.{func.__name__}"
            query_hash = hashlib.md5(query_str.encode()).hexdigest()[:8]
            
            params_str = json.dumps(params or {}, sort_keys=True)
            params_hash = hashlib.md5(params_str.encode()).hexdigest()[:8]
            
            async with query_monitoring.monitor_query(
                query_name=query_name,
                query_hash=query_hash,
                params_hash=params_hash,
                track_result_count=track_result_count
            ):
                return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # 同步版本的包装器
            import hashlib
            
            query_str = f"{func.__module__}.{func.__name__}"
            query_hash = hashlib.md5(query_str.encode()).hexdigest()[:8]
            
            params_str = json.dumps(params or {}, sort_keys=True)
            params_hash = hashlib.md5(params_str.encode()).hexdigest()[:8]
            
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                execution_time = (time.time() - start_time) * 1000
                
                metrics = QueryMetrics(
                    query_name=query_name,
                    execution_time_ms=execution_time,
                    timestamp=datetime.now(),
                    query_hash=query_hash,
                    params_hash=params_hash
                )
                
                query_monitoring.record_metrics(metrics)
        
        # 根据函数是否为协程选择包装器
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


class QueryPerformanceTester:
    """查询性能测试器"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def run_baseline_tests(self) -> Dict[str, Any]:
        """运行基准性能测试"""
        results = {}
        
        # 测试常用查询
        test_queries = [
            ("invoice_list_query", self._test_invoice_list),
            ("invoice_search_query", self._test_invoice_search),
            ("invoice_count_query", self._test_invoice_count),
            ("user_profile_query", self._test_user_profile),
        ]
        
        for query_name, test_func in test_queries:
            try:
                result = await test_func()
                results[query_name] = {
                    "status": "success",
                    "execution_time_ms": result,
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                results[query_name] = {
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
        
        return results
    
    async def _test_invoice_list(self) -> float:
        """测试发票列表查询"""
        from app.models.invoice import Invoice
        
        start_time = time.time()
        
        query = select(Invoice).where(
            Invoice.deleted_at.is_(None)
        ).order_by(Invoice.created_at.desc()).limit(20)
        
        await self.session.execute(query)
        
        return (time.time() - start_time) * 1000
    
    async def _test_invoice_search(self) -> float:
        """测试发票搜索查询"""
        from app.models.invoice import Invoice
        
        start_time = time.time()
        
        query = select(Invoice).where(
            Invoice.deleted_at.is_(None),
            Invoice.seller_name.ilike("%测试%")
        ).limit(10)
        
        await self.session.execute(query)
        
        return (time.time() - start_time) * 1000
    
    async def _test_invoice_count(self) -> float:
        """测试发票计数查询"""
        from app.models.invoice import Invoice
        
        start_time = time.time()
        
        query = select(func.count(Invoice.id)).where(
            Invoice.deleted_at.is_(None)
        )
        
        await self.session.execute(query)
        
        return (time.time() - start_time) * 1000
    
    async def _test_user_profile(self) -> float:
        """测试用户档案查询"""
        from app.models.profile import Profile
        
        start_time = time.time()
        
        query = select(Profile).where(
            Profile.deleted_at.is_(None)
        ).limit(10)
        
        await self.session.execute(query)
        
        return (time.time() - start_time) * 1000