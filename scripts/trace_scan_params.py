#!/usr/bin/env python3
"""
追踪扫描参数在各个组件间的传递
从API端点到IMAP客户端的完整链路
"""

import logging
import json
from datetime import date, datetime
import asyncio
import os
import sys

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 配置详细日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s:%(lineno)d - %(levelname)s - %(message)s'
)

# 为关键模块设置DEBUG级别
logging.getLogger('app.api.v1.endpoints.email_scan').setLevel(logging.DEBUG)
logging.getLogger('app.services.email_scanner_service').setLevel(logging.DEBUG)
logging.getLogger('app.services.email.hybrid_sync_service').setLevel(logging.DEBUG)
logging.getLogger('app.services.email.imap_client').setLevel(logging.DEBUG)

logger = logging.getLogger(__name__)


def add_trace_logging():
    """为关键方法添加追踪日志"""
    
    # 1. 追踪 EmailScannerService.execute_scan
    from backend.app.services.email_scanner_service import EmailScannerService
    original_execute_scan = EmailScannerService.execute_scan
    
    @staticmethod
    async def traced_execute_scan(db, job_id, user_id):
        logger.info(f"🔍 [EmailScannerService.execute_scan] 开始执行扫描任务: job_id={job_id}")
        result = await original_execute_scan(db, job_id, user_id)
        return result
    
    EmailScannerService.execute_scan = traced_execute_scan
    
    # 2. 追踪 HybridEmailSyncService.sync_account
    from backend.app.services.email.hybrid_sync_service import HybridEmailSyncService
    original_sync_account = HybridEmailSyncService.sync_account
    
    async def traced_sync_account(self, account_id, scan_params=None):
        logger.info(f"🔍 [HybridEmailSyncService.sync_account] account_id={account_id}")
        logger.info(f"🔍 [HybridEmailSyncService.sync_account] scan_params={json.dumps(scan_params, default=str) if scan_params else 'None'}")
        result = await original_sync_account(self, account_id, scan_params)
        return result
    
    HybridEmailSyncService.sync_account = traced_sync_account
    
    # 3. 追踪 _full_sync
    original_full_sync = HybridEmailSyncService._full_sync
    
    async def traced_full_sync(self, account, client, scan_params=None):
        logger.info(f"🔍 [HybridEmailSyncService._full_sync] 开始全量同步")
        logger.info(f"🔍 [HybridEmailSyncService._full_sync] scan_params={json.dumps(scan_params, default=str) if scan_params else 'None'}")
        
        # 打印调用栈
        import traceback
        logger.debug("调用栈:\n" + "".join(traceback.format_stack()[-5:-1]))
        
        result = await original_full_sync(self, account, client, scan_params)
        return result
    
    HybridEmailSyncService._full_sync = traced_full_sync
    
    # 4. 追踪 _build_imap_search_conditions
    original_build_conditions = HybridEmailSyncService._build_imap_search_conditions
    
    def traced_build_conditions(self, scan_params=None):
        logger.info(f"🔍 [HybridEmailSyncService._build_imap_search_conditions] 构建搜索条件")
        logger.info(f"🔍 输入参数: {json.dumps(scan_params, default=str) if scan_params else 'None'}")
        
        conditions = original_build_conditions(self, scan_params)
        
        logger.info(f"🔍 输出条件: {conditions}")
        return conditions
    
    HybridEmailSyncService._build_imap_search_conditions = traced_build_conditions
    
    # 5. 追踪 IMAPClient.search
    from backend.app.services.email.imap_client import IMAPClient
    original_search = IMAPClient.search
    
    def traced_search(self, criteria):
        logger.info(f"🔍 [IMAPClient.search] 执行IMAP搜索")
        logger.info(f"🔍 搜索条件: {criteria}")
        logger.info(f"🔍 条件类型: {type(criteria)}")
        
        result = original_search(self, criteria)
        logger.info(f"🔍 搜索结果: 找到 {len(result)} 封邮件")
        return result
    
    IMAPClient.search = traced_search
    
    logger.info("✅ 追踪日志已添加到所有关键方法")


