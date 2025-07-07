#!/bin/bash

# 后端部署脚本 - Railway/Render 部署自动化
# 用法: ./scripts/deploy.sh [railway|render|docker]

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 未安装"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    
    log_info "Python 版本: $(python3 --version)"
    log_info "Docker 版本: $(docker --version)"
}

# 检查环境变量
check_env_vars() {
    log_info "检查环境变量..."
    
    required_vars=(
        "SUPABASE_URL"
        "SUPABASE_KEY"
        "DATABASE_HOST"
        "DATABASE_USER"
        "DATABASE_PASSWORD"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "缺少环境变量: ${missing_vars[*]}"
        log_error "请设置这些环境变量后重试"
        exit 1
    fi
    
    log_info "所有必需的环境变量已设置"
}

# 运行测试
run_tests() {
    log_info "运行测试..."
    
    # 激活虚拟环境
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    
    # 安装测试依赖
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    fi
    
    # 运行测试
    if [ -d "tests" ]; then
        python -m pytest tests/ -v
    else
        log_warn "未找到测试目录，跳过测试"
    fi
}

# 构建 Docker 镜像
build_docker() {
    log_info "构建 Docker 镜像..."
    
    local image_name="invoice-backend"
    local tag=${1:-latest}
    
    docker build -t "$image_name:$tag" .
    
    log_info "Docker 镜像构建完成: $image_name:$tag"
    
    # 测试镜像
    log_info "测试 Docker 镜像..."
    container_id=$(docker run -d -p 8000:8000 \
        -e DATABASE_HOST="$DATABASE_HOST" \
        -e DATABASE_USER="$DATABASE_USER" \
        -e DATABASE_PASSWORD="$DATABASE_PASSWORD" \
        -e SUPABASE_URL="$SUPABASE_URL" \
        -e SUPABASE_KEY="$SUPABASE_KEY" \
        "$image_name:$tag")
    
    sleep 10
    
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log_info "健康检查通过"
    else
        log_error "健康检查失败"
        docker logs "$container_id"
        docker stop "$container_id"
        exit 1
    fi
    
    docker stop "$container_id"
    log_info "Docker 测试完成"
}

# 部署到 Railway
deploy_railway() {
    log_info "部署到 Railway..."
    
    if ! command -v railway &> /dev/null; then
        log_warn "Railway CLI 未安装，尝试安装..."
        npm install -g @railway/cli
    fi
    
    # 登录 Railway
    if ! railway whoami > /dev/null 2>&1; then
        log_info "请登录 Railway..."
        railway login
    fi
    
    # 检查项目
    if ! railway status > /dev/null 2>&1; then
        log_info "初始化 Railway 项目..."
        railway init
    fi
    
    # 设置环境变量
    log_info "设置环境变量..."
    railway variables:set DATABASE_HOST="$DATABASE_HOST"
    railway variables:set DATABASE_USER="$DATABASE_USER" 
    railway variables:set DATABASE_PASSWORD="$DATABASE_PASSWORD"
    railway variables:set SUPABASE_URL="$SUPABASE_URL"
    railway variables:set SUPABASE_KEY="$SUPABASE_KEY"
    
    # 部署
    log_info "开始部署..."
    railway up
    
    log_info "Railway 部署完成！"
    railway status
}

# 部署到 Render
deploy_render() {
    log_info "部署到 Render..."
    
    # Render 使用 Git 部署，这里只是检查和提示
    log_info "Render 部署步骤："
    echo "1. 将代码推送到 GitHub"
    echo "2. 在 Render Dashboard 中创建新的 Web Service"
    echo "3. 连接 GitHub 仓库"
    echo "4. 设置构建命令: docker build"
    echo "5. 设置启动命令: gunicorn app.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:\$PORT"
    echo "6. 设置环境变量 (参考 .env.production.example)"
    
    # 检查 git 状态
    if git status > /dev/null 2>&1; then
        log_info "当前 Git 状态:"
        git status --porcelain
        
        read -p "是否提交并推送代码? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add .
            git commit -m "feat: 准备部署到生产环境" || true
            git push
            log_info "代码已推送到 GitHub"
        fi
    else
        log_warn "不在 Git 仓库中"
    fi
}

# 本地 Docker 部署
deploy_docker() {
    log_info "本地 Docker 部署..."
    
    # 构建镜像
    build_docker
    
    # 停止现有容器
    if docker ps -q --filter "name=invoice-backend" | grep -q .; then
        log_info "停止现有容器..."
        docker stop invoice-backend
        docker rm invoice-backend
    fi
    
    # 启动新容器
    log_info "启动新容器..."
    docker run -d \
        --name invoice-backend \
        -p 8090:8000 \
        -e DATABASE_HOST="$DATABASE_HOST" \
        -e DATABASE_USER="$DATABASE_USER" \
        -e DATABASE_PASSWORD="$DATABASE_PASSWORD" \
        -e SUPABASE_URL="$SUPABASE_URL" \
        -e SUPABASE_KEY="$SUPABASE_KEY" \
        -v "$(pwd)/uploads:/app/uploads" \
        -v "$(pwd)/logs:/app/logs" \
        --restart unless-stopped \
        invoice-backend:latest
    
    log_info "容器已启动，访问 http://localhost:8090"
    
    # 显示日志
    sleep 5
    docker logs invoice-backend --tail 20
}

# 主函数
main() {
    local platform=${1:-docker}
    
    log_info "开始部署流程 - 平台: $platform"
    log_info "当前目录: $(pwd)"
    
    # 确保在正确的目录
    if [ ! -f "app/main.py" ]; then
        log_error "未找到 app/main.py，请在后端项目根目录运行此脚本"
        exit 1
    fi
    
    # 执行通用检查
    check_dependencies
    check_env_vars
    
    # 根据平台执行部署
    case $platform in
        railway)
            deploy_railway
            ;;
        render)
            deploy_render
            ;;
        docker)
            deploy_docker
            ;;
        *)
            log_error "不支持的平台: $platform"
            log_error "支持的平台: railway, render, docker"
            exit 1
            ;;
    esac
    
    log_info "部署完成！"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi