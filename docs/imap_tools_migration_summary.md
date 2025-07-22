# IMAP-Tools 迁移总结

## 背景
原本使用 imapclient 库无法正确搜索中文关键字，导致无法搜索包含"发票"等中文关键词的邮件。

## 解决方案
将邮件扫描模块从 imapclient 迁移到 imap-tools 库，因为 imap-tools 提供了更好的 UTF-8 支持。

## 主要改动

### 1. 重写 imap_client.py
- 保持了原有的 IMAPClient 类接口，确保向后兼容
- 使用 imap-tools 的 MailBox 类替代 IMAPClient
- 所有搜索方法都支持 `charset='UTF-8'` 参数

### 2. 关键代码改进

#### 搜索中文邮件
```python
# 使用 imap-tools 搜索中文关键字
messages = list(mailbox.fetch(AND(subject='发票'), charset='UTF-8'))
```

#### 获取单个邮件
```python
# 通过 UID 获取邮件
for msg in self.mailbox.fetch(AND(uid=str(email_uid)), mark_seen=False, limit=1):
    return self._convert_to_message(msg)
```

#### 性能优化
- 使用 `mailbox.uids()` 方法只获取 UID 列表，而不是完整的邮件对象
- 限制搜索结果数量，避免一次性处理太多邮件

### 3. 测试结果
- ✅ 成功搜索到 67 封包含"发票"的邮件
- ✅ 能够获取邮件的详细信息（主题、发件人、日期等）
- ✅ 保持了与原有 API 的兼容性

## 注意事项
1. imap-tools 的 AND(uid=...) 需要字符串格式的 UID
2. 使用 `limit` 参数限制返回的邮件数量，提高性能
3. 某些操作可能会超时，需要适当的超时处理

## 下一步
- 优化高级搜索功能的性能
- 改进文件夹列表功能
- 在生产环境中测试新的实现