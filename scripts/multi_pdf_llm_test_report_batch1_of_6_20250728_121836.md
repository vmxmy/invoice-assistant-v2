# 🔬 多PDF多模型发票文本提取测试报告

**测试时间**: 2025-07-28 12:18:36  
**测试目录**: `invoices_20250326171507`  
**PDF文件数量**: 5 个  
**成功处理**: 5 个  
**处理失败**: 0 个  
**整体成功率**: 100%  
**测试模型**: 4 个

## 📊 模型整体性能统计

| 模型名称 | 提供商 | 成功处理 | 成功率 | 平均处理时间 | 平均质量评分 |
|----------|--------|----------|--------|--------------|--------------|
| **Gemini 2.0 Flash** | Google | 5/5 | 100% | 2.0s | 61.2/100 |
| **Claude 3 Haiku** | Anthropic | 5/5 | 100% | 2.3s | 77.0/100 |
| **Qwen 2.5 72B** | 阿里云 | 5/5 | 100% | 4.3s | 61.4/100 |
| **Mistral Nemo** | Mistral AI | 5/5 | 100% | 5.8s | 78.2/100 |

## 📄 PDF文件详细测试结果

| 文件名 | 文本长度 | Gemini 2.0 | Claude 3 Haiku | Qwen 2.5 72B | Mistral Nemo | 成功模型数 |
|--------|----------|------------|----------------|--------------|--------------|------------|
| `2025-02-24-广州寿司郎餐饮有限公司-336.00-2544200...` | 231字符 | ✅ | ✅ | ✅ | ✅ | 4/4 |
| `2025-03-03-国家税务总局-377.00-254291658180...` | 205字符 | ✅ | ✅ | ✅ | ✅ | 4/4 |
| `2025-03-03-国家税务总局湖南省税务局-12.00-2543916...` | 334字符 | ✅ | ✅ | ✅ | ✅ | 4/4 |
| `2025-03-03-国家税务总局湖南省税务局-86.50-2543916...` | 201字符 | ✅ | ✅ | ✅ | ✅ | 4/4 |
| `2025-03-03-湖南清泉华美达国际酒店有限公司-900.00-254...` | 517字符 | ✅ | ✅ | ✅ | ✅ | 4/4 |

## 🔍 所有文件关键字段提取详细结果

### 1. 2025-02-24-广州寿司郎餐饮有限公司-336.00-25442000000101203423.pdf

| 字段名称 | Gemini 2.0 Flash | Claude 3 Haiku | Qwen 2.5 72B | Mistral Nemo |
|----------|----------|----------|----------|----------|
| **发票号码** | - | `91330108MA27Y5XH5G` | - | `91330108MA27Y5XH5G` |
| **开票日期** | - | `2025-07-26` | - | `2025-07-26` |
| **总金额** | - | `2080` | - | `2080` |
| **销售方** | - | `91440101MA9W38GN08` | - | `91440101MA9W38GN08` |

### 2. 2025-03-03-国家税务总局-377.00-25429165818000355594.pdf

| 字段名称 | Gemini 2.0 Flash | Claude 3 Haiku | Qwen 2.5 72B | Mistral Nemo |
|----------|----------|----------|----------|----------|
| **发票号码** | `25429165818000355594` | `25429165818000355594` | `25429165818000355594` | `25429165818000355594` |
| **开票日期** | `2025-02-20` | `2025-02-20` | `2025-02-20` | `2025-02-20` |
| **总金额** | `377` | `377` | `377` | `377` |
| **销售方** | `12306` | `Changshanan` | `Changshunan` | `Changshanan` |

### 3. 2025-03-03-国家税务总局湖南省税务局-12.00-25439165660000008536.pdf

| 字段名称 | Gemini 2.0 Flash | Claude 3 Haiku | Qwen 2.5 72B | Mistral Nemo |
|----------|----------|----------|----------|----------|
| **发票号码** | `25439165660000008536` | `25439165660000008536` | `25439165660000008536` | `25439165660000008536` |
| **开票日期** | `2025-03-03` | `2025-03-03` | `2025-03-03` | `2025-03-03` |
| **总金额** | `12` | `12` | `12` | `12` |
| **销售方** | `湘潭北 站   长沙南 站` | `中国铁路` | `中国铁路` | `中国铁路` |

