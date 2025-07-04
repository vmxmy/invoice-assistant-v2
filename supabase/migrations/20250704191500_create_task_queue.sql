-- PostgreSQL任务队列系统
-- 替代Redis+Celery的完整方案

-- 创建任务状态枚举
CREATE TYPE task_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- 创建任务类型枚举
CREATE TYPE task_type AS ENUM ('process_email', 'ocr_extract', 'send_notification', 'cleanup_files');

-- 创建任务队列表
CREATE TABLE IF NOT EXISTS task_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type task_type NOT NULL,
    payload JSONB NOT NULL,
    status task_status DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    processing_timeout INTEGER DEFAULT 300, -- 5分钟超时
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 任务元数据
    user_id UUID,
    correlation_id VARCHAR(255), -- 用于关联多个任务
    parent_task_id UUID REFERENCES task_queue(id), -- 支持子任务
    
    -- 约束
    CONSTRAINT valid_priority CHECK (priority >= 0 AND priority <= 100),
    CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries),
    CONSTRAINT valid_timeout CHECK (processing_timeout > 0)
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_task_queue_status_priority 
ON task_queue(status, priority DESC, scheduled_at ASC) 
WHERE status IN ('pending');

CREATE INDEX IF NOT EXISTS idx_task_queue_user_status 
ON task_queue(user_id, status, created_at DESC) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_queue_type_status 
ON task_queue(task_type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_queue_scheduled 
ON task_queue(scheduled_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_task_queue_processing_timeout
ON task_queue(started_at, processing_timeout)
WHERE status = 'processing';

-- 创建更新时间戳触发器
CREATE OR REPLACE FUNCTION update_task_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_task_queue_updated_at
    BEFORE UPDATE ON task_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_task_queue_updated_at();

-- 任务入队函数
CREATE OR REPLACE FUNCTION enqueue_task(
    p_task_type task_type,
    p_payload JSONB,
    p_user_id UUID DEFAULT NULL,
    p_priority INTEGER DEFAULT 0,
    p_delay_seconds INTEGER DEFAULT 0,
    p_max_retries INTEGER DEFAULT 3,
    p_correlation_id VARCHAR(255) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    task_id UUID;
BEGIN
    INSERT INTO task_queue (
        task_type, 
        payload, 
        user_id,
        priority,
        scheduled_at,
        max_retries,
        correlation_id
    )
    VALUES (
        p_task_type, 
        p_payload, 
        p_user_id,
        p_priority,
        NOW() + (p_delay_seconds || ' seconds')::INTERVAL,
        p_max_retries,
        p_correlation_id
    )
    RETURNING id INTO task_id;
    
    -- 通知Worker有新任务（如果立即执行）
    IF p_delay_seconds = 0 THEN
        PERFORM pg_notify('new_task', jsonb_build_object(
            'task_id', task_id,
            'task_type', p_task_type,
            'priority', p_priority,
            'user_id', p_user_id
        )::text);
    END IF;
    
    RETURN task_id;
END;
$$ LANGUAGE plpgsql;

-- 获取下一个待处理任务（原子操作）
CREATE OR REPLACE FUNCTION fetch_next_task(
    p_task_types task_type[] DEFAULT NULL,
    p_max_processing_time INTEGER DEFAULT 300
) RETURNS SETOF task_queue AS $$
BEGIN
    RETURN QUERY
    UPDATE task_queue 
    SET 
        status = 'processing', 
        started_at = NOW(),
        retry_count = retry_count
    WHERE id = (
        SELECT t.id 
        FROM task_queue t
        WHERE t.status = 'pending' 
        AND t.scheduled_at <= NOW()
        AND (p_task_types IS NULL OR t.task_type = ANY(p_task_types))
        ORDER BY t.priority DESC, t.scheduled_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- 完成任务
CREATE OR REPLACE FUNCTION complete_task(
    p_task_id UUID,
    p_result JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    UPDATE task_queue 
    SET 
        status = 'completed',
        completed_at = NOW(),
        payload = CASE 
            WHEN p_result IS NOT NULL THEN payload || jsonb_build_object('result', p_result)
            ELSE payload
        END
    WHERE id = p_task_id AND status = 'processing';
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- 任务失败处理
CREATE OR REPLACE FUNCTION fail_task(
    p_task_id UUID,
    p_error_message TEXT,
    p_should_retry BOOLEAN DEFAULT TRUE
) RETURNS BOOLEAN AS $$
DECLARE
    current_task RECORD;
    rows_affected INTEGER;
    retry_delay INTEGER;
BEGIN
    -- 获取当前任务信息
    SELECT * INTO current_task 
    FROM task_queue 
    WHERE id = p_task_id AND status = 'processing';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- 检查是否可以重试
    IF p_should_retry AND current_task.retry_count < current_task.max_retries THEN
        -- 计算重试延迟（指数退避）
        retry_delay = POWER(2, current_task.retry_count + 1);
        
        UPDATE task_queue 
        SET 
            status = 'pending',
            retry_count = retry_count + 1,
            scheduled_at = NOW() + (retry_delay || ' seconds')::INTERVAL,
            error_message = p_error_message,
            started_at = NULL
        WHERE id = p_task_id;
    ELSE
        -- 标记为失败
        UPDATE task_queue 
        SET 
            status = 'failed',
            completed_at = NOW(),
            error_message = p_error_message
        WHERE id = p_task_id;
    END IF;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- 清理超时任务
CREATE OR REPLACE FUNCTION cleanup_timeout_tasks() RETURNS INTEGER AS $$
DECLARE
    timeout_count INTEGER := 0;
    timeout_task RECORD;
BEGIN
    -- 查找超时任务
    FOR timeout_task IN 
        SELECT id, retry_count, max_retries
        FROM task_queue 
        WHERE status = 'processing' 
        AND started_at + (processing_timeout || ' seconds')::INTERVAL < NOW()
    LOOP
        -- 处理超时任务
        PERFORM fail_task(
            timeout_task.id, 
            'Task timed out', 
            timeout_task.retry_count < timeout_task.max_retries
        );
        timeout_count := timeout_count + 1;
    END LOOP;
    
    RETURN timeout_count;
END;
$$ LANGUAGE plpgsql;

-- 获取任务统计信息
CREATE OR REPLACE FUNCTION get_task_stats(
    p_user_id UUID DEFAULT NULL,
    p_hours_back INTEGER DEFAULT 24
) RETURNS TABLE(
    task_type task_type,
    status task_status,
    count BIGINT,
    avg_duration_seconds NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.task_type,
        t.status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(t.completed_at, NOW()) - t.created_at))) as avg_duration_seconds
    FROM task_queue t
    WHERE t.created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    AND (p_user_id IS NULL OR t.user_id = p_user_id)
    GROUP BY t.task_type, t.status
    ORDER BY t.task_type, t.status;
END;
$$ LANGUAGE plpgsql;

-- 任务优先级调整
CREATE OR REPLACE FUNCTION update_task_priority(
    p_task_id UUID,
    p_new_priority INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    UPDATE task_queue 
    SET priority = p_new_priority
    WHERE id = p_task_id AND status = 'pending';
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- 取消任务
CREATE OR REPLACE FUNCTION cancel_task(
    p_task_id UUID,
    p_reason TEXT DEFAULT 'Cancelled by user'
) RETURNS BOOLEAN AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    UPDATE task_queue 
    SET 
        status = 'cancelled',
        completed_at = NOW(),
        error_message = p_reason
    WHERE id = p_task_id AND status IN ('pending', 'processing');
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- 创建定期清理任务的定时器视图（可配合pg_cron使用）
CREATE OR REPLACE VIEW pending_cleanup_tasks AS
SELECT 
    id,
    task_type,
    created_at,
    retry_count,
    max_retries,
    error_message
FROM task_queue 
WHERE status = 'failed' 
AND completed_at < NOW() - INTERVAL '7 days';

-- 插入示例数据（用于测试）
-- INSERT INTO task_queue (task_type, payload, user_id, priority) VALUES 
-- ('process_email', '{"email": "test@example.com", "subject": "Test"}', gen_random_uuid(), 1);

-- 权限设置（如果使用RLS）
-- ALTER TABLE task_queue ENABLE ROW LEVEL SECURITY;

-- RLS策略示例（用户只能看到自己的任务）
-- CREATE POLICY task_queue_user_policy ON task_queue
--     FOR ALL TO authenticated
--     USING (user_id = auth.uid());

COMMENT ON TABLE task_queue IS 'PostgreSQL任务队列系统，替代Redis+Celery';
COMMENT ON FUNCTION enqueue_task IS '将任务加入队列，支持延迟执行和优先级';
COMMENT ON FUNCTION fetch_next_task IS '原子获取下一个待处理任务，避免并发冲突';
COMMENT ON FUNCTION complete_task IS '标记任务完成并保存结果';
COMMENT ON FUNCTION fail_task IS '处理任务失败，支持自动重试';
COMMENT ON FUNCTION cleanup_timeout_tasks IS '清理超时任务，建议定期执行';