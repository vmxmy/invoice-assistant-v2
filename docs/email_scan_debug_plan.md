# 邮件扫描日期参数问题排查方案

## 问题描述
不同日期范围的邮件扫描返回相同结果（69封邮件、8封有效、3个PDF），怀疑日期参数未正确生效。

## 排查步骤

### 1. 检查IMAP搜索条件生成（优先级：高）

```bash
# 运行搜索条件构建测试
cd /Users/xumingyang/app/invoice_assist/v2
source backend/venv/bin/activate
python scripts/debug_imap_search.py
```

**预期结果**：
- 不同日期范围应生成不同的SINCE/BEFORE条件
- 例如：`SINCE "01-Jan-2025" BEFORE "01-Feb-2025" SUBJECT "发票"`

**可能问题**：
- [ ] 日期格式化错误
- [ ] 条件拼接逻辑问题
- [ ] 参数未正确传递

### 2. 直接测试IMAP搜索（优先级：高）

```bash
# 设置QQ邮箱授权码
export QQ_EMAIL_PASSWORD='你的QQ邮箱授权码'

# 运行直接IMAP测试
python scripts/test_imap_direct.py
```

**测试内容**：
- 不同日期范围的搜索结果数量
- QQ邮箱是否有搜索数量限制
- 日期条件是否生效

**关键观察点**：
- ALL搜索返回数量 vs INBOX总数
- 不同月份搜索结果是否不同
- 搜索条件语法是否被QQ邮箱接受

### 3. 分析历史扫描任务（优先级：中）

```bash
# 运行任务日志分析
python scripts/analyze_scan_logs.py
```

**检查项**：
- [ ] scan_params中的日期参数是否正确保存
- [ ] 不同任务的参数是否确实不同
- [ ] 扫描结果中邮件的实际日期分布

### 4. 检查Mock模式（优先级：高）

**检查环境变量**：
```bash
# 检查是否启用了IMAP Mock模式
echo $ENABLE_IMAP_MOCK
grep ENABLE_IMAP_MOCK backend/.env
```

**如果启用了Mock模式**：
- Mock模式会返回固定的测试数据
- 需要设置 `ENABLE_IMAP_MOCK=false`

### 5. 服务端日志分析（优先级：中）

**查看后端日志**：
```bash
# 查看最近的IMAP搜索日志
tail -f backend/logs/app.log | grep -E "IMAP|搜索条件|search"
```

**关注内容**：
- 实际发送给IMAP服务器的搜索条件
- 搜索返回的原始结果
- 任何错误或警告信息

### 6. 数据库查询验证（优先级：低）

```sql
-- 查看扫描任务参数
SELECT job_id, scan_params, total_emails, scanned_emails, matched_emails 
FROM email_scan_jobs 
ORDER BY created_at DESC 
LIMIT 10;
```

## 可能的原因及解决方案

### 原因1：IMAP Mock模式
- **症状**：所有搜索返回相同结果
- **解决**：禁用Mock模式

### 原因2：日期格式问题
- **症状**：IMAP服务器不识别日期格式
- **解决**：确保使用正确的IMAP日期格式（dd-MMM-yyyy）

### 原因3：搜索条件拼接错误
- **症状**：日期条件未包含在最终搜索字符串中
- **解决**：修复 `_build_search_criteria` 方法

### 原因4：QQ邮箱限制
- **症状**：QQ邮箱IMAP有默认返回数量限制
- **解决**：分页搜索或使用更精确的条件

### 原因5：缓存问题
- **症状**：结果被缓存，未实际执行新搜索
- **解决**：清除缓存或确保每次都执行新搜索

## 快速诊断脚本

```python
# quick_diagnose.py
import os
print("=== 快速诊断 ===")
print(f"1. Mock模式: {os.getenv('ENABLE_IMAP_MOCK', 'false')}")
print(f"2. 后端地址: {os.getenv('BASE_URL', 'http://localhost:8090')}")
print(f"3. Python路径: {sys.executable}")
print(f"4. 工作目录: {os.getcwd()}")
```

## 修复验证

修复后，运行以下测试验证：

1. **单元测试**：验证搜索条件生成
2. **集成测试**：验证端到端流程
3. **对比测试**：确认不同日期返回不同结果

```bash
# 验证修复
python scripts/test_email_scan_jan_2025.py  # 应该返回1月的邮件
python scripts/test_email_scan_june_2025.py # 应该返回6月的邮件
# 结果应该不同！
```