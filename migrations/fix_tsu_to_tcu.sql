-- 修正 manager_roles 表中的名稱
UPDATE public.manager_roles 
SET shop_name = REPLACE(shop_name, 'TSU', 'TCU') 
WHERE shop_name LIKE '%TSU%';

-- 修正 manager_roles 表中的 Email 域名
UPDATE public.manager_roles 
SET email = REPLACE(email, '@tsu.com.tw', '@tcu.com.tw') 
WHERE email LIKE '%@tsu.com.tw%';

-- 同步更新 auth.users 中的 Email (這會影響登入)
-- 注意：這需要超級用戶權限，Supabase CLI 在本地開發環境或連結專案後可執行
UPDATE auth.users 
SET email = REPLACE(email, '@tsu.com.tw', '@tcu.com.tw') 
WHERE email LIKE '%@tsu.com.tw%';
