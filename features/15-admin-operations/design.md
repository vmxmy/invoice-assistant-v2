# 运营管理后台系统 - 设计文档

## 系统架构设计

### 整体架构图
```
运营管理后台系统
├── 认证授权层
│   ├── 管理员认证
│   ├── 角色权限管理
│   ├── 操作审计
│   └── 安全控制
├── 业务服务层
│   ├── 用户管理服务
│   ├── 数据分析服务
│   ├── 内容管理服务
│   ├── 客服管理服务
│   ├── 营销管理服务
│   └── 监控服务
├── 数据访问层
│   ├── 用户数据库
│   ├── 业务数据库
│   ├── 分析数据仓库
│   ├── 日志存储
│   └── 缓存系统
└── 前端展示层
    ├── 管理仪表板
    ├── 数据可视化
    ├── 操作界面
    └── 移动端支持
```

## 核心模块详细设计

### 1. 认证授权系统

#### 管理员认证架构
```typescript
interface AdminAuthSystem {
  // 多因素认证
  authenticate(credentials: AdminCredentials): Promise<AuthResult>;
  
  // 会话管理
  createSession(adminId: string): Promise<AdminSession>;
  
  // 权限验证
  hasPermission(adminId: string, permission: string): Promise<boolean>;
  
  // 角色管理
  assignRole(adminId: string, role: AdminRole): Promise<void>;
}

class EnhancedAdminAuth implements AdminAuthSystem {
  async authenticate(credentials: AdminCredentials): Promise<AuthResult> {
    // 1. 基础认证
    const basicAuth = await this.validateCredentials(credentials);
    if (!basicAuth.success) {
      await this.logFailedAttempt(credentials);
      return basicAuth;
    }
    
    // 2. 多因素认证
    if (this.requiresMFA(credentials.email)) {
      const mfaResult = await this.validateMFA(credentials);
      if (!mfaResult.success) {
        return mfaResult;
      }
    }
    
    // 3. IP白名单检查
    if (!await this.isAllowedIP(credentials.ipAddress)) {
      return {
        success: false,
        reason: 'ip_not_allowed',
        message: 'IP地址不在允许范围内'
      };
    }
    
    // 4. 时间窗口检查
    if (!this.isAllowedTime()) {
      return {
        success: false,
        reason: 'outside_allowed_time',
        message: '当前时间不允许登录'
      };
    }
    
    // 5. 创建会话
    const session = await this.createSecureSession(basicAuth.admin);
    await this.logSuccessfulLogin(basicAuth.admin);
    
    return {
      success: true,
      admin: basicAuth.admin,
      session,
      permissions: await this.getAdminPermissions(basicAuth.admin.id)
    };
  }
  
  private async createSecureSession(admin: AdminUser): Promise<AdminSession> {
    const session: AdminSession = {
      id: generateSecureId(),
      adminId: admin.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8小时
      ipAddress: this.getCurrentIP(),
      userAgent: this.getCurrentUserAgent(),
      permissions: await this.getAdminPermissions(admin.id),
      isActive: true
    };
    
    // 存储到Redis
    await this.redis.setex(
      `admin_session:${session.id}`, 
      8 * 60 * 60, 
      JSON.stringify(session)
    );
    
    return session;
  }
}
```

