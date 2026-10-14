-- =============================================================
-- Piece Invoices + Company Settings
-- 1) جدول إعدادات الشركة (يعدّلها المدير)
-- 2) جدول أحجام الدجاج (لخيارات فاتورة الحبة)
-- 3) أعمدة نوع البيع/الحجم/عدد الحبات/سعر الحبة على direct_orders و invoices
-- شغّله من: Supabase Dashboard > SQL Editor > New Query
-- =============================================================

-- 1) إعدادات الشركة (صف واحد يُقرأ ويُحدَّث)
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'شركة آفاق الرغد للدواجن',
  tax_number TEXT DEFAULT '',
  cr TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phones TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- صف افتراضي واحد إن لم يوجد أي صف
INSERT INTO company_settings (name, tax_number, cr, address, phones)
SELECT 'شركة آفاق الرغد للدواجن', '311648304500003', '7054494799', 'حي النزهة، جدة', '0533632350 / 0575759184'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full anon access" ON company_settings;
DROP POLICY IF EXISTS "allow_all" ON company_settings;
DROP POLICY IF EXISTS "Enable all for anon" ON company_settings;

CREATE POLICY "Full anon access"
  ON company_settings
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 2) أحجام الدجاج (خيارات فاتورة الحبة)
CREATE TABLE IF NOT EXISTS chicken_sizes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  owner_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chicken_sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON chicken_sizes;
DROP POLICY IF EXISTS "Full anon access" ON chicken_sizes;

CREATE POLICY "Full anon access"
  ON chicken_sizes
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_chicken_sizes_name ON chicken_sizes(name);

-- 3) أعمدة نوع البيع على الطلبيات المباشرة
ALTER TABLE direct_orders ADD COLUMN IF NOT EXISTS sale_unit TEXT DEFAULT 'kg';
ALTER TABLE direct_orders ADD COLUMN IF NOT EXISTS unit_size TEXT DEFAULT NULL;
ALTER TABLE direct_orders ADD COLUMN IF NOT EXISTS pieces NUMERIC DEFAULT 0;
ALTER TABLE direct_orders ADD COLUMN IF NOT EXISTS price_per_piece NUMERIC DEFAULT 0;

-- 3) أعمدة نوع البيع على الفواتير
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sale_unit TEXT DEFAULT 'kg';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS unit_size TEXT DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pieces NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS price_per_piece NUMERIC DEFAULT 0;

-- تأكيد
SELECT '✅ piece invoices + company settings ready!' AS result;
