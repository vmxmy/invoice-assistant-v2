# 生产环境部署指南

## 快速部署

### 方法1：直接指定路径
```bash
./deploy.sh /var/www/html/invoice-assist
```

### 方法2：使用环境变量
```bash
export INVOICE_ASSIST_PATH="/var/www/html/invoice-assist"
./deploy.sh
```

### 方法3：使用配置文件
```bash
cp deploy.example.sh deploy.local.sh
# 编辑 deploy.local.sh 设置你的部署路径
./deploy.local.sh
```

## 部署流程

脚本会自动执行以下步骤：

1. **代码更新** - `git pull origin main`
2. **依赖检查** - 如需要则运行 `npm install`
3. **项目构建** - `npm run build`
4. **文件部署** - 复制 `dist/*` 到目标目录

## 安全特性

- ✅ 自动备份现有文件
- ✅ 错误时立即停止
- ✅ 详细的操作日志
- ✅ 部署结果验证

## 环境要求

- Node.js 和 npm
- Git 仓库访问权限
- 目标目录写入权限

## 常用部署路径

### Nginx
```bash
./deploy.sh /var/www/html/invoice-assist
./deploy.sh /usr/share/nginx/html/invoice-assist
```

### Apache
```bash
./deploy.sh /var/www/html/invoice-assist
./deploy.sh /var/www/invoice-assist
```

### 自定义服务器
```bash
./deploy.sh /home/www/invoice-assist
./deploy.sh /opt/webapp/invoice-assist
```

## 故障排除

### 权限问题
```bash
sudo chown -R $USER:$USER /var/www/html/invoice-assist
sudo chmod -R 755 /var/www/html/invoice-assist
```

### 备份恢复
如果部署出现问题，可以恢复备份：
```bash
# 查看备份目录
ls /var/www/html/invoice-assist_backup_*

# 恢复最新备份
cp -r /var/www/html/invoice-assist_backup_20240731_143020/* /var/www/html/invoice-assist/
```

### 清理旧备份
```bash
# 保留最近3个备份，删除其他
find /var/www/html -name "invoice-assist_backup_*" -type d | sort -r | tail -n +4 | xargs rm -rf
```

## Web服务器配置

### Nginx 配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html/invoice-assist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Apache .htaccess 示例
```apache
RewriteEngine On
RewriteBase /

# Handle client-side routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# API proxy (需要 mod_proxy)
ProxyPass /api/ http://localhost:3000/api/
ProxyPassReverse /api/ http://localhost:3000/api/
```

## 自动化部署

### 创建系统服务
```bash
sudo tee /etc/systemd/system/invoice-deploy.service > /dev/null <<EOF
[Unit]
Description=Invoice Assistant Deploy Service
After=network.target

[Service]
Type=oneshot
User=www-data
WorkingDirectory=/path/to/frontend
ExecStart=/path/to/frontend/deploy.sh
Environment=INVOICE_ASSIST_PATH=/var/www/html/invoice-assist

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable invoice-deploy.service
```

### Cron 定时部署
```bash
# 每天凌晨2点自动部署
0 2 * * * cd /path/to/frontend && ./deploy.sh > /var/log/invoice-deploy.log 2>&1
```

### Git Hooks 自动部署
在服务器的 Git 仓库中添加 post-receive hook：
```bash
#!/bin/bash
cd /path/to/frontend
./deploy.sh
```

## 监控和日志

脚本输出详细的部署日志，包括：
- 各步骤执行状态
- 错误信息和解决提示
- 部署统计信息（文件数量、占用空间）

建议将部署日志重定向到文件：
```bash
./deploy.sh 2>&1 | tee deploy-$(date +%Y%m%d-%H%M%S).log
```