#### 权限控制系统
```typescript
class PermissionController {
  private permissionTree: PermissionNode;
  
  constructor() {
    this.buildPermissionTree();
  }
  
  async checkPermission(
    adminId: string, 
    resource: string, 
    action: string
  ): Promise<PermissionResult> {
    const admin = await this.getAdmin(adminId);
    const requiredPermission = `${resource}.${action}`;
    
    // 1. 检查角色权限
    const rolePermissions = this.getRolePermissions(admin.role);
    if (this.hasPermission(rolePermissions, requiredPermission)) {
      return { allowed: true, source: 'role' };
    }
    
    // 2. 检查个人权限
    const personalPermissions = admin.permissions || [];
    if (this.hasPermission(personalPermissions, requiredPermission)) {
      return { allowed: true, source: 'personal' };
    }
    
    // 3. 检查临时权限
    const temporaryPermissions = await this.getTemporaryPermissions(adminId);
    if (this.hasPermission(temporaryPermissions, requiredPermission)) {
      return { allowed: true, source: 'temporary' };
    }
    
    return { 
      allowed: false, 
      reason: 'insufficient_permissions',
      required: requiredPermission,
      available: [...rolePermissions, ...personalPermissions]
    };
  }
  
  private hasPermission(permissions: string[], required: string): boolean {
    // 支持通配符权限
    return permissions.some(perm => {
      if (perm === '*') return true;
      if (perm === required) return true;
      
      // 通配符匹配 (如 users.* 匹配 users.view, users.edit)
      const permPattern = perm.replace(/\*/g, '.*');
      const regex = new RegExp(`^${permPattern}$`);
      return regex.test(required);
    });
  }
  
  private buildPermissionTree(): void {
    this.permissionTree = {
      users: {
        view: 'user.view',
        edit: 'user.edit',
        delete: 'user.delete',
        segment: 'user.segment'
      },
      analytics: {
        view: 'analytics.view',
        export: 'analytics.export',
        create_report: 'analytics.create_report'
      },
      content: {
        view: 'content.view',
        edit: 'content.edit',
        publish: 'content.publish',
        delete: 'content.delete'
      },
      support: {
        view_tickets: 'support.view_tickets',
        manage_tickets: 'support.manage_tickets',
        access_user_data: 'support.access_user_data'
      },
      system: {
        monitor: 'system.monitor',
        configure: 'system.configure',
        backup: 'system.backup'
      }
    };
  }
}
```

### 2. 用户管理系统设计

#### 高级用户搜索
```typescript
class AdvancedUserSearch {
  async searchUsers(criteria: SearchCriteria): Promise<SearchResult<User>> {
    const queryBuilder = new QueryBuilder();
    
    // 构建基础查询
    let query = queryBuilder
      .from('users')
      .leftJoin('user_subscriptions', 'users.id', 'user_subscriptions.user_id')
      .leftJoin('user_activities', 'users.id', 'user_activities.user_id');
    
    // 应用搜索条件
    if (criteria.email) {
      query = query.where('users.email', 'ilike', `%${criteria.email}%`);
    }
    
    if (criteria.subscriptionStatus) {
      query = query.where('user_subscriptions.status', criteria.subscriptionStatus);
    }
    
    if (criteria.registrationDateRange) {
      query = query.whereBetween('users.created_at', [
        criteria.registrationDateRange.start,
        criteria.registrationDateRange.end
      ]);
    }
    
    if (criteria.lastActiveRange) {
      query = query.whereBetween('user_activities.last_active_at', [
        criteria.lastActiveRange.start,
        criteria.lastActiveRange.end
      ]);
    }
    
    if (criteria.usageRange) {
      const usageSubquery = this.db('user_feature_usage')
        .select('user_id')
        .sum('usage_count as total_usage')
        .groupBy('user_id')
        .havingBetween('total_usage', [
          criteria.usageRange.min,
          criteria.usageRange.max
        ]);
      
      query = query.whereIn('users.id', usageSubquery);
    }
    
    // 应用排序
    if (criteria.sortBy) {
      query = query.orderBy(criteria.sortBy, criteria.sortDirection || 'asc');
    }
    
    // 应用分页
    const total = await query.clone().count('* as count').first();
    const users = await query
      .offset(criteria.page * criteria.pageSize)
      .limit(criteria.pageSize)
      .select([
        'users.*',
        'user_subscriptions.plan_type',
        'user_subscriptions.status as subscription_status',
        this.db.raw('COUNT(user_activities.id) as total_activities')
      ])
      .groupBy('users.id', 'user_subscriptions.plan_type', 'user_subscriptions.status');
    
    return {
      users: await this.enrichUserData(users),
      total: total.count,
      page: criteria.page,
      pageSize: criteria.pageSize,
      totalPages: Math.ceil(total.count / criteria.pageSize)
    };
  }
  
  private async enrichUserData(users: any[]): Promise<EnrichedUser[]> {
    return Promise.all(users.map(async (user) => {
      const [recentActivity, usageStats, riskScore] = await Promise.all([
        this.getRecentActivity(user.id),
        this.getUsageStats(user.id),
        this.calculateRiskScore(user.id)
      ]);
      
      return {
        ...user,
        recentActivity,
        usageStats,
        riskScore,
        tags: await this.getUserTags(user.id),
        lifetime_value: await this.calculateLTV(user.id)
      };
    }));
  }
}
```

