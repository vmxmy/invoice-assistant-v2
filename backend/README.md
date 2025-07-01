# 发票助手后端 API

基于 FastAPI 的智能发票管理系统后端。

## 项目结构

```
backend/
├── app/                    # 主应用目录
│   ├── __init__.py
│   ├── main.py            # FastAPI 应用入口
│   ├── api/               # API 层
│   │   ├── __init__.py
│   │   └── v1/           # API 版本 1
│   │       ├── __init__.py
│   │       ├── api.py    # 路由聚合
│   │       └── endpoints/ # 具体端点
│   │           ├── __init__.py
│   │           └── users.py
│   ├── core/             # 核心组件
│   │   └── __init__.py
│   ├── models/           # 数据模型 (SQLAlchemy)
│   │   └── __init__.py
│   ├── schemas/          # 数据传输对象 (Pydantic)
│   │   └── __init__.py
│   ├── services/         # 业务逻辑层
│   │   └── __init__.py
│   └── utils/            # 工具函数
│       └── __init__.py
├── tests/                # 测试目录
│   └── __init__.py
├── requirements.txt      # 依赖列表
├── venv/                # Python 虚拟环境
└── README.md            # 项目说明
```

## 架构设计

### 分层架构

- **API 层** (`app/api/`): 处理 HTTP 请求和响应
- **服务层** (`app/services/`): 业务逻辑处理
- **数据层** (`app/models/`): 数据模型和数据库操作
- **核心层** (`app/core/`): 配置、认证、数据库连接等核心组件

### 代码组织规范

1. **导入路径约定**:
   - 使用绝对导入：`from app.models.user import User`
   - 避免循环导入

2. **命名规范**:
   - 文件名：snake_case (如 `user_service.py`)
   - 类名：PascalCase (如 `UserService`)
   - 函数名：snake_case (如 `get_user_by_id`)
   - 常量：UPPER_CASE (如 `DEFAULT_PAGE_SIZE`)

3. **模块职责**:
   - `models/`: 只包含数据模型定义，不包含业务逻辑
   - `schemas/`: 只包含数据验证和序列化
   - `services/`: 包含业务逻辑，不直接处理 HTTP
   - `api/endpoints/`: 只处理 HTTP 相关逻辑，调用 services

## API 设计规范

### 端点命名

- RESTful 风格
- 使用复数形式：`/users`, `/invoices`
- 版本前缀：`/api/v1/`

### 响应格式

所有 API 响应都应该包含标准字段：

```json
{
  "data": {},      // 实际数据
  "message": "",   // 状态消息
  "success": true  // 操作是否成功
}
```

### 错误处理

使用标准 HTTP 状态码：

- 200: 成功
- 400: 客户端错误
- 401: 未认证
- 403: 无权限
- 404: 资源不存在
- 500: 服务器错误

## 开发指南

### 本地开发

1. 激活虚拟环境：
   ```bash
   source venv/bin/activate
   ```

2. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```

3. 启动开发服务器：
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. 访问 API 文档：
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### 添加新功能

1. **数据模型**: 在 `app/models/` 中定义 SQLAlchemy 模型
2. **数据传输对象**: 在 `app/schemas/` 中定义 Pydantic 模型
3. **业务逻辑**: 在 `app/services/` 中实现服务类
4. **API 端点**: 在 `app/api/v1/endpoints/` 中实现路由
5. **注册路由**: 在 `app/api/v1/api.py` 中注册新路由
6. **编写测试**: 在 `tests/` 中添加对应测试

## 下一步计划

- [ ] 环境配置管理 (config.py)
- [ ] 数据库连接配置 (database.py)
- [ ] 认证系统 (auth.py, dependencies.py)
- [ ] 数据模型实现
- [ ] API 端点完整实现