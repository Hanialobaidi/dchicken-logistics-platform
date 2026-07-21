-- =============================================================
-- DChicken Performance Migration
-- ركّز: Indexes + RLS policies
-- شغّله من: Supabase Dashboard > SQL Editor > New Query
-- =============================================================

-- ──────────────────────────────────────
-- 1. INDEXES — تسريع الاستعلامات
-- ──────────────────────────────────────

-- trips: استعلام السائق يبحث بـ driver_id + trip_date
CREATE INDEX IF NOT EXISTS idx_trips_driver_date ON trips (driver_id, trip_date DESC);

-- trips: فلترة بالحالة (مثلاً "completed" للتحليلات)
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips (status);

-- trips: ترتيب حسب created_at (لـ inventory)
CREATE INDEX IF NOT EXISTS idx_trips_created ON trips (created_at DESC);

-- direct_orders: فلترة حسب السائق
CREATE INDEX IF NOT EXISTS idx_direct_orders_driver ON direct_orders (driver_id);

-- direct_orders: ترتيب حسب created_at
CREATE INDEX IF NOT EXISTS idx_direct_orders_created ON direct_orders (created_at DESC);

-- trip_restaurants: فلترة حسب trip_id
CREATE INDEX IF NOT EXISTS idx_trip_restaurants_trip ON trip_restaurants (trip_id);

-- invoices: فلترة حسب السائق
CREATE INDEX IF NOT EXISTS idx_invoices_driver ON invoices (driver_id);

-- invoices: ترتيب حسب created_at
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices (created_at DESC);

-- purchases: ترتيب حسب purchase_date
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases (purchase_date DESC);

-- drivers: تسريع تسجيل الدخول بالاسم
CREATE INDEX IF NOT EXISTS idx_drivers_username ON drivers (username);


-- ──────────────────────────────────────
-- 2. RLS POLICIES — تأكد إن RLS شغال
-- ──────────────────────────────────────
-- ملاحظة: Supabase يشغّل RLS by default على جداول جديدة.
-- إذا ما عندك policies، كل استعلام يفشل بصمت أو يرجع بيانات فاضية.

-- تفعيل RLS على كل الجداول (لو مو مفعّل)
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_restaurants ENABLE ROW LEVEL SECURITY;

-- سياسة للـ anon (ما يقدر يسوي شي)
-- سياسة للمستخدمين المسجلين (full access)
DO $$
BEGIN
  -- purchases
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'purchases') THEN
    CREATE POLICY "Authenticated full access" ON purchases FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  -- drivers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'drivers') THEN
    CREATE POLICY "Authenticated full access" ON drivers FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  -- restaurants
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'restaurants') THEN
    CREATE POLICY "Authenticated full access" ON restaurants FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  -- direct_orders
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'direct_orders') THEN
    CREATE POLICY "Authenticated full access" ON direct_orders FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  -- invoices
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'invoices') THEN
    CREATE POLICY "Authenticated full access" ON invoices FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  -- trips
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'trips') THEN
    CREATE POLICY "Authenticated full access" ON trips FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  -- trip_restaurants
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'trip_restaurants') THEN
    CREATE POLICY "Authenticated full access" ON trip_restaurants FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;


-- ──────────────────────────────────────
-- 3. REALTIME — تأكد إن الجدول يشتغل مع Realtime
-- ──────────────────────────────────────
-- direct_orders لازم يكون في publication عشان useRealtimeOrders يشتغل
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'direct_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE direct_orders;
  END IF;
END $$;


-- ──────────────────────────────────────
-- 4. تأكيد
-- ──────────────────────────────────────
SELECT '✅ All indexes and policies created successfully!' AS result;