#### 用户分群系统
```typescript
class UserSegmentationSystem {
  private segmentEngine: SegmentationEngine;
  
  async createSegment(definition: SegmentDefinition): Promise<UserSegment> {
    // 验证分群规则
    this.validateSegmentRules(definition.criteria);
    
    // 计算分群用户
    const users = await this.calculateSegmentUsers(definition.criteria);
    
    // 创建分群记录
    const segment: UserSegment = {
      id: generateId(),
      name: definition.name,
      description: definition.description,
      criteria: definition.criteria,
      userCount: users.length,
      userIds: users.map(u => u.id),
      createdBy: definition.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
    
    await this.saveSegment(segment);
    
    // 设置自动更新
    if (definition.autoUpdate) {
      await this.scheduleSegmentUpdate(segment.id, definition.updateFrequency);
    }
    
    return segment;
  }
  
  async calculateSegmentUsers(criteria: SegmentCriteria): Promise<User[]> {
    const queryBuilder = this.createSegmentQuery(criteria);
    
    // 执行查询
    const users = await queryBuilder.execute();
    
    // 应用高级过滤
    return this.applyAdvancedFilters(users, criteria.advancedFilters);
  }
  
  private createSegmentQuery(criteria: SegmentCriteria): QueryBuilder {
    let query = this.db('users').select('*');
    
    // 基础条件
    for (const condition of criteria.conditions) {
      query = this.applyCondition(query, condition);
    }
    
    // 行为条件
    if (criteria.behaviorConditions) {
      query = this.applyBehaviorConditions(query, criteria.behaviorConditions);
    }
    
    // 时间窗口
    if (criteria.timeWindow) {
      query = this.applyTimeWindow(query, criteria.timeWindow);
    }
    
    return query;
  }
  
  private applyCondition(query: QueryBuilder, condition: SegmentCondition): QueryBuilder {
    switch (condition.operator) {
      case 'equals':
        return query.where(condition.field, condition.value);
      case 'not_equals':
        return query.whereNot(condition.field, condition.value);
      case 'greater_than':
        return query.where(condition.field, '>', condition.value);
      case 'less_than':
        return query.where(condition.field, '<', condition.value);
      case 'contains':
        return query.where(condition.field, 'ilike', `%${condition.value}%`);
      case 'in':
        return query.whereIn(condition.field, condition.value);
      case 'not_in':
        return query.whereNotIn(condition.field, condition.value);
      default:
        throw new Error(`Unsupported operator: ${condition.operator}`);
    }
  }
}
```

### 3. 数据分析系统设计

