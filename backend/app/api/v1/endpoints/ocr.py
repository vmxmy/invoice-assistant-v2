"""
OCR 相关的 API 端点

处理发票和票据的智能识别和解析
"""

import os
import base64
import tempfile
import logging
from typing import Optional, Dict, Any, Union
from datetime import datetime
import fitz  # PyMuPDF
from PIL import Image
import io

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse

from app.core.dependencies import get_current_user, CurrentUser
from app.core.exceptions import BusinessLogicError
from app.schemas.ocr import OCRResponse
from app.services.aliyun_ocr_service import AliyunOCRService, get_aliyun_ocr_service
from app.services.ocr_parser_service import OCRParserService, get_ocr_parser_service
from app.services.ocr_data_parser import OCRDataParser, get_ocr_data_parser

logger = logging.getLogger(__name__)
router = APIRouter()




def extract_pdf_first_page(pdf_content: bytes) -> bytes:
    """提取 PDF 第一页并转换为图片（仅在必要时使用）"""
    try:
        # 打开 PDF
        pdf_document = fitz.open(stream=pdf_content, filetype="pdf")
        
        # 获取第一页
        page = pdf_document[0]
        
        # 渲染页面为图片 (300 DPI)
        mat = fitz.Matrix(300/72, 300/72)
        pix = page.get_pixmap(matrix=mat)
        
        # 转换为 PNG 格式
        img_data = pix.pil_tobytes(format="PNG")
        
        pdf_document.close()
        
        return img_data
        
    except Exception as e:
        logger.error(f"提取 PDF 第一页失败: {str(e)}")
        raise HTTPException(status_code=400, detail=f"PDF 处理失败: {str(e)}")


@router.post("/recognize", summary="阿里云OCR原始识别接口")
async def recognize_document(
    file: UploadFile = File(..., description="PDF 文件"),
    current_user: CurrentUser = Depends(get_current_user),
    ocr_service: AliyunOCRService = Depends(get_aliyun_ocr_service),
    parser_service: OCRParserService = Depends(get_ocr_parser_service)
) -> Dict[str, Any]:
    """
    使用阿里云 RecognizeMixedInvoices 统一识别接口
    
    - 直接调用阿里云OCR服务
    - 返回阿里云OCR的原始响应数据
    - 不进行任何解析或字段映射处理
    """
    # 读取文件内容
    file_content = await file.read()
    
    try:
        # 使用服务层验证文件
        ocr_service.validate_file(file_content, file.filename)
        
        # 调用OCR服务识别
        ocr_result = await ocr_service.recognize_invoice_raw(file_content)
        
        # 记录日志
        logger.info(f"用户 {current_user.id} 成功调用阿里云OCR识别: {file.filename}")
        
        return {
            "success": True,
            "message": "OCR识别成功",
            "data": ocr_result,  # 直接返回阿里云OCR原始数据
            "file_info": {
                "filename": file.filename,
                "size": len(file_content),
                "user_id": str(current_user.id)
            }
        }
        
    except BusinessLogicError as e:
        logger.error(f"业务逻辑错误: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"阿里云OCR调用失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"OCR识别失败: {str(e)}"
        )


