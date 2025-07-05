"""
通知服务模块

提供邮件、短信、Webhook 等多种通知方式的统一接口。
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import httpx
from pydantic import BaseModel, EmailStr, HttpUrl

from app.core.config import Settings
from app.services.mailgun_service import MailgunService

logger = logging.getLogger(__name__)


class NotificationRequest(BaseModel):
    """通知请求模型"""
    type: str  # email, sms, webhook, push
    recipient: str
    subject: Optional[str] = None
    message: str
    metadata: Optional[Dict[str, Any]] = None
    priority: str = "normal"  # low, normal, high


class NotificationResponse(BaseModel):
    """通知响应模型"""
    status: str  # success, failed, pending
    notification_id: str
    notification_type: str
    recipient: str
    sent_at: Optional[str] = None
    error: Optional[str] = None


class NotificationService:
    """通知服务类"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.mailgun_service = MailgunService(settings)
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    async def send_notification(
        self,
        notification: NotificationRequest
    ) -> NotificationResponse:
        """
        发送通知的统一入口
        
        Args:
            notification: 通知请求对象
            
        Returns:
            NotificationResponse: 通知响应
        """
        try:
            if notification.type == "email":
                return await self._send_email(notification)
            elif notification.type == "sms":
                return await self._send_sms(notification)
            elif notification.type == "webhook":
                return await self._send_webhook(notification)
            elif notification.type == "push":
                return await self._send_push(notification)
            else:
                raise ValueError(f"不支持的通知类型: {notification.type}")
                
        except Exception as e:
            logger.error(f"发送通知失败: {e}")
            return NotificationResponse(
                status="failed",
                notification_id=f"{notification.type}_{datetime.now(timezone.utc).timestamp()}",
                notification_type=notification.type,
                recipient=notification.recipient,
                error=str(e)
            )
    
    async def _send_email(self, notification: NotificationRequest) -> NotificationResponse:
        """
        发送邮件通知
        
        Args:
            notification: 通知请求
            
        Returns:
            NotificationResponse: 响应结果
        """
        try:
            # 使用 Mailgun 服务发送邮件
            result = await self.mailgun_service.send_email(
                to_email=notification.recipient,
                subject=notification.subject or "系统通知",
                text_content=notification.message,
                html_content=self._format_html_email(
                    notification.subject or "系统通知",
                    notification.message
                ),
                tags=["notification", notification.priority]
            )
            
            return NotificationResponse(
                status="success" if result.get("success") else "failed",
                notification_id=result.get("message_id", ""),
                notification_type="email",
                recipient=notification.recipient,
                sent_at=datetime.now(timezone.utc).isoformat(),
                error=result.get("error")
            )
            
        except Exception as e:
            logger.error(f"发送邮件失败: {e}")
            raise
    
    async def _send_sms(self, notification: NotificationRequest) -> NotificationResponse:
        """
        发送短信通知
        
        Args:
            notification: 通知请求
            
        Returns:
            NotificationResponse: 响应结果
        """
        # 短信服务集成示例（需要根据实际短信服务商调整）
        try:
            # 这里添加实际的短信服务集成
            # 例如：Twilio, 阿里云短信等
            
            logger.info(f"发送短信到 {notification.recipient}: {notification.message}")
            
            # 模拟成功响应
            return NotificationResponse(
                status="success",
                notification_id=f"sms_{datetime.now(timezone.utc).timestamp()}",
                notification_type="sms",
                recipient=notification.recipient,
                sent_at=datetime.now(timezone.utc).isoformat()
            )
            
        except Exception as e:
            logger.error(f"发送短信失败: {e}")
            raise
    
    async def _send_webhook(self, notification: NotificationRequest) -> NotificationResponse:
        """
        发送 Webhook 通知
        
        Args:
            notification: 通知请求
            
        Returns:
            NotificationResponse: 响应结果
        """
        try:
            # 构造 Webhook 负载
            payload = {
                "type": "notification",
                "subject": notification.subject,
                "message": notification.message,
                "recipient": notification.recipient,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "metadata": notification.metadata or {}
            }
            
            # 发送 HTTP POST 请求
            response = await self.http_client.post(
                notification.recipient,  # URL 作为接收者
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": f"{self.settings.app_name}/{self.settings.app_version}"
                }
            )
            
            # 检查响应状态
            response.raise_for_status()
            
            return NotificationResponse(
                status="success",
                notification_id=f"webhook_{datetime.now(timezone.utc).timestamp()}",
                notification_type="webhook",
                recipient=notification.recipient,
                sent_at=datetime.now(timezone.utc).isoformat()
            )
            
        except httpx.HTTPStatusError as e:
            logger.error(f"Webhook 请求失败: {e.response.status_code}")
            raise
        except Exception as e:
            logger.error(f"发送 Webhook 失败: {e}")
            raise
    
    async def _send_push(self, notification: NotificationRequest) -> NotificationResponse:
        """
        发送推送通知
        
        Args:
            notification: 通知请求
            
        Returns:
            NotificationResponse: 响应结果
        """
        # 推送通知服务集成示例（需要根据实际推送服务商调整）
        try:
            # 这里添加实际的推送服务集成
            # 例如：Firebase Cloud Messaging, APNs 等
            
            logger.info(f"发送推送通知到 {notification.recipient}: {notification.message}")
            
            # 模拟成功响应
            return NotificationResponse(
                status="success",
                notification_id=f"push_{datetime.now(timezone.utc).timestamp()}",
                notification_type="push",
                recipient=notification.recipient,
                sent_at=datetime.now(timezone.utc).isoformat()
            )
            
        except Exception as e:
            logger.error(f"发送推送通知失败: {e}")
            raise
    
    def _format_html_email(self, subject: str, message: str) -> str:
        """
        格式化 HTML 邮件内容
        
        Args:
            subject: 邮件主题
            message: 邮件内容
            
        Returns:
            str: HTML 格式的邮件内容
        """
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{subject}</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f4f4f4; padding: 20px; border-radius: 5px; }}
                .content {{ padding: 20px 0; }}
                .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>{subject}</h2>
                </div>
                <div class="content">
                    <p>{message.replace(chr(10), '<br>')}</p>
                </div>
                <div class="footer">
                    <p>此邮件由 {self.settings.app_name} 自动发送，请勿回复。</p>
                    <p>如有疑问，请联系系统管理员。</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    async def send_batch_notifications(
        self,
        notifications: List[NotificationRequest]
    ) -> List[NotificationResponse]:
        """
        批量发送通知
        
        Args:
            notifications: 通知请求列表
            
        Returns:
            List[NotificationResponse]: 响应结果列表
        """
        results = []
        for notification in notifications:
            try:
                result = await self.send_notification(notification)
                results.append(result)
            except Exception as e:
                logger.error(f"批量发送中的单个通知失败: {e}")
                results.append(
                    NotificationResponse(
                        status="failed",
                        notification_id=f"{notification.type}_{datetime.now(timezone.utc).timestamp()}",
                        notification_type=notification.type,
                        recipient=notification.recipient,
                        error=str(e)
                    )
                )
        return results
    
    async def close(self):
        """关闭资源"""
        await self.http_client.aclose()