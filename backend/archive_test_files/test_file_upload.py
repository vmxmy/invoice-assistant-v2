"""
文件上传功能测试脚本

测试文件上传、下载、列表等功能。
"""

import asyncio
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_file_upload_endpoints():
    """测试文件上传相关端点"""
    
    print("🧪 开始测试文件上传功能...")
    
    # 测试认证状态
    response = client.get("/api/v1/auth/status")
    print(f"📡 认证状态检查: {response.status_code}")
    
    # 使用测试token
    headers = {"Authorization": "Bearer test-user-token"}
    
    # 测试认证用户状态
    response = client.get("/api/v1/auth/me", headers=headers)
    print(f"🔐 认证用户信息: {response.status_code}")
    if response.status_code == 200:
        print(f"   用户: {response.json()['email']}")
    
    # 创建测试PDF文件
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
        # 写入简单的PDF内容（这里只是模拟）
        tmp_file.write(b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n%%EOF")
        tmp_file_path = tmp_file.name
    
    try:
        # 测试文件列表（应该为空）
        response = client.get("/api/v1/files/list", headers=headers)
        print(f"📋 文件列表查询: {response.status_code}")
        if response.status_code == 200:
            files_count = len(response.json()["files"])
            print(f"   当前文件数量: {files_count}")
        
        # 测试文件上传
        with open(tmp_file_path, "rb") as f:
            response = client.post(
                "/api/v1/files/upload-invoice",
                headers=headers,
                files={"file": ("test_invoice.pdf", f, "application/pdf")},
                data={"invoice_number": "TEST-001"}
            )
        
        print(f"📤 文件上传测试: {response.status_code}")
        if response.status_code == 200:
            upload_result = response.json()
            print(f"   文件ID: {upload_result['file_id']}")
            print(f"   文件路径: {upload_result['file_path']}")
            print(f"   发票ID: {upload_result['invoice_id']}")
            
            # 测试上传后的文件列表
            response = client.get("/api/v1/files/list", headers=headers)
            if response.status_code == 200:
                files_count = len(response.json()["files"])
                print(f"   上传后文件数量: {files_count}")
        else:
            print(f"   错误: {response.text}")
        
        # 测试API版本信息
        response = client.get("/api/v1/version")
        print(f"📊 API版本信息: {response.status_code}")
        if response.status_code == 200:
            version_info = response.json()
            print(f"   版本: {version_info['version']}")
            print(f"   端点数量: {len(version_info['endpoints'])}")
    
    finally:
        # 清理临时文件
        Path(tmp_file_path).unlink(missing_ok=True)
    
    print("✅ 文件上传功能测试完成")


def test_invoice_endpoints():
    """测试发票端点"""
    
    print("\n🧪 测试发票管理功能...")
    
    headers = {"Authorization": "Bearer test-user-token"}
    
    # 测试发票列表
    response = client.get("/api/v1/invoices/", headers=headers)
    print(f"📋 发票列表查询: {response.status_code}")
    if response.status_code == 200:
        invoices_data = response.json()
        print(f"   发票数量: {invoices_data['total']}")
    
    # 测试发票统计
    response = client.get("/api/v1/invoices/stats/overview", headers=headers)
    print(f"📊 发票统计: {response.status_code}")
    if response.status_code == 200:
        stats = response.json()
        print(f"   总发票数: {stats['total_invoices']}")
        print(f"   已验证: {stats['verified_invoices']}")
        print(f"   总金额: ¥{stats['total_amount']}")
    
    print("✅ 发票管理功能测试完成")


if __name__ == "__main__":
    test_file_upload_endpoints()
    test_invoice_endpoints()
    print("\n🎉 所有测试完成！")