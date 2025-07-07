#!/usr/bin/env python3
"""
孤立文件清理脚本：安全删除没有数据库记录的本地文件

此脚本将：
1. 扫描本地uploads目录下的所有文件
2. 检查每个文件是否在数据库中有对应记录
3. 安全删除孤立文件（没有数据库记录的文件）
4. 保留有数据库记录的文件
5. 生成详细的清理报告
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import List, Dict, Set
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.append(str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import async_session_maker
from app.models.invoice import Invoice
from app.utils.logger import get_logger

logger = get_logger(__name__)


class OrphanedFilesCleaner:
    """孤立文件清理器"""
    
    def __init__(self):
        self.upload_dir = Path(settings.upload_dir)
        self.files_deleted = 0
        self.files_preserved = 0
        self.files_with_errors = 0
        self.total_space_freed = 0
        self.errors: List[Dict] = []
        self.deleted_files: List[Dict] = []
        self.preserved_files: List[Dict] = []
    
    async def scan_and_cleanup(self, dry_run: bool = True) -> Dict:
        """
        扫描并清理孤立文件
        
        Args:
            dry_run: 是否为试运行模式（不实际删除文件）
            
        Returns:
            Dict: 清理统计信息
        """
        logger.info(f"🔍 开始扫描孤立文件 (dry_run={dry_run})")
        
        start_time = datetime.now()
        
        try:
            # 1. 获取所有本地文件
            local_files = await self._scan_local_files()
            logger.info(f"📁 发现 {len(local_files)} 个本地文件")
            
            # 2. 获取数据库中的所有文件路径
            db_file_paths = await self._get_database_file_paths()
            logger.info(f"🗄️ 数据库中有 {len(db_file_paths)} 个文件记录")
            
            # 3. 识别孤立文件
            orphaned_files = self._identify_orphaned_files(local_files, db_file_paths)
            logger.info(f"🗑️ 发现 {len(orphaned_files)} 个孤立文件")
            
            # 4. 删除孤立文件
            if not dry_run:
                await self._delete_orphaned_files(orphaned_files)
            else:
                logger.info("🔍 试运行模式：不会实际删除文件")
                # 在试运行模式下，只统计会被删除的文件
                for file_info in orphaned_files:
                    self.deleted_files.append({
                        'path': str(file_info['path']),
                        'size': file_info['size'],
                        'reason': 'orphaned_file'
                    })
                    self.total_space_freed += file_info['size']
                    self.files_deleted += 1
            
            # 5. 统计保留的文件
            preserved_files = self._identify_preserved_files(local_files, db_file_paths)
            for file_info in preserved_files:
                self.preserved_files.append({
                    'path': str(file_info['path']),
                    'size': file_info['size'],
                    'reason': 'has_database_record'
                })
                self.files_preserved += 1
        
        except Exception as e:
            logger.error(f"❌ 清理过程中发生错误: {e}")
            raise
        
        finally:
            # 生成报告
            end_time = datetime.now()
            duration = end_time - start_time
            
            report = self._generate_report(duration, dry_run)
            logger.info("📊 清理完成，详细报告:")
            self._print_report(report)
            
            return report
    
    async def _scan_local_files(self) -> List[Dict]:
        """扫描本地文件"""
        local_files = []
        
        if not self.upload_dir.exists():
            logger.warning(f"上传目录不存在: {self.upload_dir}")
            return local_files
        
        for file_path in self.upload_dir.rglob("*"):
            if file_path.is_file():
                try:
                    stat = file_path.stat()
                    relative_path = file_path.relative_to(self.upload_dir)
                    
                    local_files.append({
                        'path': file_path,
                        'relative_path': str(relative_path),
                        'size': stat.st_size,
                        'created_time': datetime.fromtimestamp(stat.st_ctime),
                        'modified_time': datetime.fromtimestamp(stat.st_mtime)
                    })
                except Exception as e:
                    logger.error(f"读取文件信息失败 {file_path}: {e}")
                    self.errors.append({
                        'file': str(file_path),
                        'error': str(e),
                        'operation': 'scan'
                    })
        
        return local_files
    
    async def _get_database_file_paths(self) -> Set[str]:
        """获取数据库中的所有文件路径"""
        db_file_paths = set()
        
        async with async_session_maker() as session:
            stmt = select(Invoice.file_path).where(
                Invoice.file_path.is_not(None),
                Invoice.deleted_at.is_(None)
            )
            
            result = await session.execute(stmt)
            file_paths = result.scalars().all()
            
            for file_path in file_paths:
                if file_path:
                    db_file_paths.add(file_path)
        
        return db_file_paths
    
    def _identify_orphaned_files(self, local_files: List[Dict], db_file_paths: Set[str]) -> List[Dict]:
        """识别孤立文件"""
        orphaned_files = []
        
        for file_info in local_files:
            relative_path = file_info['relative_path']
            
            # 检查文件路径是否在数据库中
            if relative_path not in db_file_paths:
                orphaned_files.append(file_info)
        
        return orphaned_files
    
    def _identify_preserved_files(self, local_files: List[Dict], db_file_paths: Set[str]) -> List[Dict]:
        """识别保留的文件"""
        preserved_files = []
        
        for file_info in local_files:
            relative_path = file_info['relative_path']
            
            # 检查文件路径是否在数据库中
            if relative_path in db_file_paths:
                preserved_files.append(file_info)
        
        return preserved_files
    
    async def _delete_orphaned_files(self, orphaned_files: List[Dict]) -> None:
        """删除孤立文件"""
        logger.info(f"🗑️ 开始删除 {len(orphaned_files)} 个孤立文件")
        
        for file_info in orphaned_files:
            try:
                file_path = file_info['path']
                file_size = file_info['size']
                
                # 删除文件
                file_path.unlink()
                
                self.deleted_files.append({
                    'path': str(file_path),
                    'size': file_size,
                    'reason': 'orphaned_file'
                })
                self.total_space_freed += file_size
                self.files_deleted += 1
                
                logger.debug(f"✅ 删除成功: {file_path}")
                
            except Exception as e:
                logger.error(f"❌ 删除失败 {file_info['path']}: {e}")
                self.errors.append({
                    'file': str(file_info['path']),
                    'error': str(e),
                    'operation': 'delete'
                })
                self.files_with_errors += 1
    
    def _generate_report(self, duration, dry_run: bool) -> Dict:
        """生成清理报告"""
        return {
            'summary': {
                'dry_run': dry_run,
                'files_deleted': self.files_deleted,
                'files_preserved': self.files_preserved,
                'files_with_errors': self.files_with_errors,
                'total_space_freed_mb': round(self.total_space_freed / (1024 * 1024), 2),
                'duration_seconds': round(duration.total_seconds(), 2)
            },
            'deleted_files': self.deleted_files,
            'preserved_files': self.preserved_files,
            'errors': self.errors
        }
    
    def _print_report(self, report: Dict) -> None:
        """打印清理报告"""
        summary = report['summary']
        
        print("\n" + "="*60)
        print("📊 文件清理报告")
        print("="*60)
        print(f"🔍 运行模式: {'试运行' if summary['dry_run'] else '实际执行'}")
        print(f"🗑️ 删除文件: {summary['files_deleted']} 个")
        print(f"💾 保留文件: {summary['files_preserved']} 个")
        print(f"❌ 错误文件: {summary['files_with_errors']} 个")
        print(f"📦 释放空间: {summary['total_space_freed_mb']} MB")
        print(f"⏱️ 执行时间: {summary['duration_seconds']} 秒")
        
        if self.deleted_files:
            print(f"\n🗑️ 删除的文件 (显示前10个):")
            for file_info in self.deleted_files[:10]:
                size_mb = round(file_info['size'] / (1024 * 1024), 2)
                print(f"  • {file_info['path']} ({size_mb} MB)")
        
        if self.preserved_files:
            print(f"\n💾 保留的文件 (显示前5个):")
            for file_info in self.preserved_files[:5]:
                size_mb = round(file_info['size'] / (1024 * 1024), 2)
                print(f"  • {file_info['path']} ({size_mb} MB)")
        
        if self.errors:
            print(f"\n❌ 错误详情:")
            for error in self.errors[:5]:
                print(f"  • {error['file']}: {error['error']}")
        
        print("="*60)


async def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="清理孤立的上传文件")
    parser.add_argument(
        '--execute', 
        action='store_true', 
        help='实际执行删除操作（默认为试运行）'
    )
    parser.add_argument(
        '--confirm', 
        action='store_true', 
        help='确认执行删除操作'
    )
    
    args = parser.parse_args()
    
    # 安全检查
    if args.execute and not args.confirm:
        print("❌ 要执行实际删除操作，必须同时指定 --execute 和 --confirm 参数")
        print("   示例: python cleanup_orphaned_files.py --execute --confirm")
        return False
    
    try:
        cleaner = OrphanedFilesCleaner()
        
        # 执行清理
        dry_run = not (args.execute and args.confirm)
        report = await cleaner.scan_and_cleanup(dry_run=dry_run)
        
        if dry_run:
            print("\n🔍 这是试运行模式。要实际删除文件，请使用:")
            print("   python cleanup_orphaned_files.py --execute --confirm")
        
        return report['summary']['files_with_errors'] == 0
        
    except Exception as e:
        logger.error(f"❌ 清理失败: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)