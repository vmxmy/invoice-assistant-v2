#!/bin/bash

# 前端容器化启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${2}${1}${NC}"
}

# 检查环境变量文件
check_env_file() {
    if [ ! -f ".env" ]; then
        print_message "错误: .env 文件不存在" $RED
        print_message "请先配置 .env 文件，可以参考 .env.example" $YELLOW
        exit 1
    fi
    print_message "✓ .env 文件检查通过" $GREEN
}

# 显示帮助信息
show_help() {
    echo "前端容器化启动脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  dev     启动开发环境 (端口: 5173)"
    echo "  prod    启动生产环境 (端口: 80)"
    echo "  build   仅构建镜像"
    echo "  stop    停止所有容器"
    echo "  clean   清理容器和镜像"
    echo "  logs    查看容器日志"
    echo "  help    显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 dev      # 启动开发环境"
    echo "  $0 prod     # 启动生产环境"
    echo "  $0 clean    # 清理所有容器和镜像"
}

# 启动开发环境
start_dev() {
    print_message "🚀 启动开发环境..." $BLUE
    docker-compose --profile dev up --build -d
    print_message "✓ 开发环境启动成功!" $GREEN
    print_message "访问地址: http://localhost:5173" $YELLOW
    print_message "查看日志: docker-compose logs -f frontend-dev" $YELLOW
}

# 启动生产环境
start_prod() {
    print_message "🚀 启动生产环境..." $BLUE
    docker-compose --profile prod up --build -d
    print_message "✓ 生产环境启动成功!" $GREEN
    print_message "访问地址: http://localhost" $YELLOW
    print_message "健康检查: http://localhost/health" $YELLOW
    print_message "查看日志: docker-compose logs -f frontend-prod" $YELLOW
}

# 仅构建镜像
build_only() {
    print_message "🔨 构建镜像..." $BLUE
    docker-compose build
    print_message "✓ 镜像构建完成!" $GREEN
}

# 停止容器
stop_containers() {
    print_message "🛑 停止所有容器..." $BLUE
    docker-compose down
    print_message "✓ 容器已停止!" $GREEN
}

# 清理容器和镜像
clean_all() {
    print_message "🧹 清理容器和镜像..." $BLUE
    docker-compose down --rmi all --volumes --remove-orphans
    print_message "✓ 清理完成!" $GREEN
}

# 查看日志
show_logs() {
    print_message "📋 查看容器日志..." $BLUE
    docker-compose logs -f
}

# 主逻辑
main() {
    # 检查 Docker 是否安装
    if ! command -v docker &> /dev/null; then
        print_message "错误: Docker 未安装" $RED
        exit 1
    fi

    # 检查 Docker Compose 是否安装
    if ! command -v docker-compose &> /dev/null; then
        print_message "错误: Docker Compose 未安装" $RED
        exit 1
    fi

    # 检查环境变量文件
    check_env_file

    case "${1:-help}" in
        "dev")
            start_dev
            ;;
        "prod")
            start_prod
            ;;
        "build")
            build_only
            ;;
        "stop")
            stop_containers
            ;;
        "clean")
            clean_all
            ;;
        "logs")
            show_logs
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 运行主函数
main "$@"