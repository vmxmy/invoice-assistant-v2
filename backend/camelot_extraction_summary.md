# Camelot发票关键字段提取结果总结

## 测试时间
2025-07-06 02:42:14

## 整体表现
- **文件处理成功率**: 28/28 (100%)
- **表格识别成功率**: 28/28 (100%)

## 字段提取成功率

| 字段 | 成功数量 | 成功率 | 备注 |
|------|---------|--------|------|
| 开票日期 | 28/28 | 100.0% | ✅ 完美提取 |
| 发票号码 | 28/28 | 100.0% | ✅ 完美提取 |
| 采购方 | 28/28 | 100.0% | ✅ 完美提取 |
| 含税金额 | 9/28 | 32.1% | ⚠️ 需要优化 |
| 销售方 | 9/28 | 32.1% | ⚠️ 需要优化 |
| 项目信息 | 8/28 | 28.6% | ⚠️ 需要优化 |

## 关键发现

### 优势
1. **基础字段提取优秀**: 发票号码、开票日期、采购方这三个字段达到100%成功率
2. **表格识别稳定**: Camelot成功识别了所有PDF中的表格结构
3. **准确度高**: 表格识别准确度普遍在95%以上

### 待改进
1. **金额提取**: 仅32.1%的成功率，可能因为：
   - 金额格式多样（¥符号位置不一致）
   - 价税合计行的识别需要优化
   
2. **销售方识别**: 仅32.1%的成功率，原因：
   - 销售方和采购方在表格中的位置不固定
   - 需要更智能的位置判断逻辑

3. **项目信息**: 仅28.6%的成功率，挑战：
   - 项目行格式多样
   - 需要更好的项目行识别算法

## 与其他方法对比

| 方法 | 采购方 | 销售方 | 备注 |
|------|--------|--------|------|
| invoice2data原始 | 56.5% | 33.9% | 基于正则表达式 |
| 坐标提取 | 100% | 100% | 专门优化的算法 |
| Camelot | 100% | 32.1% | 表格提取方法 |

## 建议的混合策略

基于测试结果，建议采用以下混合策略：

1. **基础字段**: 使用Camelot提取（发票号码、日期、采购方）
2. **销售方/采购方**: 使用坐标提取方法（已达100%成功率）
3. **金额信息**: 结合Camelot表格数据和专门的金额提取算法
4. **项目信息**: 使用增强的表格行识别算法

## 下一步优化方向

1. **改进金额提取算法**:
   - 增强对"价税合计"、"合计"等关键词的识别
   - 处理多种货币符号格式
   
2. **优化销售方识别**:
   - 结合表格位置信息判断买卖双方
   - 使用已成功的坐标提取算法
   
3. **增强项目信息提取**:
   - 识别更多项目关键词
   - 改进多行项目的合并逻辑

## 结论

Camelot在发票基础信息提取方面表现优秀，特别是在识别表格结构和提取固定格式字段（如发票号码、日期）方面达到了100%的成功率。但在处理位置不固定的字段（如销售方）和复杂格式的字段（如金额、项目）时还需要进一步优化。建议采用混合提取策略，结合Camelot的表格识别能力和其他专门优化的算法，以达到最佳的整体提取效果。