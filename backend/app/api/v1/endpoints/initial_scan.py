"""
初次邮件扫描API端点

专门用于新用户邮箱账户的初次全量扫描
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.services.incremental_scan_service import PythonImapIntegrator
from app.services.email_account_service import EmailAccountService
from app.schemas.base_response import BaseResponse
from app.models.email_account import EmailAccount

logger = logging.getLogger(__name__)

router = APIRouter()

class InitialScanRequest(BaseModel):
    """初次扫描请求"""
    email_account_id: str = Field(..., description="邮箱账户ID")
    search_params: Dict = Field(..., description="搜索参数")
    extract_content: bool = Field(True, description="是否提取邮件内容")
    extract_attachments: bool = Field(True, description="是否提取附件信息")
    download_attachments: bool = Field(False, description="是否下载附件内容")

class EmailMessageResponse(BaseModel):
    """邮件信息响应"""
    uid: str
    message_id: Optional[str] = None
    subject: str
    sender: str
    recipient: Optional[str] = None
    date: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    attachments: List[Dict[str, Any]] = []

class InitialScanResponse(BaseModel):
    """初次扫描响应"""
    success: bool
    total_found: int
    emails_analyzed: int
    pdf_attachments_found: int
    scan_duration: float
    emails: List[EmailMessageResponse]

@router.post("/initial-scan")
async def initial_email_scan(
    request: InitialScanRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    初次邮件扫描
    
    用于新用户邮箱账户的初次全量扫描，获取历史邮件信息
    """
    try:
        start_time = datetime.now()
        
        # 获取邮箱账户信息
        email_account = await get_email_account(db, request.email_account_id)
        if not email_account:
            raise HTTPException(
                status_code=404,
                detail="邮箱账户不存在或未激活"
            )
        
        # 构建邮箱连接配置
        email_config = build_email_config(email_account)
        
        # 执行邮件搜索
        search_result = PythonImapIntegrator.search_emails(
            email_config, 
            build_search_params(request.search_params)
        )
        
        if not search_result.get("messages"):
            return BaseResponse(
                data=InitialScanResponse(
                    success=True,
                    total_found=0,
                    emails_analyzed=0,
                    pdf_attachments_found=0,
                    scan_duration=0,
                    emails=[]
                ),
                message="未找到符合条件的邮件"
            )
        
        # 提取邮件内容
        content_result = PythonImapIntegrator.extract_email_content(
            email_config,
            search_result["messages"],
            request.extract_attachments,
            request.download_attachments
        )
        
        if not content_result.get("success", True):
            raise HTTPException(
                status_code=500,
                detail=f"邮件内容提取失败: {content_result.get('error')}"
            )
        
        # 转换邮件数据格式
        emails = []
        pdf_count = 0
        
        for email_data in content_result.get("emails", []):
            # 处理附件信息
            attachments = []
            for att in email_data.get("attachments", []):
                attachment_info = {
                    "filename": att.get("filename", ""),
                    "content_type": f"{att.get('type', 'application')}/{att.get('subtype', 'octet-stream')}",
                    "size": att.get("size", 0),
                    "is_pdf": att.get("is_pdf", False),
                    "encoding": att.get("encoding", ""),
                    "section": att.get("section", "")
                }
                
                if att.get("is_pdf"):
                    pdf_count += 1
                
                attachments.append(attachment_info)
            
            # 构建邮件响应对象
            email_response = EmailMessageResponse(
                uid=str(email_data["uid"]),
                message_id=email_data.get("message_id"),
                subject=email_data["subject"],
                sender=email_data["sender"],
                recipient=email_data.get("recipient"),
                date=email_data["date"],
                body_text=email_data.get("body_text"),
                body_html=email_data.get("body_html"),
                attachments=attachments
            )
            
            emails.append(email_response)
        
        scan_duration = (datetime.now() - start_time).total_seconds()
        
        # 构建响应
        response = InitialScanResponse(
            success=True,
            total_found=search_result["total_found"],
            emails_analyzed=len(emails),
            pdf_attachments_found=pdf_count,
            scan_duration=scan_duration,
            emails=emails
        )
        
        logger.info(f"初次扫描完成: 账户 {email_account.email_address}, "
                   f"找到 {response.total_found} 封邮件, "
                   f"{response.pdf_attachments_found} 个PDF附件")
        
        return BaseResponse(
            data=response,
            message=f"初次扫描完成，分析了 {response.emails_analyzed} 封邮件"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"初次邮件扫描失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"初次邮件扫描失败: {str(e)}"
        )

async def get_email_account(db: AsyncSession, account_id: str) -> Optional[EmailAccount]:
    """获取邮箱账户信息"""
    try:
        from sqlalchemy import select
        
        stmt = select(EmailAccount).where(
            EmailAccount.id == account_id,
            EmailAccount.is_active == True,
            EmailAccount.is_verified == True
        )
        
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
        
    except Exception as e:
        logger.error(f"获取邮箱账户失败: {str(e)}")
        return None

def build_email_config(email_account: EmailAccount) -> Dict:
    """构建邮箱连接配置"""
    from app.utils.encryption import decrypt_email_password
    
    return {
        'host': email_account.imap_host,
        'port': email_account.imap_port,
        'username': email_account.email_address,
        'password': decrypt_email_password(email_account.encrypted_password)
    }

def build_search_params(search_params: Dict):
    """构建搜索参数对象"""
    from app.services.incremental_scan_service import EmailSearchParams
    
    return EmailSearchParams(
        subject_keywords=search_params.get('subject_keywords', []),
        exclude_keywords=search_params.get('exclude_keywords', []),
        sender_filters=search_params.get('sender_filters', []),
        date_from=search_params.get('date_from'),
        date_to=search_params.get('date_to'),
        max_emails=search_params.get('max_emails', 100)
    )

@router.get("/initial-scan-status/{account_id}")
async def get_initial_scan_status(
    account_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取初次扫描任务状态"""
    try:
        # 这需要通过 Supabase API 查询，因为任务信息存储在 Supabase 中
        # 这里简化处理，返回基本状态
        
        return BaseResponse(
            data={
                "account_id": account_id,
                "status": "completed",  # 简化状态
                "message": "请通过前端查询详细扫描状态"
            },
            message="初次扫描状态查询"
        )
        
    except Exception as e:
        logger.error(f"查询初次扫描状态失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"查询状态失败: {str(e)}"
        )

@router.post("/test-initial-scan/{account_id}")
async def test_initial_scan(
    account_id: str,
    days_back: int = 7,
    max_emails: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """测试初次扫描功能"""
    try:
        # 构建测试扫描请求
        test_request = InitialScanRequest(
            email_account_id=account_id,
            search_params={
                "subject_keywords": ["发票", "invoice"],
                "date_from": (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d'),
                "date_to": datetime.now().strftime('%Y-%m-%d'),
                "max_emails": max_emails
            },
            extract_content=True,
            extract_attachments=True,
            download_attachments=False
        )
        
        return await initial_email_scan(test_request, db)
        
    except Exception as e:
        logger.error(f"测试初次扫描失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"测试失败: {str(e)}"
        )