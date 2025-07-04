"""
任务状态查询端点
用于查询PostgreSQL任务队列状态和邮件处理任务状态
"""

from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_async_db
from app.core.dependencies import get_current_user, CurrentUser
from app.models.task import TaskStatus, EmailProcessingTask
from app.services.postgresql_task_processor import task_queue
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class TaskStatusResponse(BaseModel):
    """任务状态响应模型"""
    id: str
    user_id: str
    email_subject: str
    email_sender: str
    status: TaskStatus
    status_message: Optional[str] = None
    attachment_count: int
    created_at: str
    updated_at: str
    metadata_: Optional[dict] = None


class CeleryTaskResponse(BaseModel):
    """Celery任务状态响应模型"""
    task_id: str
    status: str
    result: Optional[dict] = None
    traceback: Optional[str] = None
    task_name: Optional[str] = None


@router.get("/email-processing/{task_id}")
async def get_email_processing_task(
    task_id: str,
    current_user: CurrentUser = Depends(get_current_user)
) -> TaskStatusResponse:
    """
    获取邮件处理任务状态
    
    Args:
        task_id: 任务ID
        current_user: 当前用户
        
    Returns:
        TaskStatusResponse: 任务状态信息
    """
    try:
        # 使用PostgreSQL任务队列查询任务状态
        task_status = await task_queue.get_task_status(task_id)
        
        if not task_status:
            raise HTTPException(
                status_code=404, 
                detail="任务不存在"
            )
        
        # 检查用户权限（如果任务中包含用户信息）
        # 注意：这里需要根据实际需求调整权限检查逻辑
        
        return TaskStatusResponse(
            id=task_status["task_id"],
            user_id=str(current_user.id),
            email_subject=task_status.get("result", {}).get("email_subject", "") if task_status.get("result") else "",
            email_sender=task_status.get("result", {}).get("email_sender", "") if task_status.get("result") else "",
            status=TaskStatus(task_status["status"]),
            status_message=task_status.get("error_message"),
            attachment_count=task_status.get("result", {}).get("attachment_count", 0) if task_status.get("result") else 0,
            created_at=task_status["created_at"],
            updated_at=task_status.get("completed_at") or task_status["created_at"],
            metadata_=task_status.get("result")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取邮件处理任务失败: {e}")
        raise HTTPException(
            status_code=500, 
            detail="获取任务状态失败"
        )


@router.get("/email-processing")
async def list_email_processing_tasks(
    db: AsyncSession = Depends(get_async_db),
    current_user: CurrentUser = Depends(get_current_user),
    status: Optional[TaskStatus] = Query(None, description="任务状态筛选"),
    limit: int = Query(20, ge=1, le=100, description="返回数量"),
    offset: int = Query(0, ge=0, description="偏移量")
) -> List[TaskStatusResponse]:
    """
    获取用户的邮件处理任务列表
    
    Args:
        status: 状态筛选
        limit: 返回数量
        offset: 偏移量
        current_user: 当前用户
        
    Returns:
        List[TaskStatusResponse]: 任务状态列表
    """
    try:
        # 构建查询
        query = select(EmailProcessingTask).where(
            EmailProcessingTask.user_id == str(current_user.id)
        )
        
        if status:
            query = query.where(EmailProcessingTask.status == status)
        
        query = query.order_by(EmailProcessingTask.created_at.desc())
        query = query.offset(offset).limit(limit)
        
        # 执行查询
        result = await db.execute(query)
        tasks = result.scalars().all()
        
        return [
            TaskStatusResponse(
                id=str(task.id),
                user_id=str(task.user_id),
                email_subject=task.email_subject or "",
                email_sender=task.email_sender or "",
                status=task.status,
                status_message=task.status_message,
                attachment_count=task.attachment_count or 0,
                created_at=task.created_at.isoformat(),
                updated_at=task.updated_at.isoformat(),
                metadata_=task.metadata_
            )
            for task in tasks
        ]
        
    except Exception as e:
        logger.error(f"获取邮件处理任务列表失败: {e}")
        raise HTTPException(
            status_code=500, 
            detail="获取任务列表失败"
        )


@router.get("/celery/{task_id}")
async def get_celery_task_status(
    task_id: str,
    current_user: CurrentUser = Depends(get_current_user)
) -> CeleryTaskResponse:
    """
    获取Celery任务状态
    
    Args:
        task_id: Celery任务ID
        current_user: 当前用户
        
    Returns:
        CeleryTaskResponse: Celery任务状态
    """
    try:
        # Celery功能已移除，返回不支持的响应
        raise HTTPException(
            status_code=501,
            detail="Celery功能已移除，请使用PostgreSQL任务队列"
        )
        
    except Exception as e:
        logger.error(f"获取Celery任务状态失败: {e}")
        raise HTTPException(
            status_code=500, 
            detail="获取Celery任务状态失败"
        )


@router.delete("/email-processing/{task_id}")
async def delete_email_processing_task(
    task_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> dict:
    """
    删除邮件处理任务记录
    
    Args:
        task_id: 任务ID
        current_user: 当前用户
        
    Returns:
        dict: 删除结果
    """
    try:
        # 查询任务
        query = select(EmailProcessingTask).where(
            and_(
                EmailProcessingTask.id == task_id,
                EmailProcessingTask.user_id == str(current_user.id)
            )
        )
        
        result = await db.execute(query)
        task = result.scalar_one_or_none()
        
        if not task:
            raise HTTPException(
                status_code=404, 
                detail="邮件处理任务不存在或无权限访问"
            )
        
        # 删除任务
        await db.delete(task)
        await db.commit()
        
        logger.info(f"删除邮件处理任务: {task_id} - 用户: {current_user.id}")
        
        return {
            "status": "success",
            "message": "任务删除成功",
            "task_id": task_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除邮件处理任务失败: {e}")
        raise HTTPException(
            status_code=500, 
            detail="删除任务失败"
        )


@router.post("/test-celery")
async def test_celery_connection(
    current_user: CurrentUser = Depends(get_current_user)
) -> dict:
    """
    测试Celery连接和任务队列
    
    Returns:
        dict: 测试结果
    """
    try:
        # Celery功能已移除，返回不支持的响应
        raise HTTPException(
            status_code=501,
            detail="Celery功能已移除，请使用PostgreSQL任务队列"
        )
        
    except Exception as e:
        logger.error(f"Celery连接测试失败: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Celery连接失败: {str(e)}"
        )


@router.get("/stats")
async def get_task_stats(
    current_user: CurrentUser = Depends(get_current_user),
    hours_back: int = Query(24, ge=1, le=168, description="统计过去多少小时的数据")
) -> dict:
    """
    获取任务统计信息
    
    Returns:
        dict: 任务统计
    """
    try:
        # 使用PostgreSQL任务队列获取统计信息
        stats_data = await task_queue.get_task_stats(
            user_id=str(current_user.id),
            hours_back=hours_back
        )
        
        # 处理统计数据
        status_counts = {}
        total_tasks = 0
        avg_durations = {}
        
        for stat in stats_data:
            task_type = stat["task_type"]
            status = stat["status"]
            count = stat["count"]
            avg_duration = stat["avg_duration_seconds"]
            
            # 按状态统计
            if status not in status_counts:
                status_counts[status] = 0
            status_counts[status] += count
            total_tasks += count
            
            # 平均耗时统计
            if avg_duration is not None:
                if task_type not in avg_durations:
                    avg_durations[task_type] = {}
                avg_durations[task_type][status] = avg_duration
        
        return {
            "total_tasks": total_tasks,
            "status_breakdown": status_counts,
            "pending": status_counts.get("pending", 0),
            "processing": status_counts.get("processing", 0),
            "completed": status_counts.get("completed", 0),
            "failed": status_counts.get("failed", 0),
            "cancelled": status_counts.get("cancelled", 0),
            "avg_durations": avg_durations,
            "hours_back": hours_back,
            "user_id": str(current_user.id)
        }
        
    except Exception as e:
        logger.error(f"获取任务统计失败: {e}")
        raise HTTPException(
            status_code=500, 
            detail="获取任务统计失败"
        )