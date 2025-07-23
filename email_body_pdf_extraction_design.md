# 邮件正文PDF链接提取功能设计

## 1. 功能目标

在邮箱扫描过程中，对于符合筛选条件但没有PDF附件的邮件，自动分析邮件正文内容，提取可能的PDF下载链接，并尝试下载PDF文件进行后续处理。

## 2. 技术架构

### 2.1 核心组件

1. **邮件正文分析器** (`EmailBodyAnalyzer`)
   - 提取邮件HTML和文本正文
   - 识别PDF相关链接
   - 评估链接可信度

2. **智能链接提取器** (`IntelligentLinkExtractor`)
   - 多种链接模式匹配
   - 上下文分析
   - 链接有效性预判

3. **PDF下载管理器** (`PDFDownloadManager`)
   - 并发下载控制
   - 重试机制
   - 文件验证

### 2.2 集成点

- **邮件扫描服务** (`EmailScannerService`): 在搜索结果中标识需要正文分析的邮件
- **混合同步服务** (`HybridEmailSyncService`): 当前主要使用，需要扩展以支持正文获取
- **PDF提取服务** (`EmailPDFExtractor`): 已有正文链接提取逻辑，需要集成到扫描流程

## 3. 实现流程

### 3.1 邮件筛选阶段

```
1. HybridEmailSyncService 执行邮件同步（使用imap-tools）
2. 修改搜索逻辑，不再限制 has_attachments=True
3. 对搜索结果进行分类：
   - 有PDF附件的邮件 → 直接处理
   - 无PDF附件但符合条件的邮件 → 标记为需要正文分析
   - 不符合条件的邮件 → 跳过
```

### 3.2 正文分析阶段

```
1. 获取邮件完整正文（HTML + 文本）
2. 使用多种策略提取PDF链接：
   - 直接PDF链接匹配
   - 网盘分享链接识别
   - 下载页面链接识别
   - 上下文关键词分析
3. 对提取的链接进行评分和排序
4. 选择最有可能的链接进行下载尝试
```

### 3.3 PDF下载阶段

```
1. 并发下载控制（限制同时下载数）
2. 智能重试机制
3. 文件类型验证
4. 大小限制检查
5. 下载结果记录
```

## 4. 关键技术点

### 4.1 链接识别策略

1. **直接PDF链接**
   ```regex
   https?://[^\s<>"']+\.pdf(?:\?[^\s<>"']*)?
   ```

2. **网盘分享链接**
   ```regex
   # 百度网盘
   https?://pan\.baidu\.com/s/[^\s<>"']+
   
   # 微云
   https?://share\.weiyun\.com/[^\s<>"']+
   
   # 阿里云盘
   https?://www\.aliyundrive\.com/s/[^\s<>"']+
   ```

3. **通用下载链接**
   ```regex
   # 包含download关键词的链接
   https?://[^\s<>"']+/download/[^\s<>"']*
   https?://[^\s<>"']+\?.*download[^\s<>"']*
   
   # 包含file或attachment的链接
   https?://[^\s<>"']+/(file|attachment)/[^\s<>"']*
   ```

### 4.2 上下文分析

分析链接周围的文本内容，寻找发票相关关键词：
- "发票"、"invoice"
- "账单"、"bill"
- "收据"、"receipt"
- "附件"、"attachment"
- "下载"、"download"

### 4.3 链接评分机制

```python
def calculate_link_score(link: str, context: str) -> float:
    score = 0.0
    
    # 直接PDF链接得分最高
    if link.lower().endswith('.pdf'):
        score += 50
    
    # 包含发票关键词的上下文
    invoice_keywords = ['发票', 'invoice', '账单', 'bill']
    for keyword in invoice_keywords:
        if keyword in context.lower():
            score += 20
    
    # 可信域名加分
    trusted_domains = ['gov.cn', 'tax.gov.cn', 'company.com']
    for domain in trusted_domains:
        if domain in link:
            score += 15
    
    # 网盘链接适中评分
    if any(x in link for x in ['pan.baidu.com', 'share.weiyun.com']):
        score += 10
    
    return score
```

## 5. 配置参数

### 5.1 功能开关

```python
class EmailBodyPDFConfig:
    # 是否启用正文PDF提取
    enable_body_pdf_extraction: bool = True
    
    # 最大并发下载数
    max_concurrent_downloads: int = 3
    
    # 单个PDF最大大小（MB）
    max_pdf_size_mb: int = 20
    
    # 下载超时时间（秒）
    download_timeout: int = 30
    
    # 最大重试次数
    max_retry_attempts: int = 3
    
    # 每封邮件最多处理的链接数
    max_links_per_email: int = 5
    
    # 最低链接评分阈值
    min_link_score: float = 10.0
```

### 5.2 扫描参数扩展

```python
class ScanParams(BaseModel):
    # ... 现有参数 ...
    
    # 是否启用正文PDF提取
    enable_body_pdf_extraction: bool = True
    
    # 正文分析的最大邮件数
    max_body_analysis_emails: int = 50
    
    # 是否优先处理有附件的邮件
    prioritize_attachments: bool = True
```

## 6. 实现步骤

### 阶段1: 核心组件开发
1. 创建 `EmailBodyAnalyzer` 类
2. 实现 `IntelligentLinkExtractor` 
3. 增强 `PDFDownloadManager`

### 阶段2: 集成现有服务
1. 修改 `EmailScannerService` 添加正文分析逻辑
2. 扩展 `EmailPDFExtractor` 的链接提取能力
3. 更新扫描参数和配置

### 阶段3: 用户界面支持
1. 前端添加功能开关
2. 扫描结果中显示正文提取的PDF
3. 提供链接来源信息

### 阶段4: 监控和优化
1. 添加性能监控
2. 统计成功率
3. 优化链接识别算法

## 7. 风险控制

### 7.1 性能风险
- **问题**: 正文分析可能影响扫描速度
- **解决**: 
  - 只对无附件的邮件进行分析
  - 设置并发限制
  - 提供功能开关

### 7.2 安全风险
- **问题**: 下载未知链接可能存在安全风险
- **解决**:
  - 文件类型验证
  - 大小限制
  - 域名白名单
  - 病毒扫描（可选）

### 7.3 准确性风险
- **问题**: 可能下载到非发票PDF
- **解决**:
  - 上下文分析
  - 链接评分机制
  - 用户确认机制

## 8. 监控指标

1. **功能使用率**: 启用正文分析的扫描任务比例
2. **链接发现率**: 从正文中发现PDF链接的邮件比例
3. **下载成功率**: 成功下载PDF的链接比例
4. **准确性**: 下载的PDF中实际为发票的比例
5. **性能影响**: 启用功能前后的扫描耗时对比

## 9. 用户体验

### 9.1 扫描结果展示
```json
{
  "email": {
    "uid": 12345,
    "subject": "7月份发票",
    "has_attachments": false,
    "pdf_sources": [
      {
        "source": "body_link",
        "url": "https://example.com/invoice.pdf",
        "status": "downloaded",
        "confidence_score": 85.5
      }
    ]
  }
}
```

### 9.2 设置界面
- 功能开关
- 下载限制设置
- 可信域名配置
- 性能参数调整

## 10. 总结

这个设计方案通过渐进式增强的方式，在不影响现有功能的基础上，智能地从邮件正文中提取PDF链接，显著提高了发票邮件的处理覆盖率。通过合理的配置参数和风险控制机制，确保功能的稳定性和安全性。