#!/usr/bin/env python3
"""
字段映射工具
统一处理OCR字段名到前端期望格式的转换
"""

import re
from typing import Dict, Optional, Set
import logging

logger = logging.getLogger(__name__)

# 字段映射表：camelCase -> snake_case
FIELD_MAPPING = {
    # === 基础发票字段 ===
    'invoiceNumber': 'invoice_number',
    'invoiceCode': 'invoice_code', 
    'invoiceDate': 'invoice_date',
    'invoiceType': 'invoice_type',
    'title': 'title',
    
    # === 金额字段 ===
    'totalAmount': 'total_amount',
    'taxAmount': 'tax_amount',
    'invoiceTax': 'tax_amount',  # 阿里云OCR返回的税额字段，与taxAmount映射到相同字段（兼容设计）
    'invoiceAmountPreTax': 'amount_without_tax',
    'fare': 'fare',
    'ticketPrice': 'ticket_price',
    
    # === 卖方信息 ===
    'sellerName': 'seller_name',
    'sellerTaxNumber': 'seller_tax_number',
    'sellerAddress': 'seller_address',
    'sellerPhone': 'seller_phone',
    'sellerBank': 'seller_bank',
    'sellerAccount': 'seller_account',
    
    # === 买方信息 ===
    'buyerName': 'buyer_name',
    'purchaserName': 'buyer_name',  # 阿里云OCR返回的购买方字段，与buyerName映射到相同字段（兼容设计）
    'buyerTaxNumber': 'buyer_tax_number',
    'purchaserTaxNumber': 'buyer_tax_number',  # 阿里云OCR返回的购买方税号，与buyerTaxNumber映射到相同字段（兼容设计）
    'buyerAddress': 'buyer_address',
    'buyerPhone': 'buyer_phone',
    'buyerBank': 'buyer_bank',
    'buyerAccount': 'buyer_account',
    'buyerCreditCode': 'buyer_credit_code',
    
    # === 火车票字段 ===
    'trainNumber': 'train_number',
    'departureStation': 'departure_station',
    'arrivalStation': 'arrival_station',
    'departureTime': 'departure_time',
    'arrivalTime': 'arrival_time',
    'seatType': 'seat_type',
    'seatNumber': 'seat_number',
    'passengerName': 'passenger_name',
    'passengerInfo': 'passenger_info',
    'idNumber': 'id_number',
    'ticketNumber': 'ticket_number',
    'electronicTicketNumber': 'electronic_ticket_number',
    
    # === 验证和安全字段 ===
    'checkCode': 'check_code',
    'verificationCode': 'verification_code',
    'securityCode': 'security_code',
    
    # === 打印和机器信息 ===
    'printedInvoiceCode': 'printed_invoice_code',
    'printedInvoiceNumber': 'printed_invoice_number',
    'machineCode': 'machine_code',
    'machineNumber': 'machine_number',
    
    # === 人员信息 ===
    'drawer': 'drawer',
    'reviewer': 'reviewer',
    'recipient': 'recipient',
    'cashier': 'cashier',
    
    # === 表单和分类 ===
    'formType': 'form_type',
    'formName': 'form_name',
    'category': 'category',
    'subCategory': 'sub_category',
    
    # === 备注和其他 ===
    'remarks': 'remarks',
    'notes': 'notes',
    'memo': 'memo',
    'description': 'description',
    'purpose': 'purpose',
    
    # === 发票明细 ===
    'invoiceDetails': 'invoice_details',
    'itemList': 'item_list',
    'goodsList': 'goods_list',
    'serviceList': 'service_list',
    
    # === 时间字段 ===
    'issueDate': 'issue_date',
    'dueDate': 'due_date',
    'paymentDate': 'payment_date',
    'consumptionDate': 'consumption_date',
    'serviceDate': 'service_date',
    
    # === 状态字段 ===
    'status': 'status',
    'paymentStatus': 'payment_status',
    'invoiceStatus': 'invoice_status',
    'verificationStatus': 'verification_status',
    
    # === 联系信息 ===
    'contactPerson': 'contact_person',
    'contactPhone': 'contact_phone',
    'contactEmail': 'contact_email',
    'contactAddress': 'contact_address',
    
    # === 特殊字段 ===
    'qrCode': 'qr_code',
    'barCode': 'bar_code',
    'referenceNumber': 'reference_number',
    'orderNumber': 'order_number',
    'contractNumber': 'contract_number',
    'projectName': 'project_name',
    'projectCode': 'project_code',
}

