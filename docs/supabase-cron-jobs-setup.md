# Supabase 定时任务设置指南

## 1. 启用 pg_cron 扩展

在 Supabase Dashboard 中：
1. 进入 Database → Extensions
2. 搜索并启用 `pg_cron` 扩展

## 2. 创建定时任务函数

### 创建邮件扫描触发函数
```sql
-- 创建触发邮件扫描的函数
CREATE OR REPLACE FUNCTION trigger_email_scan()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 调用 Edge Function 进行邮件扫描
  PERFORM
    net.http_post(
      url := 'https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/scan-emails-auto',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.jwt_secret')
      ),
      body := jsonb_build_object(
        'scan_type', 'incremental',
        'max_emails_per_account', 50,
        'trigger_source', 'cron'
      )
    );
  
  -- 记录扫描触发日志
  INSERT INTO scan_triggers (
    trigger_type, 
    trigger_time, 
    status
  ) VALUES (
    'cron', 
    NOW(), 
    'triggered'
  );
END;
$$;
```

### 创建扫描触发记录表
```sql
CREATE TABLE IF NOT EXISTS scan_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type VARCHAR(50) NOT NULL,
  trigger_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'triggered',
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_scan_triggers_time ON scan_triggers(trigger_time);
CREATE INDEX idx_scan_triggers_type ON scan_triggers(trigger_type);
```

## 3. 设置定时任务

### 每小时扫描一次（推荐）
```sql
-- 每小时的第5分钟执行邮件扫描
SELECT cron.schedule(
  'email-scan-hourly',
  '5 * * * *',  -- 每小时第5分钟
  'SELECT trigger_email_scan();'
);
```

### 每天扫描一次
```sql
-- 每天早上8点执行邮件扫描
SELECT cron.schedule(
  'email-scan-daily',
  '0 8 * * *',  -- 每天8:00 AM
  'SELECT trigger_email_scan();'
);
```

### 每15分钟扫描一次（高频）
```sql
-- 每15分钟执行一次
SELECT cron.schedule(
  'email-scan-frequent',
  '*/15 * * * *',  -- 每15分钟
  'SELECT trigger_email_scan();'
);
```

## 4. 管理定时任务

### 查看所有定时任务
```sql
SELECT * FROM cron.job;
```

### 查看任务执行历史
```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### 删除定时任务
```sql
SELECT cron.unschedule('email-scan-hourly');
```

### 临时禁用任务
```sql
UPDATE cron.job 
SET active = false 
WHERE jobname = 'email-scan-hourly';
```

### 重新启用任务
```sql
UPDATE cron.job 
SET active = true 
WHERE jobname = 'email-scan-hourly';
```

## 5. Cron 表达式说明

```
* * * * *
│ │ │ │ │
│ │ │ │ └─ 星期几 (0-7, 0和7都表示周日)
│ │ │ └─── 月份 (1-12)
│ │ └───── 日期 (1-31)
│ └─────── 小时 (0-23)
└───────── 分钟 (0-59)
```

### 常用表达式示例：
- `0 * * * *` - 每小时整点
- `*/30 * * * *` - 每30分钟
- `0 9 * * 1-5` - 工作日早上9点
- `0 0 * * 0` - 每周日午夜
- `0 2 1 * *` - 每月1号凌晨2点

## 6. 错误处理和监控

### 创建任务监控表
```sql
CREATE TABLE IF NOT EXISTS cron_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100),
  execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50),
  error_message TEXT,
  execution_duration INTERVAL,
  result JSONB
);
```

### 增强的触发函数（包含错误处理）
```sql
CREATE OR REPLACE FUNCTION trigger_email_scan_safe()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMP WITH TIME ZONE;
  end_time TIMESTAMP WITH TIME ZONE;
  execution_duration INTERVAL;
  http_response RECORD;
  error_message TEXT;
BEGIN
  start_time := NOW();
  
  BEGIN
    -- 调用 Edge Function
    SELECT * INTO http_response FROM
      net.http_post(
        url := 'https://sfenhhtvcyslxplvewmt.supabase.co/functions/v1/scan-emails-auto',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_key')
        ),
        body := jsonb_build_object(
          'scan_type', 'incremental',
          'max_emails_per_account', 50,
          'trigger_source', 'cron',
          'timestamp', start_time
        ),
        timeout_milliseconds := 300000  -- 5分钟超时
      );
    
    end_time := NOW();
    execution_duration := end_time - start_time;
    
    -- 记录成功日志
    INSERT INTO cron_job_logs (
      job_name, 
      execution_time, 
      status, 
      execution_duration,
      result
    ) VALUES (
      'email_scan_auto',
      start_time,
      'success',
      execution_duration,
      jsonb_build_object(
        'http_status', http_response.status,
        'response', http_response.content
      )
    );
    
  EXCEPTION WHEN OTHERS THEN
    end_time := NOW();
    execution_duration := end_time - start_time;
    error_message := SQLERRM;
    
    -- 记录错误日志
    INSERT INTO cron_job_logs (
      job_name,
      execution_time,
      status,
      error_message,
      execution_duration
    ) VALUES (
      'email_scan_auto',
      start_time,
      'error',
      error_message,
      execution_duration
    );
  END;
END;
$$;
```

## 7. 推荐配置

### 生产环境配置
```sql
-- 创建生产环境的定时任务（每小时扫描）
SELECT cron.schedule(
  'email-scan-production',
  '5 * * * *',  -- 每小时第5分钟，避开整点高峰
  'SELECT trigger_email_scan_safe();'
);
```

### 开发环境配置
```sql
-- 创建开发环境的定时任务（每4小时扫描）
SELECT cron.schedule(
  'email-scan-development',
  '0 */4 * * *',  -- 每4小时执行一次
  'SELECT trigger_email_scan_safe();'
);
```

## 8. 最佳实践

1. **错误处理**：始终包含 TRY-CATCH 逻辑
2. **超时设置**：为 HTTP 请求设置合理超时时间
3. **日志记录**：记录所有执行结果和错误
4. **监控告警**：定期检查任务执行状态
5. **资源控制**：避免高频任务影响数据库性能
6. **清理机制**：定期清理旧的日志记录

## 9. 清理旧日志的定时任务

```sql
-- 清理30天前的日志
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM cron_job_logs 
  WHERE execution_time < NOW() - INTERVAL '30 days';
  
  DELETE FROM scan_triggers 
  WHERE trigger_time < NOW() - INTERVAL '30 days';
END;
$$;

-- 每天凌晨3点清理日志
SELECT cron.schedule(
  'cleanup-logs-daily',
  '0 3 * * *',
  'SELECT cleanup_old_logs();'
);
```

这样设置后，Supabase 将自动按计划执行邮件扫描任务，实现完全自动化的后台处理。