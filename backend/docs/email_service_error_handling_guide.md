# 邮件服务错误处理指南

## 概述

本文档描述了邮件服务的错误处理和恢复机制，包括重试策略、断路器模式和连接池管理。

## 错误分类

### 1. 可重试错误 (RetryableError)
这些错误通常是暂时性的，可以通过重试解决：
- 网络连接问题
- 服务器临时不可用
- 邮箱锁定
- 临时性失败

### 2. 频率限制错误 (RateLimitError)
需要特殊处理的错误，通常需要更长的等待时间：
- "login frequency limit"
- "too many connections"

### 3. 不可重试错误 (NonRetryableError)
这些错误无法通过重试解决：
- 认证失败
- 账户被禁用
- 邮箱不存在
- 权限不足

## 重试机制

### 基本用法

```python
from app.services.email.retry_handler import with_retry, STANDARD_RETRY

@with_retry(config=STANDARD_RETRY)
async def fetch_emails():
    # 可能失败的操作
    return await mailbox.fetch(criteria)
```

### 预定义配置

1. **QUICK_RETRY**: 快速重试（2次，短延迟）
2. **STANDARD_RETRY**: 标准重试（3次，中等延迟）
3. **AGGRESSIVE_RETRY**: 激进重试（5次，长延迟）
4. **RATE_LIMIT_RETRY**: 频率限制重试（3次，特长延迟）

### 自定义配置

```python
from app.services.email.retry_handler import RetryConfig

custom_config = RetryConfig(
    max_attempts=4,
    initial_delay=2.0,
    max_delay=60.0,
    exponential_base=2.0,
    jitter=True
)

@with_retry(config=custom_config)
async def custom_operation():
    pass
```

## 断路器模式

断路器用于防止频繁失败的操作继续执行，保护系统资源。

### 状态说明

1. **关闭 (Closed)**: 正常工作状态
2. **开启 (Open)**: 失败次数超过阈值，拒绝所有请求
3. **半开 (Half-Open)**: 恢复期后允许测试请求

### 使用示例

```python
from app.services.email.resilient_email_service import ResilientEmailService

service = ResilientEmailService(session)

# 健康检查
health_status = await service.health_check(account_id)

# 重置断路器
await service.reset_circuit_breaker(account_id)
```

## 连接池管理

连接池减少了重复登录的开销，提高了性能。

### 特性

- 自动连接复用
- 连接过期管理
- 线程安全
- 自动清理

### 管理操作

```python
# 清空连接池
await service.clear_connection_pool()

# 连接会自动管理，无需手动干预
```

## 错误统计和监控

### 获取错误统计

```python
# 获取特定账户的错误统计
error_stats = await service.get_error_statistics(account_id)

# 获取所有账户的错误统计
all_stats = await service.get_error_statistics()
```

### 统计信息包含

- 总错误数
- 错误类型分布
- 最后错误时间
- 最后错误消息

## 最佳实践

### 1. 选择合适的重试策略

- 网络操作：使用 STANDARD_RETRY
- 认证操作：使用 QUICK_RETRY
- 批量操作：使用自定义配置，减少重试次数
- 频率限制：使用 RATE_LIMIT_RETRY

### 2. 错误处理顺序

```python
try:
    result = await service.sync_account(account_id)
except IMAPAuthenticationError:
    # 不重试，通知用户更新密码
    logger.error("认证失败，请检查密码")
except RateLimitError:
    # 等待更长时间后重试
    await asyncio.sleep(300)  # 5分钟
except EmailServiceError as e:
    # 检查断路器状态
    if service._get_circuit_breaker(account_id).state == 'open':
        logger.error("服务暂时不可用")
    else:
        # 其他错误
        logger.error(f"同步失败: {e}")
```

### 3. 监控和告警

定期执行健康检查：

```python
async def monitor_email_accounts():
    for account_id in account_ids:
        health = await service.health_check(account_id)
        
        if health['status'] == 'unhealthy':
            # 发送告警
            await send_alert(account_id, health)
        
        if health['error_count'] > 10:
            # 错误过多，可能需要人工介入
            await notify_admin(account_id, health)
```

### 4. 优雅降级

当服务不可用时，提供降级方案：

```python
async def get_emails_with_fallback(account_id):
    try:
        # 尝试同步最新邮件
        return await service.sync_account(account_id)
    except EmailServiceError:
        # 降级：返回本地缓存的邮件
        return await get_cached_emails(account_id)
```

## 故障排除

### 1. 断路器频繁开启

可能原因：
- 网络不稳定
- 服务器问题
- 认证信息过期

解决方法：
1. 检查网络连接
2. 验证账户凭据
3. 增加重试延迟
4. 调整断路器阈值

### 2. 连接池耗尽

症状：
- 新连接创建缓慢
- 内存使用增加

解决方法：
1. 定期清理连接池
2. 设置合理的过期时间
3. 监控连接数量

### 3. 重试风暴

避免方法：
1. 使用指数退避
2. 添加随机抖动
3. 设置最大延迟上限
4. 使用断路器

## 性能优化建议

1. **批量操作**: 减少网络往返
2. **连接复用**: 使用连接池
3. **异步处理**: 并行处理多个账户
4. **缓存策略**: 缓存文件夹结构等元数据
5. **监控指标**: 跟踪成功率、延迟等

## 配置示例

```python
# 生产环境配置
PRODUCTION_CONFIG = {
    'retry': {
        'max_attempts': 3,
        'initial_delay': 2.0,
        'max_delay': 120.0
    },
    'circuit_breaker': {
        'failure_threshold': 5,
        'recovery_timeout': 300
    },
    'connection_pool': {
        'max_connections': 10,
        'connection_timeout': 600
    }
}
```

## 总结

良好的错误处理机制可以：
- 提高系统可靠性
- 改善用户体验
- 减少运维负担
- 保护系统资源

通过合理使用重试、断路器和连接池，可以构建一个健壮的邮件服务系统。