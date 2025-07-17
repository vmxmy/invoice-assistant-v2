"""
组合OCR API 端点

提供便捷的一站式OCR处理服务，内部调用模块化API
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_user, CurrentUser
from app.api.v1.endpoints.ocr import AliyunOCRClient
from app.api.v1.endpoints.parser import extract_invoice_type, parse_vat_invoice, parse_train_ticket, parse_general_invoice, ParsedField
from app.api.v1.endpoints.validator import validate_invoice_with_schema
from app.adapters.ocr_field_adapter import ocr_field_adapter

logger = logging.getLogger(__name__)
router = APIRouter()


class CombinedOCROptions(BaseModel):
    """组合OCR选项"""
    enable_validation: bool = Field(True, description="是否启用数据验证")
    strict_validation: bool = Field(False, description="是否使用严格验证模式")
    return_raw_ocr: bool = Field(False, description="是否返回原始OCR数据")
    return_confidence: bool = Field(True, description="是否返回置信度信息")


class CombinedOCRResponse(BaseModel):
    """组合OCR响应"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    invoice_type: str = Field(..., description="发票类型")
    
    # 解析后的字段（简化格式）
    fields: Dict[str, Any] = Field(..., description="发票字段数据")
    
    # 验证结果
    validation: Optional[Dict[str, Any]] = Field(None, description="验证结果")
    
    # 置信度信息
    confidence: Optional[Dict[str, Any]] = Field(None, description="置信度信息")
    
    # 原始数据（可选）
    raw_ocr_data: Optional[Dict[str, Any]] = Field(None, description="原始OCR数据")
    
    # 处理信息
    processing_time: float = Field(..., description="处理耗时（秒）")
    processing_steps: Dict[str, bool] = Field(..., description="处理步骤完成情况")


