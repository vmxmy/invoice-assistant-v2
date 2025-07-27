# 发票数据流优化文档

## 优化前的问题

1. **视图重复**：
   - `v_invoice_list` - 基础视图，缺少分类信息
   - `v_invoice_detail` - 完整视图，包含分类信息

2. **数据不一致**：
   - 搜索使用 `v_invoice_list`，导致分类字段显示"未分类"
   - 详情查询使用 `v_invoice_detail`，能正确显示分类

## 优化后的数据流

### 数据库层
```
invoices (表)
    ↓
v_invoice_detail (统一视图)
    ↓
search_invoices() / 直接查询
```

- **统一使用 `v_invoice_detail`**：所有查询都使用这个视图
- **删除 `v_invoice_list`**：避免维护两个重复的视图

### 前端服务层
```typescript
// invoice.service.ts
export class InvoiceSupabaseService extends BaseSupabaseService<Invoice> {
  constructor() {
    super('invoices', 'v_invoice_detail')  // 统一使用 v_invoice_detail
  }
}
```

### 数据流向
1. **列表查询**：`search_invoices()` → `v_invoice_detail` → 前端
2. **详情查询**：`getDetail()` → `v_invoice_detail` → 前端
3. **创建/更新**：前端 → `invoices` 表 → 触发器 → 分类自动计算

## 主要改进

1. **数据一致性**：所有查询返回相同的字段结构
2. **维护简化**：只需维护一个视图
3. **分类信息完整**：列表和详情都包含完整的分类信息
4. **性能优化**：
   - 创建了必要的索引
   - 统一的视图减少了 JOIN 复杂度

## 分类字段映射

```typescript
// 数据库字段 → 前端显示
expense_category: "高铁"                    // 具体分类
primary_category_name: "交通"               // 一级分类
secondary_category_name: "高铁"             // 二级分类
category_full_path: "交通 > 高铁"          // 完整路径
```

## 前端组件使用

```typescript
// CategoryBadge 组件
<CategoryBadge invoice={invoice} />

// 动态列定义
case 'expense_category':
  return <CategoryBadge invoice={invoice} size="sm" />;
```

## 注意事项

1. **向后兼容**：前端 Invoice 类型已更新，包含所有分类字段
2. **触发器自动分类**：上传发票时，触发器会自动设置 `expense_category`
3. **搜索优化**：搜索函数现在包含分类字段的全文搜索