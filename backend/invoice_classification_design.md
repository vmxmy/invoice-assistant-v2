# 发票分类系统设计方案

## 1. 需求分析

### 1.1 当前数据结构
- 发票表 (Invoice) 已有基础的 `category` 字段 (String 50)
- 存在 `tags` 字段 (ARRAY String) 用于标签管理
- 已有 `invoice_type` 字段区分发票类型
- 支持 JSONB 元数据存储

### 1.2 分类需求
**一级分类**：
- 交通 (Transportation)
- 住宿 (Accommodation)  
- 餐饮 (Dining)
- 办公 (Office)
- 其他 (Other)

**二级分类**：
- 交通/飞机 (Transportation/Flight)
- 交通/火车 (Transportation/Train)
- 交通/出租车 (Transportation/Taxi)
- 交通/公交 (Transportation/Bus)
- 住宿/酒店 (Accommodation/Hotel)
- 住宿/民宿 (Accommodation/Guesthouse)
- 餐饮/正餐 (Dining/Meal)
- 餐饮/小食 (Dining/Snack)
- 办公/文具 (Office/Stationery)
- 办公/设备 (Office/Equipment)

## 2. 设计方案

### 2.1 分类表结构设计

#### 方案A：单表层次结构
```sql
CREATE TABLE invoice_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    parent_id UUID REFERENCES invoice_categories(id),
    level INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 方案B：双表结构（推荐）
```sql
-- 一级分类表
CREATE TABLE primary_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7), -- 颜色代码用于前端显示
    icon VARCHAR(50), -- 图标类名
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 二级分类表
CREATE TABLE secondary_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_category_id UUID NOT NULL REFERENCES primary_categories(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    -- 分类规则（用于自动分类）
    auto_classify_rules JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 发票表结构调整

#### 新增字段
```sql
ALTER TABLE invoices ADD COLUMN primary_category_id UUID REFERENCES primary_categories(id);
ALTER TABLE invoices ADD COLUMN secondary_category_id UUID REFERENCES secondary_categories(id);
ALTER TABLE invoices ADD COLUMN auto_classified BOOLEAN DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN classification_confidence DECIMAL(3,2);
```

#### 保持兼容
- 保留现有 `category` 字段作为字符串备份
- 新增 `classification_metadata` JSONB 字段存储分类详情

### 2.3 自动分类规则设计

#### 基于发票内容的分类规则
```json
{
  "rules": [
    {
      "type": "seller_name_pattern",
      "patterns": [".*航空.*", ".*机场.*", ".*航班.*"],
      "category": "transportation_flight",
      "confidence": 0.9
    },
    {
      "type": "seller_name_pattern", 
      "patterns": [".*铁路.*", ".*火车.*", ".*高铁.*"],
      "category": "transportation_train",
      "confidence": 0.95
    },
    {
      "type": "invoice_type_pattern",
      "patterns": ["铁路电子客票"],
      "category": "transportation_train",
      "confidence": 0.99
    },
    {
      "type": "amount_range",
      "min": 0,
      "max": 50,
      "seller_patterns": [".*出租.*", ".*滴滴.*"],
      "category": "transportation_taxi",
      "confidence": 0.8
    }
  ]
}
```

## 3. 数据迁移方案

### 3.1 创建分类数据
```python
# 初始化分类数据
primary_categories = [
    {"code": "transportation", "name": "交通", "color": "#2196F3", "icon": "transport"},
    {"code": "accommodation", "name": "住宿", "color": "#FF9800", "icon": "bed"},
    {"code": "dining", "name": "餐饮", "color": "#4CAF50", "icon": "restaurant"},
    {"code": "office", "name": "办公", "color": "#9C27B0", "icon": "office"},
    {"code": "other", "name": "其他", "color": "#607D8B", "icon": "category"}
]

secondary_categories = [
    {"primary": "transportation", "code": "flight", "name": "飞机"},
    {"primary": "transportation", "code": "train", "name": "火车"},
    {"primary": "transportation", "code": "taxi", "name": "出租车"},
    {"primary": "transportation", "code": "bus", "name": "公交"},
    {"primary": "accommodation", "code": "hotel", "name": "酒店"},
    {"primary": "accommodation", "code": "guesthouse", "name": "民宿"},
    {"primary": "dining", "code": "meal", "name": "正餐"},
    {"primary": "dining", "code": "snack", "name": "小食"},
    {"primary": "office", "code": "stationery", "name": "文具"},
    {"primary": "office", "code": "equipment", "name": "设备"}
]
```

### 3.2 现有数据迁移
```python
def migrate_existing_invoices():
    """迁移现有发票数据"""
    # 1. 基于现有 category 字段映射
    category_mapping = {
        "交通": "transportation",
        "住宿": "accommodation", 
        "餐饮": "dining",
        "办公": "office"
    }
    
    # 2. 基于发票内容智能分类
    for invoice in invoices:
        # 自动分类逻辑
        primary_cat, secondary_cat, confidence = auto_classify_invoice(invoice)
        
        # 更新分类字段
        invoice.primary_category_id = primary_cat.id
        invoice.secondary_category_id = secondary_cat.id if secondary_cat else None
        invoice.auto_classified = True
        invoice.classification_confidence = confidence
```

## 4. 自动分类实现

### 4.1 分类服务类
```python
class InvoiceClassificationService:
    def __init__(self):
        self.classification_rules = self._load_classification_rules()
    
    def classify_invoice(self, invoice_data: Dict[str, Any]) -> ClassificationResult:
        """自动分类发票"""
        results = []
        
        # 基于销售方名称分类
        seller_result = self._classify_by_seller_name(invoice_data)
        if seller_result:
            results.append(seller_result)
        
        # 基于发票类型分类
        type_result = self._classify_by_invoice_type(invoice_data)
        if type_result:
            results.append(type_result)
        
        # 基于金额范围分类
        amount_result = self._classify_by_amount(invoice_data)
        if amount_result:
            results.append(amount_result)
        
        # 选择置信度最高的结果
        return max(results, key=lambda x: x.confidence) if results else None
    
    def _classify_by_seller_name(self, invoice_data: Dict[str, Any]) -> Optional[ClassificationResult]:
        """基于销售方名称分类"""
        seller_name = invoice_data.get('seller_name', '')
        
        for rule in self.classification_rules.get('seller_name_patterns', []):
            for pattern in rule['patterns']:
                if re.search(pattern, seller_name, re.IGNORECASE):
                    return ClassificationResult(
                        primary_category=rule['primary_category'],
                        secondary_category=rule.get('secondary_category'),
                        confidence=rule['confidence'],
                        reason=f"销售方名称匹配: {pattern}"
                    )
        return None
```

### 4.2 模板增强
```python
# 在 invoice2data 模板中增加分类提示
template_classification_hints = {
    "china_railway_ticket.yml": {
        "primary_category": "transportation",
        "secondary_category": "train",
        "confidence": 0.99
    },
    "china_flight_ticket.yml": {
        "primary_category": "transportation", 
        "secondary_category": "flight",
        "confidence": 0.95
    }
}
```

## 5. 前端界面设计

### 5.1 分类管理界面
- 分类树形结构显示
- 拖拽调整分类顺序
- 分类规则配置界面
- 批量分类操作

### 5.2 发票列表增强
- 分类筛选器
- 分类标签显示
- 快速分类操作
- 分类统计图表

## 6. API 接口设计

### 6.1 分类管理接口
```python
# 获取分类树
GET /api/v1/categories/tree

# 创建分类
POST /api/v1/categories/primary
POST /api/v1/categories/secondary

# 更新分类
PUT /api/v1/categories/{id}

# 删除分类
DELETE /api/v1/categories/{id}
```

### 6.2 发票分类接口
```python
# 自动分类单个发票
POST /api/v1/invoices/{id}/classify

# 批量自动分类
POST /api/v1/invoices/batch-classify

# 手动设置分类
PUT /api/v1/invoices/{id}/category

# 分类统计
GET /api/v1/invoices/category-stats
```

## 7. 实施步骤

### 阶段1：基础架构 (1-2天)
1. 创建分类表结构
2. 调整发票表结构
3. 创建基础分类数据
4. 实现分类服务类

### 阶段2：自动分类 (2-3天)
1. 实现分类规则引擎
2. 增强发票模板分类提示
3. 迁移现有数据
4. 测试自动分类准确性

### 阶段3：前端界面 (3-4天)
1. 分类管理界面
2. 发票列表分类功能
3. 分类统计图表
4. 用户体验优化

### 阶段4：API和集成 (1-2天)
1. 完善API接口
2. 集成测试
3. 性能优化
4. 文档更新

## 8. 风险评估

### 8.1 技术风险
- 自动分类准确性需要持续调优
- 大量数据迁移可能影响性能
- 分类规则复杂度管理

### 8.2 业务风险
- 用户习惯改变适应期
- 分类标准统一性
- 历史数据分类准确性

## 9. 成功指标

### 9.1 技术指标
- 自动分类准确率 > 85%
- 分类接口响应时间 < 200ms
- 数据迁移成功率 100%

### 9.2 业务指标
- 用户分类操作效率提升 50%
- 发票查找效率提升 40%
- 分类统计功能使用率 > 60%