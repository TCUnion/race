-- 修復 Wheelsets RLS 策略 (恢復為 Public 權限)
-- 原因: 當前應用程式使用 anon 角色進行操作，但之前的遷移腳本將權限限制為 authenticated 角色，導致新增失敗。

-- 1. 確保 RLS 啟用
ALTER TABLE public.wheelsets ENABLE ROW LEVEL SECURITY;

-- 2. 移除可能導致衝突或阻擋的舊權限 (包含 authenticated 限制)
DROP POLICY IF EXISTS "Admin full access wheelsets" ON public.wheelsets;
DROP POLICY IF EXISTS "Public read wheelsets" ON public.wheelsets;
DROP POLICY IF EXISTS "Allow authenticated all on wheelsets" ON public.wheelsets;
DROP POLICY IF EXISTS "Public insert wheelsets" ON public.wheelsets;
DROP POLICY IF EXISTS "Public update wheelsets" ON public.wheelsets;
DROP POLICY IF EXISTS "Public delete wheelsets" ON public.wheelsets;

-- 3. 建立 Public 權限 (允許 Anon 角色進行操作，與 bikes/vehicles 資料表一致)

-- 讀取: 所有人可讀
CREATE POLICY "Public read wheelsets" ON public.wheelsets FOR SELECT USING (true);

-- 新增: 所有人可新增
CREATE POLICY "Public insert wheelsets" ON public.wheelsets FOR INSERT WITH CHECK (true);

-- 修改: 所有人可修改
CREATE POLICY "Public update wheelsets" ON public.wheelsets FOR UPDATE USING (true);

-- 刪除: 所有人可刪除
CREATE POLICY "Public delete wheelsets" ON public.wheelsets FOR DELETE USING (true);

-- 4. 強制刷新 PostgREST Schema cache
NOTIFY pgrst, 'reload schema';
