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
from app.utils.responses import success_response

router = APIRouter(tags=["性能监控"])


@router.get("/performance-report")
async def get_performance_report(
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """获取查询性能报告"""
    try:
        report = query_monitoring.get_performance_report()
        return success_response(
            data=report,
            message="性能报告获取成功"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取性能报告失败: {str(e)}")


@router.get("/regression-alerts")
async def get_regression_alerts(
    days: int = Query(default=7, ge=1, le=30, description="获取最近几天的告警"),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """获取性能回归告警"""
    try:
        import json
        
        alerts = []
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
                        alerts.extend(daily_alerts)
                except Exception as e:
                    continue
        
        # 按时间排序（最新的在前）
        alerts.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return success_response(
            data={
                "alerts": alerts,
                "total_count": len(alerts),
                "period_days": days
            },
            message=f"获取到 {len(alerts)} 个回归告警"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取回归告警失败: {str(e)}")


@router.get("/query-stats/{query_name}")
async def get_query_stats(
    query_name: str,
    days: int = Query(default=7, ge=1, le=30, description="统计最近几天的数据"),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
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
            return success_response(
                data={
                    "query_name": query_name,
                    "period_days": days,
                    "sample_count": 0,
                    "message": "指定时间段内无数据"
                },
                message="无统计数据"
            )
        
        # 计算统计信息
        execution_times = [m.execution_time_ms for m in metrics]
        execution_times.sort()
        
        stats = {
            "query_name": query_name,
            "period_days": days,
            "sample_count": len(execution_times),
            "avg_time_ms": sum(execution_times) / len(execution_times),
            "min_time_ms": min(execution_times),
            "max_time_ms": max(execution_times),
            "p50_time_ms": execution_times[int(len(execution_times) * 0.5)],
            "p90_time_ms": execution_times[int(len(execution_times) * 0.9)],
            "p95_time_ms": execution_times[int(len(execution_times) * 0.95)],
            "p99_time_ms": execution_times[int(len(execution_times) * 0.99)],
            "slow_query_count": len([t for t in execution_times if t > 100]),
            "recent_metrics": [
                {
                    "execution_time_ms": m.execution_time_ms,
                    "timestamp": m.timestamp.isoformat()
                }
                for m in metrics[-20:]  # 最近20次
            ]
        }
        
        return success_response(
            data=stats,
            message=f"查询 {query_name} 统计信息获取成功"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取查询统计失败: {str(e)}")


@router.post("/run-benchmark")
async def run_benchmark_test(
    session: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """运行基准性能测试"""
    try:
        tester = QueryPerformanceTester(session)
        results = await tester.run_baseline_tests()
        
        return success_response(
            data=results,
            message="基准测试完成"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"基准测试失败: {str(e)}")


@router.get("/baselines")
async def get_performance_baselines(
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """获取性能基准"""
    try:
        baselines = {
            name: baseline.to_dict()
            for name, baseline in query_monitoring.detector.baselines.items()
        }
        
        return success_response(
            data={
                "baselines": baselines,
                "total_count": len(baselines)
            },
            message=f"获取到 {len(baselines)} 个性能基准"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取性能基准失败: {str(e)}")


@router.post("/reset-monitoring")
async def reset_monitoring_data(
    confirm: bool = Query(default=False, description="确认重置监控数据"),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
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
        
        return success_response(
            data={"reset_time": datetime.now().isoformat()},
            message="监控数据已重置"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重置监控数据失败: {str(e)}")


@router.get("/health-check")
async def monitoring_health_check() -> Dict[str, Any]:
    """监控系统健康检查"""
    try:
        # 检查监控目录
        monitor_dir = Path("./monitoring")
        health_status = {
            "monitoring_directory_exists": monitor_dir.exists(),
            "baselines_count": len(query_monitoring.detector.baselines),
            "monitored_queries_count": len(query_monitoring.metrics_history),
            "total_metrics_count": sum(len(metrics) for metrics in query_monitoring.metrics_history.values()),
            "system_time": datetime.now().isoformat()
        }
        
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
        
        health_status["recent_activity"] = recent_activity
        health_status["status"] = "healthy" if recent_activity else "idle"
        
        return success_response(
            data=health_status,
            message="监控系统健康检查完成"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"健康检查失败: {str(e)}")


@router.get("/slow-queries")
async def get_slow_queries(
    threshold_ms: float = Query(default=100.0, ge=1.0, description="慢查询阈值（毫秒）"),
    days: int = Query(default=7, ge=1, le=30, description="统计最近几天的数据"),
    limit: int = Query(default=50, ge=1, le=1000, description="返回记录数限制"),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """获取慢查询列表"""
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        slow_queries = []
        
        for query_name, metrics in query_monitoring.metrics_history.items():
            for metric in metrics:
                if (metric.timestamp > cutoff_date and 
                    metric.execution_time_ms > threshold_ms):
                    slow_queries.append({
                        "query_name": query_name,
                        "execution_time_ms": metric.execution_time_ms,
                        "timestamp": metric.timestamp.isoformat(),
                        "query_hash": metric.query_hash,
                        "params_hash": metric.params_hash
                    })
        
        # 按执行时间排序（最慢的在前）
        slow_queries.sort(key=lambda x: x["execution_time_ms"], reverse=True)
        slow_queries = slow_queries[:limit]
        
        return success_response(
            data={
                "slow_queries": slow_queries,
                "total_count": len(slow_queries),
                "threshold_ms": threshold_ms,
                "period_days": days
            },
            message=f"获取到 {len(slow_queries)} 个慢查询"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取慢查询失败: {str(e)}")