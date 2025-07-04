"""
Mailgun 集成服务
自动管理Mailgun路由规则和域名配置
"""

import re
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin

import httpx
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class MailgunService:
    """Mailgun API 集成服务"""
    
    def __init__(self):
        self.api_key = getattr(settings, 'mailgun_api_key', None)
        self.domain = getattr(settings, 'mailgun_domain', 'invoice.example.com')
        self.webhook_url = getattr(settings, 'mailgun_webhook_url', 'https://your-api.com/api/v1/webhooks/email-received')
        self.base_url = f"https://api.mailgun.net/v3/{self.domain}"
        
        if not self.api_key:
            logger.warning("Mailgun API Key未配置，Mailgun集成功能将无法使用")
    
    async def ensure_route_exists(self, email_address: str) -> bool:
        """确保指定邮件地址的路由规则存在"""
        if not self.api_key:
            logger.info(f"Mailgun未配置，跳过路由创建: {email_address}")
            return False
        
        try:
            # 检查是否已存在通用路由规则
            existing_routes = await self.list_routes()
            
            # 查找匹配的路由
            pattern = f"match_recipient('{self._escape_email_pattern(email_address)}')"
            for route in existing_routes:
                if pattern in route.get('expression', ''):
                    logger.info(f"路由已存在: {email_address}")
                    return True
            
            # 创建新路由
            success = await self.create_route(email_address)
            if success:
                logger.info(f"成功创建Mailgun路由: {email_address}")
            
            return success
            
        except Exception as e:
            logger.error(f"确保Mailgun路由存在失败: {e}")
            return False
    
    async def create_route(self, email_address: str, priority: int = 100) -> bool:
        """创建新的邮件路由规则"""
        if not self.api_key:
            return False
        
        try:
            # 构造路由规则
            expression = f"match_recipient('{self._escape_email_pattern(email_address)}')"
            
            route_data = {
                "priority": priority,
                "expression": expression,
                "action": [f"forward('{self.webhook_url}')"],
                "description": f"Invoice processing route for {email_address}"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/routes",
                    auth=("api", self.api_key),
                    data=route_data
                )
                
                if response.status_code == 200:
                    logger.info(f"成功创建Mailgun路由: {email_address}")
                    return True
                else:
                    logger.error(f"创建Mailgun路由失败: {response.status_code}, {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"创建Mailgun路由异常: {e}")
            return False
    
    async def create_wildcard_route(self) -> bool:
        """创建通配符路由规则（推荐方式）"""
        if not self.api_key:
            return False
        
        try:
            # 创建通配符路由，匹配所有 invoice-* 邮件
            expression = f"match_recipient('invoice-.*@{re.escape(self.domain)}')"
            
            route_data = {
                "priority": 0,  # 最高优先级
                "expression": expression,
                "action": [f"forward('{self.webhook_url}')"],
                "description": "Invoice processing wildcard route for all invoice addresses"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/routes",
                    auth=("api", self.api_key),
                    data=route_data
                )
                
                if response.status_code == 200:
                    logger.info("成功创建Mailgun通配符路由")
                    return True
                else:
                    logger.error(f"创建Mailgun通配符路由失败: {response.status_code}, {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"创建Mailgun通配符路由异常: {e}")
            return False
    
    async def list_routes(self) -> List[Dict[str, Any]]:
        """获取所有路由规则"""
        if not self.api_key:
            return []
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/routes",
                    auth=("api", self.api_key)
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get('items', [])
                else:
                    logger.error(f"获取Mailgun路由失败: {response.status_code}, {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"获取Mailgun路由异常: {e}")
            return []
    
    async def remove_route(self, email_address: str) -> bool:
        """移除指定邮件地址的路由规则"""
        if not self.api_key:
            return False
        
        try:
            # 查找对应的路由ID
            routes = await self.list_routes()
            pattern = f"match_recipient('{self._escape_email_pattern(email_address)}')"
            
            route_id = None
            for route in routes:
                if pattern in route.get('expression', ''):
                    route_id = route.get('id')
                    break
            
            if not route_id:
                logger.warning(f"未找到对应的路由规则: {email_address}")
                return True  # 路由不存在也算成功
            
            # 删除路由
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f"{self.base_url}/routes/{route_id}",
                    auth=("api", self.api_key)
                )
                
                if response.status_code == 200:
                    logger.info(f"成功删除Mailgun路由: {email_address}")
                    return True
                else:
                    logger.error(f"删除Mailgun路由失败: {response.status_code}, {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"删除Mailgun路由异常: {e}")
            return False
    
    async def verify_domain_setup(self) -> Dict[str, Any]:
        """验证域名配置状态"""
        if not self.api_key:
            return {"configured": False, "error": "API密钥未配置"}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # 检查域名状态
                response = await client.get(
                    f"{self.base_url}",
                    auth=("api", self.api_key)
                )
                
                if response.status_code == 200:
                    domain_info = response.json()
                    
                    # 检查DNS记录
                    dns_response = await client.get(
                        f"{self.base_url}/dns",
                        auth=("api", self.api_key)
                    )
                    
                    dns_info = dns_response.json() if dns_response.status_code == 200 else {}
                    
                    return {
                        "configured": True,
                        "domain": self.domain,
                        "state": domain_info.get('state', 'unknown'),
                        "dns_records": dns_info.get('items', []),
                        "webhook_url": self.webhook_url
                    }
                else:
                    return {
                        "configured": False,
                        "error": f"域名验证失败: {response.status_code}"
                    }
                    
        except Exception as e:
            logger.error(f"验证Mailgun域名配置异常: {e}")
            return {
                "configured": False,
                "error": str(e)
            }
    
    async def test_webhook(self, test_email: str) -> Dict[str, Any]:
        """测试webhook连接"""
        try:
            # 发送测试邮件（需要实际的测试邮件地址）
            test_data = {
                "from": f"test@{self.domain}",
                "to": test_email,
                "subject": "Mailgun配置测试",
                "text": "这是一个Mailgun配置测试邮件"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/messages",
                    auth=("api", self.api_key),
                    data=test_data
                )
                
                if response.status_code == 200:
                    return {
                        "success": True,
                        "message": "测试邮件已发送",
                        "response": response.json()
                    }
                else:
                    return {
                        "success": False,
                        "error": f"发送测试邮件失败: {response.status_code}",
                        "response": response.text
                    }
                    
        except Exception as e:
            logger.error(f"测试Mailgun webhook异常: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_delivery_stats(self, days: int = 7) -> Dict[str, Any]:
        """获取邮件投递统计"""
        if not self.api_key:
            return {}
        
        try:
            from datetime import datetime, timedelta
            
            # 计算日期范围
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/stats/total",
                    auth=("api", self.api_key),
                    params={
                        "start": start_date.strftime("%a, %d %b %Y %H:%M:%S %z"),
                        "end": end_date.strftime("%a, %d %b %Y %H:%M:%S %z"),
                        "resolution": "day",
                        "duration": f"{days}d"
                    }
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"获取Mailgun统计失败: {response.status_code}, {response.text}")
                    return {}
                    
        except Exception as e:
            logger.error(f"获取Mailgun统计异常: {e}")
            return {}
    
    def _escape_email_pattern(self, email: str) -> str:
        """转义邮件地址中的特殊字符用于正则表达式"""
        # 转义正则表达式特殊字符
        escaped = re.escape(email)
        return escaped
    
    def generate_user_email(self, user_id: str, prefix: str = "invoice") -> str:
        """为用户生成邮件地址"""
        return f"{prefix}-{user_id}@{self.domain}"
    
    def extract_user_id_from_email(self, email: str) -> Optional[str]:
        """从邮件地址提取用户ID"""
        pattern = rf'invoice-[\w\-]*?-([a-f0-9\-]{{36}})@{re.escape(self.domain)}'
        match = re.search(pattern, email.lower())
        if match:
            return match.group(1)
        
        # 尝试简单格式
        simple_pattern = rf'invoice-([a-f0-9\-]{{36}})@{re.escape(self.domain)}'
        match = re.search(simple_pattern, email.lower())
        if match:
            return match.group(1)
        
        return None