#!/usr/bin/env python3
"""
直接创建email_addresses表
"""

import asyncio
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, get_db_context
from sqlalchemy import text

# 读取迁移SQL文件
migration_sql = """
-- 创建邮件地址类型枚举
CREATE TYPE email_address_type AS ENUM (
    'primary',
    'work', 
    'personal',
    'temporary',
    'custom'
);

-- 创建邮件地址状态枚举
CREATE TYPE email_address_status AS ENUM (
    'active',
    'inactive',
    'pending',
    'suspended',
    'expired'
);

-- 创建邮件地址表
CREATE TABLE IF NOT EXISTS email_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- 邮件地址信息
    email_address VARCHAR(255) NOT NULL UNIQUE,
    local_part VARCHAR(64) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    
    -- 地址属性
    address_type email_address_type NOT NULL DEFAULT 'primary',
    alias VARCHAR(50),
    description VARCHAR(200),
    
    -- 状态管理
    status email_address_status NOT NULL DEFAULT 'active',
    is_default BOOLEAN NOT NULL DEFAULT false,
    
    -- 使用统计
    total_emails_received INTEGER NOT NULL DEFAULT 0,
    last_email_received_at TIMESTAMPTZ,
    
    -- 配置选项
    config JSONB NOT NULL DEFAULT '{}',
    
    -- 有效期管理
    expires_at TIMESTAMPTZ,
    
    -- 安全选项
    allowed_senders JSONB NOT NULL DEFAULT '[]',
    
    -- 审计字段
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID,
    updated_by UUID,
    
    -- 约束
    CONSTRAINT valid_email_format 
        CHECK (email_address ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
    CONSTRAINT non_negative_email_count 
        CHECK (total_emails_received >= 0),
    CONSTRAINT valid_local_part_length 
        CHECK (length(local_part) <= 64),
    CONSTRAINT valid_domain_length 
        CHECK (length(domain) <= 100)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_email_addresses_user_id ON email_addresses(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_addresses_email ON email_addresses(email_address) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_addresses_user_status ON email_addresses(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_addresses_type ON email_addresses(address_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_addresses_domain ON email_addresses(domain) WHERE deleted_at IS NULL;

-- GIN索引用于JSONB字段
CREATE INDEX IF NOT EXISTS idx_email_addresses_config_gin ON email_addresses USING gin(config) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_addresses_allowed_senders_gin ON email_addresses USING gin(allowed_senders) WHERE deleted_at IS NULL;

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_email_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS update_email_addresses_updated_at ON email_addresses;
CREATE TRIGGER update_email_addresses_updated_at
    BEFORE UPDATE ON email_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_email_addresses_updated_at();

-- 添加外键约束到profiles表
ALTER TABLE email_addresses 
ADD CONSTRAINT IF NOT EXISTS fk_email_addresses_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(auth_user_id) ON DELETE CASCADE;
"""

async def create_table():
    """创建email_addresses表"""
    print("🔧 创建email_addresses表...")
    
    try:
        async with get_db_context() as db:
            # 执行迁移SQL
            await db.execute(text(migration_sql))
            await db.commit()
            
            # 验证表是否创建成功
            result = await db.execute(text("SELECT COUNT(*) FROM email_addresses"))
            count = result.scalar()
            
            print(f"✅ email_addresses表创建成功，当前有 {count} 条记录")
            return True
            
    except Exception as e:
        print(f"❌ 创建表失败: {str(e)}")
        return False

async def main():
    """主函数"""
    print("🎯 创建email_addresses表")
    print("=" * 40)
    
    success = await create_table()
    
    if success:
        print("\n🎉 表创建成功！")
        return 0
    else:
        print("\n💥 表创建失败！")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)