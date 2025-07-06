"""
发票分类模型

实现层次化的发票分类系统，支持一级分类和二级分类。
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Numeric, 
    ForeignKey, Index, CheckConstraint, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship, validates

from app.models.base import Base, BaseModel, TimestampMixin


class CategoryLevel(str, Enum):
    """分类层级"""
    PRIMARY = "primary"
    SECONDARY = "secondary"


class PrimaryCategory(Base, BaseModel, TimestampMixin):
    """一级分类模型"""
    
    __tablename__ = "primary_categories"
    
    # 基础信息
    name = Column(
        String(100),
        nullable=False,
        comment="分类名称"
    )
    
    code = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="分类代码（英文标识）"
    )
    
    # 显示配置
    color = Column(
        String(7),
        nullable=True,
        comment="颜色代码（用于前端显示）"
    )
    
    icon = Column(
        String(50),
        nullable=True,
        comment="图标类名"
    )
    
    sort_order = Column(
        Integer,
        nullable=False,
        server_default="0",
        comment="排序顺序"
    )
    
    # 状态
    is_active = Column(
        Boolean,
        nullable=False,
        server_default="true",
        comment="是否启用"
    )
    
    description = Column(
        Text,
        nullable=True,
        comment="分类描述"
    )
    
    # 关系
    secondary_categories = relationship(
        "SecondaryCategory",
        back_populates="primary_category",
        cascade="all, delete-orphan",
        order_by="SecondaryCategory.sort_order"
    )
    
    invoices = relationship(
        "Invoice",
        back_populates="primary_category",
        lazy="dynamic"
    )
    
    # 约束和索引
    __table_args__ = (
        CheckConstraint('length(name) > 0', name='chk_primary_category_name_not_empty'),
        CheckConstraint('length(code) > 0', name='chk_primary_category_code_not_empty'),
        CheckConstraint('sort_order >= 0', name='chk_primary_category_sort_order_positive'),
        Index('idx_primary_categories_active_sort', 'is_active', 'sort_order'),
    )
    
    @validates('code')
    def validate_code(self, key, code):
        """验证分类代码格式"""
        if code and not code.replace('_', '').isalnum():
            raise ValueError("分类代码只能包含字母、数字和下划线")
        return code.lower() if code else code
    
    @validates('color')
    def validate_color(self, key, color):
        """验证颜色代码格式"""
        if color and not (color.startswith('#') and len(color) == 7):
            raise ValueError("颜色代码必须是 #RRGGBB 格式")
        return color
    
    @property
    def secondary_category_count(self) -> int:
        """二级分类数量"""
        return len(self.secondary_categories)
    
    @property
    def invoice_count(self) -> int:
        """关联发票数量"""
        return self.invoices.count()
    
    def __repr__(self) -> str:
        return f"<PrimaryCategory(id={self.id}, code={self.code}, name={self.name})>"


class SecondaryCategory(Base, BaseModel, TimestampMixin):
    """二级分类模型"""
    
    __tablename__ = "secondary_categories"
    
    # 关联字段
    primary_category_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("primary_categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="所属一级分类 ID"
    )
    
    # 基础信息
    name = Column(
        String(100),
        nullable=False,
        comment="分类名称"
    )
    
    code = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="分类代码（英文标识）"
    )
    
    sort_order = Column(
        Integer,
        nullable=False,
        server_default="0",
        comment="排序顺序"
    )
    
    # 状态
    is_active = Column(
        Boolean,
        nullable=False,
        server_default="true",
        comment="是否启用"
    )
    
    description = Column(
        Text,
        nullable=True,
        comment="分类描述"
    )
    
    # 自动分类规则
    auto_classify_rules = Column(
        JSONB,
        nullable=False,
        server_default="'{}'::jsonb",
        comment="自动分类规则配置"
    )
    
    # 关系
    primary_category = relationship(
        "PrimaryCategory",
        back_populates="secondary_categories"
    )
    
    invoices = relationship(
        "Invoice",
        back_populates="secondary_category",
        lazy="dynamic"
    )
    
    # 约束和索引
    __table_args__ = (
        CheckConstraint('length(name) > 0', name='chk_secondary_category_name_not_empty'),
        CheckConstraint('length(code) > 0', name='chk_secondary_category_code_not_empty'),
        CheckConstraint('sort_order >= 0', name='chk_secondary_category_sort_order_positive'),
        Index('idx_secondary_categories_primary_sort', 'primary_category_id', 'sort_order'),
        Index('idx_secondary_categories_active', 'is_active'),
        Index('idx_secondary_categories_rules_gin', 'auto_classify_rules',
              postgresql_using='gin'),
    )
    
    @validates('code')
    def validate_code(self, key, code):
        """验证分类代码格式"""
        if code and not code.replace('_', '').isalnum():
            raise ValueError("分类代码只能包含字母、数字和下划线")
        return code.lower() if code else code
    
    @property
    def full_code(self) -> str:
        """完整分类代码（包含一级分类）"""
        if self.primary_category:
            return f"{self.primary_category.code}_{self.code}"
        return self.code
    
    @property
    def full_name(self) -> str:
        """完整分类名称（包含一级分类）"""
        if self.primary_category:
            return f"{self.primary_category.name}/{self.name}"
        return self.name
    
    @property
    def invoice_count(self) -> int:
        """关联发票数量"""
        return self.invoices.count()
    
    def get_classification_rules(self) -> Dict[str, Any]:
        """获取自动分类规则"""
        return self.auto_classify_rules or {}
    
    def update_classification_rules(self, rules: Dict[str, Any]) -> None:
        """更新自动分类规则"""
        self.auto_classify_rules = rules
    
    def add_classification_rule(self, rule_type: str, rule_config: Dict[str, Any]) -> None:
        """添加单个分类规则"""
        rules = self.get_classification_rules()
        if 'rules' not in rules:
            rules['rules'] = []
        
        rule_config['type'] = rule_type
        rules['rules'].append(rule_config)
        self.auto_classify_rules = rules
    
    def __repr__(self) -> str:
        return f"<SecondaryCategory(id={self.id}, code={self.code}, name={self.name})>"


class CategoryClassificationRule:
    """分类规则数据类"""
    
    def __init__(self, rule_type: str, patterns: List[str], 
                 confidence: float, **kwargs):
        self.rule_type = rule_type
        self.patterns = patterns
        self.confidence = confidence
        self.additional_config = kwargs
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'type': self.rule_type,
            'patterns': self.patterns,
            'confidence': self.confidence,
            **self.additional_config
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CategoryClassificationRule':
        """从字典创建规则对象"""
        rule_type = data.pop('type')
        patterns = data.pop('patterns', [])
        confidence = data.pop('confidence', 0.5)
        return cls(rule_type, patterns, confidence, **data)


# 预定义的分类规则模板
PREDEFINED_CLASSIFICATION_RULES = {
    "transportation_flight": [
        CategoryClassificationRule(
            rule_type="seller_name_pattern",
            patterns=[".*航空.*", ".*机场.*", ".*航班.*", ".*airline.*"],
            confidence=0.9
        ),
        CategoryClassificationRule(
            rule_type="invoice_type_pattern", 
            patterns=["机票", "航班", "flight"],
            confidence=0.95
        )
    ],
    "transportation_train": [
        CategoryClassificationRule(
            rule_type="seller_name_pattern",
            patterns=[".*铁路.*", ".*火车.*", ".*高铁.*", ".*动车.*"],
            confidence=0.95
        ),
        CategoryClassificationRule(
            rule_type="invoice_type_pattern",
            patterns=["铁路电子客票", "火车票", "高铁票"],
            confidence=0.99
        )
    ],
    "transportation_taxi": [
        CategoryClassificationRule(
            rule_type="seller_name_pattern",
            patterns=[".*出租.*", ".*滴滴.*", ".*uber.*", ".*taxi.*"],
            confidence=0.85
        ),
        CategoryClassificationRule(
            rule_type="amount_range",
            patterns=[],
            confidence=0.7,
            min_amount=0,
            max_amount=100
        )
    ],
    "dining_meal": [
        CategoryClassificationRule(
            rule_type="seller_name_pattern",
            patterns=[".*餐饮.*", ".*酒店.*", ".*饭店.*", ".*restaurant.*"],
            confidence=0.8
        )
    ],
    "accommodation_hotel": [
        CategoryClassificationRule(
            rule_type="seller_name_pattern",
            patterns=[".*酒店.*", ".*宾馆.*", ".*hotel.*", ".*住宿.*"],
            confidence=0.85
        )
    ]
}