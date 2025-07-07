#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
修复版PDF解析API测试 - 解决代理问题
"""

import requests
import os
import json
import jwt
import time

# 从环境配置生成测试JWT令牌
SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"

# 使用其中一个已存在的用户ID
TEST_USER_ID = "c18892f4-5cf3-42ad-a191-e92e3238ee3d"  # 第一个测试用户
API_BASE_URL = "http://127.0.0.1:8090"

def setup_no_proxy_session():
    """创建不使用代理的requests会话"""
    session = requests.Session()
    # 移除代理设置，确保直接访问本地服务
    session.proxies = {
        'http': None,
        'https': None,
    }
    # 设置合理的超时时间
    session.timeout = 30
    return session

def create_test_jwt_token(user_id: str) -> str:
    """创建测试用的JWT令牌"""
    payload = {
        "sub": user_id,  # 用户ID
        "iat": int(time.time()),  # 签发时间
        "exp": int(time.time()) + 3600,  # 1小时后过期
        "type": "access"
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token

def test_health_check(session):
    """测试健康检查"""
    try:
        response = session.get(f"{API_BASE_URL}/health")
        print(f"健康检查状态: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"健康检查结果: {result}")
            return True
        else:
            print(f"健康检查失败: {response.text}")
            return False
    except Exception as e:
        print(f"健康检查异常: {e}")
        return False

def test_auth_status(session, token: str):
    """测试认证状态"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        response = session.get(f"{API_BASE_URL}/api/v1/auth/status", headers=headers)
        print(f"认证状态: {response.status_code}")
        result = response.json()
        print(f"认证结果: {result}")
        return response.status_code == 200 and result.get('authenticated', False)
    except Exception as e:
        print(f"认证测试异常: {e}")
        return False

def test_pdf_upload(session, token: str, pdf_file: str):
    """测试PDF上传和解析"""
    print(f"\\n=== 测试PDF解析 ===")
    print(f"PDF文件: {pdf_file}")
    
    if not os.path.exists(pdf_file):
        print(f"❌ 文件不存在: {pdf_file}")
        return False
    
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        with open(pdf_file, 'rb') as f:
            files = {'file': f}
            response = session.post(
                f"{API_BASE_URL}/api/v1/files/upload-invoice",
                headers=headers,
                files=files
            )
        
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ PDF解析成功!")
            
            # 格式化显示关键信息
            if 'invoice_data' in result:
                invoice_data = result['invoice_data']
                print(f"  📄 发票号码: {invoice_data.get('invoice_number', 'N/A')}")
                print(f"  📅 开票日期: {invoice_data.get('invoice_date', 'N/A')}")
                print(f"  🏢 买方名称: {invoice_data.get('buyer_name', 'N/A')}")
                print(f"  🏬 卖方名称: {invoice_data.get('seller_name', 'N/A')}")
                print(f"  💰 发票金额: ¥{invoice_data.get('total_amount', 'N/A')}")
                print(f"  📋 项目名称: {invoice_data.get('project_name', 'N/A')}")
            
            if 'file_info' in result:
                file_info = result['file_info']
                print(f"  📁 文件ID: {file_info.get('id', 'N/A')}")
                print(f"  📏 文件大小: {file_info.get('size', 'N/A')} bytes")
            
            if 'processing_info' in result:
                processing = result['processing_info']
                print(f"  ⚙️  提取方法: {processing.get('extraction_method', 'N/A')}")
                print(f"  ⏱️  处理时间: {processing.get('processing_time', 'N/A')}秒")
                print(f"  📊 置信度: {processing.get('confidence', 'N/A')}")
            
            return True
        else:
            print(f"❌ PDF解析失败:")
            print(f"   状态码: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"   错误详情: {json.dumps(error_detail, indent=2, ensure_ascii=False)}")
            except:
                print(f"   错误内容: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False

def test_invoice_list(session, token: str):
    """测试发票列表"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        response = session.get(f"{API_BASE_URL}/api/v1/invoices/", headers=headers)
        
        print(f"\\n📋 发票列表状态: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            invoices = result.get('invoices', [])
            print(f"📊 发票总数: {result.get('total', 0)}")
            print(f"📄 当前页: {len(invoices)} 条")
            
            for i, invoice in enumerate(invoices[:3], 1):  # 显示前3条
                print(f"  {i}. {invoice.get('invoice_number')} - {invoice.get('seller_name')} - ¥{invoice.get('total_amount')}")
        else:
            print(f"获取发票列表失败: {response.text}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"发票列表测试异常: {e}")
        return False

def main():
    """主函数"""
    print("🚀 === PDF解析API测试 (修复代理问题) ===")
    
    # 0. 设置无代理会话
    print("\\n0. 设置网络会话...")
    session = setup_no_proxy_session()
    print("✅ 已配置无代理会话，确保直接访问本地API")
    
    # 1. 健康检查
    print("\\n1. 健康检查...")
    if not test_health_check(session):
        print("❌ 服务不可用，退出测试")
        return
    
    # 2. 创建测试JWT令牌
    print("\\n2. 创建测试令牌...")
    token = create_test_jwt_token(TEST_USER_ID)
    print(f"🔑 测试令牌: {token[:50]}...")
    
    # 3. 测试认证状态
    print("\\n3. 测试认证状态...")
    if not test_auth_status(session, token):
        print("❌ 认证失败，退出测试")
        return
    
    # 4. 测试发票列表
    print("\\n4. 测试发票列表...")
    test_invoice_list(session, token)
    
    # 5. 测试PDF文件
    print("\\n5. 测试PDF解析...")
    test_files = [
        "downloads/25359134169000052039.pdf",  # 火车票
        "downloads/25432000000031789815.pdf",  # 垂直文本
        "downloads/25442000000101203423.pdf",  # 标准发票
    ]
    
    success_count = 0
    total_count = 0
    
    for pdf_file in test_files:
        if os.path.exists(pdf_file):
            total_count += 1
            print(f"\\n5.{total_count} 测试文件: {os.path.basename(pdf_file)}")
            if test_pdf_upload(session, token, pdf_file):
                success_count += 1
            print("-" * 60)
        else:
            print(f"⚠️  文件不存在，跳过: {pdf_file}")
    
    # 6. 总结
    print(f"\\n🎯 === 测试总结 ===")
    print(f"📁 总文件数: {total_count}")
    print(f"✅ 成功数量: {success_count}")
    if total_count > 0:
        success_rate = success_count/total_count*100
        print(f"📈 成功率: {success_rate:.1f}%")
        if success_rate == 100:
            print("🎉 所有PDF文件解析成功！")
        elif success_rate >= 80:
            print("👍 大部分PDF文件解析成功")
        else:
            print("⚠️  需要进一步优化解析算法")
    else:
        print("❌ 无可测试文件")

if __name__ == "__main__":
    main()