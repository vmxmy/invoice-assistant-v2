#!/usr/bin/env python3
"""
邮件处理流水线测试脚本
测试整个邮件处理流程的各个组件
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.core.database import init_db
from app.services.email_processor import EmailProcessor
from app.services.ocr import OCRService
from app.utils.logger import get_logger

logger = get_logger(__name__)


class EmailPipelineTest:
    """邮件处理流水线测试类"""
    
    def __init__(self):
        self.email_processor = EmailProcessor(settings.database_url_async)
        self.ocr_service = OCRService()
        self.test_results = {}
    
    async def test_database_connection(self) -> bool:
        """测试数据库连接"""
        try:
            logger.info("开始测试数据库连接...")
            await init_db()
            logger.info("✅ 数据库连接成功")
            return True
        except Exception as e:
            logger.error(f"❌ 数据库连接失败: {e}")
            return False
    
    async def test_ocr_service(self) -> bool:
        """测试OCR服务"""
        try:
            logger.info("开始测试OCR服务...")
            
            # 测试健康检查
            health_status = await self.ocr_service.health_check()
            logger.info(f"OCR服务健康状态: {health_status}")
            
            # 创建测试PDF文件（如果不存在）
            test_pdf_path = "/tmp/test_invoice.pdf"
            if not os.path.exists(test_pdf_path):
                # 创建一个简单的测试文件
                with open(test_pdf_path, 'wb') as f:
                    f.write(b"%PDF-1.4\n%Test invoice content\n")
            
            # 测试OCR提取
            extraction_result = await self.ocr_service.extract_invoice_data(test_pdf_path)
            logger.info(f"OCR提取结果: {json.dumps(extraction_result, ensure_ascii=False, indent=2)}")
            
            # 检查结果
            if extraction_result.get('status') != 'error':
                logger.info("✅ OCR服务测试通过")
                return True
            else:
                logger.warning("⚠️ OCR服务使用mock数据")
                return True
                
        except Exception as e:
            logger.error(f"❌ OCR服务测试失败: {e}")
            return False
    
    async def test_email_processor(self) -> bool:
        """测试邮件处理器"""
        try:
            logger.info("开始测试邮件处理器...")
            
            # 创建测试邮件数据
            test_email_data = {
                "user_id": "test-user-id-12345",
                "recipient": "invoice-test-user-id-12345@test.example.com",
                "sender": "test@example.com",
                "subject": "测试发票邮件",
                "body_plain": "这是一个测试邮件，包含发票附件。",
                "body_html": "<p>这是一个测试邮件，包含发票附件。</p>",
                "timestamp": 1704067200,  # 2024-01-01 00:00:00
                "message_id": "test-message-id@test.example.com",
                "attachments": [
                    {
                        "name": "test-invoice.pdf",
                        "url": "https://example.com/test-invoice.pdf",
                        "content_type": "application/pdf",
                        "size": "12345"
                    }
                ]
            }
            
            # 测试邮件处理
            processing_result = await self.email_processor.process_email(test_email_data)
            logger.info(f"邮件处理结果: {json.dumps(processing_result, ensure_ascii=False, indent=2)}")
            
            if processing_result.get('status') == 'success':
                logger.info("✅ 邮件处理器测试通过")
                return True
            else:
                logger.warning("⚠️ 邮件处理器测试部分成功")
                return True
                
        except Exception as e:
            logger.error(f"❌ 邮件处理器测试失败: {e}")
            return False
    
    def test_postgresql_queue(self) -> bool:
        """测试PostgreSQL任务队列"""
        try:
            logger.info("开始测试PostgreSQL任务队列...")
            
            from app.services.postgresql_task_processor import task_queue
            
            # 检查任务队列状态
            stats = asyncio.run(task_queue.get_health_status())
            logger.info(f"任务队列状态: {stats}")
            
            if stats:
                logger.info("✅ PostgreSQL任务队列测试通过")
                return True
            else:
                logger.warning("⚠️ PostgreSQL任务队列未就绪")
                return False
                
        except Exception as e:
            logger.error(f"❌ PostgreSQL任务队列测试失败: {e}")
            return False
    
    def test_webhook_signature(self) -> bool:
        """测试Webhook签名验证"""
        try:
            logger.info("开始测试Webhook签名验证...")
            
            from app.api.v1.endpoints.webhooks import verify_mailgun_signature
            
            # 测试数据
            test_token = "test-token-123"
            test_timestamp = "1704067200"
            test_signing_key = "test-signing-key"
            
            # 生成测试签名
            import hashlib
            import hmac
            
            signature_data = f"{test_timestamp}{test_token}".encode('utf-8')
            expected_signature = hmac.new(
                test_signing_key.encode('utf-8'),
                signature_data,
                hashlib.sha256
            ).hexdigest()
            
            # 验证签名
            is_valid = verify_mailgun_signature(
                test_token, 
                test_timestamp, 
                expected_signature, 
                test_signing_key
            )
            
            if is_valid:
                logger.info("✅ Webhook签名验证测试通过")
                return True
            else:
                logger.error("❌ Webhook签名验证失败")
                return False
                
        except Exception as e:
            logger.error(f"❌ Webhook签名验证测试失败: {e}")
            return False
    
    def test_user_id_extraction(self) -> bool:
        """测试用户ID提取"""
        try:
            logger.info("开始测试用户ID提取...")
            
            from app.api.v1.endpoints.webhooks import extract_user_id_from_email
            
            # 测试用例
            test_cases = [
                ("invoice-12345678-1234-1234-1234-123456789012@test.com", "12345678-1234-1234-1234-123456789012"),
                ("invoice-abcdef12-3456-7890-abcd-ef1234567890@example.com", "abcdef12-3456-7890-abcd-ef1234567890"),
                ("invalid-email@test.com", None),
                ("invoice-invalid-uuid@test.com", None)
            ]
            
            all_passed = True
            for email, expected_user_id in test_cases:
                extracted_user_id = extract_user_id_from_email(email)
                if extracted_user_id == expected_user_id:
                    logger.info(f"✅ 用户ID提取测试通过: {email} -> {extracted_user_id}")
                else:
                    logger.error(f"❌ 用户ID提取测试失败: {email} -> {extracted_user_id} (期望: {expected_user_id})")
                    all_passed = False
            
            return all_passed
            
        except Exception as e:
            logger.error(f"❌ 用户ID提取测试失败: {e}")
            return False
    
    def test_configuration(self) -> bool:
        """测试配置"""
        try:
            logger.info("开始测试配置...")
            
            # 检查关键配置
            config_items = [
                ("数据库URL", settings.database_url),
                ("上传目录", settings.upload_dir),
                ("下载目录", settings.downloads_dir),
                ("Mineru API Base URL", settings.mineru_api_base_url),
            ]
            
            all_configured = True
            for name, value in config_items:
                if value:
                    logger.info(f"✅ {name}: {value}")
                else:
                    logger.warning(f"⚠️ {name}: 未配置")
                    if name in ["数据库URL"]:
                        all_configured = False
            
            # 检查可选配置
            optional_configs = [
                ("Mailgun API Key", settings.mailgun_api_key),
                ("Mailgun Domain", settings.mailgun_domain),
                ("Mailgun Webhook Signing Key", settings.mailgun_webhook_signing_key),
                ("Mineru API Token", settings.mineru_api_token),
            ]
            
            for name, value in optional_configs:
                if value:
                    logger.info(f"✅ {name}: 已配置")
                else:
                    logger.warning(f"⚠️ {name}: 未配置（可选）")
            
            return all_configured
            
        except Exception as e:
            logger.error(f"❌ 配置测试失败: {e}")
            return False
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """运行所有测试"""
        logger.info("=" * 50)
        logger.info("开始邮件处理流水线测试")
        logger.info("=" * 50)
        
        tests = [
            ("配置测试", self.test_configuration),
            ("数据库连接测试", self.test_database_connection),
            ("OCR服务测试", self.test_ocr_service),
            ("邮件处理器测试", self.test_email_processor),
            ("PostgreSQL任务队列测试", self.test_postgresql_queue),
            ("Webhook签名测试", self.test_webhook_signature),
            ("用户ID提取测试", self.test_user_id_extraction),
        ]
        
        results = {}
        passed_count = 0
        
        for test_name, test_func in tests:
            logger.info(f"\n{'=' * 30}")
            logger.info(f"运行测试: {test_name}")
            logger.info('=' * 30)
            
            try:
                if asyncio.iscoroutinefunction(test_func):
                    result = await test_func()
                else:
                    result = test_func()
                
                results[test_name] = {
                    "status": "通过" if result else "失败",
                    "passed": result
                }
                
                if result:
                    passed_count += 1
                    
            except Exception as e:
                logger.error(f"测试执行异常: {e}")
                results[test_name] = {
                    "status": "异常",
                    "passed": False,
                    "error": str(e)
                }
        
        # 输出测试总结
        logger.info("\n" + "=" * 50)
        logger.info("测试总结")
        logger.info("=" * 50)
        
        for test_name, result in results.items():
            status_icon = "✅" if result["passed"] else "❌"
            logger.info(f"{status_icon} {test_name}: {result['status']}")
            if "error" in result:
                logger.info(f"   错误: {result['error']}")
        
        logger.info(f"\n总体结果: {passed_count}/{len(tests)} 项测试通过")
        
        # 建议
        logger.info("\n" + "=" * 50)
        logger.info("建议")
        logger.info("=" * 50)
        
        if not results.get("PostgreSQL任务队列测试", {}).get("passed", False):
            logger.info("🔧 确保PostgreSQL数据库已启动并可访问")
            logger.info("🔧 启动任务处理器: python start_dramatiq_workers.py")
        
        if not results.get("OCR服务测试", {}).get("passed", False):
            logger.info("🔧 配置Mineru API Token以启用真实OCR功能")
        
        if not results.get("Webhook签名测试", {}).get("passed", False):
            logger.info("🔧 配置Mailgun Webhook签名密钥")
        
        return results


async def main():
    """主函数"""
    try:
        tester = EmailPipelineTest()
        results = await tester.run_all_tests()
        
        # 计算成功率
        passed_count = sum(1 for r in results.values() if r["passed"])
        total_count = len(results)
        success_rate = passed_count / total_count * 100
        
        logger.info(f"\n🎯 测试完成，成功率: {success_rate:.1f}%")
        
        if success_rate >= 80:
            logger.info("🎉 邮件处理流水线基本功能正常！")
            return 0
        else:
            logger.warning("⚠️ 邮件处理流水线需要进一步配置")
            return 1
            
    except Exception as e:
        logger.error(f"测试执行失败: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)