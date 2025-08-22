# 订阅管理系统 - 设计文档

## 系统架构设计

### 整体架构图
```
订阅管理系统
├── 套餐管理模块
│   ├── 套餐定义引擎
│   ├── 权限控制矩阵  
│   ├── 使用量配额管理
│   └── 价格计算引擎
├── 支付处理模块
│   ├── 支付网关集成
│   ├── 订单管理系统
│   ├── 支付回调处理
│   └── 退款处理引擎
├── 订阅生命周期
│   ├── 订阅状态机
│   ├── 自动续费引擎
│   ├── 套餐变更处理
│   └── 取消订阅流程
└── 财务对账模块
    ├── 收入确认系统
    ├── 电子发票系统
    ├── 财务报表生成
    └── 税务处理引擎
```

## 核心模块详细设计

### 1. 套餐管理模块

#### 套餐定义数据结构
```typescript
interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  pricing: {
    monthly: number;
    yearly: number;
    yearlyDiscount?: number;
  };
  features: PlanFeature[];
  limits: PlanLimits;
  metadata: {
    popular?: boolean;
    recommended?: boolean;
    enterprise?: boolean;
  };
  status: 'active' | 'inactive' | 'deprecated';
}

interface PlanFeature {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  value?: any;
}

interface PlanLimits {
  invoiceProcessing: {
    monthly: number;
    overage?: {
      enabled: boolean;
      pricePerUnit: number;
      freeUnits?: number;
    };
  };
  storage: {
    gb: number;
    overage?: {
      enabled: boolean;
      pricePerGB: number;
    };
  };
  apiCalls?: {
    monthly: number;
    overage?: {
      enabled: boolean;
      pricePerCall: number;
    };
  };
}
```

#### 权限控制矩阵设计
```typescript
interface PermissionMatrix {
  [featureKey: string]: {
    checkPermission: (subscription: UserSubscription, context?: any) => boolean;
    getUsageInfo: (userId: string, period: string) => Promise<UsageInfo>;
    enforceLimit: (userId: string, operation: string) => Promise<LimitResult>;
  };
}

// 权限检查示例
const permissionMatrix: PermissionMatrix = {
  'ocr_processing': {
    checkPermission: (sub) => sub.plan.features.includes('ocr_processing'),
    getUsageInfo: async (userId, period) => {
      return await getOCRUsage(userId, period);
    },
    enforceLimit: async (userId, operation) => {
      const usage = await getCurrentUsage(userId, 'ocr_processing');
      const limit = await getUserLimit(userId, 'ocr_processing');
      return usage.count < limit.monthly;
    }
  },
  'advanced_analytics': {
    checkPermission: (sub) => sub.plan.tier >= PlanTier.Professional,
    getUsageInfo: async (userId) => ({ unlimited: true }),
    enforceLimit: async () => ({ allowed: true })
  }
};
```

### 2. 支付处理模块

#### 支付网关抽象层
```typescript
interface PaymentGateway {
  name: string;
  createPaymentOrder(order: PaymentOrderData): Promise<PaymentResponse>;
  processPayment(paymentId: string): Promise<PaymentResult>;
  handleWebhook(payload: any, signature: string): Promise<WebhookResult>;
  refundPayment(paymentId: string, amount?: number): Promise<RefundResult>;
}

// 微信支付实现
class WeChatPayGateway implements PaymentGateway {
  name = 'wechat';
  
  async createPaymentOrder(order: PaymentOrderData): Promise<PaymentResponse> {
    // 调用微信支付API创建订单
    const response = await wechatPay.createOrder({
      out_trade_no: order.orderId,
      description: order.description,
      amount: {
        total: Math.round(order.amount * 100), // 转换为分
        currency: 'CNY'
      },
      notify_url: process.env.WECHAT_WEBHOOK_URL
    });
    
    return {
      paymentId: response.prepay_id,
      paymentUrl: response.h5_url,
      qrCode: response.code_url
    };
  }
  
  // ... 其他方法实现
}
```

#### 订单状态机设计
```typescript
enum PaymentOrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing', 
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

class PaymentOrderStateMachine {
  private transitions: Record<PaymentOrderStatus, PaymentOrderStatus[]> = {
    [PaymentOrderStatus.PENDING]: [
      PaymentOrderStatus.PROCESSING,
      PaymentOrderStatus.CANCELLED
    ],
    [PaymentOrderStatus.PROCESSING]: [
      PaymentOrderStatus.COMPLETED,
      PaymentOrderStatus.FAILED
    ],
    [PaymentOrderStatus.COMPLETED]: [
      PaymentOrderStatus.REFUNDED
    ],
    [PaymentOrderStatus.FAILED]: [
      PaymentOrderStatus.PENDING
    ],
    [PaymentOrderStatus.CANCELLED]: [],
    [PaymentOrderStatus.REFUNDED]: []
  };
  
  canTransition(from: PaymentOrderStatus, to: PaymentOrderStatus): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }
  
  async transition(orderId: string, newStatus: PaymentOrderStatus): Promise<void> {
    const currentOrder = await this.getOrder(orderId);
    
    if (!this.canTransition(currentOrder.status, newStatus)) {
      throw new Error(`Cannot transition from ${currentOrder.status} to ${newStatus}`);
    }
    
    await this.updateOrderStatus(orderId, newStatus);
    await this.triggerStatusChangeHooks(orderId, currentOrder.status, newStatus);
  }
}
```

