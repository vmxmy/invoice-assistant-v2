# FastAPI 后端部署指南

## 📋 部署概览

本指南提供将 FastAPI 后端部署到生产环境的完整步骤，支持多个云平台。

### 支持的部署平台
- **Railway** (推荐) - 简单易用，自动扩缩容
- **Render** - 稳定可靠，良好的免费额度  
- **Docker** - 本地开发或自托管

## 🚀 快速开始

### 1. 准备环境变量
```bash
# 复制环境变量模板
cp .env.production.example .env.production

# 编辑环境变量
nano .env.production
```

### 2. 选择部署方式
```bash
# 部署到 Railway (推荐)
./scripts/deploy.sh railway

# 部署到 Render
./scripts/deploy.sh render  

# 本地 Docker 部署
./scripts/deploy.sh docker
```

## 📊 平台对比

| 特性 | Railway | Render | Docker |
|------|---------|--------|--------|
| 免费额度 | $5/月 | 750小时/月 | 本地免费 |
| 自动部署 | ✅ Git集成 | ✅ Git集成 | ❌ 手动 |
| 扩缩容 | ✅ 自动 | ✅ 自动 | ❌ 手动 |
| 域名 | ✅ 自动 | ✅ 自动 | ❌ 需配置 |
| 数据库 | 额外费用 | 额外费用 | 外部连接 |
| 难度 | ⭐⭐ 简单 | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐ 复杂 |

## 🛠️ Railway 部署 (推荐)

### 优势
- 最简单的部署体验
- 自动从 Git 部署
- 内置监控和日志
- 支持预览环境

### 步骤

#### 1. 安装 Railway CLI
```bash
npm install -g @railway/cli
railway login
```

#### 2. 初始化项目
```bash
cd backend
railway init
```

#### 3. 设置环境变量
在 Railway Dashboard 或使用 CLI：
```bash
railway variables:set SUPABASE_URL=https://sfenhhtvcyslxplvewmt.supabase.co
railway variables:set SUPABASE_KEY=your-anon-key
railway variables:set DATABASE_HOST=your-db-host
railway variables:set DATABASE_USER=your-db-user
railway variables:set DATABASE_PASSWORD=your-db-password
```

#### 4. 部署
```bash
railway up
```

### Railway 配置文件
项目包含 `railway.json` 配置：
- 使用 Dockerfile 构建
- 健康检查路径: `/health`
- 自动重启策略

## 🎨 Render 部署

### 优势
- 稳定的免费额度
- 优秀的文档
- 支持多种语言
- 良好的监控面板

### 步骤

#### 1. 准备 GitHub 仓库
```bash
git add .
git commit -m "feat: 准备 Render 部署"
git push origin main
```

