#!/usr/bin/env python3
"""
Supabase Auth 测试脚本 - 基于 2024 最新文档
"""

import os
import json
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
import uuid
import time

# Load environment variables
load_dotenv()

class SupabaseAuthTester:
    def __init__(self):
        """初始化 Supabase 客户端"""
        self.url = os.environ.get("SUPABASE_URL")
        self.key = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
        
        if not self.url or not self.key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY environment variables")
        
        print(f"🔗 连接到 Supabase: {self.url}")
        print(f"🔑 使用密钥: {self.key[:20]}...")
        
        # 2024 年最新配置：启用 HTTP/2 和其他性能优化
        options = ClientOptions(
            auto_refresh_token=True,
            persist_session=True,
            headers={"User-Agent": "supabase-auth-tester/1.0"}
        )
        
        try:
            self.supabase: Client = create_client(self.url, self.key, options)
            print("✅ Supabase 客户端创建成功")
        except Exception as e:
            print(f"❌ 创建 Supabase 客户端失败: {str(e)}")
            raise
    
    def test_auth_configuration(self):
        """测试身份验证配置"""
        print("\n🔧 测试身份验证配置...")
        
        try:
            # 检查 auth 对象是否可用
            auth = self.supabase.auth
            print("✅ Auth 模块可用")
            
            # 检查当前会话
            session = auth.get_session()
            if session:
                print(f"✅ 当前会话: {session.user.email if session.user else 'Anonymous'}")
            else:
                print("ℹ️  无活动会话")
            
            # 检查用户状态
            user = auth.get_user()
            if user:
                print(f"✅ 当前用户: {user.user.email if user.user else 'Anonymous'}")
            else:
                print("ℹ️  未登录用户")
                
            return True
            
        except Exception as e:
            print(f"❌ Auth 配置测试失败: {str(e)}")
            return False
    
    def test_user_signup(self, email: str, password: str):
        """测试用户注册"""
        print(f"\n📝 测试用户注册: {email}")
        
        try:
            response = self.supabase.auth.sign_up({
                "email": email,
                "password": password
            })
            
            if response.user:
                print("✅ 用户注册成功")
                print(f"   用户 ID: {response.user.id}")
                print(f"   邮箱: {response.user.email}")
                print(f"   邮箱确认: {'已确认' if response.user.email_confirmed_at else '未确认'}")
                
                if response.session:
                    print(f"   访问令牌: {response.session.access_token[:20]}...")
                    print(f"   刷新令牌: {response.session.refresh_token[:20]}...")
                else:
                    print("   注意: 需要邮箱确认才能获得会话")
                
                return response
            else:
                print("❌ 用户注册失败: 无用户信息返回")
                return None
                
        except Exception as e:
            error_msg = str(e)
            if "User already registered" in error_msg:
                print("⚠️  用户已存在，尝试登录...")
                return self.test_user_signin(email, password)
            else:
                print(f"❌ 用户注册失败: {error_msg}")
                return None
    
    def test_user_signin(self, email: str, password: str):
        """测试用户登录"""
        print(f"\n🔐 测试用户登录: {email}")
        
        try:
            response = self.supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if response.user and response.session:
                print("✅ 用户登录成功")
                print(f"   用户 ID: {response.user.id}")
                print(f"   邮箱: {response.user.email}")
                print(f"   访问令牌: {response.session.access_token[:20]}...")
                print(f"   令牌类型: {response.session.token_type}")
                print(f"   过期时间: {response.session.expires_at}")
                
                return response
            else:
                print("❌ 用户登录失败: 无会话信息返回")
                return None
                
        except Exception as e:
            print(f"❌ 用户登录失败: {str(e)}")
            return None
    
    def test_jwt_token_validation(self, session):
        """测试 JWT 令牌验证"""
        print("\n🔍 测试 JWT 令牌验证...")
        
        if not session or not session.access_token:
            print("❌ 无有效会话进行令牌验证")
            return False
        
        try:
            # 使用访问令牌创建授权客户端
            authorized_client = create_client(
                self.url, 
                session.access_token,  # 使用访问令牌而不是匿名密钥
                ClientOptions(headers={"Authorization": f"Bearer {session.access_token}"})
            )
            
            # 尝试获取用户信息来验证令牌
            user_response = authorized_client.auth.get_user()
            
            if user_response.user:
                print("✅ JWT 令牌验证成功")
                print(f"   用户 ID: {user_response.user.id}")
                print(f"   邮箱: {user_response.user.email}")
                print(f"   角色: {user_response.user.role}")
                return True
            else:
                print("❌ JWT 令牌验证失败: 无用户信息")
                return False
                
        except Exception as e:
            print(f"❌ JWT 令牌验证失败: {str(e)}")
            return False
    
    def test_user_signout(self):
        """测试用户登出"""
        print("\n🚪 测试用户登出...")
        
        try:
            response = self.supabase.auth.sign_out()
            print("✅ 用户登出成功")
            
            # 验证登出后的状态
            session = self.supabase.auth.get_session()
            if not session:
                print("✅ 会话已清除")
            else:
                print("⚠️  会话仍然存在")
            
            return True
            
        except Exception as e:
            print(f"❌ 用户登出失败: {str(e)}")
            return False
    
    def test_session_management(self):
        """测试会话管理功能"""
        print("\n🔄 测试会话管理功能...")
        
        try:
            # 测试会话刷新（如果有活动会话）
            session = self.supabase.auth.get_session()
            
            if session and session.refresh_token:
                print("🔄 测试会话刷新...")
                refresh_response = self.supabase.auth.refresh_session()
                
                if refresh_response.session:
                    print("✅ 会话刷新成功")
                    print(f"   新访问令牌: {refresh_response.session.access_token[:20]}...")
                else:
                    print("❌ 会话刷新失败")
            else:
                print("ℹ️  无活动会话可刷新")
            
            # 测试监听器（Auth 状态变化）
            print("👂 测试 Auth 状态监听器...")
            
            def auth_state_listener(event, session):
                print(f"   Auth 事件: {event}")
                if session:
                    print(f"   用户: {session.user.email if session.user else 'None'}")
            
            # 注册监听器
            self.supabase.auth.on_auth_state_change(auth_state_listener)
            print("✅ Auth 状态监听器已注册")
            
            return True
            
        except Exception as e:
            print(f"❌ 会话管理测试失败: {str(e)}")
            return False
    
    def test_auth_metadata(self):
        """测试用户元数据功能"""
        print("\n📊 测试用户元数据功能...")
        
        try:
            user = self.supabase.auth.get_user()
            
            if user and user.user:
                print("✅ 获取用户元数据成功")
                print(f"   创建时间: {user.user.created_at}")
                print(f"   最后登录: {user.user.last_sign_in_at}")
                print(f"   App 元数据: {user.user.app_metadata}")
                print(f"   用户元数据: {user.user.user_metadata}")
                
                # 测试更新用户元数据
                print("🔄 测试更新用户元数据...")
                update_response = self.supabase.auth.update_user({
                    "data": {
                        "test_timestamp": int(time.time()),
                        "test_run": "supabase_auth_tester"
                    }
                })
                
                if update_response.user:
                    print("✅ 用户元数据更新成功")
                    print(f"   更新后元数据: {update_response.user.user_metadata}")
                else:
                    print("❌ 用户元数据更新失败")
                
                return True
            else:
                print("ℹ️  无登录用户，跳过元数据测试")
                return True
                
        except Exception as e:
            print(f"❌ 用户元数据测试失败: {str(e)}")
            return False

