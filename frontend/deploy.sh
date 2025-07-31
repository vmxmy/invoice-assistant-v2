#!/bin/bash

# 生产服务器一键部署脚本
# 用法: ./deploy.sh [部署路径]
# 示例: ./deploy.sh /var/www/invoice-assist

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "生产服务器一键部署脚本"
    echo ""
    echo "用法:"
    echo "  ./deploy.sh [部署路径]"
    echo ""
    echo "参数:"
    echo "  部署路径    目标部署目录，默认从环境变量 INVOICE_ASSIST_PATH 读取"
    echo ""
    echo "环境变量:"
    echo "  INVOICE_ASSIST_PATH    默认部署路径"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh /var/www/invoice-assist"
    echo "  export INVOICE_ASSIST_PATH=/var/www/invoice-assist && ./deploy.sh"
    echo ""
    echo "选项:"
    echo "  -h, --help    显示此帮助信息"
}

# 检查参数
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# 获取部署路径
DEPLOY_PATH="$1"
if [[ -z "$DEPLOY_PATH" ]]; then
    DEPLOY_PATH="$INVOICE_ASSIST_PATH"
fi

if [[ -z "$DEPLOY_PATH" ]]; then
    log_error "未指定部署路径！"
    echo "请通过参数指定或设置环境变量 INVOICE_ASSIST_PATH"
    echo "使用 ./deploy.sh --help 查看帮助信息"
    exit 1
fi

# 显示部署信息
log_info "=== 生产服务器部署开始 ==="
log_info "部署路径: $DEPLOY_PATH"
log_info "当前时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 检查是否在正确的目录
if [[ ! -f "package.json" ]]; then
    log_error "未找到 package.json 文件！"
    log_error "请在 frontend 目录下运行此脚本"
    exit 1
fi

# 1. Git 拉取最新代码
log_info "步骤 1/4: 拉取最新代码..."
if git pull origin main; then
    log_success "代码更新完成"
else
    log_error "Git pull 失败！"
    exit 1
fi
echo ""

# 2. 安装依赖（如果需要）
log_info "检查依赖是否需要更新..."
if [[ ! -d "node_modules" ]] || [[ "package.json" -nt "node_modules" ]]; then
    log_info "步骤 2/4: 安装/更新依赖..."
    if npm install; then
        log_success "依赖安装完成"
    else
        log_error "依赖安装失败！"
        exit 1
    fi
else
    log_info "依赖已是最新，跳过安装"
fi
echo ""

# 3. 构建项目
log_info "步骤 3/4: 构建生产版本..."
if npm run build; then
    log_success "项目构建完成"
else
    log_error "项目构建失败！"
    exit 1
fi
echo ""

# 检查构建结果
if [[ ! -d "dist" ]]; then
    log_error "构建目录 dist 不存在！"
    exit 1
fi

# 4. 部署到目标目录
log_info "步骤 4/4: 部署到生产环境..."

# 创建目标目录（如果不存在）
if [[ ! -d "$DEPLOY_PATH" ]]; then
    log_info "创建目标目录: $DEPLOY_PATH"
    if mkdir -p "$DEPLOY_PATH"; then
        log_success "目标目录创建成功"
    else
        log_error "无法创建目标目录！"
        exit 1
    fi
fi

# 备份现有文件（如果存在）
if [[ -d "$DEPLOY_PATH" ]] && [[ "$(ls -A $DEPLOY_PATH)" ]]; then
    BACKUP_DIR="${DEPLOY_PATH}_backup_$(date +%Y%m%d_%H%M%S)"
    log_info "备份现有文件到: $BACKUP_DIR"
    if cp -r "$DEPLOY_PATH" "$BACKUP_DIR"; then
        log_success "备份完成"
    else
        log_warning "备份失败，继续部署..."
    fi
fi

# 清空目标目录
log_info "清空目标目录..."
rm -rf "$DEPLOY_PATH"/*

# 复制构建文件到目标目录
log_info "复制构建文件到目标目录..."
if cp -r dist/* "$DEPLOY_PATH/"; then
    log_success "文件部署完成"
else
    log_error "文件部署失败！"
    exit 1
fi

echo ""
log_success "=== 部署完成 ==="
log_info "部署路径: $DEPLOY_PATH"
log_info "构建时间: $(date '+%Y-%m-%d %H:%M:%S')"

# 显示部署结果统计
DEPLOYED_FILES=$(find "$DEPLOY_PATH" -type f | wc -l)
DEPLOY_SIZE=$(du -sh "$DEPLOY_PATH" | cut -f1)
log_info "部署文件: $DEPLOYED_FILES 个文件"
log_info "占用空间: $DEPLOY_SIZE"

echo ""
log_success "🎉 生产环境部署成功！"

# 可选：显示下一步操作提示
echo ""
log_info "下一步操作提示:"
echo "  1. 检查 Web 服务器配置"
echo "  2. 重启 Web 服务器（如需要）"
echo "  3. 验证网站功能是否正常"