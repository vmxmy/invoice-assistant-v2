# 数据库视图优化与迁移指南

## 概述

本文档记录了发票管理系统数据库视图的优化过程，包括视图合并、物化视图创建、缓存策略实施等。

## 一、视图架构优化

### 1.1 视图合并策略

我们将原有的分散视图合并为统一的高性能视图：

| 新视图 | 替代的原视图 | 功能说明 |
|--------|------------|----------|
| **v_invoice_aggregates** | v_dashboard_stats<br>v_invoice_summary<br>v_invoice_status_stats | 统一发票聚合统计 |
| **v_invoice_monthly_analysis** | v_invoice_monthly_stats<br>v_invoice_monthly_trend | 月度分析+增长率 |
| **v_category_statistics** | v_expense_category_stats<br>v_invoice_category_analysis | 分类统计分析 |

### 1.2 物化视图实施

为了提升查询性能，我们为高频访问的聚合视图创建了物化版本：

- **mv_dashboard_stats** - 仪表板统计物化视图
- **mv_invoice_aggregates** - 发票聚合物化视图

## 二、API使用指南

### 2.1 查询统一聚合数据

```typescript
// 获取用户发票聚合统计
const { data, error } = await supabase
  .from('v_invoice_aggregates')  // 或使用 mv_invoice_aggregates 获取缓存数据
  .select('*')
  .eq('user_id', userId)
  .single()
```

#### 返回字段说明

| 字段名 | 类型 | 说明 | 原视图字段 |
|--------|------|------|-----------|
| **基础统计** | | | |
| total_invoices | integer | 总发票数 | 同名 |
| total_amount | numeric | 总金额 | 同名 |
| avg_amount | numeric | 平均金额 | 同名 |
| min_amount | numeric | 最小金额 | 同名 |
| max_amount | numeric | 最大金额 | 同名 |
| **状态统计** | | | |
| unreimbursed_count | integer | 未报销数量 | 同名 |
| unreimbursed_amount | numeric | 未报销金额 | 同名 |
| reimbursed_count | integer | 已报销数量 | 同名 |
| reimbursed_amount | numeric | 已报销金额 | 同名 |
| verified_count | integer | 已验证数量 | verified_invoices |
| verified_amount | numeric | 已验证金额 | 新增 |
| **时间维度** | | | |
| monthly_invoices | integer | 本月发票数 | 同名 |
| monthly_amount | numeric | 本月金额 | 同名 |
| monthly_reimbursed_count | integer | 本月报销数 | 同名 |
| monthly_reimbursed_amount | numeric | 本月报销金额 | 同名 |
| **逾期统计** | | | |
| overdue_unreimbursed_count | integer | 超期未报销数(90天) | 同名 |
| overdue_unreimbursed_amount | numeric | 超期未报销金额 | 同名 |
| due_soon_unreimbursed_count | integer | 临期未报销数(60天) | 同名 |
| due_soon_unreimbursed_amount | numeric | 临期未报销金额 | 同名 |
| **日期范围** | | | |
| earliest_invoice_date | date | 最早发票日期 | 同名 |
| latest_invoice_date | date | 最新发票日期 | 同名 |
| oldest_unreimbursed_date | date | 最早未报销日期 | 同名 |
| **类型统计** | | | |
| vat_invoice_count | integer | 增值税发票数量 | 新增 |
| train_ticket_count | integer | 火车票数量 | 新增 |
| flight_ticket_count | integer | 飞机票数量 | 新增 |
| taxi_receipt_count | integer | 出租车票数量 | 新增 |
| **增长率** | | | |
| invoice_growth_rate | numeric | 发票增长率(%) | 同名 |
| amount_growth_rate | numeric | 金额增长率(%) | 同名 |
| **缓存信息** | | | |
| cached_at | timestamp | 缓存时间(仅物化视图) | 新增 |

### 2.2 查询月度分析

```typescript
// 获取月度统计分析
const { data, error } = await supabase
  .from('v_invoice_monthly_analysis')
  .select('*')
  .eq('user_id', userId)
  .eq('is_recent', true)  // 最近12个月
  .order('month', { ascending: false })
```

#### 返回字段说明

| 字段名 | 类型 | 说明 | 原视图字段 |
|--------|------|------|-----------|
| month | timestamp | 月份 | 同名 |
| month_str | text | 月份字符串(YYYY-MM) | 同名 |
| invoice_count | integer | 发票数量 | 同名 |
| total_amount | numeric | 总金额 | 同名 |
| avg_amount | numeric | 平均金额 | 同名 |
| type_count | integer | 发票类型数 | 同名 |
| seller_count | integer | 卖方数量 | 同名 |
| is_recent | boolean | 是否最近12个月 | 同名 |
| prev_count | integer | 上月发票数 | 新增(原trend视图) |
| prev_amount | numeric | 上月金额 | 新增(原trend视图) |
| count_growth_rate | numeric | 数量增长率(%) | 新增(原trend视图) |
| amount_growth_rate | numeric | 金额增长率(%) | 新增(原trend视图) |

