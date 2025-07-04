#!/bin/bash

# Dramatiq Worker 管理脚本
# 提供简单的命令行接口来管理Dramatiq workers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PATH="$SCRIPT_DIR/venv"
PYTHON="$VENV_PATH/bin/python"
DRAMATIQ_SCRIPT="$SCRIPT_DIR/start_dramatiq_workers.py"
PID_FILE="$SCRIPT_DIR/dramatiq.pid"
LOG_FILE="$SCRIPT_DIR/logs/dramatiq.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境
check_environment() {
    if [[ ! -f "$PYTHON" ]]; then
        log_error "Python虚拟环境未找到: $PYTHON"
        exit 1
    fi
    
    # 检查dramatiq是否安装
    if ! "$PYTHON" -c "import dramatiq" 2>/dev/null; then
        log_error "Dramatiq未安装，请运行: pip install dramatiq[postgresql]"
        exit 1
    fi
    
    # 创建日志目录
    mkdir -p "$(dirname "$LOG_FILE")"
}

# 启动workers
start_workers() {
    local processes=${1:-2}
    local threads=${2:-4}
    
    log_info "启动Dramatiq workers (进程: $processes, 线程: $threads)..."
    
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_error "Workers已在运行 (PID: $pid)"
            exit 1
        else
            log_warn "清理旧的PID文件..."
            rm -f "$PID_FILE"
        fi
    fi
    
    # 启动dramatiq workers
    nohup "$PYTHON" "$DRAMATIQ_SCRIPT" \
        --processes "$processes" \
        --threads "$threads" \
        --verbose \
        > "$LOG_FILE" 2>&1 &
    
    local pid=$!
    echo "$pid" > "$PID_FILE"
    
    log_info "Dramatiq workers已启动 (PID: $pid)"
    log_info "日志文件: $LOG_FILE"
    
    # 等待几秒检查启动状态
    sleep 3
    if ! kill -0 "$pid" 2>/dev/null; then
        log_error "Workers启动失败，检查日志: $LOG_FILE"
        rm -f "$PID_FILE"
        exit 1
    fi
    
    log_info "Workers启动成功！"
}

# 开发模式启动
start_dev() {
    local processes=${1:-1}
    
    log_info "启动开发模式..."
    
    cd "$SCRIPT_DIR"
    export PYTHONPATH="$SCRIPT_DIR:$PYTHONPATH"
    
    "$VENV_PATH/bin/dramatiq" app.tasks.dramatiq_tasks \
        --processes="$processes" \
        --threads=2 \
        --queues email_processing \
        --queues ocr_processing \
        --queues notifications \
        --queues file_cleanup \
        --verbose
}

# 停止workers
stop_workers() {
    log_info "停止Dramatiq workers..."
    
    if [[ ! -f "$PID_FILE" ]]; then
        log_warn "未找到PID文件，查找运行中的dramatiq进程..."
        local pids=$(pgrep -f "dramatiq.*app.tasks" || true)
        if [[ -n "$pids" ]]; then
            log_info "找到dramatiq进程: $pids"
            kill -TERM $pids
            sleep 5
            # 检查是否还在运行
            pids=$(pgrep -f "dramatiq.*app.tasks" || true)
            if [[ -n "$pids" ]]; then
                log_warn "强制终止进程: $pids"
                kill -KILL $pids
            fi
        else
            log_warn "未找到运行中的dramatiq进程"
        fi
        return
    fi
    
    local pid=$(cat "$PID_FILE")
    
    if kill -0 "$pid" 2>/dev/null; then
        log_info "终止dramatiq进程 (PID: $pid)..."
        kill -TERM "$pid"
        
        # 等待进程结束
        local count=0
        while kill -0 "$pid" 2>/dev/null && [[ $count -lt 30 ]]; do
            sleep 1
            ((count++))
            echo -n "."
        done
        echo
        
        if kill -0 "$pid" 2>/dev/null; then
            log_warn "进程未正常结束，强制终止..."
            kill -KILL "$pid"
        fi
        
        log_info "Workers已停止"
    else
        log_warn "进程 $pid 未运行"
    fi
    
    rm -f "$PID_FILE"
}

