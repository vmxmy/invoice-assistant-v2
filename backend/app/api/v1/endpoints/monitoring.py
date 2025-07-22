"""
监控API端点

提供查询性能监控和回归检测的API接口。
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.utils.query_monitor import query_monitoring, QueryPerformanceTester
from app.schemas.monitoring import (
    PerformanceReportResponse,
    RegressionAlertsResponse,
    RegressionAlert,
    QueryStatsResponse,
    RecentMetric,
    BenchmarkResponse,
    BenchmarkResult,
    BaselinesResponse,
    PerformanceBaseline,
    ResetMonitoringResponse,
    HealthCheckResponse,
    SlowQueriesResponse,
    SlowQuery
)

router = APIRouter(tags=["性能监控"])


@router.get("/performance-report", response_model=PerformanceReportResponse)
async def get_performance_report(
    current_user: dict = Depends(get_current_user)
) -> PerformanceReportResponse:
    """获取查询性能报告"""
    try:
        report = query_monitoring.get_performance_report()
        return PerformanceReportResponse(
            total_queries=report.get("total_queries", 0),
            avg_execution_time=report.get("avg_execution_time", 0.0),
            slow_query_count=report.get("slow_query_count", 0),
            fastest_query=report.get("fastest_query"),
            slowest_query=report.get("slowest_query"),
            report_time=datetime.now()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取性能报告失败: {str(e)}")


@router.get("/regression-alerts", response_model=RegressionAlertsResponse)
async def get_regression_alerts(
    days: int = Query(default=7, ge=1, le=30, description="获取最近几天的告警"),
    current_user: dict = Depends(get_current_user)
) -> RegressionAlertsResponse:
    """获取性能回归告警"""
    try:
        import json
        
        alerts_data = []
        monitor_dir = Path("./monitoring")
        
        # 获取指定天数内的告警文件
        start_date = datetime.now() - timedelta(days=days)
        
        for i in range(days):
            date = start_date + timedelta(days=i)
            alert_file = monitor_dir / f"regression_alerts_{date.strftime('%Y%m%d')}.json"
            
            if alert_file.exists():
                try:
                    with open(alert_file, 'r', encoding='utf-8') as f:
                        daily_alerts = json.load(f)
                        alerts_data.extend(daily_alerts)
                except Exception as e:
                    continue
        
        # 按时间排序（最新的在前）
        alerts_data.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # 转换为响应模型
        alerts = [
            RegressionAlert(
                query_name=alert.get("query_name", ""),
                alert_type=alert.get("alert_type", ""),
                current_time=alert.get("current_time", 0.0),
                baseline_time=alert.get("baseline_time", 0.0),
                threshold=alert.get("threshold", 0.0),
                timestamp=alert.get("timestamp", "")
            )
            for alert in alerts_data
        ]
        
        return RegressionAlertsResponse(
            alerts=alerts,
            total_count=len(alerts),
            period_days=days
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取回归告警失败: {str(e)}")


@router.get("/query-stats/{query_name}", response_model=QueryStatsResponse)
async def get_query_stats(
    query_name: str,
    days: int = Query(default=7, ge=1, le=30, description="统计最近几天的数据"),
    current_user: dict = Depends(get_current_user)
) -> QueryStatsResponse:
    """获取特定查询的统计信息"""
    try:
        # 从历史记录中获取指定查询的数据
        if query_name not in query_monitoring.metrics_history:
            raise HTTPException(status_code=404, detail=f"查询 {query_name} 未找到")
        
        # 过滤指定天数内的数据
        cutoff_date = datetime.now() - timedelta(days=days)
        metrics = [
            m for m in query_monitoring.metrics_history[query_name]
            if m.timestamp > cutoff_date
        ]
        
        if not metrics:
            return QueryStatsResponse(
                query_name=query_name,
                period_days=days,
                sample_count=0,
                message="指定时间段内无数据"
            )
        
        # 计算统计信息
        execution_times = [m.execution_time_ms for m in metrics]
        execution_times.sort()
        
        recent_metrics = [
            RecentMetric(
                execution_time_ms=m.execution_time_ms,
                timestamp=m.timestamp.isoformat()
            )
            for m in metrics[-20:]  # 最近20次
        ]
        
        return QueryStatsResponse(
            query_name=query_name,
            period_days=days,
            sample_count=len(execution_times),
            avg_time_ms=sum(execution_times) / len(execution_times),
            min_time_ms=min(execution_times),
            max_time_ms=max(execution_times),
            p50_time_ms=execution_times[int(len(execution_times) * 0.5)],
            p90_time_ms=execution_times[int(len(execution_times) * 0.9)],
            p95_time_ms=execution_times[int(len(execution_times) * 0.95)],
            p99_time_ms=execution_times[int(len(execution_times) * 0.99)],
            slow_query_count=len([t for t in execution_times if t > 100]),
            recent_metrics=recent_metrics
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取查询统计失败: {str(e)}")


@router.post("/run-benchmark", response_model=BenchmarkResponse)
async def run_benchmark_test(
    session: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> BenchmarkResponse:
    """运行基准性能测试"""
    try:
        tester = QueryPerformanceTester(session)
        results_data = await tester.run_baseline_tests()
        
        # 转换为响应模型
        results = [
            BenchmarkResult(
                test_name=result.get("test_name", ""),
                execution_time_ms=result.get("execution_time_ms", 0.0),
                success=result.get("success", False),
                details=result.get("details")
            )
            for result in results_data.get("results", [])
        ]
        
        return BenchmarkResponse(
            results=results,
            total_tests=len(results),
            passed_tests=len([r for r in results if r.success]),
            test_duration=results_data.get("test_duration", 0.0)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"基准测试失败: {str(e)}")


@router.get("/baselines", response_model=BaselinesResponse)
async def get_performance_baselines(
    current_user: dict = Depends(get_current_user)
) -> BaselinesResponse:
    """获取性能基准"""
    try:
        baselines_data = {}
        
        for name, baseline in query_monitoring.detector.baselines.items():
            baseline_dict = baseline.to_dict()
            baselines_data[name] = PerformanceBaseline(
                query_name=name,
                baseline_time_ms=baseline_dict.get("baseline_time_ms", 0.0),
                sample_count=baseline_dict.get("sample_count", 0),
                confidence_interval=baseline_dict.get("confidence_interval"),
                created_at=baseline_dict.get("created_at")
            )
        
        return BaselinesResponse(
            baselines=baselines_data,
            total_count=len(baselines_data)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取性能基准失败: {str(e)}")


@router.post("/reset-monitoring", response_model=ResetMonitoringResponse)
async def reset_monitoring_data(
    confirm: bool = Query(default=False, description="确认重置监控数据"),
    current_user: dict = Depends(get_current_user)
) -> ResetMonitoringResponse:
    """重置监控数据"""
    if not confirm:
        raise HTTPException(
            status_code=400, 
            detail="需要确认参数 confirm=true 才能重置监控数据"
        )
    
    try:
        # 清除内存中的数据
        query_monitoring.metrics_history.clear()
        query_monitoring.detector.baselines.clear()
        
        # 备份现有文件（如果存在）
        monitor_dir = Path("./monitoring")
        if monitor_dir.exists():
            import shutil
            backup_dir = monitor_dir.parent / f"monitoring_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            shutil.move(str(monitor_dir), str(backup_dir))
        
        return ResetMonitoringResponse(
            reset_time=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重置监控数据失败: {str(e)}")


@router.get("/health-check", response_model=HealthCheckResponse)
async def monitoring_health_check() -> HealthCheckResponse:
    """监控系统健康检查"""
    try:
        # 检查监控目录
        monitor_dir = Path("./monitoring")
        
        # 检查最近是否有监控活动
        recent_activity = False
        if query_monitoring.metrics_history:
            latest_metric = None
            for metrics in query_monitoring.metrics_history.values():
                if metrics:
                    for metric in metrics:
                        if latest_metric is None or metric.timestamp > latest_metric:
                            latest_metric = metric.timestamp
            
            if latest_metric and (datetime.now() - latest_metric).total_seconds() < 3600:  # 1小时内
                recent_activity = True
        
        return HealthCheckResponse(
            monitoring_directory_exists=monitor_dir.exists(),
            baselines_count=len(query_monitoring.detector.baselines),
            monitored_queries_count=len(query_monitoring.metrics_history),
            total_metrics_count=sum(len(metrics) for metrics in query_monitoring.metrics_history.values()),
            system_time=datetime.now().isoformat(),
            recent_activity=recent_activity,
            status="healthy" if recent_activity else "idle"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"健康检查失败: {str(e)}")


@router.get("/slow-queries", response_model=SlowQueriesResponse)
async def get_slow_queries(
    threshold_ms: float = Query(default=100.0, ge=1.0, description="慢查询阈值（毫秒）"),
    days: int = Query(default=7, ge=1, le=30, description="统计最近几天的数据"),
    limit: int = Query(default=50, ge=1, le=1000, description="返回记录数限制"),
    current_user: dict = Depends(get_current_user)
) -> SlowQueriesResponse:
    """获取慢查询列表"""
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        slow_queries_data = []
        
        for query_name, metrics in query_monitoring.metrics_history.items():
            for metric in metrics:
                if (metric.timestamp > cutoff_date and 
                    metric.execution_time_ms > threshold_ms):
                    slow_queries_data.append({
                        "query_name": query_name,
                        "execution_time_ms": metric.execution_time_ms,
                        "timestamp": metric.timestamp.isoformat(),
                        "query_hash": getattr(metric, "query_hash", None),
                        "params_hash": getattr(metric, "params_hash", None)
                    })
        
        # 按执行时间排序（最慢的在前）
        slow_queries_data.sort(key=lambda x: x["execution_time_ms"], reverse=True)
        slow_queries_data = slow_queries_data[:limit]
        
        # 转换为响应模型
        slow_queries = [
            SlowQuery(
                query_name=sq["query_name"],
                execution_time_ms=sq["execution_time_ms"],
                timestamp=sq["timestamp"],
                query_hash=sq.get("query_hash"),
                params_hash=sq.get("params_hash")
            )
            for sq in slow_queries_data
        ]
        
        return SlowQueriesResponse(
            slow_queries=slow_queries,
            total_count=len(slow_queries),
            threshold_ms=threshold_ms,
            period_days=days
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取慢查询失败: {str(e)}")