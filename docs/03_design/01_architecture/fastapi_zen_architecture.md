# 🧘 FastAPI Zen Architecture Vision

## 道法自然 - Following Natural Patterns

> *"Simplicity is the ultimate sophistication."* - Leonardo da Vinci
> 
> *"大道至简，悟在天成"* - The great way is simple, enlightenment comes naturally

This document outlines the zen-inspired architectural philosophy for our FastAPI application, emphasizing clarity, simplicity, and natural flow.

## 🎯 Core Zen Principles

### 1. **一源多视 (One Source, Multiple Views)**
```
Database Models ← → API Schemas ← → Frontend Types
     (真相之源)      (接口契约)      (界面契约)
```

**Philosophy**: Truth exists in one place, but manifests in different forms for different needs.

### 2. **层次分明 (Clear Layered Abstraction)**
```
Controllers (FastAPI Routes) - 控制层
    ↓
Services (Business Logic)    - 服务层
    ↓  
Repositories (Data Access)   - 数据层
    ↓
Models (Database Layer)      - 模型层 ✅ COMPLETE
```

**Philosophy**: Each layer knows only what it needs to know, speaks only its own language.

### 3. **域驱动设计 (Domain-Driven Structure)**
```
app/
├── core/           # 🧠 核心 - 配置、安全、依赖注入
├── domains/        # 🏠 领域 - 业务逻辑容器
│   ├── auth/       # 🔐 身份认证
│   ├── users/      # 👤 用户管理 (档案)
│   ├── invoices/   # 📄 核心业务领域
│   ├── files/      # 📁 文件处理
│   └── tasks/      # ⚙️ 后台处理
├── shared/         # 🔧 共享 - 通用工具
└── api/           # 🌐 接口 - 路由定义
```

**Philosophy**: Structure follows understanding, not technical convenience.

## 🏗️ Detailed Architecture Design

### Core Layer (核心层) - The Foundation

```python
# app/core/
├── config.py      # 📋 配置管理 - 单一真相源
├── database.py    # 🔌 数据库连接和会话管理
├── security.py    # 🛡️ 认证授权逻辑
├── exceptions.py  # ⚠️ 全局异常处理
└── dependencies.py # 🔗 依赖注入容器
```

#### **Zen Principle**: *一事一专 (One Thing, One Responsibility)*

```python
# app/core/config.py - 配置的禅道
class Settings(BaseSettings):
    """配置即文档，环境即配置"""
    
    # 数据库配置
    database_url: str = Field(..., description="PostgreSQL 连接字符串")
    database_pool_size: int = Field(20, description="连接池大小")
    
    # Supabase 配置
    supabase_url: str = Field(..., description="Supabase 项目 URL")
    supabase_jwt_secret: str = Field(..., description="JWT 验证密钥")
    supabase_service_key: str = Field(..., description="服务端密钥")
    
    # 外部服务配置
    mineru_api_token: str = Field(..., description="Mineru OCR API Token")
    mineru_api_base_url: str = Field("https://mineru.net", description="Mineru API 基础 URL")
    
    # 应用配置
    app_name: str = Field("发票助手 API", description="应用名称")
    debug: bool = Field(False, description="调试模式")
    api_v1_prefix: str = Field("/api/v1", description="API 版本前缀")
    
    # 安全配置
    cors_origins: List[str] = Field([], description="CORS 允许的源")
    access_token_expire_minutes: int = Field(30, description="访问令牌过期时间")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        validate_assignment = True

# 全局单例 - 简单而纯粹
settings = Settings()
```

### Domain Layer (领域层) - The Essence

每个领域都是自包含的宇宙，遵循相同的结构模式：

```python
# app/domains/invoices/ - 发票领域的禅道
├── __init__.py         # 领域入口
├── models.py          # 🏛️ 领域模型 (Pydantic Schemas)
├── service.py         # 🧮 业务逻辑 (纯函数优先)
├── repository.py      # 📚 数据访问层
├── routes.py          # 🛣️ API 端点
├── dependencies.py    # 🔗 领域特定依赖
└── exceptions.py      # ⚠️ 领域特定异常
```

#### **Invoice Domain Example (发票领域示例)**