### 4. 2025-03-03-国家税务总局湖南省税务局-86.50-25439165666000013950.pdf

| 字段名称 | Gemini 2.0 Flash | Claude 3 Haiku | Qwen 2.5 72B | Mistral Nemo |
|----------|----------|----------|----------|----------|
| **发票号码** | `6566676086022192684132025` | `25439165666000013950` | `6566676086022192684` | `25439165666000013950` |
| **开票日期** | `2025-02-20` | `2025-02-20` | `2025-03-03` | `2025-02-20` |
| **总金额** | `86.5` | `86.5` | `86.5` | `86.5` |
| **销售方** | `12306` | `Loudinan` | `Loudinan` | `Loudinan` |

### 5. 2025-03-03-湖南清泉华美达国际酒店有限公司-900.00-25432000000027470610.pdf

| 字段名称 | Gemini 2.0 Flash | Claude 3 Haiku | Qwen 2.5 72B | Mistral Nemo |
|----------|----------|----------|----------|----------|
| **发票号码** | `25432000000027470610` | `25432000000027470610` | `25432000000027470610` | `25432000000027470610` |
| **开票日期** | `2025-03-03` | `2025-03-03` | `2025-03-03` | `2025-03-03` |
| **总金额** | `900` | `900` | `900` | `900` |
| **销售方** | `湖南清泉华美达国际酒店有限公司` | `杭州趣链科技有限公司` | `杭州趣链科技有限公司` | `杭州趣链科技有限公司` |


## 📝 所有文件详细解析结果

### 📄 文件 1: 2025-02-24-广州寿司郎餐饮有限公司-336.00-25442000000101203423.pdf

**文本长度**: 231 字符

#### 各模型完整解析结果

##### Gemini 2.0 Flash - 成功提取 3 个字段

- **发票类型**: `电子发票（普通发票）`
- **销售方税号**: `91440101MA9W38GN08`
- **购买方税号**: `91330108MA27Y5XH5G`

**验证信息**:
- 完整性评分: 0%
- 数据有效性: ❌ 无效
- 处理时间: 1.81秒
- 缺失字段: invoice_number, invoice_date, seller_name, total_amount

##### Claude 3 Haiku - 成功提取 12 个字段

- **发票号码**: `91330108MA27Y5XH5G`
- **开票日期**: `2025-07-26`
- **销售方**: `91440101MA9W38GN08`
- **购买方**: `名称：`
- **总金额**: `2080`
- **大写金额**: `（小写）`
- **税额**: `0`
- **税率**: `0`
- **商品名称**: `项目名称`
- **发票类型**: `电⼦发票（普通发票）`
- **销售方税号**: `91330108MA27Y5XH5G`
- **购买方税号**: `统一社会信用代码/纳税人识别号：`

**验证信息**:
- 完整性评分: 86%
- 数据有效性: ❌ 无效
- 处理时间: 2.12秒
- 字段问题: {"invoice_number":["发票号码格式可能不正确"]}

##### Qwen 2.5 72B - 成功提取 6 个字段

- **总金额**: `0`
- **税额**: `0`
- **税率**: `0`
- **发票类型**: `电⼦发票（普通发票）`
- **销售方税号**: `91440101MA9W38GN08`
- **购买方税号**: `91330108MA27Y5XH5G`

**验证信息**:
- 完整性评分: 0%
- 数据有效性: ❌ 无效
- 处理时间: 4.02秒
- 缺失字段: invoice_number, invoice_date, seller_name, total_amount

##### Mistral Nemo - 成功提取 12 个字段

- **发票号码**: `91330108MA27Y5XH5G`
- **开票日期**: `2025-07-26`
- **销售方**: `91440101MA9W38GN08`
- **购买方**: `91330108MA27Y5XH5G`
- **总金额**: `2080`
- **大写金额**: `贰仟捌拾元整`
- **税额**: `0`
- **税率**: `0`
- **商品名称**: `项目名称`
- **发票类型**: `电子发票（普通发票）`
- **销售方税号**: `91440101MA9W38GN08`
- **购买方税号**: `91330108MA27Y5XH5G`

