#!/usr/bin/env python3
"""
解密邮箱密码
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.utils.encryption import decrypt_email_password

def decrypt_password():
    """解密密码"""
    encrypted_password = "Z0FBQUFBQm9lMURnNkhKSkhISEhFMkY2YmZvSXZWcm16cTJkQ1Q0aXo0RVBPdEk1WXBYYktPSWFFQWVtM1hTeVMzeXJRcUg4NDlnSGl2ZHdVYU9sWlZubHJRY3dEVTdOY21icUlyMmxkTVBSWW1HVlc5MVFrYjg9"
    
    try:
        decrypted = decrypt_email_password(encrypted_password)
        print(f"解密后的密码: {decrypted}")
        print(f"密码长度: {len(decrypted)}")
        
        # 检查是否是授权码格式（通常是16位）
        if len(decrypted) == 16 and decrypted.isalnum():
            print("这看起来是一个QQ邮箱授权码")
        else:
            print("警告：这可能不是有效的QQ邮箱授权码")
            
    except Exception as e:
        print(f"解密失败: {e}")

if __name__ == "__main__":
    decrypt_password()