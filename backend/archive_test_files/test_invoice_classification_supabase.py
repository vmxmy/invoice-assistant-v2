#!/usr/bin/env python3
"""
测试发票自动分类功能 - 使用 Supabase
"""

import asyncio
import sys
from pathlib import Path
from typing import Dict, Any
from datetime import datetime
from uuid import uuid4

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.core.database import async_session_maker
from app.services.invoice_classification_service import InvoiceClassificationService, ClassificationResult
from app.services.ocr.models import (
    StructuredInvoiceData, InvoiceMainInfo, InvoicePartyInfo, InvoiceSummary
)
from app.models.category import PrimaryCategory, SecondaryCategory
from app.models.invoice import Invoice
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


# 测试数据：模拟不同类型的发票
TEST_INVOICES = [
    {
        "name": "火车票",
        "data": StructuredInvoiceData(
            main_info=InvoiceMainInfo(
                invoice_number="25432000000031789815",
                invoice_type="铁路电子客票",
                invoice_date="2024-12-15"
            ),
            seller_info=InvoicePartyInfo(
                name="中国铁路"
            ),
            buyer_info=InvoicePartyInfo(
                name="张三"
            ),
            summary=InvoiceSummary(
                amount=256.50,
                total_amount=256.50
            )
        ),
        "expected": ("transportation", "train")
    },
    {
        "name": "机票",
        "data": StructuredInvoiceData(
            main_info=InvoiceMainInfo(
                invoice_number="MU5678901234",
                invoice_type="航空电子客票",
                invoice_date="2024-12-10"
            ),
            seller_info=InvoicePartyInfo(
                name="东方航空股份有限公司"
            ),
            buyer_info=InvoicePartyInfo(
                name="李四"
            ),
            summary=InvoiceSummary(
                amount=1280.00,
                total_amount=1280.00
            )
        ),
        "expected": ("transportation", "flight")
    },
    {
        "name": "出租车发票",
        "data": StructuredInvoiceData(
            main_info=InvoiceMainInfo(
                invoice_number="12345678",
                invoice_type="出租车发票",
                invoice_date="2024-12-20"
            ),
            seller_info=InvoicePartyInfo(
                name="北京市出租汽车公司"
            ),
            buyer_info=InvoicePartyInfo(
                name="王五"
            ),
            summary=InvoiceSummary(
                amount=45.00,
                total_amount=45.00
            )
        ),
        "expected": ("transportation", "taxi")
    },
    {
        "name": "滴滴发票",
        "data": StructuredInvoiceData(
            main_info=InvoiceMainInfo(
                invoice_number="DD202412200001",
                invoice_type="电子发票",
                invoice_date="2024-12-20"
            ),
            seller_info=InvoicePartyInfo(
                name="滴滴出行科技有限公司"
            ),
            buyer_info=InvoicePartyInfo(
                name="赵六"
            ),
            summary=InvoiceSummary(
                amount=68.50,
                total_amount=68.50
            )
        ),
        "expected": ("transportation", "taxi")
    },
    {
        "name": "餐饮发票",
        "data": StructuredInvoiceData(
            main_info=InvoiceMainInfo(
                invoice_number="25442000000101203423",
                invoice_type="增值税普通发票",
                invoice_date="2024-12-18"
            ),
            seller_info=InvoicePartyInfo(
                name="湖南曾小厨餐饮管理有限公司贤童店"
            ),
            buyer_info=InvoicePartyInfo(
                name="陈七"
            ),
            summary=InvoiceSummary(
                amount=158.00,
                total_amount=158.00
            )
        ),
        "expected": ("dining", "meal")
    },
    {
        "name": "酒店发票",
        "data": StructuredInvoiceData(
            main_info=InvoiceMainInfo(
                invoice_number="HT20241220001",
                invoice_type="增值税普通发票",
                invoice_date="2024-12-20"
            ),
            seller_info=InvoicePartyInfo(
                name="如家酒店连锁(北京)有限公司"
            ),
            buyer_info=InvoicePartyInfo(
                name="周八"
            ),
            summary=InvoiceSummary(
                amount=398.00,
                total_amount=398.00
            )
        ),
        "expected": ("accommodation", "hotel")
    },
    {
        "name": "办公用品发票",
        "data": StructuredInvoiceData(
            main_info=InvoiceMainInfo(
                invoice_number="BG20241220001",
                invoice_type="增值税普通发票",
                invoice_date="2024-12-20"
            ),
            seller_info=InvoicePartyInfo(
                name="晨光文具股份有限公司"
            ),
            buyer_info=InvoicePartyInfo(
                name="某科技公司"
            ),
            summary=InvoiceSummary(
                amount=256.80,
                total_amount=256.80
            )
        ),
        "expected": ("office", "stationery")
    },
    {
        "name": "未知类型发票",
        "data": StructuredInvoiceData(
            main_info=InvoiceMainInfo(
                invoice_number="UNKNOWN001",
                invoice_type="增值税普通发票",
                invoice_date="2024-12-20"
            ),
            seller_info=InvoicePartyInfo(
                name="某某贸易有限公司"
            ),
            buyer_info=InvoicePartyInfo(
                name="测试公司"
            ),
            summary=InvoiceSummary(
                amount=1000.00,
                total_amount=1000.00
            )
        ),
        "expected": ("other", None)
    }
]


