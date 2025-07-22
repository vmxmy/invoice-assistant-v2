"""Advanced IMAP client using imap-tools with optimized features."""
import asyncio
import email
from email.message import Message
from email.header import decode_header
from typing import List, Tuple, Dict, Optional, Any, Union, Generator
import logging
from datetime import datetime, date
import ssl
import socket
from contextlib import contextmanager
from functools import lru_cache
from imap_tools import MailBox, AND, OR, NOT, MailMessage, A, O, N, H
from imap_tools.errors import MailboxLoginError, MailboxFolderSelectError

logger = logging.getLogger(__name__)


class IMAPClientAdvanced:
    """Advanced IMAP client with performance optimizations and robust error handling."""
    
    def __init__(self, host: str, port: int = 993, use_ssl: bool = True,
                 timeout: int = 60, max_retries: int = 3):
        """Initialize IMAP client with enhanced features.
        
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
        self._idle_task: Optional[asyncio.Task] = None
        
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
        if self._idle_task:
            self._idle_task.cancel()
            
        if self.mailbox:
            try:
                self.mailbox.logout()
                logger.info(f"Successfully disconnected from {self.host}")
            except Exception as e:
                logger.warning(f"Error during logout: {str(e)}")
            finally:
                self.mailbox = None
                
    # ========== 文件夹管理增强功能 ==========
    
    @lru_cache(maxsize=32)
    def list_folders_cached(self) -> List[str]:
        """List all folders with caching."""
        return self.list_folders()
    
    def list_folders(self) -> List[str]:
        """List all folders in the mailbox."""
        if not self.mailbox:
            return []
            
        try:
            folders = list(self.mailbox.folder.list())
            return [folder.name for folder in folders]
            
        except Exception as e:
            logger.error(f"Failed to list folders: {str(e)}")
            return []
            
    def create_folder(self, folder_name: str) -> bool:
        """Create a new folder."""
        if not self.mailbox:
            return False
            
        try:
            self.mailbox.folder.create(folder_name)
            logger.info(f"Created folder: {folder_name}")
            # 清除缓存
            self.list_folders_cached.cache_clear()
            return True
        except Exception as e:
            logger.error(f"Failed to create folder {folder_name}: {str(e)}")
            return False
            
    def delete_folder(self, folder_name: str) -> bool:
        """Delete a folder."""
        if not self.mailbox:
            return False
            
        try:
            self.mailbox.folder.delete(folder_name)
            logger.info(f"Deleted folder: {folder_name}")
            # 清除缓存
            self.list_folders_cached.cache_clear()
            return True
        except Exception as e:
            logger.error(f"Failed to delete folder {folder_name}: {str(e)}")
            return False
            
    def rename_folder(self, old_name: str, new_name: str) -> bool:
        """Rename a folder."""
        if not self.mailbox:
            return False
            
        try:
            self.mailbox.folder.rename(old_name, new_name)
            logger.info(f"Renamed folder: {old_name} -> {new_name}")
            # 清除缓存
            self.list_folders_cached.cache_clear()
            return True
        except Exception as e:
            logger.error(f"Failed to rename folder {old_name}: {str(e)}")
            return False
            
    def get_folder_status(self, folder: str = 'INBOX') -> Optional[Dict[str, int]]:
        """Get detailed folder status."""
        if not self.mailbox:
            return None
            
        try:
            self.mailbox.folder.set(folder)
            status = self.mailbox.folder.status(folder)
            return {
                'messages': status.get('MESSAGES', 0),
                'recent': status.get('RECENT', 0),
                'unseen': status.get('UNSEEN', 0),
                'uidnext': status.get('UIDNEXT', 0),
                'uidvalidity': status.get('UIDVALIDITY', 0)
            }
        except Exception as e:
            logger.error(f"Failed to get folder status: {str(e)}")
            return None
            
    # ========== 批量操作优化 ==========
    
    def fetch_emails_batch(self, email_uids: List[int], 
                          bulk: Union[bool, int] = True,
                          headers_only: bool = False) -> List[MailMessage]:
        """Batch fetch emails with optimization.
        
        Args:
            email_uids: List of email UIDs to fetch
            bulk: True for single command, False for individual, 
                  or int for chunk size
            headers_only: Fetch only headers without body
            
        Returns:
            List of email messages
        """
        if not self.mailbox or not email_uids:
            return []
            
        try:
            uid_str = ','.join(str(uid) for uid in email_uids)
            messages = []
            
            for msg in self.mailbox.fetch(
                A(uid=uid_str),
                mark_seen=False,
                bulk=bulk,
                headers_only=headers_only
            ):
                messages.append(msg)
                
            logger.info(f"Batch fetched {len(messages)} emails")
            return messages
            
        except Exception as e:
            logger.error(f"Batch fetch failed: {str(e)}")
            return []
            
    def fetch_emails_generator(self, criteria: Union[str, A] = 'ALL',
                             limit: Optional[int] = None) -> Generator[MailMessage, None, None]:
        """Fetch emails as generator for memory efficiency.
        
        Args:
            criteria: Search criteria
            limit: Maximum number of emails to fetch
            
        Yields:
            Email messages one by one
        """
        if not self.mailbox:
            return
            
        try:
            count = 0
            for msg in self.mailbox.fetch(criteria, mark_seen=False):
                yield msg
                count += 1
                if limit and count >= limit:
                    break
                    
        except Exception as e:
            logger.error(f"Generator fetch failed: {str(e)}")
            
    # ========== 高级搜索功能 ==========
    
    def search_emails_advanced(self, **kwargs) -> List[int]:
        """Advanced email search with complex criteria.
        
        Supported kwargs:
            - date_from: Start date
            - date_to: End date 
            - subject_keywords: List of subject keywords (OR)
            - exclude_keywords: List of keywords to exclude
            - sender_filters: List of sender addresses (OR)
            - has_attachments: Boolean
            - is_unread: Boolean
            - is_flagged: Boolean
            - custom_headers: Dict of header name -> value
            - size_min: Minimum size in bytes
            - size_max: Maximum size in bytes
            
        Returns:
            List of matching email UIDs
        """
        if not self.mailbox:
            return []
            
        try:
            criteria_parts = []
            
            # 日期范围
            if kwargs.get('date_from'):
                criteria_parts.append(date_gte=kwargs['date_from'])
            if kwargs.get('date_to'):
                criteria_parts.append(date_lt=kwargs['date_to'])
                
            # 主题关键词（OR逻辑）
            if kwargs.get('subject_keywords'):
                subject_conditions = [A(subject=kw) for kw in kwargs['subject_keywords']]
                if len(subject_conditions) > 1:
                    criteria_parts.append(O(*subject_conditions))
                else:
                    criteria_parts.append(subject_conditions[0])
                    
            # 排除关键词
            if kwargs.get('exclude_keywords'):
                for kw in kwargs['exclude_keywords']:
                    criteria_parts.append(N(subject=kw))
                    
            # 发件人过滤（OR逻辑）
            if kwargs.get('sender_filters'):
                sender_conditions = [A(from_=sender) for sender in kwargs['sender_filters']]
                if len(sender_conditions) > 1:
                    criteria_parts.append(O(*sender_conditions))
                else:
                    criteria_parts.append(sender_conditions[0])
                    
            # 状态标志
            if kwargs.get('is_unread'):
                criteria_parts.append(seen=False)
            if kwargs.get('is_flagged'):
                criteria_parts.append(flagged=True)
                
            # 大小过滤
            if kwargs.get('size_min'):
                criteria_parts.append(size_gt=kwargs['size_min'])
            if kwargs.get('size_max'):
                criteria_parts.append(size_lt=kwargs['size_max'])
                
            # 自定义头部
            if kwargs.get('custom_headers'):
                for header, value in kwargs['custom_headers'].items():
                    criteria_parts.append(H(header, value))
                    
            # 组合所有条件
            if criteria_parts:
                if len(criteria_parts) == 1:
                    criteria = criteria_parts[0]
                else:
                    criteria = A(*criteria_parts)
            else:
                criteria = 'ALL'
                
            # 执行搜索
            uids = list(self.mailbox.uids(criteria, charset='UTF-8'))
            
            # 排序（新邮件在前）
            uids.sort(reverse=True)
            
            # 限制结果数量
            if kwargs.get('max_results'):
                uids = uids[:kwargs['max_results']]
                
            logger.info(f"Advanced search found {len(uids)} emails")
            return [int(uid) for uid in uids]
            
        except Exception as e:
            logger.error(f"Advanced search failed: {str(e)}")
            return []
            
    # ========== IDLE 支持 ==========
    
    async def start_idle_monitoring(self, callback, timeout: int = 300):
        """Start IDLE monitoring for new emails.
        
        Args:
            callback: Async function to call when new emails arrive
            timeout: IDLE timeout in seconds (default: 5 minutes)
        """
        if not self.mailbox:
            logger.error("Not connected to mailbox")
            return
            
        async def idle_loop():
            while True:
                try:
                    logger.info("Starting IDLE wait...")
                    responses = self.mailbox.idle.wait(timeout=timeout)
                    
                    if responses:
                        logger.info(f"IDLE received {len(responses)} responses")
                        await callback(responses)
                    else:
                        logger.debug("IDLE timeout, restarting...")
                        
                except Exception as e:
                    logger.error(f"IDLE error: {str(e)}")
                    await asyncio.sleep(60)  # 错误后等待1分钟
                    
        self._idle_task = asyncio.create_task(idle_loop())
        
    def stop_idle_monitoring(self):
        """Stop IDLE monitoring."""
        if self._idle_task:
            self._idle_task.cancel()
            self._idle_task = None
            logger.info("IDLE monitoring stopped")
            
    # ========== 邮件操作增强 ==========
    
    def copy_emails(self, email_uids: List[int], target_folder: str, 
                    chunks: int = 100) -> bool:
        """Copy emails to another folder in chunks.
        
        Args:
            email_uids: List of email UIDs to copy
            target_folder: Target folder name
            chunks: Number of emails to process per command
            
        Returns:
            True if successful
        """
        if not self.mailbox:
            return False
            
        try:
            uid_strings = [str(uid) for uid in email_uids]
            self.mailbox.copy(uid_strings, target_folder, chunks=chunks)
            logger.info(f"Copied {len(email_uids)} emails to {target_folder}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to copy emails: {str(e)}")
            return False
            
    def flag_emails(self, email_uids: List[int], flags: List[str], 
                    set_flag: bool = True, chunks: int = 100) -> bool:
        """Flag or unflag emails in chunks.
        
        Args:
            email_uids: List of email UIDs
            flags: List of flags (e.g., ['\\Seen', '\\Flagged'])
            set_flag: True to set flags, False to remove
            chunks: Number of emails to process per command
            
        Returns:
            True if successful
        """
        if not self.mailbox:
            return False
            
        try:
            uid_strings = [str(uid) for uid in email_uids]
            self.mailbox.flag(uid_strings, flags, set_flag, chunks=chunks)
            action = "Set" if set_flag else "Removed"
            logger.info(f"{action} flags {flags} for {len(email_uids)} emails")
            return True
            
        except Exception as e:
            logger.error(f"Failed to flag emails: {str(e)}")
            return False
            
    def delete_emails(self, email_uids: List[int], expunge: bool = True,
                     chunks: int = 100) -> bool:
        """Delete emails in chunks.
        
        Args:
            email_uids: List of email UIDs to delete
            expunge: Whether to expunge immediately
            chunks: Number of emails to process per command
            
        Returns:
            True if successful
        """
        if not self.mailbox:
            return False
            
        try:
            uid_strings = [str(uid) for uid in email_uids]
            self.mailbox.delete(uid_strings, chunks=chunks)
            
            if expunge:
                self.mailbox.expunge()
                
            logger.info(f"Deleted {len(email_uids)} emails")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete emails: {str(e)}")
            return False
            
    # ========== 错误处理和重试机制 ==========
    
    def robust_search(self, criteria, max_retries: int = 3) -> List[int]:
        """Robust search with retry and fallback.
        
        Args:
            criteria: Search criteria
            max_retries: Maximum retry attempts
            
        Returns:
            List of email UIDs
        """
        for attempt in range(max_retries):
            try:
                return list(self.mailbox.uids(criteria, charset='UTF-8'))
                
            except Exception as e:
                logger.warning(f"Search attempt {attempt + 1} failed: {str(e)}")
                
                if attempt < max_retries - 1:
                    # 简化搜索条件
                    if hasattr(criteria, '_make_simple'):
                        criteria = criteria._make_simple()
                    else:
                        # 降级到基础搜索
                        criteria = 'ALL'
                        
                    # 指数退避
                    import time
                    time.sleep(2 ** attempt)
                else:
                    # 最终返回空结果
                    logger.error("All search attempts failed")
                    return []
                    
        return []
        
    # ========== 性能监控 ==========
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics."""
        if not self.mailbox:
            return {}
            
        return {
            'host': self.host,
            'port': self.port,
            'username': self._username,
            'connected': bool(self.mailbox),
            'timeout': self.timeout,
            'ssl': self.use_ssl
        }