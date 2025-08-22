# 用户增长与获客功能

## 功能概述
建立完整的用户获客漏斗，通过免费试用、推荐奖励、社交分享等方式实现用户快速增长，降低获客成本，提升转化率。

## 核心目标
- 降低新用户使用门槛
- 建立病毒式传播机制
- 提升免费用户到付费用户的转化率
- 构建完整的获客数据追踪体系

## 功能需求

### 1. 免费试用体验
- **试用期管理**：新用户自动获得14天免费试用
- **功能限制**：试用期间限制处理100张发票
- **试用提醒**：试用期剩余3天/1天时发送邮件提醒
- **无缝升级**：一键升级到付费套餐，数据无缝迁移

### 2. 推荐奖励系统
- **推荐码生成**：每个用户获得专属推荐码
- **奖励机制**：推荐成功获得1个月免费使用时长
- **被推荐奖励**：新用户通过推荐码注册获得额外7天试用
- **推荐追踪**：完整的推荐链路数据追踪

### 3. 社交媒体分享功能
- **成就分享**：处理发票数量里程碑分享
- **报表分享**：月度/年度发票统计报表分享
- **邀请分享**：分享专属邀请链接到微信/朋友圈
- **品牌水印**：分享内容自动添加产品品牌标识

### 4. 落地页与营销工具
- **动态落地页**：针对不同流量源的个性化落地页
- **A/B测试**：不同版本落地页转化率测试
- **UTM参数追踪**：完整的营销渠道效果追踪
- **转化漏斗分析**：从访问到注册到付费的完整漏斗

## 技术实现

### 前端组件
- `ReferralCodeGenerator` - 推荐码生成器
- `SocialShareModal` - 社交分享弹窗
- `TrialStatusBanner` - 试用状态横幅
- `UpgradePromptModal` - 升级提示弹窗

### 后端API
- `/api/referral/generate` - 生成推荐码
- `/api/referral/validate` - 验证推荐码
- `/api/trial/status` - 获取试用状态
- `/api/growth/analytics` - 获客数据分析

### 数据表设计
```sql
-- 推荐关系表
CREATE TABLE user_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES auth.users(id),
  referee_id UUID REFERENCES auth.users(id),
  referral_code VARCHAR(20) UNIQUE,
  status VARCHAR(20) DEFAULT 'pending',
  reward_granted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 试用状态表
CREATE TABLE user_trials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  trial_start_date TIMESTAMP DEFAULT NOW(),
  trial_end_date TIMESTAMP,
  invoice_processed_count INTEGER DEFAULT 0,
  trial_extended_days INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active'
);
```

## 成功指标
- **新用户注册率**：月度新用户注册数量
- **试用转化率**：试用用户到付费用户转化率（目标>15%）
- **推荐成功率**：推荐码使用成功率（目标>5%）
- **社交分享率**：用户主动分享比例（目标>10%）
- **获客成本**：平均每个付费用户的获客成本

## 实施优先级
1. **Phase 1**：免费试用体验系统
2. **Phase 2**：推荐奖励系统
3. **Phase 3**：社交媒体分享功能
4. **Phase 4**：落地页与营销工具