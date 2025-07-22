"""
加密工具模块

提供密码加密和解密功能，用于安全存储敏感信息。
"""

import base64
import secrets
from typing import Tuple
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.core.config import settings


class CryptoManager:
    """加密管理器"""
    
    def __init__(self):
        """初始化加密管理器"""
        # 使用应用的SECRET_KEY作为主密钥
        self.master_key = settings.SECRET_KEY.encode()
        
    def _derive_key(self, salt: bytes) -> bytes:
        """从主密钥和盐值派生加密密钥"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.master_key))
        return key
    
    def encrypt(self, plain_text: str) -> str:
        """
        加密文本
        
        Args:
            plain_text: 要加密的明文
            
        Returns:
            加密后的文本（包含盐值）
        """
        if not plain_text:
            return ""
            
        # 生成随机盐值
        salt = secrets.token_bytes(16)
        
        # 派生密钥
        key = self._derive_key(salt)
        
        # 创建Fernet实例并加密
        f = Fernet(key)
        encrypted_data = f.encrypt(plain_text.encode())
        
        # 将盐值和加密数据组合并编码为base64
        combined = salt + encrypted_data
        return base64.urlsafe_b64encode(combined).decode()
    
    def decrypt(self, encrypted_text: str) -> str:
        """
        解密文本
        
        Args:
            encrypted_text: 加密的文本
            
        Returns:
            解密后的明文
            
        Raises:
            Exception: 解密失败时抛出异常
        """
        if not encrypted_text:
            return ""
            
        try:
            # 解码base64
            combined = base64.urlsafe_b64decode(encrypted_text.encode())
            
            # 提取盐值和加密数据
            salt = combined[:16]
            encrypted_data = combined[16:]
            
            # 派生密钥
            key = self._derive_key(salt)
            
            # 创建Fernet实例并解密
            f = Fernet(key)
            decrypted_data = f.decrypt(encrypted_data)
            
            return decrypted_data.decode()
        except Exception as e:
            raise Exception(f"解密失败: {str(e)}")
    
    def verify(self, plain_text: str, encrypted_text: str) -> bool:
        """
        验证明文是否与加密文本匹配
        
        Args:
            plain_text: 明文
            encrypted_text: 加密文本
            
        Returns:
            是否匹配
        """
        try:
            decrypted = self.decrypt(encrypted_text)
            return decrypted == plain_text
        except:
            return False


# 创建全局加密管理器实例
crypto_manager = CryptoManager()


# 便捷函数
def encrypt_password(password: str) -> str:
    """加密密码"""
    return crypto_manager.encrypt(password)


def decrypt_password(encrypted_password: str) -> str:
    """解密密码"""
    return crypto_manager.decrypt(encrypted_password)


def verify_password(plain_password: str, encrypted_password: str) -> bool:
    """验证密码"""
    return crypto_manager.verify(plain_password, encrypted_password)