# 前端容器化部署指南

## 快速开始

### 1. 环境准备

确保已安装以下软件：
- Docker
- Docker Compose

### 2. 配置环境变量

复制并配置环境变量文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的环境变量：
```bash
# Supabase 配置
VITE_SUPABASE_URL=你的supabase地址
VITE_SUPABASE_ANON_KEY=你的supabase匿名密钥

# 后端API配置
VITE_API_URL=你的后端API地址

# 应用配置
VITE_APP_NAME=发票助手
VITE_APP_VERSION=2.0.0
```

### 3. 启动应用

使用提供的脚本快速启动：

#### 开发环境
```bash
./scripts/docker-start.sh dev
```
- 访问地址: http://localhost:5173
- 支持热重载
- 适合开发调试

#### 生产环境
```bash
./scripts/docker-start.sh prod
```
- 访问地址: http://localhost
- 优化构建，性能更好
- 适合生产部署

### 4. 其他命令

```bash
# 仅构建镜像
./scripts/docker-start.sh build

# 停止容器
./scripts/docker-start.sh stop

# 清理容器和镜像
./scripts/docker-start.sh clean

# 查看日志
./scripts/docker-start.sh logs

# 显示帮助
./scripts/docker-start.sh help
```

## 手动操作

如果不使用脚本，也可以手动操作：

### 开发环境
```bash
docker-compose --profile dev up --build -d
```

### 生产环境
```bash
docker-compose --profile prod up --build -d
```

### 停止服务
```bash
docker-compose down
```

## 目录结构

```
frontend/
├── Dockerfile              # 多阶段构建文件
├── docker-compose.yml      # Docker Compose 配置
├── nginx.conf              # Nginx 配置文件
├── .dockerignore           # Docker 忽略文件
├── .env                    # 环境变量配置
├── scripts/
│   └── docker-start.sh     # 启动脚本
└── README-Docker.md        # 本文档
```

## 配置说明

### Dockerfile
- 使用多阶段构建
- 支持开发和生产环境
- 基于 Node.js 18 Alpine 镜像
- 生产环境使用 Nginx 服务静态文件

### Nginx 配置
- 启用 Gzip 压缩
- 配置静态资源缓存
- 支持 SPA 路由
- 包含安全头设置
- 提供健康检查端点

### Docker Compose
- 使用 profiles 区分开发和生产环境
- 开发环境支持热重载
- 生产环境自动重启

## 健康检查

生产环境提供健康检查端点：
```bash
curl http://localhost/health
```

## 故障排除

### 1. 端口冲突
如果端口被占用，可以修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "8080:80"  # 将80端口改为8080
```

### 2. 环境变量问题
确保 `.env` 文件存在且配置正确，特别是：
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_API_URL

### 3. 构建失败
清理 Docker 缓存：
```bash
docker system prune -a
```

### 4. 查看日志
```bash
# 查看开发环境日志
docker-compose logs -f frontend-dev

# 查看生产环境日志
docker-compose logs -f frontend-prod
```

## 部署到云平台

### Railway
1. 连接 GitHub 仓库
2. 设置环境变量
3. 使用 `Dockerfile` 自动部署

### Vercel
1. 连接 GitHub 仓库
2. 配置构建命令: `npm run build`
3. 配置输出目录: `dist`

### Render
1. 连接 GitHub 仓库
2. 选择 Docker 部署
3. 使用 `Dockerfile` 构建

## 性能优化

1. **静态资源缓存**: Nginx 配置了长期缓存
2. **Gzip 压缩**: 减少传输大小
3. **多阶段构建**: 减小镜像体积
4. **健康检查**: 确保服务可用性

## 安全配置

1. **安全头**: 配置了各种安全头
2. **内容安全策略**: 防止 XSS 攻击
3. **最小权限**: 使用非 root 用户运行