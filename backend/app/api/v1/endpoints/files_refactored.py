"""
文件管理相关 API 端点（重构版）

处理文件上传、下载、删除等操作。
使用InvoiceService处理业务逻辑，API层仅负责请求和响应。
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import ValidationError, BusinessLogicError
from app.services.file_service import FileService, get_file_service, validate_pdf_file
from app.services.invoice_service import InvoiceService, get_invoice_service_from_request
from app.utils.path_validator import validate_file_path

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


# ===== API 端点 =====

@router.post("/upload-invoice", response_model=FileUploadResponse)
async def upload_invoice_file(
    file: UploadFile = File(..., description="发票PDF文件"),
    current_user: CurrentUser = Depends(get_current_user),
    invoice_service: InvoiceService = Depends(get_invoice_service_from_request)
):
    """
    上传发票PDF文件
    
    自动执行OCR处理并提取发票信息。
    """
    try:
        # 验证文件
        await validate_pdf_file(file)
        
        # 使用InvoiceService处理文件上传和OCR
        invoice, is_new = await invoice_service.create_or_update_from_file(
            file=file,
            user_id=current_user.id,
            original_filename=file.filename
        )
        
        # 构建响应
        return FileUploadResponse(
            file_id=invoice.id,
            filename=file.filename,
            file_path=invoice.file_path,
            file_url=invoice.file_url,
            file_size=invoice.file_size,
            file_hash=invoice.file_hash,
            mime_type="application/pdf",
            invoice_id=invoice.id,
            uploaded_at=invoice.updated_at.isoformat()
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
    invoice_service: InvoiceService = Depends(get_invoice_service_from_request),
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
    
    # 查找发票记录
    invoice = await invoice_service.get_invoice_by_file_path(safe_file_path, current_user.id)
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