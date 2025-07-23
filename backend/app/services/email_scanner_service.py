"""邮箱扫描服务"""
import os
import uuid
import hashlib
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import logging

from app.models.email_account import EmailAccount
from app.models.email_scan_job import EmailScanJob
from app.schemas.email_scan import (
    ScanParams,
    EmailScanJobCreate,
    ScanJobStatus,
    ScanJobType,
    ScanResultEmail,
    ScanResultAttachment,
    ScanResultInvoice
)
from app.services.email.imap_client import IMAPClient
from app.services.email_account_service import EmailAccountService
from app.utils.encryption import decrypt_email_password
from app.core.exceptions import NotFoundError, BusinessException
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailScannerService:
    """邮箱扫描服务类"""
    
    # 发票邮件识别关键词
    INVOICE_KEYWORDS = [
        "发票", "invoice", "账单", "bill", "收据", "receipt",
        "费用", "expense", "付款", "payment", "税票", "税务发票"
    ]
    
    # 支持的附件类型
    ATTACHMENT_TYPES = [".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".bmp"]
    
    @staticmethod
    async def create_scan_job(
        db: AsyncSession,
        user_id: str,
        job_data: EmailScanJobCreate
    ) -> EmailScanJob:
        """创建扫描任务
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            job_data: 扫描任务数据
            
        Returns:
            创建的扫描任务
        """
        # 验证邮箱账户是否属于当前用户
        email_account = await EmailAccountService.get_email_account(
            db=db,
            account_id=job_data.email_account_id,
            user_id=user_id
        )
        
        if not email_account.is_active:
            raise BusinessException("邮箱账户已停用，无法创建扫描任务")
        
        # 先清理该邮箱账户的超时任务
        await EmailScannerService.check_and_cleanup_before_create(
            db=db,
            email_account_id=str(job_data.email_account_id)
        )
        
        # 检查是否有正在运行的扫描任务
        stmt = select(EmailScanJob).filter(
            and_(
                EmailScanJob.email_account_id == str(job_data.email_account_id),
                EmailScanJob.status.in_([ScanJobStatus.PENDING, ScanJobStatus.RUNNING])
            )
        )
        result = await db.execute(stmt)
        running_job = result.scalar_one_or_none()
        
        if running_job:
            raise BusinessException(
                f"该邮箱账户已有扫描任务正在执行中（任务ID: {running_job.job_id}），"
                f"当前状态: {running_job.status}，进度: {running_job.progress}%。"
                f"请等待任务完成或取消后再试。"
            )
        
        # 获取同步状态，智能决定扫描类型
        sync_state = await EmailAccountService.get_sync_state(db, str(email_account.id))
        
        # 如果是首次同步但扫描类型不是manual，自动调整参数
        if sync_state and not sync_state['is_synced'] and job_data.job_type == 'incremental':
            logger.info(f"检测到账户 {email_account.id} 未完成初次同步，自动调整为全量扫描")
            job_data.job_type = 'manual'  # 改为手动类型（全量扫描）
            # 扩大日期范围
            if not job_data.scan_params.date_from:
                job_data.scan_params.date_from = date.today() - timedelta(days=365)
        
        # 创建扫描任务
        job_id = str(uuid.uuid4())
        
        # 转换 scan_params 中的日期为字符串
        scan_params_dict = job_data.scan_params.dict()
        if scan_params_dict.get('date_from'):
            scan_params_dict['date_from'] = scan_params_dict['date_from'].isoformat()
        if scan_params_dict.get('date_to'):
            scan_params_dict['date_to'] = scan_params_dict['date_to'].isoformat()
        
        scan_job = EmailScanJob(
            job_id=job_id,
            user_id=user_id,
            email_account_id=str(job_data.email_account_id),
            job_type=job_data.job_type,
            status=ScanJobStatus.PENDING,
            scan_params=scan_params_dict,
            started_at=datetime.now(timezone.utc)
        )
        
        db.add(scan_job)
        await db.commit()
        await db.refresh(scan_job)
        
        return scan_job
    
    @staticmethod
    async def get_scan_jobs(
        db: AsyncSession,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
        status: Optional[ScanJobStatus] = None
    ) -> List[EmailScanJob]:
        """获取扫描任务列表
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            skip: 跳过记录数
            limit: 返回记录数
            status: 任务状态过滤
            
        Returns:
            扫描任务列表
        """
        stmt = select(EmailScanJob).filter(EmailScanJob.user_id == user_id)
        
        if status:
            stmt = stmt.filter(EmailScanJob.status == status)
        
        stmt = stmt.order_by(EmailScanJob.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    @staticmethod
    async def get_scan_job(
        db: AsyncSession,
        job_id: str,
        user_id: str
    ) -> EmailScanJob:
        """获取单个扫描任务
        
        Args:
            db: 数据库会话
            job_id: 任务ID
            user_id: 用户ID
            
        Returns:
            扫描任务
        """
        stmt = select(EmailScanJob).filter(
            and_(
                EmailScanJob.job_id == job_id,
                EmailScanJob.user_id == user_id
            )
        )
        result = await db.execute(stmt)
        job = result.scalar_one_or_none()
        
        if not job:
            raise NotFoundError(resource="扫描任务", message=f"扫描任务 {job_id} 不存在")
        
        return job
    
    @staticmethod
    async def execute_scan(
        db: AsyncSession,
        job_id: str,
        user_id: str
    ) -> EmailScanJob:
        """执行邮箱扫描
        
        Args:
            db: 数据库会话
            job_id: 任务ID
            user_id: 用户ID
            
        Returns:
            更新后的扫描任务
        """
        from app.services.email.hybrid_sync_service import HybridEmailSyncService
        
        # 获取扫描任务
        scan_job = await EmailScannerService.get_scan_job(db, job_id, user_id)
        
        if scan_job.status != ScanJobStatus.PENDING:
            raise BusinessException(f"任务状态为 {scan_job.status}，无法执行扫描")
        
        # 获取邮箱账户
        email_account = await EmailAccountService.get_email_account(
            db=db,
            account_id=scan_job.email_account_id,
            user_id=user_id
        )
        
        # 更新任务状态为运行中
        scan_job.status = ScanJobStatus.RUNNING
        scan_job.progress = 0
        scan_job.current_step = "初始化混合同步"
        await db.commit()
        
        try:
            # 使用混合同步策略
            logger.info(f"开始执行扫描任务 {job_id}，使用混合同步策略")
            hybrid_sync = HybridEmailSyncService(db)
            
            # 执行同步
            scan_job.current_step = "执行邮件同步"
            scan_job.progress = 10
            await db.commit()
            logger.info(f"更新任务进度为 10%，开始同步账户 {scan_job.email_account_id}")
            
            # 解析扫描参数，传递给sync_account
            scan_params_dict = scan_job.scan_params.copy() if scan_job.scan_params else {}
            sync_result = await hybrid_sync.sync_account(
                scan_job.email_account_id, 
                scan_params=scan_params_dict
            )
            logger.info(f"同步完成，结果: {sync_result}")
            
            # 更新进度
            scan_job.current_step = "搜索发票邮件"
            scan_job.progress = 50
            await db.commit()
            
            # 从本地索引搜索发票邮件 - 不限制只搜索有附件的邮件
            scan_params = ScanParams(**scan_job.scan_params)
            invoice_emails = await hybrid_sync.search_emails(
                account_id=scan_job.email_account_id,
                date_from=scan_params.date_from,
                date_to=scan_params.date_to,
                subject_keywords=scan_params.subject_keywords or EmailScannerService.INVOICE_KEYWORDS,
                exclude_keywords=scan_params.exclude_keywords,
                # 移除has_attachments=True限制，允许搜索所有符合条件的邮件
            )
            
            # 处理无附件邮件中的PDF链接
            if scan_params.enable_body_pdf_extraction:
                # 分离有附件和无附件的邮件
                no_attachment_emails = [email for email in invoice_emails if not email['has_attachments']]
                
                if no_attachment_emails:
                    scan_job.current_step = "分析邮件正文中的PDF链接"
                    scan_job.progress = 60
                    await db.commit()
                    
                    # 限制处理数量
                    max_emails = min(len(no_attachment_emails), scan_params.max_body_analysis_emails)
                    logger.info(f"开始分析 {max_emails} 封无附件邮件的正文")
                    
                    # 创建PDF提取器
                    from app.services.email.pdf_extractor import EmailPDFExtractor
                    pdf_extractor = EmailPDFExtractor(db, user_id)
                    
                    # 记录找到的PDF
                    body_pdfs_count = 0
                    body_pdf_emails = []
                    
                    # 处理每封无附件邮件
                    for i, email in enumerate(no_attachment_emails[:max_emails]):
                        try:
                            # 更新进度
                            progress = 60 + (i / max_emails) * 20
                            scan_job.progress = int(progress)
                            scan_job.current_step = f"分析邮件正文 {i+1}/{max_emails}"
                            await db.commit()
                            
                            # 提取PDF
                            pdfs = await pdf_extractor.extract_pdfs_from_email(
                                scan_job.email_account_id,
                                email['uid']
                            )
                            
                            if pdfs:
                                logger.info(f"从邮件 UID {email['uid']} 正文中找到 {len(pdfs)} 个PDF")
                                body_pdfs_count += len(pdfs)
                                
                                # 添加PDF信息到邮件
                                email['body_pdfs'] = [
                                    {
                                        'source': pdf.get('source'),
                                        'name': pdf.get('name', ''),
                                        'url': pdf.get('url', ''),
                                        'size': pdf.get('size', 0)
                                    }
                                    for pdf in pdfs
                                ]
                                
                                # 记录找到PDF的邮件
                                body_pdf_emails.append(email)
                                
                        except Exception as e:
                            logger.warning(f"分析邮件 UID {email['uid']} 正文失败: {e}")
                    
                    logger.info(f"正文分析完成，从 {max_emails} 封邮件中找到 {body_pdfs_count} 个PDF")
                    
                    # 更新统计信息
                    scan_job.current_step = "正文PDF分析完成"
                    scan_job.progress = 80
                    await db.commit()
            
            # 构建结果
            result = {
                'sync_type': sync_result['sync_type'],
                'total_emails': sync_result.get('total_emails', 0) or sync_result.get('recent_emails', 0),
                'matched_emails': len(invoice_emails),
                'scanned_emails': sync_result.get('new_emails', 0) + sync_result.get('updated_emails', 0),
                'processed_invoices': 0,  # 需要后续实现OCR处理
                'body_pdfs_found': body_pdfs_count if 'body_pdfs_count' in locals() else 0,
                'emails': [
                    {
                        'uid': email['uid'],
                        'subject': email['subject'],
                        'from': email['from_address'],
                        'date': email['email_date'].isoformat(),
                        'has_attachments': email['has_attachments'],
                        'attachment_names': email.get('attachment_names', []),
                        'body_pdfs': email.get('body_pdfs', []) if 'body_pdfs' in email else []
                    }
                    for email in invoice_emails[:100]  # 限制返回数量
                ],
                'sync_errors': sync_result.get('errors', [])
            }
            
            # 原子更新任务完成状态 - 确保所有字段同时更新
            scan_job.status = ScanJobStatus.COMPLETED
            scan_job.progress = 100
            scan_job.current_step = "扫描完成"
            scan_job.completed_at = datetime.utcnow()
            scan_job.scan_results = result
            
            # 更新统计信息
            scan_job.total_emails = result.get('total_emails', 0)
            scan_job.scanned_emails = result.get('scanned_emails', 0)
            scan_job.matched_emails = result.get('matched_emails', 0)
            scan_job.downloaded_attachments = result.get('downloaded_attachments', 0)
            scan_job.processed_invoices = result.get('processed_invoices', 0)
            
            # 添加正文PDF统计
            if 'body_pdfs_found' in result:
                # 如果模型中没有这个字段，可以放在scan_results中
                result['body_pdfs_found'] = result.get('body_pdfs_found', 0)
            
            # 确保所有更新在同一个事务中提交
            await db.flush()  # 先刷新到数据库会话
            await db.commit()  # 然后提交事务
            
            # 注意：自动化发票处理已经集成到邮件处理端点中
            # 用户可以通过邮件处理端点直接处理下载的附件
            if 'body_pdfs_found' in result and result['body_pdfs_found'] > 0:
                logger.info(f"扫描任务 {job_id} 完成，附件已下载，从邮件正文中找到 {result['body_pdfs_found']} 个PDF链接，可通过邮件处理端点进行发票识别")
            else:
                logger.info(f"扫描任务 {job_id} 完成，附件已下载，可通过邮件处理端点进行发票识别")
            
        except Exception as e:
            logger.error(f"扫描任务 {job_id} 执行失败: {str(e)}")
            
            # 原子更新任务失败状态
            scan_job.status = ScanJobStatus.FAILED
            scan_job.error_message = str(e)
            scan_job.completed_at = datetime.utcnow()
            
            # 确保所有更新在同一个事务中提交
            await db.flush()
            await db.commit()
            
            raise BusinessException(f"扫描执行失败: {str(e)}")
        
        return scan_job
    
    @staticmethod
    async def _perform_scan(
        db: AsyncSession,
        scan_job: EmailScanJob,
        email_account: EmailAccount
    ) -> Dict[str, Any]:
        """执行实际的邮箱扫描
        
        Args:
            db: 数据库会话
            scan_job: 扫描任务
            email_account: 邮箱账户
            
        Returns:
            扫描结果
        """
        # 解析扫描参数
        scan_params = ScanParams(**scan_job.scan_params)
        
        # 解密邮箱密码
        password = decrypt_email_password(email_account.encrypted_password)
        
        # 创建IMAP客户端
        client = IMAPClient(
            host=email_account.imap_host,
            port=email_account.imap_port,
            use_ssl=email_account.imap_use_ssl
        )
        
        try:
            # 连接邮箱
            if not client.connect(email_account.email_address, password):
                raise BusinessException("邮箱连接失败，请检查账户配置")
            
            # 更新进度
            scan_job.progress = 10
            scan_job.current_step = "获取邮件列表"
            await db.commit()
            
            # 扫描结果
            result = {
                'emails': [],
                'attachments': [],
                'invoices': [],
                'errors': [],
                'total_emails': 0,
                'scanned_emails': 0,
                'matched_emails': 0,
                'downloaded_attachments': 0,
                'processed_invoices': 0
            }
            
            # 扫描每个文件夹
            for folder in scan_params.folders:
                logger.info(f"扫描文件夹: {folder}")
                
                if not client.select_folder(folder):
                    logger.warning(f"无法选择文件夹: {folder}")
                    continue
                
                # 使用高级搜索功能，服务端过滤
                email_ids = client.search_emails_advanced(
                    date_from=datetime.combine(scan_params.date_from, datetime.min.time()) if scan_params.date_from else None,
                    date_to=datetime.combine(scan_params.date_to, datetime.min.time()) if scan_params.date_to else None,
                    subject_keywords=scan_params.subject_keywords if scan_params.subject_keywords else None,
                    exclude_keywords=scan_params.exclude_keywords if scan_params.exclude_keywords else None,
                    sender_filters=scan_params.sender_filters if scan_params.sender_filters else None,
                    max_results=scan_params.max_emails
                )
                
                result['total_emails'] += len(email_ids)
                logger.info(f"服务端搜索返回 {len(email_ids)} 封邮件")
                
                # 处理每封邮件
                for i, email_id in enumerate(email_ids):
                    try:
                        # 更新进度
                        progress = 10 + (i / len(email_ids)) * 80
                        scan_job.progress = int(progress)
                        scan_job.current_step = f"处理邮件 {i+1}/{len(email_ids)}"
                        await db.commit()
                        
                        # 获取邮件
                        msg = client.fetch_email(email_id)
                        if not msg:
                            continue
                        
                        # 提取邮件信息
                        email_info = client.get_email_info(msg)
                        result['scanned_emails'] += 1
                        
                        # 由于已经使用服务端过滤，这里所有邮件都是匹配的
                        # 但仍然可以在客户端进行二次验证（可选）
                        is_invoice_email = True  # 服务端已过滤
                        
                        # 解析邮件日期
                        email_date = datetime.now()  # 默认值
                        try:
                            if email_info['date']:
                                # 简化解析，实际可以使用 email.utils.parsedate_to_datetime
                                from email.utils import parsedate_to_datetime
                                email_date = parsedate_to_datetime(email_info['date'])
                        except Exception as e:
                            logger.warning(f"解析邮件日期失败: {e}, 使用当前时间")
                        
                        # 记录邮件信息
                        email_result = ScanResultEmail(
                            email_id=str(email_id),
                            subject=email_info['subject'],
                            from_address=email_info['from'],
                            date=email_date,
                            has_attachments=bool(email_info['attachments']),
                            attachment_names=email_info['attachments'],
                            matched=is_invoice_email,
                            processed=False
                        )
                        
                        # 序列化为字典，确保日期转换为 ISO 格式字符串
                        email_dict = email_result.dict()
                        email_dict['date'] = email_date.isoformat()
                        result['emails'].append(email_dict)
                        
                        if is_invoice_email:
                            result['matched_emails'] += 1
                            
                            # 下载附件
                            for attachment_name in email_info['attachments']:
                                if EmailScannerService._is_valid_attachment(attachment_name):
                                    attachment_data = client.download_attachment(msg, attachment_name)
                                    if attachment_data:
                                        # 保存附件
                                        attachment_result = EmailScannerService._save_attachment(
                                            str(email_id),
                                            attachment_name,
                                            attachment_data,
                                            scan_job.job_id
                                        )
                                        
                                        if attachment_result:
                                            result['attachments'].append(attachment_result.dict())
                                            result['downloaded_attachments'] += 1
                        
                        email_result.processed = True
                        
                    except Exception as e:
                        logger.error(f"处理邮件 {email_id} 失败: {str(e)}")
                        result['errors'].append({
                            'email_id': str(email_id),
                            'error': str(e)
                        })
            
            return result
            
        finally:
            # 断开连接
            client.disconnect()
    
    @staticmethod
    def _build_search_criteria(scan_params: ScanParams) -> str:
        """构建邮件搜索条件
        
        Args:
            scan_params: 扫描参数
            
        Returns:
            IMAP搜索条件
        """
        criteria = []
        
        # 日期范围
        if scan_params.date_from:
            criteria.append(f'SINCE "{scan_params.date_from.strftime("%d-%b-%Y")}"')
        
        if scan_params.date_to:
            criteria.append(f'BEFORE "{scan_params.date_to.strftime("%d-%b-%Y")}"')
        
        # 主题关键词 - 支持中文和英文关键词的IMAP搜索
        if scan_params.subject_keywords:
            subject_criteria = []
            for keyword in scan_params.subject_keywords:
                # 对所有关键词都使用IMAP搜索，改进的IMAP客户端支持UTF-8
                subject_criteria.append(f'SUBJECT "{keyword}"')
                if keyword.isascii():
                    logger.info(f"添加ASCII IMAP搜索关键词: {keyword}")
                else:
                    logger.info(f"添加中文IMAP搜索关键词: {keyword}")
            
            if subject_criteria:
                criteria.append(f'({" OR ".join(subject_criteria)})')
        
        # 发件人过滤
        if scan_params.sender_filters:
            sender_criteria = []
            for sender in scan_params.sender_filters:
                sender_criteria.append(f'FROM "{sender}"')
            criteria.append(f'({" OR ".join(sender_criteria)})')
        
        search_criteria = " ".join(criteria) if criteria else "ALL"
        logger.info(f"构建的IMAP搜索条件: {search_criteria}")
        return search_criteria
    
    @staticmethod
    def _is_invoice_email(email_info: Dict[str, Any], scan_params: ScanParams) -> bool:
        """判断是否为发票邮件
        
        使用两阶段筛选：
        1. 负向过滤：先排除包含禁用关键词的邮件
        2. 正向匹配：检查是否包含必需的发票关键词
        
        Args:
            email_info: 邮件信息
            scan_params: 扫描参数
            
        Returns:
            是否为发票邮件
        """
        subject = email_info.get('subject', '').lower()
        
        # 第一步：检查排除关键词（负向过滤）
        # 如果主题包含任何排除关键词，直接返回False
        for exclude_keyword in scan_params.exclude_keywords:
            if exclude_keyword and exclude_keyword.lower() in subject:
                logger.debug(f"邮件被排除，主题包含排除关键词: {exclude_keyword}")
                return False
        
        # 第二步：检查包含关键词（正向匹配）
        # 检查内置发票关键词
        for keyword in EmailScannerService.INVOICE_KEYWORDS:
            if keyword.lower() in subject:
                logger.debug(f"邮件匹配，主题包含内置关键词: {keyword}")
                return True
        
        # 检查用户自定义关键词
        for keyword in scan_params.subject_keywords:
            if keyword and keyword.lower() in subject:
                logger.debug(f"邮件匹配，主题包含自定义关键词: {keyword}")
                return True
        
        # 没有匹配任何发票关键词
        return False
    
    @staticmethod
    def _is_valid_attachment(filename: str) -> bool:
        """判断是否为有效的发票附件
        
        Args:
            filename: 附件文件名
            
        Returns:
            是否为有效附件
        """
        if not filename:
            return False
        
        # 检查文件扩展名
        file_ext = os.path.splitext(filename)[1].lower()
        return file_ext in EmailScannerService.ATTACHMENT_TYPES
        
    @staticmethod
    async def _analyze_email_body_for_pdfs(
        email_account_id: str,
        email_uid: int,
        pdf_extractor,
        context_length: int = 100
    ) -> List[Dict[str, Any]]:
        """分析邮件正文中的PDF链接
        
        Args:
            email_account_id: 邮箱账户ID
            email_uid: 邮件UID
            pdf_extractor: PDF提取器实例
            context_length: 链接上下文长度
            
        Returns:
            提取的PDF列表
        """
        try:
            # 使用现有的PDF提取器提取PDF
            pdfs = await pdf_extractor.extract_pdfs_from_email(
                email_account_id,
                email_uid
            )
            
            # 增强PDF信息
            for pdf in pdfs:
                if pdf.get('source') == 'body_link':
                    # 计算链接可信度评分
                    score = EmailScannerService._calculate_link_score(
                        pdf.get('url', ''),
                        pdf.get('context', '')
                    )
                    pdf['confidence_score'] = score
            
            return pdfs
            
        except Exception as e:
            logger.error(f"分析邮件正文失败 (UID {email_uid}): {e}")
            return []
    
    @staticmethod
    def _calculate_link_score(link: str, context: str = '') -> float:
        """计算链接可信度评分
        
        Args:
            link: PDF链接
            context: 链接上下文
            
        Returns:
            可信度评分 (0-100)
        """
        score = 0.0
        
        # 直接PDF链接得分最高
        if link.lower().endswith('.pdf'):
            score += 50
        
        # 包含发票关键词的上下文
        invoice_keywords = ['发票', 'invoice', '账单', 'bill', '收据', 'receipt']
        for keyword in invoice_keywords:
            if keyword in context.lower():
                score += 20
                break
        
        # 可信域名加分
        trusted_domains = ['gov.cn', 'tax.gov.cn', '12366.cn', 'chinatax.gov.cn']
        for domain in trusted_domains:
            if domain in link:
                score += 15
                break
        
        # 网盘链接适中评分
        if any(x in link for x in ['pan.baidu.com', 'share.weiyun.com', 'aliyundrive.com']):
            score += 10
        
        # 下载相关链接
        if any(x in link.lower() for x in ['/download/', 'download=', 'attachment']):
            score += 5
        
        return min(score, 100.0)  # 最高100分
    
    @staticmethod
    def _save_attachment(
        email_id: str,
        filename: str,
        data: bytes,
        job_id: str
    ) -> Optional[ScanResultAttachment]:
        """保存附件到本地
        
        Args:
            email_id: 邮件ID
            filename: 文件名
            data: 文件数据
            job_id: 任务ID
            
        Returns:
            附件结果信息
        """
        try:
            # 创建保存目录
            save_dir = os.path.join(settings.upload_dir or "/tmp", "email_attachments", job_id)
            os.makedirs(save_dir, exist_ok=True)
            
            # 生成唯一文件名
            file_hash = hashlib.md5(data).hexdigest()[:8]
            safe_filename = f"{email_id}_{file_hash}_{filename}"
            file_path = os.path.join(save_dir, safe_filename)
            
            # 保存文件
            with open(file_path, 'wb') as f:
                f.write(data)
            
            return ScanResultAttachment(
                email_id=email_id,
                filename=filename,
                file_size=len(data),
                file_path=file_path,
                content_type="application/octet-stream",  # 简化处理
                is_invoice=True,
                processed=False
            )
            
        except Exception as e:
            logger.error(f"保存附件失败: {str(e)}")
            return None
    
    @staticmethod
    async def cancel_scan_job(
        db: AsyncSession,
        job_id: str,
        user_id: str,
        force: bool = False
    ) -> EmailScanJob:
        """取消扫描任务
        
        Args:
            db: 数据库会话
            job_id: 任务ID
            user_id: 用户ID
            force: 是否强制取消
            
        Returns:
            更新后的扫描任务
        """
        scan_job = await EmailScannerService.get_scan_job(db, job_id, user_id)
        
        if scan_job.status not in [ScanJobStatus.PENDING, ScanJobStatus.RUNNING]:
            raise BusinessException(f"任务状态为 {scan_job.status}，无法取消")
        
        # 强制取消时的特殊处理
        if force:
            # 立即更新状态，不等待任何进行中的操作
            scan_job.status = ScanJobStatus.CANCELLED
            scan_job.completed_at = datetime.utcnow()
            scan_job.error_message = "用户强制停止"
            scan_job.progress = scan_job.progress or 0  # 保持当前进度
            
            # 记录强制停止日志
            logger.warning(
                f"任务 {job_id} 被用户 {user_id} 强制停止，"
                f"当前进度: {scan_job.progress}%，"
                f"当前步骤: {scan_job.current_step}"
            )
        else:
            # 正常取消
            scan_job.status = ScanJobStatus.CANCELLED
            scan_job.completed_at = datetime.utcnow()
            scan_job.error_message = "用户取消"
        
        # 确保所有更改立即提交
        await db.flush()
        await db.commit()
        
        return scan_job
    
    @staticmethod
    async def cleanup_timeout_jobs(
        db: AsyncSession,
        timeout_minutes: int = 15  # 缩短默认超时时间
    ) -> int:
        """清理超时的扫描任务
        
        Args:
            db: 数据库会话
            timeout_minutes: 超时时间（分钟）
            
        Returns:
            清理的任务数量
        """
        # 计算超时时间点
        timeout_threshold = datetime.now(timezone.utc) - timedelta(minutes=timeout_minutes)
        stagnation_threshold = datetime.now(timezone.utc) - timedelta(minutes=10)
        
        # 查找所有运行中的任务
        stmt = select(EmailScanJob).filter(
            EmailScanJob.status == ScanJobStatus.RUNNING
        )
        result = await db.execute(stmt)
        running_jobs = result.scalars().all()
        
        cleaned_count = 0
        for job in running_jobs:
            should_cleanup = False
            cleanup_reason = ""
            
            # 检查是否超时
            if job.started_at < timeout_threshold:
                should_cleanup = True
                cleanup_reason = f"任务执行超时（超过 {timeout_minutes} 分钟）"
                logger.warning(
                    f"清理超时任务 {job.job_id}，开始时间: {job.started_at}，"
                    f"已运行 {(datetime.now(timezone.utc) - job.started_at).total_seconds() / 60:.1f} 分钟"
                )
            
            # 检查进度停滞
            elif job.progress is not None and job.progress < 50:
                if job.started_at < stagnation_threshold:
                    should_cleanup = True
                    cleanup_reason = f"任务进度异常缓慢（运行超过10分钟但进度仅 {job.progress}%）"
                    logger.warning(
                        f"清理停滞任务 {job.job_id}，进度停留在 {job.progress}%"
                    )
            
            if should_cleanup:
                # 更新任务状态为失败
                job.status = ScanJobStatus.FAILED
                job.error_message = cleanup_reason
                job.completed_at = datetime.now(timezone.utc)
                cleaned_count += 1
        
        # 提交更改
        if cleaned_count > 0:
            await db.flush()
            await db.commit()
            logger.info(f"清理了 {cleaned_count} 个异常任务")
        
        return cleaned_count
    
    @staticmethod
    async def check_and_cleanup_before_create(
        db: AsyncSession,
        email_account_id: str
    ) -> None:
        """在创建新任务前检查并清理该邮箱账户的超时任务
        
        Args:
            db: 数据库会话
            email_account_id: 邮箱账户ID
        """
        # 缩短超时时间为15分钟，提高响应速度
        timeout_threshold = datetime.now(timezone.utc) - timedelta(minutes=15)
        
        # 检查进度停滞的任务（10分钟内进度未变化）
        stagnation_threshold = datetime.now(timezone.utc) - timedelta(minutes=10)
        
        # 查找运行中的任务
        stmt = select(EmailScanJob).filter(
            and_(
                EmailScanJob.email_account_id == email_account_id,
                EmailScanJob.status == ScanJobStatus.RUNNING
            )
        )
        result = await db.execute(stmt)
        running_job = result.scalar_one_or_none()
        
        if running_job:
            should_cleanup = False
            cleanup_reason = ""
            
            # 检查是否超时
            if running_job.started_at < timeout_threshold:
                should_cleanup = True
                cleanup_reason = f"任务执行超时（超过 15 分钟）"
                logger.warning(
                    f"发现邮箱 {email_account_id} 的超时任务 {running_job.job_id}，"
                    f"已运行 {(datetime.now(timezone.utc) - running_job.started_at).total_seconds() / 60:.1f} 分钟"
                )
            
            # 检查进度是否停滞（如果有更新时间字段）
            elif hasattr(running_job, 'last_progress_update_at') and running_job.last_progress_update_at:
                if running_job.last_progress_update_at < stagnation_threshold:
                    should_cleanup = True
                    cleanup_reason = f"任务进度停滞（10分钟内进度未更新），当前进度: {running_job.progress}%"
                    logger.warning(
                        f"发现邮箱 {email_account_id} 的停滞任务 {running_job.job_id}，"
                        f"进度停留在 {running_job.progress}%"
                    )
            # 如果没有进度更新时间字段，检查进度是否长时间停留在较低水平
            elif running_job.progress is not None and running_job.progress < 50:
                # 如果任务运行超过10分钟但进度仍低于50%，可能存在问题
                if running_job.started_at < stagnation_threshold:
                    should_cleanup = True
                    cleanup_reason = f"任务进度异常缓慢（运行10分钟但进度仅 {running_job.progress}%）"
                    logger.warning(
                        f"发现邮箱 {email_account_id} 的缓慢任务 {running_job.job_id}，"
                        f"运行 {(datetime.utcnow() - running_job.started_at).total_seconds() / 60:.1f} 分钟，"
                        f"进度仅 {running_job.progress}%"
                    )
            
            if should_cleanup:
                running_job.status = ScanJobStatus.FAILED
                running_job.error_message = cleanup_reason
                running_job.completed_at = datetime.utcnow()
                
                await db.flush()
                await db.commit()
                
                logger.info(f"已清理异常任务 {running_job.job_id}，原因: {cleanup_reason}")