#!/usr/bin/env python3
"""
OCR服务单元测试

验证重构后的OCR服务是否正常工作，包括：
- Mock模式测试
- 配置验证
- 文件验证
- 异常处理
- 新版API测试
"""

import asyncio
import sys
import os
from pathlib import Path
import json
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ocr import OCRService, OCRConfig, OCRResult
from app.services.ocr.exceptions import (
    OCRError, OCRTimeoutError, OCRAPIError,
    OCRValidationError, OCRConfigError
)


async def test_mock_mode():
    """测试Mock模式"""
    print("=== 测试Mock模式 ===")
    
    # 创建Mock配置
    config = OCRConfig(
        api_token="mock_token",
        mock_mode=True
    )
    
    service = OCRService(config)
    
    try:
        # 创建一个临时测试文件
        test_file = Path("test_invoice.pdf")
        test_file.write_text("dummy content")
        
        async with service:
            result = await service.extract_invoice_data(str(test_file))
            
        print(f"✅ Mock模式测试成功")
        print(f"   状态: {result['status']}")
        print(f"   提取方法: {result['extraction_method']}")
        print(f"   置信度: {result['confidence']}")
        print(f"   发票号: {result.get('invoice_number', 'N/A')}")
        
        # 清理测试文件
        test_file.unlink()
        
        return True
        
    except Exception as e:
        print(f"❌ Mock模式测试失败: {e}")
        # 清理测试文件
        if test_file.exists():
            test_file.unlink()
        return False


async def test_config_validation():
    """测试配置验证"""
    print("\n=== 测试配置验证 ===")
    
    try:
        # 测试无效配置
        try:
            config = OCRConfig(
                api_token="",
                mock_mode=False,  # 非Mock模式但没有token
                poll_timeout=-1   # 无效的超时时间
            )
            print("❌ 配置验证失败: 应该抛出异常")
            return False
        except ValueError as e:
            print(f"✅ 配置验证正确: {e}")
        
        # 测试有效配置
        config = OCRConfig(
            api_token="valid_token",
            mock_mode=False,
            poll_timeout=600
        )
        print("✅ 有效配置创建成功")
        
        return True
        
    except Exception as e:
        print(f"❌ 配置验证测试失败: {e}")
        return False


async def test_file_validation():
    """测试文件验证"""
    print("\n=== 测试文件验证 ===")
    
    config = OCRConfig(api_token="test", mock_mode=True)
    service = OCRService(config)
    
    try:
        # 测试不存在的文件
        async with service:
            result = await service.extract_invoice_data("nonexistent.pdf")
        
        if result["status"] == "error" and "文件不存在" in result["error"]:
            print(f"✅ 不存在文件验证正确: {result['error']}")
        else:
            print("❌ 文件验证失败: 应该返回错误状态")
            return False
        
        # 测试无效文件类型
        test_file = Path("test.txt")
        test_file.write_text("test content")
        
        async with service:
            result = await service.extract_invoice_data(str(test_file))
        
        if result["status"] == "error" and "不支持的文件类型" in result["error"]:
            print(f"✅ 无效文件类型验证正确: {result['error']}")
            test_file.unlink()
        else:
            print("❌ 文件类型验证失败: 应该返回错误状态")
            test_file.unlink()
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ 文件验证测试失败: {e}")
        return False


async def test_health_check():
    """测试健康检查"""
    print("\n=== 测试健康检查 ===")
    
    config = OCRConfig(api_token="test", mock_mode=True)
    service = OCRService(config)
    
    try:
        async with service:
            health = await service.health_check()
            
        print(f"✅ 健康检查完成")
        print(f"   状态: {health.get('status', 'unknown')}")
        print(f"   响应时间: {health.get('response_time', 0):.3f}秒")
        
        return True
        
    except Exception as e:
        print(f"❌ 健康检查失败: {e}")
        return False