async def check_or_create_categories(session: AsyncSession):
    """检查或创建分类数据"""
    # 检查是否已存在分类
    result = await session.execute(select(PrimaryCategory).limit(1))
    if result.scalars().first():
        print("✓ 分类数据已存在")
        return
    
    print("初始化分类数据...")
    
    # 创建一级分类
    primary_categories = [
        PrimaryCategory(
            code="transportation",
            name="交通",
            color="#2196F3",
            icon="transport",
            sort_order=1
        ),
        PrimaryCategory(
            code="accommodation",
            name="住宿",
            color="#FF9800",
            icon="bed",
            sort_order=2
        ),
        PrimaryCategory(
            code="dining",
            name="餐饮",
            color="#4CAF50",
            icon="restaurant",
            sort_order=3
        ),
        PrimaryCategory(
            code="office",
            name="办公",
            color="#9C27B0",
            icon="office",
            sort_order=4
        ),
        PrimaryCategory(
            code="other",
            name="其他",
            color="#607D8B",
            icon="category",
            sort_order=5
        )
    ]
    
    session.add_all(primary_categories)
    await session.flush()
    
    # 创建二级分类
    secondary_mapping = {
        "transportation": [
            ("flight", "飞机"),
            ("train", "火车"),
            ("taxi", "出租车"),
            ("bus", "公交")
        ],
        "accommodation": [
            ("hotel", "酒店"),
            ("guesthouse", "民宿")
        ],
        "dining": [
            ("meal", "正餐"),
            ("snack", "小食")
        ],
        "office": [
            ("stationery", "文具"),
            ("equipment", "设备")
        ]
    }
    
    for primary in primary_categories:
        if primary.code in secondary_mapping:
            for idx, (code, name) in enumerate(secondary_mapping[primary.code]):
                secondary = SecondaryCategory(
                    primary_category_id=primary.id,
                    code=code,
                    name=name,
                    sort_order=idx + 1,
                    auto_classify_rules={}
                )
                session.add(secondary)
    
    await session.commit()
    print("✓ 分类数据初始化完成")


