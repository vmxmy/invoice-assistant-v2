# 用户增长与获客功能 - 设计文档

## 系统架构设计

### 整体架构
```
用户获客系统
├── 试用管理模块
│   ├── 试用期计算
│   ├── 使用量限制
│   └── 提醒通知
├── 推荐系统模块
│   ├── 推荐码管理
│   ├── 奖励发放
│   └── 关系追踪
├── 分享系统模块
│   ├── 内容生成
│   ├── 链接追踪
│   └── 社交集成
└── 营销分析模块
    ├── 转化漏斗
    ├── 渠道分析
    └── A/B测试
```

## 用户体验设计

### 1. 新用户引导流程
```
注册成功 → 欢迎页面 → 试用激活 → 功能引导 → 首次使用
```

#### 关键触点设计
- **欢迎页面**：明确说明14天免费试用权益
- **功能引导**：3步核心功能演示（上传-识别-管理）
- **进度提示**：试用期剩余天数常驻显示

### 2. 推荐系统用户界面

#### 推荐中心页面布局
```
推荐中心
├── 个人推荐码展示
├── 推荐成功统计
├── 奖励记录查看
├── 快速分享按钮
└── 推荐规则说明
```

#### 分享组件设计
- **微信分享**：生成带二维码的推荐海报
- **链接复制**：一键复制推荐链接
- **邮件邀请**：内置邮件模板快速发送

### 3. 试用状态展示

#### 状态栏设计
```html
<div class="trial-banner">
  <div class="trial-info">
    <span class="trial-badge">免费试用中</span>
    <span class="trial-days">还剩 {remainingDays} 天</span>
  </div>
  <div class="trial-usage">
    已处理 {processedCount}/100 张发票
  </div>
  <button class="upgrade-btn">立即升级</button>
</div>
```

## 数据流设计

### 推荐流程数据流
```
用户A生成推荐码 → 系统记录推荐关系 → 用户B通过推荐码注册 
→ 验证推荐码有效性 → 建立推荐关系 → 发放奖励
```

### 试用状态同步
```
用户操作 → 计算使用量 → 更新试用状态 → 检查限制条件 
→ 触发提醒/限制 → 前端状态更新
```

## API 接口设计

### 推荐系统接口

```typescript
// 生成推荐码
POST /api/referral/generate
Response: {
  referralCode: string;
  shareUrl: string;
  qrCodeUrl: string;
}

// 获取推荐统计
GET /api/referral/stats
Response: {
  totalReferrals: number;
  successfulReferrals: number;
  totalRewardsEarned: number;
  pendingRewards: number;
}

// 验证推荐码
POST /api/referral/validate
Body: { referralCode: string }
Response: {
  valid: boolean;
  referrerInfo: {
    nickname?: string;
    avatar?: string;
  }
}
```

### 试用管理接口

```typescript
// 获取试用状态
GET /api/trial/status
Response: {
  isTrialActive: boolean;
  trialStartDate: string;
  trialEndDate: string;
  daysRemaining: number;
  usageCount: number;
  usageLimit: number;
  canProcessMore: boolean;
}

// 激活试用
POST /api/trial/activate
Body: { referralCode?: string }
Response: {
  trialActivated: boolean;
  bonusDays?: number;
}
```

## 技术实现细节

### 推荐码生成算法
```typescript
function generateReferralCode(userId: string): string {
  const timestamp = Date.now().toString(36);
  const userHash = userId.slice(-4);
  const randomSuffix = Math.random().toString(36).slice(-4);
  return `INV${userHash}${timestamp}${randomSuffix}`.toUpperCase();
}
```

### 试用期限制检查
```typescript
async function checkTrialLimits(userId: string): Promise<TrialStatus> {
  const trialInfo = await getTrialInfo(userId);
  
  const isExpired = new Date() > new Date(trialInfo.trialEndDate);
  const isOverLimit = trialInfo.usageCount >= trialInfo.usageLimit;
  
  return {
    canUse: !isExpired && !isOverLimit,
    reason: isExpired ? 'TRIAL_EXPIRED' : 
            isOverLimit ? 'USAGE_LIMIT_EXCEEDED' : 'OK'
  };
}
```

### 社交分享内容生成
```typescript
interface ShareContent {
  title: string;
  description: string;
  imageUrl: string;
  shareUrl: string;
}

function generateShareContent(type: 'referral' | 'achievement'): ShareContent {
  if (type === 'referral') {
    return {
      title: '发票管理神器推荐！',
      description: '智能识别，自动分类，让发票管理变得简单高效',
      imageUrl: '/share/referral-poster.jpg',
      shareUrl: `${baseUrl}/register?ref=${referralCode}`
    };
  }
  // ... 其他类型
}
```

## 性能优化策略

### 1. 推荐码查询优化
- 推荐码建立唯一索引
- 使用Redis缓存活跃推荐码
- 批量验证接口减少数据库查询

### 2. 试用状态缓存
- 用户试用状态Redis缓存（TTL: 1小时）
- 使用量计数器实时更新
- 定期同步到数据库

### 3. 分享内容CDN缓存
- 分享海报图片CDN缓存
- 静态分享模板缓存
- 动态内容懒加载

## 安全性考虑

### 1. 推荐码防刷
- 每个用户限制推荐码生成频率（1次/天）
- 推荐关系验证，防止自推荐
- 异常推荐行为监控和封号机制

### 2. 试用期防滥用
- IP地址限制（同IP限制注册数量）
- 设备指纹识别防止重复试用
- 邮箱域名白名单过滤

### 3. 数据完整性
- 推荐奖励发放事务保证
- 试用状态一致性检查
- 异常数据自动修复机制