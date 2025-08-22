# 订阅管理系统

## 功能概述
建立完整的SaaS订阅管理系统，支持多层级套餐、灵活计费模式、中国本土化支付方式，实现订阅收入的稳定增长和精细化管理。

## 核心目标
- 建立稳定的订阅收入模式
- 提供灵活的套餐选择满足不同用户需求
- 支持中国主流支付方式
- 实现订阅生命周期全流程管理
- 建立完善的计费和对账系统

## 套餐设计策略

### 1. 基础套餐 (¥19/月)
- **发票处理量**：200张/月
- **存储空间**：2GB
- **基础OCR识别**：准确率95%
- **邮件自动处理**：✓
- **基础统计报表**：✓
- **客服支持**：工单支持

### 2. 专业套餐 (¥39/月) 🔥推荐
- **发票处理量**：1000张/月  
- **存储空间**：10GB
- **高精度OCR识别**：准确率98%
- **智能分类标签**：✓
- **高级统计分析**：✓
- **数据导出**：Excel/PDF
- **优先客服支持**：在线客服
- **API访问**：基础API

### 3. 企业套餐 (¥99/月)
- **发票处理量**：5000张/月
- **存储空间**：50GB  
- **AI智能审核**：✓
- **自定义报表模板**：✓
- **批量处理工具**：✓
- **企业级安全**：数据加密
- **专属客服经理**：✓
- **完整API访问**：✓
- **多账户协作**：5个子账户

### 4. 旗舰套餐 (¥299/月)
- **发票处理量**：无限制
- **存储空间**：无限制
- **私有化部署选项**：✓
- **定制化开发**：✓
- **SLA保障**：99.9%
- **专属技术支持**：✓
- **白标解决方案**：✓

## 功能需求详述

### 1. 套餐管理系统

#### 套餐配置
- **动态套餐定义**：支持后台动态配置套餐内容
- **功能权限矩阵**：精细化功能权限控制
- **使用量配额管理**：实时监控和限制
- **套餐升降级规则**：支持即时生效和下个计费周期生效

#### 计费规则引擎
- **按月/年计费**：月付、年付折扣机制
- **阶梯计费**：超量使用按阶梯价格收费
- **促销活动**：优惠券、折扣码、限时活动
- **企业定制报价**：大客户专属定价

### 2. 支付集成系统

#### 支付方式支持
- **微信支付**：H5支付、扫码支付、小程序支付
- **支付宝**：网页支付、手机网站支付、扫码支付  
- **银行卡支付**：借记卡、信用卡
- **企业转账**：对公转账、发票开具

#### 支付流程管理
- **订单生成**：自动生成支付订单
- **支付回调**：异步支付结果处理
- **支付重试**：失败支付自动重试机制
- **退款处理**：支持部分退款和全额退款

### 3. 订阅生命周期管理

#### 订阅状态管理
```
试用中 → 正常订阅 → 过期提醒 → 暂停服务 → 取消订阅
```

#### 自动续费机制
- **续费提醒**：到期前7天、3天、1天邮件提醒
- **自动扣费**：支持用户授权自动续费
- **续费失败处理**：多次重试、宽限期、服务降级
- **主动续费**：用户主动续费恢复服务

#### 订阅变更处理
- **套餐升级**：立即生效，按比例计费
- **套餐降级**：下个计费周期生效
- **暂停订阅**：最长暂停3个月
- **取消订阅**：支持立即取消和到期取消

### 4. 发票与财务管理

#### 电子发票系统
- **自动开票**：支付成功后自动开具电子发票
- **发票信息管理**：企业信息、开票历史
- **发票下载**：PDF格式电子发票
- **发票邮寄**：纸质发票快递服务

#### 财务对账
- **收入确认**：订阅收入自动确认
- **对账报表**：日/月/年财务报表
- **退款记录**：完整退款流程记录
- **税务处理**：增值税自动计算

## 技术实现架构

### 数据库设计

```sql
-- 订阅套餐表
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  features JSONB,
  limits JSONB,
  sort_order INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);

-- 用户订阅表  
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(20) DEFAULT 'active',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  auto_renewal BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 支付订单表
CREATE TABLE payment_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  subscription_id UUID REFERENCES user_subscriptions(id),
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'CNY',
  payment_method VARCHAR(20),
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_id VARCHAR(100),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 使用量统计表
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  resource_type VARCHAR(50),
  usage_count INTEGER,
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API 接口设计

```typescript
// 订阅管理接口
interface SubscriptionAPI {
  // 获取可用套餐
  getPlans(): Promise<SubscriptionPlan[]>;
  
  // 创建订阅
  createSubscription(planId: string, paymentMethod: string): Promise<PaymentOrder>;
  
  // 获取当前订阅
  getCurrentSubscription(): Promise<UserSubscription>;
  
  // 变更订阅
  changeSubscription(newPlanId: string): Promise<SubscriptionChange>;
  
  // 取消订阅
  cancelSubscription(cancelAtPeriodEnd: boolean): Promise<CancelResult>;
  
  // 获取使用量
  getUsageStats(period: string): Promise<UsageStats>;
}
```

## 业务流程设计

### 1. 新用户订阅流程
```
选择套餐 → 确认订单 → 选择支付方式 → 完成支付 
→ 订阅激活 → 发送确认邮件 → 开具发票
```

### 2. 续费流程
```
到期提醒 → 用户确认续费 → 生成续费订单 → 支付处理 
→ 订阅延期 → 使用量重置 → 续费确认通知
```

### 3. 套餐变更流程
```
用户请求变更 → 计算费用差额 → 生成变更订单 
→ 支付/退款处理 → 权限变更 → 变更确认通知
```

## 成功指标和监控

### 核心KPI指标
- **月度经常性收入(MRR)**：每月订阅收入总额
- **年度经常性收入(ARR)**：年度订阅收入总额  
- **客户生命周期价值(LTV)**：单个客户总价值
- **客户获取成本(CAC)**：获取单个付费客户成本
- **月流失率**：每月取消订阅的用户比例
- **套餐转化率**：试用转付费、套餐升级转化率

### 运营监控指标
- **支付成功率**：支付交易成功比例(目标>98%)
- **续费率**：到期用户续费比例(目标>85%)
- **升级率**：基础套餐升级比例(目标>20%)
- **退款率**：申请退款用户比例(控制<2%)

## 实施优先级

### Phase 1: 核心订阅功能 (4周)
- 套餐定义和管理
- 基础支付集成
- 订阅状态管理
- 简单的权限控制

### Phase 2: 支付优化 (3周)  
- 多支付方式集成
- 自动续费机制
- 发票开具系统
- 财务对账功能

### Phase 3: 高级功能 (3周)
- 套餐变更处理
- 使用量统计和限制
- 促销活动支持
- 退款处理流程

### Phase 4: 运营工具 (2周)
- 订阅分析报表
- 客服管理工具
- 批量操作功能
- 监控告警系统