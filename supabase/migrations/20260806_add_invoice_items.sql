-- =============================================================
-- Multi-item piece invoices
-- يضيف عمود items (JSONB) لتخزين عدة أصناف بنفس الفاتورة بالحبة
-- كل عنصر: { chickenType, unitSize, pieces, pricePerPiece }
-- شغّله من: Supabase Dashboard > SQL Editor > New Query
-- =============================================================

ALTER TABLE direct_orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

SELECT '✅ invoice items column ready!' AS result;
