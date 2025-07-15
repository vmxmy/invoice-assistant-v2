"""
发票管理API端点
提供发票的查询、详情、统计等功能
"""

from markupsafe import escape
from sqlalchemy import select

from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field

from app.core.database import get_async_db
from app.core.dependencies import get_current_user, CurrentUser

from app.models.invoice import Invoice, InvoiceStatus, InvoiceSource
from app.services.invoice_service import InvoiceService
from app.services.file_service import FileService
from app.services.storage_service import StorageService
from app.services.storage_service import get_storage_service
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


# 响应模型
class InvoiceListItem(BaseModel):
    """发票列表项"""
    id: UUID
    invoice_number: str
    invoice_date: date
    consumption_date: Optional[date]
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
    invoice_code: Optional[str] = None
    invoice_type: Optional[str] = None
    invoice_date: date
    consumption_date: Optional[date] = None
    seller_name: Optional[str] = None
    seller_tax_number: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_tax_number: Optional[str] = None
    amount: float  # This is amount_without_tax from DB
    amount_without_tax: Optional[float] = None
    tax_amount: Optional[float] = None
    total_amount: Optional[float] = None
    currency: str
    status: str
    processing_status: Optional[str] = None
    source: str
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    ocr_confidence_score: Optional[float] = None
    is_verified: bool
    verified_at: Optional[datetime] = None
    tags: List[str] = []
    category: Optional[str] = None
    notes: Optional[str] = None
    remarks: Optional[str] = None
    extracted_data: Dict[str, Any] = {}
    source_metadata: Optional[Dict[str, Any]] = None
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

# ... (rest of the file)


