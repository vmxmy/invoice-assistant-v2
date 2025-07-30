#!/usr/bin/env python3
"""
查询2025年所有标题含"发票"的邮件

专门查询整个2025年的发票邮件，提供详细的统计和分析
"""

import sys
from datetime import datetime, date
from email.header import decode_header

# 测试邮箱配置
EMAIL_CONFIG = {
    "host": "imap.qq.com",
    "port": 993,
    "username": "vmxmy@qq.com",
    "password": "lagrezfyfpnobgic"
}

def decode_email_header(header_value):
    """解码邮件头部信息（支持中文）"""
    if not header_value:
        return ""
    try:
        decoded_fragments = decode_header(header_value)
        decoded_string = ""
        for fragment, encoding in decoded_fragments:
            if isinstance(fragment, bytes):
                if encoding:
                    decoded_string += fragment.decode(encoding)
                else:
                    # 尝试常用编码
                    for enc in ['utf-8', 'gb2312', 'gbk', 'big5']:
                        try:
                            decoded_string += fragment.decode(enc)
                            break
                        except:
                            continue
                    else:
                        decoded_string += fragment.decode('utf-8', errors='ignore')
            else:
                decoded_string += str(fragment)
        return decoded_string.strip()
    except Exception as e:
        return str(header_value)

