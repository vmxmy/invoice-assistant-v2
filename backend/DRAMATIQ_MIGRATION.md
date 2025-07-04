# Dramatiq迁移指南

## 🎯 **迁移概述**

从自建PostgreSQL队列系统迁移到Dramatiq，获得更专业的Worker管理和监控能力。

## 📊 **方案对比**

| 特性 | 自建PostgreSQL队列 | Dramatiq + PostgreSQL |
|------|-------------------|----------------------|
| **任务定义** | 手动SQL操作 | `@dramatiq.actor` 装饰器 |
| **Worker管理** | 自建进程管理 | 内置进程/线程管理 |
| **监控界面** | 无 | Dramatiq Dashboard |
| **重试机制** | 手动实现 | 内置指数退避重试 |
| **任务路由** | 手动队列选择 | 自动队列路由 |
| **开发体验** | 复杂 | 简单优雅 |
| **生产稳定性** | 需要自己保证 | 经过大量生产验证 |

## 🔄 **迁移步骤**

### 1. **安装依赖**
```bash
pip install dramatiq[postgresql] dramatiq-dashboard
```

### 2. **配置Broker**
```python
# app/core/dramatiq_config.py
from dramatiq.brokers.postgresql import PostgreSQLBroker

broker = PostgreSQLBroker(url=database_url)
dramatiq.set_broker(broker)
```

### 3. **任务定义迁移**

**原来 (自建)**:
```python
# 复杂的手动SQL操作
async def enqueue_email_processing(email_data):
    conn = await asyncpg.connect(database_url)
    await conn.execute("""
        INSERT INTO task_queue (task_type, payload, user_id)
        VALUES ($1, $2, $3)
    """, 'process_email', json.dumps(email_data), user_id)
```

**现在 (Dramatiq)**:
```python
# 简单优雅的装饰器
@dramatiq.actor(queue_name="email_processing", max_retries=3)
def process_email_task(email_data):
    processor = EmailProcessor()
    return processor.process_email(email_data)

# 发送任务
TaskDispatcher.send_email_task(email_data)
```

### 4. **API端点更新**

**原来**:
```python
# 复杂的后台任务
background_tasks.add_task(process_incoming_email_task, email_data, db_url)
```

**现在**:
```python
# 直接发送到Dramatiq
task_id = TaskDispatcher.send_email_task(email_data)
```

### 5. **Worker启动方式**

**原来**:
```bash
# 自建复杂管理
./manage_workers.sh start 2
python worker_manager.py start -c 2 -d
```

**现在**:
```bash
# Dramatiq专业管理
./manage_dramatiq.sh start 2 4
# 或直接使用
dramatiq app.tasks.dramatiq_tasks --processes=2 --threads=4
```

## 🚀 **快速开始**

### 1. **开发环境**
```bash
# 安装依赖
pip install -r requirements_dramatiq.txt

# 启动开发模式 (自动重载)
./manage_dramatiq.sh start-dev

# 启动监控面板
./manage_dramatiq.sh dashboard
# 访问: http://localhost:8080
```

### 2. **生产环境**
```bash
# 启动4个进程，每个8个线程
./manage_dramatiq.sh start 4 8

# 查看状态
./manage_dramatiq.sh status

# 查看日志
./manage_dramatiq.sh logs
./manage_dramatiq.sh follow
```

### 3. **发送测试任务**
```python
from app.tasks.dramatiq_tasks import TaskDispatcher

# 发送邮件处理任务
task_id = TaskDispatcher.send_email_task({
    "user_id": "test-user",
    "sender": "test@example.com",
    "subject": "Test Email",
    "body": "Test content",
    "attachments": []
})

# 发送OCR任务
task_id = TaskDispatcher.send_ocr_task({
    "task_id": "ocr-001",
    "file_path": "/path/to/document.pdf"
})
```

## 📈 **优势对比**

### 🎯 **开发体验**

