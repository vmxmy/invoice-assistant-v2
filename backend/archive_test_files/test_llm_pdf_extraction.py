#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试使用LLM大模型处理PDF并返回结构化数据
"""

import os
import json
import base64
import fitz  # PyMuPDF
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
import openai
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class LLMPDFExtractor:
    """使用LLM大模型提取PDF发票信息"""
    
    def __init__(self):
        # 配置OpenAI客户端
        self.client = openai.OpenAI(
            api_key=os.getenv('OPENAI_API_KEY'),
            base_url=os.getenv('OPENAI_API_BASE', 'https://api.openai.com/v1')
        )
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4-vision-preview')
        
    def pdf_to_images(self, pdf_path: str) -> List[bytes]:
        """将PDF转换为图片"""
        doc = fitz.open(pdf_path)
        images = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            # 使用2倍分辨率确保清晰度
            mat = fitz.Matrix(2, 2)
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.pil_tobytes(format="PNG")
            images.append(img_data)
            
        doc.close()
        return images
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """提取PDF文本作为上下文"""
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    
    def create_extraction_prompt(self) -> str:
        """创建结构化提取的提示词"""
        return """你是一个专业的发票信息提取助手。请从提供的发票图片中提取以下信息，并以JSON格式返回。

需要提取的字段：
1. invoice_number: 发票号码（20位数字）
2. invoice_date: 开票日期（格式：YYYY-MM-DD）
3. buyer_name: 购买方名称（公司全称）
4. buyer_tax_id: 购买方纳税人识别号
5. seller_name: 销售方名称（公司全称）
6. seller_tax_id: 销售方纳税人识别号
7. total_amount: 价税合计金额（数字，不含货币符号）
8. amount_without_tax: 不含税金额（如果有）
9. tax_amount: 税额（如果有）
10. project_name: 项目名称/货物或应税劳务名称
11. invoice_type: 发票类型（如：电子普通发票、增值税专用发票等）
12. issuer_person: 开票人

重要提示：
- 如果某个字段无法找到，请设置为null
- 金额字段请只返回数字，不要包含货币符号
- 日期格式统一为YYYY-MM-DD
- 对于火车票、飞机票等特殊发票，请尽可能提取相应信息
- 如果是火车票，project_name可以设置为"铁路旅客运输"
- 如果是餐饮发票，project_name通常包含"餐饮"字样

