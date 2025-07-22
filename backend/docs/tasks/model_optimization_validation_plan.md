# 模型优化验证方案

## 概述
本文档详细说明模型优化后如何确保前后端系统正常工作的验证方案和步骤。

## 1. 优化前准备工作

### 1.1 建立基准测试
```bash
# 创建测试基准脚本
backend/scripts/create_optimization_baseline.py
```

- [ ] 记录当前所有 API 端点的请求/响应格式
- [ ] 保存现有数据库数据样本
- [ ] 记录当前性能指标（响应时间、查询时间）
- [ ] 导出 Postman/Insomnia 测试集合

### 1.2 版本控制和分支策略
```bash
# 创建优化分支
git checkout -b feature/model-optimization

# 为每个主要改动创建子分支
git checkout -b feature/model-optimization-emailaccount
git checkout -b feature/model-optimization-ocr-service
```

### 1.3 数据备份
```sql
-- 备份现有数据
pg_dump -h localhost -U user -d invoice_db > backup_before_optimization.sql

-- 创建测试数据库副本
CREATE DATABASE invoice_db_test WITH TEMPLATE invoice_db;
```

## 2. API 兼容性验证

### 2.1 API 契约测试
```python
# backend/tests/test_api_contracts.py
import pytest
from typing import Dict, Any

class TestAPIContracts:
    """验证 API 响应格式保持兼容"""
    
    @pytest.fixture
    def baseline_responses(self) -> Dict[str, Any]:
        """加载基准响应数据"""
        return load_baseline_responses()
    
    def test_invoice_list_response_format(self, client, baseline_responses):
        """测试发票列表接口响应格式"""
        response = client.get("/api/v1/invoices")
        assert response.status_code == 200
        
        # 验证响应结构
        assert_response_structure_matches(
            response.json(), 
            baseline_responses["invoice_list"]
        )
    
    def test_invoice_detail_response_format(self, client, baseline_responses):
        """测试发票详情接口响应格式"""
        # 类似的测试...
```

### 2.2 字段映射验证
```python
# backend/app/api/v1/serializers/invoice.py
from pydantic import BaseModel, Field, validator
from typing import Optional
from decimal import Decimal

class InvoiceResponse(BaseModel):
    """发票响应模型 - 保持向后兼容"""
    
    # 保持原有字段名
    id: str
    invoice_number: str
    amount: float  # 保持 float 类型以兼容前端
    
    # 新字段使用 Optional 或提供默认值
    amount_without_tax: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    
    @validator('amount', pre=True)
    def ensure_amount_compatibility(cls, v, values):
        """确保 amount 字段向后兼容"""
        if v is None and 'amount_without_tax' in values:
            return float(values['amount_without_tax'])
        return float(v) if v else 0.0
    
    class Config:
        orm_mode = True
        json_encoders = {
            Decimal: lambda v: float(v)
        }
```

## 3. 数据库迁移验证

### 3.1 迁移脚本测试
```python
# backend/alembic/versions/xxx_model_optimization.py
"""Model optimization migration

Revision ID: xxx
Create Date: 2024-01-19
"""

def upgrade():
    # 1. 添加新字段（不影响现有功能）
    op.add_column('invoices', 
        sa.Column('ocr_overall_confidence', sa.Numeric(4, 3), nullable=True)
    )
    
    # 2. 数据迁移（保持向后兼容）
    op.execute("""
        UPDATE invoices 
        SET ocr_overall_confidence = ocr_confidence_score 
        WHERE ocr_confidence_score IS NOT NULL
    """)
    
    # 3. 类型转换（使用事务保证原子性）
    # EmailAccount 的 user_id 从 String 到 UUID
    op.execute("""
        ALTER TABLE email_accounts 
        ALTER COLUMN user_id TYPE UUID 
        USING user_id::uuid
    """)

def downgrade():
    # 提供完整的回滚方案
    pass
```

### 3.2 数据完整性检查
```python
# backend/scripts/validate_data_integrity.py
import asyncio
from sqlalchemy import select
from app.models import Invoice, EmailAccount, Profile

async def validate_data_integrity(session):
    """验证数据完整性"""
    
    # 1. 检查所有发票的必需字段
    invoices = await session.execute(
        select(Invoice).where(Invoice.deleted_at.is_(None))
    )
    for invoice in invoices.scalars():
        assert invoice.id is not None
        assert invoice.invoice_number is not None
        assert invoice.user_id is not None
        
    # 2. 检查关系完整性
    # 验证所有发票都有对应的用户
    orphan_invoices = await session.execute(
        select(Invoice).outerjoin(Profile, 
            Invoice.user_id == Profile.auth_user_id
        ).where(Profile.id.is_(None))
    )
    assert orphan_invoices.count() == 0
    
    print("✅ 数据完整性验证通过")
```

## 4. 前端兼容性验证

### 4.1 TypeScript 类型检查
```typescript
// frontend/src/types/invoice.ts
export interface Invoice {
  id: string;
  invoice_number: string;
  // 保持原有字段
  amount: number;
  
  // 新增可选字段
  amount_without_tax?: number;
  tax_amount?: number;
  total_amount?: number;
  
  // 使用联合类型支持新旧格式
  status: 'active' | 'pending' | 'processing' | 'completed' | 'failed' | 'archived';
}

// 添加类型守卫
export function isNewInvoiceFormat(invoice: any): invoice is NewInvoice {
  return 'amount_without_tax' in invoice;
}
```

