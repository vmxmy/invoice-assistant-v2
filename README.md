# 发票助手 V2

智能发票管理系统，支持自动处理邮件附件中的发票，并提供现代化的Web界面进行管理。

## 项目结构

```
v2/
├── backend/           # FastAPI后端
│   ├── app/          # 应用核心代码
│   ├── venv/         # Python虚拟环境
│   └── requirements.txt
├── frontend/         # React前端
│   ├── src/         # 源代码
│   ├── public/      # 静态资源
│   └── package.json
└── docs/            # 项目文档
    ├── prd/         # 产品需求文档
    ├── task/        # 开发任务追踪
    └── guild/       # 开发指南
```

## 技术栈

### 后端
- **FastAPI** - 现代Python Web框架
- **Supabase** - 数据库和认证
- **Celery** - 异步任务队列
- **Redis** - 缓存和消息代理
- **Mineru API** - OCR文字识别

### 前端
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具

## 快速开始

### 后端启动

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

## 开发状态

- ✅ Phase 0: 项目初始化与环境设置 (100%)
- 🔄 Phase 1: 核心后端开发 - 认证与数据模型 (开发中)
- ⏳ Phase 2: 核心功能开发 - 邮件处理流水线
- ⏳ Phase 3: API 端点完善
- ⏳ Phase 4: 前端开发
- ⏳ Phase 5: 测试、部署与监控

详细进度请查看 [开发计划](docs/task/development_plan.md)

## 核心功能

1. **智能邮件处理** - 自动从邮件附件中提取发票
2. **OCR识别** - 自动识别发票关键信息
3. **数据管理** - 发票数据的增删改查
4. **用户认证** - 安全的用户管理系统
5. **现代UI** - 响应式Web界面

## 贡献指南

请参考 [CLAUDE.md](CLAUDE.md) 了解项目开发规范和指南。

## 许可证

本项目采用 MIT 许可证。