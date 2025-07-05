-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    bio TEXT,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    email_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_invoices INTEGER NOT NULL DEFAULT 0,
    last_invoice_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    premium_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1
);

-- Create indexes for profiles
CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX idx_profiles_deleted_at ON profiles(deleted_at);
CREATE INDEX idx_profiles_is_active ON profiles(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_preferences_gin ON profiles USING gin(preferences);
CREATE INDEX idx_profiles_email_config_gin ON profiles USING gin(email_config);

-- Add foreign key to auth.users (commented out if auth schema not accessible)
-- ALTER TABLE profiles ADD CONSTRAINT fk_profiles_auth_user 
--     FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create email_processing_tasks table
CREATE TABLE IF NOT EXISTS email_processing_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    task_type VARCHAR(50) NOT NULL DEFAULT 'email_invoice',
    task_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    task_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_data JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    email_message_id VARCHAR(200),
    email_from VARCHAR(200),
    email_subject VARCHAR(500),
    email_received_at TIMESTAMPTZ,
    attachments_count INTEGER DEFAULT 0,
    processed_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    invoices_created INTEGER DEFAULT 0,
    processing_time_seconds NUMERIC(10,3),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_retry_count CHECK (retry_count >= 0),
    CONSTRAINT chk_processed_count CHECK (processed_count >= 0),
    CONSTRAINT chk_failed_count CHECK (failed_count >= 0),
    CONSTRAINT chk_invoices_created CHECK (invoices_created >= 0)
);

-- Create indexes for email_processing_tasks
CREATE INDEX idx_email_tasks_user_id ON email_processing_tasks(user_id);
CREATE INDEX idx_email_tasks_status ON email_processing_tasks(status);
CREATE INDEX idx_email_tasks_task_id ON email_processing_tasks(task_id);
CREATE INDEX idx_email_tasks_created_at ON email_processing_tasks(created_at DESC);
CREATE INDEX idx_email_tasks_deleted_at ON email_processing_tasks(deleted_at);
CREATE INDEX idx_email_tasks_user_status ON email_processing_tasks(user_id, status) 
    WHERE deleted_at IS NULL;
CREATE INDEX idx_email_tasks_retry ON email_processing_tasks(status, next_retry_at) 
    WHERE status = 'failed' AND retry_count < max_retries AND deleted_at IS NULL;
CREATE INDEX idx_email_tasks_task_data_gin ON email_processing_tasks USING gin(task_data);
CREATE INDEX idx_email_tasks_last_activity_at ON email_processing_tasks(last_activity_at);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email_task_id UUID,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_code VARCHAR(50),
    invoice_type VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    processing_status VARCHAR(20) DEFAULT 'waiting',
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'CNY',
    invoice_date DATE NOT NULL,
    seller_name VARCHAR(200),
    seller_tax_id VARCHAR(50),
    buyer_name VARCHAR(200),
    buyer_tax_id VARCHAR(50),
    extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    file_path VARCHAR(500),
    file_url VARCHAR(500),
    file_size INTEGER,
    file_hash VARCHAR(64),
    source VARCHAR(50) NOT NULL DEFAULT 'email',
    source_metadata JSONB DEFAULT '{}'::jsonb,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    verification_notes TEXT,
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(50),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT uk_invoice_number_user UNIQUE (invoice_number, user_id),
    CONSTRAINT chk_amount_positive CHECK (amount >= 0),
    CONSTRAINT chk_tax_amount_positive CHECK (tax_amount >= 0),
    CONSTRAINT chk_total_amount_positive CHECK (total_amount >= 0)
);

-- Create indexes for invoices
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_email_task_id ON invoices(email_task_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_amount ON invoices(amount);
CREATE INDEX idx_invoices_seller_name ON invoices(seller_name);
CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at);
CREATE INDEX idx_invoices_user_status ON invoices(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_user_date ON invoices(user_id, invoice_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_extracted_data_gin ON invoices USING gin(extracted_data);
CREATE INDEX idx_invoices_metadata_gin ON invoices USING gin(metadata);
CREATE INDEX idx_invoices_tags_gin ON invoices USING gin(tags);
CREATE INDEX idx_invoices_last_activity_at ON invoices(last_activity_at);

-- Add foreign keys
ALTER TABLE email_processing_tasks ADD CONSTRAINT fk_email_tasks_user 
    FOREIGN KEY (user_id) REFERENCES profiles(auth_user_id) ON DELETE CASCADE;

ALTER TABLE invoices ADD CONSTRAINT fk_invoices_user 
    FOREIGN KEY (user_id) REFERENCES profiles(auth_user_id) ON DELETE CASCADE;

ALTER TABLE invoices ADD CONSTRAINT fk_invoices_email_task 
    FOREIGN KEY (email_task_id) REFERENCES email_processing_tasks(id) ON DELETE SET NULL;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_tasks_updated_at BEFORE UPDATE ON email_processing_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_processing_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- RLS Policies for email_processing_tasks
CREATE POLICY "Users can view own tasks" ON email_processing_tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON email_processing_tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON email_processing_tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON email_processing_tasks
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for invoices
CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" ON invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" ON invoices
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically create profile for new users
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (auth_user_id, display_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (auth_user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_profile_for_user();

-- Create function to update profile statistics when invoice is created
CREATE OR REPLACE FUNCTION update_profile_invoice_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE profiles 
        SET total_invoices = total_invoices + 1,
            last_invoice_date = NEW.invoice_date
        WHERE auth_user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update profile stats
CREATE TRIGGER on_invoice_created
    AFTER INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_invoice_stats();

-- Create view for invoice summary
CREATE OR REPLACE VIEW invoice_summary AS
SELECT 
    i.user_id,
    DATE_TRUNC('month', i.created_at) as month,
    COUNT(*) as invoice_count,
    SUM(i.amount) as total_amount,
    COUNT(*) FILTER (WHERE i.status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE i.status = 'failed') as failed_count
FROM invoices i
WHERE i.deleted_at IS NULL
GROUP BY i.user_id, DATE_TRUNC('month', i.created_at);

-- Grant permissions on the view
GRANT SELECT ON invoice_summary TO anon, authenticated;

-- Add comments
COMMENT ON TABLE profiles IS '用户档案表 - 扩展 Supabase Auth 用户信息';
COMMENT ON TABLE email_processing_tasks IS '邮件处理任务表 - 跟踪异步任务状态';
COMMENT ON TABLE invoices IS '发票表 - 存储发票基本信息和 OCR 提取数据';
