#!/usr/bin/env python3
"""
统一发票处理验证脚本

验证统一处理流程的兼容性和正确性：
1. 确保现有数据可以正常读取和显示
2. 验证商品明细在多个路径下可访问
3. 测试手动上传和邮件处理的一致性
4. 检查前端是否能正常显示发票数据
"""

import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.invoice import Invoice, InvoiceSource
from app.core.config import settings
from app.utils.field_mapping import merge_to_standard_format

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class UnifiedProcessingVerifier:
    """统一处理验证器"""
    
    def __init__(self):
        """初始化验证器"""
        self.engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            pool_pre_ping=True
        )
        self.SessionLocal = sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        self.verification_results = {
            'total_invoices': 0,
            'items_path_check': {
                'passed': 0,
                'failed': 0,
                'details': []
            },
            'data_consistency': {
                'passed': 0,
                'failed': 0,
                'details': []
            },
            'source_distribution': {},
            'type_distribution': {},
            'errors': []
        }
    
    async def verify_all(self):
        """执行所有验证"""
        logger.info("开始统一处理验证...")
        
        try:
            # 1. 获取发票统计信息
            await self.get_invoice_statistics()
            
            # 2. 验证商品明细多路径访问
            await self.verify_items_multi_path_access()
            
            # 3. 验证数据一致性
            await self.verify_data_consistency()
            
            # 4. 生成验证报告
            self.generate_report()
            
        except Exception as e:
            logger.error(f"验证过程出错: {str(e)}", exc_info=True)
            self.verification_results['errors'].append({
                'type': 'system_error',
                'message': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
        finally:
            await self.engine.dispose()
    
    async def get_invoice_statistics(self):
        """获取发票统计信息"""
        async with self.SessionLocal() as session:
            # 总数
            total_count = await session.scalar(
                select(func.count(Invoice.id)).where(Invoice.deleted_at.is_(None))
            )
            self.verification_results['total_invoices'] = total_count
            
            # 来源分布
            source_result = await session.execute(
                select(Invoice.source, func.count(Invoice.id))
                .where(Invoice.deleted_at.is_(None))
                .group_by(Invoice.source)
            )
            for source, count in source_result:
                self.verification_results['source_distribution'][source.value if source else 'unknown'] = count
            
            # 类型分布
            type_result = await session.execute(
                select(Invoice.invoice_type, func.count(Invoice.id))
                .where(Invoice.deleted_at.is_(None))
                .group_by(Invoice.invoice_type)
            )
            for invoice_type, count in type_result:
                self.verification_results['type_distribution'][invoice_type or 'unknown'] = count
            
            logger.info(f"发票总数: {total_count}")
            logger.info(f"来源分布: {self.verification_results['source_distribution']}")
            logger.info(f"类型分布: {self.verification_results['type_distribution']}")
    
    async def verify_items_multi_path_access(self):
        """验证商品明细多路径访问"""
        logger.info("验证商品明细多路径访问...")
        
        async with self.SessionLocal() as session:
            # 获取有商品明细的发票样本
            invoices = await session.execute(
                select(Invoice)
                .where(
                    Invoice.deleted_at.is_(None),
                    Invoice.extracted_data.isnot(None)
                )
                .limit(100)  # 抽样100条
            )
            
            for invoice in invoices.scalars():
                try:
                    if not invoice.extracted_data:
                        continue
                    
                    # 检查商品明细是否在多个路径下可用
                    paths_to_check = [
                        'items',
                        'invoice_items',
                        'invoice_details',
                        'invoiceDetails',
                        'commodities'
                    ]
                    
                    items_found = {}
                    items_data = None
                    
                    for path in paths_to_check:
                        if path in invoice.extracted_data:
                            items_found[path] = True
                            if items_data is None:
                                items_data = invoice.extracted_data[path]
                            else:
                                # 验证数据一致性
                                if invoice.extracted_data[path] != items_data:
                                    items_found[path] = False
                        else:
                            items_found[path] = False
                    
                    # 判断是否通过验证
                    if items_data and sum(items_found.values()) >= 3:  # 至少3个路径可用
                        self.verification_results['items_path_check']['passed'] += 1
                    elif items_data:
                        self.verification_results['items_path_check']['failed'] += 1
                        self.verification_results['items_path_check']['details'].append({
                            'invoice_id': str(invoice.id),
                            'invoice_number': invoice.invoice_number,
                            'paths_available': items_found,
                            'message': f"仅 {sum(items_found.values())} 个路径可用"
                        })
                    
                except Exception as e:
                    logger.error(f"验证发票 {invoice.id} 时出错: {str(e)}")
                    self.verification_results['errors'].append({
                        'invoice_id': str(invoice.id),
                        'error': str(e)
                    })
        
        logger.info(
            f"商品明细路径验证 - 通过: {self.verification_results['items_path_check']['passed']}, "
            f"失败: {self.verification_results['items_path_check']['failed']}"
        )
    
    async def verify_data_consistency(self):
        """验证数据一致性"""
        logger.info("验证数据一致性...")
        
        async with self.SessionLocal() as session:
            # 比较不同来源的发票数据结构
            sources = [InvoiceSource.UPLOAD, InvoiceSource.EMAIL]
            
            for source in sources:
                invoices = await session.execute(
                    select(Invoice)
                    .where(
                        Invoice.deleted_at.is_(None),
                        Invoice.source == source,
                        Invoice.extracted_data.isnot(None)
                    )
                    .limit(50)  # 每个来源抽样50条
                )
                
                for invoice in invoices.scalars():
                    try:
                        # 检查关键字段是否存在
                        required_fields = [
                            'invoice_number',
                            'invoice_date',
                            'total_amount',
                            'invoice_type'
                        ]
                        
                        missing_fields = []
                        for field in required_fields:
                            if field not in invoice.extracted_data or not invoice.extracted_data[field]:
                                missing_fields.append(field)
                        
                        if missing_fields:
                            self.verification_results['data_consistency']['failed'] += 1
                            self.verification_results['data_consistency']['details'].append({
                                'invoice_id': str(invoice.id),
                                'invoice_number': invoice.invoice_number,
                                'source': source.value,
                                'missing_fields': missing_fields
                            })
                        else:
                            self.verification_results['data_consistency']['passed'] += 1
                    
                    except Exception as e:
                        logger.error(f"验证发票 {invoice.id} 数据一致性时出错: {str(e)}")
                        self.verification_results['errors'].append({
                            'invoice_id': str(invoice.id),
                            'error': str(e)
                        })
        
        logger.info(
            f"数据一致性验证 - 通过: {self.verification_results['data_consistency']['passed']}, "
            f"失败: {self.verification_results['data_consistency']['failed']}"
        )
    
    def generate_report(self):
        """生成验证报告"""
        report = {
            'verification_time': datetime.utcnow().isoformat(),
            'summary': {
                'total_invoices': self.verification_results['total_invoices'],
                'items_path_check': {
                    'passed': self.verification_results['items_path_check']['passed'],
                    'failed': self.verification_results['items_path_check']['failed'],
                    'pass_rate': self._calculate_pass_rate(
                        self.verification_results['items_path_check']['passed'],
                        self.verification_results['items_path_check']['failed']
                    )
                },
                'data_consistency': {
                    'passed': self.verification_results['data_consistency']['passed'],
                    'failed': self.verification_results['data_consistency']['failed'],
                    'pass_rate': self._calculate_pass_rate(
                        self.verification_results['data_consistency']['passed'],
                        self.verification_results['data_consistency']['failed']
                    )
                }
            },
            'source_distribution': self.verification_results['source_distribution'],
            'type_distribution': self.verification_results['type_distribution'],
            'issues': {
                'items_path_issues': self.verification_results['items_path_check']['details'][:10],  # 前10个
                'data_consistency_issues': self.verification_results['data_consistency']['details'][:10]
            },
            'errors': self.verification_results['errors'][:10]
        }
        
        # 保存报告
        report_path = Path(__file__).parent / f"unified_processing_verification_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        logger.info(f"验证报告已生成: {report_path}")
        
        # 打印摘要
        print("\n" + "="*60)
        print("统一处理验证报告摘要")
        print("="*60)
        print(f"总发票数: {report['summary']['total_invoices']}")
        print(f"\n商品明细路径验证:")
        print(f"  - 通过: {report['summary']['items_path_check']['passed']}")
        print(f"  - 失败: {report['summary']['items_path_check']['failed']}")
        print(f"  - 通过率: {report['summary']['items_path_check']['pass_rate']}%")
        print(f"\n数据一致性验证:")
        print(f"  - 通过: {report['summary']['data_consistency']['passed']}")
        print(f"  - 失败: {report['summary']['data_consistency']['failed']}")
        print(f"  - 通过率: {report['summary']['data_consistency']['pass_rate']}%")
        
        if report['issues']['items_path_issues']:
            print(f"\n需要关注的商品明细路径问题: {len(report['issues']['items_path_issues'])} 个")
        
        if report['issues']['data_consistency_issues']:
            print(f"需要关注的数据一致性问题: {len(report['issues']['data_consistency_issues'])} 个")
        
        if report['errors']:
            print(f"\n验证过程中的错误: {len(report['errors'])} 个")
        
        print("="*60 + "\n")
    
    def _calculate_pass_rate(self, passed: int, failed: int) -> float:
        """计算通过率"""
        total = passed + failed
        if total == 0:
            return 0.0
        return round(passed / total * 100, 2)


async def test_unified_processor_with_sample():
    """测试统一处理器处理样本文件"""
    logger.info("\n测试统一处理器处理样本文件...")
    
    # 查找样本PDF文件
    downloads_dir = Path(__file__).parent.parent / "downloads"
    sample_pdfs = list(downloads_dir.glob("*.pdf"))[:3]  # 取前3个
    
    if not sample_pdfs:
        logger.warning("未找到样本PDF文件")
        return
    
    from app.services.unified_invoice_processor import UnifiedInvoiceProcessor
    from app.core.database import get_async_db
    from uuid import uuid4
    
    # 创建数据库会话
    engine = create_async_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with SessionLocal() as db:
        processor = UnifiedInvoiceProcessor(db=db)
        
        for pdf_path in sample_pdfs:
            try:
                logger.info(f"处理文件: {pdf_path.name}")
                
                result, is_new = await processor.process_single_file(
                    file_path=str(pdf_path),
                    user_id=uuid4(),  # 使用测试用户ID
                    source=InvoiceSource.UPLOAD
                )
                
                if result.get('success'):
                    logger.info(f"✓ 处理成功: {result.get('invoice_number')}")
                    
                    # 验证商品明细路径
                    data = result.get('data', {})
                    items_paths = ['items', 'invoice_items', 'invoice_details', 'invoiceDetails', 'commodities']
                    available_paths = [p for p in items_paths if p in data and data[p]]
                    
                    if available_paths:
                        logger.info(f"  商品明细可用路径: {', '.join(available_paths)}")
                    else:
                        logger.warning(f"  未找到商品明细")
                else:
                    logger.error(f"✗ 处理失败: {result.get('error')}")
                
            except Exception as e:
                logger.error(f"处理 {pdf_path.name} 时出错: {str(e)}")
        
    await engine.dispose()


async def main():
    """主函数"""
    # 1. 执行验证
    verifier = UnifiedProcessingVerifier()
    await verifier.verify_all()
    
    # 2. 测试统一处理器
    await test_unified_processor_with_sample()


if __name__ == "__main__":
    asyncio.run(main())