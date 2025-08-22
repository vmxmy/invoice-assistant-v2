# 用户留存与参与功能 - 设计文档

## 系统架构设计

### 整体架构图
```
用户留存与参与系统
├── 行为分析引擎
│   ├── 数据收集层
│   ├── 实时分析处理
│   ├── 用户分群算法
│   └── 预测模型
├── 智能推送系统
│   ├── 触发规则引擎
│   ├── 内容个性化
│   ├── 多渠道发送
│   └── 效果追踪
├── 成就激励系统
│   ├── 成就解锁引擎
│   ├── 积分计算系统
│   ├── 等级晋升逻辑
│   └── 奖励发放机制
└── 社交互动平台
    ├── 动态发布系统
    ├── 社区互动功能
    ├── 反馈收集处理
    └── 满意度调研
```

## 核心模块设计

### 1. 用户行为分析引擎

#### 数据收集架构
```typescript
interface EventTracker {
  track(event: UserEvent): Promise<void>;
  batchTrack(events: UserEvent[]): Promise<void>;
  setUserContext(userId: string, context: UserContext): void;
}

interface UserEvent {
  userId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: number;
  sessionId: string;
  deviceInfo: DeviceInfo;
  pageInfo?: PageInfo;
}

// 事件类型定义
enum EventType {
  PAGE_VIEW = 'page_view',
  FEATURE_USE = 'feature_use',
  INVOICE_PROCESS = 'invoice_process',
  SEARCH_PERFORM = 'search_perform',
  EXPORT_DATA = 'export_data',
  SETTING_CHANGE = 'setting_change',
  ERROR_ENCOUNTER = 'error_encounter'
}

// 实时事件处理
class RealTimeAnalyzer {
  async processEvent(event: UserEvent): Promise<void> {
    // 1. 实时更新用户活跃状态
    await this.updateUserActivity(event.userId, event.timestamp);
    
    // 2. 检查是否触发成就
    await this.checkAchievementTriggers(event);
    
    // 3. 检查推送触发条件
    await this.checkPushTriggers(event);
    
    // 4. 更新用户分群
    await this.updateUserSegmentation(event.userId);
  }
  
  private async checkAchievementTriggers(event: UserEvent): Promise<void> {
    const achievements = await this.getTriggeredAchievements(event);
    for (const achievement of achievements) {
      await this.unlockAchievement(event.userId, achievement.id);
    }
  }
}
```

#### 用户分群算法
```typescript
class UserSegmentationEngine {
  async segmentUsers(): Promise<void> {
    const users = await this.getAllUsers();
    
    for (const user of users) {
      const segment = await this.calculateUserSegment(user);
      await this.updateUserSegment(user.id, segment);
    }
  }
  
  private async calculateUserSegment(user: User): Promise<UserSegment> {
    const activity = await this.getUserActivity(user.id, 30); // 30天内活动
    const subscription = await this.getUserSubscription(user.id);
    const usage = await this.getUserUsage(user.id);
    
    // 分群逻辑
    if (this.isNewUser(user)) {
      return this.getNewUserSegment(user, activity);
    } else if (this.isPowerUser(usage)) {
      return SegmentType.POWER_USERS;
    } else if (this.isAtRisk(activity)) {
      return SegmentType.AT_RISK_USERS;
    } else if (this.isDormant(activity)) {
      return SegmentType.DORMANT_USERS;
    }
    
    return SegmentType.ACTIVE_USERS;
  }
  
  private isNewUser(user: User): boolean {
    const daysSinceRegistration = this.daysBetween(user.createdAt, new Date());
    return daysSinceRegistration <= 7;
  }
  
  private isPowerUser(usage: UserUsage): boolean {
    return usage.monthlyInvoiceCount > 50 && 
           usage.featureUsageCount > 10 &&
           usage.sessionCount > 20;
  }
  
  private isAtRisk(activity: UserActivity): boolean {
    const lastActiveDate = activity.lastActiveAt;
    const daysSinceActive = this.daysBetween(lastActiveDate, new Date());
    return daysSinceActive >= 7 && daysSinceActive < 30;
  }
}
```

### 2. 智能推送系统设计