async def test_new_api():
    """测试新版API"""
    print("\n=== 测试新版API ===")
    
    config = OCRConfig(api_token="test", mock_mode=True)
    service = OCRService(config)
    
    try:
        # 创建测试文件
        test_file = Path("test_invoice.pdf")
        test_file.write_text("dummy content")
        
        async with service:
            # 测试新版API
            result_v2 = await service.extract_invoice_data_v2(str(test_file))
            
        print(f"✅ 新版API测试成功")
        print(f"   类型: {type(result_v2).__name__}")
        print(f"   状态: {result_v2.status}")
        print(f"   提取方法: {result_v2.extraction_method}")
        
        # 清理测试文件
        test_file.unlink()
        
        return True
        
    except Exception as e:
        print(f"❌ 新版API测试失败: {e}")
        if test_file.exists():
            test_file.unlink()
        return False


async def test_exception_context():
    """测试异常上下文"""
    print("\n=== 测试异常上下文 ===")
    
    try:
        # 测试带上下文的OCR错误
        error = OCRError(
            "测试错误",
            error_code="TEST001",
            context={"file": "test.pdf", "size": 1024}
        )
        error_str = str(error)
        assert "[TEST001]" in error_str
        assert "file=test.pdf" in error_str
        assert "size=1024" in error_str
        print("✅ OCRError上下文测试通过")
        
        # 测试超时错误
        timeout_error = OCRTimeoutError(
            "请求超时",
            timeout_seconds=30.0,
            operation="upload"
        )
        timeout_str = str(timeout_error)
        assert "timeout_seconds=30.0" in timeout_str
        assert "operation=upload" in timeout_str
        print("✅ OCRTimeoutError上下文测试通过")
        
        # 测试API错误
        api_error = OCRAPIError(
            "API错误",
            status_code=404,
            response_text="Not Found",
            request_url="https://api.test.com/v4/batch"
        )
        api_str = str(api_error)
        assert "status_code=404" in api_str
        assert "request_url=https://api.test.com/v4/batch" in api_str
        print("✅ OCRAPIError上下文测试通过")
        
        return True
        
    except Exception as e:
        print(f"❌ 异常上下文测试失败: {e}")
        return False


async def test_batch_processing():
    """测试批量处理"""
    print("\n=== 测试批量处理 ===")
    
    config = OCRConfig(api_token="test", mock_mode=True)
    service = OCRService(config)
    
    # 创建多个测试文件
    test_files = []
    for i in range(3):
        test_file = Path(f"test_batch_{i}.pdf")
        test_file.write_text(f"dummy content {i}")
        test_files.append(str(test_file))
    
    try:
        async with service:
            results = await service.batch_extract_invoice_data(test_files)
        
        print(f"✅ 批量处理测试成功")
        print(f"   处理文件数: {len(test_files)}")
        print(f"   返回结果数: {len(results)}")
        
        for i, result in enumerate(results):
            print(f"   文件{i+1} - 状态: {result.status}, 置信度: {result.confidence}")
        
        # 清理测试文件
        for file_path in test_files:
            Path(file_path).unlink(missing_ok=True)
        
        return True
        
    except Exception as e:
        print(f"❌ 批量处理测试失败: {e}")
        # 清理测试文件
        for file_path in test_files:
            Path(file_path).unlink(missing_ok=True)
        return False


async def main():
    """主测试函数"""
    print("🚀 开始测试新的OCR服务\n")
    
    tests = [
        test_mock_mode,
        test_config_validation,
        test_file_validation,
        test_health_check,
        test_new_api,
        test_exception_context,
        test_batch_processing
    ]
    
    results = []
    for test in tests:
        try:
            result = await test()
            results.append(result)
        except Exception as e:
            print(f"❌ 测试 {test.__name__} 异常: {e}")
            results.append(False)
    
    # 汇总结果
    passed = sum(results)
    total = len(results)
    
    print(f"\n📊 测试结果汇总:")
    print(f"   总测试数: {total}")
    print(f"   通过数: {passed}")
    print(f"   失败数: {total - passed}")
    print(f"   通过率: {passed/total*100:.1f}%")
    
    if passed == total:
        print("\n🎉 所有测试通过！新的OCR服务工作正常。")
        return 0
    else:
        print(f"\n⚠️  有 {total - passed} 个测试失败，需要检查。")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main()) 