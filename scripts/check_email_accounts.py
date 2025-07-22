#!/usr/bin/env python3
"""检查现有的邮箱账户"""
import asyncio
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.core.database import get_db
from app.models.email_account import EmailAccount
from sqlalchemy import select
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def check_email_accounts():
    """检查邮箱账户"""
    async for db in get_db():
        try:
            # 查询所有邮箱账户
            query = select(EmailAccount).order_by(EmailAccount.created_at.desc())
            result = await db.execute(query)
            accounts = result.scalars().all()
            
            logger.info(f"找到 {len(accounts)} 个邮箱账户:")
            for account in accounts:
                logger.info(f"- ID: {account.id}")
                logger.info(f"  邮箱: {account.email_address}")
                logger.info(f"  用户ID: {account.user_id}")
                logger.info(f"  状态: {account.status}")
                logger.info(f"  创建时间: {account.created_at}")
                logger.info("")
                
        except Exception as e:
            logger.error(f"检查失败: {e}", exc_info=True)
        finally:
            await db.close()

if __name__ == "__main__":
    asyncio.run(check_email_accounts())