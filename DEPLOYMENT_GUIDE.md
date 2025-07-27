# 生产环境部署指南

## 系统要求

- Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- Node.js 18+
- Python 3.9+
- Nginx
- SSL 证书
- 域名

## 部署步骤

### 1. 服务器环境准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要软件
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx

# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 Python 3.9+
sudo apt install -y python3 python3-pip python3-venv

# 安装 PM2 (进程管理)
sudo npm install -g pm2
```

### 2. 克隆项目

```bash
# 创建部署目录
sudo mkdir -p /var/www
cd /var/www

# 克隆项目
sudo git clone https://github.com/vmxmy/invoice-assistant-v2.git
sudo chown -R $USER:$USER invoice-assistant-v2
cd invoice-assistant-v2
```

### 3. 后端部署

```bash
cd backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
nano .env
```

#### 后端环境变量配置 (.env)

```env
# 应用配置
APP_ENV=production
APP_HOST=0.0.0.0
APP_PORT=8070
APP_DEBUG=false

# Supabase 配置
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# 阿里云 OCR 配置
ALICLOUD_ACCESS_KEY_ID=your_access_key_id
ALICLOUD_ACCESS_KEY_SECRET=your_access_key_secret
ALICLOUD_OCR_REGION=cn-hangzhou

# 安全配置
SECRET_KEY=your_super_secret_key_here
CORS_ORIGINS=https://yourdomain.com

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=/var/log/invoice-assistant/backend.log
```

### 4. 前端部署

```bash
cd ../frontend

# 安装依赖
npm install

# 配置生产环境变量
cp .env.example .env.production
nano .env.production
```

#### 前端生产环境变量 (.env.production)

```env
# Supabase 配置
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 后端 API 配置
VITE_API_URL=https://yourdomain.com/api

# 应用配置
VITE_APP_NAME=智能发票管理系统
VITE_APP_VERSION=2.0.0
VITE_APP_ENV=production
```

```bash
# 构建生产版本
npm run build

# 将构建文件移到 Nginx 目录
sudo cp -r dist/* /var/www/html/
```

### 5. 配置 PM2

创建 PM2 配置文件：

```bash
# 创建 PM2 配置
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'invoice-assistant-backend',
      cwd: '/var/www/invoice-assistant-v2/backend',
      script: 'uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8070',
      interpreter: '/var/www/invoice-assistant-v2/backend/venv/bin/python',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/invoice-assistant/backend-error.log',
      out_file: '/var/log/invoice-assistant/backend-out.log',
      log_file: '/var/log/invoice-assistant/backend.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

```bash
# 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. 配置 Nginx

```bash
# 创建 Nginx 配置
sudo nano /etc/nginx/sites-available/invoice-assistant
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # 前端静态文件
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
        
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
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
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/invoice-assistant /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. 配置 SSL 证书

```bash
# 使用 Let's Encrypt 获取免费 SSL 证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 设置自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

### 8. 创建日志目录

```bash
# 创建日志目录
sudo mkdir -p /var/log/invoice-assistant
sudo chown $USER:$USER /var/log/invoice-assistant

# 配置日志轮转
sudo nano /etc/logrotate.d/invoice-assistant
```

```
/var/log/invoice-assistant/*.log {
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
```

### 9. 配置防火墙

```bash
# 配置 UFW 防火墙
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### 10. 数据库配置

#### Supabase 生产配置

1. 创建生产环境 Supabase 项目
2. 配置 RLS (Row Level Security) 策略
3. 设置备份策略
4. 配置监控告警

### 11. 监控和健康检查

创建健康检查脚本：

```bash
nano /var/www/invoice-assistant-v2/health-check.sh
```

```bash
#!/bin/bash

# 检查后端服务
if curl -f http://localhost:8070/health > /dev/null 2>&1; then
    echo "Backend: OK"
else
    echo "Backend: FAILED"
    pm2 restart invoice-assistant-backend
fi

# 检查 Nginx
if systemctl is-active --quiet nginx; then
    echo "Nginx: OK"
else
    echo "Nginx: FAILED"
    sudo systemctl restart nginx
fi
```

```bash
chmod +x health-check.sh

# 添加到 crontab
crontab -e
# 添加：每5分钟检查一次
*/5 * * * * /var/www/invoice-assistant-v2/health-check.sh >> /var/log/invoice-assistant/health-check.log 2>&1
```

## 安全建议

### 1. 服务器安全

```bash
# 禁用密码登录，只允许密钥登录
sudo nano /etc/ssh/sshd_config
# 设置：
# PasswordAuthentication no
# PubkeyAuthentication yes

sudo systemctl restart ssh
```

### 2. 应用安全

- 定期更新系统和依赖
- 使用强密码和密钥
- 配置 fail2ban 防止暴力破解
- 定期备份数据

### 3. 监控配置

推荐使用以下监控工具：
- PM2 Monitor
- Nginx 日志分析
- 系统资源监控 (htop, iostat)
- 应用性能监控 (APM)

## 常见问题

### Q: 构建失败怎么办？
A: 检查 Node.js 版本，清理 node_modules 重新安装

### Q: 后端启动失败？
A: 检查 Python 虚拟环境和依赖安装，查看错误日志

### Q: SSL 证书配置失败？
A: 确保域名解析正确，防火墙开放 80/443 端口

### Q: 性能优化建议？
A: 启用 Nginx 缓存，配置 CDN，优化数据库查询

## 更新部署

```bash
# 拉取最新代码
cd /var/www/invoice-assistant-v2
git pull origin main

# 更新后端
cd backend
source venv/bin/activate
pip install -r requirements.txt
pm2 restart invoice-assistant-backend

# 更新前端
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /var/www/html/

# 重载 Nginx
sudo nginx -s reload
```