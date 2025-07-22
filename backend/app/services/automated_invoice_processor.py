"""自动化发票处理服务"""
import os
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.email_scan_job import EmailScanJob
from app.schemas.email_scan import ScanJobStatus
from app.core.exceptions import BusinessException
from app.core.config import settings

logger = logging.getLogger(__name__)


class AutomatedInvoiceProcessor:
    """自动化发票处理服务类
    
    负责协调OCR识别和发票创建的自动化流程
    """
    
    def __init__(self):
        """初始化处理器"""
        self.max_concurrent_jobs = 3  # 最大并发处理任务数
        self.retry_count = 3  # 失败重试次数
        
    async def process_scan_job(
        self,
        db: AsyncSession,
        job_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """处理扫描任务的自动化流程
        
        Args:
            db: 数据库会话
            job_id: 扫描任务ID
            user_id: 用户ID
            
        Returns:
            处理结果统计
        """
        start_time = datetime.utcnow()
        logger.info(f"[自动化处理开始] 任务ID: {job_id}, 用户ID: {user_id}, 开始时间: {start_time}")
        
        # 获取扫描任务
        scan_job = await self._get_scan_job(db, job_id, user_id)
        logger.info(f"[任务状态] 任务ID: {job_id}, 当前状态: {scan_job.status}, 进度: {scan_job.progress}%")
        
        # 允许已完成的任务进行自动化处理
        if scan_job.status not in [ScanJobStatus.COMPLETED, ScanJobStatus.RUNNING]:
            logger.warning(f"[状态检查失败] 任务ID: {job_id}, 状态: {scan_job.status}, 不允许执行自动化处理")
            raise BusinessException(f"扫描任务状态为 {scan_job.status}，无法执行自动化处理")
        
        # 统计结果
        processing_stats = {
            'total_pdfs': 0,
            'ocr_success': 0,
            'ocr_failed': 0,
            'invoice_created': 0,
            'invoice_failed': 0,
            'duplicate_invoices': 0,
            'errors': []
        }
        
        try:
            # 更新任务状态 - 不改变已完成的状态
            logger.info(f"[状态更新] 任务ID: {job_id}, 更新前状态: {scan_job.status}, 进度: {scan_job.progress}%")
            await self._update_job_status(
                db, scan_job, 
                current_step="开始自动化处理",
                # 保持原有进度，不重置为0
                progress=scan_job.progress or 95
            )
            logger.info(f"[状态更新] 任务ID: {job_id}, 更新后进度: {scan_job.progress or 95}%")
            
            # 1. 获取下载的PDF文件列表
            logger.info(f"[PDF文件获取] 任务ID: {job_id}, 开始获取PDF文件列表")
            pdf_files = await self._get_downloaded_pdfs(scan_job)
            processing_stats['total_pdfs'] = len(pdf_files)
            logger.info(f"[PDF文件获取] 任务ID: {job_id}, 找到 {len(pdf_files)} 个PDF文件")
            
            if not pdf_files:
                logger.warning(f"[无PDF文件] 任务ID: {job_id}, 没有下载的PDF文件，跳过自动化处理")
                return processing_stats
            
            # 2. 批量OCR处理
            logger.info(f"[OCR处理开始] 任务ID: {job_id}, 待处理文件数: {len(pdf_files)}")
            ocr_start_time = datetime.utcnow()
            ocr_results = await self._batch_ocr_processing(
                db, scan_job, pdf_files, processing_stats
            )
            ocr_duration = (datetime.utcnow() - ocr_start_time).total_seconds()
            logger.info(f"[OCR处理完成] 任务ID: {job_id}, 耗时: {ocr_duration:.2f}秒, 成功: {processing_stats['ocr_success']}, 失败: {processing_stats['ocr_failed']}")
            
            # 3. 自动创建发票记录
            logger.info(f"[发票创建开始] 任务ID: {job_id}, 待创建发票数: {len(ocr_results)}")
            invoice_start_time = datetime.utcnow()
            await self._batch_invoice_creation(
                db, scan_job, ocr_results, processing_stats
            )
            invoice_duration = (datetime.utcnow() - invoice_start_time).total_seconds()
            logger.info(f"[发票创建完成] 任务ID: {job_id}, 耗时: {invoice_duration:.2f}秒, 成功: {processing_stats['invoice_created']}, 失败: {processing_stats['invoice_failed']}, 重复: {processing_stats['duplicate_invoices']}")
            
            # 4. 更新最终统计信息
            logger.info(f"[更新统计] 任务ID: {job_id}, 更新最终统计信息")
            await self._update_final_statistics(db, scan_job, processing_stats)
            
            total_duration = (datetime.utcnow() - start_time).total_seconds()
            logger.info(f"[自动化处理完成] 任务ID: {job_id}, 总耗时: {total_duration:.2f}秒, 统计: {processing_stats}")
            
        except Exception as e:
            error_duration = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"[自动化处理失败] 任务ID: {job_id}, 耗时: {error_duration:.2f}秒, 错误: {str(e)}", exc_info=True)
            processing_stats['errors'].append({
                'type': 'system_error',
                'message': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # 更新失败状态 - 但保持扫描完成状态
            logger.info(f"[错误处理] 任务ID: {job_id}, 更新任务状态，保持扫描完成状态")
            await self._update_job_status(
                db, scan_job,
                # 不改变已完成的状态
                current_step="自动化处理失败",
                error_message=str(e),
                # 保持扫描进度
                progress=scan_job.progress or 100
            )
            logger.warning(f"[错误处理完成] 任务ID: {job_id}, 自动化处理失败但扫描结果已保存")
            
            raise BusinessException(f"自动化处理失败: {str(e)}")
        
        return processing_stats
    
    async def _get_scan_job(
        self,
        db: AsyncSession,
        job_id: str,
        user_id: str
    ) -> EmailScanJob:
        """获取扫描任务"""
        stmt = select(EmailScanJob).filter(
            EmailScanJob.job_id == job_id,
            EmailScanJob.user_id == user_id
        )
        result = await db.execute(stmt)
        scan_job = result.scalar_one_or_none()
        
        if not scan_job:
            raise BusinessException(f"扫描任务 {job_id} 不存在")
        
        return scan_job
    
    async def _get_downloaded_pdfs(self, scan_job: EmailScanJob) -> List[Dict[str, Any]]:
        """获取下载的PDF文件列表
        
        Args:
            scan_job: 扫描任务
            
        Returns:
            PDF文件信息列表
        """
        pdf_files = []
        
        # 从扫描结果中提取附件信息
        scan_results = scan_job.scan_results or {}
        attachments = scan_results.get('attachments', [])
        logger.info(f"[附件提取] 任务ID: {scan_job.job_id}, 扫描结果中有 {len(attachments)} 个附件")
        
        for i, attachment in enumerate(attachments):
            file_path = attachment.get('file_path')
            if file_path and file_path.lower().endswith('.pdf'):
                if os.path.exists(file_path):
                    pdf_files.append({
                        'file_path': file_path,
                        'filename': attachment.get('filename', ''),
                        'email_id': attachment.get('email_id', ''),
                        'file_size': attachment.get('file_size', 0)
                    })
                    logger.debug(f"[PDF文件] 添加文件 {i+1}: {attachment.get('filename', '')}")
                else:
                    logger.warning(f"[文件不存在] 文件路径: {file_path}")
            else:
                logger.debug(f"[跳过非PDF] 文件: {attachment.get('filename', '')}")
        
        logger.info(f"[附件筛选完成] 任务ID: {scan_job.job_id}, 找到 {len(pdf_files)} 个有效PDF文件")
        return pdf_files
    
    async def _batch_ocr_processing(
        self,
        db: AsyncSession,
        scan_job: EmailScanJob,
        pdf_files: List[Dict[str, Any]],
        stats: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """批量OCR处理
        
        Args:
            db: 数据库会话
            scan_job: 扫描任务
            pdf_files: PDF文件列表
            stats: 统计信息
            
        Returns:
            OCR结果列表
        """
        logger.info(f"[批量OCR开始] 任务ID: {scan_job.job_id}, 待处理文件数: {len(pdf_files)}")
        
        ocr_results = []
        
        for i, pdf_file in enumerate(pdf_files):
            file_start_time = datetime.utcnow()
            try:
                # 更新进度
                progress = 20 + (i / len(pdf_files)) * 60  # OCR占60%进度
                logger.info(f"[OCR进度] 文件 {i+1}/{len(pdf_files)}, 进度: {int(progress)}%, 文件: {pdf_file['filename']}")
                await self._update_job_status(
                    db, scan_job,
                    current_step=f"OCR处理 {i+1}/{len(pdf_files)}",
                    progress=int(progress)
                )
                
                # 调用OCR服务
                logger.debug(f"[OCR调用] 开始处理文件: {pdf_file['filename']}, 路径: {pdf_file['file_path']}")
                ocr_result = await self._call_ocr_service(pdf_file)
                
                if ocr_result and ocr_result.get('success'):
                    stats['ocr_success'] += 1
                    ocr_results.append({
                        'pdf_file': pdf_file,
                        'ocr_data': ocr_result.get('data', {}),
                        'success': True
                    })
                    file_duration = (datetime.utcnow() - file_start_time).total_seconds()
                    logger.info(f"[OCR成功] 文件: {pdf_file['filename']}, 耗时: {file_duration:.2f}秒, 发票类型: {ocr_result.get('invoice_type', '未知')}")
                else:
                    stats['ocr_failed'] += 1
                    error_msg = ocr_result.get('error', '未知错误') if ocr_result else 'OCR服务无响应'
                    stats['errors'].append({
                        'type': 'ocr_error',
                        'file': pdf_file['filename'],
                        'message': error_msg,
                        'timestamp': datetime.utcnow().isoformat()
                    })
                    file_duration = (datetime.utcnow() - file_start_time).total_seconds()
                    logger.error(f"[OCR失败] 文件: {pdf_file['filename']}, 耗时: {file_duration:.2f}秒, 错误: {error_msg}")
                
            except Exception as e:
                stats['ocr_failed'] += 1
                stats['errors'].append({
                    'type': 'ocr_exception',
                    'file': pdf_file['filename'],
                    'message': str(e),
                    'timestamp': datetime.utcnow().isoformat()
                })
                file_duration = (datetime.utcnow() - file_start_time).total_seconds()
                logger.error(f"[OCR异常] 文件: {pdf_file['filename']}, 耗时: {file_duration:.2f}秒, 异常: {str(e)}", exc_info=True)
        
        logger.info(f"[批量OCR完成] 任务ID: {scan_job.job_id}, 成功: {stats['ocr_success']}, 失败: {stats['ocr_failed']}, 成功率: {stats['ocr_success'] / len(pdf_files) * 100 if pdf_files else 0:.1f}%")
        return ocr_results
    
    async def _call_ocr_service(self, pdf_file: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """调用OCR服务
        
        Args:
            pdf_file: PDF文件信息
            
        Returns:
            OCR结果
        """
        try:
            import httpx
            
            # 调用批量OCR API
            file_path = pdf_file['file_path']
            logger.debug(f"[OCR服务调用] 文件: {pdf_file['filename']}, 路径: {file_path}")
            
            # 构建请求数据
            request_data = {
                "file_paths": [file_path],
                "enable_validation": True,
                "return_confidence": True
            }
            
            # 调用内部OCR API
            api_url = f"{settings.api_base_url or 'http://localhost:8090'}/api/v1/ocr/combined/batch-files"
            logger.debug(f"[OCR API] 调用URL: {api_url}")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    api_url,
                    json=request_data,
                    headers={
                        "Content-Type": "application/json",
                        # 这里需要添加认证头，暂时跳过
                    },
                    timeout=60.0  # 60秒超时
                )
                
                if response.status_code == 200:
                    batch_result = response.json()
                    logger.debug(f"[OCR响应] 状态码: 200, 成功文件数: {batch_result.get('successful_files', 0)}")
                    
                    if batch_result.get('successful_files', 0) > 0:
                        # 获取第一个（也是唯一一个）文件的结果
                        file_result = batch_result['results'][0]
                        
                        if file_result['success']:
                            logger.debug(f"[OCR成功返回] 发票类型: {file_result.get('invoice_type')}, 字段数: {len(file_result.get('fields', {}))}")
                            return {
                                'success': True,
                                'data': file_result['fields'],
                                'invoice_type': file_result['invoice_type'],
                                'validation': file_result.get('validation'),
                                'confidence': file_result.get('confidence')
                            }
                        else:
                            logger.warning(f"[OCR文件处理失败] 错误: {file_result.get('error', '未知错误')}")
                            return {
                                'success': False,
                                'error': file_result.get('error', '未知错误')
                            }
                    else:
                        logger.warning(f"[OCR无成功文件] 批量结果: {batch_result}")
                        return {
                            'success': False,
                            'error': 'OCR处理失败'
                        }
                else:
                    error_text = response.text[:500] if response.text else "无错误信息"
                    logger.error(f"[OCR API错误] 状态码: {response.status_code}, 错误: {error_text}")
                    return {
                        'success': False,
                        'error': f'OCR API调用失败: {response.status_code}'
                    }
            
        except httpx.TimeoutException:
            logger.error(f"[OCR超时] 文件: {pdf_file['filename']}, 超时时间: 60秒")
            return {
                'success': False,
                'error': 'OCR服务调用超时'
            }
        except Exception as e:
            logger.error(f"[OCR服务异常] 文件: {pdf_file['filename']}, 异常: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _batch_invoice_creation(
        self,
        db: AsyncSession,
        scan_job: EmailScanJob,
        ocr_results: List[Dict[str, Any]],
        stats: Dict[str, Any]
    ) -> None:
        """批量创建发票记录
        
        Args:
            db: 数据库会话
            scan_job: 扫描任务
            ocr_results: OCR结果列表
            stats: 统计信息
        """
        logger.info(f"[批量发票创建开始] 任务ID: {scan_job.job_id}, 待创建数: {len(ocr_results)}")
        
        for i, ocr_result in enumerate(ocr_results):
            invoice_start_time = datetime.utcnow()
            invoice_number = ocr_result['ocr_data'].get('invoice_number', '未知')
            
            try:
                # 更新进度
                progress = 80 + (i / len(ocr_results)) * 15  # 发票创建占15%进度
                logger.info(f"[发票进度] 发票 {i+1}/{len(ocr_results)}, 进度: {int(progress)}%, 发票号: {invoice_number}")
                await self._update_job_status(
                    db, scan_job,
                    current_step=f"创建发票 {i+1}/{len(ocr_results)}",
                    progress=int(progress)
                )
                
                # 检查重复发票
                logger.debug(f"[重复检查] 检查发票号: {invoice_number}")
                if await self._is_duplicate_invoice(db, ocr_result['ocr_data'], scan_job.user_id):
                    stats['duplicate_invoices'] += 1
                    logger.warning(f"[跳过重复] 发票号: {invoice_number}, 文件: {ocr_result['pdf_file']['filename']}")
                    continue
                
                # 创建发票记录
                logger.debug(f"[创建发票] 开始创建发票记录: {invoice_number}")
                invoice_result = await self._create_invoice_record(
                    db, 
                    ocr_result['ocr_data'],
                    ocr_result['pdf_file'],
                    scan_job.user_id
                )
                
                if invoice_result:
                    stats['invoice_created'] += 1
                    invoice_duration = (datetime.utcnow() - invoice_start_time).total_seconds()
                    logger.info(f"[发票成功] 发票号: {invoice_number}, 耗时: {invoice_duration:.2f}秒")
                else:
                    stats['invoice_failed'] += 1
                    stats['errors'].append({
                        'type': 'invoice_creation_error',
                        'file': ocr_result['pdf_file']['filename'],
                        'message': '发票创建失败',
                        'timestamp': datetime.utcnow().isoformat()
                    })
                    invoice_duration = (datetime.utcnow() - invoice_start_time).total_seconds()
                    logger.error(f"[发票失败] 发票号: {invoice_number}, 耗时: {invoice_duration:.2f}秒")
                
            except Exception as e:
                stats['invoice_failed'] += 1
                stats['errors'].append({
                    'type': 'invoice_creation_exception',
                    'file': ocr_result['pdf_file']['filename'],
                    'message': str(e),
                    'timestamp': datetime.utcnow().isoformat()
                })
                invoice_duration = (datetime.utcnow() - invoice_start_time).total_seconds()
                logger.error(f"[发票异常] 发票号: {invoice_number}, 耗时: {invoice_duration:.2f}秒, 异常: {str(e)}", exc_info=True)
        
        logger.info(f"[批量发票创建完成] 任务ID: {scan_job.job_id}, 成功: {stats['invoice_created']}, 失败: {stats['invoice_failed']}, 重复: {stats['duplicate_invoices']}, 成功率: {stats['invoice_created'] / len(ocr_results) * 100 if ocr_results else 0:.1f}%")
    
    async def _is_duplicate_invoice(
        self,
        db: AsyncSession,
        ocr_data: Dict[str, Any],
        user_id: str
    ) -> bool:
        """检查是否为重复发票
        
        Args:
            db: 数据库会话
            ocr_data: OCR数据
            user_id: 用户ID
            
        Returns:
            是否重复
        """
        # TODO: 实现重复发票检测逻辑
        # 可以基于发票号码、金额、日期等组合判断
        
        invoice_number = ocr_data.get('invoice_number')
        amount = ocr_data.get('amount')
        
        if not invoice_number:
            return False
        
        # 这里应该查询现有发票表，检查是否已存在相同的发票
        # 暂时返回False，实际实现时需要查询数据库
        return False
    
    async def _create_invoice_record(
        self,
        db: AsyncSession,
        ocr_data: Dict[str, Any],
        pdf_file: Dict[str, Any],
        user_id: str
    ) -> bool:
        """创建发票记录
        
        Args:
            db: 数据库会话
            ocr_data: OCR数据
            pdf_file: PDF文件信息
            user_id: 用户ID
            
        Returns:
            是否创建成功
        """
        try:
            import httpx
            import json
            from pathlib import Path
            
            # 构建发票数据
            invoice_data = {
                "invoice_number": ocr_data.get('invoice_number', ''),
                "invoice_code": ocr_data.get('invoice_code', ''),
                "invoice_type": ocr_data.get('invoice_type', '增值税发票'),
                "invoice_date": ocr_data.get('invoice_date', ''),
                "seller_name": ocr_data.get('seller_name', ''),
                "seller_tax_number": ocr_data.get('seller_tax_number', ''),
                "buyer_name": ocr_data.get('buyer_name', ''),
                "buyer_tax_number": ocr_data.get('buyer_tax_number', ''),
                "total_amount": ocr_data.get('total_amount', 0.0),
                "tax_amount": ocr_data.get('tax_amount', 0.0),
                "amount_without_tax": ocr_data.get('amount_without_tax', 0.0),
                "currency": "CNY",
                "status": "active",
                "processing_status": "completed",
                "source": "email_automation",
                "ocr_confidence_score": ocr_data.get('confidence', {}).get('overall', 0.0),
                "is_verified": False,
                "extracted_data": {
                    "automation_source": "email_scanner",
                    "pdf_file_info": pdf_file,
                    "ocr_result": ocr_data
                }
            }
            
            # 准备文件上传
            file_path = pdf_file['file_path']
            if not Path(file_path).exists():
                raise FileNotFoundError(f"PDF文件不存在: {file_path}")
            
            # 调用创建发票API
            async with httpx.AsyncClient() as client:
                # 准备multipart form data
                with open(file_path, 'rb') as f:
                    files = {
                        'file': (Path(file_path).name, f, 'application/pdf')
                    }
                    data = {
                        'invoice_data': json.dumps(invoice_data)
                    }
                    
                    # 发送请求
                    response = await client.post(
                        f"{settings.api_base_url or 'http://localhost:8090'}/api/v1/invoices/create-with-file",
                        files=files,
                        data=data,
                        headers={
                            # 这里需要添加认证头，暂时跳过
                        },
                        timeout=120.0  # 120秒超时
                    )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"发票创建成功: {result.get('invoice_number', 'N/A')}, ID: {result.get('id', 'N/A')}")
                    return True
                elif response.status_code == 409:
                    # 重复发票
                    logger.warning(f"发票重复: {invoice_data.get('invoice_number')}")
                    return False
                else:
                    logger.error(f"发票创建API调用失败: {response.status_code}, {response.text}")
                    return False
            
        except Exception as e:
            logger.error(f"发票创建失败: {str(e)}")
            return False
    
    async def _update_job_status(
        self,
        db: AsyncSession,
        scan_job: EmailScanJob,
        status: Optional[ScanJobStatus] = None,
        current_step: Optional[str] = None,
        progress: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> None:
        """更新任务状态
        
        Args:
            db: 数据库会话
            scan_job: 扫描任务
            status: 新状态
            current_step: 当前步骤
            progress: 进度
            error_message: 错误信息
        """
        update_info = []
        
        if status is not None:
            scan_job.status = status
            update_info.append(f"状态={status}")
        
        if current_step is not None:
            scan_job.current_step = current_step
            update_info.append(f"步骤={current_step}")
        
        if progress is not None:
            scan_job.progress = progress
            update_info.append(f"进度={progress}%")
        
        if error_message is not None:
            scan_job.error_message = error_message
            update_info.append(f"错误={error_message[:50]}...")
        
        if update_info:
            logger.debug(f"[状态更新] 任务ID: {scan_job.job_id}, 更新内容: {', '.join(update_info)}")
        
        await db.commit()
    
    async def _update_final_statistics(
        self,
        db: AsyncSession,
        scan_job: EmailScanJob,
        stats: Dict[str, Any]
    ) -> None:
        """更新最终统计信息
        
        Args:
            db: 数据库会话
            scan_job: 扫描任务
            stats: 统计信息
        """
        logger.info(f"[最终统计更新] 任务ID: {scan_job.job_id}, 开始更新最终统计信息")
        
        # 更新processed_invoices字段
        scan_job.processed_invoices = stats['invoice_created']
        logger.debug(f"[统计] 已处理发票数: {stats['invoice_created']}")
        
        # 更新任务状态为完成 - 如果还未完成的话
        old_status = scan_job.status
        if scan_job.status != ScanJobStatus.COMPLETED:
            scan_job.status = ScanJobStatus.COMPLETED
            scan_job.completed_at = datetime.utcnow()
            logger.info(f"[状态变更] 任务ID: {scan_job.job_id}, 从 {old_status} 变更为 COMPLETED")
        scan_job.progress = 100
        scan_job.current_step = "自动化处理完成"
        
        # 保存处理统计信息到scan_results
        if not scan_job.scan_results:
            scan_job.scan_results = {}
        
        scan_job.scan_results['automation_stats'] = stats
        logger.debug(f"[统计保存] 保存自动化处理统计到scan_results")
        
        await db.commit()
        
        # 生成详细的统计日志
        logger.info(f"[最终统计] 任务ID: {scan_job.job_id} 统计汇总:")
        logger.info(f"  - PDF文件总数: {stats['total_pdfs']}")
        logger.info(f"  - OCR成功: {stats['ocr_success']}")
        logger.info(f"  - OCR失败: {stats['ocr_failed']}")
        logger.info(f"  - 发票创建成功: {stats['invoice_created']}")
        logger.info(f"  - 发票创建失败: {stats['invoice_failed']}")
        logger.info(f"  - 重复发票: {stats['duplicate_invoices']}")
        logger.info(f"  - 错误总数: {len(stats['errors'])}")
        
        if stats['errors']:
            logger.warning(f"[错误详情] 共 {len(stats['errors'])} 个错误:")
            for i, error in enumerate(stats['errors'][:5]):  # 只显示前5个错误
                logger.warning(f"  错误{i+1}: 类型={error['type']}, 文件={error.get('file', 'N/A')}, 消息={error['message'][:100]}")
            if len(stats['errors']) > 5:
                logger.warning(f"  ... 还有 {len(stats['errors']) - 5} 个错误未显示")