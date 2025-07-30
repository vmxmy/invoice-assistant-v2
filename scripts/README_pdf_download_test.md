# PDF附件下载测试脚本使用指南

本目录包含了用于测试deno-imap PDF附件下载功能的脚本。

## 文件说明

| 文件 | 描述 |
|------|------|
| `test_download_pdf_attachments.ts` | 完整版PDF附件下载测试脚本 |
| `simple_pdf_download_test.ts` | 简化版测试脚本，适合快速测试 |
| `email_config.example.ts` | 邮箱配置示例文件 |
| `README_pdf_download_test.md` | 本说明文件 |

## 快速开始

### 1. 配置邮箱信息

```bash
# 复制配置示例文件
cp email_config.example.ts email_config.ts

# 编辑配置文件，填入你的邮箱信息
```

### 2. 修改 email_config.ts

```typescript
export const EMAIL_CONFIG = {
  host: 'imap.qq.com',           // QQ邮箱IMAP服务器
  port: 993,
  tls: true,
  username: 'your@qq.com',       // 替换为你的邮箱
  password: 'your-auth-code'     // 替换为你的授权码
};
```

### 3. 运行简化版测试

```bash
# 运行简化版测试脚本
deno run --allow-net --allow-read --allow-write simple_pdf_download_test.ts
```

### 4. 运行完整版测试

```bash
# 运行完整版测试脚本
deno run --allow-net --allow-read --allow-write test_download_pdf_attachments.ts
```

## 各邮箱配置说明

### QQ邮箱配置

1. 登录QQ邮箱
2. 进入 **设置 > 账户**
3. 开启 **IMAP/SMTP服务**
4. 生成 **授权码**（16位，不是登录密码）
5. 使用授权码作为 `password`

```typescript
{
  host: 'imap.qq.com',
  port: 993,
  tls: true,
  username: 'your@qq.com',
  password: 'your-16-digit-auth-code'
}
```

### 163邮箱配置

1. 登录163邮箱
2. 进入 **设置 > 客户端授权密码**
3. 开启 **IMAP/SMTP服务**
4. 设置 **客户端授权密码**

```typescript
{
  host: 'imap.163.com',
  port: 993,
  tls: true,
  username: 'your@163.com',
  password: 'your-client-password'
}
```

### Gmail配置

1. 开启 **两步验证**
2. 生成 **应用专用密码**
3. 使用应用专用密码登录

```typescript
{
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  username: 'your@gmail.com',
  password: 'your-app-password'
}
```

## 测试功能说明

### 简化版测试 (simple_pdf_download_test.ts)

- ✅ 连接邮箱测试
- ✅ 搜索最近7天的邮件
- ✅ 检查前5封邮件的PDF附件
- ✅ 下载第一个找到的PDF文件
- ✅ PDF文件格式验证

**适用场景**: 快速验证连接和基本功能

### 完整版测试 (test_download_pdf_attachments.ts)

- ✅ 多种搜索策略（发票、12306、最近邮件）
- ✅ 智能PDF附件检测
- ✅ bodyStructure解析失败时的应急方案
- ✅ 批量PDF下载
- ✅ 中文文件名解码
- ✅ 详细的下载统计

**适用场景**: 全面测试所有PDF检测和下载功能

## 下载的文件保存位置

```
./downloads/
├── test_pdfs/          # 简化版测试下载的文件
└── pdf_attachments/    # 完整版测试下载的文件
```

## 测试输出示例

```
🚀 开始PDF附件下载测试

🔌 连接邮箱...
✅ 连接成功

🔍 搜索最近的邮件...
找到 15 封最近的邮件

📧 检查最近的 5 封邮件...

📧 检查邮件 123:
  主题: 【12306】火车票购票成功通知
  发件人: noreply@rails.com.cn
  ✅ 成功获取邮件结构
  🎉 发现 1 个PDF附件:
    - 火车票电子客票.pdf (25678 bytes)
    📥 下载 火车票电子客票.pdf...
    ✅ 下载成功: ./downloads/test_pdfs/123_火车票电子客票.pdf
    📊 文件大小: 25678 bytes
    ✅ PDF文件格式验证通过
```

## 常见问题

### Q1: 连接失败
```
❌ 测试失败: IMAP connection failed
```

**解决方案:**
- 检查邮箱配置是否正确
- 确认已开启IMAP服务
- 检查是否使用了正确的授权码/密码
- 检查网络连接

### Q2: 认证失败
```
❌ 测试失败: Authentication failed
```

**解决方案:**
- QQ邮箱: 确认使用的是16位授权码，不是登录密码
- 163邮箱: 确认使用的是客户端授权密码
- Gmail: 确认已开启两步验证并使用应用专用密码

### Q3: 找不到PDF附件
```
⚪ 无PDF附件
```

**可能原因:**
- 邮件确实没有PDF附件
- bodyStructure解析失败，但应急方案也没检测到PDF
- 搜索范围太小（只搜索最近7天）

**解决方案:**
- 扩大搜索范围
- 检查具体的邮件内容
- 尝试手动指定包含PDF的邮件ID

### Q4: 下载的文件不是有效PDF
```
⚠️ 文件头不是PDF格式: %HTM
```

**解决方案:**
- 检查邮件附件是否真的是PDF文件
- 可能是HTML格式的"假"PDF附件
- 检查编码解码是否正确

## 调试技巧

### 1. 启用详细日志

在脚本开头添加：

```typescript
// 启用详细错误信息
console.log('Debug模式开启');
```

### 2. 检查特定邮件

修改搜索条件来测试特定邮件：

```typescript
// 搜索特定主题的邮件
const messageIds = await client.search({
  header: [{ field: 'SUBJECT', value: '发票' }]
}, 'UTF-8');
```

### 3. 手动指定邮件ID

如果知道包含PDF的邮件ID，可以直接测试：

```typescript
const testIds = [123, 124, 125]; // 替换为实际的邮件ID
```

## 注意事项

1. **授权码安全**: 不要将授权码提交到代码仓库
2. **请求频率**: 脚本中已添加延时，避免请求过频被限制
3. **存储空间**: 下载的PDF文件会占用本地存储空间
4. **网络环境**: 确保网络能正常访问邮箱IMAP服务器

## 扩展开发

基于这些测试脚本，你可以：

1. **集成到Edge Function**: 将PDF检测逻辑集成到Supabase Edge Function中
2. **添加数据库存储**: 将邮件和附件信息保存到数据库
3. **实现OCR处理**: 对下载的PDF文件进行OCR识别
4. **添加Web界面**: 创建Web界面来管理和查看附件

## 相关文档

- [deno-imap使用指南](./docs/deno-imap-usage-guide.md)
- [中文邮件处理指南](./docs/deno-imap-chinese-email-guide.md)
- [问题排查指南](./docs/deno-imap-troubleshooting-guide.md)
- [bodyStructure解析器Bug分析](./docs/deno-imap-bodystructure-bug-analysis.md)