**验证信息**:
- 完整性评分: 86%
- 数据有效性: ❌ 无效
- 处理时间: 4.74秒
- 字段问题: {"invoice_number":["发票号码格式可能不正确"]}

---

### 📄 文件 2: 2025-03-03-国家税务总局-377.00-25429165818000355594.pdf

**文本长度**: 205 字符

#### 各模型完整解析结果

##### Gemini 2.0 Flash - 成功提取 8 个字段

- **发票号码**: `25429165818000355594`
- **开票日期**: `2025-02-20`
- **销售方**: `12306`
- **购买方**: `3207051981****2012`
- **总金额**: `377`
- **商品名称**: `G883`
- **销售方税号**: `91330108MA27Y5XH5G`
- **购买方税号**: `6581876086022190319642025`

**验证信息**:
- 完整性评分: 86%
- 数据有效性: ✅ 有效
- 处理时间: 2.02秒

##### Claude 3 Haiku - 成功提取 6 个字段

- **发票号码**: `25429165818000355594`
- **开票日期**: `2025-02-20`
- **销售方**: `Changshanan`
- **购买方**: `Guangzhounan`
- **总金额**: `377`
- **销售方税号**: `91330108MA27Y5XH5G`

**验证信息**:
- 完整性评分: 71%
- 数据有效性: ✅ 有效
- 处理时间: 1.88秒

##### Qwen 2.5 72B - 成功提取 8 个字段

- **发票号码**: `25429165818000355594`
- **开票日期**: `2025-02-20`
- **销售方**: `Changshunan`
- **购买方**: `Guangzhounan`
- **总金额**: `377`
- **商品名称**: `G883`
- **销售方税号**: `91330108MA27Y5XH5G`
- **购买方税号**: `6581876086022190319642025`

**验证信息**:
- 完整性评分: 86%
- 数据有效性: ✅ 有效
- 处理时间: 3.64秒

##### Mistral Nemo - 成功提取 12 个字段

- **发票号码**: `25429165818000355594`
- **开票日期**: `2025-02-20`
- **销售方**: `Changshanan`
- **购买方**: `Guangzhounan`
- **总金额**: `377`
- **大写金额**: `三百七十七元整`
- **税额**: `0`
- **税率**: `0`
- **商品名称**: `G883`
- **发票类型**: `电子发票`
- **销售方税号**: `91330108MA27Y5XH5G`
- **购买方税号**: `3207051981****2012`

**验证信息**:
- 完整性评分: 86%
- 数据有效性: ✅ 有效
- 处理时间: 4.75秒

---

### 📄 文件 3: 2025-03-03-国家税务总局湖南省税务局-12.00-25439165660000008536.pdf

**文本长度**: 334 字符

#### 各模型完整解析结果

##### Gemini 2.0 Flash - 成功提取 8 个字段

- **发票号码**: `25439165660000008536`
- **开票日期**: `2025-03-03`
- **销售方**: `湘潭北 站   长沙南 站`
- **购买方**: `杭州趣链科技有限公司`
- **总金额**: `12`
- **商品名称**: `二等座`
- **发票类型**: `电子发票（铁路电子客票）`
- **购买方税号**: `91330108MA27Y5XH5G`

**验证信息**:
- 完整性评分: 86%
- 数据有效性: ✅ 有效
- 处理时间: 2.02秒

##### Claude 3 Haiku - 成功提取 9 个字段

- **发票号码**: `25439165660000008536`
- **开票日期**: `2025-03-03`
- **销售方**: `中国铁路`
- **购买方**: `杭州趣链科技有限公司`
- **总金额**: `12`
- **大写金额**: `人民币壹拾贰元整`
- **商品名称**: `电子客票`
- **发票类型**: `电子发票（铁路电子客票）`
- **购买方税号**: `91330108MA27Y5XH5G`

