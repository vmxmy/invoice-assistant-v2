# 高级功能解锁系统 - 设计文档

## 系统架构设计

### 整体架构图
```
高级功能解锁系统
├── 权限控制引擎
│   ├── 动态权限验证
│   ├── 使用量监控
│   ├── 条件判断逻辑
│   └── 降级处理机制
├── 功能体验系统
│   ├── 预览模式控制
│   ├── 试用期管理
│   ├── 体验数据收集
│   └── 转化追踪
├── 升级引导引擎
│   ├── 时机识别算法
│   ├── 个性化推荐
│   ├── 价值计算器
│   └── 转化优化
└── 用户界面层
    ├── 功能锁定展示
    ├── 升级引导界面
    ├── 价值展示组件
    └── 使用量可视化
```

## 核心模块详细设计

### 1. 权限控制引擎

#### 权限验证架构
```typescript
interface PermissionEngine {
  // 核心权限检查
  checkAccess(request: AccessRequest): Promise<AccessResult>;
  
  // 批量权限检查
  batchCheckAccess(requests: AccessRequest[]): Promise<AccessResult[]>;
  
  // 权限预加载
  preloadPermissions(userId: string): Promise<PermissionCache>;
  
  // 权限变更通知
  onPermissionChange(callback: PermissionChangeCallback): void;
}

class AdvancedPermissionEngine implements PermissionEngine {
  private cache: Map<string, PermissionCache> = new Map();
  private rules: Map<string, PermissionRule> = new Map();
  
  async checkAccess(request: AccessRequest): Promise<AccessResult> {
    const startTime = Date.now();
    
    try {
      // 1. 缓存检查
      const cachedResult = await this.getCachedPermission(request);
      if (cachedResult && !this.isCacheExpired(cachedResult)) {
        return cachedResult.result;
      }
      
      // 2. 动态权限计算
      const result = await this.computePermission(request);
      
      // 3. 缓存结果
      await this.cachePermissionResult(request, result);
      
      // 4. 记录访问日志
      await this.logPermissionCheck(request, result, Date.now() - startTime);
      
      return result;
      
    } catch (error) {
      // 权限检查失败时的降级策略
      return this.handlePermissionError(request, error);
    }
  }
  
  private async computePermission(request: AccessRequest): Promise<AccessResult> {
    const user = await this.getUserInfo(request.userId);
    const subscription = await this.getSubscription(request.userId);
    const rule = this.rules.get(request.featureKey);
    
    if (!rule) {
      // 未配置权限规则，默认允许
      return { 
        allowed: true, 
        reason: 'no_rule_configured',
        metadata: { computedAt: Date.now() }
      };
    }
    
    // 套餐权限检查
    const planCheck = await this.checkPlanPermission(subscription, rule);
    if (!planCheck.allowed) {
      return {
        ...planCheck,
        upgradeRecommendation: await this.generateUpgradeRecommendation(
          subscription.plan, 
          rule.requiredPlan,
          request.context
        )
      };
    }
    
    // 使用量限制检查
    const usageCheck = await this.checkUsageLimit(request.userId, rule);
    if (!usageCheck.allowed) {
      return {
        ...usageCheck,
        remainingUsage: usageCheck.remaining,
        resetDate: usageCheck.resetDate,
        overageOptions: await this.getOverageOptions(request.userId, rule)
      };
    }
    
    // 条件检查
    const conditionCheck = await this.checkConditions(user, rule.conditions);
    if (!conditionCheck.allowed) {
      return {
        ...conditionCheck,
        fulfillmentSteps: await this.getConditionFulfillmentSteps(
          user, 
          conditionCheck.failedConditions
        )
      };
    }
    
    return { 
      allowed: true, 
      metadata: {
        planLevel: subscription.plan,
        remainingUsage: usageCheck.remaining,
        computedAt: Date.now()
      }
    };
  }
}
```

