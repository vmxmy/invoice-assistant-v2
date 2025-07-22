#!/usr/bin/env python3
"""
修复 QQ IMAP 日期搜索问题的解决方案
"""
import os
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from datetime import datetime, date
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class EnhancedIMAPClient:
    """增强的 IMAP 客户端，支持全量获取和本地过滤"""
    
    def __init__(self, original_client):
        self.client = original_client
        
    def search_emails_with_fallback(
        self, 
        search_criteria: str,
        date_from: date = None,
        date_to: date = None,
        subject_keywords: List[str] = None
    ) -> List[int]:
        """带回退机制的邮件搜索
        
        1. 首先尝试 IMAP 搜索
        2. 如果结果太少或日期范围超过60天，使用全量获取+本地过滤
        """
        # 尝试 IMAP 搜索
        try:
            email_ids = self.client.search_emails(search_criteria)
            
            # 检查是否需要回退到全量获取
            if self._should_use_fallback(date_from, date_to, len(email_ids)):
                logger.info("IMAP搜索结果可能不完整，切换到全量获取模式")
                return self._fetch_all_and_filter(date_from, date_to, subject_keywords)
            
            return email_ids
            
        except Exception as e:
            logger.error(f"IMAP搜索失败: {e}, 使用全量获取")
            return self._fetch_all_and_filter(date_from, date_to, subject_keywords)
    
    def _should_use_fallback(self, date_from: date, date_to: date, result_count: int) -> bool:
        """判断是否需要使用回退机制"""
        if not date_from:
            return False
            
        # 如果搜索范围超过60天，使用回退
        days_diff = (datetime.now().date() - date_from).days
        if days_diff > 60:
            return True
            
        # 如果搜索历史月份返回0，使用回退
        if date_to and date_to < datetime.now().date() and result_count == 0:
            return True
            
        return False
    
    def _fetch_all_and_filter(
        self,
        date_from: date = None,
        date_to: date = None,
        subject_keywords: List[str] = None
    ) -> List[int]:
        """获取所有邮件并在本地过滤"""
        logger.info("开始全量获取邮件...")
        
        # 获取所有邮件ID
        all_email_ids = self.client.search_emails('ALL')
        logger.info(f"共找到 {len(all_email_ids)} 封邮件")
        
        filtered_ids = []
        batch_size = 50  # 分批获取避免超时
        
        for i in range(0, len(all_email_ids), batch_size):
            batch_ids = all_email_ids[i:i+batch_size]
            
            # 获取邮件信息
            for email_id in batch_ids:
                try:
                    msg = self.client.fetch_email(email_id)
                    if not msg:
                        continue
                        
                    email_info = self.client.get_email_info(msg)
                    
                    # 本地日期过滤
                    if not self._check_date_range(email_info, date_from, date_to):
                        continue
                    
                    # 本地主题过滤
                    if not self._check_subject_keywords(email_info, subject_keywords):
                        continue
                    
                    filtered_ids.append(email_id)
                    
                except Exception as e:
                    logger.warning(f"处理邮件 {email_id} 失败: {e}")
        
        logger.info(f"本地过滤后找到 {len(filtered_ids)} 封符合条件的邮件")
        return filtered_ids
    
    def _check_date_range(self, email_info: Dict[str, Any], date_from: date, date_to: date) -> bool:
        """检查邮件日期是否在指定范围内"""
        if not date_from and not date_to:
            return True
            
        try:
            from email.utils import parsedate_to_datetime
            email_date = parsedate_to_datetime(email_info['date'])
            
            if date_from and email_date.date() < date_from:
                return False
            if date_to and email_date.date() > date_to:
                return False
                
            return True
        except:
            return True  # 解析失败时包含该邮件
    
    def _check_subject_keywords(self, email_info: Dict[str, Any], keywords: List[str]) -> bool:
        """检查主题是否包含关键词（支持中文）"""
        if not keywords:
            return True
            
        subject = email_info.get('subject', '').lower()
        
        for keyword in keywords:
            if keyword.lower() in subject:
                return True
                
        return False


# 修改 EmailScannerService 的实现
def patch_email_scanner_service():
    """修补 EmailScannerService 以使用增强的 IMAP 客户端"""
    print("修补方案：")
    print("1. 在 EmailScannerService._scan_account 方法中")
    print("2. 将 IMAPClient 包装为 EnhancedIMAPClient")
    print("3. 使用 search_emails_with_fallback 替代 search_emails")
    print("\n示例代码：")
    print("""
    # 在 _scan_account 方法中
    async with IMAPClient(email_config) as client:
        # 包装为增强客户端
        enhanced_client = EnhancedIMAPClient(client)
        
        # 使用增强的搜索方法
        email_ids = enhanced_client.search_emails_with_fallback(
            search_criteria,
            date_from=scan_params.date_from,
            date_to=scan_params.date_to,
            subject_keywords=scan_params.subject_keywords
        )
    """)


if __name__ == "__main__":
    patch_email_scanner_service()