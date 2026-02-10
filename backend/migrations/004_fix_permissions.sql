-- 修復 strava_member_bindings 的權限問題
-- 賦予 service_role (後端 API) 完整的讀寫權限
GRANT ALL ON TABLE strava_member_bindings TO service_role;
GRANT ALL ON TABLE strava_member_bindings TO postgres;

-- 確保 Sequence (ID 自動遞增) 也能被存取
GRANT USAGE, SELECT ON SEQUENCE strava_member_bindings_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE strava_member_bindings_id_seq TO postgres;

-- 賦予前端 (anon/authenticated) 唯讀權限 (配合 RLS)
GRANT SELECT ON TABLE strava_member_bindings TO anon, authenticated;

-- 再次確認 RLS 啟用
ALTER TABLE strava_member_bindings ENABLE ROW LEVEL SECURITY;