#### 使用量监控系统
```typescript
class UsageMonitoringSystem {
  private redis: RedisClient;
  private database: DatabaseClient;
  
  async recordUsage(
    userId: string, 
    featureKey: string, 
    amount: number = 1,
    metadata?: UsageMetadata
  ): Promise<UsageResult> {
    const period = this.getCurrentBillingPeriod(userId);
    const key = this.getUsageKey(userId, featureKey, period);
    
    // 原子性增加使用量
    const pipeline = this.redis.pipeline();
    pipeline.hincrby(key, 'count', amount);
    pipeline.hset(key, 'lastUsed', Date.now());
    pipeline.expire(key, this.getPeriodTTL(period));
    
    if (metadata) {
      pipeline.hset(key, 'metadata', JSON.stringify(metadata));
    }
    
    const results = await pipeline.exec();
    const newCount = results[0][1] as number;
    
    // 检查是否超过限制
    const limit = await this.getUserLimit(userId, featureKey);
    const isOverLimit = newCount > limit.amount;
    
    // 记录到持久化存储
    await this.persistUsageRecord({
      userId,
      featureKey,
      amount,
      timestamp: new Date(),
      period,
      cumulativeCount: newCount,
      metadata
    });
    
    // 触发使用量事件
    if (isOverLimit) {
      await this.triggerLimitExceededEvent(userId, featureKey, newCount, limit);
    } else if (newCount / limit.amount > 0.8) {
      await this.triggerNearLimitEvent(userId, featureKey, newCount, limit);
    }
    
    return {
      recorded: amount,
      currentUsage: newCount,
      limit: limit.amount,
      remaining: Math.max(0, limit.amount - newCount),
      isOverLimit,
      resetDate: this.getPeriodEndDate(period)
    };
  }
  
  async getUsageSummary(
    userId: string, 
    period: string = 'current'
  ): Promise<UsageSummary> {
    const periodDates = this.getPeriodDates(userId, period);
    
    const query = `
      SELECT 
        feature_key,
        SUM(amount) as total_usage,
        COUNT(*) as usage_sessions,
        MAX(timestamp) as last_used
      FROM user_feature_usage 
      WHERE user_id = $1 
        AND timestamp >= $2 
        AND timestamp < $3
      GROUP BY feature_key
    `;
    
    const results = await this.database.query(query, [
      userId, 
      periodDates.start, 
      periodDates.end
    ]);
    
    const limits = await this.getUserLimits(userId);
    
    return {
      period,
      features: results.rows.map(row => ({
        featureKey: row.feature_key,
        usage: row.total_usage,
        sessions: row.usage_sessions,
        lastUsed: row.last_used,
        limit: limits[row.feature_key] || null,
        utilizationRate: limits[row.feature_key] ? 
          row.total_usage / limits[row.feature_key].amount : null
      })),
      totalSessions: results.rows.reduce((sum, row) => sum + row.usage_sessions, 0),
      periodDates
    };
  }
}
```

### 2. 功能预览系统

