"""
监控API响应模型
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from .base_response import BaseListResponse


class PerformanceReportResponse(BaseModel):
    """性能报告响应"""
    
    total_queries: int = Field(..., description="总查询数")
    avg_execution_time: float = Field(..., description="平均执行时间(ms)")
    slow_query_count: int = Field(..., description="慢查询数量")
    fastest_query: Optional[str] = Field(None, description="最快查询")
    slowest_query: Optional[str] = Field(None, description="最慢查询")
    report_time: datetime = Field(..., description="报告生成时间")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RegressionAlert(BaseModel):
    """回归告警项"""
    
    query_name: str = Field(..., description="查询名称")
    alert_type: str = Field(..., description="告警类型")
    current_time: float = Field(..., description="当前执行时间")
    baseline_time: float = Field(..., description="基准执行时间")
    threshold: float = Field(..., description="阈值")
    timestamp: str = Field(..., description="告警时间")


class RegressionAlertsResponse(BaseModel):
    """回归告警响应"""
    
    alerts: List[RegressionAlert] = Field(..., description="告警列表")
    total_count: int = Field(..., description="告警总数")
    period_days: int = Field(..., description="统计天数")


class RecentMetric(BaseModel):
    """最近的性能指标"""
    
    execution_time_ms: float = Field(..., description="执行时间(ms)")
    timestamp: str = Field(..., description="时间戳")


class QueryStatsResponse(BaseModel):
    """查询统计响应"""
    
    query_name: str = Field(..., description="查询名称")
    period_days: int = Field(..., description="统计天数")
    sample_count: int = Field(..., description="样本数量")
    avg_time_ms: Optional[float] = Field(None, description="平均时间")
    min_time_ms: Optional[float] = Field(None, description="最小时间")
    max_time_ms: Optional[float] = Field(None, description="最大时间")
    p50_time_ms: Optional[float] = Field(None, description="50分位数")
    p90_time_ms: Optional[float] = Field(None, description="90分位数")
    p95_time_ms: Optional[float] = Field(None, description="95分位数")
    p99_time_ms: Optional[float] = Field(None, description="99分位数")
    slow_query_count: Optional[int] = Field(None, description="慢查询数量")
    recent_metrics: List[RecentMetric] = Field(default=[], description="最近指标")
    message: Optional[str] = Field(None, description="附加消息")


class BenchmarkResult(BaseModel):
    """基准测试结果"""
    
    test_name: str = Field(..., description="测试名称")
    execution_time_ms: float = Field(..., description="执行时间")
    success: bool = Field(..., description="是否成功")
    details: Optional[Dict[str, Any]] = Field(None, description="详细信息")


class BenchmarkResponse(BaseModel):
    """基准测试响应"""
    
    results: List[BenchmarkResult] = Field(..., description="测试结果")
    total_tests: int = Field(..., description="总测试数")
    passed_tests: int = Field(..., description="通过测试数")
    test_duration: float = Field(..., description="测试总时长")


class PerformanceBaseline(BaseModel):
    """性能基准"""
    
    query_name: str = Field(..., description="查询名称")
    baseline_time_ms: float = Field(..., description="基准时间")
    sample_count: int = Field(..., description="样本数量")
    confidence_interval: Optional[List[float]] = Field(None, description="置信区间")
    created_at: Optional[str] = Field(None, description="创建时间")


class BaselinesResponse(BaseModel):
    """性能基准响应"""
    
    baselines: Dict[str, PerformanceBaseline] = Field(..., description="基准映射")
    total_count: int = Field(..., description="基准总数")


class ResetMonitoringResponse(BaseModel):
    """重置监控响应"""
    
    reset_time: str = Field(..., description="重置时间")


class HealthCheckResponse(BaseModel):
    """健康检查响应"""
    
    monitoring_directory_exists: bool = Field(..., description="监控目录是否存在")
    baselines_count: int = Field(..., description="基准数量")
    monitored_queries_count: int = Field(..., description="监控查询数量")
    total_metrics_count: int = Field(..., description="总指标数量")
    system_time: str = Field(..., description="系统时间")
    recent_activity: bool = Field(..., description="是否有最近活动")
    status: str = Field(..., description="状态")


class SlowQuery(BaseModel):
    """慢查询项"""
    
    query_name: str = Field(..., description="查询名称")
    execution_time_ms: float = Field(..., description="执行时间")
    timestamp: str = Field(..., description="时间戳")
    query_hash: Optional[str] = Field(None, description="查询哈希")
    params_hash: Optional[str] = Field(None, description="参数哈希")


class SlowQueriesResponse(BaseModel):
    """慢查询响应"""
    
    slow_queries: List[SlowQuery] = Field(..., description="慢查询列表")
    total_count: int = Field(..., description="总数量")
    threshold_ms: float = Field(..., description="阈值")
    period_days: int = Field(..., description="统计天数")