-- 修复Dramatiq表结构以匹配dramatiq-pg库期望

-- 创建queue表（dramatiq-pg库期望的表名）
CREATE TABLE IF NOT EXISTS dramatiq.queue (
    id BIGSERIAL PRIMARY KEY,
    queue_name VARCHAR(255) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) NOT NULL UNIQUE,
    message JSONB NOT NULL,
    eta TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    priority INTEGER DEFAULT 0
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_dramatiq_queue_name_priority 
    ON dramatiq.queue (queue_name, priority DESC, id);

CREATE INDEX IF NOT EXISTS idx_dramatiq_queue_eta 
    ON dramatiq.queue (eta) WHERE eta IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dramatiq_queue_actor 
    ON dramatiq.queue (actor_name);

-- 如果messages表存在数据，迁移到queue表
INSERT INTO dramatiq.queue (queue_name, actor_name, message_id, message, eta, created_at, priority)
SELECT queue_name, actor_name, message_id, message, eta, created_at, priority
FROM dramatiq.messages
ON CONFLICT (message_id) DO NOTHING;

-- 删除旧的messages表（如果不需要保留）
-- DROP TABLE IF EXISTS dramatiq.messages;