#### 预览模式控制器
```typescript
class PreviewModeController {
  private previewSessions: Map<string, PreviewSession> = new Map();
  
  async startPreview(
    userId: string, 
    featureKey: string, 
    previewConfig: PreviewConfig
  ): Promise<PreviewSession> {
    // 检查用户是否有预览权限
    const eligibility = await this.checkPreviewEligibility(userId, featureKey);
    if (!eligibility.eligible) {
      throw new PreviewNotAllowedError(eligibility.reason);
    }
    
    // 创建预览会话
    const session: PreviewSession = {
      id: generateId(),
      userId,
      featureKey,
      config: previewConfig,
      startTime: new Date(),
      endTime: this.calculateEndTime(previewConfig.duration),
      status: 'active',
      interactions: [],
      metadata: {}
    };
    
    // 缓存会话信息
    this.previewSessions.set(session.id, session);
    
    // 设置自动结束定时器
    this.schedulePreviewEnd(session);
    
    // 记录预览开始事件
    await this.recordPreviewEvent(session, 'preview_started');
    
    // 启用预览模式的功能修改
    await this.enablePreviewMode(session);
    
    return session;
  }
  
  async recordInteraction(
    sessionId: string, 
    interaction: PreviewInteraction
  ): Promise<void> {
    const session = this.previewSessions.get(sessionId);
    if (!session || session.status !== 'active') {
      return;
    }
    
    // 记录交互
    session.interactions.push({
      ...interaction,
      timestamp: new Date()
    });
    
    // 检查预览限制
    await this.checkPreviewLimits(session, interaction);
    
    // 更新会话元数据
    this.updateSessionMetadata(session, interaction);
    
    // 触发实时分析
    await this.analyzePreviewEngagement(session);
  }
  
  private async enablePreviewMode(session: PreviewSession): Promise<void> {
    const modifications: PreviewModification[] = [];
    
    switch (session.config.type) {
      case 'demo':
        modifications.push({
          type: 'data_replacement',
          target: 'all_data',
          replacement: 'sample_data'
        });
        modifications.push({
          type: 'interaction_disable',
          target: 'write_operations'
        });
        break;
        
      case 'limited_use':
        modifications.push({
          type: 'quota_enforcement',
          target: 'api_calls',
          limit: session.config.requestLimit
        });
        modifications.push({
          type: 'response_modification',
          target: 'api_responses',
          modification: 'add_watermark'
        });
        break;
        
      case 'time_limited':
        modifications.push({
          type: 'time_enforcement',
          target: 'session_duration',
          limit: session.config.timeLimit
        });
        break;
    }
    
    // 应用修改
    for (const mod of modifications) {
      await this.applyPreviewModification(session.id, mod);
    }
  }
}
```

#### 体验质量分析
```typescript
class PreviewExperienceAnalyzer {
  async analyzePreviewQuality(session: PreviewSession): Promise<ExperienceAnalysis> {
    const interactions = session.interactions;
    const duration = Date.now() - session.startTime.getTime();
    
    // 计算参与度指标
    const engagement = this.calculateEngagement(interactions, duration);
    
    // 分析功能探索深度
    const explorationDepth = this.analyzeExplorationDepth(interactions);
    
    // 检测困惑点
    const confusionPoints = this.detectConfusionPoints(interactions);
    
    // 预测转化可能性
    const conversionProbability = await this.predictConversionProbability(
      session,
      engagement,
      explorationDepth
    );
    
    return {
      sessionId: session.id,
      overallScore: this.calculateOverallScore(
        engagement, 
        explorationDepth, 
        confusionPoints
      ),
      engagement,
      explorationDepth,
      confusionPoints,
      conversionProbability,
      recommendations: this.generateRecommendations(
        engagement,
        explorationDepth,
        confusionPoints
      )
    };
  }
  
  private calculateEngagement(
    interactions: PreviewInteraction[], 
    duration: number
  ): EngagementMetrics {
    const totalInteractions = interactions.length;
    const uniqueFeaturesSampled = new Set(
      interactions.map(i => i.subFeature || i.action)
    ).size;
    
    const sessionDurationMinutes = duration / (1000 * 60);
    const interactionsPerMinute = totalInteractions / sessionDurationMinutes;
    
    // 计算深度交互比例
    const deepInteractions = interactions.filter(i => 
      i.type === 'feature_use' || i.type === 'configuration_change'
    ).length;
    const deepInteractionRate = deepInteractions / totalInteractions;
    
    return {
      totalInteractions,
      interactionsPerMinute,
      uniqueFeaturesSampled,
      deepInteractionRate,
      sessionDuration: duration,
      engagementScore: this.normalizeEngagementScore(
        interactionsPerMinute,
        uniqueFeaturesSampled,
        deepInteractionRate
      )
    };
  }
  
  private async predictConversionProbability(
    session: PreviewSession,
    engagement: EngagementMetrics,
    exploration: ExplorationMetrics
  ): Promise<ConversionPrediction> {
    // 加载预训练模型或使用规则引擎
    const features = {
      sessionDuration: engagement.sessionDuration,
      interactionRate: engagement.interactionsPerMinute,
      explorationDepth: exploration.depth,
      featureCoverage: exploration.coverage,
      userTier: await this.getUserTier(session.userId),
      previousPreviewSessions: await this.getPreviousPreviewCount(session.userId),
      timeToPreview: await this.getTimeToPreview(session.userId, session.featureKey)
    };
    
    const probability = await this.conversionModel.predict(features);
    
    return {
      probability,
      confidence: this.conversionModel.getConfidence(features),
      keyFactors: this.identifyKeyConversionFactors(features, probability),
      recommendedActions: this.generateConversionActions(probability, features)
    };
  }
}
```

