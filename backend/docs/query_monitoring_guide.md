# 查询监控防回归系统

## 概述

查询监控防回归系统是为了防止数据库查询性能在代码更新过程中出现回归而设计的监控和预警系统。该系统能够：

- 🔍 **实时监控**：自动监控所有数据库查询的执行时间
- 📊 **性能基准**：建立查询性能基准线，用于回归检测
- ⚠️ **回归检测**：自动检测性能显著下降的查询
- 🔔 **智能告警**：当检测到性能回归时发送告警
- 📈 **趋势分析**：提供查询性能的历史趋势分析

## 系统架构

### 核心组件

1. **QueryMonitor**：查询性能监控器
2. **QueryRegressionDetector**：性能回归检测器
3. **QueryMonitoringMiddleware**：HTTP中间件
4. **DatabaseQueryMonitor**：SQLAlchemy事件监听器
5. **监控API**：提供监控数据访问接口

### 数据流

```
请求 → HTTP中间件 → 业务逻辑 → 数据库查询 → SQLAlchemy监听器 → 性能记录 → 回归检测 → 告警
```

## 配置

### 环境变量

```bash
# 查询监控配置
ENABLE_QUERY_MONITORING=true                    # 是否启用查询监控
QUERY_MONITORING_THRESHOLD_MS=100.0             # 慢查询阈值（毫秒）
QUERY_MONITORING_REGRESSION_THRESHOLD=2.0       # 回归检测阈值（倍数）
QUERY_MONITORING_MAX_HISTORY_DAYS=30            # 历史数据保留天数
```

### 应用配置

在 `app/core/config.py` 中：

```python
class Settings(BaseSettings):
    # 查询监控配置
    enable_query_monitoring: bool = True
    query_monitoring_threshold_ms: float = 100.0
    query_monitoring_regression_threshold: float = 2.0
    query_monitoring_max_history_days: int = 30
```

## 使用方法

### 1. 自动监控（推荐）

系统会自动监控所有通过SQLAlchemy执行的查询。无需额外配置。

### 2. 手动监控

使用装饰器为特定函数添加监控：

```python
from app.utils.query_monitor import monitor_query_performance

@monitor_query_performance("user_search", params={"type": "complex_search"})
async def search_users(query: str, limit: int = 20):
    # 查询逻辑
    pass
```

### 3. 上下文管理器

```python
from app.utils.query_monitor import query_monitoring

async def some_function():
    async with query_monitoring.monitor_query("custom_query"):
        # 执行需要监控的代码
        pass
```

## 监控数据

### 性能指标

每个查询会记录以下指标：

- **execution_time_ms**：执行时间（毫秒）
- **timestamp**：执行时间戳
- **query_hash**：查询唯一标识
- **params_hash**：参数哈希
- **result_count**：结果数量（可选）
- **memory_usage_mb**：内存使用（可选）

### 性能基准

系统会自动建立性能基准，包括：

- **平均执行时间**
- **P95 执行时间**
- **P99 执行时间**
- **最大执行时间**
- **样本数量**

## 回归检测

### 检测机制

当查询执行时间超过以下条件时触发回归告警：

```
当前执行时间 > 基准P95时间 × 回归阈值(默认2.0)
```

### 告警级别

- **Warning**：执行时间超过基准1.5倍
- **Critical**：执行时间超过基准最大值2倍

## API接口

### 获取性能报告

```http
GET /api/v1/monitoring/performance-report
```

返回所有查询的性能统计信息。

### 获取回归告警

```http
GET /api/v1/monitoring/regression-alerts?days=7
```

获取最近7天的回归告警。

### 获取查询统计

```http
GET /api/v1/monitoring/query-stats/{query_name}?days=7
```

获取特定查询的统计信息。

### 运行基准测试

```http
POST /api/v1/monitoring/run-benchmark
```

运行性能基准测试。

### 获取慢查询

```http
GET /api/v1/monitoring/slow-queries?threshold_ms=100&days=7&limit=50
```

获取慢查询列表。

## 命令行工具

### 建立性能基准

```bash
python scripts/benchmark_queries.py benchmark
```

### 与基准比较

```bash
python scripts/benchmark_queries.py compare
```

### 测试监控系统

```bash
python scripts/test_query_monitoring.py
```

## 文件结构

```
monitoring/
├── baselines.json              # 性能基准数据
├── metrics_history.json        # 历史指标数据
├── regression_alerts_YYYYMMDD.json  # 每日回归告警
├── benchmarks/                 # 基准测试结果
│   ├── benchmark_detailed_YYYYMMDD_HHMMSS.json
│   └── latest_benchmark.json
└── comparisons/                # 基准比较结果
    └── comparison_YYYYMMDD_HHMMSS.json
```

## 最佳实践

### 1. 设置合理的阈值

- **慢查询阈值**：建议设置为100ms
- **回归阈值**：建议设置为2.0倍
- **历史保留**：建议保留30天数据

### 2. 定期基准测试

- 每次重大代码更新后运行基准测试
- 定期（如每周）更新性能基准
- 在生产环境部署前进行性能验证

### 3. 监控关键查询

为重要的业务查询添加显式监控：

```python
@monitor_query_performance("critical_invoice_search")
async def search_invoices_critical(user_id, filters):
    # 关键业务查询
    pass
```

### 4. 告警处理

建立告警响应流程：

1. **立即响应**：Critical级别告警需要立即处理
2. **分析原因**：确定是代码问题还是数据量增长
3. **优化措施**：索引优化、查询重构、缓存等
4. **验证效果**：修复后验证性能是否恢复

## 故障排除

### 常见问题

1. **监控不生效**
   - 检查 `ENABLE_QUERY_MONITORING=true`
   - 确认中间件已正确配置
   - 查看日志中的监控启动信息

2. **基准数据丢失**
   - 检查 `monitoring/` 目录权限
   - 确认磁盘空间充足
   - 重新运行基准测试

3. **误报告警**
   - 调整回归检测阈值
   - 更新过时的性能基准
   - 排除外部因素（网络、数据库负载）

### 调试方法

启用调试日志：

```bash
export LOG_LEVEL=DEBUG
```

查看详细的查询监控日志。

## 扩展开发

### 添加新的监控指标

1. 扩展 `QueryMetrics` 数据类
2. 修改 `QueryMonitor.monitor_query` 方法
3. 更新API接口返回数据

### 自定义回归检测算法

1. 继承 `QueryRegressionDetector` 类
2. 重写 `detect_regression` 方法
3. 在 `QueryMonitoringMiddleware` 中使用新检测器

### 集成外部告警系统

1. 实现告警接口
2. 在 `_save_regression_alert` 中添加外部调用
3. 配置告警渠道（邮件、Slack等）

## 性能影响

监控系统对应用性能的影响：

- **内存开销**：约1-2MB用于存储监控数据
- **CPU开销**：每个查询增加0.1-0.5ms处理时间
- **磁盘开销**：每天约1-10MB监控数据
- **网络开销**：无额外网络开销

## 安全考虑

- 监控数据不包含敏感的查询参数
- 所有监控API需要身份验证
- 监控文件具有适当的访问权限
- 定期清理过期的监控数据