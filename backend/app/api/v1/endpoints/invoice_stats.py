"""
发票统计API端点 - 直接查询数据库视图
"""

from typing import List, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_async_db
from app.core.dependencies import get_current_user, CurrentUser
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("/stats/dashboard")
async def get_dashboard_stats(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
) -> Dict[str, Any]:
    """
    获取仪表盘统计数据 - 直接从数据库视图查询
    """
    try:
        user_id = current_user.id
        logger.info(f"获取用户 {user_id} 的仪表盘统计数据")
        
        # 查询用户汇总
        summary_query = text("""
            SELECT * FROM invoice_user_summary 
            WHERE user_id = :user_id
        """)
        summary_result = await db.execute(summary_query, {"user_id": str(user_id)})
        summary = summary_result.first()
        
        # 查询月度统计
        monthly_query = text("""
            SELECT month, invoice_count, total_amount 
            FROM invoice_recent_monthly_stats 
            WHERE user_id = :user_id
            ORDER BY month
        """)
        monthly_result = await db.execute(monthly_query, {"user_id": str(user_id)})
        monthly_rows = monthly_result.all()
        
        # 查询类型统计
        type_query = text("""
            SELECT invoice_type, count, total_amount, avg_amount
            FROM invoice_type_stats 
            WHERE user_id = :user_id
            ORDER BY count DESC
        """)
        type_result = await db.execute(type_query, {"user_id": str(user_id)})
        type_rows = type_result.all()
        
        # 查询最近发票
        recent_query = text("""
            SELECT id, invoice_number, invoice_date, seller_name, 
                   total_amount, invoice_type, created_at
            FROM invoices 
            WHERE user_id = :user_id AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT 5
        """)
        recent_result = await db.execute(recent_query, {"user_id": str(user_id)})
        recent_rows = recent_result.all()
        
        # 查询状态分布
        status_query = text("""
            SELECT status, COUNT(*) as count
            FROM invoices 
            WHERE user_id = :user_id AND deleted_at IS NULL
            GROUP BY status
        """)
        status_result = await db.execute(status_query, {"user_id": str(user_id)})
        status_rows = status_result.all()
        
        # 处理数据
        monthly_data = [
            {
                "month": row.month,
                "invoices": int(row.invoice_count),
                "amount": float(row.total_amount) if row.total_amount else 0
            }
            for row in monthly_rows
        ]
        
        colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
        category_data = [
            {
                "name": row.invoice_type,
                "value": int(row.count),
                "amount": float(row.total_amount) if row.total_amount else 0,
                "color": colors[idx % len(colors)]
            }
            for idx, row in enumerate(type_rows)
        ]
        
        recent_activity = [
            {
                "id": str(row.id),
                "invoice_number": row.invoice_number,
                "invoice_date": row.invoice_date.isoformat() if row.invoice_date else None,
                "seller_name": row.seller_name,
                "total_amount": float(row.total_amount) if row.total_amount else 0,
                "invoice_type": row.invoice_type,
                "created_at": row.created_at.isoformat() if row.created_at else None
            }
            for row in recent_rows
        ]
        
        status_distribution = {
            row.status: int(row.count) for row in status_rows
        }
        
        # 构建响应
        result = {
            "summary": {
                "total_invoices": int(summary.total_invoices) if summary else 0,
                "total_amount": float(summary.total_amount) if summary and summary.total_amount else 0,
                "avg_amount": float(summary.avg_amount) if summary and summary.avg_amount else 0,
                "max_amount": float(summary.max_amount) if summary and summary.max_amount else 0,
                "min_amount": float(summary.min_amount) if summary and summary.min_amount else 0,
                "active_months": int(summary.active_months) if summary else 0,
                "invoice_types": int(summary.invoice_types) if summary else 0
            },
            "monthly_data": monthly_data,
            "category_data": category_data,
            "recent_activity": recent_activity,
            "status_distribution": status_distribution,
            "pending_invoices": status_distribution.get("pending", 0),
            "completed_invoices": status_distribution.get("completed", 0)
        }
        
        logger.info(f"返回统计数据: 月度数据 {len(monthly_data)} 条, 分类数据 {len(category_data)} 条")
        
        return result
        
    except Exception as e:
        logger.error(f"获取仪表盘统计失败: {e}")
        raise HTTPException(status_code=500, detail="获取统计数据失败")