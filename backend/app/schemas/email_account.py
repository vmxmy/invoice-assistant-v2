"""
邮箱账户Schema定义

定义邮箱账户相关的请求和响应模型。
"""

from typing import Optional, Dict, Any, List, Union
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator
import re

from .base_response import BaseListResponse


class EmailAccountBase(BaseModel):
    """邮箱账户基础模型"""
    
    email_address: EmailStr = Field(..., description="邮箱地址")
    display_name: Optional[str] = Field(None, max_length=100, description="显示名称")
    imap_host: Optional[str] = Field(None, description="IMAP服务器地址")
    imap_port: Optional[int] = Field(993, ge=1, le=65535, description="IMAP端口号")
    imap_use_ssl: Optional[bool] = Field(True, description="是否使用SSL")
    scan_folder: Optional[str] = Field("INBOX", description="默认扫描文件夹")
    scan_rules: Optional[Dict[str, Any]] = Field(None, description="扫描规则配置")
    is_active: Optional[bool] = Field(True, description="是否启用")


class EmailAccountCreate(EmailAccountBase):
    """创建邮箱账户请求模型"""
    
    password: str = Field(..., min_length=1, description="邮箱密码或授权码")
    email_provider: Optional[str] = Field(None, description="邮箱服务商")
    
    @field_validator('email_address')
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        """验证邮箱格式"""
        if not v or not isinstance(v, str):
            raise ValueError("邮箱地址不能为空")
        return v.lower().strip()
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """验证密码"""
        if not v or not v.strip():
            raise ValueError("密码不能为空")
        return v.strip()


class EmailAccountUpdate(BaseModel):
    """更新邮箱账户请求模型"""
    
    display_name: Optional[str] = Field(None, max_length=100, description="显示名称")
    password: Optional[str] = Field(None, min_length=1, description="新密码")
    imap_host: Optional[str] = Field(None, description="IMAP服务器地址")
    imap_port: Optional[int] = Field(None, ge=1, le=65535, description="IMAP端口号")
    imap_use_ssl: Optional[bool] = Field(None, description="是否使用SSL")
    scan_folder: Optional[str] = Field(None, description="默认扫描文件夹")
    scan_rules: Optional[Dict[str, Any]] = Field(None, description="扫描规则配置")
    is_active: Optional[bool] = Field(None, description="是否启用")


class EmailAccountResponse(EmailAccountBase):
    """邮箱账户响应模型"""
    
    id: Union[UUID, str] = Field(..., description="账户ID (UUID)")
    user_id: Union[UUID, str] = Field(..., description="用户ID")
    email_provider: Optional[str] = Field(None, description="邮箱服务商")
    is_verified: bool = Field(False, description="是否已验证连接")
    last_scan_time: Optional[datetime] = Field(None, description="最后扫描时间")
    last_error: Optional[str] = Field(None, description="最后的错误信息")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    sync_state: Optional[Dict[str, Any]] = Field(None, description="同步状态信息")
    
    @field_validator('id', 'user_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        """将UUID对象转换为字符串"""
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True


class EmailAccountInDB(EmailAccountResponse):
    """数据库中的邮箱账户模型（包含加密密码）"""
    
    encrypted_password: str = Field(..., description="加密后的密码")
    last_scan_email_id: Optional[str] = Field(None, description="最后扫描的邮件ID")


class EmailAccountTestRequest(BaseModel):
    """测试邮箱连接请求模型"""
    
    email_address: Optional[EmailStr] = Field(None, description="要测试的邮箱地址（新建时使用）")
    password: Optional[str] = Field(None, description="邮箱密码（新建时使用）")
    account_id: Optional[Union[UUID, str]] = Field(None, description="已存在的账户ID（测试已保存的账户）")


class EmailAccountTestResponse(BaseModel):
    """测试邮箱连接响应模型"""
    
    success: bool = Field(..., description="测试是否成功")
    message: str = Field(..., description="测试结果消息")
    folders: Optional[List[str]] = Field(None, description="邮箱文件夹列表")
    email_count: Optional[int] = Field(None, description="收件箱邮件数量")
    error_detail: Optional[str] = Field(None, description="错误详情")


class EmailProviderConfig(BaseModel):
    """邮箱服务商配置"""
    
    domain: str = Field(..., description="域名")
    imap_host: str = Field(..., description="IMAP服务器地址")
    imap_port: int = Field(..., description="IMAP端口")
    imap_use_ssl: bool = Field(..., description="是否使用SSL")
    help_url: Optional[str] = Field(None, description="帮助文档链接")
    notes: Optional[str] = Field(None, description="配置说明")


class EmailAccountListResponse(BaseListResponse[EmailAccountResponse]):
    """邮箱账户列表响应模型"""
    pass


class ScanRulesConfig(BaseModel):
    """扫描规则配置模型"""
    
    keywords: List[str] = Field(
        default=["发票", "invoice", "账单", "bill", "收据", "receipt"],
        description="关键词列表"
    )
    sender_whitelist: List[str] = Field(default=[], description="发件人白名单")
    sender_blacklist: List[str] = Field(default=[], description="发件人黑名单")
    attachment_types: List[str] = Field(
        default=[".pdf", ".jpg", ".jpeg", ".png", ".bmp"],
        description="附件类型"
    )
    min_attachment_size: int = Field(default=10240, ge=0, description="最小附件大小（字节）")
    max_attachment_size: int = Field(default=10485760, ge=0, description="最大附件大小（字节）")
    date_range_days: int = Field(default=30, ge=1, le=365, description="扫描日期范围（天）")