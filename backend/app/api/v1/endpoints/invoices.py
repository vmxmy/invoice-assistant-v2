"""
发票相关 API 端点

处理发票的创建、查询、更新、删除等操作。
"""

from typing import List, Optional
from uuid import UUID
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from pydantic import BaseModel, Field

from app.core.dependencies import CurrentUser, get_current_user, get_db_session, PaginationParams, get_pagination_params
from app.models.invoice import Invoice, InvoiceStatus, ProcessingStatus, InvoiceSource

router = APIRouter()


# ===== Pydantic 模型 =====

class InvoiceCreate(BaseModel):
    """创建发票请求模型"""
    invoice_number: str = Field(..., max_length=100, description="发票号码")
    invoice_code: Optional[str] = Field(None, max_length=50, description="发票代码")
    invoice_type: Optional[str] = Field(None, max_length=50, description="发票类型")
    amount: Decimal = Field(..., ge=0, description="金额（不含税）")
    tax_amount: Optional[Decimal] = Field(None, ge=0, description="税额")
    total_amount: Optional[Decimal] = Field(None, ge=0, description="价税合计")
    currency: str = Field("CNY", max_length=3, description="币种")
    invoice_date: date = Field(..., description="开票日期")
    seller_name: Optional[str] = Field(None, max_length=200, description="销售方名称")
    seller_tax_id: Optional[str] = Field(None, max_length=50, description="销售方纳税人识别号")
    buyer_name: Optional[str] = Field(None, max_length=200, description="购买方名称")
    buyer_tax_id: Optional[str] = Field(None, max_length=50, description="购买方纳税人识别号")
    tags: List[str] = Field([], description="标签列表")
    category: Optional[str] = Field(None, max_length=50, description="分类")
    source: InvoiceSource = Field(InvoiceSource.UPLOAD, description="发票来源")


class InvoiceUpdate(BaseModel):
    """更新发票请求模型"""
    invoice_number: Optional[str] = Field(None, max_length=100)
    invoice_code: Optional[str] = Field(None, max_length=50)
    invoice_type: Optional[str] = Field(None, max_length=50)
    amount: Optional[Decimal] = Field(None, ge=0)
    tax_amount: Optional[Decimal] = Field(None, ge=0)
    total_amount: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    invoice_date: Optional[date] = None
    seller_name: Optional[str] = Field(None, max_length=200)
    seller_tax_id: Optional[str] = Field(None, max_length=50)
    buyer_name: Optional[str] = Field(None, max_length=200)
    buyer_tax_id: Optional[str] = Field(None, max_length=50)
    tags: Optional[List[str]] = None
    category: Optional[str] = Field(None, max_length=50)
    verification_notes: Optional[str] = None


class InvoiceResponse(BaseModel):
    """发票响应模型"""
    id: UUID
    user_id: UUID
    invoice_number: str
    invoice_code: Optional[str]
    invoice_type: Optional[str]
    status: InvoiceStatus
    processing_status: Optional[ProcessingStatus]
    amount: Decimal
    tax_amount: Optional[Decimal]
    total_amount: Optional[Decimal]
    currency: str
    invoice_date: date
    seller_name: Optional[str]
    seller_tax_id: Optional[str]
    buyer_name: Optional[str]
    buyer_tax_id: Optional[str]
    extracted_data: dict
    file_path: Optional[str]
    file_url: Optional[str]
    file_size: Optional[int]
    source: InvoiceSource
    is_verified: bool
    verified_at: Optional[str]
    verification_notes: Optional[str]
    tags: List[str]
    category: Optional[str]
    created_at: str
    updated_at: str
    
    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    """发票列表响应"""
    invoices: List[InvoiceResponse]
    total: int
    page: int
    size: int
    pages: int


# ===== API 端点 =====

