#!/usr/bin/env python3
"""
修正数据库中 extracted_data.structured_data 字段的格式问题

问题：structured_data 存储为字符串格式的 Python 字典，而不是标准的 JSON
解决：解析字符串并转换为标准的 JSON 对象格式
"""

import asyncio
import json
import ast
import re
from supabase import create_client, Client
from typing import Dict, Any, Optional

# Supabase 配置
SUPABASE_URL = "https://sfenhhtvcyslxplvewmt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE"

def safe_eval_dict(dict_string: str) -> Optional[Dict[str, Any]]:
    """
    安全地解析字符串格式的 Python 字典
    """
    if not dict_string or dict_string.strip() == "":
        return None
    
    try:
        # 清理字符串 - 移除 HTML 转义字符（多层转义）
        cleaned_string = dict_string.replace("&amp;", "&").replace("&#39;", "'").replace("&#34;", '"')
        # 处理多层HTML转义
        cleaned_string = re.sub(r'&amp;amp;amp;amp;#39;', "'", cleaned_string)
        cleaned_string = re.sub(r'&amp;amp;amp;amp;#34;', '"', cleaned_string)
        
        # 尝试使用 ast.literal_eval 安全解析
        result = ast.literal_eval(cleaned_string)
        if isinstance(result, dict):
            return result
        else:
            print(f"Warning: 解析结果不是字典类型: {type(result)}")
            return None
            
    except (ValueError, SyntaxError) as e:
        print(f"Error: 无法解析字典字符串: {str(e)[:100]}...")
        print(f"原始字符串前200字符: {dict_string[:200]}...")
        return None