### 3. 升级引导引擎

#### 智能时机识别
```typescript
class UpgradeTimingEngine {
  private triggers: Map<string, TimingTrigger> = new Map();
  
  async identifyOptimalMoments(userId: string): Promise<UpgradeMoment[]> {
    const user = await this.getUserProfile(userId);
    const recentActivity = await this.getRecentActivity(userId, 30); // 30天内
    const subscription = await this.getCurrentSubscription(userId);
    
    const moments: UpgradeMoment[] = [];
    
    // 触发器1：功能限制碰壁
    const limitHits = this.detectLimitHits(recentActivity);
    for (const hit of limitHits) {
      const moment = await this.createLimitMoment(hit, subscription);
      if (moment) moments.push(moment);
    }
    
    // 触发器2：使用量突增
    const usageSpikes = this.detectUsageSpikes(recentActivity);
    for (const spike of usageSpikes) {
      const moment = await this.createUsageMoment(spike, subscription);
      if (moment) moments.push(moment);
    }
    
    // 触发器3：高价值功能探索
    const premiumExploration = this.detectPremiumExploration(recentActivity);
    if (premiumExploration.score > 0.6) {
      const moment = await this.createExplorationMoment(premiumExploration, subscription);
      if (moment) moments.push(moment);
    }
    
    // 触发器4：同类用户升级模式
    const cohortInsights = await this.getCohortUpgradeInsights(user);
    if (cohortInsights.shouldSuggest) {
      const moment = await this.createCohortMoment(cohortInsights, subscription);
      if (moment) moments.push(moment);
    }
    
    // 按优先级排序
    return this.prioritizeMoments(moments, user, subscription);
  }
  
  private async createLimitMoment(
    limitHit: LimitHitEvent, 
    subscription: Subscription
  ): Promise<UpgradeMoment | null> {
    const feature = limitHit.featureKey;
    const upgradeOptions = await this.getUpgradeOptionsForFeature(
      feature, 
      subscription.plan
    );
    
    if (upgradeOptions.length === 0) {
      return null;
    }
    
    const valueCalculation = await this.calculateUpgradeValue(
      limitHit.userId,
      upgradeOptions[0],
      { context: 'limit_hit', feature }
    );
    
    return {
      id: generateId(),
      type: 'limit_reached',
      urgency: this.calculateUrgency(limitHit),
      triggeredBy: {
        event: 'feature_limit_hit',
        featureKey: feature,
        timestamp: limitHit.timestamp,
        context: limitHit.context
      },
      recommendation: {
        targetPlan: upgradeOptions[0],
        reasoning: `解除${this.getFeatureName(feature)}使用限制`,
        benefits: this.getFeatureBenefits(feature, upgradeOptions[0]),
        valueProposition: valueCalculation
      },
      timing: {
        optimal: 'immediate',
        expiry: this.calculateMomentExpiry(limitHit),
        priority: this.calculatePriority('limit_reached', limitHit)
      },
      presentation: {
        title: '继续高效工作',
        message: `您的${this.getFeatureName(feature)}使用已达到限制`,
        cta: '立即升级解除限制',
        style: 'urgent'
      }
    };
  }
}
```

