#!/usr/bin/env python3
"""
更新邮箱账户同步状态
为所有现有邮箱账户初始化同步状态记录
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.email_account import EmailAccount
from app.models.email_index import EmailSyncState


async def init_sync_states():
    """为所有邮箱账户初始化同步状态"""
    async with AsyncSessionLocal() as db:
        try:
            # 获取所有邮箱账户
            stmt = select(EmailAccount)
            result = await db.execute(stmt)
            accounts = result.scalars().all()
            
            print(f"找到 {len(accounts)} 个邮箱账户")
            
            for account in accounts:
                # 检查是否已有同步状态
                sync_stmt = select(EmailSyncState).filter(
                    EmailSyncState.account_id == account.id,
                    EmailSyncState.folder_name == 'INBOX'
                )
                sync_result = await db.execute(sync_stmt)
                existing_state = sync_result.scalar_one_or_none()
                
                if not existing_state:
                    # 创建新的同步状态
                    sync_mode = 'incremental' if account.last_scan_time else 'never_synced'
                    
                    new_state = EmailSyncState(
                        account_id=account.id,
                        folder_name='INBOX',
                        sync_mode=sync_mode,
                        sync_start_date=datetime(datetime.now().year, 1, 1),
                        last_full_sync_time=account.last_scan_time if account.last_scan_time else None,
                        total_emails_indexed=0
                    )
                    
                    db.add(new_state)
                    print(f"为账户 {account.email_address} 创建同步状态: {sync_mode}")
                else:
                    print(f"账户 {account.email_address} 已有同步状态: {existing_state.sync_mode}")
            
            await db.commit()
            print("同步状态初始化完成")
            
        except Exception as e:
            print(f"错误: {e}")
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(init_sync_states())