```python
# app/domains/invoices/models.py - 数据契约
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, validator

class InvoiceStatus(str, Enum):
    """发票状态枚举"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    ARCHIVED = "archived"

class InvoiceBase(BaseModel):
    """发票基础模型 - 共享字段"""
    invoice_number: str = Field(..., description="发票号码", max_length=100)
    invoice_code: Optional[str] = Field(None, description="发票代码", max_length=50)
    amount: Decimal = Field(..., description="金额", ge=0)
    tax_amount: Optional[Decimal] = Field(None, description="税额", ge=0)
    total_amount: Optional[Decimal] = Field(None, description="总金额", ge=0)
    currency: str = Field("CNY", description="货币", max_length=3)
    invoice_date: date = Field(..., description="发票日期")
    seller_name: Optional[str] = Field(None, description="销售方名称", max_length=200)
    buyer_name: Optional[str] = Field(None, description="购买方名称", max_length=200)
    
    @validator('total_amount')
    def validate_total_amount(cls, v, values):
        """验证总金额逻辑"""
        if v is not None:
            amount = values.get('amount', 0)
            tax_amount = values.get('tax_amount', 0)
            if abs(v - (amount + tax_amount)) > 0.01:  # 允许1分钱误差
                raise ValueError('总金额应等于金额加税额')
        return v

class InvoiceCreate(InvoiceBase):
    """创建发票请求模型"""
    tags: Optional[List[str]] = Field([], description="标签列表")
    category: Optional[str] = Field(None, description="分类", max_length=50)
    
class InvoiceUpdate(BaseModel):
    """更新发票请求模型"""
    invoice_number: Optional[str] = Field(None, max_length=100)
    amount: Optional[Decimal] = Field(None, ge=0)
    tax_amount: Optional[Decimal] = Field(None, ge=0)
    total_amount: Optional[Decimal] = Field(None, ge=0)
    seller_name: Optional[str] = Field(None, max_length=200)
    buyer_name: Optional[str] = Field(None, max_length=200)
    tags: Optional[List[str]] = Field(None)
    category: Optional[str] = Field(None, max_length=50)
    is_verified: Optional[bool] = Field(None)
    verification_notes: Optional[str] = Field(None)

class InvoiceResponse(InvoiceBase):
    """发票响应模型"""
    id: UUID = Field(..., description="发票ID")
    user_id: UUID = Field(..., description="用户ID")
    status: InvoiceStatus = Field(..., description="发票状态")
    processing_status: Optional[str] = Field(None, description="处理状态")
    extracted_data: Optional[Dict[str, Any]] = Field({}, description="OCR提取数据")
    tags: List[str] = Field([], description="标签列表")
    category: Optional[str] = Field(None, description="分类")
    file_path: Optional[str] = Field(None, description="文件路径")
    file_size: Optional[int] = Field(None, description="文件大小")
    is_verified: bool = Field(False, description="是否已验证")
    verified_at: Optional[datetime] = Field(None, description="验证时间")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    
    class Config:
        from_attributes = True

class InvoiceListResponse(BaseModel):
    """发票列表响应"""
    items: List[InvoiceResponse] = Field(..., description="发票列表")
    total: int = Field(..., description="总数量")
    page: int = Field(..., description="当前页")
    size: int = Field(..., description="每页大小")
    pages: int = Field(..., description="总页数")

class InvoiceFilter(BaseModel):
    """发票过滤参数"""
    status: Optional[InvoiceStatus] = Field(None, description="发票状态")
    start_date: Optional[date] = Field(None, description="开始日期")
    end_date: Optional[date] = Field(None, description="结束日期")
    min_amount: Optional[Decimal] = Field(None, description="最小金额", ge=0)
    max_amount: Optional[Decimal] = Field(None, description="最大金额", ge=0)
    seller_name: Optional[str] = Field(None, description="销售方名称")
    tags: Optional[List[str]] = Field(None, description="标签过滤")
    category: Optional[str] = Field(None, description="分类")
    is_verified: Optional[bool] = Field(None, description="是否已验证")
    search: Optional[str] = Field(None, description="搜索关键词")
```

