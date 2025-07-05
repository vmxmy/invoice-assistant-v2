-- 邮件地址管理系统迁移
-- 创建email_addresses表和相关索引

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
CREATE INDEX idx_email_addresses_user_id ON email_addresses(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_addresses_email ON email_addresses(email_address) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_addresses_user_status ON email_addresses(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_addresses_type ON email_addresses(address_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_addresses_domain ON email_addresses(domain) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_addresses_is_default ON email_addresses(user_id, is_default) WHERE deleted_at IS NULL AND is_default = true;
CREATE INDEX idx_email_addresses_expires_at ON email_addresses(expires_at) WHERE deleted_at IS NULL AND expires_at IS NOT NULL;

-- GIN索引用于JSONB字段
CREATE INDEX idx_email_addresses_config_gin ON email_addresses USING gin(config) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_addresses_allowed_senders_gin ON email_addresses USING gin(allowed_senders) WHERE deleted_at IS NULL;

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_email_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER update_email_addresses_updated_at
    BEFORE UPDATE ON email_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_email_addresses_updated_at();

-- 确保每个用户只有一个默认地址的触发器函数
CREATE OR REPLACE FUNCTION ensure_single_default_email()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果设置为默认地址，清除该用户的其他默认地址
    IF NEW.is_default = true AND (TG_OP = 'INSERT' OR OLD.is_default = false) THEN
        UPDATE email_addresses 
        SET is_default = false 
        WHERE user_id = NEW.user_id 
          AND id != NEW.id 
          AND is_default = true
          AND deleted_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建默认地址唯一性触发器
CREATE TRIGGER ensure_single_default_email_trigger
    BEFORE INSERT OR UPDATE ON email_addresses
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_email();

-- 添加外键约束到profiles表 (如果profiles表存在)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE email_addresses 
        ADD CONSTRAINT fk_email_addresses_user_id 
        FOREIGN KEY (user_id) REFERENCES profiles(auth_user_id) ON DELETE CASCADE;
    END IF;
END $$;

-- 添加RLS (Row Level Security) 策略
ALTER TABLE email_addresses ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略：用户只能访问自己的邮件地址
CREATE POLICY "Users can view own email addresses" ON email_addresses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email addresses" ON email_addresses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email addresses" ON email_addresses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email addresses" ON email_addresses
    FOR DELETE USING (auth.uid() = user_id);

-- 为系统服务账户创建绕过策略（如果需要）
CREATE POLICY "Service accounts can manage all email addresses" ON email_addresses
    FOR ALL USING (
        current_setting('app.current_user_role', true) = 'service_account'
    );

-- 创建用于邮件地址统计的视图
CREATE OR REPLACE VIEW email_address_stats AS
SELECT 
    user_id,
    COUNT(*) as total_addresses,
    COUNT(*) FILTER (WHERE status = 'active') as active_addresses,
    COUNT(*) FILTER (WHERE is_default = true) as default_addresses,
    SUM(total_emails_received) as total_emails_received,
    MAX(last_email_received_at) as last_email_received,
    COUNT(*) FILTER (WHERE address_type = 'primary') as primary_addresses,
    COUNT(*) FILTER (WHERE address_type = 'work') as work_addresses,
    COUNT(*) FILTER (WHERE address_type = 'personal') as personal_addresses,
    COUNT(*) FILTER (WHERE address_type = 'temporary') as temporary_addresses,
    COUNT(*) FILTER (WHERE address_type = 'custom') as custom_addresses
FROM email_addresses 
WHERE deleted_at IS NULL
GROUP BY user_id;

-- 创建邮件地址使用频率视图
CREATE OR REPLACE VIEW email_address_usage AS
SELECT 
    id,
    user_id,
    email_address,
    total_emails_received,
    last_email_received_at,
    CASE 
        WHEN last_email_received_at IS NULL THEN 'never_used'
        WHEN last_email_received_at > NOW() - INTERVAL '7 days' THEN 'active'
        WHEN last_email_received_at > NOW() - INTERVAL '30 days' THEN 'recent'
        WHEN last_email_received_at > NOW() - INTERVAL '90 days' THEN 'inactive'
        ELSE 'dormant'
    END as usage_category,
    EXTRACT(DAYS FROM NOW() - last_email_received_at) as days_since_last_email
FROM email_addresses 
WHERE deleted_at IS NULL;

-- 添加注释
COMMENT ON TABLE email_addresses IS '用户邮件地址管理表';
COMMENT ON COLUMN email_addresses.user_id IS '关联的用户ID (profiles.auth_user_id)';
COMMENT ON COLUMN email_addresses.email_address IS '完整的邮件地址';
COMMENT ON COLUMN email_addresses.local_part IS '邮件地址本地部分 (@符号前)';
COMMENT ON COLUMN email_addresses.domain IS '邮件域名';
COMMENT ON COLUMN email_addresses.address_type IS '地址类型：主要、工作、个人、临时、自定义';
COMMENT ON COLUMN email_addresses.status IS '地址状态：激活、停用、待审、暂停、过期';
COMMENT ON COLUMN email_addresses.is_default IS '是否为用户的默认地址';
COMMENT ON COLUMN email_addresses.total_emails_received IS '接收邮件总数';
COMMENT ON COLUMN email_addresses.config IS '地址配置选项 (JSONB)';
COMMENT ON COLUMN email_addresses.expires_at IS '地址过期时间';
COMMENT ON COLUMN email_addresses.allowed_senders IS '允许的发件人列表 (JSONB数组)';

-- 创建用于清理过期地址的函数
CREATE OR REPLACE FUNCTION cleanup_expired_email_addresses()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE email_addresses 
    SET status = 'expired'
    WHERE expires_at < NOW() 
      AND status != 'expired' 
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- 创建定期清理的cron任务（如果支持pg_cron扩展）
-- SELECT cron.schedule('cleanup-expired-emails', '0 2 * * *', 'SELECT cleanup_expired_email_addresses();');

-- 插入示例数据（开发环境）
-- 注意：在生产环境中删除这部分
DO $$
BEGIN
    IF current_setting('app.environment', true) = 'development' THEN
        -- 这里可以插入一些测试数据
        -- INSERT INTO email_addresses (...) VALUES (...);
        RAISE NOTICE '开发环境：可以在这里添加测试数据';
    END IF;
END $$;