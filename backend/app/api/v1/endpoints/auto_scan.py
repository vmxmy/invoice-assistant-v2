"""
自动邮件扫描API端点

实现功能：
1. 接收Edge Function的扫描请求
2. 执行增量邮件扫描
3. 处理PDF并发送给Edge Function
4. 返回处理结果
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.services.incremental_scan_service import IncrementalScanService, BatchScanService
from app.services.pdf_transfer_service import PDFTransferService
from app.schemas.base_response import BaseResponse

logger = logging.getLogger(__name__)

router = APIRouter()

class AutoScanRequest(BaseModel):
    """自动扫描请求"""
    email_account_id: Optional[str] = Field(None, description="指定邮箱账户ID，为空则扫描所有")
    search_params: Optional[Dict] = Field(None, description="搜索参数覆盖")
    processing_options: Optional[Dict] = Field(None, description="处理选项")
    scan_type: str = Field("incremental", description="扫描类型：incremental|full")
    max_emails_per_account: int = Field(50, ge=1, le=200, description="每个账户最大邮件数")
    trigger_source: str = Field("manual", description="触发源")

class AutoScanResponse(BaseModel):
    """自动扫描响应"""
    success: bool
    accounts_scanned: int
    total_new_emails: int
    total_pdfs_found: int
    total_pdfs_processed: int
    scan_duration: float
    errors: List[str]
    details: List[Dict[str, Any]]

@router.post("/scan-and-process-emails")
async def scan_and_process_emails(
    request: AutoScanRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    扫描邮箱并自动处理PDF
    
    此端点被Edge Function调用，用于：
    1. 执行增量邮件扫描
    2. 下载PDF附件
    3. 发送给Edge Function进行OCR处理
    4. 返回处理结果
    """
    try:
        start_time = datetime.now()
        
        # 如果指定了单个账户，使用单账户扫描
        if request.email_account_id:
            result = await scan_single_account(
                request.email_account_id,
                request.max_emails_per_account,
                db
            )
        else:
            # 批量扫描所有活跃账户
            result = await scan_all_accounts(
                request.max_emails_per_account,
                db
            )
        
        scan_duration = (datetime.now() - start_time).total_seconds()
        
        # 构建响应
        response = AutoScanResponse(
            success=len(result.get('errors', [])) == 0,
            accounts_scanned=result.get('accounts_scanned', 0),
            total_new_emails=result.get('total_new_emails', 0),
            total_pdfs_found=result.get('total_pdfs_found', 0),
            total_pdfs_processed=result.get('total_pdfs_processed', 0),
            scan_duration=scan_duration,
            errors=result.get('errors', []),
            details=result.get('details', [])
        )
        
        # 后台记录详细日志
        background_tasks.add_task(
            log_scan_result, 
            response, 
            request.trigger_source,
            db
        )
        
        return BaseResponse(
            data=response,
            message=f"扫描完成，处理了 {response.accounts_scanned} 个账户"
        )
        
    except Exception as e:
        logger.error(f"自动扫描失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"自动扫描失败: {str(e)}"
        )

async def scan_single_account(
    account_id: str,
    max_emails: int,
    db: AsyncSession
) -> Dict[str, Any]:
    """扫描单个邮箱账户"""
    
    # 获取邮箱账户
    from app.services.email_account_service import EmailAccountService
    from app.core.dependencies import get_current_user_from_token
    
    # 注意：这里需要处理服务间调用的认证问题
    # 可能需要使用服务级别的认证而不是用户认证
    
    try:
        # 创建扫描服务
        scanner = IncrementalScanService(db)
        
        # 这里需要获取 EmailAccount 对象
        # 简化处理，直接查询数据库
        from sqlalchemy import select
        from app.models.email_account import EmailAccount
        
        stmt = select(EmailAccount).where(EmailAccount.id == account_id)
        result = await db.execute(stmt)
        email_account = result.scalar_one_or_none()
        
        if not email_account:
            return {
                'accounts_scanned': 0,
                'total_new_emails': 0,
                'total_pdfs_found': 0,
                'total_pdfs_processed': 0,
                'errors': [f'邮箱账户不存在: {account_id}'],
                'details': []
            }
        
        # 执行扫描
        scan_result = await scanner.scan_account_incremental(
            email_account, max_emails
        )
        
        return {
            'accounts_scanned': 1,
            'total_new_emails': scan_result.new_emails,
            'total_pdfs_found': scan_result.pdfs_found,
            'total_pdfs_processed': scan_result.pdfs_processed,
            'errors': scan_result.errors,
            'details': [{
                'account_id': account_id,
                'email_address': email_account.email_address,
                'new_emails': scan_result.new_emails,
                'pdfs_found': scan_result.pdfs_found,
                'pdfs_processed': scan_result.pdfs_processed,
                'errors': scan_result.errors
            }]
        }
        
    except Exception as e:
        logger.error(f"扫描单个账户失败: {str(e)}")
        return {
            'accounts_scanned': 0,
            'total_new_emails': 0,
            'total_pdfs_found': 0,
            'total_pdfs_processed': 0,
            'errors': [f'扫描失败: {str(e)}'],
            'details': []
        }

