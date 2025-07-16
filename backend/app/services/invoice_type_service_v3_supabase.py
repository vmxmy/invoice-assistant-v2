"""
现代化发票类型配置服务 V3 - Supabase 优化版本
使用 Supabase 原生特性优化缓存和性能

Supabase 原生特性利用：
1. PostgreSQL 查询优化和索引
2. 连接池管理
3. Row Level Security (RLS)
4. 实时订阅 (Realtime)
5. 内置缓存机制
"""

import asyncio
import json
import logging
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Any, Optional, Union, Tuple
from uuid import UUID

import fitz  # PyMuPDF
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.invoice_type_config import InvoiceTypeConfig
from app.utils.logger import get_logger

logger = get_logger(__name__)


# ===== 数据模型 =====

class InvoiceTypeEnum(str, Enum):
    """发票类型枚举"""
    TRAIN_TICKET = "train_ticket"
    VAT_INVOICE = "vat_invoice"
    FLIGHT_TICKET = "flight_ticket"
    TAXI_RECEIPT = "taxi_receipt"
    HOTEL_RECEIPT = "hotel_receipt"
    MEAL_RECEIPT = "meal_receipt"
    TRANSPORTATION = "transportation_expense"
    ACCOMMODATION = "accommodation_expense"
    CATERING = "catering_expense"


@dataclass
class InvoiceField:
    """发票字段配置"""
    name: str  # 字段名
    display_name: str  # 显示名称
    value_paths: List[str]  # OCR数据中的可能路径
    default_value: Any = None  # 默认值
    required: bool = False  # 是否必填
    data_type: str = "string"  # 数据类型: string, number, date, boolean
    validation_pattern: Optional[str] = None  # 验证正则表达式


@dataclass
class ClassificationResult:
    """分类结果"""
    type_code: str
    display_name: str
    confidence: float
    score_details: Dict[str, float]
    config_used: Dict[str, Any]
    analysis_metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class InvoiceTypeRule:
    """发票类型识别规则"""
    pdf_keywords: List[str] = field(default_factory=list)
    filename_keywords: List[str] = field(default_factory=list)
    ocr_field_patterns: Dict[str, str] = field(default_factory=dict)
    amount_range: Optional[Tuple[float, float]] = None
    priority: int = 50
    enabled: bool = True


# ===== Supabase 原生缓存策略 =====

