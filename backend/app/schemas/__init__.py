"""
数据传输对象 (DTO) 模块

包含所有的 Pydantic 模型用于 API 请求和响应的数据验证。
"""

from app.schemas.base_response import (
    BaseListResponse,
    BaseResponse,
    ErrorDetail,
    ValidationErrorDetail,
    ValidationErrorResponse,
    HealthResponse,
    StatisticsResponse,
    create_list_response,
    create_success_response,
    create_error_detail
)

from app.schemas.invoice import (
    InvoiceBase,
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceInDB,
    InvoiceResponse,
    InvoiceListResponse,
    InvoiceStatistics
)

from app.schemas.email_account import (
    EmailAccountBase,
    EmailAccountCreate,
    EmailAccountUpdate,
    EmailAccountResponse,
    EmailAccountInDB,
    EmailAccountTestRequest,
    EmailAccountTestResponse,
    EmailProviderConfig,
    EmailAccountListResponse,
    ScanRulesConfig
)

from app.schemas.email_scan import (
    ScanJobStatus,
    ScanJobType,
    ScanParams,
    EmailScanJobCreate,
    EmailScanJobResponse,
    EmailScanJobList,
    ScanProgressResponse,
    ScanResultsResponse
)

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

__all__ = [
    # Base response schemas
    "BaseListResponse",
    "BaseResponse", 
    "ErrorDetail",
    "ValidationErrorDetail",
    "ValidationErrorResponse",
    "HealthResponse",
    "StatisticsResponse",
    "create_list_response",
    "create_success_response",
    "create_error_detail",
    
    # Invoice schemas
    "InvoiceBase",
    "InvoiceCreate", 
    "InvoiceUpdate",
    "InvoiceInDB",
    "InvoiceResponse",
    "InvoiceListResponse",
    "InvoiceStatistics",
    
    # Email account schemas
    "EmailAccountBase",
    "EmailAccountCreate",
    "EmailAccountUpdate",
    "EmailAccountResponse",
    "EmailAccountInDB",
    "EmailAccountTestRequest",
    "EmailAccountTestResponse",
    "EmailProviderConfig",
    "EmailAccountListResponse",
    "ScanRulesConfig",
    
    # Email scan schemas
    "ScanJobStatus",
    "ScanJobType",
    "ScanParams",
    "EmailScanJobCreate",
    "EmailScanJobResponse",
    "EmailScanJobList",
    "ScanProgressResponse",
    "ScanResultsResponse",
    
    # Monitoring schemas
    "PerformanceReportResponse",
    "RegressionAlertsResponse",
    "RegressionAlert",
    "QueryStatsResponse",
    "RecentMetric",
    "BenchmarkResponse",
    "BenchmarkResult",
    "BaselinesResponse",
    "PerformanceBaseline",
    "ResetMonitoringResponse",
    "HealthCheckResponse",
    "SlowQueriesResponse",
    "SlowQuery"
]