#### 个性化价值计算
```typescript
class PersonalizedValueCalculator {
  async calculatePersonalizedValue(
    userId: string,
    targetPlan: SubscriptionPlan,
    context: ValueCalculationContext
  ): Promise<PersonalizedValue> {
    const user = await this.getUserProfile(userId);
    const usage = await this.getUserUsage(userId, 90); // 90天使用数据
    const currentPlan = await this.getCurrentPlan(userId);
    
    // 基础价值计算
    const baseValue = this.calculateBaseValue(currentPlan, targetPlan);
    
    // 使用模式分析
    const usagePattern = this.analyzeUsagePattern(usage);
    
    // 个性化调整
    const personalizedAdjustments = await this.calculatePersonalizedAdjustments(
      user,
      usagePattern,
      context
    );
    
    // 计算ROI
    const roi = this.calculateROI(
      baseValue,
      personalizedAdjustments,
      targetPlan.pricing
    );
    
    return {
      monthlyValue: baseValue.monthly + personalizedAdjustments.monthly,
      yearlyValue: baseValue.yearly + personalizedAdjustments.yearly,
      timeToValue: this.calculateTimeToValue(usagePattern, targetPlan),
      roi,
      confidenceScore: this.calculateConfidenceScore(
        usagePattern.consistency,
        personalizedAdjustments.reliability
      ),
      breakdown: {
        timeSaved: personalizedAdjustments.timeSaved,
        efficiencyGain: personalizedAdjustments.efficiencyGain,
        errorReduction: personalizedAdjustments.errorReduction,
        scaleSupport: personalizedAdjustments.scaleSupport
      },
      visualization: this.generateValueVisualization(
        baseValue,
        personalizedAdjustments,
        roi
      )
    };
  }
  
  private calculatePersonalizedAdjustments(
    user: UserProfile,
    pattern: UsagePattern,
    context: ValueCalculationContext
  ): PersonalizationAdjustments {
    let adjustments: PersonalizationAdjustments = {
      monthly: 0,
      yearly: 0,
      timeSaved: 0,
      efficiencyGain: 0,
      errorReduction: 0,
      scaleSupport: 0,
      reliability: 1.0
    };
    
    // 基于使用量的调整
    if (pattern.averageMonthlyUsage > 100) {
      adjustments.timeSaved += pattern.averageMonthlyUsage * 0.5; // 每个发票节省0.5分钟
      adjustments.monthly += adjustments.timeSaved * (user.hourlyValue / 60);
    }
    
    // 基于错误率的调整
    if (pattern.manualCorrectionRate > 0.1) {
      const errorReduction = pattern.manualCorrectionRate * 0.8; // 减少80%错误
      adjustments.errorReduction = errorReduction * pattern.averageMonthlyUsage;
      adjustments.monthly += adjustments.errorReduction * user.errorCost;
    }
    
    // 基于扩展需求的调整
    if (pattern.growthRate > 0.1) {
      const futureVolume = pattern.averageMonthlyUsage * (1 + pattern.growthRate) * 12;
      adjustments.scaleSupport = futureVolume * user.scalingValue;
      adjustments.yearly += adjustments.scaleSupport;
    }
    
    // 基于行业的调整
    if (user.industry) {
      const industryMultiplier = this.getIndustryValueMultiplier(user.industry);
      adjustments.monthly *= industryMultiplier;
      adjustments.yearly *= industryMultiplier;
    }
    
    adjustments.yearly = adjustments.monthly * 12;
    
    return adjustments;
  }
}
```

## 前端用户体验设计

