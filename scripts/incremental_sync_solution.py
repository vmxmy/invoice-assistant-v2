#!/usr/bin/env python3
"""
增量同步解决方案 - 长期优化方案
通过记录和维护邮件UID来实现高效的增量同步
"""
from datetime import datetime
from typing import Dict, List, Set, Optional
import json
import logging

logger = logging.getLogger(__name__)

class IncrementalEmailSync:
    """增量邮件同步管理器"""
    
    def __init__(self, db_session):
        self.db = db_session
        
    async def sync_emails(self, email_account_id: str, imap_client):
        """执行增量同步"""
        # 1. 获取上次同步状态
        sync_state = await self._get_sync_state(email_account_id)
        last_uid = sync_state.get('last_uid', 0)
        known_uids = set(sync_state.get('known_uids', []))
        
        logger.info(f"开始增量同步，上次UID: {last_uid}")
        
        # 2. 获取新邮件
        new_uids = await self._fetch_new_uids(imap_client, last_uid)
        logger.info(f"发现 {len(new_uids)} 封新邮件")
        
        # 3. 处理新邮件
        processed_emails = []
        for uid in new_uids:
            if uid not in known_uids:
                email_data = await self._process_email(imap_client, uid)
                if email_data:
                    processed_emails.append(email_data)
                    known_uids.add(uid)
        
        # 4. 更新同步状态
        if new_uids:
            new_sync_state = {
                'last_uid': max(new_uids),
                'known_uids': list(known_uids)[-10000:],  # 保留最近10000个UID
                'last_sync_time': datetime.now().isoformat()
            }
            await self._update_sync_state(email_account_id, new_sync_state)
        
        return processed_emails
    
    async def _get_sync_state(self, email_account_id: str) -> Dict:
        """获取同步状态"""
        # 从数据库获取同步状态
        # 这里应该查询 email_accounts 表的 metadata 字段
        stmt = """
        SELECT metadata->>'sync_state' as sync_state
        FROM email_accounts
        WHERE id = :account_id
        """
        result = await self.db.execute(stmt, {'account_id': email_account_id})
        row = result.fetchone()
        
        if row and row.sync_state:
            return json.loads(row.sync_state)
        return {}
    
    async def _update_sync_state(self, email_account_id: str, sync_state: Dict):
        """更新同步状态"""
        stmt = """
        UPDATE email_accounts
        SET metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{sync_state}',
            :sync_state::jsonb
        )
        WHERE id = :account_id
        """
        await self.db.execute(stmt, {
            'account_id': email_account_id,
            'sync_state': json.dumps(sync_state)
        })
        await self.db.commit()
    
    async def _fetch_new_uids(self, imap_client, last_uid: int) -> List[int]:
        """获取新邮件的UID列表"""
        try:
            # 使用UID搜索获取大于last_uid的邮件
            if last_uid > 0:
                search_criteria = f'{last_uid+1}:*'
                uids = imap_client.uid_search(search_criteria)
            else:
                # 首次同步，获取所有
                uids = imap_client.uid_search('ALL')
            
            return sorted(uids)
        except Exception as e:
            logger.error(f"获取新邮件UID失败: {e}")
            return []
    
    async def _process_email(self, imap_client, uid: int) -> Optional[Dict]:
        """处理单个邮件"""
        try:
            # 获取邮件数据
            msg_data = imap_client.uid_fetch(uid, ['ENVELOPE', 'BODYSTRUCTURE'])
            
            # 提取邮件信息
            envelope = msg_data[uid].get(b'ENVELOPE')
            if not envelope:
                return None
            
            # 解析邮件信息
            email_info = {
                'uid': uid,
                'subject': envelope.subject.decode('utf-8') if envelope.subject else '',
                'from': envelope.from_[0].mailbox.decode() + '@' + envelope.from_[0].host.decode(),
                'date': envelope.date,
                'message_id': envelope.message_id.decode() if envelope.message_id else ''
            }
            
            return email_info
            
        except Exception as e:
            logger.error(f"处理邮件 UID {uid} 失败: {e}")
            return None


class LocalEmailIndex:
    """本地邮件索引，支持高效的日期和关键词搜索"""
    
    def __init__(self, db_session):
        self.db = db_session
    
    async def index_email(self, email_data: Dict):
        """将邮件信息索引到本地数据库"""
        stmt = """
        INSERT INTO email_index (
            account_id, uid, subject, from_address, 
            email_date, message_id, has_attachments
        ) VALUES (
            :account_id, :uid, :subject, :from_address,
            :email_date, :message_id, :has_attachments
        )
        ON CONFLICT (account_id, uid) DO UPDATE SET
            subject = EXCLUDED.subject,
            email_date = EXCLUDED.email_date
        """
        await self.db.execute(stmt, email_data)
    
    async def search_by_date_range(
        self, 
        account_id: str,
        date_from: datetime,
        date_to: datetime,
        keywords: List[str] = None
    ) -> List[int]:
        """在本地索引中按日期范围搜索"""
        query = """
        SELECT uid FROM email_index
        WHERE account_id = :account_id
        AND email_date >= :date_from
        AND email_date <= :date_to
        """
        
        params = {
            'account_id': account_id,
            'date_from': date_from,
            'date_to': date_to
        }
        
        # 添加关键词过滤
        if keywords:
            keyword_conditions = []
            for i, keyword in enumerate(keywords):
                param_name = f'keyword_{i}'
                keyword_conditions.append(f"subject ILIKE :{param_name}")
                params[param_name] = f'%{keyword}%'
            
            query += f" AND ({' OR '.join(keyword_conditions)})"
        
        query += " ORDER BY email_date DESC"
        
        result = await self.db.execute(query, params)
        return [row.uid for row in result.fetchall()]


# 数据库表结构
CREATE_INDEX_TABLE = """
CREATE TABLE IF NOT EXISTS email_index (
    id SERIAL PRIMARY KEY,
    account_id UUID NOT NULL,
    uid INTEGER NOT NULL,
    subject TEXT,
    from_address TEXT,
    email_date TIMESTAMP WITH TIME ZONE,
    message_id TEXT,
    has_attachments BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(account_id, uid),
    INDEX idx_email_date (account_id, email_date),
    INDEX idx_subject (account_id, subject)
);
"""

if __name__ == "__main__":
    print("增量同步解决方案设计：")
    print("\n1. 数据库结构增强：")
    print("   - email_accounts 表的 metadata 字段存储同步状态")
    print("   - 新建 email_index 表存储邮件索引")
    print("\n2. 同步流程：")
    print("   - 记录每个账户的最后同步UID")
    print("   - 每次只获取新邮件（UID > last_uid）")
    print("   - 本地建立索引支持快速搜索")
    print("\n3. 优势：")
    print("   - 避免重复下载")
    print("   - 支持任意日期范围搜索")
    print("   - 支持中文关键词搜索")
    print("   - 性能大幅提升")