@router.get("/", response_model=InvoiceListResponse)
async def list_invoices(
    current_user: CurrentUser = Depends(get_current_user),
    pagination: PaginationParams = Depends(get_pagination_params),
    status_filter: Optional[InvoiceStatus] = Query(None, alias="status", description="发票状态筛选"),
    start_date: Optional[date] = Query(None, description="开始日期筛选"),
    end_date: Optional[date] = Query(None, description="结束日期筛选"),
    min_amount: Optional[Decimal] = Query(None, ge=0, description="最小金额筛选"),
    max_amount: Optional[Decimal] = Query(None, ge=0, description="最大金额筛选"),
    seller_name: Optional[str] = Query(None, description="销售方名称筛选"),
    category: Optional[str] = Query(None, description="分类筛选"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: AsyncSession = Depends(get_db_session)
):
    """
    获取当前用户的发票列表
    
    支持多种筛选条件和分页。
    """
    
    # 构建基础查询
    query = select(Invoice).where(
        Invoice.user_id == current_user.id,
        Invoice.deleted_at.is_(None)
    )
    
    # 应用筛选条件
    filters = []
    
    if status_filter:
        filters.append(Invoice.status == status_filter)
    
    if start_date:
        filters.append(Invoice.invoice_date >= start_date)
    
    if end_date:
        filters.append(Invoice.invoice_date <= end_date)
    
    if min_amount is not None:
        filters.append(Invoice.amount >= min_amount)
    
    if max_amount is not None:
        filters.append(Invoice.amount <= max_amount)
    
    if seller_name:
        filters.append(Invoice.seller_name.ilike(f"%{seller_name}%"))
    
    if category:
        filters.append(Invoice.category == category)
    
    if search:
        search_pattern = f"%{search}%"
        filters.append(
            or_(
                Invoice.invoice_number.ilike(search_pattern),
                Invoice.seller_name.ilike(search_pattern),
                Invoice.buyer_name.ilike(search_pattern)
            )
        )
    
    if filters:
        query = query.where(and_(*filters))
    
    # 获取总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # 分页查询
    query = query.offset(pagination.offset).limit(pagination.limit)
    query = query.order_by(desc(Invoice.created_at))
    
    result = await db.execute(query)
    invoices = result.scalars().all()
    
    # 计算页数
    pages = (total + pagination.size - 1) // pagination.size
    
    return InvoiceListResponse(
        invoices=[InvoiceResponse.from_orm(invoice) for invoice in invoices],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=pages
    )


@router.post("/", response_model=InvoiceResponse)
async def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """创建新发票"""
    
    # 检查发票号是否重复
    existing_stmt = select(Invoice).where(
        Invoice.user_id == current_user.id,
        Invoice.invoice_number == invoice_data.invoice_number,
        Invoice.deleted_at.is_(None)
    )
    existing_result = await db.execute(existing_stmt)
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"发票号 {invoice_data.invoice_number} 已存在"
        )
    
    # 自动计算总金额（如果未提供）
    invoice_dict = invoice_data.dict()
    if not invoice_dict.get("total_amount"):
        amount = invoice_dict.get("amount", 0)
        tax_amount = invoice_dict.get("tax_amount", 0)
        invoice_dict["total_amount"] = amount + tax_amount
    
    # 创建发票
    invoice = Invoice(
        user_id=current_user.id,
        **invoice_dict
    )
    
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)
    
    return InvoiceResponse.from_orm(invoice)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """获取指定发票详情"""
    
    stmt = select(Invoice).where(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id,
        Invoice.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="发票不存在"
        )
    
    return InvoiceResponse.from_orm(invoice)


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    invoice_data: InvoiceUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """更新发票信息"""
    
    # 查询现有发票
    stmt = select(Invoice).where(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id,
        Invoice.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="发票不存在"
        )
    
    # 检查发票号是否与其他发票重复
    if invoice_data.invoice_number and invoice_data.invoice_number != invoice.invoice_number:
        existing_stmt = select(Invoice).where(
            Invoice.user_id == current_user.id,
            Invoice.invoice_number == invoice_data.invoice_number,
            Invoice.id != invoice_id,
            Invoice.deleted_at.is_(None)
        )
        existing_result = await db.execute(existing_stmt)
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"发票号 {invoice_data.invoice_number} 已存在"
            )
    
    # 更新字段
    update_data = invoice_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(invoice, field, value)
    
    await db.commit()
    await db.refresh(invoice)
    
    return InvoiceResponse.from_orm(invoice)


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """删除发票（软删除）"""
    
    # 查询现有发票
    stmt = select(Invoice).where(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id,
        Invoice.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="发票不存在"
        )
    
    # 软删除
    invoice.soft_delete()
    
    await db.commit()
    
    return {"message": "发票已删除"}


@router.post("/{invoice_id}/verify", response_model=InvoiceResponse)
async def verify_invoice(
    invoice_id: UUID,
    notes: Optional[str] = Query(None, description="验证备注"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """验证发票"""
    
    # 查询现有发票
    stmt = select(Invoice).where(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id,
        Invoice.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="发票不存在"
        )
    
    # 标记为已验证
    invoice.mark_as_verified(current_user.id, notes)
    
    await db.commit()
    await db.refresh(invoice)
    
    return InvoiceResponse.from_orm(invoice)


@router.get("/stats/overview")
async def get_invoice_stats(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """获取发票统计信息"""
    
    base_query = select(Invoice).where(
        Invoice.user_id == current_user.id,
        Invoice.deleted_at.is_(None)
    )
    
    # 总发票数
    total_stmt = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(total_stmt)
    total_invoices = total_result.scalar()
    
    # 已验证发票数
    verified_stmt = select(func.count()).select_from(
        base_query.where(Invoice.is_verified == True).subquery()
    )
    verified_result = await db.execute(verified_stmt)
    verified_invoices = verified_result.scalar()
    
    # 总金额
    amount_stmt = select(func.sum(Invoice.total_amount)).select_from(base_query.subquery())
    amount_result = await db.execute(amount_stmt)
    total_amount = amount_result.scalar() or 0
    
    return {
        "total_invoices": total_invoices,
        "verified_invoices": verified_invoices,
        "unverified_invoices": total_invoices - verified_invoices,
        "total_amount": float(total_amount)
    }