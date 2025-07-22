# 发票模型（Invoice）设计文档

## 1. 模型概述

发票模型是系统的核心业务模型，存储各类发票的详细信息。支持增值税发票、火车票、机票等多种发票类型。

## 2. 表结构设计

### 2.1 invoices 表
```sql
CREATE TABLE invoices (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- 发票基本信息
    invoice_type VARCHAR(50) NOT NULL, -- vat, train, flight, taxi, etc.
    invoice_code VARCHAR(50),
    invoice_no VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    check_code VARCHAR(50),
    
    -- 金额信息（单位：分）
    amount_without_tax BIGINT DEFAULT 0,
    tax_amount BIGINT DEFAULT 0,
    total_amount BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY',
    
    -- 销售方信息
    seller_name VARCHAR(200) NOT NULL,
    seller_tax_no VARCHAR(50),
    seller_address TEXT,
    seller_phone VARCHAR(50),
    seller_bank_info TEXT,
    
    -- 购买方信息
    buyer_name VARCHAR(200),
    buyer_tax_no VARCHAR(50),
    buyer_address TEXT,
    buyer_phone VARCHAR(50),
    buyer_bank_info TEXT,
    
    -- 特殊类型字段（火车票/机票）
    departure_station VARCHAR(100),
    arrival_station VARCHAR(100),
    departure_time TIMESTAMP,
    arrival_time TIMESTAMP,
    seat_type VARCHAR(50),
    seat_no VARCHAR(50),
    passenger_name VARCHAR(100),
    id_card_no VARCHAR(50),
    
    -- 文件信息
    file_path VARCHAR(500),
    file_name VARCHAR(200),
    file_size BIGINT,
    file_hash VARCHAR(64),
    
    -- OCR 信息
    ocr_result JSONB,
    ocr_service VARCHAR(50), -- aliyun, mineru, manual
    ocr_confidence FLOAT,
    
    -- 状态信息
    status VARCHAR(20) DEFAULT 'pending', -- pending, processed, verified, rejected
    verification_status VARCHAR(20), -- unverified, valid, invalid
    verification_result JSONB,
    
    -- 业务信息
    project_name VARCHAR(200),
    expense_category VARCHAR(50),
    reimbursement_status VARCHAR(20) DEFAULT 'unreimbursed',
    notes TEXT,
    tags TEXT[],
    
    -- 元数据
    metadata JSONB DEFAULT '{}',
    source VARCHAR(50), -- email, upload, api
    source_email VARCHAR(255),
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    processed_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- 约束
    CONSTRAINT invoice_no_unique UNIQUE(user_id, invoice_no) WHERE deleted_at IS NULL,
    CONSTRAINT total_amount_positive CHECK (total_amount >= 0)
);

-- 索引
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_seller_name ON invoices(seller_name);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_type ON invoices(invoice_type);
CREATE INDEX idx_invoices_amount ON invoices(total_amount);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

-- 全文搜索索引
CREATE INDEX idx_invoices_search ON invoices USING gin(
    to_tsvector('chinese', 
        COALESCE(seller_name, '') || ' ' || 
        COALESCE(buyer_name, '') || ' ' || 
        COALESCE(project_name, '') || ' ' ||
        COALESCE(notes, '')
    )
);
```

### 2.2 invoice_items 表（发票明细）
```sql
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- 商品信息
    name VARCHAR(200) NOT NULL,
    specification VARCHAR(100),
    unit VARCHAR(20),
    quantity DECIMAL(15, 4) DEFAULT 1,
    unit_price BIGINT NOT NULL, -- 单位：分
    amount BIGINT NOT NULL, -- 单位：分
    tax_rate DECIMAL(5, 2),
    tax_amount BIGINT,
    
    -- 排序
    sort_order INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 索引
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
```

## 3. 发票类型设计

### 3.1 发票类型枚举
```python
from enum import Enum

class InvoiceType(str, Enum):
    VAT_GENERAL = "vat_general"          # 增值税普通发票
    VAT_SPECIAL = "vat_special"          # 增值税专用发票
    VAT_ELECTRONIC = "vat_electronic"    # 电子发票
    TRAIN = "train"                      # 火车票
    FLIGHT = "flight"                    # 机票行程单
    TAXI = "taxi"                        # 出租车票
    BUS = "bus"                          # 汽车票
    QUOTA = "quota"                      # 定额发票
    RECEIPT = "receipt"                  # 收据
    OTHER = "other"                      # 其他
```

### 3.2 各类型必填字段
| 发票类型 | 必填字段 | 特有字段 |
|---------|---------|---------|
| 增值税发票 | invoice_code, invoice_no, invoice_date, seller_name, total_amount | seller_tax_no, buyer_name, buyer_tax_no |
| 火车票 | invoice_no, invoice_date, total_amount | departure_station, arrival_station, departure_time, seat_type |
| 机票 | invoice_no, invoice_date, total_amount | departure_station, arrival_station, departure_time, arrival_time |
| 出租车票 | invoice_no, invoice_date, total_amount | departure_time, arrival_time |

