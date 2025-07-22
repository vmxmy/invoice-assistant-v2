"""
API v1 路由器

聚合所有 v1 版本的 API 端点。
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, users, profiles, invoices, files, tasks, monitoring, invoices_enhanced,
    parser, validator, ocr, ocr_combined, config, email_accounts, email_scan, email_processing
)

# 创建 v1 API 路由器
api_router = APIRouter()

# 注册各模块的路由
api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(users.router, prefix="/users", tags=["用户"])
api_router.include_router(profiles.router, prefix="/profiles", tags=["档案"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["发票"])
api_router.include_router(invoices_enhanced.router, prefix="/invoices", tags=["发票"])
api_router.include_router(files.router, prefix="/files", tags=["文件管理"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["任务管理"])
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["性能监控"])
api_router.include_router(parser.router, prefix="/parser", tags=["数据解析"])
api_router.include_router(validator.router, prefix="/validator", tags=["数据验证"])
api_router.include_router(ocr.router, prefix="/ocr", tags=["OCR"])
api_router.include_router(ocr_combined.router, prefix="/ocr/combined", tags=["组合OCR"])
api_router.include_router(config.router, prefix="/config", tags=["配置管理"])
api_router.include_router(email_accounts.router, prefix="/email-accounts", tags=["邮箱管理"])
api_router.include_router(email_scan.router, prefix="/email-scan", tags=["邮箱扫描"])
api_router.include_router(email_processing.router, prefix="/email-processing", tags=["邮件处理"])

# 可选：添加版本信息端点
@api_router.get("/version", tags=["系统"])
async def get_api_version():
    """获取 API 版本信息"""
    return {
        "version": "1.0.0",
        "description": "发票助手 API v1",
        "endpoints": {
            "auth": "/auth",
            "users": "/users", 
            "profiles": "/profiles",
            "invoices": "/invoices",
            "files": "/files",
            "tasks": "/tasks",
            "monitoring": "/monitoring",
            "parser": "/parser",
            "validator": "/validator",
            "ocr": "/ocr",
            "ocr_combined": "/ocr/combined",
            "config": "/config",
            "email_accounts": "/email-accounts",
            "email_scan": "/email-scan",
            "email_processing": "/email-processing"
        }
    }