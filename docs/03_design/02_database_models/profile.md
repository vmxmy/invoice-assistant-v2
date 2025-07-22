# 用户模型（Profile）设计文档

## 1. 模型概述

用户模型是系统的核心模型之一，与 Supabase Auth 系统集成，存储用户的扩展信息和业务相关数据。

## 2. 表结构设计

### 2.1 profiles 表
```sql
CREATE TABLE profiles (
    -- 主键，与 auth.users 表的 id 关联
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 基本信息
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    
    -- 业务信息
    company_name VARCHAR(200),
    tax_number VARCHAR(50),
    address TEXT,
    
    -- 账户信息
    account_type VARCHAR(20) DEFAULT 'free', -- free, pro, enterprise
    storage_quota BIGINT DEFAULT 1073741824, -- 1GB in bytes
    storage_used BIGINT DEFAULT 0,
    
    -- 配置信息
    preferences JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{"email": true, "sms": false}',
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- 软删除
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- 约束
    CONSTRAINT email_unique UNIQUE(email),
    CONSTRAINT account_type_check CHECK (account_type IN ('free', 'pro', 'enterprise'))
);

-- 索引
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_company ON profiles(company_name);
CREATE INDEX idx_profiles_deleted ON profiles(deleted_at);
```

## 3. 数据模型

### 3.1 SQLAlchemy 模型
```python
from sqlalchemy import Column, String, DateTime, BigInteger, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(String(255), nullable=False, unique=True)
    full_name = Column(String(100))
    avatar_url = Column(String(500))
    phone = Column(String(20))
    
    company_name = Column(String(200))
    tax_number = Column(String(50))
    address = Column(String)
    
    account_type = Column(String(20), default='free')
    storage_quota = Column(BigInteger, default=1073741824)
    storage_used = Column(BigInteger, default=0)
    
    preferences = Column(JSON, default={})
    notification_settings = Column(JSON, default={"email": True, "sms": False})
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True))
    deleted_at = Column(DateTime(timezone=True))
    
    # 关系
    invoices = relationship("Invoice", back_populates="user")
    tasks = relationship("Task", back_populates="user")
```

### 3.2 Pydantic Schema
```python
from pydantic import BaseModel, EmailStr, UUID4
from typing import Optional, Dict
from datetime import datetime

class ProfileBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    tax_number: Optional[str] = None
    address: Optional[str] = None

class ProfileCreate(ProfileBase):
    pass

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    tax_number: Optional[str] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[Dict] = None
    notification_settings: Optional[Dict] = None

class ProfileInDB(ProfileBase):
    id: UUID4
    account_type: str
    storage_quota: int
    storage_used: int
    preferences: Dict
    notification_settings: Dict
    created_at: datetime
    updated_at: Optional[datetime]
    last_login_at: Optional[datetime]
    
    class Config:
        orm_mode = True
```

## 4. 功能设计

### 4.1 用户注册流程
```python
async def create_profile(user_id: UUID, email: str) -> Profile:
    """
    1. Supabase Auth 创建用户
    2. 触发 trigger 自动创建 profile
    3. 发送欢迎邮件
    4. 初始化用户配置
    """
    profile = Profile(
        id=user_id,
        email=email,
        created_at=datetime.utcnow()
    )
    db.add(profile)
    await db.commit()
    return profile
```

### 4.2 用户认证
```python
async def authenticate_user(email: str, password: str) -> Optional[Profile]:
    """
    1. 调用 Supabase Auth 验证
    2. 获取用户 profile
    3. 更新 last_login_at
    4. 返回用户信息和 token
    """
    # Supabase 认证
    auth_response = await supabase.auth.sign_in_with_password({
        "email": email,
        "password": password
    })
    
    # 更新登录时间
    profile = await get_profile(auth_response.user.id)
    profile.last_login_at = datetime.utcnow()
    await db.commit()
    
    return profile
```

## 5. 权限控制

### 5.1 Row Level Security (RLS)
```sql
-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和修改自己的数据
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

-- 管理员可以查看所有用户
CREATE POLICY "Admins can view all profiles" 
    ON profiles FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND account_type = 'admin'
        )
    );
```

