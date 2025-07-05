-- Dramatiq PostgreSQL Tables Migration
-- 创建Dramatiq任务队列系统所需的数据库表

-- 创建dramatiq schema
CREATE SCHEMA IF NOT EXISTS dramatiq;

-- 创建主任务队列表
CREATE TABLE IF NOT EXISTS dramatiq.queue (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) NOT NULL UNIQUE,
    message JSONB NOT NULL,
    
    -- 状态管理
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- 重试配置
    retries INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- 优先级和延迟
    priority INTEGER DEFAULT 0,
    delay_ms BIGINT DEFAULT 0,
    
    -- 错误信息
    error_message TEXT,
    error_traceback TEXT,
    
    -- 执行结果
    result JSONB,
    
    -- 配置选项
    options JSONB,
    
    -- 约束条件
    CONSTRAINT valid_retries CHECK (retries >= 0 AND retries <= max_retries),
    CONSTRAINT valid_priority CHECK (priority >= 0 AND priority <= 1000),
    CONSTRAINT valid_delay CHECK (delay_ms >= 0)
);

-- 创建消息表（用于Dramatiq消息存储）
CREATE TABLE IF NOT EXISTS dramatiq.messages (
    id BIGSERIAL PRIMARY KEY,
    queue_name VARCHAR(255) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) NOT NULL UNIQUE,
    message JSONB NOT NULL,
    
    -- 预期执行时间
    eta TIMESTAMP WITH TIME ZONE,
    
    -- 创建时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 优先级
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

-- ============================================================
-- 索引优化
-- ============================================================

-- queue表索引
CREATE INDEX IF NOT EXISTS idx_dramatiq_queue_status_priority 
    ON dramatiq.queue (status, priority DESC) 
    WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_dramatiq_queue_scheduled_at 
    ON dramatiq.queue (scheduled_at) 
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_dramatiq_queue_name_status 
    ON dramatiq.queue (name, status);

CREATE INDEX IF NOT EXISTS idx_dramatiq_queue_actor_status 
    ON dramatiq.queue (actor_name, status);

-- messages表索引
CREATE INDEX IF NOT EXISTS idx_dramatiq_messages_queue_eta 
    ON dramatiq.messages (queue_name, eta) 
    WHERE eta IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dramatiq_messages_queue_priority 
    ON dramatiq.messages (queue_name, priority DESC, id);

-- results表索引
CREATE INDEX IF NOT EXISTS idx_dramatiq_results_status 
    ON dramatiq.results (status);

-- ============================================================
-- 触发器和函数
-- ============================================================

-- 自动更新updated_at字段的函数
CREATE OR REPLACE FUNCTION dramatiq.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为results表创建updated_at自动更新触发器
DROP TRIGGER IF EXISTS update_dramatiq_results_updated_at ON dramatiq.results;
CREATE TRIGGER update_dramatiq_results_updated_at
    BEFORE UPDATE ON dramatiq.results
    FOR EACH ROW
    EXECUTE FUNCTION dramatiq.update_updated_at_column();

-- 队列统计函数
CREATE OR REPLACE FUNCTION dramatiq.get_queue_stats()
RETURNS TABLE (
    queue_name VARCHAR(255),
    pending_count BIGINT,
    processing_count BIGINT,
    completed_count BIGINT,
    failed_count BIGINT,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.name as queue_name,
        COUNT(*) FILTER (WHERE q.status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE q.status = 'processing') as processing_count,
        COUNT(*) FILTER (WHERE q.status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE q.status = 'failed') as failed_count,
        COUNT(*) as total_count
    FROM dramatiq.queue q
    GROUP BY q.name
    ORDER BY q.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 注释
-- ============================================================

COMMENT ON SCHEMA dramatiq IS 'Dramatiq任务队列系统的Schema';
COMMENT ON TABLE dramatiq.queue IS '主任务队列表，存储所有待执行和已执行的任务';
COMMENT ON TABLE dramatiq.messages IS 'Dramatiq消息表（用于消息传递）';
COMMENT ON TABLE dramatiq.results IS '任务执行结果表';