**验证信息**:
- 完整性评分: 86%
- 数据有效性: ✅ 有效
- 处理时间: 2.61秒

##### Qwen 2.5 72B - 成功提取 10 个字段

- **发票号码**: `25439165660000008536`
- **开票日期**: `2025-03-03`
- **销售方**: `中国铁路`
- **购买方**: `杭州趣链科技有限公司`
- **总金额**: `12`
- **税额**: `0`
- **税率**: `0`
- **商品名称**: `二等座`
- **发票类型**: `电子发票（铁路电子客票）`
- **购买方税号**: `91330108MA27Y5XH5G`

**验证信息**:
- 完整性评分: 86%
- 数据有效性: ✅ 有效
- 处理时间: 3.42秒

##### Mistral Nemo - 成功提取 12 个字段

- **发票号码**: `25439165660000008536`
- **开票日期**: `2025-03-03`
- **销售方**: `中国铁路`
- **购买方**: `杭州趣链科技有限公司`
- **总金额**: `12`
- **大写金额**: `壹拾贰元整`
- **税额**: `0`
- **税率**: `0`
- **商品名称**: `二等座`
- **发票类型**: `电子发票（铁路电子客票）`
- **销售方税号**: `不适用`
- **购买方税号**: `91330108MA27Y5XH5G`

**验证信息**:
- 完整性评分: 86%
- 数据有效性: ✅ 有效
- 处理时间: 5.75秒

---

### 📄 文件 4: 2025-03-03-国家税务总局湖南省税务局-86.50-25439165666000013950.pdf

**文本长度**: 201 字符

#### 各模型完整解析结果

##### Gemini 2.0 Flash - 成功提取 6 个字段

- **发票号码**: `6566676086022192684132025`
- **开票日期**: `2025-02-20`
- **销售方**: `12306`
- **总金额**: `86.5`
- **商品名称**: `G1752`
- **销售方税号**: `91330108MA27Y5XH5G`

**验证信息**:
- 完整性评分: 71%
- 数据有效性: ✅ 有效
- 处理时间: 2.00秒

##### Claude 3 Haiku - 成功提取 12 个字段

- **发票号码**: `25439165666000013950`
- **开票日期**: `2025-02-20`
- **销售方**: `Loudinan`
- **购买方**: `Xiangtanbei`
- **总金额**: `86.5`
- **大写金额**: `大写金额`
- **税额**: `0`
- **税率**: `0`
- **商品名称**: `G1752`
- **发票类型**: `发票类型`
- **销售方税号**: `91330108MA27Y5XH5G`
- **购买方税号**: `3207051981****2012`

**验证信息**:
- 完整性评分: 86%
- 数据有效性: ✅ 有效
- 处理时间: 1.96秒

##### Qwen 2.5 72B - 成功提取 8 个字段

- **发票号码**: `6566676086022192684`
- **开票日期**: `2025-03-03`
- **销售方**: `Loudinan`
- **购买方**: `Xiangtanbei`
- **总金额**: `86.5`
- **商品名称**: `G1752`
- **销售方税号**: `91330108MA27Y5XH5G`
- **购买方税号**: `3207051981****2012`

**验证信息**:
- 完整性评分: 86%
- 数据有效性: ✅ 有效
- 处理时间: 4.13秒

##### Mistral Nemo - 成功提取 12 个字段

- **发票号码**: `25439165666000013950`
- **开票日期**: `2025-02-20`
- **销售方**: `Loudinan`
- **购买方**: `Xiangtanbei`
- **总金额**: `86.5`
- **大写金额**: `八十六元五角`
- **税额**: `0`
- **税率**: `0`
- **商品名称**: `G1752`
- **发票类型**: `电子发票`
- **销售方税号**: `3207051981****2012`
- **购买方税号**: `6566676086022192684132025`

**验证信息**:
- 完整性评分: 86%
- 数据有效性: ✅ 有效
- 处理时间: 4.65秒

---

### 📄 文件 5: 2025-03-03-湖南清泉华美达国际酒店有限公司-900.00-25432000000027470610.pdf

