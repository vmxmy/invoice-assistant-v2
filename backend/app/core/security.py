"""
安全相关功能
"""

import base64
import os
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from passlib.context import CryptContext

from app.core.config import settings

# 密码哈希上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 初始化加密密钥


def _get_encryption_key() -> bytes:
    """获取或生成加密密钥"""
    # 使用应用的 SECRET_KEY 作为基础
    password = settings.SECRET_KEY.encode()
    salt = os.urandom(16)  # 使用随机盐值

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password))
    return key


# 初始化 Fernet 加密器
_fernet = Fernet(_get_encryption_key())


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """获取密码哈希"""
    return pwd_context.hash(password)


def encrypt_data(data: str) -> str:
    """加密数据"""
    if not data:
        return ""

    encrypted = _fernet.encrypt(data.encode())
    return base64.urlsafe_b64encode(encrypted).decode()


def decrypt_data(encrypted_data: str) -> Optional[str]:
    """解密数据"""
    if not encrypted_data:
        return None

    try:
        # 解码 base64
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
        # 解密
        decrypted = _fernet.decrypt(encrypted_bytes)
        return decrypted.decode()
    except Exception:
        # 解密失败
        return None


def create_access_token(data: dict) -> str:
    """创建访问令牌 - 这里只是占位，实际使用 Supabase Auth"""
    # 实际的 JWT 创建由 Supabase 处理
    # 这里只是为了兼容性
    return ""


def decode_token(token: str) -> Optional[dict]:
    """解码令牌 - 这里只是占位，实际使用 Supabase Auth"""
    # 实际的 JWT 解码由 Supabase 处理
    # 这里只是为了兼容性
    return None
