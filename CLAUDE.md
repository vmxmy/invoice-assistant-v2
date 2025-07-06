## Project Structure
- 当前路径V2是本项目的根目录；frontend和 backend 分别是前端和后端路径；docs/是项目相关文档

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