### 1. 渐进式功能展示
```typescript
const ProgressiveFeatureDiscovery: React.FC = () => {
  const { user, subscription } = useAuth();
  const { availableFeatures, lockedFeatures } = useFeatureAccess();
  
  return (
    <div className="feature-discovery">
      <div className="current-features">
        <h2>您当前可用的功能</h2>
        <FeatureGrid features={availableFeatures} />
      </div>
      
      <div className="upcoming-features">
        <h2>升级后可解锁</h2>
        <LockedFeatureGrid 
          features={lockedFeatures}
          currentPlan={subscription.plan}
          onPreview={handleFeaturePreview}
          onUpgrade={handleUpgrade}
        />
      </div>
      
      <div className="feature-journey">
        <FeatureJourneyMap 
          currentPlan={subscription.plan}
          userUsage={user.usage}
        />
      </div>
    </div>
  );
};

const SmartUpgradePrompt: React.FC<{
  moment: UpgradeMoment;
  onUpgrade: (plan: SubscriptionPlan) => void;
  onDismiss: () => void;
}> = ({ moment, onUpgrade, onDismiss }) => {
  const [showDetails, setShowDetails] = useState(false);
  const value = usePersonalizedValue(moment.recommendation.targetPlan);
  
  return (
    <div className={`upgrade-prompt ${moment.timing.priority}`}>
      <div className="prompt-header">
        <div className="urgency-indicator">
          <UrgencyIcon level={moment.urgency} />
        </div>
        <h3>{moment.presentation.title}</h3>
        <button className="dismiss-btn" onClick={onDismiss}>
          <CloseIcon />
        </button>
      </div>
      
      <div className="prompt-content">
        <p>{moment.presentation.message}</p>
        
        {value && (
          <div className="value-highlight">
            <span className="value-amount">
              每月为您节省 ¥{value.monthlyValue}
            </span>
            <span className="value-detail">
              基于您的使用模式计算
            </span>
          </div>
        )}
        
        <div className="key-benefits">
          {moment.recommendation.benefits.slice(0, 3).map(benefit => (
            <div key={benefit.key} className="benefit-item">
              <CheckIcon />
              <span>{benefit.description}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="prompt-actions">
        <Button 
          variant="primary" 
          size="large"
          onClick={() => onUpgrade(moment.recommendation.targetPlan)}
        >
          {moment.presentation.cta}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setShowDetails(!showDetails)}
        >
          查看详情
        </Button>
      </div>
      
      {showDetails && (
        <ExpandedUpgradeDetails 
          moment={moment}
          value={value}
          onUpgrade={onUpgrade}
        />
      )}
    </div>
  );
};
```

### 2. 功能预览界面
```typescript
const FeaturePreviewModal: React.FC<{
  feature: Feature;
  previewConfig: PreviewConfig;
  onStart: () => void;
  onClose: () => void;
}> = ({ feature, previewConfig, onStart, onClose }) => {
  return (
    <Modal size="large" onClose={onClose}>
      <div className="preview-modal">
        <div className="modal-header">
          <h2>体验 {feature.name}</h2>
          <PremiumBadge plan={feature.requiredPlan} />
        </div>
        
        <div className="preview-intro">
          <div className="feature-showcase">
            <FeatureVideo src={feature.demoVideo} />
          </div>
          
          <div className="preview-details">
            <h3>预览包含什么？</h3>
            <ul>
              {previewConfig.features.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            
            <div className="preview-limitations">
              <h4>预览限制</h4>
              <div className="limitation-tags">
                {previewConfig.limitations.map(limit => (
                  <Tag key={limit} variant="outline">
                    {limit}
                  </Tag>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-actions">
          <Button variant="primary" size="large" onClick={onStart}>
            开始 {previewConfig.duration} 体验
          </Button>
          <Button variant="text" onClick={onClose}>
            稍后再试
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const ActivePreviewIndicator: React.FC<{
  session: PreviewSession;
  onUpgrade: () => void;
  onEnd: () => void;
}> = ({ session, onUpgrade, onEnd }) => {
  const timeRemaining = useTimeRemaining(session.endTime);
  const { interactions, value } = usePreviewTracking(session.id);
  
  return (
    <div className="preview-indicator">
      <div className="preview-status">
        <div className="status-badge active">
          <PlayIcon />
          <span>体验中</span>
        </div>
        
        <div className="time-remaining">
          <ClockIcon />
          <span>{formatTimeRemaining(timeRemaining)}</span>
        </div>
      </div>
      
      <div className="preview-value">
        <span>已体验价值: ¥{value.experienced}</span>
        <span>完整版价值: ¥{value.full}</span>
      </div>
      
      <div className="preview-actions">
        <Button 
          variant="primary" 
          size="small"
          onClick={onUpgrade}
        >
          立即解锁完整版
        </Button>
        
        <Button 
          variant="outline" 
          size="small"
          onClick={onEnd}
        >
          结束体验
        </Button>
      </div>
      
      <div className="preview-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${(interactions.length / session.config.maxInteractions) * 100}%` 
            }}
          />
        </div>
        <span className="progress-text">
          已体验 {interactions.length}/{session.config.maxInteractions} 项功能
        </span>
      </div>
    </div>
  );
};
```

### 3. 价值可视化组件
```typescript
const ValueVisualization: React.FC<{
  currentPlan: SubscriptionPlan;
  targetPlan: SubscriptionPlan;
  personalizedValue: PersonalizedValue;
}> = ({ currentPlan, targetPlan, personalizedValue }) => {
  return (
    <div className="value-visualization">
      <div className="value-header">
        <h3>升级为您带来的价值</h3>
        <ConfidenceIndicator score={personalizedValue.confidenceScore} />
      </div>
      
      <div className="value-charts">
        <div className="monthly-impact">
          <h4>月度影响</h4>
          <ImpactChart data={personalizedValue.monthlyBreakdown} />
        </div>
        
        <div className="roi-projection">
          <h4>投资回报预测</h4>
          <ROIChart 
            investment={targetPlan.pricing.monthly}
            returns={personalizedValue.monthlyValue}
            period={12}
          />
        </div>
      </div>
      
      <div className="value-breakdown">
        <ValueBreakdownCard
          title="时间节省"
          value={personalizedValue.breakdown.timeSaved}
          unit="小时/月"
          description="自动化处理节省的时间"
        />
        
        <ValueBreakdownCard
          title="效率提升"
          value={personalizedValue.breakdown.efficiencyGain}
          unit="%"
          description="处理速度提升百分比"
        />
        
        <ValueBreakdownCard
          title="错误减少"
          value={personalizedValue.breakdown.errorReduction}
          unit="次/月"
          description="避免的手工纠错次数"
        />
      </div>
      
      <div className="payback-timeline">
        <h4>投资回收时间线</h4>
        <PaybackTimeline 
          investment={targetPlan.pricing.monthly}
          monthlyReturn={personalizedValue.monthlyValue}
        />
      </div>
    </div>
  );
};

