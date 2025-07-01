#!/usr/bin/env python3
"""
测试环境配置脚本
"""

from app.core.config import get_settings

def test_config():
    """测试配置加载"""
    settings = get_settings()
    
    print("=== 应用配置 ===")
    print(f"应用名称: {settings.app_name}")
    print(f"应用版本: {settings.app_version}")
    print(f"端口: {settings.app_port}")
    print(f"调试模式: {settings.debug}")
    print(f"环境: {'开发' if settings.is_development else '生产'}")
    
    print("\n=== CORS 配置 ===")
    print(f"允许的源: {settings.cors_origins_list}")
    
    print("\n=== Supabase 配置 ===")
    print(f"Supabase URL: {settings.supabase_url[:50]}...")
    print(f"Supabase Key: {settings.supabase_key[:20]}...")
    
    print("\n=== 数据库配置 ===")
    print(f"数据库 URL: {settings.database_url[:50]}...")
    print(f"连接池大小: {settings.database_pool_size}")
    
    print("\n=== 外部服务配置 ===")
    print(f"Mailgun Domain: {settings.mailgun_domain}")
    print(f"Mineru API URL: {settings.mineru_api_base_url}")
    
    print("\n=== API 配置 ===")
    print(f"API 前缀: {settings.api_v1_prefix}")
    print(f"文档 URL: {settings.docs_url}")
    print(f"启用文档: {settings.enable_docs}")
    
    print("\n✅ 配置加载成功！")

if __name__ == "__main__":
    test_config()