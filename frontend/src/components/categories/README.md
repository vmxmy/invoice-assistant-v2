# 费用分类系统

## 概述

发票管理系统的费用分类功能，支持层级分类、自动识别、统计分析等功能。

## 分类体系

### 一级分类
- **交通** 🚗 - 各种交通出行相关费用
- **住宿** 🏨 - 酒店、民宿等住宿费用  
- **餐饮** 🍽️ - 用餐相关费用
- **办公** 💼 - 办公用品、服务等费用
- **其他** 📁 - 其他未分类费用

### 二级分类
- **交通类**
  - 高铁 🚄 - 高铁票
  - 飞机 ✈️ - 机票
  - 出租车 🚕 - 出租车票
  
- **住宿类**
  - 酒店 🏨 - 酒店发票
  - 民宿 🏠 - 民宿发票
  
- **办公类**
  - 咨询 💭 - 咨询服务费
  - 印章 🔖 - 印章制作费

## 核心功能

### 1. 自动分类识别
系统会根据发票内容自动识别并分配合适的分类：
- 基于关键词匹配
- 支持发票类型识别
- 自动触发器实时分类

### 2. 消费日期计算
针对不同票据类型自动计算实际消费日期：
- **火车票**: 提取发车日期作为消费日期
- **机票**: 提取航班日期作为消费日期
- **其他**: 使用发票日期

### 3. 分类统计分析
- 按分类统计发票数量和金额
- 计算平均金额
- 分类趋势分析
- 可视化图表展示

## 技术实现

### 数据库层
```sql
-- 费用分类枚举类型
CREATE TYPE expense_category_enum AS ENUM (
  '交通', '住宿', '餐饮', '办公', '其他',
  '高铁', '飞机', '出租车', '酒店', '民宿', '咨询', '印章'
);

-- 发票表增加分类字段
ALTER TABLE invoices ADD COLUMN expense_category expense_category_enum;

-- 分类信息视图
CREATE VIEW v_invoice_detail AS 
SELECT 
  i.*,
  ec.name as primary_category_name,
  ec.parent_name as secondary_category_name,
  ec.full_path as category_full_path,
  ec.info as category_info
FROM invoices i
LEFT JOIN expense_categories ec ON i.expense_category = ec.code;
```

### 后端API
```python
# 分类服务
class CategoryService:
    def auto_classify_invoice(self, invoice_data):
        # 基于内容自动分类逻辑
        pass
    
    def get_category_stats(self, user_id):
        # 获取分类统计
        pass
```

### 前端组件

#### CategorySelector - 分类选择器
```tsx
<CategorySelector
  selectedPrimary={primaryCategory}
  selectedSecondary={secondaryCategory}
  onSelectionChange={(primary, secondary) => {
    // 处理分类选择变化
  }}
  showAllOption={true}
/>
```

#### CategoryBadge - 分类徽章
```tsx
<CategoryBadge
  invoice={invoice}
  size="sm"
  showIcon={true}
  showTooltip={true}
/>
```

#### CategoryStatsCard - 统计卡片
```tsx
<CategoryStatsCard
  categoryName="交通"
  count={15}
  totalAmount={8500}
  averageAmount={567}
  icon="🚗"
  color="#8b5cf6"
/>
```

### 工具函数
```typescript
// 分类工具函数
import { 
  getCategoryDisplayName,
  getCategoryIcon,
  getCategoryColor,
  formatCategoryInfo,
  generateCategoryStats
} from '../utils/categoryUtils';
```

## 使用示例

### 1. 发票列表集成
```tsx
import InvoiceListWithCategories from '../components/InvoiceListWithCategories';

function InvoicesPage() {
  return <InvoiceListWithCategories />;
}
```

### 2. 分类筛选查询
```typescript
const invoiceService = new InvoiceSupabaseService();

// 按一级分类筛选
const transportInvoices = await invoiceService.getInvoicesByCategory('交通');

// 按二级分类筛选  
const trainInvoices = await invoiceService.getInvoicesByCategory('交通', '高铁');

// 获取分类统计
const categoryStats = await invoiceService.getCategoryStats();
```

### 3. 分类信息显示
```typescript
// 获取发票详情（包含分类信息）
const invoice = await invoiceService.getDetail(invoiceId);

console.log(invoice.primary_category_name);    // "交通"
console.log(invoice.secondary_category_name);  // "高铁"
console.log(invoice.category_full_path);       // "交通 > 高铁"
console.log(invoice.category_info);            // 完整分类信息JSON
```

## 配置和自定义

### 1. 分类体系扩展
在 `utils/categoryUtils.ts` 中修改分类定义：
```typescript
export const getAvailableCategories = () => ({
  primary: ['交通', '住宿', '餐饮', '办公', '其他'],
  secondary: {
    '交通': ['高铁', '飞机', '出租车'],
    '住宿': ['酒店', '民宿'],
    // 添加新的分类...
  }
});
```

### 2. 图标和颜色自定义
```typescript
export const categoryIcons = {
  '交通': '🚗',
  '高铁': '🚄',
  // 自定义图标...
};

export const categoryColors = {
  '交通': '#8b5cf6',
  '高铁': '#8b5cf6',
  // 自定义颜色...
};
```

### 3. 自动分类规则
在数据库中配置关键词匹配规则：
```sql
INSERT INTO expense_category_keywords (category, keywords)
VALUES 
  ('高铁', '{"高铁", "动车", "CRH", "G"}'),
  ('飞机', '{"机票", "航空", "航班", "登机"}');
```

## 最佳实践

1. **分类一致性**: 确保分类体系在前后端保持一致
2. **性能优化**: 使用数据库视图预计算分类信息
3. **用户体验**: 提供清晰的分类选择界面和反馈
4. **数据质量**: 定期检查和清理分类数据
5. **扩展性**: 设计时考虑未来分类体系的扩展

## 故障排除

### 常见问题

1. **分类不显示**: 检查数据库枚举类型是否包含所有分类值
2. **自动分类失败**: 检查触发器是否正常工作
3. **统计数据不准确**: 确认视图定义和数据完整性

### 调试工具
```sql
-- 检查分类分布
SELECT expense_category, COUNT(*) FROM invoices GROUP BY expense_category;

-- 检查视图数据
SELECT * FROM v_invoice_detail WHERE expense_category IS NOT NULL LIMIT 10;
```

## 更新日志

### v2.0.0 (2025-01-27)
- ✨ 新增层级分类体系
- ✨ 实现自动分类识别
- ✨ 添加消费日期自动计算
- ✨ 完善分类统计功能
- 🎨 优化用户界面和交互体验
- 📚 完善文档和示例代码