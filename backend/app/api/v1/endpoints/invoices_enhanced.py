"""
增强的发票处理端点

整合OCR识别、文件存储和数据库操作
"""

from typing import Optional, Dict, Any
from datetime import datetime
from uuid import uuid4
import json

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.database import get_db_session
from app.core.dependencies import get_current_user, CurrentUser
from app.models.invoice import Invoice, InvoiceStatus, InvoiceSource, ProcessingStatus
from app.services.storage.supabase_storage import SupabaseStorageService
from app.schemas.invoice import InvoiceCreate

router = APIRouter()


@router.post("/create-with-file", summary="创建发票（含文件上传）")
async def create_invoice_with_file(
    file: UploadFile = File(..., description="发票PDF文件"),
    invoice_data: str = Form(..., description="发票数据JSON字符串"),
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    """
    创建发票记录并上传文件到Supabase Storage
    
    1. 解析发票数据
    2. 上传文件到Supabase Storage
    3. 创建发票记录
    4. 使用事务确保一致性
    """
    # 解析发票数据
    try:
        invoice_dict = json.loads(invoice_data)
        # 提取完整的OCR数据
        extracted_data = invoice_dict.pop('extracted_data', {})
        invoice_create = InvoiceCreate(**invoice_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"发票数据格式错误: {str(e)}")
    
    # 验证文件
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="仅支持PDF格式文件")
    
    # 读取文件内容
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="文件大小不能超过10MB")
    
    try:
        # 检查重复发票（预检查）
        from sqlalchemy import select
        existing_query = select(Invoice).where(
            Invoice.user_id == current_user.id,
            Invoice.invoice_number == invoice_create.invoice_number,
            Invoice.deleted_at.is_(None)
        )
        existing_result = await session.execute(existing_query)
        existing_invoice = existing_result.scalar_one_or_none()
        
        if existing_invoice:
            raise HTTPException(
                status_code=409,  # Conflict
                detail={
                    "error": "duplicate_invoice",
                    "message": f"发票号码 {invoice_create.invoice_number} 已存在",
                    "existing_invoice_id": str(existing_invoice.id),
                    "existing_data": {
                        "invoice_number": existing_invoice.invoice_number,
                        "seller_name": existing_invoice.seller_name,
                        "total_amount": float(existing_invoice.total_amount or 0),
                        "invoice_date": existing_invoice.invoice_date.isoformat() if existing_invoice.invoice_date else None,
                        "created_at": existing_invoice.created_at.isoformat()
                    },
                    "options": ["update_existing", "create_new_version", "cancel"]
                }
            )
        
        # 生成文件路径
        file_ext = file.filename.split('.')[-1]
        file_name = f"{uuid4()}.{file_ext}"
        file_path = f"invoices/{current_user.id}/{datetime.now().year}/{datetime.now().month}/{file_name}"
        
        # 上传到Supabase Storage
        storage_service = SupabaseStorageService()
        file_url = await storage_service.upload_file(
            bucket_name="invoice-files",
            file_path=file_path,
            file_content=file_content,
            content_type="application/pdf"
        )
        
        # 创建发票记录
        invoice = Invoice(
            user_id=current_user.id,
            invoice_number=invoice_create.invoice_number,
            invoice_code=invoice_create.invoice_code,
            invoice_date=invoice_create.invoice_date,
            seller_name=invoice_create.seller_name,
            seller_tax_number=invoice_create.seller_tax_number,
            buyer_name=invoice_create.buyer_name,
            buyer_tax_number=invoice_create.buyer_tax_number,
            total_amount=invoice_create.total_amount,
            tax_amount=invoice_create.tax_amount,
            amount_without_tax=getattr(invoice_create, 'amount_without_tax', None) or (invoice_create.total_amount - invoice_create.tax_amount),
            invoice_type=invoice_create.invoice_type,
            file_path=file_path,  # 设置文件路径
            file_url=file_url,
            file_name=file.filename,
            file_size=len(file_content),
            ocr_confidence_score=getattr(invoice_create, 'ocr_confidence', None),
            extracted_data=extracted_data,  # 保存完整的OCR数据
            remarks=getattr(invoice_create, 'remarks', None),
            status=InvoiceStatus.ACTIVE,
            source=InvoiceSource.UPLOAD,
            processing_status=ProcessingStatus.OCR_COMPLETED  # 设置为已完成OCR
        )
        
        session.add(invoice)
        await session.commit()
        await session.refresh(invoice)
        
        return {
            "success": True,
            "message": "发票创建成功",
            "data": {
                "id": str(invoice.id),
                "invoice_number": invoice.invoice_number,
                "file_url": file_url,
                "created_at": invoice.created_at.isoformat()
            }
        }
        
    except HTTPException:
        # 重新抛出HTTP异常（如重复发票的409错误）
        raise
    except Exception as e:
        await session.rollback()
        
        # 检查是否是数据库约束违规（作为最后的防线）
        if isinstance(e, IntegrityError) and "uk_invoice_number_user" in str(e):
            # 查找已存在的发票
            existing_query = select(Invoice).where(
                Invoice.user_id == current_user.id,
                Invoice.invoice_number == invoice_create.invoice_number,
                Invoice.deleted_at.is_(None)
            )
            existing_result = await session.execute(existing_query)
            existing_invoice = existing_result.scalar_one_or_none()
            
            if existing_invoice:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "error": "duplicate_invoice_constraint",
                        "message": f"发票号码 {invoice_create.invoice_number} 已存在（数据库约束检测）",
                        "existing_invoice_id": str(existing_invoice.id),
                        "note": "这可能是由并发上传导致的，请重试或检查已有发票"
                    }
                )
        
        # 如果数据库操作失败，尝试删除已上传的文件
        try:
            # 只有在file_path和storage_service已定义时才尝试删除
            if 'file_path' in locals() and 'storage_service' in locals():
                await storage_service.delete_file("invoice-files", file_path)
        except:
            pass
        
        raise HTTPException(status_code=500, detail=f"创建发票失败: {str(e)}")