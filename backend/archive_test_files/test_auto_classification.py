#!/usr/bin/env python3
"""
测试自动分类功能
"""

import sys
import asyncio
from pathlib import Path
from dataclasses import asdict

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.invoice_classification_service import InvoiceClassificationService, ClassificationResult
from app.services.ocr.models import StructuredInvoiceData, InvoiceMainInfo, InvoicePartyInfo, InvoiceSummary
from app.services.ocr.invoice2data_client import Invoice2DataClient
from app.services.ocr.config import OCRConfig


class MockAsyncSession:
    """模拟异步数据库会话，用于测试"""
    
    async def execute(self, stmt):
        """模拟查询执行"""
        return MockResult()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

class MockResult:
    """模拟查询结果"""
    
    def scalar_one_or_none(self):
        """模拟返回分类对象"""
        return MockCategory()

class MockCategory:
    """模拟分类对象"""
    
    def __init__(self):
        self.id = "mock_id_123"
        self.code = "transportation"
        self.name = "交通出行"


def create_test_invoice_data(invoice_type: str, seller_name: str, amount: float) -> StructuredInvoiceData:
    """创建测试用的发票数据"""
    
    main_info = InvoiceMainInfo(
        invoice_number="TEST123456789",
        invoice_type=invoice_type,
        invoice_date=None
    )
    
    seller_info = InvoicePartyInfo(
        name=seller_name,
        tax_id="91330108MA27Y5XH5G"
    )
    
    buyer_info = InvoicePartyInfo(
        name="杭州趣链科技有限公司",
        tax_id="91330108MA27Y5XH5G"
    )
    
    summary = InvoiceSummary(
        amount=amount,
        total_amount=amount
    )
    
    return StructuredInvoiceData(
        main_info=main_info,
        seller_info=seller_info,
        buyer_info=buyer_info,
        summary=summary,
        items=[]
    )


async def test_classification_rules():
    """测试分类规则"""
    
    print("🧪 测试自动分类功能")
    print("=" * 60)
    
    # 创建分类服务
    classification_service = InvoiceClassificationService()
    mock_session = MockAsyncSession()
    
    # 定义测试用例
    test_cases = [
        {
            'name': '火车票',
            'invoice_type': '电子发票（铁路电子客票）',
            'seller_name': '中国铁路客票',
            'amount': 35.5,
            'expected_primary': 'transportation',
            'expected_secondary': 'train'
        },
        {
            'name': '餐饮发票',
            'invoice_type': '电子发票（普通发票）',
            'seller_name': '广州寿司郎餐饮有限公司',
            'amount': 336.0,
            'expected_primary': 'dining',
            'expected_secondary': 'meal'
        },
        {
            'name': '小额餐饮',
            'invoice_type': '电子发票（普通发票）',
            'seller_name': '湖南曾小厨餐饮管理有限公司贤童店',
            'amount': 80.0,
            'expected_primary': 'dining',
            'expected_secondary': 'meal'
        },
        {
            'name': '酒店住宿',
            'invoice_type': '电子发票（普通发票）',
            'seller_name': '如家酒店管理有限公司',
            'amount': 268.0,
            'expected_primary': 'accommodation',
            'expected_secondary': 'hotel'
        },
        {
            'name': '出租车',
            'invoice_type': '电子发票（普通发票）',
            'seller_name': '滴滴出行科技有限公司',
            'amount': 25.5,
            'expected_primary': 'transportation',
            'expected_secondary': 'taxi'
        },
        {
            'name': '办公用品',
            'invoice_type': '电子发票（普通发票）',
            'seller_name': '北京文具用品有限公司',
            'amount': 156.8,
            'expected_primary': 'office',
            'expected_secondary': 'stationery'
        }
    ]
    
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. 测试用例: {test_case['name']}")
        print(f"   发票类型: {test_case['invoice_type']}")
        print(f"   销售方: {test_case['seller_name']}")
        print(f"   金额: ¥{test_case['amount']}")
        print(f"   期望分类: {test_case['expected_primary']} -> {test_case.get('expected_secondary', 'None')}")
        
        # 创建测试数据
        invoice_data = create_test_invoice_data(
            test_case['invoice_type'],
            test_case['seller_name'], 
            test_case['amount']
        )
        
        try:
            # 执行分类
            classification_result = await classification_service.classify_invoice(invoice_data, mock_session)
            
            if classification_result:
                print(f"   ✅ 分类成功:")
                print(f"      一级分类: {classification_result.primary_category_code}")
                print(f"      二级分类: {classification_result.secondary_category_code}")
                print(f"      置信度: {classification_result.confidence:.2f}")
                print(f"      原因: {classification_result.reason}")
                print(f"      规则类型: {classification_result.rule_type}")
                
                # 检查是否符合预期
                primary_match = classification_result.primary_category_code == test_case['expected_primary']
                secondary_match = classification_result.secondary_category_code == test_case.get('expected_secondary')
                
                if primary_match and (not test_case.get('expected_secondary') or secondary_match):
                    print(f"      🎯 分类准确!")
                    results.append(True)
                else:
                    print(f"      ⚠️  分类不准确!")
                    results.append(False)
            else:
                print(f"   ❌ 分类失败")
                results.append(False)
                
        except Exception as e:
            print(f"   💥 分类异常: {e}")
            results.append(False)
    
    # 统计结果
    print(f"\n" + "=" * 60)
    print(f"📊 测试结果统计:")
    print(f"   总测试用例: {len(test_cases)}")
    print(f"   成功案例: {sum(results)}")
    print(f"   失败案例: {len(results) - sum(results)}")
    print(f"   准确率: {sum(results)/len(results)*100:.1f}%")
    
    return results


