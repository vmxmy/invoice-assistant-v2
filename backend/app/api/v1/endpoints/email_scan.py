"""Enhanced email scan API endpoints with security improvements."""
import logging
from typing import List, Optional, Tuple
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query, Path, Body, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import ValidationError, BaseModel, Field

from app.core.database import get_db, async_session_maker
from app.core.dependencies import get_current_user, CurrentUser
from app.schemas.email_scan import (
    EmailScanJobCreate,
    EmailScanJobResponse,
    ScanJobStatus,
    ScanProgressResponse
)
from app.services.email_scanner_service import EmailScannerService
from app.core.exceptions import ServiceError, ValidationError as AppValidationError
from app.schemas.base_response import BaseResponse, BaseListResponse
from app.models.email_scan_job import EmailScanJob

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/jobs")
async def create_scan_job(
    background_tasks: BackgroundTasks,
    job_data: EmailScanJobCreate = Body(..., description="扫描任务信息"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """创建邮箱扫描任务
    
    创建新的邮箱扫描任务，支持：
    - 自定义扫描参数
    - 日期范围筛选
    - 关键词过滤（支持包含和排除关键词）
    - 发件人过滤
    - 附件类型筛选
    
    关键词匹配逻辑：
    1. 首先检查排除关键词（exclude_keywords）- 如果邮件主题包含任何排除关键词，直接跳过
    2. 然后检查包含关键词（subject_keywords）- 邮件主题必须包含指定的关键词（仅支持单个）
    
    示例请求：
    ```json
    {
        "email_account_id": "xxx",
        "scan_params": {
            "subject_keywords": ["发票"],
            "exclude_keywords": ["测试", "广告", "垃圾"],
            "date_from": "2024-01-01"
        }
    }
    ```
    
    任务创建后会在后台异步执行。
    """
    try:
        # 验证输入参数
        if not job_data.email_account_id:
            raise HTTPException(
                status_code=400,
                detail="email_account_id 不能为空"
            )
        
        # 验证日期范围
        if job_data.scan_params.date_from and job_data.scan_params.date_to:
            if job_data.scan_params.date_from > job_data.scan_params.date_to:
                raise HTTPException(
                    status_code=400,
                    detail="开始日期不能晚于结束日期"
                )
        
        # 验证关键词数量限制（仅支持单个关键词）
        if job_data.scan_params.subject_keywords:
            if len(job_data.scan_params.subject_keywords) > 1:
                raise HTTPException(
                    status_code=400,
                    detail="仅支持单个关键词查询，请只提供一个关键词"
                )
        
        if job_data.scan_params.exclude_keywords:
            if len(job_data.scan_params.exclude_keywords) > 50:
                raise HTTPException(
                    status_code=400,
                    detail="排除关键词数量不能超过50个"
                )
        
        # 创建扫描任务
        scan_job = await EmailScannerService.create_scan_job(
            db=db,
            user_id=str(current_user.id),
            job_data=job_data
        )
        
        # 在后台执行扫描
        async def execute_scan_with_error_handling():
            """包装函数确保错误时更新任务状态"""
            try:
                # 创建新的数据库会话用于后台任务
                async with async_session_maker() as task_db:
                    await EmailScannerService.execute_scan(
                        task_db,
                        scan_job.job_id,
                        str(current_user.id)
                    )
            except Exception as e:
                logger.error(f"后台扫描任务失败 {scan_job.job_id}: {str(e)}", exc_info=True)
                # 确保任务状态被更新为失败
                try:
                    async with async_session_maker() as error_db:
                        failed_job = await error_db.get(EmailScanJob, scan_job.id)
                        if failed_job and failed_job.status in [ScanJobStatus.PENDING, ScanJobStatus.RUNNING]:
                            failed_job.status = ScanJobStatus.FAILED
                            failed_job.error_message = f"后台任务执行失败: {str(e)}"
                            failed_job.completed_at = datetime.now(timezone.utc)
                            await error_db.commit()
                except Exception as update_error:
                    logger.error(f"更新失败状态时出错: {str(update_error)}", exc_info=True)
        
        background_tasks.add_task(execute_scan_with_error_handling)
        
        # 转换响应数据
        try:
            response_data = EmailScanJobResponse.model_validate(scan_job, from_attributes=True)
            return response_data
        except Exception as e:
            logger.error(f"响应数据转换失败: {str(e)}, scan_job: {scan_job.__dict__}")
            # 创建简化的响应
            return {
                "id": str(scan_job.id),
                "job_id": scan_job.job_id,
                "user_id": str(scan_job.user_id),
                "email_account_id": str(scan_job.email_account_id),
                "job_type": scan_job.job_type,
                "status": scan_job.status,
                "description": scan_job.description,
                "created_at": scan_job.created_at.isoformat() if scan_job.created_at else None
            }
        
    except ValidationError as e:
        logger.error(f"参数验证失败: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"参数验证失败: {str(e)}"
        )
    except ServiceError as e:
        logger.error(f"创建扫描任务失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"创建扫描任务失败: {str(e)}"
        )
    except Exception as e:
        logger.error(f"创建扫描任务时发生错误: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"创建扫描任务时发生内部错误: {str(e)}"
        )


@router.get("/jobs")
async def get_scan_jobs(
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(20, ge=1, le=100, description="返回记录数"),
    status: Optional[ScanJobStatus] = Query(None, description="任务状态筛选"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """获取扫描任务列表
    
    - **skip**: 跳过记录数
    - **limit**: 返回记录数
    - **status**: 任务状态筛选
    """
    jobs = await EmailScannerService.get_scan_jobs(
        db=db,
        user_id=str(current_user.id),
        skip=skip,
        limit=limit,
        status=status
    )
    
    # 获取总数（简化处理，基于返回的记录数）
    # TODO: 实现真正的计数查询以支持大数据量
    total = len(jobs)
    
    # 计算分页信息
    page = (skip // limit) + 1 if limit > 0 else 1
    
    return BaseListResponse[EmailScanJobResponse](
        items=[EmailScanJobResponse.model_validate(job, from_attributes=True) for job in jobs],
        total=total,
        page=page,
        page_size=limit
    )


@router.get("/jobs/{job_id}")
async def get_scan_job(
    job_id: str = Path(..., description="任务ID"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """获取扫描任务详情
    
    返回扫描任务的详细信息，包括：
    - 任务基本信息
    - 扫描参数
    - 执行状态
    - 扫描结果（如果已完成）
    """
    job = await EmailScannerService.get_scan_job(
        db=db,
        job_id=job_id,
        user_id=str(current_user.id)
    )
    
    return EmailScanJobResponse.model_validate(job, from_attributes=True)


@router.get("/jobs/{job_id}/progress")
async def get_scan_progress(
    job_id: str = Path(..., description="任务ID"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """获取扫描任务进度
    
    实时获取扫描任务的执行进度，包括：
    - 当前进度百分比
    - 执行状态
    - 当前执行步骤
    - 统计信息
    """
    job = await EmailScannerService.get_scan_job(
        db=db,
        job_id=job_id,
        user_id=str(current_user.id)
    )
    
    progress = ScanProgressResponse(
        job_id=job.job_id,
        status=job.status,
        progress=job.progress or 0,
        current_step=job.current_step,
        total_emails=job.total_emails or 0,
        scanned_emails=job.scanned_emails or 0,
        matched_emails=job.matched_emails or 0,
        downloaded_attachments=job.downloaded_attachments or 0,
        processed_invoices=job.processed_invoices or 0,
        error_message=job.error_message,
        started_at=job.started_at,
        completed_at=job.completed_at
    )
    
    return progress


class CancelScanJobRequest(BaseModel):
    """取消扫描任务请求"""
    force: bool = Field(default=False, description="是否强制取消")


@router.post("/jobs/{job_id}/cancel")
async def cancel_scan_job(
    job_id: str = Path(..., description="任务ID"),
    request: CancelScanJobRequest = Body(default=CancelScanJobRequest()),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """取消扫描任务
    
    取消正在执行或等待执行的扫描任务。
    已完成或已失败的任务无法取消。
    
    force参数：
    - false（默认）：正常取消，等待当前操作完成
    - true：强制取消，立即停止所有操作
    """
    job = await EmailScannerService.cancel_scan_job(
        db=db,
        job_id=job_id,
        user_id=str(current_user.id),
        force=request.force
    )
    
    return EmailScanJobResponse.model_validate(job, from_attributes=True)


@router.post("/jobs/{job_id}/retry")
async def retry_scan_job(
    background_tasks: BackgroundTasks,
    job_id: str = Path(..., description="任务ID"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """重试扫描任务
    
    重新执行失败的扫描任务。
    只有状态为"失败"的任务才能重试。
    """
    job = await EmailScannerService.get_scan_job(
        db=db,
        job_id=job_id,
        user_id=str(current_user.id)
    )
    
    if job.status != ScanJobStatus.FAILED:
        raise HTTPException(
            status_code=400,
            detail=f"任务状态为 {job.status}，无法重试"
        )
    
    # 重置任务状态
    job.status = ScanJobStatus.PENDING
    job.progress = 0
    job.current_step = None
    job.error_message = None
    job.completed_at = None
    
    await db.commit()
    
    # 在后台重新执行扫描
    async def execute_scan_with_error_handling():
        """包装函数确保错误时更新任务状态"""
        try:
            # 创建新的数据库会话用于后台任务
            async with async_session_maker() as task_db:
                await EmailScannerService.execute_scan(
                    task_db,
                    job.job_id,
                    str(current_user.id)
                )
        except Exception as e:
            logger.error(f"后台扫描任务失败 {job.job_id}: {str(e)}", exc_info=True)
            # 确保任务状态被更新为失败
            try:
                async with async_session_maker() as error_db:
                    failed_job = await error_db.get(EmailScanJob, job.id)
                    if failed_job and failed_job.status in [ScanJobStatus.PENDING, ScanJobStatus.RUNNING]:
                        failed_job.status = ScanJobStatus.FAILED
                        failed_job.error_message = f"后台任务执行失败: {str(e)}"
                        failed_job.completed_at = datetime.now(timezone.utc)
                        await error_db.commit()
            except Exception as update_error:
                logger.error(f"更新失败状态时出错: {str(update_error)}", exc_info=True)
    
    background_tasks.add_task(execute_scan_with_error_handling)
    
    return EmailScanJobResponse.model_validate(job, from_attributes=True)


@router.delete("/jobs/{job_id}")
async def delete_scan_job(
    job_id: str = Path(..., description="任务ID"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """删除扫描任务
    
    删除扫描任务记录。
    正在执行的任务需要先取消才能删除。
    """
    job = await EmailScannerService.get_scan_job(
        db=db,
        job_id=job_id,
        user_id=str(current_user.id)
    )
    
    if job.status == ScanJobStatus.RUNNING:
        raise HTTPException(
            status_code=400,
            detail="正在执行的任务无法删除，请先取消任务"
        )
    
    await db.delete(job)
    await db.commit()
    
    return BaseResponse(message="删除扫描任务成功")


class SmartScanRequest(BaseModel):
    """智能扫描请求"""
    email_account_id: str = Field(..., description="邮箱账户ID")
    keywords: List[str] = Field(default=["发票"], description="搜索关键词")
    exclude_keywords: List[str] = Field(default=[], description="排除关键词")
    description: Optional[str] = Field(None, description="任务描述")


@router.post("/jobs/smart-scan")
async def create_smart_scan_job(
    background_tasks: BackgroundTasks,
    request: SmartScanRequest = Body(..., description="智能扫描请求"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """创建智能扫描任务
    
    傻瓜式一键扫描：
    - 自动计算扫描时间范围（基于上次成功扫描时间）
    - 自动OCR识别和发票解析
    - 自动去重和保存
    - 生成详细扫描报告
    
    用户只需要设置关键词，其他全部自动化处理。
    """
    try:
        # 验证邮箱账户
        from app.services.email_account_service import EmailAccountService
        email_account = await EmailAccountService.get_email_account(
            db=db,
            account_id=request.email_account_id,
            user_id=str(current_user.id)
        )
        
        if not email_account.is_active:
            raise HTTPException(
                status_code=400,
                detail="邮箱账户已停用，无法创建扫描任务"
            )
        
        # 自动计算扫描时间范围
        date_from, date_to = await _calculate_smart_scan_date_range(
            db=db,
            email_account_id=request.email_account_id
        )
        
        # 构建智能扫描参数
        scan_params = {
            "folders": ["INBOX"],
            "date_from": date_from.date().isoformat() if date_from else None,
            "date_to": date_to.date().isoformat() if date_to else None,
            "subject_keywords": request.keywords[:1],  # 只支持单个关键词
            "exclude_keywords": request.exclude_keywords,
            "sender_filters": [],
            "max_emails": 1000,  # 智能扫描限制
            "download_attachments": True,
            "attachment_types": [".pdf", ".jpg", ".jpeg", ".png"],
            "max_attachment_size": 10485760,
            "enable_body_pdf_extraction": True,
            "max_body_analysis_emails": 50,
            "prioritize_attachments": True
        }
        
        # 创建扫描任务
        job_data = EmailScanJobCreate(
            email_account_id=request.email_account_id,
            job_type="incremental",  # 智能增量扫描
            scan_params=scan_params,
            description=request.description or f"智能扫描 {email_account.email_address}"
        )
        
        scan_job = await EmailScannerService.create_scan_job(
            db=db,
            user_id=str(current_user.id),
            job_data=job_data
        )
        
        # 在后台执行扫描（包含自动处理）
        async def execute_scan_with_error_handling():
            """包装函数确保错误时更新任务状态"""
            try:
                # 创建新的数据库会话用于后台任务
                async with async_session_maker() as task_db:
                    await EmailScannerService.execute_scan(
                        task_db,
                        scan_job.job_id,
                        str(current_user.id)
                    )
            except Exception as e:
                logger.error(f"后台扫描任务失败 {scan_job.job_id}: {str(e)}", exc_info=True)
                # 确保任务状态被更新为失败
                try:
                    async with async_session_maker() as error_db:
                        failed_job = await error_db.get(EmailScanJob, scan_job.id)
                        if failed_job and failed_job.status in [ScanJobStatus.PENDING, ScanJobStatus.RUNNING]:
                            failed_job.status = ScanJobStatus.FAILED
                            failed_job.error_message = f"后台任务执行失败: {str(e)}"
                            failed_job.completed_at = datetime.now(timezone.utc)
                            await error_db.commit()
                except Exception as update_error:
                    logger.error(f"更新失败状态时出错: {str(update_error)}", exc_info=True)
        
        background_tasks.add_task(execute_scan_with_error_handling)
        
        # 返回响应（包含计算的时间范围）
        response_data = EmailScanJobResponse.model_validate(scan_job, from_attributes=True)
        
        # 添加智能计算的时间信息
        return {
            **response_data.dict(),
            "smart_scan_info": {
                "auto_calculated_date_from": date_from.date().isoformat() if date_from else None,
                "auto_calculated_date_to": date_to.date().isoformat() if date_to else None,
                "scan_range_description": _get_scan_range_description(date_from, date_to),
                "auto_processing_enabled": True
            }
        }
        
    except ValidationError as e:
        logger.error(f"智能扫描参数验证失败: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"参数验证失败: {str(e)}"
        )
    except ServiceError as e:
        logger.error(f"创建智能扫描任务失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"创建扫描任务失败: {str(e)}"
        )
    except Exception as e:
        logger.error(f"智能扫描时发生错误: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"创建智能扫描任务时发生内部错误: {str(e)}"
        )


async def _calculate_smart_scan_date_range(
    db: AsyncSession,
    email_account_id: str
) -> Tuple[Optional[datetime], Optional[datetime]]:
    """计算智能扫描的日期范围
    
    逻辑：
    1. 查找该账户最后一次成功完成的扫描任务
    2. 如果存在，从其完成时间开始扫描
    3. 如果不存在，从30天前开始扫描
    4. 结束时间为当前时间
    """
    # 查询最后一次成功的扫描任务
    stmt = select(EmailScanJob).filter(
        and_(
            EmailScanJob.email_account_id == email_account_id,
            EmailScanJob.status == ScanJobStatus.COMPLETED,
            EmailScanJob.completed_at.isnot(None)
        )
    ).order_by(EmailScanJob.completed_at.desc()).limit(1)
    
    result = await db.execute(stmt)
    last_job = result.scalar_one_or_none()
    
    # 使用 UTC 时区来确保一致性
    date_to = datetime.now(timezone.utc)
    
    if last_job and last_job.completed_at:
        # 确保 completed_at 有时区信息
        if last_job.completed_at.tzinfo is None:
            # 如果没有时区信息，假设是 UTC
            completed_at = last_job.completed_at.replace(tzinfo=timezone.utc)
        else:
            completed_at = last_job.completed_at
            
        # 从上次扫描完成时间开始（减去1小时避免遗漏）
        date_from = completed_at - timedelta(hours=1)
        logger.info(f"智能扫描：从上次扫描时间开始 {date_from}")
    else:
        # 首次扫描或无历史记录，从30天前开始
        date_from = datetime.now(timezone.utc) - timedelta(days=30)
        logger.info(f"智能扫描：首次扫描，从30天前开始 {date_from}")
    
    return date_from, date_to


def _get_scan_range_description(date_from: Optional[datetime], date_to: Optional[datetime]) -> str:
    """获取扫描范围的描述"""
    if not date_from:
        return "扫描所有邮件"
    
    # 确保使用相同的时区进行比较
    now = datetime.now(timezone.utc)
    # 确保 date_from 有时区信息
    if date_from.tzinfo is None:
        date_from = date_from.replace(tzinfo=timezone.utc)
    
    days_diff = (now - date_from).days
    
    if days_diff <= 1:
        return "扫描最近24小时的邮件"
    elif days_diff <= 7:
        return f"扫描最近{days_diff}天的邮件"
    elif days_diff <= 30:
        return f"扫描最近{days_diff}天的邮件"
    else:
        return f"扫描从{date_from.strftime('%Y-%m-%d')}开始的邮件"