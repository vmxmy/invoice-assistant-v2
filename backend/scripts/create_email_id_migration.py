"""创建邮件服务ID类型迁移脚本"""
import asyncio
from datetime import datetime
from supabase import create_client, Client
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://sfenhhtvcyslxplvewmt.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE")

# 创建 Supabase 客户端
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def create_migration_sql():
    """生成迁移 SQL"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    migration_name = f"{timestamp}_update_email_ids_to_uuid"
    
    migration_sql = f"""
-- Migration: {migration_name}
-- Description: 将邮件相关表的 ID 字段统一为 UUID 类型

-- 1. 修改 email_accounts 表的 user_id 字段类型
-- 首先删除可能存在的外键约束
ALTER TABLE email_accounts 
DROP CONSTRAINT IF EXISTS email_accounts_user_id_fkey;

-- 修改 user_id 字段类型为 UUID
ALTER TABLE email_accounts 
ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- 2. 修改 email_scan_jobs 表的 email_account_id 字段类型
-- 首先删除外键约束
ALTER TABLE email_scan_jobs 
DROP CONSTRAINT IF EXISTS email_scan_jobs_email_account_id_fkey;

-- 修改 email_account_id 字段类型为 UUID
ALTER TABLE email_scan_jobs 
ALTER COLUMN email_account_id TYPE UUID USING email_account_id::UUID;

-- 重新添加外键约束
ALTER TABLE email_scan_jobs 
ADD CONSTRAINT email_scan_jobs_email_account_id_fkey 
FOREIGN KEY (email_account_id) REFERENCES email_accounts(id) 
ON DELETE CASCADE;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_scan_jobs_email_account_id ON email_scan_jobs(email_account_id);

-- 添加注释
COMMENT ON COLUMN email_accounts.user_id IS '用户ID (UUID)';
COMMENT ON COLUMN email_scan_jobs.email_account_id IS '邮箱账户ID (UUID)';
"""
    
    return migration_name, migration_sql


def create_rollback_sql():
    """生成回滚 SQL"""
    rollback_sql = """
-- Rollback: 将邮件相关表的 ID 字段恢复为原始类型

-- 1. 恢复 email_scan_jobs 表的 email_account_id 字段类型
ALTER TABLE email_scan_jobs 
DROP CONSTRAINT IF EXISTS email_scan_jobs_email_account_id_fkey;

ALTER TABLE email_scan_jobs 
ALTER COLUMN email_account_id TYPE INTEGER USING 0;  -- 注意：这会丢失数据

-- 2. 恢复 email_accounts 表的 user_id 字段类型
ALTER TABLE email_accounts 
ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::TEXT;

-- 重新添加外键约束（如果需要）
-- ALTER TABLE email_scan_jobs 
-- ADD CONSTRAINT email_scan_jobs_email_account_id_fkey 
-- FOREIGN KEY (email_account_id) REFERENCES email_accounts(id) 
-- ON DELETE CASCADE;

-- 注意：回滚可能会导致数据丢失，请谨慎操作
"""
    
    return rollback_sql


async def main():
    """主函数"""
    print("创建邮件服务 ID 类型迁移文件...")
    
    # 生成迁移 SQL
    migration_name, migration_sql = create_migration_sql()
    rollback_sql = create_rollback_sql()
    
    # 保存迁移文件
    migration_dir = "/Users/xumingyang/app/invoice_assist/v2/backend/migrations"
    os.makedirs(migration_dir, exist_ok=True)
    
    # 保存迁移文件
    migration_file = os.path.join(migration_dir, f"{migration_name}.sql")
    with open(migration_file, "w", encoding="utf-8") as f:
        f.write(migration_sql)
    
    print(f"✅ 迁移文件已创建: {migration_file}")
    
    # 保存回滚文件
    rollback_file = os.path.join(migration_dir, f"{migration_name}_rollback.sql")
    with open(rollback_file, "w", encoding="utf-8") as f:
        f.write(rollback_sql)
    
    print(f"✅ 回滚文件已创建: {rollback_file}")
    
    print("\n迁移 SQL 内容:")
    print(migration_sql)
    
    print("\n请执行以下步骤:")
    print("1. 检查迁移 SQL 是否正确")
    print("2. 在 Supabase 控制台或使用 mcp__supabase__apply_migration 工具执行迁移")
    print("3. 验证表结构是否正确更新")
    print("4. 测试邮件扫描功能是否正常工作")


if __name__ == "__main__":
    asyncio.run(main())