#### 实时数据处理
```typescript
class RealTimeAnalytics {
  private streamProcessor: StreamProcessor;
  private metricsCache: MetricsCache;
  
  constructor() {
    this.streamProcessor = new KafkaStreamProcessor();
    this.metricsCache = new RedisMetricsCache();
  }
  
  async processRealTimeEvent(event: AnalyticsEvent): Promise<void> {
    // 1. 事件验证和清洗
    const cleanedEvent = await this.validateAndCleanEvent(event);
    
    // 2. 实时指标更新
    await this.updateRealTimeMetrics(cleanedEvent);
    
    // 3. 触发器检查
    await this.checkTriggers(cleanedEvent);
    
    // 4. 流式聚合
    await this.updateStreamingAggregations(cleanedEvent);
  }
  
  private async updateRealTimeMetrics(event: AnalyticsEvent): Promise<void> {
    const metrics = this.extractMetrics(event);
    
    for (const metric of metrics) {
      // 更新计数器
      await this.metricsCache.increment(
        `metric:${metric.name}:${this.getTimeWindow()}`,
        metric.value
      );
      
      // 更新时间序列
      await this.metricsCache.addToTimeSeries(
        `timeseries:${metric.name}`,
        event.timestamp,
        metric.value
      );
      
      // 更新分维度指标
      for (const [dimension, value] of Object.entries(metric.dimensions || {})) {
        await this.metricsCache.increment(
          `metric:${metric.name}:${dimension}:${value}`,
          metric.value
        );
      }
    }
  }
  
  async getRealTimeMetrics(query: MetricsQuery): Promise<MetricsResult> {
    const cacheKey = this.generateCacheKey(query);
    
    // 尝试从缓存获取
    const cached = await this.metricsCache.get(cacheKey);
    if (cached && !this.isCacheExpired(cached)) {
      return cached.data;
    }
    
    // 计算实时指标
    const metrics = await this.calculateRealTimeMetrics(query);
    
    // 缓存结果
    await this.metricsCache.set(cacheKey, metrics, 60); // 缓存1分钟
    
    return metrics;
  }
  
  private async calculateRealTimeMetrics(query: MetricsQuery): Promise<MetricsResult> {
    const timeWindows = this.generateTimeWindows(query.timeRange);
    const results: MetricDataPoint[] = [];
    
    for (const window of timeWindows) {
      const windowData = await this.getWindowMetrics(query.metrics, window);
      results.push({
        timestamp: window.start,
        values: windowData
      });
    }
    
    return {
      metrics: query.metrics,
      timeRange: query.timeRange,
      data: results,
      lastUpdated: new Date()
    };
  }
}
```

#### 自定义报表引擎
```typescript
class CustomReportEngine {
  private queryOptimizer: QueryOptimizer;
  private cacheManager: ReportCacheManager;
  
  async generateReport(config: ReportConfig): Promise<ReportResult> {
    // 1. 验证报表配置
    this.validateReportConfig(config);
    
    // 2. 优化查询
    const optimizedQuery = await this.queryOptimizer.optimize(config.query);
    
    // 3. 检查缓存
    const cacheKey = this.generateReportCacheKey(config);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached && this.isCacheValid(cached, config.cachePolicy)) {
      return cached;
    }
    
    // 4. 执行数据查询
    const rawData = await this.executeDataQuery(optimizedQuery);
    
    // 5. 数据处理和聚合
    const processedData = await this.processReportData(rawData, config);
    
    // 6. 生成可视化
    const visualizations = await this.generateVisualizations(
      processedData, 
      config.visualizations
    );
    
    // 7. 构建报表结果
    const result: ReportResult = {
      id: generateId(),
      config,
      data: processedData,
      visualizations,
      metadata: {
        generatedAt: new Date(),
        rowCount: rawData.length,
        queryTime: optimizedQuery.executionTime,
        dataFreshness: await this.getDataFreshness(config.dataSources)
      }
    };
    
    // 8. 缓存结果
    await this.cacheManager.set(cacheKey, result, config.cachePolicy);
    
    return result;
  }
  
  private async processReportData(
    rawData: any[], 
    config: ReportConfig
  ): Promise<ProcessedReportData> {
    let data = rawData;
    
    // 应用过滤器
    if (config.filters) {
      data = this.applyFilters(data, config.filters);
    }
    
    // 数据聚合
    if (config.aggregations) {
      data = await this.performAggregations(data, config.aggregations);
    }
    
    // 数据变换
    if (config.transformations) {
      data = await this.applyTransformations(data, config.transformations);
    }
    
    // 排序
    if (config.sorting) {
      data = this.applySorting(data, config.sorting);
    }
    
    // 分页
    if (config.pagination) {
      const paginatedData = this.applyPagination(data, config.pagination);
      return {
        rows: paginatedData.rows,
        totalRows: data.length,
        page: config.pagination.page,
        pageSize: config.pagination.pageSize
      };
    }
    
    return {
      rows: data,
      totalRows: data.length
    };
  }
  
  async scheduleReport(
    config: ReportConfig, 
    schedule: ReportSchedule
  ): Promise<ScheduledReport> {
    const scheduledReport: ScheduledReport = {
      id: generateId(),
      config,
      schedule,
      status: 'active',
      nextRunTime: this.calculateNextRunTime(schedule),
      createdAt: new Date()
    };
    
    // 保存调度配置
    await this.saveScheduledReport(scheduledReport);
    
    // 创建定时任务
    await this.scheduleJob(scheduledReport);
    
    return scheduledReport;
  }
}
```

