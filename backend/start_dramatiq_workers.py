#!/usr/bin/env python3
"""
Dramatiq Workers启动脚本
替换原有的PostgreSQL worker管理系统
"""

import argparse
import sys
from pathlib import Path

# 确保应用模块可以被导入
sys.path.append(str(Path(__file__).parent))

# 导入Dramatiq配置和任务
from app.core.dramatiq_config import broker
from app.tasks import dramatiq_tasks  # 确保任务被注册


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="启动Dramatiq Workers")
    
    parser.add_argument(
        "--processes", "-p", 
        type=int, 
        default=2, 
        help="Worker进程数 (默认: 2)"
    )
    
    parser.add_argument(
        "--threads", "-t", 
        type=int, 
        default=4, 
        help="每个进程的线程数 (默认: 4)"
    )
    
    parser.add_argument(
        "--queues", "-q", 
        nargs="+", 
        default=["email_processing", "ocr_processing", "notifications", "file_cleanup"],
        help="要处理的队列名称"
    )
    
    parser.add_argument(
        "--verbose", "-v", 
        action="store_true", 
        help="详细日志输出"
    )
    
    parser.add_argument(
        "--watch", "-w", 
        nargs="*", 
        help="监控文件变化并自动重启 (开发模式)"
    )
    
    args = parser.parse_args()
    
    # 构建dramatiq命令
    dramatiq_args = [
        "app.tasks.dramatiq_tasks",
        f"--processes={args.processes}",
        f"--threads={args.threads}",
    ]
    
    # 添加队列参数
    for queue in args.queues:
        dramatiq_args.extend(["--queues", queue])
    
    # 详细日志
    if args.verbose:
        dramatiq_args.append("--verbose")
    
    # 监控模式 (开发环境)
    if args.watch is not None:
        dramatiq_args.append("--watch")
        if args.watch:  # 如果指定了路径
            for path in args.watch:
                dramatiq_args.extend(["--watch-dir", path])
        else:
            dramatiq_args.extend(["--watch-dir", "app"])
    
    print("🚀 启动Dramatiq Workers...")
    print(f"   进程数: {args.processes}")
    print(f"   线程数: {args.threads}")
    print(f"   队列: {', '.join(args.queues)}")
    print(f"   命令: dramatiq {' '.join(dramatiq_args)}")
    print()
    
    # 启动dramatiq
    import subprocess
    try:
        cmd = ["dramatiq"] + dramatiq_args
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\\n正在停止Workers...")
    except subprocess.CalledProcessError as e:
        print(f"启动失败: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print("错误: 未找到dramatiq命令")
        print("请安装: pip install dramatiq[postgresql]")
        sys.exit(1)


if __name__ == "__main__":
    main()