#### 推送触发引擎
```typescript
class PushTriggerEngine {
  private triggers: Map<string, PushTrigger> = new Map();
  
  async initializeTriggers(): Promise<void> {
    // 用户激活序列
    this.triggers.set('user_activation', {
      name: '用户激活序列',
      conditions: [
        { type: 'time_since_registration', operator: 'equals', value: '1 day' },
        { type: 'invoice_processed_count', operator: 'equals', value: 0 }
      ],
      actions: [
        {
          type: 'send_email',
          template: 'activation_day1',
          delay: '1 hour'
        }
      ]
    });
    
    // 功能发现推送
    this.triggers.set('feature_discovery', {
      name: '功能发现推送',
      conditions: [
        { type: 'days_since_last_login', operator: 'equals', value: 3 },
        { type: 'unused_features', operator: 'greater_than', value: 2 }
      ],
      actions: [
        {
          type: 'send_push_notification',
          template: 'feature_discovery',
          delay: '0'
        }
      ]
    });
  }
  
  async evaluateTriggers(userId: string): Promise<void> {
    const userContext = await this.getUserContext(userId);
    
    for (const [triggerKey, trigger] of this.triggers) {
      if (await this.shouldTrigger(userContext, trigger)) {
        await this.executeTriggerActions(userId, trigger);
      }
    }
  }
  
  private async shouldTrigger(
    context: UserContext, 
    trigger: PushTrigger
  ): Promise<boolean> {
    for (const condition of trigger.conditions) {
      if (!await this.evaluateCondition(context, condition)) {
        return false;
      }
    }
    return true;
  }
}
```

#### 个性化内容生成
```typescript
class PersonalizationEngine {
  async generatePersonalizedContent(
    userId: string, 
    templateType: string
  ): Promise<PersonalizedContent> {
    const userProfile = await this.getUserProfile(userId);
    const userBehavior = await this.getUserBehavior(userId);
    const preferences = await this.getUserPreferences(userId);
    
    switch (templateType) {
      case 'weekly_summary':
        return this.generateWeeklySummary(userProfile, userBehavior);
      
      case 'feature_recommendation':
        return this.generateFeatureRecommendation(userBehavior, preferences);
      
      case 'achievement_notification':
        return this.generateAchievementContent(userProfile);
        
      default:
        return this.generateDefaultContent(templateType);
    }
  }
  
  private async generateWeeklySummary(
    profile: UserProfile, 
    behavior: UserBehavior
  ): Promise<PersonalizedContent> {
    const weeklyStats = await this.calculateWeeklyStats(profile.userId);
    
    return {
      subject: `${profile.firstName}，您的本周发票处理报告`,
      content: {
        greeting: `Hi ${profile.firstName}`,
        stats: {
          processedCount: weeklyStats.invoicesProcessed,
          timesSaved: weeklyStats.timeSaved,
          topCategory: weeklyStats.topCategory
        },
        recommendations: await this.getWeeklyRecommendations(behavior),
        nextSteps: await this.getNextStepSuggestions(profile.userId)
      }
    };
  }
}
```

### 3. 成就激励系统设计

#### 成就解锁引擎
```typescript
class AchievementEngine {
  private achievements: Map<string, Achievement> = new Map();
  
  async initializeAchievements(): Promise<void> {
    // 加载所有成就配置
    const achievementConfigs = await this.loadAchievementConfigs();
    
    for (const config of achievementConfigs) {
      this.achievements.set(config.id, {
        ...config,
        unlockLogic: this.createUnlockLogic(config.requirements)
      });
    }
  }
  
  async checkUserAchievements(userId: string): Promise<Achievement[]> {
    const unlockedAchievements: Achievement[] = [];
    const userStats = await this.getUserStats(userId);
    
    for (const [achievementId, achievement] of this.achievements) {
      if (await this.isAlreadyUnlocked(userId, achievementId)) {
        continue;
      }
      
      if (await achievement.unlockLogic(userStats)) {
        await this.unlockAchievement(userId, achievement);
        unlockedAchievements.push(achievement);
      }
    }
    
    return unlockedAchievements;
  }
  
  private createUnlockLogic(requirements: Requirement[]): UnlockLogic {
    return async (userStats: UserStats): Promise<boolean> => {
      for (const requirement of requirements) {
        if (!await this.checkRequirement(userStats, requirement)) {
          return false;
        }
      }
      return true;
    };
  }
  
  private async checkRequirement(
    stats: UserStats, 
    requirement: Requirement
  ): Promise<boolean> {
    const value = stats[requirement.statKey];
    
    switch (requirement.operator) {
      case 'greater_than':
        return value > requirement.value;
      case 'greater_than_or_equal':
        return value >= requirement.value;
      case 'equals':
        return value === requirement.value;
      case 'contains':
        return Array.isArray(value) && value.includes(requirement.value);
      default:
        return false;
    }
  }
}
```

