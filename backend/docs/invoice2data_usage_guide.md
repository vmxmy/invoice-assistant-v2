# invoice2data 使用指南

## 1. 简介

invoice2data 是一个强大的 Python 库，用于从 PDF 发票中提取结构化数据。它使用基于 YAML/JSON 的模板系统，通过正则表达式匹配来提取关键信息。

## 2. 安装

```bash
# 基础安装
pip install invoice2data

# 性能优化（推荐）
sudo apt-get install libyaml-dev  # 提升 YAML 解析速度 10倍
```

## 3. 基本使用

### 3.1 最简单的用法

```python
from invoice2data import extract_data

# 使用默认模板
result = extract_data('path/to/invoice.pdf')
print(result)
```

### 3.2 使用自定义模板

```python
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

# 加载自定义模板目录
templates = read_templates('/path/to/your/templates/')
result = extract_data('invoice.pdf', templates=templates)
```

### 3.3 命令行使用

```bash
# 使用自定义模板目录
invoice2data --template-folder ./my-templates invoice.pdf

# 处理文件夹中的所有发票
invoice2data --copy processed_invoices invoices/*.pdf

# 调试模式（查看匹配过程）
invoice2data --debug invoice.pdf

# 输出为不同格式
invoice2data --output-format json invoice.pdf
invoice2data --output-format csv invoice.pdf
```

## 4. 模板系统详解

### 4.1 基本模板结构

```yaml
# 模板标识
issuer: 公司名称
keywords:
  - 关键词1  # 所有关键词都必须匹配
  - 关键词2
exclude_keywords:  # 可选：排除关键词
  - 排除词1

# 字段提取
fields:
  # 必需字段
  invoice_number: 发票号码[：:](\d+)
  date: 开票日期[：:](\d{4}年\d{1,2}月\d{1,2}日)
  amount: '[¥￥]([\d,]+\.\d{2})'
  
  # 可选字段
  seller_name: 销售方名称[：:]([^\n]+)
  buyer_name: 购买方名称[：:]([^\n]+)

# 配置选项
options:
  currency: CNY
  date_formats:
    - '%Y年%m月%d日'
    - '%Y-%m-%d'
  remove_whitespace: false
  lowercase: false
```

### 4.2 字段类型

#### 4.2.1 正则表达式字段

```yaml
fields:
  # 简单正则
  invoice_number: 发票号码[：:](\d+)
  
  # 复杂正则，带命名组
  address: 地址[：:](?P<street>[^\n]+).*?邮编[：:](?P<zipcode>\d{6})
  
  # 多个匹配时的处理
  amount:
    - '小计[：:]\s*([\d,]+\.\d{2})'
    - '总计[：:]\s*([\d,]+\.\d{2})'
    type: float
    group: sum  # sum, min, max, first, last
```

#### 4.2.2 静态字段

```yaml
fields:
  # 固定值
  country:
    parser: static
    value: 中国
  
  invoice_type:
    parser: static  
    value: 增值税普通发票
```

#### 4.2.3 表格提取

```yaml
# 提取表格数据
tables:
  - start: 货物或应税劳务、服务名称  # 表格开始标记
    end: 合计                      # 表格结束标记
    body: |
      (?P<item_name>[\S ]+)\s+
      (?P<specification>[\S ]*)\s+
      (?P<unit>[\S ]+)\s+
      (?P<quantity>[\d.]+)\s+
      (?P<unit_price>[\d.]+)\s+
      (?P<amount>[\d,]+\.\d{2})
```

#### 4.2.4 行项目提取

```yaml
# 提取发票明细行
lines:
  - start: 项目明细
    end: 合计
    line: (?P<description>.+?)\s+(?P<qty>\d+)\s+(?P<price>[\d,]+\.\d{2})
```

### 4.3 高级选项

```yaml
options:
  # 货币设置
  currency: CNY
  
  # 日期格式（按顺序尝试）
  date_formats:
    - '%Y年%m月%d日'
    - '%Y-%m-%d'
    - '%d/%m/%Y'
  
  # 文本预处理
  remove_whitespace: true  # 移除空白字符
  lowercase: false         # 转换为小写
  decimal_separator: '.'   # 小数分隔符
  
  # 模板优先级（数字越大优先级越高）
  priority: 100
```

## 5. 实际应用示例

### 5.1 中国电子发票模板

```yaml
issuer: 中国电子发票
keywords:
  - 增值税电子普通发票
  - 发票号码
  - 开票日期
fields:
  # 基础信息
  invoice_number: 发票号码[：:](\d+)
  invoice_code: 发票代码[：:](\d+)
  date: 开票日期[：:](\d{4}年\d{1,2}月\d{1,2}日)
  
  # 金额信息
  amount: '价税合计.*?[¥￥]([\d,]+\.\d{2})'
  tax_amount: '税额.*?[¥￥]([\d,]+\.\d{2})'
  
  # 交易方信息
  seller_name: 销售方名称[：:]([^\n]+?)(?=\s*统一社会信用代码|$)
  seller_tax_id: 销售方.*?统一社会信用代码[：:]([A-Z0-9]{18})
  buyer_name: 购买方名称[：:]([^\n]+?)(?=\s*统一社会信用代码|$)
  buyer_tax_id: 购买方.*?统一社会信用代码[：:]([A-Z0-9]{18})

options:
  currency: CNY
  date_formats:
    - '%Y年%m月%d日'
  remove_whitespace: false
```

