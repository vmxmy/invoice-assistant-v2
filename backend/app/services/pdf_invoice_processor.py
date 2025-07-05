"""
PDF发票处理服务
整合OCR识别、数据提取和发票存储的完整流程
"""

import asyncio
from typing import Dict, Any, Optional, List
from uuid import UUID
from pathlib import Path
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice, InvoiceStatus, ProcessingStatus, InvoiceSource
from app.models.task import EmailProcessingTask
from app.services.ocr_service import OCRService
from app.services.invoice_service import InvoiceService
from app.services.file_service import FileService
from app.utils.logger import get_logger
from app.core.exceptions import BusinessLogicError, ValidationError

logger = get_logger(__name__)


class PDFInvoiceProcessor:
    """PDF发票处理器"""
    
    def __init__(
        self,
        db: AsyncSession,
        ocr_service: OCRService,
        invoice_service: InvoiceService,
        file_service: FileService
    ):
        self.db = db
        self.ocr_service = ocr_service
        self.invoice_service = invoice_service
        self.file_service = file_service
    
    async def process_pdf_invoice(
        self,
        file_path: str,
        user_id: UUID,
        source: InvoiceSource = InvoiceSource.EMAIL,
        email_task_id: Optional[UUID] = None,
        source_metadata: Optional[Dict[str, Any]] = None
    ) -> Invoice:
        """
        处理PDF发票的完整流程
        
        Args:
            file_path: PDF文件路径
            user_id: 用户ID
            source: 发票来源
            email_task_id: 关联的邮件任务ID
            source_metadata: 来源元数据
            
        Returns:
            Invoice: 处理后的发票对象
        """
        try:
            logger.info(f"开始处理PDF发票 - 文件: {file_path}, 用户: {user_id}")
            
            # 1. 验证文件并获取文件信息
            file_info = await self._validate_pdf_file(file_path)
            
            # 2. 执行OCR提取 (先OCR，避免创建无用的临时记录)
            logger.info(f"开始OCR提取 - 文件: {file_path}")
            extraction_result = await self._perform_ocr_extraction(file_path)
            
            # 3. 处理和验证OCR结果
            processed_data = await self._process_extraction_result(extraction_result)
            
            # 4. 使用OCR数据直接创建完整的发票记录
            logger.info(f"使用OCR数据创建发票记录 - 发票号: {processed_data.get('invoice_number', 'Unknown')}")
            invoice = await self.invoice_service.create_invoice_from_ocr_data(
                ocr_data=processed_data,
                file_info=file_info,
                user_id=user_id,
                source=source,
                email_task_id=email_task_id,
                source_metadata=source_metadata
            )
            
            logger.info(f"PDF发票处理完成 - 发票ID: {invoice.id}, 发票号: {invoice.invoice_number}")
            return invoice
            
        except Exception as e:
            logger.error(f"PDF发票处理失败 - 文件: {file_path}, 错误: {e}")
            
            # 确保错误信息包含足够的上下文
            error_context = {
                "file_path": file_path,
                "user_id": str(user_id),
                "source": source.value if source else None,
                "error_type": type(e).__name__
            }
            logger.error(f"错误上下文: {error_context}")
            
            # 重新抛出更详细的错误
            if isinstance(e, (ValidationError, BusinessLogicError)):
                raise  # 保持原有的业务异常
            else:
                raise BusinessLogicError(f"PDF发票处理失败: {str(e)}")
    
    async def _validate_pdf_file(self, file_path: str) -> Dict[str, Any]:
        """验证PDF文件并返回完整的文件信息（使用相对路径）"""
        # 构造完整路径进行验证，但保持相对路径用于存储
        from app.core.config import settings
        full_path = Path(settings.upload_dir) / file_path
        
        if not full_path.exists():
            raise BusinessLogicError(f"文件不存在: {file_path}")
        
        if full_path.suffix.lower() != '.pdf':
            raise BusinessLogicError(f"不支持的文件类型: {full_path.suffix}")
        
        file_size = full_path.stat().st_size
        if file_size > 50 * 1024 * 1024:  # 50MB限制
            raise BusinessLogicError(f"文件过大: {file_size / 1024 / 1024:.2f}MB")
        
        # 计算文件哈希
        file_hash = await self.file_service.calculate_file_hash(str(full_path))
        
        # 返回create_invoice_from_ocr_data方法需要的完整文件信息
        return {
            "file_path": file_path,  # 保持相对路径
            "file_size": file_size,
            "file_hash": file_hash,
            "original_filename": full_path.name,
            "mime_type": "application/pdf"
        }
    
    async def _create_initial_invoice(
        self,
        file_path: str,
        file_info: Dict[str, Any],
        user_id: UUID,
        source: InvoiceSource,
        email_task_id: Optional[UUID],
        source_metadata: Optional[Dict[str, Any]]
    ) -> Invoice:
        """创建初始发票记录"""
        
        # 生成临时发票号
        temp_invoice_number = f"TEMP_{file_info['file_hash'][:8]}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        invoice = Invoice(
            user_id=user_id,
            invoice_number=temp_invoice_number,
            invoice_date=datetime.now(timezone.utc).date(),  # 临时日期
            amount=0,  # 临时金额
            status=InvoiceStatus.PROCESSING,
            processing_status=ProcessingStatus.OCR_PROCESSING,
            source=source,
            email_task_id=email_task_id,
            file_path=file_path,
            file_size=file_info['file_size'],
            file_hash=file_info['file_hash'],
            source_metadata=source_metadata or {},
            extracted_data={}
        )
        
        self.db.add(invoice)
        await self.db.flush()
        
        logger.info(f"创建初始发票记录 - ID: {invoice.id}")
        return invoice
    
    async def _perform_ocr_extraction(self, file_path: str) -> Dict[str, Any]:
        """执行OCR提取"""
        logger.info(f"开始OCR提取 - 文件: {file_path}")
        
        try:
            # 构造完整路径用于OCR处理
            from app.core.config import settings
            full_path = Path(settings.upload_dir) / file_path
            
            result = await self.ocr_service.extract_invoice_data(str(full_path))
            
            # 添加提取元数据
            result['extraction_timestamp'] = datetime.now(timezone.utc).isoformat()
            result['extraction_method'] = 'mineru_api_v4'
            result['file_path'] = file_path  # 保持相对路径
            
            logger.info(f"OCR提取成功 - 发票号: {result.get('invoice_number', 'Unknown')}")
            return result
            
        except Exception as e:
            logger.error(f"OCR提取失败 - 文件: {file_path}, 错误: {e}")
            # OCR失败时抛出异常，而不是返回错误状态
            # 这样可以让上层决定如何处理
            raise BusinessLogicError(f"OCR解析失败: {str(e)}")
    
    async def _process_extraction_result(self, extraction_result: Dict[str, Any]) -> Dict[str, Any]:
        """处理OCR提取结果，转换为标准化的发票数据格式"""
        
        # 如果提取失败，返回空数据
        if extraction_result.get('status') == 'error':
            return {
                "extraction_failed": True,
                "error_message": extraction_result.get('error', '未知错误')
            }
        
        # 构建结构化数据
        structured_data = {
            "main_info": {
                "invoice_code": extraction_result.get('invoice_code'),
                "invoice_number": extraction_result.get('invoice_number'),
                "invoice_type": extraction_result.get('invoice_type', '增值税普通发票'),
                "invoice_date": extraction_result.get('invoice_date')
            },
            "seller_info": {
                "name": extraction_result.get('seller_name'),
                "tax_id": extraction_result.get('seller_tax_id'),
                "address": extraction_result.get('seller_address'),
                "phone": extraction_result.get('seller_phone'),
                "bank_info": extraction_result.get('seller_bank_info')
            },
            "buyer_info": {
                "name": extraction_result.get('buyer_name'),
                "tax_id": extraction_result.get('buyer_tax_id'),
                "address": extraction_result.get('buyer_address'),
                "phone": extraction_result.get('buyer_phone'),
                "bank_info": extraction_result.get('buyer_bank_info')
            },
            "items": extraction_result.get('items', []),
            "summary": {
                "amount": extraction_result.get('amount', 0),
                "tax_amount": extraction_result.get('tax_amount', 0),
                "total_amount": extraction_result.get('total_amount', 0),
                "total_amount_cn": extraction_result.get('total_amount_cn')
            },
            "remarks": extraction_result.get('remarks')
        }
        
        # 提取置信度分数
        confidence_scores = {
            "overall": extraction_result.get('confidence', 0.0),
            "invoice_number": extraction_result.get('invoice_number_confidence', 0.0),
            "amount": extraction_result.get('amount_confidence', 0.0),
            "date": extraction_result.get('date_confidence', 0.0)
        }
        
        return {
            "structured_data": structured_data,
            "confidence_scores": confidence_scores,
            "ocr_text": extraction_result.get('ocr_text', ''),
            "extraction_method": extraction_result.get('extraction_method', 'unknown'),
            "processing_time": extraction_result.get('processing_time', 0)
        }
    
    async def _update_invoice_with_extracted_data(
        self,
        invoice: Invoice,
        extracted_data: Dict[str, Any],
        raw_ocr_result: Dict[str, Any]
    ) -> Invoice:
        """使用提取的数据更新发票"""
        
        # 如果提取失败
        if extracted_data.get('extraction_failed'):
            invoice.status = InvoiceStatus.FAILED
            invoice.processing_status = ProcessingStatus.OCR_FAILED
            invoice.extracted_data = {
                "error": extracted_data.get('error_message'),
                "raw_result": raw_ocr_result
            }
            await self.db.commit()
            return invoice
        
        # 保存完整的提取数据
        invoice.extracted_data = extracted_data
        
        # 使用模型的update_from_ocr方法更新字段
        invoice.update_from_ocr(extracted_data)
        
        # 检查是否需要人工审核
        overall_confidence = extracted_data.get('confidence_scores', {}).get('overall', 0)
        if overall_confidence < 0.7:
            invoice.processing_status = ProcessingStatus.MANUAL_REVIEW
            invoice.add_tags(['需要审核', '低置信度'])
        else:
            invoice.add_tags(['自动处理', '高置信度'])
        
        # 添加来源标签
        if invoice.source == InvoiceSource.EMAIL:
            invoice.add_tags(['邮件来源'])
        elif invoice.source == InvoiceSource.UPLOAD:
            invoice.add_tags(['手动上传'])
        
        await self.db.commit()
        await self.db.refresh(invoice)
        
        logger.info(f"发票数据更新完成 - ID: {invoice.id}, 发票号: {invoice.invoice_number}")
        return invoice
    
    async def _mark_invoice_failed(self, invoice_id: UUID, error_message: str):
        """标记发票处理失败"""
        try:
            invoice = await self.db.get(Invoice, invoice_id)
            if invoice:
                invoice.status = InvoiceStatus.FAILED
                invoice.processing_status = ProcessingStatus.OCR_FAILED
                invoice.extracted_data = {
                    "error": error_message,
                    "failed_at": datetime.now(timezone.utc).isoformat()
                }
                await self.db.commit()
        except Exception as e:
            logger.error(f"更新发票失败状态时出错: {e}")
    
    async def batch_process_invoices(
        self,
        file_paths: List[str],
        user_id: UUID,
        source: InvoiceSource = InvoiceSource.EMAIL,
        email_task_id: Optional[UUID] = None
    ) -> List[Dict[str, Any]]:
        """批量处理多个PDF发票"""
        results = []
        
        for file_path in file_paths:
            try:
                invoice = await self.process_pdf_invoice(
                    file_path=file_path,
                    user_id=user_id,
                    source=source,
                    email_task_id=email_task_id
                )
                
                results.append({
                    "status": "success",
                    "file_path": file_path,
                    "invoice_id": str(invoice.id),
                    "invoice_number": invoice.invoice_number
                })
                
            except Exception as e:
                logger.error(f"批量处理中的单个文件失败 - 文件: {file_path}, 错误: {e}")
                results.append({
                    "status": "error",
                    "file_path": file_path,
                    "error": str(e)
                })
        
        # 记录批量处理结果
        success_count = len([r for r in results if r['status'] == 'success'])
        logger.info(f"批量处理完成 - 总数: {len(results)}, 成功: {success_count}")
        
        return results