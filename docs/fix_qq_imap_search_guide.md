# QQ 邮箱 IMAP 搜索问题修复指南

## 问题概述

QQ 邮箱的 IMAP 实现存在以下限制：
1. **搜索索引限制**：只对最近 30-60 天的邮件建立搜索索引
2. **中文搜索不支持**：SUBJECT 搜索不支持中文字符（ASCII 编码错误）
3. **历史邮件无法搜索**：超出索引范围的邮件无法通过 SEARCH 命令找到

## 修复方案

### 短期方案：全量获取 + 本地过滤

#### 1. 修改 IMAPClient 类

```python
# backend/app/services/email/imap_client.py

def search_emails_with_fallback(self, search_criteria: str, 
                               date_from: date = None,
                               date_to: date = None) -> List[int]:
    """带回退机制的邮件搜索"""
    # 先尝试正常搜索
    email_ids = self.search_emails(search_criteria)
    
    # 判断是否需要回退
    if self._should_use_fallback(date_from, len(email_ids)):
        return self._fetch_all_and_filter(date_from, date_to)
    
    return email_ids
```

#### 2. 修改 EmailScannerService

```python
# backend/app/services/email_scanner_service.py

# 在 _scan_account 方法中
# 将原来的：
email_ids = client.search_emails(search_criteria)

# 改为：
email_ids = client.search_emails_with_fallback(
    search_criteria,
    date_from=scan_params.date_from,
    date_to=scan_params.date_to
)
```

### 长期方案：增量同步机制

#### 1. 数据库迁移

```sql
-- 添加邮件索引表
CREATE TABLE email_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES email_accounts(id),
    uid INTEGER NOT NULL,
    subject TEXT,
    from_address TEXT,
    email_date TIMESTAMP WITH TIME ZONE,
    message_id TEXT,
    has_attachments BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(account_id, uid)
);

-- 添加索引
CREATE INDEX idx_email_date ON email_index(account_id, email_date);
CREATE INDEX idx_subject ON email_index(account_id, subject);
```

#### 2. 实现增量同步

```python
# 在 EmailScannerService 中添加
async def incremental_sync(self, account_id: str):
    """增量同步邮件"""
    sync_state = await self._get_sync_state(account_id)
    last_uid = sync_state.get('last_uid', 0)
    
    # 只获取新邮件
    new_emails = await client.uid_search(f'{last_uid+1}:*')
    
    # 处理并索引
    for uid in new_emails:
        email_data = await self._process_and_index(uid)
    
    # 更新同步状态
    await self._update_sync_state(account_id, max(new_emails))
```

## 实施步骤

### 第一阶段：快速修复（1-2天）
1. ✅ 实现 `search_emails_with_fallback` 方法
2. ✅ 修改 `_scan_account` 使用新方法
3. ✅ 添加日期范围判断逻辑
4. ✅ 测试验证功能正常

### 第二阶段：性能优化（3-5天）
1. ⬜ 创建邮件索引表
2. ⬜ 实现增量同步逻辑
3. ⬜ 添加本地搜索功能
4. ⬜ 迁移现有数据

### 第三阶段：完善功能（1周）
1. ⬜ 优化批量处理性能
2. ⬜ 添加同步状态监控
3. ⬜ 实现断点续传
4. ⬜ 完善错误处理

## 注意事项

1. **性能影响**：全量获取会增加首次扫描时间，建议：
   - 添加进度提示
   - 实现批量处理（每批50-100封）
   - 使用异步处理

2. **存储需求**：本地索引会占用额外存储空间
   - 定期清理过期数据
   - 只保留必要字段

3. **兼容性**：保持向后兼容
   - 支持其他邮箱服务商
   - 可配置是否启用回退机制

## 测试验证

```bash
# 测试不同日期范围
python scripts/test_email_scan_dates.py

# 验证中文搜索
python scripts/test_chinese_search.py

# 性能测试
python scripts/test_bulk_email_scan.py
```

## 监控指标

- 搜索响应时间
- 回退机制触发频率
- 本地索引命中率
- 同步任务成功率