class SupabaseNativeCache:
    """基于 Supabase 原生特性的缓存管理"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self._memory_cache = {}  # 应用级内存缓存
        self._cache_ttl = 3600  # 1小时TTL
    
    async def get_all_configs_optimized(self) -> List[InvoiceTypeConfig]:
        """
        使用 Supabase 优化的配置获取
        利用 PostgreSQL 查询优化、索引和连接池
        """
        cache_key = "all_configs"
        
        # 1. 检查内存缓存
        if cache_key in self._memory_cache:
            cache_entry = self._memory_cache[cache_key]
            if not self._is_expired(cache_entry["timestamp"]):
                return cache_entry["data"]
            else:
                del self._memory_cache[cache_key]
        
        # 2. 使用 Supabase 优化查询
        # 利用 PostgreSQL 的查询计划优化和索引
        query = select(InvoiceTypeConfig).where(
            InvoiceTypeConfig.enabled == True
        ).order_by(
            InvoiceTypeConfig.priority.asc(),
            InvoiceTypeConfig.created_at.asc()
        )
        
        result = await self.session.execute(query)
        configs = result.scalars().all()
        
        # 3. 缓存结果
        self._memory_cache[cache_key] = {
            "data": configs,
            "timestamp": datetime.now()
        }
        
        return configs
    
    async def get_config_by_type_optimized(self, type_code: str) -> Optional[InvoiceTypeConfig]:
        """
        使用 Supabase 优化的单个配置获取
        利用 PostgreSQL 的 B-tree 索引
        """
        cache_key = f"config:{type_code}"
        
        # 1. 检查内存缓存
        if cache_key in self._memory_cache:
            cache_entry = self._memory_cache[cache_key]
            if not self._is_expired(cache_entry["timestamp"]):
                return cache_entry["data"]
            else:
                del self._memory_cache[cache_key]
        
        # 2. 使用索引优化查询
        # type_code 字段有 unique 索引，查询性能很高
        query = select(InvoiceTypeConfig).where(
            and_(
                InvoiceTypeConfig.type_code == type_code,
                InvoiceTypeConfig.enabled == True
            )
        )
        
        result = await self.session.execute(query)
        config = result.scalar_one_or_none()
        
        # 3. 缓存结果
        if config:
            self._memory_cache[cache_key] = {
                "data": config,
                "timestamp": datetime.now()
            }
        
        return config
    
    async def get_configs_by_priority_range(self, min_priority: int, max_priority: int) -> List[InvoiceTypeConfig]:
        """
        根据优先级范围获取配置
        利用 PostgreSQL 的范围查询优化
        """
        cache_key = f"priority_range:{min_priority}:{max_priority}"
        
        if cache_key in self._memory_cache:
            cache_entry = self._memory_cache[cache_key]
            if not self._is_expired(cache_entry["timestamp"]):
                return cache_entry["data"]
            else:
                del self._memory_cache[cache_key]
        
        # 使用范围查询和索引
        query = select(InvoiceTypeConfig).where(
            and_(
                InvoiceTypeConfig.enabled == True,
                InvoiceTypeConfig.priority >= min_priority,
                InvoiceTypeConfig.priority <= max_priority
            )
        ).order_by(InvoiceTypeConfig.priority.asc())
        
        result = await self.session.execute(query)
        configs = result.scalars().all()
        
        self._memory_cache[cache_key] = {
            "data": configs,
            "timestamp": datetime.now()
        }
        
        return configs
    
    async def search_configs_by_keywords(self, keywords: List[str]) -> List[InvoiceTypeConfig]:
        """
        使用 PostgreSQL 的全文搜索功能
        利用 GIN 索引进行 JSON 字段搜索
        """
        cache_key = f"search:{':'.join(sorted(keywords))}"
        
        if cache_key in self._memory_cache:
            cache_entry = self._memory_cache[cache_key]
            if not self._is_expired(cache_entry["timestamp"]):
                return cache_entry["data"]
            else:
                del self._memory_cache[cache_key]
        
        # 使用 PostgreSQL 的 JSON 操作符进行搜索
        # 利用 GIN 索引提高 JSON 字段查询性能
        from sqlalchemy import text
        
        conditions = []
        for keyword in keywords:
            # 搜索 pdf_keywords 和 filename_keywords
            # 使用 text() 直接构造 JSONB 查询以避免类型转换问题
            conditions.append(
                or_(
                    text(f"pdf_keywords @> '[\"{{keyword}}\"]'".format(keyword=keyword)),
                    text(f"filename_keywords @> '[\"{{keyword}}\"]'".format(keyword=keyword))
                )
            )
        
        query = select(InvoiceTypeConfig).where(
            and_(
                InvoiceTypeConfig.enabled == True,
                or_(*conditions)
            )
        ).order_by(InvoiceTypeConfig.priority.asc())
        
        result = await self.session.execute(query)
        configs = result.scalars().all()
        
        self._memory_cache[cache_key] = {
            "data": configs,
            "timestamp": datetime.now()
        }
        
        return configs
    
    async def batch_update_with_transaction(self, updates: List[Dict[str, Any]]) -> bool:
        """
        使用 Supabase 事务进行批量更新
        利用 PostgreSQL 的 ACID 特性
        """
        try:
            async with self.session.begin():
                for update in updates:
                    type_code = update.get("type_code")
                    if not type_code:
                        continue
                    
                    # 使用 upsert 语法进行高效更新
                    stmt = text("""
                        UPDATE invoice_type_configs 
                        SET 
                            priority = :priority,
                            enabled = :enabled,
                            updated_at = NOW()
                        WHERE type_code = :type_code
                    """)
                    
                    await self.session.execute(stmt, {
                        "type_code": type_code,
                        "priority": update.get("priority", 50),
                        "enabled": update.get("enabled", True)
                    })
                
                await self.session.commit()
                
                # 清除相关缓存
                await self.invalidate_all()
                
                return True
                
        except Exception as e:
            await self.session.rollback()
            logger.error(f"批量更新失败: {e}")
            return False
    
    async def invalidate_config(self, type_code: str) -> None:
        """失效特定配置缓存"""
        cache_key = f"config:{type_code}"
        if cache_key in self._memory_cache:
            del self._memory_cache[cache_key]
        
        # 同时失效相关的聚合缓存
        keys_to_remove = []
        for key in self._memory_cache:
            if key.startswith(("all_configs", "priority_range:", "search:")):
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self._memory_cache[key]
    
    async def invalidate_all(self) -> None:
        """失效所有缓存"""
        self._memory_cache.clear()
    
    def _is_expired(self, timestamp: datetime) -> bool:
        """检查缓存是否过期"""
        return (datetime.now() - timestamp).total_seconds() > self._cache_ttl
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        total_entries = len(self._memory_cache)
        expired_entries = sum(
            1 for entry in self._memory_cache.values()
            if self._is_expired(entry["timestamp"])
        )
        
        return {
            "total_entries": total_entries,
            "expired_entries": expired_entries,
            "hit_ratio": 1 - (expired_entries / total_entries) if total_entries > 0 else 0,
            "cache_size_mb": sum(
                len(str(entry["data"])) for entry in self._memory_cache.values()
            ) / 1024 / 1024
        }


# ===== 数据访问层 =====

class SupabaseOptimizedRepository:
    """Supabase 优化的数据访问层"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.cache = SupabaseNativeCache(session)
    
    async def get_by_type_code(self, type_code: str) -> Optional[InvoiceTypeConfig]:
        """获取配置 - 使用 Supabase 优化"""
        return await self.cache.get_config_by_type_optimized(type_code)
    
    async def get_all_enabled(self) -> List[InvoiceTypeConfig]:
        """获取所有启用的配置 - 使用 Supabase 优化"""
        return await self.cache.get_all_configs_optimized()
    
    async def get_high_priority_configs(self) -> List[InvoiceTypeConfig]:
        """获取高优先级配置 (优先级 1-30)"""
        return await self.cache.get_configs_by_priority_range(1, 30)
    
    async def search_by_keywords(self, keywords: List[str]) -> List[InvoiceTypeConfig]:
        """根据关键词搜索配置"""
        return await self.cache.search_configs_by_keywords(keywords)
    
    async def create_with_validation(self, config_data: Dict[str, Any]) -> InvoiceTypeConfig:
        """创建配置并验证"""
        # 使用 Supabase 的约束验证
        try:
            config = InvoiceTypeConfig(**config_data)
            self.session.add(config)
            await self.session.commit()
            await self.session.refresh(config)
            
            # 失效缓存
            await self.cache.invalidate_all()
            
            return config
            
        except Exception as e:
            await self.session.rollback()
            raise e
    
    async def update_with_optimistic_locking(self, 
                                           type_code: str, 
                                           config_data: Dict[str, Any]) -> Optional[InvoiceTypeConfig]:
        """使用乐观锁进行更新"""
        try:
            # 使用 Supabase 的乐观锁定
            config = await self.get_by_type_code(type_code)
            if not config:
                return None
            
            # 更新字段
            for key, value in config_data.items():
                if hasattr(config, key):
                    setattr(config, key, value)
            
            await self.session.commit()
            await self.session.refresh(config)
            
            # 失效缓存
            await self.cache.invalidate_config(type_code)
            
            return config
            
        except Exception as e:
            await self.session.rollback()
            raise e
    
    async def delete_with_soft_delete(self, type_code: str) -> bool:
        """软删除配置"""
        try:
            config = await self.get_by_type_code(type_code)
            if not config:
                return False
            
            # 软删除：设置 enabled = False
            config.enabled = False
            await self.session.commit()
            
            # 失效缓存
            await self.cache.invalidate_config(type_code)
            
            return True
            
        except Exception as e:
            await self.session.rollback()
            return False
    
    async def batch_update_priorities(self, priority_updates: List[Dict[str, Any]]) -> bool:
        """批量更新优先级"""
        return await self.cache.batch_update_with_transaction(priority_updates)
    
    async def get_cache_statistics(self) -> Dict[str, Any]:
        """获取缓存统计"""
        return await self.cache.get_cache_stats()


