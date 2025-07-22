"""
混合同步策略服务
实现首次全量同步 + 增量同步 + 定期校验的邮件同步策略
"""
import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, or_
from contextlib import asynccontextmanager
import asyncio
import time

from app.models.email_account import EmailAccount
from app.models.email_index import EmailIndex, EmailSyncState
from app.services.email_account_service import EmailAccountService
from app.utils.encryption import decrypt_email_password
from app.core.exceptions import ServiceError
from app.services.email.search_builder import SearchBuilder

# 初始化 logger
logger = logging.getLogger(__name__)

# 使用 imap-tools 库替代 imapclient
try:
    from imap_tools import MailBox, AND, OR, NOT
    logger.info("成功导入 imap-tools 库")
except ImportError as e:
    MailBox = None
    logger.error(f"导入 imap-tools 库失败: {e}")


class HybridEmailSyncService:
    """混合邮件同步服务"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def sync_account(self, account_id: str, scan_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """同步指定账户的邮件
        
        根据账户状态决定使用全量同步还是增量同步
        
        Args:
            account_id: 账户ID
            scan_params: 扫描参数（包含关键词、日期范围等）
        """
        logger.info(f"开始同步账户 {account_id}")
        
        try:
            # 获取同步状态
            sync_state = await self._get_sync_state(account_id)
            logger.info(f"获取同步状态: {sync_state}")
            
            if not sync_state:
                # 初始化同步状态
                logger.info(f"账户 {account_id} 首次同步，初始化同步状态")
                sync_state = await self._init_sync_state(account_id)
            
            # 根据同步模式决定策略
            if sync_state.sync_mode in ['never_synced', 'full_sync_needed']:
                logger.info(f"账户 {account_id} 执行首次全量同步，同步模式: {sync_state.sync_mode}")
                return await self._full_sync(account_id, sync_state, scan_params)
            else:
                logger.info(f"账户 {account_id} 执行增量同步，同步模式: {sync_state.sync_mode}")
                return await self._incremental_sync(account_id, sync_state, scan_params)
        except Exception as e:
            logger.error(f"同步账户 {account_id} 失败: {str(e)}", exc_info=True)
            raise
    
    async def _full_sync(self, account_id: str, sync_state: EmailSyncState, scan_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """执行全量同步
        
        从 sync_start_date 开始同步所有邮件
        
        Args:
            account_id: 账户ID
            sync_state: 同步状态
            scan_params: 扫描参数（包含关键词、日期范围等）
        """
        result = {
            'sync_type': 'full',
            'total_emails': 0,
            'new_emails': 0,
            'updated_emails': 0,
            'errors': []
        }
        
        try:
            # 更新同步状态为进行中
            await self._update_sync_mode(account_id, 'full_sync_in_progress')
            
            # 获取邮箱连接
            async with self._get_imap_client(account_id) as mailbox:
                # 构建搜索条件
                logger.info(f"全量同步 - 传入的扫描参数: {scan_params}")
                search_criteria = self._build_search_criteria(scan_params)
                logger.info(f"使用搜索条件: {search_criteria}")
                
                # 根据条件搜索邮件 - 使用 imap-tools 的方式
                # 使用 fetch 获取消息，然后提取 UIDs，指定 charset='UTF-8' 支持中文
                messages = list(mailbox.fetch(search_criteria, mark_seen=False, charset='UTF-8'))
                all_uids = [int(msg.uid) for msg in messages]
                result['total_emails'] = len(all_uids)
                logger.info(f"找到 {len(all_uids)} 封符合条件的邮件")
                
                # 分批处理
                batch_size = 50
                processed_count = 0
                
                for i in range(0, len(messages), batch_size):
                    batch_messages = messages[i:i+batch_size]
                    
                    for msg in batch_messages:
                        try:
                            email_info = self._parse_imap_tools_message(msg)
                            
                            # 检查日期是否在同步范围内
                            # 处理不同的日期类型
                            email_date = email_info['email_date']
                            if isinstance(email_date, datetime):
                                email_date = email_date.date()
                            elif isinstance(email_date, date):
                                # 已经是 date 对象，无需转换
                                pass
                            else:
                                # 如果是其他类型，尝试转换
                                logger.warning(f"未知的日期类型: {type(email_date)}")
                                continue
                            
                            sync_start_date = sync_state.sync_start_date
                            if isinstance(sync_start_date, datetime):
                                sync_start_date = sync_start_date.date()
                            
                            if email_date >= sync_start_date:
                                # 保存到本地索引
                                is_new = await self._save_email_index(account_id, email_info)
                                if is_new:
                                    result['new_emails'] += 1
                                else:
                                    result['updated_emails'] += 1
                            
                            processed_count += 1
                            
                            # 更新进度
                            if processed_count % 100 == 0:
                                logger.info(f"已处理 {processed_count}/{len(all_uids)} 封邮件")
                                
                        except Exception as e:
                            logger.error(f"处理邮件 UID {msg.uid} 失败: {e}")
                            result['errors'].append(f"UID {msg.uid}: {str(e)}")
                
                # 更新同步状态
                if all_uids:
                    sync_state.sync_mode = 'incremental'
                    sync_state.last_sync_uid = max(all_uids)
                    sync_state.last_full_sync_time = datetime.now()
                    sync_state.total_emails_indexed = result['new_emails'] + result['updated_emails']
                    await self.db.commit()
            
            logger.info(f"全量同步完成: 新增 {result['new_emails']} 封，更新 {result['updated_emails']} 封")
            return result
            
        except Exception as e:
            logger.error(f"全量同步失败: {e}")
            # 恢复同步状态
            await self._update_sync_mode(account_id, 'full_sync_needed')
            raise ServiceError(f"全量同步失败: {str(e)}")
    
    async def _incremental_sync(self, account_id: str, sync_state: EmailSyncState, scan_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """执行增量同步
        
        使用两种策略：
        1. 近期邮件（30天内）：使用 SEARCH SINCE 命令
        2. 新邮件：使用 UID > last_sync_uid
        
        Args:
            account_id: 账户ID
            sync_state: 同步状态
            scan_params: 扫描参数（包含关键词、日期范围等）
        """
        result = {
            'sync_type': 'incremental',
            'recent_emails': 0,
            'new_emails': 0,
            'updated_emails': 0,
            'errors': []
        }
        
        try:
            async with self._get_imap_client(account_id) as mailbox:
                # 策略1：搜索最近180天的邮件（使用搜索条件）
                default_days_ago = date.today() - timedelta(days=180)
                
                # 如果用户指定了 date_from，使用较晚的日期
                if scan_params and scan_params.get('date_from'):
                    user_date_from = scan_params['date_from']
                    
                    # 处理字符串格式的日期
                    if isinstance(user_date_from, str):
                        try:
                            # 解析 ISO 格式的日期字符串 (YYYY-MM-DD)
                            user_date_from = datetime.strptime(user_date_from, '%Y-%m-%d').date()
                        except ValueError:
                            logger.warning(f"无法解析日期字符串: {user_date_from}，使用默认值")
                            user_date_from = default_days_ago
                    elif isinstance(user_date_from, datetime):
                        user_date_from = user_date_from.date()
                    elif not isinstance(user_date_from, date):
                        logger.warning(f"未知的日期类型: {type(user_date_from)}，使用默认值")
                        user_date_from = default_days_ago
                    
                    # 比较并选择较晚的日期
                    if user_date_from > default_days_ago:
                        default_days_ago = user_date_from
                
                # 构建包含日期限制的搜索条件
                recent_params = scan_params.copy() if scan_params else {}
                recent_params['date_from'] = default_days_ago
                recent_criteria = self._build_search_criteria(recent_params)
                
                # 使用 fetch 获取符合条件的邮件，指定 charset='UTF-8' 支持中文
                recent_messages = list(mailbox.fetch(recent_criteria, mark_seen=False, charset='UTF-8'))
                recent_uids = [int(msg.uid) for msg in recent_messages]
                
                result['recent_emails'] = len(recent_uids)
                
                # 策略2：获取新邮件（UID > last_sync_uid）
                last_uid = sync_state.last_sync_uid or 0
                new_uids = []
                if last_uid > 0:
                    # 使用 SearchBuilder 构建包含 UID 范围的搜索
                    uid_builder = SearchBuilder.from_params(scan_params if scan_params else {})
                    uid_builder.add_uid_range(uid_min=last_uid + 1)
                    uid_criteria = uid_builder.build()
                    
                    # 使用 fetch 获取符合条件的邮件，指定 charset='UTF-8' 支持中文
                    new_messages = list(mailbox.fetch(uid_criteria, mark_seen=False, charset='UTF-8'))
                    new_uids = [int(msg.uid) for msg in new_messages]
                
                # 合并两个策略的结果（去重）
                all_uids = list(set(recent_uids + new_uids))
                logger.info(f"增量同步：近期 {len(recent_uids)} 封，新增 {len(new_uids)} 封，合计 {len(all_uids)} 封")
                
                # 处理邮件
                if all_uids:
                    # 需要重新获取所有邮件，因为我们只有 UIDs
                    # 构建 UID 搜索条件
                    from imap_tools import AND
                    uid_list_str = ','.join(str(uid) for uid in all_uids)
                    all_messages = list(mailbox.fetch(AND(uid=uid_list_str), mark_seen=False, charset='UTF-8'))
                    
                    # 分批处理
                    batch_size = 50
                    for i in range(0, len(all_messages), batch_size):
                        batch_messages = all_messages[i:i+batch_size]
                        
                        for msg in batch_messages:
                            try:
                                email_info = self._parse_imap_tools_message(msg)
                                
                                # 保存到本地索引
                                is_new = await self._save_email_index(account_id, email_info)
                                if is_new:
                                    result['new_emails'] += 1
                                else:
                                    result['updated_emails'] += 1
                                    
                            except Exception as e:
                                logger.error(f"处理邮件 UID {msg.uid} 失败: {e}")
                                result['errors'].append(f"UID {msg.uid}: {str(e)}")
                    
                    # 更新最后同步的UID
                    sync_state.last_sync_uid = max(all_uids)
                    sync_state.last_incremental_sync_time = datetime.now()
                    sync_state.total_emails_indexed += result['new_emails']
                    await self.db.commit()
                
            logger.info(f"增量同步完成: 新增 {result['new_emails']} 封，更新 {result['updated_emails']} 封")
            return result
            
        except Exception as e:
            logger.error(f"增量同步失败: {e}")
            raise ServiceError(f"增量同步失败: {str(e)}")
    
    async def search_emails(
        self,
        account_id: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        subject_keywords: Optional[List[str]] = None,
        exclude_keywords: Optional[List[str]] = None,
        has_attachments: Optional[bool] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """从本地索引搜索邮件
        
        支持日期范围、关键词、附件等条件
        """
        query = select(EmailIndex).where(EmailIndex.account_id == account_id)
        
        # 日期过滤
        if date_from:
            query = query.where(EmailIndex.email_date >= date_from)
        if date_to:
            query = query.where(EmailIndex.email_date <= date_to)
        
        # 关键词过滤（包含）
        if subject_keywords:
            keyword_conditions = []
            for keyword in subject_keywords:
                keyword_conditions.append(
                    EmailIndex.subject.ilike(f'%{keyword}%')
                )
            query = query.where(or_(*keyword_conditions))
        
        # 排除关键词
        if exclude_keywords:
            for keyword in exclude_keywords:
                query = query.where(
                    ~EmailIndex.subject.ilike(f'%{keyword}%')
                )
        
        # 附件过滤
        if has_attachments is not None:
            query = query.where(EmailIndex.has_attachments == has_attachments)
        
        # 排序和限制
        query = query.order_by(EmailIndex.email_date.desc()).limit(limit)
        
        # 执行查询
        result = await self.db.execute(query)
        emails = result.scalars().all()
        
        # 转换为字典列表
        return [
            {
                'uid': email.uid,
                'subject': email.subject,
                'from_address': email.from_address,
                'to_address': email.to_address,
                'email_date': email.email_date,
                'message_id': email.message_id,
                'has_attachments': email.has_attachments,
                'attachment_count': email.attachment_count,
                'attachment_names': email.attachment_names,
                'flags': email.flags,
                'folder_name': email.folder_name
            }
            for email in emails
        ]
    
    def _parse_imap_tools_message(self, msg) -> Dict[str, Any]:
        """解析 imap-tools 邮件消息对象"""
        # 解析附件信息
        has_attachments = len(msg.attachments) > 0
        attachment_names = [att.filename for att in msg.attachments if att.filename]
        
        # 构建邮件信息
        email_info = {
            'uid': int(msg.uid),
            'subject': msg.subject or '',
            'from_address': msg.from_ or '',
            'to_address': ', '.join(msg.to) if msg.to else '',
            'email_date': msg.date,
            'message_id': msg.headers.get('message-id', [''])[0] if msg.headers.get('message-id') else '',
            'has_attachments': has_attachments,
            'attachment_count': len(attachment_names),
            'attachment_names': attachment_names,
            'flags': list(msg.flags),
            'folder_name': 'INBOX'
        }
        
        return email_info
    
    def _parse_imap_tools_message_with_body(self, msg) -> Dict[str, Any]:
        """解析邮件消息并包含正文"""
        email_info = self._parse_imap_tools_message(msg)
        
        # 添加邮件正文
        email_info['text_body'] = msg.text or ''
        email_info['html_body'] = msg.html or ''
        
        return email_info
    
    def _parse_email_data(self, uid: int, msg_data: Dict) -> Dict[str, Any]:
        """解析邮件数据"""
        envelope = msg_data.get(b'ENVELOPE')
        bodystructure = msg_data.get(b'BODYSTRUCTURE')
        internal_date = msg_data.get(b'INTERNALDATE')
        flags = msg_data.get(b'FLAGS', [])
        
        # 解析附件信息
        has_attachments, attachment_names = self._parse_attachments(bodystructure)
        
        # 构建邮件信息
        email_info = {
            'uid': uid,
            'subject': envelope.subject.decode('utf-8', errors='ignore') if envelope.subject else '',
            'from_address': self._format_address(envelope.from_[0]) if envelope.from_ else '',
            'to_address': self._format_address(envelope.to[0]) if envelope.to else '',
            'email_date': internal_date,
            'message_id': envelope.message_id.decode('utf-8', errors='ignore') if envelope.message_id else '',
            'has_attachments': has_attachments,
            'attachment_count': len(attachment_names),
            'attachment_names': attachment_names,
            'flags': [flag.decode() if isinstance(flag, bytes) else flag for flag in flags],
            'folder_name': 'INBOX'
        }
        
        return email_info
    
    def _format_address(self, addr) -> str:
        """格式化邮件地址"""
        if not addr:
            return ''
        mailbox = addr.mailbox.decode('utf-8', errors='ignore') if addr.mailbox else ''
        host = addr.host.decode('utf-8', errors='ignore') if addr.host else ''
        return f"{mailbox}@{host}" if mailbox and host else ''
    
    def _parse_attachments(self, bodystructure) -> Tuple[bool, List[str]]:
        """解析附件信息"""
        # TODO: 实现 bodystructure 解析逻辑
        # 这里简化处理，实际需要递归解析 MIME 结构
        return False, []
    
    async def _get_sync_state(self, account_id: str) -> Optional[EmailSyncState]:
        """获取同步状态"""
        query = select(EmailSyncState).where(
            and_(
                EmailSyncState.account_id == account_id,
                EmailSyncState.folder_name == 'INBOX'
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def _init_sync_state(self, account_id: str) -> EmailSyncState:
        """初始化同步状态"""
        sync_state = EmailSyncState(
            account_id=account_id,
            folder_name='INBOX',
            sync_mode='never_synced',
            sync_start_date=datetime(date.today().year, 1, 1)
        )
        
        self.db.add(sync_state)
        await self.db.commit()
        await self.db.refresh(sync_state)
        
        return sync_state
    
    async def _update_sync_mode(self, account_id: str, sync_mode: str):
        """更新同步模式"""
        stmt = update(EmailSyncState).where(
            and_(
                EmailSyncState.account_id == account_id,
                EmailSyncState.folder_name == 'INBOX'
            )
        ).values(sync_mode=sync_mode)
        
        await self.db.execute(stmt)
        await self.db.commit()
    
    async def _save_email_index(self, account_id: str, email_info: Dict) -> bool:
        """保存邮件到索引
        
        返回是否为新邮件
        """
        # 检查是否已存在
        query = select(EmailIndex).where(
            and_(
                EmailIndex.account_id == account_id,
                EmailIndex.folder_name == email_info['folder_name'],
                EmailIndex.uid == email_info['uid']
            )
        )
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()
        
        # 确保 email_date 是 datetime 对象
        email_date = email_info['email_date']
        if isinstance(email_date, date) and not isinstance(email_date, datetime):
            # 如果是 date 对象，转换为 datetime（使用当天开始时间）
            email_date = datetime.combine(email_date, datetime.min.time())
        elif not isinstance(email_date, (date, datetime)):
            # 如果既不是 date 也不是 datetime，记录警告并使用当前时间
            logger.warning(f"未知的日期类型: {type(email_date)}，使用当前时间")
            email_date = datetime.now()
        
        if existing:
            # 更新现有记录
            existing.subject = email_info['subject']
            existing.flags = email_info['flags']
            existing.email_date = email_date  # 更新日期
            await self.db.commit()
            return False
        else:
            # 创建新记录
            email_index = EmailIndex(
                account_id=account_id,
                uid=email_info['uid'],
                folder_name=email_info['folder_name'],
                subject=email_info['subject'],
                from_address=email_info['from_address'],
                to_address=email_info['to_address'],
                email_date=email_date,  # 使用转换后的日期
                message_id=email_info['message_id'],
                has_attachments=email_info['has_attachments'],
                attachment_count=email_info['attachment_count'],
                attachment_names=email_info['attachment_names'],
                flags=email_info['flags']
            )
            
            self.db.add(email_index)
            await self.db.commit()
            return True
    
    @asynccontextmanager
    async def _get_imap_client(self, account_id: str):
        """获取IMAP客户端上下文管理器"""
        logger.info(f"获取账户 {account_id} 的 IMAP 客户端")
        
        if not MailBox:
            logger.error("imap-tools 库未安装或导入失败")
            raise ServiceError("imap-tools 库未安装，无法使用混合同步功能")
        
        # 获取邮箱账户信息
        logger.info(f"获取邮箱账户信息")
        account = await self._get_email_account(account_id)
        logger.info(f"邮箱账户: {account.email_address}, IMAP: {account.imap_host}:{account.imap_port}")
        
        # 解密密码
        password = decrypt_email_password(account.encrypted_password)
        logger.info(f"密码解密成功")
        
        # 创建IMAP客户端（带重试机制）
        logger.info(f"创建 IMAP 客户端连接到 {account.imap_host}:{account.imap_port}")
        
        max_retries = 3
        retry_delay = 2  # 初始延迟时间（秒）
        mailbox = None
        
        for attempt in range(max_retries):
            try:
                # 创建 MailBox 实例
                mailbox = MailBox(
                    host=account.imap_host,
                    port=account.imap_port,
                    timeout=30  # 30秒超时
                )
                
                # 登录
                logger.info(f"尝试登录邮箱 {account.email_address}（第 {attempt + 1} 次尝试）")
                mailbox.login(account.email_address, password, initial_folder='INBOX')
                logger.info(f"登录成功")
                
                # 成功连接，使用yield返回客户端
                try:
                    yield mailbox
                finally:
                    # 确保连接关闭
                    try:
                        logger.info("关闭 IMAP 连接")
                        mailbox.logout()
                    except Exception as e:
                        logger.warning(f"关闭 IMAP 连接失败: {e}")
                
                # 成功完成，退出重试循环
                return
                
            except Exception as e:
                logger.error(f"IMAP 连接/登录失败（第 {attempt + 1} 次尝试）: {str(e)}")
                
                # 如果是最后一次尝试，抛出详细错误
                if attempt == max_retries - 1:
                    error_msg = str(e).lower()
                    if 'login' in error_msg or 'auth' in error_msg:
                        raise ServiceError("IMAP登录失败：可能是登录频率限制或IMAP服务未开启。请稍后重试或检查邮箱设置。")
                    elif 'connection' in error_msg or 'timeout' in error_msg:
                        raise ServiceError("IMAP连接失败：请检查网络连接和服务器设置。")
                    else:
                        raise ServiceError(f"IMAP操作失败：{str(e)}")
                
                # 指数退避
                wait_time = retry_delay * (2 ** attempt)
                logger.info(f"等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)
    
    def _build_search_criteria(self, scan_params: Optional[Dict[str, Any]] = None):
        """构建 imap-tools 搜索条件
        
        使用 SearchBuilder 类构建搜索条件
        
        Args:
            scan_params: 扫描参数字典
            
        Returns:
            imap-tools 搜索条件对象
        """
        if not scan_params:
            return 'ALL'
            
        # 使用 SearchBuilder 构建条件
        builder = SearchBuilder.from_params(scan_params)
        return builder.build()
    
    async def _get_email_account(self, account_id: str) -> EmailAccount:
        """获取邮箱账户"""
        query = select(EmailAccount).where(EmailAccount.id == account_id)
        result = await self.db.execute(query)
        account = result.scalar_one_or_none()
        
        if not account:
            raise ServiceError(f"邮箱账户 {account_id} 不存在")
        
        return account