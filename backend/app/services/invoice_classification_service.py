"""
发票分类服务

实现基于规则的自动发票分类系统，支持多种分类策略。
"""

import re
import logging
from typing import Dict, Any, Optional, List, NamedTuple
from decimal import Decimal
from dataclasses import dataclass

from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.category import PrimaryCategory, SecondaryCategory, PREDEFINED_CLASSIFICATION_RULES
from app.models.invoice import Invoice
from app.services.ocr.models import StructuredInvoiceData


logger = logging.getLogger(__name__)


@dataclass
class ClassificationResult:
    """分类结果"""
    primary_category_id: Optional[str] = None
    secondary_category_id: Optional[str] = None
    primary_category_code: Optional[str] = None
    secondary_category_code: Optional[str] = None
    confidence: float = 0.0
    reason: str = ""
    rule_type: str = ""
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class InvoiceClassificationService:
    """发票自动分类服务"""
    
    def __init__(self):
        self.classification_rules = self._load_predefined_rules()
    
    def _load_predefined_rules(self) -> Dict[str, Any]:
        """加载预定义分类规则"""
        rules = {}
        for category_code, rule_list in PREDEFINED_CLASSIFICATION_RULES.items():
            rules[category_code] = [rule.to_dict() for rule in rule_list]
        return rules
    
    async def classify_invoice(self, 
                             invoice_data: StructuredInvoiceData,
                             session: AsyncSession) -> Optional[ClassificationResult]:
        """
        自动分类发票
        
        Args:
            invoice_data: 发票结构化数据
            session: 数据库会话
            
        Returns:
            分类结果或None
        """
        logger.info("开始自动分类发票")
        
        # 准备分类输入数据
        classification_input = self._prepare_classification_input(invoice_data)
        
        # 基于发票类型的快速分类
        type_result = await self._classify_by_invoice_type(classification_input, session)
        if type_result and type_result.confidence > 0.9:
            logger.info(f"基于发票类型分类成功: {type_result.reason}")
            return type_result
        
        # 基于销售方名称分类
        seller_result = await self._classify_by_seller_name(classification_input, session)
        if seller_result and seller_result.confidence > 0.8:
            logger.info(f"基于销售方名称分类成功: {seller_result.reason}")
            return seller_result
        
        # 基于金额范围分类
        amount_result = await self._classify_by_amount_range(classification_input, session)
        if amount_result and amount_result.confidence > 0.7:
            logger.info(f"基于金额范围分类成功: {amount_result.reason}")
            return amount_result
        
        # 基于关键词组合分类
        keyword_result = await self._classify_by_keywords(classification_input, session)
        if keyword_result:
            logger.info(f"基于关键词分类成功: {keyword_result.reason}")
            return keyword_result
        
        # 如果所有方法都失败，返回默认分类
        default_result = await self._get_default_classification(session)
        if default_result:
            logger.info("使用默认分类")
            return default_result
        
        logger.warning("无法自动分类发票")
        return None
    
    def _prepare_classification_input(self, invoice_data: StructuredInvoiceData) -> Dict[str, Any]:
        """准备分类输入数据"""
        return {
            'invoice_type': invoice_data.main_info.invoice_type or '',
            'seller_name': invoice_data.seller_info.name or '',
            'buyer_name': invoice_data.buyer_info.name or '',
            'amount': float(invoice_data.summary.amount) if invoice_data.summary.amount else 0.0,
            'total_amount': float(invoice_data.summary.total_amount) if invoice_data.summary.total_amount else 0.0,
        }
    
    async def _classify_by_invoice_type(self, 
                                      classification_input: Dict[str, Any],
                                      session: AsyncSession) -> Optional[ClassificationResult]:
        """基于发票类型分类"""
        invoice_type = classification_input.get('invoice_type', '').lower()
        
        # 火车票检测
        if '铁路' in invoice_type or '客票' in invoice_type:
            return await self._get_classification_by_code('transportation', 'train', session, 
                                                        confidence=0.99, 
                                                        reason=f"发票类型匹配: {invoice_type}",
                                                        rule_type="invoice_type_pattern")
        
        # 其他发票类型模式匹配
        type_patterns = {
            ('flight', 0.95): ['机票', '航班', 'flight', '航空'],
            ('hotel', 0.9): ['住宿', '酒店', 'hotel'],
            ('meal', 0.8): ['餐饮', '食品', '饮料']
        }
        
        for (category_code, confidence), patterns in type_patterns.items():
            for pattern in patterns:
                if pattern in invoice_type:
                    # 需要根据二级分类找到一级分类
                    primary_code = self._get_primary_category_for_secondary(category_code)
                    if primary_code:
                        return await self._get_classification_by_code(
                            primary_code, category_code, session,
                            confidence=confidence,
                            reason=f"发票类型匹配: {pattern}",
                            rule_type="invoice_type_pattern"
                        )
        
        return None
    
    async def _classify_by_seller_name(self, 
                                     classification_input: Dict[str, Any],
                                     session: AsyncSession) -> Optional[ClassificationResult]:
        """基于销售方名称分类"""
        seller_name = classification_input.get('seller_name', '').lower()
        
        if not seller_name:
            return None
        
        # 定义销售方名称模式
        seller_patterns = {
            ('transportation', 'flight', 0.9): [
                r'.*航空.*', r'.*机场.*', r'.*航班.*', r'.*airline.*'
            ],
            ('transportation', 'train', 0.95): [
                r'.*铁路.*', r'.*火车.*', r'.*高铁.*', r'.*动车.*'
            ],
            ('transportation', 'taxi', 0.85): [
                r'.*出租.*', r'.*滴滴.*', r'.*uber.*', r'.*taxi.*', r'.*网约车.*'
            ],
            ('transportation', 'bus', 0.8): [
                r'.*公交.*', r'.*客运.*', r'.*巴士.*', r'.*bus.*'
            ],
            ('dining', 'meal', 0.8): [
                r'.*餐饮.*', r'.*饭店.*', r'.*restaurant.*', r'.*食品.*', r'.*茶.*'
            ],
            ('accommodation', 'hotel', 0.85): [
                r'.*酒店.*', r'.*宾馆.*', r'.*hotel.*', r'.*住宿.*', r'.*旅馆.*'
            ],
            ('office', 'stationery', 0.8): [
                r'.*文具.*', r'.*办公.*', r'.*用品.*', r'.*stationery.*'
            ]
        }
        
        for (primary_code, secondary_code, confidence), patterns in seller_patterns.items():
            for pattern in patterns:
                if re.search(pattern, seller_name, re.IGNORECASE):
                    return await self._get_classification_by_code(
                        primary_code, secondary_code, session,
                        confidence=confidence,
                        reason=f"销售方名称匹配: {pattern} -> {seller_name}",
                        rule_type="seller_name_pattern"
                    )
        
        return None
    
    async def _classify_by_amount_range(self, 
                                      classification_input: Dict[str, Any],
                                      session: AsyncSession) -> Optional[ClassificationResult]:
        """基于金额范围分类"""
        amount = classification_input.get('total_amount', 0.0)
        seller_name = classification_input.get('seller_name', '').lower()
        
        # 小额交通费用（通常是出租车或公交）
        if 0 < amount <= 100:
            if any(keyword in seller_name for keyword in ['出租', '滴滴', 'taxi', '公交']):
                return await self._get_classification_by_code(
                    'transportation', 'taxi', session,
                    confidence=0.7,
                    reason=f"小额交通费用: ¥{amount}",
                    rule_type="amount_range"
                )
        
        # 中等金额可能是餐饮
        elif 20 <= amount <= 300:
            if any(keyword in seller_name for keyword in ['餐', '食', '饮', '茶']):
                return await self._get_classification_by_code(
                    'dining', 'meal', session,
                    confidence=0.6,
                    reason=f"餐饮金额范围: ¥{amount}",
                    rule_type="amount_range"
                )
        
        # 高金额可能是住宿或设备
        elif amount > 500:
            if any(keyword in seller_name for keyword in ['酒店', '宾馆', '住宿']):
                return await self._get_classification_by_code(
                    'accommodation', 'hotel', session,
                    confidence=0.7,
                    reason=f"住宿高金额: ¥{amount}",
                    rule_type="amount_range"
                )
        
        return None
    
    async def _classify_by_keywords(self, 
                                  classification_input: Dict[str, Any],
                                  session: AsyncSession) -> Optional[ClassificationResult]:
        """基于关键词组合分类"""
        # 组合多个字段进行关键词匹配
        combined_text = ' '.join([
            classification_input.get('invoice_type', ''),
            classification_input.get('seller_name', ''),
            classification_input.get('buyer_name', '')
        ]).lower()
        
        # 综合关键词模式
        keyword_patterns = {
            ('transportation', None, 0.6): ['交通', '运输', '车', '船', '飞'],
            ('dining', None, 0.6): ['餐', '食', '饮', '茶', '咖啡'],
            ('accommodation', None, 0.6): ['住', '宿', '旅', '房'],
            ('office', None, 0.6): ['办公', '文具', '用品', '设备', '电脑']
        }
        
        for (primary_code, secondary_code, confidence), keywords in keyword_patterns.items():
            matched_keywords = [kw for kw in keywords if kw in combined_text]
            if matched_keywords:
                return await self._get_classification_by_code(
                    primary_code, secondary_code, session,
                    confidence=confidence,
                    reason=f"关键词匹配: {', '.join(matched_keywords)}",
                    rule_type="keyword_combination"
                )
        
        return None
    
    async def _get_default_classification(self, session: AsyncSession) -> Optional[ClassificationResult]:
        """获取默认分类（其他类别）"""
        return await self._get_classification_by_code(
            'other', None, session,
            confidence=0.1,
            reason="无法匹配任何规则，使用默认分类",
            rule_type="default"
        )
    
    async def _get_classification_by_code(self, 
                                        primary_code: str,
                                        secondary_code: Optional[str],
                                        session: AsyncSession,
                                        confidence: float,
                                        reason: str,
                                        rule_type: str) -> Optional[ClassificationResult]:
        """根据分类代码获取分类结果"""
        try:
            # 查找一级分类
            primary_stmt = select(PrimaryCategory).where(
                PrimaryCategory.code == primary_code,
                PrimaryCategory.is_active == True
            )
            primary_result = await session.execute(primary_stmt)
            primary_category = primary_result.scalar_one_or_none()
            
            if not primary_category:
                logger.warning(f"未找到一级分类: {primary_code}")
                return None
            
            secondary_category = None
            if secondary_code:
                # 查找二级分类
                secondary_stmt = select(SecondaryCategory).where(
                    SecondaryCategory.code == secondary_code,
                    SecondaryCategory.primary_category_id == primary_category.id,
                    SecondaryCategory.is_active == True
                )
                secondary_result = await session.execute(secondary_stmt)
                secondary_category = secondary_result.scalar_one_or_none()
                
                if not secondary_category:
                    logger.warning(f"未找到二级分类: {secondary_code}")
                    # 如果二级分类不存在，仍可返回一级分类
            
            return ClassificationResult(
                primary_category_id=str(primary_category.id),
                secondary_category_id=str(secondary_category.id) if secondary_category else None,
                primary_category_code=primary_category.code,
                secondary_category_code=secondary_category.code if secondary_category else None,
                confidence=confidence,
                reason=reason,
                rule_type=rule_type,
                metadata={
                    'primary_category_name': primary_category.name,
                    'secondary_category_name': secondary_category.name if secondary_category else None
                }
            )
            
        except Exception as e:
            logger.error(f"获取分类信息失败: {e}")
            return None
    
    def _get_primary_category_for_secondary(self, secondary_code: str) -> Optional[str]:
        """根据二级分类代码获取一级分类代码"""
        mapping = {
            'flight': 'transportation',
            'train': 'transportation', 
            'taxi': 'transportation',
            'bus': 'transportation',
            'hotel': 'accommodation',
            'guesthouse': 'accommodation',
            'meal': 'dining',
            'snack': 'dining',
            'stationery': 'office',
            'equipment': 'office'
        }
        return mapping.get(secondary_code)
    
    async def batch_classify_invoices(self, 
                                    invoice_ids: List[str],
                                    session: AsyncSession) -> Dict[str, ClassificationResult]:
        """批量分类发票"""
        results = {}
        
        for invoice_id in invoice_ids:
            try:
                # 获取发票数据
                stmt = select(Invoice).where(Invoice.id == invoice_id)
                result = await session.execute(stmt)
                invoice = result.scalar_one_or_none()
                
                if not invoice:
                    logger.warning(f"发票不存在: {invoice_id}")
                    continue
                
                # 从extracted_data中重建StructuredInvoiceData
                structured_data = self._rebuild_structured_data(invoice.extracted_data)
                if not structured_data:
                    logger.warning(f"无法重建发票结构化数据: {invoice_id}")
                    continue
                
                # 进行分类
                classification_result = await self.classify_invoice(structured_data, session)
                if classification_result:
                    results[invoice_id] = classification_result
                    
                    # 更新发票分类
                    invoice.set_classification(
                        primary_category_id=classification_result.primary_category_id,
                        secondary_category_id=classification_result.secondary_category_id,
                        confidence=classification_result.confidence,
                        is_auto=True,
                        metadata={
                            'rule_type': classification_result.rule_type,
                            'reason': classification_result.reason,
                            'classified_at': str(datetime.utcnow())
                        }
                    )
                    
            except Exception as e:
                logger.error(f"批量分类发票失败 {invoice_id}: {e}")
                continue
        
        return results
    
    def _rebuild_structured_data(self, extracted_data: Dict[str, Any]) -> Optional[StructuredInvoiceData]:
        """从extracted_data重建StructuredInvoiceData对象"""
        try:
            # 这里需要根据实际的extracted_data格式来重建
            # 简化版本，实际应该更完整
            from app.services.ocr.models import InvoiceMainInfo, InvoicePartyInfo, InvoiceSummary
            
            structured = extracted_data.get('structured_data', {})
            
            main_info = InvoiceMainInfo(
                invoice_number=structured.get('main_info', {}).get('invoice_number', ''),
                invoice_type=structured.get('main_info', {}).get('invoice_type', ''),
                invoice_date=structured.get('main_info', {}).get('invoice_date')
            )
            
            seller_info = InvoicePartyInfo(
                name=structured.get('seller_info', {}).get('name'),
                tax_id=structured.get('seller_info', {}).get('tax_id')
            )
            
            buyer_info = InvoicePartyInfo(
                name=structured.get('buyer_info', {}).get('name'),
                tax_id=structured.get('buyer_info', {}).get('tax_id')
            )
            
            summary = InvoiceSummary(
                amount=structured.get('summary', {}).get('amount', 0),
                total_amount=structured.get('summary', {}).get('total_amount', 0)
            )
            
            return StructuredInvoiceData(
                main_info=main_info,
                seller_info=seller_info,
                buyer_info=buyer_info,
                summary=summary,
                items=[]
            )
            
        except Exception as e:
            logger.error(f"重建结构化数据失败: {e}")
            return None