请直接返回JSON格式的数据，不要包含其他解释文字。"""
    
    async def extract_with_vision(self, pdf_path: str) -> Dict:
        """使用视觉模型提取PDF信息"""
        try:
            # 将PDF转换为图片
            images = self.pdf_to_images(pdf_path)
            if not images:
                return {'error': '无法转换PDF为图片'}
            
            # 构建消息
            messages = [
                {
                    "role": "system",
                    "content": self.create_extraction_prompt()
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "请提取这张发票的信息："
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{base64.b64encode(images[0]).decode()}"
                            }
                        }
                    ]
                }
            ]
            
            # 调用API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=1000,
                temperature=0.1  # 降低温度以获得更稳定的输出
            )
            
            # 解析响应
            content = response.choices[0].message.content
            
            # 尝试解析JSON
            try:
                # 去除可能的markdown代码块标记
                if content.startswith('```json'):
                    content = content[7:]
                if content.endswith('```'):
                    content = content[:-3]
                
                result = json.loads(content.strip())
                return result
            except json.JSONDecodeError:
                return {
                    'error': 'JSON解析失败',
                    'raw_response': content
                }
                
        except Exception as e:
            return {
                'error': f'API调用失败: {str(e)}'
            }
    
    async def extract_with_text(self, pdf_path: str) -> Dict:
        """使用纯文本模式提取PDF信息"""
        try:
            # 提取PDF文本
            text = self.extract_text_from_pdf(pdf_path)
            if not text.strip():
                return {'error': '无法提取PDF文本'}
            
            # 构建消息
            messages = [
                {
                    "role": "system",
                    "content": self.create_extraction_prompt()
                },
                {
                    "role": "user",
                    "content": f"请从以下发票文本中提取信息：\n\n{text}"
                }
            ]
            
            # 调用API
            response = self.client.chat.completions.create(
                model=os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo'),
                messages=messages,
                max_tokens=1000,
                temperature=0.1
            )
            
            # 解析响应
            content = response.choices[0].message.content
            
            # 尝试解析JSON
            try:
                if content.startswith('```json'):
                    content = content[7:]
                if content.endswith('```'):
                    content = content[:-3]
                
                result = json.loads(content.strip())
                return result
            except json.JSONDecodeError:
                return {
                    'error': 'JSON解析失败',
                    'raw_response': content
                }
                
        except Exception as e:
            return {
                'error': f'API调用失败: {str(e)}'
            }
    
    def extract_from_pdf(self, pdf_path: str, use_vision: bool = True) -> Dict:
        """同步方法提取PDF信息"""
        import asyncio
        
        if use_vision:
            return asyncio.run(self.extract_with_vision(pdf_path))
        else:
            return asyncio.run(self.extract_with_text(pdf_path))

def test_single_file(extractor: LLMPDFExtractor, pdf_path: str, use_vision: bool = True):
    """测试单个文件"""
    print(f"\n{'='*60}")
    print(f"测试文件: {os.path.basename(pdf_path)}")
    print(f"模式: {'视觉模型' if use_vision else '文本模型'}")
    print('='*60)
    
    start_time = datetime.now()
    result = extractor.extract_from_pdf(pdf_path, use_vision)
    end_time = datetime.now()
    
    print(f"处理时间: {(end_time - start_time).total_seconds():.2f}秒")
    
    if 'error' in result:
        print(f"❌ 错误: {result['error']}")
        if 'raw_response' in result:
            print(f"原始响应: {result['raw_response'][:200]}...")
    else:
        print("✅ 成功提取")
        print("\n提取的数据:")
        for key, value in result.items():
            if value is not None:
                print(f"  {key}: {value}")
    
    return result

def test_all_pdfs(extractor: LLMPDFExtractor, use_vision: bool = True):
    """测试所有PDF文件"""
    # 获取所有PDF文件
    pdf_files = []
    for root, dirs, files in os.walk("downloads"):
        for file in files:
            if file.endswith('.pdf') and not file.endswith('_annotated.pdf'):
                pdf_files.append(os.path.join(root, file))
    
    print(f"\n找到 {len(pdf_files)} 个PDF文件")
    
    # 为了测试，只处理前几个文件
    test_files = pdf_files[:5]  # 只测试前5个文件，避免API调用过多
    
    results = []
    stats = {
        'total': len(test_files),
        'success': 0,
        'errors': [],
        'field_extraction': {}
    }
    
    # 定义要统计的字段
    target_fields = ['invoice_number', 'invoice_date', 'buyer_name', 
                    'seller_name', 'total_amount', 'project_name']
    
    for field in target_fields:
        stats['field_extraction'][field] = 0
    
    print(f"\n测试 {len(test_files)} 个文件...")
    print("="*80)
    
    for i, pdf_path in enumerate(test_files):
        print(f"\n[{i+1}/{len(test_files)}] 处理: {os.path.relpath(pdf_path, 'downloads')}")
        
        result = extractor.extract_from_pdf(pdf_path, use_vision)
        
        file_result = {
            'file': os.path.basename(pdf_path),
            'success': 'error' not in result,
            'data': result
        }
        results.append(file_result)
        
        if 'error' not in result:
            stats['success'] += 1
            
            # 统计字段提取
            for field in target_fields:
                if field in result and result[field] is not None:
                    stats['field_extraction'][field] += 1
        else:
            stats['errors'].append({
                'file': os.path.basename(pdf_path),
                'error': result.get('error')
            })
    
    # 打印统计
    print("\n" + "="*80)
    print(f"LLM {'视觉' if use_vision else '文本'}模型提取统计:")
    print("="*80)
    
    success_rate = stats['success'] / stats['total'] * 100
    print(f"总体成功率: {stats['success']}/{stats['total']} ({success_rate:.1f}%)")
    
    print("\n字段提取成功率:")
    field_names = {
        'invoice_number': '发票号码',
        'invoice_date': '开票日期',
        'buyer_name': '采购方',
        'seller_name': '销售方',
        'total_amount': '含税金额',
        'project_name': '项目名称'
    }
    
    for field, count in stats['field_extraction'].items():
        percentage = count / stats['total'] * 100
        field_name = field_names.get(field, field)
        print(f"  {field_name:<10}: {count:>2}/{stats['total']} ({percentage:>5.1f}%)")
    
    if stats['errors']:
        print("\n失败文件:")
        for error in stats['errors']:
            print(f"  {error['file']}: {error['error']}")
    
    # 保存结果
    output_file = f"llm_extraction_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'mode': 'vision' if use_vision else 'text',
            'statistics': stats,
            'results': results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n结果已保存到: {output_file}")
    
    return results, stats

def main():
    # 检查API配置
    if not os.getenv('OPENAI_API_KEY'):
        print("错误：未配置OPENAI_API_KEY环境变量")
        print("请在.env文件中设置：")
        print("OPENAI_API_KEY=your-api-key")
        print("OPENAI_API_BASE=your-api-base-url (可选)")
        print("OPENAI_MODEL=your-model-name (可选)")
        return
    
    # 创建提取器
    extractor = LLMPDFExtractor()
    
    # 测试特定的失败文件
    problem_files = [
        "downloads/25432000000031789815.pdf",  # 垂直文本布局
        "downloads/25442000000101203423.pdf",  # 另一个垂直文本
        "downloads/25432000000022020617-杭州趣链科技有限公司.pdf"  # 正常文件对比
    ]
    
    print("测试问题文件...")
    for pdf_path in problem_files:
        if Path(pdf_path).exists():
            # 测试视觉模型
            test_single_file(extractor, pdf_path, use_vision=True)
            
            # 测试文本模型
            # test_single_file(extractor, pdf_path, use_vision=False)
    
    # 测试更多文件
    print("\n\n开始批量测试...")
    test_all_pdfs(extractor, use_vision=True)

if __name__ == "__main__":
    main()