```python
# app/domains/invoices/service.py - 业务逻辑的禅道
from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, desc
from sqlalchemy.orm import selectinload

from app.domains.invoices.models import (
    InvoiceCreate, InvoiceUpdate, InvoiceFilter, InvoiceListResponse
)
from app.domains.invoices.repository import InvoiceRepository
from app.domains.invoices.exceptions import InvoiceNotFoundError, DuplicateInvoiceError
from app.models.invoice import Invoice as DBInvoice

class InvoiceService:
    """发票服务 - 纯粹的业务逻辑"""
    
    def __init__(self, repository: InvoiceRepository):
        self.repository = repository
    
    async def create_invoice(
        self,
        data: InvoiceCreate,
        user_id: UUID,
        db: AsyncSession
    ) -> DBInvoice:
        """创建发票 - 包含业务规则验证"""
        
        # 1. 检查重复发票号
        existing = await self.repository.get_by_number(
            data.invoice_number, user_id, db
        )
        if existing:
            raise DuplicateInvoiceError(
                f"发票号 {data.invoice_number} 已存在"
            )
        
        # 2. 应用业务规则
        invoice_dict = data.dict()
        invoice_dict.update({
            "user_id": user_id,
            "status": "pending",
            "processing_status": "waiting"
        })
        
        # 3. 自动计算总金额（如果未提供）
        if not invoice_dict.get("total_amount"):
            amount = invoice_dict.get("amount", 0)
            tax_amount = invoice_dict.get("tax_amount", 0)
            invoice_dict["total_amount"] = amount + tax_amount
        
        # 4. 创建发票
        invoice = await self.repository.create(invoice_dict, db)
        return invoice
    
    async def get_invoices(
        self,
        user_id: UUID,
        filters: InvoiceFilter,
        page: int = 1,
        size: int = 20,
        db: AsyncSession
    ) -> InvoiceListResponse:
        """获取发票列表 - 支持复杂过滤和分页"""
        
        # 构建查询条件
        query_filters = [DBInvoice.user_id == user_id]
        
        if filters.status:
            query_filters.append(DBInvoice.status == filters.status)
        
        if filters.start_date:
            query_filters.append(DBInvoice.invoice_date >= filters.start_date)
        
        if filters.end_date:
            query_filters.append(DBInvoice.invoice_date <= filters.end_date)
        
        if filters.min_amount:
            query_filters.append(DBInvoice.amount >= filters.min_amount)
        
        if filters.max_amount:
            query_filters.append(DBInvoice.amount <= filters.max_amount)
        
        if filters.seller_name:
            query_filters.append(
                DBInvoice.seller_name.ilike(f"%{filters.seller_name}%")
            )
        
        if filters.tags:
            query_filters.append(
                DBInvoice.tags.op('&&')(filters.tags)
            )
        
        if filters.category:
            query_filters.append(DBInvoice.category == filters.category)
        
        if filters.is_verified is not None:
            query_filters.append(DBInvoice.is_verified == filters.is_verified)
        
        if filters.search:
            search_pattern = f"%{filters.search}%"
            query_filters.append(
                or_(
                    DBInvoice.invoice_number.ilike(search_pattern),
                    DBInvoice.seller_name.ilike(search_pattern),
                    DBInvoice.buyer_name.ilike(search_pattern)
                )
            )
        
        # 执行查询
        invoices, total = await self.repository.get_paginated(
            filters=and_(*query_filters),
            page=page,
            size=size,
            order_by=desc(DBInvoice.created_at),
            db=db
        )
        
        # 计算分页信息
        pages = (total + size - 1) // size
        
        return InvoiceListResponse(
            items=invoices,
            total=total,
            page=page,
            size=size,
            pages=pages
        )
    
    async def process_ocr_result(
        self,
        invoice_id: UUID,
        user_id: UUID,
        ocr_data: Dict[str, Any],
        db: AsyncSession
    ) -> DBInvoice:
        """处理 OCR 结果 - 智能数据提取和验证"""
        
        invoice = await self.repository.get_by_id(invoice_id, user_id, db)
        if not invoice:
            raise InvoiceNotFoundError(f"发票 {invoice_id} 不存在")
        
        # 应用 OCR 数据更新逻辑
        invoice.update_from_ocr_result(ocr_data)
        
        # 保存更新
        await self.repository.update(invoice, db)
        
        return invoice
    
    async def verify_invoice(
        self,
        invoice_id: UUID,
        user_id: UUID,
        verifier_id: UUID,
        notes: Optional[str] = None,
        db: AsyncSession
    ) -> DBInvoice:
        """验证发票 - 人工确认流程"""
        
        invoice = await self.repository.get_by_id(invoice_id, user_id, db)
        if not invoice:
            raise InvoiceNotFoundError(f"发票 {invoice_id} 不存在")
        
        # 标记为已验证
        invoice.mark_as_verified(verifier_id, notes)
        
        # 保存更新
        await self.repository.update(invoice, db)
        
        return invoice
```

### API Layer (接口层) - The Interface