@router.post("/process", response_model=CombinedOCRResponse, summary="一站式OCR处理")
async def process_invoice_ocr(
    file: UploadFile = File(..., description="PDF 文件"),
    options: CombinedOCROptions = CombinedOCROptions(),
    current_user: CurrentUser = Depends(get_current_user)
) -> CombinedOCRResponse:
    """
    一站式OCR处理服务
    
    内部流程：
    1. 调用OCR识别服务
    2. 解析OCR数据
    3. 验证数据有效性（可选）
    4. 返回结构化结果
    """
    start_time = datetime.utcnow()
    processing_steps = {
        "ocr": False,
        "parse": False,
        "validate": False
    }
    
    try:
        logger.info(f"用户 {current_user.id} 开始一站式OCR处理: {file.filename}")
        
        # 验证文件类型
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="仅支持 PDF 格式文件")
        
        # 读取文件内容
        file_content = await file.read()
        
        # 限制文件大小 (10MB)
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="文件大小不能超过 10MB")
        
        # 步骤1: OCR识别
        logger.info("步骤1: 执行OCR识别")
        ocr_client = AliyunOCRClient()
        ocr_result = await ocr_client.recognize_mixed_invoices(file_content)
        processing_steps["ocr"] = True
        
        # 步骤2: 数据解析
        logger.info("步骤2: 解析OCR数据")
        
        # 提取发票类型
        invoice_type = extract_invoice_type(ocr_result)
        
        # 解析数据
        import json
        data_str = ocr_result.get('Data', '')
        if not data_str:
            raise ValueError("OCR未返回有效数据")
        
        data = json.loads(data_str)
        sub_msgs = data.get('subMsgs', [])
        
        if not sub_msgs:
            raise ValueError("未识别到发票内容")
        
        first_msg = sub_msgs[0]
        result = first_msg.get('result', {})
        invoice_data = result.get('data', {})
        
        # 根据类型解析字段（传递完整的result，包含prism_keyValueInfo）
        parsed_fields = []
        if '增值税' in invoice_type:
            parsed_fields = parse_vat_invoice(result)
        elif '火车票' in invoice_type:
            parsed_fields = parse_train_ticket(result)
        else:
            parsed_fields = parse_general_invoice(result)
        
        processing_steps["parse"] = True
        
        # 转换为简单字典格式
        raw_fields_dict = {}
        field_confidences = {}
        
        for field in parsed_fields:
            raw_fields_dict[field.original_key or field.name] = field.value
            field_confidences[field.original_key or field.name] = field.confidence
        
        # 应用字段适配器，统一字段命名
        logger.info("应用字段适配器，统一字段命名")
        fields_dict = ocr_field_adapter.adapt_fields(raw_fields_dict, invoice_type)
        
        # 步骤3: 数据验证（可选）
        validation_result = None
        if options.enable_validation:
            logger.info("步骤3: 验证数据有效性")
            
            # 构建验证数据（使用适配后的字段）
            validation_fields = fields_dict.copy()
            validation_confidences = {}
            
            # 适配置信度信息到新的字段名
            from app.utils.field_mapping import normalize_field_name
            for old_key, confidence in field_confidences.items():
                new_key = normalize_field_name(old_key)
                validation_confidences[new_key] = confidence
            
            # 执行验证
            try:
                validation_response = validate_invoice_with_schema(
                    invoice_type=invoice_type,
                    data=validation_fields,
                    confidences=validation_confidences,
                    strict_mode=options.strict_validation
                )
                
                logger.info(f"验证响应 - Success: {validation_response.success}, Is Valid: {validation_response.is_valid}, Score: {validation_response.summary.overall_score}")
                
                if validation_response.success:
                    validation_result = {
                        "is_valid": validation_response.is_valid,
                        "score": validation_response.summary.overall_score,
                        "issues": validation_response.issues,
                        "suggestions": validation_response.recommendations,
                        "summary": {
                            "total_fields": validation_response.summary.total_fields,
                            "valid_fields": validation_response.summary.valid_fields,
                            "invalid_fields": validation_response.summary.invalid_fields
                        }
                    }
                    processing_steps["validate"] = True
                else:
                    logger.warning(f"验证失败: {validation_response.message}")
                    validation_result = {
                        "is_valid": False,
                        "score": 0.0,
                        "issues": [{"message": validation_response.message}],
                        "suggestions": [],
                        "summary": {
                            "total_fields": 0,
                            "valid_fields": 0,
                            "invalid_fields": 0
                        }
                    }
            except Exception as e:
                logger.error(f"验证过程中发生异常: {str(e)}")
                validation_result = {
                    "is_valid": None,
                    "score": None,
                    "issues": [{"message": f"验证异常: {str(e)}"}],
                    "suggestions": [],
                    "summary": {
                        "total_fields": 0,
                        "valid_fields": 0,
                        "invalid_fields": 0
                    }
                }
        
        # 构建置信度信息（使用适配后的字段名）
        confidence_info = None
        if options.return_confidence:
            adapted_confidences = {}
            for old_key, confidence in field_confidences.items():
                new_key = normalize_field_name(old_key)
                adapted_confidences[new_key] = confidence
            
            avg_confidence = sum(adapted_confidences.values()) / len(adapted_confidences) if adapted_confidences else 0
            confidence_info = {
                "overall": avg_confidence,
                "fields": adapted_confidences,
                "low_confidence_fields": [k for k, v in adapted_confidences.items() if v < 0.8]
            }
        
        # 计算处理时间
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        # 构建响应
        response = CombinedOCRResponse(
            success=True,
            message=f"成功处理{invoice_type}",
            invoice_type=invoice_type,
            fields=fields_dict,
            validation=validation_result,
            confidence=confidence_info,
            raw_ocr_data=ocr_result if options.return_raw_ocr else None,
            processing_time=processing_time,
            processing_steps=processing_steps
        )
        
        logger.info(f"一站式OCR处理完成，耗时: {processing_time:.2f}秒")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"一站式OCR处理失败: {str(e)}")
        
        # 计算处理时间
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        # 返回错误响应
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "message": f"处理失败: {str(e)}",
                "processing_time": processing_time,
                "processing_steps": processing_steps
            }
        )


@router.post("/quick", summary="快速OCR识别")
async def quick_ocr(
    file: UploadFile = File(..., description="PDF 文件"),
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    快速OCR识别（无验证）
    
    - 只执行OCR和解析
    - 不进行数据验证
    - 返回简化结果
    """
    options = CombinedOCROptions(
        enable_validation=False,
        return_raw_ocr=False,
        return_confidence=False
    )
    
    response = await process_invoice_ocr(file, options, current_user)
    
    # 返回简化结果
    return {
        "success": response.success,
        "invoice_type": response.invoice_type,
        "fields": response.fields,
        "processing_time": response.processing_time
    }


@router.post("/full", summary="完整OCR处理")
async def full_ocr(
    file: UploadFile = File(..., description="PDF 文件"),
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    完整OCR处理（包含所有信息）
    
    - 执行完整的OCR、解析和验证
    - 返回所有可用信息
    - 包含原始数据和置信度
    """
    options = CombinedOCROptions(
        enable_validation=True,
        strict_validation=True,
        return_raw_ocr=True,
        return_confidence=True
    )
    
    response = await process_invoice_ocr(file, options, current_user)
    
    return response.dict()