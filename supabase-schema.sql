-- =============================================
-- DChicken Logistics Platform — Supabase Schema
-- =============================================
-- Run this SQL in your Supabase SQL Editor
-- (Supabase Dashboard → SQL Editor → New Query → Paste → Run)

-- 1. Restaurants
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  tax_number TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  owner_id TEXT DEFAULT ''
);

-- 2. Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  plate_number TEXT DEFAULT '',
  username TEXT DEFAULT '' UNIQUE,
  password TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  owner_id TEXT DEFAULT ''
);

-- 3. Purchases (Purchases Log — READ-ONLY accounting record)
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  farm_name TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  price_per_kg NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  owner_id TEXT DEFAULT '',
  chicken_type TEXT DEFAULT 'شاورما مبرد (فريش)'
);

-- 4. Trips
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_weight NUMERIC NOT NULL DEFAULT 0,
  trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  owner_id TEXT DEFAULT ''
);

-- 5. Trip Restaurants (delivery stops)
CREATE TABLE IF NOT EXISTS trip_restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id TEXT NOT NULL,
  restaurant_id TEXT DEFAULT '',
  restaurant_name TEXT NOT NULL,
  target_weight NUMERIC NOT NULL DEFAULT 0,
  actual_weight NUMERIC DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invoice_image_url TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  price_per_kg NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  total_price NUMERIC DEFAULT 0,
  chicken_type TEXT DEFAULT 'شاورما مبرد (فريش)'
);

-- 6. Direct Orders
CREATE TABLE IF NOT EXISTS direct_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  restaurant_name TEXT NOT NULL,
  actual_weight NUMERIC NOT NULL DEFAULT 0,
  invoice_image_url TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  owner_id TEXT DEFAULT '',
  price_per_kg NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  total_price NUMERIC DEFAULT 0,
  restaurant_tax_number TEXT DEFAULT '',
  chicken_type TEXT DEFAULT 'شاورما مبرد (فريش)',
  payment_status TEXT DEFAULT 'unpaid'
);

-- 7. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  order_id TEXT DEFAULT '',
  order_type TEXT DEFAULT '',
  restaurant_name TEXT NOT NULL,
  restaurant_tax_number TEXT DEFAULT '',
  driver_name TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  item_description TEXT DEFAULT '',
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  price_per_kg NUMERIC NOT NULL DEFAULT 0,
  subtotal_before_tax NUMERIC NOT NULL DEFAULT 0,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  invoice_date DATE DEFAULT CURRENT_DATE,
  pdf_url TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  owner_id TEXT DEFAULT '',
  chicken_type TEXT DEFAULT 'شاورما مبرد (فريش)',
  payment_status TEXT DEFAULT 'unpaid'
);

-- 8. Enable Row Level Security (RLS) — allow all for now
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Permissive policies: allow all operations for anon (public) users
CREATE POLICY "Allow all for anon" ON restaurants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON trip_restaurants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON direct_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON invoices FOR ALL USING (true) WITH CHECK (true);

-- 9. Enable Realtime on direct_orders (for useRealtimeOrders hook)
ALTER PUBLICATION supabase_realtime ADD TABLE direct_orders;

-- 10. Migration: Add payment_status to existing tables (run once)
-- If you already have the tables, run these instead of recreating:
-- ALTER TABLE direct_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
-- ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
-- ALTER PUBLICATION supabase_realtime ADD TABLE direct_orders;