### 4. 客服管理系统设计

#### 智能工单分配
```typescript
class IntelligentTicketRouter {
  private mlModel: TicketClassificationModel;
  private agentMatcher: AgentMatchingEngine;
  
  async routeTicket(ticket: SupportTicket): Promise<TicketRoutingResult> {
    // 1. 工单分类
    const classification = await this.classifyTicket(ticket);
    
    // 2. 紧急程度评估
    const urgency = await this.assessUrgency(ticket, classification);
    
    // 3. 技能匹配
    const skillRequirements = this.extractSkillRequirements(classification);
    
    // 4. 代理人匹配
    const availableAgents = await this.getAvailableAgents();
    const matchedAgent = await this.findBestMatch(
      skillRequirements,
      availableAgents,
      urgency
    );
    
    // 5. 负载均衡
    const finalAgent = await this.applyLoadBalancing(matchedAgent, urgency);
    
    // 6. 分配工单
    await this.assignTicket(ticket.id, finalAgent.id);
    
    return {
      ticketId: ticket.id,
      assignedTo: finalAgent,
      classification,
      urgency,
      confidence: matchedAgent.confidence,
      estimatedResolutionTime: this.estimateResolutionTime(
        classification, 
        urgency, 
        finalAgent
      )
    };
  }
  
  private async classifyTicket(ticket: SupportTicket): Promise<TicketClassification> {
    // 使用ML模型分类
    const mlPrediction = await this.mlModel.classify({
      subject: ticket.subject,
      content: ticket.content,
      userTier: await this.getUserTier(ticket.userId),
      previousTickets: await this.getUserTicketHistory(ticket.userId)
    });
    
    // 规则引擎补充
    const ruleBasedClassification = this.applyClassificationRules(ticket);
    
    // 合并结果
    return this.mergeClassifications(mlPrediction, ruleBasedClassification);
  }
  
  private async findBestMatch(
    requirements: SkillRequirement[],
    agents: Agent[],
    urgency: TicketUrgency
  ): Promise<AgentMatch> {
    const matches: AgentMatch[] = [];
    
    for (const agent of agents) {
      const match = await this.calculateAgentMatch(agent, requirements, urgency);
      if (match.score > 0.6) { // 最低匹配阈值
        matches.push(match);
      }
    }
    
    // 按匹配分数排序
    matches.sort((a, b) => b.score - a.score);
    
    return matches[0] || this.getFallbackAgent();
  }
  
  private async calculateAgentMatch(
    agent: Agent,
    requirements: SkillRequirement[],
    urgency: TicketUrgency
  ): Promise<AgentMatch> {
    let score = 0;
    const details: MatchDetail[] = [];
    
    // 技能匹配评分
    for (const requirement of requirements) {
      const agentSkill = agent.skills.find(s => s.name === requirement.skill);
      if (agentSkill) {
        const skillScore = Math.min(agentSkill.level / requirement.minimumLevel, 1);
        score += skillScore * requirement.weight;
        details.push({
          factor: 'skill',
          skill: requirement.skill,
          score: skillScore,
          weight: requirement.weight
        });
      }
    }
    
    // 工作负载评分
    const currentWorkload = await this.getAgentWorkload(agent.id);
    const workloadScore = Math.max(0, 1 - (currentWorkload / agent.maxCapacity));
    score += workloadScore * 0.3;
    
    // 历史表现评分
    const performanceScore = await this.getAgentPerformanceScore(agent.id);
    score += performanceScore * 0.2;
    
    // 紧急工单优先级调整
    if (urgency === TicketUrgency.URGENT && agent.canHandleUrgent) {
      score *= 1.2;
    }
    
    return {
      agent,
      score,
      confidence: this.calculateConfidence(details),
      details
    };
  }
}
```