## 4. 数据模型

### 4.1 SQLAlchemy 模型
```python
from sqlalchemy import Column, String, DateTime, BigInteger, Float, JSON, Date, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    
    # 基本信息
    invoice_type = Column(String(50), nullable=False)
    invoice_code = Column(String(50))
    invoice_no = Column(String(50), nullable=False)
    invoice_date = Column(Date, nullable=False)
    check_code = Column(String(50))
    
    # 金额信息
    amount_without_tax = Column(BigInteger, default=0)
    tax_amount = Column(BigInteger, default=0)
    total_amount = Column(BigInteger, nullable=False)
    currency = Column(String(3), default='CNY')
    
    # 关系
    user = relationship("Profile", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
```

### 4.2 Pydantic Schema
```python
from pydantic import BaseModel, validator
from typing import Optional, List, Dict
from datetime import date, datetime
from decimal import Decimal

class InvoiceBase(BaseModel):
    invoice_type: InvoiceType
    invoice_code: Optional[str] = None
    invoice_no: str
    invoice_date: date
    total_amount: Decimal
    seller_name: str
    buyer_name: Optional[str] = None
    project_name: Optional[str] = None
    notes: Optional[str] = None

    @validator('total_amount')
    def amount_to_cents(cls, v):
        return int(v * 100)  # 转换为分

class InvoiceCreate(InvoiceBase):
    file_path: str
    ocr_result: Optional[Dict] = None

class InvoiceUpdate(BaseModel):
    seller_name: Optional[str] = None
    buyer_name: Optional[str] = None
    project_name: Optional[str] = None
    expense_category: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class InvoiceInDB(InvoiceBase):
    id: UUID4
    user_id: UUID4
    status: str
    file_name: str
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        orm_mode = True
```

## 5. 业务逻辑

### 5.1 发票创建流程
```python
async def create_invoice(
    user_id: UUID,
    file: UploadFile,
    ocr_service: str = "aliyun"
) -> Invoice:
    """
    1. 保存上传文件
    2. 计算文件哈希（去重）
    3. OCR 识别
    4. 数据提取和验证
    5. 保存到数据库
    6. 异步验真（如果支持）
    """
    # 检查重复
    file_hash = calculate_file_hash(file)
    existing = await check_duplicate(user_id, file_hash)
    if existing:
        raise DuplicateInvoiceError()
    
    # OCR 识别
    ocr_result = await ocr_service.recognize(file_path)
    
    # 提取数据
    invoice_data = extract_invoice_data(ocr_result)
    
    # 创建发票
    invoice = Invoice(
        user_id=user_id,
        **invoice_data,
        file_hash=file_hash,
        ocr_result=ocr_result
    )
    
    db.add(invoice)
    await db.commit()
    
    # 异步验真
    await create_verification_task(invoice.id)
    
    return invoice
```

### 5.2 发票查询
```python
async def search_invoices(
    user_id: UUID,
    filters: InvoiceFilters,
    pagination: Pagination
) -> Page[Invoice]:
    """高级搜索功能"""
    query = select(Invoice).where(Invoice.user_id == user_id)
    
    # 应用过滤条件
    if filters.date_from:
        query = query.where(Invoice.invoice_date >= filters.date_from)
    if filters.date_to:
        query = query.where(Invoice.invoice_date <= filters.date_to)
    if filters.seller_name:
        query = query.where(Invoice.seller_name.ilike(f"%{filters.seller_name}%"))
    if filters.amount_min:
        query = query.where(Invoice.total_amount >= filters.amount_min * 100)
    if filters.amount_max:
        query = query.where(Invoice.total_amount <= filters.amount_max * 100)
    if filters.invoice_type:
        query = query.where(Invoice.invoice_type == filters.invoice_type)
    if filters.status:
        query = query.where(Invoice.status == filters.status)
    
    # 全文搜索
    if filters.keyword:
        query = query.where(
            func.to_tsvector('chinese', 
                Invoice.seller_name + ' ' + 
                Invoice.buyer_name + ' ' + 
                Invoice.project_name
            ).match(filters.keyword)
        )
    
    # 排序
    if filters.sort_by == "date":
        query = query.order_by(Invoice.invoice_date.desc())
    elif filters.sort_by == "amount":
        query = query.order_by(Invoice.total_amount.desc())
    else:
        query = query.order_by(Invoice.created_at.desc())
    
    # 分页
    return await paginate(db, query, pagination)
```

## 6. 数据验证

### 6.1 发票验真
```python
async def verify_invoice(invoice_id: UUID) -> VerificationResult:
    """发票真伪验证"""
    invoice = await get_invoice(invoice_id)
    
    # 根据发票类型选择验证服务
    if invoice.invoice_type in [InvoiceType.VAT_GENERAL, InvoiceType.VAT_SPECIAL]:
        result = await tax_bureau_api.verify(
            invoice_code=invoice.invoice_code,
            invoice_no=invoice.invoice_no,
            invoice_date=invoice.invoice_date,
            check_code=invoice.check_code
        )
    else:
        # 其他类型暂不支持
        return VerificationResult(status="unsupported")
    
    # 更新验证状态
    invoice.verification_status = result.status
    invoice.verification_result = result.dict()
    await db.commit()
    
    return result
```

