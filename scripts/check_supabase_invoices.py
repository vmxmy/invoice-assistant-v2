#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
检查Supabase数据库中的发票信息
"""

import json
from supabase import create_client

# Supabase配置
SUPABASE_URL = 'https://sfenhhtvcyslxplvewmt.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'

def check_invoices_in_supabase():
    """检查Supabase中的发票数据"""
    try:
        # 创建Supabase客户端
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        print('🔍 === 检查Supabase数据库中的发票信息 ===')
        
        # 1. 获取用户信息
        print('\n1. 获取用户信息...')
        try:
            email = 'blueyang@gmail.com'
            password = 'Xumy8' + '!' + '75'
            
            auth_response = supabase.auth.sign_in_with_password({
                'email': email,
                'password': password
            })
            
            if auth_response.session:
                user_id = auth_response.user.id
                print(f'✅ 登录成功 - 用户ID: {user_id}')
            else:
                print('❌ 登录失败')
                return
        except Exception as e:
            print(f'❌ 登录异常: {e}')
            return
        
        # 2. 查询发票总数
        print('\n2. 查询发票总数...')
        try:
            # 查询所有发票
            response = supabase.table('invoices').select('id').execute()
            total_invoices = len(response.data)
            print(f'📄 数据库中总发票数: {total_invoices}')
            
            # 查询当前用户的发票
            user_response = supabase.table('invoices').select('id').eq('user_id', user_id).execute()
            user_invoices = len(user_response.data)
            print(f'👤 当前用户发票数: {user_invoices}')
            
        except Exception as e:
            print(f'❌ 查询发票总数失败: {e}')
            return
        
        # 3. 查询最近的发票详情
        print('\n3. 查询最近的发票详情...')
        try:
            # 获取最近的10个发票
            recent_response = supabase.table('invoices')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(10)\
                .execute()
            
            recent_invoices = recent_response.data
            print(f'📋 最近{len(recent_invoices)}个发票:')
            
            for i, invoice in enumerate(recent_invoices, 1):
                print(f'\n📄 {i}. 发票详情:')
                print(f'   🆔 ID: {invoice.get("id")}')
                print(f'   📄 发票号: {invoice.get("invoice_number", "未知")}')
                print(f'   🏢 销售方: {invoice.get("seller_name", "未知")}')
                print(f'   💰 金额: ¥{invoice.get("total_amount", 0)}')
                print(f'   📅 日期: {invoice.get("invoice_date", "未知")}')
                print(f'   📁 状态: {invoice.get("status", "未知")}')
                print(f'   🔄 处理状态: {invoice.get("processing_status", "未知")}')
                print(f'   📂 来源: {invoice.get("source", "未知")}')
                print(f'   📄 文件路径: {invoice.get("file_path", "无")[:50]}...')
                print(f'   💾 文件大小: {invoice.get("file_size", 0)} bytes')
                print(f'   🕐 创建时间: {invoice.get("created_at", "未知")}')
                
                # 检查是否有OCR数据
                extracted_data = invoice.get('extracted_data')
                if extracted_data:
                    print(f'   🤖 OCR数据: 已提取 ({len(str(extracted_data))} 字符)')
                else:
                    print(f'   🤖 OCR数据: 无')
        
        except Exception as e:
            print(f'❌ 查询发票详情失败: {e}')
            return
        
        # 4. 统计分析
        print('\n4. 统计分析...')
        try:
            # 按状态统计
            status_stats = {}
            processing_stats = {}
            source_stats = {}
            
            for invoice in recent_invoices:
                status = invoice.get('status', 'unknown')
                processing_status = invoice.get('processing_status', 'unknown')
                source = invoice.get('source', 'unknown')
                
                status_stats[status] = status_stats.get(status, 0) + 1
                processing_stats[processing_status] = processing_stats.get(processing_status, 0) + 1
                source_stats[source] = source_stats.get(source, 0) + 1
            
            print(f'📊 状态分布 (最近{len(recent_invoices)}个):')
            for status, count in status_stats.items():
                print(f'   {status}: {count}个')
            
            print(f'\n🔄 处理状态分布:')
            for status, count in processing_stats.items():
                print(f'   {status}: {count}个')
            
            print(f'\n📂 来源分布:')
            for source, count in source_stats.items():
                print(f'   {source}: {count}个')
            
            # 金额统计
            amounts = [float(inv.get('total_amount', 0)) for inv in recent_invoices if inv.get('total_amount')]
            if amounts:
                total_amount = sum(amounts)
                avg_amount = total_amount / len(amounts)
                max_amount = max(amounts)
                min_amount = min(amounts)
                
                print(f'\n💰 金额统计 (最近{len(amounts)}个有金额的发票):')
                print(f'   总金额: ¥{total_amount:.2f}')
                print(f'   平均金额: ¥{avg_amount:.2f}')
                print(f'   最高金额: ¥{max_amount:.2f}')
                print(f'   最低金额: ¥{min_amount:.2f}')
            
        except Exception as e:
            print(f'❌ 统计分析失败: {e}')
        
        # 5. 检查今日上传的发票
        print('\n5. 检查今日上传的发票...')
        try:
            from datetime import datetime, timezone, timedelta
            
            # 获取今日开始时间（UTC）
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            today_str = today.isoformat()
            
            today_response = supabase.table('invoices')\
                .select('id, invoice_number, created_at, status, processing_status')\
                .eq('user_id', user_id)\
                .gte('created_at', today_str)\
                .order('created_at', desc=True)\
                .execute()
            
            today_invoices = today_response.data
            print(f'📅 今日上传发票数: {len(today_invoices)}')
            
            if today_invoices:
                print(f'📋 今日发票列表:')
                for i, invoice in enumerate(today_invoices, 1):
                    print(f'   {i}. {invoice.get("invoice_number", "未知")} - {invoice.get("status")} - {invoice.get("created_at")}')
            
        except Exception as e:
            print(f'❌ 查询今日发票失败: {e}')
        
        print('\n🎯 === 检查完成 ===')
        
    except Exception as e:
        print(f'❌ 检查过程出错: {e}')

if __name__ == '__main__':
    check_invoices_in_supabase()