#### 2. 创建 Render 服务
1. 访问 [Render Dashboard](https://dashboard.render.com)
2. 点击 "New +" → "Web Service"
3. 连接 GitHub 仓库
4. 设置根目录为 `backend`

#### 3. 配置构建设置
- **Environment**: Docker
- **Dockerfile Path**: `Dockerfile`
- **Build Command**: `docker build -t backend .`
- **Start Command**: `gunicorn app.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`

#### 4. 设置环境变量
在 Render Dashboard 中添加：
```
SUPABASE_URL=https://sfenhhtvcyslxplvewmt.supabase.co
SUPABASE_KEY=your-anon-key
DATABASE_HOST=your-db-host
DATABASE_USER=your-db-user
DATABASE_PASSWORD=your-db-password
```

## 🐳 Docker 部署

### 本地开发
```bash
# 构建镜像
docker build -t invoice-backend .

# 运行容器
docker run -d \
  --name invoice-backend \
  -p 8090:8000 \
  --env-file .env.production \
  invoice-backend
```

### Docker Compose
```bash
# 启动完整环境
docker-compose up -d

# 查看日志
docker-compose logs -f api

# 停止服务
docker-compose down
```

## 🔧 环境变量配置

### 必需变量
```bash
# 数据库
DATABASE_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DATABASE_PORT=6543
DATABASE_USER=postgres.sfenhhtvcyslxplvewmt
DATABASE_PASSWORD=your-password
DATABASE_NAME=postgres

# Supabase
SUPABASE_URL=https://sfenhhtvcyslxplvewmt.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

### 可选变量
```bash
# OCR 服务
MINERU_API_TOKEN=your-token
MINERU_API_URL=https://api.mineru.net

# Mailgun
MAILGUN_API_KEY=your-key
MAILGUN_DOMAIN=your-domain.com
MAILGUN_WEBHOOK_SIGNING_KEY=your-signing-key

# 应用配置
APP_ENV=production
DEBUG=false
LOG_LEVEL=INFO
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

## 🏥 健康检查和监控

### 健康检查端点
- `GET /health` - 基本健康状态
- `GET /health/detailed` - 详细健康信息
- `GET /health/database` - 数据库连接状态

### 监控指标
- 响应时间
- 错误率
- 内存使用
- CPU 使用
- 数据库连接数

### 日志配置
```python
# 日志级别
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR

# 日志格式
LOG_FORMAT=json  # json, text
```

## 🔒 安全配置

### HTTPS
所有平台都自动提供 HTTPS：
- Railway: 自动 SSL 证书
- Render: 自动 SSL 证书
- Docker: 需要反向代理 (nginx)

### CORS 配置
```python
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-domain.com
```

### 安全头
应用自动设置安全头：
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` 
- `X-XSS-Protection: 1; mode=block`

## 📊 性能优化

### Gunicorn 配置
```bash
gunicorn app.main:app \
  --workers 2 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 300 \
  --keep-alive 2 \
  --max-requests 1000 \
  --max-requests-jitter 100
```

### 数据库连接池
```python
# 在 config.py 中配置
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=10
DATABASE_POOL_TIMEOUT=30
```

## 🚨 故障排查

### 常见问题

#### 1. 数据库连接失败
```bash
# 检查连接信息
psql "postgresql://user:pass@host:port/db" -c "SELECT 1;"

# 检查防火墙和 SSL
telnet your-db-host 5432
```

#### 2. 环境变量未生效
```bash
# 检查变量设置
railway variables
render env list

# 重新部署
railway up --detach
```

#### 3. 内存溢出
```bash
# 监控内存使用
railway logs
render logs

# 调整 workers 数量
--workers 1  # 减少内存使用
```

#### 4. 端口冲突
```bash
# 检查端口使用
lsof -i :8000
netstat -tlnp | grep 8000

# 更改端口
export PORT=8080
```

### 调试命令
```bash
# 查看容器日志
docker logs invoice-backend -f

# 进入容器调试
docker exec -it invoice-backend bash

# 检查进程
docker exec invoice-backend ps aux

# 检查文件权限
docker exec invoice-backend ls -la /app
```

## 📝 部署检查清单

### 部署前
- [ ] 环境变量已配置
- [ ] 数据库连接测试通过
- [ ] 依赖项已安装
- [ ] Docker 镜像构建成功
- [ ] 本地测试通过

### 部署后
- [ ] 健康检查通过
- [ ] API 端点正常响应
- [ ] 数据库操作正常
- [ ] 文件上传功能正常
- [ ] 日志输出正常
- [ ] 内存和 CPU 使用合理

### 集成测试
- [ ] 前端能够连接后端
- [ ] 用户认证流程正常
- [ ] 发票上传和处理正常
- [ ] OCR 服务调用正常
- [ ] 邮件通知功能正常

## 💰 成本估算

### Railway
- 免费: $5 使用额度/月
- Starter: $20/月 (推荐)
- 数据库: $5-15/月 (外部 Supabase)

### Render
- 免费: 750 小时/月
- Starter: $7/月
- 数据库: $7-15/月 (外部 Supabase)

### 总成本对比
- Railway: ~$25-35/月
- Render: ~$14-22/月
- Docker 自托管: VPS $5-20/月

建议从 Render 免费版开始，需要更多资源时升级到付费版。