const PaybackTimeline: React.FC<{
  investment: number;
  monthlyReturn: number;
}> = ({ investment, monthlyReturn }) => {
  const paybackMonths = Math.ceil(investment / monthlyReturn);
  const milestones = generatePaybackMilestones(investment, monthlyReturn, 12);
  
  return (
    <div className="payback-timeline">
      <div className="timeline-header">
        <span className="payback-period">
          投资回收期: {paybackMonths} 个月
        </span>
      </div>
      
      <div className="timeline-chart">
        {milestones.map((milestone, index) => (
          <div 
            key={index}
            className={`timeline-point ${milestone.type}`}
            style={{ left: `${(milestone.month / 12) * 100}%` }}
          >
            <div className="point-marker" />
            <div className="point-label">
              <span className="month">第{milestone.month}月</span>
              <span className="value">¥{milestone.cumulativeValue}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="timeline-axis">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="axis-label">
            {i + 1}月
          </div>
        ))}
      </div>
    </div>
  );
};
```

## 性能优化策略

### 1. 权限检查优化
- **多级缓存策略**：内存缓存 + Redis缓存 + 数据库
- **批量权限检查**：一次请求检查多个功能权限
- **权限预加载**：用户登录时预加载常用功能权限
- **异步权限更新**：权限变更异步更新缓存

### 2. 预览系统优化
- **预览数据预生成**：提前生成演示数据减少实时计算
- **会话状态管理**：高效的预览会话状态存储和检索
- **资源懒加载**：预览功能相关资源按需加载
- **预览结果缓存**：相似预览配置结果复用

### 3. 前端性能优化
- **组件代码分割**：升级相关组件按需加载
- **价值计算缓存**：个性化价值计算结果缓存
- **动画性能优化**：使用CSS动画和requestAnimationFrame
- **图表渲染优化**：大数据集图表虚拟化渲染