```python
# app/api/v1/invoices.py - API 端点的禅道
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db_session, get_current_user
from app.domains.auth.models import User
from app.domains.invoices.models import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, 
    InvoiceListResponse, InvoiceFilter
)
from app.domains.invoices.dependencies import get_invoice_service
from app.domains.invoices.service import InvoiceService
from app.domains.invoices.exceptions import InvoiceNotFoundError, DuplicateInvoiceError

router = APIRouter(prefix="/invoices", tags=["invoices"])

@router.post(
    "",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建发票",
    description="创建新的发票记录，支持手动输入或文件上传"
)
async def create_invoice(
    data: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    service: InvoiceService = Depends(get_invoice_service)
) -> InvoiceResponse:
    """创建发票的禅道 - 简单、清晰、可靠"""
    try:
        invoice = await service.create_invoice(data, current_user.id, db)
        return InvoiceResponse.from_orm(invoice)
    except DuplicateInvoiceError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )

@router.get(
    "",
    response_model=InvoiceListResponse,
    summary="获取发票列表",
    description="获取当前用户的发票列表，支持过滤、搜索和分页"
)
async def get_invoices(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页大小"),
    status: Optional[str] = Query(None, description="发票状态"),
    start_date: Optional[str] = Query(None, description="开始日期 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="结束日期 (YYYY-MM-DD)"),
    min_amount: Optional[float] = Query(None, ge=0, description="最小金额"),
    max_amount: Optional[float] = Query(None, ge=0, description="最大金额"),
    seller_name: Optional[str] = Query(None, description="销售方名称"),
    category: Optional[str] = Query(None, description="分类"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    service: InvoiceService = Depends(get_invoice_service)
) -> InvoiceListResponse:
    """发票列表的禅道 - 灵活而高效"""
    
    # 构建过滤器
    filters = InvoiceFilter(
        status=status,
        start_date=start_date,
        end_date=end_date,
        min_amount=min_amount,
        max_amount=max_amount,
        seller_name=seller_name,
        category=category,
        search=search
    )
    
    return await service.get_invoices(
        current_user.id, filters, page, size, db
    )

@router.get(
    "/{invoice_id}",
    response_model=InvoiceResponse,
    summary="获取发票详情",
    description="根据ID获取发票详细信息"
)
async def get_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    service: InvoiceService = Depends(get_invoice_service)
) -> InvoiceResponse:
    """发票详情的禅道 - 精确而完整"""
    try:
        invoice = await service.get_by_id(invoice_id, current_user.id, db)
        return InvoiceResponse.from_orm(invoice)
    except InvoiceNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="发票不存在"
        )

@router.put(
    "/{invoice_id}",
    response_model=InvoiceResponse,
    summary="更新发票",
    description="更新发票信息"
)
async def update_invoice(
    invoice_id: UUID,
    data: InvoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    service: InvoiceService = Depends(get_invoice_service)
) -> InvoiceResponse:
    """发票更新的禅道 - 变化中的不变"""
    try:
        invoice = await service.update_invoice(
            invoice_id, current_user.id, data, db
        )
        return InvoiceResponse.from_orm(invoice)
    except InvoiceNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="发票不存在"
        )

@router.post(
    "/{invoice_id}/verify",
    response_model=InvoiceResponse,
    summary="验证发票",
    description="人工验证发票信息"
)
async def verify_invoice(
    invoice_id: UUID,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    service: InvoiceService = Depends(get_invoice_service)
) -> InvoiceResponse:
    """发票验证的禅道 - 人机结合的智慧"""
    try:
        invoice = await service.verify_invoice(
            invoice_id, current_user.id, current_user.id, notes, db
        )
        return InvoiceResponse.from_orm(invoice)
    except InvoiceNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="发票不存在"
        )

@router.delete(
    "/{invoice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除发票",
    description="软删除发票记录"
)
async def delete_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    service: InvoiceService = Depends(get_invoice_service)
) -> None:
    """发票删除的禅道 - 消失而不灭"""
    try:
        await service.delete_invoice(invoice_id, current_user.id, db)
    except InvoiceNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="发票不存在"
        )
```

## 🔄 Request Lifecycle (请求生命周期)

### **The Zen Flow (禅意流转)**
```
1. 🌐 Request → Middleware (认证、CORS、日志)
2. 🛣️ Route → 参数验证 (Pydantic)
3. 🔗 Dependencies → 注入服务和认证上下文
4. 🧮 Service → 业务逻辑 (领域规则)
5. 📚 Repository → 数据访问 (SQLAlchemy)
6. 🏛️ Models → 数据库操作
7. 📤 Response → 转换返回 (Pydantic)
```

