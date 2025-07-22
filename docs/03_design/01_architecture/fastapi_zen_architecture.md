# FastAPI Zen 架构设计

## 1. 架构概述

### 1.1 设计理念
FastAPI Zen 架构遵循以下核心原则：
- **简洁性（Simplicity）**：保持代码简单直观
- **可维护性（Maintainability）**：易于理解和修改
- **可扩展性（Scalability）**：便于功能扩展
- **高性能（Performance）**：充分利用异步特性

### 1.2 技术栈选择
- **Web 框架**：FastAPI（异步、高性能、自动文档）
- **数据库**：Supabase（PostgreSQL + 实时订阅）
- **认证**：Supabase Auth（JWT Token）
- **任务队列**：Dramatiq（分布式任务处理）
- **OCR 服务**：阿里云 OCR + MinERU API
- **文件存储**：本地存储 + Supabase Storage

## 2. 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        前端应用层                             │
│  React + TypeScript + DaisyUI + React Query                  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ├─── HTTPS/WSS
                                │
┌─────────────────────────────────────────────────────────────┐
│                      API 网关层                              │
│  Nginx (反向代理、负载均衡、SSL 终止)                         │
└─────────────────────────────────────────────────────────────┘
                                │
                                ├─── HTTP/WebSocket
                                │
┌─────────────────────────────────────────────────────────────┐
│                    应用服务层                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  FastAPI    │  │  FastAPI    │  │  FastAPI    │        │
│  │  Instance 1 │  │  Instance 2 │  │  Instance N │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
┌───────────────────┐                          ┌───────────────────┐
│   数据存储层      │                          │   任务队列层      │
│  ┌─────────────┐  │                          │  ┌─────────────┐  │
│  │  Supabase   │  │                          │  │  Dramatiq   │  │
│  │ PostgreSQL  │  │                          │  │   + Redis   │  │
│  └─────────────┘  │                          │  └─────────────┘  │
│  ┌─────────────┐  │                          └───────────────────┘
│  │  Supabase   │  │
│  │  Storage    │  │                          ┌───────────────────┐
│  └─────────────┘  │                          │   外部服务层      │
└───────────────────┘                          │  ┌─────────────┐  │
                                               │  │ 阿里云 OCR  │  │
                                               │  └─────────────┘  │
                                               │  ┌─────────────┐  │
                                               │  │ MinERU API  │  │
                                               │  └─────────────┘  │
                                               │  ┌─────────────┐  │
                                               │  │ Email IMAP  │  │
                                               │  └─────────────┘  │
                                               └───────────────────┘
```

## 3. 目录结构

```
v2/
├── backend/
│   ├── app/
│   │   ├── api/              # API 路由
│   │   │   ├── v1/           # API 版本控制
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── auth.py
│   │   │   │   │   ├── invoices.py
│   │   │   │   │   ├── files.py
│   │   │   │   │   └── ocr.py
│   │   │   │   └── router.py
│   │   │   └── deps.py       # 依赖注入
│   │   │
│   │   ├── core/             # 核心配置
│   │   │   ├── config.py     # 环境配置
│   │   │   ├── security.py   # 安全相关
│   │   │   └── database.py   # 数据库连接
│   │   │
│   │   ├── models/           # 数据模型
│   │   │   ├── user.py
│   │   │   ├── invoice.py
│   │   │   └── task.py
│   │   │
│   │   ├── schemas/          # Pydantic 模型
│   │   │   ├── user.py
│   │   │   ├── invoice.py
│   │   │   └── response.py
│   │   │
│   │   ├── services/         # 业务逻辑
│   │   │   ├── auth.py
│   │   │   ├── ocr.py
│   │   │   ├── invoice.py
│   │   │   └── email.py
│   │   │
│   │   └── main.py           # 应用入口
│   │
│   ├── tests/                # 测试文件
│   ├── scripts/              # 工具脚本
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── components/       # React 组件
    │   ├── pages/           # 页面组件
    │   ├── services/        # API 服务
    │   ├── hooks/           # 自定义 Hooks
    │   ├── utils/           # 工具函数
    │   └── App.tsx
    │
    └── package.json
