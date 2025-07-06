#\!/usr/bin/env python3
"""
调试invoice2data，查看实际提取结果
"""

import sys
from pathlib import Path
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
import json

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def test_invoice2data():
    """测试invoice2data提取"""
    
    # 选择一个测试文件
    downloads_dir = Path("downloads")
    pdf_files = list(downloads_dir.glob("*.pdf"))
    
    if not pdf_files:
        print("没有找到PDF文件")
        return
    
    # 加载模板
    templates_dir = Path(__file__).parent / "app/services/ocr/templates"
    print(f"模板目录: {templates_dir}")
    
    if templates_dir.exists():
        templates = read_templates(str(templates_dir))
        print(f"加载了 {len(templates)} 个模板")
        
        # 显示模板内容
        for template in templates:
            print(f"\n模板: {template['issuer']}")
            print(f"字段规则:")
            for field, pattern in template.get('fields', {}).items():
                print(f"  - {field}: {pattern}")
    else:
        print("模板目录不存在")
        return
    
    # 测试前3个文件
    for i, pdf_file in enumerate(pdf_files[:3]):
        print(f"\n{'='*60}")
        print(f"测试文件 {i+1}: {pdf_file.name}")
        print(f"{'='*60}")
        
        # 提取数据
        result = extract_data(str(pdf_file), templates=templates)
        
        if result:
            print(f"\n提取结果:")
            print(json.dumps(result, ensure_ascii=False, indent=2))
            
            # 特别关注销售方信息
            if 'seller_name' in result:
                print(f"\n销售方名称: '{result['seller_name']}'")
            else:
                print(f"\n未提取到销售方名称")
        else:
            print("未能提取数据")

if __name__ == "__main__":
    test_invoice2data()
EOF < /dev/null