async def scan_all_accounts(
    max_emails_per_account: int,
    db: AsyncSession
) -> Dict[str, Any]:
    """扫描所有活跃邮箱账户"""
    
    try:
        # 创建批量扫描服务
        batch_scanner = BatchScanService(db)
        
        # 执行批量扫描
        scan_results = await batch_scanner.scan_all_active_accounts(
            max_emails_per_account=max_emails_per_account,
            max_concurrent=3
        )
        
        # 汇总结果
        total_accounts = len(scan_results)
        total_new_emails = sum(r.new_emails for r in scan_results.values())
        total_pdfs_found = sum(r.pdfs_found for r in scan_results.values())
        total_pdfs_processed = sum(r.pdfs_processed for r in scan_results.values())
        all_errors = []
        
        details = []
        for email_address, result in scan_results.items():
            all_errors.extend(result.errors)
            details.append({
                'email_address': email_address,
                'new_emails': result.new_emails,
                'pdfs_found': result.pdfs_found,
                'pdfs_processed': result.pdfs_processed,
                'errors': result.errors
            })
        
        return {
            'accounts_scanned': total_accounts,
            'total_new_emails': total_new_emails,
            'total_pdfs_found': total_pdfs_found,
            'total_pdfs_processed': total_pdfs_processed,
            'errors': all_errors,
            'details': details
        }
        
    except Exception as e:
        logger.error(f"批量扫描失败: {str(e)}")
        return {
            'accounts_scanned': 0,
            'total_new_emails': 0,
            'total_pdfs_found': 0,
            'total_pdfs_processed': 0,
            'errors': [f'批量扫描失败: {str(e)}'],
            'details': []
        }

async def log_scan_result(
    response: AutoScanResponse,
    trigger_source: str,
    db: AsyncSession
):
    """记录扫描结果到数据库"""
    try:
        from app.models.auto_scan_history import AutoScanHistory
        
        # 创建扫描历史记录
        scan_history = AutoScanHistory(
            trigger_source=trigger_source,
            accounts_scanned=response.accounts_scanned,
            total_new_emails=response.total_new_emails,
            total_pdfs_found=response.total_pdfs_found,
            total_pdfs_processed=response.total_pdfs_processed,
            success=response.success,
            errors=response.errors if response.errors else None,
            scan_details=response.details,
            scan_duration=response.scan_duration
        )
        
        db.add(scan_history)
        await db.commit()
        
    except Exception as e:
        logger.error(f"记录扫描结果失败: {str(e)}")

@router.get("/scan-status")
async def get_scan_status(
    days: int = 7,
    db: AsyncSession = Depends(get_db)
):
    """获取扫描状态统计"""
    try:
        from sqlalchemy import select, func
        from app.models.auto_scan_history import AutoScanHistory
        
        # 查询最近N天的扫描统计
        start_date = datetime.now() - timedelta(days=days)
        
        stmt = select(
            AutoScanHistory.trigger_source,
            func.count().label('scan_count'),
            func.sum(AutoScanHistory.total_new_emails).label('total_emails'),
            func.sum(AutoScanHistory.total_pdfs_found).label('total_pdfs'),
            func.avg(AutoScanHistory.scan_duration).label('avg_duration'),
            func.count().filter(AutoScanHistory.success == False).label('failed_count')
        ).where(
            AutoScanHistory.created_at >= start_date
        ).group_by(AutoScanHistory.trigger_source)
        
        result = await db.execute(stmt)
        stats = result.fetchall()
        
        return BaseResponse(
            data={
                'period_days': days,
                'statistics': [
                    {
                        'trigger_source': row.trigger_source,
                        'scan_count': row.scan_count,
                        'total_emails': row.total_emails or 0,
                        'total_pdfs': row.total_pdfs or 0,
                        'avg_duration': float(row.avg_duration or 0),
                        'failed_count': row.failed_count or 0,
                        'success_rate': (row.scan_count - (row.failed_count or 0)) / row.scan_count * 100
                    }
                    for row in stats
                ]
            },
            message=f"最近 {days} 天的扫描统计"
        )
        
    except Exception as e:
        logger.error(f"获取扫描状态失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取扫描状态失败: {str(e)}"
        )

@router.post("/manual-scan/{account_id}")
async def manual_scan_account(
    account_id: str,
    max_emails: int = 20,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """手动触发单个账户扫描"""
    try:
        request = AutoScanRequest(
            email_account_id=account_id,
            max_emails_per_account=max_emails,
            trigger_source="manual"
        )
        
        return await scan_and_process_emails(request, background_tasks, db)
        
    except Exception as e:
        logger.error(f"手动扫描失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"手动扫描失败: {str(e)}"
        )

@router.get("/recent-scans")
async def get_recent_scans(
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """获取最近的扫描记录"""
    try:
        from sqlalchemy import select
        from app.models.auto_scan_history import AutoScanHistory
        
        stmt = select(AutoScanHistory).order_by(
            AutoScanHistory.created_at.desc()
        ).limit(limit)
        
        result = await db.execute(stmt)
        scans = result.scalars().all()
        
        return BaseResponse(
            data=[
                {
                    'id': str(scan.id),
                    'trigger_source': scan.trigger_source,
                    'accounts_scanned': scan.accounts_scanned,
                    'total_new_emails': scan.total_new_emails,
                    'total_pdfs_found': scan.total_pdfs_found,
                    'total_pdfs_processed': scan.total_pdfs_processed,
                    'success': scan.success,
                    'scan_duration': scan.scan_duration,
                    'created_at': scan.created_at.isoformat(),
                    'error_count': len(scan.errors) if scan.errors else 0
                }
                for scan in scans
            ],
            message=f"最近 {len(scans)} 次扫描记录"
        )
        
    except Exception as e:
        logger.error(f"获取扫描记录失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取扫描记录失败: {str(e)}"
        )