#### 积分与等级系统
```typescript
class PointsAndLevelSystem {
  async awardPoints(
    userId: string, 
    action: string, 
    context?: any
  ): Promise<PointsResult> {
    const pointsRule = await this.getPointsRule(action);
    if (!pointsRule) {
      return { success: false, reason: 'No points rule found' };
    }
    
    // 检查每日限制
    if (await this.isDailyLimitReached(userId, action, pointsRule.dailyLimit)) {
      return { success: false, reason: 'Daily limit reached' };
    }
    
    // 计算积分
    const points = await this.calculatePoints(pointsRule, context);
    
    // 更新用户积分
    await this.updateUserPoints(userId, points);
    
    // 检查等级升级
    const levelUp = await this.checkLevelUp(userId);
    
    // 记录积分历史
    await this.recordPointsHistory(userId, action, points);
    
    return {
      success: true,
      pointsAwarded: points,
      totalPoints: await this.getTotalPoints(userId),
      levelUp
    };
  }
  
  private async checkLevelUp(userId: string): Promise<LevelUpResult | null> {
    const currentLevel = await this.getCurrentLevel(userId);
    const totalPoints = await this.getTotalPoints(userId);
    const nextLevel = await this.getNextLevel(currentLevel.level);
    
    if (totalPoints >= nextLevel.minPoints) {
      await this.updateUserLevel(userId, nextLevel.level);
      await this.grantLevelRewards(userId, nextLevel.benefits);
      
      return {
        newLevel: nextLevel.level,
        newTitle: nextLevel.title,
        rewards: nextLevel.benefits
      };
    }
    
    return null;
  }
  
  async generateLeaderboard(
    period: 'weekly' | 'monthly' | 'all_time',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const dateRange = this.getDateRange(period);
    
    const query = `
      SELECT 
        u.id,
        u.email,
        up.total_points,
        up.level,
        RANK() OVER (ORDER BY up.total_points DESC) as rank
      FROM user_points up
      JOIN auth.users u ON up.user_id = u.id
      WHERE up.last_activity_at >= $1
      ORDER BY up.total_points DESC
      LIMIT $2
    `;
    
    const results = await this.db.query(query, [dateRange.start, limit]);
    
    return results.rows.map(row => ({
      userId: row.id,
      email: row.email,
      points: row.total_points,
      level: row.level,
      rank: row.rank
    }));
  }
}
```

### 4. 社交互动系统设计

#### 用户动态系统
```typescript
class ActivityFeedSystem {
  async createActivity(
    userId: string, 
    activity: ActivityData
  ): Promise<Activity> {
    const activityRecord = {
      id: generateId(),
      userId,
      type: activity.type,
      data: activity.data,
      timestamp: new Date(),
      visibility: activity.visibility || 'public'
    };
    
    await this.saveActivity(activityRecord);
    
    // 通知关注者
    if (activityRecord.visibility === 'public') {
      await this.notifyFollowers(userId, activityRecord);
    }
    
    return activityRecord;
  }
  
  async getUserFeed(
    userId: string, 
    options: FeedOptions = {}
  ): Promise<Activity[]> {
    const { limit = 20, offset = 0, types = [] } = options;
    
    // 获取用户关注的人的动态
    const followingUserIds = await this.getFollowingUserIds(userId);
    followingUserIds.push(userId); // 包含自己的动态
    
    const query = `
      SELECT a.*, u.email as user_email
      FROM activities a
      JOIN auth.users u ON a.user_id = u.id
      WHERE a.user_id = ANY($1)
        AND ($2::text[] IS NULL OR a.type = ANY($2))
        AND a.visibility = 'public'
      ORDER BY a.timestamp DESC
      LIMIT $3 OFFSET $4
    `;
    
    const results = await this.db.query(query, [
      followingUserIds, 
      types.length > 0 ? types : null, 
      limit, 
      offset
    ]);
    
    return results.rows;
  }
  
  async likeActivity(userId: string, activityId: string): Promise<void> {
    // 检查是否已经点赞
    const existingLike = await this.getLike(userId, activityId);
    if (existingLike) {
      return;
    }
    
    // 创建点赞记录
    await this.createLike(userId, activityId);
    
    // 更新活动的点赞数
    await this.incrementLikeCount(activityId);
    
    // 通知活动创建者
    const activity = await this.getActivity(activityId);
    if (activity.userId !== userId) {
      await this.notifyActivityCreator(activity.userId, {
        type: 'like',
        fromUserId: userId,
        activityId
      });
    }
  }
}
```

