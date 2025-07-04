#!/usr/bin/env python3
"""
简单的Worker启动脚本
用于启动单个PostgreSQL任务处理器
"""

import asyncio
import argparse
import sys
from app.services.postgresql_task_processor import PostgreSQLTaskProcessor
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="启动PostgreSQL任务队列Worker")
    parser.add_argument("-n", "--name", type=str, help="Worker名称")
    parser.add_argument("-t", "--types", nargs="+", 
                       default=["process_email", "ocr_extract", "send_notification"],
                       help="处理的任务类型")
    parser.add_argument("-v", "--verbose", action="store_true", help="详细日志")
    
    args = parser.parse_args()
    
    # 设置日志级别
    if args.verbose:
        import logging
        logging.getLogger().setLevel(logging.DEBUG)
    
    # 创建并启动worker
    worker_name = args.name or f"worker-{asyncio.get_event_loop().time():.0f}"
    
    logger.info(f"启动Worker: {worker_name}")
    logger.info(f"处理任务类型: {args.types}")
    
    try:
        processor = PostgreSQLTaskProcessor(worker_name=worker_name)
        
        # 设置处理的任务类型（如果需要的话）
        # processor.set_task_types(args.types)
        
        await processor.start()
        
    except KeyboardInterrupt:
        logger.info("收到中断信号，正在停止Worker...")
    except Exception as e:
        logger.error(f"Worker运行错误: {e}")
        sys.exit(1)
    finally:
        logger.info("Worker已停止")


if __name__ == "__main__":
    asyncio.run(main())