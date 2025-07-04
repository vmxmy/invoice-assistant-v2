"""
发票业务逻辑服务模块

集中处理发票相关的复杂业务逻辑，与API层解耦。
"""

import hashlib
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, timezone, date
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.models.invoice import Invoice, InvoiceStatus, InvoiceSource
from app.models.profile import Profile
from app.core.exceptions import BusinessLogicError, ValidationError
from app.services.file_service import FileService
from app.utils.dict_utils import deep_merge
from app.utils.query_optimizer import QueryOptimizer
from app.core.config import settings


class InvoiceService:
    """发票业务逻辑服务类"""
    
    def __init__(self, db_session: AsyncSession, file_service: FileService):
        self.db = db_session
        self.file_service = file_service
    
    async def create_invoice_from_file(
        self,
        file: UploadFile,
        user_id: UUID,
        auto_extract: bool = True,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Invoice:
        """
        从上传文件创建发票记录
        
        Args:
            file: 上传的文件
            user_id: 用户ID
            auto_extract: 是否自动提取发票信息
            metadata: 额外的元数据
            
        Returns:
            Invoice: 创建的发票实例
            
        Raises:
            BusinessLogicError: 业务逻辑错误
            ValidationError: 验证错误
        """
        
        # 保存文件
        file_path, file_hash, file_size, original_filename = await self.file_service.save_uploaded_file(
            file, user_id
        )
        
        # 生成发票号码
        invoice_number = await self._generate_invoice_number(file_hash, user_id)
        
        # 检查重复
        await self._check_duplicate_invoice(invoice_number, user_id)
        
        # 创建发票记录
        invoice_data = {
            "user_id": user_id,
            "invoice_number": invoice_number,
            "file_path": file_path,
            "file_hash": file_hash,
            "file_size": file_size,
            "original_filename": original_filename,
            "source": InvoiceSource.UPLOAD,
            "status": InvoiceStatus.PENDING if auto_extract else InvoiceStatus.MANUAL,
            "metadata": metadata or {}
        }
        
        invoice = Invoice(**invoice_data)
        self.db.add(invoice)
        await self.db.flush()  # 获取ID但不提交
        
        # 如果需要自动提取，标记为待处理
        if auto_extract:
            invoice.status = InvoiceStatus.PENDING
            # 这里可以触发异步OCR任务
            # await self._trigger_ocr_extraction(invoice.id)
        
        await self.db.commit()
        await self.db.refresh(invoice)
        
        # 更新用户档案统计
        await self._update_user_invoice_stats(user_id)
        
        return invoice
    
    async def update_invoice_extracted_data(
        self,
        invoice_id: UUID,
        extracted_data: Dict[str, Any],
        confidence_score: Optional[float] = None
    ) -> Invoice:
        """
        更新发票提取的数据
        
        Args:
            invoice_id: 发票ID
            extracted_data: 提取的数据
            confidence_score: 置信度分数
            
        Returns:
            Invoice: 更新后的发票实例
        """
        
        # 获取发票
        invoice = await self.get_invoice_by_id(invoice_id)
        if not invoice:
            raise BusinessLogicError("发票不存在")
        
        # 验证提取的数据
        validated_data = await self._validate_extracted_data(extracted_data)
        
        # 更新发票信息
        for field, value in validated_data.items():
            if hasattr(invoice, field):
                setattr(invoice, field, value)
        
        # 更新元数据
        extraction_metadata = {
            "extraction": {
                "confidence_score": confidence_score,
                "extracted_at": datetime.now(timezone.utc).isoformat(),
                "extraction_method": "ocr"
            }
        }
        
        invoice.metadata = deep_merge(invoice.metadata or {}, extraction_metadata)
        
        # 根据置信度设置状态
        if confidence_score and confidence_score > 0.8:
            invoice.status = InvoiceStatus.COMPLETED
        elif confidence_score and confidence_score > 0.5:
            invoice.status = InvoiceStatus.REVIEW_REQUIRED
        else:
            invoice.status = InvoiceStatus.FAILED
        
        await self.db.commit()
        await self.db.refresh(invoice)
        
        return invoice
    
    async def search_invoices(
        self,
        user_id: UUID,
        query: Optional[str] = None,
        seller_name: Optional[str] = None,
        invoice_number: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        amount_min: Optional[float] = None,
        amount_max: Optional[float] = None,
        status: Optional[InvoiceStatus] = None,
        source: Optional[InvoiceSource] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Tuple[List[Invoice], int]:
        """
        搜索发票
        
        Returns:
            Tuple[List[Invoice], int]: (发票列表, 总数)
        """
        
        # 构建基础查询
        base_query = select(Invoice).where(
            Invoice.user_id == user_id,
            Invoice.deleted_at.is_(None)
        )
        
        # 添加搜索条件
        if query:
            search_pattern = f"%{query}%"
            base_query = base_query.where(
                or_(
                    Invoice.seller_name.ilike(search_pattern),
                    Invoice.invoice_number.ilike(search_pattern),
                    Invoice.project_name.ilike(search_pattern),
                    Invoice.original_filename.ilike(search_pattern)
                )
            )
        
        if seller_name:
            base_query = base_query.where(Invoice.seller_name.ilike(f"%{seller_name}%"))
        
        if invoice_number:
            base_query = base_query.where(Invoice.invoice_number.ilike(f"%{invoice_number}%"))
        
        if date_from:
            base_query = base_query.where(Invoice.invoice_date >= date_from)
        
        if date_to:
            base_query = base_query.where(Invoice.invoice_date <= date_to)
        
        if amount_min is not None:
            base_query = base_query.where(Invoice.total_amount >= amount_min)
        
        if amount_max is not None:
            base_query = base_query.where(Invoice.total_amount <= amount_max)
        
        if status:
            base_query = base_query.where(Invoice.status == status)
        
        if source:
            base_query = base_query.where(Invoice.source == source)
        
        # 使用优化的分页查询
        invoices, total = await QueryOptimizer.paginate_with_window_function(
            session=self.db,
            base_query=base_query,
            model_class=Invoice,
            limit=limit,
            offset=offset,
            order_by=Invoice.created_at.desc()
        )
        
        return invoices, total
    
    async def get_invoice_by_id(self, invoice_id: UUID, user_id: Optional[UUID] = None) -> Optional[Invoice]:
        """获取发票详情"""
        query = select(Invoice).where(
            Invoice.id == invoice_id,
            Invoice.deleted_at.is_(None)
        )
        
        if user_id:
            query = query.where(Invoice.user_id == user_id)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def delete_invoice(self, invoice_id: UUID, user_id: UUID) -> bool:
        """软删除发票"""
        invoice = await self.get_invoice_by_id(invoice_id, user_id)
        if not invoice:
            return False
        
        # 软删除
        invoice.soft_delete()
        
        # 删除文件
        if invoice.file_path:
            await self.file_service.delete_file(invoice.file_path)
        
        await self.db.commit()
        
        # 更新用户统计
        await self._update_user_invoice_stats(user_id)
        
        return True
    
    async def get_invoice_statistics(self, user_id: UUID) -> Dict[str, Any]:
        """获取发票统计信息"""
        
        # 基础统计查询
        base_query = select(Invoice).where(
            Invoice.user_id == user_id,
            Invoice.deleted_at.is_(None)
        )
        
        # 总数统计
        total_count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.db.execute(total_count_query)
        total_count = total_result.scalar()
        
        # 金额统计
        amount_query = select(
            func.sum(Invoice.total_amount),
            func.avg(Invoice.total_amount),
            func.max(Invoice.total_amount),
            func.min(Invoice.total_amount)
        ).select_from(base_query.subquery())
        amount_result = await self.db.execute(amount_query)
        amount_stats = amount_result.first()
        
        # 状态统计
        status_query = select(
            Invoice.status,
            func.count(Invoice.id)
        ).select_from(base_query.subquery()).group_by(Invoice.status)
        status_result = await self.db.execute(status_query)
        status_stats = {status: count for status, count in status_result.all()}
        
        # 来源统计
        source_query = select(
            Invoice.source,
            func.count(Invoice.id)
        ).select_from(base_query.subquery()).group_by(Invoice.source)
        source_result = await self.db.execute(source_query)
        source_stats = {source: count for source, count in source_result.all()}
        
        return {
            "total_count": total_count,
            "amount_stats": {
                "total": float(amount_stats[0] or 0),
                "average": float(amount_stats[1] or 0),
                "max": float(amount_stats[2] or 0),
                "min": float(amount_stats[3] or 0)
            },
            "status_distribution": status_stats,
            "source_distribution": source_stats
        }
    
    # 私有辅助方法
    
    async def _generate_invoice_number(self, file_hash: str, user_id: UUID) -> str:
        """生成发票号码"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        hash_prefix = file_hash[:8]
        user_prefix = str(user_id).replace('-', '')[:6]
        
        return f"INV_{timestamp}_{user_prefix}_{hash_prefix}"
    
    async def _check_duplicate_invoice(self, invoice_number: str, user_id: UUID) -> None:
        """检查重复发票"""
        existing_query = select(Invoice).where(
            Invoice.user_id == user_id,
            Invoice.invoice_number == invoice_number,
            Invoice.deleted_at.is_(None)
        )
        result = await self.db.execute(existing_query)
        existing_invoice = result.scalar_one_or_none()
        
        if existing_invoice:
            raise BusinessLogicError(f"发票号码已存在: {invoice_number}")
    
    async def _validate_extracted_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """验证提取的数据"""
        validated = {}
        
        # 验证发票日期
        if "invoice_date" in data:
            try:
                if isinstance(data["invoice_date"], str):
                    validated["invoice_date"] = datetime.fromisoformat(data["invoice_date"]).date()
                elif isinstance(data["invoice_date"], date):
                    validated["invoice_date"] = data["invoice_date"]
            except (ValueError, TypeError):
                pass  # 忽略无效日期
        
        # 验证金额
        if "total_amount" in data:
            try:
                amount = float(data["total_amount"])
                if amount >= 0:
                    validated["total_amount"] = amount
            except (ValueError, TypeError):
                pass
        
        # 验证文本字段
        text_fields = ["seller_name", "buyer_name", "project_name", "tax_rate"]
        for field in text_fields:
            if field in data and isinstance(data[field], str):
                cleaned_value = data[field].strip()
                if cleaned_value:
                    validated[field] = cleaned_value
        
        return validated
    
    async def _update_user_invoice_stats(self, user_id: UUID) -> None:
        """更新用户发票统计"""
        # 统计用户发票数量
        count_query = select(func.count()).select_from(
            select(Invoice).where(
                Invoice.user_id == user_id,
                Invoice.deleted_at.is_(None)
            ).subquery()
        )
        count_result = await self.db.execute(count_query)
        total_invoices = count_result.scalar()
        
        # 获取最新发票日期
        latest_query = select(func.max(Invoice.invoice_date)).where(
            Invoice.user_id == user_id,
            Invoice.deleted_at.is_(None)
        )
        latest_result = await self.db.execute(latest_query)
        last_invoice_date = latest_result.scalar()
        
        # 更新用户档案
        profile_query = select(Profile).where(Profile.auth_user_id == user_id)
        profile_result = await self.db.execute(profile_query)
        profile = profile_result.scalar_one_or_none()
        
        if profile:
            profile.total_invoices = total_invoices
            profile.last_invoice_date = last_invoice_date
            await self.db.commit()


# 依赖注入函数
def get_invoice_service(
    db: AsyncSession,
    file_service: FileService
) -> InvoiceService:
    """获取发票服务实例"""
    return InvoiceService(db, file_service)