# 检查状态
show_status() {
    log_info "检查Dramatiq workers状态..."
    
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Workers正在运行 (PID: $pid)"
            
            # 显示进程信息
            if command -v ps >/dev/null; then
                echo
                echo "进程详情:"
                ps -p "$pid" -o pid,ppid,cmd,cpu,rss 2>/dev/null || true
                
                # 显示子进程
                echo
                echo "Worker子进程:"
                pgrep -P "$pid" | xargs ps -o pid,cmd,cpu,rss 2>/dev/null || true
            fi
        else
            log_warn "PID文件存在但进程未运行 (PID: $pid)"
        fi
    else
        log_warn "Workers未运行 (无PID文件)"
        
        # 检查是否有遗留进程
        local pids=$(pgrep -f "dramatiq.*app.tasks" || true)
        if [[ -n "$pids" ]]; then
            log_warn "发现遗留的dramatiq进程: $pids"
        fi
    fi
}

# 查看队列状态
show_queue_stats() {
    log_info "获取队列统计信息..."
    
    "$PYTHON" -c "
import asyncio
import dramatiq
from app.core.dramatiq_config import broker
from app.tasks.dramatiq_tasks import *

async def get_stats():
    try:
        # 这里可以添加队列统计逻辑
        print('队列统计功能需要实现...')
        print('可以通过PostgreSQL直接查询dramatiq_messages表')
    except Exception as e:
        print(f'获取统计失败: {e}')

asyncio.run(get_stats())
" 2>/dev/null || log_error "获取队列统计失败"
}

# 重启workers
restart_workers() {
    local processes=${1:-2}
    local threads=${2:-4}
    
    log_info "重启Dramatiq workers..."
    stop_workers
    sleep 2
    start_workers "$processes" "$threads"
}

# 查看日志
show_logs() {
    local lines=${1:-50}
    
    if [[ -f "$LOG_FILE" ]]; then
        log_info "显示最近 $lines 行日志:"
        tail -n "$lines" "$LOG_FILE"
    else
        log_warn "日志文件不存在: $LOG_FILE"
    fi
}

# 实时日志
follow_logs() {
    if [[ -f "$LOG_FILE" ]]; then
        log_info "实时查看日志 (Ctrl+C退出):"
        tail -f "$LOG_FILE"
    else
        log_warn "日志文件不存在: $LOG_FILE"
    fi
}

# 启动监控面板
start_dashboard() {
    log_info "启动Dramatiq监控面板..."
    
    # 检查是否安装了dashboard
    if ! "$PYTHON" -c "import dramatiq_dashboard" 2>/dev/null; then
        log_error "Dramatiq dashboard未安装"
        log_info "请安装: pip install dramatiq-dashboard"
        exit 1
    fi
    
    # 启动dashboard
    "$PYTHON" -c "
from dramatiq_dashboard import DashboardApp
from app.core.config import settings

broker_url = settings.database_url.replace('postgresql+asyncpg://', 'postgresql://').replace('postgresql+psycopg://', 'postgresql://')

app = DashboardApp(broker_url=broker_url)
app.run(host='0.0.0.0', port=8080)
"
}

# 显示帮助
show_help() {
    echo "Dramatiq Worker 管理脚本"
    echo
    echo "用法: $0 <command> [options]"
    echo
    echo "命令:"
    echo "  start [processes] [threads]  启动workers (默认: 2进程, 4线程)"
    echo "  start-dev [processes]        启动开发模式 (自动重载)"
    echo "  stop                         停止所有workers"
    echo "  restart [processes] [threads] 重启workers"
    echo "  status                       显示workers状态"
    echo "  stats                        显示队列统计"
    echo "  logs [lines]                 显示日志 (默认50行)"
    echo "  follow                       实时查看日志"
    echo "  dashboard                    启动Web监控面板"
    echo "  help                         显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0 start 4 8                启动4进程8线程"
    echo "  $0 start-dev                启动开发模式"
    echo "  $0 dashboard                启动监控面板 (http://localhost:8080)"
}

# 主函数
main() {
    check_environment
    
    case "${1:-help}" in
        start)
            start_workers "${2:-2}" "${3:-4}"
            ;;
        start-dev)
            start_dev "${2:-1}"
            ;;
        stop)
            stop_workers
            ;;
        restart)
            restart_workers "${2:-2}" "${3:-4}"
            ;;
        status)
            show_status
            ;;
        stats)
            show_queue_stats
            ;;
        logs)
            show_logs "${2:-50}"
            ;;
        follow)
            follow_logs
            ;;
        dashboard)
            start_dashboard
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            echo
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"