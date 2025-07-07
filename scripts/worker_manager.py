#!/usr/bin/env python3
"""
PostgreSQL任务队列Worker管理脚本
用于启动、停止和监控PostgreSQL task workers
"""

import asyncio
import argparse
import json
import signal
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any
import subprocess
import psutil

from app.core.config import settings
from app.services.postgresql_task_processor import PostgreSQLTaskProcessor, TaskQueue
from app.utils.logger import get_logger

logger = get_logger(__name__)


class WorkerManager:
    """Worker管理器"""
    
    def __init__(self):
        self.workers: List[subprocess.Popen] = []
        self.is_running = False
        self.worker_count = 0
        self.task_queue = TaskQueue()
        
        # 设置信号处理
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """信号处理器"""
        logger.info(f"收到信号 {signum}, 正在停止所有workers...")
        self.stop_all_workers()
        sys.exit(0)
    
    def start_worker(self, worker_name: str = None) -> subprocess.Popen:
        """启动一个worker进程"""
        if not worker_name:
            worker_name = f"worker-{len(self.workers)+1}"
        
        cmd = [
            sys.executable, "-c",
            f"""
import asyncio
import sys
sys.path.append('{Path.cwd()}')
from app.services.postgresql_task_processor import PostgreSQLTaskProcessor

async def run_worker():
    processor = PostgreSQLTaskProcessor(worker_name='{worker_name}')
    await processor.start()

if __name__ == '__main__':
    asyncio.run(run_worker())
"""
        ]
        
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            self.workers.append(process)
            logger.info(f"启动worker: {worker_name} (PID: {process.pid})")
            return process
        except Exception as e:
            logger.error(f"启动worker失败: {e}")
            raise
    
    def stop_worker(self, process: subprocess.Popen):
        """停止一个worker进程"""
        try:
            if process.poll() is None:  # 进程还在运行
                process.terminate()
                # 等待进程结束
                try:
                    process.wait(timeout=10)
                    logger.info(f"Worker (PID: {process.pid}) 已停止")
                except subprocess.TimeoutExpired:
                    # 强制杀死
                    process.kill()
                    logger.warning(f"强制终止Worker (PID: {process.pid})")
            
            if process in self.workers:
                self.workers.remove(process)
        except Exception as e:
            logger.error(f"停止worker失败: {e}")
    
    def stop_all_workers(self):
        """停止所有worker进程"""
        logger.info(f"正在停止 {len(self.workers)} 个workers...")
        
        for process in self.workers.copy():
            self.stop_worker(process)
        
        self.workers.clear()
        self.is_running = False
        logger.info("所有workers已停止")
    
    def start_workers(self, count: int = 1):
        """启动指定数量的workers"""
        logger.info(f"启动 {count} 个workers...")
        
        for i in range(count):
            self.start_worker(f"worker-{i+1}")
        
        self.worker_count = count
        self.is_running = True
        logger.info(f"已启动 {count} 个workers")
    
    def scale_workers(self, target_count: int):
        """扩缩容workers"""
        current_count = len(self.workers)
        
        if target_count > current_count:
            # 扩容
            add_count = target_count - current_count
            logger.info(f"扩容: 增加 {add_count} 个workers")
            for i in range(add_count):
                self.start_worker(f"worker-{current_count + i + 1}")
        elif target_count < current_count:
            # 缩容
            remove_count = current_count - target_count
            logger.info(f"缩容: 减少 {remove_count} 个workers")
            for _ in range(remove_count):
                if self.workers:
                    process = self.workers[-1]
                    self.stop_worker(process)
        
        self.worker_count = target_count
        logger.info(f"Worker数量已调整为: {target_count}")
    
    def get_worker_status(self) -> List[Dict[str, Any]]:
        """获取所有worker状态"""
        status_list = []
        
        for i, process in enumerate(self.workers):
            try:
                # 获取进程信息
                if process.poll() is None:
                    # 进程还在运行
                    ps_process = psutil.Process(process.pid)
                    status = {
                        "worker_id": i + 1,
                        "pid": process.pid,
                        "status": "running",
                        "cpu_percent": ps_process.cpu_percent(),
                        "memory_mb": ps_process.memory_info().rss / 1024 / 1024,
                        "create_time": datetime.fromtimestamp(ps_process.create_time()).isoformat(),
                        "command": " ".join(ps_process.cmdline()[:3])  # 只显示前3个参数
                    }
                else:
                    # 进程已结束
                    status = {
                        "worker_id": i + 1,
                        "pid": process.pid,
                        "status": "stopped",
                        "exit_code": process.returncode,
                        "cpu_percent": 0,
                        "memory_mb": 0
                    }
                
                status_list.append(status)
                
            except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
                status_list.append({
                    "worker_id": i + 1,
                    "pid": process.pid,
                    "status": "error",
                    "error": str(e)
                })
        
        return status_list
    
    async def get_queue_stats(self) -> Dict[str, Any]:
        """获取队列统计信息"""
        try:
            # 获取总体统计
            stats = await self.task_queue.get_task_stats(hours_back=24)
            
            # 计算汇总数据
            total_stats = {
                "pending": 0,
                "processing": 0,
                "completed": 0,
                "failed": 0,
                "total": 0
            }
            
            for stat in stats:
                status = stat.get("status", "unknown")
                count = stat.get("count", 0)
                total_stats[status] = total_stats.get(status, 0) + count
                total_stats["total"] += count
            
            return {
                "queue_stats": total_stats,
                "worker_count": len(self.workers),
                "active_workers": len([w for w in self.workers if w.poll() is None]),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"获取队列统计失败: {e}")
            return {
                "error": str(e),
                "worker_count": len(self.workers),
                "active_workers": len([w for w in self.workers if w.poll() is None]),
                "timestamp": datetime.now().isoformat()
            }
    
    async def monitor_loop(self, interval: int = 30):
        """监控循环"""
        logger.info(f"开始监控循环，间隔: {interval}秒")
        
        while self.is_running:
            try:
                # 检查worker状态
                worker_status = self.get_worker_status()
                active_workers = len([w for w in worker_status if w.get("status") == "running"])
                
                # 获取队列统计
                queue_stats = await self.get_queue_stats()
                
                # 输出监控信息
                logger.info(f"监控报告 - Workers: {active_workers}/{len(self.workers)}, "
                          f"队列: {queue_stats.get('queue_stats', {})}")
                
                # 检查是否需要重启异常的worker
                for status in worker_status:
                    if status.get("status") == "stopped" and status.get("exit_code") != 0:
                        logger.warning(f"检测到异常退出的worker (PID: {status['pid']}), 准备重启")
                        # 这里可以添加重启逻辑
                
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"监控循环错误: {e}")
                await asyncio.sleep(interval)
    
    def run_daemon(self, worker_count: int = 2, monitor_interval: int = 30):
        """以守护进程模式运行"""
        logger.info(f"以守护进程模式启动，workers: {worker_count}")
        
        try:
            # 启动workers
            self.start_workers(worker_count)
            
            # 运行监控循环
            asyncio.run(self.monitor_loop(monitor_interval))
            
        except KeyboardInterrupt:
            logger.info("收到中断信号，正在停止...")
        except Exception as e:
            logger.error(f"守护进程运行错误: {e}")
        finally:
            self.stop_all_workers()


