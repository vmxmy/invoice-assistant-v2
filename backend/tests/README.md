# 邮件地址管理系统测试文档

## 概述

这是一个完整的测试套件，用于验证邮件地址管理系统的功能完整性、性能和可靠性。

## 测试结构

```
tests/
├── conftest.py                     # 测试配置和工具函数
├── requirements.txt                # 测试依赖
├── README.md                       # 本文档
├── test_api_email_addresses.py     # API端点测试
├── test_email_address_service.py   # 服务层测试
├── test_mailgun_service.py         # Mailgun集成测试
└── test_email_address_model.py     # 数据库模型测试
```

## 测试覆盖范围

### 1. API端点测试 (`test_api_email_addresses.py`)
- ✅ 邮件地址创建 (POST /email-addresses/)
- ✅ 邮件地址查询 (GET /email-addresses/)
- ✅ 邮件地址更新 (PUT /email-addresses/{id})
- ✅ 邮件地址删除 (DELETE /email-addresses/{id})
- ✅ 设置默认地址
- ✅ 激活/停用地址
- ✅ 用户权限隔离
- ✅ 输入验证
- ✅ 分页查询
- ✅ 搜索功能
- ✅ 批量操作
- ✅ 错误处理

### 2. 服务层测试 (`test_email_address_service.py`)
- ✅ 地址创建业务逻辑
- ✅ 地址类型管理
- ✅ 默认地址设置
- ✅ 地址过期管理
- ✅ 用户配额限制
- ✅ 统计计算
- ✅ Mailgun集成
- ✅ 用户数据隔离
- ✅ 配置管理
- ✅ 并发操作处理

### 3. Mailgun集成测试 (`test_mailgun_service.py`)
- ✅ 路由创建和管理
- ✅ 通配符路由设置
- ✅ 域名验证
- ✅ Webhook测试
- ✅ 投递统计获取
- ✅ API错误处理
- ✅ 网络异常处理
- ✅ 性能要求验证
- ✅ 并发操作支持
- ✅ 用户ID提取功能

### 4. 数据库模型测试 (`test_email_address_model.py`)
- ✅ 数据模型创建
- ✅ 约束验证
- ✅ 枚举类型测试
- ✅ JSONB字段功能
- ✅ 索引性能
- ✅ 触发器功能
- ✅ 外键约束
- ✅ 软删除机制
- ✅ 并发操作
- ✅ 数据完整性

## 快速开始

### 1. 安装依赖

```bash
# 方法1: 使用测试脚本安装
python run_tests.py install

# 方法2: 手动安装
pip install -r tests/requirements.txt
```

### 2. 运行测试

```bash
# 运行所有测试
python run_tests.py all

# 运行单元测试
python run_tests.py unit

# 运行单元测试并生成覆盖率报告
python run_tests.py unit --coverage

# 运行特定测试
python run_tests.py specific --pattern "test_create"

# 并行运行测试
python run_tests.py parallel --workers 8

# 详细输出
python run_tests.py unit --verbose
```

### 3. 查看报告

测试完成后，报告文件将生成在 `test_reports/` 目录中：

- `unit_tests.html` - 单元测试报告
- `coverage/index.html` - 代码覆盖率报告
- `all_tests.html` - 完整测试报告

## 测试命令详解

### 基础测试命令

```bash
# 1. 安装测试依赖
python run_tests.py install

# 2. 运行单元测试
python run_tests.py unit

# 3. 运行集成测试
python run_tests.py integration

# 4. 运行性能测试
python run_tests.py performance

# 5. 运行所有测试
python run_tests.py all
```

### 高级测试选项

```bash
# 带覆盖率的测试
python run_tests.py unit --coverage

# 详细输出
python run_tests.py unit --verbose

# 并行测试 (4个工作进程)
python run_tests.py parallel --workers 4

# 运行特定模式的测试
python run_tests.py specific --pattern "mailgun"

# 跳过依赖安装
python run_tests.py unit --no-install
```

### 直接使用 pytest

```bash
# 运行单个测试文件
pytest tests/test_api_email_addresses.py -v

# 运行特定测试方法
pytest tests/test_api_email_addresses.py::TestEmailAddressAPI::test_create_primary_address -v

# 运行带标记的测试
pytest -m "not slow" -v

# 生成覆盖率报告
pytest --cov=app --cov-report=html tests/

# 并行运行
pytest -n 4 tests/
```

## 测试数据管理

### 测试数据库

- 使用 SQLite 内存数据库进行测试
- 每个测试都有独立的数据库事务
- 测试间数据完全隔离

### 测试数据工厂

```python
# 创建测试用户
user = await create_test_user(db_session, email="test@example.com")

# 创建测试邮件地址
address = await create_test_email_address(
    db_session,
    user_id=user.auth_user_id,
    address_type=EmailAddressType.WORK
)
```

### Mock服务

```python
# 使用 Mock Mailgun 服务
@pytest.fixture
def mock_mailgun_service():
    return MockMailgunService()
```

