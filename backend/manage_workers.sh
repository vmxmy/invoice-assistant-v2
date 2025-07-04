#!/bin/bash

# Invoice Assistant Worker 管理脚本
# 提供简单的命令行接口来管理PostgreSQL task workers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PATH="$SCRIPT_DIR/venv"
PYTHON="$VENV_PATH/bin/python"
WORKER_MANAGER="$SCRIPT_DIR/worker_manager.py"
PID_FILE="$SCRIPT_DIR/workers.pid"
LOG_FILE="$SCRIPT_DIR/logs/workers.log"

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

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# 检查环境
check_environment() {
    if [[ ! -f "$PYTHON" ]]; then
        log_error "Python虚拟环境未找到: $PYTHON"
        log_info "请运行: python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
        exit 1
    fi
    
    if [[ ! -f "$WORKER_MANAGER" ]]; then
        log_error "Worker管理器未找到: $WORKER_MANAGER"
        exit 1
    fi
    
    # 创建日志目录
    mkdir -p "$(dirname "$LOG_FILE")"
}

# 启动workers
start_workers() {
    local count=${1:-2}
    
    log_info "启动 $count 个workers..."
    
    if [[ -f "$PID_FILE" ]]; then
        log_warn "发现PID文件，检查是否已有workers在运行..."
        if check_workers_running; then
            log_error "Workers已在运行，请先停止"
            exit 1
        else
            log_warn "清理旧的PID文件..."
            rm -f "$PID_FILE"
        fi
    fi
    
    # 启动worker管理器
    nohup "$PYTHON" "$WORKER_MANAGER" start -c "$count" -d > "$LOG_FILE" 2>&1 &
    local pid=$!
    
    echo "$pid" > "$PID_FILE"
    log_info "Workers已启动 (PID: $pid)"
    log_info "日志文件: $LOG_FILE"
    
    # 等待几秒钟检查启动状态
    sleep 3
    if ! kill -0 "$pid" 2>/dev/null; then
        log_error "Workers启动失败，检查日志: $LOG_FILE"
        rm -f "$PID_FILE"
        exit 1
    fi
    
    log_info "Workers启动成功！"
}

# 停止workers
stop_workers() {
    log_info "停止workers..."
    
    if [[ ! -f "$PID_FILE" ]]; then
        log_warn "未找到PID文件，尝试查找运行中的worker进程..."
        local pids=$(pgrep -f "worker_manager.py" || true)
        if [[ -n "$pids" ]]; then
            log_info "找到worker进程: $pids"
            kill -TERM $pids
            sleep 5
            # 如果还在运行，强制杀死
            pids=$(pgrep -f "worker_manager.py" || true)
            if [[ -n "$pids" ]]; then
                log_warn "强制终止进程: $pids"
                kill -KILL $pids
            fi
        else
            log_warn "未找到运行中的worker进程"
        fi
        return
    fi
    
    local pid=$(cat "$PID_FILE")
    
    if kill -0 "$pid" 2>/dev/null; then
        log_info "终止worker管理器 (PID: $pid)..."
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

# 检查workers运行状态
check_workers_running() {
    if [[ ! -f "$PID_FILE" ]]; then
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    kill -0 "$pid" 2>/dev/null
}

# 显示状态
show_status() {
    log_info "检查Workers状态..."
    
    if check_workers_running; then
        local pid=$(cat "$PID_FILE")
        log_info "Workers正在运行 (PID: $pid)"
        
        # 尝试获取详细状态
        if command -v "$PYTHON" >/dev/null; then
            log_info "Worker详细状态:"
            "$PYTHON" "$WORKER_MANAGER" status 2>/dev/null || log_warn "无法获取详细状态"
        fi
    else
        log_warn "Workers未运行"
        
        # 检查是否有遗留进程
        local pids=$(pgrep -f "worker_manager.py" || true)
        if [[ -n "$pids" ]]; then
            log_warn "发现遗留的worker进程: $pids"
        fi
    fi
}

# 重启workers
restart_workers() {
    local count=${1:-2}
    log_info "重启workers..."
    
    stop_workers
    sleep 2
    start_workers "$count"
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

# 显示帮助
show_help() {
    echo "Invoice Assistant Worker 管理脚本"
    echo
    echo "用法: $0 <command> [options]"
    echo
    echo "命令:"
    echo "  start [count]     启动workers (默认2个)"
    echo "  stop              停止所有workers"
    echo "  restart [count]   重启workers"
    echo "  status            显示workers状态"
    echo "  logs [lines]      显示日志 (默认50行)"
    echo "  follow            实时查看日志"
    echo "  help              显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0 start 3        启动3个workers"
    echo "  $0 status         查看状态"
    echo "  $0 logs 100       显示最近100行日志"
    echo "  $0 restart        重启workers"
}

# 主函数
main() {
    # 检查环境
    check_environment
    
    # 解析命令
    case "${1:-help}" in
        start)
            start_workers "${2:-2}"
            ;;
        stop)
            stop_workers
            ;;
        restart)
            restart_workers "${2:-2}"
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "${2:-50}"
            ;;
        follow)
            follow_logs
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