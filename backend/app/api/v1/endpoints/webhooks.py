"""
Webhook端点实现
处理来自外部服务的Webhook请求，主要是Mailgun邮件接收通知
"""

import hashlib
import hmac
import json
import re
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_async_db
from app.core.dependencies import get_current_user_optional
from app.utils.logger import get_logger
from app.services.email_processor import EmailProcessor
from app.services.postgresql_task_processor import task_queue

logger = get_logger(__name__)
router = APIRouter()


class MailgunWebhookPayload(BaseModel):
    """Mailgun Webhook负载模型"""
    signature: Dict[str, Any] = Field(..., description="Mailgun签名信息")
    event_data: Dict[str, Any] = Field(..., description="邮件事件数据")
    
    class Config:
        extra = "allow"


class EmailReceivedData(BaseModel):
    """邮件接收数据模型"""
    recipient: EmailStr = Field(..., description="收件人邮箱")
    sender: EmailStr = Field(..., description="发件人邮箱")
    subject: str = Field(..., description="邮件主题")
    body_plain: Optional[str] = Field(None, description="纯文本内容")
    body_html: Optional[str] = Field(None, description="HTML内容")
    attachments: list = Field(default_factory=list, description="附件列表")
    timestamp: int = Field(..., description="时间戳")
    message_id: str = Field(..., description="邮件ID")


def verify_mailgun_signature(
    token: str, 
    timestamp: str, 
    signature: str,
    webhook_signing_key: str
) -> bool:
    """
    验证Mailgun Webhook签名
    
    Args:
        token: Mailgun提供的token
        timestamp: 时间戳
        signature: 签名
        webhook_signing_key: Webhook签名密钥
        
    Returns:
        bool: 签名是否有效
    """
    try:
        # 构造签名字符串
        signature_data = f"{timestamp}{token}".encode('utf-8')
        
        # 使用HMAC-SHA256生成期望的签名
        expected_signature = hmac.new(
            webhook_signing_key.encode('utf-8'),
            signature_data,
            hashlib.sha256
        ).hexdigest()
        
        # 比较签名
        return hmac.compare_digest(signature, expected_signature)
        
    except Exception as e:
        logger.error(f"验证Mailgun签名时出错: {e}")
        return False


def extract_user_id_from_email(recipient: str) -> Optional[str]:
    """
    从邮件地址提取用户ID
    
    期望格式: invoice-{user_id}@yourdomain.com
    
    Args:
        recipient: 收件人邮箱地址
        
    Returns:
        str: 用户ID，如果无法提取则返回None
    """
    try:
        # 匹配 invoice-{uuid}@domain.com 格式
        pattern = r'invoice-([a-f0-9\-]{36})@'
        match = re.match(pattern, recipient.lower())
        
        if match:
            return match.group(1)
            
        logger.warning(f"无法从邮箱地址提取用户ID: {recipient}")
        return None
        
    except Exception as e:
        logger.error(f"提取用户ID时出错: {e}")
        return None


@router.post("/email-received")
async def handle_email_received_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db)
):
    """
    处理Mailgun邮件接收Webhook
    
    验证流程：
    1. 验证Mailgun签名
    2. 解析邮件数据
    3. 提取用户ID
    4. 推送到后台任务处理
    5. 返回成功响应
    """
    try:
        # 获取请求头
        signature = request.headers.get("X-Mailgun-Signature-V2")
        timestamp = request.headers.get("X-Mailgun-Timestamp")
        token = request.headers.get("X-Mailgun-Token")
        
        if not all([signature, timestamp, token]):
            logger.warning("Mailgun Webhook缺少必要的签名头")
            raise HTTPException(
                status_code=400, 
                detail="Missing Mailgun signature headers"
            )
        
        # 验证签名（开发环境跳过）
        if hasattr(settings, 'MAILGUN_WEBHOOK_SIGNING_KEY') and settings.MAILGUN_WEBHOOK_SIGNING_KEY:
            if not verify_mailgun_signature(
                token, 
                timestamp, 
                signature, 
                settings.MAILGUN_WEBHOOK_SIGNING_KEY
            ):
                logger.warning("Mailgun Webhook签名验证失败")
                raise HTTPException(
                    status_code=403, 
                    detail="Invalid Mailgun signature"
                )
        else:
            logger.info("开发环境：跳过Mailgun签名验证")
        
        # 解析请求数据
        form_data = await request.form()
        
        # 构造邮件数据
        email_data = {
            "recipient": form_data.get("recipient"),
            "sender": form_data.get("sender"), 
            "subject": form_data.get("subject", ""),
            "body_plain": form_data.get("body-plain", ""),
            "body_html": form_data.get("body-html", ""),
            "timestamp": int(timestamp),
            "message_id": form_data.get("Message-Id", ""),
            "attachments": []
        }
        
        # 处理附件信息
        attachment_count = int(form_data.get("attachment-count", 0))
        for i in range(1, attachment_count + 1):
            attachment_info = {
                "name": form_data.get(f"attachment-{i}"),
                "url": form_data.get(f"attachment-{i}"),
                "content_type": form_data.get(f"content-type-{i}", ""),
                "size": form_data.get(f"size-{i}", "0")
            }
            if attachment_info["name"]:
                email_data["attachments"].append(attachment_info)
        
        # 提取用户ID
        user_id = extract_user_id_from_email(email_data["recipient"])
        if not user_id:
            logger.warning(f"无法提取用户ID，忽略邮件: {email_data['recipient']}")
            return {"status": "ignored", "reason": "invalid_recipient"}
        
        email_data["user_id"] = user_id
        
        # 记录邮件接收
        logger.info(
            f"接收到邮件 - 用户: {user_id}, 发件人: {email_data['sender']}, "
            f"主题: {email_data['subject']}, 附件数: {len(email_data['attachments'])}"
        )
        
        # 使用PostgreSQL任务队列
        task_id = await task_queue.enqueue(
            task_type="email_processing",
            payload=email_data,
            user_id=user_id
        )
        logger.info(f"邮件任务已推送到PostgreSQL队列 - 用户: {user_id}, 任务ID: {task_id}")
        
        return {
            "status": "accepted",
            "message": "Email queued for processing",
            "user_id": user_id,
            "task_id": task_id,
            "attachments": len(email_data["attachments"])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"处理邮件Webhook时出错: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Internal server error processing email webhook"
        )


