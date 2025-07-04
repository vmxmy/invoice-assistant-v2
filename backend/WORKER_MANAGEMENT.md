# Worker管理文档

本文档介绍如何管理Invoice Assistant的PostgreSQL任务队列Workers。

## 概述

Invoice Assistant使用PostgreSQL作为任务队列，替代了传统的Redis+Celery架构。系统提供了多种方式来管理Workers：

1. **Worker管理器** (`worker_manager.py`) - 完整的Worker管理解决方案
2. **单Worker启动** (`start_single_worker.py`) - 启动单个Worker
3. **Shell脚本** (`manage_workers.sh`) - 便捷的命令行管理工具
4. **系统服务** (`invoice-worker.service`) - systemd服务配置
5. **Docker部署** (`docker-compose.workers.yml`) - 容器化部署

## 快速开始

### 1. 使用Shell脚本 (推荐)

```bash
# 启动2个workers
./manage_workers.sh start

# 启动指定数量的workers
./manage_workers.sh start 4

# 查看状态
./manage_workers.sh status

# 查看日志
./manage_workers.sh logs

# 实时查看日志
./manage_workers.sh follow

# 重启workers
./manage_workers.sh restart

# 停止所有workers
./manage_workers.sh stop
```

### 2. 使用Worker管理器

```bash
# 激活虚拟环境
source venv/bin/activate

# 启动2个workers (守护进程模式)
python worker_manager.py start -c 2 -d

# 查看Worker状态
python worker_manager.py status

# 查看队列统计
python worker_manager.py stats

# 扩容到4个workers
python worker_manager.py scale 4
```

### 3. 启动单个Worker

```bash
# 启动一个worker
python start_single_worker.py

# 启动带名称的worker
python start_single_worker.py -n "email-processor"

# 启动详细日志模式
python start_single_worker.py -v
```

## 详细配置

### Worker管理器选项

```bash
python worker_manager.py start --help
```

选项说明：
- `-c, --count`: Worker数量 (默认: 2)
- `-d, --daemon`: 守护进程模式
- `-m, --monitor`: 监控间隔秒数 (默认: 30)

### 环境变量

Workers需要以下环境变量：

```bash
# 数据库连接
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/db

# OpenAI API配置
OPENAI_API_KEY=your-api-key
OPENAI_API_BASE=https://api.openai.com/v1

# MineruNet API配置 (可选)
MINERU_API_TOKEN=your-mineru-token

# 日志级别
LOG_LEVEL=INFO
```

## 系统服务部署

### 1. 安装systemd服务

```bash
# 复制服务文件
sudo cp invoice-worker.service /etc/systemd/system/

# 修改服务文件中的路径
sudo nano /etc/systemd/system/invoice-worker.service

# 重新加载systemd
sudo systemctl daemon-reload

# 启用服务
sudo systemctl enable invoice-worker

# 启动服务
sudo systemctl start invoice-worker

# 查看状态
sudo systemctl status invoice-worker
```

### 2. 服务管理

```bash
# 查看日志
sudo journalctl -u invoice-worker -f

# 重启服务
sudo systemctl restart invoice-worker

# 停止服务
sudo systemctl stop invoice-worker
```

## Docker部署

### 1. 基本部署

```bash
# 构建并启动workers
docker-compose -f docker-compose.workers.yml up -d

# 查看日志
docker-compose -f docker-compose.workers.yml logs -f

# 扩容workers
docker-compose -f docker-compose.workers.yml up -d --scale invoice-worker-1=3

# 停止workers
docker-compose -f docker-compose.workers.yml down
```

### 2. 使用profiles

```bash
# 启动workers + 本地数据库
docker-compose -f docker-compose.workers.yml --profile local-db up -d

# 启动workers + 管理器
docker-compose -f docker-compose.workers.yml --profile manager up -d

# 启动完整监控栈
docker-compose -f docker-compose.workers.yml --profile monitoring up -d
```

## 监控和诊断

### 1. Worker状态监控

```bash
# 查看Worker进程
ps aux | grep worker_manager

# 查看资源使用
top -p $(pgrep -f worker_manager)

# 查看网络连接
netstat -an | grep 5432
```

### 2. 队列监控

```bash
# 获取队列统计
python worker_manager.py stats

# 直接查询数据库
psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM task_queue GROUP BY status;"
```

### 3. 日志分析

```bash
# 查看错误日志
grep ERROR logs/workers.log

# 查看任务处理统计
grep "任务处理完成" logs/workers.log | wc -l

# 实时监控任务
tail -f logs/workers.log | grep "任务处理"
```

## 性能调优

### 1. Worker数量调优

根据以下因素调整Worker数量：

- **CPU核心数**: 建议不超过CPU核心数的2倍
- **内存使用**: 每个Worker约占用200-500MB内存
- **任务类型**: 
  - IO密集型任务（邮件处理）: 可以更多Workers
  - CPU密集型任务（OCR处理）: 较少Workers
- **数据库连接数**: 注意数据库最大连接数限制

```bash
# 查看当前负载
./manage_workers.sh status

# 根据负载动态调整
./manage_workers.sh restart 4  # 调整为4个workers
```

### 2. 数据库连接优化

在 `app/core/config.py` 中配置连接池：

```python
# 数据库连接池配置
DATABASE_POOL_SIZE = 20
DATABASE_MAX_OVERFLOW = 30
DATABASE_POOL_TIMEOUT = 30
```

### 3. 任务优先级配置

在任务入队时设置优先级：

```python
# 高优先级任务
await task_queue.enqueue(
    task_type="process_email",
    payload=data,
    priority=10  # 数值越高优先级越高
)
```

## 故障排除

### 1. 常见问题

**Worker无法启动**
```bash
# 检查依赖
pip install -r requirements.txt

# 检查数据库连接
python -c "from app.core.config import settings; print(settings.database_url)"

# 查看详细错误
python start_single_worker.py -v
```

**任务处理缓慢**
```bash
# 检查队列积压
python worker_manager.py stats

# 增加Worker数量
./manage_workers.sh restart 4

# 检查数据库性能
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE application_name LIKE '%worker%';"
```

**内存泄漏**
```bash
# 监控内存使用
watch -n 5 'ps aux | grep worker_manager'

# 定期重启Workers
# 在crontab中添加: 0 */6 * * * /path/to/manage_workers.sh restart
```

### 2. 调试模式

```bash
# 启动单个Worker进行调试
python start_single_worker.py -v -n "debug-worker"

# 设置详细日志
export LOG_LEVEL=DEBUG
python worker_manager.py start -c 1
```

## 最佳实践

1. **生产环境建议**:
   - 使用systemd服务部署
   - 配置日志轮转
   - 设置监控告警
   - 定期备份任务队列数据

2. **开发环境建议**:
   - 使用单Worker进行测试
   - 启用详细日志
   - 使用本地数据库

3. **容器环境建议**:
   - 使用Docker Compose部署
   - 配置健康检查
   - 设置资源限制
   - 使用持久化存储

4. **监控建议**:
   - 监控Worker进程状态
   - 监控队列任务积压
   - 监控数据库连接数
   - 设置告警阈值

## 相关文件

- `worker_manager.py` - 主要的Worker管理器
- `start_single_worker.py` - 单Worker启动脚本
- `manage_workers.sh` - Shell管理脚本
- `invoice-worker.service` - systemd服务配置
- `docker-compose.workers.yml` - Docker Compose配置
- `Dockerfile.worker` - Worker Docker镜像
- `app/services/postgresql_task_processor.py` - Worker核心实现