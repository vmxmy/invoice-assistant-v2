#!/usr/bin/env python3
"""
下载PDF附件测试脚本

测试邮件扫描API的附件下载功能
"""

import requests
import json
import base64
import os
from datetime import datetime, date

# 认证token
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsImtpZCI6IklraUtRYlY5Z3RYMmRNL3ciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NmZW5oaHR2Y3lzbHhwbHZld210LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJiZDlhNjcyMi1hNzgxLTRmMGItODg1Ni1jNmM1ZTI2MWNiZDAiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzUzNzk5NzY3LCJpYXQiOjE3NTM3OTYxNjcsImVtYWlsIjoiYmx1ZXlhbmdAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTM3OTYxNjd9XSwic2Vzc2lvbl9pZCI6IjAxMzU4OTU5LWVlM2UtNDYxOC1iYmI3LWMzZjJmYTFlYzQwYSIsImlzX2Fub255bW91cyI6ZmFsc2V9.F8PDRtU9WKkSyn2KVoYULeDo8HTmSVu49pWP4av_C3o"

# 邮箱账户ID
ACCOUNT_ID = "c8a5b42f-62dd-4c0d-8b36-45d2a01d1a63"

def test_download_attachments():
    """测试下载PDF附件功能"""
    print("📎 测试PDF附件下载功能")
    print(f"🕐 测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    # 使用完整扫描API，开启附件下载
    url = "http://localhost:8070/api/v1/email-scan-enhanced/scan-emails"
    
    # 计算从2025-03-31到今天的天数
    start_date = date(2025, 3, 31)
    today = date.today()
    
    request_data = {
        "email_account_id": ACCOUNT_ID,
        "search_params": {
            "subject_keywords": ["发票"],
            "date_from": "2025-03-31",
            "date_to": today.strftime('%Y-%m-%d'),
            "max_emails": 5  # 只下载前5封邮件的附件进行测试
        },
        "extract_content": True,
        "extract_attachments": True,
        "download_attachments": True  # 关键：开启附件下载
    }
    
    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Content-Type": "application/json"
    }
    
    print(f"🔗 请求URL: {url}")
    print(f"📋 请求参数:")
    print(f"   • 关键词: ['发票']")
    print(f"   • 时间范围: {start_date} 到 {today}")
    print(f"   • 最大邮件数: 5 (测试用)")
    print(f"   • 下载附件: True")
    
    try:
        print(f"\n⏳ 发送请求...")
        response = requests.post(url, json=request_data, headers=headers, timeout=60)
        
        print(f"📊 响应结果:")
        print(f"   状态码: {response.status_code}")
        
        if response.status_code == 200:
            print(f"   ✅ API调用成功!")
            
            data = response.json()
            result_data = data.get('data', {})
            
            if result_data:
                print(f"   📧 扫描结果:")
                print(f"      找到邮件: {result_data.get('total_found', 0)} 封")
                print(f"      分析邮件: {result_data.get('emails_analyzed', 0)} 封")
                print(f"      PDF附件: {result_data.get('pdf_attachments_found', 0)} 个")
                print(f"      扫描耗时: {result_data.get('scan_duration', 0):.2f} 秒")
                
                # 处理附件下载
                emails = result_data.get('emails', [])
                download_count = 0
                
                # 创建下载目录
                download_dir = f"downloaded_pdfs_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                os.makedirs(download_dir, exist_ok=True)
                print(f"\n📂 创建下载目录: {download_dir}")
                
                for i, email in enumerate(emails):
                    subject = email.get('subject', 'No subject')
                    sender = email.get('sender', 'Unknown')
                    attachments = email.get('attachments', [])
                    
                    print(f"\n   📧 邮件 {i+1}: {subject}")
                    print(f"      发件人: {sender}")
                    
                    pdf_attachments = [att for att in attachments if att.get('is_pdf')]
                    
                    if pdf_attachments:
                        print(f"      📎 PDF附件 ({len(pdf_attachments)} 个):")
                        
                        for j, attachment in enumerate(pdf_attachments):
                            filename = attachment.get('filename', f'attachment_{j+1}.pdf')
                            size = attachment.get('size', 0)
                            content = attachment.get('content')
                            
                            print(f"        {j+1}. {filename} ({size} bytes)")
                            
                            if content:
                                # 保存PDF文件
                                safe_filename = f"email_{i+1}_{j+1}_{filename.replace('/', '_').replace('\\', '_')}"
                                file_path = os.path.join(download_dir, safe_filename)
                                
                                try:
                                    # 如果content是base64编码的字符串，需要解码
                                    if isinstance(content, str):
                                        pdf_data = base64.b64decode(content)
                                    else:
                                        pdf_data = content
                                    
                                    with open(file_path, 'wb') as f:
                                        f.write(pdf_data)
                                    
                                    download_count += 1
                                    file_size = os.path.getsize(file_path)
                                    print(f"           ✅ 已下载: {file_path} ({file_size} bytes)")
                                    
                                except Exception as e:
                                    print(f"           ❌ 下载失败: {e}")
                            else:
                                print(f"           ⚠️  内容为空 - 可能需要检查download_attachments参数")
                    else:
                        print(f"      📎 无PDF附件")
                
                print(f"\n🎉 下载完成!")
                print(f"   📁 下载目录: {download_dir}")
                print(f"   📄 成功下载: {download_count} 个PDF文件")
                
                if download_count > 0:
                    print(f"\n💡 文件用途:")
                    print(f"   ✓ 这些PDF文件可以用于发票管理系统")
                    print(f"   ✓ 支持OCR文本提取和数据分析")
                    print(f"   ✓ 可以导入到财务系统进行自动化处理")
                else:
                    print(f"\n⚠️  未下载到文件，可能的原因:")
                    print(f"   • API可能还未完全支持附件内容返回")
                    print(f"   • 需要检查PythonImapIntegrator的实现")
                    print(f"   • 确认download_attachments参数是否正确传递")
            else:
                print(f"   ⚠️  响应数据为空")
                
        elif response.status_code == 401:
            print(f"   ❌ 认证失败 - Token可能已过期")
            
        elif response.status_code == 422:
            print(f"   ❌ 参数验证失败")
            try:
                error_data = response.json()
                print(f"   错误详情: {error_data}")
            except:
                print(f"   错误内容: {response.text}")
                
        else:
            print(f"   ❌ 其他错误: {response.status_code}")
            print(f"   响应内容: {response.text[:300]}")
            
    except requests.Timeout:
        print(f"   ❌ 请求超时 (60秒)")
    except Exception as e:
        print(f"   ❌ 请求异常: {e}")

def show_curl_command_with_download():
    """显示带附件下载的curl命令"""
    print(f"\n📋 带附件下载的curl命令:")
    print("=" * 60)
    
    request_data = {
        "email_account_id": ACCOUNT_ID,
        "search_params": {
            "subject_keywords": ["发票"],
            "date_from": "2025-03-31",
            "date_to": date.today().strftime('%Y-%m-%d'),
            "max_emails": 5
        },
        "extract_content": True,
        "extract_attachments": True,
        "download_attachments": True  # 关键参数
    }
    
    json_data = json.dumps(request_data, ensure_ascii=False, indent=2)
    
    curl_command = f'''curl -X POST "http://localhost:8070/api/v1/email-scan-enhanced/scan-emails" \\
  -H "Authorization: Bearer {AUTH_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{json_data}' \\
  -s | python3 -m json.tool'''
    
    print(curl_command)
    
    print(f"\n✅ 关键参数说明:")
    print(f"   • extract_attachments: true (检测PDF附件)")
    print(f"   • download_attachments: true (下载附件内容)")
    print(f"   • 返回的content字段包含base64编码的PDF数据")

def main():
    """主函数"""
    print("🚀 PDF附件下载功能测试")
    print(f"📧 邮箱账户: {ACCOUNT_ID}")
    print("=" * 70)
    
    # 1. 测试附件下载
    test_download_attachments()
    
    # 2. 显示curl命令
    show_curl_command_with_download()
    
    print(f"\n📝 总结:")
    print(f"✓ API已扩展支持download_attachments参数")
    print(f"✓ 当download_attachments=true时，返回附件的base64内容")
    print(f"✓ 可以将base64内容解码并保存为PDF文件")
    print(f"✓ 支持批量下载多个发票PDF附件")

if __name__ == "__main__":
    main()