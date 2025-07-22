"""
具有错误恢复能力的邮件服务
集成了重试机制、断路器和错误处理
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, date
from contextlib import asynccontextmanager
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession
from imap_tools import MailBox, AND, OR, NOT, A

from app.models.email_account import EmailAccount
from app.services.email.hybrid_sync_service import HybridEmailSyncService
from app.services.email.retry_handler import (
    with_retry, CircuitBreaker, STANDARD_RETRY, RATE_LIMIT_RETRY,
    EmailServiceError, IMAPConnectionError, classify_error
)
from app.utils.encryption import decrypt_email_password
from app.core.exceptions import ServiceError

logger = logging.getLogger(__name__)


class ResilientEmailService(HybridEmailSyncService):
    """具有错误恢复能力的邮件服务"""
    
    def __init__(self, db: AsyncSession):
        super().__init__(db)
        
        # 为每个账户创建断路器
        self._circuit_breakers = {}
        
        # 错误统计
        self._error_stats = {}
        
        # 连接池（简单实现）
        self._connection_pool = {}
        self._pool_lock = asyncio.Lock()
    
    def _get_circuit_breaker(self, account_id: str) -> CircuitBreaker:
        """获取账户的断路器"""
        if account_id not in self._circuit_breakers:
            self._circuit_breakers[account_id] = CircuitBreaker(
                failure_threshold=3,
                recovery_timeout=300,  # 5分钟
                expected_exception=EmailServiceError
            )
        return self._circuit_breakers[account_id]
    
    def _record_error(self, account_id: str, error: Exception):
        """记录错误统计"""
        if account_id not in self._error_stats:
            self._error_stats[account_id] = {
                'total_errors': 0,
                'error_types': {},
                'last_error_time': None,
                'last_error_message': None
            }
        
        stats = self._error_stats[account_id]
        stats['total_errors'] += 1
        stats['last_error_time'] = datetime.now()
        stats['last_error_message'] = str(error)
        
        error_type = classify_error(error).__name__
        if error_type not in stats['error_types']:
            stats['error_types'][error_type] = 0
        stats['error_types'][error_type] += 1
    
    async def _on_retry(self, error: Exception, attempt: int, delay: float, func_name: str):
        """重试回调"""
        logger.info(
            f"重试 {func_name} (尝试 {attempt}): {type(error).__name__} - {str(error)}. "
            f"等待 {delay:.1f} 秒..."
        )
    
    async def _on_error(self, error: Exception, attempt: int, func_name: str):
        """错误回调"""
        logger.error(
            f"函数 {func_name} 最终失败 (尝试 {attempt} 次): "
            f"{type(error).__name__} - {str(error)}"
        )
    
    @asynccontextmanager
    async def _get_pooled_connection(self, account_id: str):
        """从连接池获取连接"""
        async with self._pool_lock:
            # 检查是否有可用连接
            if account_id in self._connection_pool:
                connection_info = self._connection_pool[account_id]
                if connection_info['expires_at'] > datetime.now():
                    logger.debug(f"使用池中的连接 (账户 {account_id})")
                    yield connection_info['mailbox']
                    return
                else:
                    # 连接已过期，关闭并移除
                    try:
                        connection_info['mailbox'].logout()
                    except:
                        pass
                    del self._connection_pool[account_id]
        
        # 创建新连接
        logger.debug(f"创建新连接 (账户 {account_id})")
        account = await self._get_email_account(account_id)
        password = decrypt_email_password(account.encrypted_password)
        
        mailbox = MailBox(
            host=account.imap_host,
            port=account.imap_port,
            timeout=30
        )
        
        try:
            # 使用重试装饰器连接
            @with_retry(config=STANDARD_RETRY)
            def login():
                mailbox.login(account.email_address, password, initial_folder='INBOX')
            
            login()
            
            # 添加到连接池
            async with self._pool_lock:
                self._connection_pool[account_id] = {
                    'mailbox': mailbox,
                    'expires_at': datetime.now() + timedelta(minutes=10),
                    'created_at': datetime.now()
                }
            
            yield mailbox
            
        except Exception as e:
            # 确保连接被关闭
            try:
                mailbox.logout()
            except:
                pass
            raise
    
    @with_retry(config=STANDARD_RETRY)
    async def sync_account(self, account_id: str, scan_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """同步账户（带重试）"""
        # 检查断路器状态
        circuit_breaker = self._get_circuit_breaker(account_id)
        
        try:
            # 使用断路器执行
            return await circuit_breaker.async_call(
                self._sync_account_impl,
                account_id,
                scan_params
            )
        except Exception as e:
            self._record_error(account_id, e)
            raise
    
    async def _sync_account_impl(self, account_id: str, scan_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """实际的同步实现"""
        logger.info(f"开始同步账户 {account_id} (弹性版本)")
        
        # 使用池化连接
        async with self._get_pooled_connection(account_id) as mailbox:
            # 调用父类的同步逻辑
            # 这里需要适配，因为父类使用的是 context manager
            # 我们需要直接传递 mailbox
            
            sync_state = await self._get_sync_state(account_id)
            if not sync_state:
                sync_state = await self._init_sync_state(account_id)
            
            if sync_state.sync_mode in ['never_synced', 'full_sync_needed']:
                return await self._full_sync_with_mailbox(account_id, sync_state, scan_params, mailbox)
            else:
                return await self._incremental_sync_with_mailbox(account_id, sync_state, scan_params, mailbox)
    
    async def _full_sync_with_mailbox(self, account_id: str, sync_state, scan_params, mailbox):
        """使用已有 mailbox 的全量同步"""
        result = {
            'sync_type': 'full_resilient',
            'total_emails': 0,
            'new_emails': 0,
            'updated_emails': 0,
            'skipped_emails': 0,
            'errors': [],
            'retries': 0
        }
        
        try:
            # 构建搜索条件
            search_criteria = self._build_search_criteria(scan_params)
            
            # 获取所有 UIDs（带重试）
            @with_retry(config=STANDARD_RETRY, on_retry=self._on_retry)
            async def get_uids():
                return list(mailbox.uids(search_criteria, charset='UTF-8'))
            
            all_uids = await get_uids()
            result['total_emails'] = len(all_uids)
            
            logger.info(f"找到 {len(all_uids)} 封邮件")
            
            # 批量处理
            batch_errors = []
            for batch_start in range(0, len(all_uids), self.BATCH_SIZE):
                batch_uids = all_uids[batch_start:batch_start + self.BATCH_SIZE]
                
                try:
                    # 批量获取（带重试）
                    @with_retry(config=QUICK_RETRY)
                    async def fetch_batch():
                        uid_str = ','.join(str(uid) for uid in batch_uids)
                        return list(mailbox.fetch(
                            A(uid=uid_str),
                            mark_seen=False,
                            headers_only=True,
                            bulk=min(len(batch_uids), 50)
                        ))
                    
                    messages = await fetch_batch()
                    
                    # 处理邮件
                    email_batch = []
                    for msg in messages:
                        try:
                            email_info = self._parse_imap_tools_message(msg)
                            email_batch.append(email_info)
                        except Exception as e:
                            logger.warning(f"解析邮件 UID {msg.uid} 失败: {e}")
                            batch_errors.append(f"Parse UID {msg.uid}: {str(e)}")
                    
                    # 批量保存
                    if email_batch:
                        batch_results = await self._save_email_batch(account_id, email_batch)
                        result['new_emails'] += batch_results['new']
                        result['updated_emails'] += batch_results['updated']
                        result['skipped_emails'] += batch_results['skipped']
                    
                except Exception as e:
                    logger.error(f"处理批次 {batch_start}-{batch_start + len(batch_uids)} 失败: {e}")
                    batch_errors.append(f"Batch {batch_start}: {str(e)}")
                    result['retries'] += 1
                    
                    # 如果错误太多，提前终止
                    if len(batch_errors) > 10:
                        logger.error("错误过多，终止同步")
                        break
            
            # 更新同步状态
            if all_uids and (result['new_emails'] > 0 or result['updated_emails'] > 0):
                sync_state.sync_mode = 'incremental'
                sync_state.last_sync_uid = max(int(uid) for uid in all_uids)
                sync_state.last_full_sync_time = datetime.now()
                sync_state.total_emails_indexed = result['new_emails'] + result['updated_emails']
                await self.db.commit()
            
            result['errors'] = batch_errors
            
            logger.info(
                f"全量同步完成（弹性版本）: 新增 {result['new_emails']} 封，"
                f"更新 {result['updated_emails']} 封，错误 {len(batch_errors)} 个"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"全量同步失败: {e}")
            await self._update_sync_mode(account_id, 'full_sync_needed')
            raise
    
    async def _incremental_sync_with_mailbox(self, account_id: str, sync_state, scan_params, mailbox):
        """使用已有 mailbox 的增量同步"""
        result = {
            'sync_type': 'incremental_resilient',
            'recent_emails': 0,
            'new_emails': 0,
            'updated_emails': 0,
            'errors': [],
            'strategies_used': []
        }
        
        try:
            # 使用父类的增量同步逻辑，但增加错误处理
            all_uids = set()
            
            # 策略1：获取新邮件
            if sync_state.last_sync_uid:
                try:
                    new_uids = await self._get_new_emails_by_uid(
                        mailbox, sync_state.last_sync_uid, scan_params
                    )
                    all_uids.update(new_uids)
                    result['strategies_used'].append('UID_RANGE')
                except Exception as e:
                    logger.warning(f"UID 范围策略失败: {e}")
                    result['errors'].append(f"UID strategy: {str(e)}")
            
            # 策略2：获取最近邮件
            try:
                recent_days = 7 if sync_state.last_incremental_sync_time else 30
                recent_uids = await self._get_recent_emails(
                    mailbox, recent_days, scan_params
                )
                all_uids.update(recent_uids)
                result['strategies_used'].append(f'RECENT_{recent_days}_DAYS')
            except Exception as e:
                logger.warning(f"最近邮件策略失败: {e}")
                result['errors'].append(f"Recent strategy: {str(e)}")
            
            # 处理找到的邮件
            if all_uids:
                all_uids = sorted(list(all_uids), reverse=True)
                
                # 批量处理（带错误恢复）
                for batch_start in range(0, len(all_uids), self.BATCH_SIZE):
                    batch_uids = all_uids[batch_start:batch_start + self.BATCH_SIZE]
                    
                    try:
                        uid_str = ','.join(str(uid) for uid in batch_uids)
                        messages = mailbox.fetch(
                            A(uid=uid_str),
                            mark_seen=False,
                            headers_only=True,
                            bulk=True
                        )
                        
                        email_batch = []
                        for msg in messages:
                            try:
                                email_info = self._parse_imap_tools_message(msg)
                                email_batch.append(email_info)
                            except Exception as e:
                                logger.warning(f"解析邮件失败: {e}")
                        
                        if email_batch:
                            batch_results = await self._save_email_batch(account_id, email_batch)
                            result['new_emails'] += batch_results['new']
                            result['updated_emails'] += batch_results['updated']
                        
                    except Exception as e:
                        logger.error(f"处理批次失败: {e}")
                        result['errors'].append(f"Batch error: {str(e)}")
                
                # 更新同步状态
                if result['new_emails'] > 0 or result['updated_emails'] > 0:
                    sync_state.last_sync_uid = max(all_uids)
                    sync_state.last_incremental_sync_time = datetime.now()
                    sync_state.total_emails_indexed += result['new_emails']
                    await self.db.commit()
            
            logger.info(
                f"增量同步完成（弹性版本）: 新增 {result['new_emails']} 封，"
                f"更新 {result['updated_emails']} 封，策略: {', '.join(result['strategies_used'])}"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"增量同步失败: {e}")
            raise
    
    async def get_error_statistics(self, account_id: Optional[str] = None) -> Dict[str, Any]:
        """获取错误统计信息"""
        if account_id:
            return self._error_stats.get(account_id, {})
        return self._error_stats
    
    async def reset_circuit_breaker(self, account_id: str):
        """重置断路器"""
        if account_id in self._circuit_breakers:
            self._circuit_breakers[account_id].reset()
            logger.info(f"重置账户 {account_id} 的断路器")
    
    async def clear_connection_pool(self):
        """清空连接池"""
        async with self._pool_lock:
            for conn_info in self._connection_pool.values():
                try:
                    conn_info['mailbox'].logout()
                except:
                    pass
            self._connection_pool.clear()
            logger.info("清空连接池")
    
    async def health_check(self, account_id: str) -> Dict[str, Any]:
        """健康检查"""
        result = {
            'account_id': account_id,
            'status': 'unknown',
            'circuit_breaker_state': 'unknown',
            'error_count': 0,
            'last_error': None,
            'connection_test': False
        }
        
        # 检查断路器状态
        if account_id in self._circuit_breakers:
            result['circuit_breaker_state'] = self._circuit_breakers[account_id].state
        
        # 检查错误统计
        if account_id in self._error_stats:
            stats = self._error_stats[account_id]
            result['error_count'] = stats['total_errors']
            result['last_error'] = stats['last_error_message']
        
        # 测试连接
        try:
            async with self._get_pooled_connection(account_id) as mailbox:
                # 简单测试：获取文件夹列表
                folders = list(mailbox.folder.list())
                result['connection_test'] = True
                result['folder_count'] = len(folders)
                result['status'] = 'healthy'
        except Exception as e:
            result['connection_test'] = False
            result['connection_error'] = str(e)
            result['status'] = 'unhealthy'
        
        return result


# 预定义的重试配置
QUICK_RETRY = RetryConfig(
    max_attempts=2,
    initial_delay=0.5,
    max_delay=5.0
)