"""
增强版邮件扫描API - 基于Python imap-tools库

提供完整的邮件扫描、内容提取、附件检测功能。
支持：
1. 邮件连接和认证
2. 邮件搜索和筛选（支持中文UTF-8编码）
3. 邮件内容和正文提取
4. PDF附件智能检测和下载
5. 中文邮件内容正确解码
"""

import os
import logging
import re
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta, timezone, date
from email.header import decode_header
from email.utils import parsedate_to_datetime
from fastapi import APIRouter, Depends, Query, Path, Body, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field, validator
from imap_tools import MailBox, AND, OR, NOT, MailMessage
from imap_tools.errors import MailboxLoginError, MailboxFolderSelectError

from app.core.database import get_db
from app.core.dependencies import get_current_user, CurrentUser
from app.schemas.base_response import BaseResponse, BaseListResponse
from pydantic import BaseModel
from typing import Optional, Any, Dict

class DataResponse(BaseModel):
    """带数据字段的响应"""
    data: Optional[Any] = None
    message: str = "操作成功"
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
from app.services.email_account_service import EmailAccountService

logger = logging.getLogger(__name__)

router = APIRouter()

# === 请求/响应模型 ===

class EmailConnectionConfig(BaseModel):
    """邮件连接配置"""
    host: str = Field(..., description="IMAP服务器地址")
    port: int = Field(993, description="端口号")
    tls: bool = Field(True, description="是否使用TLS")
    username: str = Field(..., description="邮箱用户名")
    password: str = Field(..., description="邮箱密码/授权码")

