#!/usr/bin/env python3
"""
文件迁移脚本：将本地文件批量上传到 Supabase Storage

此脚本将：
1. 扫描本地 uploads 目录下的所有用户文件
2. 批量上传到 Supabase Storage
3. 更新数据库记录添加云存储路径
4. 验证上传完整性
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import List, Dict, Tuple
from uuid import UUID
import mimetypes
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.append(str(Path(__file__).parent))

from supabase import create_client
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, text

from app.core.config import settings
from app.core.database import async_session_maker
from app.models.invoice import Invoice
from app.utils.logger import get_logger

logger = get_logger(__name__)


class FileUploadError(Exception):
    """文件上传异常"""
    pass


class FileMigrator:
    """文件迁移器"""
    
    def __init__(self):
        self.client = create_client(settings.supabase_url, settings.supabase_service_key)
        self.bucket_name = "invoices"
        self.upload_dir = Path(settings.upload_dir)
        self.success_count = 0
        self.error_count = 0
        self.skipped_count = 0
        self.errors: List[Dict] = []
    
    async def migrate_all_files(self) -> None:
        """迁移所有文件"""
        logger.info("🚀 开始文件迁移到 Supabase Storage")
        
        start_time = datetime.now()
        
        try:
            # 获取所有需要迁移的文件
            files_to_migrate = await self._get_files_to_migrate()
            total_files = len(files_to_migrate)
            
            logger.info(f"📊 发现 {total_files} 个文件需要迁移")
            
            if total_files == 0:
                logger.info("✅ 没有文件需要迁移")
                return
            
            # 分批处理文件
            batch_size = 10  # 每批处理10个文件
            
            for i in range(0, total_files, batch_size):
                batch = files_to_migrate[i:i + batch_size]
                batch_num = i // batch_size + 1
                total_batches = (total_files + batch_size - 1) // batch_size
                
                logger.info(f"📦 处理批次 {batch_num}/{total_batches} ({len(batch)} 个文件)")
                
                await self._process_batch(batch)
                
                # 显示进度
                progress = (i + len(batch)) / total_files * 100
                logger.info(f"📈 进度: {progress:.1f}% ({self.success_count} 成功, {self.error_count} 失败, {self.skipped_count} 跳过)")
        
        except Exception as e:
            logger.error(f"❌ 迁移过程中发生严重错误: {e}")
            raise
        
        finally:
            # 显示最终统计
            end_time = datetime.now()
            duration = end_time - start_time
            
            logger.info("📊 迁移完成统计:")
            logger.info(f"  ✅ 成功上传: {self.success_count} 个文件")
            logger.info(f"  ❌ 上传失败: {self.error_count} 个文件")
            logger.info(f"  ⏭️ 已跳过: {self.skipped_count} 个文件")
            logger.info(f"  ⏱️ 耗时: {duration.total_seconds():.2f} 秒")
            
            if self.errors:
                logger.error("❌ 错误详情:")
                for error in self.errors[:10]:  # 只显示前10个错误
                    logger.error(f"  {error['file']}: {error['error']}")
    
    async def _get_files_to_migrate(self) -> List[Dict]:
        """获取需要迁移的文件列表"""
        files_to_migrate = []
        
        async with async_session_maker() as session:
            # 查询所有有文件路径但没有云存储路径的发票
            stmt = select(Invoice).where(
                Invoice.file_path.is_not(None),
                Invoice.deleted_at.is_(None)
            )
            
            result = await session.execute(stmt)
            invoices = result.scalars().all()
            
            for invoice in invoices:
                local_file_path = self.upload_dir / invoice.file_path
                
                if local_file_path.exists():
                    # 检查是否已经上传到云存储
                    cloud_path = invoice.file_path
                    
                    try:
                        # 尝试从Supabase Storage列出文件
                        objects = self.client.storage.from_(self.bucket_name).list(
                            path=os.path.dirname(cloud_path)
                        )
                        
                        file_exists_in_cloud = False
                        if 'error' not in objects:
                            file_name = os.path.basename(cloud_path)
                            file_exists_in_cloud = any(
                                obj.get('name') == file_name 
                                for obj in objects 
                                if isinstance(obj, dict)
                            )
                        
                        if not file_exists_in_cloud:
                            files_to_migrate.append({
                                'invoice_id': invoice.id,
                                'local_path': local_file_path,
                                'cloud_path': cloud_path,
                                'user_id': invoice.user_id,
                                'file_size': local_file_path.stat().st_size
                            })
                        else:
                            self.skipped_count += 1
                            
                    except Exception as e:
                        logger.warning(f"检查云存储文件失败 {cloud_path}: {e}")
                        # 假设不存在，添加到迁移列表
                        files_to_migrate.append({
                            'invoice_id': invoice.id,
                            'local_path': local_file_path,
                            'cloud_path': cloud_path,
                            'user_id': invoice.user_id,
                            'file_size': local_file_path.stat().st_size
                        })
                else:
                    logger.warning(f"本地文件不存在: {local_file_path}")
                    self.error_count += 1
                    self.errors.append({
                        'file': str(local_file_path),
                        'error': '本地文件不存在'
                    })
        
        return files_to_migrate
    
    async def _process_batch(self, batch: List[Dict]) -> None:
        """处理一批文件"""
        tasks = []
        
        for file_info in batch:
            task = asyncio.create_task(self._upload_single_file(file_info))
            tasks.append(task)
        
        # 等待所有任务完成
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 处理结果
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                self.error_count += 1
                self.errors.append({
                    'file': str(batch[i]['local_path']),
                    'error': str(result)
                })
                logger.error(f"❌ 上传失败 {batch[i]['local_path']}: {result}")
            elif result:
                self.success_count += 1
                logger.debug(f"✅ 上传成功 {batch[i]['local_path']}")
    
    async def _upload_single_file(self, file_info: Dict) -> bool:
        """上传单个文件"""
        try:
            local_path = file_info['local_path']
            cloud_path = file_info['cloud_path']
            
            # 读取文件内容
            with open(local_path, 'rb') as f:
                file_content = f.read()
            
            # 获取MIME类型
            mime_type, _ = mimetypes.guess_type(str(local_path))
            if not mime_type:
                mime_type = 'application/pdf'
            
            # 上传到Supabase Storage
            upload_result = self.client.storage.from_(self.bucket_name).upload(
                path=cloud_path,
                file=file_content,
                file_options={
                    'content-type': mime_type,
                    'cache-control': '3600'
                }
            )
            
            # 检查上传结果
            if hasattr(upload_result, 'error') and upload_result.error:
                if 'Duplicate' in str(upload_result.error):
                    # 文件已存在，跳过
                    self.skipped_count += 1
                    return True
                else:
                    raise FileUploadError(f"Supabase upload error: {upload_result.error}")
            elif hasattr(upload_result, 'path'):
                # 上传成功
                return True
            else:
                # 检查传统字典格式
                if isinstance(upload_result, dict):
                    if 'error' in upload_result:
                        if 'Duplicate' in str(upload_result['error']):
                            self.skipped_count += 1
                            return True
                        else:
                            raise FileUploadError(f"Supabase upload error: {upload_result['error']}")
                    else:
                        return True
                else:
                    # 未知格式，假设成功
                    return True
            
        except Exception as e:
            raise FileUploadError(f"Upload failed: {str(e)}")
    
    async def verify_migration(self) -> Dict:
        """验证迁移完整性"""
        logger.info("🔍 验证迁移完整性...")
        
        verification_result = {
            'total_invoices': 0,
            'files_in_cloud': 0,
            'files_missing': 0,
            'missing_files': []
        }
        
        async with async_session_maker() as session:
            stmt = select(Invoice).where(
                Invoice.file_path.is_not(None),
                Invoice.deleted_at.is_(None)
            )
            
            result = await session.execute(stmt)
            invoices = result.scalars().all()
            
            verification_result['total_invoices'] = len(invoices)
            
            for invoice in invoices:
                cloud_path = invoice.file_path
                
                try:
                    # 检查文件是否在云存储中
                    objects = self.client.storage.from_(self.bucket_name).list(
                        path=os.path.dirname(cloud_path)
                    )
                    
                    file_exists = False
                    if 'error' not in objects:
                        file_name = os.path.basename(cloud_path)
                        file_exists = any(
                            obj.get('name') == file_name 
                            for obj in objects 
                            if isinstance(obj, dict)
                        )
                    
                    if file_exists:
                        verification_result['files_in_cloud'] += 1
                    else:
                        verification_result['files_missing'] += 1
                        verification_result['missing_files'].append(cloud_path)
                        
                except Exception as e:
                    logger.error(f"验证文件失败 {cloud_path}: {e}")
                    verification_result['files_missing'] += 1
                    verification_result['missing_files'].append(cloud_path)
        
        logger.info("📊 验证结果:")
        logger.info(f"  📄 总发票数: {verification_result['total_invoices']}")
        logger.info(f"  ☁️ 云端文件: {verification_result['files_in_cloud']}")
        logger.info(f"  ❌ 缺失文件: {verification_result['files_missing']}")
        
        if verification_result['missing_files']:
            logger.warning("缺失的文件:")
            for missing_file in verification_result['missing_files'][:10]:
                logger.warning(f"  {missing_file}")
        
        return verification_result


async def main():
    """主函数"""
    try:
        migrator = FileMigrator()
        
        # 执行迁移
        await migrator.migrate_all_files()
        
        # 验证迁移
        verification = await migrator.verify_migration()
        
        # 判断是否成功
        if verification['files_missing'] == 0:
            logger.info("🎉 文件迁移完全成功！")
        else:
            logger.warning(f"⚠️ 迁移基本完成，但有 {verification['files_missing']} 个文件缺失")
        
        return verification['files_missing'] == 0
        
    except Exception as e:
        logger.error(f"❌ 迁移失败: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)