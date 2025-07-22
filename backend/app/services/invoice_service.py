"""
发票业务逻辑服务模块

集中处理发票相关的复杂业务逻辑，与API层解耦。
"""

import hashlib
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, timezone, date
from pathlib import Path
import json
import logging

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError

from app.models.invoice import Invoice, InvoiceStatus, ProcessingStatus, InvoiceSource
from app.models.profile import Profile
from app.core.exceptions import BusinessLogicError, ValidationError
from app.services.file_service import FileService
from app.utils.dict_utils import deep_merge
from app.utils.query_optimizer import QueryOptimizer
from app.core.config import settings
from app.utils.json_serializer import serialize_for_json
from app.utils.query_monitor import monitor_query_performance

logger = logging.getLogger(__name__)


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
        
        # 准备源元数据
        source_metadata = {
            "original_filename": original_filename,
            **(metadata or {})
        }
        
        # 创建发票记录
        from datetime import date
        invoice_data = {
            "user_id": user_id,
            "invoice_number": invoice_number,
            "invoice_date": date.today(),  # 使用今天作为默认日期，OCR后会更新
            "file_path": file_path,
            "file_hash": file_hash,
            "file_size": file_size,
            "source": InvoiceSource.UPLOAD,
            "status": InvoiceStatus.PENDING if auto_extract else InvoiceStatus.MANUAL,
            "source_metadata": source_metadata
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
    
    async def create_or_update_from_file(
        self,
        file: UploadFile,
        user_id: UUID,
        original_filename: str
    ) -> Tuple[Invoice, bool]:
        """
        从上传文件创建或更新发票（包含OCR处理）
        
        Args:
            file: 上传的文件
            user_id: 用户ID
            original_filename: 原始文件名
            
        Returns:
            Tuple[Invoice, bool]: (发票实例, 是否为新创建)
            
        Raises:
            BusinessLogicError: 业务逻辑错误
            ValidationError: 验证错误
        """
        # 1. 保存文件
        temp_file_path, file_hash, file_size, _ = await self.file_service.save_uploaded_file(
            file, user_id
        )
        
        # 2. 使用OCR服务
        from app.services.ocr import OCRService, OCRConfig
        
        # 构造完整文件路径
        full_file_path = Path(settings.upload_dir) / temp_file_path
        
        # 创建OCR配置和服务实例
        ocr_config = OCRConfig()
        ocr_service = OCRService(ocr_config)
        
        # 调用OCR提取
        ocr_result = await ocr_service.extract_invoice_data(str(full_file_path))
        
        # 3. 处理OCR结果
        structured_data = ocr_result.get('structured_data')
        raw_data = ocr_result.get('raw_data', {})
        
        # 4. 构建发票数据
        if structured_data:
            invoice_data = self._build_invoice_from_structured_data(
                structured_data, 
                temp_file_path, 
                file_hash, 
                file_size,
                user_id,
                original_filename
            )
        else:
            invoice_data = self._build_invoice_from_raw_data(
                raw_data,
                temp_file_path,
                file_hash,
                file_size,
                user_id,
                original_filename
            )
        
        # 5. 保存或更新发票
        try:
            invoice = Invoice(**invoice_data)
            self.db.add(invoice)
            await self.db.commit()
            await self.db.refresh(invoice)
            return invoice, True
        except IntegrityError as e:
            await self.db.rollback()
            
            # 处理重复发票
            if "duplicate key value violates unique constraint" in str(e) and "uk_invoice_number_user" in str(e):
                invoice_number = (
                    structured_data.main_info.invoice_number if structured_data 
                    else raw_data.get('invoice_number', f"UPLOAD_{file_hash[:8]}")
                )
                
                # 查找并更新已存在的发票
                existing_invoice = await self._find_invoice_by_number(invoice_number, user_id)
                if existing_invoice:
                    await self._update_invoice_data(existing_invoice, invoice_data)
                    await self.db.commit()
                    await self.db.refresh(existing_invoice)
                    return existing_invoice, False
            
            raise BusinessLogicError(f"数据库保存失败: {str(e)}")
    
    def _build_invoice_from_structured_data(
        self,
        structured_data,
        file_path: str,
        file_hash: str,
        file_size: int,
        user_id: UUID,
        original_filename: str
    ) -> Dict[str, Any]:
        """从结构化数据构建发票字典"""
        return {
            "user_id": user_id,
            "invoice_number": structured_data.main_info.invoice_number or f"UPLOAD_{file_hash[:8]}",
            "invoice_code": structured_data.main_info.invoice_code,
            "invoice_type": structured_data.main_info.invoice_type or '增值税普通发票',
            "invoice_date": structured_data.main_info.invoice_date,
            "amount_without_tax": float(structured_data.summary.amount) if structured_data.summary.amount else 0,
            "tax_amount": float(structured_data.summary.tax_amount) if structured_data.summary.tax_amount else 0,
            "total_amount": float(structured_data.summary.total_amount) if structured_data.summary.total_amount else 0,
            "currency": 'CNY',
            "seller_name": structured_data.seller_info.name,
            "seller_tax_number": structured_data.seller_info.tax_id,
            "buyer_name": structured_data.buyer_info.name,
            "buyer_tax_number": structured_data.buyer_info.tax_id,
            "file_path": file_path,
            "file_url": self.file_service.get_file_url(file_path),
            "file_size": file_size,
            "file_hash": file_hash,
            "source": InvoiceSource.UPLOAD,
            "status": InvoiceStatus.COMPLETED,
            "processing_status": ProcessingStatus.OCR_COMPLETED,
            "extracted_data": {
                **json.loads(structured_data.json()),
                **serialize_for_json(structured_data.dict())
            },
            "source_metadata": {"original_filename": original_filename},
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    
    def _build_invoice_from_raw_data(
        self,
        raw_data: Dict[str, Any],
        file_path: str,
        file_hash: str,
        file_size: int,
        user_id: UUID,
        original_filename: str
    ) -> Dict[str, Any]:
        """从原始数据构建发票字典"""
        return {
            "user_id": user_id,
            "invoice_number": raw_data.get('invoice_number', f"UPLOAD_{file_hash[:8]}"),
            "invoice_code": raw_data.get('invoice_code'),
            "invoice_type": raw_data.get('invoice_type', '增值税普通发票'),
            "invoice_date": self._parse_date(raw_data.get('invoice_date')),
            "amount_without_tax": self._parse_amount(raw_data.get('amount_without_tax', 0)),
            "tax_amount": self._parse_amount(raw_data.get('tax_amount', 0)),
            "total_amount": self._parse_amount(raw_data.get('total_amount', 0)),
            "currency": 'CNY',
            "seller_name": raw_data.get('seller_name'),
            "seller_tax_number": raw_data.get('seller_tax_number'),
            "buyer_name": raw_data.get('buyer_name'),
            "buyer_tax_number": raw_data.get('buyer_tax_number'),
            "file_path": file_path,
            "file_url": self.file_service.get_file_url(file_path),
            "file_size": file_size,
            "file_hash": file_hash,
            "source": InvoiceSource.UPLOAD,
            "status": InvoiceStatus.COMPLETED,
            "processing_status": ProcessingStatus.OCR_COMPLETED,
            "extracted_data": raw_data,
            "source_metadata": {"original_filename": original_filename},
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    
    async def _find_invoice_by_number(self, invoice_number: str, user_id: UUID) -> Optional[Invoice]:
        """根据发票号码查找发票"""
        stmt = select(Invoice).where(
            Invoice.invoice_number == invoice_number,
            Invoice.user_id == user_id
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def _update_invoice_data(self, invoice: Invoice, new_data: Dict[str, Any]) -> None:
        """更新发票数据"""
        # 更新所有字段
        for key, value in new_data.items():
            if hasattr(invoice, key) and key not in ['id', 'created_at']:
                setattr(invoice, key, value)
        
        invoice.updated_at = datetime.now(timezone.utc)
    
    async def create_invoice_from_processed_data(
        self,
        processed_data: Dict[str, Any],
        file_info: Dict[str, Any],
        user_id: UUID,
        source: InvoiceSource = InvoiceSource.UPLOAD,
        source_metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[Invoice, bool]:
        """
        从处理后的数据创建或更新发票（统一处理流程）
        
        Args:
            processed_data: 处理后的发票数据（包含extracted_data）
            file_info: 文件信息
            user_id: 用户ID
            source: 发票来源
            source_metadata: 来源元数据
            
        Returns:
            Tuple[Invoice, bool]: (发票实例, 是否为新创建)
        """
        # 构建发票数据，使用标准化路径
        invoice_data = self._build_extracted_data_with_standard_paths(
            processed_data,
            file_info,
            user_id,
            source,
            source_metadata
        )
        
        # 检查是否存在重复发票
        invoice_number = invoice_data.get('invoice_number')
        if invoice_number:
            existing_invoice = await self._find_invoice_by_number(invoice_number, user_id)
            if existing_invoice:
                # 更新现有发票
                await self._update_invoice_data(existing_invoice, invoice_data)
                await self.db.commit()
                await self.db.refresh(existing_invoice)
                return existing_invoice, False
        
        # 创建新发票
        try:
            invoice = Invoice(**invoice_data)
            self.db.add(invoice)
            await self.db.commit()
            await self.db.refresh(invoice)
            
            # 更新用户统计
            await self._update_user_invoice_stats(user_id)
            
            return invoice, True
            
        except IntegrityError as e:
            await self.db.rollback()
            raise BusinessLogicError(f"数据库保存失败: {str(e)}")
    
    def _build_extracted_data_with_standard_paths(
        self,
        processed_data: Dict[str, Any],
        file_info: Dict[str, Any],
        user_id: UUID,
        source: InvoiceSource,
        source_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        构建包含标准化路径的发票数据
        确保商品明细在多个路径下可用，兼容前端配置
        """
        # 获取extracted_data（如果已存在）
        extracted_data = processed_data.get('extracted_data', {})
        
        # 确保商品明细在所有标准路径下可用
        items = (
            processed_data.get('items') or
            processed_data.get('invoice_items') or
            processed_data.get('invoice_details') or
            processed_data.get('invoiceDetails') or
            extracted_data.get('items') or
            extracted_data.get('invoice_details') or
            []
        )
        
        # 更新extracted_data，确保多路径访问
        if items:
            extracted_data['items'] = items
            extracted_data['invoice_items'] = items
            extracted_data['invoice_details'] = items
            extracted_data['invoiceDetails'] = items
            extracted_data['commodities'] = items
        
        # 合并所有数据
        extracted_data.update({
            'invoice_type': processed_data.get('invoice_type'),
            'source': source.value,
            'source_metadata': source_metadata,
            'processing_time': datetime.utcnow().isoformat(),
            'file_info': file_info
        })
        
        # 构建发票记录数据
        return {
            "user_id": user_id,
            "invoice_number": processed_data.get('invoice_number', f"UPLOAD_{file_info['file_hash'][:8]}"),
            "invoice_code": processed_data.get('invoice_code'),
            "invoice_type": processed_data.get('invoice_type', '增值税普通发票'),
            "invoice_date": self._parse_date(processed_data.get('invoice_date')),
            "amount_without_tax": self._parse_amount(processed_data.get('amount_without_tax', 0)),
            "tax_amount": self._parse_amount(processed_data.get('tax_amount', 0)),
            "total_amount": self._parse_amount(processed_data.get('total_amount', 0)),
            "currency": processed_data.get('currency', 'CNY'),
            "seller_name": processed_data.get('seller_name'),
            "seller_tax_number": processed_data.get('seller_tax_id') or processed_data.get('seller_tax_number'),
            "buyer_name": processed_data.get('buyer_name'),
            "buyer_tax_number": processed_data.get('buyer_tax_id') or processed_data.get('buyer_tax_number'),
            "file_path": file_info['file_path'],
            "file_url": self.file_service.get_file_url(file_info['file_path']),
            "file_size": file_info['file_size'],
            "file_hash": file_info['file_hash'],
            "source": source,
            "status": InvoiceStatus.COMPLETED,
            "processing_status": ProcessingStatus.OCR_COMPLETED,
            "extracted_data": extracted_data,
            "source_metadata": source_metadata,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }

    async def create_invoice_from_ocr_data(
        self,
        ocr_data: Dict[str, Any],
        file_info: Dict[str, Any],
        user_id: UUID,
        source: InvoiceSource = InvoiceSource.UPLOAD,
        email_task_id: Optional[UUID] = None,
        source_metadata: Optional[Dict[str, Any]] = None
    ) -> Invoice:
        """
        从OCR解析的数据创建发票记录
        
        这个方法使用OCR提取的真实数据，避免临时/默认值的使用
        
        Args:
            ocr_data: OCR解析的发票数据
            file_info: 文件信息 (file_path, file_hash, file_size等)
            user_id: 用户ID
            source: 发票来源
            email_task_id: 关联的邮件任务ID
            source_metadata: 来源元数据
            
        Returns:
            Invoice: 创建的发票实例
            
        Raises:
            BusinessLogicError: 业务逻辑错误
            ValidationError: 数据验证错误
        """
        
        # 验证OCR数据完整性
        if not ocr_data.get('invoice_number'):
            raise ValidationError("OCR数据中缺少发票号码")
        if not ocr_data.get('invoice_date'):
            raise ValidationError("OCR数据中缺少发票日期")
            
        # 检查重复发票
        await self._check_duplicate_invoice(ocr_data['invoice_number'], user_id)
        
        # 准备完整的源元数据
        complete_source_metadata = {
            **(source_metadata or {}),
            "ocr_confidence": ocr_data.get('confidence', 0.0),
            "ocr_processing_time": ocr_data.get('processing_time'),
            "original_filename": file_info.get('original_filename')
        }
        
        # 从OCR数据构建发票记录
        # 处理金额字段映射：优先使用具体字段，如果不存在则尝试其他字段名
        amount_without_tax = (
            ocr_data.get('amount_without_tax') or 
            ocr_data.get('invoice_amount_pre_tax') or 
            ocr_data.get('amount') or 
            0
        )
        tax_amount = (
            ocr_data.get('tax_amount') or 
            ocr_data.get('invoice_tax') or 
            0
        )
        
        invoice_data = {
            "user_id": user_id,
            "email_task_id": email_task_id,
            "invoice_number": ocr_data['invoice_number'],
            "invoice_code": ocr_data.get('invoice_code'),
            "invoice_type": ocr_data.get('invoice_type'),
            "invoice_date": self._parse_date(ocr_data['invoice_date']),
            "amount_without_tax": self._parse_amount(amount_without_tax),
            "tax_amount": self._parse_amount(tax_amount),
            "total_amount": self._parse_amount(ocr_data.get('total_amount', 0)),
            "currency": ocr_data.get('currency', 'CNY'),
            "seller_name": ocr_data.get('seller_name'),
            "seller_tax_number": ocr_data.get('seller_tax_id') or ocr_data.get('seller_tax_number'),
            "buyer_name": ocr_data.get('buyer_name'),
            "buyer_tax_number": ocr_data.get('buyer_tax_id') or ocr_data.get('buyer_tax_number'),
            "file_path": file_info['file_path'],
            "file_hash": file_info['file_hash'],
            "file_size": file_info['file_size'],
            "source": source,
            "source_metadata": complete_source_metadata,
            "extracted_data": ocr_data,  # 保存完整的OCR原始数据
            "status": InvoiceStatus.COMPLETED,  # OCR成功即为完成状态
            "processing_status": ProcessingStatus.OCR_COMPLETED  # OCR已完成
        }
        
        # 创建发票记录
        invoice = Invoice(**invoice_data)
        self.db.add(invoice)
        await self.db.flush()  # 获取ID
        
        await self.db.commit()
        await self.db.refresh(invoice)
        
        # 更新用户档案统计
        await self._update_user_invoice_stats(user_id)
        
        return invoice
    
    def _parse_date(self, date_str: str) -> date:
        """解析日期字符串"""
        from datetime import datetime
        import logging
        
        logger = logging.getLogger(__name__)
        
        if not date_str:
            logger.warning("Empty date string provided, using today's date")
            from datetime import date
            return date.today()
            
        try:
            # 尝试解析 YYYY-MM-DD 格式
            return datetime.strptime(str(date_str).strip(), '%Y-%m-%d').date()
        except ValueError:
            try:
                # 尝试解析 YYYY/MM/DD 格式
                return datetime.strptime(str(date_str).strip(), '%Y/%m/%d').date()
            except ValueError:
                # 记录解析失败并使用今天日期作为最后的fallback
                logger.error(f"Failed to parse date string: '{date_str}', using today's date as fallback")
                from datetime import date
                return date.today()
    
    def _parse_amount(self, amount) -> float:
        """解析金额"""
        import logging
        
        logger = logging.getLogger(__name__)
        
        if amount is None:
            logger.warning("None amount provided, returning 0.0")
            return 0.0
            
        if isinstance(amount, (int, float)):
            return float(amount)
            
        if isinstance(amount, str):
            # 移除货币符号和空格
            cleaned = amount.replace('¥', '').replace(',', '').strip()
            if not cleaned:
                logger.warning("Empty amount string after cleaning, returning 0.0")
                return 0.0
            try:
                parsed_amount = float(cleaned)
                if parsed_amount < 0:
                    logger.warning(f"Negative amount parsed: {parsed_amount}, returning 0.0")
                    return 0.0
                return parsed_amount
            except ValueError:
                logger.error(f"Failed to parse amount string: '{amount}' (cleaned: '{cleaned}'), returning 0.0")
                return 0.0
        
        logger.warning(f"Unsupported amount type: {type(amount)}, returning 0.0")
        return 0.0
    
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
    
    @monitor_query_performance("invoice_search", params={"limit": 20, "search_type": "complex"})
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
                    Invoice.invoice_code.ilike(search_pattern),
                    Invoice.invoice_type.ilike(search_pattern),
                    Invoice.buyer_name.ilike(search_pattern),
                    Invoice.seller_tax_number.ilike(search_pattern),
                    Invoice.buyer_tax_number.ilike(search_pattern),
                    Invoice.remarks.ilike(search_pattern),
                    Invoice.notes.ilike(search_pattern),
                    Invoice.file_path.ilike(search_pattern),
                    Invoice.source_metadata['original_filename'].astext.ilike(search_pattern),
                    # 搜索 extracted_data 中的所有文本内容
                    text(f"extracted_data::text ILIKE :pattern").bindparams(pattern=search_pattern)
                )
            )
        
        if seller_name:
            base_query = base_query.where(Invoice.seller_name.ilike(f"%{seller_name}%"))
        
        if invoice_number:
            base_query = base_query.where(Invoice.invoice_number.ilike(f"%{invoice_number}%"))
        
        if date_from:
            # 优先使用 consumption_date，如果为空则使用 invoice_date
            base_query = base_query.where(
                func.coalesce(Invoice.consumption_date, Invoice.invoice_date) >= date_from
            )
        
        if date_to:
            # 优先使用 consumption_date，如果为空则使用 invoice_date
            base_query = base_query.where(
                func.coalesce(Invoice.consumption_date, Invoice.invoice_date) <= date_to
            )
        
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
    
    @monitor_query_performance("invoice_by_id", params={"query_type": "single_record"})
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
    
    @monitor_query_performance("invoice_by_file_path", params={"query_type": "file_lookup"})
    async def get_invoice_by_file_path(self, file_path: str, user_id: UUID) -> Optional[Invoice]:
        """根据文件路径获取发票"""
        query = select(Invoice).where(
            Invoice.file_path == file_path,
            Invoice.user_id == user_id,
            Invoice.deleted_at.is_(None)
        )
        
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
    
    @monitor_query_performance("invoice_statistics", params={"query_type": "aggregation"})
    async def get_invoice_statistics(self, user_id: UUID) -> Dict[str, Any]:
        """获取发票统计信息 - 优化版本，合并查询减少数据库往返"""
        
        # 基础条件
        base_conditions = and_(
            Invoice.user_id == user_id,
            Invoice.deleted_at.is_(None)
        )
        
        # 使用单个查询获取所有统计信息
        # 这避免了多次数据库往返
        combined_query = select(
            func.count(Invoice.id).label('total_count'),
            func.coalesce(func.sum(Invoice.total_amount), 0).label('total_amount'),
            func.coalesce(func.avg(Invoice.total_amount), 0).label('avg_amount'),
            func.coalesce(func.max(Invoice.total_amount), 0).label('max_amount'),
            func.coalesce(func.min(Invoice.total_amount), 0).label('min_amount')
        ).where(base_conditions)
        
        combined_result = await self.db.execute(combined_query)
        stats = combined_result.first()
        
        # 如果没有发票，直接返回空统计
        if not stats or stats.total_count == 0:
            return {
                "total_count": 0,
                "amount_stats": {
                    "total": 0.0,
                    "average": 0.0,
                    "max": 0.0,
                    "min": 0.0
                },
                "status_distribution": {},
                "source_distribution": {}
            }
        
        # 状态和来源统计 - 使用单个查询
        distribution_query = select(
            Invoice.status,
            Invoice.source,
            func.count(Invoice.id).label('count')
        ).where(base_conditions).group_by(
            Invoice.status,
            Invoice.source
        )
        
        distribution_result = await self.db.execute(distribution_query)
        distributions = distribution_result.all()
        
        # 处理分布数据
        status_stats = {}
        source_stats = {}
        
        for row in distributions:
            if row.status:
                status_stats[row.status] = status_stats.get(row.status, 0) + row.count
            if row.source:
                source_stats[row.source] = source_stats.get(row.source, 0) + row.count
        
        return {
            "total_count": stats.total_count,
            "amount_stats": {
                "total": float(stats.total_amount),
                "average": float(stats.avg_amount),
                "max": float(stats.max_amount),
                "min": float(stats.min_amount) if stats.total_count > 0 else 0.0
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
        # 统计用户发票数量 - 避免subquery
        count_query = select(func.count(Invoice.id)).where(
            Invoice.user_id == user_id,
            Invoice.deleted_at.is_(None)
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


# 用于API端点的简化依赖注入
from fastapi import Depends
from app.core.dependencies import get_db_session
from app.services.file_service import get_file_service

async def get_invoice_service_from_request(
    db: AsyncSession = Depends(get_db_session),
    file_service: FileService = Depends(get_file_service)
) -> InvoiceService:
    """从请求中获取发票服务实例"""
    return InvoiceService(db, file_service)