### 4.2 API 客户端适配
```typescript
// frontend/src/services/invoiceService.ts
export class InvoiceService {
  async getInvoices(): Promise<Invoice[]> {
    const response = await apiClient.get('/api/v1/invoices');
    
    // 适配新旧数据格式
    return response.data.map(this.normalizeInvoice);
  }
  
  private normalizeInvoice(data: any): Invoice {
    // 兼容旧版本 amount 字段
    const amount = data.amount ?? data.amount_without_tax ?? 0;
    
    return {
      ...data,
      amount, // 确保 amount 字段始终存在
      // 新字段使用默认值
      amount_without_tax: data.amount_without_tax ?? amount,
      tax_amount: data.tax_amount ?? 0,
      total_amount: data.total_amount ?? amount
    };
  }
}
```

## 5. 集成测试方案

### 5.1 端到端测试
```python
# backend/tests/e2e/test_invoice_workflow.py
import pytest
from playwright.async_api import async_playwright

@pytest.mark.e2e
async def test_invoice_complete_workflow():
    """测试完整的发票处理流程"""
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        # 1. 登录
        await page.goto('http://localhost:5174')
        await page.fill('[data-testid="email"]', 'test@example.com')
        await page.fill('[data-testid="password"]', 'password')
        await page.click('[data-testid="login-button"]')
        
        # 2. 上传发票
        await page.click('[data-testid="upload-invoice"]')
        await page.set_input_files('input[type="file"]', 'test_invoice.pdf')
        
        # 3. 验证处理结果
        await page.wait_for_selector('[data-testid="invoice-processed"]')
        
        # 4. 检查数据显示
        invoice_amount = await page.text_content('[data-testid="invoice-amount"]')
        assert invoice_amount == '¥1,234.56'
```

### 5.2 性能测试
```python
# backend/tests/performance/test_query_performance.py
import time
import pytest
from app.models import Invoice

@pytest.mark.performance
async def test_invoice_query_performance(session, benchmark):
    """测试查询性能"""
    
    # 准备测试数据
    await create_test_invoices(session, count=10000)
    
    # 基准测试
    def query_invoices():
        return session.query(Invoice)\
            .filter_by(user_id=test_user_id)\
            .order_by(Invoice.invoice_date.desc())\
            .limit(50)\
            .all()
    
    result = benchmark(query_invoices)
    
    # 验证性能指标
    assert benchmark.stats['mean'] < 0.1  # 平均查询时间 < 100ms
```

## 6. 监控和回滚方案

### 6.1 实时监控
```python
# backend/app/monitoring/health_checks.py
from app.models import Invoice, EmailAccount
import logging

async def health_check_models(session):
    """模型健康检查"""
    checks = {
        'invoice_model': False,
        'email_account_model': False,
        'relationships': False
    }
    
    try:
        # 测试基本查询
        invoice = await session.execute(
            select(Invoice).limit(1)
        )
        checks['invoice_model'] = True
        
        # 测试关系加载
        invoice_with_profile = await session.execute(
            select(Invoice).options(selectinload(Invoice.profile)).limit(1)
        )
        checks['relationships'] = True
        
    except Exception as e:
        logging.error(f"Health check failed: {e}")
    
    return checks
```

### 6.2 灰度发布策略
```nginx
# nginx.conf - 灰度发布配置
upstream backend_stable {
    server backend_stable:8090;
}

upstream backend_optimized {
    server backend_optimized:8090;
}

server {
    location /api/v1/ {
        # 10% 流量到新版本
        set $backend_pool backend_stable;
        if ($cookie_feature_model_optimization = "true") {
            set $backend_pool backend_optimized;
        }
        
        # 随机 10% 用户
        if ($request_id ~* "[0]$") {
            set $backend_pool backend_optimized;
        }
        
        proxy_pass http://$backend_pool;
    }
}
```

## 7. 验证检查清单

### 7.1 功能验证 ✅
- [ ] 用户注册/登录正常
- [ ] 发票上传和 OCR 识别正常
- [ ] 发票列表展示正常
- [ ] 发票搜索和筛选正常
- [ ] 发票编辑和删除正常
- [ ] 邮箱配置和同步正常
- [ ] 数据导出功能正常

### 7.2 数据验证 ✅
- [ ] 所有现有数据可正常访问
- [ ] 新旧数据格式兼容
- [ ] 关系查询正常工作
- [ ] 软删除逻辑正常

### 7.3 性能验证 ✅
- [ ] API 响应时间未显著增加
- [ ] 数据库查询性能正常
- [ ] 内存使用正常
- [ ] 并发处理能力正常

### 7.4 兼容性验证 ✅
- [ ] 前端所有页面正常显示
- [ ] API 响应格式兼容
- [ ] TypeScript 类型检查通过
- [ ] 移动端适配正常

## 8. 问题处理流程

### 8.1 发现问题时
1. 立即记录问题详情和复现步骤
2. 评估影响范围
3. 决定是修复还是回滚

### 8.2 回滚步骤
```bash
# 1. 切换到稳定版本
kubectl set image deployment/backend backend=backend:stable

# 2. 执行数据库回滚
alembic downgrade -1

# 3. 清理缓存
redis-cli FLUSHDB

# 4. 通知相关人员
```

## 9. 文档更新

### 9.1 更新 API 文档
- [ ] 更新 OpenAPI/Swagger 规范
- [ ] 更新 API 使用示例
- [ ] 标注废弃字段和新增字段

### 9.2 更新开发文档
- [ ] 更新模型关系图
- [ ] 更新数据库 schema 文档
- [ ] 更新部署指南

## 10. 总结

成功的模型优化需要：
1. **充分的测试覆盖** - 单元测试、集成测试、E2E 测试
2. **向后兼容设计** - 新字段可选、旧字段保留
3. **灰度发布** - 逐步推广，降低风险
4. **完善的监控** - 及时发现问题
5. **可靠的回滚方案** - 快速恢复服务

遵循这个验证方案，可以最大程度确保模型优化后系统的稳定性和可用性。