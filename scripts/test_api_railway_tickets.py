#!/usr/bin/env python3
"""
测试API处理火车票功能
"""

import requests
import json
from pathlib import Path

def get_supabase_token():
    """获取Supabase认证令牌"""
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    
    from supabase import create_client
    
    # Supabase配置
    url = 'https://kuvezqgwwtrwfcijpnlj.supabase.co'
    key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1dmV6cWd3d3Ryd2ZjaWpwbmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NzMwNzQsImV4cCI6MjA1MTU0OTA3NH0.iHSUQeJSsKVQ84Ef0f_XaKAy-1xSIgVVqYwuB3fmk7g'
    
    # 创建客户端并登录
    supabase = create_client(url, key)
    response = supabase.auth.sign_in_with_password({
        'email': 'blueyang@gmail.com',
        'password': 'Xumy8!75'
    })
    
    if response.user:
        return response.session.access_token
    else:
        raise Exception("登录失败")

def test_api_railway_processing():
    """测试API处理火车票"""
    
    # 获取认证令牌
    try:
        token = get_supabase_token()
        print(f"✅ 成功获取认证令牌")
    except Exception as e:
        print(f"❌ 获取认证令牌失败: {e}")
        return
    
    # 测试文件
    test_files = [
        {
            "file": 1,
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-186.50-25959165876000012546.pdf",
            "expected": {"departure": "普宁站", "arrival": "广州南站", "train": "G3743"}
        },
        {
            "file": 2, 
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局厦门市税务局-123.00-25949134178000153214.pdf",
            "expected": {"departure": "厦门北站", "arrival": "普宁站", "train": "G3743"}
        },
        {
            "file": 3,
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-35.50-25359134169000052039.pdf", 
            "expected": {"departure": "泉州站", "arrival": "厦门站", "train": "D6291"}
        }
    ]
    
    # API端点
    api_url = "http://localhost:8090/api/v1/files/upload-invoice"
    
    print(f"\n🚄 测试API处理火车票")
    print("=" * 80)
    
    for test_file in test_files:
        file_path = test_file["path"]
        expected = test_file["expected"]
        
        if not Path(file_path).exists():
            print(f"❌ 文件{test_file['file']}: 文件不存在")
            continue
            
        print(f"\n📄 文件{test_file['file']}: {Path(file_path).name}")
        print(f"🚄 预期: {expected['departure']} → {expected['arrival']} ({expected['train']})")
        
        try:
            # 准备文件上传
            with open(file_path, 'rb') as f:
                files = {'file': (Path(file_path).name, f, 'application/pdf')}
                headers = {
                    'Authorization': f'Bearer {token}'
                }
                
                # 发送请求
                response = requests.post(api_url, files=files, headers=headers, timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ API响应成功")
                    
                    # 提取关键信息
                    if 'data' in result and 'ocr_result' in result['data']:
                        ocr_result = result['data']['ocr_result']
                        structured_data = ocr_result.get('structured_data', {})
                        raw_data = ocr_result.get('raw_data', {})
                        
                        # 显示提取的信息
                        departure_station = raw_data.get('departure_station')
                        arrival_station = raw_data.get('arrival_station') 
                        train_number = raw_data.get('train_number')
                        departure_date = raw_data.get('departure_date')
                        departure_time = raw_data.get('departure_time')
                        amount = raw_data.get('amount')
                        buyer_name = raw_data.get('buyer_name')
                        
                        print(f"📊 API提取结果:")
                        print(f"   出发站: {departure_station}")
                        print(f"   到达站: {arrival_station}")
                        print(f"   车次: {train_number}")
                        print(f"   发车日期: {departure_date}")
                        print(f"   发车时间: {departure_time}")
                        print(f"   票价: {amount}")
                        print(f"   购买方: {buyer_name}")
                        
                        # 检查站点是否正确
                        stations_correct = (departure_station == expected['departure'] and 
                                          arrival_station == expected['arrival'])
                        train_correct = train_number == expected['train']
                        
                        if stations_correct and train_correct:
                            print(f"✅ 所有信息提取正确!")
                        else:
                            print(f"❌ 提取错误:")
                            if not stations_correct:
                                print(f"   站点错误: 应该是 {expected['departure']} → {expected['arrival']}")
                            if not train_correct:
                                print(f"   车次错误: 应该是 {expected['train']}")
                    else:
                        print(f"❌ API响应格式错误，缺少OCR结果")
                        print(f"响应内容: {json.dumps(result, indent=2, ensure_ascii=False)}")
                        
                else:
                    print(f"❌ API请求失败: {response.status_code}")
                    print(f"错误信息: {response.text}")
                    
        except Exception as e:
            print(f"❌ 处理文件{test_file['file']}时出错: {e}")
    
    print(f"\n" + "=" * 80)
    print("🎯 API测试完成")

if __name__ == "__main__":
    test_api_railway_processing()