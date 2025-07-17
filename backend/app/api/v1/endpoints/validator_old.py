"""
数据验证 API 端点

负责验证解析后的发票数据的有效性和完整性
"""

import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_user, CurrentUser

logger = logging.getLogger(__name__)
router = APIRouter()


class ValidationRule(BaseModel):
    """验证规则"""
    field_name: str = Field(..., description="字段名称")
    rule_type: str = Field(..., description="规则类型: required|format|range|custom")
    rule_config: Dict[str, Any] = Field(default_factory=dict, description="规则配置")
    error_message: str = Field(..., description="错误提示信息")


class ValidationRequest(BaseModel):
    """验证请求模型"""
    invoice_type: str = Field(..., description="发票类型")
    fields: Dict[str, Any] = Field(..., description="待验证的字段数据")
    validation_rules: Optional[List[ValidationRule]] = Field(None, description="自定义验证规则")
    strict_mode: bool = Field(False, description="严格模式：所有必填字段都必须存在")


class ValidationIssue(BaseModel):
    """验证问题"""
    field_name: str = Field(..., description="字段名称")
    issue_type: str = Field(..., description="问题类型: missing|invalid_format|out_of_range|custom")
    severity: str = Field(..., description="严重程度: error|warning|info")
    message: str = Field(..., description="问题描述")
    expected_value: Optional[str] = Field(None, description="期望值或格式")
    actual_value: Optional[str] = Field(None, description="实际值")


class ValidationResult(BaseModel):
    """验证结果"""
    is_valid: bool = Field(..., description="是否通过验证")
    validation_score: float = Field(..., description="验证分数(0-1)")
    issues: List[ValidationIssue] = Field(default_factory=list, description="验证问题列表")
    suggestions: List[str] = Field(default_factory=list, description="改进建议")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="验证元数据")