```

## 4. 核心组件设计

### 4.1 认证授权
```python
# JWT Token 认证流程
1. 用户登录 → Supabase Auth
2. 返回 access_token 和 refresh_token
3. 请求携带 Bearer Token
4. FastAPI 依赖注入验证
5. 获取当前用户信息
```

### 4.2 请求处理流程
```python
# 异步请求处理
1. 客户端发起请求
2. Nginx 负载均衡
3. FastAPI 路由匹配
4. 中间件处理（认证、日志、限流）
5. 依赖注入（数据库连接、当前用户）
6. 业务逻辑处理
7. 响应返回
```

### 4.3 文件处理流程
```python
# 发票处理流程
1. 文件上传 → 临时存储
2. 创建异步任务
3. OCR 识别（阿里云/MinERU）
4. 数据提取和解析
5. 存储到数据库
6. 文件归档存储
7. 通知前端完成
```

## 5. 设计模式

### 5.1 依赖注入
```python
# app/api/deps.py
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    # 验证 token 并返回用户
    pass
```

### 5.2 仓储模式
```python
# app/repositories/invoice.py
class InvoiceRepository:
    def __init__(self, db: Session):
        self.db = db
    
    async def create(self, invoice: InvoiceCreate) -> Invoice:
        # 创建发票
        pass
    
    async def get_by_id(self, id: int) -> Optional[Invoice]:
        # 根据 ID 获取
        pass
```

### 5.3 服务层模式
```python
# app/services/ocr.py
class OCRService:
    def __init__(self, config: Config):
        self.config = config
    
    async def recognize(self, file_path: str) -> dict:
        # OCR 识别逻辑
        pass
```

## 6. 性能优化

### 6.1 异步处理
- 使用 `async/await` 处理 I/O 操作
- 数据库连接池管理
- 异步 HTTP 客户端（httpx）

### 6.2 缓存策略
- Redis 缓存热点数据
- 本地内存缓存配置
- HTTP 缓存头优化

### 6.3 并发控制
- 使用信号量限制并发
- 任务队列削峰填谷
- 数据库连接池配置

## 7. 安全设计

### 7.1 认证安全
- JWT Token 过期机制
- Refresh Token 轮转
- 密码加密存储（bcrypt）

### 7.2 接口安全
- CORS 跨域配置
- 请求频率限制
- SQL 注入防护（ORM）
- XSS 防护（模板转义）

### 7.3 数据安全
- HTTPS 传输加密
- 敏感数据脱敏
- 文件访问权限控制

## 8. 监控和日志

### 8.1 日志系统
```python
# 结构化日志
logger.info("Invoice processed", extra={
    "user_id": user.id,
    "invoice_id": invoice.id,
    "duration": process_time
})
```

### 8.2 性能监控
- API 响应时间统计
- 数据库查询性能
- 外部服务调用监控

### 8.3 错误追踪
- Sentry 错误收集
- 自定义异常处理
- 错误日志分析

## 9. 扩展性设计

### 9.1 水平扩展
- 无状态服务设计
- 负载均衡支持
- 分布式任务处理

### 9.2 插件机制
- OCR 服务插件化
- 存储后端可替换
- 认证方式可扩展

### 9.3 API 版本控制
- URL 路径版本（/api/v1/）
- 向后兼容保证
- 废弃 API 管理

## 10. 部署架构

### 10.1 容器化部署
```dockerfile
# Dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]
```

### 10.2 编排配置
```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: ./backend
    ports:
      - "8090:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - redis
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### 10.3 CI/CD 流程
1. 代码提交 → GitHub
2. 触发 GitHub Actions
3. 运行测试套件
4. 构建 Docker 镜像
5. 推送到镜像仓库
6. 部署到生产环境

## 11. 最佳实践

### 11.1 代码组织
- 单一职责原则
- 依赖倒置原则
- 接口隔离原则

### 11.2 错误处理
- 统一异常处理
- 友好错误信息
- 错误码标准化

### 11.3 测试策略
- 单元测试覆盖
- 集成测试验证
- E2E 测试保障

## 12. 技术债务管理

### 12.1 识别债务
- 代码复杂度分析
- 测试覆盖率报告
- 性能瓶颈定位

### 12.2 偿还计划
- 定期重构窗口
- 技术债务看板
- 持续改进文化