### **Dependency Injection Philosophy (依赖注入哲学)**
```python
# 禅道：依赖从外向内流动，如水入器
async def create_invoice(
    data: InvoiceCreate,                              # 🎯 请求数据
    current_user: User = Depends(get_current_user),    # 🔐 安全上下文
    db: AsyncSession = Depends(get_db_session),        # 🔌 数据库连接
    service: InvoiceService = Depends(get_invoice_service)  # 🧮 业务逻辑
) -> InvoiceResponse:
    """依赖注入的禅道 - 万物各司其职，和谐共生"""
    return await service.create_invoice(data, current_user.id, db)
```

## 🧪 Testing Philosophy (测试哲学)

### **Test Structure (测试结构)**
```python
# tests/ - 测试的禅道：简单、完整、可信
├── unit/           # 🔬 单元测试 - 纯粹的业务逻辑
│   ├── domains/
│   │   ├── invoices/
│   │   │   ├── test_service.py
│   │   │   └── test_models.py
│   │   └── auth/
│   └── shared/
├── integration/    # 🔗 集成测试 - 数据库和服务交互
│   ├── repositories/
│   ├── api/
│   └── external_services/
└── e2e/           # 🌐 端到端测试 - 完整用户场景
    └── scenarios/
        ├── invoice_lifecycle.py
        └── user_journey.py
```

### **Zen Testing Approach (禅意测试方法)**
```python
# 禅道测试：Mock 最少，测试最真
import pytest
from unittest.mock import Mock, AsyncMock

@pytest.mark.asyncio
async def test_create_invoice_with_business_logic():
    """测试发票创建的业务逻辑 - 专注本质"""
    
    # 🎭 最小化 Mock - 只模拟外部依赖
    mock_repo = Mock(spec=InvoiceRepository)
    mock_repo.get_by_number = AsyncMock(return_value=None)  # 无重复
    mock_repo.create = AsyncMock(return_value=Mock(id=UUID4))
    
    # 🧮 测试纯粹的业务逻辑
    service = InvoiceService(mock_repo)
    
    data = InvoiceCreate(
        invoice_number="TEST-001",
        amount=Decimal("1000.00"),
        tax_amount=Decimal("130.00"),
        invoice_date=date.today()
    )
    
    result = await service.create_invoice(data, user_id, mock_db)
    
    # 🎯 验证业务规则执行
    assert result.total_amount == Decimal("1130.00")  # 自动计算
    mock_repo.get_by_number.assert_called_once()      # 重复检查
    mock_repo.create.assert_called_once()             # 数据创建
```

## 🚀 Deployment Considerations (部署考虑)

### **Container Philosophy (容器哲学)**
```dockerfile
# Dockerfile - 容器的禅道：不变、隔离、纯净
FROM python:3.11-slim as base

# 🏗️ 构建阶段 - 只包含必需
FROM base as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 🚀 运行阶段 - 最小化镜像
FROM base as runtime
WORKDIR /app

# 📦 复制依赖
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# 📁 复制应用代码
COPY app/ app/
COPY alembic/ alembic/
COPY alembic.ini .

# 🎯 单一职责 - 运行应用
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### **Configuration Management (配置管理)**
```yaml
# docker-compose.yml - 服务编排的禅道
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  worker:
    build: .
    command: ["celery", "worker", "-A", "app.worker", "--loglevel=info"]
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis

volumes:
  redis_data:
```

## 🌟 Implementation Strategy (实施策略)

### **Phase 1: Foundation (第一阶段：基础)**
1. **Core Setup** - 配置管理、数据库连接、基础中间件
2. **Authentication** - Supabase Auth 集成、JWT 验证
3. **Invoice Domain** - 完整的发票管理功能作为参考实现

### **Phase 2: Extension (第二阶段：扩展)**
4. **File Processing** - 文件上传、OCR 集成
5. **Task Management** - 异步任务处理
6. **User Management** - 用户档案管理

### **Phase 3: Enhancement (第三阶段：增强)**
7. **Advanced Features** - 搜索、统计、导出
8. **Monitoring** - 日志、指标、健康检查
9. **Documentation** - API 文档、部署指南

## 🤔 Reflection (思考)

这个架构设计遵循几个核心原则：

1. **简单性** - 每个组件只做一件事，并把它做好
2. **清晰性** - 代码结构反映业务理解，而非技术限制
3. **可测试性** - 依赖注入和分层设计使测试变得自然
4. **可扩展性** - 新功能可以作为新领域添加，不影响现有代码
5. **可维护性** - 关注点分离使维护变得可预测

*"大道至简，悟在天成"* - 最好的架构应该感觉自然而然，就像水顺着山势流淌。

---

**下一步**: 开始实现 Core Layer，建立应用的基础设施。