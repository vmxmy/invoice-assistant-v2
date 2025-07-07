"""
发票管理API端点
提供发票的查询、详情、统计等功能
"""

from datetime import date, datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field

from app.core.database import get_async_db
from app.core.dependencies import get_current_user, CurrentUser
from app.models.profile import Profile
from app.models.invoice import Invoice, InvoiceStatus, InvoiceSource
from app.services.invoice_service import InvoiceService
from app.services.file_service import FileService
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


# 响应模型
class InvoiceListItem(BaseModel):
    """发票列表项"""
    id: UUID
    invoice_number: str
    invoice_date: date
    seller_name: Optional[str]
    buyer_name: Optional[str]
    total_amount: float
    status: str
    processing_status: Optional[str]
    source: str
    created_at: datetime
    tags: List[str] = []
    
    class Config:
        from_attributes = True


class InvoiceDetail(BaseModel):
    """发票详情"""
    id: UUID
    invoice_number: str
    invoice_code: Optional[str]
    invoice_type: Optional[str]
    invoice_date: date
    seller_name: Optional[str]
    seller_tax_id: Optional[str]
    buyer_name: Optional[str]
    buyer_tax_id: Optional[str]
    amount: float
    tax_amount: Optional[float]
    total_amount: Optional[float]
    currency: str
    status: str
    processing_status: Optional[str]
    source: str
    file_path: Optional[str]
    file_url: Optional[str]
    file_size: Optional[int]
    is_verified: bool
    verified_at: Optional[datetime]
    tags: List[str] = []
    category: Optional[str]
    extracted_data: Dict[str, Any] = {}
    source_metadata: Optional[Dict[str, Any]] = {}
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    """发票列表响应"""
    items: List[InvoiceListItem]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool


class InvoiceStatisticsResponse(BaseModel):
    """发票统计响应（详细版）"""
    total_count: int
    amount_stats: Dict[str, float]
    status_distribution: Dict[str, int]
    source_distribution: Dict[str, int]
    recent_activity: Dict[str, Any] = {}


