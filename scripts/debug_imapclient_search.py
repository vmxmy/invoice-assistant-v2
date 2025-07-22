#!/usr/bin/env python3
"""
调试 imapclient 的 search 参数传递
直接使用 QQ 邮箱测试各种搜索条件
"""

import sys
import os
from datetime import datetime, timedelta
from imapclient import IMAPClient
import logging

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# QQ邮箱配置
EMAIL = "vmxmy@qq.com"
PASSWORD = "mbdmtckkasewbjab"
IMAP_HOST = "imap.qq.com"
IMAP_PORT = 993

def test_basic_search():
    """测试基本搜索功能"""
    logger.info("=" * 80)
    logger.info("开始测试 imapclient 搜索功能")
    logger.info("=" * 80)
    
    try:
        # 创建客户端
        logger.info(f"连接到 {IMAP_HOST}:{IMAP_PORT}")
        client = IMAPClient(IMAP_HOST, port=IMAP_PORT, use_uid=True, ssl=True)
        
        # 登录
        logger.info(f"登录邮箱: {EMAIL}")
        client.login(EMAIL, PASSWORD)
        logger.info("登录成功")
        
        # 选择收件箱
        logger.info("选择 INBOX 文件夹")
        client.select_folder('INBOX')
        
        # 测试1: 获取所有邮件
        logger.info("\n测试1: 搜索所有邮件")
        all_messages = client.search(['ALL'])
        logger.info(f"找到 {len(all_messages)} 封邮件")
        
        # 测试2: 日期范围搜索
        logger.info("\n测试2: 搜索最近7天的邮件")
        date_7_days_ago = (datetime.now() - timedelta(days=7)).date()
        date_criteria = ['SINCE', date_7_days_ago]
        logger.info(f"搜索条件: {date_criteria}")
        recent_messages = client.search(date_criteria)
        logger.info(f"找到 {len(recent_messages)} 封邮件")
        
        # 测试3: 组合日期范围
        logger.info("\n测试3: 搜索特定日期范围的邮件")
        date_from = (datetime.now() - timedelta(days=30)).date()
        date_to = (datetime.now() - timedelta(days=1)).date()
        date_range_criteria = ['SINCE', date_from, 'BEFORE', date_to]
        logger.info(f"搜索条件: {date_range_criteria}")
        date_range_messages = client.search(date_range_criteria)
        logger.info(f"找到 {len(date_range_messages)} 封邮件")
        
        # 测试4: 主题关键词搜索（英文）
        logger.info("\n测试4: 搜索主题包含英文关键词的邮件")
        subject_criteria = ['SUBJECT', 'invoice']
        logger.info(f"搜索条件: {subject_criteria}")
        subject_messages = client.search(subject_criteria)
        logger.info(f"找到 {len(subject_messages)} 封邮件")
        
        # 测试5: 主题关键词搜索（中文）
        logger.info("\n测试5: 搜索主题包含中文关键词的邮件")
        # 注意：对于中文，需要使用 UTF-8 编码
        chinese_subject = '发票'
        subject_criteria_cn = ['SUBJECT', chinese_subject]
        logger.info(f"搜索条件: {subject_criteria_cn}")
        try:
            subject_messages_cn = client.search(subject_criteria_cn)
            logger.info(f"找到 {len(subject_messages_cn)} 封邮件")
        except Exception as e:
            logger.error(f"中文搜索失败: {e}")
            
            # 尝试使用字符集指定
            logger.info("尝试使用 CHARSET UTF-8")
            try:
                # IMAPClient 应该自动处理 UTF-8
                subject_messages_cn = client.search(['SUBJECT', chinese_subject], charset='UTF-8')
                logger.info(f"找到 {len(subject_messages_cn)} 封邮件")
            except Exception as e2:
                logger.error(f"UTF-8 搜索也失败: {e2}")
        
        # 测试6: 复杂组合搜索
        logger.info("\n测试6: 组合搜索（日期 + 主题）")
        complex_criteria = [
            'SINCE', date_7_days_ago,
            'OR',
            ['SUBJECT', 'invoice'],
            ['SUBJECT', '发票']
        ]
        logger.info(f"搜索条件: {complex_criteria}")
        try:
            complex_messages = client.search(complex_criteria)
            logger.info(f"找到 {len(complex_messages)} 封邮件")
        except Exception as e:
            logger.error(f"复杂搜索失败: {e}")
            
            # 尝试简化的组合
            logger.info("尝试简化的组合搜索")
            simple_complex = ['SINCE', date_7_days_ago]
            complex_messages = client.search(simple_complex)
            logger.info(f"找到 {len(complex_messages)} 封邮件（仅日期过滤）")
        
        # 测试7: 发件人搜索
        logger.info("\n测试7: 搜索特定发件人的邮件")
        from_criteria = ['FROM', 'noreply']
        logger.info(f"搜索条件: {from_criteria}")
        from_messages = client.search(from_criteria)
        logger.info(f"找到 {len(from_messages)} 封邮件")
        
        # 测试8: 未读邮件
        logger.info("\n测试8: 搜索未读邮件")
        unseen_criteria = ['UNSEEN']
        logger.info(f"搜索条件: {unseen_criteria}")
        unseen_messages = client.search(unseen_criteria)
        logger.info(f"找到 {len(unseen_messages)} 封未读邮件")
        
        # 测试9: 有附件的邮件
        logger.info("\n测试9: 搜索有附件的邮件")
        # 注意：IMAP 没有直接的"有附件"搜索条件
        # 通常需要搜索邮件头中的 Content-Type
        logger.info("注意：IMAP 协议没有直接的附件搜索条件")
        
        # 显示前几封邮件的信息
        if all_messages:
            logger.info("\n显示最新的5封邮件信息:")
            sample_ids = sorted(all_messages)[-5:]  # 最新的5封
            
            # 获取邮件信息
            messages_data = client.fetch(sample_ids, ['ENVELOPE', 'FLAGS', 'RFC822.SIZE'])
            
            for msg_id in sample_ids:
                msg_data = messages_data.get(msg_id)
                if msg_data:
                    envelope = msg_data.get(b'ENVELOPE')
                    if envelope:
                        subject = envelope.subject.decode('utf-8') if envelope.subject else '(无主题)'
                        from_addr = envelope.from_[0] if envelope.from_ else None
                        from_email = f"{from_addr.mailbox}@{from_addr.host}" if from_addr else '(未知发件人)'
                        date = envelope.date
                        size = msg_data.get(b'RFC822.SIZE', 0)
                        flags = msg_data.get(b'FLAGS', [])
                        
                        logger.info(f"\n邮件 ID: {msg_id}")
                        logger.info(f"  主题: {subject}")
                        logger.info(f"  发件人: {from_email}")
                        logger.info(f"  日期: {date}")
                        logger.info(f"  大小: {size} bytes")
                        logger.info(f"  标记: {flags}")
        
        # 登出
        client.logout()
        logger.info("\n登出成功")
        
    except Exception as e:
        logger.error(f"测试过程中出错: {e}", exc_info=True)

