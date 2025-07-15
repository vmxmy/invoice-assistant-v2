"""
文件管理相关 API 端点

处理文件上传、下载、删除等操作。
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timezone

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.dependencies import CurrentUser, get_current_user, get_db_session
from app.core.exceptions import ValidationError, BusinessLogicError
from app.services.file_service import FileService, get_file_service, validate_pdf_file
from app.models.invoice import Invoice, InvoiceStatus, ProcessingStatus, InvoiceSource
from app.core.config import settings
from app.utils.path_validator import validate_file_path

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


def parse_consumption_date(invoice_type: str, invoice_date: date, ocr_data: dict) -> date:
    """解析消费日期
    
    根据发票类型确定消费日期：
    - 火车票：从 departureTime 中提取日期
    - 其他发票：默认使用开票日期
    """
    from datetime import datetime
    
    if invoice_type == '火车票' and ocr_data:
        # 尝试从多种数据层级中提取 departureTime
        departure_time = (
            ocr_data.get('departureTime') or 
            ocr_data.get('departure_time') or
            (ocr_data.get('structured_data', {}).get('departureTime') if isinstance(ocr_data.get('structured_data'), dict) else None) or
            (ocr_data.get('structured_data', {}).get('departure_time') if isinstance(ocr_data.get('structured_data'), dict) else None) or 
            ''
        )
        
        if departure_time:
            try:
                # 处理格式: "2024年1月15日 14:30" 或 "2025年03月24日08:45开"
                if '年' in departure_time and '月' in departure_time and '日' in departure_time:
                    # 提取日期部分
                    date_part = departure_time.split(' ')[0] if ' ' in departure_time else departure_time
                    # 移除可能的"开"字等后缀
                    date_part = date_part.replace('开', '').strip()
                    # 解析中文日期
                    parsed_date = datetime.strptime(date_part, '%Y年%m月%d日').date()
                    return parsed_date
            except (ValueError, AttributeError):
                pass
    
    # 默认返回开票日期
    return invoice_date


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

# upload_invoice_file 端点已删除 - 使用 /api/v1/invoices/create-with-file 替代


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
        safe_file_path = validate_file_path(
            file_path, str(file_service.upload_dir))
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

    # 防止目录遍历
    if not full_path.is_relative_to(file_service.upload_dir):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的文件路径"
        )

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
