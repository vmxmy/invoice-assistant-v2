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
from app.api.v1.endpoints.ocr_combined import process_invoice_ocr
from app.core.database import async_session_maker
from app.api.v1.endpoints.invoices_enhanced import create_invoice_with_file
from fastapi import UploadFile
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


async def create_invoice_from_email_pdf(
    pdf_data: Dict[str, Any],
    invoice_data: Dict[str, Any],
    current_user: CurrentUser,
    email_info: EmailInfo,
    session: AsyncSession
) -> str:
    """
    从邮件PDF创建发票记录，直接调用现有的create-with-file端点
    
    Args:
        pdf_data: PDF文件数据
        invoice_data: 发票数据字典
        current_user: 当前用户
        email_info: 邮件信息
        session: 数据库会话
        
    Returns:
        str: 创建的发票ID
    """
    # 创建UploadFile对象
    file_content = pdf_data['data']
    filename = pdf_data.get('name', 'email_attachment.pdf')
    
    # 创建一个模拟的UploadFile对象
    class MockUploadFile:
        def __init__(self, content: bytes, filename: str):
            self.content = content
            self.filename = filename
            self.content_type = "application/pdf"
            self.size = len(content)
        
        async def read(self) -> bytes:
            return self.content
    
    mock_file = MockUploadFile(file_content, filename)
    
    # 准备发票数据，添加邮件相关的元数据
    enhanced_invoice_data = invoice_data.copy()
    
    # 添加邮件来源的元数据到extracted_data中
    if 'extracted_data' not in enhanced_invoice_data:
        enhanced_invoice_data['extracted_data'] = {}
    
    enhanced_invoice_data['extracted_data'].update({
        'email_source': {
            'email_uid': email_info.uid,
            'email_subject': email_info.subject,
            'pdf_source': pdf_data['source'],
            'pdf_url': pdf_data.get('url') if pdf_data['source'] == 'body_link' else None
        }
    })
    
    # 将发票数据转换为JSON字符串
    invoice_data_json = json.dumps(enhanced_invoice_data, ensure_ascii=False, default=str)
    
    logger.info(f"调用create_invoice_with_file创建发票，数据: {invoice_data_json[:500]}...")
    
    # 直接调用现有的create_invoice_with_file函数
    result = await create_invoice_with_file(
        file=mock_file,
        invoice_data=invoice_data_json,
        current_user=current_user,
        session=session
    )
    
    # 从结果中提取发票ID
    if result and result.get('success') and result.get('data'):
        return result['data']['id']
    else:
        raise Exception(f"创建发票失败: {result}")


