"""
文件管理相关 API 端点

处理文件上传、下载、删除等操作。
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel, Field

from app.core.dependencies import CurrentUser, get_current_user, get_db_session
from app.core.exceptions import ValidationError, BusinessLogicError
from app.services.file_service import FileService, get_file_service, validate_pdf_file
from app.models.invoice import Invoice, InvoiceStatus, ProcessingStatus, InvoiceSource
from app.core.config import settings
from app.utils.path_validator import validate_file_path, validate_filename

router = APIRouter()


# ===== 辅助函数 =====

def parse_date(date_str) -> 'date':
    """解析日期字符串"""
    from datetime import datetime, date
    if not date_str:
        return date.today()
    
    try:
        # 尝试解析 YYYY-MM-DD 格式
        return datetime.strptime(str(date_str).strip(), '%Y-%m-%d').date()
    except ValueError:
        try:
            # 尝试解析 YYYY/MM/DD 格式
            return datetime.strptime(str(date_str).strip(), '%Y/%m/%d').date()
        except ValueError:
            # 使用今天日期作为最后的fallback
            return date.today()

def parse_amount(amount) -> float:
    """解析金额"""
    if isinstance(amount, (int, float)):
        return float(amount)
    if isinstance(amount, str):
        # 移除货币符号和空格
        cleaned = amount.replace('¥', '').replace(',', '').strip()
        try:
            return float(cleaned)
        except ValueError:
            return 0.0
    return 0.0


# ===== Pydantic 模型 =====

class FileUploadResponse(BaseModel):
    """文件上传响应模型"""
    file_id: UUID
    filename: str
    file_path: str
    file_url: str
    file_size: int
    file_hash: str
    mime_type: str
    invoice_id: Optional[UUID] = None
    uploaded_at: str


class FileInfo(BaseModel):
    """文件信息模型"""
    file_path: str
    filename: str
    file_size: int
    file_url: str
    mime_type: str
    created_at: str
    invoice_id: Optional[UUID] = None


class FilesListResponse(BaseModel):
    """文件列表响应"""
    files: List[FileInfo]
    total: int


# ===== API 端点 =====

@router.post("/upload-invoice", response_model=FileUploadResponse)
async def upload_invoice_file(
    file: UploadFile = File(..., description="发票PDF文件"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    file_service: FileService = Depends(get_file_service)
):
    """
    上传发票PDF文件
    
    自动执行OCR处理并提取发票信息。
    """
    
    try:
        # 验证文件
        await validate_pdf_file(file)
        
        # 简化的同步OCR处理流程
        # 1. 保存文件
        temp_file_path, file_hash, file_size, original_filename = await file_service.save_uploaded_file(
            file, current_user.id
        )
        
        # 2. 直接调用本地增强规则提取器
        from app.services.ocr.enhanced_rule_extractor import EnhancedRuleExtractor
        from app.services.ocr.config import OCRConfig
        from app.core.config import settings
        from pathlib import Path
        
        # 构造完整文件路径
        full_file_path = Path(settings.upload_dir) / temp_file_path
        
        # 创建OCR配置并初始化提取器
        ocr_config = OCRConfig()
        extractor = EnhancedRuleExtractor(ocr_config)
        
        # 直接同步调用OCR提取 
        ocr_result = await extractor.extract_invoice_data(str(full_file_path))
        
        # 3. 直接创建完整的发票记录（无需复杂状态流转）
        from datetime import datetime, timezone
        import json
        
        # 从增强规则提取器的结果中提取数据
        # ocr_result是包含structured_data和raw_data的字典
        structured_data = ocr_result.get('structured_data')
        raw_data = ocr_result.get('raw_data', {})
        
        if structured_data:
            # 使用结构化数据
            invoice = Invoice(
                user_id=current_user.id,
                invoice_number=structured_data.main_info.invoice_number if structured_data.main_info.invoice_number else f"UPLOAD_{file_hash[:8]}",
                invoice_code=structured_data.main_info.invoice_code,
                invoice_type=structured_data.main_info.invoice_type or '增值税普通发票',
                invoice_date=structured_data.main_info.invoice_date,
                amount=float(structured_data.summary.amount) if structured_data.summary.amount else 0,
                tax_amount=float(structured_data.summary.tax_amount) if structured_data.summary.tax_amount else 0,
                total_amount=float(structured_data.summary.total_amount) if structured_data.summary.total_amount else 0,
                currency='CNY',
                seller_name=structured_data.seller_info.name,
                seller_tax_id=structured_data.seller_info.tax_id,
                buyer_name=structured_data.buyer_info.name,
                buyer_tax_id=structured_data.buyer_info.tax_id,
                file_path=temp_file_path,
                file_url=file_service.get_file_url(temp_file_path),
                file_size=file_size,
                file_hash=file_hash,
                source=InvoiceSource.UPLOAD,
                status=InvoiceStatus.COMPLETED,  # 直接完成状态
                processing_status=ProcessingStatus.OCR_COMPLETED,  # OCR已完成
                extracted_data=json.loads(structured_data.json()),  # 转换为JSON兼容的字典
                source_metadata={"original_filename": original_filename},
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
        else:
            # 使用原始数据作为备用
            invoice = Invoice(
                user_id=current_user.id,
                invoice_number=raw_data.get('invoice_number', f"UPLOAD_{file_hash[:8]}"),
                invoice_code=raw_data.get('invoice_code'),
                invoice_type=raw_data.get('invoice_type', '增值税普通发票'),
                invoice_date=parse_date(raw_data.get('invoice_date')),
                amount=parse_amount(raw_data.get('amount', 0)),
                tax_amount=parse_amount(raw_data.get('tax_amount', 0)),
                total_amount=parse_amount(raw_data.get('total_amount', 0)),
                currency='CNY',
                seller_name=raw_data.get('seller_name'),
                seller_tax_id=raw_data.get('seller_tax_id'),
                buyer_name=raw_data.get('buyer_name'),
                buyer_tax_id=raw_data.get('buyer_tax_id'),
                file_path=temp_file_path,
                file_url=file_service.get_file_url(temp_file_path),
                file_size=file_size,
                file_hash=file_hash,
                source=InvoiceSource.UPLOAD,
                status=InvoiceStatus.COMPLETED,
                processing_status=ProcessingStatus.OCR_COMPLETED,
                extracted_data=raw_data,  # 保存原始数据
                source_metadata={"original_filename": original_filename},
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
        
        # 4. 保存到数据库（处理重复发票）
        try:
            db.add(invoice)
            await db.commit()
            await db.refresh(invoice)
        except Exception as e:
            await db.rollback()
            
            # 检查是否是重复发票错误
            if "duplicate key value violates unique constraint" in str(e) and "uk_invoice_number_user" in str(e):
                # 查找已存在的发票
                from sqlalchemy import select
                
                stmt = select(Invoice).where(
                    Invoice.invoice_number == (
                        structured_data.main_info.invoice_number if structured_data 
                        else raw_data.get('invoice_number', f"UPLOAD_{file_hash[:8]}")
                    ),
                    Invoice.user_id == current_user.id
                )
                existing_invoice = await db.execute(stmt)
                existing_invoice = existing_invoice.scalar_one_or_none()
                
                if existing_invoice:
                    # 返回已存在发票的信息
                    return FileUploadResponse(
                        file_id=existing_invoice.id,
                        filename=original_filename,
                        file_path=existing_invoice.file_path,
                        file_url=existing_invoice.file_url,
                        file_size=existing_invoice.file_size,
                        file_hash=existing_invoice.file_hash,
                        mime_type="application/pdf",
                        invoice_id=existing_invoice.id,
                        uploaded_at=existing_invoice.created_at.isoformat()
                    )
            
            # 其他数据库错误
            raise HTTPException(
                status_code=500,
                detail=f"数据库保存失败: {str(e)}"
            )
        
        return FileUploadResponse(
            file_id=invoice.id,
            filename=original_filename,
            file_path=invoice.file_path,
            file_url=invoice.file_url,
            file_size=invoice.file_size,
            file_hash=invoice.file_hash,
            mime_type=file.content_type or "application/pdf",
            invoice_id=invoice.id,
            uploaded_at=invoice.created_at.isoformat()
        )
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except BusinessLogicError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )




@router.get("/download/{file_path:path}")
async def download_file(
    file_path: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    file_service: FileService = Depends(get_file_service)
):
    """
    下载文件
    
    需要验证用户是否有权限访问该文件。
    """
    
    # 验证文件路径安全性
    try:
        safe_file_path = validate_file_path(file_path, str(file_service.upload_dir))
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的文件路径: {str(e)}"
        )
    
    # 验证文件是否属于当前用户
    stmt = select(Invoice).where(
        Invoice.user_id == current_user.id,
        Invoice.file_path == safe_file_path,
        Invoice.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在或无权访问"
        )
    
    # 获取文件信息
    file_info = await file_service.get_file_info(safe_file_path)
    if not file_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    # 构建完整文件路径
    full_path = file_service.upload_dir / safe_file_path
    
    return FileResponse(
        path=str(full_path),
        filename=invoice.invoice_number + ".pdf",
        media_type="application/pdf"
    )


@router.get("/list", response_model=FilesListResponse)
async def list_user_files(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    file_service: FileService = Depends(get_file_service)
):
    """
    获取当前用户的文件列表
    """
    
    # 查询用户的所有发票文件
    stmt = select(Invoice).where(
        Invoice.user_id == current_user.id,
        Invoice.file_path.is_not(None),
        Invoice.deleted_at.is_(None)
    ).order_by(Invoice.created_at.desc())
    
    result = await db.execute(stmt)
    invoices = result.scalars().all()
    
    files = []
    for invoice in invoices:
        file_info = await file_service.get_file_info(invoice.file_path)
        if file_info:
            files.append(FileInfo(
                file_path=invoice.file_path,
                filename=f"{invoice.invoice_number}.pdf",
                file_size=invoice.file_size or 0,
                file_url=invoice.file_url or "",
                mime_type="application/pdf",
                created_at=str(invoice.created_at),
                invoice_id=invoice.id
            ))
    
    return FilesListResponse(
        files=files,
        total=len(files)
    )


@router.delete("/{file_path:path}")
async def delete_file(
    file_path: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    file_service: FileService = Depends(get_file_service)
):
    """
    删除文件
    
    会同时删除关联的发票记录。
    """
    
    # 验证文件是否属于当前用户
    stmt = select(Invoice).where(
        Invoice.user_id == current_user.id,
        Invoice.file_path == file_path,
        Invoice.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在或无权访问"
        )
    
    # 删除物理文件
    success = await file_service.delete_file(file_path)
    
    if success:
        # 软删除发票记录
        invoice.soft_delete()
        await db.commit()
        
        return {"message": "文件删除成功"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="文件删除失败"
        )


@router.get("/info/{file_path:path}")
async def get_file_info(
    file_path: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    file_service: FileService = Depends(get_file_service)
):
    """
    获取文件信息
    """
    
    # 验证文件是否属于当前用户
    stmt = select(Invoice).where(
        Invoice.user_id == current_user.id,
        Invoice.file_path == file_path,
        Invoice.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在或无权访问"
        )
    
    # 获取文件信息
    file_info = await file_service.get_file_info(file_path)
    if not file_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    return {
        "file_path": file_path,
        "file_size": file_info["size"],
        "file_url": file_service.get_file_url(file_path),
        "mime_type": file_info["mime_type"],
        "created_at": file_info["created_at"],
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "invoice_status": invoice.status
    }