#!/usr/bin/env python3
"""
真实IMAP邮件扫描器
通过IMAP协议连接到真实邮箱服务器扫描邮件
"""

import imaplib
import email
import json
import ssl
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import base64
from cryptography.fernet import Fernet
import os

class RealIMAPScanner:
    def __init__(self):
        self.connection = None
        self.is_connected = False
        
    def decrypt_password(self, encrypted_password: str) -> str:
        """解密邮箱密码"""
        try:
            # 这里需要实现真正的解密逻辑
            # 目前返回测试值，实际使用时需要替换为真实的QQ授权码
            return "your_qq_auth_code_here"  # 替换为真实的QQ邮箱授权码
        except Exception as e:
            raise Exception(f"密码解密失败: {str(e)}")
    
    def connect_imap(self, host: str, port: int, email_addr: str, password: str, use_ssl: bool = True) -> bool:
        """连接到IMAP服务器"""
        try:
            print(f"🔗 正在连接到 {host}:{port}")
            
            if use_ssl:
                # 创建SSL上下文
                context = ssl.create_default_context()
                # 对于QQ邮箱，可能需要降低SSL要求
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE
                
                self.connection = imaplib.IMAP4_SSL(host, port, ssl_context=context)
            else:
                self.connection = imaplib.IMAP4(host, port)
            
            print(f"📧 正在登录 {email_addr}")
            # 登录
            result = self.connection.login(email_addr, password)
            
            if result[0] == 'OK':
                self.is_connected = True
                print(f"✅ IMAP登录成功: {email_addr}")
                return True
            else:
                print(f"❌ IMAP登录失败: {result}")
                return False
                
        except imaplib.IMAP4.error as e:
            print(f"❌ IMAP协议错误: {str(e)}")
            return False
        except Exception as e:
            print(f"❌ IMAP连接失败: {str(e)}")
            return False
    
    def search_emails(self, folder: str = 'INBOX', 
                     keywords: List[str] = None, 
                     date_from: str = None,
                     date_to: str = None,
                     max_emails: int = 100) -> Dict:
        """搜索邮件"""
        if not self.is_connected or not self.connection:
            raise Exception("IMAP未连接")
        
        try:
            # 选择文件夹
            result = self.connection.select(folder)
            if result[0] != 'OK':
                raise Exception(f"无法选择文件夹 {folder}")
            
            print(f"📁 已选择文件夹: {folder}")
            
            # 构建搜索条件
            search_criteria = ['ALL']
            
            # 添加日期范围
            if date_from:
                search_criteria.append(f'SINCE "{date_from}"')
            if date_to:
                search_criteria.append(f'BEFORE "{date_to}"')
            
            # 搜索邮件
            search_string = ' '.join(search_criteria)
            print(f"🔍 搜索条件: {search_string}")
            
            result, data = self.connection.search(None, search_string)
            if result != 'OK':
                raise Exception("邮件搜索失败")
            
            email_ids = data[0].split()
            total_emails = len(email_ids)
            print(f"📊 找到 {total_emails} 封邮件")
            
            # 限制处理数量
            if max_emails and len(email_ids) > max_emails:
                email_ids = email_ids[-max_emails:]  # 获取最新的邮件
            
            matched_emails = []
            
            for email_id in email_ids:
                try:
                    # 获取邮件
                    result, data = self.connection.fetch(email_id, '(RFC822)')
                    if result != 'OK':
                        continue
                    
                    # 解析邮件
                    email_message = email.message_from_bytes(data[0][1])
                    
                    # 获取主题
                    subject = self.decode_mime_words(email_message.get('Subject', ''))
                    
                    # 检查关键词匹配
                    if keywords:
                        subject_lower = subject.lower()
                        keyword_match = any(keyword.lower() in subject_lower or keyword in subject 
                                          for keyword in keywords)
                        if not keyword_match:
                            continue
                    
                    # 获取发件人
                    from_addr = self.decode_mime_words(email_message.get('From', ''))
                    
                    # 获取日期
                    date_str = email_message.get('Date', '')
                    
                    # 检查附件
                    has_attachments = False
                    attachment_names = []
                    
                    for part in email_message.walk():
                        if part.get_content_disposition() == 'attachment':
                            has_attachments = True
                            filename = part.get_filename()
                            if filename:
                                filename = self.decode_mime_words(filename)
                                attachment_names.append(filename)
                    
                    matched_email = {
                        'uid': int(email_id),
                        'subject': subject,
                        'from': from_addr,
                        'date': date_str,
                        'has_attachments': has_attachments,
                        'attachment_names': attachment_names,
                        'headers': {
                            'message-id': email_message.get('Message-ID', ''),
                            'date': date_str
                        }
                    }
                    
                    matched_emails.append(matched_email)
                    print(f"📧 匹配邮件: {subject[:50]}...")
                    
                except Exception as e:
                    print(f"⚠️  处理邮件 {email_id} 时出错: {str(e)}")
                    continue
            
            return {
                'total_emails': total_emails,
                'scanned_emails': len(email_ids),
                'matched_emails': len(matched_emails),
                'downloaded_attachments': sum(len(email['attachment_names']) for email in matched_emails),
                'emails': matched_emails,
                'scan_summary': {
                    'imap_server': self.connection.host if hasattr(self.connection, 'host') else 'unknown',
                    'scan_time': datetime.now().isoformat(),
                    'keywords_used': keywords or [],
                    'folders_scanned': [folder]
                }
            }
            
        except Exception as e:
            print(f"❌ 邮件搜索失败: {str(e)}")
            raise e
    
    def decode_mime_words(self, text: str) -> str:
        """解码MIME编码的文本"""
        if not text:
            return ''
        
        try:
            decoded_parts = email.header.decode_header(text)
            decoded_text = ''
            
            for part, encoding in decoded_parts:
                if isinstance(part, bytes):
                    if encoding:
                        decoded_text += part.decode(encoding)
                    else:
                        decoded_text += part.decode('utf-8', errors='ignore')
                else:
                    decoded_text += part
                    
            return decoded_text
        except Exception as e:
            print(f"⚠️  解码文本失败: {str(e)}")
            return text
    
    def close_connection(self):
        """关闭IMAP连接"""
        if self.connection:
            try:
                self.connection.logout()
                print("🔌 IMAP连接已关闭")
            except Exception as e:
                print(f"⚠️  关闭IMAP连接时出错: {str(e)}")
            finally:
                self.connection = None
                self.is_connected = False