#### 知识库智能检索
```typescript
class IntelligentKnowledgeBase {
  private searchEngine: ElasticsearchClient;
  private nlpProcessor: NLPProcessor;
  
  async searchKnowledge(query: KnowledgeQuery): Promise<KnowledgeResult[]> {
    // 1. 查询意图识别
    const intent = await this.identifyQueryIntent(query.text);
    
    // 2. 实体提取
    const entities = await this.extractEntities(query.text);
    
    // 3. 查询扩展
    const expandedQuery = await this.expandQuery(query.text, intent, entities);
    
    // 4. 多策略搜索
    const [
      semanticResults,
      keywordResults,
      categoryResults
    ] = await Promise.all([
      this.semanticSearch(expandedQuery),
      this.keywordSearch(expandedQuery),
      this.categorySearch(intent, entities)
    ]);
    
    // 5. 结果融合和排序
    const mergedResults = this.mergeAndRankResults([
      ...semanticResults,
      ...keywordResults,
      ...categoryResults
    ]);
    
    // 6. 个性化调整
    const personalizedResults = await this.personalizeResults(
      mergedResults,
      query.context
    );
    
    return personalizedResults;
  }
  
  async suggestAnswers(ticket: SupportTicket): Promise<SuggestedAnswer[]> {
    // 分析工单内容
    const analysis = await this.analyzeTicketContent(ticket);
    
    // 搜索相关知识
    const knowledgeResults = await this.searchKnowledge({
      text: `${ticket.subject} ${ticket.content}`,
      context: {
        ticketType: analysis.type,
        userSegment: await this.getUserSegment(ticket.userId),
        previousTickets: await this.getUserTicketHistory(ticket.userId, 5)
      }
    });
    
    // 生成建议答案
    const suggestions: SuggestedAnswer[] = [];
    
    for (const knowledge of knowledgeResults.slice(0, 3)) {
      const answer = await this.generateAnswerFromKnowledge(
        ticket,
        knowledge,
        analysis
      );
      
      suggestions.push({
        id: generateId(),
        content: answer.content,
        confidence: answer.confidence,
        sources: [knowledge],
        tags: answer.tags,
        estimatedAccuracy: await this.estimateAnswerAccuracy(answer, ticket)
      });
    }
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
  
  private async generateAnswerFromKnowledge(
    ticket: SupportTicket,
    knowledge: KnowledgeItem,
    analysis: TicketAnalysis
  ): Promise<GeneratedAnswer> {
    // 使用模板生成答案
    const template = await this.selectAnswerTemplate(analysis.type);
    
    // 填充模板变量
    const variables = {
      userName: await this.getUserName(ticket.userId),
      issue: analysis.extractedIssue,
      solution: knowledge.solution,
      steps: knowledge.steps,
      relatedLinks: knowledge.relatedLinks
    };
    
    const content = this.fillTemplate(template, variables);
    
    // 计算置信度
    const confidence = this.calculateAnswerConfidence(
      knowledge.accuracy,
      analysis.clarity,
      template.effectiveness
    );
    
    return {
      content,
      confidence,
      tags: [...analysis.tags, ...knowledge.tags],
      template: template.id
    };
  }
}
```

## 前端界面设计

