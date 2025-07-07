#!/usr/bin/env python3
"""
简化的API测试脚本
"""

import requests
import json
from pathlib import Path

def test_api_simple():
    """简化的API测试"""
    
    # 使用MCP获取的认证令牌
    token = "eyJhbGciOiJIUzI1NiIsImtpZCI6IklraUtRYlY5Z3RYMmRNL3ciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NmZW5oaHR2Y3lzbHhwbHZld210LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJiZDlhNjcyMi1hNzgxLTRmMGItODg1Ni1jNmM1ZTI2MWNiZDAiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzUxODMyNTQ5LCJpYXQiOjE3NTE4Mjg5NDksImVtYWlsIjoiYmx1ZXlhbmdAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTE4Mjg5NDl9XSwic2Vzc2lvbl9pZCI6Ijc4NTJmOGIyLTlmMTgtNDk4My1iNDNkLWU4MDBiMDY2ZjI2OSIsImlzX2Fub255bW91cyI6ZmFsc2V9.X3cRZoeGrooR3COkrksabyg4SqyHOtoHwpZKuINeYhU"
    
    # 测试一个文件
    test_file = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局厦门市税务局-123.00-25949134178000153214.pdf"
    
    if not Path(test_file).exists():
        print("❌ 测试文件不存在")
        return
    
    # API端点
    api_url = "http://localhost:8090/api/v1/files/upload-invoice"
    
    print(f"🚄 测试API处理火车票 (文件2)")
    print(f"📄 文件: {Path(test_file).name}")
    print(f"🎯 预期: 厦门北站 → 普宁站 (G3743)")
    print("=" * 60)
    
    try:
        # 准备文件上传
        with open(test_file, 'rb') as f:
            files = {'file': (Path(test_file).name, f, 'application/pdf')}
            headers = {
                'Authorization': f'Bearer {token}'
            }
            
            # 发送请求
            print("📤 发送API请求...")
            response = requests.post(api_url, files=files, headers=headers, timeout=60)
            
            print(f"📥 API响应状态: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ API响应成功")
                
                # 提取OCR结果
                if 'data' in result and 'ocr_result' in result['data']:
                    ocr_result = result['data']['ocr_result']
                    raw_data = ocr_result.get('raw_data', {})
                    
                    print(f"\n📊 提取结果:")
                    print(f"   出发站: {raw_data.get('departure_station')}")
                    print(f"   到达站: {raw_data.get('arrival_station')}")
                    print(f"   车次: {raw_data.get('train_number')}")
                    print(f"   发车日期: {raw_data.get('departure_date')}")
                    print(f"   发车时间: {raw_data.get('departure_time')}")
                    print(f"   票价: {raw_data.get('amount')}")
                    print(f"   购买方: {raw_data.get('buyer_name')}")
                    print(f"   销售方: {raw_data.get('seller_name')}")
                    
                    # 检查关键字段
                    departure = raw_data.get('departure_station')
                    arrival = raw_data.get('arrival_station')
                    train = raw_data.get('train_number')
                    
                    print(f"\n🔍 验证结果:")
                    if departure == "厦门北站":
                        print(f"✅ 出发站正确: {departure}")
                    else:
                        print(f"❌ 出发站错误: {departure} (应该是厦门北站)")
                        
                    if arrival == "普宁站":
                        print(f"✅ 到达站正确: {arrival}")
                    else:
                        print(f"❌ 到达站错误: {arrival} (应该是普宁站)")
                        
                    if train == "G3743":
                        print(f"✅ 车次正确: {train}")
                    else:
                        print(f"❌ 车次错误: {train} (应该是G3743)")
                        
                else:
                    print(f"❌ API响应格式异常")
                    print(f"完整响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
            else:
                print(f"❌ API请求失败")
                print(f"错误内容: {response.text}")
                
    except Exception as e:
        print(f"❌ 请求异常: {e}")

if __name__ == "__main__":
    test_api_simple()