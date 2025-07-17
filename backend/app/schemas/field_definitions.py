"""
字段定义系统

定义所有发票类型的字段规则、验证逻辑和元数据
"""

from enum import Enum
from typing import Dict, List, Optional, Any, Union, Callable
from pydantic import BaseModel, Field
from decimal import Decimal
import re
from datetime import date, datetime


class FieldType(str, Enum):
    """字段数据类型"""
    TEXT = "text"                 # 文本
    NUMBER = "number"             # 数字
    DECIMAL = "decimal"           # 小数
    DATE = "date"                 # 日期
    DATETIME = "datetime"         # 日期时间
    EMAIL = "email"               # 邮箱
    PHONE = "phone"               # 电话
    ID_NUMBER = "id_number"       # 身份证号
    TAX_NUMBER = "tax_number"     # 纳税人识别号
    INVOICE_NUMBER = "invoice_number"  # 发票号码
    AMOUNT = "amount"             # 金额
    PERCENTAGE = "percentage"     # 百分比
    BOOLEAN = "boolean"           # 布尔值
    JSON = "json"                 # JSON对象
    LIST = "list"                 # 列表


class FieldCategory(str, Enum):
    """字段分类"""
    BASIC = "basic"               # 基础信息
    BUYER = "buyer"               # 购买方信息
    SELLER = "seller"             # 销售方信息
    AMOUNT = "amount"             # 金额信息
    TAX = "tax"                   # 税务信息
    DETAILS = "details"           # 明细信息
    TRANSPORT = "transport"       # 交通信息
    PASSENGER = "passenger"       # 乘客信息
    ADDITIONAL = "additional"     # 附加信息
    METADATA = "metadata"         # 元数据


class ValidationRule(BaseModel):
    """验证规则"""
    rule_type: str = Field(..., description="规则类型")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="规则参数")
    error_message: str = Field(..., description="错误信息")
    severity: str = Field("error", description="严重程度: error, warning, info")