### 1. 管理仪表板
```typescript
const AdminDashboard: React.FC = () => {
  const { metrics, loading } = useRealTimeMetrics();
  const { alerts } = useSystemAlerts();
  const { recentActivity } = useRecentActivity();
  
  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>运营管理后台</h1>
        <div className="header-actions">
          <NotificationCenter alerts={alerts} />
          <AdminProfileMenu />
        </div>
      </div>
      
      <div className="dashboard-grid">
        <div className="metrics-overview">
          <MetricsGrid metrics={metrics} loading={loading} />
        </div>
        
        <div className="quick-actions">
          <QuickActionPanel />
        </div>
        
        <div className="recent-activity">
          <ActivityFeed activities={recentActivity} />
        </div>
        
        <div className="system-health">
          <SystemHealthIndicator />
        </div>
      </div>
      
      <div className="dashboard-charts">
        <div className="revenue-chart">
          <RevenueChart timeRange="30days" />
        </div>
        
        <div className="user-growth-chart">
          <UserGrowthChart timeRange="30days" />
        </div>
      </div>
    </div>
  );
};

const MetricsGrid: React.FC<{
  metrics: BusinessMetrics;
  loading: boolean;
}> = ({ metrics, loading }) => {
  return (
    <div className="metrics-grid">
      <MetricCard
        title="月度收入"
        value={metrics.revenue.mrr}
        format="currency"
        trend={metrics.revenue.growth_rate}
        loading={loading}
      />
      
      <MetricCard
        title="活跃用户"
        value={metrics.users.active_users}
        format="number"
        comparison={{
          value: metrics.users.total_users,
          label: "总用户数"
        }}
        loading={loading}
      />
      
      <MetricCard
        title="转化率"
        value={metrics.users.conversion_rate}
        format="percentage"
        trend={0.15} // 15%增长
        loading={loading}
      />
      
      <MetricCard
        title="流失率"
        value={metrics.revenue.churn_rate}
        format="percentage"
        trend={-0.08} // 8%下降
        trendType="inverse" // 流失率下降是好事
        loading={loading}
      />
    </div>
  );
};
```

### 2. 用户管理界面
```typescript
const UserManagement: React.FC = () => {
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({});
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { users, loading, pagination } = useUserSearch(searchCriteria);
  
  return (
    <div className="user-management">
      <div className="page-header">
        <h1>用户管理</h1>
        <div className="header-actions">
          <Button
            variant="primary"
            onClick={() => exportUsers(selectedUsers)}
            disabled={selectedUsers.length === 0}
          >
            导出选中用户
          </Button>
          <BatchActionMenu 
            selectedUsers={selectedUsers}
            onAction={handleBatchAction}
          />
        </div>
      </div>
      
      <div className="search-section">
        <AdvancedUserSearch
          criteria={searchCriteria}
          onChange={setSearchCriteria}
        />
      </div>
      
      <div className="user-list">
        <UserTable
          users={users}
          loading={loading}
          selectedUsers={selectedUsers}
          onSelectionChange={setSelectedUsers}
          pagination={pagination}
        />
      </div>
      
      <UserSegmentationPanel />
    </div>
  );
};

const AdvancedUserSearch: React.FC<{
  criteria: SearchCriteria;
  onChange: (criteria: SearchCriteria) => void;
}> = ({ criteria, onChange }) => {
  return (
    <div className="advanced-search">
      <div className="search-row">
        <SearchInput
          placeholder="搜索邮箱或姓名"
          value={criteria.query || ''}
          onChange={(query) => onChange({ ...criteria, query })}
        />
        
        <Select
          placeholder="订阅状态"
          value={criteria.subscriptionStatus}
          onChange={(status) => onChange({ ...criteria, subscriptionStatus: status })}
          options={[
            { value: 'active', label: '活跃' },
            { value: 'cancelled', label: '已取消' },
            { value: 'trial', label: '试用中' }
          ]}
        />
        
        <DateRangePicker
          placeholder="注册时间"
          value={criteria.registrationDateRange}
          onChange={(range) => onChange({ ...criteria, registrationDateRange: range })}
        />
      </div>
      
      <div className="search-row">
        <NumberRangeInput
          placeholder="使用量范围"
          value={criteria.usageRange}
          onChange={(range) => onChange({ ...criteria, usageRange: range })}
        />
        
        <Select
          placeholder="用户标签"
          multiple
          value={criteria.tags}
          onChange={(tags) => onChange({ ...criteria, tags })}
          options={availableTags}
        />
        
        <Button variant="outline" onClick={() => onChange({})}>
          重置筛选
        </Button>
      </div>
    </div>
  );
};
```

