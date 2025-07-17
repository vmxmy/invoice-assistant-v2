"""
数据验证 API 端点 (重构版本)

负责验证发票数据的有效性和完整性
使用字段定义系统进行智能验证
"""

import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_user, CurrentUser
from app.schemas.invoice_base import BaseInvoice, ValidationStatus, ValidationIssue
from app.schemas.field_definitions import (
    get_field_schema, validate_invoice_data, FieldDefinition, InvoiceFieldSchema
)
from app.services.invoice_adapters import AdapterFactory, convert_from_storage

logger = logging.getLogger(__name__)
router = APIRouter()


class ValidationRequest(BaseModel):
    """验证请求模型"""
    invoice_type: str = Field(..., description="发票类型")
    data: Union[Dict[str, Any], BaseInvoice] = Field(..., description="待验证的发票数据")
    confidences: Optional[Dict[str, float]] = Field(None, description="字段置信度")
    validation_options: Optional[Dict[str, Any]] = Field(default_factory=dict, description="验证选项")
    strict_mode: bool = Field(False, description="严格模式：所有必填字段都必须存在")


class FieldValidationResult(BaseModel):
    """单个字段验证结果"""
    field_name: str = Field(..., description="字段名称")
    field_key: str = Field(..., description="字段键名")
    is_valid: bool = Field(..., description="是否有效")
    value: Any = Field(None, description="字段值")
    confidence: float = Field(0.0, description="置信度")
    issues: List[str] = Field(default_factory=list, description="验证问题")
    suggestions: List[str] = Field(default_factory=list, description="改进建议")


class ValidationSummary(BaseModel):
    """验证摘要"""
    total_fields: int = Field(..., description="总字段数")
    valid_fields: int = Field(..., description="有效字段数")
    invalid_fields: int = Field(..., description="无效字段数")
    missing_required: int = Field(..., description="缺失必填字段数")
    low_confidence: int = Field(..., description="低置信度字段数")
    overall_score: float = Field(..., description="总体评分(0-1)")
    confidence_score: float = Field(..., description="置信度评分(0-1)")


class ValidationResponse(BaseModel):
    """验证响应模型"""
    success: bool = Field(..., description="验证是否成功执行")
    message: str = Field(..., description="响应消息")
    is_valid: bool = Field(..., description="数据是否通过验证")
    validation_status: ValidationStatus = Field(..., description="验证状态")
    summary: ValidationSummary = Field(..., description="验证摘要")
    field_results: List[FieldValidationResult] = Field(..., description="字段验证结果")
    issues: List[Dict[str, Any]] = Field(default_factory=list, description="验证问题列表")
    recommendations: List[str] = Field(default_factory=list, description="改进建议")
    validation_time: str = Field(..., description="验证时间")


