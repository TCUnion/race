-- ====================================
-- 腳踏車詳細資訊擴充 - 資料庫 Migration (v1.2)
-- 請在 Zeabur Supabase Studio SQL Editor 中執行此腳本
-- ====================================

-- 1. 新增腳踏車詳細資訊欄位
DO $$ 
BEGIN 
  -- 品牌
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bikes' AND column_name='brand') THEN
    ALTER TABLE bikes ADD COLUMN brand TEXT;
  END IF;

  -- 型號
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bikes' AND column_name='model') THEN
    ALTER TABLE bikes ADD COLUMN model TEXT;
  END IF;

  -- 變速系統
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bikes' AND column_name='groupset_name') THEN
    ALTER TABLE bikes ADD COLUMN groupset_name TEXT;
  END IF;

  -- 購買地點
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bikes' AND column_name='shop_name') THEN
    ALTER TABLE bikes ADD COLUMN shop_name TEXT;
  END IF;

  -- 備註
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bikes' AND column_name='remarks') THEN
    ALTER TABLE bikes ADD COLUMN remarks TEXT;
  END IF;

  -- 價格 (使用 NUMERIC 以支援精確金額，雖然後面可能只用整數)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bikes' AND column_name='price') THEN
    ALTER TABLE bikes ADD COLUMN price NUMERIC;
  END IF;
END $$;

-- 2. 重新整理 RLS 政策 (確保 Admin 可寫入)
-- 既有的 "Admin full access bikes" 已經包含 ALL 權限，理論上不需要修改，
-- 但為了確保權限正確，這邊再次確認 Update 權限。

-- (選擇性) 如果之前沒有針對 update 開放，這裡可以加強
-- 這裡假設既有的 "Admin full access bikes" USING (true) WITH CHECK (true) 已經足夠。