def scan_real_email(email_config: Dict, scan_params: Dict) -> Dict:
    """扫描真实邮箱的主函数"""
    scanner = RealIMAPScanner()
    
    try:
        # 解密密码
        decrypted_password = scanner.decrypt_password(email_config['encrypted_password'])
        
        # 连接IMAP
        success = scanner.connect_imap(
            host=email_config['imap_host'],
            port=email_config['imap_port'],
            email_addr=email_config['email_address'],
            password=decrypted_password,
            use_ssl=email_config.get('imap_use_ssl', True)
        )
        
        if not success:
            raise Exception("IMAP连接失败")
        
        # 搜索邮件
        results = scanner.search_emails(
            folder=scan_params.get('folders', ['INBOX'])[0],
            keywords=scan_params.get('subject_keywords', []),
            date_from=scan_params.get('date_from'),
            date_to=scan_params.get('date_to'),
            max_emails=scan_params.get('max_emails', 100)
        )
        
        return {
            'success': True,
            'results': results
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
    
    finally:
        scanner.close_connection()

if __name__ == "__main__":
    # 测试用例
    test_config = {
        'imap_host': 'imap.qq.com',
        'imap_port': 993,
        'email_address': 'vmxmy@qq.com',
        'encrypted_password': 'test_encrypted_password',
        'imap_use_ssl': True
    }
    
    test_params = {
        'folders': ['INBOX'],
        'subject_keywords': ['发票', '账单', '缴费'],
        'max_emails': 10
    }
    
    result = scan_real_email(test_config, test_params)
    print(json.dumps(result, indent=2, ensure_ascii=False))