**自建系统**:
```python
# 需要手写大量样板代码
class PostgreSQLTaskProcessor:
    def __init__(self):
        # 复杂的初始化
        
    async def fetch_next_task(self):
        # 手动SQL查询
        
    async def complete_task(self):
        # 手动状态更新
```

**Dramatiq**:
```python
# 专注业务逻辑
@dramatiq.actor
def process_email_task(email_data):
    # 只需要写业务逻辑
    return EmailProcessor().process(email_data)
```

### 🛡️ **错误处理**

**自建系统**:
```python
# 手动实现重试逻辑
if retry_count < max_retries:
    await asyncio.sleep(backoff_delay)
    retry_count += 1
else:
    # 标记为失败
```

**Dramatiq**:
```python
# 内置指数退避重试
@dramatiq.actor(max_retries=3, min_backoff=1000, max_backoff=60000)
def my_task(data):
    # 自动重试，无需手动处理
```

### 📊 **监控能力**

**自建系统**:
- 需要自己实现监控
- 手动查询数据库统计
- 无可视化界面

**Dramatiq**:
- 内置Web监控面板
- 实时任务统计
- 任务执行历史
- 错误日志聚合

## 🔧 **高级配置**

### 1. **自定义中间件**
```python
class TaskMonitoringMiddleware(dramatiq.Middleware):
    def before_process_message(self, broker, message):
        logger.info(f"开始处理: {message.actor_name}")
```

### 2. **队列优先级**
```python
@dramatiq.actor(queue_name="high_priority")
def urgent_task(data):
    pass

@dramatiq.actor(queue_name="low_priority") 
def background_task(data):
    pass
```

### 3. **任务结果存储**
```python
from dramatiq.results import Results
from dramatiq.results.backends import PostgreSQLBackend

# 配置结果存储
results_backend = PostgreSQLBackend(url=database_url)
broker.add_middleware(Results(backend=results_backend))

# 获取任务结果
result = process_email_task.send(data).get_result(block=True)
```

## 🗂️ **文件结构变化**

### 新增文件
```
backend/
├── app/
│   ├── core/
│   │   └── dramatiq_config.py          # Dramatiq配置
│   └── tasks/
│       └── dramatiq_tasks.py           # 任务定义
├── start_dramatiq_workers.py           # Worker启动脚本
├── manage_dramatiq.sh                  # 管理脚本
├── requirements_dramatiq.txt           # 新依赖
└── DRAMATIQ_MIGRATION.md              # 迁移文档
```

### 可以废弃的文件 (保留作为备份)
```
├── worker_manager.py                   # 自建Worker管理器
├── start_single_worker.py              # 单Worker启动
├── manage_workers.sh                   # 自建管理脚本
├── app/services/postgresql_task_processor.py  # 自建任务处理器
├── performance_test.py                 # 性能测试脚本
└── quick_performance_test.py           # 快速性能测试
```

## 🚦 **迁移检查清单**

- [ ] 安装Dramatiq依赖
- [ ] 配置PostgreSQL broker
- [ ] 定义Dramatiq任务
- [ ] 更新API端点调用
- [ ] 测试任务发送和处理
- [ ] 启动Dramatiq workers
- [ ] 验证监控面板
- [ ] 性能对比测试
- [ ] 生产环境部署
- [ ] 备份原有系统

## 🎉 **迁移后的收益**

1. **代码量减少60%+**: 删除大量样板代码
2. **开发效率提升**: 专注业务逻辑而非基础设施
3. **监控能力**: 专业的Web监控面板
4. **稳定性提升**: 经过生产验证的任务队列
5. **维护成本降低**: 无需维护自建系统

## 📞 **支持和帮助**

- **Dramatiq文档**: https://dramatiq.io/
- **监控面板**: http://localhost:8080 (启动后访问)
- **示例代码**: 参考 `app/tasks/dramatiq_tasks.py`
- **管理命令**: `./manage_dramatiq.sh help`