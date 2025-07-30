"""
增量邮件扫描服务

实现功能：
1. 基于UID的增量扫描
2. 邮件状态跟踪和去重
3. 批量PDF处理
4. 错误恢复机制
"""

import logging
from typing import List, Dict, Set, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from imap_tools import MailBox, MailMessage
import asyncio
from dataclasses import dataclass

from app.models.email_account import EmailAccount
from app.models.email_scan_record import EmailScanRecord  # 需要创建
from app.services.pdf_transfer_service import PDFTransferService  # 需要创建
from app.utils.encryption import decrypt_email_password

logger = logging.getLogger(__name__)

@dataclass
class ScanResult:
    """扫描结果"""
    total_checked: int = 0
    new_emails: int = 0
    pdfs_found: int = 0
    pdfs_processed: int = 0
    errors: List[str] = None
    scan_duration: float = 0.0
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []

class IncrementalScanService:
    """增量邮件扫描服务"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.pdf_transfer = PDFTransferService()
        
    async def scan_account_incremental(
        self, 
        email_account: EmailAccount,
        max_emails: int = 100,
        days_back: int = 30
    ) -> ScanResult:
        """增量扫描指定邮箱账户"""
        start_time = datetime.now()
        result = ScanResult()
        
        try:
            # 1. 获取最后扫描记录
            last_scan = await self._get_last_scan_record(email_account.id)
            
            # 2. 连接邮箱
            config = self._build_email_config(email_account)
            
            # 3. 执行增量扫描
            with MailBox(config['host'], config['port']).login(
                config['username'], config['password']
            ) as mailbox:
                
                # 获取新邮件UIDs
                new_uids = await self._get_new_email_uids(
                    mailbox, last_scan, days_back, max_emails
                )
                result.total_checked = len(new_uids)
                
                if not new_uids:
                    logger.info(f"账户 {email_account.email_address} 没有新邮件")
                    return result
                
                # 4. 处理新邮件
                processed_uids = await self._process_new_emails(
                    mailbox, new_uids, email_account.id, result
                )
                
                # 5. 更新扫描记录
                await self._update_scan_record(
                    email_account.id, processed_uids, result
                )
                
        except Exception as e:
            error_msg = f"扫描账户 {email_account.email_address} 失败: {str(e)}"
            logger.error(error_msg)
            result.errors.append(error_msg)
            
        finally:
            result.scan_duration = (datetime.now() - start_time).total_seconds()
            
        return result
    
    async def _get_last_scan_record(self, account_id: str) -> Optional[Dict]:
        """获取最后扫描记录"""
        stmt = select(EmailScanRecord).where(
            EmailScanRecord.email_account_id == account_id
        ).order_by(EmailScanRecord.created_at.desc()).limit(1)
        
        result = await self.db.execute(stmt)
        record = result.scalar_one_or_none()
        
        if record:
            return {
                'last_uid': record.last_processed_uid,
                'last_scan_time': record.created_at,
                'processed_uids': set(record.processed_uids or [])
            }
        return None
    
    async def _get_new_email_uids(
        self, 
        mailbox: MailBox, 
        last_scan: Optional[Dict],
        days_back: int,
        max_emails: int
    ) -> List[str]:
        """获取新邮件的UID列表"""
        
        # 设置搜索起始日期
        if last_scan and last_scan['last_scan_time']:
            # 从上次扫描时间开始，留1小时重叠以防遗漏
            start_date = (last_scan['last_scan_time'] - timedelta(hours=1)).date()
        else:
            # 首次扫描，从指定天数前开始
            start_date = (datetime.now() - timedelta(days=days_back)).date()
        
        # 搜索邮件（按日期范围）
        try:
            from imap_tools import AND
            search_criteria = AND(date_gte=start_date)
            
            # 获取所有符合条件的邮件UID
            messages = list(mailbox.fetch(
                search_criteria, 
                limit=max_emails * 2,  # 获取更多用于筛选
                reverse=True  # 最新的在前面
            ))
            
            # 提取UID并过滤已处理的
            all_uids = [str(msg.uid) for msg in messages]
            
            if last_scan and last_scan['processed_uids']:
                # 过滤掉已处理的UID
                new_uids = [uid for uid in all_uids 
                           if uid not in last_scan['processed_uids']]
            else:
                new_uids = all_uids
            
            # 限制数量
            return new_uids[:max_emails]
            
        except Exception as e:
            logger.error(f"获取邮件UID失败: {str(e)}")
            return []
    
    async def _process_new_emails(
        self,
        mailbox: MailBox,
        uids: List[str],
        account_id: str,
        result: ScanResult
    ) -> List[str]:
        """处理新邮件，提取PDF并发送处理"""
        processed_uids = []
        
        for uid in uids:
            try:
                # 获取邮件详情
                messages = list(mailbox.fetch(f'UID {uid}'))
                if not messages:
                    continue
                    
                msg = messages[0]
                
                # 检查是否包含发票相关关键词
                if not self._is_invoice_email(msg):
                    processed_uids.append(uid)
                    continue
                
                result.new_emails += 1
                
                # 处理PDF附件
                pdf_count = await self._process_email_pdfs(
                    msg, account_id, uid
                )
                
                result.pdfs_found += pdf_count
                result.pdfs_processed += pdf_count  # 简化，实际应该跟踪成功数
                
                processed_uids.append(uid)
                
                # 防止处理过快，添加小延迟
                await asyncio.sleep(0.1)
                
            except Exception as e:
                error_msg = f"处理邮件 UID {uid} 失败: {str(e)}"
                logger.error(error_msg)
                result.errors.append(error_msg)
                # 继续处理下一封邮件
                
        return processed_uids
    
    def _is_invoice_email(self, msg: MailMessage) -> bool:
        """判断是否为发票相关邮件"""
        invoice_keywords = ['发票', 'invoice', '账单', 'bill', '收据', 'receipt']
        
        # 检查主题
        subject = (msg.subject or '').lower()
        for keyword in invoice_keywords:
            if keyword in subject:
                return True
        
        # 检查发件人（可选）
        sender = (msg.from_ or '').lower()
        trusted_senders = ['invoice', 'billing', 'finance', '财务']
        for sender_keyword in trusted_senders:
            if sender_keyword in sender:
                return True
                
        # 检查是否有PDF附件
        for att in msg.attachments:
            filename = (att.filename or '').lower()
            if filename.endswith('.pdf'):
                return True
                
        return False
    
    async def _process_email_pdfs(
        self, 
        msg: MailMessage, 
        account_id: str, 
        email_uid: str
    ) -> int:
        """处理邮件中的PDF附件"""
        pdf_count = 0
        
        for att in msg.attachments:
            if not self._is_pdf_attachment(att):
                continue
                
            try:
                # 构建PDF元数据
                pdf_metadata = {
                    'email_uid': email_uid,
                    'email_subject': msg.subject or '',
                    'email_sender': msg.from_ or '',
                    'email_date': msg.date.isoformat() if msg.date else '',
                    'filename': att.filename or f'attachment_{pdf_count + 1}.pdf',
                    'account_id': account_id
                }
                
                # 发送给PDF传输服务处理
                await self.pdf_transfer.process_pdf(
                    pdf_data=att.payload,
                    metadata=pdf_metadata
                )
                
                pdf_count += 1
                
            except Exception as e:
                logger.error(f"处理PDF附件失败: {att.filename}, 错误: {str(e)}")
                
        return pdf_count
    
    def _is_pdf_attachment(self, attachment) -> bool:
        """判断是否为PDF附件"""
        if not attachment.payload:
            return False
            
        filename = (attachment.filename or '').lower()
        content_type = (attachment.content_type or '').lower()
        
        return (filename.endswith('.pdf') or 
                'application/pdf' in content_type or
                'pdf' in content_type)
    
    async def _update_scan_record(
        self, 
        account_id: str, 
        processed_uids: List[str], 
        result: ScanResult
    ):
        """更新扫描记录"""
        try:
            # 创建新的扫描记录
            scan_record = EmailScanRecord(
                email_account_id=account_id,
                last_processed_uid=processed_uids[-1] if processed_uids else None,
                processed_uids=processed_uids,
                total_checked=result.total_checked,
                new_emails_found=result.new_emails,
                pdfs_found=result.pdfs_found,
                pdfs_processed=result.pdfs_processed,
                scan_duration=result.scan_duration,
                errors=result.errors if result.errors else None
            )
            
            self.db.add(scan_record)
            await self.db.commit()
            
            # 清理旧记录（保留最近10次）
            await self._cleanup_old_scan_records(account_id, keep_count=10)
            
        except Exception as e:
            logger.error(f"更新扫描记录失败: {str(e)}")
            await self.db.rollback()
    
    async def _cleanup_old_scan_records(self, account_id: str, keep_count: int = 10):
        """清理旧的扫描记录"""
        try:
            # 获取需要删除的记录
            stmt = select(EmailScanRecord.id).where(
                EmailScanRecord.email_account_id == account_id
            ).order_by(EmailScanRecord.created_at.desc()).offset(keep_count)
            
            result = await self.db.execute(stmt)
            old_record_ids = [row[0] for row in result.fetchall()]
            
            if old_record_ids:
                from sqlalchemy import delete
                delete_stmt = delete(EmailScanRecord).where(
                    EmailScanRecord.id.in_(old_record_ids)
                )
                await self.db.execute(delete_stmt)
                await self.db.commit()
                
        except Exception as e:
            logger.error(f"清理旧扫描记录失败: {str(e)}")
    
    def _build_email_config(self, email_account: EmailAccount) -> Dict:
        """构建邮箱连接配置"""
        return {
            'host': email_account.imap_host,
            'port': email_account.imap_port,
            'username': email_account.email_address,
            'password': decrypt_email_password(email_account.encrypted_password)
        }

class BatchScanService:
    """批量扫描服务"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.incremental_scanner = IncrementalScanService(db)
    
    async def scan_all_active_accounts(
        self, 
        max_emails_per_account: int = 50,
        max_concurrent: int = 3
    ) -> Dict[str, ScanResult]:
        """扫描所有活跃的邮箱账户"""
        
        # 获取所有活跃账户
        stmt = select(EmailAccount).where(
            and_(
                EmailAccount.is_active == True,
                EmailAccount.is_verified == True
            )
        )
        result = await self.db.execute(stmt)
        accounts = result.scalars().all()
        
        if not accounts:
            logger.info("没有找到活跃的邮箱账户")
            return {}
        
        logger.info(f"开始批量扫描 {len(accounts)} 个邮箱账户")
        results = {}
        
        # 使用信号量控制并发数
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def scan_single_account(account):
            async with semaphore:
                try:
                    result = await self.incremental_scanner.scan_account_incremental(
                        account, max_emails_per_account
                    )
                    return account.email_address, result
                except Exception as e:
                    error_result = ScanResult()
                    error_result.errors.append(f"扫描失败: {str(e)}")
                    return account.email_address, error_result
        
        # 并发执行扫描
        tasks = [scan_single_account(account) for account in accounts]
        scan_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 收集结果
        for result in scan_results:
            if isinstance(result, Exception):
                logger.error(f"扫描任务异常: {str(result)}")
            else:
                email_address, scan_result = result
                results[email_address] = scan_result
        
        # 记录总体统计
        total_new_emails = sum(r.new_emails for r in results.values())
        total_pdfs = sum(r.pdfs_found for r in results.values())
        total_errors = sum(len(r.errors) for r in results.values())
        
        logger.info(f"批量扫描完成: {len(results)} 个账户, "
                   f"{total_new_emails} 封新邮件, "
                   f"{total_pdfs} 个PDF, "
                   f"{total_errors} 个错误")
        
        return results