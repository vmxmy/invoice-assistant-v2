"""
邮件PDF提取服务
从邮件附件或正文链接中提取PDF文件
"""
import re
import logging
from typing import List, Dict, Optional, Any
from contextlib import asynccontextmanager
import httpx
import asyncio

from app.models.email_account import EmailAccount
from app.utils.encryption import decrypt_email_password
from app.core.exceptions import ServiceError
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# 导入imap-tools
try:
    from imap_tools import MailBox, AND, OR, NOT
    logger.info("成功导入 imap-tools 库")
except ImportError as e:
    MailBox = None
    logger.error(f"导入 imap-tools 库失败: {e}")


class EmailPDFExtractor:
    """邮件PDF提取服务"""
    
    def __init__(self, db: AsyncSession, user_id: Optional[str] = None):
        self.db = db
        self.user_id = user_id
        self.download_semaphore = asyncio.Semaphore(3)  # 限制并发下载数
        
    async def extract_pdfs_from_email(self, email_account_id: str, email_uid: int) -> List[Dict[str, Any]]:
        """从邮件中提取所有PDF
        
        Args:
            email_account_id: 邮箱账户ID
            email_uid: 邮件UID
            
        Returns:
            PDF列表，每个PDF包含source、name/url、data等信息
        """
        pdfs = []
        
        try:
            # 获取邮件详情（包括附件和正文）
            email_data = await self._fetch_email_data(email_account_id, email_uid)
            
            # 验证获取的邮件确实匹配目标UID
            if email_data.get('uid') != email_uid:
                logger.error(f"邮件UID验证失败！期望UID: {email_uid}, 实际UID: {email_data.get('uid')}")
                raise ServiceError(f"邮件UID不匹配: 期望 {email_uid}, 实际 {email_data.get('uid')}")
            
            # 记录邮件基本信息用于调试
            logger.info(f"开始处理邮件 UID {email_uid}: {email_data.get('subject', '无主题')}")
            
            # 1. 提取附件中的PDF
            pdf_attachments = await self._extract_pdf_attachments(email_data)
            pdfs.extend(pdf_attachments)
            
            # 2. 如果没有PDF附件，检查邮件正文中的链接
            if not pdfs:
                pdf_links = await self._extract_pdf_from_body(email_data)
                pdfs.extend(pdf_links)
                
            logger.info(f"从邮件 UID {email_uid} 中提取到 {len(pdfs)} 个PDF")
            return pdfs
            
        except Exception as e:
            logger.error(f"提取邮件PDF失败: {e}", exc_info=True)
            raise ServiceError(f"提取邮件PDF失败: {str(e)}")
    
    async def _fetch_email_data(self, email_account_id: str, email_uid: int) -> Dict[str, Any]:
        """获取邮件详情"""
        import time
        start_time = time.time()
        
        logger.info(f"开始获取邮件详情 - UID: {email_uid}, 账户: {email_account_id}")
        
        try:
            async with self._get_imap_client(email_account_id) as mailbox:
                # 通过UID获取邮件
                logger.info(f"已建立IMAP连接，开始搜索邮件 UID: {email_uid}")
                
                # 记录邮箱状态
                try:
                    status_start = time.time()
                    # 获取文件夹状态信息
                    folder_info = mailbox.folder.status('INBOX')
                    logger.info(f"文件夹状态查询耗时: {(time.time() - status_start):.2f}s, 总邮件数: {getattr(folder_info, 'MESSAGES', 'unknown')}")
                except Exception as e:
                    logger.warning(f"获取文件夹状态失败: {e}")
                
                # 修正的UID搜索方式
                messages = []
                
                # 方式1: 使用更可靠的UID搜索方式
                try:
                    search_start = time.time()
                    # 使用原始IMAP命令搜索UID
                    # 注意: imap-tools的UID搜索可能在某些服务器上不可靠
                    # 尝试使用更明确的UID搜索语法
                    uid_str = str(email_uid)
                    messages = list(mailbox.fetch(f'UID {uid_str}', mark_seen=False))
                    search_time = time.time() - search_start
                    
                    # 验证获取的邮件是否匹配目标UID
                    if messages:
                        actual_uid = str(messages[0].uid)
                        if actual_uid != uid_str:
                            logger.error(f"UID不匹配！期望UID: {email_uid}, 实际UID: {actual_uid}, 主题: {messages[0].subject}")
                            messages = []  # 清空结果，触发后续查找
                        else:
                            # 标记搜索方法，用于调试
                            messages[0]._search_method = "raw_uid_command"
                            logger.info(f"成功找到UID {email_uid} 的邮件: {messages[0].subject}, 耗时: {search_time:.2f}s")
                    
                except Exception as e:
                    logger.error(f"UID搜索失败: {e}, 耗时: {(time.time() - search_start):.2f}s")
                
                # 方式2: 如果第一种方式失败，尝试使用imap-tools的AND语法
                if not messages:
                    try:
                        logger.info("尝试使用imap-tools的AND语法搜索...")
                        search2_start = time.time()
                        messages = list(mailbox.fetch(AND(uid=str(email_uid)), mark_seen=False))
                        search2_time = time.time() - search2_start
                        
                        # 验证获取的邮件是否匹配目标UID
                        if messages:
                            actual_uid = str(messages[0].uid)
                            if actual_uid != str(email_uid):
                                logger.error(f"使用AND语法搜索UID不匹配！期望UID: {email_uid}, 实际UID: {actual_uid}, 主题: {messages[0].subject}")
                                messages = []  # 清空结果，触发后续查找
                            else:
                                # 标记搜索方法，用于调试
                                messages[0]._search_method = "and_uid_syntax"
                                logger.info(f"使用AND语法成功找到UID {email_uid} 的邮件: {messages[0].subject}, 耗时: {search2_time:.2f}s")
                    except Exception as e:
                        logger.error(f"使用AND语法搜索UID失败: {e}, 耗时: {(time.time() - search2_start):.2f}s")
                
                # 方式3: 使用遍历查找作为最后的备选方案
                if not messages:
                    try:
                        logger.info("使用遍历查找作为备选方案...")
                        traverse_start = time.time()
                         
                        # 获取所有邮件并精确匹配UID
                        all_messages = list(mailbox.fetch(mark_seen=False))
                        found_msg = None
                        
                        for msg in all_messages:
                            if str(msg.uid) == str(email_uid):
                                found_msg = msg
                                break
                        
                        if found_msg:
                            messages = [found_msg]
                            traverse_time = time.time() - traverse_start
                            logger.info(f"遍历查找成功找到UID {email_uid} 的邮件: {found_msg.subject}, 耗时: {traverse_time:.2f}s")
                        else:
                            logger.warning(f"遍历查找完成，未找到 UID {email_uid}")
                            
                    except Exception as e:
                        logger.error(f"遍历查找失败: {e}")
                
                # 如果还没找到，记录详细调试信息
                if not messages:
                    try:
                        debug_start = time.time()
                        logger.error(f"未找到UID为 {email_uid} 的邮件，列出最近10封邮件的UID:")
                        all_messages = list(mailbox.fetch(limit=10, reverse=True, mark_seen=False))
                        for i, msg in enumerate(all_messages):
                            logger.error(f"  {i+1}. UID: {msg.uid}, 主题: {msg.subject[:50] if msg.subject else 'No subject'}")
                        debug_time = time.time() - debug_start
                        logger.error(f"调试信息收集耗时: {debug_time:.2f}s")
                    except Exception as e:
                        logger.error(f"收集调试信息失败: {e}")
                         
                    raise ServiceError(f"未找到UID为 {email_uid} 的邮件")
                
                msg = messages[0]
                total_time = time.time() - start_time
                
                # 再次验证UID匹配
                if str(msg.uid) != str(email_uid):
                    logger.error(f"最终验证失败！期望UID: {email_uid}, 实际UID: {msg.uid}, 主题: {msg.subject}")
                    # 记录更多调试信息
                    logger.error(f"邮件详情: 发件人: {getattr(msg, 'from_', 'unknown')}, 日期: {getattr(msg, 'date', 'unknown')}")
                    logger.error(f"搜索方法: {getattr(msg, '_search_method', '未知搜索方法')}")
                    
                    # 尝试获取邮箱状态信息
                    try:
                        folder_status = mailbox.folder.status('INBOX')
                        logger.error(f"邮箱状态: {folder_status}")
                    except Exception as e:
                        logger.error(f"获取邮箱状态失败: {e}")
                    
                    raise ServiceError(f"邮件UID验证失败: 期望 {email_uid}, 实际 {msg.uid}, 主题: {msg.subject}")
                
                logger.info(f"成功获取邮件 UID {email_uid}: {msg.subject}, 总耗时: {total_time:.2f}s, 附件数量: {len(msg.attachments)}")
                
                return {
                    'uid': int(msg.uid),  # 确保返回正确的UID
                    'subject': msg.subject or '',
                    'text_body': msg.text or '',
                    'html_body': msg.html or '',
                    'attachments': msg.attachments
                }
                
        except Exception as e:
            total_time = time.time() - start_time
            logger.error(f"获取邮件详情失败 - UID: {email_uid}, 总耗时: {total_time:.2f}s, 错误: {e}")
            raise
    
    async def _extract_pdf_attachments(self, email_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """提取附件中的PDF"""
        pdfs = []
        
        for att in email_data.get('attachments', []):
            if att.filename and att.filename.lower().endswith('.pdf'):
                pdfs.append({
                    'source': 'attachment',
                    'name': att.filename,
                    'data': att.payload,  # 附件内容
                    'size': len(att.payload) if att.payload else 0
                })
                logger.info(f"找到PDF附件: {att.filename}")
                
        return pdfs
    
    async def _extract_pdf_from_body(self, email_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """从邮件正文中提取PDF链接并下载"""
        pdfs = []
        
        # 合并文本和HTML正文
        body_content = email_data.get('text_body', '') + '\n' + email_data.get('html_body', '')
        
        # 提取PDF链接
        pdf_urls = self._extract_pdf_urls(body_content)
        
        # 并发下载PDF
        download_tasks = []
        for url in pdf_urls:
            download_tasks.append(self._download_pdf_with_limit(url))
            
        download_results = await asyncio.gather(*download_tasks, return_exceptions=True)
        
        # 处理下载结果
        for url, result in zip(pdf_urls, download_results):
            if isinstance(result, Exception):
                logger.error(f"下载PDF失败 {url}: {result}")
                continue
                
            if result:
                pdfs.append({
                    'source': 'body_link',
                    'url': url,
                    'name': self._extract_filename_from_url(url),
                    'data': result,
                    'size': len(result)
                })
                logger.info(f"成功下载PDF: {url}")
                
        return pdfs
    
    def _extract_pdf_urls(self, body: str) -> List[str]:
        """从邮件正文提取PDF链接"""
        pdf_urls = []
        
        # 1. 直接PDF链接
        direct_pdf_pattern = r'https?://[^\s<>"\']+\.pdf(?:\?[^\s<>"\']*)?'
        direct_matches = re.findall(direct_pdf_pattern, body, re.IGNORECASE)
        pdf_urls.extend(direct_matches)
        
        # 2. 可能包含PDF的下载链接
        download_patterns = [
            # 百度网盘
            r'https?://pan\.baidu\.com/s/[^\s<>"\']+',
            # 微云
            r'https?://share\.weiyun\.com/[^\s<>"\']+',
            # 通用下载链接
            r'https?://[^\s<>"\']+/download/[^\s<>"\']*',
            r'https?://[^\s<>"\']+\?.*download[^\s<>"\']*',
        ]
        
        for pattern in download_patterns:
            matches = re.findall(pattern, body, re.IGNORECASE)
            # 过滤重复的URL
            for url in matches:
                if url not in pdf_urls:
                    pdf_urls.append(url)
                    
        logger.info(f"从邮件正文中找到 {len(pdf_urls)} 个潜在PDF链接")
        return pdf_urls[:10]  # 限制最多处理10个链接
    
    async def _download_pdf_with_limit(self, url: str) -> Optional[bytes]:
        """限流下载PDF"""
        async with self.download_semaphore:
            return await self._download_pdf_from_url(url)
    
    async def _download_pdf_from_url(self, url: str, max_retries: int = 3) -> Optional[bytes]:
        """从URL下载PDF，支持重试"""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                    response = await client.get(url, headers=headers)
                    
                    if response.status_code == 200:
                        content_type = response.headers.get('content-type', '').lower()
                        
                        # 检查是否为PDF
                        if 'pdf' in content_type or url.lower().endswith('.pdf'):
                            # 检查文件大小（最大20MB）
                            content_length = int(response.headers.get('content-length', 0))
                            if content_length > 20 * 1024 * 1024:
                                logger.warning(f"PDF文件过大，跳过下载: {url} ({content_length} bytes)")
                                return None
                                
                            return response.content
                        else:
                            logger.warning(f"URL不是PDF文件: {url}, Content-Type: {content_type}")
                            return None
                    else:
                        logger.warning(f"下载失败，状态码: {response.status_code}, URL: {url}")
                        
            except Exception as e:
                logger.error(f"下载PDF失败 (尝试 {attempt + 1}/{max_retries}): {url}, 错误: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # 指数退避
                    
        return None
    
    def _extract_filename_from_url(self, url: str) -> str:
        """从URL中提取文件名"""
        # 移除查询参数
        url_without_query = url.split('?')[0]
        # 获取最后一部分作为文件名
        filename = url_without_query.split('/')[-1]
        
        # 如果没有.pdf后缀，添加它
        if not filename.lower().endswith('.pdf'):
            filename = f"{filename}.pdf"
            
        # 确保文件名合法
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        
        return filename or 'downloaded.pdf'
    
    async def _get_account_info(self, account_id: str):
        """获取邮箱账户信息（提前获取，避免长时间占用数据库连接）"""
        from app.services.email_account_service import EmailAccountService
        account = await EmailAccountService.get_email_account(self.db, account_id, self.user_id)
        
        # 提取需要的信息
        return {
            'email_address': account.email_address,
            'imap_host': account.imap_host,
            'imap_port': account.imap_port,
            'password': decrypt_email_password(account.encrypted_password)
        }
    
    @asynccontextmanager
    async def _get_imap_client(self, account_id: str):
        """获取IMAP客户端上下文管理器"""
        if not MailBox:
            raise ServiceError("imap-tools 库未安装")
        
        # 先获取账户信息（这会释放数据库连接）
        account_info = await self._get_account_info(account_id)
        
        # 创建IMAP客户端
        mailbox = None
        try:
            mailbox = MailBox(
                host=account_info['imap_host'],
                port=account_info['imap_port'],
                timeout=30
            )
            mailbox.login(account_info['email_address'], account_info['password'], initial_folder='INBOX')
            
            yield mailbox
            
        finally:
            if mailbox:
                try:
                    mailbox.logout()
                except Exception as e:
                    logger.error(f"关闭IMAP连接失败: {e}")