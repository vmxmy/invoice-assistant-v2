-- 添加dramatiq-pg库需要的state字段
ALTER TABLE dramatiq.queue 
ADD COLUMN IF NOT EXISTS state VARCHAR(50) DEFAULT 'pending';

-- 添加state字段的索引
CREATE INDEX IF NOT EXISTS idx_dramatiq_queue_state 
    ON dramatiq.queue (state);

-- 更新现有记录的state字段
UPDATE dramatiq.queue 
SET state = 'pending' 
WHERE state IS NULL;