## 性能测试

### 性能要求

- API响应时间 < 200ms (95th percentile)
- 数据库查询时间 < 50ms
- 支持1000+并发用户
- 大数据集操作 < 10秒

### 性能测试用例

```python
async def test_api_response_time():
    """测试API响应时间"""
    with performance_timer:
        response = await client.get("/api/v1/email-addresses/")
    
    performance_timer.assert_faster_than(0.2)  # 200ms
```

## 错误处理测试

### HTTP错误码测试

- 200: 成功
- 201: 创建成功
- 400: 请求错误
- 401: 未授权
- 403: 禁止访问
- 404: 资源不存在
- 422: 验证错误
- 429: 频率限制
- 500: 服务器错误

### 异常处理测试

```python
async def test_database_connection_error():
    """测试数据库连接错误处理"""
    with patch('app.core.database.get_async_session') as mock_db:
        mock_db.side_effect = ConnectionError("Database unavailable")
        
        response = await client.get("/api/v1/email-addresses/")
        assert response.status_code == 500
```

## 安全测试

### 用户数据隔离

```python
async def test_user_data_isolation():
    """测试用户数据隔离"""
    user1 = await create_test_user(db_session, email="user1@example.com")
    user2 = await create_test_user(db_session, email="user2@example.com")
    
    # 用户1创建地址
    address1 = await create_test_email_address(db_session, user_id=user1.auth_user_id)
    
    # 用户2不能访问用户1的地址
    result = await service.get_user_address(user2.auth_user_id, address1.id)
    assert result is None
```

### 输入验证测试

```python
async def test_input_validation():
    """测试输入验证"""
    invalid_payloads = [
        {"address_type": "invalid_type"},
        {"custom_local_part": ""},
        {"expires_days": -1}
    ]
    
    for payload in invalid_payloads:
        response = await client.post("/api/v1/email-addresses/", json=payload)
        assert response.status_code == 400
```

## 集成测试

### Webhook集成测试

```python
async def test_webhook_integration():
    """测试完整的Webhook处理流程"""
    # 1. 创建邮件地址
    address = await service.create_address(user_id, EmailAddressType.PRIMARY)
    
    # 2. 模拟Mailgun Webhook
    webhook_payload = create_webhook_payload(address.email_address)
    response = await client.post("/api/v1/webhooks/email-received", json=webhook_payload)
    
    # 3. 验证处理结果
    assert response.status_code == 200
    
    # 4. 验证邮件计数更新
    await db_session.refresh(address)
    assert address.total_emails_received == 1
```

## 持续集成

### GitHub Actions

```yaml
name: 测试
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: 设置Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: 安装依赖
        run: |
          pip install -r requirements.txt
          pip install -r tests/requirements.txt
      - name: 运行测试
        run: python run_tests.py all --coverage
      - name: 上传覆盖率报告
        uses: codecov/codecov-action@v3
```

### 本地钩子

```bash
# 提交前运行测试
git add .
python run_tests.py unit
git commit -m "feature: 添加新功能"
```

## 故障排除

### 常见问题

1. **测试数据库连接失败**
   ```bash
   # 确保SQLite可用
   python -c "import sqlite3; print('SQLite版本:', sqlite3.sqlite_version)"
   ```

2. **依赖安装失败**
   ```bash
   # 升级pip
   pip install --upgrade pip
   
   # 清理缓存
   pip cache purge
   ```

3. **测试超时**
   ```bash
   # 增加超时时间
   pytest --timeout=300 tests/
   ```

4. **内存不足**
   ```bash
   # 减少并行工作进程
   python run_tests.py parallel --workers 2
   ```

### 调试技巧

```python
# 在测试中添加断点
import pdb; pdb.set_trace()

# 使用测试特定的日志
import logging
logging.basicConfig(level=logging.DEBUG)

# 查看SQL查询
# 在conftest.py中设置 echo=True
```

## 贡献指南

### 添加新测试

1. 在相应的测试文件中添加测试方法
2. 使用描述性的测试名称
3. 添加适当的文档字符串
4. 确保测试数据隔离
5. 验证所有断言

### 测试命名约定

```python
async def test_[功能]_[场景]_[期望结果]():
    """测试[功能]的[场景]，期望[结果]"""
    pass

# 示例：
async def test_create_address_with_invalid_prefix_raises_error():
    """测试创建地址时使用无效前缀，期望抛出错误"""
    pass
```

### 代码覆盖率要求

- 总体覆盖率 > 80%
- 核心业务逻辑 > 90%
- API端点 > 95%

## 参考资料

- [pytest 文档](https://docs.pytest.org/)
- [pytest-asyncio 文档](https://pytest-asyncio.readthedocs.io/)
- [SQLAlchemy 测试](https://docs.sqlalchemy.org/en/14/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites)
- [FastAPI 测试](https://fastapi.tiangolo.com/tutorial/testing/)
- [HTTPX 文档](https://www.python-httpx.org/)