def test_advanced_search():
    """测试高级搜索功能"""
    logger.info("\n" + "=" * 80)
    logger.info("测试高级搜索功能")
    logger.info("=" * 80)
    
    try:
        # 创建客户端
        client = IMAPClient(IMAP_HOST, port=IMAP_PORT, use_uid=True, ssl=True)
        client.login(EMAIL, PASSWORD)
        client.select_folder('INBOX')
        
        # 测试更复杂的搜索条件
        logger.info("\n测试复杂的 OR 条件")
        
        # 方法1: 使用嵌套列表
        or_criteria_1 = [
            'OR',
            ['SUBJECT', 'invoice'],
            ['SUBJECT', 'receipt']
        ]
        logger.info(f"方法1 - 嵌套列表: {or_criteria_1}")
        try:
            results_1 = client.search(or_criteria_1)
            logger.info(f"找到 {len(results_1)} 封邮件")
        except Exception as e:
            logger.error(f"方法1失败: {e}")
        
        # 方法2: 使用字符串
        or_criteria_2 = 'OR SUBJECT "invoice" SUBJECT "receipt"'
        logger.info(f"\n方法2 - 字符串: {or_criteria_2}")
        try:
            results_2 = client.search(or_criteria_2)
            logger.info(f"找到 {len(results_2)} 封邮件")
        except Exception as e:
            logger.error(f"方法2失败: {e}")
        
        # 测试排除条件
        logger.info("\n测试 NOT 条件")
        not_criteria = ['NOT', 'FROM', 'noreply']
        logger.info(f"搜索条件: {not_criteria}")
        try:
            not_results = client.search(not_criteria)
            logger.info(f"找到 {len(not_results)} 封邮件")
        except Exception as e:
            logger.error(f"NOT 搜索失败: {e}")
        
        client.logout()
        
    except Exception as e:
        logger.error(f"高级测试过程中出错: {e}", exc_info=True)

def test_chinese_search_workaround():
    """测试中文搜索的变通方法"""
    logger.info("\n" + "=" * 80)
    logger.info("测试中文搜索变通方法")
    logger.info("=" * 80)
    
    try:
        # 创建客户端
        client = IMAPClient(IMAP_HOST, port=IMAP_PORT, use_uid=True, ssl=True)
        client.login(EMAIL, PASSWORD)
        client.select_folder('INBOX')
        
        # 获取最近的邮件，然后在客户端过滤
        logger.info("获取最近30天的邮件，然后在客户端过滤中文")
        date_30_days_ago = (datetime.now() - timedelta(days=30)).date()
        recent_messages = client.search(['SINCE', date_30_days_ago])
        logger.info(f"找到 {len(recent_messages)} 封最近的邮件")
        
        if recent_messages:
            # 获取邮件信息
            logger.info("获取邮件信息并过滤...")
            messages_data = client.fetch(recent_messages[:100], ['ENVELOPE'])  # 限制100封
            
            chinese_keywords = ['发票', '账单', '收据']
            matched_count = 0
            
            for msg_id, msg_data in messages_data.items():
                envelope = msg_data.get(b'ENVELOPE')
                if envelope and envelope.subject:
                    try:
                        subject = envelope.subject.decode('utf-8')
                        # 检查是否包含中文关键词
                        if any(keyword in subject for keyword in chinese_keywords):
                            matched_count += 1
                            logger.info(f"匹配邮件: {subject}")
                    except:
                        pass
            
            logger.info(f"客户端过滤后找到 {matched_count} 封包含中文关键词的邮件")
        
        client.logout()
        
    except Exception as e:
        logger.error(f"测试过程中出错: {e}", exc_info=True)

if __name__ == "__main__":
    logger.info("开始 IMAPClient 搜索功能调试")
    logger.info(f"Python 版本: {sys.version}")
    
    # 基本搜索测试
    test_basic_search()
    
    # 高级搜索测试
    test_advanced_search()
    
    # 中文搜索变通方法
    test_chinese_search_workaround()
    
    logger.info("\n测试完成!")