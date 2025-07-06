#!/usr/bin/env python3
"""
设计多引擎融合策略

基于测试结果，设计一个综合利用多种提取方法的融合策略：
1. PyMuPDF4LLM (Markdown) - 主要策略
2. 当前PyMuPDF + invoice2data - 模板匹配
3. pdfplumber - 表格数据补充  
4. 坐标提取 - 验证和边缘案例处理
"""

import sys
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

class ExtractionMethod(Enum):
    """提取方法枚举"""
    PYMUPDF4LLM = "pymupdf4llm_markdown"
    INVOICE2DATA = "invoice2data_template" 
    PDFPLUMBER = "pdfplumber_table"
    COORDINATE = "coordinate_spatial"

class ConfidenceLevel(Enum):
    """置信度级别"""
    VERY_HIGH = 0.9
    HIGH = 0.8
    MEDIUM = 0.6
    LOW = 0.4
    VERY_LOW = 0.2

@dataclass
class ExtractionResult:
    """单个提取方法的结果"""
    method: ExtractionMethod
    success: bool
    data: Dict[str, Any]
    confidence: float
    processing_time: float
    error_message: Optional[str] = None
    
    def to_dict(self):
        return {
            'method': self.method.value,
            'success': self.success,
            'data': self.data,
            'confidence': self.confidence,
            'processing_time': self.processing_time,
            'error_message': self.error_message
        }

@dataclass
class FusionResult:
    """融合结果"""
    final_data: Dict[str, Any]
    confidence_scores: Dict[str, float]
    method_contributions: Dict[str, str]  # 字段名 -> 提取方法
    validation_results: Dict[str, bool]
    processing_summary: Dict[str, Any]