def validate_invoice_with_schema(
    invoice_type: str, 
    data: Dict[str, Any], 
    confidences: Dict[str, float] = None,
    strict_mode: bool = False
) -> ValidationResponse:
    """
    使用字段定义系统验证发票数据
    
    Args:
        invoice_type: 发票类型
        data: 发票数据
        confidences: 字段置信度
        strict_mode: 严格模式
        
    Returns:
        验证响应
    """
    start_time = datetime.utcnow()
    
    # 获取字段定义
    field_schema = get_field_schema(invoice_type)
    if not field_schema:
        raise ValueError(f"不支持的发票类型: {invoice_type}")
    
    if confidences is None:
        confidences = {}
    
    # 初始化结果
    field_results = []
    issues = []
    recommendations = []
    
    valid_count = 0
    missing_required = 0
    low_confidence_count = 0
    
    # 验证每个字段
    for field_key, field_def in field_schema.fields.items():
        value = data.get(field_key)
        confidence = confidences.get(field_key, 1.0)
        
        # 执行字段验证
        is_valid, errors = field_def.validate_value(value, confidence)
        
        field_result = FieldValidationResult(
            field_name=field_def.name,
            field_key=field_key,
            is_valid=is_valid,
            value=value,
            confidence=confidence,
            issues=errors,
            suggestions=[]
        )
        
        # 统计信息
        if is_valid:
            valid_count += 1
        
        if field_def.is_required and (value is None or value == ""):
            missing_required += 1
            field_result.suggestions.append(f"请提供{field_def.name}")
        
        if confidence < field_def.confidence_threshold:
            low_confidence_count += 1
            field_result.suggestions.append(f"建议人工复核{field_def.name}")
        
        # 添加字段级别问题
        for error in errors:
            issues.append({
                "field_name": field_def.name,
                "field_key": field_key,
                "severity": "error",
                "message": error,
                "category": "field_validation"
            })
        
        field_results.append(field_result)
    
    # 检查额外字段（不在字段定义中的字段）
    schema_fields = set(field_schema.fields.keys())
    data_fields = set(data.keys())
    extra_fields = data_fields - schema_fields
    
    for extra_field in extra_fields:
        value = data[extra_field]
        confidence = confidences.get(extra_field, 1.0)
        
        field_result = FieldValidationResult(
            field_name=extra_field,
            field_key=extra_field,
            is_valid=True,  # 额外字段默认有效
            value=value,
            confidence=confidence,
            issues=[],
            suggestions=["此字段不在标准字段定义中"]
        )
        field_results.append(field_result)
    
    # 计算总体评分
    total_fields = len(field_results)
    overall_score = valid_count / total_fields if total_fields > 0 else 0.0
    
    # 计算置信度评分
    total_confidence = sum(confidences.values()) if confidences else 0.0
    confidence_score = total_confidence / len(confidences) if confidences else 0.0
    
    # 生成建议
    if missing_required > 0:
        recommendations.append(f"请补充{missing_required}个必填字段")
    
    if low_confidence_count > 0:
        recommendations.append(f"建议人工复核{low_confidence_count}个低置信度字段")
    
    if overall_score < 0.8:
        recommendations.append("建议重新进行OCR识别或人工校对")
    
    # 确定验证状态
    if missing_required > 0 or overall_score < 0.5:
        validation_status = ValidationStatus.INVALID
        is_valid = False
    elif low_confidence_count > 0 or overall_score < 0.8:
        validation_status = ValidationStatus.WARNING
        is_valid = True
    else:
        validation_status = ValidationStatus.VALID
        is_valid = True
    
    # 构建摘要
    summary = ValidationSummary(
        total_fields=total_fields,
        valid_fields=valid_count,
        invalid_fields=total_fields - valid_count,
        missing_required=missing_required,
        low_confidence=low_confidence_count,
        overall_score=overall_score,
        confidence_score=confidence_score
    )
    
    # 严格模式检查
    if strict_mode and missing_required > 0:
        is_valid = False
        validation_status = ValidationStatus.INVALID
        recommendations.append("严格模式：所有必填字段都必须有效")
    
    return ValidationResponse(
        success=True,
        message=f"验证完成，{valid_count}/{total_fields}个字段有效",
        is_valid=is_valid,
        validation_status=validation_status,
        summary=summary,
        field_results=field_results,
        issues=issues,
        recommendations=recommendations,
        validation_time=datetime.utcnow().isoformat()
    )


@router.post("/", response_model=ValidationResponse, summary="验证发票数据")
async def validate_invoice_data_endpoint(
    request: ValidationRequest,
    current_user: CurrentUser = Depends(get_current_user)
) -> ValidationResponse:
    """
    验证发票数据的有效性和完整性
    
    使用字段定义系统进行智能验证：
    - 字段类型验证
    - 必填字段检查
    - 格式和范围验证
    - 置信度评估
    - 自定义规则验证
    """
    try:
        logger.info(f"用户 {current_user.id} 开始验证发票数据，类型: {request.invoice_type}")
        
        # 转换数据格式
        if isinstance(request.data, BaseInvoice):
            data = request.data.to_dict()
            confidences = request.data.field_confidences
        else:
            data = request.data
            confidences = request.confidences or {}
        
        # 执行验证
        result = validate_invoice_with_schema(
            invoice_type=request.invoice_type,
            data=data,
            confidences=confidences,
            strict_mode=request.strict_mode
        )
        
        logger.info(f"验证完成，状态: {result.validation_status}, 评分: {result.summary.overall_score:.2f}")
        
        return result
        
    except ValueError as e:
        logger.error(f"验证失败: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"验证发票数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"验证失败: {str(e)}")