def query_2025_invoices():
    """查询2025年所有发票邮件"""
    print("🔍 查询2025年所有标题含'发票'的邮件")
    print(f"📧 邮箱: {EMAIL_CONFIG['username']}")
    print(f"🕐 查询时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    try:
        from imap_tools import MailBox, AND
        
        with MailBox(EMAIL_CONFIG['host'], EMAIL_CONFIG['port']).login(
            EMAIL_CONFIG['username'], 
            EMAIL_CONFIG['password']
        ) as mailbox:
            print("✅ 邮箱连接成功")
            
            # 设置2025年的搜索范围
            date_from = date(2025, 1, 1)
            date_to = date(2025, 12, 31)
            
            print(f"📅 搜索范围: {date_from} 至 {date_to}")
            print("🔍 正在搜索2025年所有邮件...")
            
            # 获取2025年所有邮件（分批获取以避免超时）
            all_2025_messages = []
            batch_size = 200
            
            # 分月获取以提高效率和可靠性
            for month in range(1, 13):
                try:
                    month_start = date(2025, month, 1)
                    if month == 12:
                        month_end = date(2025, 12, 31)
                    else:
                        next_month = date(2025, month + 1, 1)
                        month_end = date(next_month.year, next_month.month, next_month.day - 1) if next_month.day > 1 else date(2025, month, 28)
                    
                    print(f"   📅 获取 {month:2d}月 邮件 ({month_start} - {month_end})...")
                    
                    month_messages = list(mailbox.fetch(
                        AND(date_gte=month_start, date_lt=month_end), 
                        limit=batch_size,
                        reverse=True
                    ))
                    
                    all_2025_messages.extend(month_messages)
                    print(f"      找到 {len(month_messages)} 封邮件")
                    
                except Exception as e:
                    print(f"      ⚠️  {month}月邮件获取失败: {e}")
                    continue
            
            print(f"\n📊 2025年总邮件数: {len(all_2025_messages)}")
            
            # 本地筛选包含"发票"的邮件
            print("🔍 本地筛选包含'发票'的邮件...")
            
            invoice_messages = []
            invoice_keywords = ["发票", "invoice", "Invoice", "INVOICE"]
            
            for msg in all_2025_messages:
                try:
                    subject = decode_email_header(msg.subject or "")
                    
                    # 检查是否包含发票关键词
                    contains_invoice = False
                    for keyword in invoice_keywords:
                        if keyword in subject:
                            contains_invoice = True
                            break
                    
                    if contains_invoice:
                        invoice_messages.append(msg)
                        
                except Exception as e:
                    print(f"      ⚠️  处理邮件失败: {e}")
                    continue
            
            print(f"✅ 找到 {len(invoice_messages)} 封包含'发票'的邮件")
            
            if not invoice_messages:
                print("📭 2025年暂未发现包含'发票'关键词的邮件")
                return True
            
            # 详细展示所有发票邮件
            print(f"\n📋 2025年发票邮件详细列表:")
            print("=" * 70)
            
            # 按日期排序
            sorted_messages = sorted(invoice_messages, key=lambda x: x.date if x.date else datetime.min, reverse=True)
            
            # 统计变量
            total_pdfs = 0
            monthly_stats = {}
            sender_stats = {}
            
            for i, msg in enumerate(sorted_messages, 1):
                try:
                    subject = decode_email_header(msg.subject or "无主题")
                    sender = msg.from_ or "未知发件人"
                    msg_date = msg.date
                    date_str = msg_date.strftime('%Y-%m-%d %H:%M') if msg_date else "未知日期"
                    
                    print(f"\n📨 第 {i} 封邮件:")
                    print(f"   📅 日期: {date_str}")
                    print(f"   📧 主题: {subject}")
                    print(f"   👤 发件人: {sender}")
                    print(f"   🆔 UID: {msg.uid}")
                    
                    # 统计月份
                    if msg_date:
                        month_key = msg_date.strftime('%Y-%m')
                        monthly_stats[month_key] = monthly_stats.get(month_key, 0) + 1
                    
                    # 统计发件人
                    sender_stats[sender] = sender_stats.get(sender, 0) + 1
                    
                    # 检查PDF附件
                    pdf_attachments = []
                    total_attachments = len(msg.attachments)
                    
                    for att in msg.attachments:
                        filename = decode_email_header(att.filename or "unknown")
                        is_pdf = (
                            filename.lower().endswith('.pdf') or
                            att.content_type == 'application/pdf' or
                            'pdf' in att.content_type.lower()
                        )
                        
                        if is_pdf:
                            pdf_attachments.append(filename)
                            total_pdfs += 1
                    
                    if pdf_attachments:
                        print(f"   📎 PDF附件 ({len(pdf_attachments)}个):")
                        for pdf_name in pdf_attachments:
                            print(f"      - {pdf_name}")
                    else:
                        print(f"   📎 附件: {total_attachments} 个 (无PDF)")
                    
                    # 显示邮件正文预览
                    if msg.text:
                        body_preview = msg.text[:80].replace('\n', ' ').replace('\r', ' ').strip()
                        print(f"   📄 正文预览: {body_preview}...")
                    elif msg.html:
                        # 简单清理HTML标签
                        import re
                        clean_html = re.sub('<[^<]+?>', '', msg.html[:200])
                        body_preview = clean_html[:80].replace('\n', ' ').replace('\r', ' ').strip()
                        print(f"   📄 HTML预览: {body_preview}...")
                    
                except Exception as e:
                    print(f"   ❌ 邮件处理错误: {e}")
                    continue
            
            # 显示统计信息
            print("\n" + "=" * 70)
            print("📊 2025年发票邮件统计分析")
            print("=" * 70)
            
            print(f"📧 发票邮件总数: {len(invoice_messages)} 封")
            print(f"📎 PDF附件总数: {total_pdfs} 个")
            print(f"📈 平均每封邮件PDF数: {total_pdfs/len(invoice_messages):.1f} 个")
            
            # 月份分布统计
            if monthly_stats:
                print(f"\n📅 月份分布:")
                for month in sorted(monthly_stats.keys()):
                    count = monthly_stats[month]
                    percentage = (count / len(invoice_messages)) * 100
                    print(f"   {month}: {count} 封 ({percentage:.1f}%)")
            
            # 发件人统计（显示前5名）
            if sender_stats:
                print(f"\n👤 主要发件人 (Top 5):")
                sorted_senders = sorted(sender_stats.items(), key=lambda x: x[1], reverse=True)[:5]
                for sender, count in sorted_senders:
                    percentage = (count / len(invoice_messages)) * 100
                    print(f"   {sender}: {count} 封 ({percentage:.1f}%)")
            
            # 附件分析
            print(f"\n📎 附件分析:")
            messages_with_pdf = sum(1 for msg in invoice_messages if any(
                att.filename and (att.filename.lower().endswith('.pdf') or 
                att.content_type == 'application/pdf') for att in msg.attachments
            ))
            
            print(f"   含PDF附件的邮件: {messages_with_pdf} 封 ({(messages_with_pdf/len(invoice_messages)*100):.1f}%)")
            print(f"   无PDF附件的邮件: {len(invoice_messages) - messages_with_pdf} 封")
            
            print(f"\n🎉 查询完成！2025年共发现 {len(invoice_messages)} 封发票相关邮件。")
            return True
            
    except ImportError as e:
        print(f"❌ imap-tools库未安装: {e}")
        return False
    except Exception as e:
        print(f"❌ 查询失败: {e}")
        return False

def main():
    """主函数"""
    success = query_2025_invoices()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())