def normalize_train_data(structured_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    标准化火车票数据字段名
    """
    normalized = {}
    
    # 字段映射关系 - 将各种字段名统一为标准名称
    field_mapping = {
        # 火车票号
        'ticketNumber': 'ticket_number',
        'ticket_number': 'ticket_number',
        
        # 车次
        'trainNumber': 'train_number', 
        'train_number': 'train_number',
        
        # 出发站
        'departureStation': 'departure_station',
        'departure_station': 'departure_station',
        
        # 到达站
        'arrivalStation': 'arrival_station',
        'arrival_station': 'arrival_station',
        
        # 座位类型
        'seatType': 'seat_type',
        'seat_type': 'seat_type',
        'seatClass': 'seat_type',
        'seat_class': 'seat_type',
        
        # 座位号
        'seatNumber': 'seat_number',
        'seat_number': 'seat_number',
        
        # 乘客姓名
        'passengerName': 'passenger_name',
        'passenger_name': 'passenger_name',
        
        # 发车时间
        'departureTime': 'departure_time',
        'departure_time': 'departure_time',
        
        # 发车日期
        'departureDate': 'departure_date',
        'departure_date': 'departure_date',
        
        # 到达时间
        'arrivalTime': 'arrival_time',
        'arrival_time': 'arrival_time',
        
        # 票价
        'fare': 'fare',
        'ticket_price': 'fare',
        
        # 电子票号
        'electronicTicketNumber': 'electronic_ticket_number',
        'electronic_ticket_number': 'electronic_ticket_number',
        
        # 购买方信息
        'buyerName': 'buyer_name',
        'buyer_name': 'buyer_name',
        'buyerCreditCode': 'buyer_tax_number',
        'buyer_tax_number': 'buyer_tax_number',
        
        # 发票信息
        'invoiceDate': 'invoice_date',
        'invoice_date': 'invoice_date',
        'invoice_type': 'invoice_type',
        
        # 身份证号
        'id_number': 'id_number',
        'passengerInfo': 'passenger_info',
        'passenger_info': 'passenger_info',
        
        # 其他字段
        'title': 'title',
        'remarks': 'remarks',
        'confidence': 'confidence'
    }
    
    # 应用字段映射
    for old_key, value in structured_data.items():
        if old_key in field_mapping:
            new_key = field_mapping[old_key]
            normalized[new_key] = value
        else:
            # 保留未映射的字段
            normalized[old_key] = value
    
    # 处理特殊格式的时间数据
    if 'departure_time' in normalized:
        departure_time = normalized['departure_time']
        if isinstance(departure_time, str):
            # 解析 "2025年03月25日10:31开" 格式
            time_match = re.search(r'(\d{4})年(\d{2})月(\d{2})日(\d{2}):(\d{2})', departure_time)
            if time_match:
                year, month, day, hour, minute = time_match.groups()
                normalized['departure_date'] = f"{year}-{month}-{day}"
                normalized['departure_time'] = f"{hour}:{minute}"
    
    return normalized

async def fix_structured_data():
    """
    修正所有发票的 structured_data 格式
    """
    # 读取认证token
    try:
        with open('.auth_token', 'r') as f:
            auth_token = f.read().strip()
    except FileNotFoundError:
        print("❌ 未找到认证token文件，请先运行认证脚本")
        return
    
    # 初始化 Supabase 客户端
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 设置认证header
    supabase.auth.set_auth(auth_token)
    
    print("🔍 开始查找需要修正的发票数据...")
    
    # 查询所有火车票和其他可能需要修正的发票
    response = supabase.table('invoices').select('id, extracted_data, invoice_type, invoice_number').is_('deleted_at', None).execute()
    
    print(f"📊 Supabase响应状态: {response}")
    print(f"📊 查询到的记录数: {len(response.data) if response.data else 0}")
    
    if not response.data:
        print("❌ 未找到任何发票数据")
        return
    
    print(f"📋 找到 {len(response.data)} 条发票记录")
    
    fixed_count = 0
    error_count = 0
    
    for invoice in response.data:
        invoice_id = invoice['id']
        extracted_data = invoice.get('extracted_data', {})
        
        if not extracted_data:
            continue
            
        # 检查是否有 structured_data 字段且为字符串或需要修正的格式
        structured_data_str = extracted_data.get('structured_data')
        if not structured_data_str:
            continue
        
        # 检查是否为字符串格式（需要修正）
        if isinstance(structured_data_str, str):
            print(f"📋 发现字符串格式的structured_data: {invoice['invoice_number']}")
        else:
            # 检查是否已经是正确的JSON格式
            print(f"✅ 发票 {invoice['invoice_number']} 的structured_data已是JSON格式，跳过")
            continue
            
        print(f"\n🔧 修正发票 {invoice_id}...")
        
        try:
            # 解析字符串为字典
            structured_dict = safe_eval_dict(structured_data_str)
            
            if not structured_dict:
                print(f"⚠️  无法解析 structured_data: {invoice_id}")
                error_count += 1
                continue
            
            # 标准化火车票数据字段
            if extracted_data.get('ocr_type') == 'train_ticket' or invoice.get('invoice_type') == '火车票':
                structured_dict = normalize_train_data(structured_dict)
                print(f"🚆 标准化火车票数据字段")
            
            # 更新 extracted_data，将解析后的字典直接合并到根级别
            updated_extracted_data = extracted_data.copy()
            
            # 保留原始的 structured_data 作为备份
            updated_extracted_data['structured_data_original'] = structured_data_str
            
            # 将解析后的数据合并到根级别
            updated_extracted_data.update(structured_dict)
            
            # 更新数据库
            update_response = supabase.table('invoices').update({
                'extracted_data': updated_extracted_data
            }).eq('id', invoice_id).execute()
            
            if update_response.data:
                print(f"✅ 成功修正发票 {invoice_id}")
                fixed_count += 1
                
                # 打印关键字段
                key_fields = ['train_number', 'departure_station', 'arrival_station', 'passenger_name']
                for field in key_fields:
                    if field in structured_dict:
                        print(f"   - {field}: {structured_dict[field]}")
            else:
                print(f"❌ 更新失败: {invoice_id}")
                error_count += 1
                
        except Exception as e:
            print(f"❌ 处理发票 {invoice_id} 时出错: {str(e)}")
            error_count += 1
    
    print(f"\n📊 修正完成:")
    print(f"   ✅ 成功修正: {fixed_count} 条")
    print(f"   ❌ 修正失败: {error_count} 条")
    print(f"   📋 总计处理: {fixed_count + error_count} 条")

async def test_fixed_data():
    """
    测试修正后的数据
    """
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("\n🧪 测试修正后的数据...")
    
    # 查询火车票数据
    response = supabase.table('invoices').select(
        'id, invoice_number, extracted_data'
    ).ilike('invoice_type', '%火车%').limit(3).execute()
    
    if response.data:
        for invoice in response.data:
            print(f"\n📋 发票 {invoice['invoice_number']}:")
            extracted_data = invoice.get('extracted_data', {})
            
            # 检查关键字段
            fields_to_check = [
                'train_number', 'departure_station', 'arrival_station', 
                'passenger_name', 'seat_type', 'seat_number', 'departure_time'
            ]
            
            for field in fields_to_check:
                value = extracted_data.get(field, 'N/A')
                print(f"   - {field}: {value}")

if __name__ == "__main__":
    print("🚀 开始修正 structured_data 格式...")
    asyncio.run(fix_structured_data())
    
    print("\n" + "="*50)
    asyncio.run(test_fixed_data())
    
    print("\n🎉 所有操作完成！")