async def create_test_scan_job():
    """创建一个测试扫描任务"""
    from backend.app.core.database import get_async_db
    from backend.app.services.email_scanner_service import EmailScannerService
    from backend.app.schemas.email_scan import EmailScanJobCreate, ScanParams
    
    scan_params = ScanParams(
        date_from=date(2024, 1, 1),
        date_to=date(2024, 12, 31),
        subject_keywords=["发票", "测试"],
        exclude_keywords=["垃圾", "广告"],
        folders=["INBOX"],
        max_emails=10
    )
    
    job_data = EmailScanJobCreate(
        email_account_id="YOUR_EMAIL_ACCOUNT_ID",  # 需要替换
        scan_params=scan_params,
        description="参数传递测试任务"
    )
    
    async for db in get_async_db():
        try:
            logger.info("📋 创建测试扫描任务...")
            logger.info(f"📋 扫描参数: {scan_params.dict()}")
            
            # 创建任务
            scan_job = await EmailScannerService.create_scan_job(
                db=db,
                user_id="YOUR_USER_ID",  # 需要替换
                job_data=job_data
            )
            
            logger.info(f"✅ 任务创建成功: {scan_job.job_id}")
            
            # 执行扫描
            logger.info("🚀 开始执行扫描...")
            result = await EmailScannerService.execute_scan(
                db=db,
                job_id=scan_job.job_id,
                user_id="YOUR_USER_ID"
            )
            
            logger.info(f"✅ 扫描完成: {result.status}")
            
        except Exception as e:
            logger.error(f"❌ 测试失败: {str(e)}")
            logger.exception("详细错误:")
        finally:
            await db.close()


async def analyze_existing_job(job_id: str):
    """分析现有任务的参数传递"""
    from backend.app.core.database import get_async_db
    from backend.app.services.email_scanner_service import EmailScannerService
    
    async for db in get_async_db():
        try:
            logger.info(f"📊 分析任务: {job_id}")
            
            # 获取任务详情
            from sqlalchemy import select
            from backend.app.models.email_scan_job import EmailScanJob
            
            stmt = select(EmailScanJob).filter(EmailScanJob.job_id == job_id)
            result = await db.execute(stmt)
            job = result.scalar_one_or_none()
            
            if not job:
                logger.error(f"❌ 任务不存在: {job_id}")
                return
            
            logger.info(f"📊 任务状态: {job.status}")
            logger.info(f"📊 扫描参数: {json.dumps(job.scan_params, default=str)}")
            
            # 检查参数是否包含必要字段
            if job.scan_params:
                has_keywords = 'subject_keywords' in job.scan_params
                has_exclude = 'exclude_keywords' in job.scan_params
                has_dates = 'date_from' in job.scan_params or 'date_to' in job.scan_params
                
                logger.info(f"📊 参数完整性检查:")
                logger.info(f"   - 包含关键词: {'✅' if has_keywords else '❌'}")
                logger.info(f"   - 包含排除词: {'✅' if has_exclude else '❌'}")
                logger.info(f"   - 包含日期范围: {'✅' if has_dates else '❌'}")
            
        except Exception as e:
            logger.error(f"❌ 分析失败: {str(e)}")
        finally:
            await db.close()


def main():
    """主函数"""
    print("=" * 80)
    print("扫描参数传递追踪工具")
    print("=" * 80)
    
    # 添加追踪日志
    add_trace_logging()
    
    print("\n请选择操作:")
    print("1. 创建新的测试扫描任务")
    print("2. 分析现有任务的参数传递")
    print("3. 仅添加追踪日志（等待手动触发）")
    
    choice = input("\n请输入选项 (1/2/3): ").strip()
    
    if choice == '1':
        print("\n⚠️  请先修改脚本中的 YOUR_EMAIL_ACCOUNT_ID 和 YOUR_USER_ID")
        confirm = input("是否已修改? (y/n): ").strip().lower()
        if confirm == 'y':
            asyncio.run(create_test_scan_job())
    
    elif choice == '2':
        job_id = input("请输入任务ID: ").strip()
        if job_id:
            asyncio.run(analyze_existing_job(job_id))
    
    elif choice == '3':
        print("\n✅ 追踪日志已启用")
        print("现在可以通过前端创建扫描任务，观察参数传递过程")
        print("按 Ctrl+C 退出")
        
        try:
            # 保持程序运行
            asyncio.run(asyncio.Event().wait())
        except KeyboardInterrupt:
            print("\n👋 退出")
    
    else:
        print("❌ 无效选项")


if __name__ == "__main__":
    main()