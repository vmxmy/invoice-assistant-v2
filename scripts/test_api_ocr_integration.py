#!/usr/bin/env python3
"""
测试API是否正确调用混合提取器
"""

import asyncio
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ocr import OCRService
from app.services.ocr.config import OCRConfig


async def test_ocr_service_import():
    """测试OCR服务导入"""
    print("="*60)
    print("测试API OCR集成")
    print("="*60)
    
    # 1. 测试默认OCRService的类型
    print("\n1. 测试默认OCRService:")
    service = OCRService()
    print(f"   类型: {type(service).__name__}")
    print(f"   模块: {type(service).__module__}")
    
    stats = service.get_statistics()
    print(f"   服务类型: {stats['service_type']}")
    print(f"   描述: {stats['description']}")
    
    # 2. 测试文件上传API中的导入
    print("\n2. 检查files.py中的OCR导入:")
    with open("app/api/v1/endpoints/files.py", "r") as f:
        content = f.read()
        
    # 查找OCR相关导入
    lines = content.split('\n')
    ocr_imports = []
    for i, line in enumerate(lines):
        if 'ocr' in line.lower() and ('import' in line or 'from' in line):
            ocr_imports.append(f"   第{i+1}行: {line.strip()}")
    
    if ocr_imports:
        print("   找到的OCR导入:")
        for imp in ocr_imports:
            print(imp)
    else:
        print("   ✗ 未找到OCR导入")
    
    # 3. 检查OCR调用
    print("\n3. 检查OCR调用方式:")
    
    # 查找EnhancedRuleExtractor的使用
    if 'EnhancedRuleExtractor' in content:
        print("   ✗ 仍在使用EnhancedRuleExtractor (第118-119行)")
        print("   需要更新为使用OCRService")
    else:
        print("   ✓ 未直接使用EnhancedRuleExtractor")
    
    # 查找OCRService的使用
    if 'OCRService' in content:
        print("   ✓ 使用了OCRService")
    else:
        print("   ✗ 未使用OCRService")
    
    # 4. 建议的修复
    print("\n4. 建议的修复方案:")
    print("   将第118-131行替换为:")
    print("""
        # 2. 使用OCR服务（自动使用混合提取器）
        from app.services.ocr import OCRService
        
        # 构造完整文件路径
        full_file_path = Path(settings.upload_dir) / temp_file_path
        
        # 创建OCR服务实例
        ocr_service = OCRService()
        
        # 调用OCR提取
        ocr_result = await ocr_service.extract_invoice_data(str(full_file_path))
    """)
    
    print("\n" + "="*60)
    print("结论:")
    if 'EnhancedRuleExtractor' in content:
        print("❌ API中仍在直接使用EnhancedRuleExtractor，需要更新为OCRService")
    else:
        print("✅ API已正确使用OCRService")


async def main():
    """主函数"""
    await test_ocr_service_import()


if __name__ == "__main__":
    asyncio.run(main())