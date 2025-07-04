"""
邮件处理服务
负责处理邮件内容、下载附件、创建发票记录
"""

import asyncio
import re
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from urllib.parse import urlparse
from uuid import uuid4

import aiofiles
import httpx
from bs4 import BeautifulSoup
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.invoice import Invoice, InvoiceStatus
from app.models.task import EmailProcessingTask, TaskStatus
from app.services.file_service import FileService
from app.utils.logger import get_logger

logger = get_logger(__name__)


class EmailProcessor:
    """邮件处理器"""
    
    def __init__(self, db_url: str):
        """
        初始化邮件处理器
        
        Args:
            db_url: 数据库连接URL
        """
        self.engine = create_async_engine(db_url)
        self.SessionLocal = sessionmaker(
            self.engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
        self.file_service = FileService()
        
    async def process_email(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理邮件数据
        
        Args:
            email_data: 邮件数据字典
            
        Returns:
            Dict: 处理结果
        """
        user_id = email_data.get("user_id")
        if not user_id:
            raise ValueError("缺少用户ID")
            
        async with self.SessionLocal() as db:
            try:
                # 创建处理任务记录
                task = await self._create_processing_task(db, email_data)
                
                # 更新任务状态为处理中
                await self._update_task_status(
                    db, task.id, TaskStatus.PROCESSING, "开始处理邮件"
                )
                
                # 提取PDF附件
                pdf_attachments = self._extract_pdf_attachments(email_data)
                
                # 提取邮件正文中的PDF链接
                pdf_links = self._extract_pdf_links_from_content(email_data)
                
                # 合并所有PDF来源
                all_pdfs = pdf_attachments + pdf_links
                
                if not all_pdfs:
                    await self._update_task_status(
                        db, task.id, TaskStatus.COMPLETED, "邮件中未找到PDF附件或链接"
                    )
                    return {
                        "status": "completed",
                        "message": "No PDF attachments found",
                        "processed_files": 0
                    }
                
                # 处理每个PDF文件
                processed_files = []
                for pdf_info in all_pdfs:
                    try:
                        result = await self._process_pdf_file(
                            db, user_id, pdf_info, email_data
                        )
                        if result:
                            processed_files.append(result)
                            
                    except Exception as e:
                        logger.error(f"处理PDF文件失败: {pdf_info.get('name', 'unknown')}, 错误: {e}")
                        continue
                
                # 更新任务完成状态
                await self._update_task_status(
                    db, task.id, TaskStatus.COMPLETED, 
                    f"成功处理 {len(processed_files)} 个PDF文件"
                )
                
                return {
                    "status": "completed",
                    "message": f"Processed {len(processed_files)} PDF files",
                    "processed_files": len(processed_files),
                    "task_id": str(task.id)
                }
                
            except Exception as e:
                # 更新任务失败状态
                if 'task' in locals():
                    await self._update_task_status(
                        db, task.id, TaskStatus.FAILED, f"处理失败: {str(e)}"
                    )
                raise e
    
    async def _create_processing_task(
        self, 
        db: AsyncSession, 
        email_data: Dict[str, Any]
    ) -> EmailProcessingTask:
        """创建处理任务记录"""
        task = EmailProcessingTask(
            user_id=email_data["user_id"],
            email_subject=email_data.get("subject", ""),
            email_sender=email_data.get("sender", ""),
            email_message_id=email_data.get("message_id", ""),
            attachment_count=len(email_data.get("attachments", [])),
            status=TaskStatus.PENDING,
            metadata_=email_data
        )
        
        db.add(task)
        await db.commit()
        await db.refresh(task)
        
        logger.info(f"创建处理任务: {task.id}")
        return task
    
    async def _update_task_status(
        self, 
        db: AsyncSession, 
        task_id: str, 
        status: TaskStatus, 
        message: str
    ):
        """更新任务状态"""
        try:
            query = text(
                "UPDATE email_processing_tasks SET status = :status, "
                "status_message = :message, updated_at = :updated_at "
                "WHERE id = :task_id"
            )
            
            await db.execute(query, {
                "status": status.value,
                "message": message,
                "updated_at": datetime.utcnow(),
                "task_id": task_id
            })
            
            await db.commit()
            logger.info(f"更新任务状态: {task_id} -> {status.value}: {message}")
            
        except Exception as e:
            logger.error(f"更新任务状态失败: {e}")
    
    def _extract_pdf_attachments(self, email_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """提取PDF附件"""
        pdf_attachments = []
        
        for attachment in email_data.get("attachments", []):
            name = attachment.get("name", "").lower()
            content_type = attachment.get("content_type", "").lower()
            
            # 检查是否为PDF文件
            if (name.endswith('.pdf') or 
                content_type == 'application/pdf' or
                'pdf' in content_type):
                
                pdf_attachments.append({
                    "type": "attachment",
                    "name": attachment.get("name"),
                    "url": attachment.get("url"),
                    "content_type": attachment.get("content_type"),
                    "size": attachment.get("size", "0")
                })
        
        logger.info(f"找到 {len(pdf_attachments)} 个PDF附件")
        return pdf_attachments
    
    def _extract_pdf_links_from_content(self, email_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """从邮件正文提取PDF链接"""
        pdf_links = []
        
        # 检查纯文本内容
        text_content = email_data.get("body_plain", "")
        if text_content:
            links = self._find_pdf_urls_in_text(text_content)
            pdf_links.extend(links)
        
        # 检查HTML内容
        html_content = email_data.get("body_html", "")
        if html_content:
            links = self._find_pdf_urls_in_html(html_content)
            pdf_links.extend(links)
        
        logger.info(f"找到 {len(pdf_links)} 个PDF链接")
        return pdf_links
    
    def _find_pdf_urls_in_text(self, text: str) -> List[Dict[str, Any]]:
        """在文本中查找PDF URL"""
        pdf_pattern = r'https?://[^\s]+\.pdf(?:\?[^\s]*)?'
        urls = re.findall(pdf_pattern, text, re.IGNORECASE)
        
        return [
            {
                "type": "link",
                "name": f"link_{i+1}.pdf",
                "url": url,
                "content_type": "application/pdf",
                "size": "unknown"
            }
            for i, url in enumerate(urls)
        ]
    
    def _find_pdf_urls_in_html(self, html: str) -> List[Dict[str, Any]]:
        """在HTML中查找PDF链接"""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            pdf_links = []
            
            # 查找所有链接
            for link in soup.find_all('a', href=True):
                href = link['href']
                if href.lower().endswith('.pdf') or 'pdf' in href.lower():
                    link_text = link.get_text(strip=True)
                    name = link_text if link_text else f"document_{len(pdf_links)+1}.pdf"
                    
                    pdf_links.append({
                        "type": "html_link",
                        "name": name,
                        "url": href,
                        "content_type": "application/pdf",
                        "size": "unknown"
                    })
            
            return pdf_links
            
        except Exception as e:
            logger.error(f"解析HTML内容失败: {e}")
            return []
    
    async def _process_pdf_file(
        self, 
        db: AsyncSession, 
        user_id: str, 
        pdf_info: Dict[str, Any], 
        email_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """处理单个PDF文件"""
        try:
            # 下载PDF文件
            file_path = await self._download_pdf_file(pdf_info)
            if not file_path:
                return None
            
            # 上传到文件服务
            file_info = await self.file_service.save_invoice_file(
                user_id=user_id,
                file_path=file_path,
                original_filename=pdf_info["name"],
                source="email"
            )
            
            # 创建发票记录
            invoice = await self._create_invoice_record(
                db, user_id, file_info, email_data, pdf_info
            )
            
            # 清理临时文件
            try:
                Path(file_path).unlink()
            except:
                pass
            
            logger.info(f"成功处理PDF文件: {pdf_info['name']} -> 发票ID: {invoice.id}")
            
            return {
                "invoice_id": str(invoice.id),
                "file_name": pdf_info["name"],
                "file_path": file_info["file_path"]
            }
            
        except Exception as e:
            logger.error(f"处理PDF文件失败: {pdf_info.get('name')}, 错误: {e}")
            return None
    
    async def _download_pdf_file(self, pdf_info: Dict[str, Any]) -> Optional[str]:
        """下载PDF文件到临时位置"""
        try:
            url = pdf_info["url"]
            if not url:
                return None
            
            # 创建临时文件
            temp_dir = Path(tempfile.gettempdir()) / "invoice_downloads"
            temp_dir.mkdir(exist_ok=True)
            
            temp_file = temp_dir / f"{uuid4()}.pdf"
            
            # 下载文件
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                # 验证内容类型
                content_type = response.headers.get("content-type", "").lower()
                if "pdf" not in content_type:
                    logger.warning(f"下载的文件不是PDF格式: {content_type}")
                
                # 保存文件
                async with aiofiles.open(temp_file, "wb") as f:
                    await f.write(response.content)
            
            logger.info(f"成功下载PDF文件: {pdf_info['name']} -> {temp_file}")
            return str(temp_file)
            
        except Exception as e:
            logger.error(f"下载PDF文件失败: {pdf_info.get('url')}, 错误: {e}")
            return None
    
    async def _create_invoice_record(
        self, 
        db: AsyncSession, 
        user_id: str, 
        file_info: Dict[str, Any], 
        email_data: Dict[str, Any],
        pdf_info: Dict[str, Any]
    ) -> Invoice:
        """创建发票记录"""
        # 从邮件主题提取可能的发票信息
        subject = email_data.get("subject", "")
        sender = email_data.get("sender", "")
        
        invoice = Invoice(
            user_id=user_id,
            invoice_number=self._extract_invoice_number_from_subject(subject),
            file_path=file_info["file_path"],
            file_hash=file_info["file_hash"],
            original_filename=pdf_info["name"],
            seller_name=self._extract_company_from_email(sender),
            status=InvoiceStatus.PENDING,
            source="email",
            extracted_data={
                "email_subject": subject,
                "email_sender": sender,
                "email_timestamp": email_data.get("timestamp"),
                "attachment_info": pdf_info
            }
        )
        
        db.add(invoice)
        await db.commit()
        await db.refresh(invoice)
        
        return invoice
    
    def _extract_invoice_number_from_subject(self, subject: str) -> Optional[str]:
        """从邮件主题提取发票号"""
        # 匹配常见的发票号格式
        patterns = [
            r'发票[号]?[:：]?\s*([A-Z0-9\-]+)',
            r'invoice[#:]?\s*([A-Z0-9\-]+)',
            r'票号[:：]?\s*([A-Z0-9\-]+)',
            r'([A-Z]{2,}\d{8,})',  # 大写字母+数字组合
        ]
        
        for pattern in patterns:
            match = re.search(pattern, subject, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _extract_company_from_email(self, email: str) -> Optional[str]:
        """从邮箱地址提取公司名"""
        try:
            domain = email.split('@')[1]
            company = domain.split('.')[0]
            return company.title()
        except:
            return None
    
    async def close(self):
        """关闭数据库连接"""
        await self.engine.dispose()