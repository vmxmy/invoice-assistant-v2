"""Enhanced email scan API endpoints with security improvements."""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Path, Body, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import ValidationError, BaseModel, Field

from app.core.database import get_db
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
        background_tasks.add_task(
            EmailScannerService.execute_scan,
            db,
            scan_job.job_id,
            str(current_user.id)
        )
        
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
    background_tasks.add_task(
        EmailScannerService.execute_scan,
        db,
        job.job_id,
        str(current_user.id)
    )
    
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