#!/bin/bash

# 前端部署脚本 - Vercel 部署自动化
# 用法: ./scripts/deploy.sh [preview|production]

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
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    
    log_info "Node.js 版本: $(node --version)"
    log_info "npm 版本: $(npm --version)"
}

# 检查环境变量
check_env_vars() {
    log_info "检查环境变量..."
    
    required_vars=(
        "VITE_SUPABASE_URL"
        "VITE_SUPABASE_ANON_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_warn "环境变量 $var 未设置"
            log_warn "请确保在 Vercel Dashboard 中配置了所有必需的环境变量"
        fi
    done
}

# 运行测试
run_tests() {
    log_info "运行代码检查..."
    
    # TypeScript 类型检查
    if ! npm run type-check 2>/dev/null; then
        log_warn "TypeScript 类型检查失败，继续执行..."
    fi
    
    # ESLint 检查
    if ! npm run lint 2>/dev/null; then
        log_warn "ESLint 检查失败，继续执行..."
    fi
}

# 构建项目
build_project() {
    log_info "清理依赖并重新安装..."
    rm -rf node_modules package-lock.json
    npm install
    
    log_info "构建项目..."
    npm run build
    
    log_info "构建完成！"
    log_info "输出目录: $(pwd)/dist"
}

# 预览构建结果
preview_build() {
    log_info "启动本地预览..."
    log_info "访问 http://localhost:5174 查看构建结果"
    npm run preview
}

# Vercel 部署
deploy_to_vercel() {
    local environment=$1
    
    if ! command -v vercel &> /dev/null; then
        log_warn "Vercel CLI 未安装，尝试安装..."
        npm install -g vercel
    fi
    
    log_info "部署到 Vercel ($environment)..."
    
    if [ "$environment" = "production" ]; then
        vercel --prod
    else
        vercel
    fi
}

# 部署后验证
post_deploy_check() {
    log_info "部署后检查..."
    
    # 这里可以添加自动化测试
    log_info "建议手动验证以下功能："
    echo "  - 网站可以正常访问"
    echo "  - 路由导航正常"
    echo "  - 登录功能正常"
    echo "  - API 请求正常"
    echo "  - 移动端适配"
}

# 主函数
main() {
    local environment=${1:-preview}
    
    log_info "开始部署流程 - 环境: $environment"
    log_info "当前目录: $(pwd)"
    
    # 确保在正确的目录
    if [ ! -f "package.json" ]; then
        log_error "未找到 package.json，请在前端项目根目录运行此脚本"
        exit 1
    fi
    
    # 执行部署步骤
    check_dependencies
    check_env_vars
    run_tests
    build_project
    
    # 询问是否继续部署
    read -p "是否继续部署到 Vercel? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_to_vercel $environment
        post_deploy_check
        log_info "部署完成！"
    else
        log_info "部署已取消"
        log_info "可以运行 'npm run preview' 查看本地构建结果"
    fi
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi