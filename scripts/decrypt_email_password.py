#!/usr/bin/env python3
"""
解密数据库中存储的邮箱密码
"""

import sys
import os
sys.path.append('/Users/xumingyang/app/invoice_assist/v2/backend')

from app.core.crypto import decrypt_password

def decrypt_stored_password():
    """解密存储的邮箱密码"""
    
    # 从数据库查询结果中获取的加密密码
    encrypted_password = "Z0FBQUFBQm9lMURnNkhKSkhISEhFMkY2YmZvSXZWcm16cTJkQ1Q0aXo0RVBPdEk1WXBYYktPSWFFQWVtM1hTeVMzeXJRcUg4NDlnSGl2ZHdVYU9sWlZubHJRY3dEVTdOY21icUlyMmxkTVBSWW1HVlc5MVFrYjg9"
    
    print("🔓 正在解密邮箱密码...")
    print(f"加密密码: {encrypted_password[:50]}...")
    
    try:
        # 使用backend的解密函数
        decrypted_password = decrypt_password(encrypted_password)
        
        print("✅ 解密成功!")
        print(f"解密后的密码（QQ授权码）: {decrypted_password}")
        
        # 验证这是否是QQ授权码格式
        if len(decrypted_password) == 16 and decrypted_password.isalnum():
            print("✅ 这看起来是一个有效的QQ邮箱授权码")
        else:
            print("⚠️ 这可能不是标准的QQ邮箱授权码格式")
            
        return decrypted_password
        
    except Exception as e:
        print(f"❌ 解密失败: {str(e)}")
        return None

if __name__ == "__main__":
    decrypted = decrypt_stored_password()
    
    if decrypted:
        print("\n📝 使用说明:")
        print("1. 将解密后的授权码替换到Edge Function中")
        print("2. 确保QQ邮箱已开启IMAP服务")
        print("3. 使用此授权码而不是登录密码")
    else:
        print("\n❌ 无法获取解密密码，建议：")
        print("1. 检查加密配置是否正确")
        print("2. 确认SECRET_KEY设置")
        print("3. 重新生成QQ邮箱授权码")