# 反向映射：snake_case -> camelCase
REVERSE_FIELD_MAPPING = {v: k for k, v in FIELD_MAPPING.items()}

# 特殊处理的字段（需要额外逻辑）
SPECIAL_FIELDS = {
    'consumption_date',  # 需要从其他字段计算
    'invoice_type',      # 保持在顶层
    'confidence',        # 置信度信息
    'validation',        # 验证信息
}

def normalize_field_name(camel_name: str) -> str:
    """
    将camelCase转换为snake_case
    
    Args:
        camel_name: camelCase字段名
        
    Returns:
        snake_case字段名
    """
    if not camel_name:
        return camel_name
    
    # 优先使用映射表
    if camel_name in FIELD_MAPPING:
        return FIELD_MAPPING[camel_name]
    
    # 自动转换：camelCase -> snake_case
    # 处理连续大写字母的情况，如 XMLHttpRequest -> xml_http_request
    s1 = re.sub('([A-Z]+)([A-Z][a-z])', r'\1_\2', camel_name)
    # 处理一般的驼峰命名，如 camelCase -> camel_case
    s2 = re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1)
    
    result = s2.lower()
    
    # 记录未映射的字段，便于后续优化
    if camel_name not in FIELD_MAPPING and camel_name != result:
        logger.debug(f"自动转换字段名: {camel_name} -> {result}")
    
    return result

def denormalize_field_name(snake_name: str) -> str:
    """
    将snake_case转换为camelCase
    
    Args:
        snake_name: snake_case字段名
        
    Returns:
        camelCase字段名
    """
    if not snake_name:
        return snake_name
    
    # 优先使用反向映射表
    if snake_name in REVERSE_FIELD_MAPPING:
        return REVERSE_FIELD_MAPPING[snake_name]
    
    # 自动转换：snake_case -> camelCase
    components = snake_name.split('_')
    if len(components) <= 1:
        return snake_name
    
    result = components[0] + ''.join(word.capitalize() for word in components[1:])
    
    # 记录未映射的字段
    if snake_name not in REVERSE_FIELD_MAPPING and snake_name != result:
        logger.debug(f"自动转换字段名: {snake_name} -> {result}")
    
    return result

def normalize_fields_dict(fields: Dict[str, any]) -> Dict[str, any]:
    """
    将包含camelCase键的字典转换为snake_case
    
    Args:
        fields: 包含camelCase键的字典
        
    Returns:
        转换后的字典
    """
    if not fields:
        return {}
    
    normalized = {}
    processed_keys = set()
    
    for camel_key, value in fields.items():
        snake_key = normalize_field_name(camel_key)
        
        # 避免重复字段（优先使用第一个遇到的值）
        if snake_key not in processed_keys:
            normalized[snake_key] = value
            processed_keys.add(snake_key)
        else:
            logger.warning(f"重复字段被跳过: {camel_key} -> {snake_key}")
    
    return normalized

def merge_duplicate_fields(fields: Dict[str, any]) -> Dict[str, any]:
    """
    合并重复字段，处理同一字段的不同命名
    
    Args:
        fields: 可能包含重复字段的字典
        
    Returns:
        合并后的字典
    """
    if not fields:
        return {}
    
    # 按照snake_case分组
    grouped = {}
    for key, value in fields.items():
        snake_key = normalize_field_name(key)
        if snake_key not in grouped:
            grouped[snake_key] = []
        grouped[snake_key].append((key, value))
    
    # 合并重复字段
    result = {}
    for snake_key, key_value_pairs in grouped.items():
        if len(key_value_pairs) == 1:
            # 单个字段直接使用
            result[snake_key] = key_value_pairs[0][1]
        else:
            # 多个字段需要合并
            # 优先使用非空值，如果都非空则使用第一个
            non_empty_values = [(k, v) for k, v in key_value_pairs if v]
            if non_empty_values:
                result[snake_key] = non_empty_values[0][1]
                # 记录合并信息
                keys_str = ', '.join([k for k, v in key_value_pairs])
                logger.info(f"合并重复字段 {keys_str} -> {snake_key}")
            else:
                # 所有值都为空，使用第一个
                result[snake_key] = key_value_pairs[0][1]
    
    return result

