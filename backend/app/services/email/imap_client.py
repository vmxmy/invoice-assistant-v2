"""Enhanced IMAP client using imap-tools for better UTF-8 support."""
import email
from email.message import Message
from email.header import decode_header
from typing import List, Tuple, Dict, Optional, Any, Union
import logging
from datetime import datetime, date
import ssl
import socket
from contextlib import contextmanager
from imap_tools import MailBox, AND, OR, NOT, MailMessage
from imap_tools.errors import MailboxLoginError, MailboxFolderSelectError

logger = logging.getLogger(__name__)


class IMAPClient:
    """Enhanced IMAP client using imap-tools with better UTF-8 and error handling."""
    
    def __init__(self, host: str, port: int = 993, use_ssl: bool = True,
                 timeout: int = 60, max_retries: int = 3):
        """Initialize IMAP client with security enhancements.
        
        Args:
            host: IMAP server hostname
            port: IMAP server port (default: 993 for SSL)
            use_ssl: Whether to use SSL connection
            timeout: Connection timeout in seconds (default: 60)
            max_retries: Maximum retry attempts for failed operations
        """
        self.host = host
        self.port = port
        self.use_ssl = use_ssl
        self.timeout = timeout
        self.max_retries = max_retries
        self.mailbox: Optional[MailBox] = None
        self._username: Optional[str] = None
        self._password: Optional[str] = None
        
    def connect(self, username: str, password: str) -> bool:
        """Connect to IMAP server and authenticate.
        
        Args:
            username: Email username
            password: Email password
            
        Returns:
            True if connection successful, False otherwise
        """
        self._username = username
        self._password = password
        
        for attempt in range(self.max_retries):
            try:
                # 创建 MailBox 实例
                self.mailbox = MailBox(
                    host=self.host,
                    port=self.port,
                    timeout=self.timeout
                )
                
                # 登录
                self.mailbox.login(username, password, initial_folder='INBOX')
                logger.info(f"Successfully connected to {self.host} as {username}")
                return True
                
            except MailboxLoginError as e:
                logger.error(f"Login failed (attempt {attempt + 1}): {str(e)}")
                if attempt == self.max_retries - 1:
                    return False
                # 指数退避重试
                import time
                time.sleep(2 ** attempt)
                
            except socket.timeout:
                logger.error(f"Connection timeout to {self.host}:{self.port}")
                return False
                
            except ssl.SSLError as e:
                logger.error(f"SSL error: {str(e)}")
                return False
                
            except Exception as e:
                logger.error(f"Unexpected error connecting to {self.host}: {str(e)}")
                return False
                
        return False
    
    def disconnect(self):
        """Gracefully disconnect from IMAP server."""
        if self.mailbox:
            try:
                self.mailbox.logout()
                logger.info(f"Successfully disconnected from {self.host}")
            except Exception as e:
                logger.warning(f"Error during logout: {str(e)}")
            finally:
                self.mailbox = None
            
    def list_folders(self) -> List[str]:
        """List all folders in the mailbox.
        
        Returns:
            List of folder names
        """
        if not self.mailbox:
            return []
            
        try:
            # 获取文件夹列表
            folders = list(self.mailbox.folder.list())
            return [folder.name for folder in folders]
            
        except socket.timeout:
            logger.error("Folder listing operation timed out")
            return []
        except Exception as e:
            logger.error(f"Failed to list folders: {str(e)}")
            return []
            
    def select_folder(self, folder: str = 'INBOX') -> bool:
        """Select a folder to work with.
        
        Args:
            folder: Folder name (default: INBOX)
            
        Returns:
            True if selection successful
        """
        if not self.mailbox:
            return False
            
        try:
            # 选择文件夹
            self.mailbox.folder.set(folder)
            logger.debug(f"Selected folder {folder}")
            return True
            
        except MailboxFolderSelectError as e:
            logger.error(f"Failed to select folder {folder}: {str(e)}")
            return False
            
    def search_emails(self, criteria: Union[str, List] = 'ALL', charset: str = 'UTF-8') -> List[int]:
        """Search emails based on criteria with better UTF-8 support.
        
        Args:
            criteria: IMAP search criteria (e.g., 'ALL', 'UNSEEN', ['SUBJECT', '发票'])
            charset: Character set for search (default: UTF-8)
            
        Returns:
            List of email UIDs matching the criteria
        """
        if not self.mailbox:
            return []
            
        try:
            # 构建搜索条件
            search_criteria = self._build_search_criteria(criteria)
            
            logger.debug(f"Searching with criteria: {search_criteria}")
            
            # 使用 imap-tools 搜索，指定 charset
            # 为了性能，先获取 UID 列表而不是完整消息
            if hasattr(self.mailbox, 'uids'):
                # 使用 uids 方法只获取 ID
                uids = list(self.mailbox.uids(search_criteria, charset=charset))
                uids = [int(uid) for uid in uids]
            else:
                # 如果没有 uids 方法，回退到 fetch 但限制数量
                messages = []
                for i, msg in enumerate(self.mailbox.fetch(search_criteria, charset=charset, mark_seen=False)):
                    messages.append(msg)
                    if i >= 1000:  # 限制最多处理1000封邮件
                        logger.warning("Search results limited to 1000 emails")
                        break
                uids = [int(msg.uid) for msg in messages]
            
            logger.info(f"Found {len(uids)} emails matching criteria")
            return uids
            
        except Exception as e:
            logger.error(f"Email search exception: {str(e)}")
            return []
    
    def _build_search_criteria(self, criteria: Union[str, List]):
        """Build search criteria for imap-tools.
        
        Args:
            criteria: Search criteria string or list
            
        Returns:
            imap-tools search criteria
        """
        if criteria == 'ALL':
            return 'ALL'
            
        if isinstance(criteria, str):
            # 简单字符串条件
            if criteria == 'UNSEEN':
                return AND(seen=False)
            return criteria
            
        if isinstance(criteria, list) and len(criteria) >= 2:
            # 列表格式：['SUBJECT', '发票']
            if criteria[0] == 'SUBJECT':
                return AND(subject=criteria[1])
            elif criteria[0] == 'TEXT':
                return AND(text=criteria[1])
            elif criteria[0] == 'FROM':
                return AND(from_=criteria[1])
            elif criteria[0] == 'SINCE' and len(criteria) >= 2:
                # 处理日期条件
                return AND(date_gte=criteria[1])
                
        # 默认返回ALL
        return 'ALL'
            
    def fetch_email(self, email_uid: int) -> Optional[Message]:
        """Fetch a single email by UID.
        
        Args:
            email_uid: Email UID to fetch
            
        Returns:
            Email message object or None if failed
        """
        if not self.mailbox:
            return None
            
        try:
            # 通过UID获取邮件 - 使用正确的语法
            # imap-tools 的 AND(uid=...) 期望字符串格式的 UID
            for msg in self.mailbox.fetch(AND(uid=str(email_uid)), mark_seen=False, limit=1):
                # 只需要第一封邮件（应该只有一封）
                return self._convert_to_message(msg)
                
            # 如果没有找到邮件
            logger.warning(f"No email found with UID {email_uid}")
            return None
            
        except Exception as e:
            logger.error(f"Failed to fetch email {email_uid}: {str(e)}")
            return None
    
    def _convert_to_message(self, mail_message: MailMessage) -> Message:
        """Convert imap-tools MailMessage to email.message.Message.
        
        Args:
            mail_message: imap-tools MailMessage object
            
        Returns:
            Standard email.message.Message object
        """
        # 获取原始邮件内容
        if hasattr(mail_message, 'obj'):
            return mail_message.obj
        
        # 如果没有原始对象，创建一个新的
        from email.message import EmailMessage
        msg = EmailMessage()
        msg['Subject'] = mail_message.subject or ''
        msg['From'] = mail_message.from_ or ''
        msg['To'] = ', '.join(mail_message.to) if mail_message.to else ''
        msg['Date'] = mail_message.date_str or ''
        
        # 设置内容
        if mail_message.text:
            msg.set_content(mail_message.text)
        elif mail_message.html:
            msg.set_content(mail_message.html, subtype='html')
            
        return msg
            
    def get_email_info(self, msg: Message) -> Dict[str, Any]:
        """Extract basic information from email message.
        
        Args:
            msg: Email message object
            
        Returns:
            Dictionary with email information
        """
        info = {
            'subject': '',
            'from': '',
            'to': '',
            'date': '',
            'attachments': []
        }
        
        # Extract subject
        subject = msg.get('Subject', '')
        if subject:
            decoded_subject = decode_header(subject)
            subject_parts = []
            for part, encoding in decoded_subject:
                if isinstance(part, bytes):
                    # 处理未知编码
                    if encoding and encoding.lower() == 'unknown-8bit':
                        encoding = 'utf-8'
                    part = part.decode(encoding or 'utf-8', errors='ignore')
                subject_parts.append(part)
            info['subject'] = ''.join(subject_parts)
            
        # Extract from, to, date
        info['from'] = msg.get('From', '')
        info['to'] = msg.get('To', '')
        info['date'] = msg.get('Date', '')
        
        # Check for attachments
        for part in msg.walk():
            if part.get_content_disposition() == 'attachment':
                filename = part.get_filename()
                if filename:
                    decoded_filename = decode_header(filename)
                    filename_parts = []
                    for part_name, encoding in decoded_filename:
                        if isinstance(part_name, bytes):
                            # 处理未知编码
                            if encoding and encoding.lower() == 'unknown-8bit':
                                encoding = 'utf-8'
                            part_name = part_name.decode(encoding or 'utf-8', errors='ignore')
                        filename_parts.append(part_name)
                    info['attachments'].append(''.join(filename_parts))
                    
        return info
        
    def download_attachment(self, msg: Message, filename: str) -> Optional[bytes]:
        """Download a specific attachment from email.
        
        Args:
            msg: Email message object
            filename: Name of the attachment to download
            
        Returns:
            Attachment content as bytes or None if not found
        """
        for part in msg.walk():
            if part.get_content_disposition() == 'attachment':
                part_filename = part.get_filename()
                if part_filename:
                    decoded_filename = decode_header(part_filename)
                    filename_parts = []
                    for part_name, encoding in decoded_filename:
                        if isinstance(part_name, bytes):
                            # 处理未知编码
                            if encoding and encoding.lower() == 'unknown-8bit':
                                encoding = 'utf-8'
                            part_name = part_name.decode(encoding or 'utf-8', errors='ignore')
                        filename_parts.append(part_name)
                    decoded_filename = ''.join(filename_parts)
                    
                    if decoded_filename == filename:
                        return part.get_payload(decode=True)
                        
        return None
        
    def mark_as_read(self, email_uid: int) -> bool:
        """Mark an email as read.
        
        Args:
            email_uid: Email UID to mark as read
            
        Returns:
            True if successful
        """
        if not self.mailbox:
            return False
            
        try:
            # 使用 imap-tools 标记邮件为已读
            self.mailbox.flag([str(email_uid)], ['\\Seen'], True)
            return True
            
        except Exception as e:
            logger.error(f"Failed to mark email {email_uid} as read: {str(e)}")
            return False
            
    def move_to_folder(self, email_uid: int, target_folder: str) -> bool:
        """Move an email to another folder.
        
        Args:
            email_uid: Email UID to move
            target_folder: Target folder name
            
        Returns:
            True if successful
        """
        if not self.mailbox:
            return False
            
        try:
            # 使用 imap-tools 移动邮件
            self.mailbox.move([str(email_uid)], target_folder)
            return True
            
        except Exception as e:
            logger.error(f"Failed to move email {email_uid} to {target_folder}: {str(e)}")
            return False
    
    def search_by_date_range(self, since_date: datetime, before_date: Optional[datetime] = None) -> List[int]:
        """Search emails within a date range.
        
        Args:
            since_date: Start date (inclusive)
            before_date: End date (exclusive), defaults to today
            
        Returns:
            List of email UIDs
        """
        if not self.mailbox:
            return []
            
        try:
            # 构建日期搜索条件
            if before_date:
                criteria = AND(date_gte=since_date.date(), date_lt=before_date.date())
            else:
                criteria = AND(date_gte=since_date.date())
                
            messages = list(self.mailbox.fetch(criteria, charset='UTF-8', mark_seen=False))
            return [int(msg.uid) for msg in messages]
            
        except Exception as e:
            logger.error(f"Failed to search by date range: {str(e)}")
            return []
    
    def search_emails_advanced(self, 
                             date_from: Optional[datetime] = None,
                             date_to: Optional[datetime] = None,
                             subject_keywords: Optional[List[str]] = None,
                             exclude_keywords: Optional[List[str]] = None,
                             sender_filters: Optional[List[str]] = None,
                             max_results: Optional[int] = None) -> List[int]:
        """Advanced email search with multiple criteria.
        
        Args:
            date_from: 起始日期
            date_to: 结束日期
            subject_keywords: 主题关键词（OR逻辑）
            exclude_keywords: 排除关键词
            sender_filters: 发件人过滤（OR逻辑）
            max_results: 最大结果数
            
        Returns:
            List of email UIDs matching criteria
        """
        if not self.mailbox:
            return []
            
        try:
            all_uids = set()  # 使用集合去重
            
            # 构建基础搜索参数（避免嵌套 AND）
            base_params = {}
            if date_from:
                base_params['date_gte'] = date_from.date()
            if date_to:
                base_params['date_lt'] = date_to.date()
            
            # 策略：如果有主题关键词，分别搜索每个关键词
            if subject_keywords:
                for keyword in subject_keywords:
                    logger.info(f"搜索主题包含 '{keyword}' 的邮件...")
                    
                    # 复制基础参数并添加主题
                    params = base_params.copy()
                    params['subject'] = keyword
                    
                    # 添加发件人条件（如果只有一个）
                    if sender_filters and len(sender_filters) == 1:
                        params['from_'] = sender_filters[0]
                    
                    # 使用参数字典构建条件（正确的方式）
                    try:
                        criteria = AND(**params)
                        logger.debug(f"搜索条件: {criteria}")
                        
                        if hasattr(self.mailbox, 'uids'):
                            uids = list(self.mailbox.uids(criteria, charset='UTF-8'))
                            all_uids.update(int(uid) for uid in uids)
                            logger.info(f"  找到 {len(uids)} 封邮件")
                    except socket.timeout:
                        logger.warning(f"搜索 '{keyword}' 超时，跳过")
                        continue
                    except Exception as e:
                        logger.error(f"搜索 '{keyword}' 失败: {str(e)}")
                        continue
            
            # 如果没有主题关键词，但有其他条件
            elif base_params or sender_filters:
                # 添加发件人条件
                if sender_filters and len(sender_filters) == 1:
                    base_params['from_'] = sender_filters[0]
                
                # 使用参数字典构建条件
                try:
                    if base_params:
                        criteria = AND(**base_params)
                    else:
                        criteria = 'ALL'
                    
                    logger.debug(f"搜索条件: {criteria}")
                    
                    if hasattr(self.mailbox, 'uids'):
                        uids = list(self.mailbox.uids(criteria, charset='UTF-8'))
                        all_uids.update(int(uid) for uid in uids)
                        logger.info(f"找到 {len(uids)} 封邮件")
                except socket.timeout:
                    logger.error("Search operation timed out")
                    return []
                except Exception as e:
                    logger.error(f"搜索失败: {str(e)}")
                    return []
            
            # 转换为列表
            uids = list(all_uids)
            logger.info(f"合并后共找到 {len(uids)} 封不重复的邮件")
            
            # 限制结果数量
            if max_results and len(uids) > max_results:
                # 按照UID降序排序（新邮件在前）
                uids.sort(reverse=True)
                uids = uids[:max_results]
            
            logger.info(f"Found {len(uids)} emails matching all criteria")
            return uids
            
        except Exception as e:
            logger.error(f"Failed to perform advanced search: {str(e)}")
            return []
    
    def get_folder_status(self, folder: str = 'INBOX') -> Optional[Dict[str, int]]:
        """Get folder status information.
        
        Args:
            folder: Folder name
            
        Returns:
            Dictionary with folder status or None
        """
        if not self.mailbox:
            return None
            
        try:
            # 选择文件夹
            self.mailbox.folder.set(folder)
            
            # 获取文件夹状态
            # 注意：imap-tools 不直接提供 folder_status，需要使用底层方法
            # 这里简化处理，返回基本信息
            return {
                'total': -1,  # 需要额外实现
                'recent': -1,
                'unseen': -1
            }
            
        except Exception as e:
            logger.error(f"Failed to get folder status: {str(e)}")
            return None