async def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="PostgreSQL任务队列Worker管理器")
    
    subparsers = parser.add_subparsers(dest="command", help="可用命令")
    
    # start命令
    start_parser = subparsers.add_parser("start", help="启动workers")
    start_parser.add_argument("-c", "--count", type=int, default=2, help="worker数量")
    start_parser.add_argument("-d", "--daemon", action="store_true", help="守护进程模式")
    start_parser.add_argument("-m", "--monitor", type=int, default=30, help="监控间隔(秒)")
    
    # stop命令
    stop_parser = subparsers.add_parser("stop", help="停止所有workers")
    
    # status命令
    status_parser = subparsers.add_parser("status", help="查看worker状态")
    
    # scale命令
    scale_parser = subparsers.add_parser("scale", help="扩缩容workers")
    scale_parser.add_argument("count", type=int, help="目标worker数量")
    
    # stats命令
    stats_parser = subparsers.add_parser("stats", help="查看队列统计")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    manager = WorkerManager()
    
    try:
        if args.command == "start":
            if args.daemon:
                # 守护进程模式
                manager.run_daemon(args.count, args.monitor)
            else:
                # 普通模式
                manager.start_workers(args.count)
                print(f"已启动 {args.count} 个workers")
                print("按 Ctrl+C 停止所有workers")
                
                try:
                    while True:
                        time.sleep(1)
                except KeyboardInterrupt:
                    print("\n正在停止workers...")
                    manager.stop_all_workers()
        
        elif args.command == "stop":
            # 这里应该连接到运行中的manager实例来停止
            # 简化实现：查找并终止所有相关进程
            print("停止功能需要进程管理实现...")
        
        elif args.command == "status":
            status = manager.get_worker_status()
            print(json.dumps(status, indent=2, ensure_ascii=False))
        
        elif args.command == "scale":
            manager.scale_workers(args.count)
            print(f"已调整worker数量为: {args.count}")
        
        elif args.command == "stats":
            stats = await manager.get_queue_stats()
            print(json.dumps(stats, indent=2, ensure_ascii=False))
            
    except Exception as e:
        logger.error(f"命令执行失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())