### 3. 数据可视化组件
```typescript
const ReportBuilder: React.FC = () => {
  const [config, setConfig] = useState<ReportConfig>({
    name: '',
    dataSources: [],
    dimensions: [],
    metrics: [],
    filters: [],
    visualizations: []
  });
  
  const [preview, setPreview] = useState<ReportResult | null>(null);
  const { generateReport, loading } = useReportGeneration();
  
  const handlePreview = async () => {
    const result = await generateReport(config);
    setPreview(result);
  };
  
  return (
    <div className="report-builder">
      <div className="builder-sidebar">
        <div className="config-section">
          <h3>数据源</h3>
          <DataSourceSelector
            selected={config.dataSources}
            onChange={(sources) => setConfig({
              ...config,
              dataSources: sources
            })}
          />
        </div>
        
        <div className="config-section">
          <h3>维度</h3>
          <DimensionSelector
            available={getAvailableDimensions(config.dataSources)}
            selected={config.dimensions}
            onChange={(dimensions) => setConfig({
              ...config,
              dimensions
            })}
          />
        </div>
        
        <div className="config-section">
          <h3>指标</h3>
          <MetricSelector
            available={getAvailableMetrics(config.dataSources)}
            selected={config.metrics}
            onChange={(metrics) => setConfig({
              ...config,
              metrics
            })}
          />
        </div>
        
        <div className="config-section">
          <h3>过滤器</h3>
          <FilterBuilder
            filters={config.filters}
            onChange={(filters) => setConfig({
              ...config,
              filters
            })}
          />
        </div>
        
        <div className="config-actions">
          <Button
            variant="outline"
            onClick={handlePreview}
            loading={loading}
          >
            预览报表
          </Button>
          
          <Button
            variant="primary"
            onClick={() => saveReport(config)}
          >
            保存报表
          </Button>
        </div>
      </div>
      
      <div className="builder-main">
        {preview ? (
          <ReportPreview report={preview} />
        ) : (
          <div className="empty-state">
            <EmptyStateIcon />
            <p>配置报表参数后点击预览</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ReportPreview: React.FC<{ report: ReportResult }> = ({ report }) => {
  return (
    <div className="report-preview">
      <div className="report-header">
        <h2>{report.config.name}</h2>
        <div className="report-metadata">
          <span>生成时间: {formatDateTime(report.metadata.generatedAt)}</span>
          <span>数据条数: {report.metadata.rowCount}</span>
          <span>查询耗时: {report.metadata.queryTime}ms</span>
        </div>
      </div>
      
      <div className="report-content">
        {report.visualizations.map((viz, index) => (
          <div key={index} className="visualization-container">
            <ChartRenderer
              type={viz.type}
              data={viz.data}
              config={viz.config}
            />
          </div>
        ))}
        
        <div className="data-table">
          <DataTable
            data={report.data.rows}
            columns={report.config.dimensions.concat(report.config.metrics)}
            pagination={true}
          />
        </div>
      </div>
    </div>
  );
};
```

## 性能优化策略

### 1. 数据查询优化
- **查询缓存**：常用查询结果Redis缓存
- **索引优化**：针对管理后台查询模式优化数据库索引
- **分页优化**：大数据集分页查询优化
- **异步处理**：耗时操作异步处理，实时反馈进度

### 2. 前端性能优化
- **代码分割**：管理后台功能模块按需加载
- **虚拟滚动**：大数据列表虚拟滚动
- **图表优化**：大数据量图表渲染优化
- **状态管理**：全局状态合理分片和缓存

### 3. 安全性保障
- **权限验证**：每个操作严格权限验证
- **操作审计**：所有敏感操作详细审计记录
- **数据脱敏**：敏感数据展示脱敏处理
- **访问限制**：IP白名单、时间窗口限制