class MultiEngineFusion:
    """多引擎融合策略"""
    
    def __init__(self):
        self.method_priorities = {
            ExtractionMethod.PYMUPDF4LLM: 1,      # 最高优先级 - 结构完整
            ExtractionMethod.INVOICE2DATA: 2,     # 高优先级 - 模板精确
            ExtractionMethod.PDFPLUMBER: 3,       # 中优先级 - 表格补充
            ExtractionMethod.COORDINATE: 4        # 低优先级 - 验证补充
        }
        
        self.field_weights = {
            # 基础发票信息 - 高权重
            'invoice_number': 1.0,
            'date': 1.0, 
            'amount': 1.0,
            'total_amount': 1.0,
            
            # 公司信息 - 中高权重
            'buyer_name': 0.8,
            'seller_name': 0.8,
            'buyer_tax_id': 0.7,
            'seller_tax_id': 0.7,
            
            # 其他信息 - 中等权重
            'invoice_type': 0.6,
            'issuer_person': 0.5,
            'items': 0.4
        }
    
    def design_extraction_strategy(self, pdf_path: str, 
                                 file_characteristics: Dict[str, Any]) -> Dict[str, Any]:
        """
        基于文件特征设计提取策略
        
        Args:
            pdf_path: PDF文件路径
            file_characteristics: 文件特征（如文件大小、页数、类型等）
            
        Returns:
            提取策略配置
        """
        strategy = {
            'primary_methods': [],
            'fallback_methods': [],
            'validation_methods': [],
            'fusion_rules': {},
            'confidence_thresholds': {}
        }
        
        # 根据文件特征选择策略
        file_size_mb = file_characteristics.get('size_mb', 0)
        page_count = file_characteristics.get('page_count', 1)
        invoice_type = file_characteristics.get('suspected_type', 'unknown')
        
        # 基础策略：始终使用PyMuPDF4LLM作为主要方法
        strategy['primary_methods'].append({
            'method': ExtractionMethod.PYMUPDF4LLM,
            'config': {
                'write_images': False,
                'pages': [0] if page_count > 1 else None  # 多页时只处理第一页
            },
            'expected_confidence': ConfidenceLevel.HIGH.value
        })
        
        # 根据发票类型添加特定策略
        if invoice_type == 'train_ticket' or '铁路' in str(file_characteristics.get('keywords', [])):
            # 火车票 - PyMuPDF4LLM表现很好，添加invoice2data作为验证
            strategy['primary_methods'].append({
                'method': ExtractionMethod.INVOICE2DATA,
                'config': {
                    'template_filter': ['china_railway_ticket'],
                    'input_module': 'pymupdf_input'
                },
                'expected_confidence': ConfidenceLevel.VERY_HIGH.value
            })
        
        elif invoice_type == 'standard_invoice' or '普通发票' in str(file_characteristics.get('keywords', [])):
            # 标准发票 - 两种方法并行
            strategy['primary_methods'].append({
                'method': ExtractionMethod.INVOICE2DATA,
                'config': {
                    'template_filter': ['china_standard_invoice_optimized'],
                    'input_module': 'pymupdf_input'
                },
                'expected_confidence': ConfidenceLevel.HIGH.value
            })
            
            # 添加表格提取作为补充
            strategy['fallback_methods'].append({
                'method': ExtractionMethod.PDFPLUMBER,
                'config': {
                    'extract_tables': True,
                    'table_settings': {'vertical_strategy': 'lines'}
                },
                'expected_confidence': ConfidenceLevel.MEDIUM.value
            })
        
        else:
            # 未知类型 - 全面策略
            strategy['primary_methods'].extend([
                {
                    'method': ExtractionMethod.INVOICE2DATA,
                    'config': {
                        'template_filter': None,  # 使用所有模板
                        'input_module': 'pymupdf_input'
                    },
                    'expected_confidence': ConfidenceLevel.MEDIUM.value
                },
                {
                    'method': ExtractionMethod.PDFPLUMBER,
                    'config': {
                        'extract_tables': True,
                        'extract_text': True
                    },
                    'expected_confidence': ConfidenceLevel.MEDIUM.value
                }
            ])
        
        # 文件大小考虑
        if file_size_mb > 5:  # 大文件
            # 优先使用轻量级方法
            strategy['confidence_thresholds']['quick_exit'] = ConfidenceLevel.HIGH.value
        
        # 验证方法 - 坐标提取用于关键字段验证
        strategy['validation_methods'].append({
            'method': ExtractionMethod.COORDINATE,
            'config': {
                'target_fields': ['invoice_number', 'amount', 'date'],
                'spatial_validation': True
            },
            'expected_confidence': ConfidenceLevel.MEDIUM.value
        })
        
        # 融合规则
        strategy['fusion_rules'] = {
            'field_selection': 'weighted_priority',  # 加权优先级选择
            'conflict_resolution': 'confidence_based',  # 基于置信度解决冲突
            'validation_threshold': ConfidenceLevel.MEDIUM.value,
            'cross_validation': True  # 交叉验证
        }
        
        return strategy
    
    def fuse_extraction_results(self, results: List[ExtractionResult]) -> FusionResult:
        """
        融合多个提取结果
        
        Args:
            results: 各个方法的提取结果
            
        Returns:
            融合后的最终结果
        """
        fusion_result = FusionResult(
            final_data={},
            confidence_scores={},
            method_contributions={},
            validation_results={},
            processing_summary={}
        )
        
        # 收集所有成功的结果
        successful_results = [r for r in results if r.success]
        
        if not successful_results:
            fusion_result.processing_summary['status'] = 'all_methods_failed'
            return fusion_result
        
        # 为每个字段选择最佳值
        all_fields = set()
        for result in successful_results:
            all_fields.update(result.data.keys())
        
        for field in all_fields:
            if field in self.field_weights:
                best_value, best_method, best_confidence = self._select_best_field_value(
                    field, successful_results
                )
                
                if best_value is not None:
                    fusion_result.final_data[field] = best_value
                    fusion_result.confidence_scores[field] = best_confidence
                    fusion_result.method_contributions[field] = best_method.value
        
        # 交叉验证
        fusion_result.validation_results = self._cross_validate_fields(
            fusion_result.final_data, successful_results
        )
        
        # 处理摘要
        fusion_result.processing_summary = {
            'status': 'success',
            'methods_used': len(successful_results),
            'total_methods': len(results),
            'fields_extracted': len(fusion_result.final_data),
            'average_confidence': sum(fusion_result.confidence_scores.values()) / len(fusion_result.confidence_scores) if fusion_result.confidence_scores else 0,
            'validation_pass_rate': sum(fusion_result.validation_results.values()) / len(fusion_result.validation_results) if fusion_result.validation_results else 0
        }
        
        return fusion_result
    
    def _select_best_field_value(self, field: str, results: List[ExtractionResult]) -> tuple:
        """选择字段的最佳值"""
        candidates = []
        
        for result in results:
            if field in result.data:
                value = result.data[field]
                if value is not None and str(value).strip():
                    # 计算综合分数：方法优先级 + 置信度 + 字段权重
                    method_priority_score = 1.0 / self.method_priorities[result.method]
                    confidence_score = result.confidence
                    field_weight = self.field_weights.get(field, 0.5)
                    
                    total_score = (method_priority_score * 0.4 + 
                                 confidence_score * 0.4 + 
                                 field_weight * 0.2)
                    
                    candidates.append({
                        'value': value,
                        'method': result.method,
                        'confidence': result.confidence,
                        'score': total_score
                    })
        
        if not candidates:
            return None, None, 0.0
        
        # 按分数排序，选择最高分
        candidates.sort(key=lambda x: x['score'], reverse=True)
        best = candidates[0]
        
        return best['value'], best['method'], best['confidence']
    
    def _cross_validate_fields(self, final_data: Dict[str, Any], 
                             results: List[ExtractionResult]) -> Dict[str, bool]:
        """交叉验证字段"""
        validation_results = {}
        
        for field, value in final_data.items():
            if field in ['invoice_number', 'amount', 'date']:  # 关键字段需要验证
                # 检查是否有多个方法提取到相同或相似的值
                matching_methods = 0
                total_methods = 0
                
                for result in results:
                    if field in result.data:
                        total_methods += 1
                        result_value = result.data[field]
                        
                        if self._values_match(value, result_value, field):
                            matching_methods += 1
                
                # 验证通过条件：至少50%的方法一致，或只有一个方法但置信度很高
                if total_methods >= 2:
                    validation_results[field] = matching_methods / total_methods >= 0.5
                else:
                    # 只有一个方法，检查置信度
                    validation_results[field] = True  # 假设单一高置信度方法可信
            else:
                validation_results[field] = True  # 非关键字段暂时通过
        
        return validation_results
    
    def _values_match(self, value1: Any, value2: Any, field: str) -> bool:
        """判断两个值是否匹配"""
        if value1 == value2:
            return True
        
        # 字符串相似度比较
        str1, str2 = str(value1).strip(), str(value2).strip()
        
        if field == 'amount':
            # 金额比较 - 移除格式差异
            try:
                num1 = float(str1.replace(',', '').replace('¥', '').replace('￥', ''))
                num2 = float(str2.replace(',', '').replace('¥', '').replace('￥', ''))
                return abs(num1 - num2) < 0.01  # 允许小数点误差
            except:
                return str1.lower() == str2.lower()
        
        elif field == 'invoice_number':
            # 发票号码 - 只比较数字部分
            import re
            digits1 = re.findall(r'\d+', str1)
            digits2 = re.findall(r'\d+', str2)
            return digits1 == digits2 and digits1  # 非空且相等
        
        else:
            # 一般字符串比较 - 考虑空格和大小写
            return str1.lower().replace(' ', '') == str2.lower().replace(' ', '')

