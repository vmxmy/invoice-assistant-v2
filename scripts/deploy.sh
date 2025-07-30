#!/bin/bash

# 智能发票管理系统 V2 - 生产环境部署脚本
# 使用方法: ./deploy.sh [domain] [email]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
DOMAIN=${1:-"your-domain.com"}
EMAIL=${2:-"your-email@example.com"}
PROJECT_DIR="/var/www/invoice-assistant-v2"
LOG_DIR="/var/log/invoice-assistant"

echo -e "${BLUE}🚀 开始部署智能发票管理系统 V2...${NC}"

# 检查参数
if [ "$DOMAIN" = "your-domain.com" ] || [ "$EMAIL" = "your-email@example.com" ]; then
    echo -e "${RED}❌ 请提供域名和邮箱: ./deploy.sh yourdomain.com you@email.com${NC}"
    exit 1
fi

echo -e "${BLUE}📋 部署配置:${NC}"
echo -e "   域名: ${GREEN}$DOMAIN${NC}"
echo -e "   邮箱: ${GREEN}$EMAIL${NC}"
echo -e "   项目目录: ${GREEN}$PROJECT_DIR${NC}"

# 确认继续
read -p "确认开始部署? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏹️  部署已取消${NC}"
    exit 1
fi

# 1. 更新系统
echo -e "${BLUE}📦 更新系统...${NC}"
sudo apt update && sudo apt upgrade -y

# 2. 安装必要软件
echo -e "${BLUE}🔧 安装必要软件...${NC}"
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx python3 python3-pip python3-venv

# 3. 安装 Node.js
echo -e "${BLUE}📦 安装 Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 4. 安装 PM2
echo -e "${BLUE}🔄 安装 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# 5. 创建项目目录
echo -e "${BLUE}📁 准备项目目录...${NC}"
sudo mkdir -p /var/www
cd /var/www

# 6. 克隆项目（如果不存在）
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${BLUE}📥 克隆项目...${NC}"
    sudo git clone https://github.com/vmxmy/invoice-assistant-v2.git
    sudo chown -R $USER:$USER invoice-assistant-v2
else
    echo -e "${YELLOW}📂 项目目录已存在，更新代码...${NC}"
    cd $PROJECT_DIR
    git pull origin main
fi

cd $PROJECT_DIR

# 7. 后端配置
echo -e "${BLUE}⚙️  配置后端...${NC}"
cd backend

# 创建虚拟环境
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

# 创建环境配置文件
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 创建后端环境配置文件...${NC}"
    cat > .env << EOF
# 应用配置
APP_ENV=production
APP_HOST=0.0.0.0
APP_PORT=8070
APP_DEBUG=false

# Supabase 配置 - 请手动填写
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# 阿里云 OCR 配置 - 请手动填写
ALICLOUD_ACCESS_KEY_ID=your_access_key_id
ALICLOUD_ACCESS_KEY_SECRET=your_access_key_secret
ALICLOUD_OCR_REGION=cn-hangzhou

# 安全配置
SECRET_KEY=$(openssl rand -hex 32)
CORS_ORIGINS=https://$DOMAIN

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=$LOG_DIR/backend.log
EOF
    echo -e "${RED}⚠️  请编辑 $PROJECT_DIR/backend/.env 填写 Supabase 和阿里云配置${NC}"
fi

# 8. 前端配置
echo -e "${BLUE}🎨 配置前端...${NC}"
cd ../frontend

npm install

# 创建生产环境配置
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}📝 创建前端环境配置文件...${NC}"
    cat > .env.production << EOF
# Supabase 配置 - 请手动填写
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 后端 API 配置
VITE_API_URL=https://$DOMAIN/api

# 应用配置
VITE_APP_NAME=智能发票管理系统
VITE_APP_VERSION=2.0.0
VITE_APP_ENV=production
EOF
    echo -e "${RED}⚠️  请编辑 $PROJECT_DIR/frontend/.env.production 填写 Supabase 配置${NC}"
fi

# 构建前端
echo -e "${BLUE}🏗️  构建前端...${NC}"
npm run build