#### 反馈收集系统
```typescript
class FeedbackSystem {
  async collectFeedback(feedback: FeedbackData): Promise<Feedback> {
    const feedbackRecord = {
      id: generateId(),
      userId: feedback.userId,
      type: feedback.type,
      category: feedback.category,
      rating: feedback.rating,
      content: feedback.content,
      metadata: feedback.metadata,
      timestamp: new Date(),
      status: 'new'
    };
    
    await this.saveFeedback(feedbackRecord);
    
    // 触发自动分类
    await this.categorizeFeedback(feedbackRecord);
    
    // 高优先级反馈立即通知
    if (feedback.rating <= 2 || feedback.category === 'bug') {
      await this.notifySupport(feedbackRecord);
    }
    
    return feedbackRecord;
  }
  
  async analyzeFeedbackTrends(): Promise<FeedbackAnalysis> {
    const [
      ratingTrends,
      categoryDistribution,
      sentimentAnalysis,
      commonIssues
    ] = await Promise.all([
      this.getRatingTrends(),
      this.getCategoryDistribution(),
      this.performSentimentAnalysis(),
      this.identifyCommonIssues()
    ]);
    
    return {
      ratingTrends,
      categoryDistribution,
      sentimentAnalysis,
      commonIssues,
      npsScore: await this.calculateNPS(),
      satisfactionScore: await this.calculateSatisfactionScore()
    };
  }
  
  private async performSentimentAnalysis(): Promise<SentimentAnalysis> {
    const recentFeedback = await this.getRecentFeedback(30); // 30天内
    
    const sentiments = await Promise.all(
      recentFeedback.map(async (feedback) => {
        if (!feedback.content) return null;
        
        const sentiment = await this.analyzeSentiment(feedback.content);
        return {
          feedbackId: feedback.id,
          sentiment: sentiment.label,
          confidence: sentiment.confidence
        };
      })
    );
    
    const validSentiments = sentiments.filter(s => s !== null);
    
    return {
      positive: validSentiments.filter(s => s.sentiment === 'positive').length,
      negative: validSentiments.filter(s => s.sentiment === 'negative').length,
      neutral: validSentiments.filter(s => s.sentiment === 'neutral').length,
      totalAnalyzed: validSentiments.length
    };
  }
}
```

## 前端用户界面设计

### 1. 用户成就展示
```typescript
const AchievementCenter: React.FC = () => {
  const { achievements, userPoints, userLevel } = useAchievements();
  
  return (
    <div className="achievement-center">
      <div className="user-level-section">
        <LevelProgress 
          currentLevel={userLevel.level}
          currentPoints={userPoints.total}
          nextLevelPoints={userLevel.nextLevelPoints}
        />
      </div>
      
      <div className="achievements-grid">
        {achievements.map(achievement => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            isUnlocked={achievement.unlockedAt != null}
          />
        ))}
      </div>
      
      <div className="leaderboard-section">
        <Leaderboard period="monthly" />
      </div>
    </div>
  );
};

const AchievementCard: React.FC<{ 
  achievement: Achievement; 
  isUnlocked: boolean 
}> = ({ achievement, isUnlocked }) => {
  return (
    <div className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
      <div className="achievement-icon">
        <img 
          src={achievement.icon} 
          alt={achievement.name}
          className={!isUnlocked ? 'grayscale' : ''}
        />
        {achievement.rarity === 'legendary' && (
          <div className="rarity-glow legendary" />
        )}
      </div>
      
      <div className="achievement-info">
        <h3>{achievement.name}</h3>
        <p>{achievement.description}</p>
        
        {isUnlocked ? (
          <div className="unlock-date">
            {formatDate(achievement.unlockedAt)}
          </div>
        ) : (
          <div className="progress-info">
            <AchievementProgress achievement={achievement} />
          </div>
        )}
      </div>
    </div>
  );
};
```