### 5.2 账户类型权限
| 功能 | Free | Pro | Enterprise |
|------|------|-----|------------|
| 发票数量 | 100/月 | 1000/月 | 无限制 |
| 存储空间 | 1GB | 10GB | 100GB |
| API 调用 | 1000/天 | 10000/天 | 无限制 |
| 邮箱数量 | 1 | 5 | 无限制 |
| 导出功能 | 基础 | 高级 | 全部 |

## 6. 存储配额管理

### 6.1 配额检查
```python
async def check_storage_quota(user_id: UUID, file_size: int) -> bool:
    """检查用户存储配额"""
    profile = await get_profile(user_id)
    return profile.storage_used + file_size <= profile.storage_quota

async def update_storage_used(user_id: UUID, size_delta: int):
    """更新已用存储空间"""
    await db.execute(
        update(Profile)
        .where(Profile.id == user_id)
        .values(storage_used=Profile.storage_used + size_delta)
    )
```

### 6.2 配额告警
```python
def get_storage_usage_percentage(profile: Profile) -> float:
    """获取存储使用百分比"""
    return (profile.storage_used / profile.storage_quota) * 100

async def check_storage_alert(profile: Profile):
    """存储空间告警"""
    usage = get_storage_usage_percentage(profile)
    if usage >= 90:
        await send_storage_alert_email(profile.email, usage)
```

## 7. 用户偏好设置

### 7.1 偏好设置结构
```json
{
    "preferences": {
        "language": "zh-CN",
        "timezone": "Asia/Shanghai",
        "theme": "light",
        "date_format": "YYYY-MM-DD",
        "currency": "CNY",
        "invoice_naming": "{date}-{seller}-{amount}",
        "auto_download": true,
        "ocr_service": "aliyun"
    }
}
```

### 7.2 通知设置
```json
{
    "notification_settings": {
        "email": {
            "enabled": true,
            "invoice_processed": true,
            "weekly_report": true,
            "storage_alert": true
        },
        "sms": {
            "enabled": false,
            "urgent_only": true
        },
        "webhook": {
            "enabled": false,
            "url": "https://example.com/webhook"
        }
    }
}
```

## 8. 数据迁移

### 8.1 V1 到 V2 迁移
```sql
-- 从旧系统迁移用户数据
INSERT INTO profiles (id, email, full_name, created_at)
SELECT 
    gen_random_uuid(),
    email,
    username,
    date_joined
FROM v1.users;
```

### 8.2 字段更新
```sql
-- 添加新字段
ALTER TABLE profiles 
ADD COLUMN department VARCHAR(100),
ADD COLUMN employee_id VARCHAR(50);

-- 更新现有数据
UPDATE profiles 
SET preferences = jsonb_set(preferences, '{ocr_service}', '"mineru"')
WHERE account_type = 'enterprise';
```

## 9. 性能优化

### 9.1 查询优化
```python
# 使用 select 只查询需要的字段
query = select(
    Profile.id,
    Profile.email,
    Profile.full_name,
    Profile.storage_used,
    Profile.storage_quota
).where(Profile.id == user_id)

# 使用 joinedload 避免 N+1 查询
query = select(Profile).options(
    joinedload(Profile.invoices),
    joinedload(Profile.tasks)
).where(Profile.id == user_id)
```

### 9.2 缓存策略
```python
from functools import lru_cache
import redis

redis_client = redis.Redis()

async def get_profile_cached(user_id: UUID) -> Profile:
    """缓存用户信息"""
    cache_key = f"profile:{user_id}"
    cached = redis_client.get(cache_key)
    
    if cached:
        return Profile.parse_raw(cached)
    
    profile = await get_profile(user_id)
    redis_client.setex(
        cache_key, 
        3600,  # 1小时过期
        profile.json()
    )
    return profile
```

## 10. 监控指标

### 10.1 用户活跃度
- 日活跃用户（DAU）
- 月活跃用户（MAU）
- 用户留存率
- 平均会话时长

### 10.2 账户分布
- 各类型账户数量
- 存储使用分布
- 地理位置分布
- 注册渠道分析