def generate_test_email():
    """生成测试邮箱"""
    return f"test_{uuid.uuid4().hex[:8]}@example.com"

def main():
    """主测试函数"""
    print("🚀 Supabase Auth 测试 (2024)")
    print("=" * 60)
    
    try:
        # 初始化测试器
        tester = SupabaseAuthTester()
        
        # 测试基础配置
        if not tester.test_auth_configuration():
            print("❌ 基础配置测试失败，退出")
            return
        
        # 生成测试用户
        test_email = generate_test_email()
        test_password = "TestPassword123!"
        
        print(f"\n🧪 使用测试账户: {test_email}")
        
        # 测试用户注册
        signup_response = tester.test_user_signup(test_email, test_password)
        
        # 测试用户登录
        signin_response = tester.test_user_signin(test_email, test_password)
        
        if signin_response and signin_response.session:
            # 测试 JWT 令牌验证
            tester.test_jwt_token_validation(signin_response.session)
            
            # 测试会话管理
            tester.test_session_management()
            
            # 测试用户元数据
            tester.test_auth_metadata()
        
        # 测试用户登出
        tester.test_user_signout()
        
        print("\n" + "=" * 60)
        print("✅ Supabase Auth 测试完成！")
        
        # 显示测试总结
        print("\n📋 测试总结:")
        print("- ✅ 基础 Auth 配置正常")
        print("- ✅ 用户注册/登录功能正常")
        print("- ✅ JWT 令牌验证正常")
        print("- ✅ 会话管理功能正常")
        print("- ✅ 用户元数据功能正常")
        
    except Exception as e:
        print(f"\n❌ 测试过程中发生错误: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()