class ValidationResponse(BaseModel):
    """验证响应模型"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    data: Optional[ValidationResult] = Field(None, description="验证结果")
    validation_time: str = Field(..., description="验证时间")


# 预定义的验证规则
DEFAULT_RULES = {
    "增值税发票": [
        ValidationRule(
            field_name="发票号码",
            rule_type="format",
            rule_config={"pattern": r"^\d{8,20}$"},
            error_message="发票号码应为8-20位数字"
        ),
        ValidationRule(
            field_name="发票代码",
            rule_type="format",
            rule_config={"pattern": r"^\d{10,12}$"},
            error_message="发票代码应为10-12位数字"
        ),
        ValidationRule(
            field_name="开票日期",
            rule_type="format",
            rule_config={"pattern": r"^\d{4}-\d{2}-\d{2}$"},
            error_message="日期格式应为YYYY-MM-DD"
        ),
        ValidationRule(
            field_name="价税合计",
            rule_type="required",
            rule_config={},
            error_message="价税合计金额不能为空"
        ),
        ValidationRule(
            field_name="销售方名称",
            rule_type="required",
            rule_config={},
            error_message="销售方名称不能为空"
        ),
        ValidationRule(
            field_name="销售方纳税人识别号",
            rule_type="format",
            rule_config={"pattern": r"^[A-Z0-9]{15,20}$"},
            error_message="纳税人识别号格式不正确"
        )
    ],
    "火车票": [
        ValidationRule(
            field_name="车票号",
            rule_type="required",
            rule_config={},
            error_message="车票号不能为空"
        ),
        ValidationRule(
            field_name="车次",
            rule_type="format",
            rule_config={"pattern": r"^[A-Z]\d{1,4}$|^\d{4}$"},
            error_message="车次格式不正确"
        ),
        ValidationRule(
            field_name="出发站",
            rule_type="required",
            rule_config={},
            error_message="出发站不能为空"
        ),
        ValidationRule(
            field_name="到达站",
            rule_type="required",
            rule_config={},
            error_message="到达站不能为空"
        ),
        ValidationRule(
            field_name="票价",
            rule_type="range",
            rule_config={"min": 0, "max": 10000},
            error_message="票价范围应在0-10000元之间"
        )
    ]
}


def validate_required(field_value: Any, rule_config: Dict[str, Any]) -> bool:
    """验证必填字段"""
    if field_value is None:
        return False
    if isinstance(field_value, str) and not field_value.strip():
        return False
    return True


def validate_format(field_value: Any, rule_config: Dict[str, Any]) -> bool:
    """验证格式"""
    if field_value is None:
        return True  # 空值不验证格式
    
    pattern = rule_config.get('pattern')
    if not pattern:
        return True
    
    try:
        return bool(re.match(pattern, str(field_value)))
    except Exception:
        return False


def validate_range(field_value: Any, rule_config: Dict[str, Any]) -> bool:
    """验证数值范围"""
    if field_value is None:
        return True  # 空值不验证范围
    
    try:
        value = float(str(field_value).replace(',', ''))
        min_val = rule_config.get('min', float('-inf'))
        max_val = rule_config.get('max', float('inf'))
        return min_val <= value <= max_val
    except (ValueError, TypeError):
        return False


def validate_date(field_value: Any) -> bool:
    """验证日期格式和有效性"""
    if field_value is None:
        return True
    
    try:
        # 尝试解析日期
        date_str = str(field_value)
        if '-' in date_str:
            year, month, day = date_str.split('-')
        elif '年' in date_str:
            # 处理中文日期格式
            date_str = date_str.replace('年', '-').replace('月', '-').replace('日', '')
            year, month, day = date_str.split('-')
        else:
            return False
        
        # 验证日期有效性
        parsed_date = date(int(year), int(month), int(day))
        
        # 检查日期合理性（不能是未来日期，不能太久远）
        today = date.today()
        if parsed_date > today:
            return False
        if parsed_date.year < 2000:
            return False
        
        return True
    except Exception:
        return False


def validate_amount(field_value: Any) -> bool:
    """验证金额格式"""
    if field_value is None:
        return True
    
    try:
        # 移除可能的货币符号和千分位
        amount_str = str(field_value).replace('¥', '').replace(',', '').strip()
        amount = Decimal(amount_str)
        
        # 金额应该是正数
        if amount < 0:
            return False
        
        # 检查小数位数（最多2位）
        if amount.as_tuple().exponent < -2:
            return False
        
        return True
    except (InvalidOperation, ValueError):
        return False


def validate_tax_number(field_value: Any) -> bool:
    """验证纳税人识别号"""
    if field_value is None or str(field_value).strip() == '':
        return True  # 允许为空
    
    tax_number = str(field_value).strip().upper()
    
    # 统一社会信用代码：18位
    if len(tax_number) == 18:
        return bool(re.match(r'^[0-9A-Z]{18}$', tax_number))
    
    # 旧版税号：15位
    if len(tax_number) == 15:
        return bool(re.match(r'^[0-9]{15}$', tax_number))
    
    # 个人纳税识别号：20位
    if len(tax_number) == 20:
        return bool(re.match(r'^[0-9A-Z]{20}$', tax_number))
    
    return False


@router.post("/", response_model=ValidationResponse, summary="验证发票数据")
async def validate_invoice_data(
    request: ValidationRequest,
    current_user: CurrentUser = Depends(get_current_user)
) -> ValidationResponse:
    """
    验证发票数据的有效性
    
    - 根据发票类型应用相应的验证规则
    - 支持自定义验证规则
    - 返回详细的验证结果和改进建议
    """
    try:
        logger.info(f"用户 {current_user.id} 开始验证{request.invoice_type}数据")
        
        issues = []
        suggestions = []
        
        # 获取默认验证规则
        default_rules = DEFAULT_RULES.get(request.invoice_type, [])
        
        # 合并自定义规则
        all_rules = default_rules + (request.validation_rules or [])
        
        # 执行验证
        for rule in all_rules:
            field_value = request.fields.get(rule.field_name)
            
            # 执行不同类型的验证
            is_valid = True
            actual_value = str(field_value) if field_value is not None else "空"
            
            if rule.rule_type == "required":
                is_valid = validate_required(field_value, rule.rule_config)
                if not is_valid:
                    issues.append(ValidationIssue(
                        field_name=rule.field_name,
                        issue_type="missing",
                        severity="error",
                        message=rule.error_message,
                        expected_value="非空值",
                        actual_value=actual_value
                    ))
            
            elif rule.rule_type == "format":
                is_valid = validate_format(field_value, rule.rule_config)
                if not is_valid and field_value is not None:
                    issues.append(ValidationIssue(
                        field_name=rule.field_name,
                        issue_type="invalid_format",
                        severity="error",
                        message=rule.error_message,
                        expected_value=rule.rule_config.get('pattern', ''),
                        actual_value=actual_value
                    ))
            
            elif rule.rule_type == "range":
                is_valid = validate_range(field_value, rule.rule_config)
                if not is_valid and field_value is not None:
                    min_val = rule.rule_config.get('min', '无限制')
                    max_val = rule.rule_config.get('max', '无限制')
                    issues.append(ValidationIssue(
                        field_name=rule.field_name,
                        issue_type="out_of_range",
                        severity="warning",
                        message=rule.error_message,
                        expected_value=f"{min_val} - {max_val}",
                        actual_value=actual_value
                    ))
        
        # 特殊字段验证
        if "开票日期" in request.fields:
            if not validate_date(request.fields["开票日期"]):
                issues.append(ValidationIssue(
                    field_name="开票日期",
                    issue_type="invalid_format",
                    severity="error",
                    message="日期格式无效或日期不合理",
                    expected_value="YYYY-MM-DD",
                    actual_value=str(request.fields["开票日期"])
                ))
        
        if "价税合计" in request.fields:
            if not validate_amount(request.fields["价税合计"]):
                issues.append(ValidationIssue(
                    field_name="价税合计",
                    issue_type="invalid_format",
                    severity="error",
                    message="金额格式无效",
                    expected_value="数字格式，最多2位小数",
                    actual_value=str(request.fields["价税合计"])
                ))
        
        if "销售方纳税人识别号" in request.fields:
            if not validate_tax_number(request.fields["销售方纳税人识别号"]):
                issues.append(ValidationIssue(
                    field_name="销售方纳税人识别号",
                    issue_type="invalid_format",
                    severity="warning",
                    message="纳税人识别号格式可能不正确",
                    expected_value="15位、18位或20位",
                    actual_value=str(request.fields["销售方纳税人识别号"])
                ))
        
        # 计算验证分数
        total_rules = len(all_rules)
        error_count = sum(1 for issue in issues if issue.severity == "error")
        warning_count = sum(1 for issue in issues if issue.severity == "warning")
        
        if total_rules > 0:
            validation_score = max(0, 1 - (error_count * 0.2 + warning_count * 0.1))
        else:
            validation_score = 1.0
        
        # 生成建议
        if error_count > 0:
            suggestions.append(f"发现{error_count}个必须修正的错误，请检查标记为错误的字段")
        
        if warning_count > 0:
            suggestions.append(f"发现{warning_count}个警告，建议进行人工复核")
        
        if validation_score == 1.0:
            suggestions.append("所有字段验证通过，数据质量良好")
        elif validation_score >= 0.8:
            suggestions.append("数据基本符合要求，建议修正个别问题")
        else:
            suggestions.append("数据存在较多问题，需要仔细核对")
        
        # 严格模式检查
        if request.strict_mode:
            required_fields = {
                "增值税发票": ["发票号码", "发票代码", "开票日期", "价税合计", "销售方名称"],
                "火车票": ["车票号", "车次", "出发站", "到达站", "票价"]
            }
            
            missing_required = []
            for field in required_fields.get(request.invoice_type, []):
                if field not in request.fields or not request.fields[field]:
                    missing_required.append(field)
            
            if missing_required:
                validation_score = 0
                suggestions.insert(0, f"严格模式：缺少必填字段 {', '.join(missing_required)}")
        
        # 构建验证结果
        validation_result = ValidationResult(
            is_valid=error_count == 0,
            validation_score=validation_score,
            issues=issues,
            suggestions=suggestions,
            metadata={
                "total_fields": len(request.fields),
                "validated_fields": total_rules,
                "error_count": error_count,
                "warning_count": warning_count,
                "validation_timestamp": datetime.utcnow().isoformat()
            }
        )
        
        logger.info(f"验证完成，分数: {validation_score}, 错误: {error_count}, 警告: {warning_count}")
        
        return ValidationResponse(
            success=True,
            message=f"验证完成，{'通过' if validation_result.is_valid else '未通过'}",
            data=validation_result,
            validation_time=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"验证发票数据失败: {str(e)}")
        return ValidationResponse(
            success=False,
            message=f"验证失败: {str(e)}",
            data=None,
            validation_time=datetime.utcnow().isoformat()
        )


@router.get("/rules/{invoice_type}", summary="获取验证规则")
async def get_validation_rules(
    invoice_type: str,
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    获取指定发票类型的验证规则
    
    - 返回预定义的验证规则
    - 可用于前端表单验证
    """
    rules = DEFAULT_RULES.get(invoice_type, [])
    
    return {
        "invoice_type": invoice_type,
        "rules": [rule.dict() for rule in rules],
        "total_rules": len(rules)
    }


@router.post("/batch", summary="批量验证发票数据")
async def validate_batch(
    requests: List[ValidationRequest],
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    批量验证多个发票数据
    
    - 支持同时验证多个发票
    - 返回汇总统计信息
    """
    results = []
    total_score = 0
    valid_count = 0
    
    for idx, request in enumerate(requests):
        try:
            response = await validate_invoice_data(request, current_user)
            results.append({
                'index': idx,
                'success': response.success,
                'data': response.dict()
            })
            
            if response.success and response.data:
                if response.data.is_valid:
                    valid_count += 1
                total_score += response.data.validation_score
                
        except Exception as e:
            results.append({
                'index': idx,
                'success': False,
                'error': str(e)
            })
    
    avg_score = total_score / len(requests) if requests else 0
    
    return {
        'total': len(requests),
        'valid': valid_count,
        'invalid': len(requests) - valid_count,
        'average_score': round(avg_score, 3),
        'results': results
    }