def validate_field_mapping() -> bool:
    """
    验证字段映射表的正确性
    
    Returns:
        验证是否通过
    """
    try:
        # 检查映射表的一致性
        for camel_key, snake_key in FIELD_MAPPING.items():
            # 验证camelCase格式
            if '_' in camel_key:
                logger.warning(f"字段映射表中的camelCase键包含下划线: {camel_key}")
            
            # 验证snake_case格式
            if not re.match(r'^[a-z0-9_]+$', snake_key):
                logger.warning(f"字段映射表中的snake_case值格式不正确: {snake_key}")
        
        # 检查反向映射的唯一性（收集重复的camelCase键）
        reverse_conflicts = {}
        for camel_key, snake_key in FIELD_MAPPING.items():
            if snake_key not in reverse_conflicts:
                reverse_conflicts[snake_key] = []
            reverse_conflicts[snake_key].append(camel_key)
        
        # 报告重复映射（降低日志级别，这是预期的兼容性设计）
        for snake_key, camel_keys in reverse_conflicts.items():
            if len(camel_keys) > 1:
                logger.info(f"字段兼容性映射: {snake_key} <- {', '.join(camel_keys)}")
        
        logger.info(f"字段映射表验证完成，共 {len(FIELD_MAPPING)} 个映射")
        return True
        
    except Exception as e:
        logger.error(f"字段映射表验证失败: {str(e)}")
        return False

def merge_to_standard_format(
    ocr_data: Dict[str, any],
    parsed_data: Dict[str, any],
    invoice_type: str
) -> Dict[str, any]:
    """
    合并OCR数据和解析数据到标准格式
    确保商品明细在多个路径下可用，兼容前端配置
    
    Args:
        ocr_data: OCR直接返回的数据
        parsed_data: 适配器解析后的数据
        invoice_type: 发票类型
        
    Returns:
        标准化的发票数据
    """
    # 1. 合并基础数据
    result = {
        'invoice_type': invoice_type,
        **normalize_fields_dict(ocr_data),
        **parsed_data
    }
    
    # 2. 确保商品明细在多个路径下可用
    items = None
    
    # 尝试从不同路径获取商品明细
    for field in ['items', 'invoice_items', 'invoice_details', 'invoiceDetails', 'commodities']:
        if field in result and result[field]:
            items = result[field]
            break
        # 也检查OCR原始数据
        if field in ocr_data and ocr_data[field]:
            items = ocr_data[field]
            break
    
    # 如果找到商品明细，确保在所有标准路径下都可用
    if items:
        result['items'] = items
        result['invoice_items'] = items
        result['invoice_details'] = items
        result['invoiceDetails'] = items
        result['commodities'] = items
    
    # 3. 处理金额字段的多种可能名称
    # 税前金额
    amount_without_tax = (
        result.get('amount_without_tax') or
        result.get('invoice_amount_pre_tax') or
        result.get('amount') or
        0
    )
    if amount_without_tax:
        result['amount_without_tax'] = amount_without_tax
        result['amount'] = amount_without_tax
    
    # 税额
    tax_amount = (
        result.get('tax_amount') or
        result.get('invoice_tax') or
        0
    )
    if tax_amount:
        result['tax_amount'] = tax_amount
    
    # 4. 确保关键字段存在
    essential_fields = [
        'invoice_number', 'invoice_date', 'total_amount',
        'seller_name', 'buyer_name'
    ]
    
    for field in essential_fields:
        if field not in result:
            # 尝试从OCR数据中获取
            camel_field = denormalize_field_name(field)
            if camel_field in ocr_data:
                result[field] = ocr_data[camel_field]
    
    # 5. 添加元数据
    if 'created_at' not in result:
        from datetime import datetime
        result['created_at'] = datetime.utcnow().isoformat()
    
    return result

# 在模块加载时验证映射表
validate_field_mapping()