### 2. 个性化推荐面板
```typescript
const PersonalizedRecommendations: React.FC = () => {
  const { recommendations } = useRecommendations();
  
  return (
    <div className="recommendations-panel">
      <div className="panel-header">
        <h2>为您推荐</h2>
        <button className="refresh-btn" onClick={refreshRecommendations}>
          <RefreshIcon />
        </button>
      </div>
      
      <div className="recommendations-list">
        {recommendations.map(rec => (
          <RecommendationCard key={rec.id} recommendation={rec} />
        ))}
      </div>
    </div>
  );
};

const RecommendationCard: React.FC<{
  recommendation: Recommendation
}> = ({ recommendation }) => {
  const handleAction = () => {
    // 执行推荐操作
    recommendation.action();
    
    // 记录用户交互
    trackEvent('recommendation_clicked', {
      recommendationId: recommendation.id,
      type: recommendation.type
    });
  };
  
  return (
    <div className="recommendation-card">
      <div className="recommendation-content">
        <div className="recommendation-icon">
          <Icon name={recommendation.icon} />
        </div>
        
        <div className="recommendation-text">
          <h4>{recommendation.title}</h4>
          <p>{recommendation.description}</p>
          
          <div className="recommendation-meta">
            <span className="impact-badge">{recommendation.impact}</span>
            <span className="effort-badge">{recommendation.effort}</span>
          </div>
        </div>
      </div>
      
      <div className="recommendation-actions">
        <button 
          className="action-btn primary" 
          onClick={handleAction}
        >
          {recommendation.actionText}
        </button>
        
        <button 
          className="action-btn secondary" 
          onClick={() => dismissRecommendation(recommendation.id)}
        >
          稍后再说
        </button>
      </div>
    </div>
  );
};
```

### 3. 用户活动时间线
```typescript
const ActivityTimeline: React.FC = () => {
  const { activities, loading } = useActivityFeed();
  
  return (
    <div className="activity-timeline">
      <div className="timeline-header">
        <h2>最近动态</h2>
        <ActivityFilters />
      </div>
      
      <div className="timeline-content">
        {loading ? (
          <TimelineSkeletonLoader />
        ) : (
          <InfiniteScroll
            dataLength={activities.length}
            next={loadMoreActivities}
            hasMore={true}
            loader={<div>加载中...</div>}
          >
            {activities.map(activity => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </InfiniteScroll>
        )}
      </div>
    </div>
  );
};

const ActivityItem: React.FC<{ activity: Activity }> = ({ activity }) => {
  return (
    <div className="activity-item">
      <div className="activity-avatar">
        <UserAvatar userId={activity.userId} />
      </div>
      
      <div className="activity-content">
        <div className="activity-header">
          <span className="user-name">{activity.userName}</span>
          <span className="activity-type">{getActivityTypeText(activity.type)}</span>
          <span className="activity-time">{formatRelativeTime(activity.timestamp)}</span>
        </div>
        
        <div className="activity-body">
          <ActivityContentRenderer activity={activity} />
        </div>
        
        <div className="activity-actions">
          <LikeButton 
            activityId={activity.id} 
            isLiked={activity.isLiked}
            likeCount={activity.likeCount}
          />
          <CommentButton 
            activityId={activity.id}
            commentCount={activity.commentCount}
          />
        </div>
      </div>
    </div>
  );
};
```

## 性能优化策略

### 1. 数据处理优化
- **批量数据处理**：使用消息队列处理大量用户行为数据
- **实时计算缓存**：Redis缓存用户统计数据，定期更新
- **数据分区策略**：按时间分区存储用户活动数据
- **异步任务处理**：成就检查、推送发送等异步处理

### 2. 前端性能优化
- **组件懒加载**：非关键UI组件按需加载
- **虚拟滚动**：长列表使用虚拟滚动技术
- **图片懒加载**：成就图标、用户头像懒加载
- **数据预取**：预测用户行为，提前加载数据

### 3. 推送系统优化
- **批量发送**：合并同类推送，减少发送频次
- **智能频控**：避免推送疲劳，动态调整发送频率
- **渠道优化**：根据用户偏好选择最有效的推送渠道
- **A/B测试**：持续优化推送内容和时机