"""
OCR处理任务
包含发票数据提取、OCR处理等异步任务
"""

import asyncio
from typing import Dict, Any, Optional

from app.core.celery_app import celery_app, create_task
from app.utils.logger import get_logger

logger = get_logger(__name__)


@create_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 120},
    name="extract_invoice_data"
)
def extract_invoice_data(self, invoice_id: str) -> Dict[str, Any]:
    """
    提取发票数据任务
    
    Args:
        invoice_id: 发票ID
        
    Returns:
        Dict: 提取结果
    """
    try:
        logger.info(f"开始OCR提取任务 - 发票ID: {invoice_id}")
        
        # 异步处理OCR提取
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(_process_ocr_extraction(invoice_id))
            logger.info(f"OCR提取完成 - 发票ID: {invoice_id}, 任务ID: {self.request.id}")
            return result
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"OCR提取任务失败 - 发票ID: {invoice_id}, 任务ID: {self.request.id}, 错误: {exc}")
        
        if self.request.retries < self.max_retries:
            logger.info(f"OCR任务将在120秒后重试 - 当前重试次数: {self.request.retries + 1}")
            raise self.retry(countdown=120, exc=exc)
        else:
            # 更新发票状态为失败
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(_update_invoice_status(invoice_id, "failed", str(exc)))
            finally:
                loop.close()
            
            return {
                "status": "failed",
                "invoice_id": invoice_id,
                "error": str(exc),
                "task_id": self.request.id,
                "retries": self.request.retries
            }


async def _process_ocr_extraction(invoice_id: str) -> Dict[str, Any]:
    """处理OCR提取的异步函数"""
    from app.core.database import get_async_db
    from app.models.invoice import Invoice, InvoiceStatus
    from app.services.ocr_service import OCRService
    from sqlalchemy import select
    
    async for db in get_async_db():
        try:
            # 获取发票记录
            query = select(Invoice).where(Invoice.id == invoice_id)
            result = await db.execute(query)
            invoice = result.scalar_one_or_none()
            
            if not invoice:
                raise ValueError(f"发票不存在: {invoice_id}")
            
            if not invoice.file_path:
                raise ValueError(f"发票文件路径为空: {invoice_id}")
            
            # 更新状态为处理中
            invoice.status = InvoiceStatus.PROCESSING
            await db.commit()
            
            # 创建OCR服务
            ocr_service = OCRService()
            
            # 执行OCR提取
            extracted_data = await ocr_service.extract_invoice_data(invoice.file_path)
            
            # 验证和清洗数据
            validated_data = _validate_extracted_data(extracted_data)
            
            # 更新发票记录
            await _update_invoice_with_extracted_data(db, invoice, validated_data)
            
            return {
                "status": "completed",
                "invoice_id": invoice_id,
                "extracted_data": validated_data,
                "confidence_score": extracted_data.get("confidence", 0.0)
            }
            
        except Exception as e:
            # 更新状态为失败
            if 'invoice' in locals():
                invoice.status = InvoiceStatus.FAILED
                invoice.status_message = str(e)
                await db.commit()
            raise e


async def _update_invoice_status(invoice_id: str, status: str, message: str = ""):
    """更新发票状态"""
    from app.core.database import get_async_db
    from sqlalchemy import text
    
    async for db in get_async_db():
        try:
            query = text(
                "UPDATE invoices SET status = :status, status_message = :message, "
                "updated_at = :updated_at WHERE id = :invoice_id"
            )
            
            from datetime import datetime
            await db.execute(query, {
                "status": status,
                "message": message,
                "updated_at": datetime.utcnow(),
                "invoice_id": invoice_id
            })
            
            await db.commit()
            
        except Exception as e:
            logger.error(f"更新发票状态失败: {e}")


