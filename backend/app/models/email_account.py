"""
邮箱账户模型

定义用户的邮箱账户信息，支持多种邮箱服务商的IMAP配置。
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, foreign
from sqlalchemy.sql import func, text
from app.models.base import Base, BaseModel


class EmailAccount(Base, BaseModel):
    """邮箱账户模型"""
    
    __tablename__ = "email_accounts"
    
    # 基本信息
    # id 已由 BaseModel 提供，包含了 server_default=text("gen_random_uuid()")
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="用户ID")
    email_address = Column(String(255), nullable=False, comment="邮箱地址")
    email_provider = Column(String(50), comment="邮箱服务商（qq, 163, 126, gmail, outlook等）")
    display_name = Column(String(100), comment="显示名称")
    
    # IMAP配置
    imap_host = Column(String(255), nullable=False, comment="IMAP服务器地址")
    imap_port = Column(Integer, default=993, comment="IMAP端口号")
    imap_use_ssl = Column(Boolean, default=True, comment="是否使用SSL")
    
    # 认证信息（密码将被加密存储）
    encrypted_password = Column(Text, nullable=False, comment="加密后的密码")
    
    # 扫描配置
    scan_folder = Column(String(100), default="INBOX", comment="默认扫描文件夹")
    scan_rules = Column(JSON, comment="扫描规则配置")
    last_scan_time = Column(DateTime, comment="最后扫描时间")
    last_scan_email_id = Column(String(255), comment="最后扫描的邮件ID")
    
    # 状态信息
    is_active = Column(Boolean, default=True, comment="是否启用")
    is_verified = Column(Boolean, default=False, comment="是否已验证连接")
    last_error = Column(Text, comment="最后的错误信息")
    
    # 时间戳
    # created_at 和 updated_at 已由 BaseModel 提供
    
    # 关系 - 暂时注释掉以解决循环依赖问题
    # profile = relationship(
    #     "Profile",
    #     primaryjoin="foreign(EmailAccount.user_id) == Profile.auth_user_id",
    #     back_populates="email_accounts",
    #     uselist=False  # 明确指定这是 many-to-one 关系
    # )
    
    def __repr__(self):
        return f"<EmailAccount {self.email_address}>"
    
    class Config:
        """模型配置"""
        # 允许的邮箱服务商列表
        SUPPORTED_PROVIDERS = {
            "qq": {
                "domain": "qq.com",
                "imap_host": "imap.qq.com",
                "imap_port": 993,
                "imap_use_ssl": True
            },
            "163": {
                "domain": "163.com",
                "imap_host": "imap.163.com",
                "imap_port": 993,
                "imap_use_ssl": True
            },
            "126": {
                "domain": "126.com",
                "imap_host": "imap.126.com",
                "imap_port": 993,
                "imap_use_ssl": True
            },
            "gmail": {
                "domain": "gmail.com",
                "imap_host": "imap.gmail.com",
                "imap_port": 993,
                "imap_use_ssl": True
            },
            "outlook": {
                "domain": "outlook.com",
                "imap_host": "outlook.office365.com",
                "imap_port": 993,
                "imap_use_ssl": True
            },
            "hotmail": {
                "domain": "hotmail.com",
                "imap_host": "outlook.office365.com",
                "imap_port": 993,
                "imap_use_ssl": True
            },
            "yahoo": {
                "domain": "yahoo.com",
                "imap_host": "imap.mail.yahoo.com",
                "imap_port": 993,
                "imap_use_ssl": True
            },
            "sina": {
                "domain": "sina.com",
                "imap_host": "imap.sina.com",
                "imap_port": 993,
                "imap_use_ssl": True
            },
            "sohu": {
                "domain": "sohu.com",
                "imap_host": "imap.sohu.com",
                "imap_port": 993,
                "imap_use_ssl": True
            },
            "139": {
                "domain": "139.com",
                "imap_host": "imap.139.com",
                "imap_port": 993,
                "imap_use_ssl": True
            }
        }
        
        # 默认扫描规则
        DEFAULT_SCAN_RULES = {
            "keywords": ["发票", "invoice", "账单", "bill", "收据", "receipt"],
            "sender_whitelist": [],
            "sender_blacklist": [],
            "attachment_types": [".pdf", ".jpg", ".jpeg", ".png", ".bmp"],
            "min_attachment_size": 10 * 1024,  # 10KB
            "max_attachment_size": 10 * 1024 * 1024,  # 10MB
            "date_range_days": 30  # 默认扫描最近30天的邮件
        }