#!/usr/bin/env python3
"""
PostgreSQL任务队列Worker启动脚本
替代Celery Worker
"""

import asyncio
import sys
import signal
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.postgresql_task_processor import PostgreSQLTaskProcessor
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def main():
    """主函数"""
    # 获取Worker名称
    worker_name = sys.argv[1] if len(sys.argv) > 1 else None
    
    # 创建任务处理器
    processor = PostgreSQLTaskProcessor(worker_name=worker_name)
    
    logger.info("=" * 50)
    logger.info("PostgreSQL任务队列Worker启动")
    logger.info("=" * 50)
    
    try:
        # 运行Worker
        await processor.run(poll_interval=3.0)  # 3秒轮询间隔
        
    except KeyboardInterrupt:
        logger.info("收到中断信号，正在停止Worker...")
        processor.stop()
        
    except Exception as e:
        logger.error(f"Worker运行失败: {e}")
        sys.exit(1)
    
    logger.info("Worker已安全停止")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker已停止")
        sys.exit(0)