"""加密工具模块"""
import os
import base64
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from passlib.context import CryptContext

# 密码哈希上下文（用于用户密码）
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class PasswordEncryption:
    """密码加密工具类
    
    用于加密存储邮箱密码等敏感信息
    """
    
    def __init__(self, secret_key: Optional[str] = None):
        """初始化加密工具
        
        Args:
            secret_key: 加密密钥，如果不提供则从环境变量获取
        """
        if secret_key is None:
            secret_key = os.getenv("ENCRYPTION_KEY", "")
            if not secret_key:
                # 如果没有配置密钥，生成一个默认密钥（仅用于开发环境）
                secret_key = "development-secret-key-do-not-use-in-production"
        
        # 使用PBKDF2生成密钥
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'stable_salt',  # 在生产环境中应该使用随机盐
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(secret_key.encode()))
        self.cipher = Fernet(key)
    
    def encrypt(self, plaintext: str) -> str:
        """加密文本
        
        Args:
            plaintext: 明文
            
        Returns:
            加密后的密文（base64编码）
        """
        if not plaintext:
            return ""
        
        encrypted = self.cipher.encrypt(plaintext.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    
    def decrypt(self, ciphertext: str) -> str:
        """解密文本
        
        Args:
            ciphertext: 密文（base64编码）
            
        Returns:
            解密后的明文
        """
        if not ciphertext:
            return ""
        
        try:
            encrypted = base64.urlsafe_b64decode(ciphertext.encode())
            decrypted = self.cipher.decrypt(encrypted)
            return decrypted.decode()
        except Exception:
            # 解密失败返回空字符串
            return ""
    
    @staticmethod
    def generate_key() -> str:
        """生成新的加密密钥
        
        Returns:
            Base64编码的密钥
        """
        return Fernet.generate_key().decode()


# 全局实例
password_encryption = PasswordEncryption()


def hash_password(password: str) -> str:
    """哈希用户密码（用于用户登录密码）
    
    Args:
        password: 明文密码
        
    Returns:
        哈希后的密码
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证用户密码
    
    Args:
        plain_password: 明文密码
        hashed_password: 哈希后的密码
        
    Returns:
        是否匹配
    """
    return pwd_context.verify(plain_password, hashed_password)


def encrypt_email_password(password: str) -> str:
    """加密邮箱密码
    
    Args:
        password: 明文密码
        
    Returns:
        加密后的密码
    """
    return password_encryption.encrypt(password)


def decrypt_email_password(encrypted_password: str) -> str:
    """解密邮箱密码
    
    Args:
        encrypted_password: 加密后的密码
        
    Returns:
        明文密码
    """
    return password_encryption.decrypt(encrypted_password)