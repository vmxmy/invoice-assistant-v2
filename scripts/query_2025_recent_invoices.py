#!/usr/bin/env python3
"""
查询2025年最近几个月的发票邮件

采用高效策略，专注查询最有价值的时间段
"""

import sys
from datetime import datetime, date, timedelta
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
    except Exception:
        return str(header_value)

def query_recent_2025_invoices():
    """查询2025年最近几个月的发票邮件"""
    print("🚀 查询2025年发票邮件 (最近几个月)")
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
            
            # 查询策略：从2025年开始到现在
            search_start = date(2025, 1, 1)
            search_end = date.today()
            
            print(f"📅 搜索范围: {search_start} 至 {search_end}")
            print(f"🔍 正在获取2025年的邮件...")
            
            # 分批次获取避免超时
            all_messages = []
            batch_size = 100
            
            try:
                # 先获取基础邮件列表（限制数量）
                messages_batch = list(mailbox.fetch(
                    AND(date_gte=search_start), 
                    limit=batch_size,
                    reverse=True
                ))
                
                print(f"📧 获取到 {len(messages_batch)} 封2025年邮件（按时间倒序）")
                
                # 本地筛选包含发票关键词的邮件
                print("🔍 本地筛选包含'发票'关键词的邮件...")
                
                invoice_messages = []
                invoice_keywords = ["发票", "invoice", "Invoice", "INVOICE", "电子发票", "发票通知"]
                
                for i, msg in enumerate(messages_batch, 1):
                    try:
                        subject = decode_email_header(msg.subject or "")
                        
                        # 检查是否包含发票关键词
                        contains_invoice = False
                        matched_keyword = ""
                        for keyword in invoice_keywords:
                            if keyword in subject:
                                contains_invoice = True
                                matched_keyword = keyword
                                break
                        
                        if contains_invoice:
                            invoice_messages.append((msg, matched_keyword))
                            
                        # 显示处理进度
                        if i % 20 == 0:
                            print(f"   已处理 {i}/{len(messages_batch)} 封邮件...")
                            
                    except Exception as e:
                        print(f"      ⚠️  处理第{i}封邮件失败: {e}")
                        continue
                
                print(f"✅ 找到 {len(invoice_messages)} 封包含发票关键词的邮件")
                
                if not invoice_messages:
                    print("📭 2025年暂未发现包含'发票'关键词的邮件")
                    print("💡 建议:")
                    print("   1. 检查搜索的时间范围是否正确")
                    print("   2. 尝试使用其他关键词如'收据'、'账单'等")
                    print("   3. 检查邮件是否在其他文件夹中")
                    return True
                
                # 详细展示所有发票邮件
                print(f"\n📋 2025年发票邮件详细列表:")
                print("=" * 70)
                
                # 按日期排序
                sorted_messages = sorted(invoice_messages, key=lambda x: x[0].date if x[0].date else datetime.min, reverse=True)
                
                # 统计变量
                total_pdfs = 0
                monthly_stats = {}
                sender_stats = {}
                keyword_stats = {}
                
                for i, (msg, matched_keyword) in enumerate(sorted_messages, 1):
                    try:
                        subject = decode_email_header(msg.subject or "无主题")
                        sender = msg.from_ or "未知发件人"
                        msg_date = msg.date
                        date_str = msg_date.strftime('%Y-%m-%d %H:%M') if msg_date else "未知日期"
                        
                        print(f"\n📨 第 {i} 封邮件:")
                        print(f"   📅 日期: {date_str}")
                        print(f"   📧 主题: {subject}")
                        print(f"   👤 发件人: {sender}")
                        print(f"   🔑 匹配关键词: {matched_keyword}")
                        print(f"   🆔 UID: {msg.uid}")
                        
                        # 统计月份
                        if msg_date:
                            month_key = msg_date.strftime('%Y-%m')
                            monthly_stats[month_key] = monthly_stats.get(month_key, 0) + 1
                        
                        # 统计发件人
                        sender_stats[sender] = sender_stats.get(sender, 0) + 1
                        
                        # 统计关键词
                        keyword_stats[matched_keyword] = keyword_stats.get(matched_keyword, 0) + 1
                        
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
                                pdf_attachments.append({
                                    'filename': filename,
                                    'size': len(att.payload) if att.payload else 0
                                })
                                total_pdfs += 1
                        
                        if pdf_attachments:
                            print(f"   📎 PDF附件 ({len(pdf_attachments)}个):")
                            for pdf_info in pdf_attachments:
                                size_mb = pdf_info['size'] / (1024 * 1024) if pdf_info['size'] > 0 else 0
                                print(f"      - {pdf_info['filename']} ({size_mb:.1f}MB)")
                        else:
                            print(f"   📎 附件: {total_attachments} 个 (无PDF)")
                        
                        # 显示邮件正文预览
                        if msg.text:
                            body_preview = msg.text[:100].replace('\n', ' ').replace('\r', ' ').strip()
                            if body_preview:
                                print(f"   📄 正文预览: {body_preview}...")
                        
                    except Exception as e:
                        print(f"   ❌ 邮件处理错误: {e}")
                        continue
                
                # 显示统计信息
                print("\n" + "=" * 70)
                print("📊 2025年发票邮件统计分析")
                print("=" * 70)
                
                print(f"📧 发票邮件总数: {len(invoice_messages)} 封")
                print(f"📎 PDF附件总数: {total_pdfs} 个")
                if len(invoice_messages) > 0:
                    print(f"📈 平均每封邮件PDF数: {total_pdfs/len(invoice_messages):.1f} 个")
                
                # 关键词统计
                if keyword_stats:
                    print(f"\n🔑 关键词分布:")
                    for keyword, count in sorted(keyword_stats.items(), key=lambda x: x[1], reverse=True):
                        percentage = (count / len(invoice_messages)) * 100
                        print(f"   '{keyword}': {count} 封 ({percentage:.1f}%)")
                
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
                        # 截断过长的发件人地址
                        display_sender = sender[:50] + "..." if len(sender) > 50 else sender
                        print(f"   {display_sender}: {count} 封 ({percentage:.1f}%)")
                
                # 附件分析
                print(f"\n📎 附件分析:")
                messages_with_pdf = len([msg for msg, _ in invoice_messages if any(
                    att.filename and (att.filename.lower().endswith('.pdf') or 
                    att.content_type == 'application/pdf') for att in msg.attachments
                )])
                
                if len(invoice_messages) > 0:
                    print(f"   含PDF附件的邮件: {messages_with_pdf} 封 ({(messages_with_pdf/len(invoice_messages)*100):.1f}%)")
                    print(f"   无PDF附件的邮件: {len(invoice_messages) - messages_with_pdf} 封")
                
                # 时间分析
                if invoice_messages:
                    dates = [msg.date for msg, _ in invoice_messages if msg.date]
                    if dates:
                        earliest = min(dates)
                        latest = max(dates)
                        print(f"\n📅 时间跨度:")
                        print(f"   最早邮件: {earliest.strftime('%Y-%m-%d %H:%M')}")
                        print(f"   最新邮件: {latest.strftime('%Y-%m-%d %H:%M')}")
                        span_days = (latest - earliest).days
                        print(f"   时间跨度: {span_days} 天")
                
                print(f"\n🎉 查询完成！2025年共发现 {len(invoice_messages)} 封发票相关邮件。")
                return True
                
            except Exception as e:
                print(f"❌ 邮件获取失败: {e}")
                return False
                
    except ImportError as e:
        print(f"❌ imap-tools库未安装: {e}")
        return False
    except Exception as e:
        print(f"❌ 查询失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主函数"""
    success = query_recent_2025_invoices()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())