async def process_incoming_email_task(email_data: dict, db_url: str):
    """
    后台任务：处理邮件数据
    
    Args:
        email_data: 邮件数据字典
        db_url: 数据库连接URL
    """
    try:
        # 使用PostgreSQL队列处理异步任务
        from app.services.postgresql_task_processor import enqueue_email_processing
        
        # 异步调用PostgreSQL任务队列
        task_id = await enqueue_email_processing(email_data)
        
        logger.info(f"邮件处理任务已推送到队列 - 用户: {email_data['user_id']}, 任务ID: {task_id}")
        
    except Exception as e:
        logger.error(f"推送邮件处理任务失败: {e}")


@router.get("/test-webhook")
async def test_webhook_endpoint():
    """
    测试Webhook端点
    用于验证端点是否正常工作
    """
    return {
        "status": "ok",
        "message": "Webhook endpoint is working",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0"
    }


@router.post("/test-simple")
async def test_simple_email_processing():
    """
    简单测试端点 - 不依赖数据库
    """
    try:
        # 创建测试邮件数据
        test_email_data = {
            "user_id": "550e8400-e29b-41d4-a716-446655440000",
            "recipient": "invoice-550e8400-e29b-41d4-a716-446655440000@test.example.com",
            "sender": "test@example.com",
            "subject": "测试发票邮件",
            "body_plain": "这是一个测试邮件。",
            "timestamp": int(datetime.utcnow().timestamp()),
            "message_id": f"test-{datetime.utcnow().timestamp()}@test.example.com",
            "attachments": []
        }
        
        # 使用TaskDispatcher发送任务
        task_id = TaskDispatcher.send_email_task(test_email_data)
        
        return {
            "status": "test_queued",
            "message": "Test email processing queued",
            "task_id": task_id,
            "user_id": test_email_data["user_id"]
        }
        
    except Exception as e:
        logger.error(f"简单测试失败: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


@router.post("/test-email-processing")
async def test_email_processing(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(get_current_user_optional)
):
    """
    测试邮件处理功能
    创建一个模拟邮件进行处理测试
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # 创建测试邮件数据
    test_email_data = {
        "user_id": str(current_user.id),
        "recipient": f"invoice-{current_user.id}@test.example.com",
        "sender": "test@example.com",
        "subject": "测试发票邮件",
        "body_plain": "这是一个测试邮件，包含发票附件。",
        "body_html": "<p>这是一个测试邮件，包含发票附件。</p>",
        "timestamp": int(datetime.utcnow().timestamp()),
        "message_id": f"test-{datetime.utcnow().timestamp()}@test.example.com",
        "attachments": [
            {
                "name": "test-invoice.pdf",
                "url": "https://example.com/test-invoice.pdf",
                "content_type": "application/pdf",
                "size": "12345"
            }
        ]
    }
    
    # 推送到后台任务处理
    background_tasks.add_task(
        process_incoming_email_task,
        test_email_data,
        str(db.bind.url)
    )
    
    return {
        "status": "test_queued",
        "message": "Test email processing queued",
        "user_id": current_user.id
    }