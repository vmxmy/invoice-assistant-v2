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

from alibabacloud_ocr_api20210707.client import Client as ocr_api20210707Client
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_ocr_api20210707 import models as ocr_api20210707_models
from alibabacloud_tea_util import models as util_models

from app.core.config import settings
from app.core.dependencies import get_current_user, CurrentUser
from app.schemas.ocr import (
    OCRResponse,
    InvoiceData,
    TrainTicketData,
    InvoiceType
)

logger = logging.getLogger(__name__)
router = APIRouter()


class AliyunOCRClient:
    """阿里云 OCR 客户端"""
    
    def __init__(self):
        config = open_api_models.Config(
            access_key_id=settings.alicloud_access_key_id,
            access_key_secret=settings.alicloud_access_key_secret
        )
        config.endpoint = f'ocr-api.{settings.alicloud_ocr_region}.aliyuncs.com'
        self.client = ocr_api20210707Client(config)
        self.runtime = util_models.RuntimeOptions()
    
    async def recognize_invoice(self, file_content: bytes) -> Dict[str, Any]:
        """识别增值税发票"""
        try:
            # 使用BinaryIO传递文件内容
            request = ocr_api20210707_models.RecognizeInvoiceRequest(
                body=io.BytesIO(file_content),
                page_no=1  # 指定第一页，针对PDF
            )
            
            response = self.client.recognize_invoice_with_options(request, self.runtime)
            
            if response.status_code == 200:
                return response.body.to_map()
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"阿里云 OCR 错误: {response.body}"
                )
                
        except Exception as e:
            logger.error(f"识别增值税发票失败: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def recognize_train_ticket(self, file_content: bytes) -> Dict[str, Any]:
        """识别火车票"""
        try:
            # 使用BinaryIO传递文件内容
            request = ocr_api20210707_models.RecognizeTrainInvoiceRequest(
                body=io.BytesIO(file_content)
            )
            
            response = self.client.recognize_train_invoice_with_options(request, self.runtime)
            
            if response.status_code == 200:
                return response.body.to_map()
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"阿里云 OCR 错误: {response.body}"
                )
                
        except Exception as e:
            logger.error(f"识别火车票失败: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))


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


def detect_invoice_type(file_content: bytes, filename: str) -> InvoiceType:
    """
    智能检测发票类型
    
    通过以下方式判断：
    1. PDF 内容文本分析（最准确）
    2. 文件名关键词
    3. 金额特征（火车票金额通常在几十到几千元）
    """
    import re
    
    # 先尝试分析PDF内容
    try:
        pdf_document = fitz.open(stream=file_content, filetype="pdf")
        if len(pdf_document) > 0:
            page = pdf_document[0]
            text = page.get_text()
            pdf_document.close()
            
            # 火车票特征检测
            train_features = 0
            if '火车票' in text or '铁路' in text or '动车' in text or '高铁' in text:
                train_features += 2
            if re.search(r'[GCDKTZ]\d{1,4}', text):  # 车次号
                train_features += 2
            if '站' in text and ('到' in text or '开' in text):
                train_features += 1
            if re.search(r'\d+车\d+[A-F]?号?', text):  # 座位号
                train_features += 2
            if re.search(r'\d{1,2}:\d{2}开', text):  # 开车时间
                train_features += 1
            if '电子客票' in text:
                train_features += 2
                
            # 增值税发票特征检测
            invoice_features = 0
            if '增值税' in text:
                invoice_features += 2
            if '税率' in text or '征收率' in text:
                invoice_features += 2
            if '价税合计' in text:
                invoice_features += 2
            if '销售方' in text or '销方' in text:
                invoice_features += 1
            if '购买方' in text or '购方' in text:
                invoice_features += 1
            if '*餐饮服务*' in text or '*服务*' in text:
                invoice_features += 1
                
            # 基于特征得分判断
            if train_features > invoice_features:
                return InvoiceType.TRAIN_TICKET
            elif invoice_features > train_features:
                return InvoiceType.VAT_INVOICE
    except Exception as e:
        logger.debug(f"PDF内容分析失败，回退到文件名判断: {str(e)}")
    
    # 如果PDF分析失败或无法确定，使用文件名判断
    filename_lower = filename.lower()
    
    # 检查文件名中的金额
    amount_match = re.search(r'-(\d+(?:\.\d+)?)-', filename)
    if amount_match:
        amount = float(amount_match.group(1))
        # 如果金额在典型火车票范围内，且文件名包含"国家税务总局"
        if 50 <= amount <= 2000 and '国家税务总局' in filename:
            return InvoiceType.TRAIN_TICKET
    
    # 基于文件名的关键词判断
    train_keywords = ['火车', 'train', '铁路', 'railway', '车票']
    for keyword in train_keywords:
        if keyword in filename_lower:
            return InvoiceType.TRAIN_TICKET
    
    # 默认为增值税发票
    return InvoiceType.VAT_INVOICE


def parse_invoice_data(ocr_result: Dict[str, Any]) -> Dict[str, Any]:
    """解析增值税发票 OCR 结果 - 返回完整的结构化数据"""
    import json
    
    # 处理OCR响应格式
    if 'data' in ocr_result and 'data' in ocr_result['data']:
        # 新格式：完整的结构化响应
        invoice_data = ocr_result['data']['data']
    elif 'Data' in ocr_result:
        # 旧格式：Data字段是JSON字符串
        data_str = ocr_result.get('Data', '')
        if isinstance(data_str, str):
            data = json.loads(data_str)
        else:
            data = data_str
        invoice_data = data.get('data', {})
    else:
        # 直接的数据格式
        invoice_data = ocr_result.get('data', {})
    
    # 解析发票明细项目
    invoice_details = []
    if 'invoiceDetails' in invoice_data:
        details = invoice_data['invoiceDetails']
        if isinstance(details, str):
            # 如果是JSON字符串，解析它
            try:
                details = json.loads(details)
            except (json.JSONDecodeError, TypeError):
                details = []
        
        if isinstance(details, list):
            invoice_details = details
    
    # 构建完整的结构化数据
    structured_data = {
        # 基本信息
        'invoice_type': '增值税发票',
        'invoiceType': invoice_data.get('invoiceType', '数电普通发票'),
        'title': invoice_data.get('title', ''),
        'formType': invoice_data.get('formType', ''),
        
        # 发票标识
        'invoiceCode': invoice_data.get('invoiceCode', ''),
        'invoiceNumber': invoice_data.get('invoiceNumber', ''),
        'invoiceDate': invoice_data.get('invoiceDate', ''),
        'printedInvoiceCode': invoice_data.get('printedInvoiceCode', ''),
        'printedInvoiceNumber': invoice_data.get('printedInvoiceNumber', ''),
        'checkCode': invoice_data.get('checkCode', ''),
        'machineCode': invoice_data.get('machineCode', ''),
        'specialTag': invoice_data.get('specialTag', ''),
        
        # 金额信息
        'totalAmount': invoice_data.get('totalAmount', ''),
        'invoiceTax': invoice_data.get('invoiceTax', ''),
        'invoiceAmountPreTax': invoice_data.get('invoiceAmountPreTax', ''),
        'totalAmountInWords': invoice_data.get('totalAmountInWords', ''),
        
        # 销售方信息
        'sellerName': invoice_data.get('sellerName', ''),
        'sellerTaxNumber': invoice_data.get('sellerTaxNumber', ''),
        'sellerContactInfo': invoice_data.get('sellerContactInfo', ''),
        'sellerBankAccountInfo': invoice_data.get('sellerBankAccountInfo', ''),
        
        # 购买方信息
        'purchaserName': invoice_data.get('purchaserName', ''),
        'purchaserTaxNumber': invoice_data.get('purchaserTaxNumber', ''),
        'purchaserContactInfo': invoice_data.get('purchaserContactInfo', ''),
        'purchaserBankAccountInfo': invoice_data.get('purchaserBankAccountInfo', ''),
        
        # 发票明细
        'invoiceDetails': invoice_details,
        
        # 其他信息
        'remarks': invoice_data.get('remarks', ''),
        'passwordArea': invoice_data.get('passwordArea', ''),
        'drawer': invoice_data.get('drawer', ''),
        'recipient': invoice_data.get('recipient', ''),
        'reviewer': invoice_data.get('reviewer', ''),
        
        # 置信度
        'confidence': 0.95,
        
        # 兼容旧字段名
        'invoice_code': invoice_data.get('invoiceCode', ''),
        'invoice_number': invoice_data.get('invoiceNumber', ''),
        'invoice_date': invoice_data.get('invoiceDate', ''),
        'total_amount': invoice_data.get('totalAmount', ''),
        'tax_amount': invoice_data.get('invoiceTax', ''),
        'amount_without_tax': invoice_data.get('invoiceAmountPreTax', ''),
        'seller_name': invoice_data.get('sellerName', ''),
        'seller_tax_number': invoice_data.get('sellerTaxNumber', ''),
        'buyer_name': invoice_data.get('purchaserName', ''),
        'buyer_tax_number': invoice_data.get('purchaserTaxNumber', ''),
    }
    
    # 如果有二维码信息，也保存
    if 'codes' in ocr_result.get('data', {}):
        structured_data['qr_codes'] = ocr_result['data']['codes']
    
    return structured_data


def parse_train_ticket_data(ocr_result: Dict[str, Any]) -> Dict[str, Any]:
    """解析火车票 OCR 结果 - 返回完整的结构化数据"""
    import json
    import re
    
    # 处理OCR响应格式
    if 'data' in ocr_result and 'data' in ocr_result['data']:
        # 新格式：完整的结构化响应
        ticket_data = ocr_result['data']['data']
    elif 'Data' in ocr_result:
        # 旧格式：Data字段是JSON字符串
        data_str = ocr_result.get('Data', '')
        if isinstance(data_str, str):
            data = json.loads(data_str)
        else:
            data = data_str
        ticket_data = data.get('data', {})
    else:
        # 直接的数据格式
        ticket_data = ocr_result.get('data', {})
    
    # 从departureTime中提取日期和时间
    departure_time_str = ticket_data.get('departureTime', '')
    departure_date = ''
    departure_time = ''
    if departure_time_str:
        # 格式如: "2025年03月03日09:50开"
        date_match = re.search(r'(\d{4}年\d{1,2}月\d{1,2}日)', departure_time_str)
        time_match = re.search(r'(\d{1,2}:\d{2})开?', departure_time_str)
        if date_match:
            departure_date = date_match.group(1)
        if time_match:
            departure_time = time_match.group(1)
    
    # 从passengerInfo中提取身份证号和姓名
    passenger_info = ticket_data.get('passengerInfo', '')
    id_number = ''
    extracted_passenger_name = ''
    if passenger_info:
        # 格式如: "3207051981****2012徐明扬"
        id_match = re.search(r'(\d+\*+\d+)', passenger_info)
        if id_match:
            id_number = id_match.group(1)
        # 提取身份证号后面的姓名
        name_match = re.search(r'\d+\*+\d+(.+)', passenger_info)
        if name_match:
            extracted_passenger_name = name_match.group(1).strip()
    
    # 构建完整的结构化数据
    structured_data = {
        # 基本信息
        'invoice_type': '火车票',
        'title': ticket_data.get('title', '电子发票(铁路电子客票)'),
        
        # 票务信息
        'ticketNumber': ticket_data.get('ticketNumber', ''),
        'electronicTicketNumber': ticket_data.get('electronicTicketNumber', ''),
        'ticketCode': ticket_data.get('ticketCode', ''),
        'invoiceDate': ticket_data.get('invoiceDate', ''),
        
        # 乘客信息
        'passengerName': ticket_data.get('passengerName', '') or extracted_passenger_name,
        'passengerInfo': passenger_info,
        'buyerName': ticket_data.get('buyerName', ''),
        'buyerCreditCode': ticket_data.get('buyerCreditCode', ''),
        
        # 行程信息
        'trainNumber': ticket_data.get('trainNumber', ''),
        'departureStation': ticket_data.get('departureStation', ''),
        'arrivalStation': ticket_data.get('arrivalStation', ''),
        'departureTime': departure_time_str,
        'departureDate': departure_date,
        'departure_time': departure_time,
        
        # 座位信息
        'seatNumber': ticket_data.get('seatNumber', ''),
        'seatType': ticket_data.get('seatType', ''),
        'ticketGate': ticket_data.get('ticketGate', ''),
        
        # 价格信息
        'fare': ticket_data.get('fare', ''),
        'ticket_price': ticket_data.get('fare', ''),
        
        # 其他信息
        'saleInfo': ticket_data.get('saleInfo', ''),
        'remarks': ticket_data.get('remarks', ''),
        'isCopy': ticket_data.get('isCopy', False),
        
        # 置信度
        'confidence': 0.95,
        
        # 兼容旧字段名
        'ticket_number': ticket_data.get('ticketNumber', ''),
        'passenger_name': ticket_data.get('passengerName', '') or extracted_passenger_name,
        'id_number': id_number,
        'departure_station': ticket_data.get('departureStation', ''),
        'arrival_station': ticket_data.get('arrivalStation', ''),
        'train_number': ticket_data.get('trainNumber', ''),
        'seat_number': ticket_data.get('seatNumber', ''),
    }
    
    return structured_data


@router.post("/recognize", summary="智能识别发票/票据")
async def recognize_document(
    file: UploadFile = File(..., description="PDF 文件"),
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    智能识别发票或票据
    
    - 自动判断文档类型（增值税发票或火车票）
    - 调用相应的阿里云 OCR 接口
    - 返回结构化的识别结果
    """
    # 验证文件类型
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="仅支持 PDF 格式文件")
    
    # 读取文件内容
    file_content = await file.read()
    
    # 限制文件大小 (10MB)
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="文件大小不能超过 10MB")
    
    try:
        # 检测发票类型
        invoice_type = detect_invoice_type(file_content, file.filename)
        
        # 初始化 OCR 客户端
        ocr_client = AliyunOCRClient()
        
        # 根据类型调用不同的 OCR 接口，直接使用PDF
        if invoice_type == InvoiceType.VAT_INVOICE:
            ocr_result = await ocr_client.recognize_invoice(file_content)
            parsed_data = parse_invoice_data(ocr_result)
        else:
            ocr_result = await ocr_client.recognize_train_ticket(file_content)
            parsed_data = parse_train_ticket_data(ocr_result)
        
        # 记录日志
        logger.info(
            f"用户 {current_user.id} 成功识别 {invoice_type.value}: {file.filename}"
        )
        
        return {
            "success": True,
            "message": "识别成功",
            "data": parsed_data,
            "raw_result": ocr_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR 识别失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"识别失败: {str(e)}"
        )


@router.post("/recognize/invoice", summary="识别增值税发票")
async def recognize_invoice(
    file: UploadFile = File(..., description="增值税发票 PDF 文件"),
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """强制识别为增值税发票"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="仅支持 PDF 格式文件")
    
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="文件大小不能超过 10MB")
    
    try:
        ocr_client = AliyunOCRClient()
        ocr_result = await ocr_client.recognize_invoice(file_content)
        parsed_data = parse_invoice_data(ocr_result)
        
        return {
            "success": True,
            "message": "增值税发票识别成功",
            "data": parsed_data,
            "raw_result": ocr_result
        }
        
    except Exception as e:
        logger.error(f"增值税发票识别失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"识别失败: {str(e)}")


@router.post("/recognize/train-ticket", summary="识别火车票")
async def recognize_train_ticket(
    file: UploadFile = File(..., description="火车票 PDF 文件"),
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """强制识别为火车票"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="仅支持 PDF 格式文件")
    
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="文件大小不能超过 10MB")
    
    try:
        ocr_client = AliyunOCRClient()
        ocr_result = await ocr_client.recognize_train_ticket(file_content)
        parsed_data = parse_train_ticket_data(ocr_result)
        
        return {
            "success": True,
            "message": "火车票识别成功",
            "data": parsed_data,
            "raw_result": ocr_result
        }
        
    except Exception as e:
        logger.error(f"火车票识别失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"识别失败: {str(e)}")