def create_test_fusion_strategy():
    """创建测试融合策略"""
    fusion = MultiEngineFusion()
    
    # 模拟不同类型发票的策略设计
    test_cases = [
        {
            'name': '火车票',
            'characteristics': {
                'size_mb': 0.5,
                'page_count': 1,
                'suspected_type': 'train_ticket',
                'keywords': ['铁路电子客票', '12306']
            }
        },
        {
            'name': '标准发票',
            'characteristics': {
                'size_mb': 1.2,
                'page_count': 1,
                'suspected_type': 'standard_invoice',
                'keywords': ['电子发票', '普通发票']
            }
        },
        {
            'name': '未知类型大文件',
            'characteristics': {
                'size_mb': 8.5,
                'page_count': 3,
                'suspected_type': 'unknown',
                'keywords': []
            }
        }
    ]
    
    print("🎯 多引擎融合策略设计")
    print("=" * 60)
    
    for test_case in test_cases:
        print(f"\n📋 测试用例: {test_case['name']}")
        print("-" * 40)
        
        strategy = fusion.design_extraction_strategy("dummy.pdf", test_case['characteristics'])
        
        print(f"主要方法 ({len(strategy['primary_methods'])}个):")
        for i, method in enumerate(strategy['primary_methods'], 1):
            print(f"  {i}. {method['method'].value} (置信度期望: {method['expected_confidence']:.1f})")
            if method['config']:
                print(f"     配置: {method['config']}")
        
        if strategy['fallback_methods']:
            print(f"\n备用方法 ({len(strategy['fallback_methods'])}个):")
            for i, method in enumerate(strategy['fallback_methods'], 1):
                print(f"  {i}. {method['method'].value} (置信度期望: {method['expected_confidence']:.1f})")
        
        if strategy['validation_methods']:
            print(f"\n验证方法 ({len(strategy['validation_methods'])}个):")
            for i, method in enumerate(strategy['validation_methods'], 1):
                print(f"  {i}. {method['method'].value} (目标字段: {method['config'].get('target_fields', [])})")
        
        print(f"\n融合规则:")
        for rule, value in strategy['fusion_rules'].items():
            print(f"  - {rule}: {value}")