async def test_classification():
    """测试分类功能"""
    async with async_session_maker() as session:
        # 确保分类数据存在
        await check_or_create_categories(session)
        
        # 创建分类服务
        service = InvoiceClassificationService()
        
        print("\n" + "="*80)
        print("开始测试发票自动分类")
        print("="*80 + "\n")
        
        results = []
        
        for test_case in TEST_INVOICES:
            print(f"测试发票: {test_case['name']}")
            print("-" * 40)
            
            # 执行分类
            result = await service.classify_invoice(test_case['data'], session)
            
            if result:
                # 验证结果
                expected_primary, expected_secondary = test_case['expected']
                is_primary_correct = result.primary_category_code == expected_primary
                is_secondary_correct = (
                    result.secondary_category_code == expected_secondary 
                    if expected_secondary 
                    else result.secondary_category_code is None
                )
                
                status = "✅" if is_primary_correct and is_secondary_correct else "❌"
                
                print(f"{status} 分类结果:")
                print(f"   一级分类: {result.primary_category_code} ({result.metadata.get('primary_category_name')})")
                print(f"   二级分类: {result.secondary_category_code} ({result.metadata.get('secondary_category_name')})")
                print(f"   置信度: {result.confidence:.2f}")
                print(f"   规则类型: {result.rule_type}")
                print(f"   匹配原因: {result.reason}")
                
                if not (is_primary_correct and is_secondary_correct):
                    print(f"   ⚠️ 期望: {expected_primary}/{expected_secondary}")
                
                results.append({
                    "name": test_case['name'],
                    "success": is_primary_correct and is_secondary_correct,
                    "result": result
                })
            else:
                print("❌ 分类失败: 无法匹配任何规则")
                results.append({
                    "name": test_case['name'],
                    "success": False,
                    "result": None
                })
            
            print()
        
        # 统计结果
        print("\n" + "="*80)
        print("测试结果统计")
        print("="*80)
        
        success_count = sum(1 for r in results if r['success'])
        total_count = len(results)
        success_rate = (success_count / total_count * 100) if total_count > 0 else 0
        
        print(f"总测试数: {total_count}")
        print(f"成功数: {success_count}")
        print(f"失败数: {total_count - success_count}")
        print(f"成功率: {success_rate:.1f}%")
        
        if success_count < total_count:
            print("\n失败的测试:")
            for r in results:
                if not r['success']:
                    print(f"  - {r['name']}")


async def test_real_invoice_classification():
    """测试真实发票的分类"""
    print("\n" + "="*80)
    print("测试真实发票分类")
    print("="*80 + "\n")
    
    async with async_session_maker() as session:
        # 确保分类数据存在
        await check_or_create_categories(session)
        
        # 获取一些最近的发票
        stmt = select(Invoice).limit(5).order_by(Invoice.created_at.desc())
        result = await session.execute(stmt)
        invoices = result.scalars().all()
        
        if not invoices:
            print("没有找到任何发票数据")
            return
        
        service = InvoiceClassificationService()
        
        for invoice in invoices:
            print(f"\n发票号码: {invoice.invoice_number}")
            print(f"销售方: {invoice.seller_name}")
            print(f"金额: ¥{invoice.total_amount}")
            
            # 从 extracted_data 重建结构化数据
            structured_data = service._rebuild_structured_data(invoice.extracted_data)
            
            if structured_data:
                # 执行分类
                classification = await service.classify_invoice(structured_data, session)
                
                if classification:
                    print(f"✅ 分类成功:")
                    print(f"   分类: {classification.metadata.get('primary_category_name')} / {classification.metadata.get('secondary_category_name') or '无'}")
                    print(f"   置信度: {classification.confidence:.2f}")
                    print(f"   原因: {classification.reason}")
                    
                    # 更新发票分类
                    invoice.set_classification(
                        primary_category_id=classification.primary_category_id,
                        secondary_category_id=classification.secondary_category_id,
                        confidence=classification.confidence,
                        is_auto=True,
                        metadata={
                            'rule_type': classification.rule_type,
                            'reason': classification.reason,
                            'classified_at': str(datetime.utcnow())
                        }
                    )
                else:
                    print("❌ 无法分类")
            else:
                print("❌ 无法重建发票数据")
        
        # 保存更改
        await session.commit()
        print("\n✓ 真实发票分类完成")


async def main():
    """主函数"""
    print("🚀 发票自动分类测试 (Supabase)")
    print(f"数据库: {settings.database_url.split('@')[1].split('/')[0]}")
    
    try:
        # 测试模拟数据分类
        await test_classification()
        
        # 测试真实发票分类
        await test_real_invoice_classification()
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())