#!/usr/bin/env python3
"""
调试邮件PDF提取问题
检查为什么找不到PDF附件或链接
"""
import asyncio
import logging
from datetime import datetime
import json
from typing import Dict, Any

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 添加父目录到 Python 路径
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from app.core.database import async_session_maker
from app.utils.encryption import decrypt_email_password
from imap_tools import MailBox, AND


async def debug_email_content(email_account_id: str, user_id: str, email_uids: list[int]):
    """调试邮件内容，查看附件和正文"""
    
    async with async_session_maker() as db:
        # 获取邮箱账户
        from app.services.email_account_service import EmailAccountService
        account = await EmailAccountService.get_email_account(db, email_account_id, user_id)
        
        # 解密密码
        password = decrypt_email_password(account.encrypted_password)
        
        # 连接IMAP
        with MailBox(host=account.imap_host, port=account.imap_port) as mailbox:
            mailbox.login(account.email_address, password, initial_folder='INBOX')
            
            for uid in email_uids:
                logger.info(f"\n{'='*60}")
                logger.info(f"检查邮件 UID: {uid}")
                
                # 获取邮件
                messages = list(mailbox.fetch(AND(uid=str(uid)), mark_seen=False))
                if not messages:
                    logger.error(f"未找到UID为 {uid} 的邮件")
                    continue
                
                msg = messages[0]
                
                # 打印邮件基本信息
                logger.info(f"主题: {msg.subject}")
                logger.info(f"发件人: {msg.from_}")
                logger.info(f"日期: {msg.date}")
                
                # 检查附件
                logger.info(f"\n附件数量: {len(msg.attachments)}")
                for i, att in enumerate(msg.attachments):
                    logger.info(f"附件 {i+1}:")
                    logger.info(f"  - 文件名: {att.filename}")
                    logger.info(f"  - 内容类型: {att.content_type}")
                    logger.info(f"  - 大小: {len(att.payload) if att.payload else 0} bytes")
                    
                    # 检查是否为PDF
                    if att.filename and att.filename.lower().endswith('.pdf'):
                        logger.info(f"  ✅ 这是一个PDF文件!")
                    else:
                        logger.info(f"  ❌ 不是PDF文件")
                
                # 检查邮件正文
                logger.info(f"\n邮件正文:")
                logger.info(f"文本正文长度: {len(msg.text) if msg.text else 0}")
                logger.info(f"HTML正文长度: {len(msg.html) if msg.html else 0}")
                
                # 打印部分正文内容
                if msg.text:
                    logger.info(f"\n文本正文前500字符:")
                    logger.info(msg.text[:500])
                
                if msg.html:
                    logger.info(f"\nHTML正文前500字符:")
                    logger.info(msg.html[:500])
                
                # 查找正文中的链接
                import re
                body_content = (msg.text or '') + '\n' + (msg.html or '')
                
                # 查找所有URL
                url_pattern = r'https?://[^\s<>"\']+'
                urls = re.findall(url_pattern, body_content)
                logger.info(f"\n找到的URL数量: {len(urls)}")
                for url in urls[:10]:  # 只显示前10个
                    logger.info(f"  - {url}")
                
                # 特别查找PDF链接
                pdf_pattern = r'https?://[^\s<>"\']+\.pdf(?:\?[^\s<>"\']*)?'
                pdf_urls = re.findall(pdf_pattern, body_content, re.IGNORECASE)
                logger.info(f"\n找到的PDF URL数量: {len(pdf_urls)}")
                for url in pdf_urls:
                    logger.info(f"  - {url}")


async def main():
    """主函数"""
    # 测试的邮件信息
    email_account_id = "c8a5b42f-62dd-4c0d-8b36-45d2a01d1a63"
    user_id = "bd9a6722-a781-4f0b-8856-c6c5e261cbd0"  # 从之前的日志中获取
    email_uids = [8962]  # 确认有PDF附件的邮件
    
    await debug_email_content(email_account_id, user_id, email_uids)


if __name__ == "__main__":
    asyncio.run(main())