## Project Structure
- 当前路径V2是本项目的根目录；frontend和 backend 分别是前端和后端路径；docs/是项目相关文档
- 所有测试和工具脚本和结果写在 scripts/下
- 所有文档都写入 docs 目录下
- 前后端都已启动并实现热加载，不需要重启

## Output Configuration
- 使用中文输出

## Server Configuration
- 后端已在 8090 端口启动
- 前端已经在 5174 端口启动
- 你不要启动前端服务器,当前是热加载状态,端口 5174
  
## Python Development Environment
- python 环境：backend/venv/

## 获取权限，获取用户 token Authentication (Supabase)

#### 步骤1：使用认证请求文件
- 认证请求文件路径（避免特殊字符转义问题
- test_output/results/auth_request.json
- curl -X POST "https://sfenhhtvcyslxplvewmt.supabase.co/auth/v1/token?grant_type=password" \
        -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE" \
        -H "Content-Type: application/json" \
        -d @test_output/results/auth_request.json | jq -r '.access_token'

### 项目配置
- **当前项目Supabase URL**: https://sfenhhtvcyslxplvewmt.supabase.co
- **anon key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE

注意：
- MCP Supabase工具不需要VPN，推荐优先使用
- HTTPX 需要显式禁止 proxy
- 用户令牌有效期为1小时，过期需重新获取


### 前端技术栈版本
- **DaisyUI**: 5.0.43
- **React**: 19.1.0
- **TypeScript**: 5.8.3
- **Vite**: 7.0.0
- **React Query**: 5.81.5

## Migration Design Docs
- Supabase OCR迁移设计文档已添加：docs/supabase-ocr-migration-design.md

## Frontend Technology Notes
- 使用 Heroicons（Tailwind CSS 官方图标库）