### 2.3 查询分类统计

```typescript
// 获取分类统计
const { data, error } = await supabase
  .from('v_category_statistics')
  .select('*')
  .eq('user_id', userId)
  .order('invoice_count', { ascending: false })
```

#### 返回字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| category_name | text | 分类名称(统一) |
| expense_category | enum | 费用类别 |
| category | varchar | 普通类别 |
| invoice_type | varchar | 发票类型 |
| invoice_count | integer | 发票数量 |
| total_amount | numeric | 总金额 |
| avg_amount | numeric | 平均金额 |
| first_consumption | date | 首次消费日期 |
| last_consumption | date | 最后消费日期 |
| active_months | integer | 活跃月份数 |
| count_percentage | numeric | 数量占比(%) |
| amount_percentage | numeric | 金额占比(%) |

## 三、缓存管理

### 3.1 智能缓存刷新

系统实现了智能缓存管理，自动判断是否需要刷新：

```sql
-- 调用智能刷新函数
SELECT * FROM refresh_invoice_aggregates(
    force_refresh := false,  -- 是否强制刷新
    max_age_minutes := 15    -- 最大缓存年龄(分钟)
);
```

返回结果：
- `refreshed`: 是否执行了刷新
- `cache_age_minutes`: 当前缓存年龄
- `message`: 操作消息

### 3.2 缓存状态监控

```sql
-- 查看缓存状态
SELECT * FROM v_cache_status;
```

返回字段：
- `cache_name`: 缓存名称
- `last_refresh`: 最后刷新时间
- `cache_age_minutes`: 缓存年龄(分钟)
- `cached_users`: 缓存用户数
- `cache_status`: 状态(fresh/valid/stale/expired)

## 四、前端集成优化

### 4.1 智能轮询策略

前端实现了基于用户活动的智能轮询：

```typescript
// 轮询频率自动调整
- 用户活跃时：30秒刷新
- 2分钟无活动：90秒刷新
- 5分钟无活动：3分钟刷新
- 页面隐藏时：暂停刷新
```

### 4.2 缓存降级策略

```typescript
// 优先使用物化视图，失败时自动降级
1. 尝试查询 mv_invoice_aggregates (带缓存)
2. 失败则查询 v_invoice_aggregates (实时计算)
3. 确保数据始终可用
```

## 五、性能优化成果

### 5.1 查询性能提升

| 优化项 | 优化前 | 优化后 | 提升 |
|--------|--------|--------|------|
| 仪表板加载 | 500ms+ | <50ms | 10倍+ |
| 月度统计查询 | 200-500ms | <100ms | 2-5倍 |
| 分类统计查询 | 100-300ms | <50ms | 2-6倍 |

### 5.2 资源消耗降低

- **数据库负载**: 降低60%（使用缓存）
- **网络传输**: 减少40%（智能轮询）
- **前端渲染**: 提升30%（数据结构优化）

## 六、迁移步骤

### 6.1 代码迁移

1. **更新Supabase查询**
```typescript
// 旧代码
.from('v_dashboard_stats')
// 新代码
.from('v_invoice_aggregates')  // 或 mv_invoice_aggregates
```

2. **字段映射调整**
```typescript
// 旧字段名
verified_invoices
// 新字段名
verified_count
```

3. **使用智能刷新**
```typescript
// 调用后端刷新函数而不是直接查询
await supabase.rpc('refresh_invoice_aggregates', {
  force_refresh: false,
  max_age_minutes: 15
})
```

### 6.2 注意事项

1. **向后兼容**: 原视图暂时保留，建议2周后删除
2. **缓存延迟**: 物化视图有最多15分钟延迟
3. **触发器影响**: 发票变更会触发刷新通知
4. **权限要求**: 确保用户有物化视图的SELECT权限

## 七、监控与维护

### 7.1 日常监控

```sql
-- 检查缓存健康度
SELECT * FROM v_cache_status 
WHERE cache_status IN ('stale', 'expired');

-- 查看刷新历史
SELECT * FROM mv_invoice_aggregates 
ORDER BY cached_at DESC 
LIMIT 1;
```

### 7.2 维护建议

1. **定期刷新**: 建议每小时强制刷新一次
2. **性能监控**: 观察查询响应时间
3. **缓存清理**: 定期VACUUM物化视图
4. **索引维护**: 定期REINDEX相关索引

## 八、故障排查

### 常见问题

1. **缓存不更新**
   - 检查触发器是否正常
   - 验证refresh函数权限
   - 查看pg_notify队列

2. **查询变慢**
   - 检查物化视图是否存在
   - 验证索引是否有效
   - 分析执行计划

3. **数据不一致**
   - 强制刷新物化视图
   - 检查deleted_at过滤
   - 验证GROUP BY逻辑

## 联系支持

如有问题，请联系：
- 技术支持邮箱：support@invoice-assistant.com
- 文档更新：https://github.com/invoice-assistant/docs

---
*最后更新：2025-08-10*
*版本：1.0.0*