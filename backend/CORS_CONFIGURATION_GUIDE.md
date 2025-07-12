# Render 环境 CORS 配置指南

## 在 Render 上配置 CORS

### 1. 登录 Render Dashboard
访问 https://dashboard.render.com 并登录到你的账户。

### 2. 选择你的后端服务
找到并点击你的后端服务（例如：invoice-assistant-v2-backend）。

### 3. 配置环境变量
在服务页面中，点击 "Environment" 选项卡，然后添加以下环境变量：

```bash
# CORS 配置
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://invoice-assistant-v2-frontend.vercel.app,https://你的前端域名.com
CORS_ALLOW_CREDENTIALS=true
```

### 4. CORS_ORIGINS 配置说明

`CORS_ORIGINS` 是一个逗号分隔的字符串，包含所有允许访问你的 API 的域名。

**示例配置：**
```bash
# 开发环境 + 生产环境
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://invoice-assistant-v2-frontend.vercel.app

# 仅生产环境
CORS_ORIGINS=https://invoice-assistant-v2-frontend.vercel.app

# 多个生产域名
CORS_ORIGINS=https://app.example.com,https://www.example.com,https://example.com
```

### 5. 重要注意事项

1. **不要包含尾部斜杠**：
   - ✅ 正确：`https://example.com`
   - ❌ 错误：`https://example.com/`

2. **协议必须匹配**：
   - 如果前端使用 HTTPS，CORS 源也必须是 HTTPS
   - 如果前端使用 HTTP，CORS 源也必须是 HTTP

3. **端口必须包含**（如果不是默认端口）：
   - ✅ 正确：`http://localhost:3000`
   - ❌ 错误：`http://localhost`（当实际运行在 3000 端口时）

4. **通配符不建议用于生产**：
   - 不要使用 `*` 作为生产环境的 CORS 源
   - 明确列出所有允许的域名

### 6. Vercel 前端配置

如果你的前端部署在 Vercel 上，确保添加正确的 Vercel URL：

1. **预览部署**：`https://your-app-git-branch-username.vercel.app`
2. **生产部署**：`https://your-app.vercel.app`
3. **自定义域名**：`https://your-custom-domain.com`

### 7. 调试 CORS 问题

如果遇到 CORS 错误：

1. **检查浏览器控制台**：查看具体的 CORS 错误信息
2. **验证环境变量**：在 Render 中确认 CORS_ORIGINS 设置正确
3. **检查请求头**：确保前端发送了正确的 `Origin` 头
4. **临时测试**：可以临时添加具体的错误 URL 到 CORS_ORIGINS

### 8. 完整的环境变量示例

```bash
# 应用配置
APP_NAME=发票助手 API
APP_VERSION=2.0.0
DEBUG=false

# CORS 配置
CORS_ORIGINS=https://invoice-assistant-v2-frontend.vercel.app,https://your-custom-domain.com
CORS_ALLOW_CREDENTIALS=true

# 数据库配置
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_JWT_SECRET=your-jwt-secret

# 安全配置
SECRET_KEY=your-32-character-secret-key-here
```

### 9. 应用更改

配置环境变量后：
1. 点击 "Save Changes" 保存配置
2. Render 会自动重新部署你的服务
3. 等待部署完成（通常需要几分钟）
4. 测试 API 确保 CORS 配置生效

### 10. 代码中的 CORS 实现

后端代码已经配置好了 CORS 中间件：

```python
# app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,  # 从环境变量读取
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With", "X-Request-ID", ...]
)
```

配置类会自动解析 CORS_ORIGINS 环境变量：

```python
# app/core/config.py
@property
def cors_origins_list(self) -> List[str]:
    """获取 CORS 源列表"""
    if isinstance(self.cors_origins, str):
        return [origin.strip() for origin in self.cors_origins.split(",")]
    return self.cors_origins
```

这样配置后，你的 API 就能正确处理来自指定域名的跨域请求了。