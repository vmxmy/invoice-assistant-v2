-- 修复用户注册时的 profile 创建触发器
-- 添加 SECURITY DEFINER 以绕过 RLS 策略限制

CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 在用户注册时创建对应的 profile 记录
    -- SECURITY DEFINER 让函数以创建者的权限运行，绕过 RLS 检查
    INSERT INTO profiles (auth_user_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
    ON CONFLICT (auth_user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- 添加注释说明
COMMENT ON FUNCTION create_profile_for_user() IS '当新用户注册时自动创建 profile 记录。使用 SECURITY DEFINER 绕过 RLS 策略限制。';