## Project Structure
- 当前路径V2是本项目的根目录；frontend和 backend 分别是前端和后端路径；docs/是项目相关文档
- 所有测试和工具脚本都在 scripts/下

## Output Configuration
- 使用中文输出

## Server Configuration
- 后端已在 8090 端口启动

## Development Environment
- python 环境：backend/venv/

## Authentication (Supabase)

### 方法 1: 使用 MCP Supabase 工具（推荐）
```bash
# 获取项目URL和anon key
# 在Claude Code中使用MCP工具
mcp__supabase__get_project_url  # 返回: https://sfenhhtvcyslxplvewmt.supabase.co
mcp__supabase__get_anon_key     # 返回: anon key

# 通过API获取用户认证令牌
python get_user_token.py
```

### 方法 2: 直接使用 Python Supabase 客户端
```python
from supabase import create_client

# Supabase配置（旧项目）
url = 'https://kuvezqgwwtrwfcijpnlj.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1dmV6cWd3d3Ryd2ZjaWpwbmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NzMwNzQsImV4cCI6MjA1MTU0OTA3NH0.iHSUQeJSsKVQ84Ef0f_XaKAy-1xSIgVVqYwuB3fmk7g'

# 新项目配置（通过MCP获取）
url = 'https://sfenhhtvcyslxplvewmt.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'

# 创建客户端并登录
supabase = create_client(url, key)
response = supabase.auth.sign_in_with_password({
    'email': 'blueyang@gmail.com',
    'password': 'Xumy8!75'
})

# 获取令牌
if response.user:
    token = response.session.access_token
    print(f'Authorization: Bearer {token}')
```

### 获取用户认证令牌的脚本
```bash
# 使用MCP项目配置获取令牌（推荐）
source backend/venv/bin/activate
python get_mcp_auth_token.py

# 令牌会保存到 .auth_token 文件中
# 获取的令牌示例：
# eyJhbGciOiJIUzI1NiIsImtpZCI6IklraUtRYlY5Z3RYMmRNL3ciLCJ0eXAiOiJKV1QifQ...
```

### API 测试命令
```bash
# 火车票API测试
source backend/venv/bin/activate
python test_api_train_tickets.py

# 购买方名称测试
python test_buyer_names.py
```

### 项目配置
- **当前项目URL**: https://sfenhhtvcyslxplvewmt.supabase.co
- **用户邮箱**: blueyang@gmail.com  
- **anon key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE
- **用户token**: 通过 get_mcp_auth_token.py 获取并保存到 .auth_token 文件

注意：
- MCP Supabase工具不需要VPN，推荐优先使用
- 用户令牌有效期为1小时，过期需重新获取
- 使用 get_mcp_auth_token.py 脚本可快速获取新令牌

## Frontend Development Documentation

### 开发文档使用指南

前端开发团队已创建了三个核心文档，位于 `frontend/docs/development/` 目录：

#### 1. INVOICE_MANAGEMENT_TASKS.md - 发票管理系统前端开发任务文档
**用途**：规划和跟踪发票管理页面的功能开发
**主要内容**：
- 开发任务清单（按优先级 P0/P1/P2 划分）
- 4个开发阶段的详细实施计划
- 每个任务的验收标准和技术实现要点
- Git提交规范和测试要求

**使用场景**：
- 开始新功能开发前查阅任务详情
- 评估工作量和依赖关系
- 确认功能验收标准

#### 2. DAISYUI_COMPONENT_GUIDE.md - DaisyUI 5.0.43 组件使用指南
**用途**：指导如何使用 DaisyUI 最新版本的组件
**主要内容**：
- DaisyUI 5.0 新特性（原生 dialog、新组件变体等）
- 核心组件的详细使用示例（Modal、Drawer、Form、Table等）
- 响应式设计规范和断点系统
- 主题配置和切换实现
- 性能优化最佳实践

**使用场景**：
- 实现UI组件时查阅正确用法
- 了解响应式类的使用方法
- 配置主题系统
- 解决UI相关的技术问题

#### 3. CONTEXT_ARCHITECTURE.md - React Context 架构设计文档
**用途**：理解和实现应用的状态管理架构
**主要内容**：
- 完整的 Context 架构图
- 四个核心 Context 的实现（Auth、UI、Invoice、Theme）
- 自定义 Hooks 集合（useLocalStorage、useDebounce、useMediaQuery等）
- 状态管理模式和性能优化策略
- 测试策略和工具

**使用场景**：
- 添加新的全局状态时参考架构设计
- 使用现有 Context 和 Hooks
- 优化组件性能
- 编写 Context 相关的测试

### 前端开发工作流

1. **开始新任务前**：
   - 查看 `INVOICE_MANAGEMENT_TASKS.md` 了解任务详情和优先级
   - 确认依赖关系和验收标准

2. **实现UI组件时**：
   - 参考 `DAISYUI_COMPONENT_GUIDE.md` 使用正确的组件和样式
   - 遵循响应式设计规范

3. **处理状态管理时**：
   - 查阅 `CONTEXT_ARCHITECTURE.md` 了解状态架构
   - 使用合适的 Context 和 Hooks

4. **代码审查时**：
   - 对照文档检查实现是否符合规范
   - 确保使用了推荐的模式和最佳实践

### 技术栈版本
- **DaisyUI**: 5.0.43
- **React**: 19.1.0
- **TypeScript**: 5.8.3
- **Vite**: 7.0.0
- **React Query**: 5.81.5