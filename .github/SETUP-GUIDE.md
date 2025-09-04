# 🚀 GitHub Actions & Docker 部署配置指南

## 📋 目录

1. [环境变量配置](#环境变量配置)
2. [GitHub Secrets 设置](#github-secrets-设置)
3. [环境保护规则](#环境保护规则)
4. [容器注册表设置](#容器注册表设置)
5. [部署密钥配置](#部署密钥配置)
6. [故障排除](#故障排除)

---

## 🔧 环境变量配置

### 1. Repository Variables（仓库级变量）

在 GitHub 仓库的 `Settings > Secrets and variables > Actions > Variables` 中添加：

| 变量名 | 值 | 说明 |
|--------|----|----|
| `REGISTRY` | `ghcr.io` | 容器注册表地址 |
| `IMAGE_NAME` | `${{ github.repository }}/invoice-assistant-frontend` | 镜像名称 |
| `NODE_VERSION` | `20` | Node.js 版本 |

### 2. Environment Variables（环境级变量）

#### Staging 环境变量
在 `Settings > Environments > staging` 中配置：

```bash
VITE_APP_ENV=staging
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_API_BASE_URL=https://api-staging.yourdomain.com
VITE_ENABLE_DEBUG=true
VITE_ENABLE_ANALYTICS=false
BUILD_MODE=staging
```

#### Production 环境变量
在 `Settings > Environments > production` 中配置：

```bash
VITE_APP_ENV=production
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=true
BUILD_MODE=production
```

---

## 🔐 GitHub Secrets 设置

### 1. Repository Secrets（仓库级密钥）

在 `Settings > Secrets and variables > Actions > Secrets` 中添加：

#### 必需密钥

| 密钥名 | 说明 | 获取方式 |
|--------|------|----------|
| `GITHUB_TOKEN` | ✅ 自动提供 | GitHub 自动生成，无需手动添加 |

#### Supabase 相关密钥

| 密钥名 | 说明 | 获取方式 |
|--------|------|----------|
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI 访问令牌 | [Supabase Dashboard > Settings > Access Tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_ID_STAGING` | 测试环境项目 ID | Supabase 项目设置页面 |
| `SUPABASE_PROJECT_ID_PROD` | 生产环境项目 ID | Supabase 项目设置页面 |

#### 数据库密钥

| 密钥名 | 说明 | 示例 |
|--------|------|------|
| `DB_URL_STAGING` | 测试数据库连接字符串 | `postgresql://postgres:password@host:port/database` |
| `DB_URL_PRODUCTION` | 生产数据库连接字符串 | `postgresql://postgres:password@host:port/database` |

### 2. Environment Secrets（环境级密钥）

#### Staging 环境密钥
在 `Settings > Environments > staging > Environment secrets` 中添加：

| 密钥名 | 说明 |
|--------|------|
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥（测试环境） |
| `VITE_SUPABASE_SERVICE_KEY` | Supabase 服务密钥（测试环境） |
| `DEPLOY_WEBHOOK_URL` | 部署 Webhook URL（可选） |

#### Production 环境密钥
在 `Settings > Environments > production > Environment secrets` 中添加：

| 密钥名 | 说明 |
|--------|------|
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥（生产环境） |
| `VITE_SUPABASE_SERVICE_KEY` | Supabase 服务密钥（生产环境） |
| `DEPLOY_WEBHOOK_URL` | 部署 Webhook URL（可选） |

---

## 🛡️ 环境保护规则

### 1. Staging 环境保护

在 `Settings > Environments > staging` 中配置：

- ✅ **Required reviewers**: 0（可选择添加）
- ✅ **Wait timer**: 0 minutes
- ✅ **Deployment branches**: Selected branches
  - `develop`
  - `feature/*`

### 2. Production 环境保护

在 `Settings > Environments > production` 中配置：

- ✅ **Required reviewers**: 至少 1 人（推荐添加项目负责人）
- ✅ **Wait timer**: 5 minutes（给予思考时间）
- ✅ **Deployment branches**: Selected branches
  - `main`

---

## 📦 容器注册表设置

### GitHub Container Registry (推荐)

1. **启用包功能**
   - 确保仓库可见性设置正确
   - 在 `Settings > Actions > General` 中启用 "Read and write permissions"

2. **包权限设置**
   - 访问 `https://github.com/users/USERNAME/packages/container/REPOSITORY%2Finvoice-assistant-frontend`
   - 设置包的可见性
   - 添加协作者权限

### Docker Hub 配置（可选）

如果要使用 Docker Hub，添加以下密钥：

| 密钥名 | 说明 |
|--------|------|
| `DOCKERHUB_USERNAME` | Docker Hub 用户名 |
| `DOCKERHUB_TOKEN` | Docker Hub 访问令牌 |

---

## 🔑 部署密钥配置

### SSH 密钥设置（用于服务器部署）

1. **生成 SSH 密钥对**
```bash
ssh-keygen -t ed25519 -C "github-actions@yourdomain.com"
```

2. **添加公钥到目标服务器**
```bash
# 将公钥添加到服务器的 ~/.ssh/authorized_keys
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
```

3. **添加私钥到 GitHub Secrets**
将私钥内容添加到以下密钥中：

| 密钥名 | 说明 |
|--------|------|
| `DEPLOY_SSH_KEY` | SSH 私钥内容 |
| `DEPLOY_HOST_STAGING` | 测试服务器地址 |
| `DEPLOY_HOST_PRODUCTION` | 生产服务器地址 |
| `DEPLOY_USERNAME` | SSH 用户名 |

---

## 📊 监控和通知配置

### Slack 通知（可选）

| 密钥名 | 说明 | 获取方式 |
|--------|------|----------|
| `SLACK_WEBHOOK_URL` | Slack Webhook URL | [Slack Apps > Incoming Webhooks](https://api.slack.com/apps) |
| `SLACK_CHANNEL` | Slack 频道名 | 例：`#deployments` |

### Email 通知（可选）

| 密钥名 | 说明 |
|--------|------|
| `NOTIFICATION_EMAIL` | 通知邮箱地址 |
| `SMTP_PASSWORD` | SMTP 密码 |

---

## 🔍 验证配置

### 1. 配置验证脚本

创建验证脚本来检查所有必需的配置：

```bash
# 运行此脚本验证配置
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/environments
```

### 2. 测试部署

1. 创建一个测试分支
2. 修改前端代码
3. 提交并推送
4. 观察 GitHub Actions 执行情况

---

## ❌ 故障排除

### 常见问题

#### 1. 权限错误
**错误**: `Permission denied to push to registry`
**解决方案**:
- 检查 `GITHUB_TOKEN` 权限
- 确保仓库设置中启用了包写入权限

#### 2. 环境变量未生效
**错误**: 构建时环境变量为空
**解决方案**:
- 检查环境变量名称拼写
- 确认环境变量配置在正确的环境中
- 验证 workflow 中的环境引用

#### 3. Supabase 连接失败
**错误**: `Invalid API key`
**解决方案**:
- 检查 Supabase 密钥是否正确
- 确认项目 URL 和密钥匹配
- 验证密钥权限设置

#### 4. 部署超时
**错误**: `Deployment timed out`
**解决方案**:
- 检查健康检查端点
- 增加超时时间设置
- 查看应用启动日志

### 调试技巧

1. **启用调试日志**
```yaml
# 在 workflow 中添加
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

2. **查看构建上下文**
```yaml
- name: Debug info
  run: |
    echo "Event: ${{ github.event_name }}"
    echo "Ref: ${{ github.ref }}"
    echo "Actor: ${{ github.actor }}"
    env | sort
```

3. **测试 Docker 镜像**
```bash
# 本地测试构建的镜像
docker run -it --rm -p 8080:8080 \
  -e VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  -e VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  ghcr.io/owner/repo/invoice-assistant-frontend:latest
```

---

## ✅ 配置检查清单

### 基本配置
- [ ] GitHub Secrets 已设置
- [ ] 环境变量已配置
- [ ] 容器注册表权限正确
- [ ] 环境保护规则已启用

### 安全配置
- [ ] 生产环境需要审批
- [ ] 敏感信息使用 Secrets
- [ ] SSH 密钥权限最小化
- [ ] 容器安全扫描启用

### 监控配置
- [ ] 健康检查配置正确
- [ ] 通知渠道设置完成
- [ ] 日志记录启用
- [ ] 性能监控配置

### 测试配置
- [ ] 测试部署成功
- [ ] 回滚机制验证
- [ ] 监控告警测试
- [ ] 文档更新完成

---

## 📞 获取帮助

如果遇到问题，请：

1. 查看 GitHub Actions 日志
2. 检查上述配置步骤
3. 参考 [GitHub Actions 文档](https://docs.github.com/en/actions)
4. 提交 Issue 到项目仓库

---

**⚡ 快速开始**: 复制上述配置，替换相应的值，然后推送代码到 `develop` 分支测试整个流程！