**文本长度**: 517 字符

#### 各模型完整解析结果

##### Gemini 2.0 Flash - 成功提取 12 个字段

- **发票号码**: `25432000000027470610`
- **开票日期**: `2025-03-03`
- **销售方**: `湖南清泉华美达国际酒店有限公司`
- **购买方**: `杭州趣链科技有限公司`
- **总金额**: `900`
- **大写金额**: `玖佰圆整`
- **税额**: `50.94`
- **税率**: `0.06`
- **商品名称**: `*住宿服务*住宿`
- **发票类型**: `增值税专用发票`
- **销售方税号**: `91431300593278365G`
- **购买方税号**: `91330108MA27Y5XH5G`

**验证信息**:
- 完整性评分: 100%
- 数据有效性: ✅ 有效
- 处理时间: 2.20秒

##### Claude 3 Haiku - 成功提取 12 个字段

- **发票号码**: `25432000000027470610`
- **开票日期**: `2025-03-03`
- **销售方**: `杭州趣链科技有限公司`
- **购买方**: `湖南清泉华美达国际酒店有限公司`
- **总金额**: `900`
- **大写金额**: `玖佰圆整`
- **税额**: `50.94`
- **税率**: `6`
- **商品名称**: `*住宿服务*住宿`
- **发票类型**: `电子发票（增值税专用发票）`
- **销售方税号**: `91330108MA27Y5XH5G`
- **购买方税号**: `91431300593278365G`

**验证信息**:
- 完整性评分: 100%
- 数据有效性: ✅ 有效
- 处理时间: 2.71秒

##### Qwen 2.5 72B - 成功提取 12 个字段

- **发票号码**: `25432000000027470610`
- **开票日期**: `2025-03-03`
- **销售方**: `杭州趣链科技有限公司`
- **购买方**: `湖南清泉华美达国际酒店有限公司`
- **总金额**: `900`
- **大写金额**: `玖佰圆整`
- **税额**: `50.94`
- **税率**: `6`
- **商品名称**: `住宿服务`
- **发票类型**: `增值税专用发票`
- **销售方税号**: `91330108MA27Y5XH5G`
- **购买方税号**: `91431300593278365G`

**验证信息**:
- 完整性评分: 100%
- 数据有效性: ✅ 有效
- 处理时间: 6.53秒

##### Mistral Nemo - 成功提取 12 个字段

- **发票号码**: `25432000000027470610`
- **开票日期**: `2025-03-03`
- **销售方**: `杭州趣链科技有限公司`
- **购买方**: `湖南清泉华美达国际酒店有限公司`
- **总金额**: `900`
- **大写金额**: `玖佰圆整`
- **税额**: `50.94`
- **税率**: `0.06`
- **商品名称**: `住宿服务`
- **发票类型**: `电子发票（增值税专用发票）`
- **销售方税号**: `91330108MA27Y5XH5G`
- **购买方税号**: `91431300593278365G`

**验证信息**:
- 完整性评分: 100%
- 数据有效性: ✅ 有效
- 处理时间: 9.12秒

---


## 📈 数据统计分析

### 发票类型分布
- **电子发票（铁路电子客票）**: 4 次
- **电子发票（普通发票）**: 2 次
- **电⼦发票（普通发票）**: 2 次
- **电子发票**: 2 次
- **增值税专用发票**: 2 次

### 主要销售方（前5名）
- **中国铁路**: 3 次
- **Loudinan**: 3 次
- **杭州趣链科技有限公司**: 3 次
- **91440101MA9W38GN08**: 2 次
- **12306**: 2 次

## 🔧 测试环境

- **PDF文本提取**: Supabase Edge Function (PDF.js)
- **LLM API**: OpenRouter
- **测试脚本**: Node.js
- **文档格式**: 中文电子发票
- **并发处理**: 顺序处理，避免API限制
- **测试模型**: 4个高性能免费模型

---
*报告生成时间: 2025-07-28 12:18:36*  
*测试目录: invoices_20250326171507*  
*处理文件数: 5 个PDF*
