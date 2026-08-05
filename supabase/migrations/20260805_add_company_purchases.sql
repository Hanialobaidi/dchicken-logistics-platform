-- =============================================================
-- Company Purchases — المشتريات العامة للشركة
-- يسجل المدير مشتريات الشركة (السلعة، السعر، المحل، صورة الفاتورة)
-- شغّله من: Supabase Dashboard > SQL Editor > New Query
-- =============================================================

CREATE TABLE IF NOT EXISTS company_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  store_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_image_url TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  owner_id TEXT DEFAULT ''
);

ALTER TABLE company_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full anon access" ON company_purchases;
DROP POLICY IF EXISTS "allow_all" ON company_purchases;
DROP POLICY IF EXISTS "Enable all for anon" ON company_purchases;

CREATE POLICY "Full anon access"
  ON company_purchases
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_company_purchases_date ON company_purchases(purchase_date DESC);

SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'company_purchases';