async def _update_invoice_with_extracted_data(db, invoice, extracted_data: Dict[str, Any]):
    """使用提取的数据更新发票记录"""
    from app.models.invoice import InvoiceStatus
    from decimal import Decimal
    from datetime import datetime
    
    try:
        # 更新基础字段
        if extracted_data.get("invoice_number"):
            invoice.invoice_number = extracted_data["invoice_number"]
            
        if extracted_data.get("seller_name"):
            invoice.seller_name = extracted_data["seller_name"]
            
        if extracted_data.get("buyer_name"):
            invoice.buyer_name = extracted_data["buyer_name"]
            
        if extracted_data.get("invoice_date"):
            try:
                # 解析日期
                date_str = extracted_data["invoice_date"]
                if isinstance(date_str, str):
                    # 尝试多种日期格式
                    for fmt in ["%Y-%m-%d", "%Y年%m月%d日", "%Y/%m/%d"]:
                        try:
                            invoice.invoice_date = datetime.strptime(date_str, fmt).date()
                            break
                        except ValueError:
                            continue
            except Exception as e:
                logger.warning(f"解析发票日期失败: {date_str}, 错误: {e}")
        
        # 更新金额字段
        if extracted_data.get("amount"):
            try:
                invoice.amount = Decimal(str(extracted_data["amount"]))
            except (ValueError, TypeError) as e:
                logger.warning(f"解析发票金额失败: {extracted_data['amount']}, 错误: {e}")
                
        if extracted_data.get("tax_amount"):
            try:
                invoice.tax_amount = Decimal(str(extracted_data["tax_amount"]))
            except (ValueError, TypeError) as e:
                logger.warning(f"解析税额失败: {extracted_data['tax_amount']}, 错误: {e}")
                
        if extracted_data.get("total_amount"):
            try:
                invoice.total_amount = Decimal(str(extracted_data["total_amount"]))
            except (ValueError, TypeError) as e:
                logger.warning(f"解析总金额失败: {extracted_data['total_amount']}, 错误: {e}")
        
        # 计算缺失的金额
        if invoice.amount and invoice.tax_amount and not invoice.total_amount:
            invoice.total_amount = invoice.amount + invoice.tax_amount
        elif invoice.total_amount and invoice.tax_amount and not invoice.amount:
            invoice.amount = invoice.total_amount - invoice.tax_amount
        elif invoice.total_amount and invoice.amount and not invoice.tax_amount:
            invoice.tax_amount = invoice.total_amount - invoice.amount
        
        # 更新项目和备注
        if extracted_data.get("project_name"):
            invoice.project_name = extracted_data["project_name"]
            
        if extracted_data.get("remarks"):
            invoice.remarks = extracted_data["remarks"]
        
        # 保存完整的提取数据
        invoice.extracted_data = extracted_data
        invoice.status = InvoiceStatus.COMPLETED
        invoice.status_message = "OCR提取完成"
        
        # 设置处理时间
        invoice.processed_at = datetime.utcnow()
        
        await db.commit()
        logger.info(f"发票数据更新完成: {invoice.id}")
        
    except Exception as e:
        logger.error(f"更新发票数据失败: {e}")
        raise e


def _validate_extracted_data(extracted_data: Dict[str, Any]) -> Dict[str, Any]:
    """验证和清洗提取的数据"""
    import re
    from decimal import Decimal, InvalidOperation
    
    validated = {}
    
    # 验证发票号
    invoice_number = extracted_data.get("invoice_number", "").strip()
    if invoice_number and re.match(r'^[A-Za-z0-9\-_]{3,50}$', invoice_number):
        validated["invoice_number"] = invoice_number
    
    # 验证公司名称
    for field in ["seller_name", "buyer_name"]:
        value = extracted_data.get(field, "").strip()
        if value and len(value) <= 200:
            validated[field] = value
    
    # 验证和格式化金额
    for field in ["amount", "tax_amount", "total_amount"]:
        value = extracted_data.get(field)
        if value is not None:
            try:
                # 处理字符串金额（移除货币符号和逗号）
                if isinstance(value, str):
                    value = re.sub(r'[￥¥,$]', '', value.strip())
                    value = value.replace(',', '')
                
                decimal_value = Decimal(str(value))
                if 0 <= decimal_value <= Decimal('999999999.99'):
                    validated[field] = float(decimal_value)
            except (InvalidOperation, ValueError, TypeError):
                logger.warning(f"无效的金额值: {field} = {value}")
    
    # 验证日期
    date_value = extracted_data.get("invoice_date")
    if date_value:
        validated["invoice_date"] = str(date_value)
    
    # 保留其他字段
    for field in ["project_name", "remarks", "confidence", "ocr_text"]:
        value = extracted_data.get(field)
        if value:
            validated[field] = str(value)[:500]  # 限制长度
    
    return validated


@create_task(
    bind=True,
    name="process_invoice_ocr"
)
def process_invoice_ocr(self, invoice_ids: list) -> Dict[str, Any]:
    """
    批量处理发票OCR任务
    
    Args:
        invoice_ids: 发票ID列表
        
    Returns:
        Dict: 批量处理结果
    """
    try:
        logger.info(f"开始批量OCR处理 - 发票数量: {len(invoice_ids)}")
        
        results = []
        for invoice_id in invoice_ids:
            try:
                # 调用单个OCR提取任务
                task_result = extract_invoice_data.delay(invoice_id)
                results.append({
                    "invoice_id": invoice_id,
                    "task_id": task_result.id,
                    "status": "queued"
                })
            except Exception as e:
                logger.error(f"批量OCR处理发票 {invoice_id} 失败: {e}")
                results.append({
                    "invoice_id": invoice_id,
                    "status": "failed",
                    "error": str(e)
                })
        
        summary = {
            "status": "completed",
            "total_invoices": len(invoice_ids),
            "queued": len([r for r in results if r["status"] == "queued"]),
            "failed": len([r for r in results if r["status"] == "failed"]),
            "results": results,
            "task_id": self.request.id
        }
        
        logger.info(f"批量OCR处理完成 - 总数: {summary['total_invoices']}, "
                   f"成功: {summary['queued']}, 失败: {summary['failed']}")
        
        return summary
        
    except Exception as exc:
        logger.error(f"批量OCR处理任务失败 - 任务ID: {self.request.id}, 错误: {exc}")
        return {
            "status": "failed",
            "error": str(exc),
            "task_id": self.request.id
        }