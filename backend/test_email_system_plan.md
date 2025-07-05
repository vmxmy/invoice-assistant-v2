# 邮件地址管理系统测试计划

## 测试概述

这是一个全面的测试计划，旨在验证邮件地址管理系统的功能完整性、性能和可靠性。

## 测试范围

### 1. 核心功能测试
- 邮件地址创建、读取、更新、删除 (CRUD)
- 用户绑定和权限控制
- 地址类型管理 (primary, work, personal, temporary, custom)
- 默认地址设置
- 地址状态管理 (active, inactive, expired)

### 2. 集成测试
- Mailgun API集成
- Webhook处理
- 数据库事务
- 前后端数据流

### 3. 安全测试
- 用户权限隔离 (RLS)
- 输入验证
- SQL注入防护
- 跨站脚本 (XSS) 防护

### 4. 性能测试
- 并发用户支持
- 大量地址管理
- API响应时间
- 数据库查询优化

## 测试环境设置

### 前置条件
- PostgreSQL 数据库 (测试环境)
- Mailgun API 测试账户
- Node.js + React 开发环境
- Python + FastAPI 后端环境

### 测试数据
- 测试用户账户 (10个)
- 各种类型邮件地址 (100个)
- 模拟邮件数据
- 边界条件数据

## 详细测试用例

### A. API端点测试

#### A1. 邮件地址创建 (POST /email-addresses/)
```python
# 正常场景
def test_create_primary_address():
    """创建主要地址"""
    pass

def test_create_custom_address_with_prefix():
    """创建带自定义前缀的地址"""
    pass

def test_create_temporary_address_with_expiry():
    """创建有过期时间的临时地址"""
    pass

# 边界场景
def test_create_address_max_limit():
    """测试用户地址数量上限"""
    pass

def test_create_duplicate_address():
    """测试重复地址创建"""
    pass

def test_create_address_invalid_prefix():
    """测试无效前缀处理"""
    pass

# 错误场景
def test_create_address_unauthorized():
    """测试未授权用户创建"""
    pass

def test_create_address_invalid_data():
    """测试无效数据输入"""
    pass
```

#### A2. 邮件地址查询 (GET /email-addresses/)
```python
def test_list_user_addresses():
    """获取用户地址列表"""
    pass

def test_list_addresses_with_filters():
    """带筛选条件的地址查询"""
    pass

def test_list_addresses_pagination():
    """分页查询测试"""
    pass

def test_get_address_by_id():
    """根据ID获取特定地址"""
    pass
```

#### A3. 邮件地址更新 (PUT /email-addresses/{id})
```python
def test_update_address_alias():
    """更新地址别名"""
    pass

def test_update_address_description():
    """更新地址描述"""
    pass

def test_update_address_status():
    """更新地址状态"""
    pass

def test_update_default_address():
    """设置默认地址"""
    pass
```

#### A4. 邮件地址删除 (DELETE /email-addresses/{id})
```python
def test_delete_normal_address():
    """删除普通地址"""
    pass

def test_delete_default_address_protection():
    """测试默认地址删除保护"""
    pass

def test_delete_address_soft_delete():
    """测试软删除功能"""
    pass
```

### B. 服务层测试

#### B1. EmailAddressService 业务逻辑
```python
def test_address_generation_patterns():
    """测试各种地址生成模式"""
    pass

def test_user_address_quota_enforcement():
    """测试用户配额限制"""
    pass

def test_address_expiry_management():
    """测试地址过期管理"""
    pass

def test_default_address_logic():
    """测试默认地址逻辑"""
    pass

def test_address_statistics_calculation():
    """测试地址统计计算"""
    pass
```

### C. Mailgun集成测试

#### C1. MailgunService 外部API集成
```python
def test_mailgun_route_creation():
    """测试Mailgun路由创建"""
    pass

def test_mailgun_wildcard_route():
    """测试通配符路由设置"""
    pass

def test_mailgun_route_deletion():
    """测试路由删除"""
    pass

def test_mailgun_domain_verification():
    """测试域名验证"""
    pass

def test_mailgun_webhook_signature():
    """测试Webhook签名验证"""
    pass

def test_mailgun_api_error_handling():
    """测试API错误处理"""
    pass
```

### D. 数据库模型测试

#### D1. EmailAddress 模型验证
```python
def test_email_address_constraints():
    """测试数据库约束"""
    pass

def test_rls_policies():
    """测试行级安全策略"""
    pass

def test_database_triggers():
    """测试数据库触发器"""
    pass

def test_index_performance():
    """测试索引性能"""
    pass

def test_jsonb_queries():
    """测试JSONB字段查询"""
    pass
```