async def process_single_pdf(
    pdf_data: Dict[str, Any],
    ocr_service: AliyunOCRService,
    parser_service: OCRParserService,
    invoice_service: InvoiceService,
    current_user: CurrentUser,
    auto_create_invoice: bool,
    email_info: EmailInfo
) -> PDFProcessResult:
    """处理单个PDF - 重构版本，复用手动上传发票模块的逻辑"""
    try:
        # 1. OCR识别
        logger.info(f"开始OCR识别: {pdf_data.get('name', pdf_data.get('url'))}")
        
        # 调用OCR服务
        pdf_content = pdf_data['data']
        ocr_result = await ocr_service.recognize_mixed_invoices(pdf_content)
        
        # 2. 解析结果
        parser_result = await parser_service.parse_ocr_result(ocr_result)
        
        # 3. 提取发票数据
        invoice_type = parser_result.invoice_type
        raw_invoice_data = {
            field.name: field.value
            for field in parser_result.fields
            if field.value is not None
        }
        
        # 记录提取的字段，用于调试
        logger.info(f"OCR提取的发票类型: {invoice_type}")
        logger.info(f"OCR提取的字段: {', '.join(raw_invoice_data.keys())}")
        
        # 4. 创建发票记录（如果启用）
        invoice_id = None
        if auto_create_invoice and invoice_type != "unknown":
            try:
                # 使用新的数据库会话
                async with async_session_maker() as session:
                    # 映射字段名称
                    field_mapping = {
                        '发票号码': 'invoice_number',
                        '开票日期': 'invoice_date',
                        '价税合计': 'total_amount',
                        '销售方名称': 'seller_name',
                        '购买方名称': 'buyer_name',
                        '合计金额': 'amount_without_tax',
                        '合计税额': 'tax_amount',
                        '销售方纳税人识别号': 'seller_tax_number',
                        '购买方纳税人识别号': 'buyer_tax_number',
                        '发票代码': 'invoice_code',
                        '备注': 'remarks'
                    }
                    
                    # 映射字段
                    mapped_data = {}
                    for cn_field, en_field in field_mapping.items():
                        if cn_field in raw_invoice_data:
                            mapped_data[en_field] = raw_invoice_data[cn_field]
                    
                    # 处理日期格式
                    if 'invoice_date' in mapped_data and isinstance(mapped_data['invoice_date'], str):
                        if re.match(r'(\d{4})年(\d{1,2})月(\d{1,2})日', mapped_data['invoice_date']):
                            match = re.match(r'(\d{4})年(\d{1,2})月(\d{1,2})日', mapped_data['invoice_date'])
                            year, month, day = match.groups()
                            mapped_data['invoice_date'] = f"{year}-{int(month):02d}-{int(day):02d}"
                    
                    # 确保必要字段存在
                    if not mapped_data.get('invoice_number'):
                        filename = pdf_data.get('name', '')
                        if filename and any(c.isdigit() for c in filename):
                            numbers = re.findall(r'\d+', filename)
                            if numbers:
                                mapped_data['invoice_number'] = ''.join(numbers)
                        
                        if not mapped_data.get('invoice_number'):
                            mapped_data['invoice_number'] = f"EMAIL_{int(time.time())}_{email_info.uid}"
                    
                    if not mapped_data.get('invoice_date'):
                        mapped_data['invoice_date'] = date.today().isoformat()
                    
                    # 转换日期字符串为date对象
                    if isinstance(mapped_data.get('invoice_date'), str):
                        try:
                            mapped_data['invoice_date'] = datetime.strptime(mapped_data['invoice_date'], '%Y-%m-%d').date()
                        except ValueError:
                            mapped_data['invoice_date'] = date.today()
                    
                    # 转换金额为Decimal
                    for field in ['total_amount', 'amount_without_tax', 'tax_amount']:
                        if field in mapped_data and mapped_data[field] is not None:
                            try:
                                if isinstance(mapped_data[field], str):
                                    mapped_data[field] = Decimal(mapped_data[field].replace(',', ''))
                                else:
                                    mapped_data[field] = Decimal(str(mapped_data[field]))
                            except (ValueError, TypeError, InvalidOperation):
                                logger.warning(f"无法转换字段 {field} 为Decimal: {mapped_data[field]}")
                                mapped_data[field] = Decimal('0')
                    
                    # 设置默认值
                    mapped_data.setdefault('tax_amount', Decimal('0'))
                    mapped_data.setdefault('total_amount', Decimal('0'))
                    
                    # 添加其他必要字段
                    mapped_data['invoice_type'] = invoice_type
                    mapped_data['ocr_confidence'] = getattr(parser_result, 'confidence', 0.9)
                    mapped_data['extracted_data'] = {
                        'raw_ocr_data': raw_invoice_data,
                        'ocr_result': ocr_result,
                        'invoice_type': invoice_type
                    }
                    
                    logger.info(f"准备创建发票，数据: {mapped_data}")
                    
                    # 使用现有的create-with-file端点创建发票
                    invoice_id = await create_invoice_from_email_pdf(
                        pdf_data=pdf_data,
                        invoice_data=mapped_data,
                        current_user=current_user,
                        email_info=email_info,
                        session=session
                    )
                    
                    logger.info(f"成功创建发票记录: {invoice_id}")


                
            except Exception as e:
                logger.error(f"创建发票记录失败: {e}")
                # 继续返回OCR结果，但标记创建失败
        
        return PDFProcessResult(
            source=pdf_data['source'],
            name=pdf_data.get('name', pdf_data.get('url', 'unknown')),
            status="success",
            invoice_id=invoice_id,
            invoice_type=invoice_type,
            invoice_data=raw_invoice_data
        )
        
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