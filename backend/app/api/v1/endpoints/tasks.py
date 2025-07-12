"""
任务状态查询端点
用于查询PostgreSQL任务队列状态
"""

from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.dependencies import get_current_user, CurrentUser
from app.services.postgresql_task_processor import task_queue
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class TaskStatsResponse(BaseModel):
    """任务统计响应模型"""
    total_tasks: int
    status_breakdown: dict
    pending: int
    processing: int
    completed: int
    failed: int
    cancelled: int
    avg_durations: dict
    hours_back: int
    user_id: str


@router.get("/stats")
async def get_task_stats(
    current_user: CurrentUser = Depends(get_current_user),
    hours_back: int = Query(24, ge=1, le=168, description="统计过去多少小时的数据")
) -> TaskStatsResponse:
    """
    获取任务统计信息
    
    Returns:
        TaskStatsResponse: 任务统计
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
        
        return TaskStatsResponse(
            total_tasks=total_tasks,
            status_breakdown=status_counts,
            pending=status_counts.get("pending", 0),
            processing=status_counts.get("processing", 0),
            completed=status_counts.get("completed", 0),
            failed=status_counts.get("failed", 0),
            cancelled=status_counts.get("cancelled", 0),
            avg_durations=avg_durations,
            hours_back=hours_back,
            user_id=str(current_user.id)
        )
        
    except Exception as e:
        logger.error(f"获取任务统计失败: {e}")
        raise HTTPException(
            status_code=500, 
            detail="获取任务统计失败"
        )