"""
邮件地址管理系统配置
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, validator
from app.core.config import settings


class EmailSystemConfig(BaseModel):
    """邮件系统配置"""
    
    # Mailgun配置
    mailgun_api_key: Optional[str] = Field(None, description="Mailgun API密钥")
    mailgun_domain: str = Field("invoice.example.com", description="Mailgun域名")
    mailgun_webhook_url: str = Field(
        "https://your-api.com/api/v1/webhooks/email-received", 
        description="Webhook回调URL"
    )
    mailgun_signing_key: Optional[str] = Field(None, description="Webhook签名密钥")
    
    # 地址生成配置
    default_domain: str = Field("invoice.example.com", description="默认邮件域名")
    address_prefix: str = Field("invoice", description="地址前缀")
    
    # 用户限制
    max_addresses_per_user: int = Field(10, description="每用户最大地址数")
    max_temporary_address_lifetime_days: int = Field(90, description="临时地址最长有效期")
    
    # 自动清理配置
    auto_cleanup_enabled: bool = Field(True, description="是否启用自动清理过期地址")
    cleanup_schedule: str = Field("0 2 * * *", description="清理计划（cron格式）")
    
    # 安全配置
    require_sender_whitelist: bool = Field(False, description="是否要求发件人白名单")
    block_suspicious_senders: bool = Field(True, description="是否阻止可疑发件人")
    
    # 通知配置
    notify_on_new_address: bool = Field(True, description="创建新地址时通知")
    notify_on_address_expiry: bool = Field(True, description="地址过期时通知")
    expiry_warning_days: int = Field(7, description="过期提醒提前天数")
    
    @validator('mailgun_domain', 'default_domain')
    def validate_domain(cls, v):
        """验证域名格式"""
        if not v or '.' not in v:
            raise ValueError('域名格式无效')
        return v.lower()
    
    @validator('max_addresses_per_user')
    def validate_max_addresses(cls, v):
        """验证地址数量限制"""
        if v < 1 or v > 100:
            raise ValueError('地址数量限制必须在1-100之间')
        return v
    
    @classmethod
    def from_env(cls) -> 'EmailSystemConfig':
        """从环境变量创建配置"""
        return cls(
            mailgun_api_key=getattr(settings, 'mailgun_api_key', None),
            mailgun_domain=getattr(settings, 'mailgun_domain', 'invoice.example.com'),
            mailgun_webhook_url=getattr(settings, 'mailgun_webhook_url', 'https://your-api.com/api/v1/webhooks/email-received'),
            mailgun_signing_key=getattr(settings, 'mailgun_signing_key', None),
            default_domain=getattr(settings, 'default_email_domain', 'invoice.example.com'),
            max_addresses_per_user=getattr(settings, 'max_email_addresses_per_user', 10),
        )


class EmailAddressTemplate(BaseModel):
    """邮件地址模板配置"""
    
    type: str = Field(..., description="模板类型")
    pattern: str = Field(..., description="地址生成模式")
    description: str = Field(..., description="模板描述")
    max_lifetime_days: Optional[int] = Field(None, description="最大有效期")
    auto_expire: bool = Field(False, description="是否自动过期")
    
    class Config:
        schema_extra = {
            "examples": [
                {
                    "type": "primary",
                    "pattern": "invoice-{user_id}@{domain}",
                    "description": "用户主要发票接收地址",
                    "max_lifetime_days": None,
                    "auto_expire": False
                },
                {
                    "type": "temporary",
                    "pattern": "invoice-temp-{random}-{user_id}@{domain}",
                    "description": "临时发票接收地址",
                    "max_lifetime_days": 30,
                    "auto_expire": True
                }
            ]
        }


# 预定义的地址模板
DEFAULT_ADDRESS_TEMPLATES = {
    "primary": EmailAddressTemplate(
        type="primary",
        pattern="invoice-{user_id}@{domain}",
        description="用户主要发票接收地址",
        auto_expire=False
    ),
    "work": EmailAddressTemplate(
        type="work",
        pattern="invoice-work-{user_id}@{domain}",
        description="工作专用发票地址",
        auto_expire=False
    ),
    "personal": EmailAddressTemplate(
        type="personal",
        pattern="invoice-personal-{user_id}@{domain}",
        description="个人专用发票地址",
        auto_expire=False
    ),
    "temporary": EmailAddressTemplate(
        type="temporary",
        pattern="invoice-temp-{random}-{user_id}@{domain}",
        description="临时发票接收地址",
        max_lifetime_days=30,
        auto_expire=True
    ),
    "custom": EmailAddressTemplate(
        type="custom",
        pattern="invoice-{custom}-{user_id}@{domain}",
        description="自定义发票地址",
        auto_expire=False
    )
}


class EmailUsageQuota(BaseModel):
    """邮件使用配额配置"""
    
    # 基础用户配额
    basic_max_addresses: int = Field(3, description="基础用户最大地址数")
    basic_max_emails_per_month: int = Field(100, description="基础用户每月最大邮件数")
    
    # 高级用户配额
    premium_max_addresses: int = Field(20, description="高级用户最大地址数")
    premium_max_emails_per_month: int = Field(1000, description="高级用户每月最大邮件数")
    
    # 企业用户配额
    enterprise_max_addresses: int = Field(100, description="企业用户最大地址数")
    enterprise_max_emails_per_month: int = Field(10000, description="企业用户每月最大邮件数")
    
    # 限制策略
    enforce_quotas: bool = Field(True, description="是否强制执行配额")
    quota_reset_day: int = Field(1, description="配额重置日期（每月）")
    
    def get_user_quota(self, user_type: str) -> Dict[str, int]:
        """获取用户类型对应的配额"""
        quota_map = {
            "basic": {
                "max_addresses": self.basic_max_addresses,
                "max_emails_per_month": self.basic_max_emails_per_month
            },
            "premium": {
                "max_addresses": self.premium_max_addresses,
                "max_emails_per_month": self.premium_max_emails_per_month
            },
            "enterprise": {
                "max_addresses": self.enterprise_max_addresses,
                "max_emails_per_month": self.enterprise_max_emails_per_month
            }
        }
        return quota_map.get(user_type, quota_map["basic"])


# 全局配置实例
email_config = EmailSystemConfig.from_env()
usage_quota = EmailUsageQuota()


def get_email_config() -> EmailSystemConfig:
    """获取邮件系统配置"""
    return email_config


def get_usage_quota() -> EmailUsageQuota:
    """获取使用配额配置"""
    return usage_quota


def validate_email_system_setup() -> Dict[str, Any]:
    """验证邮件系统设置完整性"""
    config = get_email_config()
    
    validation_result = {
        "valid": True,
        "errors": [],
        "warnings": [],
        "config_status": {}
    }
    
    # 检查必需配置
    if not config.mailgun_api_key:
        validation_result["warnings"].append("Mailgun API密钥未配置，某些功能可能不可用")
        validation_result["config_status"]["mailgun_api"] = "missing"
    else:
        validation_result["config_status"]["mailgun_api"] = "configured"
    
    if not config.mailgun_signing_key:
        validation_result["warnings"].append("Mailgun签名密钥未配置，建议配置以提高安全性")
        validation_result["config_status"]["mailgun_signing"] = "missing"
    else:
        validation_result["config_status"]["mailgun_signing"] = "configured"
    
    # 检查域名配置
    if config.mailgun_domain == "invoice.example.com":
        validation_result["errors"].append("请配置真实的Mailgun域名")
        validation_result["valid"] = False
        validation_result["config_status"]["domain"] = "default"
    else:
        validation_result["config_status"]["domain"] = "configured"
    
    # 检查Webhook URL
    if "your-api.com" in config.mailgun_webhook_url:
        validation_result["errors"].append("请配置真实的Webhook URL")
        validation_result["valid"] = False
        validation_result["config_status"]["webhook_url"] = "default"
    else:
        validation_result["config_status"]["webhook_url"] = "configured"
    
    return validation_result