async def test_real_invoice_data():
    """测试真实发票数据的分类"""
    
    print(f"\n" + "=" * 60)
    print("🔄 测试真实发票数据分类")
    print("=" * 60)
    
    downloads_dir = Path("/Users/xumingyang/app/invoice_assist/downloads")
    
    # 测试文件（已知有成功提取的）
    test_files = [
        "25442000000101203423.pdf",  # 餐饮发票
        "25432000000031789815.pdf",  # 餐饮发票
        "25359134169000052039.pdf"   # 火车票
    ]
    
    # 创建OCR配置（简化版）
    class MockOCRConfig:
        def __init__(self):
            self.api_token = "mock_token"
    
    # 创建服务
    classification_service = InvoiceClassificationService()
    mock_session = MockAsyncSession()
    
    try:
        # 使用优化后的invoice2data客户端
        config = MockOCRConfig()
        invoice2data_client = Invoice2DataClient(config)
        
        real_results = []
        
        for file_name in test_files:
            pdf_path = downloads_dir / file_name
            
            if not pdf_path.exists():
                print(f"⚠️ 跳过不存在的文件: {file_name}")
                continue
            
            print(f"\n📄 处理文件: {file_name}")
            
            # 提取发票数据
            try:
                extraction_result = await invoice2data_client.extract_invoice_data(str(pdf_path))
                
                if extraction_result['status'] == 'success':
                    structured_data = extraction_result['structured_data']
                    print(f"   ✅ 数据提取成功")
                    print(f"      发票号码: {structured_data.main_info.invoice_number}")
                    print(f"      发票类型: {structured_data.main_info.invoice_type}")
                    print(f"      销售方: {structured_data.seller_info.name}")
                    print(f"      金额: ¥{structured_data.summary.amount}")
                    
                    # 进行分类
                    classification_result = await classification_service.classify_invoice(structured_data, mock_session)
                    
                    if classification_result:
                        print(f"   🎯 自动分类结果:")
                        print(f"      一级分类: {classification_result.primary_category_code}")
                        print(f"      二级分类: {classification_result.secondary_category_code}")
                        print(f"      置信度: {classification_result.confidence:.2f}")
                        print(f"      分类原因: {classification_result.reason}")
                        print(f"      规则类型: {classification_result.rule_type}")
                        real_results.append(True)
                    else:
                        print(f"   ❌ 分类失败")
                        real_results.append(False)
                else:
                    print(f"   ❌ 数据提取失败: {extraction_result.get('error', 'Unknown')}")
                    real_results.append(False)
                    
            except Exception as e:
                print(f"   💥 处理异常: {e}")
                real_results.append(False)
        
        print(f"\n📈 真实数据测试结果:")
        print(f"   处理文件: {len(real_results)}")
        print(f"   分类成功: {sum(real_results)}")
        print(f"   成功率: {sum(real_results)/len(real_results)*100:.1f}%")
        
        return real_results
        
    except Exception as e:
        print(f"💥 真实数据测试异常: {e}")
        return []


async def main():
    """主函数"""
    print("🚀 自动分类功能完整测试")
    print("=" * 60)
    
    # 测试规则分类
    rule_results = await test_classification_rules()
    
    # 测试真实数据分类
    real_results = await test_real_invoice_data()
    
    # 综合统计
    total_tests = len(rule_results) + len(real_results)
    total_success = sum(rule_results) + sum(real_results)
    
    print(f"\n" + "🎉" * 20)
    print(f"🏆 自动分类功能测试完成")
    print(f"=" * 60)
    print(f"总测试: {total_tests}")
    print(f"成功: {total_success}")
    print(f"总体准确率: {total_success/total_tests*100:.1f}%")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())