### 5.2 批量处理脚本

```python
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
import os
import json

def batch_process_invoices(invoice_dir, template_dir, output_file):
    """批量处理发票"""
    # 加载模板
    templates = read_templates(template_dir)
    
    results = []
    for filename in os.listdir(invoice_dir):
        if filename.endswith('.pdf'):
            filepath = os.path.join(invoice_dir, filename)
            try:
                # 提取数据
                data = extract_data(filepath, templates=templates)
                if data:
                    data['filename'] = filename
                    results.append(data)
                    print(f"✓ 成功: {filename}")
                else:
                    print(f"✗ 失败: {filename} - 无匹配模板")
            except Exception as e:
                print(f"✗ 错误: {filename} - {str(e)}")
    
    # 保存结果
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n处理完成: {len(results)} 个发票")
    return results
```

### 5.3 自定义文本提取器

```python
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

def extract_with_custom_parser(pdf_path, templates):
    """使用自定义解析器"""
    # 可以指定不同的文本提取方法
    # 选项: pdftotext, text, pdfminer, pdfplumber, tesseract, gvision
    
    result = extract_data(
        pdf_path, 
        templates=templates,
        input_module='pdfplumber'  # 使用 pdfplumber 提取文本
    )
    return result
```

## 6. 调试技巧

### 6.1 调试模式

```bash
# 查看详细的匹配过程
invoice2data --debug invoice.pdf

# 输出将显示：
# - 提取的文本内容
# - 尝试的模板
# - 匹配的关键词
# - 字段提取结果
```

### 6.2 模板测试脚本

```python
def test_template(template_file, test_pdf):
    """测试单个模板"""
    import yaml
    
    # 加载模板
    with open(template_file, 'r', encoding='utf-8') as f:
        template = yaml.safe_load(f)
    
    # 测试提取
    result = extract_data(test_pdf, templates=[template])
    
    if result:
        print("✓ 模板匹配成功")
        print(f"提取的字段: {list(result.keys())}")
        print(f"发票号码: {result.get('invoice_number')}")
        print(f"金额: {result.get('amount')}")
    else:
        print("✗ 模板匹配失败")
```

## 7. 性能优化

### 7.1 使用 libyaml

```bash
# 安装 libyaml 可以提升 YAML 解析速度 10 倍
sudo apt-get install libyaml-dev
pip install --force-reinstall --no-binary :all: pyyaml
```

### 7.2 使用 JSON 模板

```python
# JSON 模板比 YAML 更快
import json

# 将 YAML 转换为 JSON
with open('template.yml', 'r') as f:
    import yaml
    template = yaml.safe_load(f)

with open('template.json', 'w') as f:
    json.dump(template, f, indent=2)
```

### 7.3 并行处理

```python
from concurrent.futures import ProcessPoolExecutor
import os

def process_invoice(filepath, templates):
    """处理单个发票"""
    return extract_data(filepath, templates=templates)

def parallel_process(invoice_dir, templates, max_workers=4):
    """并行处理多个发票"""
    files = [os.path.join(invoice_dir, f) 
             for f in os.listdir(invoice_dir) 
             if f.endswith('.pdf')]
    
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        results = list(executor.map(
            lambda f: process_invoice(f, templates), 
            files
        ))
    
    return results
```

## 8. 常见问题

### 8.1 模板不匹配

- 确保关键词在 PDF 文本中完全匹配
- 使用 --debug 查看实际提取的文本
- 检查是否有特殊字符或空格问题

### 8.2 正则表达式不工作

- 测试时使用在线正则工具验证
- 注意转义特殊字符
- 使用 `(?:...)` 进行非捕获分组

### 8.3 中文处理

- 确保模板文件使用 UTF-8 编码
- 某些 PDF 可能需要 OCR 处理
- 注意全角/半角字符差异

## 9. 最佳实践

1. **模板组织**
   - 按供应商/发票类型组织模板
   - 使用描述性的文件名
   - 添加注释说明模板用途

2. **关键词选择**
   - 选择唯一性强的关键词
   - 避免使用可能变化的内容
   - 组合使用多个关键词提高准确性

3. **正则表达式**
   - 尽量精确匹配
   - 使用命名组提高可读性
   - 考虑边界情况

4. **错误处理**
   - 始终检查返回值
   - 记录失败的发票
   - 保留原始 PDF 用于人工处理

## 10. 扩展应用

invoice2data 不仅限于发票，还可用于：
- 收据提取
- 订单确认
- 报价单
- 任何结构化的 PDF 文档

通过灵活的模板系统，可以适配各种文档格式的数据提取需求。