class EmailSearchParams(BaseModel):
    """邮件搜索参数"""
    folders: List[str] = Field(default=["INBOX"], description="搜索的文件夹")
    subject_keywords: List[str] = Field(default=[], description="主题关键词")
    exclude_keywords: List[str] = Field(default=[], description="排除关键词") 
    sender_filters: List[str] = Field(default=[], description="发件人筛选")
    date_from: Optional[str] = Field(None, description="开始日期 YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="结束日期 YYYY-MM-DD")
    max_emails: int = Field(100, ge=1, le=500, description="最大邮件数量")

class EmailScanRequest(BaseModel):
    """邮件扫描请求"""
    email_account_id: str = Field(..., description="邮箱账户ID") 
    search_params: EmailSearchParams = Field(..., description="搜索参数")
    extract_content: bool = Field(True, description="是否提取邮件内容")
    extract_attachments: bool = Field(True, description="是否检测PDF附件")
    download_attachments: bool = Field(False, description="是否下载附件")

class EmailAttachmentInfo(BaseModel):
    """邮件附件信息"""
    filename: str
    type: str
    subtype: str
    size: int
    encoding: str
    section: str
    is_pdf: bool = False
    content: Optional[bytes] = Field(None, description="附件内容（仅在download_attachments=True时提供）")

class EmailContentInfo(BaseModel):
    """邮件内容信息"""
    message_id: int
    uid: str
    subject: str
    sender: str
    date: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    attachments: List[EmailAttachmentInfo] = []

class EmailScanResult(BaseModel):
    """邮件扫描结果"""
    total_found: int
    emails_analyzed: int
    pdf_attachments_found: int
    scan_duration: float
    emails: List[EmailContentInfo]

class ImapTestRequest(BaseModel):
    """IMAP测试请求"""
    test_type: str = Field(..., description="测试类型: connection|search|download")
    email_config: EmailConnectionConfig = Field(..., description="邮箱配置")
    search_params: Optional[EmailSearchParams] = Field(None, description="搜索参数")

# === Python IMAP 工具类 ===

class PythonImapIntegrator:
    """Python IMAP集成器 - 使用imap-tools库提供邮件扫描功能"""
    
    @staticmethod
    def decode_email_header(header_value: str) -> str:
        """解码邮件头部信息（支持中文）"""
        if not header_value:
            return ""
        
        try:
            decoded_fragments = decode_header(header_value)
            decoded_string = ""
            
            for fragment, encoding in decoded_fragments:
                if isinstance(fragment, bytes):
                    if encoding:
                        decoded_string += fragment.decode(encoding)
                    else:
                        # 尝试常用编码
                        for enc in ['utf-8', 'gb2312', 'gbk', 'big5']:
                            try:
                                decoded_string += fragment.decode(enc)
                                break
                            except:
                                continue
                        else:
                            decoded_string += fragment.decode('utf-8', errors='ignore')
                else:
                    decoded_string += str(fragment)
            
            return decoded_string.strip()
        except Exception as e:
            logger.warning(f"邮件头解码失败: {e}, 原始值: {header_value}")
            return str(header_value)
    
    @staticmethod
    def test_connection(config: EmailConnectionConfig) -> Dict[str, Any]:
        """测试邮箱连接"""
        try:
            with MailBox(config.host, config.port).login(config.username, config.password) as mailbox:
                # 获取邮箱状态
                info = mailbox.folder.status('INBOX')
                
                return {
                    "connected": True,
                    "total_messages": info.get('MESSAGES', 0),
                    "unseen_messages": info.get('UNSEEN', 0)
                }
                
        except MailboxLoginError as e:
            logger.error(f"IMAP登录失败: {str(e)}")
            return {
                "connected": False,
                "error": f"登录失败: {str(e)}"
            }
        except Exception as e:
            logger.error(f"IMAP连接测试失败: {str(e)}")
            return {
                "connected": False,
                "error": f"连接错误: {str(e)}"
            }
    
    @staticmethod 
    def search_emails(config: EmailConnectionConfig, search_params: EmailSearchParams) -> Dict[str, Any]:
        """搜索邮件"""
        try:
            with MailBox(config.host, config.port).login(config.username, config.password) as mailbox:
                # 构建搜索条件
                criteria = []
                
                # 注意：中文关键词搜索可能遇到编码问题，我们将在获取邮件后进行本地筛选
                
                # 发件人筛选
                if search_params.sender_filters:
                    sender_criteria = []
                    for sender in search_params.sender_filters:
                        sender_criteria.append(AND(from_=sender))
                    if sender_criteria:
                        criteria.extend(sender_criteria)
                
                # 日期范围搜索
                if search_params.date_from:
                    try:
                        date_from = datetime.strptime(search_params.date_from, '%Y-%m-%d').date()
                        criteria.append(AND(date_gte=date_from))
                    except ValueError:
                        logger.warning(f"日期格式错误: {search_params.date_from}")
                
                if search_params.date_to:
                    try:
                        date_to = datetime.strptime(search_params.date_to, '%Y-%m-%d').date()
                        criteria.append(AND(date_lt=date_to + timedelta(days=1)))
                    except ValueError:
                        logger.warning(f"日期格式错误: {search_params.date_to}")
                
                # 如果没有搜索条件，搜索最近的邮件
                if not criteria:
                    date_from = (datetime.now() - timedelta(days=7)).date()
                    criteria.append(AND(date_gte=date_from))
                
                # 组合搜索条件
                if len(criteria) == 1:
                    search_criteria = criteria[0]
                else:
                    search_criteria = AND(*criteria)
                
                # 执行搜索 - 获取基础邮件列表
                # 为了避免中文搜索编码问题，我们获取更多邮件然后本地筛选
                search_limit = max(search_params.max_emails * 3, 100)  # 获取更多邮件用于筛选
                all_messages = list(mailbox.fetch(search_criteria, limit=search_limit, reverse=True))
                
                logger.info(f"获取到 {len(all_messages)} 封邮件，开始本地筛选...")
                
                # 本地筛选 - 主题关键词
                messages = all_messages
                if search_params.subject_keywords:
                    filtered_messages = []
                    for msg in messages:
                        subject = PythonImapIntegrator.decode_email_header(msg.subject or "")
                        matches_keyword = False
                        for keyword in search_params.subject_keywords:
                            if keyword.lower() in subject.lower():
                                matches_keyword = True
                                break
                        if matches_keyword:
                            filtered_messages.append(msg)
                    messages = filtered_messages
                    logger.info(f"关键词筛选后剩余 {len(messages)} 封邮件")
                
                # 过滤排除关键词
                if search_params.exclude_keywords:
                    filtered_messages = []
                    for msg in messages:
                        subject = PythonImapIntegrator.decode_email_header(msg.subject or "")
                        should_exclude = False
                        for exclude_keyword in search_params.exclude_keywords:
                            if exclude_keyword.lower() in subject.lower():
                                should_exclude = True
                                break
                        if not should_exclude:
                            filtered_messages.append(msg)
                    messages = filtered_messages
                    logger.info(f"排除关键词筛选后剩余 {len(messages)} 封邮件")
                
                # 限制最终结果数量
                messages = messages[:search_params.max_emails]
                
                message_ids = [msg.uid for msg in messages]
                
                return {
                    "total_found": len(message_ids),
                    "message_ids": message_ids[:search_params.max_emails],
                    "messages": messages[:search_params.max_emails]  # 返回消息对象供后续处理
                }
                
        except Exception as e:
            logger.error(f"邮件搜索失败: {str(e)}")
            return {
                "success": False,
                "error": f"搜索错误: {str(e)}"
            }
    
    @staticmethod
    def extract_email_content(
        config: EmailConnectionConfig, 
        messages: List[MailMessage],
        extract_attachments: bool = True,
        download_attachments: bool = False
    ) -> Dict[str, Any]:
        """提取邮件内容和附件信息"""
        try:
            emails = []
            pdf_count = 0
            processing_start = datetime.now()
            
            logger.info(f"开始处理 {len(messages)} 封邮件，download_attachments={download_attachments}")
            
            for i, msg in enumerate(messages):
                try:
                    msg_start = datetime.now()
                    logger.info(f"处理邮件 {i+1}/{len(messages)}: {msg.uid}")
                    
                    # 解码邮件信息
                    subject = PythonImapIntegrator.decode_email_header(msg.subject or "无主题")
                    sender = msg.from_ or "未知发件人"
                    date_str = msg.date.isoformat() if msg.date else "未知日期"
                    
                    email_info = {
                        "message_id": msg.uid,
                        "uid": str(msg.uid),
                        "subject": subject,
                        "sender": sender,
                        "date": date_str,
                        "body_text": msg.text or "",
                        "body_html": msg.html or "",
                        "attachments": []
                    }
                    
                    # 检测PDF附件
                    if extract_attachments:
                        attachment_count = 0
                        for att in msg.attachments:
                            try:
                                att_start = datetime.now()
                                attachment_count += 1
                                
                                # 解码附件文件名
                                filename = PythonImapIntegrator.decode_email_header(att.filename or f"attachment_{attachment_count}")
                                
                                # 检查是否为PDF
                                is_pdf = (
                                    filename.lower().endswith('.pdf') or
                                    att.content_type == 'application/pdf' or
                                    'pdf' in att.content_type.lower()
                                )
                                
                                if is_pdf:
                                    pdf_count += 1
                                    logger.info(f"找到PDF附件: {filename}")
                                
                                # 获取附件大小（如果需要下载内容，可能会很慢）
                                attachment_size = 0
                                attachment_content = None
                                
                                if download_attachments and is_pdf:
                                    logger.info(f"正在下载PDF附件: {filename}")
                                    try:
                                        if att.payload:
                                            attachment_content = att.payload
                                            attachment_size = len(att.payload)
                                            logger.info(f"PDF附件下载完成: {filename} ({attachment_size} bytes)")
                                        else:
                                            logger.warning(f"PDF附件内容为空: {filename}")
                                    except Exception as download_error:
                                        logger.error(f"下载PDF附件失败 {filename}: {download_error}")
                                        # 继续处理，不中断整个流程
                                else:
                                    # 不下载内容时，只获取大小信息
                                    try:
                                        attachment_size = len(att.payload) if att.payload else 0
                                    except:
                                        attachment_size = 0
                                
                                attachment_info = {
                                    "filename": filename,
                                    "type": att.content_type.split('/')[0].upper(),
                                    "subtype": att.content_type.split('/')[-1].upper(),
                                    "size": attachment_size,
                                    "encoding": "BASE64",  # imap-tools默认处理
                                    "section": str(len(email_info["attachments"]) + 1),
                                    "is_pdf": is_pdf,
                                    "content": attachment_content  # 只在download_attachments=True且是PDF时提供
                                }
                                
                                email_info["attachments"].append(attachment_info)
                                
                                att_duration = (datetime.now() - att_start).total_seconds()
                                logger.info(f"附件处理完成: {filename} (耗时: {att_duration:.2f}秒)")
                                
                            except Exception as att_error:
                                logger.error(f"处理附件失败: {att_error}")
                                continue  # 跳过这个附件，继续处理其他附件
                    
                    emails.append(email_info)
                    
                    msg_duration = (datetime.now() - msg_start).total_seconds()
                    logger.info(f"邮件处理完成: {subject[:50]} (耗时: {msg_duration:.2f}秒)")
                    
                    # 检查总处理时间，避免超时
                    total_duration = (datetime.now() - processing_start).total_seconds()
                    if total_duration > 90:  # 90秒超时保护
                        logger.warning(f"处理时间过长 ({total_duration:.2f}秒)，停止处理剩余邮件")
                        break
                    
                except Exception as e:
                    logger.warning(f"处理邮件 {msg.uid} 失败: {str(e)}")
                    continue
            
            total_duration = (datetime.now() - processing_start).total_seconds()
            logger.info(f"邮件内容提取完成，耗时: {total_duration:.2f}秒")
            
            return {
                "total_found": len(messages),
                "emails_analyzed": len(emails),
                "pdf_attachments_found": pdf_count,
                "emails": emails,
                "success": True,
                "processing_duration": total_duration
            }
            
        except Exception as e:
            logger.error(f"邮件内容提取失败: {str(e)}")
            return {
                "success": False,
                "error": f"内容提取错误: {str(e)}"
            }

# === API端点 ===

@router.post("/test-connection")
async def test_email_connection(
    request: ImapTestRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """测试邮箱连接
    
    使用imap-tools测试邮箱连接，验证配置是否正确。
    """
    try:
        result = PythonImapIntegrator.test_connection(request.email_config)
        
        return DataResponse(
            data=result,
            message="连接测试完成" if result.get("connected") else "连接测试失败"
        )
        
    except Exception as e:
        logger.error(f"连接测试API错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"连接测试失败: {str(e)}"
        )

@router.post("/scan-emails")
async def scan_emails(
    request: EmailScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """扫描邮件内容和附件
    
    完整的邮件扫描功能：
    1. 连接指定邮箱
    2. 根据搜索条件查找邮件
    3. 提取邮件内容和正文
    4. 检测和分析PDF附件
    5. 返回结构化的扫描结果
    """
    try:
        start_time = datetime.now()
        
        # 获取邮箱账户配置
        email_account = await EmailAccountService.get_email_account(
            db=db,
            account_id=request.email_account_id,
            user_id=str(current_user.id)
        )
        
        if not email_account.is_active:
            raise HTTPException(
                status_code=400,
                detail="邮箱账户已停用"
            )
        
        # 构建连接配置
        from app.utils.encryption import decrypt_email_password
        
        email_config = EmailConnectionConfig(
            host=email_account.imap_host,
            port=email_account.imap_port,
            tls=email_account.imap_use_ssl,
            username=email_account.email_address,
            password=decrypt_email_password(email_account.encrypted_password)
        )
        
        # 1. 搜索邮件
        search_result = PythonImapIntegrator.search_emails(
            email_config, 
            request.search_params
        )
        
        if not search_result.get("messages"):
            return DataResponse(
                data=EmailScanResult(
                    total_found=0,
                    emails_analyzed=0,
                    pdf_attachments_found=0,
                    scan_duration=0,
                    emails=[]
                ),
                message="未找到符合条件的邮件"
            )
        
        # 2. 提取邮件内容
        if request.extract_content:
            content_result = PythonImapIntegrator.extract_email_content(
                email_config,
                search_result["messages"],
                request.extract_attachments,
                request.download_attachments
            )
            
            if content_result.get("success", True):
                # 转换数据格式
                emails = []
                for email_data in content_result.get("emails", []):
                    attachments = []
                    for att in email_data.get("attachments", []):
                        attachments.append(EmailAttachmentInfo(**att))
                    
                    emails.append(EmailContentInfo(
                        message_id=email_data["message_id"],
                        uid=email_data["uid"],
                        subject=email_data["subject"],
                        sender=email_data["sender"],
                        date=email_data["date"],
                        body_text=email_data.get("body_text"),
                        body_html=email_data.get("body_html"),
                        attachments=attachments
                    ))
                
                scan_duration = (datetime.now() - start_time).total_seconds()
                
                result = EmailScanResult(
                    total_found=search_result["total_found"],
                    emails_analyzed=content_result.get("emails_analyzed", 0),
                    pdf_attachments_found=content_result.get("pdf_attachments_found", 0),
                    scan_duration=scan_duration,
                    emails=emails
                )
                
                return DataResponse(
                    data=result,
                    message=f"扫描完成，找到 {result.total_found} 封邮件，其中 {result.pdf_attachments_found} 个PDF附件"
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"内容提取失败: {content_result.get('error')}"
                )
        else:
            # 只返回搜索结果
            scan_duration = (datetime.now() - start_time).total_seconds()
            
            result = EmailScanResult(
                total_found=search_result["total_found"],
                emails_analyzed=0,
                pdf_attachments_found=0,
                scan_duration=scan_duration,
                emails=[]
            )
            
            return DataResponse(
                data=result,
                message=f"搜索完成，找到 {result.total_found} 封邮件"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"邮件扫描失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"邮件扫描失败: {str(e)}"
        )

@router.post("/quick-scan/{email_account_id}")
async def quick_scan_emails(
    email_account_id: str = Path(..., description="邮箱账户ID"),
    keywords: List[str] = Query(default=["发票"], description="搜索关键词"),
    days: int = Query(default=7, ge=1, le=180, description="搜索天数"),
    max_emails: int = Query(default=20, ge=1, le=500, description="最大邮件数"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """快速邮件扫描
    
    简化版邮件扫描API，适合快速测试和常用场景：
    - 搜索指定天数内的邮件（最多180天）
    - 支持关键词筛选
    - 自动检测PDF附件
    - 返回邮件基本信息和附件列表
    """
    try:
        # 构建搜索参数
        date_from = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        search_params = EmailSearchParams(
            subject_keywords=keywords[:1],  # 只支持一个关键词
            date_from=date_from,
            max_emails=max_emails
        )
        
        # 构建扫描请求
        scan_request = EmailScanRequest(
            email_account_id=email_account_id,
            search_params=search_params,
            extract_content=True,
            extract_attachments=True,
            download_attachments=False
        )
        
        # 执行扫描
        return await scan_emails(scan_request, db, current_user)
        
    except Exception as e:
        logger.error(f"快速扫描失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"快速扫描失败: {str(e)}"
        )

@router.get("/supported-providers")
async def get_supported_email_providers():
    """获取支持的邮箱服务商配置
    
    返回常用邮箱服务商的IMAP配置信息。
    """
    providers = {
        "qq": {
            "name": "QQ邮箱",
            "host": "imap.qq.com",
            "port": 993,
            "tls": True,
            "auth_note": "需要在QQ邮箱设置中生成授权码，不是登录密码"
        },
        "163": {
            "name": "163邮箱", 
            "host": "imap.163.com",
            "port": 993,
            "tls": True,
            "auth_note": "需要在163邮箱设置中开启IMAP并设置客户端授权密码"
        },
        "126": {
            "name": "126邮箱",
            "host": "imap.126.com", 
            "port": 993,
            "tls": True,
            "auth_note": "需要在126邮箱设置中开启IMAP并设置客户端授权密码"
        },
        "gmail": {
            "name": "Gmail",
            "host": "imap.gmail.com",
            "port": 993, 
            "tls": True,
            "auth_note": "需要开启两步验证并生成应用专用密码"
        },
        "outlook": {
            "name": "Outlook/Hotmail",
            "host": "outlook.office365.com",
            "port": 993,
            "tls": True,
            "auth_note": "使用Microsoft账户密码或应用密码"
        }
    }
    
    return DataResponse(
        data=providers,
        message="支持的邮箱服务商配置信息"
    )

@router.get("/health")
async def health_check():
    """健康检查端点"""
    try:
        # 检查imap-tools是否可用
        from imap_tools import MailBox
        
        return DataResponse(
            data={
                "service": "email-scan-enhanced",
                "status": "healthy",
                "imap_tools_available": True,
                "timestamp": datetime.now().isoformat()
            },
            message="邮件扫描服务运行正常"
        )
            
    except Exception as e:
        return DataResponse(
            data={
                "service": "email-scan-enhanced",
                "status": "unhealthy", 
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            },
            message=f"健康检查失败: {str(e)}"
        )