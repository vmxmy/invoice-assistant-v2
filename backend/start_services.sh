#!/bin/bash

# 邮件处理流水线服务启动脚本
# 用于启动Redis、Celery等必要服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数定义
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    local cmd=$1
    local install_hint=$2
    
    if ! command -v "$cmd" &> /dev/null; then
        print_error "$cmd 未找到"
        if [ -n "$install_hint" ]; then
            print_info "安装建议: $install_hint"
        fi
        return 1
    fi
    return 0
}

# 检查Redis是否运行
check_redis() {
    if redis-cli ping &> /dev/null; then
        print_success "Redis 已运行"
        return 0
    else
        print_warning "Redis 未运行"
        return 1
    fi
}

# 启动Redis
start_redis() {
    print_info "启动Redis服务..."
    
    # 检查Redis是否已经运行
    if check_redis; then
        return 0
    fi
    
    # 尝试启动Redis
    if command -v redis-server &> /dev/null; then
        # 在后台启动Redis
        redis-server --daemonize yes --port 6379
        sleep 2
        
        if check_redis; then
            print_success "Redis 启动成功"
            return 0
        else
            print_error "Redis 启动失败"
            return 1
        fi
    else
        print_error "Redis 未安装"
        print_info "安装建议: brew install redis 或 apt-get install redis-server"
        return 1
    fi
}

# 启动Celery Worker
start_celery_worker() {
    print_info "启动Celery Worker..."
    
    # 检查Python环境
    if ! python -c "import app.core.celery_app" &> /dev/null; then
        print_error "无法导入Celery应用，请检查Python环境"
        return 1
    fi
    
    # 启动Celery Worker
    print_info "在后台启动Celery Worker..."
    nohup celery -A app.core.celery_app worker --loglevel=info --concurrency=2 > celery_worker.log 2>&1 &
    
    # 记录PID
    echo $! > celery_worker.pid
    
    sleep 3
    
    # 检查进程是否还在运行
    if kill -0 $! 2>/dev/null; then
        print_success "Celery Worker 启动成功 (PID: $!)"
        print_info "日志文件: celery_worker.log"
        return 0
    else
        print_error "Celery Worker 启动失败"
        return 1
    fi
}

# 启动Celery Beat（定时任务调度器）
start_celery_beat() {
    print_info "启动Celery Beat..."
    
    # 启动Celery Beat
    print_info "在后台启动Celery Beat..."
    nohup celery -A app.core.celery_app beat --loglevel=info > celery_beat.log 2>&1 &
    
    # 记录PID
    echo $! > celery_beat.pid
    
    sleep 2
    
    # 检查进程是否还在运行
    if kill -0 $! 2>/dev/null; then
        print_success "Celery Beat 启动成功 (PID: $!)"
        print_info "日志文件: celery_beat.log"
        return 0
    else
        print_error "Celery Beat 启动失败"
        return 1
    fi
}

# 停止所有服务
stop_services() {
    print_info "停止所有服务..."
    
    # 停止Celery Worker
    if [ -f celery_worker.pid ]; then
        local worker_pid=$(cat celery_worker.pid)
        if kill -0 "$worker_pid" 2>/dev/null; then
            print_info "停止Celery Worker (PID: $worker_pid)..."
            kill -TERM "$worker_pid"
            sleep 2
            
            # 如果进程仍在运行，强制终止
            if kill -0 "$worker_pid" 2>/dev/null; then
                kill -KILL "$worker_pid"
            fi
            
            print_success "Celery Worker 已停止"
        fi
        rm -f celery_worker.pid
    fi
    
    # 停止Celery Beat
    if [ -f celery_beat.pid ]; then
        local beat_pid=$(cat celery_beat.pid)
        if kill -0 "$beat_pid" 2>/dev/null; then
            print_info "停止Celery Beat (PID: $beat_pid)..."
            kill -TERM "$beat_pid"
            sleep 2
            
            # 如果进程仍在运行，强制终止
            if kill -0 "$beat_pid" 2>/dev/null; then
                kill -KILL "$beat_pid"
            fi
            
            print_success "Celery Beat 已停止"
        fi
        rm -f celery_beat.pid
    fi
    
    # 可选：停止Redis（如果是脚本启动的）
    # redis-cli shutdown
}

# 检查服务状态
check_status() {
    print_info "检查服务状态..."
    
    # 检查Redis
    if check_redis; then
        print_success "Redis: 运行中"
    else
        print_error "Redis: 未运行"
    fi
    
    # 检查Celery Worker
    if [ -f celery_worker.pid ]; then
        local worker_pid=$(cat celery_worker.pid)
        if kill -0 "$worker_pid" 2>/dev/null; then
            print_success "Celery Worker: 运行中 (PID: $worker_pid)"
        else
            print_error "Celery Worker: 未运行"
        fi
    else
        print_error "Celery Worker: 未运行"
    fi
    
    # 检查Celery Beat
    if [ -f celery_beat.pid ]; then
        local beat_pid=$(cat celery_beat.pid)
        if kill -0 "$beat_pid" 2>/dev/null; then
            print_success "Celery Beat: 运行中 (PID: $beat_pid)"
        else
            print_error "Celery Beat: 未运行"
        fi
    else
        print_error "Celery Beat: 未运行"
    fi
}

# 显示帮助信息
show_help() {
    echo "邮件处理流水线服务管理脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start     启动所有服务"
    echo "  stop      停止所有服务"
    echo "  restart   重启所有服务"
    echo "  status    检查服务状态"
    echo "  redis     只启动Redis"
    echo "  worker    只启动Celery Worker"
    echo "  beat      只启动Celery Beat"
    echo "  test      运行测试脚本"
    echo "  help      显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start      # 启动所有服务"
    echo "  $0 status     # 检查服务状态"
    echo "  $0 stop       # 停止所有服务"
}

# 运行测试
run_test() {
    print_info "运行邮件处理流水线测试..."
    
    if [ -f "test_email_pipeline.py" ]; then
        python test_email_pipeline.py
    else
        print_error "测试脚本不存在: test_email_pipeline.py"
        return 1
    fi
}

# 主函数
main() {
    local command=${1:-help}
    
    case $command in
        start)
            print_info "启动邮件处理流水线服务..."
            start_redis
            start_celery_worker
            start_celery_beat
            echo ""
            check_status
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            sleep 2
            start_redis
            start_celery_worker
            start_celery_beat
            echo ""
            check_status
            ;;
        status)
            check_status
            ;;
        redis)
            start_redis
            ;;
        worker)
            start_celery_worker
            ;;
        beat)
            start_celery_beat
            ;;
        test)
            run_test
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi