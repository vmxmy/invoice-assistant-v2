"""
邮件批量处理API
处理邮件中的PDF附件和链接
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, date
import asyncio
import re
import hashlib
import time
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, CurrentUser, get_db
from app.core.exceptions import BusinessException
from app.services.email.pdf_extractor import EmailPDFExtractor
from app.services.aliyun_ocr_service import AliyunOCRService, get_aliyun_ocr_service
from app.services.ocr_parser_service import OCRParserService, get_ocr_parser_service
from app.services.invoice_service import InvoiceService
from app.services.file_service import FileService
from app.models.invoice import InvoiceSource, Invoice, InvoiceStatus, ProcessingStatus
from app.core.database import async_session_maker
from decimal import Decimal, InvalidOperation
import json

logger = logging.getLogger(__name__)
router = APIRouter()


class EmailInfo(BaseModel):
    """邮件信息"""
    account_id: str = Field(..., description="邮箱账户ID")
    uid: int = Field(..., description="邮件UID")
    subject: str = Field(..., description="邮件主题")


class BatchProcessRequest(BaseModel):
    """批量处理请求"""
    emails: List[EmailInfo] = Field(..., description="要处理的邮件列表")
    auto_create_invoice: bool = Field(True, description="是否自动创建发票记录")
    continue_on_error: bool = Field(True, description="遇到错误是否继续处理其他邮件")


class PDFProcessResult(BaseModel):
    """单个PDF处理结果"""
    source: str = Field(..., description="PDF来源：attachment或body_link")
    name: str = Field(..., description="文件名或URL")
    status: str = Field(..., description="处理状态：success/failed")
    invoice_id: Optional[str] = Field(None, description="创建的发票ID")
    invoice_type: Optional[str] = Field(None, description="识别的发票类型")
    invoice_data: Optional[Dict[str, Any]] = Field(None, description="提取的发票数据")
    error: Optional[str] = Field(None, description="错误信息")


class EmailProcessResult(BaseModel):
    """单个邮件处理结果"""
    email_uid: int = Field(..., description="邮件UID")
    subject: str = Field(..., description="邮件主题")
    status: str = Field(..., description="处理状态：success/partial/failed")
    pdf_count: int = Field(..., description="找到的PDF数量")
    processed_count: int = Field(..., description="成功处理的PDF数量")
    pdfs: List[PDFProcessResult] = Field(..., description="PDF处理结果列表")
    processing_time: float = Field(..., description="处理耗时（秒）")
    error: Optional[str] = Field(None, description="错误信息")


class BatchProcessResponse(BaseModel):
    """批量处理响应"""
    total_emails: int = Field(..., description="总邮件数")
    successful_emails: int = Field(..., description="成功处理的邮件数")
    partial_emails: int = Field(..., description="部分成功的邮件数")
    failed_emails: int = Field(..., description="失败的邮件数")
    total_pdfs: int = Field(..., description="总PDF数")
    processed_pdfs: int = Field(..., description="成功处理的PDF数")
    results: List[EmailProcessResult] = Field(..., description="各邮件处理结果")
    total_processing_time: float = Field(..., description="总处理时间（秒）")


@router.post("/batch-process", 
            response_model=BatchProcessResponse,
            summary="批量处理邮件中的PDF")
async def batch_process_emails(
    request: BatchProcessRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    ocr_service: AliyunOCRService = Depends(get_aliyun_ocr_service),
    parser_service: OCRParserService = Depends(get_ocr_parser_service)
) -> BatchProcessResponse:
    """
    批量处理邮件中的PDF文件
    
    处理流程：
    1. 从邮件中提取PDF（附件或正文链接）
    2. 对每个PDF进行OCR识别
    3. 解析识别结果
    4. 可选：自动创建发票记录
    """
    start_time = datetime.now()
    
    # 初始化服务
    pdf_extractor = EmailPDFExtractor(db, current_user.id)
    file_service = FileService()
    invoice_service = InvoiceService(db, file_service)
    
    # 处理结果
    results = []
    total_pdfs = 0
    processed_pdfs = 0
    
    # 创建处理任务
    tasks = []
    for email_info in request.emails:
        # 为每个任务创建独立的服务实例，避免并发冲突
        task = process_email_task_with_new_session(
            email_info,
            current_user,
            request.auto_create_invoice,
            request.continue_on_error,
            ocr_service,
            parser_service
        )
        tasks.append(task)
    
    # 并发处理，限制并发数
    semaphore = asyncio.Semaphore(3)
    
    async def process_with_limit(task):
        async with semaphore:
            return await task
    
    limited_tasks = [process_with_limit(task) for task in tasks]
    results = await asyncio.gather(*limited_tasks, return_exceptions=True)
    
    # 处理结果
    email_results = []
    successful_emails = 0
    partial_emails = 0
    failed_emails = 0
    
    for email_info, result in zip(request.emails, results):
        if isinstance(result, Exception):
            # 处理异常
            email_result = EmailProcessResult(
                email_uid=email_info.uid,
                subject=email_info.subject,
                status="failed",
                pdf_count=0,
                processed_count=0,
                pdfs=[],
                processing_time=0,
                error=str(result)
            )
            failed_emails += 1
        else:
            email_result = result
            total_pdfs += email_result.pdf_count
            processed_pdfs += email_result.processed_count
            
            if email_result.status == "success":
                successful_emails += 1
            elif email_result.status == "partial":
                partial_emails += 1
            else:
                failed_emails += 1
        
        email_results.append(email_result)
    
    # 计算总耗时
    total_time = (datetime.now() - start_time).total_seconds()
    
    return BatchProcessResponse(
        total_emails=len(request.emails),
        successful_emails=successful_emails,
        partial_emails=partial_emails,
        failed_emails=failed_emails,
        total_pdfs=total_pdfs,
        processed_pdfs=processed_pdfs,
        results=email_results,
        total_processing_time=total_time
    )


async def process_email_task(
    email_info: EmailInfo,
    pdf_extractor: EmailPDFExtractor,
    ocr_service: AliyunOCRService,
    parser_service: OCRParserService,
    invoice_service: InvoiceService,
    current_user: CurrentUser,
    auto_create_invoice: bool,
    continue_on_error: bool,
    db_lock: Optional[asyncio.Lock] = None
) -> EmailProcessResult:
    """处理单个邮件的任务"""
    email_start_time = datetime.now()
    pdf_results = []
    
    try:
        # 1. 提取PDF
        logger.info(f"开始处理邮件 UID {email_info.uid}: {email_info.subject}")
        pdfs = await pdf_extractor.extract_pdfs_from_email(
            email_info.account_id,
            email_info.uid
        )
        
        if not pdfs:
            logger.info(f"邮件 UID {email_info.uid} 中未找到PDF")
            return EmailProcessResult(
                email_uid=email_info.uid,
                subject=email_info.subject,
                status="success",
                pdf_count=0,
                processed_count=0,
                pdfs=[],
                processing_time=(datetime.now() - email_start_time).total_seconds()
            )
        
        # 2. 处理每个PDF
        for pdf in pdfs:
            pdf_result = await process_single_pdf(
                pdf,
                ocr_service,
                parser_service,
                invoice_service,
                current_user,
                auto_create_invoice,
                email_info
            )
            pdf_results.append(pdf_result)
        
        # 3. 统计结果
        processed_count = sum(1 for r in pdf_results if r.status == "success")
        status = "success" if processed_count == len(pdfs) else "partial" if processed_count > 0 else "failed"
        
        return EmailProcessResult(
            email_uid=email_info.uid,
            subject=email_info.subject,
            status=status,
            pdf_count=len(pdfs),
            processed_count=processed_count,
            pdfs=pdf_results,
            processing_time=(datetime.now() - email_start_time).total_seconds()
        )
        
    except Exception as e:
        logger.error(f"处理邮件 UID {email_info.uid} 失败: {e}", exc_info=True)
        if not continue_on_error:
            raise
            
        return EmailProcessResult(
            email_uid=email_info.uid,
            subject=email_info.subject,
            status="failed",
            pdf_count=0,
            processed_count=0,
            pdfs=pdf_results,
            processing_time=(datetime.now() - email_start_time).total_seconds(),
            error=str(e)
        )


# 注意：create_invoice_from_email_pdf 函数已被移除
# 统一发票处理器 (UnifiedInvoiceProcessor) 已经包含了发票创建功能
# 请使用 process_single_pdf 函数，它会自动处理 OCR、解析和发票创建


async def process_single_pdf(
    pdf_data: Dict[str, Any],
    ocr_service: AliyunOCRService,
    parser_service: OCRParserService,
    invoice_service: InvoiceService,
    current_user: CurrentUser,
    auto_create_invoice: bool,
    email_info: EmailInfo
) -> PDFProcessResult:
    """处理单个PDF - 使用与手动上传完全相同的流程"""
    try:
        # 1. 保存PDF到临时文件
        import tempfile
        import os
        from uuid import uuid4
        from app.schemas.invoice import InvoiceCreate
        from sqlalchemy import select
        from app.services.storage.supabase_storage import SupabaseStorageService
        from app.api.v1.endpoints.parser import ParsedField
        from app.adapters.ocr_field_adapter import ocr_field_adapter
        from pathlib import Path
        
        pdf_content = pdf_data['data']
        filename = pdf_data.get('name', f'email_attachment_{email_info.uid}.pdf')
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.pdf', delete=False) as tmp_file:
            tmp_file.write(pdf_content)
            temp_file_path = tmp_file.name
        
        try:
            async with async_session_maker() as session:
                # 2. OCR识别 - 使用手动上传相同的方式
                logger.info(f"[process_single_pdf] 开始OCR识别: {filename}")
                
                # 调用OCR服务
                ocr_result = await ocr_service.recognize_mixed_invoices(pdf_content)
                
                if not ocr_result or 'Data' not in ocr_result:
                    raise ValueError("OCR识别失败：无有效结果")
                
                # 解析OCR结果
                logger.info(f"[process_single_pdf] 开始解析OCR结果")
                invoice_type, parsed_fields = parser_service.parse_invoice_data(ocr_result)
                logger.info(f"[process_single_pdf] 解析结果 - 发票类型: {invoice_type}, 字段数: {len(parsed_fields)}")
                
                # 转换为字典格式
                raw_fields_dict = {}
                for field in parsed_fields:
                    raw_fields_dict[field.original_key or field.name] = field.value
                
                # 使用字段适配器
                adapted_fields = ocr_field_adapter.adapt_fields(raw_fields_dict, invoice_type)
                logger.info(f"[process_single_pdf] 适配后字段: {list(adapted_fields.keys())}")
                
                # 构建extracted_data
                extracted_data = {
                    'ocr_result': ocr_result,
                    'raw_data': raw_fields_dict,
                    'structured_data': adapted_fields,
                    'invoice_type': invoice_type
                }
                
                # 准备创建发票的数据
                invoice_dict = {
                    'invoice_number': adapted_fields.get('invoice_number'),
                    'invoice_code': adapted_fields.get('invoice_code'),
                    'invoice_date': adapted_fields.get('invoice_date'),
                    'seller_name': adapted_fields.get('seller_name'),
                    'seller_tax_number': adapted_fields.get('seller_tax_number'),
                    'buyer_name': adapted_fields.get('buyer_name'),
                    'buyer_tax_number': adapted_fields.get('buyer_tax_number'),
                    'total_amount': adapted_fields.get('total_amount', 0),
                    'tax_amount': adapted_fields.get('tax_amount', 0),
                    'invoice_type': invoice_type,
                    'remarks': adapted_fields.get('remarks'),
                    'extracted_data': extracted_data
                }
                
                # 转换日期格式
                if invoice_dict.get('invoice_date'):
                    invoice_date_str = invoice_dict['invoice_date']
                    logger.info(f"[process_single_pdf] 原始日期格式: {invoice_date_str}")
                    
                    # 尝试解析中文日期格式
                    try:
                        if '年' in str(invoice_date_str) and '月' in str(invoice_date_str) and '日' in str(invoice_date_str):
                            # 解析中文日期格式: 2025年07月22日
                            match = re.match(r'(\d{4})年(\d{1,2})月(\d{1,2})日', str(invoice_date_str).strip())
                            if match:
                                year, month, day = match.groups()
                                invoice_dict['invoice_date'] = date(int(year), int(month), int(day))
                                logger.info(f"[process_single_pdf] 转换后日期: {invoice_dict['invoice_date']}")
                        elif isinstance(invoice_date_str, str) and '-' in invoice_date_str:
                            # 已经是标准格式
                            parts = invoice_date_str.split('-')
                            if len(parts) == 3:
                                invoice_dict['invoice_date'] = date(int(parts[0]), int(parts[1]), int(parts[2]))
                        elif isinstance(invoice_date_str, date):
                            # 已经是date对象
                            invoice_dict['invoice_date'] = invoice_date_str
                    except Exception as e:
                        logger.error(f"[process_single_pdf] 日期转换失败: {e}, 原始值: {invoice_date_str}")
                        # 如果转换失败，尝试使用今天的日期
                        invoice_dict['invoice_date'] = date.today()
                
                logger.info(f"💰 [process_single_pdf] 金额字段追踪:")
                logger.info(f"  - total_amount: {invoice_dict.get('total_amount')}")
                logger.info(f"  - tax_amount: {invoice_dict.get('tax_amount')}")
                
                # 创建 InvoiceCreate 对象
                invoice_create = InvoiceCreate(**invoice_dict)
                
                # 检查重复发票
                existing_query = select(Invoice).where(
                    Invoice.user_id == current_user.id,
                    Invoice.invoice_number == invoice_create.invoice_number,
                    Invoice.deleted_at.is_(None)
                )
                existing_result = await session.execute(existing_query)
                existing_invoice = existing_result.scalar_one_or_none()
                
                if existing_invoice:
                    logger.warning(f"发票已存在: {invoice_create.invoice_number}")
                    return PDFProcessResult(
                        source=pdf_data['source'],
                        name=filename,
                        status="failed",
                        error=f"发票号码 {invoice_create.invoice_number} 已存在",
                        invoice_id=str(existing_invoice.id),
                        invoice_type=invoice_type,
                        invoice_data={
                            '发票号码': existing_invoice.invoice_number,
                            '状态': '已存在'
                        }
                    )
                
                # 处理消费日期
                consumption_date = getattr(invoice_create, 'consumption_date', None)
                if not consumption_date:
                    from app.api.v1.endpoints.files import parse_consumption_date
                    consumption_date = parse_consumption_date(
                        invoice_create.invoice_type or '增值税发票',
                        invoice_create.invoice_date,
                        extracted_data
                    )
                
                # 处理火车票的特殊情况
                total_amount = invoice_create.total_amount
                if invoice_create.invoice_type == '火车票' and extracted_data:
                    logger.info(f"[process_single_pdf] 处理火车票金额")
                    
                    # 尝试从多个位置获取票价
                    fare_amount = None
                    
                    # 从adapted_fields中查找
                    if 'fare' in adapted_fields:
                        fare_amount = adapted_fields['fare']
                    elif 'total_amount' in adapted_fields:
                        fare_amount = adapted_fields['total_amount']
                    
                    # 从raw_fields_dict中查找
                    if fare_amount is None and 'fare' in raw_fields_dict:
                        fare_amount = raw_fields_dict['fare']
                    
                    if fare_amount is not None:
                        try:
                            total_amount = Decimal(str(fare_amount))
                            logger.info(f"[process_single_pdf] 火车票金额设置为: {total_amount}")
                        except Exception as e:
                            logger.error(f"[process_single_pdf] 转换火车票金额失败: {e}")
                
                # 计算 amount_without_tax
                amount_without_tax = getattr(invoice_create, 'amount_without_tax', None)
                tax_amount = invoice_create.tax_amount
                
                if amount_without_tax is None and tax_amount is not None:
                    try:
                        amount_without_tax = Decimal(str(total_amount)) - Decimal(str(tax_amount))
                    except:
                        amount_without_tax = None
                
                logger.info(f"💰 [process_single_pdf] 最终金额值:")
                logger.info(f"  - total_amount: {total_amount}")
                logger.info(f"  - tax_amount: {tax_amount}")
                logger.info(f"  - amount_without_tax: {amount_without_tax}")
                
                # 生成文件路径
                file_ext = filename.split('.')[-1]
                file_name = f"{uuid4()}.{file_ext}"
                file_path = f"invoices/{current_user.id}/{datetime.now().year}/{datetime.now().month}/{file_name}"
                
                # 上传到Supabase Storage
                storage_service = SupabaseStorageService()
                file_url = await storage_service.upload_file(
                    bucket_name="invoice-files",
                    file_path=file_path,
                    file_content=pdf_content,
                    content_type="application/pdf"
                )
                
                # 创建发票记录
                invoice = Invoice(
                    user_id=current_user.id,
                    invoice_number=invoice_create.invoice_number,
                    invoice_code=invoice_create.invoice_code,
                    invoice_date=invoice_create.invoice_date,
                    consumption_date=consumption_date,
                    seller_name=invoice_create.seller_name,
                    seller_tax_number=invoice_create.seller_tax_number,
                    buyer_name=invoice_create.buyer_name,
                    buyer_tax_number=invoice_create.buyer_tax_number,
                    total_amount=total_amount,
                    tax_amount=tax_amount,
                    amount_without_tax=amount_without_tax,
                    invoice_type=invoice_create.invoice_type,
                    file_path=file_path,
                    file_url=file_url,
                    file_name=filename,
                    file_size=len(pdf_content),
                    ocr_confidence_score=getattr(invoice_create, 'ocr_confidence', None),
                    extracted_data=extracted_data,
                    remarks=getattr(invoice_create, 'remarks', None),
                    status=InvoiceStatus.ACTIVE,
                    source=InvoiceSource.EMAIL,
                    source_metadata={
                        'email_uid': email_info.uid,
                        'email_subject': email_info.subject,
                        'pdf_source': pdf_data['source'],
                        'pdf_url': pdf_data.get('url') if pdf_data['source'] == 'body_link' else None,
                        'email_account_id': email_info.account_id
                    },
                    processing_status=ProcessingStatus.OCR_COMPLETED
                )
                
                logger.info(f"💰 [process_single_pdf] 发票对象最终金额值:")
                logger.info(f"  - invoice.total_amount: {invoice.total_amount}")
                logger.info(f"  - invoice.tax_amount: {invoice.tax_amount}")
                logger.info(f"  - invoice.amount_without_tax: {invoice.amount_without_tax}")
                
                session.add(invoice)
                await session.commit()
                await session.refresh(invoice)
                
                # 构建返回结果
                display_data = {
                    '发票号码': invoice.invoice_number,
                    '开票日期': invoice.invoice_date.isoformat() if invoice.invoice_date else None,
                    '销售方名称': invoice.seller_name,
                    '购买方名称': invoice.buyer_name,
                    '价税合计': float(invoice.total_amount or 0)
                }
                
                if invoice_type == '火车票':
                    display_data['票价'] = float(invoice.total_amount or 0)
                
                # 过滤掉空值
                display_data = {k: v for k, v in display_data.items() if v is not None}
                
                return PDFProcessResult(
                    source=pdf_data['source'],
                    name=filename,
                    status="success",
                    invoice_id=str(invoice.id),
                    invoice_type=invoice_type,
                    invoice_data=display_data
                )
                    
        except Exception as e:
            logger.error(f"处理PDF时发生错误: {e}", exc_info=True)
            return PDFProcessResult(
                source=pdf_data['source'],
                name=filename,
                status="failed",
                error=str(e)
            )
        finally:
            # 清理临时文件
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        logger.error(f"处理PDF失败: {e}", exc_info=True)
        return PDFProcessResult(
            source=pdf_data['source'],
            name=pdf_data.get('name', pdf_data.get('url', 'unknown')),
            status="failed",
            error=str(e)
        )


async def process_email_task_with_new_session(
    email_info: EmailInfo,
    current_user: CurrentUser,
    auto_create_invoice: bool,
    continue_on_error: bool,
    ocr_service: AliyunOCRService,
    parser_service: OCRParserService
) -> EmailProcessResult:
    """为每个任务创建新的数据库会话，避免并发冲突"""
    max_retries = 3
    retry_delay = 1  # 秒
    
    for attempt in range(max_retries):
        try:
            async with async_session_maker() as db:
                try:
                    # 创建独立的服务实例
                    pdf_extractor = EmailPDFExtractor(db, current_user.id)
                    file_service = FileService()
                    invoice_service = InvoiceService(db, file_service)
                    
                    # 调用原有的处理逻辑
                    result = await process_email_task(
                        email_info,
                        pdf_extractor,
                        ocr_service,
                        parser_service,
                        invoice_service,
                        current_user,
                        auto_create_invoice,
                        continue_on_error
                    )
                    
                    # 成功则返回结果
                    return result
                    
                finally:
                    await db.close()
                    
        except Exception as e:
            error_msg = str(e)
            logger.error(f"处理邮件 {email_info.uid} 失败 (尝试 {attempt + 1}/{max_retries}): {error_msg}")
            
            # 如果是最后一次尝试，返回错误结果
            if attempt == max_retries - 1:
                return EmailProcessResult(
                    email_uid=email_info.uid,
                    subject=email_info.subject,
                    status="failed",
                    pdf_count=0,
                    processed_count=0,
                    pdfs=[],
                    processing_time=0,
                    error=f"重试 {max_retries} 次后仍失败: {error_msg}"
                )
            
            # 等待后重试
            await asyncio.sleep(retry_delay * (attempt + 1))


@router.get("/processing-status/{job_id}",
           response_model=Dict[str, Any],
           summary="获取处理状态")
async def get_processing_status(
    job_id: str,
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """获取批量处理任务的状态"""
    # TODO: 实现任务状态查询
    # 这里可以从缓存或数据库中获取任务状态
    return {
        "job_id": job_id,
        "status": "processing",
        "progress": 50,
        "message": "正在处理中..."
    }