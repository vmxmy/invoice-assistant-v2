#!/usr/bin/env python3
"""
简化的邮箱密码解密脚本
"""

import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

def decrypt_qq_password():
    """解密QQ邮箱授权码"""
    
    # 从数据库查询得到的加密密码
    encrypted_password = "Z0FBQUFBQm9lMURnNkhKSkhISEhFMkY2YmZvSXZWcm16cTJkQ1Q0aXo0RVBPdEk1WXBYYktPSWFFQWVtM1hTeVMzeXJRcUg4NDlnSGl2ZHdVYU9sWlZubHJRY3dEVTdOY21icUlyMmxkTVBSWW1HVlc5MVFrYjg9"
    
    # 需要使用与加密时相同的SECRET_KEY
    # 这个值需要从实际的配置中获取
    master_key = "change-this-secret-key-in-production".encode()  # 默认值
    
    print("🔓 正在解密QQ邮箱授权码...")
    print(f"加密数据: {encrypted_password[:50]}...")
    
    try:
        # 解码base64
        combined = base64.urlsafe_b64decode(encrypted_password.encode())
        
        # 提取盐值和加密数据
        salt = combined[:16]  # 前16字节是盐值
        encrypted_data = combined[16:]  # 剩余是加密数据
        
        print(f"🧂 盐值长度: {len(salt)}")
        print(f"🔒 加密数据长度: {len(encrypted_data)}")
        
        # 使用相同的方法派生密钥
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(master_key))
        
        # 解密
        f = Fernet(key)
        decrypted_data = f.decrypt(encrypted_data)
        
        # 解码为字符串
        qq_auth_code = decrypted_data.decode()
        
        print("✅ 解密成功!")
        print(f"QQ邮箱授权码: {qq_auth_code}")
        
        # 验证授权码格式
        if len(qq_auth_code) == 16 and qq_auth_code.isalnum():
            print("✅ 这是一个有效的QQ邮箱授权码格式")
        else:
            print(f"⚠️ 授权码长度: {len(qq_auth_code)}, 可能不是标准QQ授权码格式")
            
        return qq_auth_code
        
    except Exception as e:
        print(f"❌ 解密失败: {str(e)}")
        print("可能的原因:")
        print("1. SECRET_KEY不正确")
        print("2. 加密数据已损坏")
        print("3. 加密算法参数不匹配")
        return None

if __name__ == "__main__":
    auth_code = decrypt_qq_password()
    
    if auth_code:
        print(f"\n📋 复制此授权码到Edge Function:")
        print(f"'{auth_code}'")
        print("\n🔧 使用步骤:")
        print("1. 复制上面的授权码")
        print("2. 替换Edge Function中的 'your_real_qq_auth_code'")
        print("3. 重新部署Edge Function")
        print("4. 运行测试脚本验证连接")
    else:
        print("\n❌ 解密失败，请检查配置")