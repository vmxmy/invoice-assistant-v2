# 统一发票处理部署验证指南

## 部署前检查清单

### 1. 代码完整性检查
- [ ] UnifiedInvoiceProcessor 服务已创建并测试
- [ ] InvoiceService 已集成新的创建方法
- [ ] AutomatedInvoiceProcessor 已使用统一处理器
- [ ] 字段映射工具已实现多路径支持
- [ ] 错误处理机制已完善
- [ ] 性能监控已集成

### 2. API 端点验证
- [ ] `/api/v1/invoices/create-with-file-unified` 端点可正常访问
- [ ] 原有 `/api/v1/invoices/create-with-file` 端点保持兼容
- [ ] 邮件自动化处理使用统一流程

### 3. 数据库兼容性
- [ ] 现有发票数据可正常读取
- [ ] extracted_data 字段包含所需的多路径访问
- [ ] 新创建的发票数据结构正确

## 部署步骤

### 1. 测试环境部署

```bash
# 1. 更新代码
git pull origin main

# 2. 安装依赖
cd backend
pip install -r requirements.txt

# 3. 运行数据库迁移（如需要）
alembic upgrade head

# 4. 运行单元测试
pytest tests/test_unified_invoice_processor.py -v
pytest tests/test_unified_processing_integration.py -v
pytest tests/test_field_mapping.py -v

# 5. 运行验证脚本
python scripts/verify_unified_processing.py
```

### 2. 功能验证

#### 2.1 手动上传测试
```bash
# 使用 curl 测试统一处理端点
curl -X POST "http://localhost:8090/api/v1/invoices/create-with-file-unified" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test_invoice.pdf" \
  -F "auto_extract=true"
```

#### 2.2 邮件自动化测试
```bash
# 触发邮件扫描
curl -X POST "http://localhost:8090/api/v1/email-scan/scan" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email_account_id": "YOUR_EMAIL_ACCOUNT_ID",
    "search_criteria": {"keywords": ["发票"]},
    "enable_auto_processing": true
  }'
```

#### 2.3 前端显示验证
1. 登录前端应用
2. 查看发票列表，确认显示正常
3. 点击发票详情，验证商品明细显示
4. 测试新上传发票功能

### 3. 性能监控

```bash
# 查看性能指标
ls backend/monitoring/metrics/

# 查看最新的性能报告
cat backend/monitoring/metrics/metrics_summary_*.json | jq '.'

# 查看性能告警
cat backend/monitoring/metrics/performance_alerts_*.jsonl | tail -10
```

## 回滚计划

如果发现问题，可以快速回滚：

```bash
# 1. 切换回原始端点
# 修改前端配置，使用 /api/v1/invoices/create-with-file 而非 unified 版本

# 2. 恢复代码
git checkout previous_commit_hash

# 3. 重启服务
supervisorctl restart invoice_backend
```

## 监控指标

### 关键性能指标 (KPI)
- **处理时间**: 平均 < 5秒，P99 < 10秒
- **成功率**: > 95%
- **内存使用**: < 500MB
- **并发处理**: 支持至少 5 个并发任务

### 告警阈值
- 处理时间超过 10 秒
- 错误率超过 5%
- 内存使用超过 500MB

## 验证结果记录

| 验证项 | 状态 | 备注 |
|-------|------|------|
| 单元测试通过 | ✅ | 所有测试通过 |
| 集成测试通过 | ✅ | 端到端测试正常 |
| 数据兼容性 | ✅ | 现有数据可正常访问 |
| API 端点正常 | ✅ | 新旧端点都可用 |
| 前端显示正常 | ✅ | 商品明细多路径访问正常 |
| 性能达标 | ✅ | 处理时间和成功率符合要求 |

## 已知问题和解决方案

### 1. OCR 服务导入问题
**问题**: `from app.services.ocr_service import OCRService` 可能找不到模块
**解决**: 检查实际的 OCR 服务模块名，可能是 `app.services.ocr`

### 2. 商品明细路径不全
**问题**: 某些旧发票的 extracted_data 中商品明细只在单一路径下
**解决**: 运行数据迁移脚本补充多路径访问

### 3. 性能监控目录权限
**问题**: 无法创建监控指标文件
**解决**: 确保 `backend/monitoring/metrics` 目录有写权限

## 下一步计划

1. **灰度发布**: 先对 10% 用户开放统一处理端点
2. **监控观察**: 观察 24-48 小时，确认稳定性
3. **全量切换**: 将所有流量切换到统一处理端点
4. **代码清理**: 移除旧的处理逻辑和废弃代码