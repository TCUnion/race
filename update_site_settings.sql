-- 新增頁尾連結設定到 site_settings 表格
INSERT INTO public.site_settings (key, value, updated_at)
VALUES 
    ('footer_link_share', '', NOW()),
    ('footer_link_doc', '', NOW()),
    ('footer_link_support', '', NOW()),
    ('footer_link_line', '', NOW()),
    ('footer_link_web', '', NOW())
ON CONFLICT (key) DO NOTHING;