# API端点
@router.get("/", response_model=InvoiceListResponse)
async def list_invoices(
    query: Optional[str] = Query(None, description="搜索关键词"),
    seller_name: Optional[str] = Query(None, description="销售方名称"),
    invoice_number: Optional[str] = Query(None, description="发票号码"),
    date_from: Optional[date] = Query(None, description="开始日期"),
    date_to: Optional[date] = Query(None, description="结束日期"),
    amount_min: Optional[float] = Query(None, description="最小金额"),
    amount_max: Optional[float] = Query(None, description="最大金额"),
    status: Optional[InvoiceStatus] = Query(None, description="发票状态"),
    source: Optional[InvoiceSource] = Query(None, description="发票来源"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    获取发票列表
    支持多种筛选条件和分页
    """
    try:
        file_service = FileService()
        invoice_service = InvoiceService(db, file_service)
        
        # 计算偏移量
        offset = (page - 1) * page_size
        
        # 搜索发票
        invoices, total = await invoice_service.search_invoices(
            user_id=current_user.id,
            query=query,
            seller_name=seller_name,
            invoice_number=invoice_number,
            date_from=date_from,
            date_to=date_to,
            amount_min=amount_min,
            amount_max=amount_max,
            status=status,
            source=source,
            limit=page_size,
            offset=offset
        )
        
        # 构造响应
        return InvoiceListResponse(
            items=[InvoiceListItem.from_orm(invoice) for invoice in invoices],
            total=total,
            page=page,
            page_size=page_size,
            has_next=offset + page_size < total,
            has_prev=page > 1
        )
        
    except Exception as e:
        logger.error(f"获取发票列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取发票列表失败")



@router.get("/statistics", response_model=InvoiceStatisticsResponse)
async def get_invoice_statistics(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    获取发票统计信息
    包括总数、金额统计、状态分布等
    """
    try:
        file_service = FileService()
        invoice_service = InvoiceService(db, file_service)
        
        stats = await invoice_service.get_invoice_statistics(current_user.id)
        
        # 添加最近活动信息 - 使用简单查询避免重复
        recent_query = select(Invoice).where(
            Invoice.user_id == current_user.id,
            Invoice.deleted_at.is_(None)
        ).order_by(Invoice.created_at.desc()).limit(5)
        recent_result = await db.execute(recent_query)
        recent_invoices = recent_result.scalars().all()
        
        stats["recent_activity"] = {
            "recent_count": len(recent_invoices),
            "recent_invoices": [
                {
                    "id": str(inv.id),
                    "invoice_number": inv.invoice_number,
                    "amount": float(inv.total_amount or 0),
                    "date": inv.invoice_date.isoformat() if inv.invoice_date else None,
                    "created_at": inv.created_at.isoformat()
                }
                for inv in recent_invoices
            ]
        }
        
        return InvoiceStatisticsResponse(**stats)
        
    except Exception as e:
        logger.error(f"获取发票统计失败: {e}")
        raise HTTPException(status_code=500, detail="获取发票统计失败")


@router.get("/{invoice_id}", response_model=InvoiceDetail)
async def get_invoice_detail(
    invoice_id: UUID = Path(..., description="发票ID"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    获取发票详情
    包括完整的提取数据和元信息
    """
    try:
        file_service = FileService()
        invoice_service = InvoiceService(db, file_service)
        
        invoice = await invoice_service.get_invoice_by_id(
            invoice_id=invoice_id,
            user_id=current_user.id
        )
        
        if not invoice:
            raise HTTPException(status_code=404, detail="发票不存在")
        
        return InvoiceDetail.from_orm(invoice)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取发票详情失败: {e}")
        raise HTTPException(status_code=500, detail="获取发票详情失败")


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: UUID = Path(..., description="发票ID"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    删除发票（软删除）
    同时删除关联的文件
    """
    try:
        file_service = FileService()
        invoice_service = InvoiceService(db, file_service)
        
        success = await invoice_service.delete_invoice(
            invoice_id=invoice_id,
            user_id=current_user.id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="发票不存在")
        
        return {"message": "发票删除成功", "invoice_id": str(invoice_id)}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除发票失败: {e}")
        raise HTTPException(status_code=500, detail="删除发票失败")


@router.post("/{invoice_id}/verify")
async def verify_invoice(
    invoice_id: UUID = Path(..., description="发票ID"),
    notes: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    标记发票为已验证
    """
    try:
        file_service = FileService()
        invoice_service = InvoiceService(db, file_service)
        
        invoice = await invoice_service.get_invoice_by_id(
            invoice_id=invoice_id,
            user_id=current_user.id
        )
        
        if not invoice:
            raise HTTPException(status_code=404, detail="发票不存在")
        
        # 标记为已验证
        invoice.mark_as_verified(current_user.id, notes)
        await db.commit()
        
        return {
            "message": "发票验证成功",
            "invoice_id": str(invoice_id),
            "verified_at": invoice.verified_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"验证发票失败: {e}")
        raise HTTPException(status_code=500, detail="验证发票失败")


@router.put("/{invoice_id}/tags")
async def update_invoice_tags(
    invoice_id: UUID = Path(..., description="发票ID"),
    tags: List[str] = [],
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    更新发票标签
    """
    try:
        file_service = FileService()
        invoice_service = InvoiceService(db, file_service)
        
        invoice = await invoice_service.get_invoice_by_id(
            invoice_id=invoice_id,
            user_id=current_user.id
        )
        
        if not invoice:
            raise HTTPException(status_code=404, detail="发票不存在")
        
        # 更新标签
        invoice.tags = tags
        await db.commit()
        
        return {
            "message": "标签更新成功",
            "invoice_id": str(invoice_id),
            "tags": invoice.tags
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新发票标签失败: {e}")
        raise HTTPException(status_code=500, detail="更新发票标签失败")