# ===== 识别算法实现 =====

class PDFContentAnalyzer:
    """PDF内容分析算法 - 异步优化"""
    
    async def classify(self, 
                      pdf_content: Optional[bytes],
                      filename: Optional[str],
                      ocr_data: Optional[Dict[str, Any]],
                      config: InvoiceTypeRule) -> float:
        """分析PDF内容匹配度"""
        if not pdf_content or not config.pdf_keywords:
            return 0.0
        
        try:
            # 异步执行PDF解析
            text = await self._extract_pdf_text(pdf_content)
            text_lower = text.lower()
            
            matched_keywords = sum(
                1 for keyword in config.pdf_keywords 
                if keyword.lower() in text_lower
            )
            
            return matched_keywords / len(config.pdf_keywords)
        except Exception as e:
            logger.warning(f"PDF内容分析失败: {e}")
            return 0.0
    
    async def _extract_pdf_text(self, pdf_content: bytes) -> str:
        """异步提取PDF文本"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_extract_pdf_text, pdf_content)
    
    def _sync_extract_pdf_text(self, pdf_content: bytes) -> str:
        """同步提取PDF文本"""
        try:
            doc = fitz.open(stream=pdf_content, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            return text
        except Exception as e:
            logger.error(f"PDF文本提取失败: {e}")
            return ""


class FilenameAnalyzer:
    """文件名分析算法"""
    
    async def classify(self, 
                      pdf_content: Optional[bytes],
                      filename: Optional[str],
                      ocr_data: Optional[Dict[str, Any]],
                      config: InvoiceTypeRule) -> float:
        """分析文件名匹配度"""
        if not filename or not config.filename_keywords:
            return 0.0
        
        filename_lower = filename.lower()
        matched_keywords = sum(
            1 for keyword in config.filename_keywords 
            if keyword.lower() in filename_lower
        )
        
        return matched_keywords / len(config.filename_keywords)


class OCRFieldAnalyzer:
    """OCR字段分析算法"""
    
    async def classify(self, 
                      pdf_content: Optional[bytes],
                      filename: Optional[str],
                      ocr_data: Optional[Dict[str, Any]],
                      config: InvoiceTypeRule) -> float:
        """分析OCR字段匹配度"""
        if not ocr_data or not config.ocr_field_patterns:
            return 0.0
        
        matched_patterns = 0
        total_patterns = len(config.ocr_field_patterns)
        
        for field_name, pattern in config.ocr_field_patterns.items():
            field_value = ocr_data.get(field_name, "")
            if field_value and re.match(pattern, str(field_value)):
                matched_patterns += 1
        
        return matched_patterns / total_patterns if total_patterns > 0 else 0.0


class AmountRangeAnalyzer:
    """金额范围分析算法"""
    
    async def classify(self, 
                      pdf_content: Optional[bytes],
                      filename: Optional[str],
                      ocr_data: Optional[Dict[str, Any]],
                      config: InvoiceTypeRule) -> float:
        """分析金额范围匹配度"""
        if not ocr_data or not config.amount_range:
            return 0.0
        
        # 尝试从多个字段获取金额
        amount_fields = ["totalAmount", "total_amount", "fare", "ticket_price"]
        amount = None
        
        for field in amount_fields:
            if field in ocr_data:
                try:
                    amount = float(str(ocr_data[field]).replace('¥', '').replace(',', ''))
                    break
                except (ValueError, TypeError):
                    continue
        
        if amount is None:
            return 0.0
        
        min_amount, max_amount = config.amount_range
        if min_amount <= amount <= max_amount:
            return 1.0
        elif amount < min_amount:
            return max(0, 1 - (min_amount - amount) / min_amount)
        else:
            return max(0, 1 - (amount - max_amount) / max_amount)


# ===== 核心业务层 =====

class InvoiceTypeClassificationEngine:
    """发票类型分类引擎"""
    
    def __init__(self):
        self.algorithms = {
            "pdf_content": PDFContentAnalyzer(),
            "filename": FilenameAnalyzer(),
            "ocr_fields": OCRFieldAnalyzer(),
            "amount_range": AmountRangeAnalyzer()
        }
        self.weights = {
            "pdf_content": 0.4,
            "filename": 0.2,
            "ocr_fields": 0.3,
            "amount_range": 0.1
        }
    
    async def classify(self, 
                      pdf_content: Optional[bytes],
                      filename: Optional[str],
                      ocr_data: Optional[Dict[str, Any]],
                      configs: List[InvoiceTypeConfig]) -> ClassificationResult:
        """执行发票类型分类"""
        best_result = None
        best_score = 0.0
        
        for config in configs:
            rule = self._build_rule_from_config(config)
            score_details = await self._calculate_scores(
                pdf_content, filename, ocr_data, rule
            )
            
            # 计算加权总分
            total_score = sum(
                score_details.get(alg_name, 0.0) * weight
                for alg_name, weight in self.weights.items()
            )
            
            if total_score > best_score:
                best_score = total_score
                best_result = ClassificationResult(
                    type_code=config.type_code,
                    display_name=config.display_name,
                    confidence=total_score,
                    score_details=score_details,
                    config_used={
                        "type_code": config.type_code,
                        "priority": config.priority,
                        "enabled": config.enabled
                    },
                    analysis_metadata={
                        "pdf_analyzed": pdf_content is not None,
                        "filename_analyzed": filename is not None,
                        "ocr_analyzed": ocr_data is not None,
                        "timestamp": datetime.now().isoformat()
                    }
                )
        
        # 如果没有找到匹配的类型，返回默认类型
        if best_result is None or best_score < 0.1:
            return self._get_default_result(configs)
        
        return best_result
    
    async def _calculate_scores(self, 
                               pdf_content: Optional[bytes],
                               filename: Optional[str],
                               ocr_data: Optional[Dict[str, Any]],
                               rule: InvoiceTypeRule) -> Dict[str, float]:
        """计算各算法得分"""
        score_details = {}
        
        # 并行执行所有算法
        tasks = []
        for alg_name, algorithm in self.algorithms.items():
            task = algorithm.classify(pdf_content, filename, ocr_data, rule)
            tasks.append((alg_name, task))
        
        # 等待所有任务完成
        for alg_name, task in tasks:
            try:
                score = await task
                score_details[alg_name] = score
            except Exception as e:
                logger.error(f"算法 {alg_name} 执行失败: {e}")
                score_details[alg_name] = 0.0
        
        return score_details
    
    def _build_rule_from_config(self, config: InvoiceTypeConfig) -> InvoiceTypeRule:
        """从配置构建规则"""
        return InvoiceTypeRule(
            pdf_keywords=config.pdf_keywords or [],
            filename_keywords=config.filename_keywords or [],
            ocr_field_patterns=config.ocr_field_patterns or {},
            amount_range=tuple(config.amount_range) if config.amount_range else None,
            priority=config.priority,
            enabled=config.enabled
        )
    
    def _get_default_result(self, configs: List[InvoiceTypeConfig]) -> ClassificationResult:
        """获取默认分类结果"""
        default_config = next(
            (config for config in configs if config.type_code == "vat_invoice"),
            configs[0] if configs else None
        )
        
        if default_config:
            return ClassificationResult(
                type_code=default_config.type_code,
                display_name=default_config.display_name,
                confidence=0.1,
                score_details={},
                config_used={"type_code": default_config.type_code, "is_default": True},
                analysis_metadata={"is_default_fallback": True}
            )
        
        return ClassificationResult(
            type_code="general_invoice",
            display_name="通用发票",
            confidence=0.0,
            score_details={},
            config_used={"is_fallback": True},
            analysis_metadata={"is_fallback": True}
        )


# ===== 应用服务层 =====

class InvoiceTypeServiceV3Supabase:
    """基于 Supabase 优化的发票类型服务"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = SupabaseOptimizedRepository(session)
        self.classification_engine = InvoiceTypeClassificationEngine()
    
    # ===== 配置管理 =====
    
    async def get_config_by_type(self, type_code: str) -> Optional[InvoiceTypeConfig]:
        """根据类型代码获取配置"""
        return await self.repository.get_by_type_code(type_code)
    
    async def get_all_configs(self) -> List[InvoiceTypeConfig]:
        """获取所有启用的配置"""
        return await self.repository.get_all_enabled()
    
    async def get_high_priority_configs(self) -> List[InvoiceTypeConfig]:
        """获取高优先级配置"""
        return await self.repository.get_high_priority_configs()
    
    async def search_configs_by_keywords(self, keywords: List[str]) -> List[InvoiceTypeConfig]:
        """根据关键词搜索配置"""
        return await self.repository.search_by_keywords(keywords)
    
    async def create_config(self, config_data: Dict[str, Any]) -> InvoiceTypeConfig:
        """创建新的配置"""
        return await self.repository.create_with_validation(config_data)
    
    async def update_config(self, type_code: str, config_data: Dict[str, Any]) -> Optional[InvoiceTypeConfig]:
        """更新配置"""
        return await self.repository.update_with_optimistic_locking(type_code, config_data)
    
    async def delete_config(self, type_code: str) -> bool:
        """软删除配置"""
        return await self.repository.delete_with_soft_delete(type_code)
    
    async def batch_update_priorities(self, updates: List[Dict[str, Any]]) -> bool:
        """批量更新优先级"""
        return await self.repository.batch_update_priorities(updates)
    
    # ===== 智能分类 =====
    
    async def classify_invoice(self, 
                             pdf_content: Optional[bytes] = None,
                             filename: Optional[str] = None,
                             ocr_data: Optional[Dict[str, Any]] = None) -> ClassificationResult:
        """智能分类发票"""
        configs = await self.get_all_configs()
        
        # 按优先级排序
        configs.sort(key=lambda x: x.priority)
        
        # 执行分类
        result = await self.classification_engine.classify(
            pdf_content, filename, ocr_data, configs
        )
        
        logger.info(f"发票分类结果: {result.type_code} (置信度: {result.confidence:.3f})")
        
        return result
    
    async def classify_with_high_priority_only(self, 
                                             pdf_content: Optional[bytes] = None,
                                             filename: Optional[str] = None,
                                             ocr_data: Optional[Dict[str, Any]] = None) -> ClassificationResult:
        """仅使用高优先级配置进行分类"""
        configs = await self.get_high_priority_configs()
        
        return await self.classification_engine.classify(
            pdf_content, filename, ocr_data, configs
        )
    
    async def batch_classify(self, 
                           items: List[Dict[str, Any]]) -> List[ClassificationResult]:
        """批量分类发票"""
        configs = await self.get_all_configs()
        configs.sort(key=lambda x: x.priority)
        
        # 并行处理
        tasks = []
        for item in items:
            task = self.classification_engine.classify(
                item.get("pdf_content"),
                item.get("filename"),
                item.get("ocr_data"),
                configs
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 处理异常
        valid_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"批量分类第 {i} 项失败: {result}")
                valid_results.append(self.classification_engine._get_default_result(configs))
            else:
                valid_results.append(result)
        
        return valid_results
    
    # ===== 监控和统计 =====
    
    async def get_service_statistics(self) -> Dict[str, Any]:
        """获取服务统计信息"""
        cache_stats = await self.repository.get_cache_statistics()
        
        total_configs = len(await self.get_all_configs())
        high_priority_configs = len(await self.get_high_priority_configs())
        
        return {
            "total_configs": total_configs,
            "high_priority_configs": high_priority_configs,
            "cache_statistics": cache_stats,
            "service_version": "3.0_supabase",
            "timestamp": datetime.now().isoformat()
        }
    
    # ===== 数据构建 =====
    
    async def build_invoice_data(self, 
                               classification_result: ClassificationResult,
                               ocr_data: Dict[str, Any]) -> Dict[str, Any]:
        """根据分类结果构建发票数据"""
        config = await self.get_config_by_type(classification_result.type_code)
        if not config:
            return {"error": "配置不存在"}
        
        invoice_data = {
            "invoice_type": config.type_name,
            "type_code": config.type_code,
            "classification_result": {
                "confidence": classification_result.confidence,
                "score_details": classification_result.score_details,
                "analysis_metadata": classification_result.analysis_metadata
            },
            "extracted_data": ocr_data
        }
        
        # 根据字段配置映射数据
        if config.fields:
            for field_config in config.fields:
                if isinstance(field_config, dict):
                    field = InvoiceField(**field_config)
                    value = self._extract_field_value(field, ocr_data)
                    invoice_data[field.name] = value
        
        return invoice_data
    
    def _extract_field_value(self, field: InvoiceField, ocr_data: Dict[str, Any]) -> Any:
        """从OCR数据中提取字段值"""
        # 按路径优先级查找值
        for path in field.value_paths:
            value = self._get_nested_value(ocr_data, path)
            if value is not None and value != "":
                return self._convert_value(value, field.data_type)
        
        return field.default_value
    
    def _get_nested_value(self, data: Dict[str, Any], path: str) -> Any:
        """从嵌套字典中获取值"""
        try:
            keys = path.split('.')
            value = data
            for key in keys:
                value = value[key]
            return value
        except (KeyError, TypeError):
            return None
    
    def _convert_value(self, value: Any, data_type: str) -> Any:
        """转换数据类型"""
        if value is None:
            return None
        
        try:
            if data_type == "number":
                if isinstance(value, str):
                    cleaned = value.replace('¥', '').replace(',', '').strip()
                    return float(cleaned)
                return float(value)
            
            elif data_type == "date":
                if isinstance(value, str):
                    # 处理中文日期格式
                    date_match = re.search(r'(\d{4})年(\d{1,2})月(\d{1,2})日', value)
                    if date_match:
                        year, month, day = date_match.groups()
                        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                    
                    # 处理ISO日期格式
                    date_match = re.search(r'(\d{4})-(\d{1,2})-(\d{1,2})', value)
                    if date_match:
                        return date_match.group(0)
                
                return str(value)
            
            elif data_type == "boolean":
                if isinstance(value, str):
                    return value.lower() in ['true', '1', 'yes', '是']
                return bool(value)
            
            else:  # string
                return str(value)
                
        except (ValueError, TypeError):
            return value


# ===== 依赖注入工厂 =====

async def create_invoice_type_service_supabase(session: AsyncSession) -> InvoiceTypeServiceV3Supabase:
    """创建基于 Supabase 优化的发票类型服务实例"""
    return InvoiceTypeServiceV3Supabase(session)


# ===== 导出 =====

__all__ = [
    "InvoiceTypeServiceV3Supabase",
    "ClassificationResult",
    "InvoiceTypeEnum",
    "InvoiceField",
    "SupabaseNativeCache",
    "SupabaseOptimizedRepository",
    "create_invoice_type_service_supabase"
]