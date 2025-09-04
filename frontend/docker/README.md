# Docker 部署文档

## 概述

这个目录包含了 Invoice Assistant 前端应用的 Docker 配置文件和部署脚本。

## 文件结构

```
docker/
├── Dockerfile              # 多阶段构建的 Docker 镜像文件
├── docker-compose.yml      # Docker Compose 配置文件
├── nginx.conf              # Nginx 配置文件
├── env-substitute.sh       # 环境变量替换脚本
├── build.sh               # 构建脚本
├── deploy.sh              # 部署脚本
├── .env.example           # 环境变量示例文件
└── README.md              # 本文档
```

## 快速开始

### 1. 环境配置

复制环境变量示例文件：
```bash
cd frontend
cp docker/.env.example .env
```

编辑 `.env` 文件，填入实际的配置值：
```bash
# Supabase 配置
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
DB_URL=postgresql://postgres:password@host:port/database
```

### 2. 构建镜像

```bash
# 使用构建脚本（推荐）
./docker/build.sh

# 或手动构建
docker build -f docker/Dockerfile -t invoice-assistant-frontend .
```

### 3. 部署应用

```bash
# 本地开发环境
./docker/deploy.sh deploy local

# 生产环境
./docker/deploy.sh deploy production
```

## 构建脚本使用

### build.sh 选项

```bash
# 基本用法
./docker/build.sh

# 指定构建模式
./docker/build.sh -m staging -t v2.0.22

# 构建并推送到注册表
./docker/build.sh -r docker.io/myorg -t latest
```

参数说明：
- `-m, --mode`: 构建模式 (local, staging, production)
- `-t, --tag`: 镜像标签 (默认: latest)
- `-r, --registry`: 容器注册表 URL
- `-h, --help`: 显示帮助信息

## 部署脚本使用

### deploy.sh 命令

```bash
# 部署到不同环境
./docker/deploy.sh deploy local      # 本地开发
./docker/deploy.sh deploy staging    # 测试环境
./docker/deploy.sh deploy production # 生产环境

# 查看日志
./docker/deploy.sh logs 100

# 查看状态
./docker/deploy.sh status

# 停止部署
./docker/deploy.sh stop

# 清理资源
./docker/deploy.sh cleanup
```

## 环境变量说明

### 必需变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJhbGciOi...` |
| `DB_URL` | 数据库连接字符串 | `postgresql://...` |

### 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `BUILD_MODE` | 构建模式 | `production` |
| `PORT` | 容器端口 | `3000` |
| `VITE_APP_ENV` | 应用环境 | `production` |
| `VITE_ENABLE_DEBUG` | 调试模式 | `false` |

## 部署环境

### 本地开发 (local)
- 启用调试功能
- 热重载支持
- 详细日志输出

### 测试环境 (staging)
- 接近生产的配置
- 健康检查
- 性能监控

### 生产环境 (production)
- 最优化构建
- 安全配置
- 缓存优化
- 健康检查确认

## 高级配置

### 自定义 Nginx 配置

编辑 `docker/nginx.conf` 文件以自定义：
- 静态资源缓存策略
- 安全头设置
- API 代理配置
- 错误页面

### 多阶段构建优化

Dockerfile 使用多阶段构建：
1. **Builder 阶段**: 安装依赖并构建应用
2. **Production 阶段**: 仅包含生产必需文件

### 运行时环境变量注入

`env-substitute.sh` 脚本在容器启动时：
1. 查找所有 HTML/JS/CSS 文件
2. 替换环境变量占位符
3. 更新 Nginx 配置

## 监控和日志

### 健康检查
- HTTP 健康检查端点: `/health`
- Docker 容器健康状态监控
- 启动探针和就绪探针

### 日志管理
```bash
# 查看实时日志
./docker/deploy.sh logs

# 查看特定行数的日志
./docker/deploy.sh logs 200

# Docker Compose 原生命令
docker-compose logs -f frontend
```

## 故障排除

### 常见问题

1. **构建失败**
   ```bash
   # 清理 Docker 缓存
   docker system prune -a
   
   # 重新构建
   ./docker/build.sh --no-cache
   ```

2. **环境变量未生效**
   ```bash
   # 检查环境文件
   cat .env
   
   # 验证容器环境变量
   docker exec -it container_name env
   ```

3. **健康检查失败**
   ```bash
   # 查看详细日志
   docker-compose logs frontend
   
   # 检查容器状态
   docker-compose ps
   ```

4. **端口冲突**
   ```bash
   # 修改 .env 文件中的 PORT 变量
   PORT=8080
   
   # 重新部署
   ./docker/deploy.sh deploy local
   ```

## 最佳实践

1. **安全**
   - 不要在镜像中包含敏感信息
   - 使用 `.dockerignore` 排除不必要的文件
   - 定期更新基础镜像

2. **性能**
   - 利用多阶段构建减小镜像体积
   - 启用 Nginx gzip 压缩
   - 配置适当的缓存策略

3. **维护**
   - 使用语义化版本标签
   - 定期清理未使用的镜像和容器
   - 备份重要数据

## 支持

如果遇到问题，请：
1. 检查日志输出
2. 验证环境变量配置
3. 参考本文档的故障排除部分
4. 提交 Issue 到项目仓库