# 9. 创建日志目录
echo -e "${BLUE}📄 创建日志目录...${NC}"
sudo mkdir -p $LOG_DIR
sudo chown $USER:$USER $LOG_DIR

# 10. 配置 PM2
echo -e "${BLUE}🔄 配置 PM2...${NC}"
cd $PROJECT_DIR

cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'invoice-assistant-backend',
      cwd: '$PROJECT_DIR/backend',
      script: 'uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8070',
      interpreter: '$PROJECT_DIR/backend/venv/bin/python',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '$LOG_DIR/backend-error.log',
      out_file: '$LOG_DIR/backend-out.log',
      log_file: '$LOG_DIR/backend.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF

# 11. 配置 Nginx
echo -e "${BLUE}🌐 配置 Nginx...${NC}"
sudo tee /etc/nginx/sites-available/invoice-assistant << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # 前端静态文件
    location / {
        root $PROJECT_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # 安全头
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:8070/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 文件上传限制
    client_max_body_size 50M;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
}
EOF

# 启用站点
sudo ln -sf /etc/nginx/sites-available/invoice-assistant /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试 Nginx 配置
sudo nginx -t

# 12. 启动服务
echo -e "${BLUE}🚀 启动服务...${NC}"

# 启动后端
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -1 | sudo bash

# 重载 Nginx
sudo systemctl reload nginx

# 13. 配置防火墙
echo -e "${BLUE}🔒 配置防火墙...${NC}"
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 14. 配置 SSL
echo -e "${BLUE}🔐 配置 SSL 证书...${NC}"
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive

# 15. 创建健康检查脚本
echo -e "${BLUE}💊 创建健康检查脚本...${NC}"
cat > $PROJECT_DIR/health-check.sh << 'EOF'
#!/bin/bash

# 检查后端服务
if curl -f http://localhost:8070/health > /dev/null 2>&1; then
    echo "$(date): Backend: OK"
else
    echo "$(date): Backend: FAILED - Restarting..."
    pm2 restart invoice-assistant-backend
fi

# 检查 Nginx
if systemctl is-active --quiet nginx; then
    echo "$(date): Nginx: OK"
else
    echo "$(date): Nginx: FAILED - Restarting..."
    sudo systemctl restart nginx
fi
EOF

chmod +x $PROJECT_DIR/health-check.sh

# 添加到 crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * $PROJECT_DIR/health-check.sh >> $LOG_DIR/health-check.log 2>&1") | crontab -

# 16. 配置日志轮转
echo -e "${BLUE}📋 配置日志轮转...${NC}"
sudo tee /etc/logrotate.d/invoice-assistant << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 $USER $USER
    postrotate
        pm2 reload all
    endscript
}
EOF

echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo -e "${BLUE}📊 部署状态:${NC}"
echo -e "   网站地址: ${GREEN}https://$DOMAIN${NC}"
echo -e "   后端状态: ${GREEN}$(pm2 list | grep invoice-assistant-backend)${NC}"
echo -e "   Nginx 状态: ${GREEN}$(systemctl is-active nginx)${NC}"
echo ""
echo -e "${YELLOW}⚠️  重要提醒:${NC}"
echo -e "   1. 请编辑配置文件: ${RED}$PROJECT_DIR/backend/.env${NC}"
echo -e "   2. 请编辑配置文件: ${RED}$PROJECT_DIR/frontend/.env.production${NC}"
echo -e "   3. 配置完成后重启服务: ${BLUE}pm2 restart all${NC}"
echo ""
echo -e "${BLUE}📋 有用的命令:${NC}"
echo -e "   查看后端日志: ${BLUE}pm2 logs invoice-assistant-backend${NC}"
echo -e "   重启后端服务: ${BLUE}pm2 restart invoice-assistant-backend${NC}"
echo -e "   查看系统状态: ${BLUE}pm2 status${NC}"
echo -e "   查看 Nginx 日志: ${BLUE}sudo tail -f /var/log/nginx/error.log${NC}"
echo ""
echo -e "${GREEN}🎉 部署成功！请访问 https://$DOMAIN 查看应用${NC}"