### 3. 订阅生命周期管理

#### 订阅状态机设计
```typescript
enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active', 
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  UNPAID = 'unpaid',
  PAUSED = 'paused'
}

class SubscriptionStateMachine {
  async handleSubscriptionEvent(
    subscriptionId: string, 
    event: SubscriptionEvent
  ): Promise<void> {
    const subscription = await this.getSubscription(subscriptionId);
    
    switch (event.type) {
      case 'payment_succeeded':
        await this.activateSubscription(subscriptionId);
        break;
        
      case 'payment_failed':
        await this.markPastDue(subscriptionId);
        await this.scheduleRetry(subscriptionId);
        break;
        
      case 'period_end':
        await this.handlePeriodEnd(subscriptionId);
        break;
        
      case 'cancellation_requested':
        await this.processCancellation(subscriptionId, event.data);
        break;
    }
  }
  
  private async handlePeriodEnd(subscriptionId: string): Promise<void> {
    const subscription = await this.getSubscription(subscriptionId);
    
    if (subscription.cancel_at_period_end) {
      await this.cancelSubscription(subscriptionId);
    } else if (subscription.auto_renewal) {
      await this.renewSubscription(subscriptionId);
    } else {
      await this.markUnpaid(subscriptionId);
    }
  }
}
```

#### 自动续费机制设计
```typescript
class AutoRenewalService {
  async processRenewal(subscriptionId: string): Promise<RenewalResult> {
    const subscription = await this.getSubscription(subscriptionId);
    const user = await this.getUser(subscription.user_id);
    
    try {
      // 1. 创建续费订单
      const renewalOrder = await this.createRenewalOrder(subscription);
      
      // 2. 尝试使用默认支付方式
      const paymentResult = await this.chargeDefaultPaymentMethod(
        user.id, 
        renewalOrder.amount
      );
      
      if (paymentResult.success) {
        // 3. 续费成功，延长订阅期限
        await this.extendSubscriptionPeriod(subscriptionId);
        await this.resetUsageCounters(subscription.user_id);
        await this.sendRenewalSuccessNotification(user);
        
        return { success: true, orderId: renewalOrder.id };
      } else {
        // 4. 续费失败，进入重试流程
        await this.handleRenewalFailure(subscriptionId, paymentResult.error);
        return { success: false, error: paymentResult.error };
      }
      
    } catch (error) {
      await this.handleRenewalError(subscriptionId, error);
      throw error;
    }
  }
  
  private async handleRenewalFailure(
    subscriptionId: string, 
    error: PaymentError
  ): Promise<void> {
    // 设置重试计划
    const retrySchedule = [1, 3, 7]; // 1天、3天、7天后重试
    
    for (const days of retrySchedule) {
      await this.scheduleRenewalRetry(subscriptionId, days);
    }
    
    // 发送续费失败通知
    await this.sendRenewalFailureNotification(subscriptionId, error);
    
    // 标记订阅为逾期
    await this.markSubscriptionPastDue(subscriptionId);
  }
}
```

### 4. 使用量监控和限制

#### 实时使用量追踪
```typescript
class UsageTracker {
  private redis: RedisClient;
  
  async recordUsage(
    userId: string, 
    resourceType: string, 
    amount: number = 1
  ): Promise<UsageRecord> {
    const key = this.getUsageKey(userId, resourceType);
    const currentPeriod = this.getCurrentBillingPeriod(userId);
    
    // 使用Redis计数器记录使用量
    const newCount = await this.redis.hincrby(
      key, 
      currentPeriod, 
      amount
    );
    
    // 设置过期时间
    await this.redis.expire(key, 86400 * 32); // 32天过期
    
    // 检查是否超过限制
    const limit = await this.getUserLimit(userId, resourceType);
    const isOverLimit = newCount > limit;
    
    if (isOverLimit) {
      await this.handleOverageUsage(userId, resourceType, newCount, limit);
    }
    
    return {
      userId,
      resourceType,
      currentUsage: newCount,
      limit,
      isOverLimit,
      period: currentPeriod
    };
  }
  
  async checkUsageLimit(
    userId: string, 
    resourceType: string, 
    requestedAmount: number = 1
  ): Promise<boolean> {
    const currentUsage = await this.getCurrentUsage(userId, resourceType);
    const limit = await this.getUserLimit(userId, resourceType);
    
    return (currentUsage + requestedAmount) <= limit;
  }
  
  private async handleOverageUsage(
    userId: string, 
    resourceType: string, 
    usage: number, 
    limit: number
  ): Promise<void> {
    const subscription = await this.getUserSubscription(userId);
    const planLimits = subscription.plan.limits[resourceType];
    
    if (planLimits?.overage?.enabled) {
      // 支持超量使用，记录超量费用
      const overageAmount = usage - limit;
      const overageCost = overageAmount * planLimits.overage.pricePerUnit;
      
      await this.recordOverageCharge(userId, resourceType, overageAmount, overageCost);
    } else {
      // 不支持超量使用，阻止操作
      await this.blockUserOperation(userId, resourceType);
      await this.sendUsageLimitNotification(userId, resourceType);
    }
  }
}
```

