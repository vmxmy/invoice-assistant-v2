#!/usr/bin/env python3
"""
优化版2025年发票邮件查询

采用更高效的查询策略，避免超时问题
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

def query_2025_invoices_optimized():
    """优化版2025年发票邮件查询"""
    print("🚀 查询2025年所有标题含'发票'的邮件 (优化版)")
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
            
            # 采用分阶段查询策略
            all_invoice_messages = []
            
            # 阶段1: 查询最近3个月（最有可能含发票）
            print("\n🔍 阶段1: 查询最近3个月的邮件...")
            recent_date = date.today() - timedelta(days=90)
            
            try:
                recent_messages = list(mailbox.fetch(
                    AND(date_gte=recent_date), 
                    limit=200,
                    reverse=True
                ))
                print(f"   获取到 {len(recent_messages)} 封最近3个月的邮件")
                
                # 筛选包含发票的邮件
                for msg in recent_messages:
                    subject = decode_email_header(msg.subject or "")
                    if any(keyword in subject for keyword in ["发票", "invoice", "Invoice"]):
                        all_invoice_messages.append(msg)
                
                print(f"   找到 {len([m for m in all_invoice_messages if m in recent_messages])} 封发票邮件")
                
            except Exception as e:
                print(f"   ⚠️  最近3个月查询失败: {e}")
            
            # 阶段2: 查询2025年1-6月
            print("\n🔍 阶段2: 查询2025年上半年邮件...")
            try:
                first_half_start = date(2025, 1, 1)
                first_half_end = date(2025, 6, 30)
                
                first_half_messages = list(mailbox.fetch(
                    AND(date_gte=first_half_start, date_lt=first_half_end), 
                    limit=300,
                    reverse=True
                ))
                print(f"   获取到 {len(first_half_messages)} 封上半年邮件")
                
                # 筛选发票邮件（避免重复）
                existing_uids = {msg.uid for msg in all_invoice_messages}
                for msg in first_half_messages:
                    if msg.uid not in existing_uids:
                        subject = decode_email_header(msg.subject or "")
                        if any(keyword in subject for keyword in ["发票", "invoice", "Invoice"]):
                            all_invoice_messages.append(msg)
                
                new_count = len(all_invoice_messages) - len([m for m in all_invoice_messages if m in recent_messages])
                print(f"   新发现 {new_count} 封发票邮件")
                
            except Exception as e:
                print(f"   ⚠️  上半年查询失败: {e}")
            
            # 阶段3: 查询2025年7月至今
            print("\n🔍 阶段3: 查询2025年下半年邮件...")
            try:
                second_half_start = date(2025, 7, 1)
                today = date.today()
                
                if second_half_start <= today:
                    second_half_messages = list(mailbox.fetch(
                        AND(date_gte=second_half_start, date_lt=today), 
                        limit=300,
                        reverse=True
                    ))
                    print(f"   获取到 {len(second_half_messages)} 封下半年邮件")
                    
                    # 筛选发票邮件（避免重复）
                    existing_uids = {msg.uid for msg in all_invoice_messages}
                    for msg in second_half_messages:
                        if msg.uid not in existing_uids:
                            subject = decode_email_header(msg.subject or "")
                            if any(keyword in subject for keyword in ["发票", "invoice", "Invoice"]):
                                all_invoice_messages.append(msg)
                    
                    latest_count = len(all_invoice_messages)
                    print(f"   新发现发票邮件，总计 {latest_count} 封")
                else:
                    print("   下半年尚未开始")
                
            except Exception as e:
                print(f"   ⚠️  下半年查询失败: {e}")
            
            print(f"\n✅ 查询完成！2025年共找到 {len(all_invoice_messages)} 封发票邮件")
            
            if not all_invoice_messages:
                print("📭 未发现包含'发票'关键词的邮件")
                return True
            
            # 详细展示所有发票邮件
            print(f"\n📋 2025年发票邮件详细列表:")
            print("=" * 70)
            
            # 按日期排序
            sorted_messages = sorted(all_invoice_messages, key=lambda x: x.date if x.date else datetime.min, reverse=True)
            
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
                        if body_preview:
                            print(f"   📄 正文预览: {body_preview}...")
                    
                except Exception as e:
                    print(f"   ❌ 邮件处理错误: {e}")
                    continue
            
            # 显示统计信息
            print("\n" + "=" * 70)
            print("📊 2025年发票邮件统计分析")
            print("=" * 70)
            
            print(f"📧 发票邮件总数: {len(all_invoice_messages)} 封")
            print(f"📎 PDF附件总数: {total_pdfs} 个")
            if len(all_invoice_messages) > 0:
                print(f"📈 平均每封邮件PDF数: {total_pdfs/len(all_invoice_messages):.1f} 个")
            
            # 月份分布统计
            if monthly_stats:
                print(f"\n📅 月份分布:")
                for month in sorted(monthly_stats.keys()):
                    count = monthly_stats[month]
                    percentage = (count / len(all_invoice_messages)) * 100
                    print(f"   {month}: {count} 封 ({percentage:.1f}%)")
            
            # 发件人统计（显示前5名）
            if sender_stats:
                print(f"\n👤 主要发件人 (Top 5):")
                sorted_senders = sorted(sender_stats.items(), key=lambda x: x[1], reverse=True)[:5]
                for sender, count in sorted_senders:
                    percentage = (count / len(all_invoice_messages)) * 100
                    print(f"   {sender}: {count} 封 ({percentage:.1f}%)")
            
            # 附件分析
            print(f"\n📎 附件分析:")
            messages_with_pdf = sum(1 for msg in all_invoice_messages if any(
                att.filename and (att.filename.lower().endswith('.pdf') or 
                att.content_type == 'application/pdf') for att in msg.attachments
            ))
            
            if len(all_invoice_messages) > 0:
                print(f"   含PDF附件的邮件: {messages_with_pdf} 封 ({(messages_with_pdf/len(all_invoice_messages)*100):.1f}%)")
                print(f"   无PDF附件的邮件: {len(all_invoice_messages) - messages_with_pdf} 封")
            
            print(f"\n🎉 查询完成！2025年共发现 {len(all_invoice_messages)} 封发票相关邮件。")
            return True
            
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
    success = query_2025_invoices_optimized()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())