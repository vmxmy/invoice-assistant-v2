# 所有融合方案对比分析

## 测试结果汇总

| 方案 | 总体成功率 | 发票号码 | 开票日期 | 含税金额 | 采购方 | 销售方 | 项目名称 |
|------|-----------|----------|----------|----------|--------|--------|----------|
| **单独Camelot** | 100% | 100% | 100% | 32.1% | 100% ✅ | 32.1% | 28.6% |
| **单独invoice2data** | 100% | 100% | 100% | 96.8% | 56.5% | 33.9% | 91.9% |
| **单独MarkItDown** | 100% | 100% | 100% | 32.1% | 53.6% | 32.1% | 28.6% |
| **Camelot+invoice2data** | 89.3% | 89.3% | 89.3% | 89.3% ✅ | 28.6% ❌ | 89.3% ✅ | 14.3% |
| **MarkItDown+invoice2data** | 75.0% | 75.0% | 75.0% | 75.0% | 28.6% | 75.0% | 0% ❌ |

## 关键发现

### 1. 最佳单项表现
- **采购方识别**: Camelot (100%) - 通过表格位置关系判断
- **含税金额**: invoice2data (96.8%) - 正则表达式匹配效果好
- **项目名称**: invoice2data (91.9%) - 模板设计合理

### 2. 融合方案的效果

#### Camelot + invoice2data
**优势**:
- 含税金额从32.1%提升到89.3% ↑
- 销售方从32.1%提升到89.3% ↑

**劣势**:
- 采购方从100%下降到28.6% ↓↓
- 项目名称从91.9%下降到14.3% ↓↓
- 总体成功率下降到89.3%

#### MarkItDown + invoice2data
**问题更严重**:
- 所有字段都只有75%或更低
- 项目名称完全失败（0%）
- 7个文件完全失败

### 3. 融合方案失败的原因

1. **文本格式转换损失**
   - Camelot/MarkItDown转换后的文本格式与invoice2data模板期望的格式不匹配
   - 表格结构信息丢失，导致字段关系混乱

2. **正则表达式不适配**
   - invoice2data的正则表达式是为原始PDF文本设计的
   - 转换后的文本格式破坏了原有的匹配模式

3. **位置信息丢失**
   - Camelot的优势在于保留表格结构和位置关系
   - 转为文本后，这些优势完全丢失

## 最优方案设计

基于测试结果，最优方案应该是**选择性融合**而非简单串联：

### 推荐的混合策略

```python
def optimal_extraction(pdf_path):
    results = {}
    
    # 1. 使用Camelot提取表格结构相关字段
    camelot_result = camelot_extract(pdf_path)
    results['buyer_name'] = camelot_result.get('buyer_name')  # 100%成功率
    
    # 2. 使用invoice2data直接处理PDF（不经过转换）
    invoice2data_result = invoice2data_extract(pdf_path)
    results['total_amount'] = invoice2data_result.get('amount')  # 96.8%成功率
    results['project_name'] = invoice2data_result.get('project_name')  # 91.9%成功率
    
    # 3. 基础字段可以使用任一方法（都是100%）
    results['invoice_number'] = invoice2data_result.get('invoice_number')
    results['invoice_date'] = invoice2data_result.get('date')
    
    # 4. 销售方可能需要综合判断或坐标提取
    results['seller_name'] = coordinate_extract(pdf_path).get('seller_name')
    
    return results
```

### 关键原则

1. **保持工具的原生优势**
   - 不要强行串联，而是并行使用
   - 让每个工具处理它最擅长的部分

2. **避免格式转换**
   - 格式转换会导致信息损失
   - 直接使用原始PDF效果最好

3. **字段级别的工具选择**
   - 不同字段使用不同工具
   - 基于实测效果选择最佳工具

## 结论

1. **简单串联融合效果不佳**：Camelot/MarkItDown + invoice2data的串联方案效果都不如单独使用

2. **最佳实践是并行使用**：
   - Camelot: 采购方识别（100%）
   - invoice2data: 金额和项目提取（96.8%, 91.9%）
   - 坐标提取: 补充其他字段

3. **已有方案仍是最优**：当前的Camelot + 坐标提取混合方案仍然是最实用的选择