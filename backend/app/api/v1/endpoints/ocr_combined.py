"""
组合OCR API 端点

提供便捷的一站式OCR处理服务，内部调用模块化API
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import os

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_user, CurrentUser
from app.core.exceptions import BusinessLogicError
from app.services.aliyun_ocr_service import AliyunOCRService, get_aliyun_ocr_service
from app.services.ocr_parser_service import OCRParserService, get_ocr_parser_service
from app.api.v1.endpoints.parser import ParsedField
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


class BatchFileOCRRequest(BaseModel):
    """批量文件OCR请求"""
    file_paths: List[str] = Field(..., description="文件路径列表")
    enable_validation: bool = Field(True, description="是否启用数据验证")
    return_confidence: bool = Field(True, description="是否返回置信度信息")


class BatchOCRResult(BaseModel):
    """单个文件的OCR结果"""
    file_path: str = Field(..., description="文件路径")
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="处理消息")
    invoice_type: Optional[str] = Field(None, description="发票类型")
    fields: Optional[Dict[str, Any]] = Field(None, description="发票字段数据")
    validation: Optional[Dict[str, Any]] = Field(None, description="验证结果")
    confidence: Optional[Dict[str, Any]] = Field(None, description="置信度信息")
    processing_time: float = Field(..., description="处理耗时（秒）")
    error: Optional[str] = Field(None, description="错误信息")


class BatchOCRResponse(BaseModel):
    """批量OCR响应"""
    success: bool = Field(..., description="批量处理是否成功")
    total_files: int = Field(..., description="总文件数")
    successful_files: int = Field(..., description="成功处理的文件数")
    failed_files: int = Field(..., description="失败的文件数")
    results: List[BatchOCRResult] = Field(..., description="各文件处理结果")
    total_processing_time: float = Field(..., description="总处理时间（秒）")


@router.post("/process", response_model=CombinedOCRResponse, summary="一站式OCR处理")
async def process_invoice_ocr(
    file: UploadFile = File(..., description="PDF 文件"),
    options: CombinedOCROptions = CombinedOCROptions(),
    current_user: CurrentUser = Depends(get_current_user),
    ocr_service: AliyunOCRService = Depends(get_aliyun_ocr_service),
    parser_service: OCRParserService = Depends(get_ocr_parser_service)
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
        
        # 读取文件内容
        file_content = await file.read()
        
        # 验证文件
        ocr_service.validate_file(file_content, file.filename)
        
        # 步骤1: OCR识别
        logger.info("步骤1: 执行OCR识别")
        ocr_result = await ocr_service.recognize_mixed_invoices(file_content)
        processing_steps["ocr"] = True
        
        # 记录原始OCR响应（关键字段）
        logger.info(f"OCR原始响应 - RequestId: {ocr_result.get('RequestId', 'N/A')}")
        logger.info(f"OCR原始响应 - 处理时间: {ocr_result.get('processing_time', 'N/A')}秒")
        
        # 步骤2: 数据解析
        logger.info("步骤2: 解析OCR数据")
        
        # 使用解析服务
        invoice_type, parsed_fields = parser_service.parse_invoice_data(ocr_result)
        logger.info(f"解析结果 - 发票类型: {invoice_type}, 字段数: {len(parsed_fields)}")
        
        processing_steps["parse"] = True
        
        # 转换为简单字典格式
        raw_fields_dict = {}
        field_confidences = {}
        
        for field in parsed_fields:
            raw_fields_dict[field.original_key or field.name] = field.value
            field_confidences[field.original_key or field.name] = field.confidence
        
        # 记录解析后的原始字段
        logger.info(f"解析后原始字段: {list(raw_fields_dict.keys())}")
        logger.debug(f"解析后字段详情: {raw_fields_dict}")
        
        # 应用字段适配器，统一字段命名
        logger.info("应用字段适配器，统一字段命名")
        fields_dict = ocr_field_adapter.adapt_fields(raw_fields_dict, invoice_type)
        
        # 记录适配后的字段
        logger.info(f"适配后字段: {list(fields_dict.keys())}")
        logger.debug(f"适配后字段详情: {fields_dict}")
        
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
        
        # 记录最终响应数据
        logger.info(f"构建响应 - 发票类型: {invoice_type}")
        logger.info(f"构建响应 - 字段数: {len(fields_dict)}")
        logger.info(f"构建响应 - 包含原始OCR数据: {options.return_raw_ocr}")
        logger.info(f"构建响应 - 包含置信度信息: {options.return_confidence}")
        logger.info(f"构建响应 - 包含验证结果: {validation_result is not None}")
        
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
    current_user: CurrentUser = Depends(get_current_user),
    ocr_service: AliyunOCRService = Depends(get_aliyun_ocr_service),
    parser_service: OCRParserService = Depends(get_ocr_parser_service)
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
    
    response = await process_invoice_ocr(file, options, current_user, ocr_service, parser_service)
    
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
    current_user: CurrentUser = Depends(get_current_user),
    ocr_service: AliyunOCRService = Depends(get_aliyun_ocr_service),
    parser_service: OCRParserService = Depends(get_ocr_parser_service)
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
    
    response = await process_invoice_ocr(file, options, current_user, ocr_service, parser_service)
    
    return response.dict()


@router.post("/batch-files", response_model=BatchOCRResponse, summary="批量文件OCR处理")
async def batch_file_ocr(
    request: BatchFileOCRRequest,
    current_user: CurrentUser = Depends(get_current_user),
    ocr_service: AliyunOCRService = Depends(get_aliyun_ocr_service),
    parser_service: OCRParserService = Depends(get_ocr_parser_service)
) -> BatchOCRResponse:
    """
    批量文件OCR处理
    
    - 支持本地文件路径批量处理
    - 专为自动化流程设计
    - 返回每个文件的处理结果
    """
    start_time = datetime.utcnow()
    logger.info(f"用户 {current_user.id} 开始批量文件OCR处理，共 {len(request.file_paths)} 个文件")
    
    results = []
    successful_files = 0
    failed_files = 0
    
    for file_path in request.file_paths:
        file_start_time = datetime.utcnow()
        
        try:
            # 检查文件是否存在
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"文件不存在: {file_path}")
            
            # 检查文件类型
            if not file_path.lower().endswith('.pdf'):
                raise ValueError(f"不支持的文件类型: {file_path}")
            
            # 读取文件内容
            with open(file_path, 'rb') as f:
                file_content = f.read()
            
            filename = os.path.basename(file_path)
            
            # 验证文件
            ocr_service.validate_file(file_content, filename)
            
            # OCR识别
            ocr_result = await ocr_service.recognize_mixed_invoices(file_content)
            
            # 数据解析
            invoice_type, parsed_fields = parser_service.parse_invoice_data(ocr_result)
            
            # 转换为简单字典格式
            raw_fields_dict = {}
            field_confidences = {}
            
            for field in parsed_fields:
                raw_fields_dict[field.original_key or field.name] = field.value
                field_confidences[field.original_key or field.name] = field.confidence
            
            # 应用字段适配器
            fields_dict = ocr_field_adapter.adapt_fields(raw_fields_dict, invoice_type)
            
            # 数据验证（可选）
            validation_result = None
            if request.enable_validation:
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
                        strict_mode=False
                    )
                    
                    if validation_response.success:
                        validation_result = {
                            "is_valid": validation_response.is_valid,
                            "score": validation_response.summary.overall_score,
                            "issues": validation_response.issues,
                            "suggestions": validation_response.recommendations
                        }
                except Exception as e:
                    logger.warning(f"文件 {file_path} 验证失败: {str(e)}")
                    validation_result = {
                        "is_valid": False,
                        "score": 0.0,
                        "issues": [{"message": f"验证异常: {str(e)}"}]
                    }
            
            # 构建置信度信息
            confidence_info = None
            if request.return_confidence:
                adapted_confidences = {}
                for old_key, confidence in field_confidences.items():
                    new_key = normalize_field_name(old_key)
                    adapted_confidences[new_key] = confidence
                
                avg_confidence = sum(adapted_confidences.values()) / len(adapted_confidences) if adapted_confidences else 0
                confidence_info = {
                    "overall": avg_confidence,
                    "fields": adapted_confidences
                }
            
            # 计算处理时间
            processing_time = (datetime.utcnow() - file_start_time).total_seconds()
            
            # 创建成功结果
            result = BatchOCRResult(
                file_path=file_path,
                success=True,
                message=f"成功处理{invoice_type}",
                invoice_type=invoice_type,
                fields=fields_dict,
                validation=validation_result,
                confidence=confidence_info,
                processing_time=processing_time
            )
            
            successful_files += 1
            logger.info(f"文件 {file_path} 处理成功，耗时 {processing_time:.2f}秒")
            
        except Exception as e:
            # 计算处理时间
            processing_time = (datetime.utcnow() - file_start_time).total_seconds()
            
            # 创建失败结果
            result = BatchOCRResult(
                file_path=file_path,
                success=False,
                message="处理失败",
                processing_time=processing_time,
                error=str(e)
            )
            
            failed_files += 1
            logger.error(f"文件 {file_path} 处理失败: {str(e)}")
        
        results.append(result)
    
    # 计算总处理时间
    total_processing_time = (datetime.utcnow() - start_time).total_seconds()
    
    # 构建响应
    response = BatchOCRResponse(
        success=failed_files == 0,  # 只有所有文件都成功才算成功
        total_files=len(request.file_paths),
        successful_files=successful_files,
        failed_files=failed_files,
        results=results,
        total_processing_time=total_processing_time
    )
    
    logger.info(f"批量OCR处理完成，总耗时: {total_processing_time:.2f}秒，"
               f"成功: {successful_files}，失败: {failed_files}")
    
    return response