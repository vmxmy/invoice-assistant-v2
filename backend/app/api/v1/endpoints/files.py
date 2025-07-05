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
from app.services.invoice_service import InvoiceService, get_invoice_service
from app.services.pdf_invoice_processor import PDFInvoiceProcessor
from app.services.ocr import OCRService
from app.models.invoice import Invoice, InvoiceStatus, InvoiceSource
from app.core.config import settings
from app.utils.path_validator import validate_file_path, validate_filename

router = APIRouter()


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

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(..., description="上传的文件"),
    create_invoice: bool = True,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    file_service: FileService = Depends(get_file_service)
):
    """
    上传文件
    
    支持PDF文件上传，可选择是否自动创建发票记录。
    """
    
    try:
        # 验证文件
        await validate_pdf_file(file)
        
        # 如果需要创建发票记录，使用完整的OCR处理流程
        if create_invoice:
            # 首先保存临时文件
            temp_file_path, file_hash, file_size, original_filename = await file_service.save_uploaded_file(
                file, current_user.id
            )
            
            # 创建服务实例
            invoice_service = get_invoice_service(db, file_service)
            ocr_service = OCRService()
            
            # 创建PDF处理器并执行完整流程
            pdf_processor = PDFInvoiceProcessor(
                db=db,
                ocr_service=ocr_service,
                invoice_service=invoice_service,
                file_service=file_service
            )
            
            # 执行完整的PDF发票处理流程（文件验证 + OCR + 发票创建）
            invoice = await pdf_processor.process_pdf_invoice(
                file_path=temp_file_path,
                user_id=current_user.id,
                source=InvoiceSource.UPLOAD,
                source_metadata={"original_filename": original_filename}
            )
            
            return FileUploadResponse(
                file_id=invoice.id,
                filename=original_filename,
                file_path=invoice.file_path,
                file_url=file_service.get_file_url(invoice.file_path),
                file_size=invoice.file_size,
                file_hash=invoice.file_hash,
                mime_type=file.content_type or "application/pdf",
                invoice_id=invoice.id,
                uploaded_at=invoice.created_at.isoformat()
            )
        else:
            # 只保存文件，不创建发票记录
            file_path, file_hash, file_size, original_filename = await file_service.save_uploaded_file(
                file, current_user.id
            )
            
            file_url = file_service.get_file_url(file_path)
            
            return FileUploadResponse(
                file_id=UUID(file_hash[:32].ljust(32, '0')),  # 临时ID
                filename=original_filename,
                file_path=file_path,
                file_url=file_url,
                file_size=file_size,
                file_hash=file_hash,
                mime_type=file.content_type or "application/pdf",
                invoice_id=None,
                uploaded_at=datetime.now(timezone.utc).isoformat()
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


@router.post("/upload-invoice", response_model=FileUploadResponse)
async def upload_invoice_file(
    file: UploadFile = File(..., description="发票PDF文件"),
    invoice_number: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    file_service: FileService = Depends(get_file_service)
):
    """
    上传发票文件
    
    专门用于上传发票PDF文件，会自动创建或更新发票记录。
    """
    
    try:
        # 验证PDF文件
        await validate_pdf_file(file)
        
        # 保存文件
        file_path, file_hash, file_size, original_filename = await file_service.save_uploaded_file(
            file, current_user.id
        )
        
        # 生成文件URL
        file_url = file_service.get_file_url(file_path)
        
        # 确定发票号
        if not invoice_number:
            invoice_number = f"UPLOAD_{file_hash[:8]}"
        
        # 检查是否已存在相同发票号
        existing_stmt = select(Invoice).where(
            Invoice.user_id == current_user.id,
            Invoice.invoice_number == invoice_number,
            Invoice.deleted_at.is_(None)
        )
        existing_result = await db.execute(existing_stmt)
        existing_invoice = existing_result.scalar_one_or_none()
        
        if existing_invoice:
            # 更新现有发票
            existing_invoice.file_path = file_path
            existing_invoice.file_url = file_url
            existing_invoice.file_size = file_size
            existing_invoice.file_hash = file_hash
            existing_invoice.source = InvoiceSource.UPLOAD
            existing_invoice.status = InvoiceStatus.PENDING
            
            await db.commit()
            await db.refresh(existing_invoice)
            invoice_id = existing_invoice.id
        else:
            # 创建新发票
            from datetime import date
            
            new_invoice = Invoice(
                user_id=current_user.id,
                invoice_number=invoice_number,
                amount=0,
                currency="CNY",
                invoice_date=date.today(),
                file_path=file_path,
                file_url=file_url,
                file_size=file_size,
                file_hash=file_hash,
                source=InvoiceSource.UPLOAD,
                status=InvoiceStatus.PENDING
            )
            
            db.add(new_invoice)
            await db.commit()
            await db.refresh(new_invoice)
            invoice_id = new_invoice.id
        
        return FileUploadResponse(
            file_id=UUID(file_hash[:32].ljust(32, '0')),
            filename=original_filename,
            file_path=file_path,
            file_url=file_url,
            file_size=file_size,
            file_hash=file_hash,
            mime_type="application/pdf",
            invoice_id=invoice_id,
            uploaded_at=str(datetime.now(timezone.utc))
        )
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文件上传失败: {str(e)}"
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