-- 创建发票分类表

-- 创建一级分类表
CREATE TABLE IF NOT EXISTS primary_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7),
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT chk_primary_category_name_not_empty CHECK (length(name) > 0),
    CONSTRAINT chk_primary_category_code_not_empty CHECK (length(code) > 0),
    CONSTRAINT chk_primary_category_sort_order_positive CHECK (sort_order >= 0)
);

-- 创建二级分类表
CREATE TABLE IF NOT EXISTS secondary_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_category_id UUID NOT NULL REFERENCES primary_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    auto_classify_rules JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT chk_secondary_category_name_not_empty CHECK (length(name) > 0),
    CONSTRAINT chk_secondary_category_code_not_empty CHECK (length(code) > 0),
    CONSTRAINT chk_secondary_category_sort_order_positive CHECK (sort_order >= 0)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_primary_categories_active_sort ON primary_categories(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_secondary_categories_primary_sort ON secondary_categories(primary_category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_secondary_categories_active ON secondary_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_secondary_categories_rules_gin ON secondary_categories USING gin(auto_classify_rules);

-- 修改发票表，添加分类字段
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS primary_category_id UUID REFERENCES primary_categories(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS secondary_category_id UUID REFERENCES secondary_categories(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS auto_classified BOOLEAN DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS classification_confidence DECIMAL(3,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS classification_metadata JSONB DEFAULT '{}'::jsonb;

-- 创建发票分类索引
CREATE INDEX IF NOT EXISTS idx_invoices_primary_category ON invoices(primary_category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_secondary_category ON invoices(secondary_category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_auto_classified ON invoices(auto_classified);

-- 插入初始分类数据

-- 一级分类
INSERT INTO primary_categories (code, name, color, icon, sort_order) VALUES
    ('transportation', '交通', '#2196F3', 'transport', 1),
    ('accommodation', '住宿', '#FF9800', 'bed', 2),
    ('dining', '餐饮', '#4CAF50', 'restaurant', 3),
    ('office', '办公', '#9C27B0', 'office', 4),
    ('other', '其他', '#607D8B', 'category', 5)
ON CONFLICT (code) DO NOTHING;

-- 二级分类
WITH pc AS (
    SELECT id, code FROM primary_categories
)
INSERT INTO secondary_categories (primary_category_id, code, name, sort_order) VALUES
    -- 交通类
    ((SELECT id FROM pc WHERE code = 'transportation'), 'flight', '飞机', 1),
    ((SELECT id FROM pc WHERE code = 'transportation'), 'train', '火车', 2),
    ((SELECT id FROM pc WHERE code = 'transportation'), 'taxi', '出租车', 3),
    ((SELECT id FROM pc WHERE code = 'transportation'), 'bus', '公交', 4),
    -- 住宿类
    ((SELECT id FROM pc WHERE code = 'accommodation'), 'hotel', '酒店', 1),
    ((SELECT id FROM pc WHERE code = 'accommodation'), 'guesthouse', '民宿', 2),
    -- 餐饮类
    ((SELECT id FROM pc WHERE code = 'dining'), 'meal', '正餐', 1),
    ((SELECT id FROM pc WHERE code = 'dining'), 'snack', '小食', 2),
    -- 办公类
    ((SELECT id FROM pc WHERE code = 'office'), 'stationery', '文具', 1),
    ((SELECT id FROM pc WHERE code = 'office'), 'equipment', '设备', 2)
ON CONFLICT (code) DO NOTHING;

-- 更新二级分类的自动分类规则
UPDATE secondary_categories SET auto_classify_rules = 
    '{"rules": [
        {"type": "seller_name_pattern", "patterns": [".*航空.*", ".*机场.*", ".*航班.*", ".*airline.*"], "confidence": 0.9},
        {"type": "invoice_type_pattern", "patterns": ["机票", "航班", "flight"], "confidence": 0.95}
    ]}'::jsonb
WHERE code = 'flight';

UPDATE secondary_categories SET auto_classify_rules = 
    '{"rules": [
        {"type": "seller_name_pattern", "patterns": [".*铁路.*", ".*火车.*", ".*高铁.*", ".*动车.*"], "confidence": 0.95},
        {"type": "invoice_type_pattern", "patterns": ["铁路电子客票", "火车票", "高铁票"], "confidence": 0.99}
    ]}'::jsonb
WHERE code = 'train';

UPDATE secondary_categories SET auto_classify_rules = 
    '{"rules": [
        {"type": "seller_name_pattern", "patterns": [".*出租.*", ".*滴滴.*", ".*uber.*", ".*taxi.*"], "confidence": 0.85},
        {"type": "amount_range", "patterns": [], "confidence": 0.7, "min_amount": 0, "max_amount": 100}
    ]}'::jsonb
WHERE code = 'taxi';

UPDATE secondary_categories SET auto_classify_rules = 
    '{"rules": [
        {"type": "seller_name_pattern", "patterns": [".*餐饮.*", ".*酒店.*", ".*饭店.*", ".*restaurant.*"], "confidence": 0.8}
    ]}'::jsonb
WHERE code = 'meal';

UPDATE secondary_categories SET auto_classify_rules = 
    '{"rules": [
        {"type": "seller_name_pattern", "patterns": [".*酒店.*", ".*宾馆.*", ".*hotel.*", ".*住宿.*"], "confidence": 0.85}
    ]}'::jsonb
WHERE code = 'hotel';

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_primary_categories_updated_at BEFORE UPDATE ON primary_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_secondary_categories_updated_at BEFORE UPDATE ON secondary_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();