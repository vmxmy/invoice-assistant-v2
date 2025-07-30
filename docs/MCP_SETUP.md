# MCP (Model Context Protocol) 配置指南

本项目使用 MCP 服务器来增强 AI 助手的功能。

## 配置步骤

### 1. 复制配置文件模板

```bash
cp .mcp.json.example .mcp.json
```

### 2. 配置 Supabase MCP 服务器

编辑 `.mcp.json` 文件，填入您的 Supabase 配置：

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=YOUR_SUPABASE_PROJECT_REF"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_SUPABASE_ACCESS_TOKEN"
      }
    }
  }
}
```

### 3. 获取必要的令牌

#### Supabase 配置
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 在项目设置中找到：
   - **Project Reference ID** (项目引用 ID)
   - **Service Role Key** (服务角色密钥，用作 ACCESS_TOKEN)

#### Mem0 配置（可选）
1. 访问 [Mem0 Platform](https://mem0.ai)
2. 获取 API Key 和 Profile ID

### 4. 安全注意事项

⚠️ **重要：** 
- `.mcp.json` 文件包含敏感信息，已被添加到 `.gitignore`
- 请勿将真实的 API 密钥提交到版本控制系统
- 定期轮换您的 API 密钥

### 5. 验证配置

配置完成后，MCP 服务器将为 AI 助手提供以下功能：

- 直接操作 Supabase 数据库
- 执行复杂的数据查询
- 自动化数据处理任务
- 浏览器自动化（通过 Playwright）

## 故障排除

### 常见问题

1. **MCP 服务器启动失败**
   - 检查 Node.js 版本（需要 >= 16）
   - 确认网络连接正常
   - 验证 API 密钥是否正确

2. **Supabase 连接失败**
   - 确认项目引用 ID 正确
   - 检查访问令牌权限
   - 验证 Supabase 项目状态

### 日志查看

```bash
# 查看 MCP 服务器日志
tail -f ~/.local/share/mcp/logs/supabase.log
```

## 更多信息

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [Supabase MCP 服务器](https://github.com/supabase/mcp-server-supabase)
- [Claude Code MCP 集成](https://docs.anthropic.com/en/docs/claude-code/mcp)