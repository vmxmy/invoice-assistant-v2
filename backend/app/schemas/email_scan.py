"""邮箱扫描Schema定义"""
from typing import Optional, Dict, Any, List, Union
from datetime import datetime, date
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, Field, field_validator, ValidationError

from .base_response import BaseListResponse


class ScanJobStatus(str, Enum):
    """扫描任务状态"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ScanJobType(str, Enum):
    """扫描任务类型"""
    MANUAL = "manual"         # 手动扫描
    SCHEDULED = "scheduled"   # 定时扫描
    INCREMENTAL = "incremental"  # 增量扫描


class ScanParams(BaseModel):
    """扫描参数配置"""
    
    folders: List[str] = Field(
        default=["INBOX"],
        description="要扫描的邮箱文件夹"
    )
    date_from: Optional[date] = Field(
        None,
        description="扫描起始日期"
    )
    date_to: Optional[date] = Field(
        None,
        description="扫描结束日期"
    )
    subject_keywords: List[str] = Field(
        default=["发票"],
        max_length=1,
        description="主题必须包含的关键词（仅支持单个关键词）"
    )
    exclude_keywords: List[str] = Field(
        default=[],
        description="主题不能包含的关键词（负向排除），如：测试、广告、垃圾等"
    )
    sender_filters: List[str] = Field(
        default=[],
        description="发件人过滤（为空表示不过滤）"
    )
    max_emails: Optional[int] = Field(
        None,
        ge=1,
        le=10000,
        description="最大扫描邮件数量"
    )
    download_attachments: bool = Field(
        True,
        description="是否下载附件"
    )
    attachment_types: List[str] = Field(
        default=[".pdf", ".jpg", ".jpeg", ".png"],
        description="支持的附件类型"
    )
    max_attachment_size: int = Field(
        default=10485760,  # 10MB
        ge=1024,
        description="最大附件大小（字节）"
    )
    
    @field_validator('date_from', 'date_to')
    @classmethod
    def validate_dates(cls, v, info):
        """验证日期范围"""
        if info.field_name == 'date_to' and v:
            date_from = info.data.get('date_from')
            if date_from and v < date_from:
                raise ValueError("结束日期不能早于开始日期")
        return v
    
    @field_validator('subject_keywords')
    @classmethod
    def validate_subject_keywords(cls, v):
        """验证主题关键词数量"""
        if len(v) > 1:
            raise ValueError("仅支持单个关键词查询，请只提供一个关键词")
        return v


class EmailScanJobCreate(BaseModel):
    """创建扫描任务请求"""
    
    email_account_id: Union[UUID, str] = Field(..., description="邮箱账户ID")
    job_type: ScanJobType = Field(
        default=ScanJobType.MANUAL,
        description="任务类型"
    )
    scan_params: ScanParams = Field(..., description="扫描参数")
    description: Optional[str] = Field(
        None,
        max_length=500,
        description="任务描述"
    )
    
    @field_validator('email_account_id', mode='before')
    @classmethod
    def validate_email_account_id(cls, v):
        """验证并转换邮箱账户ID"""
        if isinstance(v, str):
            try:
                return UUID(v)
            except ValueError:
                raise ValueError("无效的UUID格式")
        return v


class EmailScanJobResponse(BaseModel):
    """扫描任务响应"""
    
    id: Union[UUID, str] = Field(..., description="任务数据库ID")
    job_id: str = Field(..., description="任务唯一ID")
    user_id: Union[UUID, str] = Field(..., description="用户ID")
    email_account_id: Union[UUID, str] = Field(..., description="邮箱账户ID")
    job_type: ScanJobType = Field(..., description="任务类型")
    status: ScanJobStatus = Field(..., description="任务状态")
    description: Optional[str] = Field(None, description="任务描述")
    
    # 进度信息
    progress: Optional[int] = Field(None, ge=0, le=100, description="进度百分比")
    current_step: Optional[str] = Field(None, description="当前执行步骤")
    
    # 统计信息
    total_emails: Optional[int] = Field(None, description="总邮件数")
    scanned_emails: Optional[int] = Field(None, description="已扫描邮件数")
    matched_emails: Optional[int] = Field(None, description="匹配的邮件数")
    downloaded_attachments: Optional[int] = Field(None, description="下载的附件数")
    processed_invoices: Optional[int] = Field(None, description="处理的发票数")
    
    # 时间信息
    created_at: datetime = Field(..., description="创建时间")
    started_at: Optional[datetime] = Field(None, description="开始时间")
    completed_at: Optional[datetime] = Field(None, description="完成时间")
    
    # 结果和错误
    scan_results: Optional[Dict[str, Any]] = Field(None, description="扫描结果")
    error_message: Optional[str] = Field(None, description="错误信息")
    
    @field_validator('id', 'user_id', 'email_account_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        """将UUID对象转换为字符串"""
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True


class EmailScanJobList(BaseListResponse[EmailScanJobResponse]):
    """扫描任务列表响应
    
    继承自 BaseListResponse，提供标准的分页列表响应格式
    """
    pass


class ScanResultEmail(BaseModel):
    """扫描结果中的邮件信息"""
    
    email_id: str = Field(..., description="邮件ID")
    subject: str = Field(..., description="邮件主题")
    from_address: str = Field(..., description="发件人")
    date: datetime = Field(..., description="邮件日期")
    has_attachments: bool = Field(..., description="是否有附件")
    attachment_names: List[str] = Field(default=[], description="附件名称列表")
    matched: bool = Field(..., description="是否匹配发票规则")
    processed: bool = Field(..., description="是否已处理")


class ScanResultAttachment(BaseModel):
    """扫描结果中的附件信息"""
    
    email_id: str = Field(..., description="所属邮件ID")
    filename: str = Field(..., description="附件文件名")
    file_size: int = Field(..., description="文件大小")
    file_path: str = Field(..., description="本地保存路径")
    content_type: str = Field(..., description="文件类型")
    is_invoice: bool = Field(..., description="是否为发票文件")
    processed: bool = Field(..., description="是否已处理")


class ScanResultInvoice(BaseModel):
    """扫描结果中的发票信息"""
    
    attachment_id: str = Field(..., description="关联的附件ID")
    invoice_number: Optional[str] = Field(None, description="发票号码")
    invoice_date: Optional[date] = Field(None, description="发票日期")
    seller_name: Optional[str] = Field(None, description="销售方名称")
    total_amount: Optional[float] = Field(None, description="发票金额")
    tax_amount: Optional[float] = Field(None, description="税额")
    extracted_data: Optional[Dict[str, Any]] = Field(None, description="提取的原始数据")
    processing_status: str = Field(..., description="处理状态")
    error_message: Optional[str] = Field(None, description="处理错误信息")


class ScanProgressResponse(BaseModel):
    """扫描进度响应"""
    
    job_id: str = Field(..., description="任务ID")
    status: ScanJobStatus = Field(..., description="任务状态")
    progress: int = Field(..., ge=0, le=100, description="进度百分比")
    current_step: Optional[str] = Field(None, description="当前步骤")
    total_emails: int = Field(default=0, description="总邮件数")
    scanned_emails: int = Field(default=0, description="已扫描数")
    matched_emails: int = Field(default=0, description="匹配数")
    downloaded_attachments: int = Field(default=0, description="下载附件数")
    processed_invoices: int = Field(default=0, description="处理发票数")
    error_message: Optional[str] = Field(None, description="错误信息")
    started_at: Optional[datetime] = Field(None, description="开始时间")
    completed_at: Optional[datetime] = Field(None, description="完成时间")


class ScanResultsResponse(BaseModel):
    """扫描结果详情响应"""
    
    emails: List[ScanResultEmail] = Field(default=[], description="邮件列表")
    attachments: List[ScanResultAttachment] = Field(default=[], description="附件列表")
    invoices: List[ScanResultInvoice] = Field(default=[], description="发票列表")
    errors: List[Dict[str, str]] = Field(default=[], description="错误列表")
    
    # 统计信息
    total_emails: int = Field(default=0, description="总邮件数")
    scanned_emails: int = Field(default=0, description="已扫描邮件数")
    matched_emails: int = Field(default=0, description="匹配邮件数")
    downloaded_attachments: int = Field(default=0, description="下载附件数")
    processed_invoices: int = Field(default=0, description="处理发票数")


class EmailFolderInfo(BaseModel):
    """邮箱文件夹信息"""
    
    name: str = Field(..., description="文件夹名称")
    path: str = Field(..., description="文件夹路径")
    email_count: Optional[int] = Field(None, description="邮件数量")
    has_children: bool = Field(default=False, description="是否有子文件夹")
    selectable: bool = Field(default=True, description="是否可选择扫描")


class EmailAccountFoldersResponse(BaseModel):
    """邮箱账户文件夹列表响应"""
    
    account_id: Union[UUID, str] = Field(..., description="邮箱账户ID")
    folders: List[EmailFolderInfo] = Field(..., description="文件夹列表")
    default_folder: str = Field(default="INBOX", description="默认扫描文件夹")