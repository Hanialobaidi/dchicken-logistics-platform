-- =============================================================
-- Purchases: إضافة صورة الفاتورة وطريقة الدفع
-- شغّله من: Supabase Dashboard > SQL Editor > New Query
-- =============================================================

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS invoice_image_url TEXT DEFAULT NULL;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

SELECT '✅ purchases: invoice_image_url + payment_method added!' AS result;