class FieldDefinition(BaseModel):
    """
    字段定义
    
    定义单个字段的所有属性、验证规则和处理逻辑
    """
    
    # === 基础属性 ===
    key: str = Field(..., description="字段键名")
    name: str = Field(..., description="字段显示名称")
    field_type: FieldType = Field(..., description="字段数据类型")
    category: FieldCategory = Field(..., description="字段分类")
    
    # === 属性标识 ===
    is_required: bool = Field(False, description="是否必填")
    is_core: bool = Field(False, description="是否核心字段")
    is_readonly: bool = Field(False, description="是否只读")
    is_calculated: bool = Field(False, description="是否计算字段")
    
    # === 默认值和约束 ===
    default_value: Optional[Any] = Field(None, description="默认值")
    min_length: Optional[int] = Field(None, description="最小长度")
    max_length: Optional[int] = Field(None, description="最大长度")
    min_value: Optional[Union[int, float, Decimal]] = Field(None, description="最小值")
    max_value: Optional[Union[int, float, Decimal]] = Field(None, description="最大值")
    pattern: Optional[str] = Field(None, description="正则表达式模式")
    
    # === 验证规则 ===
    validation_rules: List[ValidationRule] = Field(default_factory=list, description="验证规则列表")
    
    # === 处理配置 ===
    extraction_aliases: List[str] = Field(default_factory=list, description="提取别名列表")
    transformation_rules: List[str] = Field(default_factory=list, description="转换规则")
    
    # === 显示配置 ===
    display_order: int = Field(0, description="显示顺序")
    description: str = Field("", description="字段描述")
    help_text: str = Field("", description="帮助文本")
    placeholder: str = Field("", description="占位符")
    
    # === 元数据 ===
    tags: List[str] = Field(default_factory=list, description="标签")
    confidence_threshold: float = Field(0.7, description="置信度阈值")
    
    def validate_value(self, value: Any, confidence: float = 1.0) -> tuple[bool, List[str]]:
        """
        验证字段值
        
        Args:
            value: 字段值
            confidence: 置信度
            
        Returns:
            (是否有效, 错误信息列表)
        """
        errors = []
        
        # 检查必填
        if self.is_required and (value is None or value == ""):
            errors.append(f"{self.name}是必填字段")
            return False, errors
        
        # 空值检查
        if value is None or value == "":
            return True, errors
        
        # 置信度检查
        if confidence < self.confidence_threshold:
            errors.append(f"{self.name}置信度过低: {confidence:.2f} < {self.confidence_threshold}")
        
        # 类型验证
        try:
            converted_value = self._convert_value(value)
        except Exception as e:
            errors.append(f"{self.name}数据类型错误: {str(e)}")
            return False, errors
        
        # 长度验证
        if self.field_type == FieldType.TEXT and isinstance(converted_value, str):
            if self.min_length and len(converted_value) < self.min_length:
                errors.append(f"{self.name}长度不能少于{self.min_length}字符")
            if self.max_length and len(converted_value) > self.max_length:
                errors.append(f"{self.name}长度不能超过{self.max_length}字符")
        
        # 数值范围验证
        if self.field_type in [FieldType.NUMBER, FieldType.DECIMAL, FieldType.AMOUNT]:
            if self.min_value is not None and converted_value < self.min_value:
                errors.append(f"{self.name}不能小于{self.min_value}")
            if self.max_value is not None and converted_value > self.max_value:
                errors.append(f"{self.name}不能大于{self.max_value}")
        
        # 模式验证
        if self.pattern and isinstance(converted_value, str):
            if not re.match(self.pattern, converted_value):
                errors.append(f"{self.name}格式不正确")
        
        # 自定义验证规则
        for rule in self.validation_rules:
            try:
                if not self._apply_validation_rule(rule, converted_value):
                    errors.append(rule.error_message)
            except Exception as e:
                errors.append(f"{self.name}验证规则执行失败: {str(e)}")
        
        return len(errors) == 0, errors
    
    def _convert_value(self, value: Any) -> Any:
        """转换值到目标类型"""
        if value is None or value == "":
            return value
        
        str_value = str(value).strip()
        
        if self.field_type == FieldType.TEXT:
            return str_value
        elif self.field_type == FieldType.NUMBER:
            return int(str_value)
        elif self.field_type in [FieldType.DECIMAL, FieldType.AMOUNT]:
            return Decimal(str_value)
        elif self.field_type == FieldType.DATE:
            # 处理多种日期格式
            return self._parse_date(str_value)
        elif self.field_type == FieldType.BOOLEAN:
            return str_value.lower() in ['true', '1', 'yes', '是']
        else:
            return str_value
    
    def _parse_date(self, date_str: str) -> date:
        """解析日期字符串"""
        # 支持多种日期格式
        formats = [
            "%Y年%m月%d日",  # 2025年03月03日
            "%Y-%m-%d",      # 2025-03-03
            "%Y/%m/%d",      # 2025/03/03
            "%Y.%m.%d"       # 2025.03.03
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        
        raise ValueError(f"无法解析日期格式: {date_str}")
    
    def _apply_validation_rule(self, rule: ValidationRule, value: Any) -> bool:
        """应用验证规则"""
        if rule.rule_type == "length":
            min_len = rule.parameters.get("min", 0)
            max_len = rule.parameters.get("max", float('inf'))
            return min_len <= len(str(value)) <= max_len
        
        elif rule.rule_type == "regex":
            pattern = rule.parameters.get("pattern")
            return bool(re.match(pattern, str(value))) if pattern else True
        
        elif rule.rule_type == "range":
            min_val = rule.parameters.get("min", float('-inf'))
            max_val = rule.parameters.get("max", float('inf'))
            return min_val <= float(value) <= max_val
        
        elif rule.rule_type == "in":
            allowed_values = rule.parameters.get("values", [])
            return value in allowed_values
        
        elif rule.rule_type == "not_empty":
            return bool(str(value).strip())
        
        return True


class InvoiceFieldSchema(BaseModel):
    """发票字段定义集合"""
    
    invoice_type: str = Field(..., description="发票类型")
    fields: Dict[str, FieldDefinition] = Field(..., description="字段定义映射")
    field_groups: Dict[str, List[str]] = Field(default_factory=dict, description="字段分组")
    
    def get_core_fields(self) -> List[FieldDefinition]:
        """获取核心字段"""
        return [field for field in self.fields.values() if field.is_core]
    
    def get_required_fields(self) -> List[FieldDefinition]:
        """获取必填字段"""
        return [field for field in self.fields.values() if field.is_required]
    
    def get_fields_by_category(self, category: FieldCategory) -> List[FieldDefinition]:
        """按分类获取字段"""
        return [field for field in self.fields.values() if field.category == category]
    
    def validate_invoice_data(self, data: Dict[str, Any], confidences: Dict[str, float] = None) -> Dict[str, Any]:
        """验证整个发票数据"""
        if confidences is None:
            confidences = {}
        
        results = {
            "is_valid": True,
            "field_results": {},
            "errors": [],
            "warnings": []
        }
        
        for field_key, field_def in self.fields.items():
            value = data.get(field_key)
            confidence = confidences.get(field_key, 1.0)
            
            is_valid, errors = field_def.validate_value(value, confidence)
            
            results["field_results"][field_key] = {
                "is_valid": is_valid,
                "errors": errors,
                "value": value,
                "confidence": confidence
            }
            
            if not is_valid:
                results["is_valid"] = False
                results["errors"].extend(errors)
        
        return results


# === 预定义字段定义 ===

def create_vat_invoice_schema() -> InvoiceFieldSchema:
    """创建增值税发票字段定义"""
    
    fields = {
        # 基础信息 (7个)
        "title": FieldDefinition(
            key="title",
            name="发票标题",
            field_type=FieldType.TEXT,
            category=FieldCategory.BASIC,
            is_core=True,
            display_order=1,
            extraction_aliases=["title", "发票标题"],
            validation_rules=[
                ValidationRule(
                    rule_type="not_empty",
                    parameters={},
                    error_message="发票标题不能为空"
                )
            ]
        ),
        
        "invoice_type": FieldDefinition(
            key="invoice_type",
            name="发票类型",
            field_type=FieldType.TEXT,
            category=FieldCategory.BASIC,
            is_core=True,
            display_order=2,
            extraction_aliases=["invoice_type", "invoiceType", "发票类型"],
            default_value="增值税电子普通发票"
        ),
        
        "invoice_code": FieldDefinition(
            key="invoice_code",
            name="发票代码",
            field_type=FieldType.TEXT,
            category=FieldCategory.BASIC,
            is_required=False,  # 电子发票可能没有发票代码
            display_order=3,
            min_length=12,
            max_length=12,
            pattern=r"^\d{12}$",
            extraction_aliases=["invoice_code", "invoiceCode", "发票代码"],
            validation_rules=[
                ValidationRule(
                    rule_type="regex",
                    parameters={"pattern": r"^\d{12}$"},
                    error_message="发票代码必须是12位数字"
                )
            ]
        ),
        
        "invoice_number": FieldDefinition(
            key="invoice_number",
            name="发票号码",
            field_type=FieldType.INVOICE_NUMBER,
            category=FieldCategory.BASIC,
            is_core=True,
            is_required=True,
            display_order=4,
            min_length=8,
            max_length=20,
            extraction_aliases=["invoice_number", "invoiceNumber", "发票号码"],
            validation_rules=[
                ValidationRule(
                    rule_type="not_empty",
                    parameters={},
                    error_message="发票号码不能为空"
                )
            ]
        ),
        
        "invoice_date": FieldDefinition(
            key="invoice_date",
            name="开票日期",
            field_type=FieldType.DATE,
            category=FieldCategory.BASIC,
            is_core=True,
            is_required=True,
            display_order=5,
            extraction_aliases=["invoice_date", "invoiceDate", "开票日期"]
        ),
        
        "machine_code": FieldDefinition(
            key="machine_code",
            name="机器编号",
            field_type=FieldType.TEXT,
            category=FieldCategory.BASIC,
            display_order=6,
            extraction_aliases=["machine_code", "machineCode", "机器编号"]
        ),
        
        "check_code": FieldDefinition(
            key="check_code",
            name="校验码",
            field_type=FieldType.TEXT,
            category=FieldCategory.BASIC,
            display_order=7,
            min_length=20,
            max_length=20,
            extraction_aliases=["check_code", "checkCode", "校验码"]
        ),
        
        # 购买方信息 (4个)
        "purchaser_name": FieldDefinition(
            key="purchaser_name",
            name="购买方名称",
            field_type=FieldType.TEXT,
            category=FieldCategory.BUYER,
            is_core=True,
            is_required=True,
            display_order=10,
            max_length=100,
            extraction_aliases=["purchaser_name", "purchaserName", "buyerName", "buyer_name", "购买方名称"]
        ),
        
        "purchaser_tax_number": FieldDefinition(
            key="purchaser_tax_number",
            name="购买方纳税人识别号",
            field_type=FieldType.TAX_NUMBER,
            category=FieldCategory.BUYER,
            display_order=11,
            min_length=15,
            max_length=20,
            pattern=r"^[0-9A-Z]{15,20}$",
            extraction_aliases=["purchaser_tax_number", "purchaserTaxNumber", "购买方纳税人识别号"]
        ),
        
        "purchaser_contact_info": FieldDefinition(
            key="purchaser_contact_info",
            name="购买方地址电话",
            field_type=FieldType.TEXT,
            category=FieldCategory.BUYER,
            display_order=12,
            max_length=200,
            extraction_aliases=["purchaser_contact_info", "purchaserContactInfo", "购买方地址电话"]
        ),
        
        "purchaser_bank_account_info": FieldDefinition(
            key="purchaser_bank_account_info",
            name="购买方开户行及账号",
            field_type=FieldType.TEXT,
            category=FieldCategory.BUYER,
            display_order=13,
            max_length=200,
            extraction_aliases=["purchaser_bank_account_info", "purchaserBankAccountInfo", "购买方开户行及账号"]
        ),
        
        # 销售方信息 (4个)
        "seller_name": FieldDefinition(
            key="seller_name",
            name="销售方名称",
            field_type=FieldType.TEXT,
            category=FieldCategory.SELLER,
            is_core=True,
            is_required=True,
            display_order=20,
            max_length=100,
            extraction_aliases=["seller_name", "sellerName", "销售方名称"]
        ),
        
        "seller_tax_number": FieldDefinition(
            key="seller_tax_number",
            name="销售方纳税人识别号",
            field_type=FieldType.TAX_NUMBER,
            category=FieldCategory.SELLER,
            is_required=True,
            display_order=21,
            min_length=15,
            max_length=20,
            pattern=r"^[0-9A-Z]{15,20}$",
            extraction_aliases=["seller_tax_number", "sellerTaxNumber", "销售方纳税人识别号"]
        ),
        
        "seller_contact_info": FieldDefinition(
            key="seller_contact_info",
            name="销售方地址电话",
            field_type=FieldType.TEXT,
            category=FieldCategory.SELLER,
            display_order=22,
            max_length=200,
            extraction_aliases=["seller_contact_info", "sellerContactInfo", "销售方地址电话"]
        ),
        
        "seller_bank_account_info": FieldDefinition(
            key="seller_bank_account_info",
            name="销售方开户行及账号",
            field_type=FieldType.TEXT,
            category=FieldCategory.SELLER,
            display_order=23,
            max_length=200,
            extraction_aliases=["seller_bank_account_info", "sellerBankAccountInfo", "销售方开户行及账号"]
        ),
        
        # 金额信息 (4个)
        "invoice_amount_pre_tax": FieldDefinition(
            key="invoice_amount_pre_tax",
            name="不含税金额",
            field_type=FieldType.AMOUNT,
            category=FieldCategory.AMOUNT,
            display_order=30,
            min_value=Decimal("0"),
            extraction_aliases=["invoice_amount_pre_tax", "invoiceAmountPreTax", "不含税金额"]
        ),
        
        "invoice_tax": FieldDefinition(
            key="invoice_tax",
            name="税额",
            field_type=FieldType.AMOUNT,
            category=FieldCategory.TAX,
            display_order=31,
            min_value=Decimal("0"),
            extraction_aliases=["invoice_tax", "invoiceTax", "税额"]
        ),
        
        "total_amount": FieldDefinition(
            key="total_amount",
            name="价税合计",
            field_type=FieldType.AMOUNT,
            category=FieldCategory.AMOUNT,
            is_core=True,
            is_required=True,
            display_order=32,
            min_value=Decimal("0"),
            extraction_aliases=["total_amount", "totalAmount", "价税合计", "total"]
        ),
        
        "total_amount_in_words": FieldDefinition(
            key="total_amount_in_words",
            name="价税合计大写",
            field_type=FieldType.TEXT,
            category=FieldCategory.AMOUNT,
            display_order=33,
            extraction_aliases=["total_amount_in_words", "totalAmountInWords", "价税合计大写"]
        ),
        
        # 明细信息 (1个)
        "invoice_details": FieldDefinition(
            key="invoice_details",
            name="发票明细",
            field_type=FieldType.JSON,
            category=FieldCategory.DETAILS,
            display_order=40,
            extraction_aliases=["invoice_details", "invoiceDetails", "发票明细"]
        ),
        
        # 其他信息 (8个)
        "password_area": FieldDefinition(
            key="password_area",
            name="密码区",
            field_type=FieldType.TEXT,
            category=FieldCategory.ADDITIONAL,
            display_order=50,
            extraction_aliases=["password_area", "passwordArea", "密码区"]
        ),
        
        "recipient": FieldDefinition(
            key="recipient",
            name="收款人",
            field_type=FieldType.TEXT,
            category=FieldCategory.ADDITIONAL,
            display_order=51,
            max_length=50,
            extraction_aliases=["recipient", "收款人"]
        ),
        
        "reviewer": FieldDefinition(
            key="reviewer",
            name="复核人",
            field_type=FieldType.TEXT,
            category=FieldCategory.ADDITIONAL,
            display_order=52,
            max_length=50,
            extraction_aliases=["reviewer", "复核人"]
        ),
        
        "drawer": FieldDefinition(
            key="drawer",
            name="开票人",
            field_type=FieldType.TEXT,
            category=FieldCategory.ADDITIONAL,
            display_order=53,
            max_length=50,
            extraction_aliases=["drawer", "开票人"]
        ),
        
        "remarks": FieldDefinition(
            key="remarks",
            name="备注",
            field_type=FieldType.TEXT,
            category=FieldCategory.ADDITIONAL,
            display_order=54,
            max_length=500,
            extraction_aliases=["remarks", "备注"]
        ),
        
        "form_type": FieldDefinition(
            key="form_type",
            name="票据类型",
            field_type=FieldType.TEXT,
            category=FieldCategory.BASIC,
            display_order=55,
            extraction_aliases=["form_type", "formType", "票据类型"]
        ),
        
        "special_tag": FieldDefinition(
            key="special_tag",
            name="特殊标识",
            field_type=FieldType.TEXT,
            category=FieldCategory.ADDITIONAL,
            display_order=56,
            extraction_aliases=["special_tag", "specialTag", "特殊标识"]
        ),
        
        "printed_invoice_code": FieldDefinition(
            key="printed_invoice_code",
            name="印刷发票代码",
            field_type=FieldType.TEXT,
            category=FieldCategory.BASIC,
            display_order=57,
            extraction_aliases=["printed_invoice_code", "printedInvoiceCode", "印刷发票代码"]
        ),
        
        "printed_invoice_number": FieldDefinition(
            key="printed_invoice_number",
            name="印刷发票号码",
            field_type=FieldType.TEXT,
            category=FieldCategory.BASIC,
            display_order=58,
            extraction_aliases=["printed_invoice_number", "printedInvoiceNumber", "印刷发票号码"]
        )
    }
    
    # 字段分组
    field_groups = {
        "基础信息": ["title", "invoice_type", "invoice_code", "invoice_number", "invoice_date", "machine_code", "check_code"],
        "购买方信息": ["purchaser_name", "purchaser_tax_number", "purchaser_contact_info", "purchaser_bank_account_info"],
        "销售方信息": ["seller_name", "seller_tax_number", "seller_contact_info", "seller_bank_account_info"],
        "金额信息": ["invoice_amount_pre_tax", "invoice_tax", "total_amount", "total_amount_in_words"],
        "明细信息": ["invoice_details"],
        "其他信息": ["password_area", "recipient", "reviewer", "drawer", "remarks", "form_type", "special_tag", "printed_invoice_code", "printed_invoice_number"]
    }
    
    return InvoiceFieldSchema(
        invoice_type="增值税发票",
        fields=fields,
        field_groups=field_groups
    )


def create_train_ticket_schema() -> InvoiceFieldSchema:
    """创建火车票字段定义"""
    
    fields = {
        # 基础票据信息
        "ticket_number": FieldDefinition(
            key="ticket_number",
            name="车票号",
            field_type=FieldType.TEXT,
            category=FieldCategory.BASIC,
            is_core=True,
            is_required=True,
            display_order=1,
            min_length=20,
            max_length=25,
            extraction_aliases=["ticket_number", "ticketNumber", "车票号"]
        ),
        
        "train_number": FieldDefinition(
            key="train_number",
            name="车次",
            field_type=FieldType.TEXT,
            category=FieldCategory.TRANSPORT,
            is_core=True,
            is_required=True,
            display_order=2,
            pattern=r"^[GCDKTZL]\d+$",
            extraction_aliases=["train_number", "trainNumber", "车次"]
        ),
        
        "departure_station": FieldDefinition(
            key="departure_station",
            name="出发站",
            field_type=FieldType.TEXT,
            category=FieldCategory.TRANSPORT,
            is_core=True,
            is_required=True,
            display_order=3,
            extraction_aliases=["departure_station", "departureStation", "出发站"]
        ),
        
        "arrival_station": FieldDefinition(
            key="arrival_station",
            name="到达站",
            field_type=FieldType.TEXT,
            category=FieldCategory.TRANSPORT,
            is_core=True,
            is_required=True,
            display_order=4,
            extraction_aliases=["arrival_station", "arrivalStation", "到达站"]
        ),
        
        "departure_time": FieldDefinition(
            key="departure_time",
            name="出发时间",
            field_type=FieldType.TEXT,
            category=FieldCategory.TRANSPORT,
            is_required=True,
            display_order=5,
            extraction_aliases=["departure_time", "departureTime", "出发时间"]
        ),
        
        "seat_number": FieldDefinition(
            key="seat_number",
            name="座位号",
            field_type=FieldType.TEXT,
            category=FieldCategory.TRANSPORT,
            display_order=6,
            extraction_aliases=["seat_number", "seatNumber", "座位号"]
        ),
        
        "seat_type": FieldDefinition(
            key="seat_type",
            name="座位类型",
            field_type=FieldType.TEXT,
            category=FieldCategory.TRANSPORT,
            display_order=7,
            extraction_aliases=["seat_type", "seatType", "座位类型"],
            validation_rules=[
                ValidationRule(
                    rule_type="in",
                    parameters={"values": ["商务座", "一等座", "二等座", "硬座", "软座", "硬卧", "软卧", "高级软卧"]},
                    error_message="座位类型不在允许的范围内",
                    severity="warning"
                )
            ]
        ),
        
        "total_amount": FieldDefinition(
            key="total_amount",
            name="票价",
            field_type=FieldType.AMOUNT,
            category=FieldCategory.AMOUNT,
            is_core=True,
            is_required=True,
            display_order=8,
            min_value=Decimal("0"),
            extraction_aliases=["total_amount", "fare", "票价"]
        ),
        
        "passenger_name": FieldDefinition(
            key="passenger_name",
            name="乘客姓名",
            field_type=FieldType.TEXT,
            category=FieldCategory.PASSENGER,
            is_core=True,
            is_required=True,
            display_order=9,
            max_length=20,
            extraction_aliases=["passenger_name", "passengerName", "乘客姓名"]
        ),
        
        "passenger_info": FieldDefinition(
            key="passenger_info",
            name="乘客信息",
            field_type=FieldType.TEXT,
            category=FieldCategory.PASSENGER,
            display_order=10,
            extraction_aliases=["passenger_info", "passengerInfo", "乘客信息"]
        ),
        
        "ticket_code": FieldDefinition(
            key="ticket_code",
            name="检票码",
            field_type=FieldType.TEXT,
            category=FieldCategory.TRANSPORT,
            display_order=11,
            extraction_aliases=["ticket_code", "ticketCode", "检票码"]
        ),
        
        "sale_info": FieldDefinition(
            key="sale_info",
            name="售票信息",
            field_type=FieldType.TEXT,
            category=FieldCategory.ADDITIONAL,
            display_order=12,
            extraction_aliases=["sale_info", "saleInfo", "售票信息"]
        ),
        
        "ticket_gate": FieldDefinition(
            key="ticket_gate",
            name="检票口",
            field_type=FieldType.TEXT,
            category=FieldCategory.TRANSPORT,
            display_order=13,
            extraction_aliases=["ticket_gate", "ticketGate", "检票口"]
        ),
        
        "electronic_ticket_number": FieldDefinition(
            key="electronic_ticket_number",
            name="电子客票号",
            field_type=FieldType.TEXT,
            category=FieldCategory.BASIC,
            display_order=14,
            min_length=25,
            max_length=25,
            extraction_aliases=["electronic_ticket_number", "electronicTicketNumber", "电子客票号"]
        ),
        
        "buyer_name": FieldDefinition(
            key="buyer_name",
            name="购买方名称",
            field_type=FieldType.TEXT,
            category=FieldCategory.BUYER,
            is_core=True,
            display_order=15,
            max_length=100,
            extraction_aliases=["buyer_name", "buyerName", "购买方名称"]
        ),
        
        "buyer_credit_code": FieldDefinition(
            key="buyer_credit_code",
            name="购买方统一社会信用代码",
            field_type=FieldType.TAX_NUMBER,
            category=FieldCategory.BUYER,
            display_order=16,
            min_length=18,
            max_length=18,
            pattern=r"^[0-9A-Z]{18}$",
            extraction_aliases=["buyer_credit_code", "buyerCreditCode", "购买方统一社会信用代码"]
        ),
        
        "title": FieldDefinition(
            key="title",
            name="发票标题",
            field_type=FieldType.TEXT,
            category=FieldCategory.BASIC,
            is_core=True,
            display_order=17,
            default_value="电子发票(铁路电子客票)",
            extraction_aliases=["title", "发票标题"]
        ),
        
        "invoice_date": FieldDefinition(
            key="invoice_date",
            name="开票日期",
            field_type=FieldType.DATE,
            category=FieldCategory.BASIC,
            is_core=True,
            is_required=True,
            display_order=18,
            extraction_aliases=["invoice_date", "invoiceDate", "开票日期"]
        ),
        
        "remarks": FieldDefinition(
            key="remarks",
            name="备注",
            field_type=FieldType.TEXT,
            category=FieldCategory.ADDITIONAL,
            display_order=19,
            max_length=500,
            extraction_aliases=["remarks", "备注"]
        )
    }
    
    # 字段分组
    field_groups = {
        "基础信息": ["ticket_number", "title", "invoice_date", "electronic_ticket_number"],
        "交通信息": ["train_number", "departure_station", "arrival_station", "departure_time", "seat_number", "seat_type", "ticket_code", "ticket_gate"],
        "金额信息": ["total_amount"],
        "乘客信息": ["passenger_name", "passenger_info"],
        "购买方信息": ["buyer_name", "buyer_credit_code"],
        "其他信息": ["sale_info", "remarks"]
    }
    
    return InvoiceFieldSchema(
        invoice_type="火车票",
        fields=fields,
        field_groups=field_groups
    )


# === 字段定义注册表 ===

INVOICE_FIELD_SCHEMAS: Dict[str, InvoiceFieldSchema] = {
    "增值税发票": create_vat_invoice_schema(),
    "火车票": create_train_ticket_schema()
}


def get_field_schema(invoice_type: str) -> Optional[InvoiceFieldSchema]:
    """
    获取指定发票类型的字段定义
    
    Args:
        invoice_type: 发票类型
        
    Returns:
        字段定义集合或None
    """
    return INVOICE_FIELD_SCHEMAS.get(invoice_type)


def get_all_field_schemas() -> Dict[str, InvoiceFieldSchema]:
    """获取所有字段定义"""
    return INVOICE_FIELD_SCHEMAS


def validate_invoice_data(invoice_type: str, data: Dict[str, Any], confidences: Dict[str, float] = None) -> Dict[str, Any]:
    """
    验证发票数据
    
    Args:
        invoice_type: 发票类型
        data: 发票数据
        confidences: 字段置信度
        
    Returns:
        验证结果
    """
    schema = get_field_schema(invoice_type)
    if not schema:
        return {
            "is_valid": False,
            "errors": [f"不支持的发票类型: {invoice_type}"],
            "field_results": {}
        }
    
    return schema.validate_invoice_data(data, confidences)