def demonstrate_fusion_logic():
    """演示融合逻辑"""
    fusion = MultiEngineFusion()
    
    # 模拟多个提取结果
    mock_results = [
        ExtractionResult(
            method=ExtractionMethod.PYMUPDF4LLM,
            success=True,
            data={
                'invoice_number': '25442000000101203423',
                'amount': '336.00',
                'seller_name': '广州寿司郎餐饮有限公司',
                'buyer_name': '杭州趣链科技有限公司'
            },
            confidence=0.85,
            processing_time=1.2
        ),
        ExtractionResult(
            method=ExtractionMethod.INVOICE2DATA,
            success=True,
            data={
                'invoice_number': '25442000000101203423',
                'amount': '336.0',  # 略微不同的格式
                'date': '2025年02月24日',
                'seller_name': '广州寿司郎餐饮有限公司'
            },
            confidence=0.90,
            processing_time=0.8
        ),
        ExtractionResult(
            method=ExtractionMethod.PDFPLUMBER,
            success=True,
            data={
                'amount': '¥336.00',  # 带符号
                'buyer_name': '杭州趣链科技有限公司',
                'items': ['餐饮服务']
            },
            confidence=0.65,
            processing_time=1.5
        )
    ]
    
    print(f"\n🔄 融合演示")
    print("=" * 60)
    
    # 显示输入结果
    print("输入结果:")
    for result in mock_results:
        print(f"  {result.method.value} (置信度: {result.confidence:.2f}):")
        for field, value in result.data.items():
            print(f"    {field}: {value}")
        print()
    
    # 执行融合
    fusion_result = fusion.fuse_extraction_results(mock_results)
    
    # 显示融合结果
    print("融合结果:")
    print(f"  最终数据 ({len(fusion_result.final_data)}个字段):")
    for field, value in fusion_result.final_data.items():
        confidence = fusion_result.confidence_scores.get(field, 0)
        method = fusion_result.method_contributions.get(field, 'unknown')
        validated = fusion_result.validation_results.get(field, False)
        print(f"    {field}: {value} (置信度: {confidence:.2f}, 来源: {method}, 验证: {'✓' if validated else '✗'})")
    
    print(f"\n  处理摘要:")
    for key, value in fusion_result.processing_summary.items():
        print(f"    {key}: {value}")

def main():
    """主函数"""
    print("🚀 多引擎融合设计方案")
    print("=" * 60)
    
    print("核心设计理念:")
    print("1. 分层策略：主要方法 + 备用方法 + 验证方法")  
    print("2. 智能选择：根据文件特征动态选择方法组合")
    print("3. 置信度融合：基于方法优先级和置信度选择最佳值")
    print("4. 交叉验证：关键字段多方法验证确保准确性")
    print("5. 容错机制：单点失败不影响整体提取效果")
    
    # 创建策略设计示例
    create_test_fusion_strategy()
    
    # 演示融合逻辑
    demonstrate_fusion_logic()
    
    print(f"\n🎉 设计完成")
    print("=" * 60)
    print("下一步实施建议:")
    print("1. 实现多引擎融合类的完整功能")
    print("2. 集成到现有的invoice2data客户端中")
    print("3. 添加性能监控和A/B测试功能")
    print("4. 建立融合效果评估指标体系")

if __name__ == "__main__":
    main()