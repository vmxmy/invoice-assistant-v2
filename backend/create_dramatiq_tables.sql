-- Dramatiq PostgreSQL Tables Migration
-- 创建Dramatiq所需的PostgreSQL表和索引

-- 创建dramatiq schema
CREATE SCHEMA IF NOT EXISTS dramatiq;

-- 创建消息表（Dramatiq原生格式）
CREATE TABLE IF NOT EXISTS dramatiq.messages (
    id BIGSERIAL PRIMARY KEY,
    queue_name VARCHAR(255) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) NOT NULL UNIQUE,
    message JSONB NOT NULL,
    eta TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    priority INTEGER DEFAULT 0
);

-- 创建结果表
CREATE TABLE IF NOT EXISTS dramatiq.results (
    message_id VARCHAR(255) PRIMARY KEY,
    result JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_dramatiq_messages_queue_priority 
    ON dramatiq.messages (queue_name, priority DESC, id);

CREATE INDEX IF NOT EXISTS idx_dramatiq_messages_eta 
    ON dramatiq.messages (eta) WHERE eta IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dramatiq_results_status 
    ON dramatiq.results (status);

-- 更新updated_at触发器函数
CREATE OR REPLACE FUNCTION dramatiq.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为results表添加updated_at触发器
DROP TRIGGER IF EXISTS update_dramatiq_results_updated_at ON dramatiq.results;
CREATE TRIGGER update_dramatiq_results_updated_at
    BEFORE UPDATE ON dramatiq.results
    FOR EACH ROW
    EXECUTE FUNCTION dramatiq.update_updated_at_column();

-- 注释
COMMENT ON SCHEMA dramatiq IS 'Dramatiq任务队列系统的数据库Schema';
COMMENT ON TABLE dramatiq.messages IS 'Dramatiq消息表，存储所有任务消息';
COMMENT ON TABLE dramatiq.results IS '任务结果存储表';