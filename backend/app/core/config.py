"""
应用配置模块

使用 Pydantic Settings 管理环境变量配置。
"""

from typing import List, Optional
from pydantic import Field, validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置类"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # 应用配置
    app_name: str = Field(default="发票助手 API", description="应用名称")
    app_version: str = Field(default="2.0.0", description="应用版本")
    app_description: str = Field(
        default="智能发票管理系统",
        description="应用描述"
    )
    app_host: str = Field(default="0.0.0.0", description="应用主机")
    app_port: int = Field(default=8000, description="应用端口")
    debug: bool = Field(default=False, description="调试模式")
    
    # 安全配置
    secret_key: str = Field(
        default="change-this-secret-key-in-production",
        description="JWT 密钥",
        min_length=32
    )
    algorithm: str = Field(default="HS256", description="JWT 算法")
    access_token_expire_minutes: int = Field(
        default=30,
        description="访问令牌过期时间(分钟)"
    )
    
    # CORS 配置
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173,https://invoice-assistant-v2-frontend.vercel.app",
        description="允许的跨域源(逗号分隔)"
    )
    cors_allow_credentials: bool = Field(
        default=True,
        description="是否允许跨域凭证"
    )
    
    # Supabase 配置
    supabase_url: str = Field(default="", description="Supabase 项目 URL")
    supabase_key: str = Field(default="", description="Supabase 匿名密钥")
    supabase_service_key: str = Field(default="", description="Supabase 服务密钥")
    supabase_jwt_secret: str = Field(default="", description="Supabase JWT 密钥")
    
    # 从 Supabase URL 推导项目 ID
    @property
    def supabase_project_id(self) -> str:
        """从 SUPABASE_URL 中提取项目 ID"""
        if "supabase.co" in self.database_url:
            # 格式: postgresql://...@db.PROJECT_ID.supabase.co:5432/...
            parts = self.database_url.split("@")[1].split(".")
            if len(parts) >= 3:
                return parts[1]
        return ""
    
    # 数据库配置
    database_url: str = Field(
        default="postgresql+asyncpg://user:password@localhost/db",
        description="数据库连接 URL"
    )
    database_pool_size: int = Field(default=20, description="数据库连接池大小")
    database_max_overflow: int = Field(default=0, description="数据库连接池溢出")
    
    
    # Mailgun 配置
    mailgun_api_key: str = Field(default="", description="Mailgun API 密钥")
    mailgun_domain: str = Field(default="", description="Mailgun 域名")
    mailgun_webhook_signing_key: str = Field(
        default="",
        description="Mailgun Webhook 签名密钥",
        alias="MAILGUN_WEBHOOK_SIGNING_KEY"
    )
    
    # 邮件处理配置
    email_processing_enabled: bool = Field(default=True, description="启用邮件处理")
    max_email_attachments: int = Field(default=10, description="最大邮件附件数")
    email_download_timeout: int = Field(default=30, description="邮件下载超时(秒)")
    
    # OCR 服务配置
    mineru_api_token: str = Field(default="", description="Mineru API Token")
    mineru_api_base_url: str = Field(
        default="https://api.mineru.net",
        description="Mineru API 基础 URL"
    )
    
    # 日志配置
    log_level: str = Field(default="INFO", description="日志级别")
    log_format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="日志格式"
    )
    
    # 文件存储配置
    upload_dir: str = Field(default="uploads", description="上传目录")
    downloads_dir: str = Field(default="downloads", description="下载目录")
    max_file_size: int = Field(default=10485760, description="最大文件大小(字节)")
    
    # API 配置
    api_v1_prefix: str = Field(default="/api/v1", description="API v1 前缀")
    docs_url: Optional[str] = Field(default="/docs", description="文档 URL")
    redoc_url: Optional[str] = Field(default="/redoc", description="ReDoc URL")
    enable_docs: bool = Field(default=True, description="是否启用文档")
    
    @validator("cors_origins", pre=True)
    def validate_cors_origins(cls, v) -> str:
        """解析 CORS 源列表"""
        if isinstance(v, list):
            return ",".join(v)
        return v
    
    @validator("log_level", pre=True)
    def validate_log_level(cls, v: str) -> str:
        """验证日志级别"""
        allowed_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed_levels:
            raise ValueError(f"Log level must be one of: {allowed_levels}")
        return v.upper()
    
    @validator("secret_key", pre=True)
    def validate_secret_key(cls, v: str) -> str:
        """验证密钥安全性"""
        # 检查是否使用默认密钥
        if v == "change-this-secret-key-in-production":
            import os
            # 生产环境强制要求自定义密钥
            debug_mode = os.getenv("DEBUG", "false").lower() == "true"
            if os.getenv("ENVIRONMENT") == "production" or not debug_mode:
                raise ValueError("Default secret key is not allowed in production")
        
        # 检查密钥长度和复杂性
        if len(v) < 32:
            raise ValueError("Secret key must be at least 32 characters long")
        
        # 检查是否包含足够的随机性
        if v.count(v[0]) > len(v) * 0.5:  # 如果超过50%是同一字符
            raise ValueError("Secret key lacks sufficient randomness")
        
        return v
    
    @validator("max_file_size", pre=True)
    def validate_max_file_size(cls, v) -> int:
        """验证最大文件大小"""
        # 转换为整数
        if isinstance(v, str):
            try:
                v = int(v)
            except ValueError:
                raise ValueError("Max file size must be a valid integer")
        
        if v <= 0:
            raise ValueError("Max file size must be positive")
        if v > 100 * 1024 * 1024:  # 100MB
            raise ValueError("Max file size cannot exceed 100MB")
        return v
    
    @property
    def is_development(self) -> bool:
        """是否为开发环境"""
        return self.debug
    
    @property
    def is_production(self) -> bool:
        """是否为生产环境"""
        return not self.debug
    
    @property
    def cors_origins_list(self) -> List[str]:
        """获取 CORS 源列表"""
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(",")]
        return self.cors_origins
    
    @property
    def database_url_async(self) -> str:
        """获取异步数据库 URL"""
        # 如果已经是 asyncpg 格式，直接返回
        if "postgresql+asyncpg://" in self.database_url:
            return self.database_url
        # 转换为 asyncpg 格式
        return self.database_url.replace("postgresql://", "postgresql+asyncpg://")
    
    def get_database_url_sync(self) -> str:
        """获取同步数据库 URL"""
        return self.database_url.replace("postgresql+asyncpg://", "postgresql://")


# 创建全局配置实例
settings = Settings()


def get_settings() -> Settings:
    """获取配置实例的工厂函数，支持依赖注入"""
    return settings