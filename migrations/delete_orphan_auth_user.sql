-- =============================================================================
-- 刪除孤立的 auth.users 記錄
-- 用於清理只存在於 auth.users 但不在 manager_roles 的帳號
-- =============================================================================

-- 方法 1: 直接刪除指定 Email 的使用者
-- 注意：需要有 service_role 或 postgres 權限

DELETE FROM auth.users
WHERE email = 'service_test@tsu.com.tw';

-- 驗證刪除結果
SELECT id, email FROM auth.users WHERE email LIKE '%service%';