### 6.2 数据校验
```python
def validate_invoice_data(data: dict, invoice_type: InvoiceType) -> List[str]:
    """校验发票数据完整性"""
    errors = []
    
    # 通用校验
    if not data.get("invoice_no"):
        errors.append("发票号码不能为空")
    if not data.get("invoice_date"):
        errors.append("开票日期不能为空")
    if not data.get("total_amount"):
        errors.append("金额不能为空")
    
    # 类型特定校验
    if invoice_type == InvoiceType.VAT_SPECIAL:
        if not data.get("invoice_code"):
            errors.append("专用发票必须有发票代码")
        if not data.get("seller_tax_no"):
            errors.append("专用发票必须有销售方税号")
    
    return errors
```

## 7. 统计分析

### 7.1 发票统计
```sql
-- 月度统计
SELECT 
    DATE_TRUNC('month', invoice_date) as month,
    invoice_type,
    COUNT(*) as count,
    SUM(total_amount) / 100.0 as total_amount
FROM invoices
WHERE user_id = :user_id
    AND deleted_at IS NULL
GROUP BY month, invoice_type
ORDER BY month DESC;

-- 供应商统计
SELECT 
    seller_name,
    COUNT(*) as invoice_count,
    SUM(total_amount) / 100.0 as total_amount,
    AVG(total_amount) / 100.0 as avg_amount
FROM invoices
WHERE user_id = :user_id
    AND deleted_at IS NULL
GROUP BY seller_name
ORDER BY total_amount DESC
LIMIT 20;
```

### 7.2 报表生成
```python
async def generate_monthly_report(user_id: UUID, year: int, month: int) -> dict:
    """生成月度报表"""
    start_date = date(year, month, 1)
    end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    # 汇总数据
    summary = await db.execute(
        select(
            func.count(Invoice.id).label("total_count"),
            func.sum(Invoice.total_amount).label("total_amount"),
            func.sum(Invoice.tax_amount).label("total_tax")
        ).where(
            Invoice.user_id == user_id,
            Invoice.invoice_date.between(start_date, end_date)
        )
    )
    
    # 分类统计
    by_type = await db.execute(
        select(
            Invoice.invoice_type,
            func.count(Invoice.id).label("count"),
            func.sum(Invoice.total_amount).label("amount")
        ).where(
            Invoice.user_id == user_id,
            Invoice.invoice_date.between(start_date, end_date)
        ).group_by(Invoice.invoice_type)
    )
    
    return {
        "period": f"{year}-{month:02d}",
        "summary": summary.first()._asdict(),
        "by_type": [row._asdict() for row in by_type]
    }
```

## 8. 性能优化

### 8.1 批量操作
```python
async def bulk_create_invoices(
    user_id: UUID,
    invoices_data: List[InvoiceCreate]
) -> List[Invoice]:
    """批量创建发票"""
    invoices = []
    
    async with db.begin():
        for data in invoices_data:
            invoice = Invoice(user_id=user_id, **data.dict())
            invoices.append(invoice)
            db.add(invoice)
        
        # 批量插入
        await db.flush()
        
        # 批量创建任务
        task_data = [
            {"invoice_id": inv.id, "type": "ocr"}
            for inv in invoices
        ]
        await db.execute(
            insert(Task).values(task_data)
        )
    
    return invoices
```

### 8.2 查询优化
```python
# 使用子查询优化统计
subquery = select(
    Invoice.seller_name,
    func.count(Invoice.id).label("count")
).where(
    Invoice.user_id == user_id
).group_by(Invoice.seller_name).subquery()

# 主查询
query = select(
    Invoice,
    subquery.c.count
).join(
    subquery,
    Invoice.seller_name == subquery.c.seller_name
).where(
    Invoice.user_id == user_id
)
```

## 9. 数据迁移

### 9.1 历史数据导入
```python
async def import_legacy_invoices(file_path: str):
    """导入历史发票数据"""
    df = pd.read_csv(file_path)
    
    for _, row in df.iterrows():
        # 数据转换
        invoice_data = {
            "invoice_no": row["发票号码"],
            "invoice_date": parse_date(row["开票日期"]),
            "seller_name": row["销售方名称"],
            "total_amount": int(float(row["金额"]) * 100),
            # ... 其他字段映射
        }
        
        # 创建发票
        await create_invoice(**invoice_data)
```

## 10. 注意事项

### 10.1 金额处理
- 所有金额字段使用整数存储（单位：分）
- 前端显示时除以 100
- 避免浮点数精度问题

### 10.2 文件管理
- 使用 UUID 命名避免冲突
- 定期清理无效文件
- 实现文件去重机制

### 10.3 隐私保护
- 身份证号脱敏存储
- 敏感信息加密
- 访问日志记录