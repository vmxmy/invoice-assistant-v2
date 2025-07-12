# CORS 配置修复指南

## 问题原因
环境变量名称不匹配：
- ❌ 你设置的：`CORS_ORIGIN`
- ✅ 应该设置：`CORS_ORIGINS`（注意是复数形式）

## 立即修复步骤

### 1. 在 Render Dashboard 中更新环境变量

将：
```
CORS_ORIGIN=https://fp.ziikoo.com
```

改为：
```
CORS_ORIGINS=https://fp.ziikoo.com,https://invoice-assistant-v2-frontend.vercel.app
```

### 2. 完整的环境变量设置

```bash
# CORS 配置（注意是 CORS_ORIGINS 不是 CORS_ORIGIN）
CORS_ORIGINS=https://fp.ziikoo.com,https://invoice-assistant-v2-frontend.vercel.app,http://localhost:3000,http://localhost:5173
CORS_ALLOW_CREDENTIALS=true
```

### 3. 验证配置

1. 保存环境变量后，Render 会自动重新部署
2. 等待部署完成（通常 2-3 分钟）
3. 清除浏览器缓存后重试

## 环境变量映射说明

Pydantic Settings 会自动将环境变量转换：
- 环境变量：`CORS_ORIGINS`（大写）
- Python 代码：`cors_origins`（小写）

## 调试方法

如果仍有问题，可以临时添加调试日志：

```python
# 在 app/main.py 中添加
import logging
logger = logging.getLogger(__name__)

# 在 CORS 中间件配置前添加
logger.info(f"CORS Origins: {settings.cors_origins_list}")
logger.info(f"CORS Allow Credentials: {settings.cors_allow_credentials}")
```

然后在 Render 日志中查看实际加载的 CORS 配置。