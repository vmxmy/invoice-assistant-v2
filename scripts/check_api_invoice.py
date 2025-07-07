#!/usr/bin/env python3
"""
检查API创建的发票记录
"""

import sys
from pathlib import Path
import asyncio

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import get_db
from app.models.invoice import Invoice
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def check_invoice():
    """检查最新的发票记录"""
    
    print("🔍 检查API创建的发票记录")
    print("=" * 60)
    
    async for db in get_db():
        # 查询最新的发票记录
        query = select(Invoice).order_by(Invoice.created_at.desc()).limit(5)
        result = await db.execute(query)
        invoices = result.scalars().all()
        
        if not invoices:
            print("❌ 没有找到发票记录")
            return
            
        print(f"✅ 找到 {len(invoices)} 条最新发票记录:\n")
        
        for i, invoice in enumerate(invoices, 1):
            print(f"📄 发票 {i}:")
            print(f"   ID: {invoice.id}")
            print(f"   发票号码: {invoice.invoice_number}")
            print(f"   文件路径: {invoice.file_path}")
            print(f"   金额: {invoice.amount}")
            print(f"   销售方: {invoice.seller_name}")
            print(f"   购买方: {invoice.buyer_name}")
            print(f"   创建时间: {invoice.created_at}")
            
            # 检查提取的数据
            if invoice.extracted_data:
                print(f"   提取的数据:")
                for key, value in invoice.extracted_data.items():
                    if key in ['departure_station', 'arrival_station', 'train_number', 'departure_date', 'departure_time']:
                        print(f"     {key}: {value}")
            
            print()

if __name__ == "__main__":
    asyncio.run(check_invoice())