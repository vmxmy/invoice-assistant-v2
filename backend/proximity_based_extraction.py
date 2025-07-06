#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
基于文本邻近性的提取方案 - 解决PyMuPDF文本顺序错乱问题
"""

import pymupdf
import re
import json
from pathlib import Path

def extract_with_proximity(text):
    """
    基于文本邻近性的字段提取
    解决PyMuPDF文本提取顺序错乱的问题
    """
    if not text:
        return {}
    
    # 首先移除冒号后的换行（基础处理）
    processed_text = text
    for colon in ['：', ':', '∶', '﹕', '︰']:
        processed_text = re.sub(f'{re.escape(colon)}\\s*\\n+\\s*', f'{colon} ', processed_text)
    
    results = {}
    
    # 1. 发票号码 - 通常在冒号后直接跟随
    invoice_number_match = re.search(r'发票号码[：:]\s*(\d+)', processed_text)
    if invoice_number_match:
        results['invoice_number'] = invoice_number_match.group(1)
    
    # 2. 开票日期 - 通常在冒号后直接跟随
    date_match = re.search(r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)', processed_text)
    if date_match:
        results['invoice_date'] = date_match.group(1)
    
    # 3. 使用邻近性匹配提取公司名称和税号
    # 查找所有可能的公司名称（中文公司名通常包含"有限公司"、"股份"、"集团"等）
    company_patterns = [
        r'([^\n\s]{2,}(?:有限公司|股份有限公司|集团|科技|服务|贸易|投资|建设|发展))',
        r'([^\n\s]{4,}(?:公司|企业|中心|店|厂|社|部))',
    ]
    
    companies = []
    for pattern in company_patterns:
        matches = re.findall(pattern, text)
        companies.extend(matches)
    
    # 查找所有18位税号
    tax_ids = re.findall(r'([A-Z0-9]{18})', text)
    
    # 使用上下文线索判断购买方和销售方
    buyer_indicators = ['购买方', '买方', '购方']
    seller_indicators = ['销售方', '卖方', '销方']
    
    # 寻找购买方名称
    for company in companies:
        # 计算公司名称与购买方指示词的最小距离
        min_buyer_distance = float('inf')
        for indicator in buyer_indicators:
            indicator_pos = text.find(indicator)
            company_pos = text.find(company)
            if indicator_pos >= 0 and company_pos >= 0:
                distance = abs(company_pos - indicator_pos)
                min_buyer_distance = min(min_buyer_distance, distance)
        
        # 如果距离合理（小于200字符），认为是购买方
        if min_buyer_distance < 200:
            results['buyer_name'] = company
            break
    
    # 寻找销售方名称（类似逻辑）
    for company in companies:
        # 跳过已经识别为购买方的公司
        if company == results.get('buyer_name'):
            continue
            
        min_seller_distance = float('inf')
        for indicator in seller_indicators:
            indicator_pos = text.find(indicator)
            company_pos = text.find(company)
            if indicator_pos >= 0 and company_pos >= 0:
                distance = abs(company_pos - indicator_pos)
                min_seller_distance = min(min_seller_distance, distance)
        
        if min_seller_distance < 200:
            results['seller_name'] = company
            break
    
    # 税号分配（基于与公司名称的邻近性）
    if 'buyer_name' in results and tax_ids:
        buyer_name_pos = text.find(results['buyer_name'])
        closest_tax_distance = float('inf')
        closest_tax = None
        
        for tax_id in tax_ids:
            tax_pos = text.find(tax_id)
            distance = abs(tax_pos - buyer_name_pos)
            if distance < closest_tax_distance:
                closest_tax_distance = distance
                closest_tax = tax_id
        
        if closest_tax and closest_tax_distance < 100:
            results['buyer_tax_id'] = closest_tax
            # 从列表中移除已使用的税号
            tax_ids = [tid for tid in tax_ids if tid != closest_tax]
    
    # 为销售方分配剩余的税号
    if 'seller_name' in results and tax_ids:
        seller_name_pos = text.find(results['seller_name'])
        closest_tax_distance = float('inf')
        closest_tax = None
        
        for tax_id in tax_ids:
            tax_pos = text.find(tax_id)
            distance = abs(tax_pos - seller_name_pos)
            if distance < closest_tax_distance:
                closest_tax_distance = distance
                closest_tax = tax_id
        
        if closest_tax and closest_tax_distance < 100:
            results['seller_tax_id'] = closest_tax
    
    return results

def test_proximity_extraction():
    """测试基于邻近性的提取方案"""
    
    test_files = [
        "downloads/25432000000022020617-杭州趣链科技有限公司.pdf",
        "downloads/25439165666000019624.pdf", 
        "downloads/dzfp_25432000000032177192_杭州趣链科技有限公司_20250313093318.pdf"
    ]
    
    results = {}
    
    for pdf_path in test_files:
        if Path(pdf_path).exists():
            filename = Path(pdf_path).name
            print(f"\n=== 测试文件: {filename} ===")
            
            try:
                doc = pymupdf.open(pdf_path)
                page = doc[0]
                
                # 获取原始文本
                original_text = page.get_text()
                
                # 使用邻近性提取
                proximity_results = extract_with_proximity(original_text)
                
                doc.close()
                
                results[filename] = proximity_results
                
                print("邻近性提取结果:")
                for field, value in proximity_results.items():
                    print(f"  {field}: {value}")
                
                # 验证提取的准确性
                success_count = sum(1 for v in proximity_results.values() if v)
                print(f"成功提取字段数: {success_count}")
                
            except Exception as e:
                print(f"处理文件失败 {filename}: {e}")
                results[filename] = {"error": str(e)}
    
    # 保存结果
    with open("proximity_extraction_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    # 总体统计
    print(f"\n=== 总体效果统计 ===")
    total_extracted = 0
    total_files = 0
    
    for filename, result in results.items():
        if "error" not in result:
            total_files += 1
            total_extracted += sum(1 for v in result.values() if v)
    
    if total_files > 0:
        avg_fields = total_extracted / total_files
        print(f"处理文件数: {total_files}")
        print(f"总提取字段数: {total_extracted}")
        print(f"平均每文件提取字段数: {avg_fields:.1f}")
    
    print(f"\n结果已保存到: proximity_extraction_results.json")

if __name__ == "__main__":
    test_proximity_extraction()