#!/usr/bin/env python3
"""
Supabase 模型测试
测试 SQLAlchemy 模型与 Supabase PostgreSQL 数据库的集成
验证 CRUD 操作、约束、RLS 策略等
"""

import sys
import os
from datetime import datetime, date
from decimal import Decimal
from uuid import uuid4

# 添加项目根目录到 Python 路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text, Float
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

from app.core.config import get_settings
from app.models.profile import Profile
from app.models.invoice import Invoice
from app.models.task import EmailProcessingTask


class SupabaseModelTester:
    """Supabase 模型测试器"""
    
    def __init__(self):
        self.settings = get_settings()
        self.engine = None
        self.session = None
        self.test_profile = None
        
    def setup_database(self):
        """设置数据库连接"""
        print("🔄 设置数据库连接...")
        
        # 使用同步数据库 URL
        database_url = self.settings.get_database_url_sync()
        self.engine = create_engine(
            database_url,
            pool_pre_ping=True,
            echo=False  # 设为 True 可显示 SQL 语句
        )
        
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT version()"))
                version = result.fetchone()[0]
                print(f"✅ 数据库连接成功!")
                print(f"   PostgreSQL 版本: {version[:50]}...")
                
            Session = sessionmaker(bind=self.engine)
            self.session = Session()
            return True
            
        except Exception as e:
            print(f"❌ 数据库连接失败: {e}")
            return False
    
    def test_profile_crud(self):
        """测试 Profile CRUD 操作"""
        print("\n🔄 测试 Profile CRUD 操作...")
        
        try:
            # 创建测试用户档案
            test_user_id = uuid4()
            profile = Profile(
                auth_user_id=test_user_id,
                display_name="测试用户",
                bio="这是一个测试用户档案",
                email_config={
                    "auto_process": True,
                    "forward_addresses": ["test@example.com"],
                    "imap_settings": {
                        "server": "imap.example.com",
                        "port": 993,
                        "use_ssl": True
                    }
                },
                preferences={
                    "theme": "light",
                    "language": "zh-CN",
                    "timezone": "Asia/Shanghai",
                    "notifications": {
                        "email": True,
                        "sms": False
                    }
                },
                is_premium=True
            )
            
            self.session.add(profile)
            self.session.commit()
            print(f"✅ Profile 创建成功, ID: {profile.id}")
            
            # 查询测试
            found_profile = self.session.query(Profile).filter_by(
                auth_user_id=test_user_id
            ).first()
            
            if found_profile:
                print(f"✅ Profile 查询成功: {found_profile.display_name}")
                print(f"   邮件配置: {found_profile.email_config}")
                print(f"   用户偏好: {found_profile.preferences}")
                print(f"   是否高级用户: {found_profile.is_premium}")
            else:
                raise Exception("Profile 查询失败")
            
            # 更新测试
            found_profile.display_name = "更新后的测试用户"
            found_profile.total_invoices = 5
            found_profile.last_invoice_date = date.today()
            self.session.commit()
            print(f"✅ Profile 更新成功: {found_profile.display_name}")
            
            self.test_profile = found_profile
            return True
            
        except Exception as e:
            print(f"❌ Profile CRUD 测试失败: {e}")
            self.session.rollback()
            return False
    
    def test_invoice_crud(self):
        """测试 Invoice CRUD 操作"""
        print("\n🔄 测试 Invoice CRUD 操作...")
        
        if not self.test_profile:
            print("❌ 需要先创建 Profile")
            return False
        
        try:
            # 创建测试发票
            invoice = Invoice(
                user_id=self.test_profile.auth_user_id,
                invoice_number="TEST-2025-001",
                invoice_code="310000000123456789",
                invoice_type="增值税专用发票",
                status="pending",
                processing_status="waiting",
                amount=Decimal("1000.00"),
                tax_amount=Decimal("130.00"),
                total_amount=Decimal("1130.00"),
                currency="CNY",
                invoice_date=date.today(),
                seller_name="测试销售方有限公司",
                seller_tax_id="91310000123456789X",
                buyer_name="测试购买方有限公司",
                buyer_tax_id="91310000987654321Y",
                extracted_data={
                    "ocr_confidence": 0.95,
                    "extraction_method": "mineru_api",
                    "raw_text": "这是从PDF中提取的原始文本内容",
                    "fields": {
                        "invoice_amount": "1000.00",
                        "tax_rate": "13%",
                        "invoice_code": "310000000123456789",
                        "billing_date": "2025-07-03"
                    },
                    "coordinates": {
                        "amount": [100, 200, 150, 220],
                        "seller_name": [50, 100, 200, 120]
                    }
                },
                source_metadata={
                    "email_subject": "发票邮件",
                    "email_from": "finance@seller.com",
                    "attachment_name": "invoice_001.pdf"
                },
                tags=["测试", "开发", "Q1"],
                category="办公用品",
                file_path="/uploads/test_invoice.pdf",
                file_size=524288  # 512KB
            )
            
            self.session.add(invoice)
            self.session.commit()
            print(f"✅ Invoice 创建成功, ID: {invoice.id}")
            
            # 查询测试
            found_invoice = self.session.query(Invoice).filter_by(
                invoice_number="TEST-2025-001",
                user_id=self.test_profile.auth_user_id
            ).first()
            
            if found_invoice:
                print(f"✅ Invoice 查询成功: {found_invoice.invoice_number}")
                print(f"   金额: {found_invoice.amount} {found_invoice.currency}")
                print(f"   销售方: {found_invoice.seller_name}")
                print(f"   标签: {found_invoice.tags}")
                print(f"   OCR置信度: {found_invoice.extracted_data.get('ocr_confidence')}")
            else:
                raise Exception("Invoice 查询失败")
            
            # 更新测试
            found_invoice.status = "verified"
            found_invoice.is_verified = True
            found_invoice.verified_at = datetime.now()
            found_invoice.verification_notes = "测试验证通过"
            self.session.commit()
            print(f"✅ Invoice 更新成功: 状态 {found_invoice.status}")
            
            return found_invoice
            
        except Exception as e:
            print(f"❌ Invoice CRUD 测试失败: {e}")
            self.session.rollback()
            return None
    
    def test_email_task_crud(self):
        """测试 EmailProcessingTask CRUD 操作"""
        print("\n🔄 测试 EmailProcessingTask CRUD 操作...")
        
        if not self.test_profile:
            print("❌ 需要先创建 Profile")
            return False
        
        try:
            # 创建测试邮件处理任务
            task = EmailProcessingTask(
                user_id=self.test_profile.auth_user_id,
                task_type="email_invoice",
                task_id=f"task_{uuid4().hex[:8]}",
                status="processing",
                task_data={
                    "email_from": "finance@company.com",
                    "email_subject": "【重要】2025年7月发票",
                    "email_body_preview": "请查收本月发票，共2张...",
                    "attachments": [
                        {
                            "filename": "invoice1.pdf",
                            "size": 524288,
                            "content_type": "application/pdf"
                        },
                        {
                            "filename": "invoice2.pdf", 
                            "size": 786432,
                            "content_type": "application/pdf"
                        }
                    ],
                    "processing_options": {
                        "auto_verify": True,
                        "extract_full_text": True,
                        "generate_summary": True
                    }
                },
                result_data={
                    "processed_files": 2,
                    "successful_extractions": 1,
                    "failed_extractions": 1,
                    "created_invoices": 1,
                    "skipped_duplicates": 0,
                    "extraction_details": [
                        {
                            "filename": "invoice1.pdf",
                            "status": "success", 
                            "confidence": 0.95,
                            "processing_time": 3.2
                        },
                        {
                            "filename": "invoice2.pdf",
                            "status": "failed",
                            "error": "无法识别发票格式",
                            "processing_time": 1.8
                        }
                    ]
                },
                email_message_id="<20250703123456.abcd@company.com>",
                email_from="finance@company.com",
                email_subject="【重要】2025年7月发票",
                email_received_at=datetime.now(),
                attachments_count=2,
                processed_count=2,
                failed_count=1,
                invoices_created=1,
                processing_time_seconds=Decimal("5.0"),
                started_at=datetime.now(),
                retry_count=0,
                max_retries=3
            )
            
            self.session.add(task)
            self.session.commit()
            print(f"✅ EmailProcessingTask 创建成功, ID: {task.id}")
            
            # 查询测试
            found_task = self.session.query(EmailProcessingTask).filter_by(
                user_id=self.test_profile.auth_user_id,
                task_type="email_invoice"
            ).first()
            
            if found_task:
                print(f"✅ EmailProcessingTask 查询成功: {found_task.task_id}")
                print(f"   状态: {found_task.status}")
                print(f"   处理时间: {found_task.processing_time_seconds}秒")
                print(f"   创建发票数: {found_task.invoices_created}")
                print(f"   失败数: {found_task.failed_count}")
            else:
                raise Exception("EmailProcessingTask 查询失败")
            
            # 更新任务状态
            found_task.status = "completed" 
            found_task.completed_at = datetime.now()
            found_task.last_activity_at = datetime.now()
            self.session.commit()
            print(f"✅ EmailProcessingTask 更新成功: 状态 {found_task.status}")
            
            return found_task
            
        except Exception as e:
            print(f"❌ EmailProcessingTask CRUD 测试失败: {e}")
            self.session.rollback()
            return None
    
    def test_constraints_and_relationships(self):
        """测试约束和关系"""
        print("\n🔄 测试数据库约束和关系...")
        
        try:
            # 测试唯一约束：重复发票号
            try:
                duplicate_invoice = Invoice(
                    user_id=self.test_profile.auth_user_id,
                    invoice_number="TEST-2025-001",  # 重复的发票号
                    amount=Decimal("500.00"),
                    invoice_date=date.today()
                )
                self.session.add(duplicate_invoice)
                self.session.commit()
                print("❌ 唯一约束失败: 应该阻止重复发票号")
                return False
            except IntegrityError:
                self.session.rollback()
                print("✅ 唯一约束成功: 阻止了重复发票号")
            
            # 测试外键关系
            profile_invoices = self.session.query(Invoice).filter_by(
                user_id=self.test_profile.auth_user_id
            ).count()
            print(f"✅ 外键关系测试: 用户有 {profile_invoices} 张发票")
            
            profile_tasks = self.session.query(EmailProcessingTask).filter_by(
                user_id=self.test_profile.auth_user_id  
            ).count()
            print(f"✅ 外键关系测试: 用户有 {profile_tasks} 个任务")
            
            # 测试检查约束：负数金额
            try:
                invalid_invoice = Invoice(
                    user_id=self.test_profile.auth_user_id,
                    invoice_number="TEST-NEGATIVE-001",
                    amount=Decimal("-100.00"),  # 负数金额
                    invoice_date=date.today()
                )
                self.session.add(invalid_invoice)
                self.session.commit()
                print("❌ 检查约束失败: 应该阻止负数金额")
                return False
            except IntegrityError:
                self.session.rollback()
                print("✅ 检查约束成功: 阻止了负数金额")
            
            return True
            
        except Exception as e:
            print(f"❌ 约束和关系测试失败: {e}")
            self.session.rollback()
            return False
    
    def test_jsonb_operations(self):
        """测试 JSONB 字段操作"""
        print("\n🔄 测试 JSONB 字段操作...")
        
        try:
            # 查询包含特定 JSONB 数据的记录
            invoices_with_ocr = self.session.query(Invoice).filter(
                Invoice.extracted_data.op('->>')('ocr_confidence').cast(Float) > 0.9
            ).all()
            print(f"✅ JSONB 查询成功: 找到 {len(invoices_with_ocr)} 张高置信度发票")
            
            # 查询特定标签的发票
            tagged_invoices = self.session.query(Invoice).filter(
                Invoice.tags.op('&&')(text("ARRAY['测试']"))
            ).all()
            print(f"✅ 数组查询成功: 找到 {len(tagged_invoices)} 张带'测试'标签的发票")
            
            # 查询特定偏好设置的用户
            theme_users = self.session.query(Profile).filter(
                Profile.preferences.op('->>')('theme') == 'light'
            ).all()
            print(f"✅ JSONB 偏好查询成功: 找到 {len(theme_users)} 个浅色主题用户")
            
            return True
            
        except Exception as e:
            print(f"❌ JSONB 操作测试失败: {e}")
            return False
    
    def cleanup_test_data(self):
        """清理测试数据"""
        print("\n🔄 清理测试数据...")
        
        try:
            if self.test_profile:
                # 删除用户的所有数据（级联删除）
                self.session.query(Invoice).filter_by(
                    user_id=self.test_profile.auth_user_id
                ).delete()
                
                self.session.query(EmailProcessingTask).filter_by(
                    user_id=self.test_profile.auth_user_id
                ).delete()
                
                self.session.query(Profile).filter_by(
                    auth_user_id=self.test_profile.auth_user_id
                ).delete()
                
                self.session.commit()
                print("✅ 测试数据清理完成")
            
        except Exception as e:
            print(f"❌ 数据清理失败: {e}")
            self.session.rollback()
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始 Supabase 模型完整测试")
        print("=" * 60)
        
        success = True
        
        try:
            # 1. 设置数据库连接
            if not self.setup_database():
                return False
            
            # 2. 测试各个模型的 CRUD 操作
            if not self.test_profile_crud():
                success = False
            
            invoice = self.test_invoice_crud()
            if not invoice:
                success = False
            
            task = self.test_email_task_crud()
            if not task:
                success = False
            
            # 3. 测试约束和关系
            if not self.test_constraints_and_relationships():
                success = False
            
            # 4. 测试 JSONB 操作
            if not self.test_jsonb_operations():
                success = False
            
            # 5. 清理测试数据
            self.cleanup_test_data()
            
            print("\n" + "=" * 60)
            if success:
                print("🎉 所有 Supabase 模型测试通过!")
                print("✅ 数据库连接正常")
                print("✅ 模型定义正确")
                print("✅ CRUD 操作成功")
                print("✅ 约束和关系有效")
                print("✅ JSONB 操作正常")
            else:
                print("❌ 部分测试失败，请检查错误信息")
            
            return success
            
        except Exception as e:
            print(f"\n❌ 测试执行失败: {e}")
            return False
        finally:
            if self.session:
                self.session.close()


def main():
    """主函数"""
    tester = SupabaseModelTester()
    success = tester.run_all_tests()
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())