## 前端用户界面设计

### 1. 套餐选择页面
```typescript
const PricingPage: React.FC = () => {
  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>选择适合您的套餐</h1>
        <PricingToggle onChange={setPeriod} />
      </div>
      
      <div className="pricing-grid">
        {plans.map(plan => (
          <PricingCard
            key={plan.id}
            plan={plan}
            period={period}
            highlighted={plan.recommended}
            onSelect={() => handlePlanSelection(plan)}
          />
        ))}
      </div>
      
      <PricingComparison plans={plans} />
    </div>
  );
};

const PricingCard: React.FC<PricingCardProps> = ({ 
  plan, 
  period, 
  highlighted, 
  onSelect 
}) => {
  const price = period === 'monthly' ? plan.pricing.monthly : plan.pricing.yearly;
  const monthlyPrice = period === 'yearly' ? price / 12 : price;
  
  return (
    <div className={`pricing-card ${highlighted ? 'highlighted' : ''}`}>
      <div className="plan-header">
        <h3>{plan.name}</h3>
        {plan.recommended && <Badge>推荐</Badge>}
      </div>
      
      <div className="price-display">
        <span className="currency">¥</span>
        <span className="amount">{price}</span>
        <span className="period">/{period === 'monthly' ? '月' : '年'}</span>
        {period === 'yearly' && (
          <div className="yearly-discount">
            平均 ¥{monthlyPrice.toFixed(0)}/月
          </div>
        )}
      </div>
      
      <FeatureList features={plan.features} />
      
      <Button 
        className="select-plan-btn"
        onClick={onSelect}
        variant={highlighted ? 'primary' : 'outline'}
      >
        选择{plan.name}
      </Button>
    </div>
  );
};
```

### 2. 订阅管理页面
```typescript
const SubscriptionManagementPage: React.FC = () => {
  const { subscription, usage } = useSubscription();
  
  return (
    <div className="subscription-management">
      <CurrentSubscriptionCard subscription={subscription} />
      
      <UsageOverview usage={usage} limits={subscription.plan.limits} />
      
      <div className="management-actions">
        <ChangePlanSection currentPlan={subscription.plan} />
        <BillingHistorySection subscriptionId={subscription.id} />
        <CancellationSection subscription={subscription} />
      </div>
    </div>
  );
};

const CurrentSubscriptionCard: React.FC<{ subscription: UserSubscription }> = ({
  subscription
}) => {
  return (
    <Card className="current-subscription">
      <div className="subscription-status">
        <StatusBadge status={subscription.status} />
        <h2>{subscription.plan.name}</h2>
      </div>
      
      <div className="subscription-details">
        <div className="billing-info">
          <span>下次扣费时间</span>
          <span>{formatDate(subscription.current_period_end)}</span>
        </div>
        
        <div className="amount-info">
          <span>月费</span>
          <span>¥{subscription.plan.pricing.monthly}</span>
        </div>
        
        {subscription.cancel_at_period_end && (
          <div className="cancellation-notice">
            <AlertIcon />
            <span>将在 {formatDate(subscription.current_period_end)} 取消</span>
          </div>
        )}
      </div>
      
      <div className="subscription-actions">
        <Button variant="outline">变更套餐</Button>
        <Button variant="outline">管理支付方式</Button>
      </div>
    </Card>
  );
};
```

## 安全性和合规设计

### 1. 支付安全
- **PCI DSS合规**：不存储信用卡敏感信息
- **加密传输**：所有支付数据HTTPS加密传输
- **签名验证**：支付回调签名严格验证
- **幂等性保证**：支付操作幂等性处理

### 2. 数据安全
- **敏感数据加密**：用户财务信息加密存储
- **访问权限控制**：严格的数据访问权限
- **审计日志**：完整的操作审计日志
- **数据备份**：定期数据备份和恢复测试

### 3. 合规要求
- **税务合规**：自动计算和上报增值税
- **发票合规**：符合国家电子发票规范
- **数据保护**：符合个人信息保护法
- **金融监管**：遵守相关金融法规