### E. Webhook处理测试

#### E1. 邮件接收处理
```python
def test_webhook_email_parsing():
    """测试邮件内容解析"""
    pass

def test_user_id_extraction():
    """测试用户ID提取"""
    pass

def test_invalid_email_handling():
    """测试无效邮件处理"""
    pass

def test_webhook_security():
    """测试Webhook安全性"""
    pass
```

### F. 前端组件测试

#### F1. EmailAddressManager React组件
```javascript
describe('EmailAddressManager', () => {
  test('渲染地址列表', () => {
    // 测试组件渲染
  });

  test('创建新地址表单', () => {
    // 测试地址创建流程
  });

  test('地址操作按钮', () => {
    // 测试复制、删除、设置默认等操作
  });

  test('状态管理', () => {
    // 测试React Query状态管理
  });

  test('错误处理', () => {
    // 测试错误提示和处理
  });
});
```

### G. 端到端集成测试

#### G1. 完整用户流程
```python
def test_complete_email_workflow():
    """测试完整的邮件地址管理流程"""
    # 1. 用户注册/登录
    # 2. 创建邮件地址
    # 3. 配置Mailgun路由
    # 4. 接收测试邮件
    # 5. 处理邮件内容
    # 6. 更新地址统计
    pass

def test_multi_user_isolation():
    """测试多用户数据隔离"""
    pass

def test_concurrent_operations():
    """测试并发操作处理"""
    pass
```

### H. 性能测试

#### H1. 负载测试
```python
def test_high_volume_address_creation():
    """大量地址创建性能测试"""
    pass

def test_concurrent_webhook_processing():
    """并发Webhook处理测试"""
    pass

def test_database_query_performance():
    """数据库查询性能测试"""
    pass

def test_api_response_times():
    """API响应时间测试"""
    pass
```

## 测试数据准备

### 测试用户
```python
TEST_USERS = [
    {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "email": "test1@example.com",
        "name": "测试用户1"
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440002", 
        "email": "test2@example.com",
        "name": "测试用户2"
    }
]
```

### 测试地址模板
```python
TEST_ADDRESS_TEMPLATES = [
    {
        "type": "primary",
        "pattern": "invoice-main-{user_id}@test.example.com"
    },
    {
        "type": "custom",
        "pattern": "invoice-company-{user_id}@test.example.com"
    }
]
```

## 测试工具和框架

### 后端测试
- **pytest**: Python测试框架
- **httpx**: HTTP客户端测试
- **pytest-asyncio**: 异步测试支持
- **factory-boy**: 测试数据工厂
- **freezegun**: 时间模拟

### 前端测试
- **Jest**: JavaScript测试框架
- **React Testing Library**: React组件测试
- **MSW**: API Mock服务
- **Cypress**: 端到端测试

### 数据库测试
- **pytest-postgresql**: PostgreSQL测试数据库
- **alembic**: 数据库迁移测试

## 测试执行计划

### 阶段1: 单元测试 (第1-2天)
- API端点测试
- 服务层测试
- 数据库模型测试

### 阶段2: 集成测试 (第3-4天)  
- Mailgun集成测试
- Webhook处理测试
- 前后端集成测试

### 阶段3: 端到端测试 (第5天)
- 完整用户流程测试
- 跨组件集成测试

### 阶段4: 性能测试 (第6天)
- 负载测试
- 压力测试
- 性能优化

## 测试成功标准

### 功能测试
- 所有API端点返回正确状态码和数据
- 所有业务逻辑按预期执行
- 数据完整性得到保证

### 性能测试
- API响应时间 < 200ms (95th percentile)
- 支持1000+并发用户
- 数据库查询时间 < 50ms

### 安全测试
- 用户数据完全隔离
- 所有输入得到验证
- 无SQL注入或XSS漏洞

## 测试报告格式

### 测试结果总结
- 通过率统计
- 失败用例分析
- 性能指标报告
- 安全漏洞评估

### 问题追踪
- Bug严重程度分类
- 修复优先级排序
- 回归测试计划

## 持续集成

### 自动化测试
- Git提交时触发单元测试
- PR合并前执行完整测试套件
- 定期执行性能回归测试

### 测试环境维护
- 每日重置测试数据
- 定期更新测试依赖
- 监控测试环境健康状态