@router.get("/", response_model=InvoiceListResponse)
async def list_invoices(
    query: Optional[str] = Query(None, description="搜索关键词"),
    seller_name: Optional[str] = Query(None, description="销售方名称"),
    invoice_number: Optional[str] = Query(None, description="发票号码"),
    date_from: Optional[date] = Query(None, description="消费开始日期"),
    date_to: Optional[date] = Query(None, description="消费结束日期"),
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

        # 使用参数化查询
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


# ... (rest of the file)


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

        # 处理extracted_data，确保JSON格式正确并进行安全处理
        if invoice.extracted_data:
            import json
            import ast
            import re
            
            def safe_parse_dict_string(dict_str: str):
                """安全解析字符串格式的Python字典"""
                if not dict_str or not isinstance(dict_str, str):
                    return None
                
                try:
                    # 清理HTML转义字符
                    cleaned = dict_str.replace("&amp;", "&").replace("&#39;", "'").replace("&#34;", '"')
                    # 清理多层转义
                    cleaned = re.sub(r'&amp;amp;amp;amp;#39;', "'", cleaned)
                    cleaned = re.sub(r'&amp;amp;amp;amp;#34;', '"', cleaned)
                    
                    # 尝试使用ast.literal_eval安全解析
                    result = ast.literal_eval(cleaned)
                    return result if isinstance(result, dict) else None
                except (ValueError, SyntaxError):
                    try:
                        # 尝试JSON解析作为备选
                        return json.loads(cleaned)
                    except (json.JSONDecodeError, ValueError):
                        return None
            
            def parse_and_sanitize_value(v):
                if v is None:
                    return None
                elif isinstance(v, str):
                    # 检查是否是字符串格式的字典
                    if v.startswith('{') and v.endswith('}'):
                        parsed_dict = safe_parse_dict_string(v)
                        if parsed_dict:
                            return parse_and_sanitize_value(parsed_dict)
                    
                    # 尝试解析JSON字符串
                    try:
                        parsed = json.loads(v)
                        return parse_and_sanitize_value(parsed)
                    except (json.JSONDecodeError, TypeError):
                        # 不是JSON字符串，直接转义
                        return str(escape(str(v)))
                elif isinstance(v, (list, dict)):
                    # 递归处理嵌套结构
                    if isinstance(v, list):
                        return [parse_and_sanitize_value(item) for item in v]
                    else:
                        return {k: parse_and_sanitize_value(val) for k, val in v.items()}
                else:
                    # 其他类型直接转换为字符串并转义
                    return str(escape(str(v)))
            
            # 处理extracted_data
            raw_extracted_data = invoice.extracted_data.copy()
            
            # 特殊处理structured_data字段
            structured_data = raw_extracted_data.get('structured_data')
            if isinstance(structured_data, str):
                parsed_structured = safe_parse_dict_string(structured_data)
                if parsed_structured:
                    # 将解析后的数据合并到根级别
                    raw_extracted_data.update(parsed_structured)
                    # 设置新的structured_data
                    raw_extracted_data['structured_data'] = parsed_structured
            
            sanitized_extracted_data = {
                k: parse_and_sanitize_value(v)
                for k, v in raw_extracted_data.items()
            }
        else:
            sanitized_extracted_data = {}
            
        # 构建响应数据，正确映射 amount_without_tax 到 amount
        invoice_data = {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "invoice_code": invoice.invoice_code,
            "invoice_type": invoice.invoice_type,
            "invoice_date": invoice.invoice_date,
            "consumption_date": invoice.consumption_date,  # 添加消费日期字段
            "seller_name": invoice.seller_name,
            "seller_tax_number": invoice.seller_tax_number,
            "buyer_name": invoice.buyer_name,
            "buyer_tax_number": invoice.buyer_tax_number,
            "amount": invoice.amount_without_tax or 0,  # 映射 amount_without_tax 到 amount
            "amount_without_tax": invoice.amount_without_tax,
            "tax_amount": invoice.tax_amount,
            "total_amount": invoice.total_amount,
            "currency": invoice.currency,
            "status": invoice.status.value if hasattr(invoice.status, 'value') else invoice.status,
            "processing_status": invoice.processing_status.value if invoice.processing_status and hasattr(invoice.processing_status, 'value') else invoice.processing_status,
            "source": invoice.source.value if hasattr(invoice.source, 'value') else invoice.source,
            "file_name": invoice.file_name,
            "file_path": invoice.file_path,
            "file_url": invoice.file_url,
            "file_size": invoice.file_size,
            "ocr_confidence_score": invoice.ocr_confidence_score,
            "is_verified": invoice.is_verified,
            "verified_at": invoice.verified_at,
            "tags": invoice.tags or [],
            "category": invoice.category,
            "notes": getattr(invoice, 'notes', None),
            "remarks": invoice.remarks,
            "extracted_data": sanitized_extracted_data,
            "source_metadata": invoice.source_metadata or {},
            "created_at": invoice.created_at,
            "updated_at": invoice.updated_at
        }

        return InvoiceDetail(**invoice_data)

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


class InvoiceUpdateRequest(BaseModel):
    """发票更新请求"""
    invoice_number: Optional[str] = None
    invoice_code: Optional[str] = None
    invoice_type: Optional[str] = None
    invoice_date: Optional[date] = None
    seller_name: Optional[str] = None
    seller_tax_number: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_tax_number: Optional[str] = None
    amount: Optional[float] = None
    amount_without_tax: Optional[float] = None
    tax_amount: Optional[float] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    remarks: Optional[str] = None


@router.put("/{invoice_id}", response_model=InvoiceDetail)
async def update_invoice(
    invoice_id: UUID = Path(..., description="发票ID"),
    invoice_update: InvoiceUpdateRequest = ...,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    更新发票信息
    支持部分更新，只更新提供的字段
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

        # 更新提供的字段
        update_data = invoice_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(invoice, field):
                setattr(invoice, field, value)

        await db.commit()
        await db.refresh(invoice)

        return InvoiceDetail.from_orm(invoice)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新发票失败: {e}")
        raise HTTPException(status_code=500, detail="更新发票失败")


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


# ===== 导出相关端点 =====

class DownloadUrlResponse(BaseModel):
    """下载URL响应"""
    download_url: str
    expires_at: str
    invoice_id: str


class BatchDownloadRequest(BaseModel):
    """批量下载请求"""
    invoice_ids: List[str] = Field(...,
                                   description="发票ID列表",
                                   min_items=1,
                                   max_items=50)


class BatchDownloadUrlResponse(BaseModel):
    """批量下载URL响应"""
    urls: List[DownloadUrlResponse]
    batch_id: str


@router.get("/{invoice_id}/download", response_model=DownloadUrlResponse)
async def get_invoice_download_url(
    invoice_id: UUID = Path(..., description="发票ID"),
    expires_in: int = Query(3600, ge=300, le=86400, description="URL过期时间（秒）"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    storage_service: StorageService = Depends(get_storage_service)
):
    """
    获取单个发票的下载URL

    生成带有过期时间的签名URL，用于安全下载发票文件。
    """
    try:
        file_service = FileService()
        invoice_service = InvoiceService(db, file_service)

        # 验证发票存在且属于当前用户
        invoice = await invoice_service.get_invoice_by_id(
            invoice_id=invoice_id,
            user_id=current_user.id
        )

        if not invoice:
            raise HTTPException(status_code=404, detail="发票不存在")

        # 如果有file_url且是Supabase URL，直接返回
        if invoice.file_url and invoice.file_url.startswith('https://'):
            logger.info(f"返回现有的Supabase URL: {invoice.file_url[:100]}...")
            expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()
            return DownloadUrlResponse(
                download_url=invoice.file_url,
                expires_at=expires_at,
                invoice_id=str(invoice_id)
            )
        
        # 旧逻辑：处理本地文件
        if not invoice.file_path:
            raise HTTPException(status_code=404, detail="发票文件不存在")

        # 检查文件是否存在（使用增强的存储服务）
        file_exists = await storage_service.check_file_exists(
            current_user.id,
            invoice.file_path
        )

        if not file_exists:
            raise HTTPException(status_code=404, detail="发票文件不存在于云存储中")

        # 生成下载URL（使用增强的存储服务）
        url_info = await storage_service.generate_download_url(
            user_id=current_user.id,
            file_path=invoice.file_path,
            expires_in=expires_in
        )

        # 记录下载日志
        logger.info(
            f"用户 {current_user.id} 获取发票 {invoice_id} 下载链接, "
            f"过期时间: {url_info['expires_at']}"
        )

        return DownloadUrlResponse(
            download_url=url_info['download_url'],
            expires_at=url_info['expires_at'],
            invoice_id=str(invoice_id)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取下载URL失败: {e}")
        raise HTTPException(status_code=500, detail="获取下载URL失败")


@router.post("/batch-download", response_model=BatchDownloadUrlResponse)
async def get_batch_download_urls(
    request: BatchDownloadRequest,
    expires_in: int = Query(3600, ge=300, le=86400, description="URL过期时间（秒）"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    storage_service: StorageService = Depends(get_storage_service)
):
    """
    获取批量发票的下载URL

    为多个发票生成下载URL，支持并发处理。
    """
    try:
        file_service = FileService()
        invoice_service = InvoiceService(db, file_service)

        # 转换字符串ID为UUID
        invoice_uuids = []
        for invoice_id_str in request.invoice_ids:
            try:
                invoice_uuids.append(UUID(invoice_id_str))
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"无效的发票ID格式: {invoice_id_str}"
                )

        # 批量获取所有发票信息
        
        invoice_query = select(Invoice).where(
            and_(
                Invoice.id.in_(invoice_uuids),
                Invoice.user_id == current_user.id,
                Invoice.deleted_at.is_(None)
            )
        )
        result = await db.execute(invoice_query)
        invoices = result.scalars().all()

        # 过滤出有文件路径的发票
        invoices = [invoice for invoice in invoices if invoice.file_path]

        if not invoices:
            raise HTTPException(status_code=404, detail="没有找到有效的发票文件")

        # 准备批量下载请求
        file_requests = []
        for invoice in invoices:
            file_requests.append({
                'user_id': str(current_user.id),
                'file_path': invoice.file_path,
                'invoice_id': str(invoice.id)
            })

        # 批量生成下载URL（使用增强的存储服务）
        urls = await storage_service.batch_generate_download_urls(
            file_requests,
            expires_in
        )

        if not urls:
            raise HTTPException(status_code=500, detail="无法生成任何下载链接")

        # 生成批次ID
        import uuid
        batch_id = str(uuid.uuid4())

        # 记录批量下载日志
        logger.info(
            f"用户 {current_user.id} 批量获取 {len(urls)} 个发票下载链接, "
            f"批次ID: {batch_id}"
        )

        return BatchDownloadUrlResponse(
            urls=[
                DownloadUrlResponse(
                    download_url=url['download_url'],
                    expires_at=url['expires_at'],
                    invoice_id=url['invoice_id']
                )
                for url in urls
            ],
            batch_id=batch_id
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"批量获取下载URL失败: {e}")
        raise HTTPException(status_code=500, detail="批量获取下载URL失败")