@router.post("/batch", summary="批量验证发票数据")
async def validate_invoice_batch(
    requests: List[ValidationRequest],
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    批量验证多个发票数据
    
    - 支持同时验证多个发票
    - 返回每个验证的结果和统计信息
    """
    results = []
    success_count = 0
    
    for idx, request in enumerate(requests):
        try:
            response = await validate_invoice_data_endpoint(request, current_user)
            results.append({
                'index': idx,
                'success': response.success,
                'is_valid': response.is_valid,
                'data': response.dict()
            })
            if response.is_valid:
                success_count += 1
        except Exception as e:
            results.append({
                'index': idx,
                'success': False,
                'is_valid': False,
                'error': str(e)
            })
    
    return {
        'total': len(requests),
        'valid': success_count,
        'invalid': len(requests) - success_count,
        'results': results
    }


@router.get("/rules/{invoice_type}", summary="获取发票类型验证规则")
async def get_validation_rules(
    invoice_type: str
) -> Dict[str, Any]:
    """
    获取指定发票类型的验证规则
    """
    try:
        field_schema = get_field_schema(invoice_type)
        if not field_schema:
            raise HTTPException(status_code=404, detail=f"不支持的发票类型: {invoice_type}")
        
        rules = {}
        for field_key, field_def in field_schema.fields.items():
            field_rules = {
                "name": field_def.name,
                "type": field_def.field_type,
                "required": field_def.is_required,
                "confidence_threshold": field_def.confidence_threshold,
                "validation_rules": [
                    {
                        "type": rule.rule_type,
                        "parameters": rule.parameters,
                        "message": rule.error_message,
                        "severity": rule.severity
                    }
                    for rule in field_def.validation_rules
                ],
                "constraints": {
                    "min_length": field_def.min_length,
                    "max_length": field_def.max_length,
                    "min_value": field_def.min_value,
                    "max_value": field_def.max_value,
                    "pattern": field_def.pattern
                }
            }
            rules[field_key] = field_rules
        
        return {
            "invoice_type": field_schema.invoice_type,
            "total_rules": len(rules),
            "required_fields": [key for key, field in field_schema.fields.items() if field.is_required],
            "core_fields": [key for key, field in field_schema.fields.items() if field.is_core],
            "rules": rules
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取验证规则失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取验证规则失败")


@router.post("/custom", summary="自定义规则验证")
async def validate_with_custom_rules(
    invoice_type: str,
    data: Dict[str, Any],
    custom_rules: List[Dict[str, Any]],
    current_user: CurrentUser = Depends(get_current_user)
) -> ValidationResponse:
    """
    使用自定义规则验证发票数据
    
    允许用户定义额外的验证规则
    """
    try:
        logger.info(f"用户 {current_user.id} 开始自定义规则验证")
        
        # 首先执行标准验证
        result = validate_invoice_with_schema(invoice_type, data)
        
        # 应用自定义规则
        for rule in custom_rules:
            field_name = rule.get('field_name')
            rule_type = rule.get('rule_type')
            rule_config = rule.get('config', {})
            error_message = rule.get('error_message', f'{field_name}不符合自定义规则')
            
            field_value = data.get(field_name)
            
            # 简单的自定义规则实现
            if rule_type == "custom_format" and field_value:
                pattern = rule_config.get('pattern')
                if pattern and not re.match(pattern, str(field_value)):
                    result.issues.append({
                        "field_name": field_name,
                        "field_key": field_name,
                        "severity": "error",
                        "message": error_message,
                        "category": "custom_rule"
                    })
                    result.is_valid = False
            
            elif rule_type == "custom_range" and field_value:
                try:
                    value = float(field_value)
                    min_val = rule_config.get('min')
                    max_val = rule_config.get('max')
                    if (min_val is not None and value < min_val) or \
                       (max_val is not None and value > max_val):
                        result.issues.append({
                            "field_name": field_name,
                            "field_key": field_name,
                            "severity": "error",
                            "message": error_message,
                            "category": "custom_rule"
                        })
                        result.is_valid = False
                except ValueError:
                    pass
        
        # 更新验证状态
        if not result.is_valid:
            result.validation_status = ValidationStatus.INVALID
        
        logger.info(f"自定义规则验证完成，应用了{len(custom_rules)}个规则")
        
        return result
        
    except Exception as e:
        logger.error(f"自定义规则验证失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"验证失败: {str(e)}")


@router.get("/stats/{invoice_type}", summary="获取发票类型验证统计")
async def get_validation_stats(
    invoice_type: str,
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    获取指定发票类型的验证统计信息
    
    （此接口可以扩展为从数据库获取历史验证统计）
    """
    try:
        field_schema = get_field_schema(invoice_type)
        if not field_schema:
            raise HTTPException(status_code=404, detail=f"不支持的发票类型: {invoice_type}")
        
        return {
            "invoice_type": field_schema.invoice_type,
            "field_count": len(field_schema.fields),
            "required_fields": len([f for f in field_schema.fields.values() if f.is_required]),
            "core_fields": len([f for f in field_schema.fields.values() if f.is_core]),
            "field_categories": {
                category: len([f for f in field_schema.fields.values() if f.category == category])
                for category in set(f.category for f in field_schema.fields.values())
            },
            "validation_complexity": {
                "total_rules": sum(len(f.validation_rules) for f in field_schema.fields.values()),
                "pattern_rules": sum(1 for f in field_schema.fields.values() if f.pattern),
                "range_rules": sum(1 for f in field_schema.fields.values() if f.min_value or f.max_value)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取验证统计失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取验证统计失败")